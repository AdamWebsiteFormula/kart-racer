// Mario Kart World density (24 Sept 2026): the props, set-pieces and ground relief that layer Frostbite
// Pass and Canyon Rush near, mid and far. Code-built toon models, vertex-coloured, a few hundred
// triangles each, so most are baked into the track's merged dressing (track-builder mesh/merge.ts).
// Origins on the ground. Row pieces (fences, lamp posts, corner signs, the ski lift, cliff walls, rails)
// run along local Z with local -X facing the road; spans (bunting, the rock arch) stand across the road
// with their legs at x = ±SPAN_HALF, which placeDecor stretches to the road's width.
import type { ModelBuilder, Paint, V3 } from './model.ts';

type Build = (m: ModelBuilder) => void;

/** A span's nominal half-width: its legs' outer faces at scale 1. Legs are at most 2 m thick across the road (placeDecor stands their outer face 4 m past the course limit). */
export const SPAN_HALF = 20;

const SNOW = '#f6faff', SNOW_SHADE = '#e6eff9', PINK = '#ff2d95', ICE = '#bdefff', ICE_DEEP = '#7fd3f0';
const FIR = ['#1f5c45', '#276b50', '#2f7a5b'] as const;
const PINE_WOOD = '#6b4a2b', FENCE_WOOD = '#9a6538', DARK_WOOD = '#5a3a22';
const SAND = '#de7d40', SAND_LIGHT = '#e99a5c', CLAY = '#c65a3a', CREAM = '#ebb98c', RUST = '#a8462c', TURQ = '#3ec9c0', CORAL = '#ff6f61', SUN = '#ffd23f';
const CACTUS = '#3f9a5a', CACTUS_DARK = '#2f7f49', OLD_WOOD = '#8b6a4a', STEEL = '#8a8f99';
/** lit windows and lanterns: linear RGB over 1 glows through the bloom */
const WARM_GLOW: Paint = [2.4, 1.6, 0.6];

/** A thin rod from a to b (a cable, a rail, a brace). */
function rod(m: ModelBuilder, a: V3, b: V3, r: number, colour: Paint, seg = 4): void {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], len = Math.hypot(dx, dy, dz);
  // a cylinder stands along +Y; Euler XYZ with no Y turn takes +Y to (-sin z, cos z cos x, cos z sin x)
  const rx = Math.atan2(dz, dy), rz = -Math.asin(Math.max(-1, Math.min(1, dx / Math.max(1e-6, len))));
  m.cyl(r, r, len, colour, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], [rx, 0, rz], seg, false);
}

/** A fir of `tiers` green cones, each with a shelf of snow, standing `h` metres tall. */
function fir(m: ModelBuilder, x: number, z: number, h: number, tiers: number, shade = 0): void {
  m.cyl(0.18 * h / 7, 0.26 * h / 7, h * 0.18, PINE_WOOD, [x, h * 0.09, z], undefined, 5, false);
  for (let i = 0; i < tiers; i++) {
    const k = i / tiers, r = (1 - k * 0.72) * h * 0.24, y = h * (0.16 + k * 0.7), th = h * 0.3;
    m.cone(r, th, FIR[(i + shade) % 3], [x, y + th / 2, z], [0, i * 0.5, 0], 7, false);
    m.cone(r * 0.78, th * 0.34, SNOW, [x, y + th * 0.52, z], [0, i * 0.5 + 0.2, 0], 7, false); // a shelf of snow on each tier
  }
  m.cone(h * 0.05, h * 0.1, SNOW, [x, h * 0.95, z], undefined, 5, false);
}

/** Hanging diamond bunting from (-w, y) to (w, y) along X, sagging `sag` at the middle, flags in `colours`. */
function bunting(m: ModelBuilder, w: number, y: number, sag: number, colours: readonly Paint[], flags: number): void {
  const at = (u: number): V3 => [-w + 2 * w * u, y - sag * 4 * u * (1 - u), 0];
  const segs = 10;
  for (let i = 0; i < segs; i++) rod(m, at(i / segs), at((i + 1) / segs), 0.04, '#fffaf0');
  for (let i = 1; i < flags; i++) {
    const p = at(i / flags);
    m.box([0.62, 0.62, 0.05], colours[i % colours.length], [p[0], p[1] - 0.42, 0], [0, 0, Math.PI / 4], false);
  }
}

/** A span's two poles at x = ±(SPAN_HALF - 0.3), reaching 3 m below the road (banks, dips), `h` above it. */
function spanPoles(m: ModelBuilder, h: number, colour: Paint, cap: Paint): void {
  for (const s of [-1, 1]) {
    const x = s * (SPAN_HALF - 0.3);
    m.cyl(0.2, 0.26, h + 3, colour, [x, (h - 3) / 2, 0], undefined, 6, false);
    m.ball([0.38, 0.38, 0.38], cap, [x, h + 0.2, 0], undefined, 6, false);
  }
}

/** A chevron corner sign: a board facing oncoming karts (-Z), its arrows pointing at the road (-X). */
function chevronSign(m: ModelBuilder, board: Paint, arrow: Paint, post: Paint, snow: boolean): void {
  for (const x of [-0.6, 0.6]) m.cyl(0.07, 0.08, 1.9, post, [x, 0.95, 0], undefined, 5, false);
  m.box([1.9, 1.05, 0.1], board, [0, 1.55, 0], undefined, false);
  for (const cx of [-0.45, 0.25]) {
    for (const s of [-1, 1]) m.box([0.5, 0.15, 0.14], arrow, [cx, 1.55 + s * 0.16, 0], [0, 0, s * 0.66], false);
  }
  if (snow) m.box([2.0, 0.12, 0.2], SNOW, [0, 2.12, 0], undefined, false);
}

export const DRESSING_MODELS: Record<string, { build: Build }> = {
  // ================================================================ Frostbite Pass
  // a stand of snow-laden firs: one tall, one middling, one young (a forest reads as clumps, not poles)
  fir: {
    build: (m) => {
      fir(m, 0, 0, 7.5, 4);
      fir(m, 1.9, 1.2, 5.2, 3, 1);
      fir(m, -1.2, 1.7, 3.4, 3, 2);
    },
  },
  'snow-fence': {
    // a 4 m rail fence along Z with snow on its posts and top rail and a drift along its foot
    build: (m) => {
      m.ball([0.55, 0.2, 2.2], SNOW_SHADE, [0, 0, 0], undefined, 6, false);
      for (const z of [-1.9, 1.9]) {
        m.cyl(0.1, 0.12, 1.35, FENCE_WOOD, [0, 0.62, z], undefined, 5, false);
        m.cone(0.15, 0.2, SNOW, [0, 1.38, z], undefined, 5, false);
      }
      m.box([0.1, 0.16, 4.0], FENCE_WOOD, [0, 0.55, 0], undefined, false);
      m.box([0.1, 0.16, 4.0], FENCE_WOOD, [0, 1.02, 0], undefined, false);
      m.box([0.16, 0.08, 3.9], SNOW, [0, 1.14, 0], undefined, false);
    },
  },
  'lantern-post': {
    // a village lamp: a dark post, an arm over the road side with a warm lantern, a pink cap of paint and snow
    build: (m) => {
      m.cyl(0.09, 0.12, 3.1, DARK_WOOD, [0, 1.55, 0], undefined, 5, false);
      m.box([0.9, 0.08, 0.08], DARK_WOOD, [-0.42, 2.95, 0], undefined, false);
      m.box([0.34, 0.44, 0.34], WARM_GLOW, [-0.78, 2.62, 0], undefined, false);
      m.cone(0.3, 0.24, PINK, [-0.78, 2.96, 0], undefined, 4, false);
      m.cone(0.16, 0.14, SNOW, [0, 3.18, 0], undefined, 5, false);
    },
  },
  igloo: {
    build: (m) => {
      m.ball([2.1, 1.7, 2.1], SNOW, [0, 0, 0], undefined, 10, false);
      m.ball([2.13, 0.08, 2.13], ICE, [0, 0.62, 0], undefined, 10, false);            // a course of blocks
      m.ball([1.62, 0.08, 1.62], ICE, [0, 1.2, 0], undefined, 10, false);
      m.cyl(0.85, 0.95, 1.5, SNOW_SHADE, [0, 0.45, 1.9], [Math.PI / 2, 0, 0], 8, false); // the entrance
      m.cyl(0.6, 0.6, 0.1, '#2b3a55', [0, 0.45, 2.63], [Math.PI / 2, 0, 0], 8, false);
      m.cyl(0.03, 0.03, 1.2, DARK_WOOD, [0.4, 2.1, 0], undefined, 4, false);            // a pennant
      m.box([0.5, 0.3, 0.03], PINK, [0.66, 2.5, 0], undefined, false);
    },
  },
  sled: {
    build: (m) => {
      for (const x of [-0.35, 0.35]) {
        m.box([0.06, 0.06, 1.5], '#c9d3df', [x, 0.03, 0], undefined, false);
        m.box([0.06, 0.06, 0.4], '#c9d3df', [x, 0.2, 0.84], [-0.9, 0, 0], false);      // the runner curls up at the front
        for (const z of [-0.45, 0.45]) m.box([0.06, 0.26, 0.06], '#c9d3df', [x, 0.2, z], undefined, false);
      }
      m.box([0.9, 0.08, 1.4], '#e8384f', [0, 0.36, 0], undefined, false);
      m.box([0.5, 0.42, 0.5], TURQ, [0, 0.61, -0.2], [0, 0.3, 0], false);               // a present, tied in pink
      m.box([0.52, 0.08, 0.52], PINK, [0, 0.83, -0.2], [0, 0.3, 0], false);
    },
  },
  'ice-crystals': {
    // a village ice sculpture: a cluster of pale crystals on a block of snow
    build: (m) => {
      m.box([1.8, 0.5, 1.8], SNOW_SHADE, [0, 0.25, 0], [0, 0.4, 0], false);
      const shards: [number, number, number, number, number][] = [[0, 0, 3.0, 0, 0], [0.45, 0.2, 2.0, 0.3, 0.4], [-0.4, 0.25, 1.7, -0.35, 0.1], [0.1, -0.45, 1.5, 0.1, -0.4], [-0.2, -0.3, 1.1, -0.2, -0.3]];
      for (const [x, z, h, rx, rz] of shards) {
        m.cone(0.32, h * 0.8, ICE, [x, 0.5 + h * 0.4 + h * 0.1, z], [rx, 0, rz], 4, false);
        m.cone(0.32, h * 0.2, ICE_DEEP, [x, 0.5 + h * 0.1, z], [rx + Math.PI, 0, rz], 4, false);
      }
    },
  },
  'ice-shards': {
    // the verge's glittering shards (under a kart's roof: karts drive through them)
    build: (m) => {
      m.ball([0.55, 0.12, 0.5], SNOW, [0, 0, 0], undefined, 5, false);
      m.cone(0.2, 0.8, ICE, [0, 0.4, 0], [0.15, 0, 0.1], 4, false);
      m.cone(0.16, 0.55, ICE_DEEP, [0.3, 0.27, 0.12], [0, 0, -0.35], 4, false);
      m.cone(0.13, 0.45, ICE, [-0.26, 0.22, -0.1], [0.2, 0, 0.4], 4, false);
    },
  },
  'ski-lift': {
    // one 24 m bay of a chairlift: a pylon, its crossbar, the two cables to the next pylon, one chair
    build: (m) => {
      m.cyl(0.32, 0.5, 12, '#6f8fae', [0, 5.5, 0], undefined, 6, false);
      m.box([5.2, 0.4, 0.5], '#4d6a88', [0, 11.2, 0], undefined, false);
      for (const x of [-2.4, 2.4]) {
        m.cyl(0.35, 0.35, 0.25, '#2b3a55', [x, 11.0, 0], [0, 0, Math.PI / 2], 8, false);
        rod(m, [x, 10.8, -12], [x, 10.8, 12], 0.05, '#2b3a55');
      }
      rod(m, [2.4, 10.8, 5], [2.4, 8.9, 5], 0.05, '#2b3a55');
      m.box([1.3, 0.14, 0.7], PINK, [2.4, 8.8, 5], undefined, false);
      m.box([1.3, 0.7, 0.12], PINK, [2.4, 9.15, 5.33], undefined, false);
      m.cone(0.25, 0.3, SNOW, [0, 11.55, 0], undefined, 5, false);
    },
  },
  crag: {
    // a snowy rock outcrop in the middle distance
    build: (m) => {
      m.rock(4.2, '#7d8ea3', [0, 2.6, 0], [0.3, 0.4, 0.1], [1.2, 1.3, 1]);
      m.rock(2.8, '#95a4b8', [3.4, 1.6, 1.2], [0.8, 0.2, 0.3], [1, 1.1, 1.2]);
      m.rock(2.2, '#6c7d93', [-3.2, 1.1, -1.4], [0.2, 0.9, 0.4]);
      m.ball([3.6, 0.9, 3.1], SNOW, [0, 6.6, 0], [0.1, 0, 0.12], 8, false);
      m.ball([2.2, 0.6, 2.1], SNOW, [3.5, 4.2, 1.2], undefined, 6, false);
      m.ball([6.5, 0.8, 5.5], SNOW_SHADE, [0, 0, 0], undefined, 8, false);             // drifted up against it
    },
  },
  'frozen-falls': {
    // a set-piece: a cliff of blue rock with a waterfall frozen down its face (toward the road, -X) into an ice pool
    build: (m) => {
      m.rock(9, '#6c7d93', [4, 7, 0], [0.2, 0.3, 0.1], [0.9, 1.3, 1.5]);
      m.rock(7, '#7d8ea3', [5, 5, -9], [0.5, 0.1, 0.4], [1, 1.2, 1]);
      m.rock(7, '#8497ad', [5, 4.5, 9], [0.1, 0.7, 0.2], [1, 1.1, 1]);
      m.ball([7, 1.6, 8], SNOW, [4.5, 17, 0], undefined, 8, false);
      m.ball([5, 1.2, 5], SNOW, [5, 11.2, -9], undefined, 6, false);
      m.ball([5, 1.2, 5], SNOW, [5, 10.4, 9], undefined, 6, false);
      // the frozen fall: a curtain of ice columns down the face
      const cols: [number, number, number][] = [[-0.6, 15.5, 0], [-1.0, 13, -1.6], [-1.0, 12.5, 1.6], [-1.4, 10, -3], [-1.4, 9.5, 3], [-1.8, 7, -4.2], [-1.8, 7.5, 4.2]];
      for (const [x, h, z] of cols) {
        m.cyl(0.9, 1.3, h, ICE, [x, h / 2, z], [0, 0, 0.04], 6, false);
        m.cone(0.9, 1.4, ICE_DEEP, [x, 0.7 - 0.02, z], [Math.PI, 0, 0], 6, false);
      }
      m.ball([6, 0.35, 8], ICE_DEEP, [-4, 0, 0], undefined, 10, false);                // the ice pool
      m.ball([5.2, 0.4, 7], ICE, [-4, 0.05, 0], undefined, 10, false);
    },
  },
  snowdrift: {
    // ground relief: a long soft drift that breaks up the flat snow (half of it under the ground)
    build: (m) => {
      m.ball([10, 2.4, 6], SNOW_SHADE, [0, 0, 0], [0, 0.3, 0], 10, false);
      m.ball([6, 1.6, 4], SNOW, [6, 0, 3], [0, -0.4, 0], 8, false);
    },
  },
  cottage: {
    // a village house in pastel with a steep roof heaped with snow, a lit window and a smoking chimney's stack
    build: (m) => {
      m.box([4, 3, 3.6], '#ffb3c7', [0, 1.5, 0]);
      m.box([4.1, 0.3, 3.7], '#e98aa5', [0, 0.15, 0], undefined, false);
      m.cone(3.35, 2.9, '#8c3b4a', [0, 4.45, 0], [0, Math.PI / 4, 0], 4, false);
      m.cone(3.0, 1.9, SNOW, [0, 5.05, 0], [0, Math.PI / 4, 0], 4, false);
      m.box([0.9, 1.6, 0.06], '#2e6f8e', [0, 0.8, 1.81], undefined, false);
      m.box([0.8, 0.8, 0.06], WARM_GLOW, [-1.2, 1.9, 1.81], undefined, false);
      m.box([0.8, 0.8, 0.06], WARM_GLOW, [1.2, 1.9, 1.81], undefined, false);
      m.box([0.6, 1.6, 0.6], '#b9b3ad', [1.1, 5.4, -0.6], undefined, false);
      m.box([0.7, 0.2, 0.7], SNOW, [1.1, 6.25, -0.6], undefined, false);
      // a yellow lean-to on one side
      m.box([2, 2.1, 2.6], '#ffd66b', [3, 1.05, -0.3]);
      m.box([2.3, 0.4, 2.9], SNOW, [3.05, 2.3, -0.3], [0, 0, -0.12], false);
    },
  },
  'cottage-teal': {
    build: (m) => {
      m.box([3.4, 3.6, 3.4], '#7fd6cf', [0, 1.8, 0]);
      m.cone(3.0, 2.6, '#35506e', [0, 4.9, 0], [0, Math.PI / 4, 0], 4, false);
      m.cone(2.7, 1.7, SNOW, [0, 5.45, 0], [0, Math.PI / 4, 0], 4, false);
      m.box([0.9, 1.6, 0.06], PINK, [0, 0.8, 1.71], undefined, false);
      for (const y of [1.3, 2.7]) m.box([0.7, 0.7, 0.06], WARM_GLOW, [1.05, y, 1.71], undefined, false);
      m.box([0.7, 0.7, 0.06], WARM_GLOW, [-1.05, 2.7, 1.71], undefined, false);
      m.box([1.6, 0.14, 0.7], DARK_WOOD, [0, 2.0, 1.95], undefined, false);           // a balcony
      m.box([1.7, 0.1, 0.8], SNOW, [0, 2.12, 1.95], undefined, false);
    },
  },
  'frost-bunting': {
    // across the road: two poles and diamond bunting in the biome's pink, white, sky blue and gold, a snowflake badge in the middle
    build: (m) => {
      spanPoles(m, 9.2, DARK_WOOD, PINK);
      bunting(m, SPAN_HALF - 0.3, 8.9, 1.2, [PINK, '#ffffff', '#7fc8ff', SUN], 26);
      m.cyl(1.1, 1.1, 0.12, PINK, [0, 7.3, 0], [Math.PI / 2, 0, 0], 12, false);
      for (let k = 0; k < 3; k++) m.box([1.5, 0.16, 0.16], '#ffffff', [0, 7.3, 0], [0, 0, (k * Math.PI) / 3], false);
    },
  },
  'frost-sign': { build: (m) => chevronSign(m, PINK, '#ffffff', DARK_WOOD, true) },

  // ================================================================ Canyon Rush
  saguaro: {
    build: (m) => {
      m.cyl(0.45, 0.52, 5.4, CACTUS, [0, 2.7, 0], undefined, 8, false);
      m.ball([0.45, 0.5, 0.45], CACTUS, [0, 5.4, 0], undefined, 8, false);
      // the arms: out, then up, each with a rounded tip
      const arm = (s: number, y: number, up: number) => {
        m.cyl(0.26, 0.26, 1.1, CACTUS_DARK, [s * 0.75, y, 0], [0, 0, Math.PI / 2], 6, false);
        m.cyl(0.28, 0.28, up, CACTUS_DARK, [s * 1.25, y + up / 2, 0], undefined, 6, false);
        m.ball([0.28, 0.32, 0.28], CACTUS_DARK, [s * 1.25, y + up, 0], undefined, 6, false);
      };
      arm(1, 2.4, 1.8);
      arm(-1, 3.2, 1.3);
      m.cone(0.14, 0.2, CORAL, [0, 5.95, 0], undefined, 5, false);                       // a flower on top
    },
  },
  'saguaro-tall': {
    build: (m) => {
      m.cyl(0.5, 0.6, 7.6, '#4aa564', [0, 3.8, 0], undefined, 8, false);
      m.ball([0.5, 0.55, 0.5], '#4aa564', [0, 7.6, 0], undefined, 8, false);
      const arm = (a: number, y: number, up: number) => {
        const cx = Math.cos(a), cz = Math.sin(a);
        m.cyl(0.3, 0.3, 1.2, CACTUS, [cx * 0.8, y, cz * 0.8], [0, -a, Math.PI / 2], 6, false);
        m.cyl(0.32, 0.32, up, CACTUS, [cx * 1.35, y + up / 2, cz * 1.35], undefined, 6, false);
        m.ball([0.32, 0.36, 0.32], CACTUS, [cx * 1.35, y + up, cz * 1.35], undefined, 6, false);
      };
      arm(0, 3.4, 2.4);
      arm(Math.PI * 0.9, 4.6, 1.8);
      arm(Math.PI * 1.5, 2.6, 1.4);
      m.cone(0.15, 0.22, SUN, [0, 8.2, 0], undefined, 5, false);
    },
  },
  'barrel-cactus': {
    // the verge's little round cacti with flowers (under a kart's roof: karts drive through them)
    build: (m) => {
      m.ball([0.48, 0.12, 0.42], SAND_LIGHT, [0, 0, 0], undefined, 5, false);
      const pots: [number, number, number, Paint][] = [[0, 0, 0.42, CORAL], [0.5, 0.2, 0.32, SUN], [-0.36, 0.34, 0.27, PINK]];
      for (const [x, z, r, f] of pots) {
        m.ball([r, r * 1.05, r], CACTUS, [x, r * 0.95, z], undefined, 7, false);
        m.cone(r * 0.4, r * 0.35, f, [x, r * 2.05, z], undefined, 5, false);
      }
    },
  },
  tumbleweed: {
    build: (m) => {
      m.rock(0.5, '#b8864f', [0, 0.46, 0], [0.3, 0.2, 0.5], [1.05, 0.95, 1]);
      m.rock(0.46, '#9c6b3c', [0.04, 0.48, 0.02], [1.1, 0.7, 0.2]);
      m.rock(0.44, '#caa06a', [-0.03, 0.47, -0.03], [0.6, 1.4, 0.9]);
    },
  },
  hoodoo: {
    // a tall column of banded rock with a wider cap stone balanced on its neck
    build: (m) => {
      m.cyl(1.9, 2.6, 3, CLAY, [0, 1.5, 0], [0, 0.3, 0], 7, false);
      m.cyl(1.5, 1.9, 2.4, CREAM, [0, 4.2, 0], [0, 0.8, 0], 7, false);
      m.cyl(1.6, 1.5, 2.2, RUST, [0.1, 6.5, 0], [0, 0.1, 0], 7, false);
      m.cyl(0.9, 1.6, 2.6, CLAY, [0.1, 8.9, 0], [0, 0.5, 0], 7, false);
      m.cyl(0.7, 0.9, 1.4, CREAM, [0.1, 10.9, 0], undefined, 6, false);
      m.rock(2.2, '#8e3b26', [0.2, 12.4, 0], [0.2, 0.5, 0.1], [1.3, 0.55, 1.2]);
    },
  },
  cliff: {
    // a 22 m stretch of banded canyon wall along Z (local -X faces the road), boulders at its foot
    build: (m) => {
      const bands: Paint[] = [CLAY, CREAM, RUST, '#d9774f', CREAM, RUST];
      const tops = [12, 14.5, 11, 13.5, 15, 12.5];
      for (let i = 0; i < 6; i++) {
        const z = -9.2 + i * 3.7, top = tops[i];
        for (let b = 0; b < 4; b++) {
          const y0 = (b * top) / 4, h = top / 4 + 0.3;
          m.box([4 - b * 0.4, h, 4.2], bands[(b + i) % bands.length], [0.2 * b + (i % 2) * 0.3, y0 + h / 2 - 1.2, z], [0, (i % 3) * 0.05, 0], false);
        }
      }
      m.rock(1.6, '#b8452f', [-2.6, 0.5, -4], [0.4, 0.2, 0.7]);
      m.rock(1.2, '#d9734f', [-2.4, 0.3, 5], [0.2, 0.8, 0.1]);
    },
  },
  'mine-track': {
    // 12 m of mine rails along Z on timber sleepers, an ore cart full of gold rocks at one end
    build: (m) => {
      for (let i = 0; i < 8; i++) m.box([1.8, 0.14, 0.34], DARK_WOOD, [0, 0.07, -5.25 + i * 1.5], undefined, false);
      for (const x of [-0.6, 0.6]) m.box([0.1, 0.12, 12], STEEL, [x, 0.2, 0], undefined, false);
      m.box([1.5, 0.9, 1.9], '#6b4a3a', [0, 0.85, 3.6], undefined, false);
      m.box([1.6, 0.12, 2.0], '#3c3c46', [0, 1.3, 3.6], undefined, false);
      for (const z of [3.0, 4.2]) for (const x of [-0.62, 0.62]) m.cyl(0.26, 0.26, 0.1, '#3c3c46', [x, 0.38, z], [0, 0, Math.PI / 2], 6, false);
      m.rock(0.45, SUN, [0.2, 1.45, 3.3], [0.3, 0.2, 0]);
      m.rock(0.4, '#f2b705', [-0.3, 1.4, 3.9], [0.9, 0.4, 0.2]);
    },
  },
  'water-tower': {
    build: (m) => {
      for (const [x, z] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]] as const) m.cyl(0.14, 0.18, 6.4, OLD_WOOD, [x * 0.9, 3.2, z * 0.9], [z * 0.02, 0, -x * 0.02], 5, false);
      rod(m, [-1.35, 1.6, -1.35], [1.35, 4.6, -1.35], 0.07, OLD_WOOD);
      rod(m, [1.35, 1.6, 1.35], [-1.35, 4.6, 1.35], 0.07, OLD_WOOD);
      m.box([3.4, 0.2, 3.4], DARK_WOOD, [0, 6.4, 0], undefined, false);
      m.cyl(1.9, 1.9, 3.2, '#b07a44', [0, 8.1, 0], undefined, 10, false);
      for (const y of [7, 9.2]) m.cyl(1.96, 1.96, 0.16, '#3c3c46', [0, y, 0], undefined, 10, false);
      m.cone(2.2, 1.4, RUST, [0, 10.4, 0], undefined, 10, false);
      m.cyl(0.08, 0.08, 1.8, TURQ, [0.9, 9.2, 1.9], [0.6, 0, 0], 4, false);              // the spout
    },
  },
  windpump: {
    // a ranch windpump: a tapering lattice tower, a many-bladed wheel, a turquoise tail vane
    build: (m) => {
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) rod(m, [x * 1.3, 0, z * 1.3], [x * 0.25, 9, z * 0.25], 0.08, STEEL);
      for (const y of [3, 6]) {
        const r = 1.3 - (y / 9) * 1.05;
        m.box([2 * r + 0.1, 0.1, 0.1], STEEL, [0, y, r], undefined, false);
        m.box([2 * r + 0.1, 0.1, 0.1], STEEL, [0, y, -r], undefined, false);
        m.box([0.1, 0.1, 2 * r + 0.1], STEEL, [r, y, 0], undefined, false);
        m.box([0.1, 0.1, 2 * r + 0.1], STEEL, [-r, y, 0], undefined, false);
      }
      m.box([0.5, 0.5, 1.2], '#5a5f6a', [0, 9.3, 0], undefined, false);
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        m.box([0.42, 1.5, 0.05], k % 2 ? '#fffaf0' : CORAL, [Math.cos(a) * 1.0, 9.3 + Math.sin(a) * 1.0, 0.7], [0.25, 0, a - Math.PI / 2], false);
      }
      m.cyl(0.25, 0.25, 0.3, SUN, [0, 9.3, 0.8], [Math.PI / 2, 0, 0], 8, false);
      m.box([0.06, 1.1, 1.8], TURQ, [0, 9.4, -1.6], undefined, false);
    },
  },
  adobe: {
    // a mud-brick hut: flat roof with its beam ends showing, a turquoise door and window, a clay pot
    build: (m) => {
      m.box([4.4, 2.8, 3.6], '#e3a574', [0, 1.4, 0]);
      m.box([4.6, 0.3, 3.8], '#d18f5e', [0, 2.9, 0], undefined, false);
      for (const x of [-1.6, -0.5, 0.6, 1.7]) m.cyl(0.12, 0.12, 0.8, DARK_WOOD, [x, 2.5, 1.95], [Math.PI / 2, 0, 0], 5, false);
      m.box([1, 1.8, 0.06], TURQ, [-0.8, 0.9, 1.81], undefined, false);
      m.box([0.8, 0.7, 0.06], TURQ, [1.2, 1.7, 1.81], undefined, false);
      m.box([0.6, 0.5, 0.07], '#3a2d2a', [1.2, 1.7, 1.82], undefined, false);
      m.ball([0.4, 0.45, 0.4], CLAY, [2.6, 0.4, 1.4], undefined, 7, false);
      m.cyl(0.18, 0.25, 0.2, CLAY, [2.6, 0.9, 1.4], undefined, 7, false);
    },
  },
  'canyon-sign': { build: (m) => chevronSign(m, TURQ, '#ffffff', OLD_WOOD, false) },
  signpost: {
    // a ranch signpost: arrow boards in the canyon's colours pointing every which way, no words
    build: (m) => {
      m.cyl(0.11, 0.13, 3.2, OLD_WOOD, [0, 1.6, 0], undefined, 5, false);
      const boards: [number, number, Paint][] = [[2.7, 0.3, TURQ], [2.2, 2.4, CORAL], [1.7, -1.2, SUN]];
      for (const [y, a, c] of boards) {
        m.box([1.4, 0.34, 0.08], c, [Math.cos(a) * 0.55, y, -Math.sin(a) * 0.55], [0, a, 0], false);
        m.cone(0.26, 0.34, c, [Math.cos(a) * 1.35, y, -Math.sin(a) * 1.35], [0, a, -Math.PI / 2], 3, false);
      }
      m.cone(0.2, 0.2, CLAY, [0, 3.3, 0], undefined, 5, false);
    },
  },
  'ranch-fence': {
    // a 4 m weathered rail fence along Z
    build: (m) => {
      for (const z of [-1.9, 1.9]) m.cyl(0.11, 0.13, 1.4, OLD_WOOD, [0, 0.62, z], [0, 0, (z > 0 ? 0.04 : -0.03)], 5, false);
      m.box([0.1, 0.16, 4.0], '#a47e57', [0, 0.5, 0], [0.02, 0, 0], false);
      m.box([0.1, 0.16, 4.0], '#a47e57', [0, 1.05, 0], [-0.03, 0, 0], false);
    },
  },
  dune: {
    // ground relief: a long soft dune with a lighter crest (half of it under the sand)
    build: (m) => {
      m.ball([11, 2.6, 6], SAND, [0, 0, 0], [0, 0.2, 0], 10, false);
      m.ball([7, 1.2, 2.2], SAND_LIGHT, [0.5, 1.9, -0.8], [0, 0.2, 0], 8, false);
    },
  },
  'canyon-bunting': {
    // across the road: two poles and diamond bunting in turquoise, coral, gold and white, a sun badge in the middle
    build: (m) => {
      spanPoles(m, 9.2, OLD_WOOD, TURQ);
      bunting(m, SPAN_HALF - 0.3, 8.9, 1.2, [TURQ, CORAL, SUN, '#ffffff'], 26);
      m.cyl(1.1, 1.1, 0.12, SUN, [0, 7.3, 0], [Math.PI / 2, 0, 0], 12, false);
      m.cyl(0.6, 0.6, 0.16, CORAL, [0, 7.3, 0], [Math.PI / 2, 0, 0], 10, false);
    },
  },
  'rock-span': {
    // a natural rock arch across the road: banded legs rising past the course limit, a lintel of red rock 16 m up
    build: (m) => {
      const cols: Paint[] = [CLAY, CREAM, RUST, '#d9774f'];
      // legs: slabs of banded rock, thin across the road and deep along it
      for (const s of [-1, 1]) {
        for (let i = 0; i < 6; i++) m.rock(1.0, cols[i % 4], [s * (SPAN_HALF - 1.0), -2 + i * 2.5, (i % 2 ? 0.3 : -0.3)], [i * 0.5, 0, 0], [0.95, 1.7, 2.6]);
      }
      const n = 11;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1), a = Math.PI * (1 - u);
        const x = Math.cos(a) * (SPAN_HALF - 3.6), y = 13 + Math.sin(a) * 3.4;
        m.rock(2.3, cols[(i + 1) % 4], [x, y, 0], [i * 0.5, i * 0.9, 0.3], [1.1, 0.85, 1.2]);
      }
    },
  },
};
