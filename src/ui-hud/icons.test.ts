import { describe, expect, it } from 'vitest';
import { ITEM_DEFINITIONS } from '../items/data.ts';
import { ITEM_ICONS, OKABE_ITO, iconSvg, itemArt } from './icons.ts';

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
