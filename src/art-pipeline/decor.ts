// Track dressing modelled in code: decor, landmark, barriers, balloons, coins, pads, ramps and
// hazards. Every model keeps the size and origin of the placeholder it replaces (scene.ts), so
// placement code never changes. Keyed exactly as TrackAssets expects.
import type { BufferGeometry } from 'three';
import { ModelBuilder } from './model.ts';

type Build = (m: ModelBuilder) => void;

const WOOD = '#a0703c', WOOD_DARK = '#7a5230', WHITE = '#fffaf0', CORAL = '#ff6f61', SUN = '#ffd23f', TEAL = '#2ec4b6', INK = '#1b1b2f';

const MODELS: Record<string, { build: Build; ink?: number; outline?: boolean }> = {
  // ---- decor (placeholder: 2 × 4 × 2 box on the ground)
  palm: {
    build: (m) => {
      const segs = 6;
      for (let i = 0; i < segs; i++) {
        const t = i / segs;
        m.cyl(0.2 - t * 0.06, 0.24 - t * 0.06, 0.8, i % 2 ? WOOD : WOOD_DARK, [t * t * 1.1, 0.4 + i * 0.72, 0], [0, 0, -0.08 - t * 0.25], 6);
      }
      const top: [number, number, number] = [1.15, 4.5, 0];
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2;
        m.ball([1.5, 0.12, 0.42], k % 2 ? '#3fa34d' : '#5cc15e', [top[0] + Math.cos(a) * 1.1, top[1] - 0.25, Math.sin(a) * 1.1], [0, -a, -0.35], 6);
      }
      for (const [x, z] of [[0.15, 0.15], [-0.15, 0.1], [0, -0.18]]) m.ball([0.17, 0.17, 0.17], '#6b4a2b', [top[0] + x, top[1] - 0.35, z], undefined, 5, false);
    },
  },
  house: {
    build: (m) => {
      m.box([3.2, 2.6, 2.6], '#f7e3c0', [0, 1.3, 0]);
      m.cone(2.55, 1.7, CORAL, [0, 3.45, 0], [0, Math.PI / 4, 0], 4);
      m.box([0.7, 1.3, 0.05], TEAL, [0, 0.65, 1.31], undefined, false);        // door
      for (const x of [-1, 1]) {
        m.box([0.6, 0.6, 0.05], '#9fd8ef', [x, 1.55, 1.31], undefined, false); // windows
        m.box([0.7, 0.08, 0.1], WHITE, [x, 1.2, 1.33], undefined, false);      // sills
      }
      m.box([0.4, 0.9, 0.4], '#c9a88a', [0.9, 3.9, -0.5]);                     // chimney
    },
  },
  boat: {
    build: (m) => {
      m.box([1.6, 0.7, 4.2], WHITE, [0, 0.45, 0]);
      m.cone(0.8, 1.2, WHITE, [0, 0.45, 2.6], [Math.PI / 2, Math.PI / 4, 0], 4);
      m.box([1.64, 0.2, 4.24], CORAL, [0, 0.2, 0], undefined, false);         // waterline stripe
      m.box([1.1, 0.8, 1.3], '#9fd8ef', [0, 1.2, -0.6]);                      // cabin
      m.box([1.2, 0.12, 1.4], TEAL, [0, 1.66, -0.6]);                         // roof
      m.cyl(0.06, 0.06, 3.2, WOOD, [0, 2.4, 0.6], undefined, 6);              // mast
      m.cone(0.9, 2.2, WHITE, [0.45, 2.6, 0.6], [0, 0, -0.05], 3);            // sail
    },
  },
  // ---- landmark (placeholder: 24 m cone on the ground)
  lighthouse: {
    ink: 0.12,
    build: (m) => {
      const bands = 6;
      for (let i = 0; i < bands; i++) {
        const r0 = 3.4 - i * 0.28, r1 = 3.4 - (i + 1) * 0.28;
        m.cyl(r1, r0, 3, i % 2 ? CORAL : WHITE, [0, 1.5 + i * 3, 0], undefined, 18);
      }
      m.cyl(2.5, 2.5, 0.4, INK, [0, 18.2, 0], undefined, 18);                // gallery floor
      m.cyl(1.4, 1.4, 2.2, '#fff3b0', [0, 19.5, 0], undefined, 12);           // lamp room
      m.cyl(1.1, 1.1, 2.3, SUN, [0, 19.5, 0], undefined, 10, false);          // the lamp
      m.cone(1.9, 2.2, CORAL, [0, 21.7, 0], undefined, 12);                   // roof
      m.ball([0.35, 0.35, 0.35], SUN, [0, 23.1, 0], undefined, 8);
      m.box([1.2, 2, 0.1], TEAL, [0, 1, 3.3], undefined, false);              // door
    },
  },
  // ---- barriers (placeholder: 0.6 × 0.8 × 0.6 on the ground): a red and white harbour bollard
  // there are over a thousand of these: six sides, no outline, about 60 triangles each
  'harbour-barrier': {
    outline: false,
    build: (m) => {
      m.cyl(0.28, 0.3, 0.5, CORAL, [0, 0.25, 0], undefined, 6, false);
      m.cyl(0.28, 0.28, 0.3, WHITE, [0, 0.65, 0], undefined, 6, false);
      m.cone(0.28, 0.14, CORAL, [0, 0.87, 0], undefined, 6, false);
    },
  },
  // ---- features, centred as the placeholders are
  balloon: {
    ink: 0.035,
    build: (m) => {
      // striped balloon (radius 0.9): coral, sun and teal gores, a knot and a string
      const cols = [CORAL, SUN, TEAL, WHITE];
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        m.ball([0.34, 0.88, 0.34], cols[k % cols.length], [Math.cos(a) * 0.56, 0.05, Math.sin(a) * 0.56], [0, -a, 0], 8, false);
      }
      m.ball([0.82, 0.9, 0.82], WHITE, [0, 0.05, 0], undefined, 16);          // body under the gores (carries the ink)
      m.cone(0.14, 0.2, CORAL, [0, -0.88, 0], [Math.PI, 0, 0], 8);            // knot
      m.cyl(0.02, 0.02, 1.2, INK, [0, -1.55, 0], undefined, 4, false);        // string
    },
  },
  coin: {
    ink: 0.03,
    build: (m) => {
      m.cyl(0.5, 0.5, 0.12, '#f2b705', [0, 0, 0], [Math.PI / 2, 0, 0], 16);
      m.cyl(0.36, 0.36, 0.14, SUN, [0, 0, 0], [Math.PI / 2, 0, 0], 16, false);
      m.box([0.1, 0.34, 0.16], '#f2b705', [0, 0, 0], undefined, false);        // the mark
    },
  },
  boostPad: {
    outline: false,
    build: (m) => {
      m.box([1, 0.05, 1], '#ff9f1c', [0, 0.025, 0], undefined, false);
      for (let i = 0; i < 3; i++) {
        const z = -0.3 + i * 0.3;
        m.box([0.42, 0.06, 0.08], SUN, [-0.14, 0.03, z], [0, 0.7, 0], false);  // chevrons point +Z
        m.box([0.42, 0.06, 0.08], SUN, [0.14, 0.03, z], [0, -0.7, 0], false);
      }
    },
  },
  ramp: {
    outline: false,
    build: (m) => {
      m.box([1, 0.6, 3], '#e9d8b4', [0, 0.3, 0], undefined, false);
      for (let i = 0; i < 5; i++) m.box([1.02, 0.62, 0.25], i % 2 ? CORAL : WHITE, [0, 0.3, -1.2 + i * 0.6], undefined, false);
    },
  },
  // ================================================================ Meadow Run
  windmill: {
    ink: 0.1,
    build: (m) => {
      m.cyl(2.2, 3.4, 14, '#f3ead8', [0, 7, 0], undefined, 12);                 // tower
      m.cone(2.6, 3.4, '#b7410e', [0, 15.7, 0], undefined, 12);                  // cap
      m.box([1.4, 2.2, 0.1], '#7a5230', [0, 1.1, 3.25], undefined, false);       // door
      for (const y of [6, 10]) m.box([0.9, 1.1, 0.1], '#9fd8ef', [0, y, 2.9 - (y - 6) * 0.1], undefined, false);
      m.cyl(0.35, 0.35, 1.4, '#6b4a2b', [0, 13.5, 2.6], [Math.PI / 2, 0, 0], 8); // hub
      for (let k = 0; k < 4; k++) {                                              // sails
        const a = (k * Math.PI) / 2 + Math.PI / 4;
        m.box([1.5, 8.5, 0.12], k % 2 ? '#fffaf0' : '#ffd23f', [Math.cos(a) * 4.4, 13.5 + Math.sin(a) * 4.4, 3.2], [0, 0, a - Math.PI / 2]);
      }
    },
  },
  'windmill-small': {
    build: (m) => {
      m.cyl(0.7, 1.1, 4.2, '#f3ead8', [0, 2.1, 0], undefined, 8);
      m.cone(0.9, 1.1, '#b7410e', [0, 4.75, 0], undefined, 8);
      for (let k = 0; k < 4; k++) {
        const a = (k * Math.PI) / 2 + 0.3;
        m.box([0.45, 2.6, 0.06], k % 2 ? '#fffaf0' : '#ffd23f', [Math.cos(a) * 1.35, 4 + Math.sin(a) * 1.35, 1], [0, 0, a - Math.PI / 2], false);
      }
    },
  },
  oak: {
    build: (m) => {
      m.cyl(0.35, 0.5, 2.4, '#7a5230', [0, 1.2, 0], undefined, 6);
      m.ball([1.9, 1.5, 1.9], '#5cc15e', [0, 3.4, 0], undefined, 7);
      m.ball([1.2, 1.0, 1.2], '#3fa34d', [0.9, 3.9, 0.4], undefined, 6);
      m.ball([1.1, 0.9, 1.1], '#6fd46f', [-0.8, 4.1, -0.3], undefined, 6);
    },
  },
  fence: {
    build: (m) => {
      for (const x of [-1.2, 0, 1.2]) m.box([0.16, 1.1, 0.16], '#fffaf0', [x, 0.55, 0], undefined, false);
      for (const y of [0.45, 0.85]) m.box([2.6, 0.12, 0.08], '#fffaf0', [0, y, 0], undefined, false);
    },
    outline: false,
  },
  barn: {
    build: (m) => {
      m.box([5, 3.4, 4], '#c0392b', [0, 1.7, 0]);
      m.box([5.2, 0.3, 4.2], '#fffaf0', [0, 3.45, 0], undefined, false);
      m.cone(3.7, 2.3, '#7b2a20', [0, 4.75, 0], [0, Math.PI / 4, 0], 4);
      m.box([1.8, 2.4, 0.1], '#fffaf0', [0, 1.2, 2.02], undefined, false);        // doors
      m.box([1.6, 0.12, 0.12], '#c0392b', [0, 1.2, 2.08], [0, 0, 0.9], false);   // cross brace
      m.box([1.6, 0.12, 0.12], '#c0392b', [0, 1.2, 2.08], [0, 0, -0.9], false);
    },
  },
  // hay kerb: a squat round bale, cheap because there are hundreds of them
  'meadow-barrier': {
    outline: false,
    build: (m) => {
      m.cyl(0.38, 0.38, 0.55, '#e6c46b', [0, 0.38, 0], [Math.PI / 2, 0, 0], 7, false);
      m.cyl(0.39, 0.39, 0.08, '#c9a13f', [0, 0.38, 0], [Math.PI / 2, 0, 0], 7, false);
    },
  },
  haybale: {
    build: (m) => {
      m.cyl(1.0, 1.0, 1.4, '#e6c46b', [0, 0, 0], [0, 0, Math.PI / 2], 12);
      m.ball([0.1, 0.9, 0.9], '#c9a13f', [0.71, 0, 0], undefined, 10, false);
      m.ball([0.1, 0.9, 0.9], '#c9a13f', [-0.71, 0, 0], undefined, 10, false);
      for (const x of [-0.35, 0.35]) m.cyl(1.02, 1.02, 0.08, '#a0703c', [x, 0, 0], [0, 0, Math.PI / 2], 12, false);
    },
  },
  // ================================================================ Canyon Rush
  arch: {
    ink: 0.14,
    build: (m) => {
      for (const x of [-7, 7]) {
        m.rock(3.2, '#c8553d', [x, 3, 0], [0.2, x, 0], [1, 1.1, 0.9]);
        m.rock(2.8, '#d9734f', [x * 0.95, 8, 0.3], [0.6, x, 0.2], [0.95, 1.0, 0.85]);
        m.rock(2.4, '#c8553d', [x * 0.85, 12.5, 0], [0.1, x * 2, 0.4], [1, 0.9, 0.8]);
      }
      for (let i = -2; i <= 2; i++) m.rock(2.4, i % 2 ? '#b8452f' : '#d9734f', [i * 3, 16 + (2 - Math.abs(i)) * 0.8, 0], [i, 0.3, 0.2], [1.1, 0.8, 0.9]);
      m.box([30, 0.5, 5], '#e8a36b', [0, 0.25, 0], undefined, false);
    },
  },
  cactus: {
    build: (m) => {
      m.cyl(0.35, 0.4, 3.2, '#3f9b5a', [0, 1.6, 0], undefined, 7);
      m.ball([0.35, 0.3, 0.35], '#3f9b5a', [0, 3.2, 0], undefined, 7, false);
      m.cyl(0.24, 0.24, 1.0, '#3f9b5a', [0.6, 1.9, 0], [0, 0, Math.PI / 2], 6);
      m.cyl(0.24, 0.24, 1.0, '#3f9b5a', [1.05, 2.4, 0], undefined, 6);
      m.cyl(0.22, 0.22, 0.8, '#3f9b5a', [-0.55, 1.4, 0], [0, 0, Math.PI / 2], 6);
      m.cyl(0.22, 0.22, 0.9, '#3f9b5a', [-0.9, 1.85, 0], undefined, 6);
      m.ball([0.18, 0.12, 0.18], '#ff6f91', [0, 3.5, 0], undefined, 6, false);   // a flower on top
    },
  },
  rock: {
    build: (m) => {
      m.rock(1.3, '#c8553d', [0, 0.9, 0], [0.3, 0.7, 0], [1.2, 0.8, 1]);
      m.rock(0.8, '#d9734f', [1.1, 0.5, 0.4], [0.9, 0.1, 0.4], [1, 0.7, 1]);
    },
  },
  mesa: {
    ink: 0.2,
    build: (m) => {
      m.cyl(9, 11, 10, '#c8553d', [0, 5, 0], undefined, 9);
      m.cyl(9.2, 9, 1.6, '#e8a36b', [0, 10.8, 0], undefined, 9);                 // cap layer
      m.cyl(10.4, 10.9, 1.2, '#b8452f', [0, 3.5, 0], undefined, 9, false);        // strata band
    },
  },
  'canyon-barrier': {
    outline: false,
    build: (m) => {
      m.box([0.62, 0.7, 0.62], '#d9734f', [0, 0.35, 0], [0, 0.3, 0], false);
      m.box([0.64, 0.14, 0.64], '#2ec4b6', [0, 0.62, 0], [0, 0.3, 0], false);    // turquoise paint band
    },
  },
  minecart: {
    build: (m) => {
      m.box([1.6, 0.9, 2.2], '#6b6b73', [0, 0.1, 0]);
      m.box([1.7, 0.12, 2.3], '#a0703c', [0, 0.58, 0], undefined, false);        // rim
      m.rock(0.5, '#ffd23f', [0.2, 0.75, 0.2], [0.3, 0.2, 0], [1, 0.6, 1]);       // gold ore
      m.rock(0.45, '#8a8a8a', [-0.3, 0.72, -0.4], [0.6, 0.1, 0.3], [1, 0.6, 1]);
      for (const [x, z] of [[-0.7, 0.7], [0.7, 0.7], [-0.7, -0.7], [0.7, -0.7]]) m.cyl(0.3, 0.3, 0.16, '#2a2630', [x, -0.4, z], [0, 0, Math.PI / 2], 10);
    },
  },
  rockfall: {
    build: (m) => {
      m.rock(1.0, '#b8452f', [0, 0, 0], [0.4, 0.2, 0.7], [1.1, 0.95, 1]);
      m.rock(0.5, '#d9734f', [0.6, 0.5, 0.3], [0.2, 0.8, 0.1]);
    },
  },
  // ---- hazards (placeholder: sphere of hazardRadius 1.2, centred)
  barrel: {
    build: (m) => {
      m.cyl(0.95, 0.95, 1.9, WOOD, [0, 0, 0], [0, 0, Math.PI / 2], 14);
      m.ball([0.12, 1.02, 1.02], WOOD_DARK, [0, 0, 0], undefined, 14, false);
      for (const x of [-0.7, 0.7]) m.cyl(1.0, 1.0, 0.12, '#5b5b66', [x, 0, 0], [0, 0, Math.PI / 2], 14, false); // hoops
    },
  },
  gull: {
    ink: 0.03,
    build: (m) => {
      m.ball([0.3, 0.3, 0.55], WHITE, [0, 0, 0], undefined, 7);
      m.ball([0.22, 0.22, 0.22], WHITE, [0, 0.18, 0.45], undefined, 7);
      m.cone(0.07, 0.25, SUN, [0, 0.15, 0.72], [Math.PI / 2, 0, 0], 6);
      for (const x of [-1, 1]) m.ball([0.8, 0.06, 0.28], '#c9d2dc', [x * 0.8, 0.1, 0], [0, 0, x * 0.25], 6);
    },
  },
};

export interface DecorGeometry { body: BufferGeometry; hull: BufferGeometry | null }

const cache = new Map<string, DecorGeometry>();

/** The model for a TrackAssets key, or null when there is none (the scene keeps its placeholder). */
export function decorGeometry(name: string): DecorGeometry | null {
  const hit = cache.get(name);
  if (hit) return hit;
  const spec = MODELS[name];
  if (!spec) return null;
  const m = new ModelBuilder(spec.ink ?? 0.06);
  spec.build(m);
  const out = { body: m.build(), hull: spec.outline === false ? null : m.outline() };
  cache.set(name, out);
  return out;
}

export const DECOR_NAMES = Object.freeze(Object.keys(MODELS));

/** Everything the track scene can use, in its TrackAssets shape. Geometries are cached and shared. */
export function trackAssetsFor(): { geometries: Record<string, BufferGeometry>; hulls: Record<string, BufferGeometry> } {
  const geometries: Record<string, BufferGeometry> = {}, hulls: Record<string, BufferGeometry> = {};
  for (const name of DECOR_NAMES) {
    const g = decorGeometry(name)!;
    geometries[name] = g.body;
    if (g.hull) hulls[name] = g.hull;
  }
  return { geometries, hulls };
}
