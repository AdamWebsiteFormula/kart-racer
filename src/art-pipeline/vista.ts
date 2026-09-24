// The far vista (Adam, 24 Sept 2026: "make sure the distance of the environment looks interesting ...
// mountains, volcanoes, hills and valleys, skyscrapers, floating islands ... take inspiration from
// Mario Kart World"). Past the scenery every track gets big, readable set-pieces that frame its corners,
// one of them a far landmark ahead of the start line; behind them the backdrop ring (track-builder
// backdrop.ts) carries the hazier ranges. Original designs, toon style, code-built:
// - the still set-pieces are one vertex-coloured world-space geometry (the scene draws it toon-lit and
//   fogged, so it hazes with distance, casting no shadow): one draw;
// - what moves out there (sailboats, balloons, a train, cable cars, airships, windmill sails) is one
//   mesh posed in its vertex shader from the water clock: one draw; what glows (smoke, fireworks, a
//   lighthouse beam, waterfalls, beacons) one additive mesh: one draw;
// - what rides with the ring round the camera (a moon's halo) its own additive mesh.
// Laid out from the track's middle, `deg` degrees round from straight ahead of the start line
// (positive to the driver's right), `d` metres out; Mirror mode reflects the angles.
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Matrix4, Mesh, NormalBlending, Quaternion,
  ShaderMaterial, UniformsLib, UniformsUtils, Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { VistaContext, VistaParts } from '../track-builder/mesh/index.ts';
import { decorGeometry } from './decor.ts';
import { ModelBuilder, type Paint, type V3 } from './model.ts';
import { WATER_CLOCK } from './surfaces.ts';

/** How a mover moves (its vertex shader's `kind`). */
export const MOVE = Object.freeze({
  still: 0, orbit: 1, drift: 2, shuttle: 3, spinY: 4, spinZ: 5, burst: 6, rise: 7, beam: 8, shimmer: 9, blink: 10, glow: 11,
});

const VERT = `
uniform float time;
uniform vec3 sunDir;
attribute vec3 aAnchor;
attribute vec4 aMove;
attribute vec4 aDir;
attribute float aYaw;
varying vec3 vColor;
varying float vAlpha;
#include <fog_pars_vertex>
vec3 yawed(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(p.x * c + p.z * s, p.y, -p.x * s + p.z * c); }
void main() {
  float kind = aMove.x, t = time * aMove.z + aMove.y, amt = aMove.w;
  vec3 p = position, n = normal, base = aAnchor;
  float yaw = aYaw, a = 1.0;
  if (kind > 0.5 && kind < 1.5) {
    // orbit: round a circle of radius amt, facing along it, riding a slow swell
    base += vec3(cos(t) * amt, 0.3 * sin(time * 1.1 + aMove.y), -sin(t) * amt);
    yaw += t + 3.14159265;
  } else if (kind < 2.5 && kind > 1.5) {
    // drift and bob: a balloon on the breeze
    base += vec3(sin(t * 0.21) * amt, sin(t) * 1.6, cos(t * 0.17) * amt);
  } else if (kind > 2.5 && kind < 3.5) {
    // shuttle there and back along aDir (a cable car, a train)
    base += aDir.xyz * aDir.w * (0.5 - 0.5 * cos(t));
  } else if (kind > 3.5 && kind < 4.5) {
    yaw += t;
  } else if (kind > 4.5 && kind < 5.5) {
    // turn about its own Z (windmill sails)
    float c = cos(t), s = sin(t);
    p.xy = vec2(p.x * c - p.y * s, p.x * s + p.y * c);
    n.xy = vec2(n.x * c - n.y * s, n.x * s + n.y * c);
  } else if (kind > 5.5 && kind < 6.5) {
    // a firework spark: out along aDir, falling, shrinking, gone before the next burst
    float k = fract(t);
    float r = aDir.w * (1.0 - pow(1.0 - min(k / 0.4, 1.0), 3.0));
    base += aDir.xyz * r + vec3(0.0, -9.0 * k * k, 0.0);
    p *= max(0.0, 1.0 - k * 1.2);
    a = k < 0.75 ? smoothstep(0.0, 0.03, k) * (1.0 - k / 0.75) : 0.0;
  } else if (kind > 6.5 && kind < 7.5) {
    // a puff of smoke: rises amt metres, swells, leans downwind, fades in and out
    float k = fract(t);
    base += vec3(sin(t * 0.7) * 2.0 + k * amt * 0.35, k * amt, k * amt * 0.1);
    p *= 0.5 + 1.8 * k;
    a = sin(k * 3.14159265) * 0.7;
  } else if (kind > 7.5 && kind < 8.5) {
    // a lighthouse beam: sweeps round, fading along its length
    yaw += t;
    a = clamp(1.0 - length(p.xz) / amt, 0.0, 1.0) * 0.8;
  } else if (kind > 8.5 && kind < 9.5) {
    // bands of light running along aDir (a waterfall pouring, a river glinting)
    float band = fract(dot(p, aDir.xyz) * aDir.w + t);
    a = amt * (0.35 + 0.65 * smoothstep(0.5, 0.95, band));
  } else if (kind > 9.5 && kind < 10.5) {
    a = step(0.5, fract(t));
  } else if (kind > 10.5) {
    a = amt * (0.85 + 0.15 * sin(t));
  }
  vec3 world = base + yawed(p, yaw);
  #ifdef GLOW
    vColor = color;
  #else
    // two toon steps, like the scenery's ramp
    float l = dot(normalize(yawed(n, yaw)), sunDir);
    vColor = color * (l > 0.25 ? 1.0 : (l > -0.2 ? 0.8 : 0.64));
  #endif
  vAlpha = a;
  vec4 mvPosition = viewMatrix * modelMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const SOLID_FRAG = `
varying vec3 vColor;
varying float vAlpha;
#include <fog_pars_fragment>
void main() {
  gl_FragColor = vec4(vColor, 1.0);
  #include <fog_fragment>
}`;

const GLOW_FRAG = `
varying vec3 vColor;
varying float vAlpha;
#include <fog_pars_fragment>
void main() {
  float f = 0.0;
  #ifdef USE_FOG
    f = smoothstep(fogNear, fogFar, vFogDepth) * 0.85;
  #endif
  // added light fades into the haze rather than taking the fog's colour
  gl_FragColor = vec4(vColor * vAlpha * (1.0 - f), 1.0);
}`;

function vistaMaterial(sun: V3, glow: boolean, fog = true): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: VERT, fragmentShader: glow ? GLOW_FRAG : SOLID_FRAG,
    uniforms: { ...UniformsUtils.clone(UniformsLib.fog), time: WATER_CLOCK, sunDir: { value: new Vector3(...sun) } },
    defines: glow ? { GLOW: '' } : {},
    vertexColors: true, fog, transparent: glow, depthWrite: !glow, blending: glow ? AdditiveBlending : NormalBlending,
  });
}

// ---------------------------------------------------------------- building

const UP = new Vector3(0, 1, 0);
const M = new Matrix4(), Q = new Quaternion(), P = new Vector3(), S = new Vector3();

function model(build: (m: ModelBuilder) => void): BufferGeometry {
  const m = new ModelBuilder();
  build(m);
  return m.build();
}

/** A copy of `g` placed in the world. */
function placed(g: BufferGeometry, pos: V3, yaw = 0, scale: number | V3 = 1): BufferGeometry {
  const s: V3 = typeof scale === 'number' ? [scale, scale, scale] : scale;
  return g.clone().applyMatrix4(M.compose(P.set(...pos), Q.setFromAxisAngle(UP, yaw), S.set(...s)));
}

/** A copy of `g` carrying its mover attributes: posed on the GPU about `anchor`. */
function mover(g: BufferGeometry, anchor: V3, yaw: number, move: [number, number, number, number], dir: [number, number, number, number] = [0, 0, 0, 0]): BufferGeometry {
  const c = g.clone(), n = c.getAttribute('position').count;
  const fill = (size: number, v: number[]) => { const a = new Float32Array(n * size); for (let i = 0; i < n; i++) a.set(v, i * size); return new BufferAttribute(a, size); };
  c.setAttribute('aAnchor', fill(3, anchor));
  c.setAttribute('aMove', fill(4, move));
  c.setAttribute('aDir', fill(4, dir));
  c.setAttribute('aYaw', fill(1, [yaw]));
  return c;
}

/** A small glowing blob (a spark, a beacon) with the attributes ModelBuilder parts carry. */
function spark(r: number, colour: Paint): BufferGeometry {
  return model((m) => m.ball([r, r, r], colour, [0, 0, 0], undefined, 4, false));
}

/** Everything a biome's vista puts out, gathered. */
class Vista {
  readonly solids: BufferGeometry[] = [];
  readonly movers: BufferGeometry[] = [];
  readonly glows: BufferGeometry[] = [];
  readonly ringGlows: BufferGeometry[] = [];
  readonly ctx: VistaContext;
  /** the far landmark ahead of the start line, and how tall it stands */
  landmark?: V3;
  /** the ground under the far set-pieces (the sea on a sea track); on a sky track, the roads' lowest point */
  readonly floor: number;
  constructor(ctx: VistaContext) {
    this.ctx = ctx;
    this.floor = Number.isFinite(ctx.groundY) ? ctx.groundY : ctx.roadMinY;
  }
  /** A point `d` metres out from the track's middle, `deg` round from straight ahead of the start (to the right), at height y above the floor. */
  at(deg: number, d: number, y = 0): V3 {
    const a = ((this.ctx.mirrored ? -deg : deg) * Math.PI) / 180, [fx, fz] = this.ctx.forward, [cx, cz] = this.ctx.centre;
    const dx = fx * Math.cos(a) - fz * Math.sin(a), dz = fz * Math.cos(a) + fx * Math.sin(a);
    return [cx + dx * d, this.floor + y, cz + dz * d];
  }
  /** The yaw that turns a model's +Z toward the track's middle from `deg`. */
  facing(deg: number): number {
    const p = this.at(deg, 1), [cx, cz] = this.ctx.centre;
    return Math.atan2(cx - p[0], cz - p[2]);
  }
  /** Beyond the farthest road by `extra` metres. */
  out(extra: number): number { return this.ctx.radius + extra; }
  solid(g: BufferGeometry, deg: number, d: number, y = 0, scale: number | V3 = 1, turn = 0): V3 {
    const p = this.at(deg, d, y);
    this.solids.push(placed(g, p, this.facing(deg) + turn, scale));
    return p;
  }
  parts(): VistaParts {
    const sun = this.ctx.sun;
    const out: VistaParts = { world: [], ring: [], landmark: this.landmark };
    if (this.solids.length) out.solid = mergeGeometries(this.solids, false) ?? undefined;
    const mesh = (list: BufferGeometry[], glow: boolean, name: string, fog = true): Mesh | null => {
      if (!list.length) return null;
      const g = mergeGeometries(list, false);
      if (!g) return null;
      const m = new Mesh(g, vistaMaterial(sun, glow, fog));
      m.name = name;
      // posed in the vertex shader: its geometry's own bounds say nothing about where it draws
      m.frustumCulled = false;
      if (glow) m.renderOrder = 5;
      return m;
    };
    const mv = mesh(this.movers, false, 'vista-movers'), gl = mesh(this.glows, true, 'vista-glow'), rg = mesh(this.ringGlows, true, 'vista-ring-glow', false);
    if (mv) out.world!.push(mv);
    if (gl) out.world!.push(gl);
    if (rg) out.ring!.push(rg);
    for (const g of [...this.solids, ...this.movers, ...this.glows, ...this.ringGlows]) g.dispose();
    return out;
  }
}

// ---------------------------------------------------------------- shared pieces

const SAND = '#f2dfa6', CORAL = '#ff6f61', WHITE = '#fffaf0', TEAL = '#2ec4b6', SUN = '#ffd23f';
const WARM_GLOW: Paint = [2.4, 1.6, 0.6];

/** A little palm: a leaning trunk and five fronds (fans of cones), about 9 m. */
function palm(m: ModelBuilder, x: number, z: number, h = 9, lean = 0.15): void {
  m.cyl(0.35, 0.5, h, '#8a6a44', [x, h / 2, z], [0, 0, lean], 5, false);
  const tx = x - Math.sin(lean) * h;
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    m.cone(0.9, 5, k % 2 ? '#3f9a4a' : '#56b85a', [tx + Math.cos(a) * 2.2, h - 0.4, z + Math.sin(a) * 2.2], [Math.cos(a) * 1.9, 0, -Math.sin(a) * 1.9], 3, false);
  }
}

/** A banded rock column (a butte, a hoodoo, a sea stack): `bands` drums of `colours`, a cap. */
function column(m: ModelBuilder, x: number, z: number, r: number, h: number, colours: readonly Paint[], cap: Paint, seg = 8): void {
  const bands = colours.length, bh = h / bands;
  for (let i = 0; i < bands; i++) {
    const rr = r * (1 - i * 0.05) * (i % 2 ? 0.96 : 1.02);
    m.cyl(rr * 0.97, rr, bh + 0.2, colours[i], [x, i * bh + bh / 2, z], [0, i * 0.7, 0], seg, false);
  }
  m.ball([r * 0.95, Math.max(1.2, r * 0.18), r * 0.95], cap, [x, h, z], undefined, seg, false);
}

/** A sailboat (for the orbiting movers): white hull, coral stripe, a white and a coloured sail; bow +Z. */
function sailboat(sail: Paint): BufferGeometry {
  return model((m) => {
    m.box([3, 1.4, 9], WHITE, [0, 0.4, 0]);
    m.box([3.05, 0.35, 9.05], CORAL, [0, 0.05, 0], undefined, false);
    m.cone(1.5, 2.6, WHITE, [0, 0.4, 5.6], [Math.PI / 2, 0, 0], 4, false);
    m.cyl(0.12, 0.12, 11, '#8a6a44', [0, 6.5, 0.5], undefined, 4, false);
    m.cone(3.2, 9, WHITE, [0, 6.8, -1.2], [0, 0, 0], 3, false);
    m.cone(2.2, 6, sail, [0, 5, 2.8], [0, 0, 0], 3, false);
  });
}

/** A hot-air balloon in bands of two colours, a basket under it; about 22 m tall. */
function hotAirBalloon(a: Paint, b: Paint): BufferGeometry {
  return model((m) => {
    const rings: [number, number][] = [[3.6, 0], [6.4, 3.2], [7.4, 6.4], [7.0, 9.6], [5.2, 12.8]];
    for (let i = 0; i < rings.length; i++) {
      const [r, y] = rings[i], rTop = rings[i + 1]?.[0] ?? 2.2;
      m.cyl(rTop, r, 3.2, i % 2 ? a : b, [0, 6 + y + 1.6, 0], undefined, 10, false);
    }
    m.ball([2.3, 1.4, 2.3], a, [0, 6 + 16, 0], undefined, 8, false);
    m.box([2.2, 1.6, 2.2], '#a0703c', [0, 0.8, 0], undefined, false);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) m.cyl(0.05, 0.05, 5, '#5a3a22', [x * 1.4, 3.8, z * 1.4], undefined, 3, false);
  });
}

/** A small blimp (sky road movers): cream envelope, gold bands, fins, a gondola; nose +Z, about 26 m. */
function blimp(band: Paint): BufferGeometry {
  return model((m) => {
    m.ball([4.2, 4.2, 12], '#fff1c1', [0, 0, 0], undefined, 12, false);
    for (const z of [-5, 3]) m.ball([4.25, 4.25, 0.8], band, [0, 0, z], undefined, 12, false);
    for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) m.box([0.3, 3.4, 3.2], CORAL, [Math.sin(a) * 2.4, Math.cos(a) * 2.4, -10.5], [0, 0, a], false);
    m.box([2.2, 1.4, 5], '#b8452f', [0, -4.9, 1], undefined, false);
    m.box([2.3, 0.5, 3.6], WARM_GLOW, [0, -4.8, 1], undefined, false);
  });
}

// ================================================================ Harbor Loop: a sea horizon with islands

function harbour(v: Vista): void {
  // the landmark ahead of the start: a dormant volcano island with a beach, a skirt of palms and a wisp of smoke
  const volcano = model((m) => {
    m.ball([80, 5, 66], SAND, [0, 0, 0], undefined, 16, false);
    m.ball([70, 20, 58], '#3f9a44', [0, 0, 0], undefined, 16, false);
    m.cone(58, 32, '#358a3e', [0, 27, 0], undefined, 16, false);
    m.cone(46, 64, '#6e4c3e', [0, 50, 0], undefined, 14, false);
    m.cone(24, 26, '#553a30', [0, 72, 0], [0.04, 0, 0.03], 12, false);
    m.ball([13, 3.4, 13], '#2e1f1a', [0, 84.5, 0], undefined, 10, false);
    // green gullies climbing the brown upper slopes
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + 0.5; m.ball([6, 16, 6], '#3f9a44', [Math.cos(a) * 30, 44, Math.sin(a) * 30], [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5], 6, false); }
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2 + 0.2; palm(m, Math.cos(a) * 62, Math.sin(a) * 50, 9 + (k % 3) * 2, 0.1 + (k % 2) * 0.12); }
  });
  const vp = v.solid(volcano, -12, v.out(230), 0, 1.15);
  v.landmark = [vp[0], vp[1] + 97, vp[2]];
  for (let k = 0; k < 8; k++) v.glows.push(mover(spark(8, [0.85, 0.82, 0.86]), [vp[0], vp[1] + 99, vp[2]], 0, [MOVE.rise, k / 8, 0.05, 70]));

  // a rocky headland with a lighthouse and its keeper's cottage
  const headland = model((m) => {
    m.rock(26, '#c2ab86', [0, 6, 0], [0.3, 0.2, 0.1], [1.4, 0.9, 1.1]);
    m.rock(20, '#b39a74', [26, 3, 12], [0.8, 0.4, 0.2], [1.2, 0.8, 1]);
    m.ball([30, 4, 24], '#6ab04c', [4, 26, 0], undefined, 10, false);
    for (let i = 0; i < 5; i++) m.cyl(2.8 - i * 0.2, 3 - i * 0.2, 4, i % 2 ? CORAL : WHITE, [0, 30 + i * 4, 0], undefined, 10, false);
    m.cyl(2.2, 2.2, 3, WARM_GLOW, [0, 51.5, 0], undefined, 8, false);
    m.cone(3, 3.2, CORAL, [0, 54.6, 0], undefined, 10, false);
    m.box([7, 4, 5], WHITE, [9, 30, 4]);
    m.cone(4.8, 3, CORAL, [9, 33.4, 4], [0, Math.PI / 4, 0], 4, false);
  });
  v.solid(headland, 62, v.out(150));

  // a hillside town climbing a far slope: pastel houses in steps, a clock tower at the top
  const town = model((m) => {
    m.ball([78, 34, 58], '#6aa84f', [0, 0, 0], undefined, 14, false);
    m.ball([80, 3, 60], SAND, [0, 0, 0], undefined, 14, false);
    const walls = ['#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#ffc6ff', '#ffadad'];
    const roofs = [CORAL, TEAL, '#e0664f', '#4f7cac'];
    let k = 0;
    for (let row = 0; row < 4; row++) {
      for (let i = 0; i < 6 - row; i++) {
        const x = -40 + row * 8 + i * 15 + ((row * 7) % 5), z = 28 - row * 12;
        const e = 1 - (x / 78) ** 2 - (z / 58) ** 2;
        if (e <= 0) continue;
        const y = 34 * Math.sqrt(e), w = 6 + (k % 3), h = 5 + (k % 2) * 2;
        m.box([w, h, 6], walls[k % walls.length], [x, y + h / 2 - 1.5, z], [0, (k % 4) * 0.1, 0]);
        m.cone(w * 0.78, 3.4, roofs[k % roofs.length], [x, y + h - 1.5 + 1.7, z], [0, Math.PI / 4 + (k % 4) * 0.1, 0], 4, false);
        k++;
      }
    }
    m.box([5, 18, 5], WHITE, [4, 32 + 9, -8]);
    m.cone(4.2, 7, CORAL, [4, 32 + 18 + 3.5, -8], [0, Math.PI / 4, 0], 4, false);
    m.cyl(1.6, 1.6, 0.4, SUN, [4, 32 + 15, -5.4], [Math.PI / 2, 0, 0], 10, false);
  });
  v.solid(town, -75, v.out(170));

  // a long bay bridge on coral towers, its cables sagging between them
  const bridge = model((m) => {
    const L = 300;
    m.box([L, 2.4, 11], '#e8e2d6', [0, 16, 0]);
    m.box([L, 0.9, 11.2], '#c9c1b2', [0, 14.6, 0], undefined, false);
    for (let i = 0; i <= 10; i++) m.box([6, 16, 8], '#d6cfc2', [-L / 2 + (i * L) / 10, 6.5, 0], undefined, false);
    for (const x of [-60, 60]) {
      for (const z of [-4.5, 4.5]) m.box([3.4, 58, 3.4], '#e8584f', [x, 29, z], undefined, false);
      for (const y of [30, 50]) m.box([3, 2.6, 12], '#e8584f', [x, y, 0], undefined, false);
    }
    const cable = (x0: number, y0: number, x1: number, y1: number, sag: number) => {
      for (let i = 0; i < 8; i++) {
        const u0 = i / 8, u1 = (i + 1) / 8;
        const a: V3 = [x0 + (x1 - x0) * u0, y0 + (y1 - y0) * u0 - sag * 4 * u0 * (1 - u0), 0];
        const b: V3 = [x0 + (x1 - x0) * u1, y0 + (y1 - y0) * u1 - sag * 4 * u1 * (1 - u1), 0];
        for (const z of [-4.5, 4.5]) rodY(m, [a[0], a[1], z], [b[0], b[1], z], 0.5, '#e8584f');
      }
    };
    cable(-60, 57, 60, 57, 38);
    cable(-150, 18, -60, 57, 6);
    cable(60, 57, 150, 18, 6);
    // the land it joins at each end: rocky shores with green tops
    for (const s of [-1, 1]) {
      m.rock(24, '#b39a74', [s * 168, 2, 0], [0.3, s, 0.2], [1.3, 0.75, 1.2]);
      m.ball([30, 5, 26], '#62a64a', [s * 172, 15, 0], undefined, 10, false);
    }
  });
  v.solid(bridge, 168, v.out(190));

  // sea stacks off the cliffs
  const stacks = model((m) => {
    column(m, 0, 0, 7, 34, ['#b8a07c', '#a88f6c', '#c2ab86', '#a88f6c'], '#6ab04c', 7);
    column(m, 16, 10, 5, 22, ['#b8a07c', '#c2ab86', '#a88f6c'], '#6ab04c', 7);
    column(m, -12, 14, 4, 15, ['#c2ab86', '#a88f6c'], '#6ab04c', 7);
  });
  v.solid(stacks, 105, v.out(110));
  v.solid(stacks, -140, v.out(130), 0, 1.3, 1.1);

  // sailboats: slow circles out on the bay
  const sails: Paint[] = [CORAL, TEAL, SUN, '#7fc8ff', '#ff9ec7', CORAL];
  [25, 85, 140, 205, 250, 320].forEach((deg, i) => {
    const c = v.at(deg, v.out(95 + (i % 3) * 35), 0.2);
    v.movers.push(mover(sailboat(sails[i]), c, 0, [MOVE.orbit, i * 1.7, 0.035 + (i % 2) * 0.012, 30 + (i % 3) * 14]));
  });
}

// ================================================================ Meadow Run: hills and a valley

function meadow(v: Vista): void {
  // the landmark ahead of the start: one giant lone tree on a knoll, a round door in its root
  const tree = model((m) => {
    m.ball([46, 10, 40], '#6fb24a', [0, 0, 0], undefined, 12, false);
    m.cone(9, 10, '#7a5230', [0, 9, 0], undefined, 9, false);
    m.cyl(4.2, 6, 36, '#7a5230', [0, 26, 0], [0, 0, 0.03], 9, false);
    for (const [a, l] of [[0.4, 14], [2.3, 12], [4.1, 13]] as const) rodY(m, [0, 34, 0], [Math.cos(a) * l, 44, Math.sin(a) * l], 1.6, '#6b4a2b');
    const leaves: [number, number, number, number][] = [[0, 52, 0, 20], [14, 46, 4, 14], [-13, 46, -3, 14], [3, 45, 14, 13], [-4, 46, -14, 13], [9, 58, -6, 12], [-8, 57, 7, 12]];
    leaves.forEach(([x, y, z, r], i) => m.ball([r, r * 0.8, r], ['#2f7a34', '#3f9a3e', '#4fae48'][i % 3], [x, y, z], undefined, 9, false));
    m.cyl(2.2, 2.2, 0.4, '#5a3a22', [0, 13, 5.6], [Math.PI / 2 - 0.1, 0, 0], 10, false);
  });
  const tp0 = v.solid(tree, 8, v.out(120), 0, 1.35);
  v.landmark = [tp0[0], tp0[1] + 80, tp0[2]];

  // green hills, each with a windmill on its crest (its sails turn: movers)
  const hill = model((m) => {
    m.ball([46, 17, 38], '#6bb043', [0, 0, 0], undefined, 12, false);
    m.cyl(2.6, 3.6, 15, '#f3ead8', [0, 22, 0], undefined, 9, false);
    m.cone(3.4, 4.6, '#b7410e', [0, 31.8, 0], undefined, 9, false);
  });
  const sails = model((m) => {
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2 + 0.4;
      m.box([1.6, 10, 0.2], k % 2 ? WHITE : SUN, [Math.cos(a) * 5.4, Math.sin(a) * 5.4, 0], [0, 0, a - Math.PI / 2], false);
    }
    m.cyl(0.6, 0.6, 1.2, '#6b4a2b', [0, 0, 0], [Math.PI / 2, 0, 0], 8, false);
  });
  for (const [deg, d, s] of [[-58, 130, 1], [70, 150, 1.15], [172, 140, 0.95], [-120, 160, 1.1]] as const) {
    const p = v.at(deg, v.out(d)), yaw = v.facing(deg);
    v.solids.push(placed(hill, p, yaw, s));
    const hub: V3 = [p[0] + Math.sin(yaw) * 3.8 * s, p[1] + 29 * s, p[2] + Math.cos(yaw) * 3.8 * s];
    v.movers.push(mover(placed(sails, [0, 0, 0], 0, s), hub, yaw, [MOVE.spinZ, deg, 0.6, 0]));
  }

  // a river winding across the valley, a stone bridge over it, its water glinting
  const R = v.out(110), from = 95, to = 205, segs = 22;
  const water: [number, V3][] = [];
  for (let i = 0; i <= segs; i++) {
    const deg = from + ((to - from) * i) / segs, wig = Math.sin(i * 0.9) * 14;
    water.push([deg, v.at(deg, R + wig, 0.35)]);
  }
  const river = new ModelBuilder();
  for (let i = 0; i < segs; i++) {
    const a = water[i][1], b = water[i + 1][1], dx = b[0] - a[0], dz = b[2] - a[2], len = Math.hypot(dx, dz), yaw = Math.atan2(dx, dz);
    const mid: V3 = [(a[0] + b[0]) / 2, a[1], (a[2] + b[2]) / 2];
    river.box([18, 0.3, len + 2], '#4aa8e0', mid, [0, yaw, 0], false);
    river.box([24, 0.2, len + 2], '#8fcf6a', [mid[0], mid[1] - 0.12, mid[2]], [0, yaw, 0], false);
    if (i % 2 === 0) v.glows.push(mover(model((m) => m.box([10, 0.1, len * 0.8], [0.5, 0.9, 1.2], [0, 0, 0], undefined, false)), [mid[0], mid[1] + 0.25, mid[2]], yaw, [MOVE.shimmer, i * 0.37, 0.25, 0.9], [0, 0, 1, 0.08]));
  }
  v.solids.push(river.build());
  const [bdeg, bp] = water[11], byaw = v.facing(bdeg);
  v.solids.push(placed(model((m) => {
    m.box([34, 2, 7], '#b9b3ad', [0, 7, 0]);
    for (const x of [-10, 0, 10]) m.cyl(4.2, 4.2, 7, '#a8a29c', [x, 3.5, 0], [Math.PI / 2, 0, 0], 10, false);
    for (const x of [-16, 16]) m.box([3, 6, 7], '#a8a29c', [x, 3, 0], undefined, false);
    m.box([34, 1.2, 0.6], '#cfc9c2', [0, 8.6, 3.2], undefined, false);
    m.box([34, 1.2, 0.6], '#cfc9c2', [0, 8.6, -3.2], undefined, false);
  }), [bp[0], bp[1] - 0.4, bp[2]], byaw + Math.PI / 2));

  // patchwork fields on the gentle slopes near the valley
  const fields = model((m) => {
    const crops = ['#8cc24a', '#c9c254', '#5a9a34', '#d9b45a', '#a8c65a', '#6fae3a'];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) m.box([38, 0.5 + ((i + j) % 2) * 0.3, 28], crops[(i * 3 + j * 2) % crops.length], [-60 + i * 40, 0.3, -30 + j * 30], [0, 0, 0], false);
    for (let i = 0; i < 5; i++) m.box([1, 1.4, 90], '#7a5a3a', [-80 + i * 40, 0.7, 0], undefined, false);
  });
  v.solid(fields, -30, v.out(115), -0.2);
  v.solid(fields, 125, v.out(105), -0.2, [0.8, 1, 1.2], 0.6);

  // hot-air balloons drifting over it all
  const colours: [Paint, Paint][] = [['#ff5a5f', SUN], ['#3a86ff', WHITE], ['#8338ec', '#ffbe0b'], [TEAL, '#ff006e'], ['#fb5607', WHITE]];
  [-30, 20, 60, 150, 230].forEach((deg, i) => {
    v.movers.push(mover(hotAirBalloon(...colours[i]), v.at(deg, v.out(60 + i * 18), 55 + (i % 3) * 22), 0, [MOVE.drift, i * 2.1, 0.35 + i * 0.05, 18]));
  });
}

// ================================================================ Canyon Rush: buttes, a gorge and a volcano

const CLAY = '#c65a3a', CREAM = '#ebb98c', RUST = '#a8462c', RED = '#d9774f';

function canyon(v: Vista): void {
  // the landmark ahead of the start: a far cinder cone, its crater glowing, a lava seam, dust rising
  const volcano = model((m) => {
    m.cone(96, 26, '#8a5642', [0, 13, 0], undefined, 16, false);
    m.cone(74, 70, '#5b3b33', [0, 38, 0], undefined, 16, false);
    m.cyl(17, 19, 4, '#3b2420', [0, 72, 0], undefined, 14, false);
    m.ball([15, 1.2, 15], [2.4, 0.7, 0.18], [0, 73.6, 0], undefined, 12, false);
    for (let i = 0; i < 5; i++) m.box([2.4 - i * 0.3, 0.6, 14], [2.2, 0.55, 0.12], [8 + i * 7.2, 66 - i * 9.8, 12 + i * 6], [0.62, 0.55, 0], false);
    for (const [x, z, r] of [[50, -30, 10], [-44, 40, 12], [60, 44, 8]] as const) m.rock(r, '#6e4638', [x, r * 0.4, z], [0.4, 0.2, 0.7]);
  });
  const vp = v.solid(volcano, 4, v.out(215));
  v.landmark = [vp[0], vp[1] + 74, vp[2]];
  for (let k = 0; k < 7; k++) v.glows.push(mover(spark(11, [0.3, 0.19, 0.12]), [vp[0], vp[1] + 76, vp[2]], 0, [MOVE.rise, k / 7, 0.045, 80]));

  // a timber train trestle between two buttes, a little train running across it
  const trestle = model((m) => {
    column(m, -52, 0, 17, 48, [CLAY, CREAM, RUST, RED, CREAM], RUST);
    column(m, 52, 0, 15, 44, [RUST, CREAM, CLAY, CREAM], CLAY);
    m.box([74, 1.6, 4.5], '#6b4a2b', [0, 41.8, 0], undefined, false);
    for (const z of [-1.1, 1.1]) m.box([74, 0.4, 0.3], '#8a8f99', [0, 42.8, z], undefined, false);
    for (let i = 0; i <= 8; i++) {
      const x = -36 + i * 9;
      for (const z of [-2.4, 2.4]) m.cyl(0.35, 0.45, 42, '#7a5236', [x, 21, z], undefined, 4, false);
      if (i < 8) for (const z of [-2.4, 2.4]) { rodY(m, [x, 2, z], [x + 9, 40, z], 0.22, '#7a5236'); rodY(m, [x + 9, 2, z], [x, 40, z], 0.22, '#7a5236'); }
    }
  });
  const tp = v.solid(trestle, -52, v.out(150)), tyaw = v.facing(-52);
  const train = model((m) => {
    m.box([2.4, 2.6, 7], '#2e3a4a', [0, 1.8, 3.8]);
    m.cyl(1.1, 1.1, 5, '#3c4b5c', [0, 2.2, 5.2], [Math.PI / 2, 0, 0], 8, false);
    m.cyl(0.35, 0.5, 1.8, '#1b1b2f', [0, 4.2, 6.6], undefined, 6, false);
    m.box([2.6, 0.4, 3], '#e8384f', [0, 3.3, 1.2], undefined, false);
    for (let c = 0; c < 3; c++) m.box([2.4, 2.2, 6], [CORAL, TEAL, SUN][c], [0, 1.6, -3.6 - c * 6.6]);
  });
  // across the trestle: along the model's X, turned with it
  const along: V3 = [Math.cos(tyaw), 0, -Math.sin(tyaw)];
  v.movers.push(mover(train, [tp[0] - along[0] * 30, tp[1] + 42.8, tp[2] - along[2] * 30], tyaw + Math.PI / 2, [MOVE.shuttle, 0, 0.18, 0], [along[0], 0, along[2], 60]));

  // a rope bridge between two hoodoos
  const rope = model((m) => {
    column(m, -24, 0, 8, 40, [CLAY, CREAM, RUST, CLAY], RUST, 7);
    column(m, 24, 0, 7, 36, [RUST, CREAM, CLAY, RED], CLAY, 7);
    for (let i = 0; i < 12; i++) {
      const u = (i + 0.5) / 12, x = -18 + 36 * u, y = 38 - 6 * 4 * u * (1 - u);
      m.box([2.6, 0.3, 3.2], '#a0703c', [x, y, 0], [0, 0, (u - 0.5) * 0.5], false);
    }
    for (const z of [-1.7, 1.7]) for (let i = 0; i < 6; i++) {
      const u0 = i / 6, u1 = (i + 1) / 6;
      rodY(m, [-18 + 36 * u0, 39.3 - 6 * 4 * u0 * (1 - u0), z], [-18 + 36 * u1, 39.3 - 6 * 4 * u1 * (1 - u1), z], 0.15, '#d9c08a');
    }
  });
  v.solid(rope, 58, v.out(120));

  // the mouth of a deep far gorge: two great banded walls with a river running out between them
  const gorge = model((m) => {
    for (const s of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const z = -60 + i * 40;
        column(m, s * (30 + i * 4), z, 20 + (i % 2) * 4, 56 - i * 6 + (s > 0 ? 6 : 0), [CLAY, CREAM, RUST, RED, CREAM, CLAY], RUST, 9);
      }
    }
    m.box([16, 0.4, 170], '#4aa8e0', [0, 0.25, 0], undefined, false);
    m.box([26, 0.3, 170], '#d9a56d', [0, 0.1, 0], undefined, false);
  });
  const gp = v.solid(gorge, 130, v.out(170)), gyaw = v.facing(130);
  v.glows.push(mover(model((m) => m.box([8, 0.1, 160], [0.55, 0.95, 1.3], [0, 0, 0], undefined, false)), [gp[0], gp[1] + 0.5, gp[2]], gyaw, [MOVE.shimmer, 0, 0.3, 0.9], [0, 0, 1, 0.05]));

  // clusters of tall buttes framing the far corners
  const buttes = model((m) => {
    column(m, 0, 0, 20, 66, [CLAY, CREAM, RUST, RED, CREAM, CLAY, RUST], RUST, 10);
    column(m, 38, 16, 14, 48, [RUST, CREAM, CLAY, CREAM, RED], CLAY, 9);
    column(m, -30, 22, 11, 38, [CLAY, CREAM, RUST, CREAM], RUST, 8);
  });
  v.solid(buttes, -118, v.out(170));
  v.solid(buttes, 178, v.out(190), 0, 1.15, 2.1);
  v.solid(buttes, 88, v.out(230), 0, 0.9, 0.7);
}

// ================================================================ Frostbite Pass: a glacier peak and a village

function frost(v: Vista): void {
  // the signature peak ahead of the start: rock shoulders, a snow cap, a glacier flowing down its face
  const peak = model((m) => {
    m.cone(150, 110, '#56627a', [0, 55, 0], undefined, 12, false);
    m.cone(92, 120, '#66728c', [8, 120, -6], [0.02, 0.3, -0.03], 11, false);
    m.cone(44, 64, '#f7faff', [10, 170, -8], [0.02, 0.3, -0.03], 11, false);
    // snow ridges down the rock, and a snowfield on the lower shoulders
    for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 + 0.3; m.cone(9, 70, '#eef4ff', [8 + Math.cos(a) * 52, 120, -6 + Math.sin(a) * 52], [-Math.sin(a) * 0.42, 0, Math.cos(a) * 0.42], 5, false); }
    m.ball([150, 14, 150], '#eef4ff', [0, 0, 0], undefined, 12, false);
    for (const [x, z, r] of [[110, 40, 28], [-100, 60, 32], [60, -110, 26]] as const) m.rock(r, '#5d6b85', [x, r * 0.5, z], [0.3, 0.6, 0.2], [1.2, 1.4, 1]);
    // the glacier: a tongue of blue ice down the face toward the road (+Z)
    m.ball([22, 7, 96], '#bfe8f7', [4, 62, 88], [0.48, 0, 0], 10, false);
    m.ball([14, 5, 60], '#dff5fc', [4, 88, 52], [0.55, 0, 0], 8, false);
    for (let i = 0; i < 5; i++) m.box([30 - i * 3, 0.8, 1.2], '#7fb8d6', [4, 40 + i * 12, 128 - i * 18], [0.5, 0, 0], false);
  });
  const pk = v.solid(peak, 6, v.out(330));
  v.landmark = [pk[0], pk[1] + 200, pk[2]];

  // long snowy ridges dark with firs, round the sides and back of the valley
  const ridge = model((m) => {
    m.ball([150, 30, 46], '#eef4ff', [0, 0, 0], undefined, 12, false);
    for (let i = 0; i < 26; i++) {
      const x = -120 + (i * 240) / 25 + ((i * 37) % 9) - 4, e = 1 - (x / 150) ** 2;
      if (e <= 0.05) continue;
      const z = ((i * 53) % 30) - 15, y = 30 * Math.sqrt(Math.max(0, e - (z / 46) ** 2)), h = 14 + (i % 4) * 3;
      m.cone(h * 0.32, h, ['#1f5c45', '#276b50', '#2f7a5b'][i % 3], [x, y + h / 2 - 1, z], undefined, 6, false);
      m.cone(h * 0.12, h * 0.25, '#f6faff', [x, y + h * 0.9, z], undefined, 5, false);
    }
  });
  v.solid(ridge, 150, v.out(190));
  v.solid(ridge, -128, v.out(210), 0, [1.2, 0.9, 1], 0.4);
  v.solid(ridge, 205, v.out(230), 0, 0.9, -0.3);

  // a far frozen-waterfall cliff: the roadside set-piece, three times over
  const falls = decorGeometry('frozen-falls')?.body;
  if (falls) v.solid(falls, -48, v.out(160), 0, 3.2, Math.PI / 2);

  // a village on a snowy hill, its windows lit, a church spire
  const village = model((m) => {
    m.ball([64, 24, 48], '#f4f8ff', [0, 0, 0], undefined, 12, false);
    const walls = ['#a0703c', '#ffb3c7', '#7fd6cf', '#ffd66b', '#b07a4a'];
    let k = 0;
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 5 - row; i++) {
        const x = -30 + row * 9 + i * 14, z = 18 - row * 12, e = 1 - (x / 64) ** 2 - (z / 48) ** 2;
        if (e <= 0) continue;
        const y = 24 * Math.sqrt(e);
        m.box([7, 5, 6], walls[k % walls.length], [x, y + 1.5, z]);
        m.cone(5.4, 4, '#fbfdff', [x, y + 6, z], [0, Math.PI / 4, 0], 4, false);
        m.box([1.4, 1.4, 0.2], WARM_GLOW, [x - 1.6, y + 2.2, z + 3.05], undefined, false);
        m.box([1.4, 1.4, 0.2], WARM_GLOW, [x + 1.6, y + 2.2, z + 3.05], undefined, false);
        k++;
      }
    }
    m.box([5, 14, 5], WHITE, [2, 28, -6]);
    m.cone(3.6, 10, '#35506e', [2, 40, -6], [0, Math.PI / 4, 0], 4, false);
    m.box([1.4, 2, 0.2], WARM_GLOW, [2, 31, -3.4], undefined, false);
  });
  const vg = v.solid(village, 62, v.out(150));

  // a cable car line from the village up toward the peak's shoulder; two cabins ride it
  const top = v.at(6, v.out(330) - 72, 86), low: V3 = [vg[0], vg[1] + 30, vg[2]];
  const dx = top[0] - low[0], dy = top[1] - low[1], dz = top[2] - low[2], len = Math.hypot(dx, dy, dz);
  const line = new ModelBuilder();
  for (const side of [-1.6, 1.6]) {
    const ox = (-dz / Math.hypot(dx, dz)) * side, oz = (dx / Math.hypot(dx, dz)) * side;
    rodY(line, [low[0] + ox, low[1], low[2] + oz], [top[0] + ox, top[1], top[2] + oz], 0.25, '#2b3a55');
  }
  for (let i = 1; i <= 3; i++) {
    const u = i / 4, x = low[0] + dx * u, y = low[1] + dy * u, z = low[2] + dz * u;
    line.cyl(1, 1.6, y - v.floor + 1, '#6f8fae', [x, (v.floor + y) / 2, z], undefined, 6, false);
    line.box([6, 1, 1.4], '#4d6a88', [x, y + 0.5, z], [0, Math.atan2(dx, dz) + Math.PI / 2, 0], false);
  }
  line.box([10, 6, 8], '#8c96a8', [top[0], top[1] - 2, top[2]]);
  v.solids.push(line.build());
  const cabin = model((m) => {
    m.box([3.2, 2.6, 2.6], '#e8384f', [0, -4.2, 0]);
    m.box([3.3, 0.9, 2.7], [1.4, 1.8, 2.2], [0, -3.8, 0], undefined, false);
    m.cyl(0.1, 0.1, 3, '#2b3a55', [0, -1.5, 0], undefined, 4, false);
  });
  const dir: [number, number, number, number] = [dx / len, dy / len, dz / len, len];
  for (const ph of [0, Math.PI]) v.movers.push(mover(cabin, low, Math.atan2(dx, dz), [MOVE.shuttle, ph, 0.12, 0], dir));
}

// ================================================================ Boardwalk Nights: a city, a moon and fireworks

function boardwalk(v: Vista): void {
  // a far island with a lit tower, a beacon blinking on top
  const island = model((m) => {
    m.ball([44, 12, 34], '#2c2a4a', [0, 0, 0], undefined, 12, false);
    m.rock(16, '#3a3560', [14, 6, -8], [0.3, 0.5, 0.2], [1.3, 1, 1]);
    for (let i = 0; i < 6; i++) m.cyl(4.6 - i * 0.3, 5 - i * 0.3, 9, i % 2 ? '#4a4a7a' : '#5a5a8a', [0, 12 + i * 9, 0], undefined, 10, false);
    for (let i = 0; i < 6; i++) m.cyl(5.3 - i * 0.3, 5.3 - i * 0.3, 1.1, [2.2, 1.7, 0.7], [0, 12.5 + i * 9, 0], undefined, 10, false);
    m.cone(3.6, 8, '#ff2e97', [0, 70, 0], undefined, 8, false);
  });
  const ip = v.solid(island, -22, v.out(200));
  v.landmark = [ip[0], ip[1] + 74, ip[2]];
  v.glows.push(mover(spark(2.4, [3, 0.4, 1.4]), [ip[0], ip[1] + 75, ip[2]], 0, [MOVE.blink, 0, 0.8, 0]));

  // a lighthouse on a far point, its beam sweeping the sea
  const point = model((m) => {
    m.rock(22, '#2e2a52', [0, 2, 0], [0.4, 0.2, 0.1], [1.4, 0.7, 1.1]);
    for (let i = 0; i < 5; i++) m.cyl(2.6 - i * 0.2, 2.8 - i * 0.2, 4, i % 2 ? '#2e5aa8' : WHITE, [0, 14 + i * 4, 0], undefined, 10, false);
    m.cyl(2, 2, 3, WARM_GLOW, [0, 35.5, 0], undefined, 8, false);
    m.cone(2.8, 3, '#2e5aa8', [0, 38.6, 0], undefined, 10, false);
  });
  const lp = v.solid(point, 72, v.out(150));
  const beam = model((m) => {
    // two long wedges of light, opposite ways
    for (const s of [1, -1]) m.cone(11, 160, [2.4, 2.2, 1.4], [0, 0, s * 80], [-s * Math.PI / 2, 0, 0], 6, false);
  });
  v.glows.push(mover(beam, [lp[0], lp[1] + 35.5, lp[2]], 0, [MOVE.beam, 0, 0.9, 160]));

  // skyscrapers in front of the far city: tall blocks with lit window bands and red lights on top
  const towers = model((m) => {
    const lit: Paint[] = [[2.2, 1.7, 0.7], [0.5, 2.2, 2.4], [2.4, 0.5, 1.6]];
    const blocks: [number, number, number, number, number][] = [[-70, 0, 14, 96, 0], [-44, 12, 12, 70, 1], [-20, -6, 16, 120, 2], [6, 10, 12, 84, 0], [30, -4, 14, 104, 1], [56, 8, 11, 62, 2], [80, -2, 13, 88, 0]];
    for (const [x, z, w, h, c] of blocks) {
      m.box([w, h, w], '#1d1a44', [x, h / 2, z]);
      for (let y = 8; y < h - 4; y += 7) m.box([w + 0.3, 1.6, w + 0.3], lit[(c + y) % 3], [x, y, z], undefined, false);
      m.cyl(0.25, 0.25, 12, '#8a8ab0', [x, h + 6, z], undefined, 4, false);
    }
  });
  const tp = v.solid(towers, 172, v.out(230), 0, 1, 0);
  for (const [dx, h] of [[-70, 96], [-20, 120], [30, 104]] as const) {
    const yaw = v.facing(172), off: V3 = [Math.cos(yaw) * dx, 0, -Math.sin(yaw) * dx];
    v.glows.push(mover(spark(1.6, [3, 0.2, 0.3]), [tp[0] + off[0], tp[1] + h + 12, tp[2] + off[2]], 0, [MOVE.blink, dx * 0.1, 0.6, 0]));
  }

  // fireworks over the sea: bursts of sparks, each centre on its own beat
  const colours: Paint[][] = [[[3, 0.5, 1.6], [3, 1.6, 0.4]], [[0.4, 2.2, 3], [2.6, 2.6, 2.6]], [[3, 2.2, 0.4], [3, 0.4, 0.4]], [[1.2, 3, 0.8], [0.6, 1.4, 3]], [[3, 0.6, 2.6], [0.4, 2.8, 2.4]]];
  [-40, 18, 55, 205, 262].forEach((deg, b) => {
    const c = v.at(deg, v.out(150 + (b % 3) * 40), 95 + (b % 2) * 30), n = 30;
    for (let i = 0; i < n; i++) {
      // a sphere of directions, spread evenly (golden spiral)
      const y = 1 - (2 * (i + 0.5)) / n, r = Math.sqrt(1 - y * y), a = i * 2.39996;
      v.glows.push(mover(spark(1.1, colours[b][i % 2]), c, 0, [MOVE.burst, b * 0.37, 1 / (3.4 + b * 0.45), 0], [Math.cos(a) * r, y, Math.sin(a) * r, 26 + (b % 2) * 8]));
    }
  });

  // the moon, ahead and to the left of the start, riding with the far ring round the camera: a pale
  // face and two rings of halo
  const moon = model((m) => {
    const layers: [number, Paint, number][] = [[48, [0.05, 0.04, 0.11], 0], [34, [0.12, 0.1, 0.22], 0.4], [21, [1.2, 1.14, 0.92], 0.8]];
    for (const [r, c, z] of layers) m.cyl(r, r, 0.4, c, [0, 0, z], [Math.PI / 2, 0, 0], 28, false);
  });
  const [fx, fz] = v.ctx.forward, a = ((v.ctx.mirrored ? 1 : -1) * 32 * Math.PI) / 180;
  const mx = (fx * Math.cos(a) - fz * Math.sin(a)) * 640, mz = (fz * Math.cos(a) + fx * Math.sin(a)) * 640;
  v.ringGlows.push(mover(moon, [mx, v.floor + 150, mz], Math.atan2(-mx, -mz), [MOVE.glow, 0, 0.3, 1]));
}

// ================================================================ Skyline Circuit: floating islands in the clouds

function skyline(v: Vista): void {
  // floating islands with waterfalls pouring off into the clouds
  const island = (trees: number) => model((m) => {
    m.ball([30, 5, 24], '#7cc85a', [0, 0, 0], undefined, 12, false);
    m.ball([29, 8, 23], '#b07a4a', [0, -4, 0], undefined, 12, false);
    m.cone(26, 44, '#9a7a6a', [0, -28, 0], [Math.PI, 0.3, 0], 9, false);
    m.cone(15, 30, '#8a6a5a', [8, -40, 5], [Math.PI, 0.9, 0.12], 7, false);
    for (let i = 0; i < trees; i++) {
      const a = i * 2.2, r = 8 + (i % 3) * 5;
      m.cyl(0.6, 0.8, 4, '#6b4a2b', [Math.cos(a) * r, 5, Math.sin(a) * r], undefined, 5, false);
      m.ball([3.6, 3.2, 3.6], i % 2 ? '#3f9a4a' : '#56b85a', [Math.cos(a) * r, 9, Math.sin(a) * r], undefined, 7, false);
    }
    m.box([4.5, 1.2, 1.4], '#4aa8e0', [0, 3.6, 22.6], undefined, false);
  });
  const fall = model((m) => m.box([4, 70, 0.4], [1.1, 1.5, 1.8], [0, -35, 0], undefined, false));
  const mist = spark(6, [0.5, 0.55, 0.6]);
  const spots: [number, number, number, number, number][] = [[-8, 130, 36, 1, 4], [-62, 110, 96, 0.8, 3], [66, 150, 30, 1.2, 5], [140, 120, 80, 0.9, 3], [-142, 140, 60, 1.1, 4], [205, 170, 110, 0.85, 3]];
  for (const [deg, d, y, s, trees] of spots) {
    const p = v.solid(island(trees), deg, v.out(d), y, s), yaw = v.facing(deg);
    const edge: V3 = [p[0] + Math.sin(yaw) * 23 * s, p[1] + 3 * s, p[2] + Math.cos(yaw) * 23 * s];
    v.glows.push(mover(fall, edge, yaw, [MOVE.shimmer, deg, 0.5, 0.8], [0, 1, 0, 0.04]));
    for (let k = 0; k < 3; k++) v.glows.push(mover(mist, [edge[0], edge[1] - 62, edge[2]], 0, [MOVE.rise, k / 3, 0.18, 10]));
  }

  // a far sky city on a great island: white towers under gold domes
  const city = model((m) => {
    m.ball([70, 10, 56], '#7cc85a', [0, 0, 0], undefined, 14, false);
    m.ball([68, 14, 54], '#b07a4a', [0, -8, 0], undefined, 14, false);
    m.cone(60, 80, '#9a7a6a', [0, -50, 0], [Math.PI, 0.2, 0], 11, false);
    const towers: [number, number, number, number][] = [[0, 0, 7, 46], [-22, 10, 5, 30], [20, -8, 5.5, 34], [-8, -22, 4, 24], [30, 16, 4, 22], [-34, -12, 4.5, 26]];
    for (const [x, z, r, h] of towers) {
      m.cyl(r, r * 1.1, h, '#f6f2e8', [x, 8 + h / 2, z], undefined, 10, false);
      m.ball([r * 1.05, r * 1.1, r * 1.05], '#f2b705', [x, 8 + h, z], undefined, 10, false);
      m.cone(0.8, 6, '#f2b705', [x, 8 + h + r + 2.6, z], undefined, 6, false);
      m.cyl(r * 1.02, r * 1.02, 1.4, WARM_GLOW, [x, 8 + h * 0.6, z], undefined, 10, false);
    }
  });
  const cp = v.solid(city, 8, v.out(300), 70);
  v.landmark = [cp[0], cp[1] + 55, cp[2]];

  // airships cruising in wide circles
  [[40, 140, 120], [160, 120, 150], [-100, 160, 135]].forEach(([deg, d, y], i) => {
    v.movers.push(mover(blimp([SUN, CORAL, TEAL][i]), v.at(deg, v.out(d), y), 0, [MOVE.orbit, i * 2, 0.03 + i * 0.008, 60 + i * 15]));
  });
}

/** A thin rod from a to b on a ModelBuilder (cables, braces, beams). */
function rodY(m: ModelBuilder, a: V3, b: V3, r: number, colour: Paint): void {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], len = Math.hypot(dx, dy, dz);
  // a cylinder stands along +Y; Euler XYZ with no Y turn takes +Y to (-sin z, cos z cos x, cos z sin x)
  const rx = Math.atan2(dz, dy), rz = -Math.asin(Math.max(-1, Math.min(1, dx / Math.max(1e-6, len))));
  m.cyl(r, r, len, colour, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], [rx, 0, rz], 4, false);
}

const BUILDERS: Readonly<Record<string, (v: Vista) => void>> = Object.freeze({ harbour, meadow, canyon, frost, boardwalk, skyline });

/** A track's far vista, or null for a biome with none. */
export function buildVista(ctx: VistaContext): VistaParts | null {
  const b = BUILDERS[ctx.biome];
  if (!b) return null;
  const v = new Vista(ctx);
  b(v);
  return v.parts();
}
