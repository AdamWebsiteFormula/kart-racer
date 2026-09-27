// Step 6: hop / drift state machine. idle → hopping → drifting → idle.
// Charge numbers in the schema are per 60 fps frame, so we scale by dt × 60.
import { requestBoost } from './boost.ts';
import type { KartConstants } from './constants.ts';
import { driftTurnTarget } from './steer.ts';
import type { InputState, KartEvent, KartState, StepOptions } from './types.ts';

export function tierFor(charge: number, tiers: readonly number[], max = Infinity): number {
  let tier = 0;
  for (const threshold of tiers) if (charge >= threshold) tier++;
  return Math.min(tier, max);
}

/**
 * Real air, where a drift press is a trick (Adam, 26 Sept 2026: "when you go over a jump, or you hit
 * something that makes you go a little bit airborne ... it should allow you to do a bit of a boost").
 * As in Mario Kart World: anything the course throws you off (a ramp, a trick bump, a vent, a crest, a
 * ledge, a Pogo Spring), never a hop on flat ground or along a steady slope (ground.ts realAir).
 */
export function canTrick(s: KartState): boolean {
  return !s.grounded && (s.airborne.fromJumpId !== undefined || s.airborne.realAir);
}

/** Queue the trick for this flight (its boost fires on landing) and announce it once, for its sound. */
export function queueTrick(s: KartState, events: KartEvent[]): void {
  if (s.airborne.trickQueued) return;
  s.airborne.trickQueued = true;
  s.trickBuffer = 0;
  events.push({ type: 'trick' });
}

export function cancelDrift(s: KartState): void {
  s.drift.active = false;
  s.drift.phase = 'idle';
  s.drift.direction = 0;
  s.drift.charge = 0;
  s.drift.tier = 0;
  s.drift.hopSeconds = 0;
}

/** Lock a drift toward `direction`: loose at first, it tightens over driftYawLag. */
function lockDrift(s: KartState, direction: number, events: KartEvent[]): void {
  const d = s.drift;
  d.phase = 'drifting';
  d.active = true;
  d.direction = direction;
  d.charge = 0;
  d.tier = 0;
  d.yawK = 0;
  events.push({ type: 'driftStart', direction });
}

/** Release: boost from the tier (tier 0 → nothing), then idle. */
function releaseDrift(s: KartState, c: KartConstants, events: KartEvent[]): void {
  const tier = s.drift.tier;
  events.push({ type: 'driftEnd', tier });
  if (tier > 0) requestBoost(s, 'drift', c.boostMultiplier, c.boostSeconds[tier - 1], events);
  cancelDrift(s);
}

/** Runs before gravity/ground each tick. V is the target speed. */
export function stepDrift(
  s: KartState, input: InputState, c: KartConstants, V: number, dt: number,
  events: KartEvent[], opts: StepOptions = {},
): void {
  const pressed = input.drift && !s.prevDrift;
  s.prevDrift = input.drift;
  const d = s.drift;

  // trick: the drift button in real air (canTrick)
  // (the 'trick' event marks the moment it is done, for its sound; the boost still waits for the landing)
  if (pressed && canTrick(s)) {
    queueTrick(s, events);
  } else if (pressed) {
    // a press just before a ramp's lip or a bump's crest still counts as the trick at the launch, and one
    // just before a flight turns into real air (a hop at a crest) counts when it does (ground.ts)
    s.trickBuffer = c.trickBufferSeconds;
  }

  switch (d.phase) {
    case 'idle': {
      if (pressed && s.grounded && s.speed >= c.driftMinSpeed * V) {
        d.phase = 'hopping';
        d.hopSeconds = 0;
        s.verticalVelocity = c.hopVelocity;
        s.grounded = false;
        events.push({ type: 'hop' });
      } else if (!pressed && input.drift && s.grounded && Math.abs(input.steer) >= c.driftLateSteer && s.speed >= c.driftMinSpeed * V) {
        // the button still held and the stick goes over (a late drift, or straight off a landing): drift now, no hop
        lockDrift(s, Math.sign(input.steer), events);
      }
      return;
    }
    case 'hopping': {
      d.hopSeconds += dt;
      if (!s.grounded) {
        if (d.hopSeconds > c.hopSeconds * c.hopLandWindow) cancelDrift(s);
        return;
      }
      // landed: lock the drift if the button and the stick are held
      if (input.drift && input.steer !== 0 && s.speed >= c.driftMinSpeed * V) {
        lockDrift(s, Math.sign(input.steer), events);
      } else {
        cancelDrift(s);
      }
      return;
    }
    case 'drifting': {
      // cancel cases win over release: no boost from a dead drift
      if (s.speed < c.driftKeepSpeed * V) { cancelDrift(s); return; }
      if (!s.grounded && s.airborne.seconds > c.driftAirCancelSeconds) { cancelDrift(s); return; }
      if (!input.drift) { releaseDrift(s, c, events); return; }
      // full rate with the stick centred or in (the medium line or tighter); pushed out for the wide line, the slow rate
      const rate = driftTurnTarget(input.steer, d.direction) >= 0.5 ? c.chargeFull : c.chargeNeutral;
      const mult = d.chargeMultiplierRemaining > 0 ? d.chargeMultiplier : 1;
      d.charge += rate * dt * 60 * mult;
      const tier = tierFor(d.charge, c.driftTiers, opts.maxDriftTier ?? c.driftTiers.length);
      if (tier !== d.tier) {
        d.tier = tier;
        events.push({ type: 'driftTierUp', tier });
      }
      return;
    }
  }
}
