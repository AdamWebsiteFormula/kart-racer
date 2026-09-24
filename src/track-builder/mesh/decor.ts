// Instance transforms for decor, barriers and features. Pure maths over the sim layer;
// deterministic: decor is seeded by hash(track.id) so two builds give identical matrices.
import { Matrix4, Quaternion, Vector3 } from 'three';
import type { Branches } from '../branches.ts';
import { BUILDER } from '../constants.ts';
import type { Lut } from '../lut.ts';
import type { DecorBand, DecorEntry, Vec3 } from '../types.ts';
import { headingOf } from '../../kart-controller/types.ts';

/** FNV-1a 32-bit. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** mulberry32: small, fast, deterministic. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const M = new Matrix4();
const P = new Vector3();
const Q = new Quaternion();
const S = new Vector3();
const UP = new Vector3(0, 1, 0);

/** position + yaw + uniform (or per-axis) scale → 16 floats appended to `out`. */
export function pushTransform(out: number[], position: Vec3, yaw: number, scale: Vec3 = [1, 1, 1]): void {
  P.set(position[0], position[1], position[2]);
  Q.setFromAxisAngle(UP, yaw);
  S.set(scale[0], scale[1], scale[2]);
  M.compose(P, Q, S);
  for (let i = 0; i < 16; i++) out.push(M.elements[i]);
}

/** Squared XZ distance to the nearest LUT sample and that sample's halfWidth. Coarse stride then refine. */
function nearestXZ(lut: Lut, x: number, z: number): { d2: number; hw: number } {
  const step = BUILDER.globalSearchStep;
  let best = 0, bestD = Infinity;
  for (let i = 0; i < lut.n; i += step) {
    const dx = lut.px[i] - x, dz = lut.pz[i] - z;
    const d = dx * dx + dz * dz;
    if (d < bestD) { bestD = d; best = i; }
  }
  for (let k = -step; k <= step; k++) {
    const i = lut.idx(best + k);
    const dx = lut.px[i] - x, dz = lut.pz[i] - z;
    const d = dx * dx + dz * dz;
    if (d < bestD) { bestD = d; best = i; }
  }
  return { d2: bestD, hw: lut.hw[best] };
}

/** Full envelope past the road edge: kerb + shoulder + 1 m air. */
export const ENVELOPE_PAD = BUILDER.kerbWidth + BUILDER.shoulderWidth + 1;
/** Metres along the road past a roadside prop's footprint that must not be an open edge either. */
const OPEN_CLEAR = 5;
/** Metres more than the course limit and its footprint that a roadside prop stands off an off-road track's curb (at exactly the limit, the road envelope test rejected it half the time). */
const CLEAR_EPS = 0.1;
/** Metres the land as drawn may rise or fall under a prop's footprint (more: it hangs off a lip or straddles a slope). */
const FOOTING = 0.5;
/** Metres a set-piece on footing 'sink' reaches below its origin: the land under it may fall this far. */
const SINK = 3.5;

/** Is the road's `side` (-1 left, 1 right) an open edge within `metres` of main-line t? */
function openBeside(lut: Lut, t: number, side: number, metres: number): boolean {
  const bit = side < 0 ? 1 : 2, i = Math.round(t * lut.step), k = Math.ceil(metres / (lut.length / lut.step));
  for (let d = -k; d <= k; d++) if (lut.open[lut.idx(i + d)] & bit) return true;
  return false;
}

/** Does the ground stay within FOOTING under a footprint of radius r at (x, z)? Read at its rim and halfway in (a cliff's lip can fall between). */
function level(groundAt: (x: number, z: number) => number, x: number, z: number, r: number, tolerance = FOOTING): boolean {
  let lo = groundAt(x, z), hi = lo;
  for (const f of [1, 0.5]) {
    for (let k = 0; k < 8; k++) {
      const a = ((k + 1 - f) / 8) * Math.PI * 2, g = groundAt(x + Math.cos(a) * r * f, z + Math.sin(a) * r * f);
      if (g < lo) lo = g;
      if (g > hi) hi = g;
    }
  }
  return hi - lo <= tolerance;
}

/** Is (x, z) within `pad` metres past any branch's road edge? `except` skips one branch index. */
export function insideRoadEnvelope(branches: Branches, x: number, z: number, except = -1, pad = ENVELOPE_PAD): boolean {
  for (const b of branches.list) {
    if (b.index === except) continue;
    const { d2, hw } = nearestXZ(b.lut, x, z);
    const r = hw + pad;
    if (d2 < r * r) return true;
  }
  return false;
}

export interface DecorPlacement {
  asset: string;
  band: DecorBand;
  /** 16 floats per instance, column-major */
  matrices: Float32Array;
  count: number;
  /** metres a piece reaches across the ground from its centre at scale 1 (a row piece: across the road, not along it) */
  footprint: number;
  layout: 'scatter' | 'row' | 'span';
}

/** A model's reach at scale 1: `across` (local X, away from the road for a row piece) and `along` (local Z). */
export interface DecorExtent { across: number; along: number }

/** Metres along the road over which the heading change is read for a corner's outside. */
const BEND_SPAN = 12;
/** Chance a roadside or verge group takes a sharp corner's outside (where the eye looks across it); 0.5 on a straight. */
const OUTSIDE_BIAS = 0.8;

/**
 * Which side (-1 left, 1 right) is the outside of the road's turn at main-line t, and how sharp the
 * turn is (0 a straight or a gentle sweep, 1 a real corner of radius about 40 m, as road.ts `bend` reads it).
 */
export function outsideOf(lut: Lut, t: number): { side: number; bend: number } {
  const i = Math.round(t * lut.step), k = Math.max(1, Math.round(BEND_SPAN / 2 / (lut.length / lut.step)));
  const a = lut.idx(i - k), b = lut.idx(i + k), j = lut.idx(i);
  // the tangent turns toward the inside; right is (tz, -tx), as placeDecor lays a prop out
  const dx = lut.tx[b] - lut.tx[a], dz = lut.tz[b] - lut.tz[a];
  const inside = dx * lut.tz[j] - dz * lut.tx[j];
  const turn = Math.hypot(dx, dz) / BEND_SPAN; // radians a metre, near enough
  const x = Math.max(0, Math.min(1, (turn - 0.012) / 0.013));
  return { side: inside > 0 ? -1 : 1, bend: x * x * (3 - 2 * x) };
}

/**
 * Place `instances` of one decor entry in its band. roadside: 8–14 m past the road edge
 * at road height minus the shoulder drop (13–19 m on an off-road track: past the course limit).
 * verge (off-road tracks only): small ground cover 2.5–11 m past the curb on the drivable land, which
 * karts drive through (visual only: decor never collides). far: 30–120 m from the centreline at ground
 * height. With `groundAt` (an off-road track's land), all three stand on the land as drawn. sky: 25–60 m above the road. Anything inside a road envelope, a roadside
 * prop beside an open edge, and a prop whose land is not level under its footprint are rejected and
 * retried; roadside and verge groups favour the outside of corners. The RNG is shared across entries
 * so order matters and is fixed by the JSON. A row or span entry (DecorEntry) is laid out as its
 * `layout` says; `extent` is the model's reach across and along (default: `footprint` both ways).
 */
export function placeDecor(branches: Branches, entry: DecorEntry, rng: () => number, groundY: number, groundAt?: (x: number, z: number) => number, footprint = 0, extent?: DecorExtent, occupied?: Occupancy): DecorPlacement {
  const main = branches.main.lut;
  const verge = entry.band === 'verge';
  const layout = entry.layout ?? 'scatter', row = layout === 'row', span = layout === 'span';
  const across = extent?.across ?? footprint, along = extent?.along ?? footprint;
  const reach = row ? across : footprint;
  const none: DecorPlacement = { asset: entry.asset, band: entry.band, matrices: new Float32Array(0), count: 0, footprint: reach, layout };
  // a verge lies on an off-road track's drivable land; a pier or a sky road has none; a span's legs stand past an off-road course limit
  if ((verge || span) && !main.offroad) return none;
  if (span) return placeSpans(branches, entry, rng, groundAt, across);
  const edge = entry.band === 'roadside' || verge; // laid out from the curb, not the centreline
  const band = entry.dist ?? (entry.band === 'roadside' && main.offroad ? BUILDER.decorBands.roadsideOffroad : BUILDER.decorBands[entry.band]);
  const [s0, s1] = entry.scale ?? [1, 1];
  const run = Math.max(1, entry.run ?? 6), every = entry.every ?? 4;
  const out: number[] = [];
  const mine: [number, number, number][] = [];
  let placed = 0;
  const maxTries = entry.instances * 20;
  // props come in little groups (a row of cottages, a stand of pines, a flock of gulls, a patch of
  // flowers) with open ground between, not one every so many metres; each group has its own spot and spread
  let left = 0, gt = 0, gside = 1, gdist = 0;
  const spread = entry.band === 'roadside' ? 8 : verge ? 10 : entry.band === 'far' ? 22 : 30;
  for (let tries = 0; placed < entry.instances && tries < maxTries; tries++) {
    if (left <= 0) {
      gt = groupT(entry.at, rng());
      const r = rng();
      if (entry.side) gside = sideOf(main, gt, entry.side);
      else if (edge) {
        // on a corner the eye looks across its outside, so that is where the dressing goes
        const o = outsideOf(main, gt);
        gside = r < 0.5 + (OUTSIDE_BIAS - 0.5) * o.bend ? o.side : -o.side;
      } else gside = r < 0.5 ? -1 : 1;
      gdist = band[0] + (band[1] - band[0]) * rng();
      left = row ? run : verge ? 2 + Math.floor(rng() * 6) : 1 + Math.floor(rng() * (entry.band === 'roadside' ? 4 : 5));
    }
    left--;
    // a row's pieces follow one another along the road at one distance, turned along it (+X away from the road)
    const t = row ? gt + ((run - 1 - left - (run - 1) / 2) * every) / main.length : gt + ((rng() - 0.5) * spread) / main.length;
    const side = gside;
    const dist = row ? gdist : Math.max(band[0], Math.min(band[1], gdist + (rng() - 0.5) * (band[1] - band[0]) * 0.7));
    const tt = ((t % 1) + 1) % 1, c = main.sample(tt, 0);
    let yaw = row ? headingOf(c.tangent) + (side > 0 ? 0 : Math.PI) : rng() * Math.PI * 2;
    const u = rng(), scale = entry.scale ? s0 + (s1 - s0) * u : row ? 1 : 0.7 + 0.6 * u;
    let x: number, y: number, z: number, long = 1;
    if (entry.band === 'sky') {
      const lateral = side * (c.halfWidth + 10 + 30 * rng());
      x = c.position[0] + c.tangent[2] * lateral;
      z = c.position[2] - c.tangent[0] * lateral;
      y = c.position[1] + dist;
    } else {
      const j = main.idx(Math.round(tt * main.step)), foot = reach * scale;
      // a verge prop stays on the drivable land, footprint and all (which narrows to nothing at a tunnel's mouth)
      if (verge && (main.covered[j] || dist + foot > main.reach[j])) continue;
      // a roadside prop on an off-road track stands wholly past the course limit (its footprint too), where karts cannot reach it
      const clear = entry.band === 'roadside' && main.offroad ? Math.max(dist, BUILDER.offroadReach + 0.5 + foot + CLEAR_EPS) : dist;
      const at = (ts: number, s = main.sample(ts, 0)): [number, number] => {
        const l = side * (edge ? s.halfWidth + BUILDER.kerbWidth + clear : dist);
        return [s.position[0] + s.tangent[2] * l, s.position[2] - s.tangent[0] * l];
      };
      [x, z] = at(tt, c);
      if (row) {
        // a row piece is turned and stretched to the chord from where the last one ends to where the next
        // begins, at its own distance from the road: on a bend the pieces meet end to end instead of
        // gapping on the outside and crossing on the inside (detail review, 24 Sept 2026)
        const h = every / 2 / main.length, [ax, az] = at(tt - h), [bx, bz] = at(tt + h);
        yaw = Math.atan2(bx - ax, bz - az) + (side > 0 ? 0 : Math.PI);
        long = Math.max(0.5, Math.min(1.6, Math.hypot(bx - ax, bz - az) / every));
      }
      y = groundAt ? groundAt(x, z) : entry.band === 'roadside' ? c.position[1] - BUILDER.shoulderDrop : groundY + (entry.footing === 'pier' ? BUILDER.pierLift : 0);
      // clear of every road (on an off-road track, of where karts can drive past its curb, footprint
      // and all; ground cover, which karts drive through, keeps off the roads and their curbs only)
      const pad = verge ? BUILDER.kerbWidth + 0.5 + foot : main.offroad ? BUILDER.kerbWidth + BUILDER.offroadReach + 0.5 + foot : ENVELOPE_PAD;
      if (insideRoadEnvelope(branches, x, z, -1, pad)) continue;
      // a long row piece (a fence, a cliff wall) keeps its ends off the road too, on the inside of a bend
      if (row && along > across) {
        const a = along * scale;
        if (insideRoadEnvelope(branches, x + c.tangent[0] * a, z + c.tangent[2] * a, -1, pad) || insideRoadEnvelope(branches, x - c.tangent[0] * a, z - c.tangent[2] * a, -1, pad)) continue;
      }
      // bug hunt 3: beside an open edge a roadside prop stood over the drop, in Harbor's sea or over the
      // water off Boardwalk's pier (placeBarriers skips those sides too); and on the land as drawn a
      // prop keeps off a cliff's lip and slopes (a mesa hung 24 m over Canyon's chasm)
      if (edge && openBeside(main, tt, side, foot + OPEN_CLEAR)) continue;
      // a set-piece on a stone footing (footing 'sink') may stand on a slope its foundation reaches down
      if (groundAt && reach > 0 && !level(groundAt, x, z, foot, entry.footing === 'sink' ? SINK : FOOTING)) continue;
      // a solid prop keeps out of every solid prop placed by the entries before it (a fence through a cactus or a cottage)
      if (occupied && !verge) {
        const circles = pieceCircles(x, z, yaw, foot, row ? along * scale * long : foot);
        // small pieces give way (a fence, a lamp, a sign, a sled); big ones (a cliff, a set-piece) stand where they are put
        if (entry.merge && circles[0][2] < GIVE_WAY && circles.some((k) => occupied.hits(k[0], k[1], k[2]))) continue;
        mine.push(...circles);
      }
    }
    pushTransform(out, [x, y + (entry.lift ?? 0) * scale, z], yaw, [scale, scale, scale * long]);
    placed++;
  }
  for (const k of mine) occupied?.add(k[0], k[1], k[2]);
  return { asset: entry.asset, band: entry.band, matrices: Float32Array.from(out), count: placed, footprint: reach, layout };
}

/** How much of its footprint a prop claims against others: they may touch, not stand in each other. */
const CLAIM = 0.7;
/** A merged prop that claims less than this (metres) gives way to props already standing. */
const GIVE_WAY = 1.2;

/** Circles covering a piece `across` wide and `along` long (half-sizes), turned to `yaw`. */
function pieceCircles(x: number, z: number, yaw: number, across: number, along: number): [number, number, number][] {
  const n = Math.max(1, Math.round(along / Math.max(0.3, across))), r = Math.max(across, along / n) * CLAIM;
  const dx = Math.sin(yaw), dz = Math.cos(yaw), out: [number, number, number][] = [];
  for (let k = 0; k < n; k++) {
    const o = -along + ((2 * k + 1) * along) / n;
    out.push([x + dx * o, z + dz * o, r]);
  }
  return out;
}

/**
 * Where solid props already stand (the scene's decor entries in order): a coarse grid of circles.
 * A merged entry keeps out of what entries before it placed; its own pieces may touch each other.
 */
export class Occupancy {
  private readonly cells = new Map<number, number[]>();
  private maxR = 0;
  private static readonly CELL = 16;
  private key(i: number, j: number): number { return (i + 4096) * 8192 + (j + 4096); }
  add(x: number, z: number, r: number): void {
    const k = this.key(Math.floor(x / Occupancy.CELL), Math.floor(z / Occupancy.CELL));
    let c = this.cells.get(k);
    if (!c) this.cells.set(k, (c = []));
    c.push(x, z, r);
    this.maxR = Math.max(this.maxR, r);
  }
  hits(x: number, z: number, r: number): boolean {
    const reach = Math.ceil((r + this.maxR) / Occupancy.CELL), ci = Math.floor(x / Occupancy.CELL), cj = Math.floor(z / Occupancy.CELL);
    for (let i = ci - reach; i <= ci + reach; i++) {
      for (let j = cj - reach; j <= cj + reach; j++) {
        const c = this.cells.get(this.key(i, j));
        if (!c) continue;
        for (let n = 0; n < c.length; n += 3) {
          const d = r + c[n + 2];
          if ((c[n] - x) ** 2 + (c[n + 1] - z) ** 2 < d * d) return true;
        }
      }
    }
    return false;
  }
}

/** A group's centre t: anywhere on the lap, or inside `at` ([t0, t1], wrapping past the line when t0 > t1). */
function groupT(at: [number, number] | undefined, u: number): number {
  if (!at) return u;
  const len = (((at[1] - at[0]) % 1) + 1) % 1 || 1;
  return (at[0] + len * u) % 1;
}

/** -1 left, 1 right, for an entry's `side` at main-line t. */
function sideOf(lut: Lut, t: number, side: NonNullable<DecorEntry['side']>): number {
  if (side === 'left') return -1;
  if (side === 'right') return 1;
  const o = outsideOf(lut, t).side;
  return side === 'outside' ? o : -o;
}

/** Metres past the course limit a span's legs reach (their outer face; a leg is at most 2 m thick). */
const SPAN_CLEAR = 4;
/** How far the land under a span's leg may lie below or above the road's centre (its legs reach 3 m down). */
const SPAN_FOOT: [number, number] = [-2.5, 1.5];

/**
 * Spans across the road (off-road tracks): one piece at a time at a random t in `at`, on the centreline
 * at road height, turned along the road, stretched across it (X only) so its legs stand just past the
 * course limit on both sides. A span keeps off tunnels and open edges, and both legs must meet the land.
 */
function placeSpans(branches: Branches, entry: DecorEntry, rng: () => number, groundAt: ((x: number, z: number) => number) | undefined, half: number): DecorPlacement {
  const main = branches.main.lut, out: number[] = [];
  const pad = BUILDER.kerbWidth + BUILDER.offroadReach + 0.5;
  let placed = 0;
  for (let tries = 0; placed < entry.instances && tries < entry.instances * 40; tries++) {
    const t = groupT(entry.at, rng()), c = main.sample(t, 0), j = main.idx(Math.round(t * main.step));
    const legs = c.halfWidth + BUILDER.kerbWidth + BUILDER.offroadReach + SPAN_CLEAR;
    if (main.covered[j] || openBeside(main, t, -1, OPEN_CLEAR) || openBeside(main, t, 1, OPEN_CLEAR)) continue;
    let ok = true;
    for (const side of [-1, 1]) {
      const l = side * legs, x = c.position[0] + c.tangent[2] * l, z = c.position[2] - c.tangent[0] * l;
      if (insideRoadEnvelope(branches, x, z, -1, pad)) { ok = false; break; }
      if (groundAt) {
        const dy = groundAt(x, z) - c.position[1];
        if (dy < SPAN_FOOT[0] || dy > SPAN_FOOT[1]) { ok = false; break; }
      }
    }
    if (!ok) continue;
    // stretched across the road (bunting), or grown whole to its width (a rock arch keeps its shape)
    const sx = legs / Math.max(0.5, half);
    pushTransform(out, [c.position[0], c.position[1] + (entry.lift ?? 0), c.position[2]], headingOf(c.tangent), entry.keepShape ? [sx, sx, sx] : [sx, 1, 1]);
    placed++;
  }
  return { asset: entry.asset, band: entry.band, matrices: Float32Array.from(out), count: placed, footprint: half, layout: 'span' };
}

/**
 * Barrier posts every BARRIER_SPACING metres on both edges of every OPEN branch, at
 * halfWidth + KERB_WIDTH, facing along the road. A post inside another branch's road
 * envelope is skipped so shortcut mouths stay open.
 */
export function placeBarriers(branches: Branches): Float32Array {
  const out: number[] = [];
  for (const b of branches.list) {
    if (!b.open) continue;
    const lut = b.lut;
    const count = Math.max(1, Math.floor(lut.length / BUILDER.barrierSpacing));
    const last = lut.closed ? count : count - 1;
    for (let i = 0; i < count; i++) {
      const u = last === 0 ? 0 : i / last;
      const c = lut.sample(u, 0);
      const yaw = headingOf(c.tangent);
      const open = lut.open[lut.idx(Math.round(u * lut.step))];
      for (const side of [-1, 1]) {
        if (open & (side < 0 ? 1 : 2)) continue; // an open edge: nothing between you and the drop
        const p = lut.sample(u, side * (c.halfWidth + BUILDER.kerbWidth)).position;
        if (branches.list.length > 1 && insideRoadEnvelope(branches, p[0], p[2], b.index, BUILDER.kerbWidth + 0.5)) continue;
        pushTransform(out, p, yaw);
      }
    }
  }
  return Float32Array.from(out);
}
