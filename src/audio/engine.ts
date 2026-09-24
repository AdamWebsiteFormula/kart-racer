// Engine sound maths: speed → rpm through a fake gearbox, rpm → pitch. Pure.
import type { KartState } from '../kart-controller/types.ts';
import { AUDIO } from './constants.ts';

/** Which gear (0-based) a speed fraction sits in; gears are equal slices of top speed. */
export function gearFor(fraction: number): number {
  const f = Math.min(0.999, Math.max(0, fraction));
  return Math.floor(f * AUDIO.gears);
}

/**
 * RPM for |speed| / topSpeed. Inside each gear the revs climb from the shift-drop point to the
 * redline, so accelerating sounds like a kart changing up, not a siren. Reverse sits near idle.
 */
export function rpmFor(speed: number, topSpeed: number, boosting = false): number {
  const { idleRpm, redlineRpm, shiftDrop, gears } = AUDIO;
  if (!(topSpeed > 0)) return idleRpm;
  if (speed < 0) return idleRpm + (redlineRpm - idleRpm) * 0.25 * Math.min(1, -speed / topSpeed);
  const f = Math.min(1.2, speed / topSpeed);
  if (f <= 0.02) return idleRpm;
  const g = gearFor(f);
  const inGear = Math.min(1, (f - g / gears) * gears); // 0..1 through this gear
  const floor = g === 0 ? idleRpm : redlineRpm * shiftDrop;
  const rpm = floor + (redlineRpm - floor) * inGear;
  return Math.min(redlineRpm * (boosting ? 1.08 : 1), boosting ? rpm * 1.08 : rpm);
}

/** Oscillator base frequency for an rpm (linear, idle → engineIdleHz). */
export function engineHz(rpm: number): number {
  return AUDIO.engineIdleHz * (rpm / AUDIO.idleRpm);
}

/**
 * How loud the off-road rumble is, 0..1: the wheels on dirt or mud (the land beside the road and
 * the mud patches report `dirt` and `mud`), growing with speed. Airborne or on the road: none.
 */
export function offroadAmount(k: Pick<KartState, 'grounded' | 'surface' | 'speed'>, topSpeed: number): number {
  if (!k.grounded || (k.surface !== 'dirt' && k.surface !== 'mud') || !(topSpeed > 0)) return 0;
  return Math.min(1, Math.abs(k.speed) / topSpeed);
}
