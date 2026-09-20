import { describe, expect, it } from 'vitest';
import { applyResults, createGrandPrix, createKnockout, grandPrixTable, isDone, knockoutWinner, nextRace, starThresholdsFor } from './series.ts';
import type { RaceResults, RacerConfig } from './types.ts';

const racers: RacerConfig[] = Array.from({ length: 8 }, (_, i) => ({ racerId: `r${i}`, archetype: 'medium', isPlayer: i === 0 }));

/** Results with the given finish order. */
function results(order: string[], trackId = 't'): RaceResults {
  return {
    mode: 'quick', trackId, speedClass: 150, seed: 1, goTick: 360,
    ranks: order.map((id, i) => ({ racerId: id, rank: i + 1, finishTick: 1000 + i, timeMs: 60000 + i, lapTimesMs: [], dnf: false })),
  };
}

const ids = racers.map((r) => r.racerId);

describe('Grand Prix', () => {
  it('runs the cup tracks in order and adds points from the table', () => {
    const gp = createGrandPrix({ id: 'sunrise', trackIds: ['a', 'b', 'c'] }, racers, 150, 7);
    expect(nextRace(gp)).toMatchObject({ mode: 'grandPrix', trackId: 'a', seed: 7 });
    expect(nextRace(gp)!.laps).toBeUndefined(); // the track's own lap count
    const ev = applyResults(gp, results(ids));
    expect(ev[0]).toEqual({ type: 'points', racerId: 'r0', points: 15, total: 15 });
    expect(gp.points).toEqual({ r0: 15, r1: 12, r2: 10, r3: 8, r4: 7, r5: 6, r6: 5, r7: 4 });
    expect(nextRace(gp)!.trackId).toBe('b');
    applyResults(gp, results(ids));
    applyResults(gp, results(ids));
    expect(isDone(gp)).toBe(true);
    expect(nextRace(gp)).toBeUndefined();
    const table = grandPrixTable(gp);
    expect(table.rows[0]).toEqual({ racerId: 'r0', points: 45, rank: 1 });
    expect(table.stars).toBe(3);
  });

  it('ties break by best single finish, then the latest race', () => {
    const gp = createGrandPrix({ id: 'sunrise', trackIds: ['a', 'b'] }, racers, 150, 1);
    // r0: 1st then 3rd = 25; r1: 2nd then 2nd = 24; r2: 3rd then 1st = 25 (best finish 1 both) → last race decides
    applyResults(gp, results(['r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7']));
    applyResults(gp, results(['r2', 'r1', 'r0', 'r3', 'r4', 'r5', 'r6', 'r7']));
    const rows = grandPrixTable(gp).rows;
    expect(rows.slice(0, 3).map((r) => [r.racerId, r.points])).toEqual([['r2', 25], ['r0', 25], ['r1', 24]]);
    // best single finish beats the latest race
    const gp2 = createGrandPrix({ id: 'sunrise', trackIds: ['a', 'b'] }, racers, 150, 1);
    applyResults(gp2, results(['r0', 'r2', 'r1', 'r3', 'r4', 'r5', 'r6', 'r7'])); // r0 15, r2 12, r1 10
    applyResults(gp2, results(['r2', 'r1', 'r3', 'r0', 'r4', 'r5', 'r6', 'r7'])); // r2 27, r1 22, r0 23
    expect(grandPrixTable(gp2).rows.slice(0, 3).map((r) => r.racerId)).toEqual(['r2', 'r0', 'r1']);
  });

  it('stars are 60 / 80 / 100 % of the cup maximum', () => {
    expect(starThresholdsFor(3)).toEqual([27, 36, 45]);
    expect(starThresholdsFor(4)).toEqual([36, 48, 60]);
    const gp = createGrandPrix({ id: 'sunrise', trackIds: ['a', 'b', 'c'] }, racers, 150, 1);
    applyResults(gp, results(ids));
    applyResults(gp, results(['r1', 'r0', ...ids.slice(2)]));
    applyResults(gp, results(['r1', 'r0', ...ids.slice(2)])); // r0 = 15 + 12 + 12 = 39
    expect(grandPrixTable(gp).stars).toBe(2);
  });
});

describe('Knockout', () => {
  it('cuts 8 → 6 → 4 → 2 across three segments; only survivors spawn; the final rank 1 wins', () => {
    const ko = createKnockout({ id: 'k1', trackIds: ['a', 'b', 'c'] }, racers, 150, 3);
    let cfg = nextRace(ko)!;
    expect(cfg).toMatchObject({ mode: 'knockout', trackId: 'a', laps: 2, knockout: { setId: 'k1', segment: 0, cutLine: 6, eliminated: [] } });
    expect(cfg.racers.length).toBe(8);
    let ev = applyResults(ko, results(ids));
    expect(ev).toEqual([{ type: 'eliminated', racerIds: ['r6', 'r7'], segment: 0 }]);
    expect(ko.eliminated).toEqual(['r6', 'r7']);
    cfg = nextRace(ko)!;
    expect(cfg.racers.map((r) => r.racerId)).toEqual(['r0', 'r1', 'r2', 'r3', 'r4', 'r5']);
    expect(cfg.knockout).toMatchObject({ segment: 1, cutLine: 4, eliminated: ['r6', 'r7'] });
    ev = applyResults(ko, results(['r1', 'r0', 'r3', 'r2', 'r5', 'r4']));
    expect(ev).toEqual([{ type: 'eliminated', racerIds: ['r5', 'r4'], segment: 1 }]);
    cfg = nextRace(ko)!;
    expect(cfg.racers.map((r) => r.racerId)).toEqual(['r0', 'r1', 'r2', 'r3']);
    expect(cfg.knockout!.cutLine).toBe(2);
    ev = applyResults(ko, results(['r3', 'r0', 'r1', 'r2']));
    expect(ev).toEqual([{ type: 'eliminated', racerIds: ['r1', 'r2'], segment: 2 }, { type: 'seriesFinished' }]);
    expect(isDone(ko)).toBe(true);
    expect(nextRace(ko)).toBeUndefined();
    expect(knockoutWinner(ko)).toBe('r3');
    expect(ko.placings).toEqual({ r7: 8, r6: 7, r5: 5, r4: 6, r1: 3, r2: 4, r3: 1, r0: 2 });
  });

  it('no winner before the last segment', () => {
    const ko = createKnockout({ id: 'k1', trackIds: ['a', 'b', 'c'] }, racers, 150, 3);
    applyResults(ko, results(ids));
    expect(knockoutWinner(ko)).toBeUndefined();
  });
});
