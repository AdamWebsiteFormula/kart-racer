// Tiny shared helpers. No state.
import type { Vec3 } from '../kart-controller/types.ts';
import * as dmath from '../sim-math/dmath.ts';

/** Timer epsilon: 1 s of 120 Hz ticks does not sum to exactly 1 in floats (kart-controller rule). */
const TIMER_EPS = 1e-9;
export function countDown(x: number, dt: number): number {
  const next = x - dt;
  return next > TIMER_EPS ? next : 0;
}

export function distXZ(a: Vec3, b: Vec3): number {
  return dmath.hypot(a[0] - b[0], a[2] - b[2]);
}

export function dist3(a: Vec3, b: Vec3): number {
  return dmath.hypot3(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
