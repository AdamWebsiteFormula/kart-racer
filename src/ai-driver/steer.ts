// PD steering on the heading error to the aim point, plus seeded low-pass noise.
import type { KartState, Vec3 } from '../kart-controller/types.ts';
import { AI } from './constants.ts';
import { clamp, wrapAngle } from './line.ts';
import { range } from './rng.ts';
import type { AiMemory } from './types.ts';

/** Heading error to `aim` in radians, wrapped; positive = aim is to the right. */
export function headingError(s: KartState, aim: Vec3): number {
  const dx = aim[0] - s.position[0], dz = aim[2] - s.position[2];
  return wrapAngle(Math.atan2(dx, dz) - s.heading);
}

/**
 * steer = (kP × err + kD × dErr + kLat × latErr) × gain + noise, clamped ±1. `latErr` is
 * metres the lane target sits to the right of the kart. Leaves err in m.prevErr
 * for the drift logic. `noiseAmp` is profile.noise × (1 − skill).
 */
export function steerTo(s: KartState, aim: Vec3, m: AiMemory, noiseAmp: number, gain: number, latErr: number, dt: number): number {
  const c = AI.steer;
  const err = headingError(s, aim);
  const dErr = clamp((err - m.prevErr) / dt, -c.dErrMax, c.dErrMax);
  m.prevErr = err;
  m.noise += (range(m, -noiseAmp, noiseAmp) - m.noise) * c.noiseSmoothing;
  // airborne off a jump the kart still turns a little (the controller's air steer): keep steering for the landing
  // a lateral term on top of pure pursuit: lane changes and dodges happen now, not in 2L
  const lat = clamp(c.kLat * latErr, -c.kLatMax, c.kLatMax);
  return clamp((c.kP * err + c.kD * dErr + lat) * gain + m.noise, -1, 1);
}
