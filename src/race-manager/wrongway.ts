// Wrong-way warning: velocity along the track tangent below wrongWaySpeed for
// wrongWayHoldSeconds turns it on; above wrongWayClearSpeed turns it off.
import { forwardOf, rightOf, type KartState, type TrackSample } from '../kart-controller/types.ts';
import type { Track } from '../track-builder/track.ts';
import { RACE } from './constants.ts';
import type { KartTracker, RaceEvent } from './types.ts';

const scratch: TrackSample = { position: [0, 0, 0], tangent: [0, 0, 1], normal: [0, 1, 0], groundY: 0, halfWidth: 0, surface: 'road', gripScale: 1 };

/** m/s of the kart's velocity along the track direction at its t. */
export function alongTrack(s: KartState, track: Track): number {
  const smp = track.sampleInto(s.t, 0, s.branch, scratch);
  const f = forwardOf(s.heading), r = rightOf(s.heading);
  const vx = f[0] * s.speed + r[0] * s.lateralVelocity;
  const vz = f[2] * s.speed + r[2] * s.lateralVelocity;
  return vx * smp.tangent[0] + vz * smp.tangent[2];
}

export function resetWrongWay(s: KartState, tr: KartTracker, events: RaceEvent[]): void {
  tr.wrongWaySeconds = 0;
  if (tr.wrongWayOn) { tr.wrongWayOn = false; events.push({ type: 'wrongWay', racerId: s.racerId, on: false }); }
}

export function stepWrongWay(s: KartState, tr: KartTracker, track: Track, dt: number, events: RaceEvent[]): void {
  if (s.isGhost || s.finishTick !== undefined) { resetWrongWay(s, tr, events); return; }
  const along = alongTrack(s, track);
  if (along < RACE.wrongWaySpeed) {
    tr.wrongWaySeconds += dt;
    if (!tr.wrongWayOn && tr.wrongWaySeconds + 1e-9 >= RACE.wrongWayHoldSeconds) {
      tr.wrongWayOn = true;
      events.push({ type: 'wrongWay', racerId: s.racerId, on: true });
    }
  } else if (along > RACE.wrongWayClearSpeed) {
    resetWrongWay(s, tr, events);
  }
}
