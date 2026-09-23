import { describe, expect, it } from 'vitest';
import { ITEM_DEFINITIONS } from '../items/data.ts';
import { ITEM_ICONS, OKABE_ITO, iconSvg } from './icons.ts';

describe('item icons', () => {
  it('every v1 item has an icon; eight distinct shapes and eight distinct Okabe-Ito colours', () => {
    const ids = ITEM_DEFINITIONS.map((d) => d.id);
    for (const id of ids) expect(ITEM_ICONS[id], id).toBeDefined();
    const icons = ids.map((id) => ITEM_ICONS[id]);
    expect(new Set(icons.map((i) => i.shape)).size).toBe(ids.length);
    expect(new Set(icons.map((i) => i.colour)).size).toBe(ids.length);
    const palette = Object.values(OKABE_ITO);
    for (const i of icons) expect(palette).toContain(i.colour);
    expect(new Set(icons.map((i) => i.glyph)).size).toBe(ids.length);
  });

  it('renders an svg with an outline, and nothing for an unknown id', () => {
    expect(iconSvg('beachBall')).toMatch(/^<svg[^>]*aria-hidden="true".*<path d="[^"]+" fill="#D55E00" stroke=/);
    expect(iconSvg('nope')).toBe('');
  });
});
