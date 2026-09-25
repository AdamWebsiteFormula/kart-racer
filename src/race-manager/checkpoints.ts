// Per-kart checkpoint tracker: in-order crossings, laps, finish, the anchored
// distanceAlong, and the post-shift resync. A checkpoint is a crossing of its t,
// never a zone, because the kart's t is exact.
import { crossed } from '../kart-controller/ground.ts';
import type { KartState } from '../kart-controller/types.ts';
import { signedOffset } from '../track-builder/branches.ts';
import { wrap01 } from '../track-builder/lut.ts';
import type { Track } from '../track-builder/track.ts';
import { RACE } from './constants.ts';
import type { KartTracker, RaceEvent } from './types.ts';

export function createTracker(gridSlot: number, t: number): KartTracker {
  return {
    gridSlot, nextCheckpoint: 0, lastCheckpoint: 0, prevT: t, lapTicks: [],
    throttleHeldSinceTick: -1, hazardCooldownRemaining: 0, ventCooldownRemaining: 0, shownRank: 0, rankHeldSeconds: 0,
    wrongWayOn: false, wrongWaySeconds: 0, stuckSeconds: 0, freezeRemaining: 0, respawnCount: 0, dnf: false, finalDistance: 0,
  };
}

export type CheckpointResult = 'none' | 'checkpoint' | 'lap' | 'finish';

/** Count checkpoint i as hit. Handles the line (i = 0): start, lap or finish. */
function hit(s: KartState, tr: KartTracker, track: Track, i: number, lapsTotal: number, tick: number, events: RaceEvent[]): CheckpointResult {
  const n = track.checkpoints.length;
  tr.lastCheckpoint = i;
  tr.nextCheckpoint = (i + 1) % n;
  if (i !== 0) {
    s.checkpointsHit++;
    events.push({ type: 'checkpoint', racerId: s.racerId, index: i });
    return 'checkpoint';
  }
  // the line
  const completedLap = s.checkpointsHit === n - 1;
  s.checkpointsHit = 0;
  if (!completedLap) return 'checkpoint'; // first crossing from the grid
  tr.lapTicks.push(tick);
  if (s.lap >= lapsTotal) {
    s.finishTick = tick;
    return 'finish';
  }
  s.lap++;
  events.push({ type: 'lap', racerId: s.racerId, lap: s.lap, isFinal: s.lap === lapsTotal });
  return 'lap';
}

/**
 * One tick. Counts at most one checkpoint, only the next one in order, only on a
 * forward crossing, and never when t jumped more than teleportGuardSectors.
 */
export function stepCheckpoints(s: KartState, tr: KartTracker, track: Track, lapsTotal: number, tick: number, events: RaceEvent[]): CheckpointResult {
  const prevT = tr.prevT;
  tr.prevT = s.t;
  if (s.isGhost || s.finishTick !== undefined) return 'none';
  const n = track.checkpoints.length;
  const moved = wrap01(s.t - prevT);
  if (moved > RACE.teleportGuardSectors / n) return 'none'; // backward or teleport
  const cp = track.checkpoints[tr.nextCheckpoint];
  if (!crossed(prevT, s.t, cp.t)) return 'none';
  return hit(s, tr, track, tr.nextCheckpoint, lapsTotal, tick, events);
}

/**
 * After a Final Lap Shift remapped t: a next checkpoint that now sits a little
 * behind the kart counts as hit, so nobody waits for a line already passed.
 */
export function resyncAfterShift(s: KartState, tr: KartTracker, track: Track, lapsTotal: number, tick: number, events: RaceEvent[]): CheckpointResult {
  tr.prevT = s.t;
  if (s.isGhost || s.finishTick !== undefined) return 'none';
  const n = track.checkpoints.length;
  const cp = track.checkpoints[tr.nextCheckpoint];
  const off = signedOffset(s.t, cp.t);
  if (off > 0 && off < RACE.checkpointResyncSectors / n) return hit(s, tr, track, tr.nextCheckpoint, lapsTotal, tick, events);
  return 'none';
}

/** A kart can honestly sit this many sectors past its last checkpoint: one to the next line, plus the post-shift resync slack. */
const MAX_AHEAD_SECTORS = 1.5;

/**
 * Metres of race progress, anchored on the last hit checkpoint so it is continuous
 * across the line. The offset from that checkpoint is at most MAX_AHEAD_SECTORS ahead;
 * anything further reads as behind, so a cut or a long reverse never gains a lap.
 */
export function distanceAlong(s: KartState, tr: KartTracker, track: Track): number {
  const cp = track.checkpoints[tr.lastCheckpoint];
  const L = track.length;
  const ahead = wrap01(s.t - cp.t);
  const off = ahead > MAX_AHEAD_SECTORS / track.checkpoints.length ? ahead - 1 : ahead;
  return (s.lap - 1) * L + (wrap01(cp.t - track.startT) + off) * L;
}
