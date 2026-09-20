import { describe, expect, it } from 'vitest';
import { wrap01 } from '../track-builder/lut.ts';
import { buildTrack } from '../track-builder/track.ts';
import { distanceAlong, resyncAfterShift, stepCheckpoints } from './checkpoints.ts';
import { OVAL, spawnKart } from './__tests__/fixtures.ts';
import type { RaceEvent } from './types.ts';

const track = buildTrack(OVAL);
const N = track.checkpoints.length;
const LAPS = 3;

type K = ReturnType<typeof spawnKart>;

/** Move t forward by `by` (fractions of a lap) in small steps, stepping the tracker each time. */
function driveBy(s: K['s'], tr: K['tr'], by: number, events: RaceEvent[], tick = { n: 0 }) {
  const results: string[] = [];
  let left = by;
  while (left > 1e-9) {
    const d = Math.min(0.004, left);
    s.t = wrap01(s.t + d);
    left -= d;
    results.push(stepCheckpoints(s, tr, track, LAPS, tick.n++, events));
  }
  return results;
}

/** Drive forward to `to` (less than half a lap ahead). */
function driveTo(s: K['s'], tr: K['tr'], to: number, events: RaceEvent[], tick = { n: 0 }) {
  return driveBy(s, tr, wrap01(to - s.t), events, tick);
}

describe('checkpoints', () => {
  it('starts just behind the line with slightly negative progress', () => {
    const { s, tr } = spawnKart(track, 0);
    expect(distanceAlong(s, tr, track)).toBeLessThan(0);
    expect(distanceAlong(s, tr, track)).toBeGreaterThan(-20);
  });

  it('counts checkpoints in order, one lap per full loop, finish on the last lap', () => {
    const { s, tr } = spawnKart(track, 0);
    const events: RaceEvent[] = [];
    const tick = { n: 0 };
    // first line crossing: start, no lap
    driveTo(s, tr, track.startT + 0.01, events, tick);
    expect(s.lap).toBe(1);
    expect(tr.nextCheckpoint).toBe(1);
    expect(events.filter((e) => e.type === 'lap')).toEqual([]);
    // one full loop
    const res = driveBy(s, tr, 1, events, tick);
    expect(res.filter((r) => r === 'checkpoint').length).toBe(N - 1);
    expect(res.filter((r) => r === 'lap').length).toBe(1);
    expect(s.lap).toBe(2);
    expect(s.checkpointsHit).toBe(0);
    expect(events.filter((e) => e.type === 'lap')).toEqual([{ type: 'lap', racerId: 'k0', lap: 2, isFinal: false }]);
    // second loop → final lap
    driveBy(s, tr, 1, events, tick);
    expect(s.lap).toBe(3);
    expect(events.filter((e) => e.type === 'lap').at(-1)).toEqual({ type: 'lap', racerId: 'k0', lap: 3, isFinal: true });
    // third loop → finish
    const last = driveBy(s, tr, 1, events, tick);
    expect(last.filter((r) => r === 'finish').length).toBe(1);
    expect(s.finishTick).toBeDefined();
    expect(s.lap).toBe(LAPS);
    expect(tr.lapTicks.length).toBe(LAPS);
    // nothing after the finish
    expect(driveBy(s, tr, 0.3, events, tick).every((r) => r === 'none')).toBe(true);
  });

  it('a teleport past several checkpoints counts nothing, and the lap waits for the missed ones', () => {
    const { s, tr } = spawnKart(track, 0);
    const events: RaceEvent[] = [];
    driveTo(s, tr, track.checkpoints[3].t + 0.01, events);
    expect(tr.nextCheckpoint).toBe(4);
    const before = distanceAlong(s, tr, track);
    s.t = wrap01(track.checkpoints[7].t + 0.01); // jump 4 sectors
    expect(stepCheckpoints(s, tr, track, LAPS, 0, events)).toBe('none');
    expect(tr.nextCheckpoint).toBe(4);
    // the cut earns no progress: four sectors ahead of the last checkpoint reads as behind it
    expect(distanceAlong(s, tr, track)).toBeLessThan(before);
    // drive on across the line: no lap, still waiting for 4
    driveTo(s, tr, track.startT + 0.01, events);
    expect(s.lap).toBe(1);
    expect(tr.nextCheckpoint).toBe(4);
    // a second loop collects 4..7 and then the line counts
    driveBy(s, tr, 1, events);
    expect(s.lap).toBe(2);
    expect(events.filter((e) => e.type === 'lap').length).toBe(1);
  });

  it('reversing up to (1 - 1.5/N) of a lap keeps losing progress instead of wrapping ahead', () => {
    const { s, tr } = spawnKart(track, 0);
    const events: RaceEvent[] = [];
    driveTo(s, tr, track.startT + 0.01, events);
    driveBy(s, tr, 1, events); // lap 2, just past the line
    let prev = distanceAlong(s, tr, track);
    const bound = 1 - 1.5 / N; // one anchor cannot tell "further behind" from "ahead" past this
    const steps = 300;
    for (let i = 0; i < steps; i++) {
      s.t = wrap01(s.t - (0.95 * bound) / steps);
      stepCheckpoints(s, tr, track, LAPS, 0, events);
      const d = distanceAlong(s, tr, track);
      expect(d).toBeLessThanOrEqual(prev + 1e-6);
      prev = d;
    }
    expect(s.lap).toBe(2);
  });

  it('reversing back over the line does not double count and keeps progress continuous', () => {
    const { s, tr } = spawnKart(track, 0);
    const events: RaceEvent[] = [];
    driveTo(s, tr, track.startT + 0.01, events);
    driveBy(s, tr, 0.98, events); // most of a lap, just short of the line
    let prev = distanceAlong(s, tr, track);
    let maxJump = 0;
    const step = (dt: number) => {
      s.t = wrap01(s.t + dt);
      stepCheckpoints(s, tr, track, LAPS, 0, events);
      const d = distanceAlong(s, tr, track);
      maxJump = Math.max(maxJump, Math.abs(d - prev));
      prev = d;
    };
    for (let i = 0; i < 10; i++) step(0.003); // across → lap 2
    expect(s.lap).toBe(2);
    for (let i = 0; i < 12; i++) step(-0.003); // back over the line
    for (let i = 0; i < 12; i++) step(0.003); // and forward again
    expect(s.lap).toBe(2);
    expect(events.filter((e) => e.type === 'lap').length).toBe(1);
    expect(maxJump).toBeLessThan(0.003 * track.length * 1.01);
  });

  it('resync after a shift credits a next checkpoint just behind the kart, and nothing else', () => {
    const { s, tr } = spawnKart(track, 0);
    const events: RaceEvent[] = [];
    driveTo(s, tr, track.checkpoints[3].t + 0.01, events);
    const cp4 = track.checkpoints[4].t;
    s.t = wrap01(cp4 + 0.3 / N);
    expect(resyncAfterShift(s, tr, track, LAPS, 0, events)).toBe('checkpoint');
    expect(tr.nextCheckpoint).toBe(5);
    s.t = wrap01(track.checkpoints[5].t + 0.7 / N);
    expect(resyncAfterShift(s, tr, track, LAPS, 0, events)).toBe('none');
    s.t = wrap01(track.checkpoints[5].t - 0.1 / N);
    expect(resyncAfterShift(s, tr, track, LAPS, 0, events)).toBe('none');
    expect(tr.prevT).toBe(s.t);
  });

  it('ghosts and finished karts never count', () => {
    const { s, tr } = spawnKart(track, 0);
    s.isGhost = true;
    expect(driveBy(s, tr, 1.2, []).every((r) => r === 'none')).toBe(true);
  });
});
