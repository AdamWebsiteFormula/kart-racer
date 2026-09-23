// One particle pool: camera-facing soft dots in a single InstancedMesh, integrated on the CPU.
// Live particles are packed at the front of the buffers every frame, so `count` is exact and
// the GPU draws only what is alive. Additive, no depth writes: sparks, flames, dust, confetti.
import {
  AdditiveBlending, InstancedBufferAttribute, InstancedMesh, NormalBlending, PlaneGeometry, ShaderMaterial,
} from 'three';

const VERT = `
attribute vec3 aOffset; attribute vec4 aColor; attribute float aSize;
varying vec4 vColor; varying vec2 vUv;
void main() {
  vColor = aColor; vUv = uv;
  vec4 mv = modelViewMatrix * vec4(aOffset, 1.0);
  mv.xy += position.xy * aSize;
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = `
varying vec4 vColor; varying vec2 vUv;
uniform float uSquare;
void main() {
  float d = length(vUv - 0.5);
  float a = uSquare > 0.5 ? 1.0 : 1.0 - smoothstep(0.25, 0.5, d);
  if (a <= 0.01) discard;
  gl_FragColor = vec4(vColor.rgb, vColor.a * a);
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
  private readonly aOffset: InstancedBufferAttribute;
  private readonly aColor: InstancedBufferAttribute;
  private readonly aSize: InstancedBufferAttribute;

  constructor(capacity = 2048, additive = true, square = false) {
    this.capacity = capacity;
    const n = capacity;
    this.pos = new Float32Array(n * 3); this.vel = new Float32Array(n * 3);
    this.col = new Float32Array(n * 4); this.rgb = new Float32Array(n * 3);
    this.size = new Float32Array(n); this.baseSize = new Float32Array(n);
    this.life = new Float32Array(n); this.maxLife = new Float32Array(n);
    this.grav = new Float32Array(n); this.drag = new Float32Array(n); this.grow = new Float32Array(n);
    const geo = new PlaneGeometry(1, 1);
    this.aOffset = new InstancedBufferAttribute(this.pos, 3);
    this.aColor = new InstancedBufferAttribute(this.col, 4);
    this.aSize = new InstancedBufferAttribute(this.size, 1);
    geo.setAttribute('aOffset', this.aOffset);
    geo.setAttribute('aColor', this.aColor);
    geo.setAttribute('aSize', this.aSize);
    const mat = new ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
      blending: additive ? AdditiveBlending : NormalBlending, uniforms: { uSquare: { value: square ? 1 : 0 } },
    });
    this.mesh = new InstancedMesh(geo, mat, capacity);
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
  }

  private oldest(): number {
    let k = 0, best = Infinity;
    for (let i = 0; i < this.count; i++) if (this.life[i] < best) { best = this.life[i]; k = i; }
    return k;
  }

  /** Integrate, fade, and pack the live ones to the front. */
  update(dt: number): void {
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
  }

  private move(from: number, to: number): void {
    for (let c = 0; c < 3; c++) {
      this.pos[to * 3 + c] = this.pos[from * 3 + c]; this.vel[to * 3 + c] = this.vel[from * 3 + c]; this.rgb[to * 3 + c] = this.rgb[from * 3 + c];
    }
    this.baseSize[to] = this.baseSize[from]; this.maxLife[to] = this.maxLife[from];
    this.grav[to] = this.grav[from]; this.drag[to] = this.drag[from]; this.grow[to] = this.grow[from];
  }

  clear(): void { this.count = 0; this.mesh.count = 0; }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as ShaderMaterial).dispose();
    this.mesh.dispose();
  }
}
