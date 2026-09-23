// Tyre marks and speed lines. Each is one mesh and one draw call.
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, InstancedBufferAttribute, InstancedMesh, Mesh, PlaneGeometry,
  ShaderMaterial, type Camera,
} from 'three';

// ---------------------------------------------------------------- tyre marks
const SKID_VERT = `
attribute float aBirth; uniform float uTime; varying float vA;
void main() {
  vA = clamp(1.0 - (uTime - aBirth) / 10.0, 0.0, 1.0) * 0.55;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const SKID_FRAG = `varying float vA; void main() { if (vA <= 0.0) discard; gl_FragColor = vec4(0.12, 0.11, 0.14, vA); }`;

/** A ring buffer of flat quads laid on the road while karts drift; they fade over 10 s. */
export class Skids {
  readonly mesh: Mesh;
  private readonly pos: Float32Array;
  private readonly birth: Float32Array;
  private readonly aPos: BufferAttribute;
  private readonly aBirth: BufferAttribute;
  private next = 0;
  private readonly quads: number;
  private readonly mat: ShaderMaterial;

  constructor(quads = 1200) {
    this.quads = quads;
    this.pos = new Float32Array(quads * 4 * 3);
    this.birth = new Float32Array(quads * 4).fill(-1e6);
    const idx = new Uint32Array(quads * 6);
    for (let q = 0; q < quads; q++) {
      const v = q * 4;
      idx.set([v, v + 1, v + 2, v + 2, v + 1, v + 3], q * 6);
    }
    const g = new BufferGeometry();
    this.aPos = new BufferAttribute(this.pos, 3);
    this.aBirth = new BufferAttribute(this.birth, 1);
    g.setAttribute('position', this.aPos);
    g.setAttribute('aBirth', this.aBirth);
    g.setIndex(new BufferAttribute(idx, 1));
    this.mat = new ShaderMaterial({
      vertexShader: SKID_VERT, fragmentShader: SKID_FRAG, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, uniforms: { uTime: { value: 0 } },
    });
    this.mesh = new Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
  }

  /** One mark segment from a to b (world, on the ground), `w` metres wide. */
  add(ax: number, ay: number, az: number, bx: number, by: number, bz: number, w: number, time: number): void {
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
    this.aPos.needsUpdate = true;
    this.aBirth.needsUpdate = true;
  }

  setTime(t: number): void { this.mat.uniforms.uTime.value = t; }

  clear(): void { this.birth.fill(-1e6); this.aBirth.needsUpdate = true; }

  dispose(): void { this.mesh.geometry.dispose(); this.mat.dispose(); }
}

// ---------------------------------------------------------------- speed lines
const LINE_VERT = `
attribute vec4 aLine; uniform float uTime; uniform float uOn; varying float vA;
void main() {
  // aLine: angle, radius, phase, speed. Each streak rushes from far to near along the view axis.
  float t = fract(aLine.z + uTime * aLine.w);
  float z = mix(-40.0, -2.0, t);
  vec3 p = vec3(cos(aLine.x) * aLine.y, sin(aLine.x) * aLine.y * 0.62, z);
  p += vec3(position.x * 0.03, 0.0, position.y * 5.0);
  vA = uOn * smoothstep(0.0, 0.25, t) * (1.0 - smoothstep(0.75, 1.0, t)) * 0.5;
  gl_Position = projectionMatrix * vec4(p, 1.0);
}`;
const LINE_FRAG = `varying float vA; void main() { if (vA <= 0.01) discard; gl_FragColor = vec4(1.0, 1.0, 1.0, vA); }`;

/** White streaks in camera space; `on` fades them in and out (boosting only). */
export class SpeedLines {
  readonly mesh: InstancedMesh;
  private readonly mat: ShaderMaterial;
  private level = 0;

  constructor(count = 56) {
    const g = new PlaneGeometry(1, 1);
    const a = new Float32Array(count * 4);
    let x = 12345;
    const rnd = () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 0xffffffff; };
    for (let i = 0; i < count; i++) a.set([rnd() * Math.PI * 2, 5 + rnd() * 5, rnd(), 0.9 + rnd() * 0.9], i * 4);
    g.setAttribute('aLine', new InstancedBufferAttribute(a, 4));
    this.mat = new ShaderMaterial({
      vertexShader: LINE_VERT, fragmentShader: LINE_FRAG, transparent: true, depthWrite: false, depthTest: false,
      blending: AdditiveBlending, uniforms: { uTime: { value: 0 }, uOn: { value: 0 } },
    });
    this.mesh = new InstancedMesh(g, this.mat, count);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 20;
  }

  /** Attach to the camera so the streaks live in view space. */
  attach(camera: Camera): void { camera.add(this.mesh); }

  update(t: number, dt: number, on: boolean): void {
    this.level += ((on ? 1 : 0) - this.level) * Math.min(1, dt * (on ? 8 : 3));
    this.mat.uniforms.uTime.value = t;
    this.mat.uniforms.uOn.value = this.level;
    this.mesh.visible = this.level > 0.01;
  }

  dispose(): void { this.mesh.removeFromParent(); this.mesh.geometry.dispose(); this.mat.dispose(); }
}
