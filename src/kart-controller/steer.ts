// Steps 4–5: yaw rate, then rotate the velocity into the new frame and damp
// the lateral part by grip. Ice slides because grip is low, nothing else.
import type { KartConstants } from './constants.ts';
import type { InputState, KartState } from './types.ts';

export function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** 0..1: how far the stick points into the drift (the charge rate reads this). */
export function stickToward(input: InputState, direction: number): number {
  return clamp(input.steer * direction, 0, 1);
}

/**
 * 0..1: the drift's turn value the stick asks for (drift.yawK chases it). The whole stick range
 * counts: full out 0 (the widest line), centred 0.5 (a medium line), full in 1 (the tightest).
 * It used to be the inward half only, so a centred stick drew the widest line (99 m at top speed).
 */
export function driftTurnTarget(steer: number, direction: number): number {
  return (1 + clamp(steer * direction, -1, 1)) / 2;
}

/** The stick toward the drift side that asks for turn value k (driftTurnTarget's inverse; for the AI). */
export function driftStickFor(k: number): number {
  return clamp(2 * k - 1, -1, 1);
}

/**
 * Below top speed the grip turn tightens (steerFalloff); a drift tightens with it by the same
 * factor, so a full-inward drift (a notch tighter than the grip turn at top speed) is never wider
 * than steering at full lock at any speed (it was at 70 % of V: 19 m against 13.5 m). 1 at and above V.
 */
export function driftSpeedScale(v: number, V: number, c: KartConstants): number {
  if (V <= 0) return 1;
  return (1 - c.steerFalloff * Math.min(1, Math.abs(v) / V)) / (1 - c.steerFalloff);
}

/** Yaw rate in rad/s (positive = right). V is the target speed. */
export function yawRate(s: KartState, input: InputState, c: KartConstants, V: number): number {
  if (s.drift.phase === 'drifting') {
    const k = lerp(c.driftSteerMin, c.driftSteerMax, s.drift.yawK);
    return s.drift.direction * c.steerRate * k * driftSpeedScale(s.speed, V, c);
  }
  const v = Math.abs(s.speed);
  if (v <= 0 || V <= 0) return 0;
  const f = Math.min(1, v / (c.steerLowSpeed * V)) * (1 - c.steerFalloff * Math.min(1, v / V));
  // in the air (the hop included) the wheels have nothing to push on
  const air = s.grounded ? 1 : c.airSteer;
  const yaw = input.steer * c.steerRate * f * air;
  return s.speed < 0 ? -yaw : yaw;
}

/** Turn the heading by dTheta and express the same world velocity in the new frame. */
export function applyYaw(s: KartState, dTheta: number): void {
  if (dTheta === 0) return;
  const cos = Math.cos(dTheta);
  const sin = Math.sin(dTheta);
  const speed = s.speed;
  const lat = s.lateralVelocity;
  s.heading += dTheta;
  s.speed = speed * cos + lat * sin;
  s.lateralVelocity = lat * cos - speed * sin;
}

export function dampLateral(s: KartState, grip: number, dt: number): void {
  s.lateralVelocity -= s.lateralVelocity * Math.min(1, grip * dt);
}

/** Steps 4 and 5 together. Returns the yaw applied this tick. */
export function stepSteer(s: KartState, input: InputState, c: KartConstants, V: number, grip: number, dt: number): number {
  // the drift turn value chases the stick; it starts at 0 on the lock, so a drift begins loose and tightens
  if (s.drift.phase === 'drifting') {
    const k = 1 - Math.exp(-dt / c.driftYawLag);
    s.drift.yawK += (driftTurnTarget(input.steer, s.drift.direction) - s.drift.yawK) * k;
  }
  const dTheta = yawRate(s, input, c, V) * dt;
  applyYaw(s, dTheta);
  dampLateral(s, grip, dt);
  return dTheta;
}
