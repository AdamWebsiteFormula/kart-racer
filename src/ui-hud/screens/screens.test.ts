import { describe, expect, it } from 'vitest';
import { applyResults, createGrandPrix, createKnockout } from '../../race-manager/series.ts';
import type { GrandPrixState, KnockoutState, RaceResults, RacerConfig } from '../../race-manager/types.ts';
import { UI } from '../constants.ts';
import { CAST } from '../data/cast.ts';
import { attractTrack, playableTracks } from '../data/catalog.ts';
import { firstFocus, reachable } from '../focus.ts';
import { defaultSave } from '../store.ts';
import { CREDITS_MADE, parseCredits } from './credits.ts';
import { cupMenu, MODES, modeMenu, pauseMenu, rosterMenu, settingsMenu, statBar, titleMenu } from './menus.ts';
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
      titleMenu().focus, titleMenu(true).focus, modeMenu(new Set(['quick', 'grandPrix', 'knockout'])).focus, rosterMenu(100).focus, rosterMenu(100, 'timeTrial').focus,
      cupMenu('grandPrix', built, save, 100).focus, cupMenu('knockout', built, save, 100).focus,
      pauseMenu().focus, pauseMenu(true).focus, settingsMenu(save.settings).focus,
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

  it('a solo run (the Daily Challenge) is not a win: the headline gives the time', () => {
    const solo = { ...results(['pip']), mode: 'daily' as const };
    expect(resultsModel(solo, 'pip', 'Meadow Run').headline).toBe('Finished! 0:50.00');
    expect(resultsModel(results(['pip', 'gus']), 'pip', 'Meadow Run').headline).toBe('You win!');
    expect(resultsModel(results(['pip'], ['pip']), 'pip', 'Meadow Run').headline).toBe('Out of time');
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

  it('after the Knockout final only the winner goes on: 2nd is out too, not THROUGH (bug hunt 2)', () => {
    const ko: KnockoutState = createKnockout({ id: 'coastline', trackIds: ['a', 'b', 'c'] }, racers, 150, 1);
    let field = CAST.map((c) => c.id);
    for (let seg = 0; seg < 2; seg++) {
      applyResults(ko, results(field));
      field = field.filter((id) => !ko.eliminated.includes(id));
    }
    const final = [field[1], field[0], ...field.slice(2)]; // pip (field[0]) 2nd
    const r = results(final);
    applyResults(ko, r);
    const vm = knockoutCutModel(r, ko, 'pip');
    expect(vm.done).toBe(true);
    expect(vm.headline).toBe(`${vm.winner} wins`);
    expect(vm.rows.map((x) => [x.out, x.winner])).toEqual([[false, true], [true, false], [true, false], [true, false]]);
    expect(vm.rows[1]).toMatchObject({ player: true, out: true });
  });

  it('credits come from the CREDITS.md tables', () => {
    const md = ['# Credits', '', '## Code', '| Work | Author | Licence |', '|---|---|---|', '| three.js | mrdoob | MIT |', '', '## Art', '| Work | Author | Licence |', '|---|---|---|', ''].join('\n');
    expect(parseCredits(md)).toEqual([{ title: 'Code', rows: [{ work: 'three.js', author: 'mrdoob', licence: 'MIT' }] }]);
  });

  it('the Credits screen says what is ours, in US spelling, with the shipped sound count (detail review)', async () => {
    const fs = (await import('node:fs' as string)) as { existsSync(p: string): boolean; readFileSync(p: string, enc: 'utf8'): string };
    const root = decodeURIComponent(import.meta.url.replace(/^file:\/\//, '').replace(/src\/ui-hud\/screens\/[^/]+$/, ''));
    const works = parseCredits(fs.readFileSync(`${root}CREDITS.md`, 'utf8')).flatMap((s) => s.rows.map((r) => r.work));
    for (const text of [CREDITS_MADE, ...works]) {
      expect(text, text).not.toMatch(/nintendo|mario/i);
      expect(text, text).not.toMatch(/modell|colour|\(fallback\)/i); // "karts (fallback)" read as unfinished
    }
    const manifest = `${root}public/audio/manifest.json`;
    if (!fs.existsSync(manifest)) return; // a checkout without recordings
    const m = JSON.parse(fs.readFileSync(manifest, 'utf8')) as { sfx: object; music: object };
    expect(works.join('\n')).toContain(`Sound effects: ${Object.keys(m.sfx).length} original sounds`);
    expect(works.join('\n')).toContain(`Music: ${Object.keys(m.music).length} original songs`);
  });

  it('the Knockout card promises one winner, as the cut screen crowns (8 → 6 → 4 → winner)', () => {
    const ko = MODES.find((m) => m.mode === 'knockout')!;
    expect(ko.sub).toMatch(/one wins/i);
    expect(ko.sub).not.toMatch(/two/i);
  });
});

describe('attract race', () => {
  it('the title races around Harbor Loop whatever track files sort first (design §12, bug hunt 2)', () => {
    // the same glob main.ts reads: Boardwalk Nights sorts first and used to take over the title
    const files = import.meta.glob('../../track-builder/tracks/*.json', { eager: true, import: 'default' }) as Record<string, { id: string }>;
    const ids = Object.values(files).map((d) => d.id);
    expect(ids).toContain('boardwalk-nights');
    expect(attractTrack(new Set(ids))).toBe('harbour-loop');
    expect(attractTrack(new Set(ids.filter((id) => id !== 'harbour-loop')))).toBe('meadow-run'); // else the first in cup order
    expect(attractTrack(new Set())).toBeUndefined();
  });
});

describe('track select', () => {
  it('lists the built tracks in cup order, three to a row; Time Trial cards show the best time and medal', async () => {
    const { trackMenu } = await import('./menus.ts');
    const { defaultSave } = await import('../store.ts');
    const built = new Set(['skyline-circuit', 'harbour-loop', 'canyon-rush', 'meadow-run']);
    const save = defaultSave();
    save.timeTrial['canyon-rush'] = { bestMs: 131240, medal: 'gold' };
    const times = new Map([['canyon-rush', { gold: 132000, silver: 140000, bronze: 150000 }]]);
    const quick = trackMenu('quick', built, save, times);
    expect(quick.tracks.map((t) => t.id)).toEqual(['harbour-loop', 'meadow-run', 'canyon-rush', 'skyline-circuit']);
    expect(quick.focus.rows).toEqual([['harbour-loop', 'meadow-run', 'canyon-rush'], ['skyline-circuit']]);
    expect(quick.tracks.every((t) => t.sub === undefined)).toBe(true);
    const tt = trackMenu('timeTrial', built, save, times);
    expect(tt.title).toMatch(/Time Trial/);
    expect(tt.tracks.find((t) => t.id === 'canyon-rush')!.sub).toBe('Best 2:11.24 · Gold');
  });

  it('a card grades the best time against the medal times now, not the medal saved under older ones', async () => {
    const { trackMenu } = await import('./menus.ts');
    const { defaultSave } = await import('../store.ts');
    const built = new Set(['harbour-loop', 'canyon-rush', 'skyline-circuit']);
    const save = defaultSave();
    // saved when gold was 150-162 s: today's times make them no medal and bronze
    save.timeTrial['canyon-rush'] = { bestMs: 155000, medal: 'gold' };
    save.timeTrial['skyline-circuit'] = { bestMs: 161000, medal: 'gold' };
    // saved under tighter times: silver then, gold now
    save.timeTrial['harbour-loop'] = { bestMs: 120000, medal: 'silver' };
    const times = new Map([
      ['harbour-loop', { gold: 126000, silver: 136000, bronze: 154000 }],
      ['canyon-rush', { gold: 124000, silver: 134000, bronze: 152000 }],
      ['skyline-circuit', { gold: 136000, silver: 148000, bronze: 167000 }],
    ]);
    const sub = (id: string) => trackMenu('timeTrial', built, save, times).tracks.find((t) => t.id === id)!.sub;
    expect(sub('canyon-rush')).toBe('Best 2:35.00');
    expect(sub('skyline-circuit')).toBe('Best 2:41.00 · Bronze');
    expect(sub('harbour-loop')).toBe('Best 2:00.00 · Gold');
  });
});
