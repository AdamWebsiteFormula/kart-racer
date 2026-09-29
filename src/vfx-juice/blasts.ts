// Shock rings and flashes for the items (28 Sept 2026, the new set: the Homing Rocket's explosion, the
// Shockwave's pulse, the Jump Jets' dive, Jet Mode's sonic boom, the EMP Blast, the Tractor Beam's lock):
// one InstancedMesh of quads, one draw call while any is alive. Each copy grows and fades on the GPU from
// the moment it was spawned (its start, length, radii and color are per-copy attributes), so a frame costs
// nothing on the CPU. Its clock is its own, the frames' seconds added up (a wall clock can step back: the
// dev tools' frames run ahead of the page's own). A ring lies in the plane square to its axis (flat on the road, or standing across the
// kart's way for a boom seen from behind); a flash is a soft round glow facing the camera. Additive, no
// depth writes, faded near the lens like the particles (a ring sweeping under the camera never whites it
// out). Visual only: the sim never reads it.
import { AdditiveBlending, InstancedBufferAttribute, InstancedMesh, PlaneGeometry, ShaderMaterial } from 'three';
import { PARTICLE } from './particles.ts';

/** A ring (flat in the plane square to `axis`) or a flash (a round glow facing the camera). */
export type BlastKind = 'ring' | 'flash';

export interface BlastOpts {
  kind: BlastKind;
  x: number; y: number; z: number;
  /** a ring's axis (the road's up for one on the road); ignored by a flash */
  ax?: number; ay?: number; az?: number;
  /** seconds from its start to gone */
  life: number;
  /** its radius at the start and at the end (m), growing fast then slowing (an ease out) */
  from: number; to: number;
  /** a ring's width as a share of its radius, at the start and at the end */
  width?: number; widthEnd?: number;
  /** linear color, above 1 blooms */
  r: number; g: number; b: number;
  /** the most of it that shows (0..1) */
  alpha?: number;
  /** seconds to wait before it starts (a second ring following the first) */
  delay?: number;
}

const VERT = `
attribute vec3 aCenter; attribute vec4 aAxis; attribute vec4 aColor; attribute vec4 aTime; attribute vec2 aWidth;
uniform float uTime;
varying vec2 vUv; varying vec4 vColor; varying float vAge; varying float vWidth; varying float vFlash;
void main() {
  float age = (uTime - aTime.x) / aTime.y;
  vUv = position.xy;
  vAge = age;
  vFlash = aAxis.w;
  vColor = aColor;
  float k = clamp(age, 0.0, 1.0);
  float e = 1.0 - (1.0 - k) * (1.0 - k) * (1.0 - k);
  float r = mix(aTime.z, aTime.w, e);
  vWidth = mix(aWidth.x, aWidth.y, k);
  vec4 mv;
  if (aAxis.w > 0.5) {
    mv = viewMatrix * vec4(aCenter, 1.0);
    mv.xy += position.xy * r;
  } else {
    vec3 n = normalize(aAxis.xyz);
    vec3 t = normalize(abs(n.y) < 0.99 ? cross(n, vec3(0.0, 1.0, 0.0)) : cross(n, vec3(1.0, 0.0, 0.0)));
    vec3 b = cross(n, t);
    mv = viewMatrix * vec4(aCenter + (t * position.x + b * position.y) * r, 1.0);
  }
  // nothing drawn before its start or after its end, and nothing near the lens
  float live = step(0.0, age) * step(age, 1.0);
  vColor.a *= live * smoothstep(${PARTICLE.nearFade[0].toFixed(2)}, ${PARTICLE.nearFade[1].toFixed(2)}, -mv.z);
  gl_Position = live > 0.5 ? projectionMatrix * mv : vec4(2.0, 2.0, 2.0, 1.0);
}`;

const FRAG = `
varying vec2 vUv; varying vec4 vColor; varying float vAge; varying float vWidth; varying float vFlash;
void main() {
  float d = length(vUv);
  if (d > 1.0) discard;
  float k = clamp(vAge, 0.0, 1.0);
  float shape;
  if (vFlash > 0.5) {
    // a soft round glow, hottest in the middle
    shape = exp(-d * d * 5.0);
  } else {
    // a ring: a crisp outer edge, fading in toward the middle over its width
    float w = max(vWidth, 0.02);
    shape = smoothstep(1.0 - w, 1.0 - w * 0.3, d) * (1.0 - smoothstep(0.94, 1.0, d));
  }
  float fade = (1.0 - k) * (1.0 - k);
  float a = shape * fade * vColor.a;
  if (a < 0.003) discard;
  gl_FragColor = vec4(vColor.rgb * a, a);
  // straight to the screen (the Low tier, no post chain): tone mapped and in the screen's colors like the rest
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class Blasts {
  readonly mesh: InstancedMesh;
  readonly capacity: number;
  private readonly center: InstancedBufferAttribute;
  private readonly axis: InstancedBufferAttribute;
  private readonly color: InstancedBufferAttribute;
  private readonly time: InstancedBufferAttribute;
  private readonly width: InstancedBufferAttribute;
  private readonly mat: ShaderMaterial;
  private next = 0;
  /** seconds of frames so far: every copy's start and end are on it */
  private clock = 0;
  /** the clock when the last one alive ends */
  private until = -Infinity;

  constructor(capacity = 32) {
    this.capacity = capacity;
    const g = new PlaneGeometry(2, 2);
    const n = capacity;
    this.center = new InstancedBufferAttribute(new Float32Array(n * 3), 3);
    this.axis = new InstancedBufferAttribute(new Float32Array(n * 4), 4);
    this.color = new InstancedBufferAttribute(new Float32Array(n * 4), 4);
    // every copy starts long over (never drawn)
    const t = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { t[i * 4] = -1e6; t[i * 4 + 1] = 1; }
    this.time = new InstancedBufferAttribute(t, 4);
    this.width = new InstancedBufferAttribute(new Float32Array(n * 2), 2);
    g.setAttribute('aCenter', this.center);
    g.setAttribute('aAxis', this.axis);
    g.setAttribute('aColor', this.color);
    g.setAttribute('aTime', this.time);
    g.setAttribute('aWidth', this.width);
    this.mat = new ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, uniforms: { uTime: { value: 0 } },
      transparent: true, depthWrite: false, blending: AdditiveBlending,
    });
    this.mesh = new InstancedMesh(g, this.mat, n);
    this.mesh.name = 'blasts';
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
  }

  /** How many are alive now (checks). */
  alive(): number {
    let k = 0;
    const t = this.time.array as Float32Array;
    for (let i = 0; i < this.capacity; i++) { const a = (this.clock - t[i * 4]) / t[i * 4 + 1]; if (a >= 0 && a <= 1) k++; }
    return k;
  }

  /** One ring or flash from now (the oldest copy is reused when all are taken). */
  spawn(o: BlastOpts): void {
    const i = this.next;
    this.next = (this.next + 1) % this.capacity;
    const start = this.clock + (o.delay ?? 0);
    this.center.setXYZ(i, o.x, o.y, o.z);
    this.axis.setXYZW(i, o.ax ?? 0, o.ay ?? 1, o.az ?? 0, o.kind === 'flash' ? 1 : 0);
    this.color.setXYZW(i, o.r, o.g, o.b, o.alpha ?? 1);
    this.time.setXYZW(i, start, Math.max(1e-3, o.life), o.from, o.to);
    this.width.setXY(i, o.width ?? 0.25, o.widthEnd ?? o.width ?? 0.25);
    for (const a of [this.center, this.axis, this.color, this.time, this.width]) a.needsUpdate = true;
    this.until = Math.max(this.until, start + o.life);
  }

  /** Once per rendered frame, `dt` its seconds: the copies grow and fade; drawn only while one is alive. */
  update(dt: number): void {
    this.clock += Math.max(0, dt);
    this.mat.uniforms.uTime.value = this.clock;
    this.mesh.visible = this.clock <= this.until;
  }

  /** New race: none left. */
  clear(): void {
    const t = this.time.array as Float32Array;
    for (let i = 0; i < this.capacity; i++) t[i * 4] = -1e6;
    this.time.needsUpdate = true;
    this.clock = 0;
    this.mat.uniforms.uTime.value = 0;
    this.until = -Infinity;
    this.mesh.visible = false;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mat.dispose();
    this.mesh.dispose();
  }
}
