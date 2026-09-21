// Drift decision: hop when the road bends enough for long enough and the drift can
// reach a tier, hold with the stick modulated so the drift yaw follows the road,
// release at the planned tier or when the line says so, and never bunny-hop.
// Also the trick press off a jump.
//
// The controller's drift yaw is steerRate × lerp(driftSteerMin, driftSteerMax, stick)
// toward the drift side, and the charge runs at chargeFull with stick ≥ 0.5, else
// chargeNeutral. So a drift always turns at least the minimum; on a bend gentler than
// that the kart swings past the aim point at (yawMin − yawRoad) rad/s and must let go
// at overRotate. reachableTier() plans the tier from that before the hop.
import type { KartConstants } from '../kart-controller/constants.ts';
import { tierFor } from '../kart-controller/drift.ts';
import type { InputState, KartState } from '../kart-controller/types.ts';
import { AI, targetTierFor } from './constants.ts';
import { clamp } from './line.ts';
import { next } from './rng.ts';
import type { AiMemory, AiProfile, DriftEndReason, LineInfo } from './types.ts';

function countDown(x: number, dt: number): number {
  const n = x - dt;
  return n > 1e-9 ? n : 0;
}

/** rad/s the drift turns at stick fraction k toward its side. */
export function driftYaw(c: KartConstants, k: number): number {
  return c.steerRate * (c.driftSteerMin + (c.driftSteerMax - c.driftSteerMin) * k);
}

/** Seconds a drift can hold before swinging overRotate past the road at this yaw surplus. */
function holdFor(surplus: number, cornerSeconds: number): number {
  const d = AI.drift;
  const byOver = surplus > 1e-4 ? d.overRotate / surplus : Infinity;
  return Math.min(byOver, d.maxHold, cornerSeconds);
}

/**
 * The tier the charge can reach on the bend ahead at the current speed, taking the
 * better of the two stick regimes (half stick: full charge, more yaw; no stick: neutral
 * charge, minimum yaw). 0 = the drift would not pay.
 */
export function reachableTier(s: KartState, c: KartConstants, line: LineInfo): number {
  const needed = Math.abs(line.turnNear) / AI.line.turnNearSeconds; // rad/s the road asks for
  const corner = AI.line.turnFarSeconds; // we only know the bend this far ahead
  const mult = s.drift.chargeMultiplierRemaining > 0 ? s.drift.chargeMultiplier : 1;
  const chargeHalf = c.chargeFull * 60 * mult * Math.max(0, holdFor(driftYaw(c, 0.5) - needed, corner) - c.hopSeconds);
  const chargeMin = c.chargeNeutral * 60 * mult * Math.max(0, holdFor(driftYaw(c, 0) - needed, corner) - c.hopSeconds);
  return tierFor(Math.max(chargeHalf, chargeMin), c.driftTiers);
}

/** A bend worth drifting: the drift would reach tier 1 at the current speed. */
export function driftWorthy(s: KartState, c: KartConstants, profile: AiProfile, line: LineInfo): boolean {
  const near = line.turnNear, far = line.turnFar;
  if (Math.abs(far) <= profile.driftThreshold || Math.abs(near) <= profile.driftThreshold * 0.5) return false;
  if (Math.sign(near) !== Math.sign(far)) return false;
  return reachableTier(s, c, line) >= 1;
}

/**
 * Will the hop rule fire on this bend? The plan must not promise a drift the hop then
 * refuses: the peak curvature ahead has to ask for the same share of a half-stick drift
 * the start rule asks of the road under the nose.
 */
export function driftWillFire(s: KartState, c: KartConstants, profile: AiProfile, line: LineInfo): boolean {
  return driftWorthy(s, c, profile, line) && line.kappa * Math.abs(s.speed) >= AI.drift.startYawFraction * driftYaw(c, 0.5);
}

/**
 * A bend worth setting up wide for: the drift will swing past the road (the road asks
 * for less yaw than a half-stick drift gives), so it needs room on the inside. A bend
 * that asks for more than that is driven from the ordinary line.
 */
export function driftNeedsRoom(s: KartState, c: KartConstants, profile: AiProfile, line: LineInfo): boolean {
  if (!driftWorthy(s, c, profile, line)) return false;
  const needed = Math.abs(line.turnNear) / AI.line.turnNearSeconds;
  return needed < driftYaw(c, 0.5);
}

/**
 * Reads the PD steer already in `out.steer`; over-rotation is judged against the road
 * direction lookAheadMin ahead (line.roadErr), not the aim point, which swings in tight bends.
 * Writes out.drift and may override out.steer. `legal` is the kart's legal top speed now.
 */
export function stepDriftDecision(
  s: KartState, c: KartConstants, m: AiMemory, profile: AiProfile, line: LineInfo, legal: number, out: InputState, dt: number,
): void {
  const d = AI.drift;
  m.driftCooldown = countDown(m.driftCooldown, dt);
  out.drift = false;

  if (m.driftDir === 0) {
    if (m.driftCooldown > 0 || !s.grounded || s.drift.phase !== 'idle') return;
    if (line.narrow || line.nearBranch) return; // a hop at a fork or on a 3 m road ends in the water
    if (s.speed < c.driftMinSpeed * legal) return;
    const near = line.turnNear, far = line.turnFar;
    const bends = Math.abs(near) > profile.driftThreshold && Math.abs(far) > profile.driftThreshold && Math.sign(near) === Math.sign(far);
    if (!bends) return;
    // hop once the bend under the nose already asks for most of a half-stick drift's yaw:
    // earlier, the drift swings out on the approach and the charge crawls
    if (line.kappaShort * Math.abs(s.speed) < d.startYawFraction * driftYaw(c, 0.5)) return;
    const reach = Math.min(targetTierFor(m.skill), reachableTier(s, c, line));
    if (reach < 1) return; // the bend is too gentle for the drift to pay at this speed
    if (next(m) >= m.personality.driftUse) { m.driftCooldown = d.cooldown; return; } // declined; ask again later
    m.driftDir = near > 0 ? 1 : -1;
    m.driftTier = reach;
    m.driftHold = 0;
    out.drift = true;
    out.steer = m.driftDir;
    return;
  }

  // holding
  const dir = m.driftDir;
  m.driftHold += dt;
  out.drift = true;
  const landWindow = c.hopSeconds * c.hopLandWindow + dt;
  // the controller cancelled it (landed without the stick, too slow, too long in the air)
  const aborted = s.drift.phase === 'idle' && m.driftHold > landWindow;
  if (aborted) { release(m, d.abortCooldown, out, 'abort'); return; }

  if (m.driftHold <= d.hopCommit || s.drift.phase !== 'drifting') {
    out.steer = dir * d.hopCommitStick; // stick on so the landing locks the drift, without the full swing
    return;
  }
  // the bend may tighten as it unfolds: the plan only ever grows
  m.driftTier = Math.max(m.driftTier, Math.min(targetTierFor(m.skill), reachableTier(s, c, line)));
  // stick so the drift yaw follows the road, plus a pull toward where the road goes.
  // Half stick or more keeps the full charge rate; on a gentler bend the charge crawls
  // and reachableTier() already planned for that.
  const err = line.roadErr;
  const wanted = (line.turnNear / AI.line.turnNearSeconds) * dir + d.aimGain * err * dir; // rad/s toward the drift side
  let k = clamp((wanted / c.steerRate - c.driftSteerMin) / (c.driftSteerMax - c.driftSteerMin), 0, 1);
  if (k < 0.5 && s.drift.tier < m.driftTier) {
    // just under half stick the charge crawls; a hair more yaw buys the full rate
    if (k >= 0.5 - d.chargeSnap) k = 0.5;
    else {
      // the next tier is close: hold the stick through the exit and take the swing
      const mult = s.drift.chargeMultiplierRemaining > 0 ? s.drift.chargeMultiplier : 1;
      const nextTier = c.driftTiers[Math.min(s.drift.tier, c.driftTiers.length - 1)];
      const secondsLeft = (nextTier - s.drift.charge) / (c.chargeFull * 60 * mult);
      if (secondsLeft <= d.chargeSecondsAhead) k = 0.5;
    }
  }
  out.steer = dir * k;

  const tier = s.drift.tier;
  const why: DriftEndReason =
    tier >= m.driftTier ? 'tier'
    : err * dir < -d.overRotate ? 'over'
    : tier >= 1 && Math.abs(err) < d.aligned && line.kappaShort * Math.abs(s.speed) < d.exitYawFraction * driftYaw(c, 0) ? 'aligned'
    : line.myLat * dir > line.halfWidth - d.edgeMargin ? 'edge'
    : m.driftHold > d.maxHold ? 'hold'
    : 'none';
  if (why !== 'none') release(m, tier === 0 ? d.abortCooldown : d.cooldown, out, why);
}

function release(m: AiMemory, cooldown: number, out: InputState, why: DriftEndReason): void {
  m.driftDir = 0;
  m.driftHold = 0;
  m.driftCooldown = cooldown;
  m.driftEndReason = why;
  out.drift = false;
}

/** Off a jump: roll once, then press the button on a tick where it makes an edge. */
export function stepTrick(s: KartState, m: AiMemory, profile: AiProfile, out: InputState): void {
  if (s.grounded || s.airborne.fromJumpId === undefined) {
    m.trickRolled = false;
    m.trickDone = false;
    return;
  }
  if (m.driftDir !== 0) return; // a drift hop is not a jump; the drift logic owns the button
  if (!m.trickRolled) {
    m.trickRolled = true;
    m.trickDone = next(m) >= profile.trickChance; // "done" = decided not to
  }
  if (m.trickDone) return;
  if (s.prevDrift) { out.drift = false; return; } // let go first so the press is an edge
  out.drift = true;
  m.trickDone = true;
}
