import { describe, expect, it } from 'vitest';
import { ITEM_DEFINITIONS } from '../items/data.ts';
import { ITEM_ICONS, OKABE_ITO, arrowSvg, iconSvg, itemArt, lockSvg, medalSvg, modeSvg, starIcon } from './icons.ts';

describe('item icons', () => {
  it('every item has painted art, an Okabe-Ito fallback shape and its own colourblind glyph', async () => {
    const fs = (await import('node:fs' as string)) as { existsSync(p: URL): boolean };
    const ids = ITEM_DEFINITIONS.map((d) => d.id);
    for (const id of ids) {
      expect(ITEM_ICONS[id], id).toBeDefined();
      expect(fs.existsSync(new URL(`../../public/art/items/${id}.webp`, import.meta.url)), `art for ${id}`).toBe(true);
      expect(itemArt(id).endsWith(`art/items/${id}.webp`)).toBe(true);
    }
    const icons = ids.map((id) => ITEM_ICONS[id]);
    const palette = Object.values(OKABE_ITO);
    for (const i of icons) expect(palette).toContain(i.colour);
    expect(new Set(icons.map((i) => i.glyph)).size).toBe(ids.length);
    // no two items share both shape and colour, so the fallback still tells them apart
    expect(new Set(icons.map((i) => `${i.shape}/${i.colour}`)).size).toBe(ids.length);
    expect(itemArt('nope')).toBe('');
  });

  it('renders an svg with an outline, and nothing for an unknown id', () => {
    expect(iconSvg('beachBall')).toMatch(/^<svg[^>]*aria-hidden="true".*<path d="[^"]+" fill="#D55E00" stroke=/);
    expect(iconSvg('nope')).toBe('');
  });
});

describe('Time Trial medal badges (sweep 24 Sept 2026)', () => {
  it('one stopwatch medal per tier in its own metal, hidden from assistive tech (the words beside it name it), with no ids to clash', () => {
    const tiers = ['gold', 'silver', 'bronze'] as const;
    const svgs = tiers.map((m) => medalSvg(m, 44));
    tiers.forEach((m, i) => {
      expect(svgs[i]).toMatch(new RegExp(`^<svg class="medal-svg" data-medal="${m}" viewBox="0 0 64 76" width="44" height="52" aria-hidden="true"`));
      expect(svgs[i]).not.toMatch(/\sid=/);
      // the rim, the face, two ribbon tails and the glint: the stylesheet colors them and twinkles the glint
      for (const part of ['rim', 'face', 'tail-l', 'tail-r', 'glint']) expect(svgs[i]).toContain(`class="${part}"`);
    });
    // the same drawing in each metal: only the tier differs
    expect(new Set(svgs.map((s) => s.replace(/data-medal="\w+"/, ''))).size).toBe(1);
    expect(medalSvg('gold', 84)).toContain('width="84" height="100"');
  });
});

describe('menu icons (sweep 25 Sept 2026: the OS emoji differed on every system, and a Mac\'s calendar read "JUL 17")', () => {
  const MODES = ['quick', 'grandPrix', 'knockout', 'timeTrial', 'daily'];
  const EMOJI = /\p{Extended_Pictographic}/u;

  it('one drawing per mode, in the house outline, hidden from assistive tech (the card names it), with no ids to clash', () => {
    const svgs = MODES.map((m) => modeSvg(m, 20260925));
    MODES.forEach((m, i) => {
      expect(svgs[i]).toMatch(new RegExp(`^<svg class="mode-svg" data-mode="${m}" viewBox="0 0 48 48" [^>]*aria-hidden="true" focusable="false">`));
      expect(svgs[i]).not.toMatch(/\sid=/);
      expect(svgs[i]).toContain('#1b1b2f'); // the ink outline
      expect(EMOJI.test(svgs[i]), m).toBe(false);
    });
    expect(new Set(svgs.map((s) => s.replace(/data-mode="\w+"/, ''))).size).toBe(MODES.length);
    expect(modeSvg('mirror', 20260925)).toBe('');
  });

  it('the Daily\'s calendar shows the day and month of the date it is given (the Daily\'s own, yyyymmdd)', () => {
    const text = (s: string) => [...s.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
    expect(text(modeSvg('daily', 20260925))).toEqual(['SEP', '25']);
    expect(text(modeSvg('daily', 20261201))).toEqual(['DEC', '1']);
    // the other cards carry no words
    for (const m of MODES.slice(0, 4)) expect(text(modeSvg(m, 20260925)), m).toEqual([]);
  });

  it('the padlock, the stars and the step arrows are drawn too, each hidden from assistive tech, with no ids', () => {
    for (const s of [lockSvg(), starIcon(true), starIcon(false), arrowSvg(-1), arrowSvg(1)]) {
      expect(s).toMatch(/^<svg [^>]*aria-hidden="true" focusable="false">/);
      expect(s).not.toMatch(/\sid=/);
    }
    // an earned star is gold, one still to earn pale, as the results' stars
    expect(starIcon(true)).toContain('fill="#f2b705"');
    expect(starIcon(false)).toContain('fill="#e9e2d0"');
    // the arrows take the text's color, and point each way
    expect(arrowSvg(-1)).toContain('fill="currentColor"');
    expect(arrowSvg(-1)).not.toBe(arrowSvg(1));
  });
});
