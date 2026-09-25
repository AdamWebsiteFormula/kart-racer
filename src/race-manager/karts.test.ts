// Any racer in any kart (design §5): the race manager builds each kart's constants from its racer
// and kart, a race in a changed kart replays byte for byte from its inputs, and a series carries
// every racer's kart race to race.
import { describe, expect, it } from 'vitest';
import { makeConstants } from '../kart-controller/constants.ts';
import type { InputState } from '../kart-controller/types.ts';
import { buildTrack } from '../track-builder/track.ts';
import { laneFor, lookAheadDriver } from './__tests__/drivers.ts';
import { HARBOUR_LOOP } from './__tests__/fixtures.ts';
import { RaceManager } from './race.ts';
import { applyResults, createGrandPrix, createKnockout, nextRace } from './series.ts';
import type { RaceConfig, RaceResults, RacerConfig } from './types.ts';

const TICKS = 2400;

function config(player: RacerConfig): RaceConfig {
  return {
    mode: 'quick', trackId: HARBOUR_LOOP.id, speedClass: 150, seed: 3,
    racers: [player, { racerId: 'pip', archetype: 'light' }, { racerId: 'juniper', archetype: 'medium', kartId: 'no-such-kart' }],
  };
}

/** Drives `TICKS` ticks with a scripted field (or replays `log`); returns the state as text and the inputs fed. */
function race(c: RaceConfig, log?: InputState[][]): { json: string; log: InputState[][]; rm: RaceManager } {
  const track = buildTrack(HARBOUR_LOOP);
  const rm = new RaceManager(track, c);
  const drivers = [lookAheadDriver(19, laneFor(0)), lookAheadDriver(17.8, laneFor(1)), lookAheadDriver(16.6, laneFor(2))];
  const fed: InputState[][] = [];
  for (let t = 0; t < TICKS; t++) {
    const inputs = log ? log[t] : rm.state.karts.map((s, i) => drivers[i](s, track));
    fed.push(inputs.map((x) => ({ ...x })));
    rm.step(inputs);
  }
  return { json: JSON.stringify(rm.state), log: fed, rm };
}

describe('any racer in any kart: the race manager', () => {
  it("builds each kart's constants from its racer and kart, and marks the kart on its state", () => {
    const rm = new RaceManager(buildTrack(HARBOUR_LOOP), config({ racerId: 'gus', archetype: 'heavy', isPlayer: true, kartId: 'scrap' }));
    expect(rm.consts[0]).toEqual(makeConstants('heavy', 150, 'gus', 'scrap'));
    expect(rm.consts[1]).toEqual(makeConstants('light', 150, 'pip'));
    expect(rm.consts[2]).toEqual(makeConstants('medium', 150, 'juniper'));
    expect(rm.consts.map((c) => c.kartId)).toEqual(['scrap', 'scooter', 'wagon']);
    expect(rm.state.karts.map((k) => k.kartId)).toEqual(['scrap', 'scooter', 'wagon']);
  });

  it('a changed-kart race replays byte-identically from its inputs, and the kart changes the race', () => {
    const inScrap = config({ racerId: 'gus', archetype: 'heavy', isPlayer: true, kartId: 'scrap' });
    const first = race(inScrap);
    const again = race(inScrap, first.log);
    expect(again.json).toBe(first.json);
    // the same inputs with Gus in his own Snack Truck: another race
    const own = race(config({ racerId: 'gus', archetype: 'heavy', isPlayer: true }), first.log);
    expect(own.json).not.toBe(first.json);
    expect(own.rm.state.karts[0].position).not.toEqual(first.rm.state.karts[0].position);
  });
});

describe('any racer in any kart: a series keeps every racer in their kart', () => {
  const racers: RacerConfig[] = [
    { racerId: 'pip', archetype: 'light', isPlayer: true, kartId: 'snacktruck' },
    { racerId: 'momo', archetype: 'light', kartId: 'scrap' },
    { racerId: 'gus', archetype: 'heavy', kartId: 'snacktruck' },
    { racerId: 'otto', archetype: 'medium', kartId: 'skimmer' },
  ];
  const results = (order: string[]): RaceResults => ({
    mode: 'quick', trackId: 't', speedClass: 150, seed: 1, goTick: 360,
    ranks: order.map((id, i) => ({ racerId: id, rank: i + 1, finishTick: 1000 + i, timeMs: 60000 + i, lapTimesMs: [], dnf: false, projectedMs: -1 })),
  });
  const kartsOf = (c: RaceConfig | undefined) => c?.racers.map((r) => [r.racerId, r.kartId]);

  it('a Grand Prix, race to race', () => {
    const gp = createGrandPrix({ id: 'sunrise', trackIds: ['a', 'b', 'c'] }, racers, 150, 7);
    const want = racers.map((r) => [r.racerId, r.kartId]);
    for (let i = 0; i < 3; i++) {
      expect(kartsOf(nextRace(gp)), `race ${i + 1}`).toEqual(want);
      applyResults(gp, results(['gus', 'pip', 'otto', 'momo']));
    }
  });

  it('a Knockout, round to round, as the field shrinks', () => {
    const ko = createKnockout({ id: 'coast', trackIds: ['a', 'b'], cutLines: [3, 1] }, racers, 150, 7);
    expect(kartsOf(nextRace(ko))).toEqual(racers.map((r) => [r.racerId, r.kartId]));
    applyResults(ko, results(['gus', 'pip', 'otto', 'momo']));
    expect(kartsOf(nextRace(ko))).toEqual([['pip', 'snacktruck'], ['gus', 'snacktruck'], ['otto', 'skimmer']]);
  });
});
