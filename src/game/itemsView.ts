// What the race shows of the items (design §8; the new set of 28 Sept 2026): the Laser Blaster's bolts, the
// Homing Rockets and the Seeker Drones in flight, the Oil Slicks and Decoy Mines on the road, the item a kart
// trails behind it, the Triple Nitro canisters orbiting a kart, the Jump Jets' thrusters under a kart in the
// air, the Tractor Beam from a kart to the one it reels in, Jet Mode's fighter jet in place of a kart and
// the Energy Shield round one. Every solid part is one BatchedMesh in the items' PBR material (one draw a
// pass however many kinds are out), every glow round them another in the additive light (one draw, no
// shadow), and the slick and the shield an instancer each; each is drawn only while something of it is out.
// Projectiles interpolate prev → current like karts. Pictures only: the sim decides everything.
import { jumpLift } from '../kart-controller/ground.ts';
import {
  BatchedMesh, BufferGeometry, Color, Group, InstancedBufferAttribute, InstancedMesh, Matrix4, Object3D, Quaternion, SphereGeometry, Vector3, Vector4,
  type Material,
} from 'three';
import {
  energyMaterial, ITEM_PICKUP_GLOW, itemGeometry, itemMaterial, JET, oilSlickMaterial, SHIELD, shieldMaterial,
} from '../art-pipeline/index.ts';
import type { KartState } from '../kart-controller/types.ts';
import { itemById } from '../items/data.ts';
import type { Items } from '../items/items.ts';
import type { Track } from '../track-builder/track.ts';
import { fadeNearCameraAlpha } from '../track-builder/mesh/glow.ts';
import { BALLOON_MOTION } from '../track-builder/mesh/scene.ts';
import { CAM } from './camera.ts';
import { ROSTER } from './racers.ts';

/** metres behind the kart a held item trails */
export const TRAIL_BACK = 1.9;
/** A held Laser Blaster is its charged orb, low behind the kart (a held item never hides its own kart: 25 Sept 2026): the orb's middle */
export const TRAIL_ORB_Y = 0.42;
/** A held Decoy Mine bobs small and low behind the kart (its balloon stood 1 to 2.6 m high, over the kart and its driver). */
export const TRAIL_MINE_SCALE = 0.45;

/** The Laser Blaster's bolt: how high over the road it flies (over the sim's shot height), and the share of its length it leaves the orb at. */
export const LASER = Object.freeze({ lift: 0.3, born: 0.3 });
/** The Homing Rocket: its size, its height over the shot, its wobble in the air (rad, per s). */
export const ROCKET = Object.freeze({ scale: 1.3, lift: 0.55, roll: 0.22, rollHz: 1.4 });
/** The Seeker Drone: its hover over the shot, its bank into its weave (rad), its nose down. */
export const DRONE = Object.freeze({ lift: 0.35, bank: 0.42, pitch: 0.1 });
/**
 * The Decoy Mine: a pickup balloon until a kart comes within `warn` metres, when its red light blinks,
 * `slow` times a second at that distance, `fast` right by it (a held one blinks `held` times a second: it is armed).
 */
export const MINE = Object.freeze({ lift: 1.9, warn: 14, slow: 2.2, fast: 7, held: 1.4 });
/**
 * Jet Mode: the jet's size, how high it skims the road (its middle), how long its wings take to unfold (s)
 * and how far up they start, the bank into a turn (per rad/s of the kart's turn, and the most), the scale it
 * pops in from.
 */
export const JET_LOOK = Object.freeze({ scale: 0.88, hover: 0.95, unfold: 0.38, folded: 1.35, bank: 0.32, maxBank: 0.6, from: 0.45 });
/** The Jump Jets: the pods' place by the kart (x either side, y, z) and the flames' length rising, hanging and diving. */
export const JUMP_JETS = Object.freeze({ at: Object.freeze([0.92, 0.28, -0.1] as const), rise: 1.1, hang: 0.4, dive: 1.3 });
/** a thruster pod's height, its nozzle's exit to its top (art-pipeline items.ts thruster) */
const POD_HEIGHT = 0.47;

/**
 * The solid kinds drawn together in one BatchedMesh (`items`), and how many of each can be out at once
 * (the flying and the trailed share a kind's copies where they are one model). One InstancedMesh a kind
 * drew up to 11 draws for a pack holding items on Frostbite Pass's start straight and put its final lap over
 * the 100 budget (28 Sept 2026, docs/sops/performance.md).
 */
export const BATCHED_ITEMS: Readonly<Record<string, number>> = Object.freeze({
  laserBolt: 16, laserOrb: 8, rocket: 16, canister: 24, mine: 24, mineLight: 24, drone: 24, nitro: 24, thruster: 16, beamEmitter: 8,
  jetHull: 8, jetWingL: 8, jetWingR: 8, jetFins: 8, jetTrim: 8,
});
/** The glows drawn together in the additive BatchedMesh (`item-light`), and how many of each at once. */
export const ENERGY_ITEMS: Readonly<Record<string, number>> = Object.freeze({
  boltGlow: 16, glowOrb: 64, flameHot: 24, flameBlue: 48, beam: 8, ring: 8, disc: 16, droneFx: 24,
});

/** One kind's copies this frame: as many as are out, put in order, shown at the end. */
interface Slots {
  begin(): void;
  add(m: Matrix4, c?: Vector4): void;
  /** shows this frame's copies; returns how many */
  end(): number;
}

/** The oil slick: one InstancedMesh. */
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

/** The Energy Shield: an instancer with each copy's age, strength and seed (shieldMaterial's `aShield`). */
class ShieldKind extends Kind {
  readonly fx: InstancedBufferAttribute;
  private k = 0;
  constructor(cap: number) {
    const g = new SphereGeometry(1, 40, 28);
    super(g, shieldMaterial(), cap, false);
    this.fx = new InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    g.setAttribute('aShield', this.fx);
  }
  override begin(): void { super.begin(); this.k = 0; }
  addShield(m: Matrix4, age: number, strength: number, seed: number): void {
    if (this.k >= this.fx.count) return;
    this.fx.setXYZ(this.k++, age, strength, seed);
    this.add(m);
  }
  override end(): number {
    if (this.k > 0) this.fx.needsUpdate = true;
    return super.end();
  }
}

/** A kind in a batch: its instances made up front, hidden; the first as many as are out shown (only the ones that change are touched). */
class Batched implements Slots {
  private readonly batch: BatchedMesh;
  readonly ids: Int32Array;
  private n = 0;
  private shown = 0;
  constructor(batch: BatchedMesh, ids: Int32Array) { this.batch = batch; this.ids = ids; }
  begin(): void { this.n = 0; }
  add(m: Matrix4, c?: Vector4): void {
    if (this.n >= this.ids.length) return;
    const id = this.ids[this.n++];
    this.batch.setMatrixAt(id, m);
    if (c) this.batch.setColorAt(id, c);
  }
  end(): number {
    for (let k = this.n; k < this.shown; k++) this.batch.setVisibleAt(this.ids[k], false);
    for (let k = this.shown; k < this.n; k++) this.batch.setVisibleAt(this.ids[k], true);
    this.shown = this.n;
    return this.n;
  }
}

/** A copy of an item model the batch can take: its attributes, indexed (a model made without an index gets 0..n−1), its bounds. */
function batchable(src: BufferGeometry, names: readonly string[]): BufferGeometry {
  const g = new BufferGeometry();
  for (const a of names) g.setAttribute(a, src.getAttribute(a).clone());
  if (src.index) g.setIndex(src.index.clone());
  else g.setIndex(Array.from({ length: src.getAttribute('position').count }, (_, i) => i));
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

/** A batch of `kinds` in `material`, every copy made and hidden, and each kind's instance ids. */
function itemBatch(kinds: Readonly<Record<string, number>>, attributes: readonly string[], material: Material, name: string): { mesh: BatchedMesh; ids: Record<string, Int32Array> } {
  const list = Object.entries(kinds);
  const geos = list.map(([k]) => batchable(itemGeometry(k) as BufferGeometry, attributes));
  const verts = geos.reduce((s, g) => s + g.getAttribute('position').count, 0);
  const index = geos.reduce((s, g) => s + g.index!.count, 0);
  const mesh = new BatchedMesh(list.reduce((s, [, n]) => s + n, 0), verts, index, material);
  const ids: Record<string, Int32Array> = {};
  list.forEach(([k, n], i) => {
    const geometry = mesh.addGeometry(geos[i]);
    const out = new Int32Array(n);
    for (let j = 0; j < n; j++) { out[j] = mesh.addInstance(geometry); mesh.setVisibleAt(out[j], false); }
    ids[k] = out;
  });
  // (the batch keeps its own copy of each model: these were only the way in)
  for (const g of geos) g.dispose();
  mesh.name = name;
  // its own bounds never follow the items: each copy is culled on its own (perObjectFrustumCulled), and not
  // sorted (no garbage a frame; one InstancedMesh a kind never sorted its copies either)
  mesh.frustumCulled = false;
  mesh.sortObjects = false;
  mesh.visible = false;
  return { mesh, ids };
}

let solidMaterial: Material | null = null;
/** The items' own PBR material, see-through near the lens (a prop's copy dithers). Shared, never disposed. */
function itemsMaterial(): Material {
  if (!solidMaterial) {
    solidMaterial = itemMaterial();
    fadeNearCameraAlpha(solidMaterial, CAM.nearFade);
  }
  return solidMaterial;
}
let lightMaterial: Material | null = null;
/** The items' light, faded near the lens too (a glow against the lens would white the screen out). */
function itemsLight(): Material {
  if (!lightMaterial) {
    lightMaterial = energyMaterial();
    fadeNearCameraAlpha(lightMaterial, CAM.nearFade);
  }
  return lightMaterial;
}

/** Deterministic 0..1 from an id, for a drop's resting angle. */
const spread = (id: number) => ((id * 2654435761) >>> 0) / 4294967296;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** 0 → 1 with a little overshoot past 1 before it settles (a spring's). */
const backOut = (k: number) => { const c = 1.9, t = k - 1; return 1 + (c + 1) * t * t * t + c * t * t; };
const WHITE = new Vector4(1, 1, 1, 1);
const AXES = Object.freeze([new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)] as const);

/** Linear racer colors for the jet's paint, by racer id (hull: accent; wings and fins: secondary). */
const LIVERY = new Map(ROSTER.map((r) => [r.id, { hull: new Color(r.accent), trim: new Color(r.secondary) }]));
const LIVERY_DEFAULT = { hull: new Color(0x2ec4b6), trim: new Color(0xffffff) };

export class ItemsView {
  readonly root = new Group();
  /** the solid kinds (BATCHED_ITEMS): one draw a pass */
  readonly batch: BatchedMesh;
  /** the glows round them (ENERGY_ITEMS): one draw, no shadow */
  readonly light: BatchedMesh;
  private readonly kinds: Record<string, Slots>;
  private readonly slick: Kind;
  private readonly shield: ShieldKind;
  /** the batches' kinds, walked twice a frame without making a new array each time */
  private readonly inBatch: Batched[];
  private readonly inLight: Batched[];
  /** per kart: seconds its shield has been up, its jet's bank, its heading last frame */
  private readonly shieldAge: number[] = [];
  private readonly bank: number[] = [];
  private readonly lastHeading: number[] = [];
  private readonly q = new Quaternion();
  private readonly q2 = new Quaternion();
  private readonly spin = new Quaternion();
  private readonly m = new Matrix4();
  private readonly m2 = new Matrix4();
  private readonly m3 = new Matrix4();
  private readonly v = new Vector3();
  private readonly w = new Vector3();
  private readonly s = new Vector3(1, 1, 1);
  private readonly up = new Vector3(0, 1, 0);
  private readonly fwd = new Vector3(0, 0, 1);
  private readonly at = new Vector3();
  private readonly p0 = new Vector3();
  private readonly p1 = new Vector3();
  private readonly c = new Vector4();
  private readonly paint = new Vector4();

  constructor() {
    const solid = itemBatch(BATCHED_ITEMS, ['position', 'normal', 'color', 'pbr'], itemsMaterial(), 'items');
    this.batch = solid.mesh;
    this.batch.castShadow = true;
    this.batch.receiveShadow = true;
    const light = itemBatch(ENERGY_ITEMS, ['position', 'normal', 'color'], itemsLight(), 'item-light');
    this.light = light.mesh;
    const kinds: Record<string, Slots> = {};
    this.inBatch = [];
    this.inLight = [];
    for (const k of Object.keys(BATCHED_ITEMS)) { const b = new Batched(this.batch, solid.ids[k]); kinds[k] = b; this.inBatch.push(b); }
    for (const k of Object.keys(ENERGY_ITEMS)) { const b = new Batched(this.light, light.ids[k]); kinds[k] = b; this.inLight.push(b); }
    // every copy's color made white up front (the jets' paint and the lights' strength are set as they show)
    for (const id of Object.values(solid.ids)) for (const i of id) this.batch.setColorAt(i, WHITE);
    for (const id of Object.values(light.ids)) for (const i of id) this.light.setColorAt(i, WHITE);
    this.slick = new Kind(itemGeometry('oilSlick') as BufferGeometry, oilSlickMaterial(), 16, false);
    this.shield = new ShieldKind(8);
    kinds.oilSlick = this.slick;
    kinds.shield = this.shield;
    this.kinds = kinds;
    this.root.add(this.batch, this.light, this.slick.mesh, this.shield.mesh);
  }

  /** Free what this view made: both batches (their buffers and textures), the slick's instances, the shield's sphere. The item models are shared; the session frees the materials. */
  dispose(): void {
    this.batch.dispose();
    this.light.dispose();
    this.slick.mesh.dispose();
    this.shield.mesh.dispose();
    this.shield.mesh.geometry.dispose();
  }

  /** Where copy `k` of `kind` stands (checks): its matrix into `out`. */
  matrixOf(kind: string, k: number, out: Matrix4): Matrix4 {
    const s = this.kinds[kind];
    if (s instanceof Batched) return (BATCHED_ITEMS[kind] !== undefined ? this.batch : this.light).getMatrixAt(s.ids[k], out);
    (s as Kind).mesh.getMatrixAt(k, out);
    return out;
  }

  /** How many copies of `kind` show this frame (checks). */
  shownOf(kind: string): number {
    const s = this.kinds[kind];
    if (s instanceof Batched) {
      const mesh = BATCHED_ITEMS[kind] !== undefined ? this.batch : this.light;
      return Array.from(s.ids).filter((id) => mesh.getVisibleAt(id)).length;
    }
    return (s as Kind).mesh.count;
  }

  private put(kind: string, x: number, y: number, z: number, q: Quaternion, sx = 1, sy = sx, sz = sx, c?: Vector4): void {
    this.m.compose(this.v.set(x, y, z), q, this.s.set(sx, sy, sz));
    this.kinds[kind].add(this.m, c);
  }
  /** A glow: `kind` at (x, y, z) turned `q`, in color (r, g, b) at strength a. */
  private glow(kind: string, x: number, y: number, z: number, q: Quaternion, sx: number, sy: number, sz: number, r: number, g: number, b: number, a: number): void {
    this.put(kind, x, y, z, q, sx, sy, sz, this.c.set(r, g, b, a));
  }

  private yaw(a: number, out = this.q): Quaternion { return out.setFromAxisAngle(this.up, a); }
  /**
   * A point `x` right, `y` up, `z` forward of a kart at `r` facing `h`, pitched `pitch` round a
   * loop-the-loop (0 on the road), in world metres. Writes and returns this.at.
   */
  private local(r: Vector3, h: number, pitch: number, x: number, y: number, z: number): Vector3 {
    const ca = Math.cos(pitch), sa = Math.sin(pitch), fwd = z * ca - y * sa;
    return this.at.set(r.x + Math.cos(h) * x + Math.sin(h) * fwd, r.y + y * ca + z * sa, r.z - Math.sin(h) * x + Math.cos(h) * fwd);
  }
  /** `q` then a turn of `a` about the model's own `axis` (0 x, 1 y, 2 z). */
  private turn(q: Quaternion, axis: 0 | 1 | 2, a: number): Quaternion {
    this.spin.setFromAxisAngle(AXES[axis], a);
    return q.multiply(this.spin);
  }

  /** alpha: render interpolation between the previous and the current tick; dt: this frame's seconds. `pickupGlow`: the track's balloons' night glow (the Decoy Mine wears it too). */
  onFrame(items: Items, karts: readonly KartState[], kartRoots: readonly Object3D[], alpha: number, time: number, dt = 0, track?: Track, pickupGlow?: number): void {
    if (pickupGlow !== undefined) ITEM_PICKUP_GLOW.value = pickupGlow;
    for (let i = 0; i < this.inBatch.length; i++) this.inBatch[i].begin();
    for (let i = 0; i < this.inLight.length; i++) this.inLight[i].begin();
    this.slick.begin();
    this.shield.begin();
    const st = items.state;

    // ---- flying: face the way they travel
    for (const p of st.projectiles) {
      const x = p.prevPosition[0] + (p.position[0] - p.prevPosition[0]) * alpha;
      const y = p.prevPosition[1] + (p.position[1] - p.prevPosition[1]) * alpha;
      const z = p.prevPosition[2] + (p.position[2] - p.prevPosition[2]) * alpha;
      const dx = p.position[0] - p.prevPosition[0], dz = p.position[2] - p.prevPosition[2];
      const head = dx * dx + dz * dz > 1e-8 ? Math.atan2(dx, dz) : 0;
      if (p.itemId === 'beachBall') {
        // the Laser Blaster's bolt: it stretches out of the held orb over the thrower's grace (0.35 s), a white-hot
        // core in a hot pink halo, flickering
        const grace = items.cfg.ownerGraceSeconds, k = grace > 0 ? clamp01(1 - p.graceRemaining / grace) : 1;
        const len = LASER.born + (1 - LASER.born) * k * (2 - k);
        const q = this.yaw(head);
        this.put('laserBolt', x, y + LASER.lift, z, q, 1, 1, len);
        this.glow('boltGlow', x, y + LASER.lift, z, q, 1, 1, len, 1, 1, 1, 0.8 + 0.2 * Math.sin(time * 47 + p.id));
      } else if (p.itemId === 'homingKite') {
        // the Homing Rocket: nose along its flight (up and down with the road), rolling a little as it steers
        const dy = p.position[1] - p.prevPosition[1], run = Math.hypot(dx, dz);
        const q = this.yaw(head);
        this.turn(q, 0, run > 1e-6 ? -Math.atan2(dy, run) : 0);
        this.turn(q, 2, Math.sin(time * ROCKET.rollHz * Math.PI * 2 + p.id) * ROCKET.roll);
        const ry = y + ROCKET.lift, k = ROCKET.scale;
        this.put('rocket', x, ry, z, q, k);
        // its flame and the glow at the nozzle, flickering
        this.v.set(0, 0, -0.44 * k).applyQuaternion(q);
        const fl = (0.85 + 0.25 * Math.sin(time * 31 + p.id * 1.7)) * k;
        this.glow('flameHot', x + this.v.x, ry + this.v.y, z + this.v.z, q, 0.14 * k, 0.14 * k, fl, 1, 1, 1, 1);
        this.glow('glowOrb', x + this.v.x, ry + this.v.y, z + this.v.z, q, 0.32 * k, 0.32 * k, 0.32 * k, 3, 1.3, 0.35, 0.75);
      } else if (p.itemId === 'windUpMouse') {
        // the Seeker Drone: hovering, banked into its weave, its rotors a blur
        const weave = p.weave > 0 ? Math.cos((2 * Math.PI * p.age) / p.weaveSeconds) : 0;
        const q = this.yaw(head);
        this.turn(q, 2, weave * DRONE.bank);
        this.turn(q, 0, DRONE.pitch);
        const dy = y + DRONE.lift + Math.sin(time * 5 + p.id) * 0.04;
        this.put('drone', x, dy, z, q);
        this.glow('droneFx', x, dy, z, q, 1, 1, 1, 1, 1, 1, 0.9 + 0.1 * Math.sin(time * 60 + p.id));
      }
    }

    // ---- on the road
    for (const g of st.groundItems) {
      const [x, y, z] = g.position;
      if (g.itemId === 'oilCan') {
        // the slick, and its chrome canister on its side at the edge of it, its valve in the pool
        const a = spread(g.id) * Math.PI * 2;
        this.put('oilSlick', x, y + 0.03, z, this.yaw(a));
        const q = this.yaw(a);
        this.v.set(0.95, 0.19, 0).applyQuaternion(q);
        this.turn(q, 2, Math.PI / 2 - 0.12);
        this.put('canister', x + this.v.x, y + this.v.y, z + this.v.z, q);
      } else if (g.itemId === 'decoyBalloon') {
        // hovering and bobbing exactly like a real balloon; its red light blinks once a kart is near, faster the nearer
        // bobbing and turning as the real cores do (BALLOON_MOTION), so the decoy gives nothing away
        const by = y + MINE.lift + Math.sin((Math.PI * 2 * time) / BALLOON_MOTION.bobS + g.id) * BALLOON_MOTION.bob;
        const q = this.yaw((Math.PI * 2 * time) / BALLOON_MOTION.spinS + g.id);
        this.put('mine', x, by, z, q);
        let near = Infinity;
        for (let i = 0; i < karts.length; i++) near = Math.min(near, Math.hypot(karts[i].position[0] - x, karts[i].position[2] - z));
        if (near < MINE.warn) {
          const k = 1 - near / MINE.warn, hz = MINE.slow + (MINE.fast - MINE.slow) * k * k;
          this.mineBlink(x, by, z, q, 1, (time + spread(g.id)) * hz);
        }
      }
    }

    // ---- on the karts
    const jetSeconds = itemById(items.cfg, 'strikeBall')?.behaviour.durationSeconds ?? 5;
    for (let i = 0; i < karts.length && i < kartRoots.length; i++) {
      const s = karts[i], root = kartRoots[i];
      const r = root.position, h = s.heading;
      // round a loop-the-loop the kart is pitched: what it carries goes round with it
      const pitch = s.status.loopIndex >= 0 ? s.status.loopAngle : 0;
      const turnRate = dt > 0 && this.lastHeading[i] !== undefined ? Math.atan2(Math.sin(h - this.lastHeading[i]), Math.cos(h - this.lastHeading[i])) / dt : 0;
      this.lastHeading[i] = h;

      // Jet Mode: the kart is the jet
      const riding = s.status.rideRemaining > 0;
      root.visible = !riding;
      if (riding) this.jet(s, i, r, h, pitch, turnRate, jetSeconds - s.status.rideRemaining, time, dt);
      else this.bank[i] = 0;

      // the Energy Shield: it grows up round the kart, and flickers as it runs out
      if (s.status.shield) {
        const age = (this.shieldAge[i] ?? 0) + dt;
        this.shieldAge[i] = age;
        const left = st.shieldRemaining[i] ?? Infinity;
        const f = clamp01(left / SHIELD.flicker);
        const strength = left < SHIELD.flicker ? (Math.sin(time * (16 + 34 * (1 - f))) > -0.3 ? 1 : 0.2) : 1;
        const p = this.local(r, h, pitch, 0, SHIELD.lift, 0);
        const q = this.yaw(h);
        this.turn(q, 0, -pitch);
        this.m.compose(this.v.copy(p), q, this.s.set(SHIELD.radii[0], SHIELD.radii[1], SHIELD.radii[2]));
        this.shield.addShield(this.m, age, strength, i * 1.7);
      } else this.shieldAge[i] = 0;

      // the Jump Jets: two thrusters under the kart while it is up, burning down, then up as it dives
      if (st.pogo[i] > 0 && !s.grounded) this.jumpJets(s, st.pogo[i], r, h, pitch, time, i, track);

      // hold to trail: the item rides just behind the kart
      if (items.isTrailing(i)) {
        const bob = Math.sin(time * 8 + i) * 0.05;
        const q = this.yaw(h);
        this.turn(q, 0, -pitch);
        let p: Vector3;
        switch (s.item.held) {
          case 'beachBall':
            p = this.local(r, h, pitch, 0, TRAIL_ORB_Y + bob, -TRAIL_BACK);
            this.turn(q, 1, time * 3);
            this.turn(q, 0, time * 2.3);
            this.put('laserOrb', p.x, p.y, p.z, q);
            this.glow('glowOrb', p.x, p.y, p.z, q, 0.34, 0.34, 0.34, 2.6, 0.45, 1.6, 0.7 + 0.2 * Math.sin(time * 23 + i));
            break;
          case 'oilCan':
            p = this.local(r, h, pitch, -0.55, 0.05 + bob, -TRAIL_BACK);
            this.turn(q, 0, -0.25);
            this.put('canister', p.x, p.y, p.z, q);
            break;
          case 'decoyBalloon':
            p = this.local(r, h, pitch, 0, 0.98 * TRAIL_MINE_SCALE + bob, -TRAIL_BACK);
            this.put('mine', p.x, p.y, p.z, q, TRAIL_MINE_SCALE);
            this.mineBlink(p.x, p.y, p.z, q, TRAIL_MINE_SCALE, time * MINE.held + i * 0.31);
            break;
          case 'windUpMouse':
            p = this.local(r, h, pitch, 0, 0.3 + bob, -TRAIL_BACK);
            this.put('drone', p.x, p.y, p.z, q);
            this.glow('droneFx', p.x, p.y, p.z, q, 1, 1, 1, 1, 1, 1, 1);
            break;
        }
      }

      // Triple Nitro: the canisters left fly round the kart, tipped outward and spinning
      if (s.item.held === 'tripleFizz' && s.item.rouletteRemaining <= 0) {
        for (let k = 0; k < s.item.charges; k++) {
          const a = time * 3.2 + (k / 3) * Math.PI * 2;
          this.q.setFromAxisAngle(this.w.set(Math.sin(a), 0, -Math.cos(a)), 0.45);
          this.spin.setFromAxisAngle(this.up, time * 5 + k);
          this.q.multiply(this.spin);
          // the same world orbit on the road (a + h turns world axes into the kart's), tipped with the kart round a loop
          const p = this.local(r, h, pitch, Math.cos(a + h) * 1.55, 1.15 + Math.sin(time * 4 + k * 2) * 0.12, Math.sin(a + h) * 1.55);
          this.put('nitro', p.x, p.y, p.z, this.q, 0.95);
          this.glow('glowOrb', p.x, p.y + 0.18, p.z, this.q, 0.14, 0.14, 0.14, 0.4, 1.8, 2.6, 0.3);
        }
      }

      // the Tractor Beam: a beam from this kart's nose to a lock on the other's tail, pulses running back along it
      const to = s.status.towTarget;
      if (s.status.towRemaining > 0 && to >= 0 && to < kartRoots.length) this.tractor(r, h, pitch, kartRoots[to].position, karts[to].heading, time);
    }

    let batched = 0, lit = 0;
    for (let i = 0; i < this.inBatch.length; i++) batched += this.inBatch[i].end();
    for (let i = 0; i < this.inLight.length; i++) lit += this.inLight[i].end();
    // an empty batch is not drawn at all (it would still bind its program in both passes)
    this.batch.visible = batched > 0;
    this.light.visible = lit > 0;
    this.slick.end();
    this.shield.end();
  }

  /** The Decoy Mine's red light, on for the first part of each blink (`phase` in blinks), with its glow. */
  private mineBlink(x: number, y: number, z: number, q: Quaternion, scale: number, phase: number): void {
    if (phase - Math.floor(phase) > 0.45) return;
    this.put('mineLight', x, y, z, q, scale);
    const ny = y - 0.8 * scale;
    this.glow('glowOrb', x, ny, z, q, 0.42 * scale, 0.42 * scale, 0.42 * scale, 3.4, 0.25, 0.2, 0.85);
  }

  /** Jet Mode: the fighter jet skimming the road where kart `s` is, in its racer's colors, its wings unfolding as it forms. */
  private jet(s: KartState, i: number, r: Vector3, h: number, loopPitch: number, turnRate: number, age: number, time: number, dt: number): void {
    const J = JET_LOOK;
    // banked into the turn (eased), nose up and down with the road
    const want = Math.max(-J.maxBank, Math.min(J.maxBank, -turnRate * J.bank));
    const b = (this.bank[i] ?? 0) + (want - (this.bank[i] ?? 0)) * clamp01(dt * 6);
    this.bank[i] = b;
    const n = s.groundNormal, slope = Math.asin(Math.max(-1, Math.min(1, -(n[0] * Math.sin(h) + n[2] * Math.cos(h)))));
    const pitch = loopPitch + (s.status.loopIndex >= 0 ? 0 : slope);
    const unfold = backOut(clamp01(age / J.unfold));
    const scale = J.scale * (J.from + (1 - J.from) * clamp01(age / (J.unfold * 0.6)));
    const p = this.local(r, h, loopPitch, 0, J.hover + Math.sin(time * 2.6 + i) * 0.05, 0);
    const q = this.yaw(h, this.q2);
    this.turn(q, 0, -pitch);
    this.turn(q, 2, b);
    const px = p.x, py = p.y, pz = p.z;
    const livery = LIVERY.get(s.racerId) ?? LIVERY_DEFAULT;
    this.m2.compose(this.v.set(px, py, pz), q, this.s.set(scale, scale, scale));
    this.kinds.jetHull.add(this.m2, this.paint.set(livery.hull.r, livery.hull.g, livery.hull.b, 1));
    this.kinds.jetFins.add(this.m2, this.paint.set(livery.trim.r, livery.trim.g, livery.trim.b, 1));
    this.kinds.jetTrim.add(this.m2, WHITE);
    // each wing folds about its root (unfolding as the jet forms, a spring past flat and back)
    const fold = (1 - unfold) * J.folded;
    for (const sx of [-1, 1] as const) {
      this.m3.makeTranslation(sx * JET.hinge, 0, 0);
      this.m3.multiply(this.m.makeRotationZ(sx * fold));
      this.m3.multiply(this.m.makeTranslation(-sx * JET.hinge, 0, 0));
      this.m3.premultiply(this.m2);
      this.kinds[sx < 0 ? 'jetWingL' : 'jetWingR'].add(this.m3, this.paint.set(livery.trim.r, livery.trim.g, livery.trim.b, 1));
    }
    // two afterburners (blue-white, flickering), their nozzles glowing, a glow on the road under it
    for (const sx of [-1, 1]) {
      this.v.set(sx * JET.nozzle[0] * scale, JET.nozzle[1] * scale, JET.nozzle[2] * scale).applyQuaternion(q);
      const len = (1.25 + 0.3 * Math.sin(time * 37 + i * 3 + sx)) * scale;
      this.glow('flameBlue', px + this.v.x, py + this.v.y, pz + this.v.z, q, 0.17 * scale, 0.17 * scale, len, 1, 1, 1, 1);
      this.glow('glowOrb', px + this.v.x, py + this.v.y, pz + this.v.z, q, 0.32 * scale, 0.32 * scale, 0.32 * scale, 0.7, 1.5, 3, 0.7);
    }
    this.v.set(0, -J.hover + 0.08, 0).applyQuaternion(q);
    this.glow('disc', px + this.v.x, py + this.v.y, pz + this.v.z, q, 1.5 * scale, 1, 1.9 * scale, 0.35, 0.9, 2.2, 0.55);
  }

  /** The Jump Jets under a kart in the air: `phase` 1 rising or hanging (flames down), 2 diving (flames up). */
  private jumpJets(s: KartState, phase: number, r: Vector3, h: number, pitch: number, time: number, i: number, track?: Track): void {
    const J = JUMP_JETS;
    const diving = phase === 2;
    const rise = clamp01(s.verticalVelocity / 14);
    const len = diving ? J.dive : J.hang + (J.rise - J.hang) * rise;
    for (const sx of [-1, 1]) {
      // diving, each pod turns over (its nozzle up, at the top of where it hung) to drive the kart down
      const p = this.local(r, h, pitch, sx * J.at[0], J.at[1] + (diving ? POD_HEIGHT : 0), J.at[2]);
      const px = p.x, py = p.y, pz = p.z;
      const q = this.yaw(h);
      this.turn(q, 0, -pitch);
      // the pod's strut toward the kart (it is modelled toward +x)
      if (sx > 0) this.turn(q, 1, Math.PI);
      if (diving) this.turn(q, 0, Math.PI);
      this.put('thruster', px, py, pz, q);
      // the flame out of the nozzle (the flame model's −z turned to the pod's −y): down, or up as it dives
      this.q2.copy(q);
      this.turn(this.q2, 0, -Math.PI / 2);
      const fl = len * (0.88 + 0.12 * Math.sin(time * 41 + i * 2 + sx));
      this.glow('flameHot', px, py, pz, this.q2, 0.12, 0.12, fl, 1, 1, 1, 1);
      this.glow('glowOrb', px, py, pz, q, 0.22, 0.22, 0.22, 3, 1.4, 0.4, 0.8);
    }
    // the blast's glow on the road under a rising kart
    if (!diving && track) {
      const g = track.sample(s.t, 0, s.branch);
      const ground = g.groundY + jumpLift(track, s.t, s.branch, 0, g.halfWidth);
      const k = clamp01(1 - (r.y - ground) / 4.5);
      if (k > 0) this.glow('disc', r.x, ground + 0.05, r.z, this.yaw(h), 1.6, 1, 1.6, 2.4, 1.1, 0.3, 0.55 * k);
    }
  }

  /** The Tractor Beam from the emitter on a kart's nose (at `r`, facing `h`) to the lock on the tail of the kart at `o` facing `oh`. */
  private tractor(r: Vector3, h: number, pitch: number, o: Vector3, oh: number, time: number): void {
    const e = this.local(r, h, pitch, 0, 0.72, 1.15);
    this.p0.copy(e);
    this.p1.set(o.x - Math.sin(oh) * 1.3, o.y + 0.6, o.z - Math.cos(oh) * 1.3);
    this.w.subVectors(this.p1, this.p0);
    const len = this.w.length();
    if (len < 1e-3) return;
    this.w.divideScalar(len);
    const q = this.q.setFromUnitVectors(this.fwd, this.w);
    this.put('beamEmitter', this.p0.x, this.p0.y, this.p0.z, q);
    const from = Math.min(0.25, len);
    const flick = 0.85 + 0.15 * Math.sin(time * 53);
    this.glow('beam', this.p0.x + this.w.x * from, this.p0.y + this.w.y * from, this.p0.z + this.w.z * from, q, 0.13, 0.13, len - from, 0.55, 2.3, 0.85, flick);
    this.glow('glowOrb', this.p0.x + this.w.x * 0.2, this.p0.y + this.w.y * 0.2, this.p0.z + this.w.z * 0.2, q, 0.24, 0.24, 0.24, 0.6, 2.6, 1, 0.8);
    // the lock: a spinning ring and a glow on the other kart's tail
    this.q2.copy(q);
    this.turn(this.q2, 2, time * 4);
    const ring = 0.5 + 0.06 * Math.sin(time * 9);
    this.glow('ring', this.p1.x, this.p1.y, this.p1.z, this.q2, ring, ring, ring, 0.6, 2.6, 1, 0.9);
    this.glow('glowOrb', this.p1.x, this.p1.y, this.p1.z, q, 0.42, 0.42, 0.42, 0.5, 2.2, 0.8, 0.55);
    // pulses running from the lock back to the emitter: the pull
    for (let k = 0; k < 3; k++) {
      const t = (time * 1.6 + k / 3) % 1;
      const x = this.p1.x - this.w.x * len * t, y = this.p1.y - this.w.y * len * t, z = this.p1.z - this.w.z * len * t;
      this.glow('glowOrb', x, y, z, q, 0.17, 0.17, 0.17, 1, 3, 1.2, Math.sin(Math.PI * t));
    }
  }

  /** Karts left as a jet when a race ends are shown again. */
  reset(kartRoots: readonly Object3D[]): void {
    for (const r of kartRoots) r.visible = true;
  }
}
