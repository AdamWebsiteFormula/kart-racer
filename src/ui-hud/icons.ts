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

/**
 * A Time Trial medal badge (our own design, sweep 24 Sept 2026): a stopwatch struck as a medal, on two
 * ribbon tails in the house coral and teal. The metal's rim, face and ticks take their colors from the
 * stylesheet by `data-medal` (ui.css .medal-svg), the outlines are the house ink, and a glint twinkles
 * at its shoulder. The text beside it always names the medal, so it never rests on color alone.
 * Trusted, generated markup only.
 */
export function medalSvg(medal: 'gold' | 'silver' | 'bronze', width = 48): string {
  const height = Math.round(width * 76 / 64);
  return `<svg class="medal-svg" data-medal="${medal}" viewBox="0 0 64 76" width="${width}" height="${height}" aria-hidden="true" focusable="false">`
    + '<g stroke="#1b1b2f" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">'
    + '<path class="tail-l" d="M22 44 12 71l6.5-3.5L23 74l8-26Z"/><path class="tail-r" d="M42 44l10 27-6.5-3.5L41 74l-8-26Z"/>'
    + '<rect class="crown" x="26.5" y="3" width="11" height="8" rx="2.5"/><path class="crown" d="M29.5 11v2.5h5V11"/>'
    + '<circle class="rim" cx="32" cy="36" r="22"/>'
    + '<circle class="face" cx="32" cy="36" r="15" stroke-width="2.5"/>'
    + '</g>'
    + '<g class="ticks" stroke-width="2.6" stroke-linecap="round"><path d="M32 24.5v3M43.5 36h-3M32 47.5v-3M20.5 36h3"/></g>'
    + '<path d="M32 36l6.2-7.6" stroke="#1b1b2f" stroke-width="3.2" stroke-linecap="round"/><circle cx="32" cy="36" r="2.7" fill="#1b1b2f"/>'
    + '<path class="shine" d="M15.5 30.5a17.5 17.5 0 0 1 10.5-11.4" fill="none" stroke-width="3" stroke-linecap="round"/>'
    + '<path class="glint" d="M50 13l1.7 5.3L57 20l-5.3 1.7L50 27l-1.7-5.3L43 20l5.3-1.7Z" stroke="#1b1b2f" stroke-width="1.6" stroke-linejoin="round"/>'
    + '</svg>';
}
