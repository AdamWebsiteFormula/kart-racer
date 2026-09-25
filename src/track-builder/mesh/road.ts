// Hand-built road ribbon (appendix A§3: not TubeGeometry). Per LUT sample: road (2 verts),
// kerb each side (face, top, inner face), shoulder each side falling SHOULDER_DROP over
// SHOULDER_WIDTH. Every strip of a chunk lands in ONE indexed BufferGeometry with vertex
// colours and UV v = arcLength / ROAD_TILE_LENGTH. A `mark` attribute says what each strip is
// (ROAD_MARK): the road material paints crisp kerb stripes and the road lines from it (scene.ts).
import { BufferAttribute, BufferGeometry } from 'three';
import { BUILDER } from '../constants.ts';
import type { Lut } from '../lut.ts';
import { SURFACES } from '../types.ts';
import type { Rgb, TrackPalette } from './palette.ts';

interface Strip {
  /** lateral of the left (a) and right (b) vertex as a function of halfWidth */
  a: (hw: number) => number;
  b: (hw: number) => number;
  /** height above the banked road surface */
  ah: number;
  bh: number;
  colour: (sampleIndex: number, arcLength: number) => Rgb;
  /** what the strip is, for the material (ROAD_MARK) */
  mark: number;
}

/** The `mark` attribute: the road surface, a kerb, a shoulder, or a strip that blends under the main road. */
export const ROAD_MARK = Object.freeze({ road: 0, kerb: 1, shoulder: 2, plain: 3, cliffShoulder: 4 });

/** Sample indices covering local u0..u1 inclusive. On a closed LUT u1 = 1 reaches index n, which wraps to 0 and closes the seam. */
export function sampleRange(lut: Lut, u0: number, u1: number): { i0: number; i1: number } {
  return { i0: Math.floor(u0 * lut.step), i1: Math.ceil(u1 * lut.step) };
}

export interface RibbonOptions {
  /** an off-road track: no shoulder strip on a walled side (the land meets the curb), a skirt under the curb */
  offroad?: boolean;
  /** local-u length at each end where kerbs and shoulders vanish and the ribbon sinks under the main road (branches) */
  blend?: number;
  /** LUT samples [from, to] left undrawn: a stretch drawn by something else (Canyon's rope bridge: mesh/shiftStage.ts) */
  gap?: readonly [number, number];
}

const BLEND_SINK = 0.03;

const MUD = SURFACES.indexOf('mud');
/** Metres into a mud patch over which its ragged edge wanders (the road material draws it from `surf`). */
export const MUD_EDGE = 6;

/**
 * Per LUT sample, how deep into a mud patch it is: 0 off the mud, 0.5 on its first sample, rising to 1
 * MUD_EDGE metres in; and the nearest sample off the mud (itself off it, -1 when the whole road is mud).
 * Only the mud's own samples change, so a mud patch never repaints the road around it (a surface
 * shift rebuilds just the chunks it touches).
 */
export function mudDepth(lut: Lut): { depth: Float32Array; near: Int32Array } {
  const n = lut.n, depth = new Float32Array(n), near = new Int32Array(n).fill(-1);
  const gap = new Float64Array(n).fill(Infinity), metres = lut.length / lut.step;
  // two sweeps each way (twice round a closed road, so a patch across the seam sees both ends)
  for (const dir of [1, -1]) {
    let last = -1, run = Infinity;
    const laps = lut.closed ? 2 : 1;
    for (let k = 0; k < n * laps; k++) {
      const i = dir > 0 ? k % n : n - 1 - (k % n);
      if (lut.surface[i] !== MUD) { last = i; run = 0; near[i] = i; gap[i] = 0; continue; }
      run++;
      if (last >= 0 && run - 1 < gap[i]) { gap[i] = run - 1; near[i] = last; }
    }
  }
  for (let i = 0; i < n; i++) depth[i] = lut.surface[i] !== MUD ? 0 : 0.5 + 0.5 * Math.min(1, (gap[i] * metres) / MUD_EDGE);
  return { depth, near };
}

/**
 * The road's signed turn at sample `i`, radians a metre, read from sample i − k to i + k (fewer at an
 * open road's ends): positive where it turns toward +lateral (the side the LUT's right vector points
 * to), which is then the corner's inside.
 */
export function turnAt(lut: Lut, i: number, k: number): number {
  const a = lut.idx(i - k), b = lut.idx(i + k);
  const samples = lut.closed ? 2 * k : b - a;
  if (samples <= 0) return 0;
  const along = lut.tx[b] * lut.tx[a] + lut.tz[b] * lut.tz[a];
  const across = lut.tx[b] * lut.rx[a] + lut.tz[b] * lut.rz[a];
  return Math.atan2(across, along) / ((samples * lut.length) / lut.step);
}

/** Every sample's turn (turnAt over ±`metres` / 2), then averaged over ±`smooth` metres (a box, wrapped or clamped). */
function turns(lut: Lut, metres: number, smooth: number): Float32Array {
  const ds = lut.length / lut.step, k = Math.max(1, Math.round(metres / 2 / ds)), n = lut.n;
  const raw = new Float32Array(n);
  for (let i = 0; i < n; i++) raw[i] = turnAt(lut, i, k);
  const w = Math.round(smooth / ds);
  if (w < 1) return raw;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let d = -w; d <= w; d++) s += raw[lut.idx(i + d)];
    out[i] = s / (2 * w + 1);
  }
  return out;
}

/**
 * The racing line (the PBR look's darker, polished line and its tire marks: art-pipeline surfaces.ts):
 * it swings toward each corner's inside, fully at a turn of `full` (radius about 35 m), `share` of the
 * way from the middle to the edge less `margin`, easing in and out over `smooth` metres; on a straight
 * it runs down the middle. `window`: metres the turn is read over.
 */
export const RACING_LINE = Object.freeze({ window: 6, smooth: 18, full: 1 / 35, share: 0.6, margin: 1.6 });

/** Per LUT sample, the racing line's lateral in metres (+ toward +lateral). */
export function racingLine(lut: Lut): Float32Array {
  const k = turns(lut, RACING_LINE.window, RACING_LINE.smooth), out = new Float32Array(lut.n);
  for (let i = 0; i < lut.n; i++) {
    const pull = Math.min(1, Math.abs(k[i]) / RACING_LINE.full), room = Math.max(0, lut.hw[i] - RACING_LINE.margin);
    out[i] = Math.sign(k[i]) * pull * room * RACING_LINE.share;
  }
  return out;
}

/**
 * Red-and-white curbs on the inside of tight corners (the PBR look, where the track's edge style takes
 * stripes: scene.ts EDGES): from a turn of `from` (radius 70 m) to certain at `full` (radius 45 m),
 * read over `window` metres, then run on `runOn` metres before and after the corner so a curb starts
 * ahead of the turn-in and ends past the exit, as a circuit's do.
 */
export const CURBS = Object.freeze({ window: 6, from: 1 / 70, full: 1 / 45, runOn: 7 });

/** Per LUT sample, which side's curb is a tight corner's inside and how surely: + the +lateral side, − the other, 0..1 (0: no curb). */
export function insideCurbs(lut: Lut): Float32Array {
  const k = turns(lut, CURBS.window, 0), n = lut.n, w = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = Math.max(0, Math.min(1, (Math.abs(k[i]) - CURBS.from) / (CURBS.full - CURBS.from)));
    w[i] = Math.sign(k[i]) * x * x * (3 - 2 * x);
  }
  // run on past the corner: each sample takes the surest curb within runOn metres
  const r = Math.round(CURBS.runOn / (lut.length / lut.step)), out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let best = 0;
    for (let d = -r; d <= r; d++) { const v = w[lut.idx(i + d)]; if (Math.abs(v) > Math.abs(best)) best = v; }
    out[i] = best;
  }
  return out;
}

/** Each LUT's racing line and curbs, worked out once (a LUT never moves; a route change makes a new one). */
const LANES = new WeakMap<Lut, { line: Float32Array; curbs: Float32Array }>();
function lanesOf(lut: Lut): { line: Float32Array; curbs: Float32Array } {
  let l = LANES.get(lut);
  if (!l) LANES.set(lut, (l = { line: racingLine(lut), curbs: insideCurbs(lut) }));
  return l;
}

export function buildRibbon(lut: Lut, u0: number, u1: number, palette: TrackPalette, opts: RibbonOptions = {}): BufferGeometry {
  const { kerbWidth: kw, kerbHeight: kh, shoulderWidth: sw, shoulderDrop: drop, roadTileLength: tile } = BUILDER;
  const blend = opts.blend ?? 0;
  const blended = (i: number) => { const u = i / lut.step; return blend > 0 && (u < blend || u > 1 - blend); };
  const stripe = (s: number): Rgb => (Math.floor(s / (tile / 4)) % 2 === 0 ? palette.kerbA : palette.kerbB);
  const roadColour = (i: number) => palette.surfaces[SURFACES[lut.surface[i]]];
  const kerb = (i: number, s: number) => (blended(i) ? roadColour(i) : stripe(s));
  // a mud patch is painted over the road by the material (`surf`, scene.ts): under it the ribbon keeps
  // the road it lies on, so its ragged edge shows that road, not a ruler-straight colour change
  const mud = mudDepth(lut);
  const road = (i: number) => roadColour(mud.near[i] >= 0 ? mud.near[i] : i);
  const shoulder = (i: number) => (blended(i) ? roadColour(i) : palette.shoulder);
  const M = ROAD_MARK;
  const strips: Strip[] = [
    { a: (hw) => -(hw + kw + sw), ah: -drop, b: (hw) => -(hw + kw), bh: 0, colour: shoulder, mark: M.shoulder },
    { a: (hw) => -(hw + kw), ah: opts.offroad ? -0.45 : 0, b: (hw) => -(hw + kw), bh: kh, colour: kerb, mark: M.kerb },
    { a: (hw) => -(hw + kw), ah: kh, b: (hw) => -hw, bh: kh, colour: kerb, mark: M.kerb },
    { a: (hw) => -hw, ah: kh, b: (hw) => -hw, bh: 0, colour: kerb, mark: M.kerb },
    { a: (hw) => -hw, ah: 0, b: (hw) => hw, bh: 0, colour: road, mark: M.road },
    { a: (hw) => hw, ah: 0, b: (hw) => hw, bh: kh, colour: kerb, mark: M.kerb },
    { a: (hw) => hw, ah: kh, b: (hw) => hw + kw, bh: kh, colour: kerb, mark: M.kerb },
    { a: (hw) => hw + kw, ah: kh, b: (hw) => hw + kw, bh: opts.offroad ? -0.45 : 0, colour: kerb, mark: M.kerb },
    { a: (hw) => hw + kw, ah: 0, b: (hw) => hw + kw + sw, bh: -drop, colour: shoulder, mark: M.shoulder },
  ];

  const { i0, i1 } = sampleRange(lut, u0, u1);
  const count = i1 - i0 + 1;
  const perStrip = count * 2;
  const total = strips.length * perStrip;
  const pos = new Float32Array(total * 3);
  const col = new Float32Array(total * 3);
  const uv = new Float32Array(total * 2);
  const mark = new Float32Array(total);
  const bend = new Float32Array(total);
  const surf = new Float32Array(total);
  // the PBR look's road (art-pipeline surfaces.ts roadDetail): the racing line across the road (0..1, as
  // uv.x) and the half-width, and a kerb strip's inside-corner curb (0..1); the toon look reads neither
  const lane = new Float32Array(total * 2);
  const curb = new Float32Array(total);
  const lanes = lanesOf(lut);
  // how sharply the road turns here: the heading change across a few samples, per metre, eased
  // from a gentle sweep (radius ~80 m) to a real corner (radius ~40 m)
  const K = 4, ds = (2 * K * lut.length) / lut.step;
  const bendAt = (j: number): number => {
    const a = lut.idx(j - K), b = lut.idx(j + K);
    const cross = lut.rx[a] * lut.rz[b] - lut.rz[a] * lut.rx[b], dot = lut.rx[a] * lut.rx[b] + lut.rz[a] * lut.rz[b];
    const k = Math.abs(Math.atan2(cross, dot)) / ds;
    const x = Math.max(0, Math.min(1, (k - 0.012) / 0.013));
    return x * x * (3 - 2 * x);
  };
  const idx = new Uint32Array(strips.length * (count - 1) * 6);

  let v = 0, f = 0;
  for (const strip of strips) {
    const base = v;
    // which side of the road a kerb strip is on (-1, 1)
    const stripSide = Math.sign(strip.a(1) + strip.b(1));
    for (let i = i0; i <= i1; i++) {
      const j = lut.idx(i);
      const hw = lut.hw[j];
      const s = (i / lut.step) * lut.length; // unwrapped so uv v stays continuous across the seam
      const tanB = Math.tan(lut.bank[j]);
      const c = strip.colour(j, (j / lut.step) * lut.length); // wrapped so the seam vertex gets one stripe colour
      const inBlend = blended(i);
      for (const side of [0, 1] as const) {
        const l = side === 0 ? strip.a(hw) : strip.b(hw);
        // in the blend the kerb and shoulder lie flat and the whole ribbon sinks so the main road draws on top
        const h = (inBlend ? 0 : side === 0 ? strip.ah : strip.bh) - (inBlend ? BLEND_SINK : 0);
        pos[v * 3] = lut.px[j] + lut.rx[j] * l;
        pos[v * 3 + 1] = lut.py[j] - l * tanB + h;
        pos[v * 3 + 2] = lut.pz[j] + lut.rz[j] * l;
        col[v * 3] = c[0]; col[v * 3 + 1] = c[1]; col[v * 3 + 2] = c[2];
        uv[v * 2] = side; uv[v * 2 + 1] = s / tile;
        // a branch's blended ends are plain: no stripes, no lines where it slides under the main road
        // a shoulder on an open edge (a cliff lip) is drawn; on an off-road track a walled one is not (scene.ts discards it)
        const sideOpen = (lut.open[j] & (l < 0 ? 1 : 2)) !== 0;
        // on an off-road track the blended ends have no shoulder either (grass meets their edge) and no
        // lane lines (under the main road they only flicker through it)
        mark[v] = inBlend
          ? (strip.mark === M.shoulder && opts.offroad ? M.shoulder : strip.mark === M.road && !opts.offroad ? M.road : M.plain)
          : strip.mark === M.shoulder && sideOpen ? M.cliffShoulder : strip.mark;
        bend[v] = lut.closed || (i - K >= 0 && i + K <= lut.step) ? bendAt(i) : 0;
        surf[v] = strip.mark === M.road ? mud.depth[j] : 0;
        lane[v * 2] = 0.5 + lanes.line[j] / (2 * hw); lane[v * 2 + 1] = hw;
        curb[v] = strip.mark === M.kerb ? Math.max(0, lanes.curbs[j] * stripSide) : 0;
        v++;
      }
    }
    // quads a0 b0 / a1 b1 → (a0, a1, b0), (b0, a1, b1): normals face up (tangent × right)
    for (let k = 0; k < count - 1; k++) {
      const a0 = base + k * 2, b0 = a0 + 1, a1 = a0 + 2, b1 = a0 + 3;
      const j = lut.idx(i0 + k), j1 = lut.idx(i0 + k + 1);
      if (opts.gap && j >= opts.gap[0] && j1 <= opts.gap[1] && j1 > j) {
        // not drawn: a degenerate pair
        for (let q = 0; q < 6; q++) idx[f++] = a0;
        continue;
      }
      idx[f++] = a0; idx[f++] = a1; idx[f++] = b0;
      idx[f++] = b0; idx[f++] = a1; idx[f++] = b1;
    }
  }

  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('color', new BufferAttribute(col, 3));
  g.setAttribute('uv', new BufferAttribute(uv, 2));
  g.setAttribute('mark', new BufferAttribute(mark, 1));
  g.setAttribute('bend', new BufferAttribute(bend, 1));
  g.setAttribute('surf', new BufferAttribute(surf, 1));
  g.setAttribute('lane', new BufferAttribute(lane, 2));
  g.setAttribute('curb', new BufferAttribute(curb, 1));
  g.setIndex(new BufferAttribute(idx, 1));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}
