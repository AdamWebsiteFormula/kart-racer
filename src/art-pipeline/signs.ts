// Race day's signs (28 Sept 2026; the second fresh-eyes review, item 2: "nothing anywhere carries a word, a banner
// or a flag"): one atlas a track, painted on a canvas at load, in the track's own palette and with its own world's
// shops and sponsors: Big Gus's diner, Sprocket's spares, Pip's parcel post, Momo's garage, Otto's surf school,
// Nova's star tours, Juniper's trail company, the Boulder brothers' quarry, and Fizz Pop, the race's soda. Arrow
// boards in each biome's own two colours (the old corner signs' colours, now two to three times their size), feather
// flags, 8:1 banners with the race's name and the track's, and 2:1 sponsor boards. Mario Kart World's own race
// dressing was studied for what it is made of, never copied: arrow billboards on the bends, feather flags and sponsor
// A-frames along the road, sign boards over the start (Moo Moo Meadows, youtube.com/watch?v=OSU-aguh1AY 1:29:00 to
// 1:29:30; Mario Bros. Circuit 3:14). No Nintendo names, marks or look-alikes; every word is our own world's; G-rated.
// Placed by track-builder mesh/raceDressing.ts, which never imports this file (TrackAssets.raceDressing).
import { CanvasTexture, Color, SRGBColorSpace, Texture } from 'three';
import type { AtlasCell, RaceDressingKit, Rgb3 } from '../track-builder/mesh/raceDressing.ts';

/** The atlas's side, pixels. */
export const SIGN_ATLAS = 1024;

type Rect = readonly [number, number, number, number];
/** Where each design is painted (pixels: x, y from the top, w, h). */
const LAYOUT: Readonly<{ arrow: Rect; flags: readonly Rect[]; white: Rect; banners: readonly Rect[]; boards: readonly Rect[] }> = Object.freeze({
  arrow: [0, 0, 512, 256],
  flags: [0, 1, 2, 3].map((k): Rect => [512 + 72 * k, 0, 72, 256]),
  white: [960, 0, 64, 64],
  banners: [[0, 256, 1024, 128], [0, 384, 1024, 128]],
  boards: [[0, 512, 512, 256], [512, 512, 512, 256], [0, 768, 512, 256], [512, 768, 512, 256]],
});

/** A painted rectangle as texture coordinates (v up: a canvas texture is flipped), pulled in `inset` pixels from its edges. */
function cell(r: Rect, inset = 2): AtlasCell {
  const [x, y, w, h] = r, S = SIGN_ATLAS;
  return [(x + inset) / S, 1 - (y + h - inset) / S, (x + w - inset) / S, 1 - (y + inset) / S];
}

/** Our world's own sponsors and shops: a name, a line under it, their colours and a little picture. */
interface Sponsor { name: string; line: string; bg: string; fg: string; accent: string; icon: Icon; /** its neon tube's colour at night (Boardwalk Nights) */ neon: string }
type Icon = 'bottle' | 'chef' | 'parcel' | 'gear' | 'wrench' | 'ring' | 'rock' | 'moon' | 'pine';
const SPONSORS: Readonly<Record<string, Sponsor>> = Object.freeze({
  fizz: { name: 'FIZZ POP', line: 'The fizziest soda!', bg: '#e8384f', fg: '#ffffff', accent: '#ffd23f', icon: 'bottle', neon: '#ff5277' },
  grub: { name: "GUS'S GRUB", line: 'Hot soup & pie', bg: '#fff4e0', fg: '#d63a2c', accent: '#d63a2c', icon: 'chef', neon: '#ff8a3d' },
  parcel: { name: "PIP'S PARCEL POST", line: 'Fast as a hummingbird', bg: '#1fb5a6', fg: '#ffffff', accent: '#ff7a6b', icon: 'parcel', neon: '#2ee6ff' },
  spares: { name: 'SPROCKET SPARES', line: 'Nuts, bolts & keys', bg: '#f3e7c9', fg: '#8a5a1c', accent: '#c9962f', icon: 'gear', neon: '#ffd24a' },
  // (a light ground on every board: dark ones read as black blocks from the road, 28 Sept 2026)
  motors: { name: 'MOMO MOTORS', line: 'Tune-ups & tires', bg: '#ffd23f', fg: '#2e2f36', accent: '#2e2f36', icon: 'wrench', neon: '#ffe45c' },
  surf: { name: "OTTO'S SURF SCHOOL", line: 'Swim safe, have fun!', bg: '#7fc8ff', fg: '#ffffff', accent: '#e8384f', icon: 'ring', neon: '#5fd0ff' },
  quarry: { name: 'BOULDER BROS.', line: 'Rocks, gravel & sand', bg: '#efe2c8', fg: '#4a545c', accent: '#6aa84f', icon: 'rock', neon: '#9dff6b' },
  stars: { name: 'NOVA STAR TOURS', line: 'Trips to the moon', bg: '#6a58c8', fg: '#ffffff', accent: '#ffe066', icon: 'moon', neon: '#b99bff' },
  trail: { name: 'JUNIPER TRAIL CO.', line: 'Maps, hikes & camps', bg: '#4a9a52', fg: '#fffaf0', accent: '#e07a3a', icon: 'pine', neon: '#7dff9b' },
});

/** Each track's signs: its name and cup (the banners), its arrow board's two colours, its frame and posts, its four sponsors, its flags' colours. */
interface BiomeSigns {
  track: string; cup: string;
  board: string; arrow: string; frame: string; post: string;
  sponsors: readonly [string, string, string, string];
  /** the banners' ground and letters; the flags' four grounds */
  banner: string; letters: string; flags: readonly [string, string, string, string];
  /** neon (Boardwalk Nights): dark grounds, glowing lines; the faces light themselves */
  neon?: boolean;
}
const BIOMES: Readonly<Record<string, BiomeSigns>> = Object.freeze({
  meadow: { track: 'WINDMILL RUN', cup: 'SUNRISE CUP', board: '#ffd23f', arrow: '#e8384f', frame: '#fffaf0', post: '#8a6a4a', sponsors: ['fizz', 'grub', 'trail', 'motors'], banner: '#e8384f', letters: '#fffaf0', flags: ['#ffd23f', '#e8384f', '#3aa0e8', '#5aae42'] },
  canyon: { track: 'MESA RUSH', cup: 'SUNRISE CUP', board: '#2ec4b6', arrow: '#ffffff', frame: '#fff4e0', post: '#8b6a4a', sponsors: ['fizz', 'quarry', 'spares', 'motors'], banner: '#2ec4b6', letters: '#ffffff', flags: ['#2ec4b6', '#ff6f61', '#ffd23f', '#c65a3a'] },
  frost: { track: 'FROSTBITE PASS', cup: 'SUMMIT CUP', board: '#ff4fa3', arrow: '#ffffff', frame: '#ffffff', post: '#5a3a22', sponsors: ['grub', 'stars', 'trail', 'fizz'], banner: '#ff4fa3', letters: '#ffffff', flags: ['#ff4fa3', '#3a8fe0', '#ffffff', '#7a5ce0'] },
  harbour: { track: 'LIGHTHOUSE LOOP', cup: 'SUNRISE CUP', board: '#ff6f61', arrow: '#ffffff', frame: '#ffffff', post: '#f4efe6', sponsors: ['surf', 'parcel', 'grub', 'fizz'], banner: '#1f8fd6', letters: '#ffffff', flags: ['#ff6f61', '#2ec4b6', '#ffd23f', '#1f8fd6'] },
  boardwalk: { track: 'BOARDWALK NIGHTS', cup: 'SUMMIT CUP', board: '#140f2e', arrow: '#2ee6ff', frame: '#ff3fd8', post: '#2a2350', sponsors: ['fizz', 'surf', 'grub', 'stars'], banner: '#140f2e', letters: '#2ee6ff', flags: ['#ff3fd8', '#2ee6ff', '#ffe45c', '#8b5cff'], neon: true },
  skyline: { track: 'SKYLINE CIRCUIT', cup: 'SUMMIT CUP', board: '#f5b700', arrow: '#ffffff', frame: '#fff6e0', post: '#e2a92c', sponsors: ['stars', 'parcel', 'spares', 'fizz'], banner: '#f5b700', letters: '#ffffff', flags: ['#f5b700', '#ff8fa3', '#7fc8ff', '#fff6e0'] },
});

const DISPLAY = '"Lilita One", "Fredoka", "Arial Rounded MT Bold", "Arial Black", sans-serif';
const BODY = '"Fredoka", "Lilita One", "Arial Rounded MT Bold", Arial, sans-serif';

type G = CanvasRenderingContext2D;

function roundRect(g: G, x: number, y: number, w: number, h: number, r: number): void {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** Text centred at (x, y), shrunk until it fits `maxW`, with an outline in `edge` when given. */
function text(g: G, s: string, x: number, y: number, maxW: number, size: number, fill: string, font = DISPLAY, edge?: string, glow?: string, weight = ''): void {
  let px = size;
  g.font = `${weight} ${px}px ${font}`;
  while (px > 8 && g.measureText(s).width > maxW) { px -= 2; g.font = `${weight} ${px}px ${font}`; }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  if (glow) { g.shadowColor = glow; g.shadowBlur = px * 0.35; }
  if (edge) { g.lineJoin = 'round'; g.lineWidth = Math.max(3, px * 0.16); g.strokeStyle = edge; g.strokeText(s, x, y); }
  g.fillStyle = fill;
  g.fillText(s, x, y);
  g.shadowBlur = 0;
}

/** How light a CSS colour looks (sRGB luma, 0..1). */
function luma(hex: string): number {
  const c = new Color(hex).convertLinearToSRGB();
  return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
}

/** A darker shade of a CSS colour (for outlines and shadows). */
function shade(hex: string, k: number): string {
  const c = new Color(hex);
  return `#${new Color(c.r * k, c.g * k, c.b * k).getHexString()}`;
}

/** Our own little pictures, drawn in a box `s` pixels square centred at (x, y). */
function icon(g: G, kind: Icon, x: number, y: number, s: number, fg: string, accent: string): void {
  g.save();
  g.translate(x, y);
  g.scale(s / 100, s / 100);
  g.fillStyle = fg;
  g.strokeStyle = fg;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  switch (kind) {
    case 'bottle': {
      // a soda bottle with bubbles
      roundRect(g, -16, -46, 32, 18, 5); g.fill();
      g.beginPath(); g.moveTo(-12, -30); g.lineTo(12, -30); g.lineTo(26, -6); g.lineTo(26, 40); g.quadraticCurveTo(26, 48, 18, 48);
      g.lineTo(-18, 48); g.quadraticCurveTo(-26, 48, -26, 40); g.lineTo(-26, -6); g.closePath(); g.fill();
      g.fillStyle = accent; roundRect(g, -26, 2, 52, 22, 4); g.fill();
      g.fillStyle = fg; for (const [bx, by, br] of [[34, -30, 7], [42, -8, 5], [36, 10, 4]]) { g.beginPath(); g.arc(bx, by, br, 0, Math.PI * 2); g.fill(); }
      break;
    }
    case 'chef': {
      // a chef's hat
      for (const [cx, cy, r] of [[-22, -12, 22], [0, -26, 26], [22, -12, 22]]) { g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); }
      roundRect(g, -30, -6, 60, 40, 6); g.fill();
      g.fillStyle = accent; roundRect(g, -32, 26, 64, 14, 4); g.fill();
      break;
    }
    case 'parcel': {
      // a parcel tied with string, with a wing
      g.fillStyle = accent; roundRect(g, -34, -24, 60, 52, 6); g.fill();
      g.fillStyle = fg; g.fillRect(-7, -24, 8, 52); g.fillRect(-34, -2, 60, 8);
      g.beginPath(); g.moveTo(28, -18); g.quadraticCurveTo(52, -40, 58, -22); g.quadraticCurveTo(46, -18, 50, -6); g.quadraticCurveTo(38, -8, 28, 2); g.closePath(); g.fill();
      break;
    }
    case 'gear': {
      // a cog
      g.beginPath();
      for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2, r = k % 2 ? 36 : 46; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      g.closePath(); g.fill();
      g.fillStyle = accent; g.beginPath(); g.arc(0, 0, 15, 0, Math.PI * 2); g.fill();
      break;
    }
    case 'wrench': {
      // a spanner, corner to corner
      g.rotate(-Math.PI / 4);
      roundRect(g, -8, -34, 16, 68, 6); g.fill();
      g.beginPath(); g.arc(0, -40, 18, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(0, 40, 18, 0, Math.PI * 2); g.fill();
      g.globalCompositeOperation = 'destination-out';
      g.fillRect(-7, -62, 14, 24); g.fillRect(-7, 38, 14, 24);
      g.globalCompositeOperation = 'source-over';
      break;
    }
    case 'ring': {
      // a lifebuoy
      g.lineWidth = 22; g.beginPath(); g.arc(0, 0, 32, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = accent;
      for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(0, 0, 32, (k * Math.PI) / 2 - 0.3, (k * Math.PI) / 2 + 0.3); g.stroke(); }
      break;
    }
    case 'rock': {
      // a friendly boulder with moss on top
      g.beginPath(); g.moveTo(-44, 34); g.lineTo(-40, -6); g.lineTo(-18, -32); g.lineTo(14, -36); g.lineTo(38, -14); g.lineTo(46, 34); g.closePath(); g.fill();
      g.fillStyle = accent; g.beginPath(); g.moveTo(-24, -26); g.quadraticCurveTo(0, -46, 30, -22); g.quadraticCurveTo(4, -28, -24, -26); g.fill();
      break;
    }
    case 'moon': {
      // a crescent moon and a star
      g.beginPath(); g.arc(-6, 4, 36, 0, Math.PI * 2); g.fill();
      g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(10, -6, 30, 0, Math.PI * 2); g.fill(); g.globalCompositeOperation = 'source-over';
      g.fillStyle = accent; star(g, 28, -24, 16, 7);
      break;
    }
    case 'pine': {
      // a pine on a hill
      g.beginPath(); g.moveTo(0, -46); g.lineTo(30, 4); g.lineTo(14, 4); g.lineTo(36, 32); g.lineTo(-36, 32); g.lineTo(-14, 4); g.lineTo(-30, 4); g.closePath(); g.fill();
      g.fillStyle = accent; g.fillRect(-6, 32, 12, 14);
      break;
    }
  }
  g.restore();
}

function star(g: G, x: number, y: number, r: number, r2: number): void {
  g.beginPath();
  for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r2 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath();
  g.fill();
}

/** The arrow board: the biome's board colour, a frame, three bold chevrons pointing left. */
function paintArrow(g: G, b: BiomeSigns, x: number, y: number, w: number, h: number): void {
  g.fillStyle = b.frame; g.fillRect(x, y, w, h);
  g.fillStyle = b.board; roundRect(g, x + 12, y + 12, w - 24, h - 24, 14); g.fill();
  const edge = b.neon ? b.frame : shade(b.board, 0.55);
  for (let k = 0; k < 3; k++) {
    const cx = x + 128 + k * 128, cy = y + h / 2;
    for (const pass of [0, 1]) {
      g.beginPath(); g.moveTo(cx + 44, cy - 84); g.lineTo(cx - 40, cy); g.lineTo(cx + 44, cy + 84);
      g.lineWidth = pass ? 40 : 54; g.lineJoin = 'miter'; g.lineCap = 'butt';
      g.strokeStyle = pass ? b.arrow : edge;
      if (b.neon && pass) { g.shadowColor = b.arrow; g.shadowBlur = 18; }
      g.stroke();
      g.shadowBlur = 0;
    }
  }
}

/** A feather flag's design (tall and narrow): a white stripe at the pole side, a picture near the top, a band. */
function paintFlag(g: G, b: BiomeSigns, k: number, x: number, y: number, w: number, h: number): void {
  const bg = b.flags[k];
  g.fillStyle = bg; g.fillRect(x, y, w, h);
  // white on a strong ground, a deep shade of it on a pale one (yellow, cream)
  const fg = b.neon ? '#ffffff' : luma(bg) > 0.7 ? shade(bg, 0.32) : '#ffffff';
  g.fillStyle = b.neon ? '#140f2e' : shade(bg, 0.7); g.fillRect(x, y, 10, h);
  if (k === 2) {
    // a chequered head
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) { g.fillStyle = (r + c) % 2 ? '#111418' : '#ffffff'; g.fillRect(x + 12 + c * 20, y + 8 + r * 20, 20, 20); }
  } else {
    const kinds: Icon[] = ['gear', 'bottle', 'gear', 'moon'];
    icon(g, kinds[k], x + w / 2 + 4, y + 50, 52, fg, b.neon ? b.flags[(k + 1) % 4] : shade(bg, 0.6));
  }
  // a long band down the middle, and a stripe near the foot
  g.fillStyle = fg; g.fillRect(x + w / 2 - 4, y + 96, 10, h - 150);
  g.fillStyle = b.neon ? b.flags[(k + 2) % 4] : shade(bg, 0.72); g.fillRect(x + 10, y + h - 44, w - 10, 16);
}

/** A banner (8:1): chequers at both ends, the words in the middle between two stars. */
function paintBanner(g: G, b: BiomeSigns, words: string, x: number, y: number, w: number, h: number): void {
  g.fillStyle = b.banner; g.fillRect(x, y, w, h);
  const sq = h / 4;
  for (const end of [x, x + w - 3 * sq]) {
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) { g.fillStyle = (r + c) % 2 ? '#111418' : '#ffffff'; g.fillRect(end + c * sq, y + r * sq, sq, sq); }
  }
  g.fillStyle = b.neon ? b.frame : shade(b.banner, 0.7);
  g.fillRect(x + 3 * sq, y, w - 6 * sq, 7); g.fillRect(x + 3 * sq, y + h - 7, w - 6 * sq, 7);
  g.fillStyle = b.neon ? b.flags[2] : '#ffd23f';
  star(g, x + 3 * sq + 40, y + h / 2, 22, 9); star(g, x + w - 3 * sq - 40, y + h / 2, 22, 9);
  text(g, words, x + w / 2, y + h / 2 + 4, w - 6 * sq - 140, 92, b.letters, DISPLAY, b.neon ? undefined : shade(b.banner, 0.5), b.neon ? b.letters : undefined);
}

/** A sponsor board (2:1): its ground, a rounded frame, its picture on the left, its name and line on the right. */
function paintBoard(g: G, b: BiomeSigns, sp: Sponsor, x: number, y: number, w: number, h: number): void {
  const neon = b.neon === true;
  const bg = neon ? '#140f2e' : sp.bg, fg = neon ? sp.neon : sp.fg;
  g.fillStyle = neon ? '#0c0920' : b.frame; g.fillRect(x, y, w, h);
  g.fillStyle = bg; roundRect(g, x + 10, y + 10, w - 20, h - 20, 18); g.fill();
  if (neon) { g.lineWidth = 7; g.strokeStyle = fg; g.shadowColor = fg; g.shadowBlur = 16; roundRect(g, x + 22, y + 22, w - 44, h - 44, 14); g.stroke(); g.shadowBlur = 0; }
  else { g.lineWidth = 6; g.strokeStyle = sp.accent; roundRect(g, x + 22, y + 22, w - 44, h - 44, 14); g.stroke(); }
  icon(g, sp.icon, x + 118, y + h / 2, 150, neon ? fg : sp.fg, neon ? '#ffe45c' : sp.accent);
  const tx = x + 118 + (w - 118) / 2 + 22, tw = w - 118 - 90;
  text(g, sp.name, tx, y + h * 0.42, tw, 68, neon ? fg : sp.fg, DISPLAY, neon ? undefined : shade(sp.bg, 0.55), neon ? fg : undefined);
  text(g, sp.line, tx, y + h * 0.72, tw, 34, neon ? '#ffffff' : sp.fg, BODY, undefined, undefined, '600');
}

/** Paint every design of a biome into `c`. */
function paint(c: HTMLCanvasElement, b: BiomeSigns): void {
  const g = c.getContext('2d');
  if (!g) return;
  g.clearRect(0, 0, SIGN_ATLAS, SIGN_ATLAS);
  g.fillStyle = '#ffffff'; g.fillRect(...LAYOUT.white);
  paintArrow(g, b, ...LAYOUT.arrow);
  LAYOUT.flags.forEach((r, k) => paintFlag(g, b, k, ...r));
  paintBanner(g, b, `FLOWKART  ${b.cup}`, ...LAYOUT.banners[0]);
  paintBanner(g, b, b.track, ...LAYOUT.banners[1]);
  LAYOUT.boards.forEach((r, k) => paintBoard(g, b, SPONSORS[b.sponsors[k]], ...r));
}

const atlases = new Map<string, Texture>();
/** A biome's sign atlas: painted once (again when the display font arrives), shared by every race on its track; a plain texture without a document (tests). */
export function signAtlas(biome: string): Texture {
  const b = BIOMES[biome] ?? BIOMES.meadow;
  let t = atlases.get(biome);
  if (t) return t;
  if (typeof document === 'undefined') t = new Texture();
  else {
    const c = document.createElement('canvas');
    c.width = c.height = SIGN_ATLAS;
    paint(c, b);
    const tex = new CanvasTexture(c);
    t = tex;
    // the words want the game's own display face: paint again once it is in (a race loads long after the title has it)
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (fonts && !fonts.check('48px "Lilita One"')) fonts.load('48px "Lilita One"').then(() => { paint(c, b); tex.needsUpdate = true; }, () => {});
  }
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  t.userData.shared = true;
  atlases.set(biome, t);
  return t;
}

/** A CSS colour as linear RGB. */
function lin(hex: string): Rgb3 {
  const c = new Color(hex);
  return [c.r, c.g, c.b];
}

/** The old little corner signs the race dressing takes the place of (art-pipeline dressing.ts `chevronSign`). */
export const OLD_CORNER_SIGNS: readonly string[] = Object.freeze(['harbour-sign', 'meadow-sign', 'canyon-sign', 'frost-sign']);

/** A biome's race dressing kit (track-builder raceDressing.ts places it), or undefined for an unknown biome. */
export function signKit(biome: string | undefined): RaceDressingKit | undefined {
  const b = biome ? BIOMES[biome] : undefined;
  if (!b) return undefined;
  const w = LAYOUT.white;
  return {
    atlas: signAtlas(biome!),
    white: [(w[0] + w[2] / 2) / SIGN_ATLAS, 1 - (w[1] + w[3] / 2) / SIGN_ATLAS],
    arrow: cell(LAYOUT.arrow),
    boards: LAYOUT.boards.map((r) => cell(r)),
    flags: LAYOUT.flags.map((r) => cell(r)),
    banners: LAYOUT.banners.map((r) => cell(r, 1)),
    post: lin(b.post),
    frame: lin(b.frame),
    face: b.neon ? 1.6 : 1,
    replaces: OLD_CORNER_SIGNS,
  };
}

/** For the checks: each biome's words (the track's name, its cup, its sponsors' names and lines). */
export function signWords(biome: string): string[] {
  const b = BIOMES[biome];
  if (!b) return [];
  return [b.track, b.cup, 'FLOWKART', ...b.sponsors.flatMap((k) => [SPONSORS[k].name, SPONSORS[k].line])];
}
