// @vitest-environment jsdom
// The roulette stops and the item lands in its balloon slot (Adam, 28 Sept 2026: "The balloons, after they are
// selected, just appear without any animation. Looks cheap."): the faces slow before the stop (design §8), the
// item drops in with a bounce, a flash ring and a shine (the next slot the same), a Double balloon's two items
// land one after the other, and reduced motion fades them in instead.
import { beforeAll, describe, expect, it } from 'vitest';
import { createKartState } from '../../kart-controller/types.ts';
import { ITEM_DEFINITIONS, ITEMS_CONFIG } from '../../items/data.ts';
import type { ItemEvent } from '../../items/types.ts';
import type { RaceState } from '../../race-manager/types.ts';
import { UI } from '../constants.ts';
import { feedHud, hudModel, newHudMemory, rouletteFace } from '../hudModel.ts';
import { HudView } from './hud.ts';

const defs = ITEM_DEFINITIONS.map((d) => ({ id: d.id, name: d.name }));
const race = { mode: 'quick', lapsTotal: 3, time: 12.5, phase: 'racing' } as RaceState;
const S = ITEMS_CONFIG.rouletteSeconds;

function kart() {
  const k = createKartState({ racerId: 'p', isPlayer: true });
  k.lap = 1; k.rank = 5;
  return k;
}
const ready = (slot: 0 | 1, itemId = 'beachBall', racerId = 'p'): ItemEvent => ({ type: 'itemReady', racerId, itemId, slot });
const roll = (slot: 0 | 1, itemId = 'beachBall'): ItemEvent => ({ type: 'roulette', racerId: 'p', itemId, seconds: S, slot });

describe('the roulette slows to its stop', () => {
  it('flicks quick at first and slows toward the stop, on the roll\'s own time; the last face gets its whole slow beat', () => {
    expect(rouletteFace(S)).toBe(0);
    // the times each face comes up, from the roll's start
    const changes: number[] = [];
    let last = rouletteFace(S);
    for (let gone = 0; gone <= S + 1e-9; gone += 1 / 1200) {
      const f = rouletteFace(S - gone);
      expect(f).toBeGreaterThanOrEqual(last);
      if (f !== last) { changes.push(gone); last = f; }
    }
    const gaps = changes.slice(1).map((t, i) => t - changes[i]);
    expect(gaps[0]).toBeCloseTo(UI.rouletteFlickerMs / 1000, 1);
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeGreaterThanOrEqual(gaps[i - 1] - 1e-3);
    // the last face comes up a slow beat before the stop and stays until the item lands
    expect(S - changes[changes.length - 1]).toBeGreaterThan(0.18);
    expect(S - changes[changes.length - 1]).toBeLessThanOrEqual(UI.rouletteSlowMs / 1000 + 0.01);
    expect(rouletteFace(0)).toBe(last);
    // (a dozen faces or so, as the ticks: none of them a blur)
    expect(changes.length).toBeGreaterThan(9);
    expect(changes.length).toBeLessThan(16);
  });

  it('each new roll starts on another face, and the two slots never show one item', () => {
    const m = newHudMemory(), k = kart();
    k.item = { held: 'beachBall', charges: 1, rouletteRemaining: S, next: 'none', nextCharges: 0, nextRouletteRemaining: 0, third: 'none', thirdCharges: 0, thirdRouletteRemaining: 0 };
    feedHud(m, [], [roll(0)], 'p', 1);
    const first = hudModel(race, k, 5, 10, m, 1, defs, 0).held.label;
    feedHud(m, [], [roll(0)], 'p', 5);
    expect(hudModel(race, k, 5, 10, m, 5, defs, 0).held.label).not.toBe(first);
    k.item.next = 'oilCan'; k.item.nextCharges = 1; k.item.nextRouletteRemaining = S;
    for (let left = S; left > 0; left -= 1 / 60) {
      k.item.rouletteRemaining = left; k.item.nextRouletteRemaining = left;
      const vm = hudModel(race, k, 5, 10, m, 5, defs, 0);
      expect(vm.next.label).not.toBe(vm.held.label);
    }
  });
});

describe('a Double balloon\'s two items land one after the other', () => {
  it('the sim has both ready on one tick: the held lands, the next rolls on one face more for UI.slotStaggerMs, then lands', () => {
    const m = newHudMemory(), k = kart();
    k.item = { held: 'beachBall', charges: 1, rouletteRemaining: 1 / 120, next: 'tripleFizz', nextCharges: 3, nextRouletteRemaining: 1 / 120, third: 'none', thirdCharges: 0, thirdRouletteRemaining: 0 };
    const before = hudModel(race, k, 5, 10, m, 10, defs, 0);
    expect([before.held.state, before.next.state]).toEqual(['rolling', 'rolling']);
    k.item.rouletteRemaining = 0; k.item.nextRouletteRemaining = 0;
    feedHud(m, [], [ready(0), ready(1, 'tripleFizz')], 'p', 10);
    const at = (t: number) => hudModel(race, k, 5, 10, m, t, defs, 0);
    expect(at(10).held.state).toBe('ready');
    expect(at(10).next.state).toBe('rolling');
    expect(at(10).next.label, 'one face more').not.toBe(before.next.label);
    expect(at(10 + UI.slotStaggerMs / 1000 - 0.01).next.state).toBe('rolling');
    expect([at(10 + UI.slotStaggerMs / 1000).next.state, at(10 + UI.slotStaggerMs / 1000).next.charges]).toEqual(['ready', '×3']);
  });

  it('a single balloon\'s roll into the next slot lands at once; a Fog Bank during the wait empties the slot', () => {
    const m = newHudMemory(), k = kart();
    k.item = { held: 'beachBall', charges: 1, rouletteRemaining: 0, next: 'oilCan', nextCharges: 1, nextRouletteRemaining: 0, third: 'none', thirdCharges: 0, thirdRouletteRemaining: 0 };
    feedHud(m, [], [ready(1, 'oilCan')], 'p', 3);
    expect(hudModel(race, k, 5, 10, m, 3, defs, 0).next.state).toBe('ready');
    feedHud(m, [], [ready(0), ready(1, 'oilCan')], 'p', 4);
    expect(hudModel(race, k, 5, 10, m, 4, defs, 0).next.state).toBe('rolling');
    k.item.held = 'none'; k.item.charges = 0; k.item.next = 'none'; k.item.nextCharges = 0;
    const fogged = hudModel(race, k, 5, 10, m, 4.05, defs, 0);
    expect([fogged.held.state, fogged.next.state]).toEqual(['empty', 'empty']);
    // someone else's Double is nothing to the player's HUD
    const m2 = newHudMemory();
    feedHud(m2, [], [ready(0, 'beachBall', 'x'), ready(1, 'oilCan', 'x')], 'p', 1);
    expect(m2.holdUntil.every((t) => t === -1)).toBe(true);
  });
});

describe('the landing on screen (render/hud.ts, ui.css)', () => {
  it('a slot whose roll stops takes .land (again for each landing); an item moved up, a Fog\'s empty slot or a steady frame do not', () => {
    document.body.innerHTML = '';
    const v = new HudView(document.body);
    const [held, next] = [...v.root.querySelectorAll<HTMLElement>('.slot')];
    expect(held.querySelector('.gloss')).not.toBeNull();
    const m = newHudMemory(), k = kart();
    const draw = (t = 1) => v.render(hudModel(race, k, 5, 10, m, t, defs, 0));
    k.item = { held: 'beachBall', charges: 1, rouletteRemaining: 0.5, next: 'none', nextCharges: 0, nextRouletteRemaining: 0, third: 'none', thirdCharges: 0, thirdRouletteRemaining: 0 };
    draw();
    expect(held.classList.contains('land')).toBe(false);
    k.item.rouletteRemaining = 0;
    draw();
    expect(held.classList.contains('land')).toBe(true);
    expect(next.classList.contains('land')).toBe(false);
    // settled: the shine's end takes the class off, so a HUD shown again never replays it
    held.dispatchEvent(Object.assign(new Event('animationend'), { animationName: 'slot-drop' }));
    expect(held.classList.contains('land')).toBe(true);
    held.dispatchEvent(Object.assign(new Event('animationend'), { animationName: 'slot-shine' }));
    expect(held.classList.contains('land')).toBe(false);
    draw();
    expect(held.classList.contains('land')).toBe(false);
    // the next item moves up (the held one used): no roll stopped, no landing
    k.item = { held: 'oilCan', charges: 1, rouletteRemaining: 0, next: 'none', nextCharges: 0, nextRouletteRemaining: 0, third: 'none', thirdCharges: 0, thirdRouletteRemaining: 0 };
    draw();
    expect(held.classList.contains('land')).toBe(false);
    // a roll in the next slot lands there
    k.item.next = 'fizzPop'; k.item.nextCharges = 1; k.item.nextRouletteRemaining = 0.3;
    draw();
    k.item.nextRouletteRemaining = 0;
    draw();
    expect(next.classList.contains('land')).toBe(true);
    // a Fog Bank empties a rolling slot: nothing lands
    k.item = { held: 'none', charges: 0, rouletteRemaining: 0.4, next: 'none', nextCharges: 0, nextRouletteRemaining: 0, third: 'none', thirdCharges: 0, thirdRouletteRemaining: 0 };
    k.item.held = 'airHorn'; k.item.charges = 1;
    draw();
    held.classList.remove('land');
    k.item = { held: 'none', charges: 0, rouletteRemaining: 0, next: 'none', nextCharges: 0, nextRouletteRemaining: 0, third: 'none', thirdCharges: 0, thirdRouletteRemaining: 0 };
    draw();
    expect(held.classList.contains('land')).toBe(false);
  });

  it('a Double: the held slot lands on the tick, the next slot UI.slotStaggerMs later', () => {
    document.body.innerHTML = '';
    const v = new HudView(document.body);
    const [held, next] = [...v.root.querySelectorAll<HTMLElement>('.slot')];
    const m = newHudMemory(), k = kart();
    k.item = { held: 'beachBall', charges: 1, rouletteRemaining: 0.2, next: 'tripleFizz', nextCharges: 3, nextRouletteRemaining: 0.2, third: 'none', thirdCharges: 0, thirdRouletteRemaining: 0 };
    v.render(hudModel(race, k, 5, 10, m, 20, defs, 0));
    k.item.rouletteRemaining = 0; k.item.nextRouletteRemaining = 0;
    feedHud(m, [], [ready(0), ready(1, 'tripleFizz')], 'p', 20.2);
    v.render(hudModel(race, k, 5, 10, m, 20.2, defs, 0));
    expect([held.classList.contains('land'), next.classList.contains('land')]).toEqual([true, false]);
    v.render(hudModel(race, k, 5, 10, m, 20.2 + UI.slotStaggerMs / 1000 / 2, defs, 0));
    expect(next.classList.contains('land')).toBe(false);
    v.render(hudModel(race, k, 5, 10, m, 20.2 + UI.slotStaggerMs / 1000, defs, 0));
    expect(next.classList.contains('land')).toBe(true);
    expect(next.getAttribute('data-state')).toBe('ready');
  });
});

describe('the landing in the stylesheet', () => {
  let css = '';
  beforeAll(async () => {
    const fs = (await import('node:fs' as string)) as { readFileSync(p: string, enc: 'utf8'): string };
    css = fs.readFileSync(decodeURIComponent(import.meta.url.replace(/^file:\/\//, '').replace(/render\/[^/]+$/, 'ui.css')), 'utf8');
  });
  /** a @keyframes block's body, braces matched */
  const keyframes = (name: string) => {
    const at = css.indexOf(`@keyframes ${name} {`);
    if (at < 0) return '';
    let depth = 0;
    for (let i = css.indexOf('{', at); i < css.length; i++) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}' && --depth === 0) return css.slice(css.indexOf('{', at) + 1, i);
    }
    return '';
  };

  it('drops, rings and shines for UI.slotLandMs; moves only transforms, opacity and brightness', () => {
    expect(css).toContain(`--t-land: ${UI.slotLandMs}ms`);
    expect(css).toMatch(/\.slot\.land \.ic \{ animation: slot-drop var\(--t-land\)/);
    expect(css).toMatch(/\.slot\.land::before \{ animation: slot-ring var\(--t-land\)/);
    expect(css).toMatch(/\.slot\.land \.gloss::before \{ animation: slot-shine /);
    for (const name of ['slot-drop', 'slot-catch', 'slot-ring', 'slot-shine', 'slot-badge', 'slot-fade']) {
      const body = keyframes(name);
      expect(body, name).not.toBe('');
      const props = [...body.matchAll(/([a-z-]+)\s*:/g)].map((x) => x[1]).filter((p) => p !== 'animation-timing-function');
      for (const p of props) expect(['transform', 'opacity', 'filter'], `${name}: ${p}`).toContain(p);
    }
    // it falls in from over the slot, lands squashed (wider than tall) and springs back stretched
    expect(keyframes('slot-drop')).toMatch(/scale\(1\.2, 0\.8\)[\s\S]*scale\(0\.92, 1\.1\)/);
  });

  it('reduced motion: a quick fade of UI.slotFadeMs, no bounce, ring, shine or badge pop', () => {
    expect(css).toContain(`:root[data-reduced-motion='on'] .slot.land .ic { animation: slot-fade ${UI.slotFadeMs}ms ease-out !important; }`);
    const rule = css.match(/(:root\[data-reduced-motion='on'\] \.slot\.land,[\s\S]*?)\{ animation: none !important; \}/)?.[1] ?? '';
    for (const sel of ['.slot.land,', '.slot.land::before', '.slot.land .gloss::before', '.slot.land .pips', '.slot.land .key']) expect(rule, sel).toContain(sel);
    expect(UI.slotFadeMs).toBeLessThanOrEqual(200);
  });
});
