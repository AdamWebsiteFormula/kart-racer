// Kart-vs-hazard test and the four hit kinds. Track-builder gives the active list;
// race-manager owns the kart side. Gusts push every tick; the rest hit once per cooldown.
import type { KartConstants } from '../kart-controller/constants.ts';
import { isRiding } from '../kart-controller/powers.ts';
import { applyHit } from '../kart-controller/step.ts';
import { forwardOf, rightOf, type KartEvent, type KartState, type Vec3 } from '../kart-controller/types.ts';
import type { ActiveHazard } from '../track-builder/types.ts';
import { RACE } from './constants.ts';
import type { KartTracker, RaceEvent } from './types.ts';
import { countDown, dist3 } from './util.ts';

export function stepHazards(
  s: KartState, tr: KartTracker, c: KartConstants, active: readonly ActiveHazard[], dt: number,
  events: RaceEvent[], kartEvents: KartEvent[],
): void {
  tr.hazardCooldownRemaining = countDown(tr.hazardCooldownRemaining, dt);
  if (s.isGhost || s.finishTick !== undefined) return;
  let f: Vec3 | undefined, r: Vec3 | undefined;
  for (const h of active) {
    if (dist3(s.position, h.position) > h.radius + c.kartRadius) continue;
    if (s.status.intangibleRemaining > 0 || isRiding(s)) continue; // the respawn freeze, item shields and a rolling Strike Ball ignore every hazard, gusts too
    if (h.ground && !s.grounded) continue; // hopped over the shock wave
    if (!f || !r) { f = forwardOf(s.heading); r = rightOf(s.heading); } // only when something is in range
    if (h.hit === 'launch') {
      // an erupting vent: thrown up like off a ramp, so a trick up there is a boost; never a hit
      const vy = h.launch ?? 0;
      if (s.verticalVelocity < vy) {
        s.verticalVelocity = vy;
        s.grounded = false;
        s.airborne.fromJumpId = h.id;
        s.airborne.seconds = 0;
        s.airborne.trickQueued = false;
        kartEvents.push({ type: 'launched', jumpId: h.id });
      }
      continue;
    }
    if (h.type === 'gust') {
      const p = h.push ?? [0, 0, 0];
      s.speed += (p[0] * f[0] + p[2] * f[2]) * dt;
      s.lateralVelocity += (p[0] * r[0] + p[2] * r[2]) * dt;
      continue;
    }
    if (tr.hazardCooldownRemaining > 0) continue;
    switch (h.hit) {
      case 'spin':
        applyHit(s, c, 'hazard', kartEvents);
        break;
      case 'slow':
        s.status.slowedTo = RACE.hazardSlowTo;
        s.status.slowRemaining = RACE.hazardSlowSeconds;
        break;
      case 'bump': {
        const ax = s.position[0] - h.position[0], az = s.position[2] - h.position[2];
        const side = ax * r[0] + az * r[2] >= 0 ? 1 : -1;
        s.lateralVelocity += side * RACE.hazardBumpLateral;
        break;
      }
    }
    tr.hazardCooldownRemaining = RACE.hazardCooldownSeconds;
    events.push({ type: 'hazardHit', racerId: s.racerId, hazardId: h.id, hit: h.hit });
  }
}
