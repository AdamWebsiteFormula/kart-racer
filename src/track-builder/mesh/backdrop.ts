// The far horizon (critique 2026-09-23: "a flat plane meeting the sky in a ruler-straight line"):
// two rings of distant silhouettes per biome (three on the meadow: a tree line in front), rolling
// hills, mesas, snowy peaks, headlands, a lit city across the bay (the sky road's clouds are its sky
// painting's own). The ring rides with the camera like the sky dome (main.ts moves it), so it always
// stands at the same distance and never crowds a road near the track's edge. Unlit, pre-hazed toward
// the horizon colour (aerial perspective), no fog, one or two draws.
// Each flank is baked lit or shaded by where the sun stands (detail review 2026-09-24: flat
// cut-outs), and a Final Lap Shift recolours the ring for the new sky (recolourBackdrop).
import {
  BufferGeometry, Color, DataTexture, DoubleSide, Float32BufferAttribute, Group, LinearFilter, LinearMipmapLinearFilter,
  Mesh, MeshBasicMaterial, RepeatWrapping, RGBAFormat, SRGBColorSpace, type Object3D,
} from 'three';
import type { Rgb } from './palette.ts';

const TAU = Math.PI * 2;
/** Segments round a ring. */
const SEG = 360;
/** Extra haze at a layer's foot (mist lying in the valleys), fading out up the layer. */
const FOOT_HAZE = 0.15;

/** A height profile round the ring (metres above the base) for angle a (radians). */
type Profile = (a: number) => number;

interface Layer {
  radius: number;
  profile: Profile;
  /** colour at the foot and at the top (a snow line or strata come from `band`) */
  foot: Rgb;
  top: Rgb;
  /** how far toward the horizon colour this layer is pushed (0 none, 1 all haze) */
  haze: number;
  /** extra haze at the foot, fading out up the layer (default FOOT_HAZE); a layer whose foot must meet the ground's own colour has little */
  footHaze?: number;
  /** the colour a flank turned from the sun leans to (cool: blue snow, violet rock) */
  shade: Rgb;
  /** optional colour by absolute height above the base (snow caps, rock bands) */
  band?: (h: number, k: number) => Rgb | null;
  /** columns round the ring and rows up each (defaults SEG and 6): a detailed range needs more */
  seg?: number;
  rows?: number;
  /** the snow line (0 foot → 1 top) at angle a: half the rows fall under it and half over, two of them on it, so it is a crisp edge */
  snowline?: (a: number) => number;
  /** a colour by angle, height fraction, height and the ring's slope there (metres up per metre along): rock faces, ribs, forest */
  paint?: (a: number, k: number, h: number, slope: number) => Rgb | null;
}

/** A seeded random for layouts that are the same every load. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0x100000000; };
}

const wrapA = (a: number) => { let d = a % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

/** Rolling hills: a few slow waves. */
const hills = (base: number, amp: number, seed: number): Profile => {
  const r = rng(seed), p = [r() * TAU, r() * TAU, r() * TAU];
  return (a) => Math.max(2, base + amp * (0.55 * Math.sin(3 * a + p[0]) + 0.3 * Math.sin(7 * a + p[1]) + 0.15 * Math.sin(13 * a + p[2])));
};

/** A seeded wobble in [0, 1] round the ring, `freq` bumps a turn: a sum of three sines. */
const wobble = (freq: number, seed: number): Profile => {
  const r = rng(seed), p = [r() * TAU, r() * TAU, r() * TAU];
  return (a) => 0.5 + 0.25 * Math.sin(freq * a + p[0]) + 0.15 * Math.sin(freq * 2.3 * a + p[1]) + 0.1 * Math.sin(freq * 5.1 * a + p[2]);
};

/** Ridges and gullies on a range: its crest line broken by small jagged peaks, more of them the higher it stands. */
const rugged = (profile: Profile, amp: number, freq: number, seed: number, floor: number): Profile => {
  const w = wobble(freq, seed), v = wobble(freq * 3.7, seed + 1);
  return (a) => {
    const h = profile(a);
    if (h <= floor) return h;
    return h + amp * (w(a) + 0.5 * v(a) - 0.75) * Math.min(1, (h - floor) / 30);
  };
};

/** Sharp peaks: triangles of random width and height, the tallest wins. */
const peaks = (count: number, minH: number, maxH: number, seed: number, floor = 6): Profile => {
  const r = rng(seed);
  const list = Array.from({ length: count }, () => ({ at: r() * TAU, w: 0.08 + r() * 0.16, h: minH + r() * (maxH - minH) }));
  return (a) => {
    let h = floor;
    for (const p of list) { const d = Math.abs(wrapA(a - p.at)) / p.w; if (d < 1) h = Math.max(h, p.h * (1 - d) + floor * d); }
    return h;
  };
};

/** Mesas and buttes: flat tops, near-sheer sides. */
const mesas = (count: number, minH: number, maxH: number, seed: number, floor = 3): Profile => {
  const r = rng(seed);
  const list = Array.from({ length: count }, () => ({ at: r() * TAU, w: 0.03 + r() * 0.1, h: minH + r() * (maxH - minH) }));
  return (a) => {
    let h = floor;
    for (const p of list) { const d = Math.abs(wrapA(a - p.at)) / p.w; if (d < 1) h = Math.max(h, p.h * Math.min(1, (1 - d) * 6)); }
    return h;
  };
};

/** Cumulus: many round puffs of every size, heaped on a low bank (a cloud sea's billows, not dunes). */
const puffs = (count: number, minR: number, maxR: number, radius: number, seed: number, bank = 6): Profile => {
  const r = rng(seed);
  const list = Array.from({ length: count }, () => { const pr = minR + r() * r() * (maxR - minR); return { at: r() * TAU, pr, w: pr / radius, lift: r() * pr * 0.4 }; });
  return (a) => {
    let h = bank;
    for (const p of list) { const d = Math.abs(wrapA(a - p.at)) / p.w; if (d < 1) h = Math.max(h, p.lift + p.pr * Math.sqrt(1 - d * d)); }
    return h;
  };
};

/** Islands and headlands: smooth humps with open sea between (0 = under the water line). */
const islands = (count: number, minH: number, maxH: number, seed: number): Profile => {
  const r = rng(seed);
  const list = Array.from({ length: count }, () => ({ at: r() * TAU, w: 0.1 + r() * 0.25, h: minH + r() * (maxH - minH) }));
  return (a) => {
    let h = 0;
    for (const p of list) { const d = Math.abs(wrapA(a - p.at)) / p.w; if (d < 1) h = Math.max(h, p.h * Math.cos(d * Math.PI / 2) ** 0.7); }
    return h;
  };
};

/** City blocks: stepped towers over part of the ring, low elsewhere. */
const city = (from: number, to: number, seed: number): Profile => {
  const r = rng(seed);
  const blocks: { a0: number; a1: number; h: number }[] = [];
  for (let a = from; a < to;) { const w = 0.012 + r() * 0.03; blocks.push({ a0: a, a1: a + w, h: 14 + r() * r() * 70 }); a += w + r() * 0.006; }
  return (a) => {
    for (const b of blocks) if (a >= b.a0 && a < b.a1) return b.h;
    return 0;
  };
};

const mixRgb = (a: Rgb, b: Rgb, k: number): Rgb => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const hex = (h: string): Rgb => { const c = new Color(h); return [c.r, c.g, c.b]; };

/** The rings for a biome (none for an unknown one). */
function layersFor(biome: string): Layer[] {
  switch (biome) {
    // detail review 5: the bright lawn ended in a ruler-straight line under a pale, washed-out hill ring.
    // Now the near hills keep their green down to a foot the colour of the fogged lawn out there, and a
    // low line of hedgerow trees at 420 m hides where the lawn ends (the far hills stay hazed)
    case 'meadow': return [
      { radius: 760, profile: hills(52, 26, 11), foot: hex('#6f9a86'), top: hex('#8fb3a0'), haze: 0.5, shade: hex('#5f7f96') },
      { radius: 640, profile: hills(22, 16, 7), foot: hex('#5f9c3e'), top: hex('#86c25a'), haze: 0.12, footHaze: 0.2, shade: hex('#3f6a5a') },
      { radius: 420, profile: puffs(170, 3, 8, 420, 23, 3), foot: hex('#2f6a2c'), top: hex('#4f9a3c'), haze: 0.1, footHaze: 0.05, shade: hex('#24503a') },
    ];
    case 'canyon': return [
      { radius: 760, profile: peaks(14, 40, 95, 5, 10), foot: hex('#c98a6a'), top: hex('#e0a27c'), haze: 0.5, shade: hex('#8a6a9a') },
      { radius: 640, profile: mesas(16, 30, 75, 3), foot: hex('#a8462a'), top: hex('#e27f4e'), haze: 0.25, shade: hex('#7a3a52'),
        band: (h) => (Math.floor(h / 9) % 2 ? hex('#f0b48a') : null) },
    ];
    // detail review (24 Sept 2026: "plain white cones"): three ranges, bluer with distance. Far, pale
    // blue peaks under a high snow line; the main range, rugged, grey-blue rock faces with a jagged snow
    // line, rock ribs down its steep snow and snow gullies down its rock; near, dark forested foothills
    // with snowy tops
    case 'frost': {
      const farSnow = wobble(9, 41), midSnow = wobble(13, 43), ribs = wobble(70, 47), gully = wobble(55, 53), nearSnow = wobble(17, 59), trees = wobble(90, 61);
      const ROCK = hex('#62729a'), ROCK_DEEP = hex('#46557c'), SNOW = hex('#fbfdff'), SNOW_BLUE = hex('#dfe9fb');
      return [
        { radius: 800, profile: rugged(peaks(20, 110, 190, 9, 25), 14, 23, 71, 30), foot: hex('#9aaed6'), top: hex('#eef4ff'), haze: 0.5, shade: hex('#8ea4dc'),
          seg: 540, rows: 8, snowline: (a) => 0.5 + 0.22 * farSnow(a),
          paint: (a, k) => (k >= 0.5 + 0.22 * farSnow(a) ? hex('#f3f7ff') : mixRgb(hex('#7a90c2'), hex('#9aaed8'), k)) },
        { radius: 690, profile: rugged(peaks(24, 60, 135, 4, 12), 12, 31, 73, 16), foot: hex('#5f6f92'), top: hex('#ffffff'), haze: 0.2, shade: hex('#6a80c0'),
          seg: 900, rows: 10, snowline: (a) => 0.6 + 0.26 * midSnow(a),
          paint: (a, k, _h, slope) => {
            const line = 0.6 + 0.26 * midSnow(a);
            if (k >= line) return slope > 0.7 && ribs(a) > 0.6 && k < 0.94 ? ROCK : k > 0.9 || ribs(a) < 0.5 ? SNOW : SNOW_BLUE;
            // gullies of snow run down the rock
            if (gully(a) > 0.7 && k > line * 0.45) return SNOW_BLUE;
            return mixRgb(ROCK_DEEP, ROCK, k / Math.max(0.01, line));
          } },
        { radius: 580, profile: rugged(peaks(30, 22, 58, 17, 5), 5, 47, 79, 8), foot: hex('#2a4f4a'), top: hex('#3f6d5c'), haze: 0.16, footHaze: 0.2, shade: hex('#34507a'),
          seg: 540, rows: 8, snowline: (a) => 0.7 + 0.2 * nearSnow(a),
          paint: (a, k) => (k >= 0.7 + 0.2 * nearSnow(a) ? SNOW : trees(a) > 0.62 ? hex('#3b6e5a') : mixRgb(hex('#24463f'), hex('#2f5d4f'), k)) },
      ];
    }
    case 'harbour': return [
      { radius: 780, profile: hills(16, 12, 21), foot: hex('#8fb0a8'), top: hex('#a9c7b8'), haze: 0.6, shade: hex('#7f98a8') },
      { radius: 640, profile: islands(7, 18, 46, 13), foot: hex('#c9b48a'), top: hex('#5f9f44'), haze: 0.3, shade: hex('#4a6f5a') },
    ];
    // no ring: the sky's own painted cloud sea runs on under its horizon (sky.ts panoHorizon), and
    // flat cut-out puffs in front of it read as cardboard (detail review 2026-09-24)
    case 'skyline': return [];
    default: return [];
  }
}

/** How much a flank square to the sun brightens (the one turned away leans SHADE_LEAN times that toward its shade colour). */
export const FLANK_LIGHT = 0.2;
/** How much the ring's face brightens opposite the sun, where it is lit head-on (toward the sun it is backlit). */
export const FACE_LIGHT = 0.08;
/** A shaded flank leans this many times its shade toward the layer's shade colour (a toon split, not a soft falloff). */
export const SHADE_LEAN = 3;
/** The rise over ±1° of ring that counts as a full flank (metres): hills and domes turn gently, peaks and mesas fully. */
const FLANK_RISE = 2;

/**
 * Sun and shade on a column of the ring at angle `a` for a sun at azimuth `sunAz` (both measured
 * as atan2(z, x)): + lit, − shaded. A flank rising with `a` faces back along the ring, so it is lit
 * when the sun stands on that side (sin(a − sunAz) > 0); a falling flank the other way.
 */
export function flankLight(profile: Profile, a: number, sunAz: number): number {
  const e = TAU / SEG;
  const rise = profile((a + e) % TAU) - profile((a - e + TAU) % TAU);
  const flank = Math.max(-1, Math.min(1, rise / FLANK_RISE));
  return FLANK_LIGHT * flank * Math.sin(a - sunAz) - FACE_LIGHT * Math.cos(a - sunAz);
}

/** Row j's height fraction when half the rows lie under the snow line `line` and half over, two a hair either side of it. */
export function snowRow(j: number, rows: number, line: number): number {
  const under = Math.floor(rows / 2), d = 0.004, l = Math.min(0.97, Math.max(0.03, line));
  return j <= under ? (l - d) * (j / under) : l + d + (1 - l - d) * ((j - under - 1) / (rows - under - 1));
}

interface RingBuild { pos: number[]; col: number[]; idx: number[]; base: number[]; haze: number[] }

function strip(layer: Layer, baseY: number, horizon: Rgb, sunAz: number, out: RingBuild): void {
  const rows = layer.rows ?? 6, seg = layer.seg ?? SEG, e = TAU / seg;
  const start = out.pos.length / 3;
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * TAU;
    const h = layer.profile(a % TAU);
    const slope = Math.abs(layer.profile((a + e) % TAU) - layer.profile((a - e + TAU) % TAU)) / (2 * e * layer.radius);
    const snow = layer.snowline?.(a % TAU);
    const cx = Math.cos(a) * layer.radius, cz = Math.sin(a) * layer.radius;
    const lit = flankLight(layer.profile, a % TAU, sunAz);
    for (let j = 0; j <= rows; j++) {
      const k = snow === undefined ? j / rows : snowRow(j, rows, snow), y = h * k;
      let c = mixRgb(layer.foot, layer.top, k);
      const b = layer.paint?.(a % TAU, k, h, slope) ?? layer.band?.(y, h > 0 ? y / Math.max(h, 1) : 0);
      if (b) c = b;
      // never past white: the bloom picks out only what is brighter than 1
      c = lit >= 0 ? [Math.min(1, c[0] * (1 + lit)), Math.min(1, c[1] * (1 + lit)), Math.min(1, c[2] * (1 + lit))] : mixRgb(c, layer.shade, Math.min(1, -SHADE_LEAN * lit));
      const w = layer.haze + (1 - k) * (layer.footHaze ?? FOOT_HAZE);
      out.base.push(c[0], c[1], c[2]);
      out.haze.push(w);
      c = mixRgb(c, horizon, w);
      out.pos.push(cx, baseY + (j === 0 ? -30 : y), cz);
      out.col.push(c[0], c[1], c[2]);
    }
  }
  const per = rows + 1;
  for (let i = 0; i < seg; i++) {
    for (let j = 0; j < rows; j++) {
      const a = start + i * per + j, b = a + per;
      out.idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
}

/** Dark towers with lit windows (warm, cyan, magenta), the texture tiled round the city. */
function windowTexture(): DataTexture {
  const W = 32, H = 64, data = new Uint8Array(W * H * 4);
  const r = rng(77);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4;
      const cell = (x % 4 === 1 || x % 4 === 2) && y % 4 === 1;
      let c: Rgb = [0.07, 0.06, 0.16];
      if (cell) {
        const k = r();
        c = k < 0.45 ? [1, 0.82, 0.45] : k < 0.6 ? [0.3, 0.95, 1] : k < 0.7 ? [1, 0.35, 0.8] : [0.1, 0.09, 0.2];
      }
      data[o] = c[0] * 255; data[o + 1] = c[1] * 255; data[o + 2] = c[2] * 255; data[o + 3] = 255;
    }
  }
  const t = new DataTexture(data, W, H, RGBAFormat);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  t.magFilter = LinearFilter; t.minFilter = LinearMipmapLinearFilter; t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

/** The night city across the bay: a band of towers over a third of the ring, windows lit. */
function cityMesh(baseY: number): Mesh {
  const prof = city(0.6, 2.9, 31), R = 700;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const N = 900;
  for (let i = 0; i <= N; i++) {
    const a = 0.6 + (i / N) * 2.3, h = prof(a);
    const cx = Math.cos(a) * R, cz = Math.sin(a) * R;
    for (const [y, v] of [[-30, -30 / 4], [h, h / 4]] as const) { pos.push(cx, baseY + y, cz); uv.push((a * R) / 16, v / 16); }
  }
  for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  // brighter than white where the windows are lit, so the bloom picks them out
  const m = new Mesh(g, new MeshBasicMaterial({ map: windowTexture(), color: new Color(1.6, 1.6, 1.6), side: DoubleSide, fog: false }));
  m.name = 'horizon-city';
  m.userData.ownMap = true; // the window texture is this mesh's alone: the scene frees it with the mesh
  return m;
}

/**
 * The horizon for a biome, centred on the origin: the caller moves the group with the camera
 * (x and z only). `baseY` is the ground or sea level, `horizon` the colour the far layers fade to,
 * `sunAz` the sun's compass direction as atan2(z, x).
 */
export function buildBackdrop(biome: string, baseY: number, horizon: Rgb, sunAz: number): Group | null {
  const layers = layersFor(biome);
  const group = new Group();
  group.name = 'horizon';
  if (layers.length) {
    const out: RingBuild = { pos: [], col: [], idx: [], base: [], haze: [] };
    for (const l of layers) strip(l, baseY, horizon, sunAz, out);
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(out.pos, 3));
    g.setAttribute('color', new Float32BufferAttribute(out.col, 3));
    g.setIndex(out.idx);
    const m = new Mesh(g, new MeshBasicMaterial({ vertexColors: true, side: DoubleSide, fog: false }));
    m.name = 'horizon-rings';
    // what recolourBackdrop needs: each vertex's own colour before the haze, and how hazed it is
    m.userData.base = new Float32Array(out.base);
    m.userData.haze = new Float32Array(out.haze);
    m.userData.horizon = horizon;
    group.add(m);
  }
  if (biome === 'boardwalk') group.add(cityMesh(baseY));
  if (!group.children.length) return null;
  for (const c of group.children) { (c as Mesh).frustumCulled = false; c.renderOrder = -1; }
  return group;
}

/**
 * Recolour the rings for another sky (a Final Lap Shift): each vertex's own colour times `tint`
 * (how the new sky's light compares with the old, sky.ts skyIllum), hazed toward the new horizon.
 */
export function recolourBackdrop(group: Object3D | undefined, horizon: Rgb, tint: Rgb): void {
  const m = group?.getObjectByName('horizon-rings') as Mesh | undefined;
  const base = m?.userData.base as Float32Array | undefined, haze = m?.userData.haze as Float32Array | undefined;
  if (!m || !base || !haze) return;
  const col = m.geometry.getAttribute('color');
  const arr = col.array as Float32Array;
  for (let v = 0; v < haze.length; v++) {
    const w = haze[v], o = v * 3;
    for (let c = 0; c < 3; c++) arr[o + c] = Math.min(1, base[o + c] * tint[c]) * (1 - w) + horizon[c] * w;
  }
  col.needsUpdate = true;
}
