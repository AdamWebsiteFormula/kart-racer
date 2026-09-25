// The Final Lap Shift's set-piece materials and geometry helpers (mesh/shiftStage.ts lays them out):
// glowing strips that light up along the road, weather that rides round the camera, a storm's cloud
// ceiling and lightning bolt, flood water, and vertex-coloured boxes for the props (planks, posts,
// girders). Every mesh is one draw call; what moves is posed in its vertex shader from a uniform, or
// (a few hundred vertices at most, for the seconds they move) on the CPU into preallocated arrays.
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Mesh, MeshBasicMaterial,
  NormalBlending, ShaderMaterial, UniformsLib, UniformsUtils,
} from 'three';
import type { Vec3 } from '../types.ts';
import type { Rgb } from './palette.ts';

/** The fog as an additive glow wants it: fade to nothing, not to the fog colour. */
const GLOW_FOG = `
#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogF = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
  #else
    float fogF = smoothstep(fogNear, fogFar, vFogDepth);
  #endif
  c *= 1.0 - fogF;
#endif`;

// ---------------------------------------------------------------- glowing strips

/**
 * What a glow vertex is: `aGlow` = (metres along its strip, 0..1 across it, the second it lights in a
 * sweep, the second it lights when nothing sweeps (reduced motion)); `aKind` = how it draws:
 * 0 a solid line, 1 dashes running forward, 2 a curtain of light fading upward, 3 a pulsing sign that bobs.
 */
export const GLOW_KIND = Object.freeze({ line: 0, dashes: 1, curtain: 2, sign: 3 });

const GLOW_VERT = `
uniform float uClock;
attribute vec4 aGlow;
attribute float aKind;
attribute vec3 color;
varying vec4 vGlow;
varying float vKind;
varying vec3 vColor;
varying float vDepth;
#include <fog_pars_vertex>
void main() {
  vGlow = aGlow; vKind = aKind; vColor = color;
  vec3 p = position;
  // a sign bobs gently
  if (aKind > 2.5) p.y += 0.25 * sin(uClock * 2.4);
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  vDepth = -mvPosition.z;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const GLOW_FRAG = `
uniform float uSince;
uniform float uClock;
uniform float uReduced;
uniform float uFade;
varying vec4 vGlow;
varying float vKind;
varying vec3 vColor;
varying float vDepth;
#include <fog_pars_fragment>
void main() {
  float t0 = uReduced > 0.5 ? vGlow.w : vGlow.z;
  float on = uSince < 0.0 ? 0.0 : clamp((uSince - t0) / (uReduced > 0.5 ? 0.7 : 0.18), 0.0, 1.0);
  if (on <= 0.0) discard;
  float across = vGlow.y;
  float edge = 1.0 - pow(abs(across * 2.0 - 1.0), 2.5);
  float a = edge;
  if (vKind > 0.5 && vKind < 1.5) {
    // dashes 1.6 m long every 3 m, running forward
    float d = fract(vGlow.x / 3.0 - uClock * 1.4);
    float w = fwidth(vGlow.x / 3.0) + 0.02;
    a *= smoothstep(0.0, w, d) * (1.0 - smoothstep(0.53 - w, 0.53, d));
  } else if (vKind > 1.5 && vKind < 2.5) {
    // a curtain of light: brightest at the road, gone 3 m up; soft at its sides
    a = (1.0 - across) * (1.0 - across) * smoothstep(0.0, 0.08, vGlow.x) * smoothstep(0.0, 0.08, 1.0 - vGlow.x) * (0.75 + 0.25 * sin(uClock * 3.0));
  } else if (vKind > 2.5) {
    a *= 0.7 + 0.3 * sin(uClock * 5.0);
  } else {
    // a line breathes slowly, brighter where a pulse runs along it
    a *= 0.8 + 0.2 * sin(vGlow.x * 0.12 - uClock * 4.0);
  }
  // each bit flares as it lights, then settles
  float flare = 1.0 + (uReduced > 0.5 ? 0.0 : 1.6 * exp(-(uSince - t0) * 3.5));
  // a light the camera passes through (a veil across the road) fades out against the lens, never a flash
  vec3 c = vColor * a * on * flare * uFade * smoothstep(1.5, 7.0, vDepth);
  ${GLOW_FOG}
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export interface GlowUniforms { uSince: { value: number }; uClock: { value: number }; uReduced: { value: number }; uFade: { value: number } }

/** One additive glow material; `u` holds its clocks (the stage sets them each frame). */
export function glowMaterial(u: GlowUniforms): ShaderMaterial {
  const m = new ShaderMaterial({
    vertexShader: GLOW_VERT, fragmentShader: GLOW_FRAG, fog: true, transparent: true, depthWrite: false,
    blending: AdditiveBlending, side: DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    uniforms: { ...UniformsUtils.clone(UniformsLib.fog), ...u },
  });
  return m;
}

/** Accumulates glow quads and strips into one geometry. */
export class GlowBuilder {
  private readonly pos: number[] = [];
  private readonly col: number[] = [];
  private readonly glow: number[] = [];
  private readonly kind: number[] = [];
  private readonly idx: number[] = [];

  /** A vertex; returns its index. */
  vert(p: Vec3, colour: Rgb, along: number, across: number, tSweep: number, tStart: number, kind: number): number {
    this.pos.push(p[0], p[1], p[2]);
    this.col.push(colour[0], colour[1], colour[2]);
    this.glow.push(along, across, tSweep, tStart);
    this.kind.push(kind);
    return this.pos.length / 3 - 1;
  }

  /** Two triangles a b c d (a quad in order round its edge). */
  quad(a: number, b: number, c: number, d: number): void { this.idx.push(a, b, c, a, c, d); }

  /**
   * A strip of rows (each row [left, right] points with its metres along and its sweep second);
   * consecutive rows joined. Rows whose `cut` is set start a new strip (a gap).
   */
  strip(rows: readonly { l: Vec3; r: Vec3; along: number; sweep: number; cut?: boolean }[], colour: (along: number) => Rgb, tStart: number, kind: number): void {
    let prev = -1;
    for (const row of rows) {
      const c = colour(row.along);
      const a = this.vert(row.l, c, row.along, 0, row.sweep, tStart, kind);
      this.vert(row.r, c, row.along, 1, row.sweep, tStart, kind);
      if (prev >= 0 && !row.cut) this.quad(prev, a, a + 1, prev + 1);
      prev = a;
    }
  }

  get empty(): boolean { return this.idx.length === 0; }

  build(): BufferGeometry {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new Float32BufferAttribute(this.col, 3));
    g.setAttribute('aGlow', new Float32BufferAttribute(this.glow, 4));
    g.setAttribute('aKind', new Float32BufferAttribute(this.kind, 1));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  }
}

// ---------------------------------------------------------------- weather

/** Rain and snow: how many, the box round the camera they fill (metres), how they fall (m/s), their size. */
export const WEATHER = Object.freeze({
  rain: Object.freeze({ count: 1500, box: [34, 22, 34] as const, fall: [-2.5, -21, 1.5] as const, width: 0.035, length: 0.85, colour: [0.72, 0.8, 0.95] as const, alpha: 0.3 }),
  snow: Object.freeze({ count: 2200, box: [42, 22, 42] as const, fall: [3.2, -2.6, 1.2] as const, width: 0.075, length: 0.075, colour: [1, 1, 1] as const, alpha: 0.85 }),
});

const WEATHER_VERT = `
uniform float uTime;
uniform float uDensity;
uniform vec3 uBox;
uniform vec3 uFall;
uniform float uWidth;
uniform float uLength;
attribute vec4 aSeed;
attribute vec2 aCorner;
varying float vFade;
varying vec2 vCorner;
void main() {
  vCorner = aCorner;
  if (aSeed.w > uDensity) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vFade = 0.0; return; }
  vec3 fall = uFall * (0.8 + 0.45 * fract(aSeed.w * 7.13));
  vec3 p = aSeed.xyz * uBox + fall * uTime;
#ifdef SNOW
  // flakes wander as they fall
  p.x += sin(uTime * 1.3 + aSeed.w * 40.0) * 0.7;
  p.z += cos(uTime * 1.1 + aSeed.w * 23.0) * 0.7;
#endif
  // held in the box round the camera, fixed in the world as the camera moves
  vec3 rel = mod(p - cameraPosition + 0.5 * uBox, uBox) - 0.5 * uBox;
  vec3 world = cameraPosition + rel;
  vec3 toCam = normalize(cameraPosition - world);
#ifdef SNOW
  vec3 side = normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
  vec3 up = cross(toCam, side);
  world += (side * aCorner.x + up * aCorner.y) * uWidth;
#else
  vec3 axis = normalize(fall);
  vec3 side = normalize(cross(axis, toCam));
  world += side * aCorner.x * uWidth + axis * aCorner.y * uLength;
#endif
  vec4 mv = viewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mv;
  // none against the lens, none popping at the box's edge
  float ring = length(rel.xz) / (0.5 * min(uBox.x, uBox.z));
  vFade = smoothstep(0.8, 2.6, -mv.z) * (1.0 - smoothstep(0.7, 1.0, ring)) * (1.0 - smoothstep(0.75, 1.0, abs(rel.y) / (0.5 * uBox.y)));
}`;

const WEATHER_FRAG = `
uniform vec3 uColour;
uniform float uAlpha;
uniform float uFlash;
varying float vFade;
varying vec2 vCorner;
void main() {
#ifdef SNOW
  float r = length(vCorner);
  float a = 1.0 - smoothstep(0.35, 1.0, r);
#else
  float a = (1.0 - abs(vCorner.x)) * (1.0 - smoothstep(0.6, 1.0, abs(vCorner.y)));
#endif
  a *= vFade * uAlpha * (1.0 + uFlash * 1.5);
  if (a < 0.004) discard;
  gl_FragColor = vec4(uColour * (1.0 + uFlash * 2.0), a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export interface WeatherUniforms { uTime: { value: number }; uDensity: { value: number }; uFlash: { value: number } }

/** Rain or snow in a box that rides round the camera: one draw, posed in its vertex shader. */
export function weatherMesh(kind: 'rain' | 'snow', u: WeatherUniforms): Mesh {
  const W = WEATHER[kind], n = W.count;
  const seed = new Float32Array(n * 4 * 4), corner = new Float32Array(n * 4 * 2), idx = new Uint32Array(n * 6);
  let s = 0x51f15e;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0x100000000; };
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (let i = 0; i < n; i++) {
    const x = rnd(), y = rnd(), z = rnd(), w = (i + 0.5) / n; // w orders them for the density cut
    for (let k = 0; k < 4; k++) {
      seed.set([x, y, z, w], (i * 4 + k) * 4);
      corner.set(corners[k], (i * 4 + k) * 2);
    }
    idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6);
  }
  const g = new BufferGeometry();
  // three wants a position; the vertex shader places everything itself
  g.setAttribute('position', new BufferAttribute(new Float32Array(n * 4 * 3), 3));
  g.setAttribute('aSeed', new BufferAttribute(seed, 4));
  g.setAttribute('aCorner', new BufferAttribute(corner, 2));
  g.setIndex(new BufferAttribute(idx, 1));
  const m = new ShaderMaterial({
    vertexShader: WEATHER_VERT, fragmentShader: WEATHER_FRAG, transparent: true, depthWrite: false, blending: NormalBlending,
    defines: kind === 'snow' ? { SNOW: '' } : {},
    uniforms: {
      ...u, uBox: { value: W.box.slice() }, uFall: { value: W.fall.slice() }, uWidth: { value: W.width }, uLength: { value: W.length },
      uColour: { value: new Color(...W.colour) }, uAlpha: { value: W.alpha },
    },
  });
  const mesh = new Mesh(g, m);
  mesh.name = `shift-${kind}`;
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  return mesh;
}

// ---------------------------------------------------------------- the storm's cloud ceiling

const CLOUD_VERT = `
uniform float uHeight;
varying vec3 vWorld;
void main() {
  // a disc round the camera, level at uHeight
  vec3 w = vec3(position.x + cameraPosition.x, uHeight, position.z + cameraPosition.z);
  vWorld = w;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`;

const CLOUD_FRAG = `
uniform float uCover;
uniform float uClock;
uniform float uFlash;
uniform float uReduced;
uniform vec2 uWind;
uniform vec3 uDark;
uniform vec3 uLight;
uniform float uRadius;
varying vec3 vWorld;
float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), u.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), u.x), u.y);
}
void main() {
  vec2 rel = vWorld.xz - cameraPosition.xz;
  float r = length(rel) / uRadius;
  // the front rolls in from upwind across the whole sky
  float along = dot(rel, uWind) / uRadius;
  // (reduced motion: it gathers where it is, no front sweeping over)
  float front = uCover * 2.5 - 1.25;
  float cover = uReduced > 0.5 ? uCover : 1.0 - smoothstep(front - 0.18, front + 0.18, along);
  vec2 q = vWorld.xz * 0.0055 + uWind * uClock * 0.012;
  float n = n2(q) * 0.55 + n2(q * 2.3 + 3.1) * 0.3 + n2(q * 5.1 - 1.7) * 0.15;
  float a = cover * (0.62 + 0.38 * n) * (1.0 - smoothstep(0.45, 1.0, r));
  if (a < 0.003) discard;
  vec3 c = mix(uDark, uLight, smoothstep(0.35, 0.85, n));
  c += vec3(0.85, 0.9, 1.0) * uFlash * (0.5 + n);
  gl_FragColor = vec4(c, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export interface CloudUniforms { uCover: { value: number }; uClock: { value: number }; uFlash: { value: number }; uHeight: { value: number }; uReduced: { value: number } }

/** A ceiling of storm cloud high over the course (at uHeight), riding with the camera; `wind` is the way the front rolls (unit xz). */
export function cloudMesh(u: CloudUniforms, wind: [number, number], radius = 900): Mesh {
  const g = new BufferGeometry();
  const seg = 48, pos: number[] = [0, 0, 0], idx: number[] = [];
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    pos.push(Math.cos(a) * radius, 0, Math.sin(a) * radius);
    if (i) idx.push(0, i + 1, i);
  }
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const m = new ShaderMaterial({
    vertexShader: CLOUD_VERT, fragmentShader: CLOUD_FRAG, transparent: true, depthWrite: false, side: DoubleSide,
    uniforms: {
      ...u, uWind: { value: wind.slice() }, uDark: { value: new Color(0.16, 0.18, 0.24) }, uLight: { value: new Color(0.36, 0.39, 0.47) },
      uRadius: { value: radius },
    },
  });
  const mesh = new Mesh(g, m);
  mesh.name = 'shift-clouds';
  mesh.frustumCulled = false;
  mesh.renderOrder = -1; // under every other see-through thing: rain, dust and sparks draw over it
  return mesh;
}

// ---------------------------------------------------------------- lightning

/** A forked bolt one metre tall (from y 1 down to 0), boxes along a jagged line and two short forks. */
export function boltGeometry(): BufferGeometry {
  const b = new Boxes();
  let s = 0x7a3b1;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0x100000000 - 0.5; };
  const line = (from: Vec3, steps: number, drop: number, jag: number, w: number) => {
    let p = from;
    for (let i = 0; i < steps; i++) {
      const q: Vec3 = [p[0] + rnd() * jag, p[1] - drop / steps, p[2] + rnd() * jag];
      b.rod(p, q, w, [1, 1, 1]);
      p = q;
    }
    return p;
  };
  // the stroke, then two forks; each drawn twice: a white core and a wider, fainter blue halo
  const core: Vec3[][] = [];
  const trace = (from: Vec3, steps: number, drop: number, jag: number) => {
    const pts: Vec3[] = [from];
    for (let i = 0; i < steps; i++) { const p = pts[i]; pts.push([p[0] + rnd() * jag, p[1] - drop / steps, p[2] + rnd() * jag]); }
    core.push(pts);
  };
  trace([0, 1, 0], 14, 1, 0.07);
  trace([0.02, 0.72, 0.01], 5, 0.22, 0.06);
  trace([-0.03, 0.45, 0.02], 4, 0.16, 0.05);
  core.forEach((pts, k) => { for (let i = 0; i + 1 < pts.length; i++) b.rod(pts[i], pts[i + 1], k ? 0.009 : 0.014, [1, 1, 1]); });
  core.forEach((pts, k) => { for (let i = 0; i + 1 < pts.length; i++) b.rod(pts[i], pts[i + 1], k ? 0.03 : 0.045, [0.16, 0.2, 0.42]); });
  void line;
  return b.build();
}

/** The bolt's material: white-blue past 1 (it blooms), its brightness the flash's. */
export function boltMaterial(): MeshBasicMaterial {
  const m = new MeshBasicMaterial({ color: new Color(2.6, 2.8, 3.4), vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false, fog: false });
  m.name = 'shift-bolt';
  return m;
}

// ---------------------------------------------------------------- flood water

const FLOOD_VERT = `
uniform float uRise;
attribute vec4 aFlood;
varying vec4 vFlood;
varying vec3 vWorld;
#include <fog_pars_vertex>
void main() {
  vFlood = aFlood;
  vec3 p = position;
  // the water comes up from under the road
  p.y -= (1.0 - uRise) * 0.45;
  vec4 w = modelMatrix * vec4(p, 1.0);
  vWorld = w.xyz;
  vec4 mvPosition = viewMatrix * w;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FLOOD_FRAG = `
uniform float uFront;
uniform float uClock;
uniform float uRise;
uniform float uLength;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uSparkle;
varying vec4 vFlood;
varying vec3 vWorld;
#include <fog_pars_fragment>
float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), u.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), u.x), u.y);
}
void main() {
  // vFlood: metres in from the sea side, 0..1 across, metres along, the row's width
  float wob = (n2(vec2(vFlood.z * 0.15, uClock * 0.6)) - 0.5) * 3.0;
  float front = uFront + wob;
  if (vFlood.x > front) discard;
  // a ragged, lapping edge on the land side and at each end
  float inner = vFlood.w - vFlood.x - 2.2 * n2(vec2(vFlood.z * 0.21, uClock * 0.35));
  float ends = min(vFlood.z, uLength - vFlood.z) - 3.0 * n2(vec2(vFlood.x * 0.3, 7.0 + uClock * 0.3));
  if (inner < 0.0 || ends < 0.0) discard;
  vec2 p = vWorld.xz * 0.08;
  float n = n2(p + vec2(uClock * 0.05, uClock * 0.03)) * 0.6 + n2(p * 2.3 - vec2(uClock * 0.04, -uClock * 0.06)) * 0.4;
  vec3 c = mix(uDeep, uShallow, smoothstep(0.3, 0.8, n));
  // the wet sheen: bright lines where two ripple fields cross
  vec2 q = vWorld.xz * 0.3;
  float d = abs(n2(q + vec2(uClock * 0.4, 0.0)) - n2(q * 1.07 - vec2(0.0, uClock * 0.35)));
  float line = 1.0 - smoothstep(0.0, max(0.012, fwidth(d) * 1.4), d);
  c = mix(c, uSparkle, line * 0.7);
  // foam: along the advancing edge, and lapping at the water's sides and ends
  float edge = smoothstep(0.0, 1.8, min(inner, ends));
  float lap = 0.5 + 0.5 * sin(vFlood.z * 0.7 + uClock * 2.2 + n * 4.0);
  float foam = max(1.0 - smoothstep(0.0, 1.6, front - vFlood.x), (1.0 - edge) * (0.55 + 0.45 * lap));
  foam *= step(0.45, n2(vWorld.xz * 0.9 + uClock * 0.3) + 0.35 * (1.0 - edge) + 0.4);
  c = mix(c, vec3(0.96, 0.99, 1.0), foam * 0.85);
  float a = mix(0.72, 0.95, foam) * smoothstep(0.0, 0.25, uRise);
  vec3 col = c;
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

export interface FloodUniforms { uFront: { value: number }; uClock: { value: number }; uRise: { value: number }; uLength: { value: number } }

/** The tide over a flooded road: see-through water with a wet sheen, foam at its edges and its advancing front. */
export function floodMaterial(u: FloodUniforms, deep = '#1b7fc0', shallow = '#46c2e6', sparkle = '#f2fdff'): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: FLOOD_VERT, fragmentShader: FLOOD_FRAG, fog: true, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    uniforms: { ...UniformsUtils.clone(UniformsLib.fog), ...u, uDeep: { value: new Color(deep) }, uShallow: { value: new Color(shallow) }, uSparkle: { value: new Color(sparkle) } },
  });
}

// ---------------------------------------------------------------- vertex-coloured boxes

/**
 * Boxes (planks, posts, girders, bulbs) into one vertex-coloured geometry, each vertex tagged with
 * the piece it belongs to, so a piece can be moved as one (a plank falling, a spoke swinging).
 * Colours above 1 light themselves (glow.ts glowFromVertexColours).
 */
export class Boxes {
  readonly pos: number[] = [];
  readonly col: number[] = [];
  readonly piece: number[] = [];
  readonly idx: number[] = [];
  /** the piece the next boxes belong to */
  current = -1;

  /** A box from its centre and three half-extent vectors. */
  box(c: Vec3, x: Vec3, y: Vec3, z: Vec3, colour: Rgb): void {
    const p = (sx: number, sy: number, sz: number): Vec3 => [
      c[0] + x[0] * sx + y[0] * sy + z[0] * sz, c[1] + x[1] * sx + y[1] * sy + z[1] * sz, c[2] + x[2] * sx + y[2] * sy + z[2] * sz,
    ];
    const quad = (a: Vec3, b: Vec3, d: Vec3, e: Vec3, shade: number) => {
      const i = this.pos.length / 3;
      for (const q of [a, b, d, e]) { this.pos.push(q[0], q[1], q[2]); this.col.push(colour[0] * shade, colour[1] * shade, colour[2] * shade); this.piece.push(this.current); }
      this.idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
    };
    quad(p(-1, -1, 1), p(1, -1, 1), p(1, 1, 1), p(-1, 1, 1), 0.92);
    quad(p(1, -1, -1), p(-1, -1, -1), p(-1, 1, -1), p(1, 1, -1), 0.92);
    quad(p(-1, 1, 1), p(1, 1, 1), p(1, 1, -1), p(-1, 1, -1), 1);
    quad(p(1, -1, 1), p(1, -1, -1), p(1, 1, -1), p(1, 1, 1), 0.85);
    quad(p(-1, -1, -1), p(-1, -1, 1), p(-1, 1, 1), p(-1, 1, -1), 0.85);
    quad(p(-1, -1, -1), p(1, -1, -1), p(1, -1, 1), p(-1, -1, 1), 0.7);
  }

  /** A square rod `w` half-thick from a to b. */
  rod(a: Vec3, b: Vec3, w: number, colour: Rgb): void {
    const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], len = Math.hypot(d[0], d[1], d[2]) || 1;
    const f: Vec3 = [d[0] / len, d[1] / len, d[2] / len];
    // any two directions across it
    const ref: Vec3 = Math.abs(f[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    let x: Vec3 = [f[1] * ref[2] - f[2] * ref[1], f[2] * ref[0] - f[0] * ref[2], f[0] * ref[1] - f[1] * ref[0]];
    const xl = Math.hypot(x[0], x[1], x[2]) || 1;
    x = [x[0] / xl, x[1] / xl, x[2] / xl];
    const y: Vec3 = [f[1] * x[2] - f[2] * x[1], f[2] * x[0] - f[0] * x[2], f[0] * x[1] - f[1] * x[0]];
    this.box([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], [x[0] * w, x[1] * w, x[2] * w], [f[0] * len / 2, f[1] * len / 2, f[2] * len / 2], [y[0] * w, y[1] * w, y[2] * w], colour);
  }

  build(): BufferGeometry {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new Float32BufferAttribute(this.col, 3));
    g.setIndex(this.idx);
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }
}
