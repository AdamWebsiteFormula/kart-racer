// The AI's own stuck timer and reverse-out. The race-manager 6 s respawn is the backstop.
import type { InputState, KartState } from '../kart-controller/types.ts';
import { RACE } from '../race-manager/constants.ts';
import { AI } from './constants.ts';
import type { AiMemory } from './types.ts';

/**
 * Returns true when recovery owns the inputs this tick (reversing). Call after the
 * PD steer is in out.steer so the reverse can swing the nose toward the aim point.
 */
export function stepRecovery(s: KartState, m: AiMemory, out: InputState, dt: number): boolean {
  const r = AI.recover;
  if (m.recovery === 'reverse') {
    m.recoverTimer -= dt;
    out.throttle = 0;
    out.brake = 1;
    out.drift = false;
    // reversing flips the yaw, so steer against the error to bring the nose round
    out.steer = m.prevErr > 0 ? -1 : 1;
    if (m.recoverTimer <= 1e-9) { m.recovery = 'cooldown'; m.recoverTimer = r.cooldownSeconds; }
    return true;
  }
  if (m.recovery === 'cooldown') {
    m.recoverTimer -= dt;
    if (m.recoverTimer <= 1e-9) { m.recovery = 'none'; m.recoverTimer = 0; }
    m.stuckSeconds = 0;
    return false;
  }
  const stuck = s.grounded && s.status.spinRemaining === 0 && s.status.intangibleRemaining === 0 && Math.abs(s.speed) < RACE.stuckSpeed;
  m.stuckSeconds = stuck ? m.stuckSeconds + dt : 0;
  if (m.stuckSeconds + 1e-9 >= r.stuckSeconds) {
    m.stuckSeconds = 0;
    m.recovery = 'reverse';
    m.recoverTimer = r.reverseSeconds;
    m.driftDir = 0;
    out.throttle = 0;
    out.brake = 1;
    out.drift = false;
    out.steer = m.prevErr > 0 ? -1 : 1;
    return true;
  }
  return false;
}
