// Render side, pure maths (no Three.js): the rigged racer's own animation (Adam, 25 Sept 2026: "the
// wheels don't even spin", "they don't turn their heads like on Mario Kart World"). A racer built from
// parts (art-pipeline rigged.ts: a skinned driver, a kart body, four wheels) has bones for the wheels,
// the steering wheel, the spine, the neck and head and both arms; this drives them from what the view
// already knows: the kart's springs (anim.ts: lean, look, nod, steer, heave, roll, pitch) and the kart
// state (speed, drift, boost, air, hits, tricks, items, the finish). The wheels roll at speed over
// their radius; the head looks into the turn and the drift, glances at a rival close beside or just
// behind, looks back when the player does, turns to the camera on the grid in the countdown, over the
// line and on the podium, and glances about now and then; the spine leans forward on the gas, back on
// a boost; the arms hold the wheel (two-bone IK, art-pipeline) or leave it for a gesture: a throw, both
// arms up on a hit or a trick, fist pumps, waves and a shrug for the finish. Stepped on the sim's tick
// like anim.ts and interpolated per frame, so it slows with the finish slow-motion and freezes with the
// hit-stop. It reads the kart state, its input and the others' positions and writes none of them
// (game/viewSim.test.ts). Every tuning number is in DRIVER_ANIM. No allocation after construction.
import { stepSpring, type AnimPose, type KartAnim, type Reaction, type SpringTune } from './anim.ts';
import type { InputState, KartState, TrackQuery, Vec3 } from './types.ts';

/**
 * Every tuning number of the rigged driver, in one place (render only). Angles in radians; the kart's
 * frame: +Z forward, +Y up, +X the sim's right (the driver's own left, screen-left seen from behind).
 */
export const DRIVER_ANIM = Object.freeze({
  // --- wheels
  /** rad/s: the drawn roll never passes this (at 60 fps a faster wheel strobes and seems to turn backward) */
  spinMax: 28,
  /** the share of each corner's lift (the chassis's roll and pitch) the springs take back: the wheel drops toward the road */
  bobShare: 0.45,
  /** m: the most a wheel drops or rises on its spring */
  bobMax: 0.06,
  /** rad the steering wheel turns at full lock (the road wheels' anim steerAngle is 0.38) */
  wheelTurn: 1.3,

  // --- suspension: each wheel follows the road under its own hub, on top of the shared bob above
  // (Adam, 25 Sept 2026, "will the wheels have shocks?"; research: Digital Foundry's Mario Kart World
  // tech review, "karts bounce, squash and stretch as they make turns, jump, and grind rails"; the
  // per-wheel raycast + spring-damper + clamped travel used by racer.nl's suspension tutorial and
  // widely in arcade car controllers, e.g. a GameDev.net vehicle-physics thread's "wheels are just
  // ray-casts and a whole bunch of springs", kept deliberately apart from the collision shape ("it
  // often feels more natural to just let the springs resolve the situation"); a visual-only raycast
  // driving just the wheel mesh's own offset, no physics, is the same idea a Reddit r/Unity3D post
  // used for a car with "no physics use"). docs/sops/kart-controller.md Decisions has the sources)
  /** Hz, zeta: the critically damped spring (zeta 1, no overshoot) each wheel's own travel eases through */
  suspSpring: [7, 1] as SpringTune,
  /** m: the most a wheel's own ground-follow travel adds beyond the shared bob (a curb, a bump, a ramp lip); past it the spring is bottomed out, like a real shock's bump stop */
  suspMax: 0.045,
  /** the share of the four wheels' own travel (left − right for roll, front − rear for pitch) the body bone tilts toward */
  suspBodyShare: 0.5,
  /** rad: the most that extra body tilt ever adds, small enough it never lifts the driver or a wheel into the body */
  suspBodyMax: 0.045,
  /** Hz, zeta: slower than suspSpring, so the body's own tilt visibly settles a moment after the wheel that set it does */
  suspBodySpring: [3.5, 1] as SpringTune,

  // --- head: yaw on top of the kart animation's look (anim.ts), split over the neck and the head
  headSpring: [2.4, 0.82] as SpringTune,
  pitchSpring: [2.6, 0.8] as SpringTune,
  /** rad: the most the neck and head turn together; past it the spine twists (twistMax) */
  headMax: 1.25,
  /** rad/s: the fastest the head and the spine's twist ever turn (a big new look eases in, never whips round) */
  headSpeed: 6,
  twistSpeed: 3,
  /** rad: up and down */
  pitchMax: 0.5,
  /** m: the eyes above the kart's origin, and ahead of it, to aim from */
  eye: [0, 1.05, -0.05] as const,
  /** a rival to glance at: beside within `side` m across and `beside` m along, or just behind within `behind` m and `side` / 2 across */
  rival: Object.freeze({ side: 8, beside: 3, behind: 8, hold: 1.15, cooldown: [3, 6] as const }),
  /** idle glances while nothing else holds the eyes: every so many seconds, this far either way, this long */
  glance: Object.freeze({ every: [3.5, 7.5] as const, yaw: [0.3, 0.6] as const, hold: 0.8 }),
  /** rad: a look back (the player's look-back button): over the shoulder, the spine helping */
  lookBack: 1.75,
  /** m: the camera is looked at within this range on the grid (a far one is not noticed) */
  eyeRange: 22,

  // --- spine: lean (anim.ts), and its own pitch and twist
  spineSpring: [2.2, 0.7] as SpringTune,
  twistSpring: [2.4, 0.75] as SpringTune,
  /** rad forward at full throttle; back on a boost (for a +30 % boost, more for a stronger one) */
  throttleLean: 0.1,
  boostLean: 0.16,
  /** rad/s forward per m/s of landing speed: the body folds over the wheel and back */
  landFold: 0.25,
  twistMax: 0.5,
  /** rad the head tilts with the lean (a share of it) */
  headTilt: 0.35,

  // --- arms: 1 hands on the wheel (IK), 0 a gesture; the blend eases at this rate (1/s)
  armRate: 12,
  /** a hit: both arms up, flailing at this rate (Hz) and this much; the head wobbles */
  flailHz: 4.5,
  flail: 0.45,
  wobbleHz: 3.2,
  wobble: 0.3,
  /** seconds after the spin ends before the hands are back on the wheel */
  recover: 0.35,
  /** a trick: arms up and the body twists this much, over this long */
  trickTwist: 0.55,
  trickSeconds: 0.7,
  /** an item used: a throw forward, a toss back or a raise, this long */
  throwSeconds: 0.72,
  /** shoulders up this much (rad) at a full shrug */
  shrug: 0.32,

  /** reduced motion: every move this much, no flailing */
  reducedScale: 0.35,
});

export type DriverAnimTuning = typeof DRIVER_ANIM;

/** An arm's aim this instant: `wheel` 1 holds the wheel (IK), 0 aims the bones along `upper` and `fore` (unit, the torso's frame; the right arm's, mirrored in x for the left). */
export interface ArmPose { wheel: number; upper: Vec3; fore: Vec3 }

/** The rigged driver's pose at one instant (angles in radians, the kart's frame; see DRIVER_ANIM). */
export interface DriverPose {
  /** the wheels' roll angle, all four (+ rolls them forward) */
  spin: number;
  /** on top of the kart animation's look and nod: + turns the head toward +X, + nods it forward */
  headYaw: number;
  headPitch: number;
  /** + tilts the head's top toward +X */
  headRoll: number;
  /** + leans the upper body forward; + turns the chest toward +X */
  spinePitch: number;
  spineTwist: number;
  /** 0..1: shoulders up */
  shrug: number;
  armL: ArmPose;
  armR: ArmPose;
}

const arm = (): ArmPose => ({ wheel: 1, upper: [0, -1, 0], fore: [0, 0, 1] });
export function newDriverPose(): DriverPose {
  return { spin: 0, headYaw: 0, headPitch: 0, headRoll: 0, spinePitch: 0, spineTwist: 0, shrug: 0, armL: arm(), armR: arm() };
}

/** Where the rigged driver looks from outside the kart this tick (game/session.ts, podium.ts, showroom.ts). */
export interface DriverContext {
  /** the camera's world position (null: none known) */
  eye: Readonly<Vec3> | null;
  /** turn to the camera now: the grid's countdown, the podium, the racer screen (a finish reaction always does) */
  faceEye: boolean;
  /** the karts in the race (rivals to glance at) and this kart's index in them (null: alone) */
  karts: readonly Readonly<KartState>[] | null;
  self: number;
}
export const NO_CONTEXT: Readonly<DriverContext> = Object.freeze({ eye: null, faceEye: false, karts: null, self: -1 });

const clamp = (x: number, lo: number, hi: number) => (x < lo ? lo : x > hi ? hi : x);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const TAU = Math.PI * 2;
const sstep = (a: number, b: number, x: number): number => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
const hump = (x: number, a: number, b: number): number => (x <= a || x >= b ? 0 : Math.sin((Math.PI * (x - a)) / (b - a)));

/** A point's bearing from a kart's eyes (bearing()). */
export interface Bearing { yaw: number; pitch: number; dist: number }

/**
 * The bearing of the point (x, y, z) from a kart, in its own frame, into `out`: `yaw` (+ toward +X,
 * the sim's right), `pitch` (+ below the eyes) and `dist` (m, level). `eye` is the eyes' place in the
 * kart's frame. Pure; allocates nothing.
 */
export function bearing(k: Readonly<KartState>, x: number, y: number, z: number, out: Bearing, eye: readonly number[] = DRIVER_ANIM.eye): Bearing {
  const h = k.heading, s = Math.sin(h), c = Math.cos(h);
  // the eyes in the world
  const ex = k.position[0] + s * eye[2] + c * eye[0], ez = k.position[2] + c * eye[2] - s * eye[0], ey = k.position[1] + eye[1];
  const dx = x - ex, dz = z - ez, dy = y - ey;
  // into the kart's frame: +X is rightOf(heading) = (cos h, 0, -sin h), +Z is (sin h, 0, cos h)
  const lx = dx * c - dz * s, lz = dx * s + dz * c;
  out.dist = Math.hypot(lx, lz);
  out.yaw = Math.atan2(lx, lz);
  out.pitch = Math.atan2(-dy, Math.max(1e-3, out.dist));
  return out;
}

/**
 * The rival worth a glance: the nearest other kart close beside this one (within `side` m across and
 * `beside` m along) or just behind it (within `behind` m and half of `side` across), at about the same
 * height; -1 for none. Ghosts are never looked at. Pure.
 */
export function rivalToWatch(karts: readonly Readonly<KartState>[], self: number, t = DRIVER_ANIM.rival): number {
  const me = karts[self];
  if (!me) return -1;
  const h = me.heading, s = Math.sin(h), c = Math.cos(h);
  let best = -1, bestD = Infinity;
  for (let j = 0; j < karts.length; j++) {
    const o = karts[j];
    if (j === self || o.isGhost) continue;
    const dx = o.position[0] - me.position[0], dz = o.position[2] - me.position[2];
    if (Math.abs(o.position[1] - me.position[1]) > 2.5) continue;
    const lx = dx * c - dz * s, lz = dx * s + dz * c;
    const beside = Math.abs(lz) <= t.beside && Math.abs(lx) <= t.side;
    const behind = lz < 0 && lz >= -t.behind && Math.abs(lx) <= t.side / 2;
    if (!beside && !behind) continue;
    const d = lx * lx + lz * lz;
    if (d < 0.25) continue; // on top of each other (a bump): nothing to look at
    if (d < bestD) { bestD = d; best = j; }
  }
  return best;
}

/** A cheap repeatable number in [0, 1) from two integers (idle glances; render only, never the sim). */
export function hash01(a: number, b: number): number {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ---------------------------------------------------------------- gestures (the right arm's aim; the left mirrors x)
/** A few aims in the torso's frame (+Z forward, +Y up, −X out to the right arm's side). */
const AIM = Object.freeze({
  up: [-0.35, 0.93, 0.12] as const, upFore: [-0.12, 1, 0.08] as const,
  pumpLow: [-0.75, -0.3, 0.6] as const, pumpLowFore: [-0.05, 0.85, 0.5] as const,
  pumpHigh: [-0.35, 0.8, 0.45] as const, pumpHighFore: [-0.1, 1, 0.12] as const,
  wave: [-0.8, 0.52, 0.28] as const,
  windup: [-0.45, 0.62, -0.62] as const, windupFore: [-0.12, 0.8, -0.58] as const,
  release: [-0.28, 0.25, 0.93] as const, releaseFore: [-0.08, -0.05, 1] as const,
  tossFront: [-0.42, 0.35, 0.84] as const, tossFrontFore: [-0.05, 0.62, 0.78] as const,
  tossBack: [-0.42, 0.62, -0.66] as const, tossBackFore: [-0.12, 0.3, -0.95] as const,
  shrug: [-0.35, -0.9, 0.22] as const, shrugFore: [-0.72, 0.28, 0.62] as const,
  brow: [-0.62, 0.52, 0.58] as const, browFore: [0.62, 0.55, 0.28] as const,
});
type Dir = readonly [number, number, number];

/** out = the unit direction between a and b at k (normalized lerp: the aims are never opposite). */
function mix(out: Vec3, a: Dir, b: Dir, k: number): Vec3 {
  const x = lerp(a[0], b[0], k), y = lerp(a[1], b[1], k), z = lerp(a[2], b[2], k);
  const l = Math.hypot(x, y, z) || 1;
  out[0] = x / l; out[1] = y / l; out[2] = z / l;
  return out;
}
function set(out: Vec3, a: Dir): Vec3 { return mix(out, a, a, 0); }

/** An item's gesture from its role (items/data.ts roles): a throw forward, a toss back, or held up. */
export type ItemGesture = 'throw' | 'toss' | 'raise';
export function gestureFor(role: string | undefined, lookBack: boolean): ItemGesture {
  if (role === 'rearDrop' || role === 'deception') return 'toss';
  if (role === 'forward' || role === 'homing' || role === 'runner' || role === 'tether') return lookBack ? 'toss' : 'throw';
  return 'raise';
}

/**
 * The right arm's aim for an item gesture `t` s in (0..throwSeconds): a throw winds up behind the
 * head and lets fly forward; a toss swings from the front back over the shoulder; a raise holds it up.
 * Returns the arm's weight off the wheel (0..1). Pure.
 */
export function itemArm(kind: ItemGesture, t: number, out: ArmPose, T = DRIVER_ANIM.throwSeconds): number {
  const u = clamp(t / T, 0, 1);
  const off = sstep(0, 0.1, u) * (1 - sstep(0.8, 1, u));
  if (kind === 'throw') {
    // wind up behind the head (held a beat so it reads), then let fly
    const k = sstep(0.34, 0.58, u);
    mix(out.upper, AIM.windup, AIM.release, k); mix(out.fore, AIM.windupFore, AIM.releaseFore, k);
  } else if (kind === 'toss') {
    const k = sstep(0.25, 0.6, u);
    mix(out.upper, AIM.tossFront, AIM.tossBack, k); mix(out.fore, AIM.tossFrontFore, AIM.tossBackFore, k);
  } else {
    set(out.upper, AIM.pumpHigh); set(out.fore, AIM.pumpHighFore);
  }
  return off;
}

/** Hands on the wheel (the aims are only a fallback: the IK decides). */
function onWheel(a: ArmPose): void { a.wheel = 1; set(a.upper, AIM.pumpLow); set(a.fore, AIM.pumpLowFore); }
/** A fist pump at `hz`: the arm swings between low and high, the fist up. */
function pumpArm(a: ArmPose, t: number, phase: number, hz: number): void {
  const k = 0.5 + 0.5 * Math.sin(TAU * hz * t + phase);
  mix(a.upper, AIM.pumpLow, AIM.pumpHigh, k); mix(a.fore, AIM.pumpLowFore, AIM.pumpHighFore, k);
  a.wheel = 0;
}
/** Up high (a cheer, a hit, a trick). */
function upArm(a: ArmPose): void { set(a.upper, AIM.up); set(a.fore, AIM.upFore); a.wheel = 0; }
/** A wave at `hz`: the upper arm out and up, the forearm swinging side to side. */
function waveArm(a: ArmPose, t: number, hz: number): void {
  set(a.upper, AIM.wave);
  a.fore[0] = -0.3 + 0.55 * Math.sin(TAU * hz * t); a.fore[1] = 1; a.fore[2] = 0.25;
  normalize(a.fore);
  a.wheel = 0;
}

/**
 * The arms for a finish reaction `t` s in (anim.ts reactions: game/celebrate.ts picks them; the podium
 * plays them again), the right arm's aims for both (the caller mirrors the left): fist pumps then a
 * wave for the champion, both arms up then a big wave for 2nd, both fists up then a pump for 3rd, a
 * brow wipe and a fist pump for relief, palms up for the shrug, hands on the wheel for the deflated
 * (the head does the talking). After the main move (`main` s) the joyful ones keep waving. Pure.
 */
export function reactionArms(kind: Reaction, t: number, R: ArmPose, L: ArmPose, main: number): void {
  const tail = t > main;
  onWheel(R); onWheel(L);
  switch (kind) {
    case 'champion':
      if (t < 0.34) break;
      if (t < 1.1) { upArm(R); upArm(L); break; }
      if (!tail) { pumpArm(R, t, 0, 2.2); pumpArm(L, t, Math.PI, 2.2); break; }
      waveArm(R, t, 1.2);
      break;
    case 'cheer':
      if (t < 0.26) break;
      if (t < 0.9) { upArm(R); upArm(L); break; }
      waveArm(R, t, 1.5);
      break;
    case 'bounce':
      if (t < 1.05) { upArm(R); upArm(L); break; }
      if (!tail) { pumpArm(R, t, 0, 1.6); break; }
      waveArm(R, t, 1);
      break;
    case 'relief':
      if (t < 0.95) { set(R.upper, AIM.brow); set(R.fore, AIM.browFore); R.wheel = 0; break; }
      if (t < 1.7) pumpArm(R, t, -Math.PI / 2, 1.3);
      break;
    case 'shrug':
      if (t < 1.0) {
        set(R.upper, AIM.shrug); set(R.fore, AIM.shrugFore); R.wheel = 0;
        set(L.upper, AIM.shrug); set(L.fore, AIM.shrugFore); L.wheel = 0;
      }
      break;
    case 'deflated':
      break;
  }
}

/** Mirror a right-arm aim onto the left arm (x flips). */
function mirror(a: ArmPose): void { a.upper[0] = -a.upper[0]; a.fore[0] = -a.fore[0]; }

// ---------------------------------------------------------------- the animation
/**
 * One rigged driver's animation. Call tick() once per sim tick after the kart's KartAnim has ticked
 * (it reads the springs' look, the reaction playing and its clock), then pose() once per frame.
 */
export class DriverAnim {
  readonly prev = newDriverPose();
  readonly curr = newDriverPose();
  private readonly t: DriverAnimTuning;
  private readonly seed: number;
  /** the wheels' radius (m): their roll is speed over it */
  radius = 0.3;
  private readonly yaw = { x: 0, v: 0 };
  private readonly pitch = { x: 0, v: 0 };
  private readonly spine = { x: 0, v: 0 };
  private readonly twist = { x: 0, v: 0 };
  private clock = 0;
  private spinAngle = 0;
  private wasGrounded = true;
  private airVy = 0;
  private wasSpinning = false;
  private spinEnded = -10;
  private lastTrick = false;
  private trickAt = -10;
  /** the item gesture playing (null: none) and when it started */
  private gesture: ItemGesture | null = null;
  private gestureAt = -10;
  /** the rival being glanced at (-1: none), until when, and when the next glance may start */
  private rival = -1;
  private rivalUntil = 0;
  private rivalNext = 0;
  /** an idle glance: its yaw, until when, when the next one comes, and how many so far */
  private idleYaw = 0;
  private idleUntil = 0;
  private idleNext = 0;
  private glances = 0;
  /** which way a look over the shoulder goes (±1), kept while it lasts so it never flips */
  private backSide = 1;
  private readonly aimR = arm();
  private readonly aimL = arm();
  private readonly b: Bearing = { yaw: 0, pitch: 0, dist: 0 };

  constructor(seed = 0, tuning: DriverAnimTuning = DRIVER_ANIM) {
    this.t = tuning;
    this.seed = seed;
    this.idleNext = tuning.glance.every[0] + hash01(seed, 0) * (tuning.glance.every[1] - tuning.glance.every[0]);
  }

  /** An item was used this tick (game/session.ts from the items' events): the right arm throws, tosses or raises it. */
  itemUsed(kind: ItemGesture): void {
    this.gesture = kind;
    this.gestureAt = this.clock;
  }

  /**
   * One sim tick: `s` the kart after the step, `input` what it drove on, `anim` its KartAnim (ticked
   * already this tick), `ctx` what it can see. Reads all four, writes none.
   */
  tick(s: Readonly<KartState>, input: Readonly<InputState>, dt: number, anim: KartAnim, ctx: Readonly<DriverContext> = NO_CONTEXT): void {
    if (!(dt > 0)) return; // (anim.ts: a tick of no time moves nothing)
    const t = this.t, prev = this.prev, curr = this.curr;
    copyPose(prev, curr);
    this.clock += dt;
    const now = this.clock;

    // --- the wheels roll at speed over their radius (backward in reverse), never faster than spinMax
    this.spinAngle += clamp(s.speed / Math.max(0.05, this.radius), -t.spinMax, t.spinMax) * dt;
    if (this.spinAngle > 1e4 || this.spinAngle < -1e4) {
      // keep the angle small (the interpolation spans the same whole turns at both ends)
      const k = Math.round(this.spinAngle / TAU) * TAU;
      this.spinAngle -= k; prev.spin -= k;
    }
    curr.spin = this.spinAngle;

    const reaction = anim.reacting, rt = anim.reactionTime;
    const spinning = s.status.spinRemaining > 0;
    if (this.wasSpinning && !spinning) this.spinEnded = now;
    this.wasSpinning = spinning;
    const grounded = s.grounded;
    const trick = s.airborne.trickQueued;
    if (trick && !this.lastTrick) this.trickAt = now;
    this.lastTrick = trick;

    // --- where the eyes go: the camera, a look back, a rival, an idle glance, or ahead (the springs' look)
    let want = Number.NaN, wantPitch = 0;
    const faceEye = (ctx.faceEye || reaction !== null) && ctx.eye !== null;
    const b = this.b;
    if (faceEye) {
      const e = ctx.eye!;
      bearing(s, e[0], e[1], e[2], b);
      if (b.dist <= t.eyeRange || reaction !== null || ctx.karts === null) {
        want = this.overShoulder(b.yaw);
        wantPitch = clamp(b.pitch, -t.pitchMax, t.pitchMax);
      }
    }
    if (Number.isNaN(want) && input.lookBack && !reaction) {
      this.backSide = input.steer > 0.2 ? 1 : input.steer < -0.2 ? -1 : this.backSide;
      want = this.backSide * t.lookBack;
    }
    if (Number.isNaN(want) && !reaction && ctx.karts && ctx.self >= 0 && !spinning) {
      // a rival close beside or just behind: glance at it for a moment, then not again for a while
      if (this.rival >= 0 && (now > this.rivalUntil || rivalToWatch(ctx.karts, ctx.self) < 0)) this.rival = -1;
      if (this.rival < 0 && now >= this.rivalNext && s.drift.phase !== 'drifting') {
        const j = rivalToWatch(ctx.karts, ctx.self);
        if (j >= 0) {
          this.rival = j;
          this.rivalUntil = now + t.rival.hold;
          const c = t.rival.cooldown;
          this.rivalNext = this.rivalUntil + c[0] + hash01(this.seed, 100 + this.glances++) * (c[1] - c[0]);
        }
      }
      if (this.rival >= 0) {
        const o = ctx.karts[this.rival].position;
        bearing(s, o[0], o[1] + 1, o[2], b);
        want = this.overShoulder(b.yaw);
        wantPitch = clamp(b.pitch, -t.pitchMax, t.pitchMax) * 0.5;
      }
    }
    if (Number.isNaN(want) && !reaction && !spinning && grounded && Math.abs(input.steer) < 0.3 && s.drift.phase === 'idle') {
      // now and then a look about, either way
      if (now >= this.idleNext && now >= this.idleUntil) {
        const g = t.glance, n = this.glances++;
        const side = hash01(this.seed, n) < 0.5 ? -1 : 1;
        this.idleYaw = side * lerp(g.yaw[0], g.yaw[1], hash01(this.seed + 7, n));
        this.idleUntil = now + g.hold;
        this.idleNext = this.idleUntil + lerp(g.every[0], g.every[1], hash01(this.seed + 13, n));
      }
      if (now < this.idleUntil) want = this.idleYaw;
    }
    if (!Number.isNaN(want) && (input.lookBack || Math.abs(want) < t.headMax * 0.6)) this.backSide = want >= 0 ? 1 : -1;

    // the springs aim the whole look (the kart animation's look included): past headMax the spine twists
    const base = anim.curr.look;
    let twistT = 0, yawT = 0;
    if (!Number.isNaN(want)) {
      const total = clamp(want, -t.headMax - t.twistMax, t.headMax + t.twistMax);
      twistT = clamp(total - clamp(total, -t.headMax, t.headMax), -t.twistMax, t.twistMax);
      yawT = clamp(total - twistT, -t.headMax, t.headMax) - base;
    }
    // a trick twists the body over and back
    const tt = now - this.trickAt;
    if (tt < t.trickSeconds) twistT += t.trickTwist * Math.sin((TAU * tt) / t.trickSeconds) * (reaction ? 0 : 1);
    stepLimited(this.yaw, yawT, t.headSpring, dt, t.headSpeed);
    stepSpring(this.pitch, Number.isNaN(want) ? 0 : wantPitch, t.pitchSpring, dt);
    stepLimited(this.twist, clamp(twistT, -t.twistMax - t.trickTwist, t.twistMax + t.trickTwist), t.twistSpring, dt, t.twistSpeed);

    // --- the spine: forward on the gas, back on a boost, folding over on a landing
    const boostK = s.boost.remaining > 0 && s.boost.multiplier > 1 ? (s.boost.multiplier - 1) / 0.3 : 0;
    const spineT = grounded && !spinning && !reaction ? clamp(input.throttle, 0, 1) * t.throttleLean - boostK * t.boostLean : 0;
    if (grounded && !this.wasGrounded) this.spine.v += t.landFold * Math.min(12, Math.max(0, -this.airVy));
    if (!grounded) this.airVy = s.verticalVelocity;
    this.wasGrounded = grounded;
    stepSpring(this.spine, spineT, t.spineSpring, dt);

    curr.headYaw = this.yaw.x;
    curr.headPitch = this.pitch.x;
    curr.spinePitch = this.spine.x;
    curr.spineTwist = this.twist.x;
    curr.headRoll = -anim.curr.lean * t.headTilt;
    curr.shrug = 0;

    // --- the arms: the wheel, or a gesture (a finish reaction, a hit, a trick, an item)
    const R = this.aimR, L = this.aimL;
    R.wheel = L.wheel = 1;
    const sinceSpin = now - this.spinEnded;
    const ga = now - this.gestureAt;
    if (reaction) {
      reactionArms(reaction, rt, R, L, anim.reactionMain);
      mirror(L);
      if (reaction === 'shrug') curr.shrug = hump(rt, 0.02, 0.95);
      if (reaction === 'deflated') curr.shrug = -0.4 * sstep(0, 0.8, rt) * (1 - sstep(2.0, 2.6, rt));
    } else if (spinning || sinceSpin < t.recover) {
      // a hit: both arms up, flailing, the head wobbling; eased back onto the wheel once the spin is done
      const k = spinning ? 1 : 1 - sinceSpin / t.recover;
      const f = t.flail * Math.sin(TAU * t.flailHz * now);
      set(R.upper, AIM.up); R.fore[0] = -0.2 + f; R.fore[1] = 1; R.fore[2] = 0.1;
      set(L.upper, AIM.up); L.fore[0] = -0.2 - f; L.fore[1] = 1; L.fore[2] = 0.1;
      normalize(R.fore); normalize(L.fore); mirror(L);
      R.wheel = L.wheel = 1 - k;
      curr.headRoll += t.wobble * k * Math.sin(TAU * t.wobbleHz * now);
    } else if (tt < t.trickSeconds) {
      const k = hump(tt, 0, t.trickSeconds);
      set(R.upper, AIM.up); set(R.fore, AIM.upFore);
      set(L.upper, AIM.up); set(L.fore, AIM.upFore); mirror(L);
      R.wheel = L.wheel = 1 - Math.min(1, k * 1.6);
    } else if (this.gesture && ga < t.throwSeconds) {
      R.wheel = 1 - itemArm(this.gesture, ga, R);
    } else this.gesture = null;
    // the blend eases (never a snap), the aims follow as they are
    easeArm(curr.armR, R, t.armRate * dt);
    easeArm(curr.armL, L, t.armRate * dt);
  }

  /** A look beyond the head's reach behind the kart keeps to one side (no flipping across the back). */
  private overShoulder(yaw: number): number {
    if (Math.abs(yaw) > Math.PI - 0.35) return this.backSide * Math.abs(yaw);
    return yaw;
  }

  /** The pose between the last two ticks at `alpha` (0..1), into `out`; `reduced` (reduced motion) scales the moves down. */
  pose(alpha: number, reduced: boolean, out: DriverPose): DriverPose {
    const a = this.prev, b = this.curr, k = reduced ? this.t.reducedScale : 1;
    out.spin = lerp(a.spin, b.spin, alpha);
    // the look keeps its aim with reduced motion (it says where the racer looks); the flourishes shrink
    out.headYaw = lerp(a.headYaw, b.headYaw, alpha);
    out.headPitch = lerp(a.headPitch, b.headPitch, alpha);
    out.headRoll = lerp(a.headRoll, b.headRoll, alpha) * k;
    out.spinePitch = lerp(a.spinePitch, b.spinePitch, alpha) * k;
    out.spineTwist = lerp(a.spineTwist, b.spineTwist, alpha);
    out.shrug = lerp(a.shrug, b.shrug, alpha) * k;
    lerpArm(out.armL, a.armL, b.armL, alpha);
    lerpArm(out.armR, a.armR, b.armR, alpha);
    return out;
  }
}

function normalize(v: Vec3): void { const l = Math.hypot(v[0], v[1], v[2]) || 1; v[0] /= l; v[1] /= l; v[2] /= l; }

/** A spring step whose speed never passes `vmax` (its move this tick included). */
function stepLimited(s: { x: number; v: number }, target: number, tune: SpringTune, dt: number, vmax: number): void {
  const x0 = s.x;
  stepSpring(s, target, tune, dt);
  if (s.v > vmax) s.v = vmax; else if (s.v < -vmax) s.v = -vmax;
  const most = vmax * dt;
  if (s.x - x0 > most) s.x = x0 + most; else if (x0 - s.x > most) s.x = x0 - most;
}

/** The shown arm moves toward the wanted one: its weight eases, its aims follow (they are smooth already). */
function easeArm(shown: ArmPose, want: ArmPose, k: number): void {
  shown.wheel += (want.wheel - shown.wheel) * Math.min(1, k);
  for (let i = 0; i < 3; i++) { shown.upper[i] = want.upper[i]; shown.fore[i] = want.fore[i]; }
}

function lerpArm(out: ArmPose, a: ArmPose, b: ArmPose, t: number): void {
  out.wheel = lerp(a.wheel, b.wheel, t);
  for (let i = 0; i < 3; i++) { out.upper[i] = lerp(a.upper[i], b.upper[i], t); out.fore[i] = lerp(a.fore[i], b.fore[i], t); }
  normalize(out.upper); normalize(out.fore);
}

function copyArm(to: ArmPose, from: ArmPose): void {
  to.wheel = from.wheel;
  for (let i = 0; i < 3; i++) { to.upper[i] = from.upper[i]; to.fore[i] = from.fore[i]; }
}

function copyPose(to: DriverPose, from: DriverPose): void {
  to.spin = from.spin; to.headYaw = from.headYaw; to.headPitch = from.headPitch; to.headRoll = from.headRoll;
  to.spinePitch = from.spinePitch; to.spineTwist = from.spineTwist; to.shrug = from.shrug;
  copyArm(to.armL, from.armL);
  copyArm(to.armR, from.armR);
}

/**
 * What a rigged kart needs to follow the road under its own four wheels this frame (KartView
 * onFrame, render only): the track to sample (null: none this frame — a showroom, a ghost, the
 * podium — every wheel eases back to its rest travel) and where the kart's own centre sits on it:
 * its arc-length fraction and branch (KartState.t/.branch), its lateral offset from the centreline
 * (metres, +right; ground.ts's lateralOffset, at the kart's own point), and its own current world Y
 * (already snapped to its own ground, ramps included: KartState.position[1]). A wheel's own point is
 * a small shift from these by its hub's local offset (its target is the road there, minus this Y).
 */
export interface WheelGround {
  track: TrackQuery | null;
  t: number;
  branch: number;
  lateral: number;
  centerY: number;
}
/** No track this frame: every wheel's suspension eases back to 0 (a showroom, a ghost, the podium). */
export const NO_GROUND: Readonly<WheelGround> = Object.freeze({ track: null, t: 0, branch: 0, lateral: 0, centerY: 0 });

/**
 * What a rigged kart does with the two poses each frame (art-pipeline rigged.ts RiggedKart): the
 * chassis's springs (heave, roll, pitch, steer, lean, look, nod) and the driver's own, and each
 * wheel's own suspension travel toward the road under it (`ground`, `dt` the frame's seconds; both
 * optional so a caller with nothing to offer, or an older one, gets today's springs alone).
 */
export interface KartRig {
  /** the wheels' radius (m), for their roll */
  readonly wheelRadius: number;
  apply(a: Readonly<AnimPose>, d: Readonly<DriverPose>, ground?: Readonly<WheelGround>, dt?: number): void;
}
