// @vitest-environment jsdom
// The end screens as Mario Kart World draws them (25 Sept 2026): every results-type row names its racer by
// their face (the portrait cropped to the head, ringed in their color), and the Grand Prix standings play out:
// the old order and totals with the points just won, the totals counting up, then each place that changes
// hands turning over to its new holder with an arrow for how they moved. The animation is the stylesheet's
// (ui.css); these pin what the DOM gives it, and what assistive tech reads: the new order throughout.
import { afterEach, describe, expect, it } from 'vitest';
import { applyResults, createGrandPrix } from '../../race-manager/series.ts';
import type { RaceResults, RacerConfig } from '../../race-manager/types.ts';
import { UI } from '../constants.ts';
import { CAST } from '../data/cast.ts';
import { faceCrop } from '../data/faces.ts';
import { podiumModel } from '../screens/podium.ts';
import { boardModel, gpModel, knockoutCutModel, resultsModel, type GpVM } from '../screens/results.ts';
import { PodiumView } from './podium.ts';
import { ResultsView } from './screens.ts';

const ORDER = CAST.map((c) => c.id); // pip, momo, nova, juniper, otto, sprocket, boulder, gus
const racers: RacerConfig[] = ORDER.map((id, i) => ({ racerId: id, archetype: 'medium', isPlayer: i === 0 }));
function results(order: string[]): RaceResults {
  return {
    mode: 'grandPrix', trackId: 'harbour-loop', speedClass: 150, seed: 1, goTick: 360,
    ranks: order.map((id, i) => ({ racerId: id, rank: i + 1, finishTick: 12000 + i * 60, timeMs: 97000 + i * 500, lapTimesMs: [33000, 32000, 32000], dnf: false, projectedMs: -1 })),
  };
}
/** the standings after two races: Nova wins the second and passes Momo, Big Gus passes Boulder */
function secondRace(): GpVM {
  const gp = createGrandPrix({ id: 'sunrise', trackIds: ['a', 'b', 'c'] }, racers, 150, 1);
  applyResults(gp, results(ORDER));
  const before = structuredClone(gp);
  applyResults(gp, results(['nova', 'pip', 'momo', 'juniper', 'otto', 'sprocket', 'gus', 'boulder']));
  return gpModel(before, gp, 'pip');
}
const view = () => { document.body.innerHTML = ''; return new ResultsView(document.body); };
/** each row's own cells (not the one who held the place before, riding on top) */
const own = (v: ResultsView, sel: string) => [...v.root.querySelectorAll<HTMLElement>(`.rows > .row > ${sel}`)];
const words = (e: Element) => e.getAttribute('aria-hidden') === 'true' ? null : e.getAttribute('role');

afterEach(() => { document.body.innerHTML = ''; });

describe('faces in every results-type row', () => {
  it('the race results: each racer\'s portrait cropped to the head, ringed in their color, hidden from assistive tech (the name is beside it)', () => {
    const v = view();
    v.renderResults(resultsModel(results(ORDER), 'pip', 'Harbor Loop'), 'Standings');
    const faces = own(v, '.face-ic');
    expect(faces).toHaveLength(8);
    faces.forEach((f, i) => {
      expect(f.style.getPropertyValue('--portrait')).toContain(`art/racers/${ORDER[i]}.webp`);
      expect(f.style.getPropertyValue('--crop')).toBe(faceCrop(ORDER[i]));
      expect(f.getAttribute('aria-hidden')).toBe('true');
      expect(f.getAttribute('role')).toBeNull();
      // the ring's color is the row's accent
      expect((f.parentElement as HTMLElement).style.getPropertyValue('--accent')).toBe(CAST[i].accent);
    });
    // the name cell follows the face; no color dot is left
    expect(own(v, '.face-ic + .nm').map((e) => e.textContent)).toEqual(['Pip (you)', 'Momo', 'Nova', 'Juniper', 'Otto', 'Sprocket', 'Boulder', 'Big Gus']);
    expect(v.root.querySelector('.sw')).toBeNull();
    // every other part is a cell
    for (const row of v.root.querySelectorAll('.row')) expect([...row.children].map(words)).toEqual(['cell', null, 'cell', 'cell', 'cell']);
  });

  it('the Knockout cut, the leaderboard and the podium places too', () => {
    const v = view();
    const ko = { segment: 1, trackIds: ['a', 'b', 'c'], racers, eliminated: ['boulder', 'gus'], placings: {}, cutLines: [6, 4, 1], setId: 'coastline', speedClass: 150 } as never;
    v.renderCut(knockoutCutModel(results(ORDER), ko, 'pip'), 'Next race');
    expect(own(v, '.face-ic').map((f) => f.style.getPropertyValue('--portrait').match(/racers\/(\w+)\.webp/)?.[1])).toEqual(ORDER);

    v.renderResults(resultsModel({ ...results(['pip']), mode: 'timeTrial' }, 'pip', 'Harbor Loop'), 'Back to menu', { name: 'Ada' });
    v.updateBoard(boardModel('timeTrial', 'Harbor Loop', null, [{ id: 'a', name: 'Ada', racerId: 'nova', kartId: 'pod', timeMs: 90000 }, { id: 'b', name: 'Bo', racerId: 'gus', kartId: 'snacktruck', timeMs: 91000 }], { state: 'idle' }));
    const board = [...v.root.querySelectorAll<HTMLElement>('.board-row')];
    expect(board.map((r) => r.querySelector<HTMLElement>('.face-ic')?.style.getPropertyValue('--crop'))).toEqual([faceCrop('nova'), faceCrop('gus')]);
    expect(board.map((r) => [...r.children].map(words))).toEqual([['cell', null, 'cell', 'cell', 'cell'], ['cell', null, 'cell', 'cell', 'cell']]);

    document.body.innerHTML = '';
    const p = new PodiumView(document.body);
    const gp = createGrandPrix({ id: 'sunrise', trackIds: ['a'] }, racers, 150, 1);
    applyResults(gp, results(ORDER));
    p.render(podiumModel(['pip', 'momo', 'nova'], 'pip', { gp }));
    // the steps as they stand, 2nd, 1st, 3rd: each with its racer's face before the name
    expect([...p.root.querySelectorAll<HTMLElement>('.podium-place .face-ic')].map((f) => f.style.getPropertyValue('--crop'))).toEqual([faceCrop('momo'), faceCrop('pip'), faceCrop('nova')]);
    expect([...p.root.querySelectorAll('.podium-place .face-ic + .nm')].map((e) => e.textContent)).toEqual(['Momo', 'Pip (you)', 'Nova']);
  });
});

describe('the Grand Prix standings play out (Mario Kart World)', () => {
  it('the rows are the new order for assistive tech from the start; each place that changes hands carries its old holder on top, hidden, until it turns over', () => {
    const v = view();
    v.renderGp(secondRace(), 'Next race');
    const rows = v.root.querySelector<HTMLElement>('.rows')!;
    expect(['standings', 'moves', 'play'].map((c) => rows.classList.contains(c))).toEqual([true, true, true]);
    expect(own(v, '.nm').map((e) => e.textContent)).toEqual(['Pip (you)', 'Nova', 'Momo', 'Juniper', 'Otto', 'Sprocket', 'Big Gus', 'Boulder']);
    // 2nd and 3rd, 7th and 8th change hands: they flip, from Momo, Nova, Boulder and Big Gus
    const flips = [...rows.querySelectorAll<HTMLElement>(':scope > .row')].map((r) => r.classList.contains('flip'));
    expect(flips).toEqual([false, true, true, false, false, false, true, true]);
    const was = [...rows.querySelectorAll<HTMLElement>(':scope > .row > .was')];
    expect(was.map((w) => w.querySelector('.nm')?.textContent)).toEqual(['Momo', 'Nova', 'Boulder', 'Big Gus']);
    expect(was.every((w) => w.getAttribute('aria-hidden') === 'true' && !w.getAttribute('role'))).toBe(true);
    // the place is the row's: the old holder shows it too
    expect(was.map((w) => w.querySelector('.rk')?.textContent)).toEqual(['2nd', '3rd', '7th', '8th']);
    // how each moved, in words: the arrows are for the eyes
    expect(own(v, '.mv').map((m) => m.querySelector('.sr-only')?.textContent)).toEqual(['no change', 'up 1', 'down 1', 'no change', 'no change', 'no change', 'up 1', 'down 1']);
    expect(own(v, '.mv').map((m) => m.className)).toEqual(['mv same', 'mv up', 'mv down', 'mv same', 'mv same', 'mv same', 'mv up', 'mv down']);
    // the points just won, then the total
    expect(own(v, '.gained').map((e) => e.textContent)).toEqual(['+12', '+15', '+10', '+8', '+7', '+6', '+5', '+4']);
    expect(own(v, '.pts').map((e) => e.textContent)).toEqual(['27 pts', '25 pts', '22 pts', '16 pts', '14 pts', '12 pts', '9 pts', '9 pts']);
  });

  it('the totals count up from the old ones (where the eyes see them), then the flips run down the list after the count', () => {
    const v = view();
    v.renderGp(secondRace(), 'Next race');
    const rows = [...v.root.querySelectorAll<HTMLElement>('.rows > .row')];
    // Pip keeps 1st: its own total counts 15 → 27; Nova's row turns over to a total already counted
    const pip = rows[0].querySelector<HTMLElement>(':scope > .pts .n')!;
    expect([pip.classList.contains('count'), pip.style.getPropertyValue('--from'), pip.style.getPropertyValue('--pts')]).toEqual([true, '15', '27']);
    expect(rows[1].querySelector(':scope > .pts .n')!.classList.contains('count')).toBe(false);
    // Momo, on top of 2nd until it turns: 12 → 22
    const momo = rows[1].querySelector<HTMLElement>('.was .pts .n')!;
    expect([momo.classList.contains('count'), momo.style.getPropertyValue('--from'), momo.style.getPropertyValue('--pts')]).toEqual([true, '12', '22']);
    // the count, then each place's flip one step after the one above
    const flipAt = UI.standingsCountAtMs + UI.countUpMs + UI.standingsFlipGapMs;
    expect(rows.map((r) => r.style.getPropertyValue('--count-at'))).toEqual(rows.map(() => `${UI.standingsCountAtMs}ms`));
    expect(rows.map((r) => r.style.getPropertyValue('--flip-at'))).toEqual(rows.map((_, k) => `${flipAt + k * UI.flipStaggerMs}ms`));
    // the rows come in on the quick standings stagger
    expect(rows.map((r) => r.style.getPropertyValue('--delay'))).toEqual(rows.map((_, k) => `${k * UI.staggerStandingsMs}ms`));
  });

  it('after the first race nothing moves (no standings before it): no arrows, no flips, every total counts up from 0', () => {
    const gp = createGrandPrix({ id: 'sunrise', trackIds: ['a', 'b', 'c'] }, racers, 150, 1);
    const before = structuredClone(gp);
    applyResults(gp, results(ORDER));
    const v = view();
    v.renderGp(gpModel(before, gp, 'pip'), 'Next race');
    expect(v.root.querySelector('.rows')!.classList.contains('moves')).toBe(false);
    expect(v.root.querySelectorAll('.mv, .was, .flip')).toHaveLength(0);
    expect(own(v, '.pts .n').map((n) => [n.classList.contains('count'), n.style.getPropertyValue('--from')])).toEqual(ORDER.map(() => [true, '0']));
  });

  it('reduced motion (or drawn again): how it ends, nothing to play', () => {
    const v = view();
    v.renderGp(secondRace(), 'Next race', false);
    expect(v.root.querySelector('.rows')!.classList.contains('play')).toBe(false);
    expect(v.root.querySelectorAll('.was, .flip, .n.count')).toHaveLength(0);
    expect(own(v, '.nm').map((e) => e.textContent)[1]).toBe('Nova');
    expect(own(v, '.mv .sr-only').map((e) => e.textContent)[1]).toBe('up 1');
  });

  it('after the last race the stars pop once the rows have settled', () => {
    const gp = createGrandPrix({ id: 'sunrise', trackIds: ['a', 'b'] }, racers, 150, 1);
    applyResults(gp, results(ORDER));
    const before = structuredClone(gp);
    applyResults(gp, results(['nova', 'pip', 'momo', 'juniper', 'otto', 'sprocket', 'gus', 'boulder']));
    const vm = gpModel(before, gp, 'pip');
    expect(vm.done).toBe(true);
    const v = view();
    v.renderGp(vm, 'Continue');
    const settled = UI.standingsCountAtMs + UI.countUpMs + UI.standingsFlipGapMs + 7 * UI.flipStaggerMs + UI.flipMs;
    expect([...v.root.querySelectorAll('.stars .star')].map((s) => s.getAttribute('style'))).toEqual([0, 1, 2].map((i) => `--delay:${settled + i * 180}ms`));
  });
});
