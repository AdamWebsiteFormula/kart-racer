// The course limit, stretch by stretch (27 Sept 2026; Adam, asked whether the hedges and fences may come
// closer to the road: "Whatever Mario Kart World does"). Measured on Mario Kart World's open-country courses
// with the road's own width as the ruler (track-builder SOP, 27 Sept 2026): on a straight the drivable
// verge runs a quarter to a half of the road's width to a guardrail, a fence, a bank or a wall; on the
// outside of a bend it opens up (a pasture, open sand, a run-off: one to two road widths and more); on the
// inside of a bend a bank or a wall stands close (nothing to half a width); the start straight keeps about a
// third. A track's `courseLimit` gives each as a share of its road's width with both curbs, and this lays the
// limit per LUT sample and per side (Lut.reachL, reachR): how sharply the road turns picks between the
// straight, outside and inside values, the start straight takes its own, a shortcut's mouth keeps
// offroadReach on the shortcut's side (a kart must reach it), and between them the limit eases in and out at
// no more than limitSlope metres per metre of road, so a kart running wide is led back along an angled
// boundary, never stopped by a corner in it. Tunnels narrow it afterwards (tunnel.ts coverTunnels).
// Pure and deterministic (plain arithmetic, no trig): the leaderboard's replays read it.
import type { Branches } from './branches.ts';
import { BUILDER } from './constants.ts';
import type { Lut } from './lut.ts';
import type { TrackDefinition } from './types.ts';

const smoothstep = (x: number): number => { const k = x < 0 ? 0 : x > 1 ? 1 : x; return k * k * (3 - 2 * k); };

/** Every branch at offroadReach both sides; then, on a track with a courseLimit, the main line stretch by stretch. */
export function layCourseLimits(branches: Branches, def: TrackDefinition, startT: number): void {
  for (const b of branches.list) { b.lut.reachL.fill(BUILDER.offroadReach); b.lut.reachR.fill(BUILDER.offroadReach); }
  const cl = def.courseLimit;
  if (!cl || def.offroad !== true) return;
  const main = branches.main.lut;
  const raw = courseLimitRaw(main, cl, startT);
  // a shortcut's mouth: the main road keeps the old reach on the shortcut's side, so a kart gets onto it
  for (const b of branches.list) {
    if (b.isMain) continue;
    for (const [t, u] of [[b.entryT, 0.12], [b.exitT, 0.88]] as const) {
      const side = shortcutSide(main, b.lut, t, u);
      const out = side < 0 ? raw.left : raw.right;
      forMetres(main, t, BUILDER.limitMouth, (i) => { if (out[i] < BUILDER.offroadReach) out[i] = BUILDER.offroadReach; });
    }
  }
  ease(main, raw.left);
  ease(main, raw.right);
  // where the main line runs along a shortcut's own road (a route change lays it there: Mesa Rush's final lap takes
  // the mine), it keeps no more than that road's offroadReach, so nothing placed clear of the shortcut stands on it
  const cap = new Float32Array(main.n).fill(Infinity);
  const lines = branches.list.filter((b) => !b.isMain).map((b) => gridOf(b.lut));
  for (let i = 0; i < main.n; i++) {
    for (const g of lines) if (nearLine(g, main.px[i], main.pz[i], ALONG_BRANCH)) { cap[i] = BUILDER.offroadReach; break; }
  }
  easeDown(main, cap);
  for (let i = 0; i < main.n; i++) {
    if (raw.left[i] > cap[i]) raw.left[i] = cap[i];
    if (raw.right[i] > cap[i]) raw.right[i] = cap[i];
  }
  main.reachL.set(raw.left);
  main.reachR.set(raw.right);
}

/** Metres from a shortcut's centre line within which the main line counts as running along it. */
const ALONG_BRANCH = 1.5;

/** A road's samples filed by GRID-metre cell (so a lookup reads a few, not all 2048). */
const GRID = 8;
function gridOf(L: Lut): { L: Lut; cells: Map<number, number[]> } {
  const cells = new Map<number, number[]>();
  for (let i = 0; i < L.n; i++) {
    const k = cellKey(Math.floor(L.px[i] / GRID), Math.floor(L.pz[i] / GRID));
    let c = cells.get(k);
    if (!c) cells.set(k, (c = []));
    c.push(i);
  }
  return { L, cells };
}
const cellKey = (i: number, j: number): number => (i + 32768) * 65536 + (j + 32768);

/** Is (x, z) within `r` metres (level, r under GRID) of any sample of the road? */
function nearLine(g: { L: Lut; cells: Map<number, number[]> }, x: number, z: number, r: number): boolean {
  const r2 = r * r, ci = Math.floor(x / GRID), cj = Math.floor(z / GRID);
  for (let a = ci - 1; a <= ci + 1; a++) {
    for (let b = cj - 1; b <= cj + 1; b++) {
      const c = g.cells.get(cellKey(a, b));
      if (!c) continue;
      for (const i of c) { const dx = g.L.px[i] - x, dz = g.L.pz[i] - z; if (dx * dx + dz * dz < r2) return true; }
    }
  }
  return false;
}

/** The limit before easing: per sample and side, metres past the curb. */
export function courseLimitRaw(L: Lut, cl: NonNullable<TrackDefinition['courseLimit']>, startT: number): { left: Float32Array; right: Float32Array; bend: Float32Array } {
  const n = L.n, ds = L.length / L.step;
  const left = new Float32Array(n), right = new Float32Array(n), bend = new Float32Array(n);
  const K = Math.max(1, Math.round(BUILDER.limitWindow / 2 / ds));
  const k0 = 1 / BUILDER.limitBend[0], k1 = 1 / BUILDER.limitBend[1];
  const [before, after] = BUILDER.limitStart;
  for (let i = 0; i < n; i++) {
    const W = 2 * (L.hw[i] + BUILDER.kerbWidth);
    const straight = (cl.straight ?? BUILDER.offroadReach / W) * W;
    const outside = (cl.outside ?? cl.straight ?? BUILDER.offroadReach / W) * W;
    const inside = (cl.inside ?? cl.straight ?? BUILDER.offroadReach / W) * W;
    // how sharply the road turns here, and which way: the level tangent's change over the window, along the right
    const a = L.idx(i - K), b = L.idx(i + K);
    const ha = Math.sqrt(L.tx[a] * L.tx[a] + L.tz[a] * L.tz[a]) || 1, hb = Math.sqrt(L.tx[b] * L.tx[b] + L.tz[b] * L.tz[b]) || 1;
    const dx = L.tx[b] / hb - L.tx[a] / ha, dz = L.tz[b] / hb - L.tz[a] / ha;
    const kappa = Math.sqrt(dx * dx + dz * dz) / (2 * K * ds);
    const w = smoothstep((kappa - k0) / (k1 - k0));
    bend[i] = w;
    // turning toward the right (+lateral): the right is the inside
    const toRight = dx * L.rx[i] + dz * L.rz[i] > 0;
    let l = straight + w * ((toRight ? outside : inside) - straight);
    let r = straight + w * ((toRight ? inside : outside) - straight);
    // the start straight: the grid and the gantry
    const d = ((((i / L.step - startT) % 1) + 1.5) % 1 - 0.5) * L.length;
    if (d >= -before && d <= after && cl.start !== undefined) { l = cl.start * W; r = l; }
    left[i] = Math.max(BUILDER.limitMin, Math.min(BUILDER.limitMax, l));
    right[i] = Math.max(BUILDER.limitMin, Math.min(BUILDER.limitMax, r));
  }
  return { left, right, bend };
}

/** Which side of the main line (-1 left, 1 right) a shortcut lies on near one end: its point at `u` against the main line at `t`. */
function shortcutSide(main: Lut, branch: Lut, t: number, u: number): number {
  const p = branch.sample(u, 0).position;
  const c = main.sample(t, 0);
  const h = Math.sqrt(c.tangent[0] * c.tangent[0] + c.tangent[2] * c.tangent[2]) || 1;
  const lateral = ((p[0] - c.position[0]) * c.tangent[2] - (p[2] - c.position[2]) * c.tangent[0]) / h;
  return lateral < 0 ? -1 : 1;
}

/** Calls `f` with every main-line sample index within `metres` of t (both ways). */
function forMetres(L: Lut, t: number, metres: number, f: (i: number) => void): void {
  const ds = L.length / L.step, c = Math.round((((t % 1) + 1) % 1) * L.step), k = Math.ceil(metres / ds);
  for (let d = -k; d <= k; d++) f(L.idx(c + d));
}

/** The mirror of ease(): every narrow stretch eases in from its neighbours at limitSlope (the lower envelope). */
function easeDown(L: Lut, r: Float32Array): void {
  const n = L.n, step = BUILDER.limitSlope * (L.length / L.step);
  for (let pass = 0; pass < 2; pass++) {
    for (let k = 1; k < 2 * n; k++) { const i = k % n, p = (k - 1) % n; if (r[p] + step < r[i]) r[i] = r[p] + step; }
    for (let k = 2 * n - 2; k >= 0; k--) { const i = k % n, q = (k + 1) % n; if (r[q] + step < r[i]) r[i] = r[q] + step; }
  }
}

/**
 * Every wide stretch eases out to its neighbours at limitSlope (the upper envelope of cones under each value):
 * nothing narrows faster than that along the road, either way. Twice round the loop each way: a closed road.
 */
function ease(L: Lut, r: Float32Array): void {
  const n = L.n, step = BUILDER.limitSlope * (L.length / L.step);
  for (let pass = 0; pass < 2; pass++) {
    for (let k = 1; k < 2 * n; k++) { const i = k % n, p = (k - 1) % n; if (r[p] - step > r[i]) r[i] = r[p] - step; }
    for (let k = 2 * n - 2; k >= 0; k--) { const i = k % n, q = (k + 1) % n; if (r[q] - step > r[i]) r[i] = r[q] - step; }
  }
}
