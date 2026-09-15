// Step 6: hop / drift state machine. idle → hopping → drifting → idle.
// Charge numbers in the schema are per 60 fps frame, so we scale by dt × 60.
import { requestBoost } from './boost.ts';
import type { KartConstants } from './constants.ts';
import { stickToward } from './steer.ts';
import type { InputState, KartEvent, KartState, StepOptions } from './types.ts';

export function tierFor(charge: number, tiers: readonly number[], max = Infinity): number {
  let tier = 0;
  for (const threshold of tiers) if (charge >= threshold) tier++;
  return Math.min(tier, max);
}

export function cancelDrift(s: KartState): void {
  s.drift.active = false;
  s.drift.phase = 'idle';
  s.drift.direction = 0;
  s.drift.charge = 0;
  s.drift.tier = 0;
  s.drift.hopSeconds = 0;
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

  // trick: drift button while airborne from a jump
  if (pressed && !s.grounded && s.airborne.fromJumpId !== undefined) {
    s.airborne.trickQueued = true;
  }

  switch (d.phase) {
    case 'idle': {
      if (pressed && s.grounded && s.speed >= c.driftMinSpeed * V) {
        d.phase = 'hopping';
        d.hopSeconds = 0;
        s.verticalVelocity = c.hopVelocity;
        s.grounded = false;
        events.push({ type: 'hop' });
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
        d.phase = 'drifting';
        d.active = true;
        d.direction = Math.sign(input.steer);
        d.charge = 0;
        d.tier = 0;
        events.push({ type: 'driftStart', direction: d.direction });
      } else {
        cancelDrift(s);
      }
      return;
    }
    case 'drifting': {
      if (!input.drift) { releaseDrift(s, c, events); return; }
      if (s.speed < c.driftKeepSpeed * V) { cancelDrift(s); return; }
      if (!s.grounded && s.airborne.seconds > c.driftAirCancelSeconds) { cancelDrift(s); return; }
      const rate = stickToward(input, d.direction) >= 0.5 ? c.chargeFull : c.chargeNeutral;
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
