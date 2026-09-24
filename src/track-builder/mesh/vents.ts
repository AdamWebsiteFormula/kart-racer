// Launch vents (design.md Track thrills): a geyser on Canyon Rush, a steam vent on Frostbite Pass.
// Drawn from the same cycle the sim runs (hazards.ts ventPhase): a rim of rock or ice round a pool,
// a glow that swells and bubbles while it warns, and a column of spray or steam while it erupts.
// Three instanced meshes whatever the number of vents; race time only, so a replay looks the same.
import {
  AdditiveBlending, BufferGeometry, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group, InstancedMesh, Matrix4,
  MeshToonMaterial, Quaternion, RingGeometry, ShaderMaterial, UniformsLib, UniformsUtils, Vector3, type Texture,
} from 'three';
import { BUILDER } from '../constants.ts';
import type { Track } from '../track.ts';
import type { Rgb } from './palette.ts';

/** How each kind looks: the rim, the pool, the glow and the column (linear RGB; > 1 blooms). */
const LOOK: Readonly<Record<string, { rim: Rgb; pool: Rgb; glow: Rgb; column: Rgb; height: number; spread: number }>> = Object.freeze({
  geyser: { rim: [0.62, 0.27, 0.16], pool: [0.18, 0.72, 0.8], glow: [0.5, 1.6, 1.8], column: [0.85, 1.05, 1.15], height: 11, spread: 1.25 },
  steam: { rim: [0.86, 0.91, 0.97], pool: [0.12, 0.55, 0.78], glow: [1.6, 0.85, 0.35], column: [1.05, 1.05, 1.08], height: 9, spread: 1.9 },
});

/** A column's height over its eruption: shoots up fast, holds, sinks back (k 0..1). */
function columnRise(k: number): number {
  if (k < 0.15) return k / 0.15;
  if (k > 0.8) return Math.max(0, (1 - k) / 0.2);
  return 1;
}

/** The rim and pool as one geometry with vertex colours: a low stone ring round a disc of water. */
function baseGeometry(rim: Rgb, pool: Rgb): BufferGeometry {
  const R = BUILDER.ventRadius, seg = 20;
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const v = (x: number, y: number, z: number, c: Rgb) => { pos.push(x, y, z); col.push(c[0], c[1], c[2]); return pos.length / 3 - 1; };
  // the pool: a fan just above the road
  const c0 = v(0, 0.05, 0, pool);
  const ring: number[] = [];
  for (let i = 0; i <= seg; i++) { const a = (i / seg) * Math.PI * 2; ring.push(v(Math.cos(a) * R * 0.78, 0.05, Math.sin(a) * R * 0.78, pool)); }
  for (let i = 0; i < seg; i++) idx.push(c0, ring[i + 1], ring[i]);
  // the rim: a bumpy stone lip, inner wall, top, outer slope
  const lip = (i: number) => 0.22 + 0.08 * Math.sin(i * 2.3) * Math.cos(i * 1.1);
  const inner: number[] = [], top: number[] = [], outer: number[] = [], foot: number[] = [];
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), h = lip(i % seg);
    inner.push(v(ca * R * 0.78, 0.05, sa * R * 0.78, rim));
    top.push(v(ca * R * 0.86, h, sa * R * 0.86, rim));
    outer.push(v(ca * R, h * 0.8, sa * R, rim));
    foot.push(v(ca * R * 1.12, 0.02, sa * R * 1.12, rim));
  }
  for (const [a, b] of [[inner, top], [top, outer], [outer, foot]]) {
    for (let i = 0; i < seg; i++) idx.push(a[i], a[i + 1], b[i], a[i + 1], b[i + 1], b[i]);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Near the lens the spray fades right out (review, 24 Sept 2026: the chase camera passing a vent
// looked through the column and saw the whole left of the screen washed white): gone within
// NEAR_CLEAR metres, whole again by NEAR_FULL, so a kart riding the geyser 6 m ahead still shows it.
const NEAR = { clear: 2.0, full: 6.0 };
const COLUMN_VERT = `
varying vec2 vUv;
varying float vFade;
varying float vNear;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vFade = instanceMatrix[1][1] > 0.001 ? 1.0 : 0.0;
  vec4 mvPosition = viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
  vNear = length(mvPosition.xyz);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const COLUMN_FRAG = `
uniform float time;
uniform vec3 colour;
varying vec2 vUv;
varying float vFade;
varying float vNear;
#include <fog_pars_fragment>
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main() {
  // streaks racing up the column, thinning toward its top and its edges
  vec2 p = vec2(vUv.x * 9.0, vUv.y * 3.0 - time * 4.5);
  float n = noise(p) * 0.6 + noise(p * 2.3 + 7.0) * 0.4;
  float top = 1.0 - smoothstep(0.55, 1.0, vUv.y);
  float a = smoothstep(0.25, 0.75, n) * top * vFade * smoothstep(${NEAR.clear.toFixed(1)}, ${NEAR.full.toFixed(1)}, vNear);
  gl_FragColor = vec4(colour * (0.55 + 0.6 * n), a * 0.6); // see-through enough to watch your kart ride it
  #include <fog_fragment>
}`;

const GLOW_FRAG = `
uniform float time;
uniform vec3 colour;
varying vec2 vUv;
varying float vFade;
varying float vNear;
#include <fog_pars_fragment>
void main() {
  // the pool lights up from its middle, with rings of bubbles running outward
  float r = length(vUv - 0.5) * 2.0;
  float ring = 0.5 + 0.5 * sin(r * 18.0 - time * 9.0);
  float a = (1.0 - smoothstep(0.2, 1.0, r)) * (0.55 + 0.45 * ring) * vFade * smoothstep(${NEAR.clear.toFixed(1)}, ${NEAR.full.toFixed(1)}, vNear);
  gl_FragColor = vec4(colour, a);
  #include <fog_fragment>
}`;

function additive(frag: string, colour: Rgb, clock: { value: number }): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: COLUMN_VERT, fragmentShader: frag,
    uniforms: { ...UniformsUtils.clone(UniformsLib.fog), time: clock, colour: { value: new Vector3(...colour) } },
    transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, fog: true,
  });
}

/** Every vent on a track: built once, posed from race time by update(). */
export class VentView {
  readonly group = new Group();
  private readonly bases = new Map<string, InstancedMesh>();
  private readonly glows = new Map<string, InstancedMesh>();
  private readonly columns = new Map<string, InstancedMesh>();
  private readonly slot = new Map<string, { kind: string; i: number }>();
  private readonly clock = { value: 0 };
  private readonly track: Track;
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly v = new Vector3();
  private readonly s = new Vector3();

  constructor(track: Track, gradientMap: Texture | undefined) {
    this.track = track;
    const vents = track.hazards.vents(0);
    const byKind = new Map<string, string[]>();
    for (const v of vents) byKind.set(v.asset, [...(byKind.get(v.asset) ?? []), v.id]);
    for (const [kind, ids] of byKind) {
      const look = LOOK[kind] ?? LOOK.geyser;
      const base = new InstancedMesh(baseGeometry(look.rim, look.pool), new MeshToonMaterial({ vertexColors: true, gradientMap: gradientMap ?? null }), ids.length);
      base.receiveShadow = true;
      const glow = new InstancedMesh(new RingGeometry(0, BUILDER.ventRadius * 0.95, 24, 1).rotateX(-Math.PI / 2).translate(0, 0.08, 0), additive(GLOW_FRAG, look.glow, this.clock), ids.length);
      // a tapered column, open at both ends, unit height (scaled per eruption)
      const colGeo = new CylinderGeometry(BUILDER.ventRadius * 0.55 * look.spread, BUILDER.ventRadius * 0.45, 1, 16, 1, true).translate(0, 0.5, 0);
      const column = new InstancedMesh(colGeo, additive(COLUMN_FRAG, look.column, this.clock), ids.length);
      for (const m of [base, glow, column]) { m.frustumCulled = false; this.group.add(m); }
      glow.renderOrder = 2; column.renderOrder = 3;
      ids.forEach((id, i) => this.slot.set(id, { kind, i }));
      this.bases.set(kind, base); this.glows.set(kind, glow); this.columns.set(kind, column);
    }
    this.update(0);
  }

  /** Pose every vent at race time `time`. */
  update(time: number): void {
    this.clock.value = time;
    // nothing shows unless its vent is on and doing it this frame
    this.m.makeScale(0, 0, 0);
    for (const x of [...this.glows.values(), ...this.columns.values()]) for (let i = 0; i < x.count; i++) x.setMatrixAt(i, this.m);
    for (const v of this.track.hazards.vents(time)) {
      const sl = this.slot.get(v.id);
      if (!sl) continue;
      const look = LOOK[sl.kind] ?? LOOK.geyser;
      const p = v.position;
      this.m.compose(this.v.set(p[0], p[1], p[2]), this.q.identity(), this.s.set(1, 1, 1));
      this.bases.get(sl.kind)!.setMatrixAt(sl.i, this.m);
      // the glow: swells through the warning, stays lit while it erupts
      const g = v.state === 'warn' ? 0.35 + 0.65 * v.k : v.state === 'erupt' ? 1 : 0;
      this.m.compose(this.v.set(p[0], p[1], p[2]), this.q, this.s.set(Math.max(g, 1e-4), g > 0 ? 1 : 0, Math.max(g, 1e-4)));
      this.glows.get(sl.kind)!.setMatrixAt(sl.i, this.m);
      // the column: a short gurgle late in the warning, then the eruption
      const h = v.state === 'erupt' ? look.height * columnRise(v.k) : v.state === 'warn' ? Math.max(0, v.k - 0.6) * 2.5 : 0;
      this.m.compose(this.v.set(p[0], p[1], p[2]), this.q, this.s.set(1, Math.max(h, 0), 1));
      this.columns.get(sl.kind)!.setMatrixAt(sl.i, this.m);
    }
    for (const x of [...this.bases.values(), ...this.glows.values(), ...this.columns.values()]) x.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    for (const x of [...this.bases.values(), ...this.glows.values(), ...this.columns.values()]) {
      x.geometry.dispose();
      (x.material as MeshToonMaterial | ShaderMaterial).dispose();
      x.dispose();
    }
    this.group.clear();
  }
}
