// Closed centripetal Catmull-Rom spline. Same maths as three.js CatmullRomCurve3
// ('centripetal', closed) so authored points look identical in a debug overlay.
// Pure TypeScript; the sim never imports Three.js.
import type { Vec3 } from './types.ts';

export interface SplinePoint { x: number; y: number; z: number }

export interface Segment {
  /** Segment index i: runs from point i to point i+1 (wrapping). */
  index: number;
  /** 0..1 position inside the segment (the Catmull-Rom weight). */
  local: number;
}

const EPS_DT = 1e-4;

/** Hermite cubic on one axis, the same form three.js uses. */
function coeffs(x0: number, x1: number, x2: number, x3: number, dt0: number, dt1: number, dt2: number, out: Float64Array, o: number): void {
  let t1 = (x1 - x0) / dt0 - (x2 - x0) / (dt0 + dt1) + (x2 - x1) / dt1;
  let t2 = (x2 - x1) / dt1 - (x3 - x1) / (dt1 + dt2) + (x3 - x2) / dt2;
  t1 *= dt1;
  t2 *= dt1;
  out[o] = x1;
  out[o + 1] = t1;
  out[o + 2] = -3 * x1 + 3 * x2 - 2 * t1 - t2;
  out[o + 3] = 2 * x1 - 2 * x2 + t1 + t2;
}

export class ClosedSpline {
  readonly count: number;
  /** 12 coefficients per segment: x c0..c3, y c0..c3, z c0..c3. */
  private readonly c: Float64Array;

  constructor(points: readonly SplinePoint[]) {
    if (points.length < 4) throw new Error(`ClosedSpline needs at least 4 points, got ${points.length}`);
    const l = points.length;
    this.count = l;
    this.c = new Float64Array(l * 12);
    for (let i = 0; i < l; i++) {
      const p0 = points[(i - 1 + l) % l];
      const p1 = points[i];
      const p2 = points[(i + 1) % l];
      const p3 = points[(i + 2) % l];
      let dt0 = Math.pow(d2(p0, p1), 0.25);
      let dt1 = Math.pow(d2(p1, p2), 0.25);
      let dt2 = Math.pow(d2(p2, p3), 0.25);
      // three.js safety: coincident points fall back to uniform
      if (dt1 < EPS_DT) dt1 = 1.0;
      if (dt0 < EPS_DT) dt0 = dt1;
      if (dt2 < EPS_DT) dt2 = dt1;
      const o = i * 12;
      coeffs(p0.x, p1.x, p2.x, p3.x, dt0, dt1, dt2, this.c, o);
      coeffs(p0.y, p1.y, p2.y, p3.y, dt0, dt1, dt2, this.c, o + 4);
      coeffs(p0.z, p1.z, p2.z, p3.z, dt0, dt1, dt2, this.c, o + 8);
    }
  }

  /** Which segment u (0..1 over the whole loop) falls in. u=1 maps to segment 0, local 0. */
  segmentOf(u: number): Segment {
    const l = this.count;
    const p = wrapU(u) * l;
    const index = Math.floor(p) % l;
    return { index, local: p - Math.floor(p) };
  }

  /** Point on the curve at u (0..1 over the whole loop, uniform in segments, not in arc length). */
  pointAt(u: number, out: Vec3 = [0, 0, 0]): Vec3 {
    const { index, local: w } = this.segmentOf(u);
    const o = index * 12;
    const c = this.c;
    const w2 = w * w, w3 = w2 * w;
    out[0] = c[o] + c[o + 1] * w + c[o + 2] * w2 + c[o + 3] * w3;
    out[1] = c[o + 4] + c[o + 5] * w + c[o + 6] * w2 + c[o + 7] * w3;
    out[2] = c[o + 8] + c[o + 9] * w + c[o + 10] * w2 + c[o + 11] * w3;
    return out;
  }

  /** Point inside segment `index` at local weight w. */
  pointIn(index: number, w: number, out: Vec3 = [0, 0, 0]): Vec3 {
    return this.pointAt((index + w) / this.count, out);
  }

  /**
   * Walk the curve in `divisions` equal-u steps. Returns cumulative chord length at
   * each step: arc[0] = 0, arc[divisions] = total length.
   */
  walkArcLength(divisions: number): Float64Array {
    const arc = new Float64Array(divisions + 1);
    const a: Vec3 = [0, 0, 0];
    const b: Vec3 = [0, 0, 0];
    this.pointAt(0, a);
    let sum = 0;
    for (let k = 1; k <= divisions; k++) {
      this.pointAt(k / divisions, b);
      sum += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      arc[k] = sum;
      a[0] = b[0]; a[1] = b[1]; a[2] = b[2];
    }
    return arc;
  }
}

function d2(a: SplinePoint, b: SplinePoint): number {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

/** u in [0,1); u=1 → 0 so the loop closes. */
export function wrapU(u: number): number {
  const w = u % 1;
  return w < 0 ? w + 1 : w;
}
