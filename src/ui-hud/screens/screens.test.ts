import { describe, expect, it } from 'vitest';
import { applyResults, createGrandPrix, createKnockout } from '../../race-manager/series.ts';
import type { GrandPrixState, KnockoutState, RaceResults, RacerConfig } from '../../race-manager/types.ts';
import { UI } from '../constants.ts';
import { CAST } from '../data/cast.ts';
import { playableTracks } from '../data/catalog.ts';
import { firstFocus, reachable } from '../focus.ts';
import { defaultSave } from '../store.ts';
import { parseCredits } from './credits.ts';
import { cupMenu, modeMenu, pauseMenu, rosterMenu, settingsMenu, statBar, titleMenu } from './menus.ts';
import { gpModel, knockoutCutModel, resultsModel } from './results.ts';

const racers: RacerConfig[] = CAST.map((c, i) => ({ racerId: c.id, archetype: c.archetype, isPlayer: i === 0 }));

function results(order: string[], dnf: string[] = []): RaceResults {
  return {
    mode: 'quick', trackId: 'harbour-loop', speedClass: 150, seed: 1, goTick: 360,
    ranks: order.map((id, i) => ({
      racerId: id, rank: i + 1, finishTick: 1000 + i * 60, timeMs: dnf.includes(id) ? -1 : 50000 + i * 500,
      lapTimesMs: [17000, 16500, 16500 + i * 500], dnf: dnf.includes(id),
    })),
  };
}

describe('menus', () => {
  it('SOP test 2: every enabled entry of every menu is reachable by arrows alone', () => {
    const save = defaultSave();
    const built = new Set(['harbour-loop']);
    const models = [
      titleMenu().focus, modeMenu(new Set(['quick', 'grandPrix', 'knockout'])).focus, rosterMenu(100).focus,
      cupMenu('grandPrix', built, save, 100).focus, cupMenu('knockout', built, save, 100).focus,
      pauseMenu().focus, settingsMenu(save.settings).focus,
    ];
    for (const m of models) {
      const start = firstFocus(m)!;
      const want = m.rows.flat().filter((id) => !m.disabled?.includes(id));
      expect([...reachable(m, start)].sort()).toEqual(want.sort());
    }
  });

  it('modes: unavailable ones are disabled and badged', () => {
    const vm = modeMenu(new Set(['quick']));
    expect(vm.entries.filter((e) => !e.disabled).map((e) => e.id)).toEqual(['quick']);
    expect(vm.entries[1].badge).toBe('Soon');
  });

  it('roster: eight cards, two rows of four plus the class row; stat bars order the archetypes', () => {
    const vm = rosterMenu(150);
    expect(vm.cards.length).toBe(8);
    expect(vm.focus.rows.map((r) => r.length)).toEqual([4, 4, 3]);
    expect(vm.classes.find((c) => c.id === 'cc150')!.badge).toBe('●');
    expect(statBar(0)).toBeCloseTo(0.6);
    const pip = vm.cards[0].stats, gus = vm.cards[7].stats;
    const v = (s: typeof pip, l: string) => s.find((x) => x.label === l)!.value;
    expect(v(pip, 'Accel')).toBeGreaterThan(v(gus, 'Accel'));
    expect(v(gus, 'Weight')).toBeGreaterThan(v(pip, 'Weight'));
  });

  it('cups: unbuilt tracks are skipped and the built ones repeat, so a Knockout is always three races', () => {
    expect(playableTracks(['a', 'b', 'c'], new Set(['a']))).toEqual(['a', 'a', 'a']);
    expect(playableTracks(['a', 'b', 'c'], new Set(['a', 'c']))).toEqual(['a', 'c', 'a']);
    expect(playableTracks(['a', 'b'], new Set())).toEqual([]);
    const vm = cupMenu('knockout', new Set(['harbour-loop']), defaultSave(), 100);
    expect(vm.cups[0].plays).toEqual(['harbour-loop', 'harbour-loop', 'harbour-loop']);
    expect(vm.cups[1].disabled).toBe(true);
  });
});

describe('results screens', () => {
  it('SOP test 9: ranks in order, dnf greyed and timeless, gaps to the winner, stagger rising by one step', () => {
    const vm = resultsModel(results(['gus', 'pip', 'momo'], ['momo']), 'pip', 'Harbour Loop');
    expect(vm.rows.map((r) => r.name)).toEqual(['Big Gus', 'Pip', 'Momo']);
    expect(vm.rows[1]).toMatchObject({ time: '0:50.50', gap: '+0.50', player: true });
    expect(vm.rows[2]).toMatchObject({ time: 'DNF', gap: '', dnf: true });
    expect(vm.rows.map((r) => r.delayMs)).toEqual([0, UI.staggerResultsMs, 2 * UI.staggerResultsMs]);
    expect(vm.headline).toBe('You finished 2nd');
    expect(vm.playerLaps.filter((l) => l.best).length).toBeGreaterThanOrEqual(1);
  });

  it('SOP test 10: the Grand Prix table has points, gains, and stars once the cup is done', () => {
    const gp: GrandPrixState = createGrandPrix({ id: 'sunrise', trackIds: ['a', 'b', 'c'] }, racers, 150, 1);
    const order = CAST.map((c) => c.id);
    let before = gp;
    for (let i = 0; i < 3; i++) { before = structuredClone(gp); applyResults(gp, results(order)); } // applyResults mutates
    const vm = gpModel(before, gp, 'pip');
    expect(vm.done).toBe(true);
    expect(vm.rows[0]).toMatchObject({ name: 'Pip', points: 45, gained: 15, player: true });
    expect(vm.stars).toBe(3);
    expect(vm.headline).toBe('Cup winner!');
  });

  it('SOP test 11: the Knockout cut strikes out the eliminated and counts who remains', () => {
    const ko: KnockoutState = createKnockout({ id: 'coastline', trackIds: ['a', 'b', 'c'] }, racers, 150, 1);
    const r = results([...CAST.map((c) => c.id)].reverse()); // pip last
    applyResults(ko, r);
    const vm = knockoutCutModel(r, ko, 'pip');
    expect(vm.remaining).toBe(6);
    expect(vm.rows.filter((x) => x.out).length).toBe(2);
    expect(vm.playerOut).toBe(true);
    expect(vm.headline).toBe('Knocked out!');
    expect(vm.sub).toBe('6 remain');
  });

  it('credits come from the CREDITS.md tables', () => {
    const md = ['# Credits', '', '## Code', '| Work | Author | Licence |', '|---|---|---|', '| three.js | mrdoob | MIT |', '', '## Art', '| Work | Author | Licence |', '|---|---|---|', ''].join('\n');
    expect(parseCredits(md)).toEqual([{ title: 'Code', rows: [{ work: 'three.js', author: 'mrdoob', licence: 'MIT' }] }]);
  });
});
