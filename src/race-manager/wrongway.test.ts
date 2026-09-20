import { describe, expect, it } from 'vitest';
import { SIM_DT } from '../kart-controller/step.ts';
import { buildTrack } from '../track-builder/track.ts';
import { RACE } from './constants.ts';
import { alongTrack, stepWrongWay } from './wrongway.ts';
import { OVAL, placeAt, spawnKart } from './__tests__/fixtures.ts';
import type { RaceEvent } from './types.ts';

const track = buildTrack(OVAL);

describe('wrong-way', () => {
  it('along is signed speed along the tangent', () => {
    const { s } = spawnKart(track, 0);
    placeAt(track, s, 0.3);
    s.speed = 7;
    expect(alongTrack(s, track)).toBeCloseTo(7, 1);
    s.speed = -7;
    expect(alongTrack(s, track)).toBeCloseTo(-7, 1);
  });

  it('fires at wrongWayHoldSeconds ± 1 tick and clears once moving forward', () => {
    const { s, tr } = spawnKart(track, 0);
    placeAt(track, s, 0.3);
    s.speed = -5;
    const events: RaceEvent[] = [];
    let ticks = 0;
    while (!tr.wrongWayOn && ticks < 1000) { stepWrongWay(s, tr, track, SIM_DT, events); ticks++; }
    expect(Math.abs(ticks * SIM_DT - RACE.wrongWayHoldSeconds)).toBeLessThanOrEqual(SIM_DT);
    expect(events).toEqual([{ type: 'wrongWay', racerId: 'k0', on: true }]);
    s.speed = 0.2; // between the two thresholds: stays on
    stepWrongWay(s, tr, track, SIM_DT, events);
    expect(tr.wrongWayOn).toBe(true);
    s.speed = 3;
    stepWrongWay(s, tr, track, SIM_DT, events);
    expect(tr.wrongWayOn).toBe(false);
    expect(events.at(-1)).toEqual({ type: 'wrongWay', racerId: 'k0', on: false });
    expect(tr.wrongWaySeconds).toBe(0);
  });

  it('a brief reverse under the hold never fires', () => {
    const { s, tr } = spawnKart(track, 0);
    placeAt(track, s, 0.3);
    const events: RaceEvent[] = [];
    s.speed = -5;
    for (let i = 0; i < 100; i++) stepWrongWay(s, tr, track, SIM_DT, events);
    s.speed = 5;
    stepWrongWay(s, tr, track, SIM_DT, events);
    expect(events).toEqual([]);
  });
});
