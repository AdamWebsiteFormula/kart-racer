// Kart-vs-hazard test and the four hit kinds. Track-builder gives the active list;
// race-manager owns the kart side. Gusts push every tick; the rest hit once per cooldown.
import type { KartConstants } from '../kart-controller/constants.ts';
import { applyHit } from '../kart-controller/step.ts';
import { forwardOf, rightOf, type KartEvent, type KartState } from '../kart-controller/types.ts';
import type { ActiveHazard } from '../track-builder/types.ts';
import { RACE } from './constants.ts';
import type { KartTracker, RaceEvent } from './types.ts';
import { countDown, dist3 } from './util.ts';

export function stepHazards(
  s: KartState, tr: KartTracker, c: KartConstants, active: readonly ActiveHazard[], dt: number,
  events: RaceEvent[], kartEvents: KartEvent[],
): void {
  tr.hazardCooldownRemaining = countDown(tr.hazardCooldownRemaining, dt);
  if (s.isGhost) return;
  const f = forwardOf(s.heading), r = rightOf(s.heading);
  for (const h of active) {
    if (dist3(s.position, h.position) > h.radius + c.kartRadius) continue;
    if (h.type === 'gust') {
      const p = h.push ?? [0, 0, 0];
      s.speed += (p[0] * f[0] + p[2] * f[2]) * dt;
      s.lateralVelocity += (p[0] * r[0] + p[2] * r[2]) * dt;
      continue;
    }
    if (tr.hazardCooldownRemaining > 0 || s.status.intangibleRemaining > 0) continue;
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
