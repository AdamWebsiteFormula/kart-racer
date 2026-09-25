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

// ---- menu icons (sweep 25 Sept 2026) ----
// The mode cards and the locks were OS emoji, the stars and step arrows a font's: a Mac printed its
// calendar "JUL 17" on the Daily card, a wrong date, and every system draws them its own way, off the
// game's art. These are ours, drawn like medalSvg: flat fills from the house palette under the ink
// outline. Trusted, generated markup only; no ids, so any number can sit on one page.

/** The house palette (ui.css :root). */
const INK = '#1b1b2f', PAPER = '#fffaf0', SUN = '#ffd23f', CORAL = '#ff6f61', TEAL = '#2ec4b6', GOLD = '#f2b705';
/** the pickup balloon's red (the podium cup wears one on its lid: game/podium.ts) */
const BALLOON = '#ff3d52';
/** a star not yet earned (the results' empty star, ui.css .stars) */
const STAR_EMPTY = '#e9e2d0';
/** a coordinate to one decimal, for path data */
const n1 = (v: number) => String(Math.round(v * 10) / 10);

/**
 * Quick Race's checkered flag, waving on a coral pole: the checks are laid out on the cloth's own
 * ripple (`at`, u across and v down), so they bend with it.
 */
const FLAG = (() => {
  const at = (u: number, v: number) => `${n1(13 + 31 * u)} ${n1(7.5 + 18 * v + 3.4 * Math.sin(Math.PI * 1.7 * u) + 2.5 * u)}`;
  const COLS = 4, ROWS = 3, SEG = 3;
  const edge = (u0: number, u1: number, v: number) => Array.from({ length: SEG + 1 }, (_, i) => at(u0 + ((u1 - u0) * i) / SEG, v));
  let checks = '';
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
    if ((c + r) % 2) continue;
    const [u0, u1, v0, v1] = [c / COLS, (c + 1) / COLS, r / ROWS, (r + 1) / ROWS];
    checks += `M${[...edge(u0, u1, v0), ...edge(u1, u0, v1)].join('L')}Z`;
  }
  const outline = `M${[...Array.from({ length: COLS * SEG + 1 }, (_, i) => at(i / (COLS * SEG), 0)), ...Array.from({ length: COLS * SEG + 1 }, (_, i) => at(1 - i / (COLS * SEG), 1))].join('L')}Z`;
  return `<path d="${outline}" fill="${PAPER}"/><path d="${checks}" fill="${INK}"/>`
    + `<path d="${outline}" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`
    + `<rect x="9.2" y="5" width="4.3" height="40.5" rx="2.1" fill="${CORAL}" stroke="${INK}" stroke-width="2.6"/>`
    + `<circle cx="11.35" cy="4.6" r="3.3" fill="${SUN}" stroke="${INK}" stroke-width="2.4"/>`;
})();

/** Grand Prix: our own cup (the podium's, game/podium.ts): a flared gold bowl with ring handles on a stem and stepped foot, a domed lid, and a red balloon tied on top. */
const CUP = `<g stroke="${INK}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">`
  + `<circle cx="10.4" cy="24.5" r="5.1" fill="none" stroke-width="7.6"/><circle cx="37.6" cy="24.5" r="5.1" fill="none" stroke-width="7.6"/>`
  + `<circle cx="10.4" cy="24.5" r="5.1" fill="none" stroke="${GOLD}" stroke-width="3"/><circle cx="37.6" cy="24.5" r="5.1" fill="none" stroke="${GOLD}" stroke-width="3"/>`
  + `<rect x="21.3" y="32.5" width="5.4" height="5.5" fill="${GOLD}"/><ellipse cx="24" cy="36.3" rx="4.3" ry="2.2" fill="${GOLD}"/>`
  + `<rect x="15.5" y="38.6" width="17" height="3.4" rx="1.4" fill="${GOLD}"/><rect x="12.3" y="41.6" width="23.4" height="4" rx="1.8" fill="${GOLD}"/>`
  + `<path d="M10.6 18H37.4C37.1 27 32 33.2 24 33.4 16 33.2 10.9 27 10.6 18Z" fill="${GOLD}"/>`
  + `<path d="M13 17.6C13.6 11.2 34.4 11.2 35 17.6Z" fill="${GOLD}"/>`
  + `<rect x="8.8" y="15.8" width="30.4" height="4.7" rx="2.3" fill="${GOLD}"/>`
  + `<path d="M22.5 14.4h3L24 12.2Z" fill="${BALLOON}" stroke-width="1.8"/><ellipse cx="24" cy="6.7" rx="5.3" ry="6.1" fill="${BALLOON}" stroke-width="2.4"/>`
  + '</g>'
  + '<path d="M14.6 22.4c.6 3.6 2.4 6.4 5.4 7.8M21.6 4.2a3.2 3.2 0 0 0-1.9 3" fill="none" stroke="#fff" stroke-opacity="0.8" stroke-width="2" stroke-linecap="round"/>';

/** A burst of `points` spikes round (24, 24): radii `outer` (alternating a little short) and `inner`, turned by `turn` degrees. */
function burst(points: number, outer: number, inner: number, turn: number): string {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = ((turn + (i * 180) / points) * Math.PI) / 180;
    const r = i % 2 ? inner : i % 4 ? outer * 0.9 : outer;
    pts.push(`${n1(24 + r * Math.sin(a))} ${n1(24 - r * Math.cos(a))}`);
  }
  return `M${pts.join('L')}Z`;
}
/** Knockout: a bold X on a burst: out of the race */
const KNOCKOUT = `<path d="${burst(11, 22.3, 15.5, -6)}" fill="${CORAL}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>`
  + `<path d="${burst(11, 15.5, 10.5, 10)}" fill="${SUN}"/>`
  + `<path d="M17 17l14 14M31 17 17 31" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>`
  + `<path d="M17 17l14 14M31 17 17 31" stroke="${PAPER}" stroke-width="4.6" stroke-linecap="round"/>`;

/** Time Trial: a stopwatch (medalSvg's, off its ribbon), a coral wedge of time run on its face. */
const STOPWATCH = `<g stroke="${INK}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">`
  + `<rect x="22" y="6" width="4" height="5" fill="${CORAL}"/><rect x="19.8" y="1.8" width="8.4" height="5.4" rx="2" fill="${CORAL}"/>`
  + `<rect x="34.4" y="8" width="5.6" height="4.4" rx="1.5" fill="${CORAL}" transform="rotate(42 37.2 10.2)"/>`
  + `<circle cx="24" cy="27.6" r="17.2" fill="${TEAL}" stroke-width="3"/><circle cx="24" cy="27.6" r="12.4" fill="${PAPER}" stroke-width="2.2"/>`
  + '</g>'
  + `<path d="M24 27.6V15.8A11.8 11.8 0 0 1 33 20Z" fill="${CORAL}"/>`
  + `<path d="M24 17.2v2.6M34.4 27.6h-2.6M24 38v-2.6M13.6 27.6h2.6" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`
  + `<path d="M24 27.6l7.3-6.2" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><circle cx="24" cy="27.6" r="2.3" fill="${INK}"/>`
  + '<path d="M10.4 22.6a14.4 14.4 0 0 1 7.2-8.3" fill="none" stroke="#fff" stroke-opacity="0.8" stroke-width="2.4" stroke-linecap="round"/>';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
/** Daily Challenge: a calendar page on the Daily's own date (`seed`, backend-leaderboard dailySeed: yyyymmdd, UTC), the day number big. */
function calendar(seed: number): string {
  const day = seed % 100, month = MONTHS[(Math.floor(seed / 100) % 100) - 1] ?? '';
  return `<g stroke="${INK}" stroke-linejoin="round">`
    + `<rect x="6" y="8.5" width="36" height="36.5" rx="5.5" fill="${PAPER}" stroke-width="3"/>`
    + `<path d="M6 20V14a5.5 5.5 0 0 1 5.5-5.5h25A5.5 5.5 0 0 1 42 14v6Z" fill="${CORAL}" stroke-width="3"/>`
    + `<rect x="11.4" y="3.4" width="4.6" height="9.6" rx="2.3" fill="${PAPER}" stroke-width="2.2"/><rect x="32" y="3.4" width="4.6" height="9.6" rx="2.3" fill="${PAPER}" stroke-width="2.2"/>`
    + '</g>'
    + `<text x="24" y="18.1" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="6.6" letter-spacing="0.4" fill="${PAPER}">${month}</text>`
    + `<text x="24" y="39.6" text-anchor="middle" font-family="Lilita One, Arial Rounded MT Bold, sans-serif" font-size="${day > 9 ? 19 : 21}" fill="${INK}">${day}</text>`;
}

/**
 * A mode card's icon, or '' for none. `dailySeed`: the Daily's date (yyyymmdd, UTC: the day its track
 * and its board are), which its calendar shows. Sized by its box (ui.css .modes .icon).
 */
export function modeSvg(mode: string, dailySeed: number): string {
  const body = mode === 'quick' ? FLAG : mode === 'grandPrix' ? CUP : mode === 'knockout' ? KNOCKOUT : mode === 'timeTrial' ? STOPWATCH : mode === 'daily' ? calendar(dailySeed) : '';
  return body ? `<svg class="mode-svg" data-mode="${mode}" viewBox="0 0 48 48" width="48" height="48" aria-hidden="true" focusable="false">${body}</svg>` : '';
}

/** A padlock (a locked paint, body or unlock): a gold body with a keyhole under an ink shackle. */
export function lockSvg(): string {
  return '<svg class="lock-svg" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">'
    + `<path d="M7.6 11.6V8.4a4.4 4.4 0 0 1 8.8 0v3.2" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>`
    + `<rect x="4.2" y="10.4" width="15.6" height="11.8" rx="3" fill="${SUN}" stroke="${INK}" stroke-width="2.4"/>`
    + `<path d="M12 13.2a1.9 1.9 0 0 0-1 3.5l-.4 2.6h2.8l-.4-2.6a1.9 1.9 0 0 0-1-3.5Z" fill="${INK}"/>`
    + '</svg>';
}

/** A star, earned (gold) or not yet (pale), as the results' stars draw it. */
export function starIcon(on: boolean): string {
  return `<svg class="star-svg${on ? ' on' : ''}" viewBox="-2 -2 28 28" width="24" height="24" aria-hidden="true" focusable="false">`
    + `<path d="${SHAPE_PATHS.star}" fill="${on ? GOLD : STAR_EMPTY}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/></svg>`;
}

/** A step arrow (◀ ▶ on a settings or garage row, the touch steering pad), in the text's color: the
 *  triangle characters turn into emoji on some phones. */
export function arrowSvg(dir: -1 | 1): string {
  return `<svg class="arrow-svg" viewBox="0 0 10 12" width="10" height="12" aria-hidden="true" focusable="false">`
    + `<path d="${dir < 0 ? 'M8.4 1.4 1.6 6l6.8 4.6Z' : 'M1.6 1.4 8.4 6l-6.8 4.6Z'}" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
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
