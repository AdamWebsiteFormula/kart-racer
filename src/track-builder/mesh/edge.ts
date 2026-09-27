// The course's edge (27 Sept 2026; fresh-eyes review item 1, "the road runs through an empty lawn";
// Adam, 26 Sept: "the game feels very cheap"). On an off-road track, just past the invisible course
// limit 12 m out (design §6, Adam's 23 Sept rule: the scenery lines the course, no walls or stumps along
// the road itself), a continuous, varied boundary the way Mario Kart World lines its open-country courses
// (Moo Moo Meadows youtube.com/watch?v=AFN7RL6qEZI 0:25-1:40: grass banks rising past the road with
// fences, hay and trees on them; Desert Hills jBK-cunGXlk 0:20-1:50: dune banks with grass and rope
// fences; DK Pass Il2hmsFCM88 0:35-1:05: snowbanks with pines and fences): the land rising into a bank
// (drawn in the land's own mesh and material), a hedge or a sea wall swept along it, rows of fences,
// huts, trees and rocks on and along it; denser clusters on the outside of bends and at the jumps; and
// soft low cover (flowers, long grass, pebbles, snow drifts) on the drivable land between the curb and
// the limit, thicker toward the limit. Placed after every other prop, the crowd and the Final Lap Shift's
// set piece, so each of them stands where it stood: the edge keeps out of their way. Pure maths over the
// sim layer, seeded by the track id; visual only (karts never reach past the limit, and drive through the
// cover), so nothing the sim or the leaderboard reads changes. The kit itself (what stands on each
// biome's edge) is the art pipeline's (TrackAssets.edge).
import { BufferAttribute, BufferGeometry, Matrix4 } from 'three';
import type { Branches } from '../branches.ts';
import { BUILDER } from '../constants.ts';
import type { Lut } from '../lut.ts';
import type { TrackJump } from '../../kart-controller/types.ts';
import { hashString, insideRoadEnvelope, mulberry32, outsideOf, pushTransform, type Occupancy } from './decor.ts';
import type { MergeItem } from './merge.ts';

export type Rgb3 = readonly [number, number, number];
/** A cross-section: [metres out from its road-side foot, height as a share of the piece's height (0..1)], road side first. */
export type EdgeProfile = readonly (readonly [number, number])[];

/** The land rising past the limit: its cross-section (metres out past the limit, both ends at 0) and its crest's height range. */
export interface EdgeBank { profile: EdgeProfile; height: readonly [number, number] }
/**
 * A top swept along a run (a hedge, a sea wall), its foot `at` metres past the limit, standing on the
 * bank: a convex cross-section (both ends at 0), capped at both ends of the run.
 */
export interface EdgeSweep {
  profile: EdgeProfile;
  at: number;
  height: readonly [number, number];
  /** linear RGB at the foot and the top; each ring a shade of its own (± `vary`) */
  foot: Rgb3; top: Rgb3; vary: number;
  /** each ring's height jitter, a share of the height (a hedge's lumps) */
  lumps: number;
  /** smooth across (a hedge) or flat faces (a wall) */
  smooth: boolean;
}
/** Pieces one after another along a run (a fence), `at` metres past the limit, turned and stretched along it (local +X away from the road). */
export interface EdgeRow { asset: string; every: number; at: number }
/** Props dotted along a run every so many metres, `at` metres past the limit; `face`: turned to face the road (local -X toward it). */
export interface EdgeDots { assets: readonly string[]; every: readonly [number, number]; at: readonly [number, number]; scale?: readonly [number, number]; face?: boolean }
/** One style a run of the edge takes. */
export interface EdgeStyle { name: string; weight: number; bank: boolean; sweep?: EdgeSweep; row?: EdgeRow; dots?: readonly EdgeDots[] }
/** A biome's edge kit (art-pipeline edges.ts). */
export interface EdgeKit {
  bank?: EdgeBank;
  styles: readonly EdgeStyle[];
  /** metres a run takes one style for, and the gap between runs */
  run: readonly [number, number];
  gap: readonly [number, number];
  /** a few props together on the outside of each sharp bend and beside each jump, `at` metres past the limit */
  clusters?: { assets: readonly string[]; size: readonly [number, number]; at: readonly [number, number]; scale?: readonly [number, number] };
  /** ground cover on the drivable land between the curb and the limit, thicker toward the limit */
  drifts?: readonly { asset: string; count: number; scale?: readonly [number, number] }[];
  /** verge decor entries whose cover this kit's takes the place of (their places are still worked out, so every other prop stands where it did) */
  replaces?: readonly string[];
  /**
   * props a bank goes round (buildings on a footing: a house, a barn, a chalet, a stall); any smaller prop
   * where a bank is laid (a tree, a post, a fence, a cactus) stands on the bank instead (scene.ts lifts it)
   */
  solid?: readonly string[];
}

export interface EdgeContext {
  branches: Branches;
  kit: EdgeKit;
  /** seeds the edge's own random numbers (the track id): nothing else's change */
  seed: string;
  /** the land as drawn */
  groundAt: (x: number, z: number) => number;
  /** a sea track: the sea's height (nothing stands where the land dips toward it) */
  waterY?: number;
  /** every solid prop already standing */
  occupied: Occupancy;
  /** the props a bank goes round (EdgeKit.solid, and any very wide one); every other prop in its way is lifted onto it */
  solid: Occupancy;
  /** circles [x, z, r] to keep out of: the crowd, the start gantry, perched birds, the frozen lake */
  avoid: readonly (readonly [number, number, number])[];
  jumps: readonly TrackJump[];
  startT: number;
  /** a mergeable (vertex-coloured, code-built) model for an asset, else null (not placed) */
  geometry: (asset: string) => BufferGeometry | null;
}

/** A placed piece: where, its footprint's radius (a row piece's: half its length along the road), and what it is part of. */
export interface EdgePiece { asset: string; x: number; y: number; z: number; r: number; kind: 'edge' | 'cluster' | 'cover'; row?: boolean }
export interface EdgePlacement {
  /** the bank: world-space geometry with the land's attributes (position, normal, uv, color, blend, curb), for the land's own mesh; null when none */
  bank: BufferGeometry | null;
  /** sweeps, rows, dots, clusters and cover, for the merged dressing */
  items: MergeItem[];
  /** each run: its side (-1, 1), the main line's t at its two ends, and its style's name */
  runs: { side: number; t0: number; t1: number; style: string }[];
  /** every placed piece (not the sweeps) and its footprint, for the checks */
  pieces: EdgePiece[];
  /** stations (both sides) the edge could not take, by what was in its way: for the checks and for tuning */
  blocked: Record<string, number>;
  /** the bank's height over the land at (x, z) (0 off every bank): a prop standing there is lifted by it */
  bankAt: (x: number, z: number) => number;
}

/** Metres between stations along the main line (a bank's and a sweep's rings). */
export const EDGE_STEP = 2;
/** Metres a bank's height eases in and out at each end of a run. */
const TAPER = 4;
/** Metres a bank's toes sink under the land, so no seam shows where it meets the land. */
const SINK = 0.15;
/** A run shorter than this (metres) is not laid. */
const MIN_RUN = 8;
/** Metres along the road past an open edge or a tunnel's covered road that stay clear. */
const OPEN_CLEAR = 6;
/** Metres along the road either side of the start line that stay clear (the gantry's posts and arch). */
const START_CLEAR = 10;
/** Metres of the land's rise or fall under a bank's cross-section beyond which it is not laid (a slope, a cliff's lip). */
const BANK_LEVEL = 1.6;
/** Metres over the sea the land must stand for a bank or a piece. */
const DRY = 0.8;
/** Metres a sharp bend's cluster keeps from the next; how sharp (outsideOf's bend) a bend must be. */
const CLUSTER_APART = 55, CLUSTER_BEND = 0.55;
/** Metres before and after a jump (and its run up) the cover keeps off (its skirts stand past the curb). */
const COVER_CLEAR_JUMP = 6;

const M4 = new Matrix4();

/** Circles the edge itself has claimed (pieces may touch, not stand in each other). */
class Claims {
  private readonly cells = new Map<number, number[]>();
  private static readonly CELL = 12;
  private key(i: number, j: number): number { return (i + 4096) * 8192 + (j + 4096); }
  add(x: number, z: number, r: number): void {
    const k = this.key(Math.floor(x / Claims.CELL), Math.floor(z / Claims.CELL));
    let c = this.cells.get(k);
    if (!c) this.cells.set(k, (c = []));
    c.push(x, z, r);
  }
  hits(x: number, z: number, r: number): boolean {
    const ci = Math.floor(x / Claims.CELL), cj = Math.floor(z / Claims.CELL);
    for (let i = ci - 1; i <= ci + 1; i++) {
      for (let j = cj - 1; j <= cj + 1; j++) {
        const c = this.cells.get(this.key(i, j));
        if (!c) continue;
        for (let n = 0; n < c.length; n += 3) if ((c[n] - x) ** 2 + (c[n + 1] - z) ** 2 < (r + c[n + 2]) ** 2) return true;
      }
    }
    return false;
  }
}

/** A geometry's widest reach across the ground from its own vertical axis (cached on it, as scene.ts does). */
function reachOf(g: BufferGeometry): number {
  const cached = g.userData.groundReach as number | undefined;
  if (cached !== undefined) return cached;
  const p = g.getAttribute('position');
  let r = 0;
  for (let i = 0; i < p.count; i++) r = Math.max(r, Math.hypot(p.getX(i), p.getZ(i)));
  g.userData.groundReach = r;
  return r;
}

/** Height (share, 0..1) of a profile at `o` metres out: linear between its points, 0 outside them. */
export function profileAt(p: EdgeProfile, o: number): number {
  if (o <= p[0][0] || o >= p[p.length - 1][0]) return 0;
  for (let k = 0; k + 1 < p.length; k++) {
    const [a, ha] = p[k], [b, hb] = p[k + 1];
    if (o >= a && o <= b) return b > a ? ha + ((hb - ha) * (o - a)) / (b - a) : Math.max(ha, hb);
  }
  return 0;
}

/** Smooth value noise (0..1) over a station index, `period` stations a lump, seeded. */
function wobble(seed: number, k: number, period: number): number {
  const h = (i: number) => { const x = Math.sin((i + seed * 17.13) * 127.1) * 43758.5453; return x - Math.floor(x); };
  const u = k / period, i = Math.floor(u), f = u - i, s = f * f * (3 - 2 * f);
  return h(i) + (h(i + 1) - h(i)) * s;
}

/** Is the road's `side` (-1 left, 1 right) open, its road covered or its off-road narrowed (a tunnel's mouth), within `metres` of main sample i? */
function blockedNear(lut: Lut, i: number, side: number, metres: number): boolean {
  const bit = side < 0 ? 1 : 2, k = Math.ceil(metres / (lut.length / lut.step));
  for (let d = -k; d <= k; d++) {
    const j = lut.idx(i + d);
    if (lut.open[j] & bit || lut.covered[j] || lut.reach[j] < BUILDER.offroadReach - 0.01) return true;
  }
  return false;
}

/** Weighted pick of a style's index. */
function pickStyle(styles: readonly EdgeStyle[], rng: () => number): number {
  let total = 0;
  for (const s of styles) total += s.weight;
  let u = rng() * total;
  for (let i = 0; i < styles.length; i++) { u -= styles[i].weight; if (u <= 0) return i; }
  return styles.length - 1;
}

/** Middle of a sweep's cross-section, metres out from its foot. */
function sweepMid(sw: EdgeSweep): number { return (sw.profile[0][0] + sw.profile[sw.profile.length - 1][0]) / 2; }

/** Stretches of consecutive free stations round a closed lap: [first station, count]. */
export function freeStretches(free: Uint8Array): [number, number][] {
  const N = free.length, out: [number, number][] = [];
  const z0 = free.indexOf(0);
  if (z0 < 0) return N ? [[0, N]] : [];
  let start = -1, len = 0;
  // from just past a blocked station round to it, so no stretch is cut at the list's own start
  for (let q = 1; q <= N; q++) {
    const k = (z0 + q) % N;
    if (free[k]) { if (start < 0) { start = k; len = 0; } len++; }
    else if (start >= 0) { out.push([start, len]); start = -1; }
  }
  return out;
}

/**
 * The edge of an off-road track: runs of bank, sweeps, rows and dots along both sides of the main line
 * just past the course limit, clusters at the bends and jumps, and cover on the verge. Empty on a track
 * with no off-road (a pier, a sky road: their solid low edge is boundary.ts's).
 */
export function placeEdge(ctx: EdgeContext): EdgePlacement {
  const { branches, kit } = ctx;
  const main = branches.main.lut;
  const items: MergeItem[] = [];
  const runs: EdgePlacement['runs'] = [];
  const pieces: EdgePiece[] = [];
  const blocked: Record<string, number> = {};
  const block = (why: string) => { blocked[why] = (blocked[why] ?? 0) + 1; };
  if (!main.offroad) return { bank: null, items, runs, pieces, blocked, bankAt: () => 0 };
  const rng = mulberry32(hashString(`${ctx.seed}:edge`));
  const noiseSeed = hashString(`${ctx.seed}:edge-noise`) % 1000;
  const N = Math.max(8, Math.floor(main.length / EDGE_STEP));
  const ds = main.length / N;
  const claims = new Claims();
  const bankParts: BufferGeometry[] = [];
  const placed = new Map<string, { g: BufferGeometry; m: number[] }>();
  /** per side (0: -1, 1: +1), per station: the bank's crest height laid there (0: none) */
  const bankH = [new Float32Array(N), new Float32Array(N)];
  const sideIx = (s: number) => (s < 0 ? 0 : 1);
  const station = (k: number) => {
    const t = (((k % N) + N) % N) / N, j = main.idx(Math.round(t * main.step));
    return { t, j, x: main.px[j], y: main.py[j], z: main.pz[j], rx: main.rx[j], rz: main.rz[j], curb: main.hw[j] + BUILDER.kerbWidth, limit: main.hw[j] + BUILDER.kerbWidth + main.reach[j] };
  };
  /** The point `out` metres past the course limit on side s at station k (fractional k lies between stations). */
  const at = (k: number, s: number, out: number): [number, number] => {
    const c = station(k);
    return [c.x + c.rx * s * (c.limit + out), c.z + c.rz * s * (c.limit + out)];
  };
  // every road's drivable land (to its course limit); a probe or a piece stands at least 0.3 m past it
  const pad = BUILDER.kerbWidth + BUILDER.offroadReach;
  const avoided = (x: number, z: number, r: number) => {
    for (const [ax, az, ar] of ctx.avoid) if ((x - ax) ** 2 + (z - az) ** 2 < (r + ar) ** 2) return true;
    return false;
  };
  const dry = (g: number) => ctx.waterY === undefined || g > ctx.waterY + DRY;
  /** A piece of radius r may stand at (x, z): clear of every road's drivable land, every prop, the crowd and the edge's own pieces, on dry, level land. */
  const placeable = (x: number, z: number, r: number): boolean => {
    if (insideRoadEnvelope(branches, x, z, -1, pad + 0.2 + r)) return false;
    if (ctx.occupied.hits(x, z, r * 0.7) || avoided(x, z, r) || claims.hits(x, z, r * 0.7)) return false;
    const g0 = ctx.groundAt(x, z);
    if (!dry(g0)) return false;
    for (let a = 0; a < 4; a++) {
      const g = ctx.groundAt(x + Math.cos(a * 1.571) * r, z + Math.sin(a * 1.571) * r);
      if (Math.abs(g - g0) > 0.8 || !dry(g)) return false;
    }
    return true;
  };
  const put = (asset: string, g: BufferGeometry, x: number, y: number, z: number, yaw: number, sc: number, r: number, kind: EdgePiece['kind'], stretch = 1, row = false): void => {
    let p = placed.get(asset);
    if (!p) placed.set(asset, (p = { g, m: [] }));
    pushTransform(p.m, [x, y, z], yaw, [sc, sc, sc * stretch]);
    if (kind !== 'cover') claims.add(x, z, r * 0.7);
    pieces.push(row ? { asset, x, y, z, r, kind, row } : { asset, x, y, z, r, kind });
  };

  // ---- runs: where each side has room for the edge, cut into stretches of one style each
  const prof = kit.bank?.profile;
  const probes = prof ? [prof[0][0], (prof[0][0] + prof[prof.length - 1][0]) / 2, prof[0][0] + (prof[prof.length - 1][0] - prof[0][0]) * 0.75] : [0.5, 1.5, 3];
  const outer = prof ? prof[prof.length - 1][0] : 3;
  for (const s of [-1, 1]) {
    const free = new Uint8Array(N);
    for (let k = 0; k < N; k++) {
      const c = station(k);
      if (blockedNear(main, c.j, s, OPEN_CLEAR)) { block('open'); continue; }
      const fromStart = Math.abs(((c.t - ctx.startT + 1.5) % 1) - 0.5) * main.length;
      if (fromStart < START_CLEAR) { block('start'); continue; }
      let why = '', lo = Infinity, hi = -Infinity;
      for (const o of probes) {
        const [x, z] = at(k, s, o);
        if (insideRoadEnvelope(branches, x, z, -1, pad)) { why = 'road'; break; }
        if (ctx.solid.hits(x, z, 1.1)) { why = 'prop'; break; }
        if (avoided(x, z, 1.1)) { why = 'crowd'; break; }
        if (claims.hits(x, z, 0.7)) { why = 'edge'; break; }
        const g = ctx.groundAt(x, z);
        if (!dry(g)) { why = 'sea'; break; }
        lo = Math.min(lo, g); hi = Math.max(hi, g);
      }
      // every point of the bank's cross-section past every road's limit, not only the probes (a road's width
      // changes along it, and a shortcut's land may reach in between them)
      if (!why && prof) for (const [o] of prof) { const [x, z] = at(k, s, o); if (insideRoadEnvelope(branches, x, z, -1, pad + 0.1)) { why = 'road'; break; } }
      // not on a slope or a cliff's lip, nor far under the road (a raised road's embankment falling away)
      if (!why && (hi - lo > BANK_LEVEL || c.y - lo > 3)) why = 'slope';
      if (why) block(why);
      free[k] = why ? 0 : 1;
    }
    // on the inside of a bend the rings must still march forward (no fold)
    for (let k = 0; k < N; k++) {
      if (!free[k]) continue;
      const [x0, z0] = at(k, s, outer), [x1, z1] = at(k + 1, s, outer), c = station(k);
      if ((x1 - x0) * main.tx[c.j] + (z1 - z0) * main.tz[c.j] < ds * 0.3) { free[k] = 0; block('fold'); }
    }
    for (const [k0, len] of freeStretches(free)) {
      let k = k0, left = len, last = -1;
      while (left * ds >= MIN_RUN) {
        const want = Math.max(2, Math.round((kit.run[0] + (kit.run[1] - kit.run[0]) * rng()) / ds));
        // a short remainder joins this run rather than being dropped
        const n = left - want < MIN_RUN / ds ? left : want;
        let st = pickStyle(kit.styles, rng);
        if (st === last && kit.styles.length > 1) st = pickStyle(kit.styles, rng);
        last = st;
        layRun(k, n, s, kit.styles[st]);
        const gap = Math.round((kit.gap[0] + (kit.gap[1] - kit.gap[0]) * rng()) / ds);
        k += n + gap;
        left -= n + gap;
      }
    }
  }

  /** The bank's height at (x, z) (0 off every bank): its nearest station and how far past the limit. */
  const bankHeightAt = (x: number, z: number): number => {
    if (!kit.bank) return 0;
    let best = 0, bd = Infinity;
    for (let k = 0; k < N; k += 4) { const c = station(k), d = (c.x - x) ** 2 + (c.z - z) ** 2; if (d < bd) { bd = d; best = k; } }
    for (let k = best - 4; k <= best + 4; k++) { const c = station(k), d = (c.x - x) ** 2 + (c.z - z) ** 2; if (d < bd) { bd = d; best = ((k % N) + N) % N; } }
    const c = station(best), lat = (x - c.x) * c.rx + (z - c.z) * c.rz;
    return profileAt(kit.bank.profile, Math.abs(lat) - c.limit) * bankH[sideIx(lat)][best];
  };

  // ---- clusters: the outside of each sharp bend, and both sides of each jump on the main line
  if (kit.clusters) {
    const C = kit.clusters, spots: { k: number; s: number }[] = [];
    const K = Math.max(1, Math.round(CLUSTER_APART / ds));
    const bend = new Float32Array(N), side = new Int8Array(N);
    for (let k = 0; k < N; k++) { const o = outsideOf(main, station(k).t); bend[k] = o.bend; side[k] = o.side; }
    let last = -Infinity;
    for (let k = 0; k < N; k++) {
      if (bend[k] < CLUSTER_BEND || bend[k] < bend[(k + N - 1) % N] || bend[k] < bend[(k + 1) % N] || k - last < K) continue;
      spots.push({ k, s: side[k] });
      last = k;
    }
    for (const j of ctx.jumps) if ((j.branch ?? 0) === 0) { const k = Math.round(j.t * N); spots.push({ k, s: -1 }, { k, s: 1 }); }
    for (const { k, s } of spots) {
      const n = Math.round(C.size[0] + (C.size[1] - C.size[0]) * rng());
      for (let q = 0, tries = 0; q < n && tries < n * 6; tries++) {
        const kk = k + Math.round(((rng() - 0.5) * 18) / ds), o = C.at[0] + (C.at[1] - C.at[0]) * rng();
        const asset = C.assets[Math.floor(rng() * C.assets.length)], u = rng(), yaw = rng() * Math.PI * 2;
        const sc = C.scale ? C.scale[0] + (C.scale[1] - C.scale[0]) * u : 0.85 + 0.35 * u;
        const g = ctx.geometry(asset);
        if (!g) continue;
        const [x, z] = at(kk, s, o), r = reachOf(g) * sc;
        if (blockedNear(main, station(kk).j, s, OPEN_CLEAR) || !placeable(x, z, r)) continue;
        put(asset, g, x, ctx.groundAt(x, z) + bankHeightAt(x, z) - 0.06 * sc, z, yaw, sc, r, 'cluster');
        q++;
      }
    }
  }

  // ---- cover on the verge: small, low, drive-through; thicker toward the limit
  const skirts = ctx.jumps.filter((j) => (j.branch ?? 0) === 0).map((j) => [j.t - ((j.run ?? 0) + COVER_CLEAR_JUMP) / main.length, j.t + COVER_CLEAR_JUMP / main.length] as const);
  const onSkirt = (t: number) => skirts.some(([a, b]) => { const u = (((t - a) % 1) + 1) % 1; return u <= (((b - a) % 1) + 1) % 1; });
  for (const d of kit.drifts ?? []) {
    const g = ctx.geometry(d.asset);
    if (!g) continue;
    const foot = reachOf(g);
    for (let q = 0, tries = 0; q < d.count && tries < d.count * 8; tries++) {
      const t = rng(), s = rng() < 0.5 ? -1 : 1, u = rng(), yaw = rng() * Math.PI * 2;
      const sc = d.scale ? d.scale[0] + (d.scale[1] - d.scale[0]) * rng() : 0.8 + 0.45 * rng();
      const j = main.idx(Math.round(t * main.step));
      const reach = main.reach[j], dist = 1.0 + (reach - 1.7) * Math.pow(u, 0.8), r = foot * sc;
      if (main.covered[j] || main.open[j] & (s < 0 ? 1 : 2) || dist + r > reach - 0.2 || onSkirt(t)) continue;
      const c = main.sample(t, 0), l = s * (c.halfWidth + BUILDER.kerbWidth + dist);
      const x = c.position[0] + c.tangent[2] * l, z = c.position[2] - c.tangent[0] * l;
      // off every road and curb (the inside of a tight bend folds back toward this one)
      if (insideRoadEnvelope(branches, x, z, -1, BUILDER.kerbWidth + 0.4 + r)) continue;
      const y = ctx.groundAt(x, z);
      if (!dry(y) || Math.abs(y - (c.position[1] - BUILDER.offroadDrop)) > 1.2) continue;
      put(d.asset, g, x, y - 0.02, z, yaw, sc, r, 'cover');
      q++;
    }
  }

  for (const { g, m } of placed.values()) items.push({ geometry: g, matrices: Float32Array.from(m), count: m.length / 16 });
  return { bank: mergeBank(bankParts), items, runs, pieces, blocked, bankAt: bankHeightAt };

  // ---------------------------------------------------------------- one run

  /** A run's bank, sweep, row and dots. */
  function layRun(k0: number, n: number, s: number, style: EdgeStyle): void {
    runs.push({ side: s, t0: station(k0).t, t1: station(k0 + n - 1).t, style: style.name });
    const si = sideIx(s), span = (n - 1) * ds;
    const ease = (m: number, taper: number) => { const x = Math.max(0, Math.min(1, Math.min(m, span - m) / taper)); return x * x * (3 - 2 * x); };
    const H = new Float32Array(n);
    if (style.bank && kit.bank) {
      const [h0, h1] = kit.bank.height;
      for (let i = 0; i < n; i++) {
        H[i] = (h0 + (h1 - h0) * wobble(noiseSeed + si * 31, k0 + i, 9)) * ease(i * ds, TAPER);
        bankH[si][(k0 + i) % N] = H[i];
      }
      bankParts.push(bankGeometry(k0, n, s, kit.bank.profile, H));
    }
    const bankAt = (i: number, out: number) => (style.bank && kit.bank ? profileAt(kit.bank.profile, out) * H[Math.max(0, Math.min(n - 1, i))] : 0);
    const sw = style.sweep;
    if (sw) {
      // the hedge or the wall breaks where a prop (lifted onto the bank) stands on its line
      const mid = sweepMid(sw), open = new Uint8Array(n);
      for (let i = 0; i < n; i++) { const [x, z] = at(k0 + i, s, sw.at + mid); open[i] = ctx.occupied.hits(x, z, mid + 0.4) || avoided(x, z, mid + 0.4) ? 0 : 1; }
      for (let i = 0; i < n;) {
        if (!open[i]) { i++; continue; }
        let m = 0;
        while (i + m < n && open[i + m]) m++;
        if (m * ds >= 6) {
          items.push(sweepItem(k0 + i, m, s, sw, (q) => bankAt(i + q, sw.at + mid)));
          // it claims its line: no cluster or dot stands in it
          for (let q = 0; q < m; q += 2) { const [x, z] = at(k0 + i + q, s, sw.at + mid); claims.add(x, z, mid + 0.3); }
        }
        i += m;
      }
    }
    if (style.row) {
      const row = style.row, g = ctx.geometry(row.asset);
      if (g) {
        const count = Math.floor((span - 2) / row.every);
        for (let q = 0; q < count; q++) {
          const m = 1 + row.every * (q + 0.5);
          const [ax, az] = at(k0 + (m - row.every / 2) / ds, s, row.at), [bx, bz] = at(k0 + (m + row.every / 2) / ds, s, row.at);
          const x = (ax + bx) / 2, z = (az + bz) / 2;
          if (ctx.occupied.hits(x, z, 0.8) || avoided(x, z, 0.8)) continue;
          const yaw = Math.atan2(bx - ax, bz - az) + (s > 0 ? 0 : Math.PI);
          const long = Math.max(0.6, Math.min(1.5, Math.hypot(bx - ax, bz - az) / row.every));
          put(row.asset, g, x, ctx.groundAt(x, z) + bankAt(Math.round(m / ds), row.at) - 0.05, z, yaw, 1, row.every / 2, 'edge', long, true);
        }
      }
    }
    for (const d of style.dots ?? []) {
      let m = 1 + d.every[0] * rng();
      while (m < span - 1) {
        const asset = d.assets[Math.floor(rng() * d.assets.length)], o = d.at[0] + (d.at[1] - d.at[0]) * rng(), u = rng();
        const sc = d.scale ? d.scale[0] + (d.scale[1] - d.scale[0]) * u : 0.85 + 0.3 * u;
        const i = Math.round(m / ds), [x, z] = at(k0 + i, s, o), jitter = rng();
        m += d.every[0] + (d.every[1] - d.every[0]) * rng();
        const g = ctx.geometry(asset);
        if (!g) continue;
        const r = reachOf(g) * sc;
        if (!placeable(x, z, r)) continue;
        const c = station(k0 + i);
        const yaw = d.face ? Math.atan2(main.tx[c.j], main.tz[c.j]) + (s > 0 ? 0 : Math.PI) + (jitter - 0.5) * 0.3 : jitter * Math.PI * 2;
        put(asset, g, x, ctx.groundAt(x, z) + bankAt(i, o) - 0.06 * sc, z, yaw, sc, r, 'edge');
      }
    }
  }

  // ---------------------------------------------------------------- geometry

  /** A run's bank as land: rings across the profile at each station, toes sunk under the land. */
  function bankGeometry(k0: number, n: number, s: number, profile: EdgeProfile, H: Float32Array): BufferGeometry {
    const P = profile.length, pos = new Float32Array(n * P * 3), uv = new Float32Array(n * P * 2), curb = new Float32Array(n * P);
    for (let i = 0; i < n; i++) {
      const c = station(k0 + i);
      for (let p = 0; p < P; p++) {
        const [o, up] = profile[p], [x, z] = at(k0 + i, s, o), v = i * P + p;
        pos[v * 3] = x; pos[v * 3 + 1] = ctx.groundAt(x, z) + up * H[i] - (up <= 0 ? SINK : 0); pos[v * 3 + 2] = z;
        uv[v * 2] = x; uv[v * 2 + 1] = z;
        curb[v] = c.limit - c.curb + o;
      }
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(pos, 3));
    g.setAttribute('uv', new BufferAttribute(uv, 2));
    g.setAttribute('color', new BufferAttribute(new Float32Array(n * P * 3).fill(1), 3));
    g.setAttribute('blend', new BufferAttribute(new Float32Array(n * P), 1));
    g.setAttribute('curb', new BufferAttribute(curb, 1));
    g.setIndex(stripIndex(n, P, P - 1, 1, s));
    return g;
  }

  /** A swept top along a run (a hedge, a wall), capped at both ends; made about its middle so the dressing's slices can place it. */
  function sweepItem(k0: number, n: number, s: number, sw: EdgeSweep, baseAt: (i: number) => number): MergeItem {
    const P = sw.profile.length, per = sw.smooth ? P : (P - 1) * 2;
    const ringVerts = n * per, capVerts = 2 * P;
    const pos = new Float32Array((ringVerts + capVerts) * 3), col = new Float32Array((ringVerts + capVerts) * 3);
    const [h0, h1] = sw.height;
    const ring: [number, number, number][][] = [];
    let cx = 0, cz = 0;
    for (let i = 0; i < n; i++) {
      const lump = 1 + sw.lumps * (wobble(noiseSeed + 7, k0 + i, 1.3) * 2 - 1);
      const h = (h0 + (h1 - h0) * wobble(noiseSeed + 3, k0 + i, 7)) * lump;
      const [fx, fz] = at(k0 + i, s, sw.at);
      const base = ctx.groundAt(fx, fz) + baseAt(i) - 0.12;
      cx += fx; cz += fz;
      ring.push(sw.profile.map(([o, up]) => { const [x, z] = at(k0 + i, s, sw.at + o); return [x, base + up * h, z]; }));
    }
    cx /= n; cz /= n;
    const shadeOf = (i: number) => 1 + sw.vary * (wobble(noiseSeed + 11, k0 + i, 1.7) * 2 - 1);
    const vert = (v: number, p: [number, number, number], up: number, shade: number) => {
      pos[v * 3] = p[0] - cx; pos[v * 3 + 1] = p[1]; pos[v * 3 + 2] = p[2] - cz;
      for (let c = 0; c < 3; c++) col[v * 3 + c] = (sw.foot[c] + (sw.top[c] - sw.foot[c]) * up) * shade;
    };
    for (let i = 0; i < n; i++) {
      const sh = shadeOf(i);
      if (sw.smooth) for (let p = 0; p < P; p++) vert(i * per + p, ring[i][p], sw.profile[p][1], sh);
      else for (let p = 0; p + 1 < P; p++) { vert(i * per + p * 2, ring[i][p], sw.profile[p][1], sh); vert(i * per + p * 2 + 1, ring[i][p + 1], sw.profile[p + 1][1], sh); }
    }
    // the caps: the first and last ring's cross-section as a fan (convex), their own points so their normals face along the road
    for (let p = 0; p < P; p++) {
      vert(ringVerts + p, ring[0][p], sw.profile[p][1], shadeOf(0));
      vert(ringVerts + P + p, ring[n - 1][p], sw.profile[p][1], shadeOf(n - 1));
    }
    const idx = sw.smooth ? stripIndex(n, P, P - 1, 1, s) : stripIndex(n, per, P - 1, 2, s);
    for (let p = 1; p + 1 < P; p++) {
      const a = ringVerts, b = ringVerts + P;
      // the first cap faces back along the road, the last forward; which way the fan winds flips with the side
      if (s > 0) idx.push(a, a + p, a + p + 1, b, b + p + 1, b + p);
      else idx.push(a, a + p + 1, a + p, b, b + p, b + p + 1);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(pos, 3));
    g.setAttribute('color', new BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return { geometry: g, matrices: Float32Array.from(M4.makeTranslation(cx, 0, cz).elements), count: 1 };
  }
}

/**
 * Quads between ring i and i+1 (each ring `per` points; `segs` segments across, segment p from point
 * p·stride to the next: shared points, stride 1, or a flat-faced sweep's own pair, stride 2), facing up
 * and out. The profile runs out from the road, so on the -lateral side it runs toward -lateral and the
 * winding flips.
 */
function stripIndex(n: number, per: number, segs: number, stride: 1 | 2, s: number): number[] {
  const idx: number[] = [];
  for (let i = 0; i + 1 < n; i++) {
    for (let p = 0; p < segs; p++) {
      const a0 = i * per + p * stride, b0 = a0 + 1, a1 = a0 + per, b1 = b0 + per;
      if (s > 0) idx.push(a0, a1, b0, b0, a1, b1);
      else idx.push(a0, b0, a1, b0, b1, a1);
    }
  }
  return idx;
}

/** Every run's bank as one geometry (normals computed), or null. */
function mergeBank(parts: BufferGeometry[]): BufferGeometry | null {
  if (!parts.length) return null;
  let verts = 0, tris = 0;
  for (const p of parts) { verts += p.getAttribute('position').count; tris += p.index!.count; }
  const names = ['position', 'uv', 'color', 'blend', 'curb'] as const;
  const size: Record<(typeof names)[number], number> = { position: 3, uv: 2, color: 3, blend: 1, curb: 1 };
  const arrays = {} as Record<(typeof names)[number], Float32Array>;
  for (const nm of names) arrays[nm] = new Float32Array(verts * size[nm]);
  const index = new Uint32Array(tris);
  let v = 0, f = 0;
  for (const p of parts) {
    for (const nm of names) arrays[nm].set(p.getAttribute(nm).array as Float32Array, v * size[nm]);
    const pi = p.index!;
    for (let q = 0; q < pi.count; q++) index[f++] = v + pi.getX(q);
    v += p.getAttribute('position').count;
  }
  const g = new BufferGeometry();
  for (const nm of names) g.setAttribute(nm, new BufferAttribute(arrays[nm], size[nm]));
  g.setIndex(new BufferAttribute(index, 1));
  g.computeVertexNormals();
  return g;
}
