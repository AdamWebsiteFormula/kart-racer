// Stuck detection and respawn placement at the last hit checkpoint, main line, at
// the kart's own lateral clamped inside the road (the centreline is the racing line,
// and a kart parked there is a hazard: ai-driver Decisions 2026-09-21), facing the
// tangent, with a short input freeze. Coins and the held item stay.
import { clearBoost } from '../kart-controller/boost.ts';
import { BASE } from '../kart-controller/constants.ts';
import { cancelDrift } from '../kart-controller/drift.ts';
import { lateralOffset } from '../kart-controller/ground.ts';
import { headingOf, type InputState, type KartState } from '../kart-controller/types.ts';
import { wrap01 } from '../track-builder/lut.ts';
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

/** The kart's lateral where it was, measured on its own branch, clamped inside the road. */
export function respawnLateral(s: KartState, track: Track, halfWidth: number): number {
  const lat = lateralOffset(track, s.t, s.position, s.branch).lateral;
  const max = Math.max(0, halfWidth - BASE.kartRadius);
  if (!Number.isFinite(lat)) return 0;
  return lat < -max ? -max : lat > max ? max : lat;
}

export function respawnKart(s: KartState, tr: KartTracker, track: Track, events: RaceEvent[]): void {
  const cp = track.checkpoints[tr.lastCheckpoint];
  const p = track.sample(cp.t, respawnLateral(s, track, cp.halfWidth), 0).position;
  s.position = [p[0], p[1] + RACE.respawnLift, p[2]];
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
  // A hair behind the checkpoint, so a kart that has never crossed the line (next ===
  // last === 0) can still "cross" the line it now sits on. Any other next checkpoint is
  // a sector ahead, so the nudge changes nothing for it.
  tr.prevT = wrap01(cp.t - 1e-7);
  tr.freezeRemaining = RACE.respawnFreezeSeconds;
  tr.stuckSeconds = 0;
  tr.respawnCount++;
  resetWrongWay(s, tr, events);
  events.push({ type: 'respawn', racerId: s.racerId, checkpoint: tr.lastCheckpoint });
}
