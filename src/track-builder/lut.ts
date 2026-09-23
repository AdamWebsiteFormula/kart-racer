// Arc-length lookup table over a Spline. Closed (main line): sample i sits at
// t = i / n and everything wraps. Open (shortcut branch): sample i sits at
// u = i / (n - 1) and everything clamps. Flat typed arrays; hot paths are
// allocation-free. sample() allocates a fresh TrackSample like the stub does;
// sampleInto() fills a caller-owned one.
import type { TrackSample } from '../kart-controller/types.ts';
import { BUILDER } from './constants.ts';
import { ClosedSpline, OpenSpline, type Spline } from './spline.ts';
import { SURFACES, surfaceId, type ControlPoint, type Vec3 } from './types.ts';

export const wrap01 = (t: number): number => {
  const w = t % 1;
  return w < 0 ? w + 1 : w;
};
export const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);

const DEG = Math.PI / 180;

export interface LutOptions {
  samples?: number;
  divisions?: number;
  /** false builds an open branch LUT. Default true. */
  closed?: boolean;
}

export class Lut {
  readonly n: number;
  readonly closed: boolean;
  /** Samples per unit t: n when closed, n − 1 when open. */
  readonly step: number;
  readonly length: number;
  readonly spline: Spline;
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
  /** open edges per sample: bit 1 left, bit 2 right (Track.rebuildDerived fills it from the def) */
  readonly open: Uint8Array;
  /** control-point segment the sample lies in */
  readonly seg: Uint16Array;
  /** per-sample grip scale, 1 until a shift multiplies it */
  readonly grip: Float64Array;
  readonly minY: number;
  readonly maxY: number;

  constructor(points: readonly ControlPoint[], opts: LutOptions = {}) {
    const n = opts.samples ?? BUILDER.lutSamples;
    const divisions = opts.divisions ?? BUILDER.arcDivisions;
    const closed = opts.closed ?? true;
    const spline: Spline = closed ? new ClosedSpline(points) : new OpenSpline(points);
    this.spline = spline;
    this.n = n;
    this.closed = closed;
    this.step = closed ? n : n - 1;
    this.px = new Float64Array(n); this.py = new Float64Array(n); this.pz = new Float64Array(n);
    this.tx = new Float64Array(n); this.ty = new Float64Array(n); this.tz = new Float64Array(n);
    this.rx = new Float64Array(n); this.rz = new Float64Array(n);
    this.bank = new Float64Array(n);
    this.hw = new Float64Array(n);
    this.surface = new Uint8Array(n);
    this.open = new Uint8Array(n);
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
      const s = (i / this.step) * length;
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

    // 3. tangents from central differences (one-sided at open ends); right is horizontal
    for (let i = 0; i < n; i++) {
      const ip = this.idx(i + 1), im = this.idx(i - 1);
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

  /** Sample index wrapped (closed) or clamped (open). */
  idx(i: number): number {
    const n = this.n;
    if (this.closed) return ((i % n) + n) % n;
    return i < 0 ? 0 : i >= n ? n - 1 : i;
  }

  /** t wrapped (closed) or clamped (open). */
  norm(t: number): number {
    return this.closed ? wrap01(t) : clamp01(t);
  }

  /** Blend the two neighbouring samples at t, then move `lateral` metres to the right. Allocates. */
  sample(t: number, lateral: number): TrackSample {
    return this.sampleInto(t, lateral, {
      position: [0, 0, 0], tangent: [0, 0, 0], normal: [0, 0, 0],
      groundY: 0, halfWidth: 0, surface: 'road', gripScale: 1,
    });
  }

  /** Same as sample() but writes into `out` and returns it. Allocation-free; use on hot paths. */
  sampleInto(t: number, lateral: number, out: TrackSample): TrackSample {
    const f = this.norm(t) * this.step;
    const fi = Math.floor(f);
    const i0 = this.idx(fi);
    const i1 = this.idx(fi + 1);
    const a = f - fi;
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

    const p = out.position, tg = out.tangent, nm = out.normal;
    p[0] = x; p[1] = y; p[2] = z;
    tg[0] = tx; tg[1] = ty; tg[2] = tz;
    nm[0] = nx; nm[1] = ny; nm[2] = nz;
    out.groundY = y;
    out.halfWidth = this.hw[i0] * b + this.hw[i1] * a;
    out.surface = SURFACES[this.surface[i0]];
    out.gripScale = this.grip[i0] * b + this.grip[i1] * a;
    const open = this.open[i0];
    out.open = open;
    out.overCliff = false;
    if (open & (lateral < 0 ? 1 : 2)) {
      // an open edge: loose ground over the kerb, then nothing past the shoulder
      const off = Math.abs(lateral) - out.halfWidth;
      if (off > BUILDER.kerbWidth) {
        out.surface = 'dirt';
        // the shoulder falls away to the lip, as road.ts draws it
        const drop = BUILDER.shoulderDrop * Math.min(1, (off - BUILDER.kerbWidth) / BUILDER.shoulderWidth);
        out.groundY -= drop;
        p[1] -= drop;
      }
      out.overCliff = off > BUILDER.kerbWidth + BUILDER.shoulderWidth;
    }
    return out;
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
    const c = Math.round(this.norm(hintT) * this.step);
    const W = Math.max(1, Math.round(window * this.step));
    const x = position[0], z = position[2];
    let best = this.idx(c);
    let bestD = Infinity;
    const lo = this.closed ? -W : Math.max(-W, -c);
    const hi = this.closed ? W : Math.min(W, this.n - 1 - c);
    for (let k = lo; k <= hi; k++) {
      const i = this.idx(c + k);
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
    if (!this.closed) { // the last sample is never on the stride
      const d = this.dist2XYZ(n - 1, x, y, z);
      if (d < bestD) { bestD = d; best = n - 1; }
    }
    const c = best;
    for (let k = -step; k <= step; k++) {
      const i = this.idx(c + k);
      const d = this.dist2XYZ(i, x, y, z);
      if (d < bestD) { bestD = d; best = i; }
    }
    return this.refine(best, bestD, x, y, z, true);
  }

  /** Project onto segments (best-1 → best) and (best → best+1); pick the closer. */
  private refine(best: number, bestD: number, x: number, y: number, z: number, use3d: boolean): number {
    let bestT = best / this.step;
    let bestSeg = bestD;
    for (let side = -1; side <= 0; side++) {
      const ia = this.idx(best + side);
      const ib = this.idx(ia + 1);
      if (ia === ib) continue; // clamped open end
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
      if (d < bestSeg) { bestSeg = d; bestT = (ia + s) / this.step; }
    }
    return this.norm(bestT);
  }

  /** Squared 3D distance from `position` to the centreline point at t. Allocation-free. */
  dist2At(t: number, position: Vec3): number {
    const f = this.norm(t) * this.step;
    const fi = Math.floor(f);
    const i0 = this.idx(fi), i1 = this.idx(fi + 1);
    const a = f - fi, b = 1 - a;
    const dx = this.px[i0] * b + this.px[i1] * a - position[0];
    const dy = this.py[i0] * b + this.py[i1] * a - position[1];
    const dz = this.pz[i0] * b + this.pz[i1] * a - position[2];
    return dx * dx + dy * dy + dz * dz;
  }
}

export function buildLut(points: readonly ControlPoint[], opts?: LutOptions): Lut {
  return new Lut(points, opts);
}
