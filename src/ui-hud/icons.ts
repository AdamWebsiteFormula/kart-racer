// Item icons. The HUD shows painted art (AI-made, public/art/items/<id>.webp); under it sits the
// accessibility layer: a shape, an Okabe-Ito colour and a one-letter glyph for the colourblind
// labels setting (appendix C§10), and the shape is what shows if the art cannot load.

/** Okabe-Ito, the colourblind-safe eight. */
export const OKABE_ITO = Object.freeze({
  orange: '#E69F00', sky: '#56B4E9', green: '#009E73', yellow: '#F0E442',
  blue: '#0072B2', vermillion: '#D55E00', purple: '#CC79A7', black: '#000000',
});

export type IconShape = 'circle' | 'triangle' | 'square' | 'diamond' | 'hexagon' | 'teardrop' | 'star' | 'chevron';

export const SHAPE_PATHS: Readonly<Record<IconShape, string>> = Object.freeze({
  circle: 'M12 2a10 10 0 1 0 0.001 0Z',
  triangle: 'M12 2 22.5 21H1.5Z',
  square: 'M3 3h18v18H3Z',
  diamond: 'M12 1 23 12 12 23 1 12Z',
  hexagon: 'M6.5 2.5h11L23 12l-5.5 9.5h-11L1 12Z',
  teardrop: 'M12 1C12 1 4 11 4 15.5a8 8 0 0 0 16 0C20 11 12 1 12 1Z',
  star: 'M12 1.5l3.1 6.9 7.4.7-5.6 5 1.7 7.4L12 17.6l-6.6 3.9 1.7-7.4-5.6-5 7.4-.7Z',
  chevron: 'M2 4h8l8 8-8 8H2l8-8Z',
});

export interface ItemIcon { shape: IconShape; colour: string; glyph: string }

/** One entry per item (design §8). The glyph is a one-letter label for the colourblind-labels setting. */
export const ITEM_ICONS: Readonly<Record<string, ItemIcon>> = Object.freeze({
  beachBall: { shape: 'circle', colour: OKABE_ITO.vermillion, glyph: 'B' },
  homingKite: { shape: 'diamond', colour: OKABE_ITO.sky, glyph: 'K' },
  oilCan: { shape: 'teardrop', colour: OKABE_ITO.black, glyph: 'O' },
  decoyBalloon: { shape: 'triangle', colour: OKABE_ITO.purple, glyph: 'D' },
  airHorn: { shape: 'star', colour: OKABE_ITO.orange, glyph: 'H' },
  bubble: { shape: 'hexagon', colour: OKABE_ITO.blue, glyph: 'S' },
  fizzPop: { shape: 'chevron', colour: OKABE_ITO.green, glyph: 'P' },
  tripleFizz: { shape: 'chevron', colour: OKABE_ITO.blue, glyph: 'T' },
  fogBank: { shape: 'square', colour: OKABE_ITO.yellow, glyph: 'F' },
  strikeBall: { shape: 'circle', colour: OKABE_ITO.purple, glyph: 'X' },
  pogoSpring: { shape: 'triangle', colour: OKABE_ITO.orange, glyph: 'J' },
  grappleAnchor: { shape: 'diamond', colour: OKABE_ITO.yellow, glyph: 'A' },
  windUpMouse: { shape: 'teardrop', colour: OKABE_ITO.sky, glyph: 'M' },
});

/** The painted art for an item, or '' for an unknown id. */
export function itemArt(itemId: string): string {
  return ITEM_ICONS[itemId] ? `${import.meta.env?.BASE_URL ?? '/'}art/items/${itemId}.webp` : '';
}

/**
 * Icon markup for a slot: the painted art over its shape (the shape shows while it loads, or if it
 * fails: render/dom.ts Markup removes a picture that fails; no inline onerror, the CSP refuses it).
 */
export function iconMarkup(itemId: string, size = 48): string {
  const art = itemArt(itemId);
  if (!art) return '';
  return `<span class="shape">${iconSvg(itemId, size)}</span><img class="art" src="${art}" width="${size}" height="${size}" alt="" draggable="false">`;
}

export function iconFor(itemId: string): ItemIcon | null {
  return ITEM_ICONS[itemId] ?? null;
}

/** Inline SVG markup for an icon: a dark outline under the fill so it survives any background. */
export function iconSvg(itemId: string, size = 48): string {
  const ic = iconFor(itemId);
  if (!ic) return '';
  const d = SHAPE_PATHS[ic.shape];
  const stroke = ic.colour === OKABE_ITO.black ? '#ffffff' : '#1b1b2f';
  return `<svg viewBox="-2 -2 28 28" width="${size}" height="${size}" aria-hidden="true" focusable="false">`
    + `<path d="${d}" fill="${ic.colour}" stroke="${stroke}" stroke-width="2.5" stroke-linejoin="round"/></svg>`;
}
