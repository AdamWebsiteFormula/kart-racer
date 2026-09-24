// The land beside the road on an off-road track: one rule for the land as drawn (mesh/land.ts) and
// the kart's ground past the curb (lut.ts), so a kart drives on exactly what it sees. Every stretch of
// road near a point (the nearest stretch of each branch, and of the same branch where it comes back
// past itself) is a piece. A piece's own land is flat from its curb out, a hair under the curb's
// outer edge. The pieces blend by how far past each one's curb the point is (inverse distance, faded
// out by `blendReach`), so the land meets every curb exactly and runs as one smooth slope between two
// roads at a shortcut mouth: no step, and nothing to snap a kart up or down when it changes road.
// Built once from the roads as they are at the start (the land is drawn once; a route change later
// does not move it). No Three.js in here.
import { BUILDER } from './constants.ts';
import type { Lut } from './lut.ts';
import type { TrackDefinition } from './types.ts';

/** Metres past a piece's curb at which it stops shaping the land (a road that far off has no say). */
const BLEND_REACH = 30;
/** Keeps a piece's weight finite on its own curb; small, so the land meets the curb to a millimetre. */
const BLEND_EPS = 0.01;
/** Grid cell of the sample index, metres. */
const CELL = 16;
/** Metres over which a shortcut's say over the land grows from its ends (they lie on the main road). */
const END_FADE = 15;

export interface LandPoint {
  /** the land's height here */
  top: number;
  /** metres past the nearest piece's curb (negative: on that road) */
  edge: number;
  /** metres past the next-nearest piece's curb (Infinity: only one) */
  next: number;
  /** the nearest piece's side is an open edge (a cliff: land.ts drops it sheer) */
  open: boolean;
  /** road pieces that shaped this point (0: no road within reach) */
  pieces: number;
}

export class RoadIndex {
  private readonly luts: readonly Lut[];
  private readonly x0: number;
  private readonly z0: number;
  private readonly nx: number;
  private readonly nz: number;
  /** CSR grid: items of cell c are items[start[c] .. start[c + 1]), each (lut << 20) | sample */
  private readonly start: Int32Array;
  private readonly items: Int32Array;
  private readonly maxHw: number;

  constructor(luts: readonly Lut[]) {
    this.luts = luts;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, maxHw = 0;
    for (const L of luts) {
      for (let i = 0; i < L.n; i++) {
        if (L.px[i] < minX) minX = L.px[i]; if (L.px[i] > maxX) maxX = L.px[i];
        if (L.pz[i] < minZ) minZ = L.pz[i]; if (L.pz[i] > maxZ) maxZ = L.pz[i];
        if (L.hw[i] > maxHw) maxHw = L.hw[i];
      }
    }
    this.maxHw = maxHw;
    this.x0 = minX - CELL; this.z0 = minZ - CELL;
    this.nx = Math.ceil((maxX - minX) / CELL) + 3; this.nz = Math.ceil((maxZ - minZ) / CELL) + 3;
    const counts = new Int32Array(this.nx * this.nz + 1);
    const cellOf = (L: Lut, i: number) => Math.floor((L.pz[i] - this.z0) / CELL) * this.nx + Math.floor((L.px[i] - this.x0) / CELL);
    for (const L of luts) for (let i = 0; i < L.n; i++) counts[cellOf(L, i) + 1]++;
    for (let c = 0; c < this.nx * this.nz; c++) counts[c + 1] += counts[c];
    this.start = counts.slice();
    const fill = counts.slice();
    this.items = new Int32Array(this.start[this.nx * this.nz]);
    luts.forEach((L, b) => { for (let i = 0; i < L.n; i++) this.items[fill[cellOf(L, i)]++] = (b << 20) | i; });
  }

  /** The land's height at (x, z); NaN with no road within reach. */
  top(x: number, z: number): number {
    return this.query(x, z, SCRATCH, BLEND_REACH).top;
  }

  /**
   * The land at (x, z). `reach`: metres past a curb a road is still looked for (the drawn land's
   * slope needs more than the blend's BLEND_REACH; the result's top is the same either way).
   */
  query(x: number, z: number, out: LandPoint, reach = BLEND_REACH): LandPoint {
    const R = this.maxHw + BUILDER.kerbWidth + reach, R2 = R * R;
    const c0 = Math.max(0, Math.floor((x - R - this.x0) / CELL)), c1 = Math.min(this.nx - 1, Math.floor((x + R - this.x0) / CELL));
    const r0 = Math.max(0, Math.floor((z - R - this.z0) / CELL)), r1 = Math.min(this.nz - 1, Math.floor((z + R - this.z0) / CELL));
    let wSum = 0, hSum = 0, nearest = Infinity, next = Infinity, nearH = NaN, nearOpen = false, pieces = 0;
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const cell = r * this.nx + c;
        for (let k = this.start[cell]; k < this.start[cell + 1]; k++) {
          const it = this.items[k], L = this.luts[it >> 20], i = it & 0xfffff;
          const d2 = dist2(L, i, x, z);
          if (d2 > R2) continue;
          // one piece per pass of a road: the sample nearer than both its neighbours
          const ip = L.idx(i - 1), in_ = L.idx(i + 1);
          if ((ip !== i && dist2(L, ip, x, z) < d2) || (in_ !== i && dist2(L, in_, x, z) <= d2)) continue;
          const p = piece(L, i, x, z);
          if (!p || p.edge > reach) continue;
          pieces++;
          if (p.edge < nearest) { next = nearest; nearest = p.edge; nearH = p.h; nearOpen = p.open; } else if (p.edge < next) next = p.edge;
          const e = p.edge > 0 ? p.edge : 0;
          const fade = 1 - e / BLEND_REACH;
          if (fade <= 0) continue;
          const w = (fade * fade * p.fade) / (e + BLEND_EPS);
          wSum += w; hSum += w * p.h;
        }
      }
    }
    out.top = wSum > 1e-12 ? hSum / wSum : nearH;
    out.edge = nearest;
    out.next = next;
    out.open = nearOpen;
    out.pieces = pieces;
    return out;
  }
}

const SCRATCH: LandPoint = { top: 0, edge: 0, next: 0, open: false, pieces: 0 };
const PIECE = { h: 0, edge: 0, open: false, fade: 1 };

function dist2(L: Lut, i: number, x: number, z: number): number {
  const dx = L.px[i] - x, dz = L.pz[i] - z;
  return dx * dx + dz * dz;
}

/**
 * The piece of road around sample i nearest (x, z): its own land height there and how far past its
 * curb the point is. Projects onto the chord before or after i, whichever is nearer, and reads the
 * road as lut.ts does (height, bank and width interpolated along the road).
 */
function piece(L: Lut, i: number, x: number, z: number): typeof PIECE | null {
  let best = Infinity, fi = i;
  for (let j = i - 1; j <= i; j++) {
    const a = L.idx(j), b = L.idx(j + 1);
    if (a === b) continue;
    const ex = L.px[b] - L.px[a], ez = L.pz[b] - L.pz[a], len2 = ex * ex + ez * ez;
    if (len2 <= 0) continue;
    const f = ((x - L.px[a]) * ex + (z - L.pz[a]) * ez) / len2;
    const fc = f < 0 ? 0 : f > 1 ? 1 : f;
    const qx = L.px[a] + ex * fc - x, qz = L.pz[a] + ez * fc - z, d = qx * qx + qz * qz;
    if (d < best) { best = d; fi = j + fc; }
  }
  // an open road (a shortcut) has no say past its ends: they sit on the main road, whose land it is
  if (!L.closed && (i === 0 || i === L.n - 1)) {
    const a = i, sgn = i === 0 ? -1 : 1;
    const ahead = ((x - L.px[a]) * L.tx[a] + (z - L.pz[a]) * L.tz[a]) * sgn;
    if (ahead > 0) return null;
  }
  const i0 = L.idx(Math.floor(fi)), i1 = L.idx(Math.floor(fi) + 1), u = fi - Math.floor(fi), v = 1 - u;
  const cx = L.px[i0] * v + L.px[i1] * u, cz = L.pz[i0] * v + L.pz[i1] * u;
  const rx = L.rx[i0] * v + L.rx[i1] * u, rz = L.rz[i0] * v + L.rz[i1] * u, rl = Math.hypot(rx, rz) || 1;
  const lat = ((x - cx) * rx + (z - cz) * rz) / rl;
  const hw = L.hw[i0] * v + L.hw[i1] * u, curb = hw + BUILDER.kerbWidth;
  const bank = L.bank[i0] * v + L.bank[i1] * u;
  PIECE.open = (L.open[i0] & (lat < 0 ? 1 : 2)) !== 0;
  // flat from the curb out; an open edge's land runs under the ribbon's falling shoulder, as before
  const flatFrom = PIECE.open ? curb + BUILDER.shoulderWidth : curb;
  const latC = lat < -flatFrom ? -flatFrom : lat > flatFrom ? flatFrom : lat;
  PIECE.h = L.py[i0] * v + L.py[i1] * u - latC * Math.tan(bank) - BUILDER.offroadDrop;
  const past = Math.abs(lat) - curb;
  PIECE.edge = past;
  // a shortcut hands the land to the main road near its ends, where the two are welded (branches.ts)
  if (L.closed) PIECE.fade = 1;
  else {
    const m = Math.min(1, (Math.min(fi, L.n - 1 - fi) * L.length) / L.step / END_FADE);
    PIECE.fade = m * m * (3 - 2 * m);
  }
  return PIECE;
}

/**
 * The ground plane's height as drawn (scene.ts) and as the floor under the off-road (lut.ts). On an
 * off-road track it sits under the lowest curb of the main line, so a banked corner's low edge
 * never sinks into the grass. -Infinity for a sky track (no ground).
 */
export function groundPlaneY(def: TrackDefinition, main: Lut): number {
  const g = def.environment?.ground;
  if (g?.kind === 'none') return -Infinity;
  const y = g?.y ?? 0;
  if (def.offroad !== true) return y;
  let low = Infinity;
  for (let i = 0; i < main.n; i++) {
    const curb = main.hw[i] + BUILDER.kerbWidth;
    const edge = main.py[i] - curb * Math.abs(Math.tan(main.bank[i]));
    if (edge < low) low = edge;
  }
  return Math.min(y, low - BUILDER.offroadDrop - 0.25);
}
