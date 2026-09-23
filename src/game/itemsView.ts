// What the race shows of the items (design §8): what flies and what lies on the road, the item a
// kart trails behind it, the Triple Fizz bottles orbiting a kart, the Pogo Spring under a jumping
// kart, the Grapple Anchor's chain, the Strike Ball around a kart and the Bubble around a shielded
// one. One InstancedMesh per model kind, drawn only while something of that kind is out.
// Projectiles interpolate prev → current like karts.
import {
  InstancedMesh, Group, Matrix4, Object3D, Quaternion, SphereGeometry, Vector3, type BufferGeometry, type Material,
} from 'three';
import { bubbleMaterial, itemGeometry, oilSlickMaterial, strikeBallMaterial, vertexToon } from '../art-pipeline/index.ts';
import type { KartState } from '../kart-controller/types.ts';
import type { Items } from '../items/items.ts';
import type { Track } from '../track-builder/track.ts';

const RIDE_RADIUS = 1.3;
const LINK = 0.2; // chain link spacing, metres

class Kind {
  readonly mesh: InstancedMesh;
  private n = 0;
  constructor(geometry: BufferGeometry, material: Material, cap: number, shadows = true) {
    this.mesh = new InstancedMesh(geometry, material, cap);
    this.mesh.castShadow = shadows;
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.mesh.visible = false;
  }
  begin(): void { this.n = 0; }
  add(m: Matrix4): void { if (this.n < this.mesh.instanceMatrix.count) this.mesh.setMatrixAt(this.n++, m); }
  end(): void {
    this.mesh.count = this.n;
    this.mesh.visible = this.n > 0;
    if (this.n > 0) this.mesh.instanceMatrix.needsUpdate = true;
  }
}

/** Deterministic 0..1 from an id, for a drop's resting angle. */
const spread = (id: number) => ((id * 2654435761) >>> 0) / 4294967296;

export class ItemsView {
  readonly root = new Group();
  private readonly kinds: Record<string, Kind>;
  private readonly roll: number[] = [];
  private readonly spin = new Quaternion();
  private readonly q = new Quaternion();
  private readonly m = new Matrix4();
  private readonly v = new Vector3();
  private readonly w = new Vector3();
  private readonly s = new Vector3(1, 1, 1);
  private readonly up = new Vector3(0, 1, 0);
  private readonly dummy = new Object3D();

  constructor() {
    const toon = vertexToon();
    const kind = (name: string, cap = 16, material: Material = toon, shadows = true) => new Kind(itemGeometry(name) as BufferGeometry, material, cap, shadows);
    this.kinds = {
      beachBall: kind('beachBall'),
      homingKite: kind('homingKite'),
      windUpMouse: kind('windUpMouse'),
      oilCan: kind('oilCan'),
      oilSlick: kind('oilSlick', 16, oilSlickMaterial(), false),
      decoyBalloon: kind('decoyBalloon'),
      fizzBottle: kind('fizzBottle', 24),
      pogoSpring: kind('pogoSpring', 8),
      grappleAnchor: kind('grappleAnchor', 8),
      chainLink: kind('chainLink', 240, toon, false),
      strikeBall: new Kind(new SphereGeometry(RIDE_RADIUS, 40, 28), strikeBallMaterial(), 8),
      bubble: new Kind(new SphereGeometry(1.6, 28, 20), bubbleMaterial(), 8, false),
    };
    for (const k of Object.values(this.kinds)) this.root.add(k.mesh);
  }

  private put(kind: string, x: number, y: number, z: number, q: Quaternion, scale = 1, sy = scale): void {
    this.m.compose(this.v.set(x, y, z), q, this.s.set(scale, sy, scale));
    this.kinds[kind].add(this.m);
  }

  private yaw(a: number): Quaternion { return this.q.setFromAxisAngle(this.up, a); }

  /** alpha: render interpolation between the previous and the current tick; dt: this frame's seconds. */
  onFrame(items: Items, karts: readonly KartState[], kartRoots: readonly Object3D[], alpha: number, time: number, dt = 0, track?: Track): void {
    for (const k of Object.values(this.kinds)) k.begin();
    const st = items.state;

    // flying: face the way they travel
    for (const p of st.projectiles) {
      const x = p.prevPosition[0] + (p.position[0] - p.prevPosition[0]) * alpha;
      const y = p.prevPosition[1] + (p.position[1] - p.prevPosition[1]) * alpha;
      const z = p.prevPosition[2] + (p.position[2] - p.prevPosition[2]) * alpha;
      const dx = p.position[0] - p.prevPosition[0], dz = p.position[2] - p.prevPosition[2];
      const head = dx * dx + dz * dz > 1e-8 ? Math.atan2(dx, dz) : 0;
      if (p.itemId === 'beachBall') {
        // rolling end over end in the direction it flies
        this.w.set(Math.cos(head), 0, -Math.sin(head));
        this.q.setFromAxisAngle(this.w, time * 14 + p.id);
        this.put('beachBall', x, y + 0.25, z, this.q);
      } else if (p.itemId === 'homingKite') {
        this.q.setFromAxisAngle(this.up, head);
        this.spin.setFromAxisAngle(this.w.set(0, 0, 1), Math.sin(time * 9 + p.id) * 0.25);
        this.q.multiply(this.spin);
        this.spin.setFromAxisAngle(this.w.set(1, 0, 0), -0.5);
        this.q.multiply(this.spin);
        this.put('homingKite', x, y + 1.1, z, this.q);
      } else if (p.itemId === 'windUpMouse') {
        // scurrying: a quick waddle and a hop
        this.q.setFromAxisAngle(this.up, head + Math.sin(time * 26 + p.id) * 0.18);
        this.put('windUpMouse', x, y - 0.35 + Math.abs(Math.sin(time * 26 + p.id)) * 0.06, z, this.q, 1.1);
      }
    }

    // on the road
    for (const g of st.groundItems) {
      const [x, y, z] = g.position;
      if (g.itemId === 'oilCan') {
        const a = spread(g.id) * Math.PI * 2;
        this.put('oilSlick', x, y, z, this.yaw(a));
        this.put('oilCan', x, y, z, this.yaw(a));
      } else if (g.itemId === 'decoyBalloon') {
        // hovering and bobbing exactly like a real balloon
        this.put('decoyBalloon', x, y + 1.9 + Math.sin(time * 2 + g.id) * 0.12, z, this.yaw(time * 0.6 + g.id));
      }
    }

    // on the karts
    for (let i = 0; i < karts.length && i < kartRoots.length; i++) {
      const s = karts[i], root = kartRoots[i];
      const r = root.position, h = s.heading;
      const fx = Math.sin(h), fz = Math.cos(h);
      this.roll[i] ??= 0;

      // Strike Ball: the kart rides inside, rolling
      const riding = s.status.rideRemaining > 0;
      root.visible = !riding;
      if (riding) {
        this.roll[i] += (s.speed * dt) / RIDE_RADIUS;
        this.q.setFromAxisAngle(this.up, h);
        this.spin.setFromAxisAngle(this.w.set(1, 0, 0), this.roll[i]);
        this.q.multiply(this.spin);
        this.put('strikeBall', r.x, r.y + RIDE_RADIUS - 0.1, r.z, this.q);
      }

      if (s.status.shield) this.put('bubble', r.x, r.y + 0.75, r.z, this.yaw(time * 0.7), 1 + Math.sin(time * 5 + i) * 0.03);

      // Pogo Spring: stretched from the road to the kart
      if (st.pogo[i] > 0 && !s.grounded && track) {
        const ground = track.sample(s.t, 0, s.branch).groundY;
        const len = Math.max(0.3, r.y - ground);
        this.put('pogoSpring', r.x, ground, r.z, this.yaw(h), 1, len);
      }

      // hold to trail: the item rides just behind the kart
      if (items.isTrailing(i)) {
        const bx = r.x - fx * 1.9, bz = r.z - fz * 1.9, bob = Math.sin(time * 8 + i) * 0.05;
        switch (s.item.held) {
          case 'beachBall': this.put('beachBall', bx, r.y + 0.6 + bob, bz, this.yaw(time * 3)); break;
          case 'oilCan': this.put('oilCan', bx - 0.55 * Math.cos(h), r.y + bob, bz + 0.55 * Math.sin(h), this.yaw(h + Math.PI / 2)); break;
          case 'decoyBalloon': this.put('decoyBalloon', bx, r.y + 1.7 + bob, bz, this.yaw(h), 0.8); break;
          case 'windUpMouse': this.put('windUpMouse', bx, r.y + bob, bz, this.yaw(h)); break;
        }
      }

      // Triple Fizz: the bottles left fly round the kart, tipped outward and spinning
      if (s.item.held === 'tripleFizz' && s.item.rouletteRemaining <= 0) {
        for (let k = 0; k < s.item.charges; k++) {
          const a = time * 3.2 + (k / 3) * Math.PI * 2;
          this.q.setFromAxisAngle(this.w.set(Math.sin(a), 0, -Math.cos(a)), 0.45);
          this.spin.setFromAxisAngle(this.up, time * 5 + k);
          this.q.multiply(this.spin);
          this.put('fizzBottle', r.x + Math.cos(a) * 1.55, r.y + 1.15 + Math.sin(time * 4 + k * 2) * 0.12, r.z + Math.sin(a) * 1.55, this.q, 0.95);
        }
      }

      // Grapple Anchor: a chain from this kart's nose to the anchor hooked on the other's tail
      const to = s.status.towTarget;
      if (s.status.towRemaining > 0 && to >= 0 && to < kartRoots.length) {
        const o = kartRoots[to].position, oh = karts[to].heading;
        const ax = o.x - Math.sin(oh) * 1.3, ay = o.y + 0.5, az = o.z - Math.cos(oh) * 1.3;
        const sx = r.x + fx * 1.1, sy = r.y + 0.7, sz = r.z + fz * 1.1;
        const dx = ax - sx, dy = ay - sy, dz = az - sz, len = Math.hypot(dx, dy, dz);
        const n = Math.min(this.kinds.chainLink.mesh.instanceMatrix.count, Math.max(2, Math.floor(len / LINK)));
        // links face along the chain, every other one turned a quarter
        this.dummy.position.set(sx, sy, sz);
        this.dummy.lookAt(ax, ay, az);
        for (let k = 0; k < n; k++) {
          const t = (k + 0.5) / n, sag = Math.sin(t * Math.PI) * Math.min(0.8, len * 0.03);
          this.q.copy(this.dummy.quaternion);
          if (k % 2) { this.spin.setFromAxisAngle(this.w.set(0, 0, 1), Math.PI / 2); this.q.multiply(this.spin); }
          this.put('chainLink', sx + dx * t, sy + dy * t - sag, sz + dz * t, this.q);
        }
        this.put('grappleAnchor', ax, ay - 0.5, az, this.yaw(oh + Math.sin(time * 12) * 0.2), 0.9);
      }
    }

    for (const k of Object.values(this.kinds)) k.end();
  }

  /** Karts left inside a Strike Ball when a race ends are shown again. */
  reset(kartRoots: readonly Object3D[]): void {
    for (const r of kartRoots) r.visible = true;
  }
}
