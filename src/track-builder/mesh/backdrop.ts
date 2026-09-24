// The far horizon (critique 2026-09-23: "a flat plane meeting the sky in a ruler-straight line"):
// two rings of distant silhouettes per biome, rolling hills, mesas, snowy peaks, headlands, a lit
// city across the bay, towers of cloud. The ring rides with the camera like the sky dome (main.ts
// moves it), so it always stands at the same distance and never crowds a road near the track's
// edge. Unlit, pre-hazed toward the horizon colour (aerial perspective), no fog, one or two draws.
import {
  BufferGeometry, Color, DataTexture, DoubleSide, Float32BufferAttribute, Group, LinearFilter, LinearMipmapLinearFilter,
  Mesh, MeshBasicMaterial, RepeatWrapping, RGBAFormat, SRGBColorSpace,
} from 'three';
import type { Rgb } from './palette.ts';

const TAU = Math.PI * 2;
/** Segments round a ring. */
const SEG = 360;

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
  /** optional colour by absolute height above the base (snow caps, rock bands) */
  band?: (h: number, k: number) => Rgb | null;
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
    case 'meadow': return [
      { radius: 760, profile: hills(52, 26, 11), foot: hex('#6f9a86'), top: hex('#8fb3a0'), haze: 0.55 },
      { radius: 640, profile: hills(22, 16, 7), foot: hex('#4f8a3a'), top: hex('#86c25a'), haze: 0.3 },
    ];
    case 'canyon': return [
      { radius: 760, profile: peaks(14, 40, 95, 5, 10), foot: hex('#c98a6a'), top: hex('#e0a27c'), haze: 0.5 },
      { radius: 640, profile: mesas(16, 30, 75, 3), foot: hex('#a8462a'), top: hex('#e27f4e'), haze: 0.25,
        band: (h) => (Math.floor(h / 9) % 2 ? hex('#f0b48a') : null) },
    ];
    case 'frost': return [
      { radius: 770, profile: peaks(18, 90, 170, 9, 20), foot: hex('#7f93b8'), top: hex('#eef4ff'), haze: 0.5,
        band: (_h, k) => (k > 0.55 ? hex('#f6f9ff') : null) },
      { radius: 650, profile: peaks(22, 40, 95, 4, 10), foot: hex('#5e6f8f'), top: hex('#ffffff'), haze: 0.28,
        band: (_h, k) => (k > 0.5 ? hex('#fbfdff') : null) },
    ];
    case 'harbour': return [
      { radius: 780, profile: hills(16, 12, 21), foot: hex('#8fb0a8'), top: hex('#a9c7b8'), haze: 0.6 },
      { radius: 640, profile: islands(7, 18, 46, 13), foot: hex('#c9b48a'), top: hex('#5f9f44'), haze: 0.3 },
    ];
    case 'skyline': return [
      // heaped cumulus: lavender-shadowed feet, sunlit white tops (not a smooth cream bank that reads as dunes)
      { radius: 760, profile: puffs(90, 14, 60, 760, 17, 10), foot: hex('#b9a6e0'), top: hex('#fff4ec'), haze: 0.4 },
      { radius: 640, profile: puffs(70, 10, 48, 640, 19, 4), foot: hex('#c8b4ea'), top: hex('#ffffff'), haze: 0.18 },
    ];
    default: return [];
  }
}

function strip(layer: Layer, baseY: number, horizon: Rgb, out: { pos: number[]; col: number[]; idx: number[] }): void {
  const rows = 6;
  const start = out.pos.length / 3;
  for (let i = 0; i <= SEG; i++) {
    const a = (i / SEG) * TAU;
    const h = layer.profile(a % TAU);
    const cx = Math.cos(a) * layer.radius, cz = Math.sin(a) * layer.radius;
    for (let j = 0; j <= rows; j++) {
      const k = j / rows, y = h * k;
      let c = mixRgb(layer.foot, layer.top, k);
      const b = layer.band?.(y, h > 0 ? y / Math.max(h, 1) : 0);
      if (b) c = b;
      c = mixRgb(c, horizon, layer.haze + (1 - k) * 0.15);
      out.pos.push(cx, baseY + (j === 0 ? -30 : y), cz);
      out.col.push(c[0], c[1], c[2]);
    }
  }
  const per = rows + 1;
  for (let i = 0; i < SEG; i++) {
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
  return m;
}

/**
 * The horizon for a biome, centred on the origin: the caller moves the group with the camera
 * (x and z only). `baseY` is the ground or sea level, `horizon` the colour the far layers fade to.
 */
export function buildBackdrop(biome: string, baseY: number, horizon: Rgb): Group | null {
  const layers = layersFor(biome);
  const group = new Group();
  group.name = 'horizon';
  if (layers.length) {
    const out = { pos: [] as number[], col: [] as number[], idx: [] as number[] };
    for (const l of layers) strip(l, baseY, horizon, out);
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(out.pos, 3));
    g.setAttribute('color', new Float32BufferAttribute(out.col, 3));
    g.setIndex(out.idx);
    const m = new Mesh(g, new MeshBasicMaterial({ vertexColors: true, side: DoubleSide, fog: false }));
    m.name = 'horizon-rings';
    group.add(m);
  }
  if (biome === 'boardwalk') group.add(cityMesh(baseY));
  if (!group.children.length) return null;
  for (const c of group.children) { (c as Mesh).frustumCulled = false; c.renderOrder = -1; }
  return group;
}
