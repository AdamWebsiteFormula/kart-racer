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

// ---- cup emblems (25 Sept 2026): each Grand Prix cup and Knockout set wears its own, as MKW's cups do ----
const SKY = '#56b4e9';
/** a paler sky: a peak further off */
const SKY_FAR = '#a6dcf6';

/** A ray, a crest or an edge drawn twice: a fat ink stroke, then the color on it (one outline round the whole line). */
const inked = (d: string, color: string, w: number, ink = w + 2.8) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${ink}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

/** Sunrise Cup (it teaches the game): a sun coming up over a teal sea, its rays fanned over the horizon. */
const SUNRISE = (() => {
  let rays = '';
  for (let i = -3; i <= 3; i++) {
    const a = (i * 26 * Math.PI) / 180, s = Math.sin(a), c = Math.cos(a);
    rays += `M${n1(24 + 15.5 * s)} ${n1(29 - 15.5 * c)}L${n1(24 + 21 * s)} ${n1(29 - 21 * c)}`;
  }
  return inked(rays, SUN, 3.4)
    + `<path d="M10.5 29a13.5 13.5 0 0 1 27 0Z" fill="${SUN}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>`
    + `<rect x="3.5" y="29" width="41" height="12.5" rx="6" fill="${TEAL}" stroke="${INK}" stroke-width="2.6"/>`
    + `<path d="M17 33.6h14M20.5 37.4h7" stroke="${SUN}" stroke-width="2.2" stroke-linecap="round"/>`
    + `<path d="M8.5 35.6q2.2-1.7 4.4 0M35.1 35.6q2.2-1.7 4.4 0" fill="none" stroke="${PAPER}" stroke-width="1.8" stroke-linecap="round"/>`
    + '<path d="M15.6 24.6a9.4 9.4 0 0 1 5-5.3" fill="none" stroke="#fff" stroke-opacity="0.85" stroke-width="2" stroke-linecap="round"/>';
})();

/** Summit Cup (it tests the game): a snowy peak with a coral flag on its top, a paler one behind. */
const SUMMIT = `<g stroke="${INK}" stroke-linejoin="round" stroke-linecap="round">`
  + `<path d="M22 42.5 35 20l11.5 22.5Z" fill="${SKY_FAR}" stroke-width="2.6"/>`
  + `<path d="M35 20l2.6 5-1.6 1.6-1.4-1.8-1.4 1.6-1.1-1.4Z" fill="${PAPER}" stroke-width="1.8"/>`
  + `<path d="M3 42.5 20 11l17 31.5Z" fill="${SKY}" stroke-width="2.8"/>`
  + `<path d="M20 11l5.2 9.6-2.8 2.8-2.5-2.6-2.6 2.4-2.5-2.6Z" fill="${PAPER}" stroke-width="2.2"/>`
  + `<path d="M20 11V2.6" stroke-width="2.2"/><path d="M20.6 3l8.4 2.8-8.4 2.8Z" fill="${CORAL}" stroke-width="1.8"/>`
  + '</g>'
  + '<path d="M13.4 28.6 17.4 21.8" stroke="#fff" stroke-opacity="0.7" stroke-width="1.8" stroke-linecap="round"/>';

/** Coastline Knockout (by the sea): a curling wave, its crest foaming over. */
const COASTLINE = `<g stroke="${INK}" stroke-linejoin="round" stroke-linecap="round">`
  + `<path d="M3.5 42.5C4 27 13 10 28.5 8.5c9-.9 15.6 5 15.2 12.4-.4 6.6-8.2 8.9-11.6 4.6-2.2-2.8.2-6.8 3.9-5.6-4.8 3.3-6.5 11.7-3.9 22.6Z" fill="${TEAL}" stroke-width="2.8"/>`
  + `<path d="M13.6 19.4C17.5 12.5 23 9.3 28.5 8.5c9-.9 15.6 5 15.2 12.4-.3 5-4.8 7.6-8.6 6.4 2.9-1.4 4.2-4.5 3-7.8-2.4-5.7-9.7-6.8-14.5-4.1l-1.9-2.6-2.8 3.5-2.2-1.7Z" fill="${PAPER}" stroke-width="2.2"/>`
  + '</g>'
  + `<path d="M8.5 37.5c2.8-8.6 7-15.2 12.6-19" fill="none" stroke="${SKY}" stroke-width="2.6" stroke-linecap="round"/>`
  + `<circle cx="9" cy="12" r="2.2" fill="${PAPER}" stroke="${INK}" stroke-width="1.6"/><circle cx="5.4" cy="18.4" r="1.5" fill="${PAPER}" stroke="${INK}" stroke-width="1.4"/>`;

/** Peaks Knockout (up in the high country): twin peaks side by side under a twinkle, one teal, one sky. */
const TWIN_PEAKS = `<g stroke="${INK}" stroke-linejoin="round" stroke-linecap="round">`
  + `<path d="M2.5 42.5 16 14l13.5 28.5Z" fill="${TEAL}" stroke-width="2.8"/>`
  + `<path d="M16 14l4.4 9.3-2.6 2.2-1.9-2.3-2 2.2-2.3-2.1Z" fill="${PAPER}" stroke-width="2"/>`
  + `<path d="M18.5 42.5 32 14l13.5 28.5Z" fill="${SKY}" stroke-width="2.8"/>`
  + `<path d="M32 14l4.4 9.3-2.6 2.2-1.9-2.3-2 2.2-2.3-2.1Z" fill="${PAPER}" stroke-width="2"/>`
  + `<path d="M24 1.8l1.6 4.6 4.6 1.6-4.6 1.6-1.6 4.6-1.6-4.6-4.6-1.6 4.6-1.6Z" fill="${SUN}" stroke-width="1.6"/>`
  + '</g>';

const CUP_EMBLEMS: Readonly<Record<string, string>> = Object.freeze({ sunrise: SUNRISE, summit: SUMMIT, coastline: COASTLINE, peaks: TWIN_PEAKS });

/**
 * A Grand Prix cup's or a Knockout set's emblem (data/catalog.ts ids), or '' for none: on its card beside
 * its name, and on the course intro's cup chip. Sized by its box (ui.css .emblem).
 */
export function cupSvg(id: string): string {
  const body = CUP_EMBLEMS[id];
  return body ? `<svg class="cup-svg" data-cup="${id}" viewBox="0 0 48 48" width="48" height="48" aria-hidden="true" focusable="false">${body}</svg>` : '';
}

/** A padlock (a locked paint, body or unlock): a gold body with a keyhole under an ink shackle. */
export function lockSvg(): string {
  return '<svg class="lock-svg" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">'
    + `<path d="M7.6 11.6V8.4a4.4 4.4 0 0 1 8.8 0v3.2" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>`
    + `<rect x="4.2" y="10.4" width="15.6" height="11.8" rx="3" fill="${SUN}" stroke="${INK}" stroke-width="2.4"/>`
    + `<path d="M12 13.2a1.9 1.9 0 0 0-1 3.5l-.4 2.6h2.8l-.4-2.6a1.9 1.9 0 0 0-1-3.5Z" fill="${INK}"/>`
    + '</svg>';
}

/**
 * Steering assist's badge, by the race's speed readout (MKW puts a little antenna on the kart): our own
 * steering wheel, a teal rim on three spokes round a sun hub, under the ink outline. Sized by its box.
 */
export function wheelSvg(): string {
  const spokes = 'M3.6 12h5M15.4 12h5M12 15.4v5';
  return '<svg class="wheel-svg" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">'
    + `<g fill="none" stroke-linecap="round"><circle cx="12" cy="12" r="8.6" stroke="${INK}" stroke-width="5.2"/><path d="${spokes}" stroke="${INK}" stroke-width="5"/>`
    + `<circle cx="12" cy="12" r="8.6" stroke="${TEAL}" stroke-width="2.4"/><path d="${spokes}" stroke="${TEAL}" stroke-width="2.2"/></g>`
    + `<circle cx="12" cy="12" r="3.4" fill="${SUN}" stroke="${INK}" stroke-width="1.8"/>`
    + '<path d="M6.4 7.6a7 7 0 0 1 4-2.6" fill="none" stroke="#fff" stroke-opacity="0.85" stroke-width="1.4" stroke-linecap="round"/>'
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

// ---- the ten karts (design §5, 25 Sept 2026: any racer in any kart) ----
// Each kart side on, facing right, in the house style (flat fills under the ink outline, a white glint), drawn
// from the racers' concept art (public/art/racers): a card's picture and the Kart screen's big one. `a` and `b`
// are its two colors (data/karts.ts kartColors: the owner's; a twin the racer's own or their paint's).
// Trusted, generated markup only; no ids, so any number can sit on one page. The viewBox is 124 × 68.
const TIRE = '#2a2630', TREAD = '#4b4552', CHROME = '#cfd6de', STEEL = '#8d97a5', PAN = '#3a3a44', ENGINE = '#5a5a66';
const WOOD = '#b57f4c', WOOD_DARK = '#7b4c2a', GLASS = '#bfe6ff', THRUST = '#7fe3ff', ROUNDEL = '#e53935', STRAP = '#6b3f2a', LAMP = '#fff7c2';

/** A wheel: the tire, a hub in `hub`, a dark nut; `knobby` adds a tread ring (the off-roaders). */
function wheel(cx: number, cy: number, r: number, hub = CHROME, knobby = false): string {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${TIRE}"/>`
    + (knobby ? `<circle cx="${cx}" cy="${cy}" r="${n1(r - 2.2)}" fill="none" stroke="${TREAD}" stroke-width="2.6" stroke-dasharray="3.2 2.6"/>` : '')
    + `<circle cx="${cx}" cy="${cy}" r="${n1(r * 0.5)}" fill="${hub}" stroke-width="1.8"/>`
    + `<circle cx="${cx}" cy="${cy}" r="${n1(r * 0.17)}" fill="${INK}" stroke="none"/>`;
}
/** A tube drawn twice (a fat ink stroke, then its color on it): a roll cage, a rail, a pipe. */
const tube = (d: string, color: string, w = 3.2) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${n1(w + 3)}"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${w}"/>`;
/** Two exhaust pipes out of (x, y) and (x, y + 5), `len` back and `rise` up. */
const pipes = (x: number, y: number, len: number, rise: number, color = CHROME) => tube(`M${x} ${y}l${-len} ${-rise}M${x} ${y + 5}l${-len} ${-rise}`, color, 3.4);
/** a white glint along a top edge */
const glint = (d: string) => `<path d="${d}" fill="none" stroke="#fff" stroke-opacity="0.75" stroke-width="2.2" stroke-linecap="round"/>`;

/** Pip's Parcel Scooter: a low scooter kart, a round headlamp on its cowl, handlebars, a parcel strapped to the rack behind. */
const scooter = (a: string, b: string) => pipes(20, 39, 10, 2)
  + tube('M14 30h28M38 30l2 7', CHROME, 2.4)
  + `<rect x="12" y="9" width="30" height="21" rx="3" fill="${b}"/><path d="M22 9v21M33 9v21M12 19.5h30" stroke="${STRAP}" stroke-width="2.6"/>`
  + `<path d="M18 46v-5c0-4 3-7 8-7h42l7-5 7-13c2-4 5-6 9-6h11c4 0 7 3 7 7v24c0 3-3 5-6 5Z" fill="${a}"/>`
  + `<path d="M46 34c0-4 3-6 7-6h12c3 0 5 2 5 5v1Z" fill="${PAN}"/>`
  + tube('M89 10 85 3h-7', PAN, 2.2)
  + `<circle cx="103" cy="21" r="6" fill="${PAPER}" stroke-width="2.2"/><circle cx="103" cy="21" r="3" fill="${GLASS}" stroke-width="1.4"/>`
  + wheel(30, 47, 11) + wheel(92, 47, 11)
  + glint('M28 37c1-1 2-1 4-1h32M90 13c2-1 4-1 7-1');

/** Momo's Scrap Buggy: a bare tube cage over a dark chassis, the engine out in the open behind, knobby tires. */
const scrap = (a: string, b: string) => pipes(18, 17, 10, 9)
  + `<rect x="10" y="20" width="24" height="18" rx="3" fill="${CHROME}"/><path d="M13 20v-5h5v5M19.5 20v-5h5v5M26 20v-5h5v5" fill="${STEEL}" stroke-width="1.8"/><path d="M13 27h18M13 32h18" stroke="${STEEL}" stroke-width="1.6"/>`
  + `<path d="M16 38h90l6-6v4l-6 8H16Z" fill="${a}"/>`
  + `<path d="M50 38c0-6 3-10 8-10h5v10Z" fill="${PAN}"/>`
  + tube('M42 38 48 8h24l14 30M45 22h35M86 38l14-6h10M108 32v8', b, 3.4)
  + `<circle cx="80" cy="19" r="5" fill="none" stroke-width="2.6"/><path d="M80 24l-5 12" stroke-width="2.4"/>`
  + wheel(28, 45, 14, CHROME, true) + wheel(94, 45, 13, CHROME, true)
  + glint('M50 10h20');

/** Nova's Comet Pod: a round pod on white-hubbed wheels, a little swept wing, and a thruster glowing at the back. */
const pod = (a: string, b: string) => `<ellipse cx="6" cy="31" rx="7" ry="6.5" fill="${THRUST}" stroke="none" opacity="0.5"/>`
  + `<rect x="8" y="24" width="15" height="14" rx="2" fill="${a}"/><path d="M8 24c-3 0-4.5 3-4.5 7s1.5 7 4.5 7Z" fill="${THRUST}"/><path d="M15 24.5v13" stroke="${b}" stroke-width="3" stroke-linecap="butt"/>`
  + `<path d="M20 45c-3-9 2-20 14-23l8-2c5-5 13-7 21-5 7 2 11 5 14 9 14 2 28 8 30 17 1 5-2 8-7 8H26c-4 0-5-2-6-4Z" fill="${a}"/>`
  + `<path d="M36 39c14 5 40 5 60-2" fill="none" stroke="${b}" stroke-width="5"/>`
  + `<path d="M44 21c4-4 10-6 16-5 5 1 9 3 12 7Z" fill="${PAN}"/>`
  + `<path d="M26 27 13 17h10l13 9Z" fill="${b}"/>`
  + `<ellipse cx="98" cy="35" rx="5" ry="4" fill="${b}" stroke-width="1.8"/>`
  + wheel(32, 48, 11, b) + wheel(90, 48, 11, b)
  + glint('M64 16c5 1 9 4 12 7M84 28c6 1 12 4 16 7');

/** Juniper's Timber Wagon: a boxy off-roader, a wood-paneled tub, a green hood, bumper and roll bar, a spare tire on the back. */
const wagon = (a: string, b: string) => `<circle cx="10" cy="28" r="9" fill="${TIRE}"/><circle cx="10" cy="28" r="4" fill="${STEEL}" stroke-width="1.6"/>`
  + tube('M34 24 38 7h16l4 17', b)
  + `<path d="M13 24h52l4 6h38c3 0 5 2 5 5v8c0 2-2 4-4 4H16c-2 0-3-2-3-4Z" fill="${a}"/>`
  + `<rect x="18" y="27" width="40" height="12" rx="1.5" fill="${WOOD}"/><path d="M18 33h40M31 27v12M45 27v6M45 33v6" stroke="${WOOD_DARK}" stroke-width="1.6"/>`
  + `<path d="M68 30h39c2.5 0 4.5 1.5 5 4H70Z" fill="${b}"/>`
  + `<circle cx="108.5" cy="38" r="3.4" fill="${PAPER}" stroke-width="1.6"/>`
  + `<rect x="100" y="44" width="16" height="5" rx="1.5" fill="${b}"/>`
  + wheel(30, 46, 13, STEEL, true) + wheel(93, 46, 13, STEEL, true)
  + tube('M15 47a15 15 0 0 1 30 0M78 47a15 15 0 0 1 30 0', a, 3.4)
  + glint('M72 32h34M40 9h12');

/** Otto's Wave Skimmer: a boat hull on wheels, a white stripe down its side, the rescue float ringed on the back. */
const skimmer = (a: string, b: string) => pipes(18, 30, 9, 4)
  + `<circle cx="26" cy="20" r="10" fill="none" stroke="${INK}" stroke-width="9.4"/><circle cx="26" cy="20" r="10" fill="none" stroke="${PAPER}" stroke-width="6.2"/>`
  + `<circle cx="26" cy="20" r="10" fill="none" stroke="${b}" stroke-width="6.2" stroke-dasharray="7.85 7.85"/>`
  + `<path d="M12 29h52c18 0 36 2 50 8-3 5-8 9-14 9H22c-6 0-10-4-10-9Z" fill="${a}"/>`
  + `<path d="M16 37.5h90" stroke="${PAPER}" stroke-width="4" stroke-linecap="butt"/>`
  + `<path d="M46 29c0-5 4-8 8-8h10c3 0 5 3 5 8Z" fill="${PAN}"/><path d="M70 29l4-9h4l-2 9Z" fill="${GLASS}" stroke-width="1.8"/>`
  + wheel(30, 48, 10, PAPER) + wheel(90, 48, 10, PAPER)
  + glint('M68 31c14 0 28 2 40 6');

/** Sprocket's Wind-Up Racer: a round tin-toy racer with a brass band and rivets, a 1 on a red roundel, the big key on its back. */
const windup = (a: string, b: string) => tube('M10 31h8', b, 3)
  + `<path d="M7 17.5a5.5 5.5 0 0 1 5.5 5.5c0 2-1 3.5-2.5 4.5v8c1.5 1 2.5 2.5 2.5 4.5a5.5 5.5 0 0 1-11 0c0-2 1-3.5 2.5-4.5v-8c-1.5-1-2.5-2.5-2.5-4.5A5.5 5.5 0 0 1 7 17.5Z" fill="${b}"/>`
  + `<circle cx="7" cy="23" r="1.8" fill="${INK}" stroke="none"/><circle cx="7" cy="40" r="1.8" fill="${INK}" stroke="none"/>`
  + pipes(24, 27, 7, 4, b)
  + `<path d="M18 46c-3-7-2-15 5-19 7-4 15-4 21-2l6-3c8-3 16-1 22 3 14 1 28 5 34 12 3 4 1 9-4 9Z" fill="${a}"/>`
  + tube('M21 39h84', b, 3)
  + `<g fill="${INK}" stroke="none"><circle cx="30" cy="39" r="1"/><circle cx="46" cy="39" r="1"/><circle cx="62" cy="39" r="1"/><circle cx="78" cy="39" r="1"/><circle cx="94" cy="39" r="1"/></g>`
  + `<path d="M46 26c2-3 6-5 11-5 5 0 9 2 12 5Z" fill="${PAN}"/>`
  + `<circle cx="84" cy="31" r="6.4" fill="${ROUNDEL}" stroke-width="2"/><path d="M83 28.6l2-1.2v7.6" fill="none" stroke="${PAPER}" stroke-width="2"/>`
  + wheel(32, 47, 12, b) + wheel(90, 47, 12, b)
  + glint('M27 29c4-2 9-3 14-2M76 23c10 1 20 4 26 9');

/** Boulder's Stone Stomper: chunky stone slabs with moss on top, two tall chrome stacks, a bull bar, huge knobby tires. */
const stomper = (a: string, b: string) => tube('M24 22V3M31 22V5', CHROME, 3.6)
  + `<path d="M12 36l2-12 12-4 14 2 10-6 14 3 16-1 12 6 12 2 4 10-3 6H14Z" fill="${a}"/>`
  + `<path d="M40 22l4 8-3 6M76 19l-2 9 5 7M58 25l6 4" fill="none" stroke-opacity="0.45" stroke-width="1.6"/>`
  + tube('M26 20c2-3 6-4 9-3 3-3 7-3 9 0M62 19c3-3 7-3 10-1 3-2 7-2 9 1M95 25c2-2 5-2 7 0', b, 2.8)
  + tube('M106 28h8v14h-8M106 35h8', STEEL, 2.6)
  + wheel(29, 43, 16, STEEL, true) + wheel(92, 43, 16, STEEL, true)
  + glint('M28 21l10-3 12 1');

/** The Snack Truck's awning: eight scalloped stripes from x = 16, `a` and `b` in turn. */
const awning = (a: string, b: string) => Array.from({ length: 8 }, (_, i) => `<path d="M${16 + i * 6} 12h6v5a3 3 0 0 1-6 0Z" fill="${i % 2 ? b : a}" stroke-width="1.8"/>`).join('');

/** Gus's Snack Truck: a food truck kart, the serving hatch under a striped awning, a round-lamped hood, a chrome bumper. */
const snacktruck = (a: string, b: string) => pipes(14, 36, 8, 3)
  + `<path d="M12 44V14c0-3 2-5 5-5h48c3 0 5 2 5 5v12h26c8 0 14 6 15 14v4c0 2-2 3-4 3H14c-1 0-2-1-2-3Z" fill="${a}"/>`
  + `<rect x="20" y="19" width="40" height="15" rx="1.5" fill="${PAPER}"/><rect x="24" y="25" width="4" height="9" rx="1" fill="${SUN}" stroke-width="1.4"/><rect x="30" y="23" width="4" height="11" rx="1" fill="${ROUNDEL}" stroke-width="1.4"/>`
  + `<rect x="18" y="33" width="44" height="3" fill="${WOOD}" stroke-width="1.6"/>`
  + awning(a, b)
  + `<path d="M74 26l6-10h10l4 10Z" fill="${GLASS}" stroke-width="2"/>`
  + `<circle cx="106" cy="34" r="4.2" fill="${PAPER}" stroke-width="1.8"/>`
  + `<rect x="94" y="43" width="20" height="5" rx="2.5" fill="${CHROME}" stroke-width="1.8"/>`
  + wheel(30, 47, 12) + wheel(92, 47, 12)
  + glint('M17 11h44M78 28h14');

/** Classic: a low open-wheel go-kart, a bullet nose on a front wing, a side pod, a number disc and a rear wing on struts. */
const classic = (a: string, b: string) => pipes(16, 40, 8, 2)
  + tube('M18 17l4 16M28 17l2 16', STEEL, 2)
  + `<rect x="6" y="11" width="28" height="6" rx="2" fill="${a}"/><rect x="6" y="8" width="4" height="12" rx="1.2" fill="${b}"/>`
  + `<path d="M98 47h20v3H98Z" fill="${b}"/>`
  + `<path d="M14 42c0-7 6-11 14-11h14l6-5h14l8 6h12c14 0 26 5 34 11-2 3-6 5-10 5H18c-3 0-4-3-4-6Z" fill="${a}"/>`
  + `<path d="M40 44c0-4 3-6 7-6h22c4 0 6 2 6 5v3H40Z" fill="${b}"/>`
  + tube('M47 28c2-5 13-5 15 0', b, 4)
  + tube('M72 34h28', b, 3)
  + `<circle cx="88" cy="39" r="4.4" fill="#fff" stroke-width="1.8"/>`
  + wheel(26, 46, 12) + wheel(94, 48, 10)
  + glint('M76 35c10 0 20 3 28 7');

/** Buggy: a dune buggy, a tub with a sloped nose, fenders over chunky tires, a roll bar behind the seat and the engine bare. */
const buggy = (a: string, b: string) => pipes(12, 22, 8, 6)
  + `<rect x="8" y="22" width="18" height="14" rx="2.5" fill="${ENGINE}"/><rect x="11" y="15" width="10" height="7" rx="3" fill="${CHROME}" stroke-width="1.8"/>`
  + tube('M40 28 44 6h14l3 22', b)
  + `<path d="M20 28h62l24 6c4 1 6 4 6 7v2H22c-2 0-3-2-3-4Z" fill="${a}"/>`
  + `<circle cx="106" cy="33" r="3.4" fill="${LAMP}" stroke-width="1.6"/>`
  + `<rect x="100" y="42" width="15" height="4" rx="2" fill="${CHROME}" stroke-width="1.6"/>`
  + wheel(29, 45, 14, b, true) + wheel(92, 45, 14, b, true)
  + tube('M13 36c1-9 8-14 16-14s14 5 16 14M76 36c2-9 8-14 16-14s14 5 16 14', b, 3.4)
  + glint('M24 30h54M46 8h10');

const KART_ART: Readonly<Record<string, (a: string, b: string) => string>> = Object.freeze({ scooter, scrap, pod, wagon, skimmer, windup, stomper, snacktruck, classic, buggy });

/**
 * A kart side on and facing right (data/karts.ts ids), in its two colors `a` and `b`, on its shadow; '' for an
 * unknown id. Sized by its box (karts.css), never by its attributes.
 */
export function kartSvg(kartId: string, a: string, b: string): string {
  const art = KART_ART[kartId];
  if (!art) return '';
  return `<svg class="kart-svg" data-kart="${kartId}" viewBox="-2 -4 124 68" width="124" height="68" aria-hidden="true" focusable="false">`
    + `<ellipse cx="60" cy="60" rx="52" ry="3.4" fill="${INK}" opacity="0.2"/>`
    + `<g stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">${art(a, b)}</g></svg>`;
}
