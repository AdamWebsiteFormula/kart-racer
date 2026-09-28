// Race day on the course (28 Sept 2026; the second fresh-eyes review, item 2: "the course has almost no race
// dressing: arrow boards stand on one bend per track, 13 m out, as 20-pixel specks, and nothing anywhere carries a
// word, a banner or a flag"; Adam, 26 Sept: "the game feels very cheap"). Mario Kart World dresses even its farm
// course for a race: an arrow billboard on a bend's outside, feather flags and sponsor A-frames along the road's
// edge, a sign board over the start (Moo Moo Meadows, youtube.com/watch?v=OSU-aguh1AY 1:29:00, 1:29:15, 1:29:30),
// big arrow boards in a run round the outside of each banked bend (Mario Bros. Circuit, 3:14) and painted signs
// (1:37.6). Ours, laid from each track's own shape, in its own palette, with its own world's shops and sponsors
// (art-pipeline signs.ts draws them, one atlas a track):
// - arrow boards, two to three times the old ones, in a run round the outside of every real bend, at the course
//   limit, each turned to face the karts coming at it, the arrows pointing the way the road goes;
// - feather flags lining the start straight both sides, and in groups along the other straights;
// - sponsor A-frames in threes at the limit on the straights, and a few big billboards facing the traffic;
// - a banner over the road before the big moments (the jumps, the loop, the tightest bend), and a sign on the
//   start gantry's beam with a sponsor board hanging either side of its lamps.
// Every piece is a card of a few triangles sampling the atlas (the merged dressing's own material carries it: no new
// draw call), placed wholly past the course limit (a pier's or a sky road's edge on the two walled tracks), off every
// road the race or its Final Lap Shift lays, open edges, tunnels, shortcut mouths, the crowd and every prop. Pure maths
// over the sim layer; visual only, so nothing the sim or the leaderboard reads changes.
import { BufferAttribute, BufferGeometry, Matrix4, type Texture } from 'three';
import type { Branches } from '../branches.ts';
import { BUILDER } from '../constants.ts';
import type { Lut } from '../lut.ts';
import type { TrackJump } from '../../kart-controller/types.ts';
import { hashString, insideAny, mulberry32, pushTransform, reachOn, type Occupancy } from './decor.ts';
import type { MergeItem } from './merge.ts';
import { turnAt } from './road.ts';

/** A rectangle of the sign atlas, in texture coordinates: [u0, v0, u1, v1] (v up, as three reads a canvas). */
export type AtlasCell = readonly [number, number, number, number];
export type Rgb3 = readonly [number, number, number];

/** What a track's race dressing looks like (art-pipeline signs.ts): its atlas, where each design sits in it, its colours. */
export interface RaceDressingKit {
  /** the painted designs; shared (one a biome), never disposed by the scene */
  atlas: Texture;
  /** a spot of plain white in it: every other merged prop reads it, so its own vertex colours show as they are */
  white: readonly [number, number];
  /** the arrow board's face, its chevrons pointing to the face's left (mirrored for a bend the other way) */
  arrow: AtlasCell;
  /** sponsor boards (2:1): billboards, A-frames, the gantry's hanging boards */
  boards: readonly AtlasCell[];
  /** feather flags (about 1:3.5) */
  flags: readonly AtlasCell[];
  /** banners (8:1): [0] the race's own (the gantry, the first banner over the road), then the rest */
  banners: readonly AtlasCell[];
  /** linear RGB: posts and poles; a board's frame, edges and back */
  post: Rgb3;
  frame: Rgb3;
  /** a face's vertex colour: 1 lit as the scene lights it; over 1 it lights itself too, in its own colours (Boardwalk's neon) */
  face: number;
  /** decor entries this dressing takes the place of (the old little arrow boards): their places are still worked out, so every other prop stands where it did */
  replaces?: readonly string[];
}

export interface RaceDressingContext {
  branches: Branches;
  /** every road's drivable ground nothing may stand on: the race's roads, and the final lap's where a route change lays new ones */
  course: readonly Lut[];
  kit: RaceDressingKit;
  seed: string;
  startT: number;
  jumps: readonly TrackJump[];
  /** the loop-the-loops' main-line t */
  loops: readonly number[];
  /** the land as drawn (an off-road track); undefined on a pier or a sky road, whose pieces stand on its edge */
  groundAt?: (x: number, z: number) => number;
  /** a pier's or a sky road's solid edge: its top's height over the road (boundary.ts) */
  edgeTop?: number;
  /** every solid prop already standing; the dressing claims its own spots in it too, so the course's edge (laid after) keeps off them */
  occupied: Occupancy;
  /** circles [x, z, r] to keep out of: the crowd and its stands, the start gantry's pillars, perched birds, the frozen lake */
  avoid: readonly (readonly [number, number, number])[];
  /** main-line t of the spans already over the road (the bunting): a banner keeps away from them */
  spans: readonly number[];
}

export type RacePieceKind = 'arrow' | 'flag' | 'aframe' | 'billboard' | 'banner' | 'gantry';
/**
 * A placed piece: its kind, where it stands (its middle at the ground), the main line's t, its side (-1, 1; 0 over the
 * road), its yaw (local -Z, a board's face, toward (-sin yaw, -cos yaw)), its half-width along local X (a banner: its
 * poles' distances out, left and right), and for an arrow board whether its chevrons point to its viewer's right.
 */
export interface RacePiece { kind: RacePieceKind; x: number; y: number; z: number; t: number; side: number; yaw: number; half: number; poles?: readonly [number, number]; flip?: boolean }

export interface RaceDressingPlacement {
  items: MergeItem[];
  pieces: RacePiece[];
  /** the real bends found: main-line t at each end, the outside (-1, 1), the turn (radians) */
  bends: { t0: number; t1: number; side: number; turn: number }[];
  /** spots a piece could not take, by what was in its way: for the checks and for tuning */
  blocked: Record<string, number>;
}

/** A real bend: the road turning faster than 1 / `radius` m over a stretch that turns `turn` radians or more in all; `merge` metres join two of one way. */
export const BENDS = Object.freeze({ radius: 140, turn: (25 * Math.PI) / 180, merge: 20, window: 10 });
/**
 * Arrow boards: size (m), bottom over the ground, the metres past the limit their nearer end keeps, apart along the
 * outside (min, max), most a bend, and how far (radians) each is turned from facing straight across the road toward
 * the karts coming at it (their nearer end stays past the limit; its far end swings out).
 */
export const ARROWS = Object.freeze({ w: 4.2, h: 2.1, lift: 1.05, depth: 0.12, out: 0.45, back: [0, 1.2, 2.4] as const, apart: [8.5, 18] as const, most: 10, turn: (40 * Math.PI) / 180 });
/** Feather flags: metres apart on the start straight, its reach before and past the line; on the straights, a group's size and the gap between groups. */
export const FLAGS = Object.freeze({ startApart: 8, startBack: 64, startOn: 52, group: 3, groupApart: 6, every: 85, out: 0.45, h: 4.2 });
/** A-frames (three at a time, 2.6 m each along the road) and billboards (6 by 3 m, turned toward the traffic as the arrow boards are): how often, how far past the limit. */
export const SIGNS = Object.freeze({ aframeEvery: 90, aframes: 3, aframeOut: 0.7, billboards: 4, billboardOut: 0.6, billboardTurn: (50 * Math.PI) / 180 });
/** Banners over the road: at most, metres before the highlight, kept from the start line and from other spans. */
export const BANNERS = Object.freeze({ most: 3, before: 22, fromStart: 45, afterStart: 75, fromSpan: 30, bottom: 6.4, width: 14 });
/** Metres either side of the start line nothing stands in (the gantry's pillars and the grid's lens). */
const START_CLEAR = 5;
/** Metres round a shortcut's mouth kept clear (the storm's fallen oak, the cut's own reading). */
const MOUTH_CLEAR = 16;
/** Metres along the road past an open edge or a tunnel that stay clear. */
const OPEN_CLEAR = 6;
/** Metres past every road's drivable ground (the course limit, a walled road's edge) each point of a piece keeps. */
const CLEAR = 0.2;
/** Metres the land under a piece may lie under or over the road beside it. */
const FOOT: readonly [number, number] = [-3, 2.2];

// ---------------------------------------------------------------- the pieces' geometry

/** Vertices and faces being built: position, normal, colour, atlas coordinates. */
class Cards {
  readonly pos: number[] = []; readonly nor: number[] = []; readonly col: number[] = []; readonly uv: number[] = []; readonly idx: number[] = [];
  private readonly white: readonly [number, number];
  constructor(white: readonly [number, number]) { this.white = white; }
  /** A flat quad a b c d (counter-clockwise from the side it faces), painted `colour` over `uv` (four points) or plain white. */
  quad(a: Rgb3, b: Rgb3, c: Rgb3, d: Rgb3, colour: Rgb3, uv?: readonly (readonly [number, number])[]): void {
    const i = this.pos.length / 3;
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l;
    [a, b, c, d].forEach((p, k) => {
      this.pos.push(p[0], p[1], p[2]);
      this.nor.push(nx, ny, nz);
      this.col.push(colour[0], colour[1], colour[2]);
      const t = uv ? uv[k] : this.white;
      this.uv.push(t[0], t[1]);
    });
    this.idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
  }
  /** A triangle a b c (counter-clockwise from the side it faces). */
  tri(a: Rgb3, b: Rgb3, c: Rgb3, colour: Rgb3, uv?: readonly (readonly [number, number])[]): void {
    const i = this.pos.length / 3;
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l;
    [a, b, c].forEach((p, k) => {
      this.pos.push(p[0], p[1], p[2]);
      this.nor.push(nx, ny, nz);
      this.col.push(colour[0], colour[1], colour[2]);
      const t = uv ? uv[k] : this.white;
      this.uv.push(t[0], t[1]);
    });
    this.idx.push(i, i + 1, i + 2);
  }
  /** A box from x0..x1, y0..y1, z0..z1 in `colour`; `skip` leaves faces out ('front' -Z, 'back' +Z, 'left' -X, 'right' +X, 'top', 'bottom'). */
  box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, colour: Rgb3, skip: readonly string[] = ['bottom']): void {
    if (!skip.includes('front')) this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], colour);
    if (!skip.includes('back')) this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], colour);
    if (!skip.includes('left')) this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], colour);
    if (!skip.includes('right')) this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], colour);
    if (!skip.includes('top')) this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], colour);
    if (!skip.includes('bottom')) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], colour);
  }
  /** A three-sided post (a thin prism, no caps: six triangles) of radius r round (x, z) from y0 to y1. */
  post(x: number, z: number, y0: number, y1: number, r: number, colour: Rgb3): void {
    const p = [0, 1, 2].map((k): [number, number] => { const a = (k / 3) * Math.PI * 2 + Math.PI / 6; return [x + Math.cos(a) * r, z + Math.sin(a) * r]; });
    for (let k = 0; k < 3; k++) {
      const [ax, az] = p[k], [bx, bz] = p[(k + 1) % 3];
      this.quad([bx, y0, bz], [ax, y0, az], [ax, y1, az], [bx, y1, bz], colour);
    }
  }
  geometry(): BufferGeometry {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(this.pos), 3));
    g.setAttribute('normal', new BufferAttribute(new Float32Array(this.nor), 3));
    g.setAttribute('color', new BufferAttribute(new Float32Array(this.col), 3));
    g.setAttribute('uv', new BufferAttribute(new Float32Array(this.uv), 2));
    g.setIndex(this.idx);
    g.computeBoundingBox();
    g.computeBoundingSphere();
    // its uv samples the sign atlas (merge.ts mergeInstances reads it only from a card marked so)
    g.userData.atlas = true;
    return g;
  }
}

/** The four corners of a cell for a face whose left edge (as its viewer sees it) is its first point: bottom-left, bottom-right, top-right, top-left; `flip` mirrors it. */
function cellUv(c: AtlasCell, flip = false): [number, number][] {
  const [u0, v0, u1, v1] = c, a = flip ? u1 : u0, b = flip ? u0 : u1;
  return [[a, v0], [b, v0], [b, v1], [a, v1]];
}

const grey = (k: number): Rgb3 => [k, k, k];

/**
 * A board on two posts, its face toward local -Z (its viewer's right is local -X), `w` by `h`, its bottom `lift`
 * over the ground; posts from `sink` under the ground; the back and edges in the frame's colour.
 */
function boardOnPosts(kit: RaceDressingKit, cell: AtlasCell, w: number, h: number, lift: number, depth: number, flip = false, posts = 2): BufferGeometry {
  const b = new Cards(kit.white), x = w / 2, z = depth / 2, y0 = lift, y1 = lift + h, face = grey(kit.face);
  b.quad([x, y0, -z], [-x, y0, -z], [-x, y1, -z], [x, y1, -z], face, cellUv(cell, flip));
  // (its underside is never seen from a kart's lens, over a metre down)
  b.box(-x, x, y0, y1, -z, z, kit.frame, ['front', 'bottom']);
  const px = posts === 1 ? [0] : [-w * 0.34, w * 0.34], r = Math.max(0.06, w * 0.017);
  for (const p of px) b.post(p, z + r, -1.2, y1 - 0.12, r, kit.post);
  return b.geometry();
}

/** A sandwich board along local Z (2.6 m), a face leaning toward -X (the road) and one toward +X, each reading left to right from its side. */
function aFrame(kit: RaceDressingKit, cell: AtlasCell): BufferGeometry {
  const b = new Cards(kit.white), L = 1.3, foot = 0.34, top = 1.15, face = grey(kit.face);
  b.quad([-foot, 0, -L], [-foot, 0, L], [-0.02, top, L], [-0.02, top, -L], face, cellUv(cell));
  b.quad([foot, 0, L], [foot, 0, -L], [0.02, top, -L], [0.02, top, L], face, cellUv(cell));
  b.tri([-foot, 0, L], [foot, 0, L], [0, top + 0.02, L], kit.frame);
  b.tri([foot, 0, -L], [-foot, 0, -L], [0, top + 0.02, -L], kit.frame);
  return b.geometry();
}

/** A feather flag: a pole at the origin and a tall rounded sail along +Z in the plane x = 0, its design on both faces. */
function featherFlag(kit: RaceDressingKit, cell: AtlasCell): BufferGeometry {
  const b = new Cards(kit.white), face = grey(kit.face);
  // the sail's outline (z out from the pole, y up), road side first: a straight foot, a straight fly, a rounded head
  const pts: [number, number][] = [[0.05, 1.05], [0.92, 1.3], [0.98, 3.3], [0.62, 4.02], [0.05, 4.2]];
  const z0 = 0.05, z1 = 0.98, y0 = 1.05, y1 = 4.2;
  const [u0, v0, u1, v1] = cell;
  const uvOf = (p: [number, number], mirror: boolean): [number, number] => {
    const s = (p[0] - z0) / (z1 - z0), t = (p[1] - y0) / (y1 - y0);
    return [mirror ? u1 - s * (u1 - u0) : u0 + s * (u1 - u0), v0 + t * (v1 - v0)];
  };
  for (let k = 1; k + 1 < pts.length; k++) {
    const a = pts[0], p = pts[k], q = pts[k + 1];
    // the face toward -X (from there, +Z is its viewer's right), then the one toward +X (its design the right way round from that side too)
    b.tri([0, a[1], a[0]], [0, p[1], p[0]], [0, q[1], q[0]], face, [uvOf(a, false), uvOf(p, false), uvOf(q, false)]);
    b.tri([0.01, a[1], a[0]], [0.01, q[1], q[0]], [0.01, p[1], p[0]], face, [uvOf(a, true), uvOf(q, true), uvOf(p, true)]);
  }
  b.post(0, 0, -0.8, FLAGS.h + 0.1, 0.045, kit.post);
  return b.geometry();
}

/**
 * A banner over the road, in its own frame (origin on the road's middle at road height, X across it to the right,
 * the banner's front toward -Z, the oncoming karts): a pole at x = -left and one at x = right, a cable between
 * their tops, the banner hung from it on two ties, its design on both faces.
 */
function bannerSpan(kit: RaceDressingKit, cell: AtlasCell, left: number, right: number, legs: readonly [number, number]): BufferGeometry {
  const b = new Cards(kit.white), face = grey(kit.face), top = BANNERS.bottom + 2.4;
  // over the road's middle, whatever the two poles' distances out
  const w = Math.min(BANNERS.width, 2 * Math.min(left, right) - 1.5), h = w / 8, y0 = BANNERS.bottom, y1 = y0 + h;
  const x0 = -w / 2, x1 = w / 2;
  b.quad([x1, y0, -0.03], [x0, y0, -0.03], [x0, y1, -0.03], [x1, y1, -0.03], face, cellUv(cell));
  b.quad([x0, y0, 0.03], [x1, y0, 0.03], [x1, y1, 0.03], [x0, y1, 0.03], face, cellUv(cell));
  b.box(x0 - 0.06, x1 + 0.06, y1, y1 + 0.1, -0.05, 0.05, kit.frame, ['bottom', 'left', 'right']); // the hem it hangs by
  for (const x of [x0 + 0.4, x1 - 0.4]) b.post(x, 0, y1 + 0.1, top - 0.1, 0.025, kit.frame);
  b.box(-left, right, top - 0.14, top - 0.06, -0.04, 0.04, kit.post, ['bottom', 'left', 'right']); // the cable
  b.post(-left, 0, legs[0], top + 0.3, 0.16, kit.post);
  b.post(right, 0, legs[1], top + 0.3, 0.16, kit.post);
  return b.geometry();
}

// ---------------------------------------------------------------- where the road bends

/**
 * The real bends of a closed main line: stretches turning faster than 1 / BENDS.radius, stretches of one way
 * within BENDS.merge metres joined, kept when they turn BENDS.turn or more in all. `side`: the outside (-1 the
 * left, 1 the right).
 */
export function realBends(lut: Lut): { t0: number; t1: number; side: number; turn: number; peak: number }[] {
  const N = Math.max(16, Math.floor(lut.length / 2)), ds = lut.length / N, k = Math.max(1, Math.round(BENDS.window / 2 / (lut.length / lut.step)));
  const turn = new Float32Array(N);
  for (let q = 0; q < N; q++) turn[q] = turnAt(lut, Math.round((q / N) * lut.step), k);
  const hot = (q: number) => Math.abs(turn[((q % N) + N) % N]) > 1 / BENDS.radius;
  const first = turn.findIndex((_, q) => !hot(q));
  if (first < 0) return [];
  // runs of one way, round the lap from a calm station
  const runs: { a: number; n: number; sign: number }[] = [];
  for (let q = 0; q < N; q++) {
    const s = first + q;
    if (!hot(s)) continue;
    const sign = Math.sign(turn[s % N]), last = runs[runs.length - 1];
    if (last && last.sign === sign && s - (last.a + last.n) <= Math.round(BENDS.merge / ds)) last.n = s - last.a + 1;
    else runs.push({ a: s, n: 1, sign });
  }
  const out: { t0: number; t1: number; side: number; turn: number; peak: number }[] = [];
  for (const r of runs) {
    let sum = 0, peak = 0;
    for (let q = r.a; q < r.a + r.n; q++) { const v = turn[q % N]; sum += v * ds; peak = Math.max(peak, Math.abs(v)); }
    if (Math.abs(sum) < BENDS.turn) continue;
    // turning toward +lateral makes that side the inside (road.ts turnAt)
    out.push({ t0: (r.a % N) / N, t1: ((r.a + r.n) % N) / N, side: sum > 0 ? -1 : 1, turn: Math.abs(sum), peak });
  }
  return out;
}

// ---------------------------------------------------------------- placing it

const M4 = new Matrix4();

/**
 * The race dressing of one track (see the head of this file). Empty when there is no room anywhere, never throws.
 */
export function placeRaceDressing(ctx: RaceDressingContext): RaceDressingPlacement {
  const { branches, kit } = ctx;
  const main = branches.main.lut, L = main.length;
  const rng = mulberry32(hashString(`${ctx.seed}:race-dressing`));
  const pieces: RacePiece[] = [];
  const placed = new Map<BufferGeometry, number[]>();
  const add = (g: BufferGeometry, x: number, y: number, z: number, yaw: number) => {
    let m = placed.get(g);
    if (!m) placed.set(g, (m = []));
    pushTransform(m, [x, y, z], yaw);
  };
  const walled = !main.offroad;
  const wrapT = (t: number) => ((t % 1) + 1) % 1;
  const idxOf = (t: number) => main.idx(Math.round(wrapT(t) * main.step));
  const fromStart = (t: number) => Math.abs(((t - ctx.startT + 1.5) % 1) - 0.5) * L;

  // spots kept clear: shortcut mouths (both ends), then the crowd and the gantry (ctx.avoid)
  const mouths: [number, number][] = [];
  for (const b of branches.list) {
    if (b.index === 0) continue;
    for (const t of [b.entryT, b.exitT]) { const j = idxOf(t); mouths.push([main.px[j], main.pz[j]]); }
  }
  const avoided = (x: number, z: number, r: number) => {
    for (const [ax, az, ar] of ctx.avoid) if ((x - ax) ** 2 + (z - az) ** 2 < (r + ar) ** 2) return true;
    for (const [mx, mz] of mouths) if ((x - mx) ** 2 + (z - mz) ** 2 < (MOUTH_CLEAR + r) ** 2) return true;
    return false;
  };
  /** an open edge or a tunnel within OPEN_CLEAR metres of sample j on side s */
  const blocked = (j: number, s: number) => {
    const bit = s < 0 ? 1 : 2, kk = Math.ceil(OPEN_CLEAR / (L / main.step)) + Math.ceil(BUILDER.tunnelFunnel / (L / main.step));
    for (let d = -kk; d <= kk; d++) { const i = main.idx(j + d); if (main.covered[i] || main.open[i] & bit) return true; }
    return false;
  };
  /** metres from the centre line to where a piece stands on side s at sample j: the course limit (or the solid edge) and `out` more */
  const standOff = (j: number, s: number, out: number) => main.hw[j] + BUILDER.kerbWidth + (walled ? 0.17 : reachOn(main, j, s) + out);
  /** the ground a piece stands on at (x, z) beside sample j (the land as drawn; a walled road's edge top), or NaN where it may not */
  const footAt = (j: number, x: number, z: number, s: number): number => {
    if (walled || !ctx.groundAt) {
      const edge = main.py[j] - (main.hw[j] + BUILDER.kerbWidth) * s * Math.tan(main.bank[j]);
      return edge + (ctx.edgeTop ?? 0);
    }
    const g = ctx.groundAt(x, z), dy = g - main.py[j];
    return dy < FOOT[0] || dy > FOOT[1] ? NaN : g;
  };
  const blockedBy: Record<string, number> = {};
  let placing = '';
  const why = (k: string) => { const key = `${placing}:${k}`; blockedBy[key] = (blockedBy[key] ?? 0) + 1; return false; };
  /** a point at (x, z) past every road's drivable ground (by CLEAR), with room of radius r round it clear of every prop, the crowd and the mouths */
  const free = (x: number, z: number, r: number) => (insideAny(ctx.course, x, z, CLEAR) ? why('road') : ctx.occupied.hits(x, z, r) ? why('prop') : avoided(x, z, r) ? why('crowd') : true);
  const claim = (x: number, z: number, r: number) => ctx.occupied.add(x, z, r);

  const flip = new Map<boolean, BufferGeometry>();
  const arrowGeo = (right: boolean) => {
    let g = flip.get(right);
    if (!g) flip.set(right, (g = boardOnPosts(kit, kit.arrow, ARROWS.w, ARROWS.h, ARROWS.lift, ARROWS.depth, right)));
    return g;
  };
  /**
   * A board `w` wide beside sample j on side s, facing the road turned `turn` radians toward the karts coming at it:
   * its middle, its yaw (local -Z toward that way), and its two ends and middle (for the checks). Its nearer end (the
   * one the karts reach last) keeps `out` metres past the limit; the other swings out.
   */
  const angled = (j: number, s: number, w: number, turn: number, out: number) => {
    const inX = -s * main.rx[j], inZ = -s * main.rz[j], th = Math.hypot(main.tx[j], main.tz[j]) || 1;
    const nx = inX * Math.cos(turn) - (main.tx[j] / th) * Math.sin(turn), nz = inZ * Math.cos(turn) - (main.tz[j] / th) * Math.sin(turn);
    const o = standOff(j, s, out) + (w / 2) * Math.sin(turn);
    const x = main.px[j] + main.rx[j] * s * o, z = main.pz[j] + main.rz[j] * s * o;
    const yaw = Math.atan2(-nx, -nz), ax = Math.cos(yaw), az = -Math.sin(yaw), hw = w / 2;
    const ends: [number, number][] = [[x - ax * hw, z - az * hw], [x, z], [x + ax * hw, z + az * hw]];
    return { x, z, yaw, ends };
  };

  // ---- arrow boards round the outside of every real bend
  placing = 'arrow';
  const bends = realBends(main);
  for (const bend of bends) {
    const s = bend.side;
    const len = wrapT(bend.t1 - bend.t0) * L;
    // along the outside, from the bend's start to near its end: the outside line's own length decides the spacing
    const line: { t: number; j: number; x: number; z: number; d: number }[] = [];
    let d = 0;
    for (let m = 0; m <= len * 0.9; m += 1) {
      const t = wrapT(bend.t0 + m / L), j = idxOf(t), o = standOff(j, s, ARROWS.out);
      const x = main.px[j] + main.rx[j] * s * o, z = main.pz[j] + main.rz[j] * s * o;
      if (line.length) { const p = line[line.length - 1]; d += Math.hypot(x - p.x, z - p.z); }
      line.push({ t, j, x, z, d });
    }
    if (line.length < 2) continue;
    const total = line[line.length - 1].d;
    const apart = Math.min(ARROWS.apart[1], Math.max(ARROWS.apart[0], total / ARROWS.most));
    let next = 0;
    for (const p of line) {
      if (p.d < next) continue;
      if (blocked(p.j, s) || fromStart(p.t) < START_CLEAR + ARROWS.w) continue;
      // at the limit, or (a fence, a cactus there already) a little further out, over it
      let a: ReturnType<typeof angled> | null = null, y = NaN;
      for (const more of ARROWS.back) {
        const c = angled(p.j, s, ARROWS.w, ARROWS.turn, ARROWS.out + more);
        if (!c.ends.every(([x, z]) => free(x, z, 0.35))) continue;
        const cy = footAt(p.j, c.x, c.z, s);
        if (!Number.isFinite(cy) || !c.ends.every(([x, z]) => Number.isFinite(footAt(p.j, x, z, s)))) continue;
        a = c; y = cy;
        break;
      }
      if (!a) continue;
      // the road turns to the inside. +lateral (the LUT's right, up × forward) is the driver's left on screen, so an
      // outside on +lateral is a bend to the driver's right: the chevrons point right
      const right = s > 0;
      add(arrowGeo(right), a.x, y - 0.04, a.z, a.yaw);
      for (const [x, z] of a.ends) claim(x, z, 0.8);
      pieces.push({ kind: 'arrow', x: a.x, y, z: a.z, t: p.t, side: s, yaw: a.yaw, half: ARROWS.w / 2, flip: right });
      next = p.d + apart;
    }
  }

  // ---- the start straight: feather flags both sides
  const flagGeos = kit.flags.map((c) => featherFlag(kit, c));
  let flagN = 0;
  /** a flag at main-line t on side s, its sail toward the road's way ahead; false when there is no room */
  const flagAt = (t: number, s: number): boolean => {
    placing = 'flag';
    const j = idxOf(t);
    if (blocked(j, s) || !flagGeos.length) return false;
    const o = standOff(j, s, FLAGS.out), x = main.px[j] + main.rx[j] * s * o, z = main.pz[j] + main.rz[j] * s * o;
    if (!free(x, z, 0.5)) return false;
    const y = footAt(j, x, z, s);
    if (!Number.isFinite(y)) return false;
    // the sail's plane along the road, trailing back from its pole (local +Z back down the road)
    const yaw = Math.atan2(-main.tx[j], -main.tz[j]);
    add(flagGeos[flagN++ % flagGeos.length], x, y - 0.05, z, yaw);
    claim(x, z, 0.6);
    pieces.push({ kind: 'flag', x, y, z, t, side: s, yaw, half: 0.05 });
    return true;
  };
  for (let m = -FLAGS.startBack; m <= FLAGS.startOn; m += FLAGS.startApart) {
    if (Math.abs(m) < START_CLEAR + 2) continue;
    for (const s of [-1, 1]) flagAt(wrapT(ctx.startT + m / L), s);
  }

  // ---- the straights: groups of flags, A-frames and billboards, spread round the lap, sides taking turns
  const calm = (t: number) => bends.every((b) => { const u = wrapT(t - b.t0), span = wrapT(b.t1 - b.t0); return u > span + 12 / L && u < 1 - 12 / L; });
  const straightSpot = (t: number) => calm(t) && fromStart(t) > FLAGS.startOn + 10;
  let side = rng() < 0.5 ? -1 : 1;
  for (let m = FLAGS.startOn + FLAGS.every * 0.5; m < L - FLAGS.startBack; m += FLAGS.every * (0.8 + 0.4 * rng())) {
    const t0 = wrapT(ctx.startT + m / L);
    if (!straightSpot(t0)) continue;
    side = -side;
    let n = 0;
    for (let q = 0; q < FLAGS.group; q++) if (flagAt(wrapT(t0 + (q * FLAGS.groupApart) / L), side)) n++;
    if (!n) for (let q = 0; q < FLAGS.group; q++) flagAt(wrapT(t0 + (q * FLAGS.groupApart) / L), -side);
  }
  // sponsor A-frames, three in a row along the limit (on the land: a pier's or a sky road's edge has no room for them)
  const frameGeos = walled ? [] : kit.boards.map((c) => aFrame(kit, c));
  let frameN = Math.floor(rng() * Math.max(1, frameGeos.length));
  for (let m = FLAGS.startOn + SIGNS.aframeEvery * 0.25; m < L - FLAGS.startBack && frameGeos.length; m += SIGNS.aframeEvery * (0.8 + 0.4 * rng())) {
    const t0 = wrapT(ctx.startT + m / L);
    if (!straightSpot(t0)) continue;
    side = -side;
    placing = 'aframe';
    for (const sd of [side, -side]) {
      let n = 0;
      for (let q = 0; q < SIGNS.aframes; q++) {
        const t = wrapT(t0 + (q * 3.1) / L), j = idxOf(t);
        if (blocked(j, sd)) continue;
        const o = standOff(j, sd, SIGNS.aframeOut), x = main.px[j] + main.rx[j] * sd * o, z = main.pz[j] + main.rz[j] * sd * o;
        const ends: [number, number][] = [[x - main.tx[j] * 1.3, z - main.tz[j] * 1.3], [x + main.tx[j] * 1.3, z + main.tz[j] * 1.3]];
        if (!ends.every(([ex, ez]) => free(ex, ez, 0.4))) continue;
        const y = footAt(j, x, z, sd);
        if (!Number.isFinite(y)) continue;
        // its length along the road, its -X face toward the road
        const yaw = Math.atan2(main.tx[j], main.tz[j]) + (sd > 0 ? 0 : Math.PI);
        add(frameGeos[frameN++ % frameGeos.length], x, y - 0.03, z, yaw);
        for (const [ex, ez] of ends) claim(ex, ez, 0.7);
        pieces.push({ kind: 'aframe', x, y, z, t, side: sd, yaw, half: 0.34 });
        n++;
      }
      if (n) break;
    }
  }
  // a few big billboards, each facing the traffic coming down the straight at it
  const billGeos = kit.boards.map((c) => boardOnPosts(kit, c, 6, 3, 1.7, 0.16));
  let bills = 0;
  placing = 'billboard';
  for (let k = 0, tries = 0; bills < SIGNS.billboards && tries < 60 && billGeos.length; tries++, k++) {
    const t = wrapT(ctx.startT + (FLAGS.startOn + 30 + ((k * 0.618034) % 1) * (L - FLAGS.startOn - FLAGS.startBack - 60)) / L);
    if (!straightSpot(t)) continue;
    const s = (k % 2) * 2 - 1, j = idxOf(t);
    if (blocked(j, s)) continue;
    const a = angled(j, s, 6, SIGNS.billboardTurn, SIGNS.billboardOut);
    if (!a.ends.every(([ex, ez]) => free(ex, ez, 0.5))) continue;
    const y = footAt(j, a.x, a.z, s);
    if (!Number.isFinite(y) || !a.ends.every(([ex, ez]) => Number.isFinite(footAt(j, ex, ez, s)))) continue;
    add(billGeos[bills % billGeos.length], a.x, y - 0.04, a.z, a.yaw);
    for (const [ex, ez] of a.ends) claim(ex, ez, 1);
    pieces.push({ kind: 'billboard', x: a.x, y, z: a.z, t, side: s, yaw: a.yaw, half: 3 });
    bills++;
  }

  // ---- banners over the road before the big moments: the jumps, the loop, the tightest bend
  // (the start straight's own first: the track's name over the road, clear of the gantry)
  const moments: number[] = [wrapT(ctx.startT + BANNERS.afterStart / L)];
  const mainJumps = ctx.jumps.filter((jp) => (jp.branch ?? 0) === 0).sort((a, b) => a.t - b.t);
  for (let q = 0; q < mainJumps.length; q++) {
    const jp = mainJumps[q], prev = mainJumps[q - 1];
    // a row of bumps is one moment: its first
    if (prev && wrapT(jp.t - prev.t) * L < 40) continue;
    moments.push(wrapT(jp.t - ((jp.run ?? 0) + BANNERS.before) / L));
  }
  for (const t of ctx.loops) moments.push(wrapT(t - (BUILDER.loopApproach + BANNERS.before) / L));
  const sharpest = [...bends].sort((a, b) => b.peak - a.peak)[0];
  if (sharpest) moments.push(wrapT(sharpest.t0 - BANNERS.before / L));
  const hung: number[] = [];
  placing = 'banner';
  // (the gantry carries the race's own banner: the first over the road carries the track's name)
  let bannerN = 1;
  for (const t of moments) {
    if (hung.length >= BANNERS.most || !kit.banners.length) break;
    if (fromStart(t) < BANNERS.fromStart) continue;
    const near = (u: number) => Math.min(wrapT(u - t), wrapT(t - u)) * L < BANNERS.fromSpan;
    if (ctx.spans.some(near) || hung.some(near)) continue;
    // slide it back a little at a time until both poles find their feet
    for (let back = 0; back <= 24; back += 4) {
      const tt = wrapT(t - back / L), j = idxOf(tt);
      if (blocked(j, -1) || blocked(j, 1)) continue;
      const offs = [-1, 1].map((s) => standOff(j, s, 0.9));
      const feet = [-1, 1].map((s, k) => {
        const x = main.px[j] + main.rx[j] * s * offs[k], z = main.pz[j] + main.rz[j] * s * offs[k];
        return free(x, z, 0.4) ? footAt(j, x, z, s) : NaN;
      });
      if (!feet.every(Number.isFinite)) continue;
      const cy = main.py[j];
      const yaw = Math.atan2(main.tx[j], main.tz[j]);
      // (its own frame: X across the road to the right, its front toward the oncoming karts)
      const geo = bannerSpan(kit, kit.banners[bannerN++ % kit.banners.length], offs[0], offs[1], [feet[0] - cy - 1, feet[1] - cy - 1]);
      add(geo, main.px[j], cy, main.pz[j], yaw);
      for (let k = 0; k < 2; k++) {
        const s = k * 2 - 1, x = main.px[j] + main.rx[j] * s * offs[k], z = main.pz[j] + main.rz[j] * s * offs[k];
        claim(x, z, 0.7);
      }
      pieces.push({ kind: 'banner', x: main.px[j], y: cy, z: main.pz[j], t: tt, side: 0, yaw, half: 0, poles: [offs[0], offs[1]] });
      hung.push(tt);
      break;
    }
  }

  const items: MergeItem[] = [];
  for (const [g, m] of placed) items.push({ geometry: g, matrices: Float32Array.from(m), count: m.length / 16 });
  return { items, pieces, bends: bends.map(({ t0, t1, side, turn }) => ({ t0, t1, side, turn })), blocked: blockedBy };
}

/**
 * The start gantry's dressing (gantry.ts): a sign board standing on its beam, the race's own banner on both faces,
 * and a sponsor board hanging under the beam either side of the start lamps. `o` the start line's middle, `f` the
 * road's way (level), `span` the pillars' distance out, `beamTop` the beam's top (world y), `lampHalf` the lamp
 * board's half-width. World space: one copy.
 */
export function gantryDressing(kit: RaceDressingKit, o: Rgb3, f: Rgb3, span: number, beamTop: number, beamUnder: number, lampHalf: number): MergeItem | null {
  if (!kit.banners.length) return null;
  const b = new Cards(kit.white), face = grey(kit.face);
  const w = span * 2 * 0.8, h = w / 8, y0 = beamTop + 0.04, y1 = y0 + h;
  // local frame: X across (the grid's right), Z the road's way; the front faces the grid (-Z)
  // (seen from the grid, local -X is its viewer's right: the cell reads from +X to -X on the front, the other way on the back)
  b.quad([w / 2, y0, -0.08], [-w / 2, y0, -0.08], [-w / 2, y1, -0.08], [w / 2, y1, -0.08], face, cellUv(kit.banners[0]));
  b.quad([-w / 2, y0, 0.08], [w / 2, y0, 0.08], [w / 2, y1, 0.08], [-w / 2, y1, 0.08], face, cellUv(kit.banners[0]));
  b.box(-w / 2 - 0.12, w / 2 + 0.12, y1, y1 + 0.14, -0.12, 0.12, kit.frame, ['bottom']);
  for (const x of [-w / 2 - 0.06, w / 2 + 0.06]) b.box(x - 0.06, x + 0.06, y0, y1, -0.12, 0.12, kit.frame, ['bottom', 'top']);
  // hanging sponsor boards (2:1), their front toward the grid, another design on their back
  const bw = 2.6, bh = 1.3, bx = lampHalf + 0.5 + bw / 2;
  if (kit.boards.length && bx + bw / 2 < span - 0.6) {
    for (const s of [-1, 1]) {
      const cx = s * bx, x0 = cx - bw / 2, x1 = cx + bw / 2, yt = beamUnder - 0.1, yb = yt - bh;
      const front = kit.boards[(s < 0 ? 0 : 1) % kit.boards.length], back = kit.boards[(s < 0 ? 2 : 3) % kit.boards.length];
      // (seen from the grid, local -X is its viewer's right: the cell reads from x1 to x0)
      b.quad([x1, yb, -0.04], [x0, yb, -0.04], [x0, yt, -0.04], [x1, yt, -0.04], face, cellUv(front));
      b.quad([x0, yb, 0.04], [x1, yb, 0.04], [x1, yt, 0.04], [x0, yt, 0.04], face, cellUv(back));
      for (const x of [x0 + 0.3, x1 - 0.3]) b.post(x, 0, yt, beamUnder + 0.02, 0.025, kit.frame);
    }
  }
  const g = b.geometry();
  const yaw = Math.atan2(f[0], f[2]);
  M4.makeRotationY(yaw).setPosition(o[0], 0, o[2]);
  return { geometry: g, matrices: Float32Array.from(M4.elements), count: 1 };
}
