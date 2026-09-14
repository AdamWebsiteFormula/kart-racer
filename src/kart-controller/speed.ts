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

export function stepSpeed(s: KartState, input: InputState, V: number, c: KartConstants, dt: number): void {
  const v = s.speed;
  if (v > V) {
    // over the cap: tail off, never slam
    s.speed = Math.max(V, v - c.overSpeedDecel * dt);
    return;
  }
  if (input.brake > 0 && input.throttle <= 0) {
    if (v > 0) s.speed = Math.max(0, v - c.brake * input.brake * dt);
    else s.speed = Math.max(-c.reverseFraction * V, v - c.accel * input.brake * dt);
    return;
  }
  if (input.throttle > 0) {
    s.speed = Math.min(V, v + c.accel * input.throttle * dt);
    return;
  }
  // coast toward zero
  if (v > 0) s.speed = Math.max(0, v - c.coastDecel * dt);
  else if (v < 0) s.speed = Math.min(0, v + c.coastDecel * dt);
}
