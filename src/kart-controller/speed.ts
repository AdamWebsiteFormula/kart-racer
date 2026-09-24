// Step 3: target speed and the move toward it.
import { boostLive } from './boost.ts';
import type { KartConstants } from './constants.ts';
import type { InputState, KartState } from './types.ts';

export interface SpeedTargets {
  /** cc × archetype × coins, no boost, no surface. */
  base: number;
  /** base × surface cap when the cap applies, else base. The boost-cap test uses this. */
  effective: number;
  /** what `speed` moves toward this tick. */
  target: number;
}

export function targetSpeed(s: KartState, c: KartConstants): SpeedTargets {
  const coins = Math.min(s.coins, c.coinCap);
  const base = c.topSpeed * (1 + coins * c.coinBonusEach);
  const live = boostLive(s);
  let target = base;
  if (live) target *= s.boost.multiplier;
  if (s.status.slowRemaining > 0) target = Math.min(target, base * s.status.slowedTo);
  const bypass = (live && c.boostIgnoresSurfaceCap) || (!s.grounded && c.airborneIgnoresSurfaceCap);
  const cap = c.surfaceSpeed[s.surface] ?? 1;
  let effective = base;
  if (!bypass) {
    target = Math.min(target, base * cap);
    effective = base * cap;
  }
  return { base, effective, target };
}

/** Throttle accel at speed v toward V: strong off the line, tapering toward the top (accelLaunch, accelTaper). */
export function throttleAccel(v: number, V: number, c: KartConstants): number {
  const u = V > 0 ? Math.min(1, Math.max(0, v) / V) : 1;
  return c.accel * (c.accelLaunch - c.accelTaper * u * u);
}

export function stepSpeed(s: KartState, input: InputState, V: number, c: KartConstants, dt: number): void {
  const v = s.speed;
  const braking = input.brake > 0 && input.throttle <= 0;
  if (v > V) {
    // over the cap: tail off, never slam; the brake still bites (it used to do nothing here)
    if (braking) s.speed = Math.max(0, v - Math.max(c.overSpeedDecel, c.brake * input.brake) * dt);
    else s.speed = Math.max(V, v - c.overSpeedDecel * dt);
    return;
  }
  if (braking) {
    if (v > 0) s.speed = Math.max(0, v - c.brake * input.brake * dt);
    else s.speed = Math.max(-c.reverseFraction * V, v - c.accel * input.brake * dt);
    return;
  }
  if (input.throttle > 0) {
    s.speed = Math.min(V, v + throttleAccel(v, V, c) * input.throttle * dt);
    return;
  }
  // coast toward zero
  if (v > 0) s.speed = Math.max(0, v - c.coastDecel * dt);
  else if (v < 0) s.speed = Math.min(0, v + c.coastDecel * dt);
}
