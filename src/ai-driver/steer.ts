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
 * steer = (kP × err + kD × dErr) × gain + noise, clamped ±1. Leaves err in m.prevErr
 * for the drift logic. `noiseAmp` is profile.noise × (1 − skill).
 */
export function steerTo(s: KartState, aim: Vec3, m: AiMemory, noiseAmp: number, gain: number, dt: number): number {
  const c = AI.steer;
  const err = headingError(s, aim);
  const dErr = clamp((err - m.prevErr) / dt, -c.dErrMax, c.dErrMax);
  m.prevErr = err;
  m.noise += (range(m, -noiseAmp, noiseAmp) - m.noise) * c.noiseSmoothing;
  // airborne off a jump (not a hop) the wheel does nothing; keep it centred
  if (!s.grounded && s.drift.phase !== 'hopping' && m.driftDir === 0) return 0;
  return clamp((c.kP * err + c.kD * dErr) * gain + m.noise, -1, 1);
}
