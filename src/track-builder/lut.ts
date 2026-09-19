// Arc-length lookup table over a ClosedSpline. Sample i sits at t = i / n where t is
// distance along the track over total length. Flat typed arrays; hot paths are
// allocation-free except sample(), which returns a fresh TrackSample like the stub does.
import type { TrackSample } from '../kart-controller/types.ts';
import { BUILDER } from './constants.ts';
import { ClosedSpline } from './spline.ts';
import { SURFACES, surfaceId, type ControlPoint, type Vec3 } from './types.ts';

export const wrap01 = (t: number): number => {
  const w = t % 1;
  return w < 0 ? w + 1 : w;
};

const DEG = Math.PI / 180;

export interface LutOptions {
  samples?: number;
  divisions?: number;
}

export class Lut {
  readonly n: number;
  readonly length: number;
  readonly spline: ClosedSpline;
  // position
  readonly px: Float64Array; readonly py: Float64Array; readonly pz: Float64Array;
  // unit tangent (3D)
  readonly tx: Float64Array; readonly ty: Float64Array; readonly tz: Float64Array;
  // unit horizontal right = (tz, 0, -tx) normalised; same as kart-controller's right
  readonly rx: Float64Array; readonly rz: Float64Array;
  /** bank in radians; positive lifts the left edge */
  readonly bank: Float64Array;
  readonly hw: Float64Array;
  /** index into SURFACES; the shift may overwrite */
  readonly surface: Uint8Array;
  /** control-point segment the sample lies in */
  readonly seg: Uint16Array;
  /** per-sample grip scale, 1 until a shift multiplies it */
  readonly grip: Float64Array;
  readonly minY: number;
  readonly maxY: number;

  constructor(points: readonly ControlPoint[], opts: LutOptions = {}) {
    const n = opts.samples ?? BUILDER.lutSamples;
    const divisions = opts.divisions ?? BUILDER.arcDivisions;
    const spline = new ClosedSpline(points);
    this.spline = spline;
    this.n = n;
    this.px = new Float64Array(n); this.py = new Float64Array(n); this.pz = new Float64Array(n);
    this.tx = new Float64Array(n); this.ty = new Float64Array(n); this.tz = new Float64Array(n);
    this.rx = new Float64Array(n); this.rz = new Float64Array(n);
    this.bank = new Float64Array(n);
    this.hw = new Float64Array(n);
    this.surface = new Uint8Array(n);
    this.seg = new Uint16Array(n);
    this.grip = new Float64Array(n).fill(1);

    // 1. walk the curve at equal u, then resample at equal arc length
    const arc = spline.walkArcLength(divisions);
    const length = arc[divisions];
    this.length = length;
    const tmp: Vec3 = [0, 0, 0];
    let k = 0; // walking pointer into arc[]
    let minY = Infinity, maxY = -Infinity;
    const cp = points.length;
    for (let i = 0; i < n; i++) {
      const s = (i / n) * length;
      while (k < divisions - 1 && arc[k + 1] < s) k++;
      const span = arc[k + 1] - arc[k];
      const f = span > 0 ? (s - arc[k]) / span : 0;
      const u = (k + f) / divisions;
      spline.pointAt(u, tmp);
      this.px[i] = tmp[0]; this.py[i] = tmp[1]; this.pz[i] = tmp[2];
      if (tmp[1] < minY) minY = tmp[1];
      if (tmp[1] > maxY) maxY = tmp[1];

      // 2. per-segment authoring: surface holds, halfWidth and bank smoothstep to the next point
      const { index, local } = spline.segmentOf(u);
      const a = points[index];
      const b = points[(index + 1) % cp];
      const sm = local * local * (3 - 2 * local);
      this.seg[i] = index;
      this.surface[i] = surfaceId(a.surface);
      this.hw[i] = a.halfWidth + (b.halfWidth - a.halfWidth) * sm;
      const ba = (a.bank ?? 0) * DEG, bb = (b.bank ?? 0) * DEG;
      this.bank[i] = ba + (bb - ba) * sm;
    }
    this.minY = minY;
    this.maxY = maxY;

    // 3. tangents from central differences of the uniform samples; right is horizontal
    for (let i = 0; i < n; i++) {
      const ip = (i + 1) % n, im = (i - 1 + n) % n;
      let dx = this.px[ip] - this.px[im];
      let dy = this.py[ip] - this.py[im];
      let dz = this.pz[ip] - this.pz[im];
      const len = Math.hypot(dx, dy, dz) || 1;
      dx /= len; dy /= len; dz /= len;
      this.tx[i] = dx; this.ty[i] = dy; this.tz[i] = dz;
      const h = Math.hypot(dx, dz) || 1;
      this.rx[i] = dz / h;
      this.rz[i] = -dx / h;
    }
  }

  /** Blend the two neighbouring samples at t, then move `lateral` metres to the right. */
  sample(t: number, lateral: number): TrackSample {
    const n = this.n;
    const f = wrap01(t) * n;
    const i0 = Math.floor(f) % n;
    const i1 = (i0 + 1) % n;
    const a = f - Math.floor(f);
    const b = 1 - a;

    let tx = this.tx[i0] * b + this.tx[i1] * a;
    let ty = this.ty[i0] * b + this.ty[i1] * a;
    let tz = this.tz[i0] * b + this.tz[i1] * a;
    const tl = Math.hypot(tx, ty, tz) || 1;
    tx /= tl; ty /= tl; tz /= tl;
    const h = Math.hypot(tx, tz) || 1;
    const rx = tz / h, rz = -tx / h;

    const bank = this.bank[i0] * b + this.bank[i1] * a;
    const rise = -lateral * Math.tan(bank); // positive bank lifts the left (negative lateral) edge
    const x = this.px[i0] * b + this.px[i1] * a + rx * lateral;
    const y = this.py[i0] * b + this.py[i1] * a + rise;
    const z = this.pz[i0] * b + this.pz[i1] * a + rz * lateral;

    // banked right vector, then normal = tangent × rightBanked (points up on flat road)
    const rbx = rx, rby = -Math.tan(bank), rbz = rz;
    let nx = ty * rbz - tz * rby;
    let ny = tz * rbx - tx * rbz;
    let nz = tx * rby - ty * rbx;
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl; ny /= nl; nz /= nl;

    return {
      position: [x, y, z],
      tangent: [tx, ty, tz],
      normal: [nx, ny, nz],
      groundY: y,
      halfWidth: this.hw[i0] * b + this.hw[i1] * a,
      surface: SURFACES[this.surface[i0]],
      gripScale: this.grip[i0] * b + this.grip[i1] * a,
    };
  }

  /** Squared XZ distance from a point to sample i. */
  private dist2XZ(i: number, x: number, z: number): number {
    const dx = this.px[i] - x, dz = this.pz[i] - z;
    return dx * dx + dz * dz;
  }

  private dist2XYZ(i: number, x: number, y: number, z: number): number {
    const dx = this.px[i] - x, dy = this.py[i] - y, dz = this.pz[i] - z;
    return dx * dx + dy * dy + dz * dz;
  }

  /**
   * Local search only: nearest t by XZ distance inside hintT ± window, refined by projecting
   * onto the two LUT segments next to the best sample. Never searches globally.
   */
  nearestT(position: Vec3, hintT: number, window: number): number {
    const n = this.n;
    const c = Math.round(wrap01(hintT) * n);
    const W = Math.max(1, Math.round(window * n));
    const x = position[0], z = position[2];
    let best = c % n;
    let bestD = Infinity;
    for (let k = -W; k <= W; k++) {
      const i = (((c + k) % n) + n) % n;
      const d = this.dist2XZ(i, x, z);
      if (d < bestD) { bestD = d; best = i; }
    }
    return this.refine(best, bestD, x, 0, z, false);
  }

  /** Global 3D search: coarse stride then refine. Spawn, respawn, feature baking and tests only. */
  nearestTGlobal(position: Vec3): number {
    const n = this.n;
    const step = BUILDER.globalSearchStep;
    const [x, y, z] = position;
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < n; i += step) {
      const d = this.dist2XYZ(i, x, y, z);
      if (d < bestD) { bestD = d; best = i; }
    }
    const c = best;
    for (let k = -step; k <= step; k++) {
      const i = (((c + k) % n) + n) % n;
      const d = this.dist2XYZ(i, x, y, z);
      if (d < bestD) { bestD = d; best = i; }
    }
    return this.refine(best, bestD, x, y, z, true);
  }

  /** Project onto segments (best-1 → best) and (best → best+1); pick the closer. */
  private refine(best: number, bestD: number, x: number, y: number, z: number, use3d: boolean): number {
    const n = this.n;
    let bestT = best / n;
    let bestSeg = bestD;
    for (let side = -1; side <= 0; side++) {
      const ia = (best + side + n) % n;
      const ib = (ia + 1) % n;
      const ax = this.px[ia], ay = this.py[ia], az = this.pz[ia];
      const abx = this.px[ib] - ax, aby = use3d ? this.py[ib] - ay : 0, abz = this.pz[ib] - az;
      const ab2 = abx * abx + aby * aby + abz * abz;
      if (ab2 <= 1e-12) continue;
      const py = use3d ? y - ay : 0;
      let s = ((x - ax) * abx + py * aby + (z - az) * abz) / ab2;
      s = s < 0 ? 0 : s > 1 ? 1 : s;
      const qx = ax + abx * s - x;
      const qy = use3d ? ay + aby * s - y : 0;
      const qz = az + abz * s - z;
      const d = qx * qx + qy * qy + qz * qz;
      if (d < bestSeg) { bestSeg = d; bestT = (ia + s) / n; }
    }
    return wrap01(bestT);
  }
}

export function buildLut(points: readonly ControlPoint[], opts?: LutOptions): Lut {
  return new Lut(points, opts);
}
