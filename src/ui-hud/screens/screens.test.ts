import { describe, expect, it } from 'vitest';
import { applyResults, createGrandPrix, createKnockout } from '../../race-manager/series.ts';
import type { GrandPrixState, KnockoutState, RaceResults, RacerConfig } from '../../race-manager/types.ts';
import { UI } from '../constants.ts';
import { CAST } from '../data/cast.ts';
import { attractTrack, playableTracks } from '../data/catalog.ts';
import { firstFocus, move, reachable } from '../focus.ts';
import { defaultSave } from '../store.ts';
import { CREDITS_MADE, parseCredits } from './credits.ts';
import { cupMenu, medalFor, medalLadder, MODES, modeMenu, pauseMenu, rosterMenu, rosterMove, settingsMenu, statBar, titleMenu, trackMenu } from './menus.ts';
import { boardModel, gpModel, knockoutCutModel, nextDailyAt, resultsModel, seedDate } from './results.ts';

const racers: RacerConfig[] = CAST.map((c, i) => ({ racerId: c.id, archetype: c.archetype, isPlayer: i === 0 }));

function results(order: string[], dnf: string[] = []): RaceResults {
  return {
    mode: 'quick', trackId: 'harbour-loop', speedClass: 150, seed: 1, goTick: 360,
    ranks: order.map((id, i) => ({
      racerId: id, rank: i + 1, finishTick: 1000 + i * 60, timeMs: dnf.includes(id) ? -1 : 50000 + i * 500,
      lapTimesMs: [17000, 16500, 16500 + i * 500], dnf: dnf.includes(id), projectedMs: -1,
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
    expect(vm.sub).toBe('6 racers left');
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

describe('results: rivals cut off at the grace', () => {
  it('shows a projected time and gap for a rival, DNF for the player', () => {
    const res = results(['pip', 'momo', 'nova'], ['momo', 'nova']);
    res.ranks[1].projectedMs = 52000;
    res.ranks[2].projectedMs = 53000;
    const vm = resultsModel(res, 'nova', 'Harbor Loop');
    expect(vm.rows[1].time).toBe('0:52.00');
    expect(vm.rows[1].gap).not.toBe('');
    expect(vm.rows[2].time).toBe('DNF');
  });
});

describe('leaderboard panel model (audit 24 Sept 2026)', () => {
  it('a Daily date reads in US order, and the next one starts at midnight UTC on the player\'s clock', () => {
    expect(seedDate(20260925)).toBe('Sep 25');
    expect(seedDate(20261201)).toBe('Dec 1');
    const noonUtc = new Date(Date.UTC(2026, 8, 24, 12));
    expect(nextDailyAt(noonUtc, 'America/New_York')).toBe('8:00 PM');
    expect(nextDailyAt(noonUtc, 'America/Los_Angeles')).toBe('5:00 PM');
    expect(nextDailyAt(noonUtc, 'UTC')).toBe('12:00 AM');
    const vm = boardModel('daily', 'Harbor Loop', 20260925, [], { state: 'idle' }, '8:00 PM');
    expect(vm.sub).toBe('Daily Challenge · Sep 25 · Harbor Loop');
    expect(vm.note).toBe('Next challenge at 8:00 PM your time (midnight UTC)');
    expect(boardModel('timeTrial', 'Harbor Loop', null, [], { state: 'idle' }, '8:00 PM').note).toBe('');
  });

  it('Post is live whatever the board read did; Try again shows only when the read failed', () => {
    const off = boardModel('timeTrial', 'Harbor Loop', null, 'offline', { state: 'idle' });
    expect([off.buttonDisabled, off.retry]).toEqual([false, true]);
    const loading = boardModel('timeTrial', 'Harbor Loop', null, 'loading', { state: 'idle' });
    expect([loading.buttonDisabled, loading.retry]).toEqual([false, false]);
    expect(boardModel('timeTrial', 'Harbor Loop', null, 'offline', { state: 'posting' }).buttonDisabled).toBe(true);
    expect(boardModel('timeTrial', 'Harbor Loop', null, [], { state: 'posted', id: 'x', rank: 3 }).buttonDisabled).toBe(true);
  });
});

describe('Time Trial medals (sweep 24 Sept 2026)', () => {
  const times = { gold: 119000, silver: 129000, bronze: 146000 };

  it('a time on a medal\'s line is that medal; a hundredth over is the next one down', () => {
    expect(medalFor(119000, times)).toBe('gold');
    expect(medalFor(119010, times)).toBe('silver');
    expect(medalFor(129000, times)).toBe('silver');
    expect(medalFor(146000, times)).toBe('bronze');
    expect(medalFor(146010, times)).toBe('none');
    expect(medalFor(1, times)).toBe('gold');
  });

  it('the results ladder lists every medal\'s time, best first, and marks the ones the run reached', () => {
    const silver = medalLadder(125000, times);
    expect(silver.won).toBe('silver');
    expect(silver.steps).toEqual([
      { medal: 'gold', label: 'Gold', time: '1:59.00', reached: false },
      { medal: 'silver', label: 'Silver', time: '2:09.00', reached: true },
      { medal: 'bronze', label: 'Bronze', time: '2:26.00', reached: true },
    ]);
    expect(medalLadder(150000, times)).toMatchObject({ won: 'none', steps: [{ reached: false }, { reached: false }, { reached: false }] });
  });

  it('a finished Time Trial run carries its medal to the results; a DNF, or a run with no medal times, does not', () => {
    const run = (timeMs: number, dnf = false): RaceResults => ({
      mode: 'timeTrial', trackId: 'harbour-loop', speedClass: 150, seed: 0, goTick: 360,
      ranks: [{ racerId: 'pip', rank: 1, finishTick: 14000, timeMs, lapTimesMs: [timeMs], dnf, projectedMs: -1 }],
    });
    expect(resultsModel(run(117500), 'pip', 'Harbor Loop', UI.staggerResultsMs, times).medal?.won).toBe('gold');
    expect(resultsModel(run(140000), 'pip', 'Harbor Loop', UI.staggerResultsMs, times).medal?.won).toBe('bronze');
    expect(resultsModel(run(-1, true), 'pip', 'Harbor Loop', UI.staggerResultsMs, times).medal).toBeUndefined();
    expect(resultsModel(run(117500), 'pip', 'Harbor Loop').medal).toBeUndefined();
  });

  it('a Time Trial card carries its best run\'s medal for the corner badge, and still names it in words; other modes carry none', () => {
    const save = defaultSave();
    save.timeTrial['harbour-loop'] = { bestMs: 117500, medal: 'gold' };
    save.timeTrial['meadow-run'] = { bestMs: 160000, medal: 'none' };
    const built = new Set(['harbour-loop', 'meadow-run', 'canyon-rush']);
    const medals = new Map([['harbour-loop', times], ['meadow-run', times], ['canyon-rush', times]]);
    const tt = trackMenu('timeTrial', built, save, medals).tracks;
    expect(tt.map((t) => [t.id, t.medal ?? null, t.sub ?? null])).toEqual([
      ['harbour-loop', 'gold', 'Best 1:57.50 · Gold'],
      ['meadow-run', null, 'Best 2:40.00'],
      ['canyon-rush', null, null],
    ]);
    expect(trackMenu('quick', built, save, medals).tracks.every((t) => t.medal === undefined)).toBe(true);
  });
});

describe('racer screen focus (sweep 24 Sept 2026)', () => {
  // two rows of four cards, then Paint and Body, then the class row
  const grid = { rows: [['pip', 'momo', 'nova', 'juniper'], ['otto', 'sprocket', 'boulder', 'gus'], ['paint', 'body'], ['cc50', 'cc100', 'cc150']] };
  const at = (cur: string, dir: 'up' | 'down' | 'left' | 'right', dressed = 'pip') => rosterMove(grid, cur, dir, dressed) ?? move(grid, cur, dir);

  it('down from any card goes straight to the rows under the cards, passing no card (down from Pip used to land on Otto and put him on show)', () => {
    expect(at('pip', 'down')).toBe('paint');
    expect(at('juniper', 'down')).toBe('body'); // the nearest one under it
    expect(at('otto', 'down', 'otto')).toBe('paint');
  });

  it('up from the rows comes back to the racer on show, whichever card is nearer; so does down past the last row, round to the top', () => {
    expect(at('paint', 'up')).toBe('pip');
    expect(at('body', 'up', 'boulder')).toBe('boulder');
    expect(at('cc150', 'down', 'nova')).toBe('nova');
    // between the rows under the cards, the plain grid
    expect(at('body', 'down')).toBe('cc100');
    expect(at('cc50', 'up')).toBe('paint');
  });

  it('left and right run through all eight cards in reading order, round the ends; up moves to the other row of cards', () => {
    expect(at('juniper', 'right')).toBe('otto');
    expect(at('otto', 'left')).toBe('juniper');
    expect(at('gus', 'right')).toBe('pip');
    expect(at('pip', 'left')).toBe('gus');
    expect(at('otto', 'up')).toBe('pip');
    expect(at('pip', 'up')).toBe('otto');
    // the rows under the cards step as ever
    expect(at('paint', 'right')).toBe('body');
  });

  it('on a phone on its side the cards are one row, and so is the grid: up from a card wraps to the bottom row, never onto another card', () => {
    const one = rosterMenu(100, 'quick', {}, true).focus;
    expect(one.rows.map((r) => r.length)).toEqual([8, 3]);
    expect(rosterMove(one, 'pip', 'down', 'pip')).toBe('cc50');
    expect(rosterMove(one, 'pip', 'up', 'pip')).toBeNull(); // the plain grid: round to the class row
    expect(move(one, 'pip', 'up')).toBe('cc50');
    expect(rosterMove(one, 'cc150', 'up', 'otto')).toBe('otto');
    expect(rosterMove(one, 'juniper', 'right', 'pip')).toBe('otto');
    // every entry still reachable by arrows alone (SOP test 2)
    const reach = (m: typeof one, from: string) => {
      const seen = new Set([from]); const queue = [from];
      while (queue.length) {
        const id = queue.shift()!;
        for (const d of ['up', 'down', 'left', 'right'] as const) { const n = rosterMove(m, id, d, 'pip') ?? move(m, id, d); if (!seen.has(n)) { seen.add(n); queue.push(n); } }
      }
      return seen;
    };
    expect(reach(one, 'pip').size).toBe(11);
    expect(reach(grid, 'pip').size).toBe(13);
  });
});
