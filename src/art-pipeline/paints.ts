// Alt paints (design §10: Pip alt, Boulder alt, Sprocket alt). Cosmetic only: the racer owns the class.
// A paint is a palette swap, not a tint: a few rules, each picking one colour family by hue,
// saturation and value (soft edges) and moving it to a new hue, saturation and value, so the
// shading, texture detail and every other colour (eyes, tyres, skin) stay as they were.
// The same rules repaint a model file's colour texture (pixel by pixel, once) and a code-built
// model's vertex colours, so both kinds of kart wear the same alt. Pure: no Three.js objects.

/** Everything in sRGB 0..1, hue 0..1 round the wheel. */
export interface PaintRule {
  /** the colour family it takes: hue centre and half width (both 0..1); absent = any hue (greys) */
  hue?: readonly [number, number];
  /** saturation and value bands it takes, [lo, hi] */
  sat?: readonly [number, number];
  val?: readonly [number, number];
  /** the new hue; with `keep`, the family's spread round its centre is kept (keep 1) */
  h?: number;
  keep?: number;
  /** new saturation and value: x × [0] + [1], clamped to 0..1 */
  s?: readonly [number, number];
  v?: readonly [number, number];
}

export interface Paint {
  /** the unlock id (ui-hud/unlocks.ts) */
  id: string;
  racerId: string;
  /** its name on the racer screen */
  name: string;
  rules: readonly PaintRule[];
  /** a shared body's colours in this paint, where the rules would not give them (a grey is only a grey) */
  primary?: string;
  secondary?: string;
}

/** How soft each band's edges are (hue: ± this at the band's edge; sat/val: ± SOFT). */
const HUE_SOFT = 0.03, SOFT = 0.05;

export const PAINTS: readonly Paint[] = Object.freeze([
  // Berry: the teal feathers and scooter turn raspberry, the coral parcel and face turn marigold
  {
    id: 'pip-alt', racerId: 'pip', name: 'Berry', rules: [
      { hue: [0.5, 0.09], sat: [0.3, 1], h: 0.87, keep: 1, v: [1.05, 0] },
      { hue: [0.03, 0.06], sat: [0.3, 1], h: 0.13, keep: 1, s: [1, 0.05], v: [1.1, 0.05] },
    ],
  },
  // Frost: grey stone goes a cold blue-grey and the moss turns to caps of snow
  {
    id: 'boulder-alt', racerId: 'boulder', name: 'Frost', rules: [
      { sat: [0, 0.18], val: [0.22, 0.9], h: 0.6, s: [0, 0.3], v: [0.95, 0.02] },
      { hue: [0.2, 0.12], sat: [0.12, 1], h: 0.56, s: [0, 0.06], v: [0.3, 0.68] },
    ],
    primary: '#8ea4ba', secondary: '#eef4f8',
  },
  // Mint: a mint-green tin toy with copper fittings for the cream and brass
  {
    id: 'sprocket-alt', racerId: 'sprocket', name: 'Mint', rules: [
      { hue: [0.1, 0.1], sat: [0.08, 0.32], val: [0.4, 1], h: 0.45, s: [0, 0.3], v: [0.97, 0] },
      { hue: [0.1, 0.1], sat: [0.32, 1], h: 0.03, keep: 1, s: [0.9, 0.1] },
    ],
  },
]);

/** The paint with this id for this racer, or undefined (the racer's own colours). */
export function paintFor(racerId: string, paintId: string | undefined): Paint | undefined {
  return paintId ? PAINTS.find((p) => p.id === paintId && p.racerId === racerId) : undefined;
}

const smooth = (e0: number, e1: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
const band = (x: number, lo: number, hi: number): number => smooth(lo - SOFT, lo + SOFT, x) * (1 - smooth(hi - SOFT, hi + SOFT, x));
const hueDist = (a: number, b: number): number => { const d = Math.abs(a - b) % 1; return Math.min(d, 1 - d); };
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** sRGB → HSV into `out` (h, s, v all 0..1). */
function hsv(r: number, g: number, b: number, out: number[]): void {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d > 0) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
    if (h < 0) h += 1;
  }
  out[0] = h; out[1] = mx > 0 ? d / mx : 0; out[2] = mx;
}

/** HSV → sRGB into `out`. */
function rgb(h: number, s: number, v: number, out: number[]): void {
  const i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  switch (((i % 6) + 6) % 6) {
    case 0: out[0] = v; out[1] = t; out[2] = p; break;
    case 1: out[0] = q; out[1] = v; out[2] = p; break;
    case 2: out[0] = p; out[1] = v; out[2] = t; break;
    case 3: out[0] = p; out[1] = q; out[2] = v; break;
    case 4: out[0] = t; out[1] = p; out[2] = v; break;
    default: out[0] = v; out[1] = p; out[2] = q; break;
  }
}

const HSV = [0, 0, 0], NEW = [0, 0, 0];

/**
 * One sRGB colour (0..1) through the rules, into `out`. Each rule weighs the ORIGINAL colour's
 * membership of its family and blends its new colour over the result so far.
 */
export function repaintRgb(r: number, g: number, b: number, rules: readonly PaintRule[], out: number[] = [0, 0, 0]): number[] {
  hsv(r, g, b, HSV);
  const [h, s, v] = HSV;
  out[0] = r; out[1] = g; out[2] = b;
  for (const R of rules) {
    let w = 1;
    if (R.hue) w *= 1 - smooth(R.hue[1] - HUE_SOFT, R.hue[1] + HUE_SOFT, hueDist(h, R.hue[0]));
    if (R.sat) w *= band(s, R.sat[0], R.sat[1]);
    if (R.val) w *= band(v, R.val[0], R.val[1]);
    if (w <= 0) continue;
    let nh = h;
    if (R.h !== undefined) nh = R.hue && R.keep ? R.h + ((((h - R.hue[0] + 0.5) % 1) + 1) % 1 - 0.5) * R.keep : R.h;
    nh = ((nh % 1) + 1) % 1;
    const ns = clamp01(s * (R.s?.[0] ?? 1) + (R.s?.[1] ?? 0)), nv = clamp01(v * (R.v?.[0] ?? 1) + (R.v?.[1] ?? 0));
    rgb(nh, ns, nv, NEW);
    out[0] += (NEW[0] - out[0]) * w; out[1] += (NEW[1] - out[1]) * w; out[2] += (NEW[2] - out[2]) * w;
  }
  return out;
}

const PX = [0, 0, 0];
/** Repaint RGBA bytes in place (a colour texture's pixels, sRGB); alpha is left alone. */
export function repaintPixels(data: Uint8ClampedArray | Uint8Array, rules: readonly PaintRule[]): void {
  for (let i = 0; i < data.length; i += 4) {
    repaintRgb(data[i] / 255, data[i + 1] / 255, data[i + 2] / 255, rules, PX);
    data[i] = Math.round(PX[0] * 255); data[i + 1] = Math.round(PX[1] * 255); data[i + 2] = Math.round(PX[2] * 255);
  }
}

/** A #rrggbb colour through the rules, as #rrggbb. */
export function repaintHex(hex: string, rules: readonly PaintRule[]): string {
  const n = parseInt(hex.slice(1), 16);
  repaintRgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, rules, PX);
  const c = (x: number) => Math.round(clamp01(x) * 255).toString(16).padStart(2, '0');
  return `#${c(PX[0])}${c(PX[1])}${c(PX[2])}`;
}
