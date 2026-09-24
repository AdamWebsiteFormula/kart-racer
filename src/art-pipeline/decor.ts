// Track dressing modelled in code: decor, landmark, barriers, balloons, coins and
// hazards (pads, ramps and bumps: track-builder/mesh/ramps.ts). Every model keeps the size and origin of the placeholder it replaces (scene.ts), so
// placement code never changes. Keyed exactly as TrackAssets expects.
import type { BufferGeometry } from 'three';
import { ModelBuilder } from './model.ts';

type Build = (m: ModelBuilder) => void;

const WOOD = '#a0703c', WOOD_DARK = '#7a5230', WHITE = '#fffaf0', CORAL = '#ff6f61', SUN = '#ffd23f', TEAL = '#2ec4b6', INK = '#1b1b2f';

const MODELS: Record<string, { build: Build }> = {
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
    build: (m) => {
      m.cyl(0.28, 0.3, 0.5, CORAL, [0, 0.25, 0], undefined, 6, false);
      m.cyl(0.28, 0.28, 0.3, WHITE, [0, 0.65, 0], undefined, 6, false);
      m.cone(0.28, 0.14, CORAL, [0, 0.87, 0], undefined, 6, false);
    },
  },
  // ---- Harbor Loop's seaside clutter along the course limit (the roadside band, past where karts drive)
  crate: {
    build: (m) => {
      m.box([1.1, 1.0, 1.1], '#c08a4f', [0, 0.5, 0]);
      for (const y of [0.12, 0.88]) m.box([1.14, 0.12, 1.14], WOOD_DARK, [0, y, 0], undefined, false);  // bands
      m.box([0.8, 0.7, 0.8], '#d9a066', [0.2, 1.35, -0.1], [0, 0.5, 0]);                                // a smaller one on top
      m.box([0.84, 0.1, 0.84], TEAL, [0.2, 1.62, -0.1], [0, 0.5, 0], false);                            // its painted lid
    },
  },
  umbrella: {
    build: (m) => {
      // a beach umbrella: coral and white gores (two four-sided canopies a quarter turn apart), a towel under it
      m.cyl(0.05, 0.05, 2.3, WHITE, [0, 1.15, 0], [0.08, 0, 0], 5, false);
      m.cone(1.45, 0.5, CORAL, [0, 2.35, 0.1], [0.08, 0, 0], 4);
      m.cone(1.42, 0.52, WHITE, [0, 2.36, 0.1], [0.08, Math.PI / 4, 0], 4);
      m.ball([0.09, 0.09, 0.09], SUN, [0, 2.64, 0.12], undefined, 5, false);
      m.box([0.9, 0.03, 1.7], TEAL, [0.7, 0.015, 0.4], [0, 0.3, 0], false);
    },
  },
  'rope-post': {
    build: (m) => {
      // two dock posts with a thick rope sagging between them
      for (const x of [-1.3, 1.3]) {
        m.cyl(0.14, 0.17, 1.1, WOOD, [x, 0.55, 0], undefined, 6);
        m.cyl(0.18, 0.18, 0.08, WOOD_DARK, [x, 1.1, 0], undefined, 6, false);
      }
      const rope: [number, number][] = [[-1.3, 0.92], [-0.5, 0.7], [0.5, 0.7], [1.3, 0.92]];
      for (let k = 0; k < 3; k++) {
        const [x0, y0] = rope[k], [x1, y1] = rope[k + 1], dx = x1 - x0, dy = y1 - y0;
        m.cyl(0.045, 0.045, Math.hypot(dx, dy) + 0.04, '#e8d9a8', [(x0 + x1) / 2, (y0 + y1) / 2, 0], [0, 0, Math.atan2(-dx, dy)], 5, false);
      }
    },
  },
  // ---- features, centred as the placeholders are
  balloon: {
    build: (m) => {
      // party balloon (radius 0.9): one glossy color, a teardrop body, a shine on each face, a
      // tied knot and a wavy ribbon. Never striped: stripes read as a beach ball (Adam, 24 Sept 2026)
      const SKIN = '#ff2e63';
      m.ball([0.78, 0.92, 0.78], SKIN, [0, 0.12, 0], undefined, 18);         // body
      m.ball([0.5, 0.56, 0.5], SKIN, [0, -0.42, 0], undefined, 12, false);    // the taper to the neck
      m.cone(0.13, 0.16, SKIN, [0, -0.93, 0], undefined, 8, false);            // knot, flared below the neck
      for (const z of [0.67, -0.67]) {                                         // shine, seen from either way along the road
        m.ball([0.13, 0.24, 0.06], '#ffffff', [-0.3, 0.4, z], [0, 0, 0.4], 10, false);
        m.ball([0.05, 0.05, 0.03], '#ffffff', [-0.44, 0.08, z * 0.93], undefined, 6, false);
      }
      for (let k = 0; k < 4; k++) {                                            // ribbon, gently wavy
        const x = k % 2 ? 0.05 : -0.05;
        m.cyl(0.022, 0.022, 0.32, WHITE, [0, -1.18 - k * 0.3, 0], [0, 0, x * 2.5], 4, false);
      }
    },
  },
  coin: {
    build: (m) => {
      m.cyl(0.5, 0.5, 0.12, '#f2b705', [0, 0, 0], [Math.PI / 2, 0, 0], 16);
      m.cyl(0.36, 0.36, 0.14, SUN, [0, 0, 0], [Math.PI / 2, 0, 0], 16, false);
      m.box([0.1, 0.34, 0.16], '#f2b705', [0, 0, 0], undefined, false);        // the mark
    },
  },
  // ================================================================ Meadow Run
  windmill: {
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
  // ---- verge ground cover (Meadow Run, Harbor Loop): hundreds of them on the drivable grass between the
  // curb and the course limit, which karts drive through, so they are small, low and a few dozen triangles
  flowers: {
    build: (m) => {
      m.ball([0.5, 0.16, 0.5], '#4f9e3c', [0, 0.04, 0], undefined, 5, false);            // the leaves
      const heads: [number, number, string][] = [[0.18, 0.1, WHITE], [-0.2, 0.16, SUN], [0.05, -0.22, '#ff6f91'], [-0.1, -0.02, WHITE]];
      heads.forEach(([x, z, c], k) => {
        const h = 0.26 + (k % 3) * 0.08;
        m.cyl(0.018, 0.022, h, '#3f8a34', [x, h / 2, z], undefined, 3, false);          // stem
        m.cyl(0.13, 0.09, 0.05, c, [x, h, z], undefined, 5, false);                     // petals
        m.box([0.08, 0.04, 0.08], '#f2a31b', [x, h + 0.03, z], undefined, false);       // its eye
      });
    },
  },
  tuft: {
    build: (m) => {
      // a clump of grass blades leaning out from the middle, a little brighter than the lawn so it reads
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + (k % 2) * 0.4, lean = 0.3 + (k % 3) * 0.14, h = 0.42 + ((k * 7) % 5) * 0.06;
        const cx = Math.cos(a), cz = Math.sin(a), up = h / 2;
        m.cone(0.07, h, k % 2 ? '#7ccc52' : '#5cae3f', [cx * (0.06 + Math.sin(lean) * up), Math.cos(lean) * up, cz * (0.06 + Math.sin(lean) * up)], [lean * cz, 0, -lean * cx], 3, false);
      }
    },
  },
  bush: {
    build: (m) => {
      // a low round shrub with a few red berries, knee-high to a kart
      m.ball([0.7, 0.36, 0.62], '#3f8f3a', [0, 0.26, 0], undefined, 7);
      m.ball([0.46, 0.3, 0.46], '#52a845', [0.42, 0.34, 0.18], undefined, 6);
      m.ball([0.42, 0.28, 0.42], '#5cb84d', [-0.38, 0.32, -0.14], undefined, 6);
      for (const [x, y, z] of [[0.3, 0.6, 0.32], [-0.26, 0.56, 0.24], [0.08, 0.6, -0.44]] as const) m.box([0.09, 0.09, 0.09], '#ff5d73', [x, y, z], [0.6, 0.6, 0], false);
    },
  },
  // ================================================================ Canyon Rush
  arch: {
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
  // ---- Canyon Rush's verge: dry desert scrub and scattered red stones on the drivable sand
  scrub: {
    build: (m) => {
      // a sagebrush: dusty olive puffs on dry twigs
      for (const [x, y, z, r, c] of [[0, 0.32, 0, 0.42, '#9aa55a'], [0.34, 0.26, 0.2, 0.3, '#b5b86a'], [-0.3, 0.24, 0.24, 0.28, '#8a9448'], [0.06, 0.22, -0.34, 0.28, '#a3ad62']] as const) {
        m.ball([r, r * 0.72, r], c, [x, y, z], undefined, 5);
      }
      m.cyl(0.03, 0.05, 0.4, '#8a6a44', [0.1, 0.12, 0.05], [0.3, 0, -0.4], 3, false);
    },
  },
  pebbles: {
    build: (m) => {
      m.rock(0.35, '#b8452f', [0, 0.16, 0], [0.4, 0.2, 0], [1.3, 0.7, 1]);
      m.rock(0.22, '#d9734f', [0.46, 0.1, 0.2], [0.1, 0.9, 0.3], [1, 0.7, 1.1]);
      m.rock(0.18, '#e8a36b', [-0.36, 0.08, 0.3], [0.7, 0.3, 0.1], [1.1, 0.6, 1]);
    },
  },
  mesa: {
    build: (m) => {
      m.cyl(9, 11, 10, '#c8553d', [0, 5, 0], undefined, 9);
      m.cyl(9.2, 9, 1.6, '#e8a36b', [0, 10.8, 0], undefined, 9);                 // cap layer
      m.cyl(10.4, 10.9, 1.2, '#b8452f', [0, 3.5, 0], undefined, 9, false);        // strata band
    },
  },
  'canyon-barrier': {
    build: (m) => {
      // a weathered ranch post: sun-bleached timber, a rope band, a sandstone rock at its foot
      m.cyl(0.13, 0.16, 1.05, '#9a6a44', [0, 0.52, 0], [0, 0, 0.05], 5);
      m.cyl(0.15, 0.15, 0.1, '#2ec4b6', [0, 0.82, 0], undefined, 5, false);        // turquoise rope wrap
      m.ball([0.42, 0.26, 0.36], '#d9824f', [0.12, 0.08, 0.05], [0, 0.6, 0], 4, false); // sandstone rock
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
  // ================================================================ Frostbite Pass
  peak: {
    build: (m) => {
      m.cone(30, 38, '#8fa3b8', [0, 19, 0], undefined, 12);                         // mountain
      m.cone(14, 17, '#fbfdff', [0, 30.2, 0], undefined, 12);                         // snow cap
      m.rock(9, '#7a8ea3', [16, 6, 6], [0.3, 0.8, 0.1], [1.2, 0.8, 1]);
      m.rock(8, '#9fb3c8', [-14, 5, -10], [0.6, 0.2, 0.4], [1.1, 0.8, 1]);
      m.cone(8, 12, '#fbfdff', [15, 12.5, 5], [0.1, 0, -0.2], 8);                      // a shoulder with snow
    },
  },
  pine: {
    build: (m) => {
      m.cyl(0.22, 0.3, 1.2, '#6b4a2b', [0, 0.6, 0], undefined, 6);
      m.cone(1.6, 2.2, '#2f6b4f', [0, 2.1, 0], undefined, 7);
      m.cone(1.25, 1.9, '#3a7d5c', [0, 3.2, 0], undefined, 7);
      m.cone(0.85, 1.6, '#468f68', [0, 4.2, 0], undefined, 7);
      m.cone(0.5, 0.7, '#fbfdff', [0, 4.8, 0], undefined, 7, false);                   // snowy tip
    },
  },
  snowman: {
    build: (m) => {
      m.ball([0.75, 0.7, 0.75], '#fbfdff', [0, 0.7, 0], undefined, 7);
      m.ball([0.55, 0.52, 0.55], '#fbfdff', [0, 1.7, 0], undefined, 7);
      m.ball([0.4, 0.4, 0.4], '#fbfdff', [0, 2.45, 0], undefined, 6);
      m.cone(0.07, 0.4, '#ff8c1a', [0, 2.45, 0.55], [Math.PI / 2, 0, 0], 6, false);    // carrot
      m.cyl(0.3, 0.3, 0.45, '#1b1b2f', [0, 2.95, 0], undefined, 8);                    // hat
      m.cyl(0.45, 0.45, 0.05, '#1b1b2f', [0, 2.75, 0], undefined, 8, false);
      m.torus(0.42, 0.08, '#ff3e9a', [0, 2.12, 0], [Math.PI / 2, 0, 0]);               // scarf
    },
  },
  chalet: {
    build: (m) => {
      m.box([4.2, 3, 3.6], '#a0703c', [0, 1.5, 0]);
      m.cone(3.3, 2.2, '#5a3a22', [0, 4.1, 0], [0, Math.PI / 4, 0], 4);
      m.cone(3.35, 1.1, '#fbfdff', [0, 4.75, 0], [0, Math.PI / 4, 0], 4, false);       // snow on the roof
      for (const x of [-1.1, 1.1]) m.box([0.9, 0.9, 0.05], [2.2, 1.7, 0.7], [x, 1.8, 1.81], undefined, false); // warm windows
      m.box([0.8, 1.5, 0.05], '#5a3a22', [0, 0.75, 1.81], undefined, false);
      m.box([0.5, 1.4, 0.5], '#8a8a8a', [1.2, 5.1, -0.8]);                              // chimney
    },
  },
  snowball: {
    build: (m) => {
      m.ball([1.2, 1.2, 1.2], '#fbfdff', [0, 0, 0], undefined, 12);
      m.ball([0.4, 0.3, 0.4], '#e3eef7', [0.7, 0.6, 0.3], undefined, 7, false);
      m.ball([0.35, 0.3, 0.35], '#e3eef7', [-0.5, -0.4, 0.8], undefined, 7, false);
    },
  },
  // ---- Frostbite Pass's verge: young firs and snow-capped stones (white cover would vanish on the snow)
  sapling: {
    build: (m) => {
      m.ball([0.42, 0.12, 0.42], '#f4f8ff', [0, 0.02, 0], undefined, 5, false);   // a drift at its foot
      m.cyl(0.05, 0.06, 0.2, '#6b4a2b', [0, 0.1, 0], undefined, 4, false);
      m.cone(0.44, 0.56, '#2f6b4f', [0, 0.42, 0], undefined, 6);
      m.cone(0.3, 0.44, '#3a7d5c', [0, 0.72, 0], undefined, 6);
      m.cone(0.15, 0.2, '#fbfdff', [0, 0.95, 0], undefined, 6, false);              // snowy tip
    },
  },
  stones: {
    build: (m) => {
      // blue-grey stones with caps of snow
      m.rock(0.34, '#7d8ea3', [0, 0.16, 0], [0.3, 0.4, 0], [1.3, 0.75, 1]);
      m.ball([0.38, 0.1, 0.3], '#fbfdff', [0, 0.38, 0], undefined, 5, false);
      m.rock(0.22, '#95a4b8', [0.5, 0.1, 0.18], [0.8, 0.2, 0.3], [1, 0.7, 1.1]);
      m.ball([0.2, 0.06, 0.18], '#fbfdff', [0.5, 0.24, 0.18], undefined, 5, false);
    },
  },
  'frost-barrier': {
    build: (m) => {
      // a snow-pole: a wooden post in a drift, a hot-pink marker band, a cap of snow
      m.ball([0.5, 0.22, 0.45], '#f4f8ff', [0, 0.02, 0], undefined, 4, false);       // the drift at its foot
      m.cyl(0.1, 0.12, 1.2, '#7a5236', [0, 0.6, 0], undefined, 5);
      m.cyl(0.13, 0.13, 0.22, '#ff3e9a', [0, 0.95, 0], undefined, 5, false);         // hot-pink marker band
      m.cone(0.17, 0.12, '#fbfdff', [0, 1.26, 0], undefined, 5, false);               // snow cap
    },
  },
  // ================================================================ Skyline Circuit
  airship: {
    build: (m) => {
      const y = 112;                                                                    // above the whole circuit (roads reach 95 m)
      m.ball([6, 6, 18], '#fff1c1', [0, y, 0], undefined, 16);
      for (const z of [-8, 0, 8]) m.ball([6.08, 6.08, 1.1], '#f2b705', [0, y, z], undefined, 16, false); // gold bands
      for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) m.box([0.4, 5, 4], '#f59e8b', [Math.sin(a) * 3.2, y + Math.cos(a) * 3.2, -16], [0, 0, a]); // fins
      m.box([3.2, 2, 7], '#b8452f', [0, y - 7.2, 1]);                                  // gondola
      for (const z of [-1.5, 1, 3.5]) m.box([3.3, 0.7, 0.9], [2.2, 1.9, 0.9], [0, y - 7, z], undefined, false); // lit windows
      for (const x of [-2.5, 2.5]) { m.cyl(0.08, 0.08, 5.5, '#1b1b2f', [x * 0.5, y - 4.4, 1], [0, 0, x * 0.08], 4, false); }
      m.box([0.3, 3.5, 0.3], '#1b1b2f', [0, y - 7.2, -3], undefined, false);           // propeller
      m.box([3.5, 0.3, 0.3], '#1b1b2f', [0, y - 7.2, -3], undefined, false);
    },
  },
  cloud: {
    build: (m) => {
      m.ball([4, 2.4, 3], '#ffffff', [0, 0, 0], undefined, 8, false);
      m.ball([3, 2.2, 2.6], '#fff6ee', [3.5, 0.6, 0.5], undefined, 8, false);
      m.ball([2.8, 1.9, 2.4], '#ffffff', [-3.4, 0.3, -0.4], undefined, 8, false);
      m.ball([2.2, 1.8, 2], '#fff1e6', [0.8, 1.8, 0.2], undefined, 8, false);
    },
  },
  'cloud-sea': {
    build: (m) => {
      // a wide flat puff far below the road: seen from above, lit, so the islands float on a sea of cloud
      m.ball([12, 3.5, 9], '#ffffff', [0, 0, 0], undefined, 8, false);
      m.ball([9, 3, 8], '#fff6ee', [11, 0.8, 3], undefined, 8, false);
      m.ball([8, 2.8, 7], '#ffffff', [-10, 0.5, -3], undefined, 8, false);
      m.ball([6, 3, 6], '#fff1e6', [2, 2.4, -4], undefined, 8, false);
    },
  },
  island: {
    build: (m) => {
      m.cone(9, 14, '#b8845a', [0, -3, 0], [Math.PI, 0, 0], 9);                       // rock underside
      m.cyl(9.2, 9.2, 1.6, '#7bc950', [0, 4.8, 0], undefined, 9);                      // grass top
      m.cyl(0.5, 0.7, 4, '#6b4a2b', [2, 7.5, 1], undefined, 6);
      m.ball([2.6, 2.2, 2.6], '#5cc15e', [2, 10.2, 1], undefined, 7);
      m.rock(1.4, '#9e7454', [-4, 6, -2], [0.4, 0.2, 0.1]);
    },
  },
  'sky-lamp': {
    build: (m) => {
      m.ball([1.3, 0.6, 1.3], '#fff6ee', [0, 0.2, 0], undefined, 7);                   // its little cloud
      m.cyl(0.08, 0.08, 1.6, '#1b1b2f', [0, 1.2, 0], undefined, 4, false);
      m.ball([0.45, 0.55, 0.45], [2.4, 1.9, 0.9], [0, 2.2, 0], undefined, 8);          // lantern glow
      m.cone(0.5, 0.35, '#b8452f', [0, 2.85, 0], undefined, 6);
    },
  },
  'skyline-barrier': {
    build: (m) => {
      m.cyl(0.14, 0.18, 0.9, '#f2b705', [0, 0.45, 0], undefined, 6, false);             // gold post
      m.ball([0.2, 0.2, 0.2], [1.8, 1.4, 0.6], [0, 0.95, 0], undefined, 5, false);      // tiny light
    },
  },
  gust: {
    build: (m) => {
      for (let i = 0; i < 3; i++) m.torus(0.9 + i * 0.35, 0.06, '#ffffff', [0, -0.3 + i * 0.35, 0], [Math.PI / 2, 0, i], false); // swirl rings
    },
  },
  // ================================================================ Boardwalk Nights
  'ferris-wheel': {
    build: (m) => {
      const y = 17;
      m.torus(14, 0.5, [0.4, 1.8, 2.2], [0, y, 0]);                                    // cyan neon rim
      m.torus(10, 0.3, [2.2, 0.5, 1.6], [0, y, 0], undefined, false);                  // magenta inner ring
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        m.box([0.3, 14, 0.3], '#e6e6f0', [Math.sin(a) * 7, y + Math.cos(a) * 7, 0], [0, 0, -a], false); // spokes
        m.box([1.8, 1.4, 1.6], k % 2 ? '#ff2e97' : '#3ec9f0', [Math.sin(a) * 14, y + Math.cos(a) * 14 - 1.2, 0]); // cabins
      }
      m.cyl(1.2, 1.2, 2.5, '#2a2a4a', [0, y, 0], [Math.PI / 2, 0, 0], 10);            // hub
      for (const x of [-1, 1]) m.box([0.8, y + 1, 0.8], '#2a2a4a', [x * 5, (y + 1) / 2, -1.5], [0, 0, x * 0.28]); // legs
    },
  },
  stall: {
    build: (m) => {
      m.box([3, 1.2, 2], '#fffaf0', [0, 0.6, 0]);
      for (let i = 0; i < 5; i++) m.box([0.6, 0.12, 2.4], i % 2 ? '#fffaf0' : '#ff2e97', [-1.2 + i * 0.6, 2.4, 0.2], [0.25, 0, 0]); // striped awning
      for (const x of [-1.4, 1.4]) m.cyl(0.07, 0.07, 1.8, '#1b1b2f', [x, 1.5, 0.9], undefined, 4, false);
      m.box([2.6, 0.35, 0.1], [2.2, 1.9, 0.4], [0, 1.45, 1.02], undefined, false);      // glowing sign
      for (let i = 0; i < 7; i++) m.ball([0.09, 0.09, 0.09], i % 2 ? [2.4, 1.9, 0.8] : [0.6, 2.2, 2.4], [-1.35 + i * 0.45, 2.02, 1.42], undefined, 4, false); // bulbs on the awning's edge
    },
  },
  lamp: {
    build: (m) => {
      m.cyl(0.08, 0.12, 3.4, '#2a2a4a', [0, 1.7, 0], undefined, 6);
      m.ball([0.35, 0.35, 0.35], [0.5, 2.2, 2.4], [0, 3.55, 0], undefined, 8);          // cyan neon globe
    },
  },
  tent: {
    build: (m) => {
      m.cyl(5, 5, 4, '#fffaf0', [0, 2, 0], undefined, 12);
      for (let i = 0; i < 6; i++) m.box([0.9, 4.02, 0.2], '#ff2e97', [Math.sin(i * Math.PI / 3) * 5, 2, Math.cos(i * Math.PI / 3) * 5], [0, i * Math.PI / 3, 0], false); // stripes
      m.cone(5.6, 4.5, '#ff2e97', [0, 6.2, 0], undefined, 12);
      m.cone(0.4, 1.4, [2.2, 1.9, 0.5], [0, 9.1, 0], undefined, 6, false);               // glowing flag top
      for (let i = 0; i < 16; i++) {                                                      // a ring of marquee bulbs round the roof's edge
        const a = (i / 16) * Math.PI * 2;
        m.ball([0.16, 0.16, 0.16], i % 3 ? [2.4, 1.9, 0.8] : [2.4, 0.5, 1.5], [Math.sin(a) * 5.7, 3.9, Math.cos(a) * 5.7], undefined, 4, false);
      }
    },
  },
  'bumper-car': {
    build: (m) => {
      m.cyl(1.1, 1.2, 0.6, '#ff2e97', [0, -0.9, 0], undefined, 12);                    // sits on the road (centre is 1.2 up)
      m.torus(1.15, 0.18, '#1b1b2f', [0, -1.0, 0], [Math.PI / 2, 0, 0]);               // rubber bumper
      m.box([1, 0.5, 0.6], '#3ec9f0', [0, -0.45, -0.3]);
      m.cyl(0.05, 0.05, 1.6, '#e6e6f0', [0, 0.4, -0.6], undefined, 4, false);           // pole
      m.ball([0.12, 0.12, 0.12], [2.2, 1.8, 0.5], [0, 1.2, -0.6], undefined, 5, false); // spark
    },
  },
  teacup: {
    build: (m) => {
      m.cyl(1.1, 0.75, 1.1, '#fffaf0', [0, -0.52, 0], undefined, 12);
      m.torus(0.35, 0.1, '#fffaf0', [1.05, -0.47, 0], [0, 0, Math.PI / 2]);             // handle
      m.cyl(1.12, 1.12, 0.14, '#ff2e97', [0, 0.0, 0], undefined, 12, false);            // rim stripe
      m.cyl(1.4, 1.4, 0.15, '#3ec9f0', [0, -1.12, 0], undefined, 12);                   // saucer
    },
  },
  'boardwalk-barrier': {
    build: (m) => {
      m.cyl(0.12, 0.15, 0.85, '#6b4a2b', [0, 0.43, 0], undefined, 6, false);            // pier post
      m.ball([0.18, 0.18, 0.18], [2.2, 0.5, 1.6], [0, 0.95, 0], undefined, 5, false);   // magenta bulb
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
    build: (m) => {
      m.ball([0.3, 0.3, 0.55], WHITE, [0, 0, 0], undefined, 7);
      m.ball([0.22, 0.22, 0.22], WHITE, [0, 0.18, 0.45], undefined, 7);
      m.cone(0.07, 0.25, SUN, [0, 0.15, 0.72], [Math.PI / 2, 0, 0], 6);
      for (const x of [-1, 1]) m.ball([0.8, 0.06, 0.28], '#c9d2dc', [x * 0.8, 0.1, 0], [0, 0, x * 0.25], 6);
    },
  },
  // ================================================================ course creatures (design §6)
  // Stand-ins that set each creature's size (the AI-made model is fitted to this box) and show if
  // the model file fails. Origin: on the ground at the creature's centre, facing +Z.
  rumblesaur: {
    build: (m) => {
      // a red-rock tyrannosaur, 16 m tall, standing on two legs, facing +Z
      m.ball([3.2, 3.6, 5.4], '#c4502d', [0, 8.2, 0.4], [-0.35, 0, 0], 12);      // body
      for (const x of [-1, 1]) m.cyl(1.1, 1.3, 7, '#a8401f', [x * 2, 3.5, -0.8], undefined, 10); // legs
      m.cone(2, 9, '#c4502d', [0, 7.4, -7.8], [-Math.PI / 2 - 0.3, 0, 0], 10);    // tail
      m.ball([2.2, 2.2, 3.4], '#d45a33', [0, 13.4, 5], [0.1, 0, 0], 12);         // head
      m.box([2.8, 0.5, 2.4], '#fff3d6', [0, 12.3, 6.2]);                        // grin
      m.eye(0.55, [-1.2, 14.4, 6.4]); m.eye(0.55, [1.2, 14.4, 6.4]);
      m.box([0.1, 16, 0.1], '#c4502d', [0, 8, 0], undefined, false);            // sets the height
    },
  },
  yeti: {
    build: (m) => {
      m.ball([2.2, 2.6, 1.9], '#f4f8ff', [0, 3.6, 0], undefined, 12);             // body
      m.ball([1.2, 1.2, 1.1], '#f4f8ff', [0, 6.2, 0.1], undefined, 12);           // head
      m.ball([0.8, 0.7, 0.3], '#8ec5ff', [0, 6.1, 1.05], undefined, 10, false);   // face
      m.eye(0.22, [-0.3, 6.35, 1.2]); m.eye(0.22, [0.3, 6.35, 1.2]);
      for (const x of [-1, 1]) m.cyl(0.55, 0.65, 2, '#f4f8ff', [x * 1.1, 1, 0], undefined, 10);
      m.box([0.1, 7, 0.1], '#f4f8ff', [0, 3.5, 0], undefined, false);
    },
  },
  kraken: {
    build: (m) => {
      m.ball([4, 4.6, 4], '#8b3fd9', [0, 4.6, 0], undefined, 14);                 // head out of the sea
      m.eye(1.1, [-1.5, 5.2, 3.4]); m.eye(1.1, [1.5, 5.2, 3.4]);
      for (let k = 0; k < 6; k++) m.ball([0.35, 0.35, 0.35], [0.4, 2.2, 2.4], [Math.sin(k) * 3.4, 6 + (k % 3), Math.cos(k * 2) * 3], undefined, 6, false); // glow spots
      m.box([0.1, 9, 0.1], '#8b3fd9', [0, 4.5, 0], undefined, false);
    },
  },
  crab: {
    build: (m) => {
      m.ball([2.4, 1.2, 1.8], '#e8492a', [0, 1.8, 0], undefined, 12);             // shell
      for (const x of [-1, 1]) {
        m.ball([0.9, 0.7, 0.6], '#f05a36', [x * 2.6, 2.8, 1.2], undefined, 10); // claws
        for (let k = 0; k < 3; k++) m.cyl(0.14, 0.14, 1.8, '#d9401f', [x * (1.8 + k * 0.1), 0.8, -0.8 + k * 0.8], [0, 0, x * 0.7], 6);
        m.cyl(0.08, 0.08, 0.8, '#d9401f', [x * 0.5, 3.1, 1.2], undefined, 6, false); // eye stalks
        m.eye(0.28, [x * 0.5, 3.6, 1.3]);
      }
      m.box([0.1, 3.8, 0.1], '#e8492a', [0, 1.9, 0], undefined, false);
    },
  },
  goose: {
    build: (m) => {
      m.ball([1.4, 1.3, 2.1], '#fbfbf7', [0, 2.2, 0], undefined, 12);             // body
      m.cyl(0.35, 0.45, 1.8, '#fbfbf7', [0, 3.5, 1.4], [0.5, 0, 0], 10);         // neck
      m.ball([0.55, 0.55, 0.7], '#fbfbf7', [0, 4.4, 2], undefined, 10);           // head
      m.cone(0.3, 0.8, '#ff9f1c', [0, 4.3, 2.8], [Math.PI / 2, 0, 0], 8);        // beak
      m.eye(0.14, [-0.35, 4.6, 2.3]); m.eye(0.14, [0.35, 4.6, 2.3]);
      for (const x of [-1, 1]) {
        m.ball([0.25, 1, 1.6], '#eeeee8', [x * 1.5, 2.6, -0.2], [0, 0, x * 0.9], 10); // wings
        m.cyl(0.1, 0.1, 1.1, '#ff9f1c', [x * 0.5, 0.55, 0.2], undefined, 6);       // legs
        m.box([0.5, 0.08, 0.6], '#ff9f1c', [x * 0.5, 0.04, 0.45]);               // feet
      }
      m.box([0.1, 5, 0.1], '#fbfbf7', [0, 2.5, 0], undefined, false);
    },
  },
  whale: {
    build: (m) => {
      m.ball([5, 5.5, 14], '#9fd3f2', [0, 6, 0], undefined, 16);                  // body
      m.ball([4.2, 3, 12], '#ffc2d4', [0, 4.4, 0.6], undefined, 14, false);        // belly
      m.box([12, 0.5, 4], '#9fd3f2', [0, 6.5, -14], undefined);                  // tail fluke
      for (const x of [-1, 1]) m.box([5, 0.4, 2.6], '#9fd3f2', [x * 5.5, 4.5, 3], [0, 0, x * -0.4]); // fins
      m.eye(0.8, [-4.2, 7.4, 8]); m.eye(0.8, [4.2, 7.4, 8]);
      m.box([0.1, 12, 0.1], '#9fd3f2', [0, 6, 0], undefined, false);
    },
  },
};

export interface DecorGeometry { body: BufferGeometry }

const cache = new Map<string, DecorGeometry>();

/** The model for a TrackAssets key, or null when there is none (the scene keeps its placeholder). */
export function decorGeometry(name: string): DecorGeometry | null {
  const hit = cache.get(name);
  if (hit) return hit;
  const spec = MODELS[name];
  if (!spec) return null;
  const m = new ModelBuilder();
  spec.build(m);
  const out = { body: m.build() };
  cache.set(name, out);
  return out;
}

export const DECOR_NAMES = Object.freeze(Object.keys(MODELS));

/** Everything the track scene can use, in its TrackAssets shape. Geometries are cached and shared. */
export function trackAssetsFor(): { geometries: Record<string, BufferGeometry> } {
  const geometries: Record<string, BufferGeometry> = {};
  for (const name of DECOR_NAMES) geometries[name] = decorGeometry(name)!.body;
  return { geometries };
}
