// The racer standing alone, for the Racer screen only (Adam, 28 Sept 2026, on "Pick your racer": "This part
// should just show the characters, not the karts"). As Mario Kart World's character select (stills:
// youtube.com/watch?v=_9JZhslBy3E, 3:00 to 3:24): each character alone, full body, never still (Mario bounces
// on his toes, fists up, turning a little toward you and away), and when picked a flourish before the vehicle
// screen comes (he crouches and jumps, a fist in the air). Ours: the rigged driver (rigged.ts: a 24-bone
// humanoid fitted in A-pose, seated in a race by IK) stood up: its bones back at the A-pose, the Hips over the
// floor, the feet planted by two-bone IK where the A-pose has them (the knees a touch soft, never locked), the
// arms lowered from the A toward the sides by IK (elbows a little bent). Each frame an idle goes on top in the
// racer's own temper (cast personalities: Pip never stops moving, Momo is deadpan, Boulder a gentle giant):
// breathing, a bounce in the knees, the weight shifting from foot to foot, the head looking at you and
// glancing about; and a flourish of its own (flourish()): Pip hops, a wing up high, Momo points at you, Nova
// twirls, Juniper salutes, Otto waves, Sprocket cheers, Boulder bows, Big Gus laughs, hands on his belly.
// Everything G-rated. Every pose is turns about the figure's own axes and IK targets in its own frame, so it
// holds whatever the stand's turn. Render only: nothing here reaches a race.
import { Group, Matrix4, Quaternion, SkinnedMesh, Vector3, type Material, type Object3D } from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { turnAbout, twoBoneIk, type RiggedTemplate } from './rigged.ts';

/** A racer's flourish: when it comes on show, and when it is picked. */
export type Flourish = 'hop' | 'point' | 'twirl' | 'salute' | 'wave' | 'cheer' | 'bow' | 'laugh';

/**
 * A racer's temper standing: its flourish; the bounce in its knees (Hz, m); the weight shifting side to side
 * (m, at half the bounce's rate); and how far its arms come down from the A-pose toward its sides (0..1: a
 * round belly or a wide stone chest keeps them further out).
 */
export interface StandTemper { move: Flourish; bounceHz: number; bounce: number; sway: number; armDrop: number }

/** Each racer's (ui-hud data/cast.ts personalities). */
export const STAND_TEMPERS: Readonly<Record<string, StandTemper>> = Object.freeze({
  // fast-talking, never stops moving
  pip: { move: 'hop', bounceHz: 1.6, bounce: 0.018, sway: 0.012, armDrop: 0.62 },
  // deadpan, competent
  momo: { move: 'point', bounceHz: 0.55, bounce: 0.005, sway: 0.008, armDrop: 0.72 },
  // dreamy, drawn to the lights
  nova: { move: 'twirl', bounceHz: 0.5, bounce: 0.01, sway: 0.016, armDrop: 0.55 },
  // cheerful rule-follower
  juniper: { move: 'salute', bounceHz: 1.1, bounce: 0.012, sway: 0.01, armDrop: 0.68 },
  // laid-back, waves at everyone
  otto: { move: 'wave', bounceHz: 0.75, bounce: 0.01, sway: 0.016, armDrop: 0.64 },
  // literal: a tin toy's tick
  sprocket: { move: 'cheer', bounceHz: 1.0, bounce: 0.01, sway: 0.006, armDrop: 0.6 },
  // gentle giant
  boulder: { move: 'bow', bounceHz: 0.45, bounce: 0.008, sway: 0.012, armDrop: 0.45 },
  // booming laugh
  gus: { move: 'laugh', bounceHz: 0.7, bounce: 0.012, sway: 0.014, armDrop: 0.4 },
});
const DEFAULT_TEMPER: StandTemper = { move: 'wave', bounceHz: 0.9, bounce: 0.01, sway: 0.012, armDrop: 0.6 };
export const temperOf = (racerId: string): StandTemper => STAND_TEMPERS[racerId] ?? DEFAULT_TEMPER;

/** Every other tuning number (angles in radians, lengths in meters, the figure's frame: +Y up, +Z its front, +X its own left). */
export const STAND = Object.freeze({
  /** how far the knees give from straight at rest (a person stands soft-kneed) */
  soften: 0.012,
  /** the chest rising and falling */
  breatheHz: 0.26,
  breathe: 0.022,
  /** the hips turning a little with the weight shift, per meter of it */
  swayYaw: 6,
  /** idle glances away from you: every so many seconds, this far either way, this long */
  glance: Object.freeze({ every: [3, 6] as const, yaw: [0.3, 0.5] as const, hold: 0.9 }),
  /** the most the head turns toward you (either way) and up or down */
  lookYaw: 0.75,
  lookPitch: 0.3,
  /** 1/s: how fast the head eases toward where it looks */
  lookRate: 7,
  /** how far a hand reaches of the arm's length at rest (the elbow a little bent) */
  armReach: 0.94,
  /** s: each flourish's length */
  seconds: Object.freeze({ hop: 1.0, point: 1.1, twirl: 1.3, salute: 1.25, wave: 1.35, cheer: 1.0, bow: 1.45, laugh: 1.35 } satisfies Record<Flourish, number>),
});

// ---------------------------------------------------------------- the flourishes, as beats
/**
 * Where a hand goes in a flourish: from `ref` (its shoulder, the head, or the hips), `out` away from the midline, `up`,
 * `fwd` (units: the arm's length; for the head, the head's height), with the elbow toward `pole` (out, up, fwd) and
 * weight `w`; `ref` 'eye': at the camera from the shoulder (a point at you), at `out` of the arm's length, turned `fwd`
 * radians out to its own side and `up` radians up (straight at the lens the arm hides behind its own hand).
 */
interface Reach { ref: 'shoulder' | 'head' | 'hips' | 'eye'; out: number; up: number; fwd: number; pole: readonly [number, number, number]; w: number }
/** One instant of a flourish: the whole figure lifted and turned, the hips crouched and shifted, the spine and head turned, the hands reaching; `eyes` how much the head still looks at you. */
export interface Beat {
  lift: number; turn: number;
  crouch: number; x: number;
  pitch: number; roll: number; twist: number;
  headYaw: number; headPitch: number; headRoll: number; eyes: number;
  armL: Reach | null; armR: Reach | null;
}
const still = (): Beat => ({ lift: 0, turn: 0, crouch: 0, x: 0, pitch: 0, roll: 0, twist: 0, headYaw: 0, headPitch: 0, headRoll: 0, eyes: 1, armL: null, armR: null });

const clamp = (x: number, lo: number, hi: number) => (x < lo ? lo : x > hi ? hi : x);
const sstep = (a: number, b: number, x: number) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
/** up from a to b, held, down from c to d (smooth) */
const env = (u: number, a: number, b: number, c: number, d: number) => sstep(a, b, u) * (1 - sstep(c, d, u));
/** a sine arch from a to b, 0 outside */
const hump = (u: number, a: number, b: number) => (u <= a || u >= b ? 0 : Math.sin((Math.PI * (u - a)) / (b - a)));
const TAU = Math.PI * 2;

/** The flourish `move` at phase `u` (0..1 of its STAND.seconds); `legs` the leg's length (m), for crouches. Pure. */
export function beat(move: Flourish, u: number, legs: number): Beat {
  const b = still();
  const reach = (ref: Reach['ref'], out: number, up: number, fwd: number, pole: Reach['pole'], w: number): Reach => ({ ref, out, up, fwd, pole, w });
  const s = STAND.seconds[move];
  switch (move) {
    case 'hop': { // crouch, jump with a wing up high and the other out, land soft (MKW's own pick: Mario's jump)
      b.crouch = legs * (0.1 * env(u, 0, 0.2, 0.2, 0.32) + 0.05 * env(u, 0.62, 0.7, 0.7, 0.86));
      b.lift = 0.16 * hump(u, 0.28, 0.66);
      b.pitch = 0.14 * env(u, 0, 0.2, 0.2, 0.3) - 0.08 * hump(u, 0.28, 0.66);
      b.headPitch = -0.16 * hump(u, 0.25, 0.7);
      const w = env(u, 0.12, 0.3, 0.62, 0.9);
      b.armR = reach('shoulder', 0.25, 0.9, 0.3, [1, 0, -0.6], w);
      b.armL = reach('shoulder', 0.8, 0.22, 0.15, [0.4, -1, -0.4], w);
      break;
    }
    case 'point': { // deadpan: a finger at you, a small nod
      const w = env(u, 0.1, 0.3, 0.72, 0.94);
      b.armR = reach('eye', 0.97, 0.1, 0.5, [1, -0.4, -0.2], w);
      b.twist = -0.18 * w;
      b.pitch = 0.04 * w;
      b.headPitch = 0.14 * hump(u, 0.34, 0.56);
      break;
    }
    case 'twirl': { // dreamy: a turn on the spot, arms out, floating up a little
      b.turn = TAU * sstep(0.12, 0.86, u);
      b.lift = 0.04 * hump(u, 0.08, 0.92);
      const w = env(u, 0.04, 0.2, 0.76, 0.96);
      b.armL = reach('shoulder', 0.86, 0.22, 0.06, [0, -1, -0.3], w);
      b.armR = reach('shoulder', 0.86, 0.22, 0.06, [0, -1, -0.3], w);
      b.headRoll = 0.12 * w;
      b.eyes = 1 - 0.6 * w;
      break;
    }
    case 'salute': { // a crisp salute at the brow, chin up, a little heel click
      const w = env(u, 0.1, 0.3, 0.72, 0.9);
      b.armR = reach('head', 0.42, 0.42, 0.4, [1, 0.1, 0.15], w);
      b.pitch = -0.05 * w;
      b.headPitch = -0.08 * w;
      b.lift = 0.02 * hump(u, 0.28, 0.42);
      break;
    }
    case 'wave': { // a big friendly wave, the head tilted into it
      const w = env(u, 0.08, 0.25, 0.8, 0.96);
      b.armR = reach('shoulder', 0.5 + 0.2 * Math.sin(TAU * 2.6 * u * s), 0.75, 0.16, [1, -0.5, -0.4], w);
      b.headRoll = -0.12 * w;
      b.x = 0.012 * w;
      break;
    }
    case 'cheer': { // a tin toy's cheer: both arms up in a V, two little hops
      const w = env(u, 0.08, 0.24, 0.66, 0.9);
      b.armL = reach('shoulder', 0.45, 0.88, 0.1, [1, 0, -0.5], w);
      b.armR = reach('shoulder', 0.45, 0.88, 0.1, [1, 0, -0.5], w);
      b.lift = 0.05 * hump(u, 0.26, 0.5) + 0.03 * hump(u, 0.52, 0.72);
      b.headPitch = -0.1 * w;
      break;
    }
    case 'bow': { // a gentle giant's bow: a hand on the chest, the other behind, head down
      const w = env(u, 0.05, 0.28, 0.72, 0.94);
      const down = env(u, 0.12, 0.4, 0.62, 0.9);
      b.pitch = 0.5 * down;
      b.crouch = 0.02 * down;
      b.armR = reach('shoulder', -0.42, -0.22, 0.52, [1, -1, -0.5], w);
      b.armL = reach('shoulder', 0.12, -0.86, -0.32, [1, 0, -1], w);
      b.headPitch = 0.24 * down;
      b.eyes = 1 - 0.8 * down;
      break;
    }
    case 'laugh': { // a booming laugh: hands on the belly, head back, shaking with it
      const w = env(u, 0.06, 0.22, 0.78, 0.96);
      const shake = Math.sin(TAU * 4.5 * u * s) * env(u, 0.2, 0.3, 0.72, 0.82);
      b.armL = reach('hips', 0.1, 0.36, 0.62, [1, -1, -0.4], w);
      b.armR = reach('hips', 0.1, 0.36, 0.62, [1, -1, -0.4], w);
      b.pitch = -0.1 * w + 0.05 * shake;
      b.headPitch = -0.28 * w;
      b.crouch = 0.012 * Math.abs(shake);
      b.eyes = 1 - 0.7 * w;
      break;
    }
  }
  return b;
}

// ---------------------------------------------------------------- the standing figure
const SPINE = ['Spine02', 'Spine01', 'Spine'] as const;
const ARMS = [['LeftArm', 'LeftForeArm', 'LeftHand', 1], ['RightArm', 'RightForeArm', 'RightHand', -1]] as const;
const LEGS = [['LeftUpLeg', 'LeftLeg', 'LeftFoot', 1], ['RightUpLeg', 'RightLeg', 'RightFoot', -1]] as const;
const X = new Vector3(1, 0, 0), Y = new Vector3(0, 1, 0), Z = new Vector3(0, 0, 1);

/** A cheap repeatable number in [0, 1) from an integer (the glances). */
const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/**
 * A rigged racer standing alone on its own copy of the bones: `root`, feet on the floor (y 0) about the origin,
 * facing +Z. Each update() poses it for that instant: the idle, the head toward `eye`, and a flourish while one
 * plays. Built from a template's driver (rigged.ts RiggedTemplate.driverOnly), in `material` (its paint) or the
 * template's own.
 */
export class StandingRacer {
  readonly root: Group;
  readonly racerId: string;
  readonly temper: StandTemper;
  /** the leg's length (m), the floor-to-hips height standing, and the soles' drop under each ankle */
  readonly legs: number;
  readonly hipsHeight: number;
  private readonly bone = new Map<string, Object3D>();
  private readonly rest: ReadonlyMap<string, { p: Vector3; q: Quaternion }>;
  /** in the figure's frame: each foot's place (the ankle) under the standing hips, and its turn */
  private readonly feet: { at: Vector3; q: Quaternion }[] = [];
  /** in the figure's frame: each arm's direction at rest (the A), and its length */
  private readonly armDir: Vector3[] = [];
  private readonly armLen: number[] = [];
  /** the head's height (Head to head_end), for reaches from the head */
  private readonly headSize: number;
  private t = 0;
  private flourishAt = -1;
  private look = { yaw: 0, pitch: 0 };
  private glanceN = 0;
  private glanceAt = 2;

  constructor(t: RiggedTemplate, material?: Material) {
    this.racerId = t.racerId;
    this.temper = temperOf(t.racerId);
    this.rest = t.rest;
    this.root = cloneSkinned(t.driverOnly) as Group;
    this.root.name = `standing-${t.racerId}`;
    this.root.traverse((o) => {
      if ((o as SkinnedMesh).isSkinnedMesh) {
        const m = o as SkinnedMesh;
        if (material) m.material = material;
        // it moves about: a sphere round a standing figure and its reach, fixed
        m.frustumCulled = false;
      }
      if (o.name) this.bone.set(o.name, o);
    });
    // --- measured once, at the A-pose (the bind: the geometry's own positions are that pose, in the kart's frame)
    this.toRest();
    const w = (n: string) => new Vector3().setFromMatrixPosition(this.bone.get(n)?.matrixWorld ?? new Matrix4());
    const mesh = this.root.getObjectByName('rigged') as SkinnedMesh | undefined;
    const pos = mesh?.geometry.getAttribute('position');
    let minY = Infinity;
    if (pos) for (let i = 0; i < pos.count; i++) minY = Math.min(minY, pos.getY(i));
    const hips = w('Hips');
    if (!Number.isFinite(minY)) minY = hips.y - 0.6;
    const legLen: number[] = [];
    for (const [up, knee, foot] of LEGS) {
      const a = w(up), k = w(knee), f = w(foot);
      legLen.push(a.distanceTo(k) + k.distanceTo(f));
      const q = new Quaternion();
      this.bone.get(foot)?.getWorldQuaternion(q);
      // the ankle where the A-pose has it under the hips, its sole on the floor
      this.feet.push({ at: new Vector3(f.x - hips.x, f.y - minY, f.z - hips.z), q });
    }
    this.legs = legLen.length ? (legLen[0] + (legLen[1] ?? legLen[0])) / 2 : 0.5;
    this.hipsHeight = hips.y - minY - STAND.soften;
    for (const [a, f, h] of ARMS) {
      const s = w(a), e = w(f), wr = w(h);
      this.armLen.push(s.distanceTo(e) + e.distanceTo(wr));
      this.armDir.push(wr.clone().sub(s).normalize());
    }
    this.headSize = Math.max(0.05, w('Head').distanceTo(w('head_end')));
    this.update(0, null, true);
  }

  /** A flourish now (the racer just came on show, or was picked); another starts it again. */
  flourish(): void { this.flourishAt = this.t; }

  /** Whether a flourish is playing. */
  get flourishing(): boolean { return this.flourishAt >= 0 && this.t - this.flourishAt < STAND.seconds[this.temper.move]; }

  /** The bones back at the A-pose (the template's rest: local place and turn by name); the kart's bones at identity. */
  private toRest(): void {
    for (const [name, r] of this.rest) { const b = this.bone.get(name); if (b) { b.position.copy(r.p); b.quaternion.copy(r.q); } }
    for (const name of ['kart', 'body']) { const b = this.bone.get(name); if (b) { b.position.set(0, 0, 0); b.quaternion.identity(); } }
    this.root.updateMatrixWorld(true);
  }

  /**
   * Pose it for this instant, `dt` seconds on: the idle in its temper, the head toward `eye` (a world point:
   * the camera; null, straight ahead) and a flourish while one plays. With `reduced` (reduced motion) it stands
   * still, looking at you: no bounce, sway, glance or flourish. `at` (s): pose it at this moment of a flourish
   * instead (the tile pictures), with no idle.
   */
  update(dt: number, eye: Vector3 | null, reduced: boolean, at?: number): void {
    this.t += dt;
    const T = this.temper, t = this.t;
    const live = !reduced && at === undefined;
    // --- the flourish (blended by its own envelopes) or none
    const len = STAND.seconds[T.move];
    const u = at !== undefined ? at : this.flourishAt >= 0 && !reduced ? (t - this.flourishAt) / len : -1;
    const f = u >= 0 && u < 1 ? beat(T.move, u, this.legs) : still();
    if (u >= 1) this.flourishAt = -1;
    // --- the idle
    const bounce = live ? T.bounce * (0.5 - 0.5 * Math.cos(TAU * T.bounceHz * t)) : 0;
    const sway = live ? T.sway * Math.sin(Math.PI * T.bounceHz * t) : 0;
    const breathe = live ? STAND.breathe * Math.sin(TAU * STAND.breatheHz * t) : 0;

    this.toRest();
    // the whole figure: lifted (a hop leaves the floor) and turned (a twirl)
    this.root.position.set(0, f.lift, 0);
    this.root.rotation.set(0, f.turn, 0);
    this.root.updateMatrixWorld(true);
    const q0 = this.root.getWorldQuaternion(new Quaternion());
    const ax = (v: Vector3, q: Quaternion) => v.clone().applyQuaternion(q);
    // the hips: over the floor, the knees giving with the bounce and a crouch, the weight shifting and the hips turning with it
    const hips = this.bone.get('Hips');
    if (hips) {
      hips.position.set(sway + f.x, this.hipsHeight - bounce - f.crouch, 0);
      this.root.updateMatrixWorld(true);
      turnAbout(hips, ax(Y, q0), sway * STAND.swayYaw);
    }
    const qBody = q0.clone().multiply(new Quaternion().setFromAxisAngle(Y, sway * STAND.swayYaw));
    // the spine: breathing, a flourish's lean, roll and twist; the upper body tilting back over the weight shift
    const pitch = breathe * 0.5 + f.pitch, roll = sway * 2.2 + f.roll, twist = f.twist;
    for (const n of SPINE) {
      const b = this.bone.get(n);
      if (!b) continue;
      turnAbout(b, ax(X, qBody), pitch / 3);
      turnAbout(b, ax(Z, qBody), roll / 3);
      turnAbout(b, ax(Y, qBody), twist / 3);
    }
    const qChest = qBody.clone()
      .multiply(new Quaternion().setFromAxisAngle(Y, twist))
      .multiply(new Quaternion().setFromAxisAngle(X, pitch))
      .multiply(new Quaternion().setFromAxisAngle(Z, roll));
    // the legs: each ankle planted where it stands (lifting a little with a hop, so the knees stay bent), knees forward and a touch out, the sole flat
    const rootM = this.root.matrixWorld;
    for (let i = 0; i < LEGS.length; i++) {
      const [up, knee, foot, side] = LEGS[i];
      const a = this.bone.get(up), k = this.bone.get(knee), fb = this.bone.get(foot), ft = this.feet[i];
      if (!a || !k || !fb || !ft) continue;
      const target = ft.at.clone().setY(ft.at.y - f.lift * 0.3).applyMatrix4(rootM);
      twoBoneIk(a, k, fb, target, ax(new Vector3(0.25 * side, 0, 1), q0));
      const pw = fb.parent!.getWorldQuaternion(new Quaternion());
      fb.quaternion.copy(pw.invert().multiply(q0.clone().multiply(ft.q)));
      fb.updateMatrixWorld(true);
    }
    // the head: toward you (eased), glancing away now and then, and a flourish's own turn
    const head = this.bone.get('Head'), neck = this.bone.get('neck');
    if (head && neck) {
      let yaw = 0, down = 0;
      if (eye) {
        const d = eye.clone().sub(new Vector3().setFromMatrixPosition(head.matrixWorld)).applyQuaternion(qChest.clone().invert());
        yaw = clamp(Math.atan2(d.x, d.z), -STAND.lookYaw, STAND.lookYaw);
        down = clamp(Math.atan2(-d.y, Math.hypot(d.x, d.z)), -STAND.lookPitch, STAND.lookPitch);
      }
      if (live && t >= this.glanceAt) {
        const g = STAND.glance, n = this.glanceN;
        const away = t - this.glanceAt;
        if (away < g.hold) yaw += (hash(n) < 0.5 ? -1 : 1) * (g.yaw[0] + (g.yaw[1] - g.yaw[0]) * hash(n + 7));
        else { this.glanceN++; this.glanceAt = t + g.every[0] + (g.every[1] - g.every[0]) * hash(n + 13); }
      }
      const wantYaw = yaw * f.eyes + f.headYaw, wantPitch = down * f.eyes + f.headPitch;
      const e = at !== undefined || !live ? 1 : 1 - Math.exp(-STAND.lookRate * dt);
      this.look.yaw += (wantYaw - this.look.yaw) * e;
      this.look.pitch += (wantPitch - this.look.pitch) * e;
      turnAbout(neck, ax(Y, qChest), this.look.yaw * 0.4);
      turnAbout(head, ax(Y, qChest), this.look.yaw * 0.6);
      const qHead = qChest.clone().multiply(new Quaternion().setFromAxisAngle(Y, this.look.yaw));
      turnAbout(neck, ax(X, qHead), this.look.pitch * 0.4);
      turnAbout(head, ax(X, qHead), this.look.pitch * 0.6);
      if (f.headRoll) turnAbout(head, ax(Z, qHead), f.headRoll);
    }
    // the arms: down toward the sides from the A (a bent elbow, swinging a little with the bounce), or a flourish's reach
    const headAt = head ? new Vector3().setFromMatrixPosition(head.matrixWorld) : null;
    const hipsAt = hips ? new Vector3().setFromMatrixPosition(hips.matrixWorld) : null;
    for (let i = 0; i < ARMS.length; i++) {
      const [sh, el, wr, side] = ARMS[i];
      const a = this.bone.get(sh), e = this.bone.get(el), h = this.bone.get(wr);
      if (!a || !e || !h) continue;
      const S = new Vector3().setFromMatrixPosition(a.matrixWorld), L = this.armLen[i];
      const rest = this.armDir[i];
      const down = new Vector3(0.18 * side, -1, 0.12).normalize();
      const idleDir = rest.clone().lerp(down, T.armDrop).normalize()
        .applyAxisAngle(X, live ? 0.05 * Math.sin(TAU * T.bounceHz * t + i) : 0)
        .applyQuaternion(qChest);
      let target = S.clone().addScaledVector(idleDir, L * STAND.armReach);
      let pole = ax(new Vector3(0.45 * side, -0.25, -1), qChest);
      const r = i === 0 ? f.armL : f.armR;
      if (r && r.w > 0) {
        const from = r.ref === 'head' && headAt ? headAt : r.ref === 'hips' && hipsAt ? hipsAt : S;
        const unit = r.ref === 'head' ? this.headSize : L;
        let at2: Vector3;
        if (r.ref === 'eye') {
          const to = (eye ? eye.clone().sub(S) : ax(Z.clone(), qChest)).normalize();
          to.applyAxisAngle(ax(Y, qChest), side * r.fwd);
          to.y += r.up;
          at2 = S.clone().addScaledVector(to.normalize(), L * r.out);
        } else at2 = from.clone().add(ax(new Vector3(r.out * side * unit, r.up * unit, r.fwd * unit), qChest));
        target = target.lerp(at2, r.w);
        pole = pole.lerp(ax(new Vector3(r.pole[0] * side, r.pole[1], r.pole[2]), qChest), r.w);
      }
      twoBoneIk(a, e, h, target, pole);
    }
    this.root.updateMatrixWorld(true);
  }
}

/** A racer standing (StandingRacer) from its rigged template, in `material` (a paint) or its own. */
export function makeStanding(t: RiggedTemplate, material?: Material): StandingRacer { return new StandingRacer(t, material); }
