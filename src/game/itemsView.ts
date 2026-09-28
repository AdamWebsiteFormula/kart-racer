// What the race shows of the items (design §8): what flies and what lies on the road, the item a
// kart trails behind it, the Triple Fizz bottles orbiting a kart, the Pogo Spring under a jumping
// kart, the Grapple Anchor's chain, the Strike Ball around a kart and the Bubble around a shielded
// one. The solid kinds that wear the items' toon and cast a shadow are one BatchedMesh (BATCHED: one
// draw a pass however many kinds are out); the rest an InstancedMesh per kind. Each is drawn only
// while something of it is out. Projectiles interpolate prev → current like karts.
import { jumpLift } from '../kart-controller/ground.ts';
import {
  BatchedMesh, BufferGeometry, InstancedMesh, Group, Matrix4, Object3D, Quaternion, SphereGeometry, Vector3, type Material, type MeshToonMaterial,
} from 'three';
import { bubbleMaterial, itemGeometry, oilSlickMaterial, strikeBallMaterial, vertexToon } from '../art-pipeline/index.ts';
import type { KartState } from '../kart-controller/types.ts';
import type { Items } from '../items/items.ts';
import type { Track } from '../track-builder/track.ts';
import { fadeNearCameraAlpha } from '../track-builder/mesh/glow.ts';
import { CAM } from './camera.ts';

const RIDE_RADIUS = 1.3;
/** metres behind the kart a held item trails */
export const TRAIL_BACK = 1.9;
/**
 * A held Beach Ball rides small, on the road: at full size (1.2 m across) it hid the kart that held
 * it from its own chase camera all lap (video review, 25 Sept 2026). Thrown, it is full size again.
 */
export const TRAIL_BALL_SCALE = 0.55;
/** A held Decoy Balloon bobs small and low behind the kart for the same reason (its body stood 1 to 2.6 m high, over the kart and its driver). */
export const TRAIL_DECOY_SCALE = 0.45;
const LINK = 0.2; // chain link spacing, metres

/**
 * The kinds drawn together in one BatchedMesh (`items`), and how many of each can be out at once: every
 * solid kind that wears the items' toon and casts a shadow (the chain's links cast none; the slick, the
 * Strike Ball and the Bubble wear their own materials), so they cost one draw a pass however many kinds
 * are out. One InstancedMesh a kind drew up to 11 draws for a pack holding items on Frostbite Pass's start
 * straight and put its final lap over the 100 budget (28 Sept 2026, docs/sops/performance.md).
 */
export const BATCHED_ITEMS: Readonly<Record<string, number>> = Object.freeze({
  beachBall: 16, homingKite: 16, windUpMouse: 16, oilCan: 16, decoyBalloon: 16, fizzBottle: 24, pogoSpring: 8, grappleAnchor: 8,
});

/** One kind's copies this frame: as many as are out, put in order, shown at the end. */
interface Slots {
  begin(): void;
  add(m: Matrix4): void;
  /** shows this frame's copies; returns how many */
  end(): number;
}

/** A kind of its own: one InstancedMesh. */
class Kind implements Slots {
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
  end(): number {
    this.mesh.count = this.n;
    this.mesh.visible = this.n > 0;
    if (this.n > 0) this.mesh.instanceMatrix.needsUpdate = true;
    return this.n;
  }
}

/** A kind in the batch: its instances made up front, hidden; the first as many as are out shown (only the ones that change are touched). */
class Batched implements Slots {
  private readonly batch: BatchedMesh;
  readonly ids: Int32Array;
  private n = 0;
  private shown = 0;
  constructor(batch: BatchedMesh, ids: Int32Array) { this.batch = batch; this.ids = ids; }
  begin(): void { this.n = 0; }
  add(m: Matrix4): void { if (this.n < this.ids.length) this.batch.setMatrixAt(this.ids[this.n++], m); }
  end(): number {
    for (let k = this.n; k < this.shown; k++) this.batch.setVisibleAt(this.ids[k], false);
    for (let k = this.shown; k < this.n; k++) this.batch.setVisibleAt(this.ids[k], true);
    this.shown = this.n;
    return this.n;
  }
}

/** A copy of an item model the batch can take: its three attributes, indexed (a model made without an index gets 0..n−1), its bounds. */
function batchable(src: BufferGeometry): BufferGeometry {
  const g = new BufferGeometry();
  for (const a of ['position', 'normal', 'color']) g.setAttribute(a, src.getAttribute(a).clone());
  if (src.index) g.setIndex(src.index.clone());
  else g.setIndex(Array.from({ length: src.getAttribute('position').count }, (_, i) => i));
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

/** The batch of BATCHED_ITEMS in `material`, every copy made and hidden, and each kind's instance ids. */
function itemBatch(material: Material): { mesh: BatchedMesh; ids: Record<string, Int32Array> } {
  const kinds = Object.entries(BATCHED_ITEMS);
  const geos = kinds.map(([k]) => batchable(itemGeometry(k) as BufferGeometry));
  const verts = geos.reduce((s, g) => s + g.getAttribute('position').count, 0);
  const index = geos.reduce((s, g) => s + g.index!.count, 0);
  const mesh = new BatchedMesh(kinds.reduce((s, [, n]) => s + n, 0), verts, index, material);
  const ids: Record<string, Int32Array> = {};
  kinds.forEach(([k, n], i) => {
    const geometry = mesh.addGeometry(geos[i]);
    const list = new Int32Array(n);
    for (let j = 0; j < n; j++) { list[j] = mesh.addInstance(geometry); mesh.setVisibleAt(list[j], false); }
    ids[k] = list;
  });
  mesh.name = 'items';
  mesh.castShadow = true;
  // its own bounds never follow the items: each copy is culled on its own (perObjectFrustumCulled), and not
  // sorted (no garbage a frame; one InstancedMesh a kind never sorted its copies either)
  mesh.frustumCulled = false;
  mesh.sortObjects = false;
  mesh.visible = false;
  return { mesh, ids };
}

let itemToonMaterial: MeshToonMaterial | null = null;
/** The items' own copy of the vertex toon, see-through near the lens (a prop's copy dithers). Shared, never disposed. */
function itemToon(): MeshToonMaterial {
  if (!itemToonMaterial) {
    itemToonMaterial = vertexToon().clone();
    itemToonMaterial.userData.shared = true;
    fadeNearCameraAlpha(itemToonMaterial, CAM.nearFade);
  }
  return itemToonMaterial;
}

let chainToonMaterial: MeshToonMaterial | null = null;
/**
 * The chain's links' own copy of it (the same shader): the batch draws the items' toon batched, and a
 * material drawn batched and instanced by turns would have three look its program up again at every
 * switch. Shared, never disposed.
 */
function chainToon(): MeshToonMaterial {
  if (!chainToonMaterial) {
    chainToonMaterial = vertexToon().clone();
    chainToonMaterial.userData.shared = true;
    fadeNearCameraAlpha(chainToonMaterial, CAM.nearFade);
  }
  return chainToonMaterial;
}

/** Deterministic 0..1 from an id, for a drop's resting angle. */
const spread = (id: number) => ((id * 2654435761) >>> 0) / 4294967296;

export class ItemsView {
  readonly root = new Group();
  /** the kinds drawn together (BATCHED_ITEMS): one draw a pass */
  readonly batch: BatchedMesh;
  private readonly kinds: Record<string, Slots>;
  /** the batch's kinds and the rest, as lists walked twice a frame without making a new array each time */
  private readonly inBatch: Batched[];
  private readonly own: Kind[];
  private readonly roll: number[] = [];
  private readonly spin = new Quaternion();
  private readonly q = new Quaternion();
  private readonly m = new Matrix4();
  private readonly v = new Vector3();
  private readonly w = new Vector3();
  private readonly s = new Vector3(1, 1, 1);
  private readonly up = new Vector3(0, 1, 0);
  private readonly at = new Vector3();
  private readonly dummy = new Object3D();

  constructor() {
    // an item against the lens (a rival's Strike Ball, a ball trailing the kart in front) fades out smoothly, as a rival's kart does
    fadeNearCameraAlpha(strikeBallMaterial(), CAM.nearFade);
    const kind = (name: string, cap: number, material: Material, shadows: boolean) => new Kind(itemGeometry(name) as BufferGeometry, material, cap, shadows);
    const { mesh, ids } = itemBatch(itemToon());
    this.batch = mesh;
    const batched: Record<string, Batched> = {};
    for (const k of Object.keys(BATCHED_ITEMS)) batched[k] = new Batched(mesh, ids[k]);
    const own: Record<string, Kind> = {
      oilSlick: kind('oilSlick', 16, oilSlickMaterial(), false),
      chainLink: kind('chainLink', 240, chainToon(), false),
      strikeBall: new Kind(new SphereGeometry(RIDE_RADIUS, 40, 28), strikeBallMaterial(), 8),
      bubble: new Kind(new SphereGeometry(1.6, 28, 20), bubbleMaterial(), 8, false),
    };
    this.kinds = { ...batched, ...own };
    this.inBatch = Object.values(batched);
    this.own = Object.values(own);
    this.root.add(mesh);
    for (const k of this.own) this.root.add(k.mesh);
  }

  /** Free what this view made: the batch (its buffers and textures), every kind's instance buffer and the two spheres. The item models are shared; the session frees the materials. */
  dispose(): void {
    this.batch.dispose();
    for (const k of this.own) k.mesh.dispose();
    (this.kinds.strikeBall as Kind).mesh.geometry.dispose();
    (this.kinds.bubble as Kind).mesh.geometry.dispose();
  }

  /** Where copy `k` of `kind` stands (checks): its matrix into `out`. */
  matrixOf(kind: string, k: number, out: Matrix4): Matrix4 {
    const s = this.kinds[kind];
    if (s instanceof Batched) return this.batch.getMatrixAt(s.ids[k], out);
    (s as Kind).mesh.getMatrixAt(k, out);
    return out;
  }

  private put(kind: string, x: number, y: number, z: number, q: Quaternion, scale = 1, sy = scale): void {
    this.m.compose(this.v.set(x, y, z), q, this.s.set(scale, sy, scale));
    this.kinds[kind].add(this.m);
  }

  private yaw(a: number): Quaternion { return this.q.setFromAxisAngle(this.up, a); }
  /**
   * A point `x` right, `y` up, `z` forward of a kart at `r` facing `h`, pitched `pitch` round a
   * loop-the-loop (0 on the road), in world metres. Writes and returns this.at.
   */
  private local(r: Vector3, h: number, pitch: number, x: number, y: number, z: number): Vector3 {
    const ca = Math.cos(pitch), sa = Math.sin(pitch), fwd = z * ca - y * sa;
    return this.at.set(r.x + Math.cos(h) * x + Math.sin(h) * fwd, r.y + y * ca + z * sa, r.z - Math.sin(h) * x + Math.cos(h) * fwd);
  }

  /** alpha: render interpolation between the previous and the current tick; dt: this frame's seconds. */
  onFrame(items: Items, karts: readonly KartState[], kartRoots: readonly Object3D[], alpha: number, time: number, dt = 0, track?: Track): void {
    for (let i = 0; i < this.inBatch.length; i++) this.inBatch[i].begin();
    for (let i = 0; i < this.own.length; i++) this.own[i].begin();
    const st = items.state;

    // flying: face the way they travel
    for (const p of st.projectiles) {
      const x = p.prevPosition[0] + (p.position[0] - p.prevPosition[0]) * alpha;
      const y = p.prevPosition[1] + (p.position[1] - p.prevPosition[1]) * alpha;
      const z = p.prevPosition[2] + (p.position[2] - p.prevPosition[2]) * alpha;
      const dx = p.position[0] - p.prevPosition[0], dz = p.position[2] - p.prevPosition[2];
      const head = dx * dx + dz * dz > 1e-8 ? Math.atan2(dx, dz) : 0;
      if (p.itemId === 'beachBall') {
        // rolling end over end in the direction it flies; it leaves the hand at its held size and grows to
        // full size over the thrower's grace (0.35 s), its bottom on the same line: no pop from the trail
        this.w.set(Math.cos(head), 0, -Math.sin(head));
        this.q.setFromAxisAngle(this.w, time * 14 + p.id);
        const grace = items.cfg.ownerGraceSeconds, k = grace > 0 ? Math.min(1, Math.max(0, 1 - p.graceRemaining / grace)) : 1;
        const sc = TRAIL_BALL_SCALE + (1 - TRAIL_BALL_SCALE) * k * (2 - k);
        this.put('beachBall', x, y - 0.35 + 0.6 * sc, z, this.q, sc);
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
        this.put('oilSlick', x, y + 0.03, z, this.yaw(a));
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
      // round a loop-the-loop the kart is pitched: what it carries goes round with it
      const pitch = s.status.loopIndex >= 0 ? s.status.loopAngle : 0;

      // Strike Ball: the kart rides inside, rolling
      const riding = s.status.rideRemaining > 0;
      root.visible = !riding;
      if (riding) {
        this.roll[i] += (s.speed * dt) / RIDE_RADIUS;
        this.q.setFromAxisAngle(this.up, h);
        this.spin.setFromAxisAngle(this.w.set(1, 0, 0), this.roll[i]);
        this.q.multiply(this.spin);
        const p = this.local(r, h, pitch, 0, RIDE_RADIUS - 0.1, 0);
        this.put('strikeBall', p.x, p.y, p.z, this.q);
      }

      if (s.status.shield) {
        const p = this.local(r, h, pitch, 0, 0.75, 0);
        this.put('bubble', p.x, p.y, p.z, this.yaw(time * 0.7), 1 + Math.sin(time * 5 + i) * 0.03);
      }

      // Pogo Spring: stretched from the road to the kart
      if (st.pogo[i] > 0 && !s.grounded && track) {
        const g = track.sample(s.t, 0, s.branch);
        const ground = g.groundY + jumpLift(track, s.t, s.branch, 0, g.halfWidth);
        const len = Math.max(0.3, r.y - ground);
        this.put('pogoSpring', r.x, ground, r.z, this.yaw(h), 1, len);
      }

      // hold to trail: the item rides just behind the kart
      if (items.isTrailing(i)) {
        const bob = Math.sin(time * 8 + i) * 0.05;
        let p: Vector3;
        switch (s.item.held) {
          case 'beachBall': p = this.local(r, h, pitch, 0, 0.6 * TRAIL_BALL_SCALE + bob, -TRAIL_BACK); this.put('beachBall', p.x, p.y, p.z, this.yaw(time * 3), TRAIL_BALL_SCALE); break;
          case 'oilCan': p = this.local(r, h, pitch, -0.55, bob, -TRAIL_BACK); this.put('oilCan', p.x, p.y, p.z, this.yaw(h + Math.PI / 2)); break;
          case 'decoyBalloon': p = this.local(r, h, pitch, 0, 0.98 * TRAIL_DECOY_SCALE + bob, -TRAIL_BACK); this.put('decoyBalloon', p.x, p.y, p.z, this.yaw(h), TRAIL_DECOY_SCALE); break;
          case 'windUpMouse': p = this.local(r, h, pitch, 0, bob, -TRAIL_BACK); this.put('windUpMouse', p.x, p.y, p.z, this.yaw(h)); break;
        }
      }

      // Triple Fizz: the bottles left fly round the kart, tipped outward and spinning
      if (s.item.held === 'tripleFizz' && s.item.rouletteRemaining <= 0) {
        for (let k = 0; k < s.item.charges; k++) {
          const a = time * 3.2 + (k / 3) * Math.PI * 2;
          this.q.setFromAxisAngle(this.w.set(Math.sin(a), 0, -Math.cos(a)), 0.45);
          this.spin.setFromAxisAngle(this.up, time * 5 + k);
          this.q.multiply(this.spin);
          // the same world orbit on the road (a + h turns world axes into the kart's), tipped with the kart round a loop
          const p = this.local(r, h, pitch, Math.cos(a + h) * 1.55, 1.15 + Math.sin(time * 4 + k * 2) * 0.12, Math.sin(a + h) * 1.55);
          this.put('fizzBottle', p.x, p.y, p.z, this.q, 0.95);
        }
      }

      // Grapple Anchor: a chain from this kart's nose to the anchor hooked on the other's tail
      const to = s.status.towTarget;
      if (s.status.towRemaining > 0 && to >= 0 && to < kartRoots.length) {
        const o = kartRoots[to].position, oh = karts[to].heading;
        const ax = o.x - Math.sin(oh) * 1.3, ay = o.y + 0.5, az = o.z - Math.cos(oh) * 1.3;
        const sx = r.x + fx * 1.1, sy = r.y + 0.7, sz = r.z + fz * 1.1;
        const dx = ax - sx, dy = ay - sy, dz = az - sz, len = Math.hypot(dx, dy, dz);
        const n = Math.min((this.kinds.chainLink as Kind).mesh.instanceMatrix.count, Math.max(2, Math.floor(len / LINK)));
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

    let batched = 0;
    for (let i = 0; i < this.inBatch.length; i++) batched += this.inBatch[i].end();
    // an empty batch is not drawn at all (it would still bind its program in both passes)
    this.batch.visible = batched > 0;
    for (let i = 0; i < this.own.length; i++) this.own[i].end();
  }

  /** Karts left inside a Strike Ball when a race ends are shown again. */
  reset(kartRoots: readonly Object3D[]): void {
    for (const r of kartRoots) r.visible = true;
  }
}
