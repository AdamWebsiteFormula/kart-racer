// Tyre marks and speed lines. Each is one mesh and one draw call.
import {
  BufferAttribute, BufferGeometry, CustomBlending, DoubleSide, InstancedBufferAttribute, InstancedMesh, Mesh, PlaneGeometry,
  ShaderMaterial, SrcColorFactor, ZeroFactor, type Camera,
} from 'three';

// ---------------------------------------------------------------- tyre marks
/**
 * Rubber darkens whatever it lies on: a mark multiplies the road by `shade` down its middle when
 * fresh, held a while and then let go smoothly back to 1 (no mark) over `life` seconds. Its edges
 * are soft, the rubber is laid unevenly along it (a world-space noise) and a drift's first marks
 * fade in: a smear on the road, not a painted line (critique of 24 Sept 2026: "harsh, flat
 * decals"; at 0.55 they read near-black on Boardwalk's night deck).
 */
export const SKID = Object.freeze({ life: 3.5, shade: 0.68 });

/** What the middle of a full-strength mark `age` seconds old multiplies the road by (what the shader draws). */
export function skidShade(age: number): number {
  const k = Math.min(1, Math.max(0, age / SKID.life));
  return 1 + (SKID.shade - 1) * (1 - k * k * (3 - 2 * k));
}

const SKID_VERT = `
attribute float aBirth; attribute float aInk; attribute float aAcross;
uniform float uTime; varying float vA; varying float vAcross; varying vec2 vW;
void main() {
  float k = clamp((uTime - aBirth) / ${SKID.life.toFixed(2)}, 0.0, 1.0);
  vA = aInk * (1.0 - k * k * (3.0 - 2.0 * k));
  vAcross = aAcross;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const SKID_FRAG = `varying float vA; varying float vAcross; varying vec2 vW;
float skidHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float skidNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(skidHash(i), skidHash(i + vec2(1.0, 0.0)), u.x), mix(skidHash(i + vec2(0.0, 1.0)), skidHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
void main() {
  // soft edges, and rubber laid unevenly along the mark
  float ink = vA * (1.0 - smoothstep(0.15, 1.0, abs(vAcross))) * (0.7 + 0.3 * skidNoise(vW * 3.3));
  if (ink <= 0.002) discard;
  gl_FragColor = vec4(mix(vec3(1.0), vec3(${SKID.shade.toFixed(2)}), ink), 1.0);
}`;

/** A ring buffer of flat quads laid on the road while karts drift; they fade over SKID.life seconds. */
export class Skids {
  readonly mesh: Mesh;
  private readonly pos: Float32Array;
  private readonly birth: Float32Array;
  private readonly ink: Float32Array;
  private readonly aPos: BufferAttribute;
  private readonly aBirth: BufferAttribute;
  private readonly aInk: BufferAttribute;
  private next = 0;
  private readonly quads: number;
  private readonly mat: ShaderMaterial;

  constructor(quads = 1600) {
    this.quads = quads;
    this.pos = new Float32Array(quads * 4 * 3);
    this.birth = new Float32Array(quads * 4).fill(-1e6);
    this.ink = new Float32Array(quads * 4);
    const across = new Float32Array(quads * 4);
    const idx = new Uint32Array(quads * 6);
    for (let q = 0; q < quads; q++) {
      const v = q * 4;
      idx.set([v, v + 1, v + 2, v + 2, v + 1, v + 3], q * 6);
      across.set([-1, 1, -1, 1], v);
    }
    const g = new BufferGeometry();
    this.aPos = new BufferAttribute(this.pos, 3);
    this.aBirth = new BufferAttribute(this.birth, 1);
    this.aInk = new BufferAttribute(this.ink, 1);
    g.setAttribute('position', this.aPos);
    g.setAttribute('aBirth', this.aBirth);
    g.setAttribute('aInk', this.aInk);
    g.setAttribute('aAcross', new BufferAttribute(across, 1));
    g.setIndex(new BufferAttribute(idx, 1));
    this.mat = new ShaderMaterial({
      vertexShader: SKID_VERT, fragmentShader: SKID_FRAG, transparent: true, depthWrite: false,
      // multiply: the result is the road's colour times the mark's
      blending: CustomBlending, blendSrc: ZeroFactor, blendDst: SrcColorFactor,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, uniforms: { uTime: { value: 0 } },
    });
    this.mesh = new Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
  }

  /** One mark segment from a to b (world, on the ground), `w` metres wide; `inkA`, `inkB` its strength (0..1) at each end. */
  add(ax: number, ay: number, az: number, bx: number, by: number, bz: number, w: number, time: number, inkA = 1, inkB = 1): void {
    const dx = bx - ax, dz = bz - az;
    const len = Math.hypot(dx, dz);
    if (len < 1e-3 || len > 3) return; // a respawn or a teleport: no streak across the map
    const nx = (-dz / len) * w * 0.5, nz = (dx / len) * w * 0.5;
    const q = this.next;
    this.next = (this.next + 1) % this.quads;
    const p = this.pos, o = q * 12, y = 0.03;
    p[o] = ax - nx; p[o + 1] = ay + y; p[o + 2] = az - nz;
    p[o + 3] = ax + nx; p[o + 4] = ay + y; p[o + 5] = az + nz;
    p[o + 6] = bx - nx; p[o + 7] = by + y; p[o + 8] = bz - nz;
    p[o + 9] = bx + nx; p[o + 10] = by + y; p[o + 11] = bz + nz;
    this.birth.fill(time, q * 4, q * 4 + 4);
    const k = this.ink, v = q * 4;
    k[v] = inkA; k[v + 1] = inkA; k[v + 2] = inkB; k[v + 3] = inkB;
    this.aPos.needsUpdate = true;
    this.aBirth.needsUpdate = true;
    this.aInk.needsUpdate = true;
  }

  setTime(t: number): void { this.mat.uniforms.uTime.value = t; }

  clear(): void { this.birth.fill(-1e6); this.aBirth.needsUpdate = true; }

  dispose(): void { this.mesh.geometry.dispose(); this.mat.dispose(); }
}

// ---------------------------------------------------------------- speed lines
/**
 * The boost streaks (critiques of 24 Sept 2026: "no wind lines"; they were 0.4 alpha, additive, and
 * vanished against a bright sky). In screen units (1 = half the screen's height) so they are the same
 * thickness at 1280x720 and 1920x1080 (a share of the height: 2.6 px either side of the core at 720p,
 * 3.9 px at 1080p): an ellipse fitted to the screen, from `inner` to `outer` of the way to its edge,
 * never the middle where the road ahead and the karts are, and none in the `under` cone straight
 * down the screen (your kart and the road it is on). A weak boost shows `few` of them, faint; a
 * punch shows them all at `alpha`.
 */
export const LINES = Object.freeze({
  count: 72, inner: 0.74, outer: 1.2, length: [0.1, 0.24] as const, width: 0.0072, alpha: 0.62, few: 0.45,
  /** each crosses the ring this many times a second (random between the two) */
  rate: [1.5, 2.8] as const,
  /** radians either side of straight down with no streaks (fading out over the next 15°) */
  under: (40 * Math.PI) / 180,
});

const LINE_VERT = `
attribute vec4 aLine; uniform float uTime; uniform float uOn; uniform float uAspect; varying float vA; varying vec2 vUv;
void main() {
  // aLine: angle, rank (0..1: which show at a weak boost, and how long), phase, rate
  vUv = uv;
  float t = fract(aLine.z + uTime * aLine.w);
  float r = mix(${LINES.inner.toFixed(3)}, ${LINES.outer.toFixed(3)}, t);
  vec2 dir = vec2(cos(aLine.x), sin(aLine.x));
  // along the ellipse fitted to the screen, in screen units (x times the aspect), so the width is true
  vec2 d = normalize(vec2(dir.x * uAspect, dir.y));
  vec2 side = vec2(-d.y, d.x);
  float len = mix(${LINES.length[0].toFixed(3)}, ${LINES.length[1].toFixed(3)}, aLine.y) * (0.7 + 0.3 * uOn);
  vec2 c = vec2(dir.x * uAspect, dir.y) * r;
  vec2 p = c + d * position.y * len + side * position.x * ${(LINES.width * 2).toFixed(4)};
  p.x /= uAspect;
  float shown = step(aLine.y, ${LINES.few.toFixed(3)} + ${(1 - LINES.few).toFixed(3)} * uOn);
  float down = 1.0 - smoothstep(cos(${(LINES.under + Math.PI / 12).toFixed(4)}), cos(${LINES.under.toFixed(4)}), -dir.y);
  vA = uOn * shown * down * smoothstep(0.0, 0.2, t) * (1.0 - smoothstep(0.6, 1.0, t)) * ${LINES.alpha.toFixed(3)};
  gl_Position = vec4(p, 0.0, 1.0);
}`;
const LINE_FRAG = `varying float vA; varying vec2 vUv;
void main() {
  // a bright core, fading to both ends and both sides
  float across = 1.0 - abs(vUv.x * 2.0 - 1.0);
  float a = vA * across * across * (2.0 - across) * smoothstep(0.0, 0.3, vUv.y) * (1.0 - smoothstep(0.6, 1.0, vUv.y));
  if (a <= 0.004) discard;
  gl_FragColor = vec4(1.0, 1.0, 1.0, a);
}`;

/** White streaks round the screen's edge; `update`'s level fades them in and out (boosting only). */
export class SpeedLines {
  readonly mesh: InstancedMesh;
  private readonly mat: ShaderMaterial;
  private level = 0;

  constructor(count = LINES.count) {
    const g = new PlaneGeometry(1, 1);
    const a = new Float32Array(count * 4);
    let x = 12345;
    const rnd = () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 0xffffffff; };
    for (let i = 0; i < count; i++) a.set([rnd() * Math.PI * 2, rnd(), rnd(), LINES.rate[0] + rnd() * (LINES.rate[1] - LINES.rate[0])], i * 4);
    g.setAttribute('aLine', new InstancedBufferAttribute(a, 4));
    // normal blending, not additive: white added to a bright sky was lost in it. Both sides: the
    // streak's frame (across, along) mirrors the quad's (x, y), so one side faces away (the streaks
    // before 24 Sept 2026 were culled for exactly that, and never drew at all)
    this.mat = new ShaderMaterial({
      vertexShader: LINE_VERT, fragmentShader: LINE_FRAG, transparent: true, depthWrite: false, depthTest: false, side: DoubleSide,
      uniforms: { uTime: { value: 0 }, uOn: { value: 0 }, uAspect: { value: 16 / 9 } },
    });
    this.mesh = new InstancedMesh(g, this.mat, count);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 20;
  }

  /** the camera they ride on (its aspect keeps them true to the screen) */
  private camera: { aspect?: number } | null = null;

  /** Attach to the camera so the streaks live in view space. */
  attach(camera: Camera): void { camera.add(this.mesh); this.camera = camera as { aspect?: number }; }

  /** `level` 0..1: how hard the boost is (0 hides them), eased in fast and out slower. */
  update(t: number, dt: number, level: number): void {
    this.level += (level - this.level) * Math.min(1, dt * (level > this.level ? 10 : 3));
    this.mat.uniforms.uTime.value = t;
    this.mat.uniforms.uOn.value = this.level;
    this.mat.uniforms.uAspect.value = this.camera?.aspect ?? 16 / 9;
    this.mesh.visible = this.level > 0.01;
  }

  dispose(): void { this.mesh.removeFromParent(); this.mesh.geometry.dispose(); this.mat.dispose(); }
}
