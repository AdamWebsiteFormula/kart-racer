// @vitest-environment jsdom
// The race's big moments and the end screens at the rebuilt menus' quality (27 Sept 2026; the fresh-eyes review's
// items 8 and 9, Adam: "it all just looks really cheap"): the banners as struck letters that drop in and squash away,
// the start lamps held near the camera, and the results, standings, cut and podium on glass. The look is the
// stylesheet's (ui.css, podium.css: layout.test.ts pins the rules); these pin what the DOM hands it, what assistive
// tech reads, and that a steady frame still writes nothing.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createKartState } from '../../kart-controller/types.ts';
import { ITEM_DEFINITIONS } from '../../items/data.ts';
import { GO_TICK, STEP_TICKS } from '../../race-manager/countdown.ts';
import { SIM_DT } from '../../kart-controller/step.ts';
import type { RaceResults, RaceState } from '../../race-manager/types.ts';
import { CAST } from '../data/cast.ts';
import { feedHud, hudModel, newHudMemory } from '../hudModel.ts';
import { podiumModel } from '../screens/podium.ts';
import { resultsModel } from '../screens/results.ts';
import { letters } from './banner.ts';
import { HudView } from './hud.ts';
import { PodiumView } from './podium.ts';
import { ResultsView } from './screens.ts';

const defs = ITEM_DEFINITIONS.map((d) => ({ id: d.id, name: d.name }));
const kart = () => createKartState({ racerId: 'p', isPlayer: true });
const counting = (tick: number) => ({ mode: 'quick', lapsTotal: 3, phase: tick <= GO_TICK ? 'countdown' : 'racing', tick, goTick: GO_TICK, time: (tick - 1 - GO_TICK) * SIM_DT }) as RaceState;
const hud = () => { document.body.innerHTML = ''; return new HudView(document.body); };

afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); });

describe('banner letters (render/banner.ts)', () => {
  it('one span a letter, struck from its data-ch, numbered for the stagger; a space stays a space (where a long line wraps)', () => {
    const e = document.createElement('span');
    letters(e, 'FINAL LAP');
    const chs = [...e.querySelectorAll<HTMLElement>('.ch')];
    expect(chs.map((c) => c.dataset.ch).join('')).toBe('FINALLAP');
    expect(chs.map((c) => c.style.getPropertyValue('--i'))).toEqual(['0', '1', '2', '3', '4', '5', '6', '7']);
    expect(e.style.getPropertyValue('--n')).toBe('8');
    expect(e.textContent).toBe('FINAL LAP');
    letters(e, '2');
    expect(e.textContent).toBe('2');
  });
});

describe('the race banners', () => {
  it('the words once for assistive tech, the letters for the eyes; a live region as before, its parts in the same order', () => {
    const v = hud();
    v.render(hudModel(counting(10), kart(), 8, 10, newHudMemory(), 0, defs, 0));
    const banner = v.root.querySelector<HTMLElement>('.banner')!;
    expect([banner.getAttribute('role'), banner.getAttribute('aria-live'), banner.dataset.kind]).toEqual(['status', 'polite', 'countdown']);
    expect([...banner.children].map((c) => c.className.split(' ')[0])).toEqual(['big', 'small', 'medal-won', 'skip']);
    expect(banner.querySelector('.big > .sr-only')?.textContent).toBe('3');
    const chs = banner.querySelector('.big > .chs')!;
    expect(chs.getAttribute('aria-hidden')).toBe('true');
    expect([...chs.querySelectorAll<HTMLElement>('.ch')].map((c) => c.dataset.ch)).toEqual(['3']);
    expect(banner.classList.contains('show')).toBe(true);
  });

  it('new words: the ones on show squash and stretch away as a ghost under the banner (hidden from assistive tech) while the next drop in', () => {
    const v = hud();
    const m = newHudMemory();
    v.render(hudModel(counting(10), kart(), 8, 10, m, 0, defs, 0));
    v.render(hudModel(counting(STEP_TICKS + 10), kart(), 8, 10, m, 0, defs, 0));
    const ghost = v.root.querySelector<HTMLElement>('.banner.ghost')!;
    expect([ghost.getAttribute('aria-hidden'), ghost.dataset.kind, ghost.classList.contains('out'), ghost.textContent]).toEqual(['true', 'countdown', true, '3']);
    expect(v.root.querySelector('.banner:not(.ghost) .big > .sr-only')?.textContent).toBe('2');
    // after the banner in the page, so the live one is the first .banner (and the stylesheet sets it on top)
    expect(v.root.querySelector('.banner')).not.toBe(ghost);
    // GO! goes the same way when its second is up
    feedHud(m, [{ type: 'go' }], [], 'p', 5);
    v.render(hudModel(counting(GO_TICK + 2), kart(), 8, 10, m, 5, defs, 0));
    expect(v.root.querySelector('.banner:not(.ghost) .big > .sr-only')?.textContent).toBe('GO!');
    v.render(hudModel(counting(GO_TICK + 200), kart(), 8, 10, m, 6.5, defs, 0));
    expect([ghost.textContent, ghost.dataset.kind, v.root.querySelector('.banner:not(.ghost)')!.classList.contains('show')]).toEqual(['GO!', 'go', false]);
  });

  it('a steady frame writes nothing, with the lamps up and a banner on show (SOP test 15)', () => {
    const v = hud();
    const m = newHudMemory();
    const vm = () => hudModel(counting(STEP_TICKS + 30), kart(), 8, 10, m, 1, defs, 0);
    v.render(vm());
    const text = vi.spyOn(Node.prototype, 'textContent', 'set');
    const attr = vi.spyOn(Element.prototype, 'setAttribute');
    const html = vi.spyOn(Element.prototype, 'innerHTML', 'set');
    v.render(vm());
    expect(text).not.toHaveBeenCalled();
    expect(attr).not.toHaveBeenCalled();
    expect(html).not.toHaveBeenCalled();
  });
});

describe('the start lamps near the camera', () => {
  it('lit with the count (hudModel startLamps), all green for GO, then hauled away; never read out (the count is)', () => {
    const v = hud();
    const m = newHudMemory();
    const lamps = v.root.querySelector<HTMLElement>('.lamps')!;
    expect([lamps.getAttribute('aria-hidden'), lamps.querySelectorAll('.lamp').length]).toEqual(['true', 3]);
    const at = (tick: number) => { v.render(hudModel(counting(tick), kart(), 8, 10, m, 0, defs, 0)); return [lamps.dataset.lit, lamps.classList.contains('on'), lamps.classList.contains('leaving')]; };
    expect(at(0)).toEqual([undefined, false, false]); // the course intro: no board
    expect(at(30)).toEqual(['1', true, false]);
    expect(at(STEP_TICKS + 30)).toEqual(['2', true, false]);
    expect(at(2 * STEP_TICKS + 30)).toEqual(['3', true, false]);
    expect(at(GO_TICK + 30)).toEqual(['go', true, false]);
    // dark after the beat: up and away, the green it had still on it
    expect(at(GO_TICK + STEP_TICKS + 30)).toEqual(['go', false, true]);
    expect(at(GO_TICK + 5 * STEP_TICKS)).toEqual(['go', false, true]);
    // a restart: the board comes down again
    expect(at(30)).toEqual(['1', true, false]);
  });
});

function results(order: string[]): RaceResults {
  return {
    mode: 'quick', trackId: 'harbour-loop', speedClass: 150, seed: 1, goTick: 360,
    ranks: order.map((id, i) => ({ racerId: id, rank: i + 1, finishTick: 12000 + i * 60, timeMs: 97000 + i * 500, lapTimesMs: [33000, 32000, 32000], dnf: false, projectedMs: -1 })),
  };
}
const ORDER = CAST.map((c) => c.id);

describe('the end screens on glass', () => {
  const view = () => { document.body.innerHTML = ''; return new ResultsView(document.body); };

  it('no paper card: the list is glass rows under a ribbon headline in the finish\'s color', () => {
    const v = view();
    v.renderResults(resultsModel(results(ORDER), 'pip', 'Lighthouse Loop'), 'Continue');
    const box = v.root.querySelector('.stage > .box')!;
    expect(box.classList.contains('panel')).toBe(false);
    expect(v.root.querySelector('.res-head')?.getAttribute('data-tone')).toBe('gold');
    const tone = (player: string) => { v.renderResults(resultsModel(results(ORDER), player, 'Lighthouse Loop'), 'Continue'); return v.root.querySelector('.res-head')?.getAttribute('data-tone'); };
    expect([tone('momo'), tone('nova'), tone('juniper'), tone('gus')]).toEqual(['good', 'good', 'plain', 'plain']);
  });

  it('each place big with its suffix small (the words stay "1st"), on every kind of row', () => {
    const v = view();
    v.renderResults(resultsModel(results(ORDER), 'pip', 'Lighthouse Loop'), 'Continue');
    const rk = [...v.root.querySelectorAll('.row .rk')];
    expect(rk.map((e) => e.textContent)).toEqual(['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']);
    expect(rk.map((e) => e.querySelector('small')?.textContent)).toEqual(['st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th']);
    expect(rk[0].getAttribute('role')).toBe('cell');
  });

  it('the podium\'s headline: struck letters named whole (the letters hidden from assistive tech), the places struck in their podium colors', () => {
    document.body.innerHTML = '';
    const p = new PodiumView(document.body);
    const vm = { ...podiumModel(['momo', 'pip', 'nova'], 'pip', {}), headline: '2nd in the cup!' };
    p.render(vm);
    const head = p.root.querySelector('.podium-head')!;
    expect([head.getAttribute('aria-label'), head.textContent]).toEqual(['2nd in the cup!', '2nd in the cup!']);
    expect(head.querySelector('.chs')?.getAttribute('aria-hidden')).toBe('true');
    expect(head.querySelectorAll('.ch')).toHaveLength('2ndinthecup!'.length);
    expect([...p.root.querySelectorAll('.podium-place .rk')].map((e) => e.textContent)).toEqual(['2nd', '1st', '3rd']);
  });
});
