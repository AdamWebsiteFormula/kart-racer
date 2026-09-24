// Throttle as a governor: coast above the target, full throttle below, brake when
// well above it. The target is power × fieldPace × the player-legal speed for this
// exact kart state, capped by the corner speed the steering law can actually hold
// on the road ahead. Never idle at a standstill.
import type { KartConstants } from '../kart-controller/constants.ts';
import { targetSpeed } from '../kart-controller/speed.ts';
import type { InputState, KartState } from '../kart-controller/types.ts';
import { RACE } from '../race-manager/constants.ts';
import { AI } from './constants.ts';
import type { AiMemory, AiProfile, LineInfo } from './types.ts';

/** Yaw rate (rad/s) the controller gives full lock at speed v with base speed V (kart-controller steer.ts). */
export function reachableYaw(v: number, V: number, c: KartConstants): number {
  if (v <= 0 || V <= 0) return 0;
  return c.steerRate * Math.min(1, v / (0.15 * V)) * (1 - c.steerFalloff * Math.min(1, v / V));
}

/** How much of the turning envelope this skill is willing to use. */
export function cornerMargin(skill: number): number {
  return 0.55 + 0.35 * skill;
}

/**
 * The fastest speed at which full lock still follows curvature κ (rad/m). Grip steering:
 * yaw = rate × (1 − falloff × v/V) must be ≥ κ v → v ≤ rate / (κ + rate × falloff / V).
 * Drifting: yaw = rate × driftSteerMax, speed-independent → v ≤ that / κ.
 */
export function cornerSpeed(kappa: number, V: number, c: KartConstants, margin: number, drifting: boolean): number {
  if (kappa <= 1e-6) return Infinity;
  if (drifting) return (c.steerRate * c.driftSteerMax * margin) / kappa;
  const r = c.steerRate * margin;
  return r / (kappa + (r * c.steerFalloff) / V);
}

export interface SpeedDecision { legal: number; target: number; corner: number }

/** `willDrift`: a drift is live or planned for this bend, so the drift yaw is the limit, not grip. */
export function decideSpeed(s: KartState, c: KartConstants, m: AiMemory, line: LineInfo, willDrift: boolean, out: SpeedDecision): SpeedDecision {
  const ts = targetSpeed(s, c);
  const legal = ts.target;
  const drifting = s.drift.phase === 'drifting' || willDrift;
  // over bumps or a ramp on a bend the kart is airborne a while, turning with its air steer only
  const margin = cornerMargin(m.skill) * (line.narrow ? AI.line.narrowMargin : 1) * (line.airAhead && !drifting ? AI.line.airMargin : 1);
  const corner = cornerSpeed(line.kappa, ts.base, c, margin, drifting);
  out.legal = legal;
  out.corner = corner;
  out.target = Math.min(m.powerCap * m.fieldPace * legal, Math.max(corner, MIN_CORNER_SPEED));
  // gripping round a bend, run wide to the outside edge and still pointing off the road: lift
  const dir = Math.sign(line.turnNear);
  if (!drifting && dir !== 0 && s.grounded) {
    const room = line.halfWidth - line.myLat * -dir;
    if (room < AI.line.edgeLift && line.roadErr * dir > 0) out.target = Math.min(out.target, Math.max(MIN_CORNER_SPEED, s.speed - AI.line.edgeShed));
  }
  return out;
}

/** Never plan slower than this: a crawl is a stuck kart to the race-manager. */
const MIN_CORNER_SPEED = 4;

/** Writes throttle and brake. Full throttle below the target; coast above; brake well above. */
export function applyThrottle(s: KartState, d: SpeedDecision, profile: AiProfile, out: InputState): void {
  out.brake = 0;
  if (s.speed <= RACE.stuckSpeed) { out.throttle = 1; return; } // an idle AI counts as stuck
  if (s.speed < d.target) { out.throttle = 1; return; }
  out.throttle = 0;
  if (s.speed > d.target + profile.brakeAbove) out.brake = 1;
}
