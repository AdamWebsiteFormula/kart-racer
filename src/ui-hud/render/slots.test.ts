// @vitest-environment jsdom
// The item slots (28 Sept 2026; Adam: "The bubbles that show the items look super goofy instead of something cool",
// then "Yes, 3 item slots."): UI.itemSlots of them, plates of slanted glass lit in the item's color. The third is read
// from the item state once it has one (the gameplay branch adds it) and shows empty until then; slots whose rolls stop
// on one tick land one after the other; How to Play says how many you can hold.
import { beforeAll, describe, expect, it } from 'vitest';
import { createKartState, type KartState } from '../../kart-controller/types.ts';
import { ITEM_DEFINITIONS } from '../../items/data.ts';
import type { ItemEvent } from '../../items/types.ts';
import type { RaceState } from '../../race-manager/types.ts';
import { UI } from '../constants.ts';
import { TIPS } from '../data/howto.ts';
import { feedHud, hudModel, itemSlots, newHudMemory } from '../hudModel.ts';
import { glowFor, ITEM_ICONS, OKABE_ITO } from '../icons.ts';
import { HudView } from './hud.ts';

const defs = ITEM_DEFINITIONS.map((d) => ({ id: d.id, name: d.name }));
const race = { mode: 'quick', lapsTotal: 3, time: 12.5, phase: 'racing' } as RaceState;
const S = UI.slotStaggerMs / 1000;

function kart(held = 'none', next = 'none'): KartState {
  const k = createKartState({ racerId: 'p', isPlayer: true });
  k.lap = 1; k.rank = 5;
  k.item = { held, charges: held === 'none' ? 0 : 1, rouletteRemaining: 0, next, nextCharges: next === 'none' ? 0 : 1, nextRouletteRemaining: 0 };
  return k;
}
/** the item state's third slot, as the gameplay branch adds it (named as the first two are) */
const third = (k: KartState, id: string, charges = 1, roll = 0) => Object.assign(k.item, { third: id, thirdCharges: charges, thirdRouletteRemaining: roll });
/** (the sim's events name slots 0 and 1 until it has a third) */
const ready = (slot: number, itemId = 'beachBall') => ({ type: 'itemReady', racerId: 'p', itemId, slot }) as unknown as ItemEvent;

describe('the item slots come from one number (UI.itemSlots)', () => {
  it('three by default: the view model and the HUD draw that many, the held item first, one NEXT tag after it', () => {
    expect(UI.itemSlots).toBe(3);
    const vm = hudModel(race, kart('beachBall', 'oilCan'), 5, 10, newHudMemory(), 1, defs, 0);
    expect(vm.slots.length).toBe(UI.itemSlots);
    expect([vm.slots[0], vm.slots[1]]).toEqual([vm.held, vm.next]);
    document.body.innerHTML = '';
    const v = new HudView(document.body);
    v.render(vm);
    const slots = [...v.root.querySelectorAll<HTMLElement>('.tl > .slot')];
    expect(slots.length).toBe(UI.itemSlots);
    expect(slots.map((s) => s.classList.contains('next'))).toEqual([false, true, true]);
    expect(slots.map((s) => s.querySelector('.tag')?.textContent ?? '')).toEqual(['', 'NEXT', '']);
    // screen readers hear which slot is which
    expect(slots.map((s) => s.getAttribute('aria-label'))).toEqual(['Item: Beach Ball', 'Next item: Oil Can', 'Item after next: empty']);
    // each is glass with the item's art over it, and the landing's shine
    for (const s of slots) expect(['.slot-glass', '.ic', '.gloss'].every((c) => s.querySelector(c))).toBe(true);
    expect(slots[0].querySelector('.ic img.art')).not.toBeNull();
    expect(slots[2].querySelector('.ic')!.innerHTML).toBe('');
  });

  it('an item state with two slots shows the third empty; one with a third reads it: rolling, then ready with its charges', () => {
    const k = kart('beachBall', 'oilCan');
    expect(itemSlots(k, defs).slots[2]).toEqual({ state: 'empty', itemId: '', label: '', charges: '' });
    third(k, 'tripleFizz', 3, 0.6);
    expect(itemSlots(k, defs).slots[2].state).toBe('rolling');
    k.item = { ...k.item, ...{ thirdRouletteRemaining: 0 } };
    expect(itemSlots(k, defs).slots[2]).toEqual({ state: 'ready', itemId: 'tripleFizz', label: 'Triple Fizz', charges: '×3' });
    // a Fog Bank empties every slot
    third(k, 'none', 0, 0);
    k.item.held = k.item.next = 'none';
    expect(itemSlots(k, defs).slots.map((s) => s.state)).toEqual(['empty', 'empty', 'empty']);
  });

  it('the third slot\'s roll stops and it lands on screen, as the others do', () => {
    document.body.innerHTML = '';
    const v = new HudView(document.body);
    const slot = v.root.querySelectorAll<HTMLElement>('.slot')[2];
    const k = kart('beachBall', 'oilCan');
    third(k, 'airHorn', 1, 0.4);
    v.render(hudModel(race, k, 5, 10, newHudMemory(), 1, defs, 0));
    expect([slot.getAttribute('data-state'), slot.classList.contains('land')]).toEqual(['rolling', false]);
    third(k, 'airHorn', 1, 0);
    v.render(hudModel(race, k, 5, 10, newHudMemory(), 1, defs, 0));
    expect([slot.getAttribute('data-state'), slot.classList.contains('land'), slot.getAttribute('aria-label')]).toEqual(['ready', true, 'Item after next: Air Horn']);
  });
});

describe('rolls that stop on one tick land one after the other', () => {
  it('a Double into the second and third slots: the second lands on the tick, the third a beat later', () => {
    const m = newHudMemory(), k = kart('beachBall', 'oilCan');
    third(k, 'airHorn');
    feedHud(m, [], [ready(1, 'oilCan'), ready(2, 'airHorn')], 'p', 7);
    const at = (t: number) => hudModel(race, k, 5, 10, m, t, defs, 0);
    expect([at(7).next.state, at(7).slots[2].state]).toEqual(['ready', 'rolling']);
    expect(at(7 + S - 0.01).slots[2].state).toBe('rolling');
    expect(at(7 + S).slots[2].state).toBe('ready');
  });

  it('three at once: each a beat after the one before; someone else\'s are nothing to the player', () => {
    const m = newHudMemory();
    feedHud(m, [], [ready(2), ready(0), ready(1)], 'p', 1);
    expect(m.holdUntil).toEqual([-1, 1 + S, 1 + 2 * S]);
    const other = newHudMemory();
    feedHud(other, [], [{ ...ready(0), racerId: 'x' } as ItemEvent, { ...ready(1), racerId: 'x' } as ItemEvent], 'p', 1);
    expect(other.holdUntil.every((t) => t === -1)).toBe(true);
  });
});

describe('each slot glows in its item\'s color', () => {
  it('the item\'s icon color (a reskin brings its own); steel for one too dark to glow; none for none', () => {
    for (const id of Object.keys(ITEM_ICONS)) if (ITEM_ICONS[id].colour !== OKABE_ITO.black) expect(glowFor(id), id).toBe(ITEM_ICONS[id].colour);
    expect(ITEM_ICONS.oilCan.colour).toBe(OKABE_ITO.black);
    expect(glowFor('oilCan')).toMatch(/^#[0-9a-f]{6}$/i);
    expect(glowFor('oilCan')).not.toBe(OKABE_ITO.black);
    expect(glowFor('')).toBe('');
  });

  it('the HUD sets it on the slot as --glow (while rolling, each face\'s), and takes it off when the slot empties', () => {
    document.body.innerHTML = '';
    const v = new HudView(document.body);
    const held = v.root.querySelector<HTMLElement>('.slot')!;
    const k = kart('fizzPop');
    v.render(hudModel(race, k, 5, 10, newHudMemory(), 1, defs, 0));
    expect(held.style.getPropertyValue('--glow')).toBe(glowFor('fizzPop'));
    k.item.rouletteRemaining = 0.7;
    const vm = hudModel(race, k, 5, 10, newHudMemory(), 1, defs, 0);
    v.render(vm);
    expect(held.style.getPropertyValue('--glow')).toBe(glowFor(vm.held.itemId));
    k.item = { held: 'none', charges: 0, rouletteRemaining: 0, next: 'none', nextCharges: 0, nextRouletteRemaining: 0 };
    v.render(hudModel(race, k, 5, 10, newHudMemory(), 1, defs, 0));
    expect(held.style.getPropertyValue('--glow')).toBe('');
  });
});

describe('How to Play says how many items you can hold', () => {
  it('as many as the slots', () => {
    expect(TIPS.find((t) => /you can hold/i.test(t))).toContain(`You can hold ${['', 'one', 'two', 'three', 'four'][UI.itemSlots]}.`);
  });
});

describe('the slots in the stylesheet: slanted glass, not balloons', () => {
  let css = '';
  beforeAll(async () => {
    const fs = (await import('node:fs' as string)) as { readFileSync(p: string, enc: 'utf8'): string };
    css = fs.readFileSync(decodeURIComponent(import.meta.url.replace(/^file:\/\//, '').replace(/render\/[^/]+$/, 'ui.css')), 'utf8');
  });
  /** the declarations of the rule whose selector is exactly `sel` (outside any media query), or '' */
  const rule = (sel: string) => {
    const at = css.indexOf(`\n${sel} {`);
    return at < 0 ? '' : css.slice(css.indexOf('{', at) + 1, css.indexOf('}', at));
  };

  it('the glass leans and its corners are cut, the item\'s color glows in it and lights the rim once it is in', () => {
    const glass = rule('.slot .slot-glass');
    expect(glass).toContain('transform: skewX(var(--slant))');
    expect(glass).toContain('border-radius: var(--corners)');
    // (lit: the item's color lifted toward white, so a deep blue still glows on the ink glass)
    expect(rule('.slot')).toMatch(/--glow-lit: color-mix\(in srgb, var\(--glow\) \d+%, #fff\)/);
    expect(glass).toMatch(/color-mix\(in srgb, var\(--glow-lit\)/);
    expect(rule(".slot:is([data-state='ready'], [data-state='trailing'], [data-state='active']) .slot-glass")).toMatch(/color-mix\(in srgb, var\(--glow\)/);
    // empty looks empty: its own thin glass
    expect(rule(".slot[data-state='empty'] .slot-glass")).toMatch(/background:/);
    // no balloon: no round slot and no string under it
    expect(rule('.slot')).not.toMatch(/border-radius: 50%/);
    expect(css).not.toMatch(/\n\.slot::after \{/);
    // the landing's ring leans with the glass
    const ring = css.slice(css.indexOf('@keyframes slot-ring'), css.indexOf('\n', css.indexOf('@keyframes slot-ring')));
    expect(ring.match(/skewX\(var\(--slant\)\)/g)?.length).toBe(3);
  });

  it('the words on it keep to the type tokens, so either type direction sets them', () => {
    expect(rule('.slot .charges')).toContain('var(--display)');
    expect(rule('.slot .tag')).toContain('var(--body)');
    expect(rule('.slot .charges')).not.toMatch(/Lilita|Fredoka|Mona|Rubik|Nunito/);
  });

  it('reduced motion: no scan while it rolls and no throb while a power runs (a steady glow instead)', () => {
    const none = css.match(/(:root\[data-reduced-motion='on'\] \.slot\.land,[\s\S]*?)\{ animation: none !important; \}/)?.[1] ?? '';
    for (const sel of ['.slot .gloss::after', ".slot[data-state='active'] .slot-glass::after", '.slot.land .slot-glass::after']) expect(none, sel).toContain(sel);
    expect(css).toContain(":root[data-reduced-motion='on'] .slot[data-state='active'] .slot-glass::after { opacity: 0.4; }");
  });
});
