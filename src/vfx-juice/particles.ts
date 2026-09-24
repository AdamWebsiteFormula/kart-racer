// One particle pool: camera-facing soft dots in a single InstancedMesh, integrated on the CPU.
// Live particles are packed at the front of the buffers every frame, so `count` is exact and
// the GPU draws only what is alive. Additive, no depth writes: sparks, flames, dust, confetti.
import {
  AdditiveBlending, InstancedBufferAttribute, InstancedMesh, NormalBlending, PlaneGeometry, ShaderMaterial,
} from 'three';

export const PARTICLE = Object.freeze({
  /** every particle fades out between these view depths (metres): nothing near the lens fills the screen */
  nearFade: [1.2, 3.5] as const,
  /** the widest a particle draws, in metres per metre of view depth (a cap on its size on screen) */
  maxSize: { glow: 0.12, soft: 0.3, confetti: 0.04 },
  /** a confetti piece is a paper strip this tall for its width */
  strip: 0.5,
  /** confetti turns at this many rad/s either way, and flips over (its width through zero) at this many */
  spin: [1.5, 6] as const, flutter: [5, 13] as const,
});

/** How much of a particle shows at `depth` metres from the lens (the shader's near fade). */
export function nearFade(depth: number): number {
  const [a, b] = PARTICLE.nearFade;
  const t = Math.min(1, Math.max(0, (depth - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** The size a particle of `size` metres draws at `depth` metres, capped at `maxSize` per metre of depth. */
export function drawnSize(size: number, depth: number, maxSize: number): number {
  return Math.min(size, depth * maxSize);
}

const VERT = `
attribute vec3 aOffset; attribute vec4 aColor; attribute float aSize; attribute vec3 aSpin;
uniform float uTime; uniform float uMaxSize; uniform float uStrip;
varying vec4 vColor; varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(aOffset, 1.0);
  float depth = -mv.z;
  // aSpin: phase, turn rate, flip rate. A confetti strip turns and flips over like paper (its
  // width through zero); a round particle has no spin and draws as it always did.
  float a = aSpin.x + uTime * aSpin.y;
  float flip = cos(aSpin.x * 3.0 + uTime * aSpin.z);
  vec2 p = vec2(position.x * flip, position.y * uStrip);
  p = vec2(p.x * cos(a) - p.y * sin(a), p.x * sin(a) + p.y * cos(a));
  // never bigger on screen than uMaxSize per metre of depth, and gone near the lens
  mv.xy += p * min(aSize, depth * uMaxSize);
  float shade = uStrip < 1.0 ? 0.62 + 0.38 * abs(flip) : 1.0; // the paper catches the light as it flips
  vColor = vec4(aColor.rgb * shade, aColor.a * smoothstep(${PARTICLE.nearFade[0].toFixed(2)}, ${PARTICLE.nearFade[1].toFixed(2)}, depth));
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = `
varying vec4 vColor; varying vec2 vUv;
uniform float uSquare; uniform float uPuff;
void main() {
  float d = length(vUv - 0.5);
  // a spark is a disc with a soft rim; dust and smoke (uPuff) a puff with no hard edge
  float a = uSquare > 0.5 ? 1.0 : 1.0 - smoothstep(mix(0.25, 0.05, uPuff), 0.5, d);
  a *= vColor.a;
  if (a <= 0.004) discard;
  gl_FragColor = vec4(vColor.rgb, a);
}`;

export interface SpawnOpts {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; g: number; b: number;
  size: number; life: number;
  gravity?: number; drag?: number; grow?: number;
}

export class ParticlePool {
  readonly mesh: InstancedMesh;
  readonly capacity: number;
  count = 0;
  private readonly pos: Float32Array;
  private readonly vel: Float32Array;
  private readonly col: Float32Array;
  private readonly rgb: Float32Array;
  private readonly size: Float32Array;
  private readonly baseSize: Float32Array;
  private readonly life: Float32Array;
  private readonly maxLife: Float32Array;
  private readonly grav: Float32Array;
  private readonly drag: Float32Array;
  private readonly grow: Float32Array;
  private readonly spin: Float32Array;
  private readonly spins: boolean;
  private time = 0;
  private seed = 0x9e3779b9;
  private readonly mat: ShaderMaterial;
  private readonly aOffset: InstancedBufferAttribute;
  private readonly aColor: InstancedBufferAttribute;
  private readonly aSize: InstancedBufferAttribute;
  private readonly aSpin: InstancedBufferAttribute;

  /**
   * `square`: confetti, paper strips that turn and flip as they fall. `maxSize`: the size cap in
   * metres per metre of view depth (PARTICLE.maxSize).
   */
  constructor(
    capacity = 2048, additive = true, square = false,
    maxSize = square ? PARTICLE.maxSize.confetti : additive ? PARTICLE.maxSize.glow : PARTICLE.maxSize.soft,
  ) {
    this.capacity = capacity;
    const n = capacity;
    this.pos = new Float32Array(n * 3); this.vel = new Float32Array(n * 3);
    this.col = new Float32Array(n * 4); this.rgb = new Float32Array(n * 3);
    this.size = new Float32Array(n); this.baseSize = new Float32Array(n);
    this.life = new Float32Array(n); this.maxLife = new Float32Array(n);
    this.grav = new Float32Array(n); this.drag = new Float32Array(n); this.grow = new Float32Array(n);
    this.spin = new Float32Array(n * 3);
    this.spins = square;
    const geo = new PlaneGeometry(1, 1);
    this.aOffset = new InstancedBufferAttribute(this.pos, 3);
    this.aColor = new InstancedBufferAttribute(this.col, 4);
    this.aSize = new InstancedBufferAttribute(this.size, 1);
    this.aSpin = new InstancedBufferAttribute(this.spin, 3);
    geo.setAttribute('aOffset', this.aOffset);
    geo.setAttribute('aSpin', this.aSpin);
    geo.setAttribute('aColor', this.aColor);
    geo.setAttribute('aSize', this.aSize);
    this.mat = new ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
      blending: additive ? AdditiveBlending : NormalBlending,
      uniforms: {
        uSquare: { value: square ? 1 : 0 }, uPuff: { value: additive || square ? 0 : 1 }, uTime: { value: 0 },
        uMaxSize: { value: maxSize }, uStrip: { value: square ? PARTICLE.strip : 1 },
      },
    });
    this.mesh = new InstancedMesh(geo, this.mat, capacity);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 10;
  }

  /** Add one particle. When full, the oldest (slot 0 after packing) is overwritten. */
  spawn(o: SpawnOpts): void {
    let i = this.count;
    if (i >= this.capacity) i = this.oldest();
    else this.count++;
    this.pos[i * 3] = o.x; this.pos[i * 3 + 1] = o.y; this.pos[i * 3 + 2] = o.z;
    this.vel[i * 3] = o.vx; this.vel[i * 3 + 1] = o.vy; this.vel[i * 3 + 2] = o.vz;
    this.rgb[i * 3] = o.r; this.rgb[i * 3 + 1] = o.g; this.rgb[i * 3 + 2] = o.b;
    this.baseSize[i] = o.size; this.size[i] = o.size;
    this.life[i] = o.life; this.maxLife[i] = o.life;
    this.grav[i] = o.gravity ?? 0; this.drag[i] = o.drag ?? 0; this.grow[i] = o.grow ?? 0;
    if (this.spins) {
      const [s0, s1] = PARTICLE.spin, [f0, f1] = PARTICLE.flutter;
      this.spin[i * 3] = this.rnd() * Math.PI * 2;
      this.spin[i * 3 + 1] = (s0 + this.rnd() * (s1 - s0)) * (this.rnd() < 0.5 ? -1 : 1);
      this.spin[i * 3 + 2] = f0 + this.rnd() * (f1 - f0);
    }
  }

  /** Visual-only randomness for the spins (never touches the sim). */
  private rnd(): number { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return this.seed / 0xffffffff; }

  private oldest(): number {
    let k = 0, best = Infinity;
    for (let i = 0; i < this.count; i++) if (this.life[i] < best) { best = this.life[i]; k = i; }
    return k;
  }

  /** Integrate, fade, and pack the live ones to the front. */
  update(dt: number): void {
    this.time += dt;
    this.mat.uniforms.uTime.value = this.time;
    let w = 0;
    for (let i = 0; i < this.count; i++) {
      const life = this.life[i] - dt;
      if (life <= 0) continue;
      if (w !== i) this.move(i, w);
      this.life[w] = life;
      const k = Math.max(0, 1 - this.drag[w] * dt);
      this.vel[w * 3] *= k; this.vel[w * 3 + 1] = this.vel[w * 3 + 1] * k - this.grav[w] * dt; this.vel[w * 3 + 2] *= k;
      this.pos[w * 3] += this.vel[w * 3] * dt; this.pos[w * 3 + 1] += this.vel[w * 3 + 1] * dt; this.pos[w * 3 + 2] += this.vel[w * 3 + 2] * dt;
      const f = life / this.maxLife[w];
      this.size[w] = this.baseSize[w] * (1 + this.grow[w] * (1 - f));
      const a = Math.min(1, f * 2.5);
      this.col[w * 4] = this.rgb[w * 3]; this.col[w * 4 + 1] = this.rgb[w * 3 + 1]; this.col[w * 4 + 2] = this.rgb[w * 3 + 2]; this.col[w * 4 + 3] = a;
      w++;
    }
    this.count = w;
    this.mesh.count = w;
    this.aOffset.needsUpdate = this.aColor.needsUpdate = this.aSize.needsUpdate = true;
    if (this.spins) this.aSpin.needsUpdate = true;
  }

  private move(from: number, to: number): void {
    for (let c = 0; c < 3; c++) {
      this.pos[to * 3 + c] = this.pos[from * 3 + c]; this.vel[to * 3 + c] = this.vel[from * 3 + c]; this.rgb[to * 3 + c] = this.rgb[from * 3 + c];
      this.spin[to * 3 + c] = this.spin[from * 3 + c];
    }
    this.baseSize[to] = this.baseSize[from]; this.maxLife[to] = this.maxLife[from];
    this.grav[to] = this.grav[from]; this.drag[to] = this.drag[from]; this.grow[to] = this.grow[from];
  }

  clear(): void { this.count = 0; this.mesh.count = 0; }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mat.dispose();
    this.mesh.dispose();
  }
}
