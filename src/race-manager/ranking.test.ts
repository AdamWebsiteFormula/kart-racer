import { describe, expect, it } from 'vitest';
import { SIM_DT } from '../kart-controller/step.ts';
import { createKartState, type KartState } from '../kart-controller/types.ts';
import { createTracker } from './checkpoints.ts';
import { RACE } from './constants.ts';
import { assignRanks, sortOrder } from './ranking.ts';
import type { KartTracker, RaceEvent } from './types.ts';

function field(n: number): { karts: KartState[]; trackers: KartTracker[] } {
  const karts: KartState[] = [], trackers: KartTracker[] = [];
  for (let i = 0; i < n; i++) {
    karts.push(createKartState({ racerId: `k${i}` }));
    trackers.push(createTracker(i, 0));
  }
  return { karts, trackers };
}

describe('ranking', () => {
  it('orders by progress, finished first by finish tick, ties by grid slot', () => {
    const { karts, trackers } = field(5);
    karts[0].distanceAlong = 100;
    karts[1].distanceAlong = 300;
    karts[2].distanceAlong = 300;
    karts[3].distanceAlong = 50; karts[3].finishTick = 900;
    karts[4].distanceAlong = 10; karts[4].finishTick = 800;
    const order = sortOrder(karts, trackers, []);
    expect(order).toEqual([4, 3, 1, 2, 0]);
  });

  it('on the same finish tick a real crossing beats a force-finish, whatever the progress', () => {
    const { karts, trackers } = field(2);
    karts[0].distanceAlong = 800; karts[0].finishTick = 5000; // crossed the line on the grace tick
    karts[1].distanceAlong = 1150; karts[1].finishTick = 5000; trackers[1].dnf = true; // cut off at checkpoint 7
    expect(sortOrder(karts, trackers, [])).toEqual([0, 1]);
  });

  it('a photo finish stays as it was on the line: the tie-break is each kart\'s distance on its finish tick, not its live one (25 Sept 2026)', () => {
    const { karts, trackers } = field(2);
    // both crossed on tick 5000, kart 1 further past the line; after the flag kart 0 drove on past it
    karts[0].finishTick = 5000; trackers[0].finalDistance = 3000.4; karts[0].distanceAlong = 3020;
    karts[1].finishTick = 5000; trackers[1].finalDistance = 3000.9; karts[1].distanceAlong = 3011;
    expect(sortOrder(karts, trackers, [])).toEqual([1, 0]);
  });

  it('ghosts are left out', () => {
    const { karts, trackers } = field(3);
    karts[1].isGhost = true;
    expect(sortOrder(karts, trackers, [])).toEqual([0, 2]);
  });

  it('positionChange fires only after the rank has held for the debounce', () => {
    const { karts, trackers } = field(2);
    karts[0].distanceAlong = 10; karts[1].distanceAlong = 5;
    const events: RaceEvent[] = [];
    const order: number[] = [];
    const ticks = Math.round(RACE.rankDebounceSeconds / SIM_DT);
    for (let i = 0; i < ticks - 1; i++) assignRanks(karts, trackers, sortOrder(karts, trackers, order), SIM_DT, events);
    expect(karts[0].rank).toBe(1);
    expect(events).toEqual([]);
    assignRanks(karts, trackers, sortOrder(karts, trackers, order), SIM_DT, events);
    expect(events).toEqual([
      { type: 'positionChange', racerId: 'k0', rank: 1 },
      { type: 'positionChange', racerId: 'k1', rank: 2 },
    ]);
    // swap for a few ticks only: no event
    karts[1].distanceAlong = 20;
    for (let i = 0; i < 5; i++) assignRanks(karts, trackers, sortOrder(karts, trackers, order), SIM_DT, events);
    expect(events.length).toBe(2);
    expect(karts[1].rank).toBe(1);
    karts[1].distanceAlong = 1;
    for (let i = 0; i < 5; i++) assignRanks(karts, trackers, sortOrder(karts, trackers, order), SIM_DT, events);
    expect(events.length).toBe(2);
  });

  it('a kart that just finished announces at once', () => {
    const { karts, trackers } = field(2);
    karts[0].distanceAlong = 10; karts[1].distanceAlong = 5;
    const events: RaceEvent[] = [];
    const order: number[] = [];
    assignRanks(karts, trackers, sortOrder(karts, trackers, order), SIM_DT, events);
    expect(events).toEqual([]);
    karts[1].finishTick = 1;
    assignRanks(karts, trackers, sortOrder(karts, trackers, order), SIM_DT, events);
    expect(events).toEqual([{ type: 'positionChange', racerId: 'k1', rank: 1 }]);
  });
});
