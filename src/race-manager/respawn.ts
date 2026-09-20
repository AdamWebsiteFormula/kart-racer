// Stuck detection and respawn placement at the last hit checkpoint, main line,
// facing the tangent, with a short input freeze. Coins and the held item stay.
import { clearBoost } from '../kart-controller/boost.ts';
import { cancelDrift } from '../kart-controller/drift.ts';
import { headingOf, type InputState, type KartState } from '../kart-controller/types.ts';
import type { Track } from '../track-builder/track.ts';
import { RACE } from './constants.ts';
import type { KartTracker, RaceEvent } from './types.ts';
import { resetWrongWay } from './wrongway.ts';

/** Accumulates stuckSeconds; true on the tick the kart has been stuck long enough. */
export function stepStuck(s: KartState, tr: KartTracker, input: InputState, dt: number): boolean {
  const wants = s.isPlayer ? input.throttle > RACE.stuckInputMin || input.brake > RACE.stuckInputMin : true;
  const stuck = wants && Math.abs(s.speed) < RACE.stuckSpeed && s.status.spinRemaining === 0 && s.grounded && tr.freezeRemaining === 0;
  tr.stuckSeconds = stuck ? tr.stuckSeconds + dt : 0;
  return tr.stuckSeconds + 1e-9 >= RACE.stuckSeconds;
}

export function respawnKart(s: KartState, tr: KartTracker, track: Track, events: RaceEvent[]): void {
  const cp = track.checkpoints[tr.lastCheckpoint];
  s.position = [cp.position[0], cp.position[1] + RACE.respawnLift, cp.position[2]];
  s.heading = headingOf(cp.tangent);
  s.t = cp.t;
  s.branch = 0;
  s.speed = 0;
  s.lateralVelocity = 0;
  s.verticalVelocity = 0;
  s.grounded = true;
  s.airborne.fromJumpId = undefined;
  s.airborne.trickQueued = false;
  s.airborne.seconds = 0;
  cancelDrift(s);
  clearBoost(s);
  s.status.intangibleRemaining = Math.max(s.status.intangibleRemaining, RACE.respawnFreezeSeconds);
  tr.prevT = cp.t;
  tr.freezeRemaining = RACE.respawnFreezeSeconds;
  tr.stuckSeconds = 0;
  tr.respawnCount++;
  resetWrongWay(s, tr, events);
  events.push({ type: 'respawn', racerId: s.racerId, checkpoint: tr.lastCheckpoint });
}
