// What stands on each land track's edge (27 Sept 2026; fresh-eyes review item 1: "the road runs through an
// empty lawn"; Adam, 26 Sept: "the game feels very cheap"): the kits track-builder mesh/edge.ts lays just
// past the invisible course limit, and the cover it scatters on the drivable land inside it. Studied on
// Mario Kart World's open-country courses, never copied: Moo Moo Meadows (youtube.com/watch?v=AFN7RL6qEZI
// 0:25 a grass bank rising left of the road, 0:40 a bank with a wooden fence on its crest, 0:70 flowers
// speckling the grass by a rail, 0:85 hay bales and pines behind the fence); Desert Hills (jBK-cunGXlk 0:20
// a grass-topped dune bank, 0:35 sand banks both sides, 1:50 dunes and rope posts); DK Pass (Il2hmsFCM88
// 0:35 snowbanks rising from the road, a fence on top, pines in clumps behind); Koopa Troopa Beach
// (0k8peno6iPU 0:55 grass and sand, huts, boards) and Peach Beach (RaWZdSiAQdo 0:40 sea walls and
// planters). Ours, in each biome's own palette: hedgerows, banks and post-and-rail fences with oaks and hay
// on the farm; dunes, ranch fences, rock outcrops and cacti in the desert; snowbanks, snow fences and pines
// on the mountain; a sea wall, beach huts, planters and a picket fence by the harbor. Every model is
// code-built, vertex-coloured and a few dozen triangles (they are merged into the track's dressing: no new
// draw), and G-rated; no Nintendo look-alikes.
import { Color } from 'three';
import type { ModelBuilder, Paint } from './model.ts';
import type { EdgeKit, EdgeProfile, Rgb3 } from '../track-builder/mesh/edge.ts';

type Build = (m: ModelBuilder) => void;

/** A CSS colour as linear RGB (a sweep's vertex colours). */
function lin(hex: string): Rgb3 {
  const c = new Color(hex);
  return [c.r, c.g, c.b];
}

const WHITE = '#fffaf0', CORAL = '#ff6f61', TEAL = '#2ec4b6', SUN = '#ffd23f', SKY = '#7fc8ff', PINK = '#ff8fb8';
const LEAF = ['#5aae42', '#68bd4b', '#4a9a3a'] as const, HAY = '#e6c46b', HAY_DARK = '#c9a13f';
const ROCK = ['#c8553d', '#d9734f', '#b8452f'] as const, SNOW = '#fbfdff', SNOW_SHADE = '#e3edf8', FIR = ['#1f5c45', '#2f7a5b'] as const;

/** A lawn's little flowers, heads just over the grass (lawn daisies stand a few centimetres tall): a patch about 2.4 m across. */
function patch(m: ModelBuilder, colours: readonly Paint[], heads: number, seed: number): void {
  for (let k = 0; k < heads; k++) {
    const a = k * 2.399 + seed, r = 0.25 + 1.0 * Math.sqrt((k + 0.5) / heads);
    const x = Math.cos(a) * r, z = Math.sin(a) * r * 0.8, y = 0.035 + ((k * 7 + seed * 3) % 5) * 0.016;
    m.cone(0.12, 0.06, colours[k % colours.length], [x, y, z], [0, a, 0], 5, false);
  }
}

/** Blades of grass leaning out from a clump (cone 3: six triangles each). */
function blades(m: ModelBuilder, colours: readonly Paint[], n: number, h: number, spread: number): void {
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + (k % 2) * 0.5, lean = 0.2 + (k % 3) * 0.12, hh = h * (0.75 + ((k * 5) % 4) * 0.1);
    const cx = Math.cos(a), cz = Math.sin(a), up = hh / 2;
    m.cone(0.06, hh, colours[k % colours.length], [cx * (spread + Math.sin(lean) * up), Math.cos(lean) * up, cz * (spread + Math.sin(lean) * up)], [lean * cz, 0, -lean * cx], 3, false);
  }
}

/** A beach hut facing the road (its door at local -X): a painted body with white boards down its front, a white roof, a door. */
function hut(m: ModelBuilder, body: Paint, door: Paint): void {
  m.box([1.8, 2.1, 1.7], body, [0, 1.05, 0], undefined, false);
  for (const z of [-0.62, 0.62]) m.box([0.05, 2.1, 0.2], WHITE, [-0.92, 1.05, z], undefined, false);
  m.cone(1.5, 1.0, WHITE, [0, 2.6, 0], [0, Math.PI / 4, 0], 4, false);
  m.box([0.06, 1.45, 0.72], door, [-0.92, 0.8, 0], undefined, false);
}

/** A leafy clump of wildflowers, heads open on top, a little taller than the grass (drive-through; 42 triangles). */
function wildflowers(m: ModelBuilder, heads: readonly Paint[], seed: number): void {
  m.cone(0.3, 0.36, LEAF[seed % 3], [0, 0.18, 0], [0, seed, 0], 5, false);
  for (let k = 0; k < 4; k++) {
    const a = k * 1.9 + seed, r = 0.1 + 0.08 * (k % 2), y = 0.3 + ((k * 3 + seed) % 3) * 0.05;
    m.cone(0.12, 0.07, heads[k % heads.length], [Math.cos(a) * r, y, Math.sin(a) * r], [0, a, 0], 5, false);
  }
}

export const EDGE_MODELS: Record<string, { build: Build }> = {
  // ================================================================ Windmill Run: the farm
  // a hedgerow oak: a round crown on a short trunk (it rises out of the hedge and the banks)
  'edge-oak': {
    build: (m) => {
      m.cyl(0.26, 0.36, 2.6, '#6b4a2b', [0, 1.3, 0], undefined, 5, false);
      m.ball([2.0, 1.6, 2.0], LEAF[1], [0, 3.8, 0], undefined, 6, false);
      m.ball([1.3, 1.1, 1.3], LEAF[2], [0.9, 4.3, 0.5], undefined, 5, false);
      m.ball([1.2, 1.0, 1.2], '#6fc458', [-0.8, 4.6, -0.4], undefined, 5, false);
    },
  },
  // a tall poplar, for a skyline of trees along the fields
  'edge-poplar': {
    build: (m) => {
      m.cyl(0.18, 0.26, 1.6, '#6b4a2b', [0, 0.8, 0], undefined, 4, false);
      m.ball([0.95, 2.8, 0.95], LEAF[0], [0, 3.8, 0], undefined, 6, false);
      m.ball([0.6, 1.2, 0.6], '#5fb24a', [0.15, 5.9, 0.1], undefined, 5, false);
    },
  },
  // square hay bales, two stacked and one beside
  'edge-bales': {
    build: (m) => {
      m.box([1.2, 0.7, 0.9], HAY, [0, 0.35, 0], [0, 0.1, 0], false);
      m.box([1.2, 0.7, 0.9], HAY_DARK, [0.1, 1.05, 0.05], [0, -0.15, 0], false);
      m.box([1.2, 0.7, 0.9], HAY, [0.2, 0.35, 1.05], [0, 0.25, 0], false);
    },
  },
  // a five-bar farm gate between two posts, 3.6 m along Z
  'edge-gate': {
    build: (m) => {
      for (const z of [-1.8, 1.8]) m.box([0.2, 1.5, 0.2], '#8a6a4a', [0, 0.75, z], undefined, false);
      for (const y of [0.35, 0.75, 1.15]) m.box([0.08, 0.12, 3.4], WHITE, [0, y, 0], undefined, false);
      m.box([0.08, 0.12, 3.8], WHITE, [0, 0.75, 0], [0.33, 0, 0], false);
    },
  },
  // a round field bush for the clusters
  'edge-bush': {
    build: (m) => {
      m.ball([1.1, 0.8, 1.0], LEAF[0], [0, 0.62, 0], undefined, 6, false);
      m.ball([0.7, 0.6, 0.7], '#62b84c', [0.6, 0.75, 0.3], undefined, 5, false);
    },
  },
  // the lawn's cover: daisies, buttercups, clover, and long grass by the limit (under a kart's wheels: drive-through)
  'edge-daisies': { build: (m) => patch(m, [WHITE, WHITE, SUN], 7, 0.3) },
  'edge-buttercups': { build: (m) => patch(m, [SUN, '#ffe66b', SUN], 7, 1.7) },
  'edge-clover': { build: (m) => patch(m, [PINK, '#c893e8', WHITE], 7, 2.9) },
  'edge-longgrass': { build: (m) => blades(m, ['#4e9a3a', '#6db34f', '#3f8a34'], 5, 0.75, 0.12) },
  'edge-wildflowers': { build: (m) => wildflowers(m, [PINK, '#b98ae8', WHITE, '#ff5e8a'], 0) },
  'edge-poppies': { build: (m) => wildflowers(m, ['#ff4d3d', SUN, '#ff8a3d', WHITE], 1) },

  // ================================================================ Lighthouse Loop: the harbor
  'edge-hut-coral': { build: (m) => hut(m, '#ff7a6b', TEAL) },
  'edge-hut-teal': { build: (m) => hut(m, '#3fd6c6', CORAL) },
  'edge-hut-sun': { build: (m) => hut(m, '#ffd84a', SKY) },
  'edge-hut-sky': { build: (m) => hut(m, '#8fd0ff', CORAL) },
  // a painted wooden flower box, brimming, 2.2 m along Z
  'edge-planter': {
    build: (m) => {
      m.box([0.85, 0.6, 2.2], TEAL, [0, 0.3, 0], undefined, false);
      m.box([0.9, 0.1, 2.26], WHITE, [0, 0.62, 0], undefined, false);
      const f: [number, Paint][] = [[-0.75, CORAL], [-0.25, '#ff9ec4'], [0.25, SUN], [0.75, CORAL]];
      for (const [z, c] of f) m.ball([0.34, 0.26, 0.34], c, [0, 0.82, z], undefined, 5, false);
      m.ball([0.3, 0.2, 0.9], LEAF[1], [0, 0.7, 0], undefined, 5, false);
    },
  },
  // a stone sea wall, 4 m along Z: courses of pale dressed blocks under a white coping
  'edge-seawall': {
    build: (m) => {
      m.box([1.0, 1.05, 4.0], '#eadcbc', [0, 0.52, 0], undefined, false);
      m.box([1.2, 0.16, 4.04], '#fbf6ea', [0, 1.12, 0], undefined, false);
      for (const [z, y, w] of [[-1.25, 0.25, 1.3], [0.45, 0.25, 1.7], [-0.5, 0.7, 1.5], [1.3, 0.7, 1.2]] as const) m.box([1.03, 0.36, w], '#d8c49c', [0, y, z], undefined, false);
    },
  },
  // a rope line on short posts along the dunes, 4 m along Z
  'edge-ropefence': {
    build: (m) => {
      for (const z of [-1.95, 1.95]) m.cyl(0.09, 0.11, 1.0, '#a0703c', [0, 0.5, z], undefined, 5, false);
      const sag: [number, number][] = [[-1.95, 0.85], [-0.7, 0.66], [0.7, 0.66], [1.95, 0.85]];
      for (let k = 0; k < 3; k++) {
        const [z0, y0] = sag[k], [z1, y1] = sag[k + 1], dz = z1 - z0, dy = y1 - y0;
        m.cyl(0.035, 0.035, Math.hypot(dz, dy) + 0.04, '#efe0b0', [0, (y0 + y1) / 2, (z0 + z1) / 2], [Math.atan2(dz, dy), 0, 0], 4, false);
      }
    },
  },
  // a white picket fence, 4 m along Z
  'edge-picket': {
    build: (m) => {
      for (let k = 0; k < 6; k++) m.box([0.06, 0.95, 0.1], WHITE, [0, 0.47, -1.7 + k * 0.68], undefined, false);
      for (const y of [0.3, 0.72]) m.box([0.05, 0.08, 4.0], WHITE, [0.05, y, 0], undefined, false);
    },
  },
  // a seaside palm for the clusters (the prop file's palm has its own material: this one merges)
  'edge-palm': {
    build: (m) => {
      for (let i = 0; i < 4; i++) {
        const t = i / 4;
        m.cyl(0.2 - t * 0.05, 0.25 - t * 0.05, 1.2, i % 2 ? '#a0703c' : '#7a5230', [t * t * 1.2, 0.6 + i * 1.1, 0], [0, 0, -0.08 - t * 0.25], 5, false);
      }
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        m.ball([1.5, 0.1, 0.42], k % 2 ? '#3fa34d' : '#5cc15e', [1.25 + Math.cos(a) * 1.1, 4.45, Math.sin(a) * 1.1], [0, -a, -0.35], 4, false);
      }
    },
  },
  // dune grass by the sea wall (pale, wind-bent)
  'edge-marram': { build: (m) => blades(m, ['#a7b86a', '#c2cd82', '#8fa458'], 5, 0.75, 0.1) },

  // ================================================================ Mesa Rush: the desert
  // a red-rock outcrop: three boulders shouldering together
  'edge-outcrop': {
    build: (m) => {
      m.rock(1.1, ROCK[0], [0, 0.7, 0], [0.3, 0.7, 0], [1.2, 0.85, 1]);
      m.rock(0.8, ROCK[1], [1.1, 0.45, 0.4], [0.9, 0.1, 0.4], [1, 0.8, 1.1]);
      m.rock(0.6, ROCK[2], [-0.9, 0.35, 0.5], [0.2, 0.5, 0.8], [1.1, 0.8, 1]);
    },
  },
  // a big standing boulder with a smaller one at its foot (the clusters)
  'edge-boulders': {
    build: (m) => {
      m.rock(1.6, ROCK[1], [0, 1.3, 0], [0.4, 0.2, 0.3], [1, 1.25, 0.9]);
      m.rock(0.9, ROCK[0], [1.4, 0.5, 0.6], [0.7, 0.9, 0.1], [1.1, 0.8, 1]);
      m.rock(0.7, '#e8a36b', [-1.2, 0.4, -0.5], [0.1, 0.3, 0.6], [1, 0.7, 1.2]);
    },
  },
  // the sand's cover: wind ripples, dry grass
  'edge-ripples': {
    build: (m) => {
      m.ball([1.5, 0.1, 0.35], '#f2b57c', [0, 0, 0], [0, 0.2, 0], 5, false);
      m.ball([1.2, 0.08, 0.3], '#e9a468', [0.3, 0, 0.8], [0, 0.25, 0], 5, false);
    },
  },
  'edge-drygrass': { build: (m) => blades(m, ['#d9b36a', '#c29a52', '#e6c889'], 4, 0.6, 0.1) },
  // a saguaro with two arms (the dressing's own is a heavier model)
  'edge-saguaro': {
    build: (m) => {
      m.cyl(0.32, 0.38, 4.2, '#3f9a5a', [0, 2.1, 0], undefined, 6, false);
      m.cone(0.32, 0.3, '#3f9a5a', [0, 4.35, 0], undefined, 6, false);
      m.cyl(0.2, 0.22, 1.5, '#2f7f49', [0.62, 2.6, 0], undefined, 5, false);
      m.cyl(0.18, 0.2, 0.7, '#2f7f49', [0.36, 1.95, 0], [0, 0, 1.2], 5, false);
      m.cyl(0.18, 0.2, 1.2, '#2f7f49', [-0.55, 2.05, 0.1], undefined, 5, false);
      m.cyl(0.16, 0.18, 0.6, '#2f7f49', [-0.32, 1.55, 0.05], [0, 0, -1.2], 5, false);
    },
  },
  // two little barrel cacti with a flower each (the verge's own are a heavier model)
  'edge-barrels': {
    build: (m) => {
      m.ball([0.36, 0.4, 0.36], '#3f9a5a', [0, 0.36, 0], undefined, 5, false);
      m.cone(0.14, 0.12, CORAL, [0, 0.78, 0], undefined, 4, false);
      m.ball([0.26, 0.3, 0.26], '#2f7f49', [0.5, 0.26, 0.22], undefined, 5, false);
      m.cone(0.1, 0.1, SUN, [0.5, 0.58, 0.22], undefined, 4, false);
    },
  },

  // ================================================================ Frostbite Pass: the mountain
  // a stand of three lean pines with snow on their tips
  'edge-pines': {
    build: (m) => {
      const tree = (x: number, z: number, h: number, c: number) => {
        m.cyl(0.14 * h / 5, 0.2 * h / 5, h * 0.2, '#6b4a2b', [x, h * 0.1, z], undefined, 4, false);
        m.cone(h * 0.24, h * 0.55, FIR[c % 2], [x, h * 0.45, z], undefined, 6, false);
        m.cone(h * 0.16, h * 0.4, FIR[(c + 1) % 2], [x, h * 0.74, z], [0, 0.5, 0], 6, false);
        m.cone(h * 0.07, h * 0.14, SNOW, [x, h * 0.93, z], undefined, 5, false);
      };
      tree(0, 0, 7, 0);
      tree(1.8, 1.3, 5, 1);
      tree(-1.3, 1.6, 3.6, 0);
    },
  },
  // a lump of snow for the clusters
  'edge-snowlump': {
    build: (m) => {
      m.ball([1.4, 0.8, 1.1], SNOW, [0, 0.1, 0], undefined, 6, false);
      m.ball([0.8, 0.6, 0.7], SNOW_SHADE, [1.0, 0.1, 0.5], undefined, 5, false);
    },
  },
  // the snow's cover: frozen grass poking through
  'edge-frostgrass': { build: (m) => blades(m, ['#8fbfae', '#b9dbd0', '#c9a25a'], 4, 0.55, 0.08) },
  // a light snow fence, 4 m along Z: two posts, two rails, snow along the top (lighter than the roadside's own)
  'edge-snowfence': {
    build: (m) => {
      for (const z of [-1.9, 1.9]) m.box([0.14, 1.3, 0.14], '#8a5a34', [0, 0.65, z], undefined, false);
      for (const y of [0.55, 1.0]) m.box([0.08, 0.14, 4.0], '#9a6538', [0, y, 0], undefined, false);
      m.box([0.14, 0.08, 3.9], SNOW, [0, 1.11, 0], undefined, false);
    },
  },
};

// ---------------------------------------------------------------- the kits

/** A bank's cross-section: its road-side toe just past the limit, a rounded crest, a longer back slope. */
const BANK: EdgeProfile = [[0.3, 0], [1.3, 0.22], [2.5, 0.62], [3.5, 0.93], [4.4, 1], [5.6, 0.7], [7.2, 0.28], [8.8, 0]];
/** A dune: taller, a steeper face to the road, a long lee slope. */
const DUNE: EdgeProfile = [[0.3, 0], [1.4, 0.3], [2.6, 0.76], [3.6, 1], [4.8, 0.92], [6.6, 0.5], [8.6, 0.15], [10, 0]];
/** A snowbank: soft and round. */
const SNOWBANK: EdgeProfile = [[0.3, 0], [1.2, 0.32], [2.2, 0.76], [3.2, 1], [4.3, 0.9], [5.8, 0.45], [7.2, 0]];
/** A low grassy berm by the sea: dunes, the huts' footing. */
const BERM: EdgeProfile = [[1.2, 0], [2.2, 0.4], [3.4, 0.85], [4.3, 1], [5.6, 0.45], [6.8, 0]];
/** A clipped hedge on its bank's crest: its cross-section, metres out from its road-side foot. */
const HEDGE: EdgeProfile = [[0, 0], [0.08, 0.45], [0.3, 0.86], [0.65, 1], [1.0, 0.86], [1.22, 0.45], [1.3, 0]];

const KITS: Readonly<Record<string, EdgeKit>> = Object.freeze({
  meadow: {
    bank: { profile: BANK, height: [1.3, 2.4] },
    styles: [
      {
        name: 'hedgerow', weight: 0.4, bank: true,
        sweep: { profile: HEDGE, at: 3.8, height: [1.3, 1.9], foot: lin('#3a8a33'), top: lin('#7fcf57'), vary: 0.16, lumps: 0.3, smooth: false },
        dots: [{ assets: ['edge-oak', 'edge-oak', 'edge-poplar'], every: [9, 18], at: [5.8, 6.8], scale: [0.85, 1.25] }, { assets: ['edge-wildflowers', 'edge-poppies', 'edge-longgrass'], every: [2.5, 5], at: [0.8, 3.0] }],
      },
      {
        name: 'fence', weight: 0.35, bank: true,
        row: { asset: 'ranch-fence', every: 4, at: 4.3 },
        dots: [{ assets: ['edge-bales', 'edge-bush', 'edge-oak', 'edge-bush'], every: [10, 20], at: [5.4, 7.0] }, { assets: ['edge-wildflowers', 'edge-longgrass', 'edge-poppies'], every: [2.5, 5], at: [0.8, 3.4] }],
      },
      {
        name: 'gate-and-bank', weight: 0.25, bank: true,
        dots: [{ assets: ['edge-gate'], every: [30, 60], at: [4.3, 4.4], scale: [1, 1], face: true }, { assets: ['edge-bush', 'edge-bales', 'edge-poplar', 'edge-oak'], every: [7, 14], at: [3.8, 6.6] }, { assets: ['edge-wildflowers', 'edge-longgrass'], every: [3, 6], at: [0.8, 3.4] }],
      },
    ],
    run: [22, 55], gap: [0, 3],
    clusters: { assets: ['edge-oak', 'edge-oak', 'edge-bush', 'edge-bush', 'edge-bales', 'edge-poplar', 'edge-oak'], size: [4, 6], at: [1.5, 7.5] },
    drifts: [
      { asset: 'edge-longgrass', count: 240, scale: [0.8, 1.35] },
      { asset: 'edge-wildflowers', count: 110 },
      { asset: 'edge-poppies', count: 70 },
      { asset: 'edge-daisies', count: 90 },
      { asset: 'edge-buttercups', count: 60 },
    ],
    replaces: ['flowers'],
    solid: ['barn', 'water-tower', 'windpump', 'windmill-small'],
  },
  harbour: {
    bank: { profile: BERM, height: [0.9, 1.5] },
    styles: [
      {
        name: 'dunes', weight: 0.4, bank: true,
        row: { asset: 'edge-ropefence', every: 4, at: 1.3 },
        dots: [{ assets: ['edge-marram', 'edge-marram', 'edge-wildflowers'], every: [2, 4.5], at: [2.2, 5.4] }, { assets: ['umbrella', 'edge-palm'], every: [12, 22], at: [4.2, 5.8] }],
      },
      {
        name: 'huts', weight: 0.35, bank: true,
        dots: [{ assets: ['edge-hut-coral', 'edge-hut-teal', 'edge-hut-sun', 'edge-hut-sky'], every: [3.4, 5.5], at: [2.0, 2.3], face: true, scale: [0.95, 1.1] }, { assets: ['edge-marram', 'umbrella', 'edge-marram'], every: [5, 11], at: [4.2, 5.8] }],
      },
      {
        name: 'promenade', weight: 0.25, bank: false,
        row: { asset: 'edge-seawall', every: 4, at: 0.55 },
        dots: [{ assets: ['edge-planter'], every: [8, 13], at: [1.9, 2.0], face: true, scale: [1, 1] }, { assets: ['edge-palm', 'rope-post'], every: [10, 18], at: [3.2, 4.5] }],
      },
    ],
    run: [18, 44], gap: [0, 3],
    clusters: { assets: ['edge-palm', 'edge-palm', 'edge-hut-coral', 'edge-hut-teal', 'edge-planter', 'umbrella'], size: [2, 4], at: [2, 7] },
    drifts: [
      { asset: 'edge-longgrass', count: 150, scale: [0.8, 1.25] },
      { asset: 'edge-wildflowers', count: 90 },
      { asset: 'edge-daisies', count: 80 },
      { asset: 'edge-poppies', count: 40 },
      { asset: 'edge-marram', count: 60, scale: [0.8, 1.2] },
    ],
    replaces: ['flowers'],
    solid: ['house', 'stall'],
  },
  canyon: {
    bank: { profile: DUNE, height: [1.6, 3.0] },
    styles: [
      { name: 'dune', weight: 0.45, bank: true, dots: [{ assets: ['edge-barrels', 'edge-outcrop', 'tumbleweed', 'edge-drygrass', 'edge-drygrass'], every: [5, 11], at: [1.0, 7.5] }, { assets: ['edge-saguaro'], every: [12, 24], at: [3.0, 6.5], scale: [0.8, 1.3] }] },
      { name: 'ranch', weight: 0.35, bank: true, row: { asset: 'ranch-fence', every: 4, at: 1.0 }, dots: [{ assets: ['edge-saguaro', 'edge-outcrop', 'edge-barrels'], every: [8, 16], at: [4.0, 7.5] }, { assets: ['edge-drygrass'], every: [3, 6], at: [2, 5] }] },
      { name: 'rocks', weight: 0.2, bank: false, dots: [{ assets: ['edge-outcrop', 'edge-boulders', 'edge-outcrop'], every: [4, 7], at: [1.2, 3.4] }] },
    ],
    run: [20, 50], gap: [0, 4],
    clusters: { assets: ['edge-saguaro', 'edge-saguaro', 'edge-boulders', 'edge-outcrop', 'edge-barrels', 'saguaro-tall'], size: [3, 5], at: [1.5, 7.5] },
    drifts: [
      { asset: 'edge-drygrass', count: 170, scale: [0.8, 1.35] },
      { asset: 'edge-ripples', count: 60 },
    ],
    solid: ['adobe', 'water-tower', 'windpump', 'mine-track', 'cliff', 'minecart', 'mesa', 'arch', 'hoodoo'],
  },
  frost: {
    bank: { profile: SNOWBANK, height: [1.3, 2.3] },
    styles: [
      { name: 'snowbank', weight: 0.5, bank: true, dots: [{ assets: ['edge-pines', 'edge-snowlump'], every: [18, 34], at: [3.8, 6.0] }] },
      { name: 'snow-fence', weight: 0.3, bank: true, row: { asset: 'edge-snowfence', every: 4, at: 3.2 } },
      { name: 'pines', weight: 0.2, bank: true, dots: [{ assets: ['edge-pines'], every: [9, 15], at: [4.0, 5.8] }] },
    ],
    run: [22, 50], gap: [0, 3],
    clusters: { assets: ['edge-pines', 'edge-snowlump', 'edge-pines'], size: [2, 3], at: [2, 6.5] },
    drifts: [{ asset: 'edge-frostgrass', count: 90, scale: [0.8, 1.25] }],
    solid: ['chalet', 'cottage', 'cottage-teal', 'igloo', 'ski-lodge', 'jump-tower', 'crag', 'frozen-falls', 'ski-lift', 'frozen-pond'],
  },
});

/** A biome's edge kit, or undefined (a pier, a sky road: their low solid edge is boundary.ts's). */
export function edgeKit(biome: string | undefined): EdgeKit | undefined {
  return biome ? KITS[biome] : undefined;
}
