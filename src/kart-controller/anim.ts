// Render side, pure maths (no Three.js): the kart's secondary animation, so a kart reads as a
// weighty toy on springs instead of a rigid model sliding along (five video critiques, 24 Sept
// 2026). Springs on the chassis (roll, pitch, squash and stretch, the drift's yaw), on the driver
// (lean, look, nod) and on the front wheels' steer, driven by what the sim state does from tick
// to tick: turning, drifting, hopping, landing, bumps, shoves, boosting, braking, hits, oil. Stepped on
// the sim's fixed tick and interpolated per frame like the pose, so it looks the same at any
// frame rate and freezes with the hit-stop. It reads the kart state and its input and writes
// only its own fields: the sim never sees it (game/viewSim.test.ts). KartView (view.ts) puts
// the pose on the chassis and on the model's morph targets (art-pipeline rig.ts).
import type { InputState, KartState } from './types.ts';

/** A spring's natural frequency (Hz) and damping ratio (1: no overshoot; lower: it bounces back past rest). */
export type SpringTune = readonly [hz: number, zeta: number];

/**
 * Every tuning number of the kart animation, in one place (render only, not sim tuning; the
 * kart-controller SOP's view section and the art-pipeline SOP describe them). Angles in
 * radians; signs as the sim's: +X is the kart's right (screen-left seen from behind).
 */
export const KART_ANIM = Object.freeze({
  // --- springs
  rollSpring: [2.4, 0.5] as SpringTune,
  pitchSpring: [2.6, 0.45] as SpringTune,
  squashSpring: [4.2, 0.36] as SpringTune,
  yawSpring: [3.0, 0.55] as SpringTune,
  leanSpring: [2.2, 0.5] as SpringTune,
  lookSpring: [2.0, 0.75] as SpringTune,
  nodSpring: [3.0, 0.38] as SpringTune,
  steerSpring: [7.0, 0.85] as SpringTune,

  // --- chassis roll: the body leans out of a turn (the inside lifts) with its lateral acceleration
  /** rad per m/s² toward the inside: a full grip turn at top speed (about 21 m/s²) leans out 4.5° */
  rollPerLatAccel: 0.0038,
  /** rad: the most a grip turn leans */
  rollTurnMax: 0.09,
  /** rad more lean-out while drifting, on top of the turn's own (9 to 11° in all) */
  driftRoll: 0.12,
  /** rad: the most the chassis ever rolls */
  rollMax: 0.21,
  /** rad per tick: a heading change past this is a wall's impact turn, not steering (as KartView's snap) */
  turnPerTickMax: 0.03,

  // --- chassis yaw while drifting (added to the schema's driftVisualSlip)
  /** rad more slip at the tightest drift line (drift.yawK 1): the tail hangs further out */
  driftYawExtra: 0.14,
  /** rad/s: the tail flicks out as a drift locks, then settles */
  driftKick: 2.2,
  /** rad the kart swivels toward the stick during the hop, as the drift is picked */
  hopSwing: 0.12,

  // --- pitch: nose up under acceleration, nose down under braking (+ dips the nose)
  /** rad per m/s² of forward acceleration */
  pitchPerAccel: 0.0055,
  /** m/s²: a bump or a wall changes speed in one tick; it must not read as a nose-dive */
  accelClamp: 12,
  /** rad */
  pitchMax: 0.09,
  /** rad/s nose-up kick as a boost starts, for a +30 % boost (more for a stronger one) */
  boostKick: 2,
  /** 1/s of squash as a boost starts, for a +30 % boost: the rear squats onto its springs */
  boostSquat: 2.4,
  /** rad/s nose-dip per m/s of landing speed */
  landPitch: 0.1,

  // --- squash (−) and stretch (+) of the whole kart about its wheels' contact, a fraction of its height.
  // Kicks are the spring's speed (1/s); a kick k peaks near 0.024 k on the squash spring.
  /** 1/s per m/s of landing speed: a hop's landing (3.25 m/s) squashes about 8 %, a jump's (6 m/s and up) 15 % */
  landSquash: 1,
  /** 1/s: the most any one kick gives (about a 15 % squash or stretch), so a big landing peaks, never clips */
  kickMax: 6,
  /** m/s: landings harder than this dip the nose and nod the head no further */
  landCap: 14,
  /** 1/s per m/s the road under the kart changes its climb rate in one tick (bumps, dips, crests) */
  bumpSquash: 0.4,
  /** m/s: the most one tick of road counts */
  bumpCap: 2.5,
  /** 1/s: the drift hop pops up (an 8 % stretch), then lands (squash) */
  hopStretch: 3.4,
  /** 1/s per m/s of climb as the kart leaves a ramp */
  launchStretch: 0.5,
  /** 1/s: a hit pops the kart (stretch, then it squashes back) */
  hitPop: 4.5,
  /** the most the kart squashes or stretches */
  squashMax: 0.17,
  /** the share of the squash the whole kart's scale shows; the rest is the body sinking on its springs */
  squashShare: 0.6,
  /** m the body sinks on its springs (the rig's 'heave'; the tyres stay on the road) per unit of squash */
  heavePerSquash: 0.55,
  /** m: half the track and half the wheelbase; the kart rides up so its low wheel stays on the road as it leans */
  halfTrack: 0.6,
  halfBase: 0.6,

  // --- idle life: the engine shivers the kart at a standstill, harder while it revs on the grid
  idleHz: 9,
  idleSquash: 0.005,
  revSquash: 0.014,
  /** rad the nose lifts (the rear squats) while revving at a standstill */
  revSquat: 0.025,
  /** m/s: above this the shiver has faded out */
  idleSpeed: 4,

  // --- hit: one full turn in the first `spinShare` of the spin-out, easing to a stop (plan §7.2 item 7)
  spinTurns: 1,
  spinShare: 0.8,
  /** rad: with reduced motion, a wobble instead of the turn */
  spinWobble: 0.3,
  /** rad and Hz: a fishtail while an oil slick (or a tug) slows the kart */
  slowWobble: 0.12,
  slowHz: 3,
  /** rad/s: a trick flicks the chassis over and back (about 14°) */
  trickFlick: 6,
  /** m/s in one tick: a sideways shove past this (a kart's bump, a wall) jolts the kart; steering never does */
  shoveMin: 1.5,
  /** m/s: the most one shove counts */
  shoveCap: 5,
  /** rad/s of roll per m/s of shove: the body lags the push, so the pushed-toward side lifts */
  shoveRoll: 0.7,
  /** rad/s of pitch per m/s of a shove from behind or ahead (a rear-end bump, a ram): the nose lifts as it is pushed on */
  shovePitch: 0.35,
  /** rad/s the driver's upper body jerks away from the push, per m/s */
  shoveLean: 1,
  /** 1/s of squash per m/s of shove: the jolt */
  shoveSquash: 0.4,

  // --- driver (morph targets 'lean', 'look', 'nod'; art-pipeline rig.ts)
  /** rad per m/s² toward the inside of a turn (on the chassis, which leans the other way: in the world the driver leans in by the difference) */
  leanPerLatAccel: 0.01,
  /** rad more lean into a drift (about 17° in the world, the chassis's lean-out taken off) */
  leanDrift: 0.3,
  leanMax: 0.5,
  /** rad the head turns with the stick (into corners), and toward a drift */
  lookSteer: 0.3,
  lookDrift: 0.5,
  lookMax: 0.55,
  /** rad per m/s² of braking (head forward) or acceleration (head back) */
  nodPerAccel: 0.009,
  nodMax: 0.14,
  /** rad/s the head nods forward per m/s of landing speed, and per m/s of bump */
  nodLand: 0.36,
  nodBump: 0.3,

  // --- front wheels (morph target 'steer')
  /** rad at full stick */
  steerAngle: 0.38,

  /** reduced motion (the game's `reduced` flag): everything this much, the hit a wobble */
  reducedScale: 0.35,
  /** m in one tick: a set-down or a respawn, not motion (nothing is read into it) */
  teleport: 3,
});

export type KartAnimTuning = typeof KART_ANIM;

/** A damped spring's state: position and velocity. */
export interface Spring { x: number; v: number }

/**
 * One step of a damped spring toward `target`: semi-implicit Euler in sub-steps of at most 0.2 rad
 * of the spring's phase, so it stays stable and accurate at any dt.
 */
export function stepSpring(s: Spring, target: number, tune: SpringTune, dt: number): void {
  const w = 2 * Math.PI * tune[0];
  const k = w * w, c = 2 * tune[1] * w;
  const n = Math.max(1, Math.ceil((w * dt) / 0.2));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    s.v += (k * (target - s.x) - c * s.v) * h;
    s.x += s.v * h;
  }
}

/** The animation at one instant. Angles in radians, +X the kart's right (screen-left from behind). */
export interface AnimPose {
  /** chassis roll: + lifts the +X side */
  roll: number;
  /** chassis pitch: + dips the nose */
  pitch: number;
  /** chassis yaw on top of the heading: + turns the nose toward +X (the drift's slip, a fishtail) */
  yaw: number;
  /** the hit's spin (whole turns when done) and, for reduced motion, the wobble that stands in for it */
  spin: number;
  wobble: number;
  /** − squashes (shorter, wider), + stretches, about the wheels' contact */
  squash: number;
  /** m the body rides up (+) or sinks (−) on its springs, the tyres staying on the road (the rig's 'heave') */
  heave: number;
  /** m the chassis rides up so its low wheel stays on the road as it leans (frame-time, from roll and pitch) */
  lift: number;
  /** driver: + leans the upper body toward +X; + turns the head toward +X; + nods the head forward */
  lean: number;
  look: number;
  nod: number;
  /** front wheels: + points them toward +X */
  steer: number;
  /** m the whole kart jumps off the road (a finish reaction's leap; 0 while racing) */
  hop: number;
}

export function newPose(): AnimPose {
  return { roll: 0, pitch: 0, yaw: 0, spin: 0, wobble: 0, squash: 0, heave: 0, lift: 0, lean: 0, look: 0, nod: 0, steer: 0, hop: 0 };
}

const clamp = (x: number, lo: number, hi: number) => (x < lo ? lo : x > hi ? hi : x);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ---------------------------------------------------------------- finish reactions
/**
 * What a racer does over the line and on the podium (game/celebrate.ts picks it from the placing;
 * Adam, 24 Sept 2026): procedural, on the same chassis and morph targets as the driving, no model
 * files. Joyful for the podium places and a Knockout's safe ones (champion: a crouch, a leap with a
 * full turn in the air, fist pumps and hops; cheer: a hop with a twist, then a big wave; bounce: two
 * happy hops, a nodded yes and a wiggle; relief: a phew, a perk-up, one fist pump and a look back at
 * the ones behind), friendly for the rest (shrug: shoulders up, a head tilt and a nod; deflated: a
 * sag with the head down, a slow head shake, then chin up and a nod: next time). G-rated, never
 * mocking. Render only: the sim never sees it.
 */
export type Reaction = 'champion' | 'cheer' | 'bounce' | 'relief' | 'shrug' | 'deflated';
export const REACTIONS: readonly Reaction[] = Object.freeze(['champion', 'cheer', 'bounce', 'relief', 'shrug', 'deflated']);
/** Seconds each reaction's main move lasts; after it a gentle idle in the same mood carries on. */
export const REACTION_SECONDS: Readonly<Record<Reaction, number>> = Object.freeze({ champion: 3.2, cheer: 3, bounce: 2.6, relief: 2.9, shrug: 2.2, deflated: 3.2 });

const TAU = Math.PI * 2;
const sstep = (a: number, b: number, x: number): number => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
/** a smooth hump: 0 outside [a, b], half a sine inside */
const hump = (x: number, a: number, b: number): number => (x <= a || x >= b ? 0 : Math.sin((Math.PI * (x - a)) / (b - a)));
/** up over [a, b], held, down over [c, d] */
const hold = (x: number, a: number, b: number, c: number, d: number): number => sstep(a, b, x) * (1 - sstep(c, d, x));
/** a sine of `hz` from `a` to `b`, faded in and out */
const wave = (x: number, a: number, b: number, hz: number, phase = 0): number =>
  (x <= a || x >= b ? 0 : Math.sin(TAU * hz * (x - a) + phase) * hold(x, a, a + 0.2, b - 0.3, b));

/**
 * A reaction's offsets `t` seconds in (angles in rad, +X the kart's right, as AnimPose; `hop` and
 * `squash` as AnimPose), written into `out` (only the fields a reaction moves). Pure.
 */
export function reactionPose(kind: Reaction, t: number, out: AnimPose): AnimPose {
  out.roll = 0; out.pitch = 0; out.yaw = 0; out.spin = 0; out.squash = 0; out.lean = 0; out.look = 0; out.nod = 0; out.hop = 0;
  const tail = sstep(REACTION_SECONDS[kind] - 0.3, REACTION_SECONDS[kind] + 0.3, t);
  switch (kind) {
    case 'champion': {
      // crouch, leap with one whole turn in the air, land, then fist pumps and two little hops
      const crouch = hold(t, 0, 0.2, 0.26, 0.36), u = (t - 0.36) / 0.6;
      out.squash = -0.13 * crouch + 0.1 * hump(t, 0.3, 0.55) - 0.15 * hump(t, 0.98, 1.24) - 0.07 * (hump(t, 2.2, 2.35) + hump(t, 2.9, 3.05));
      out.hop = 0.95 * hump(t, 0.32, 1.0) + 0.24 * (hump(t, 1.9, 2.25) + hump(t, 2.6, 2.95));
      out.spin = u > 0 && u < 1 ? TAU * u * u * u * (u * (u * 6 - 15) + 10) : 0;
      out.pitch = -0.07 * hump(t, 0.3, 0.7) + 0.05 * hump(t, 0.98, 1.2);
      out.nod = 0.2 * crouch - 0.3 * hold(t, 0.4, 0.55, 0.85, 1.0) + 0.1 * wave(t, 1.25, 3.2, 2.2);
      out.lean = 0.33 * wave(t, 1.25, 3.2, 2.2);
      out.roll = 0.05 * wave(t, 1.25, 3.2, 2.2);
      out.look = 0.25 * wave(t, 1.3, 3.2, 0.7);
      break;
    }
    case 'cheer': {
      // a hop with a twist in the air (no full turn), then a big side-to-side wave
      const crouch = hold(t, 0, 0.18, 0.22, 0.32);
      out.squash = -0.09 * crouch + 0.08 * hump(t, 0.28, 0.48) - 0.12 * hump(t, 0.78, 0.98);
      out.hop = 0.5 * hump(t, 0.28, 0.82);
      out.yaw = t > 0.3 && t < 0.82 ? 0.38 * Math.sin((TAU * (t - 0.3)) / 0.52) : 0;
      out.nod = 0.15 * crouch - 0.12 * hold(t, 0.9, 1.1, 2.8, 3.0);
      out.lean = 0.3 * wave(t, 1.0, 3.0, 1.5);
      out.look = -0.18 * wave(t, 1.0, 3.0, 1.5);
      out.roll = 0.05 * wave(t, 1.0, 3.0, 1.5);
      break;
    }
    case 'bounce': {
      // two quick happy hops, a nodded yes-yes, a wiggle
      out.hop = 0.32 * (hump(t, 0.12, 0.46) + hump(t, 0.6, 0.94));
      out.squash = 0.06 * (hump(t, 0.06, 0.18) + hump(t, 0.54, 0.66)) - 0.1 * (hump(t, 0.44, 0.6) + hump(t, 0.92, 1.1));
      out.nod = 0.22 * wave(t, 1.1, 2.3, 3);
      out.roll = 0.07 * wave(t, 1.2, 2.6, 2.5);
      out.lean = 0.12 * wave(t, 1.2, 2.6, 2.5, Math.PI / 2);
      break;
    }
    case 'relief': {
      // phew (a sag, head down), perk up, one fist pump with a little hop, a look back at the ones behind
      const sag = hold(t, 0, 0.3, 0.55, 0.8);
      out.squash = -0.08 * sag + 0.06 * hump(t, 0.7, 1.1) - 0.06 * hump(t, 1.45, 1.62);
      out.nod = 0.28 * sag - 0.2 * hump(t, 0.75, 1.25);
      out.hop = 0.22 * hump(t, 1.15, 1.5);
      out.lean = 0.35 * hump(t, 1.2, 1.75);
      out.look = 0.5 * hold(t, 1.85, 2.1, 2.55, 2.85);
      break;
    }
    case 'shrug': {
      // shoulders up (the body lifts), a head tilt, down again, then a friendly nod
      const up = hold(t, 0.05, 0.25, 0.65, 0.85);
      out.squash = 0.07 * up - 0.03 * hump(t, 0.8, 1.0);
      out.lean = 0.14 * up;
      out.look = 0.12 * up;
      out.roll = 0.03 * up;
      out.nod = -0.08 * up + 0.14 * wave(t, 1.1, 2.2, 2);
      out.lean += 0.04 * Math.sin(TAU * 0.6 * t) * tail;
      return out;
    }
    case 'deflated': {
      // a sag with the head down, a slow head shake, then chin up and a nod: next time
      const sag = sstep(0, 0.8, t) * (1 - sstep(2.0, 2.6, t));
      out.squash = -0.1 * sag + 0.04 * hump(t, 2.2, 2.6);
      out.nod = 0.32 * sag - 0.08 * hold(t, 2.3, 2.5, 2.8, 3.1) + 0.12 * hump(t, 2.75, 3.1);
      out.pitch = 0.03 * sag;
      out.lean = -0.06 * sag;
      out.look = 0.28 * wave(t, 0.9, 2.0, 1.1);
      return out;
    }
  }
  // the joyful ones carry on bobbing and swaying
  out.squash += 0.022 * Math.sin(TAU * 1.7 * t) * tail;
  out.lean += 0.08 * Math.sin(TAU * 0.85 * t) * tail;
  return out;
}

/** What the animation needs from the kart's constants (both render-only reads). */
export interface AnimKartConsts { hitSpinSeconds: number; driftVisualSlip: number }

/**
 * One kart's animation. Call tick() once per sim tick after the sim has stepped (with the input
 * the kart drove on), then pose() once per rendered frame. No allocation after construction.
 */
export class KartAnim {
  readonly prev = newPose();
  readonly curr = newPose();
  private readonly roll: Spring = { x: 0, v: 0 };
  private readonly pitch: Spring = { x: 0, v: 0 };
  private readonly squash: Spring = { x: 0, v: 0 };
  private readonly yaw: Spring = { x: 0, v: 0 };
  private readonly lean: Spring = { x: 0, v: 0 };
  private readonly look: Spring = { x: 0, v: 0 };
  private readonly nod: Spring = { x: 0, v: 0 };
  private readonly steer: Spring = { x: 0, v: 0 };
  private readonly c: AnimKartConsts;
  private readonly t: KartAnimTuning;
  /** a per-kart offset so the field's idle shivers are not in step */
  private readonly phase: number;
  private started = false;
  private clock = 0;
  private lastX = 0;
  private lastY = 0;
  private lastZ = 0;
  private lastHeading = 0;
  private lastSpeed = 0;
  private lastLat = 0;
  /** the road's climb rate under the kart last tick (m/s), from its position; NaN when not known */
  private lastVy = Number.NaN;
  /** the vertical speed on the last airborne tick: how hard it lands */
  private airVy = 0;
  private wasGrounded = true;
  private lastPhase: KartState['drift']['phase'] = 'idle';
  private lastBoost = 0;
  private wasSpinning = false;
  private spinDir = 1;
  private lastTrick = false;
  private trickDir = 1;
  /** the finish reaction playing (null: none) and the clock it started at; its offsets on the last two ticks */
  private reaction: Reaction | null = null;
  private reactAt = 0;
  private readonly rPrev = newPose();
  private readonly rCurr = newPose();

  constructor(c: AnimKartConsts, seed = 0, tuning: KartAnimTuning = KART_ANIM) {
    this.c = c;
    this.t = tuning;
    this.phase = seed * 2.399963; // the golden angle: any number of karts, all out of step
  }

  /** Start a finish reaction from the next tick (null stops it). A new one starts over from its beginning. */
  react(kind: Reaction | null): void {
    this.reaction = kind;
    this.reactAt = this.clock;
    if (!kind) { const a = this.rPrev, b = this.rCurr; a.roll = a.pitch = a.yaw = a.spin = a.squash = a.lean = a.look = a.nod = a.hop = 0; b.roll = b.pitch = b.yaw = b.spin = b.squash = b.lean = b.look = b.nod = b.hop = 0; }
  }

  /** The reaction playing, if any. */
  get reacting(): Reaction | null { return this.reaction; }

  /** One sim tick: `s` is the kart after the step, `input` what it drove on. Reads both, writes neither. */
  tick(s: Readonly<KartState>, input: Readonly<InputState>, dt: number): void {
    const t = this.t;
    const prev = this.prev, curr = this.curr;
    prev.roll = curr.roll; prev.pitch = curr.pitch; prev.yaw = curr.yaw; prev.spin = curr.spin; prev.wobble = curr.wobble;
    prev.squash = curr.squash; prev.lean = curr.lean; prev.look = curr.look; prev.nod = curr.nod; prev.steer = curr.steer;
    this.clock += dt;
    // the finish reaction's offsets this tick, on its own layer (a whole turn, done, drops out of both ends: no unwinding)
    const ra = this.rPrev, rb = this.rCurr;
    ra.roll = rb.roll; ra.pitch = rb.pitch; ra.yaw = rb.yaw; ra.spin = rb.spin; ra.squash = rb.squash; ra.lean = rb.lean; ra.look = rb.look; ra.nod = rb.nod; ra.hop = rb.hop;
    if (this.reaction) {
      reactionPose(this.reaction, this.clock - this.reactAt, rb);
      if (ra.spin - rb.spin > Math.PI) ra.spin -= TAU; else if (rb.spin - ra.spin > Math.PI) ra.spin += TAU;
    }

    const x = s.position[0], y = s.position[1], z = s.position[2];
    const moved = this.started ? Math.hypot(x - this.lastX, z - this.lastZ) : 0;
    // a set-down (the claw), a respawn, a loop-the-loop ride: nothing to read into the motion
    const riding = s.status.loopIndex >= 0 || s.status.held;
    if (!this.started || moved > t.teleport) {
      this.started = true;
      this.lastHeading = s.heading;
      this.lastSpeed = s.speed;
      this.lastLat = s.lateralVelocity;
      this.lastVy = Number.NaN;
      this.wasGrounded = s.grounded;
      this.lastPhase = s.drift.phase;
      this.lastBoost = s.boost.remaining;
    }

    // how the kart moved this tick
    let dh = s.heading - this.lastHeading;
    while (dh > Math.PI) dh -= 2 * Math.PI;
    while (dh < -Math.PI) dh += 2 * Math.PI;
    if (Math.abs(dh) > t.turnPerTickMax) dh = 0; // a wall's impact turn is not a turn
    const yawRate = dh / dt;
    const aLat = riding ? 0 : s.speed * yawRate; // m/s² toward +X
    const aLong = riding ? 0 : clamp((s.speed - this.lastSpeed) / dt, -t.accelClamp, t.accelClamp);
    const vy = (y - this.lastY) / dt;
    const grounded = s.grounded && !riding;
    const drifting = s.drift.active && s.drift.phase === 'drifting';
    const d = drifting ? s.drift.direction : 0;
    const spinning = s.status.spinRemaining > 0;

    // --- events
    if (!riding && Number.isFinite(this.lastVy)) {
      if (grounded && this.wasGrounded) {
        // the road pushes up (a dip's bottom, a bump's foot): it squashes; it falls away (a crest): it stretches
        const dv = clamp(vy - this.lastVy, -t.bumpCap, t.bumpCap);
        this.squash.v -= t.bumpSquash * dv;
        this.nod.v += t.nodBump * Math.max(0, dv);
      } else if (grounded && !this.wasGrounded) {
        // landing: squash then rebound, the nose and the driver's head dip
        const impact = Math.min(t.landCap, Math.max(0, -this.airVy));
        this.squash.v -= Math.min(t.kickMax, t.landSquash * impact);
        this.pitch.v += t.landPitch * impact;
        this.nod.v += t.nodLand * impact;
      } else if (!grounded && this.wasGrounded) {
        // take-off: the drift hop pops up; a ramp's launch stretches with its climb
        if (s.drift.phase === 'hopping' && this.lastPhase !== 'hopping') this.squash.v += t.hopStretch;
        else this.squash.v += Math.min(t.kickMax, t.launchStretch * Math.max(0, s.verticalVelocity));
      }
    }
    if (!grounded) this.airVy = s.verticalVelocity;
    // a shove (a kart's bump, a wall): the body lags the push and tips, the driver jerks, it jolts
    const shove = s.lateralVelocity - this.lastLat, bump = s.speed - this.lastSpeed;
    if (!riding && Math.abs(shove) > t.shoveMin) {
      const k = clamp(shove, -t.shoveCap, t.shoveCap);
      this.roll.v += t.shoveRoll * k;
      this.lean.v -= t.shoveLean * k;
      this.squash.v -= t.shoveSquash * Math.abs(k);
    }
    // the same from behind or ahead (braking and boosts change speed far slower than this)
    if (!riding && Math.abs(bump) > t.shoveMin) {
      const k = clamp(bump, -t.shoveCap, t.shoveCap);
      this.pitch.v -= t.shovePitch * k;
      this.nod.v -= t.shovePitch * k;
      this.squash.v -= t.shoveSquash * Math.abs(k);
    }
    if (s.drift.phase === 'drifting' && this.lastPhase !== 'drifting') this.yaw.v += s.drift.direction * t.driftKick;
    if (s.boost.remaining > this.lastBoost + 0.05 && s.boost.multiplier > 1) {
      // the nose lifts, the rear squats onto its springs
      const k = (s.boost.multiplier - 1) / 0.3;
      this.pitch.v -= t.boostKick * k;
      this.squash.v -= t.boostSquat * k;
    }
    if (spinning && !this.wasSpinning) {
      this.spinDir = s.lateralVelocity >= 0 ? 1 : -1;
      this.squash.v += t.hitPop;
    }
    const trick = s.airborne.trickQueued;
    if (trick && !this.lastTrick) {
      this.roll.v += this.trickDir * t.trickFlick;
      this.squash.v += t.hopStretch;
      this.trickDir = -this.trickDir;
    }

    // --- targets
    const speed = Math.abs(s.speed);
    const still = clamp(1 - speed / t.idleSpeed, 0, 1);
    const shiver = Math.sin(2 * Math.PI * t.idleHz * this.clock + this.phase);
    const revving = grounded && !spinning ? still * clamp(input.throttle, 0, 1) : 0;
    let rollT = 0, yawT = 0, lean = 0, look = 0;
    if (grounded && !spinning) {
      rollT = clamp(t.rollPerLatAccel * aLat, -t.rollTurnMax, t.rollTurnMax) + d * t.driftRoll;
      lean = clamp(t.leanPerLatAccel * aLat, -t.leanMax, t.leanMax) + d * t.leanDrift;
    }
    if (drifting) {
      yawT = d * (this.c.driftVisualSlip + t.driftYawExtra * clamp(s.drift.yawK, 0, 1));
      look = d * t.lookDrift;
    } else if (s.drift.phase === 'hopping') {
      yawT = clamp(input.steer, -1, 1) * t.hopSwing;
      look = clamp(input.steer, -1, 1) * t.lookSteer;
    } else if (!spinning) {
      look = clamp(input.steer, -1, 1) * t.lookSteer;
    }
    if (s.status.slowRemaining > 0 && !spinning) {
      yawT += t.slowWobble * Math.sin(2 * Math.PI * t.slowHz * this.clock) * Math.min(1, s.status.slowRemaining / 0.5);
    }
    const pitchT = grounded ? clamp(-t.pitchPerAccel * aLong, -t.pitchMax, t.pitchMax) - revving * t.revSquat : 0;
    const squashT = grounded ? shiver * (still * t.idleSquash + revving * t.revSquash) : 0;
    const nodT = clamp(t.nodPerAccel * -aLong, -t.nodMax, t.nodMax);

    stepSpring(this.roll, clamp(rollT, -t.rollMax, t.rollMax), t.rollSpring, dt);
    stepSpring(this.pitch, pitchT, t.pitchSpring, dt);
    stepSpring(this.squash, squashT, t.squashSpring, dt);
    stepSpring(this.yaw, yawT, t.yawSpring, dt);
    stepSpring(this.lean, clamp(lean, -t.leanMax, t.leanMax), t.leanSpring, dt);
    stepSpring(this.look, clamp(look, -t.lookMax, t.lookMax), t.lookSpring, dt);
    stepSpring(this.nod, nodT, t.nodSpring, dt);
    stepSpring(this.steer, spinning ? 0 : clamp(input.steer, -1, 1) * t.steerAngle, t.steerSpring, dt);

    // --- the hit's spin: from the sim's own spin timer, so it ends with it
    if (spinning) {
      const T = Math.max(1e-6, this.c.hitSpinSeconds);
      const p = clamp((T - s.status.spinRemaining) / (T * t.spinShare), 0, 1);
      const e = 1 - (1 - p) * (1 - p) * (1 - p);
      curr.spin = this.spinDir * 2 * Math.PI * t.spinTurns * e;
      curr.wobble = this.spinDir * t.spinWobble * Math.sin(3 * Math.PI * p) * (1 - p);
    } else if (this.wasSpinning) {
      // done: the turn is whole, so drop it from both ends of the interpolation at once (no unwinding)
      prev.spin -= curr.spin;
      curr.spin = 0;
      curr.wobble = 0;
    }

    curr.roll = clamp(this.roll.x, -t.rollMax, t.rollMax);
    curr.pitch = clamp(this.pitch.x, -t.pitchMax * 1.5, t.pitchMax * 1.5);
    curr.yaw = this.yaw.x;
    curr.squash = clamp(this.squash.x, -t.squashMax, t.squashMax);
    curr.lean = this.lean.x;
    curr.look = this.look.x;
    curr.nod = clamp(this.nod.x, -t.nodMax * 1.5, t.nodMax * 1.5);
    curr.steer = this.steer.x;

    this.lastX = x; this.lastY = y; this.lastZ = z;
    this.lastHeading = s.heading;
    this.lastSpeed = s.speed;
    this.lastLat = s.lateralVelocity;
    this.lastVy = riding ? Number.NaN : vy;
    this.wasGrounded = grounded;
    this.lastPhase = s.drift.phase;
    this.lastBoost = s.boost.remaining;
    this.wasSpinning = spinning;
    this.lastTrick = trick;
  }

  /**
   * The pose between the last two ticks at `alpha` (0..1), into `out`. With `reduced` (reduced
   * motion) everything is scaled down and the hit's turn is a small wobble; the drift's own slip
   * stays, since it says which way the kart is sliding. The squash spring shows as the whole
   * kart's squash (`squashShare` of it) and the body sinking on its springs (`heave`). A finish
   * reaction (react) is added on top, scaled down the same with reduced motion, its leap low and
   * its turn in the air left out.
   */
  pose(alpha: number, reduced: boolean, out: AnimPose): AnimPose {
    const a = this.prev, b = this.curr, t = this.t, ra = this.rPrev, rb = this.rCurr;
    const k = reduced ? t.reducedScale : 1;
    out.roll = (lerp(a.roll, b.roll, alpha) + lerp(ra.roll, rb.roll, alpha)) * k;
    out.pitch = (lerp(a.pitch, b.pitch, alpha) + lerp(ra.pitch, rb.pitch, alpha)) * k;
    out.spin = reduced ? 0 : lerp(a.spin, b.spin, alpha) + lerp(ra.spin, rb.spin, alpha);
    out.wobble = reduced ? lerp(a.wobble, b.wobble, alpha) : 0;
    out.yaw = lerp(a.yaw, b.yaw, alpha) + lerp(ra.yaw, rb.yaw, alpha) * k;
    const squash = (lerp(a.squash, b.squash, alpha) + lerp(ra.squash, rb.squash, alpha)) * k;
    out.squash = squash * t.squashShare;
    out.heave = squash * t.heavePerSquash;
    out.lean = (lerp(a.lean, b.lean, alpha) + lerp(ra.lean, rb.lean, alpha)) * k;
    out.look = (lerp(a.look, b.look, alpha) + lerp(ra.look, rb.look, alpha)) * k;
    out.nod = (lerp(a.nod, b.nod, alpha) + lerp(ra.nod, rb.nod, alpha)) * k;
    out.hop = lerp(ra.hop, rb.hop, alpha) * k;
    out.steer = lerp(a.steer, b.steer, alpha);
    out.lift = t.halfTrack * Math.abs(Math.sin(out.roll)) + t.halfBase * Math.abs(Math.sin(out.pitch));
    return out;
  }
}
