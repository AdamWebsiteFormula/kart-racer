// Closed centripetal Catmull-Rom spline. Same maths as three.js CatmullRomCurve3
// ('centripetal', closed) so authored points look identical in a debug overlay.
// Pure TypeScript; the sim never imports Three.js.
import type { Vec3 } from './types.ts';
import * as dmath from '../sim-math/dmath.ts';

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

/** What the LUT needs from a spline. u runs 0..1 over the whole curve. */
export interface Spline {
  /** Control points (closed) or segments + 1 (open). */
  readonly count: number;
  readonly closed: boolean;
  segmentOf(u: number): Segment;
  pointAt(u: number, out?: Vec3): Vec3;
  walkArcLength(divisions: number): Float64Array;
}

export class ClosedSpline implements Spline {
  readonly closed = true;
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
      let dt0 = Math.sqrt(Math.sqrt(d2(p0, p1)));
      let dt1 = Math.sqrt(Math.sqrt(d2(p1, p2)));
      let dt2 = Math.sqrt(Math.sqrt(d2(p2, p3)));
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
      sum += dmath.hypot3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      arc[k] = sum;
      a[0] = b[0]; a[1] = b[1]; a[2] = b[2];
    }
    return arc;
  }
}

/**
 * Open centripetal Catmull-Rom for shortcut branches. Same maths as three.js
 * CatmullRomCurve3 with closed=false: the end tangents come from reflected ghost
 * points. u=0 is the first point, u=1 the last. Segment i runs point i → i+1.
 */
export class OpenSpline implements Spline {
  readonly closed = false;
  /** Number of control points; segments = count − 1. */
  readonly count: number;
  private readonly c: Float64Array;

  constructor(points: readonly SplinePoint[]) {
    if (points.length < 2) throw new Error(`OpenSpline needs at least 2 points, got ${points.length}`);
    const l = points.length;
    this.count = l;
    const segs = l - 1;
    this.c = new Float64Array(segs * 12);
    const ghost = (a: SplinePoint, b: SplinePoint): SplinePoint => ({ x: 2 * a.x - b.x, y: 2 * a.y - b.y, z: 2 * a.z - b.z });
    for (let i = 0; i < segs; i++) {
      const p0 = i === 0 ? ghost(points[0], points[1]) : points[i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i + 2 < l ? points[i + 2] : ghost(points[l - 1], points[l - 2]);
      let dt0 = Math.sqrt(Math.sqrt(d2(p0, p1)));
      let dt1 = Math.sqrt(Math.sqrt(d2(p1, p2)));
      let dt2 = Math.sqrt(Math.sqrt(d2(p2, p3)));
      if (dt1 < EPS_DT) dt1 = 1.0;
      if (dt0 < EPS_DT) dt0 = dt1;
      if (dt2 < EPS_DT) dt2 = dt1;
      const o = i * 12;
      coeffs(p0.x, p1.x, p2.x, p3.x, dt0, dt1, dt2, this.c, o);
      coeffs(p0.y, p1.y, p2.y, p3.y, dt0, dt1, dt2, this.c, o + 4);
      coeffs(p0.z, p1.z, p2.z, p3.z, dt0, dt1, dt2, this.c, o + 8);
    }
  }

  /** u is clamped to [0,1]; u=1 is the last segment at local 1. */
  segmentOf(u: number): Segment {
    const segs = this.count - 1;
    const p = (u < 0 ? 0 : u > 1 ? 1 : u) * segs;
    let index = Math.floor(p);
    if (index >= segs) index = segs - 1;
    return { index, local: p - index };
  }

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

  walkArcLength(divisions: number): Float64Array {
    const arc = new Float64Array(divisions + 1);
    const a: Vec3 = [0, 0, 0];
    const b: Vec3 = [0, 0, 0];
    this.pointAt(0, a);
    let sum = 0;
    for (let k = 1; k <= divisions; k++) {
      this.pointAt(k / divisions, b);
      sum += dmath.hypot3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
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
