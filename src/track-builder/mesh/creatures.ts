// The course creatures on screen (design §6). Each creature's model is posed every frame from its
// script (../creatures.ts, race time only), with code-made life on top: breathing, rearing up and
// stomping, winding up a throw, bobbing in the sea, scuttling, waddling, rolling in the sky. Around
// them, their marks: warning shadows, the stomp's rolling dust ring, the yeti's snowball, and the
// kraken's tentacles (a chain of spheres, raised over the road, then slammed across it).
import {
  CylinderGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, MeshToonMaterial, Object3D, PlaneGeometry, Quaternion,
  SphereGeometry, Vector3, type BufferGeometry, type Material, type Texture,
} from 'three';
import { CREATURE, type CreaturePose } from '../creatures.ts';
import type { Track } from '../track.ts';

const smooth = (x: number) => { const k = Math.max(0, Math.min(1, x)); return k * k * (3 - 2 * k); };
const RING_PUFFS = 44;
const TENTACLE_SEGMENTS = 16;

class Pool {
  readonly mesh: InstancedMesh;
  private n = 0;
  constructor(geometry: BufferGeometry, material: Material, cap: number, shadows = false) {
    this.mesh = new InstancedMesh(geometry, material, cap);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = shadows;
    this.mesh.count = 0;
  }
  begin(): void { this.n = 0; }
  add(m: Matrix4): void { if (this.n < this.mesh.instanceMatrix.count) this.mesh.setMatrixAt(this.n++, m); }
  end(): void { this.mesh.count = this.n; this.mesh.visible = this.n > 0; if (this.n) this.mesh.instanceMatrix.needsUpdate = true; }
}

export class CreatureView {
  readonly group = new Group();
  private readonly track: Track;
  private readonly bodies = new Map<string, { holder: Object3D; body: Mesh }>();
  private readonly shadows: Pool;
  private readonly dust: Pool;
  private readonly snow: Pool;
  private readonly arms: Pool;
  private readonly stripe: Pool;
  /** geometry this view made itself (the yeti's ledge) */
  private readonly made: BufferGeometry[] = [];
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly v = new Vector3();
  private readonly s = new Vector3();
  private readonly up = new Vector3(0, 1, 0);

  constructor(track: Track, geometryFor: (kind: string) => BufferGeometry, materialFor: (kind: string) => Material | undefined, gradient: Texture | undefined) {
    this.track = track;
    for (const c of track.hazards.creatures) {
      const g = geometryFor(c.kind);
      let mat = materialFor(c.kind);
      const shared = !!mat;
      if (!mat) mat = new MeshToonMaterial({ vertexColors: true, gradientMap: gradient ?? null });
      const body = new Mesh(g, mat);
      if (shared) body.userData.sharedMaterial = true;
      body.castShadow = true;
      body.name = `creature:${c.kind}`;
      const holder = new Object3D();
      holder.add(body);
      if (c.kind === 'yeti') {
        // its ledge: a snowy rock under its feet, reaching well below whatever ground is there
        const ledge = new Mesh(new CylinderGeometry(4.2, 6.5, 14, 9).translate(0, -7, 0), new MeshToonMaterial({ color: 0xe9f1fb, gradientMap: gradient ?? null }));
        ledge.receiveShadow = true;
        this.made.push(ledge.geometry);
        ledge.name = 'creature:ledge';
        holder.add(ledge);
      }
      this.group.add(holder);
      this.bodies.set(c.id, { holder, body });
    }
    const dark = new MeshBasicMaterial({ color: 0x14101c, transparent: true, opacity: 0.38, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.shadows = new Pool(new SphereGeometry(1, 20, 6).scale(1, 0.02, 1), dark, 8);
    this.stripe = new Pool(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), dark.clone(), 2);
    this.dust = new Pool(new SphereGeometry(1, 10, 6), new MeshToonMaterial({ color: 0xe8c9a0, gradientMap: gradient ?? null }), RING_PUFFS * 2);
    this.snow = new Pool(new SphereGeometry(1, 18, 12), new MeshToonMaterial({ color: 0xf6fbff, gradientMap: gradient ?? null }), 4, true);
    this.arms = new Pool(new SphereGeometry(1, 12, 8), new MeshToonMaterial({ color: 0xa24be6, emissive: 0x3a1066, gradientMap: gradient ?? null }), TENTACLE_SEGMENTS * 4, true);
    for (const p of [this.shadows, this.stripe, this.dust, this.snow, this.arms]) this.group.add(p.mesh);
  }

  private put(pool: Pool, x: number, y: number, z: number, sx: number, sy = sx, sz = sx, q: Quaternion = this.q.identity()): void {
    this.m.compose(this.v.set(x, y, z), q, this.s.set(sx, sy, sz));
    pool.add(this.m);
  }

  /** Pose every creature for race time `time` (seconds). */
  update(time: number): void {
    for (const p of [this.shadows, this.stripe, this.dust, this.snow, this.arms]) p.begin();
    // one switched off (a Final Lap Shift took its road) is gone, not frozen where it was
    for (const [id, b] of this.bodies) b.holder.visible = this.track.hazards.isEnabled(id);
    for (const pose of this.track.hazards.creaturePoses(time)) {
      const b = this.bodies.get(pose.id);
      if (b) this.animate(b.holder, b.body, pose, time);
      this.marks(pose, time);
    }
    for (const p of [this.shadows, this.stripe, this.dust, this.snow, this.arms]) p.end();
  }

  private animate(holder: Object3D, body: Mesh, pose: CreaturePose, time: number): void {
    holder.position.set(pose.position[0], pose.position[1], pose.position[2]);
    holder.rotation.set(0, pose.heading, 0);
    body.position.set(0, 0, 0);
    body.rotation.set(0, 0, 0);
    body.scale.set(1, 1, 1);
    const ph = pose.phase;
    switch (pose.kind) {
      case 'rumblesaur': {
        const breathe = Math.sin(time * 1.6) * 0.012;
        body.scale.set(1 + breathe, 1 - breathe, 1 + breathe);
        body.rotation.y = Math.sin(time * 0.5) * 0.08;
        if (pose.action === 'rear') { const k = smooth(ph); body.rotation.x = -0.24 * k; body.position.y = 0.35 * k; }
        else if (pose.action === 'stomp') { body.rotation.x = 0.08; body.scale.set(1.04, 0.94, 1.04); }
        else if (pose.action === 'settle') { const k = 1 - smooth(ph * 3); body.rotation.x = 0.08 * k + Math.sin(ph * 40) * 0.02 * k; }
        break;
      }
      case 'yeti': {
        body.position.y = Math.abs(Math.sin(time * 2.2)) * 0.12;
        if (pose.action === 'windUp') body.rotation.x = -0.35 * smooth(ph);
        else if (pose.action === 'throw') body.rotation.x = -0.35 + 0.65 * smooth(Math.min(1, ph * 3)) - 0.3 * smooth((ph - 0.3) / 0.7);
        break;
      }
      case 'kraken': {
        body.position.y = Math.sin(time * 1.3) * 0.5 + (pose.action === 'warn' ? 1.8 * smooth(ph) : pose.action === 'slam' ? 1.8 : pose.action === 'retract' ? 1.8 * (1 - smooth(ph)) : 0);
        body.rotation.z = Math.sin(time * 0.7) * 0.07;
        body.rotation.x = pose.action === 'slam' ? 0.22 : pose.action === 'warn' ? -0.12 * smooth(ph) : 0;
        break;
      }
      case 'crab': {
        if (pose.action === 'cross') {
          body.rotation.z = Math.sin(time * 18) * 0.08;
          body.position.y = Math.abs(Math.sin(time * 18)) * 0.18;
        } else {
          // claws up and snapping while it waits
          body.rotation.y = Math.sin(time * 9) * 0.06;
          body.scale.y = 1 + Math.max(0, Math.sin(time * 9)) * 0.04;
        }
        break;
      }
      case 'goose': {
        if (pose.action === 'charge') {
          body.rotation.x = 0.22;
          body.position.y = Math.abs(Math.sin(time * 15)) * 0.35;
          body.rotation.z = Math.sin(time * 15) * 0.09;
          body.scale.x = 1 + Math.abs(Math.sin(time * 11)) * 0.12; // wings beating
        } else {
          body.rotation.z = Math.sin(time * 5) * 0.07;
          body.rotation.x = pose.action === 'wait' ? Math.sin(time * 6) * 0.08 + 0.1 * smooth(ph) : 0;
        }
        break;
      }
      case 'whale': {
        body.rotation.z = Math.sin(time * 0.5) * 0.12 + (pose.action === 'slap' ? Math.sin(ph * Math.PI) * 0.7 : 0);
        body.rotation.x = Math.sin(time * 0.7) * 0.06 + (pose.action === 'warn' ? -0.15 * smooth(ph) : 0);
        body.position.y = Math.sin(time * 0.9) * 0.8;
        break;
      }
    }
  }

  private marks(pose: CreaturePose, time: number): void {
    for (const mk of pose.marks) {
      const [x, y, z] = mk.position;
      switch (mk.kind) {
        case 'shadow':
          this.put(this.shadows, x, y + 0.04, z, mk.radius * (0.5 + 0.5 * mk.strength));
          break;
        case 'ring': {
          // a rolling wall of dust
          const r = mk.radius, h = 0.6 + mk.strength * 0.9;
          for (let k = 0; k < RING_PUFFS; k++) {
            const a = (k / RING_PUFFS) * Math.PI * 2 + time * 0.3;
            this.put(this.dust, x + Math.cos(a) * r, y + h * 0.35, z + Math.sin(a) * r, 0.9 + mk.strength * 0.6, h, 0.9 + mk.strength * 0.6);
          }
          break;
        }
        case 'snowball': {
          this.q.setFromAxisAngle(this.up, time * 3);
          this.put(this.snow, x, y, z, mk.radius, mk.radius, mk.radius, this.q);
          break;
        }
        case 'line': {
          // the tentacle's shadow grows across the road, and the tentacle itself rises high above it
          const to = mk.to ?? mk.position;
          const dx = to[0] - x, dz = to[2] - z, len = Math.hypot(dx, dz);
          this.q.setFromAxisAngle(this.up, Math.atan2(dx, dz));
          this.put(this.stripe, (x + to[0]) / 2, y + 0.05, (z + to[2]) / 2, mk.radius * 2 * (0.4 + 0.6 * mk.strength), 1, len);
          this.tentacle(pose, [x, y, z], to, 10 + 4 * mk.strength, mk.strength);
          break;
        }
        case 'tentacle':
          this.put(this.arms, x, y, z, mk.radius, mk.radius * 0.8, mk.radius);
          break;
      }
    }
    // the kraken's other arms curl and wave beside it all the time
    if (pose.kind === 'kraken') {
      const r = CREATURE.kraken.radius;
      for (let k = 0; k < 2; k++) {
        const side = k ? 1 : -1;
        for (let i = 0; i < TENTACLE_SEGMENTS; i++) {
          const s = i / TENTACLE_SEGMENTS, a = pose.heading + side * (1.1 + s * 1.3) + Math.sin(time * 1.4 + k + s * 3) * 0.3;
          const dist = 3 + s * 6, h = Math.sin(s * Math.PI) * 3 + Math.sin(time * 2 + s * 5 + k) * 0.6;
          this.put(this.arms, pose.position[0] + Math.sin(a) * dist, pose.position[1] + h, pose.position[2] + Math.cos(a) * dist, r * (1 - s * 0.7));
        }
      }
    }
  }

  /** A tentacle from the kraken arching over to `to`, `height` metres up at the top of the arc. */
  private tentacle(pose: CreaturePose, near: readonly number[], to: readonly number[], height: number, reach: number): void {
    const bx = pose.position[0], by = pose.position[1] + 4, bz = pose.position[2];
    const ex = near[0] + (to[0] - near[0]) * reach, ez = near[2] + (to[2] - near[2]) * reach;
    const r = CREATURE.kraken.radius;
    for (let i = 0; i < TENTACLE_SEGMENTS; i++) {
      const s = i / (TENTACLE_SEGMENTS - 1);
      const x = bx + (ex - bx) * s, z = bz + (ez - bz) * s;
      const yy = by + (near[1] - by) * s + Math.sin(s * Math.PI) * height;
      this.put(this.arms, x, yy, z, r * (1.3 - s * 0.8));
    }
  }

  /** The pools' own geometry (the scene's retire() handles meshes, materials and model geometry). */
  dispose(): void {
    for (const p of [this.shadows, this.stripe, this.dust, this.snow, this.arms]) p.mesh.geometry.dispose();
    for (const g of this.made) g.dispose();
  }
}
