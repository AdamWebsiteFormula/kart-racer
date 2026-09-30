// Render side, pure maths (no Three.js): the kart's secondary animation, so a kart reads as a
// weighty toy on springs instead of a rigid model sliding along (five video critiques, 24 Sept
// 2026). Springs on the chassis (roll, pitch, squash and stretch, the drift's yaw), on the driver
// (lean, look, nod) and on the front wheels' steer, driven by what the sim state does from tick
// to tick: turning, drifting, hopping, landing, bumps, shoves, boosting, braking, hits, oil. Stepped on
// the sim's fixed tick and interpolated per frame like the pose, so it looks the same at any
// frame rate and freezes with the hit-stop. It reads the kart state and its input and writes
// only its own fields: the sim never sees it (game/viewSim.test.ts). KartView (view.ts) puts
// the pose on the chassis and on the model's morph targets (art-pipeline rig.ts).
import type { RevView } from './rev.ts';
import { airLeft, pickStunt, STUNT, stuntPose, stuntSeconds, type StuntKind, type StuntPose } from './stunt.ts';
import type { InputState, KartState, TrackQuery } from './types.ts';

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
  squashSpring: [4.2, 0.6] as SpringTune, // 0.36 until 30 Sept 2026: damped, no cartoon rebound
  yawSpring: [3.0, 0.55] as SpringTune,
  leanSpring: [2.2, 0.5] as SpringTune,
  lookSpring: [2.0, 0.75] as SpringTune,
  nodSpring: [3.0, 0.6] as SpringTune, // 0.38 until 30 Sept 2026
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
  boostSquat: 1.2,
  /** rad/s nose-dip per m/s of landing speed */
  landPitch: 0.1,

  // --- squash (−) and stretch (+) of the whole kart about its wheels' contact, a fraction of its height.
  // Kicks are the spring's speed (1/s); a kick k peaks near 0.024 k on the squash spring.
  /** 1/s per m/s of landing speed: a hop's landing (3.25 m/s) squashes about 8 %, a jump's (6 m/s and up) 15 % */
  landSquash: 0.5,
  /** 1/s: the most any one kick gives (about a 15 % squash or stretch), so a big landing peaks, never clips */
  kickMax: 6,
  /** m/s: landings harder than this dip the nose and nod the head no further */
  landCap: 14,
  /** 1/s per m/s the road under the kart changes its climb rate in one tick (bumps, dips, crests) */
  bumpSquash: 0.2,
  /** m/s: the most one tick of road counts */
  bumpCap: 2.5,
  /** 1/s: the drift hop pops up (an 8 % stretch), then lands (squash) */
  hopStretch: 1.2,
  /** 1/s per m/s of climb as the kart leaves a ramp */
  launchStretch: 0.2,
  /** 1/s: a hit pops the kart (stretch, then it squashes back) */
  hitPop: 2,
  /** the most the kart squashes or stretches */
  squashMax: 0.07,
  /** the share of the squash the whole kart's scale shows; the rest is the body sinking on its springs */
  squashShare: 0.6,
  /** m the body sinks on its springs (the rig's 'heave'; the tyres stay on the road) per unit of squash */
  heavePerSquash: 0.55,
  /** m: half the track and half the wheelbase; the kart rides up so its low wheel stays on the road as it leans */
  halfTrack: 0.6,
  halfBase: 0.6,

  // --- the engine's rumble (rev.ts, the engine's own rev; Adam, 26 Sept 2026: "your kart doesn't seem to
  // kind of rumble a little bit"). Off the road (the grid, a standstill) the body shivers on its springs,
  // harder and quicker as the engine revs and pulsing with the limiter's cuts; it squats back on the rev
  // (the engine's torque: Mario Kart World's rear squats as it revs on the grid); a blip rocks it back
  // and the driver's head with it, a pop jolts it. It fades as the road takes the engine over. The
  // shiver goes straight on the pose (a spring would smooth it away), and none of it under reduced motion.
  /** Hz of the shiver at idle and at the limiter: under half a 30 fps frame rate, so a slow screen never shows it as a wobble */
  shakeHz: [10, 14] as readonly [number, number],
  /**
   * m the body shivers on its springs at idle, more at full rev (× the rev squared), more at the limiter
   * (pulsing with its cuts): a rumble, not a shake (measured on screen, 26 Sept 2026, the chase camera at
   * 1080p: idling the kart's body moves ±1 px, at the limiter ±4 px, about 2 px from frame to frame)
   */
  shakeIdle: 0.007,
  shakeRev: 0.008,
  shakeLimit: 0.005,
  /** rad of roll and of pitch per m of the shiver (the body wobbles a hair as it bobs) */
  shakeRoll: 0.6,
  shakePitch: 0.4,
  /** rad the driver's head bobs per m of the shiver */
  shakeNod: 0.7,
  /** rad the nose lifts (the rear squats) at full rev off the road */
  revSquat: 0.05,
  /** a blip, times its size: rad/s the nose kicks up, 1/s the rear squats, rad/s the driver's head rocks back */
  blipKick: 0.8,
  blipSquash: 0.5,
  blipNod: 1,
  /** a pop, times its size: rad/s the nose dips, 1/s the body jolts */
  popKick: 0.35,
  popSquash: 0.3,

  // --- hit: one full turn in the first `spinShare` of the spin-out, easing to a stop (plan §7.2 item 7)
  spinTurns: 1,
  spinShare: 0.8,
  /** rad: with reduced motion, a wobble instead of the turn */
  spinWobble: 0.12,
  /**
   * A hit tosses the kart (Mario Kart World throws a hit kart up nose-first, ngiIINHSiJc 2:47; ours a smaller
   * hop, render only: 27 Sept 2026, "an item hit is a flat spin"): `hitHop` m up over `hitHopSeconds`, the nose
   * lifting `hitTumble` rad and the body rolling `hitRoll` rad into the spin, a squash as it lands (1/s)
   */
  hitHop: 0.25,
  hitHopSeconds: 0.44,
  hitTumble: 0.16,
  hitRoll: 0.14,
  hitLand: 1.6,
  /** rad/s: the driver's head snaps back as the hit lands, and turns aside */
  hitNod: 3.2,
  hitLook: 2.4,
  /**
   * The dizzy recover once the spin ends (the stars circle the head a moment more: vfx-juice contact.ts): for
   * `dizzySeconds` the body sways (`dizzySway` rad of yaw, a third of it roll) and the head wobbles round
   * (`dizzyLook` rad side to side, `dizzyNod` forward and back, a quarter turn apart) at `dizzyHz`, dying away
   */
  dizzySeconds: 0.85,
  dizzyHz: 2.3,
  dizzySway: 0.03,
  dizzyLook: 0.15,
  dizzyNod: 0.04,
  /**
   * A shove (a kart's bump, a wall) sets the body wobbling on a loose spring about its middle: rad/s of yaw per
   * m/s of shove (a bump's 3.5 m/s about 5°), a share of it as roll; and the driver's head snaps away from the
   * push (rad/s of look per m/s)
   */
  joltSpring: [4.6, 0.45] as SpringTune, // 0.2 until 30 Sept 2026
  joltPerShove: 0.55,
  joltRoll: 0.35,
  headSnap: 0.9,
  /** rad and Hz: a fishtail while an oil slick (or a tug) slows the kart */
  slowWobble: 0.05,
  slowHz: 3,
  /* a trick's stunt (a whole spin, roll or flip in the air, sized to the flight: stunt.ts) keeps its tuning in STUNT */
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
  nodLand: 0.18,
  nodBump: 0.15,

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
 * The render-only hop a hit tosses a kart into, `elapsed` s into its spin: metres off the road, a parabola
 * over hitHopSeconds (0 outside it). The dizzy stars ride over the head with it (vfx-juice contact.ts).
 */
export function hitHop(elapsed: number, t: KartAnimTuning = KART_ANIM): number {
  if (!(elapsed > 0) || elapsed >= t.hitHopSeconds) return 0;
  const u = elapsed / t.hitHopSeconds;
  return 4 * t.hitHop * u * (1 - u);
}

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
  /**
   * A trick's stunt (stunt.ts), about a point STUNT.pivot over the wheels' contact and on top of everything
   * above: roll (+ lifts +X), pitch (+ dips the nose), yaw (+ turns the nose to +X), whole turns and all, and
   * the metres the kart rises as it goes over; `stuntU` how far through it is (0..1; −1: none)
   */
  stuntRoll: number;
  stuntPitch: number;
  stuntYaw: number;
  stuntLift: number;
  stuntU: number;
}

export function newPose(): AnimPose {
  return { roll: 0, pitch: 0, yaw: 0, spin: 0, wobble: 0, squash: 0, heave: 0, lift: 0, lean: 0, look: 0, nod: 0, steer: 0, hop: 0, stuntRoll: 0, stuntPitch: 0, stuntYaw: 0, stuntLift: 0, stuntU: -1 };
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
 * the ones behind); a friendly shrug for a Time Trial run with no medal. Disappointed for 4th and
 * below (Adam, 26 Sept 2026: "When you lose a race, the character should look disappointed, like he
 * lost"), more so toward the back, each ending as Mario Kart World's losers do, chin up and a polite
 * clap for the winner, then a quiet, glum idle (sadReactionPose): sigh (so close: a fist tapped on
 * the wheel, a big sigh, a small head shake), deflated (a slump, a hand to the forehead, a slow head
 * shake), dejected (the back: the arms drop off the wheel, the deepest slump, the head hanging, a long
 * slow head shake). G-rated, never mocking: no tears, no anger at anyone. Render only: the sim never
 * sees it.
 */
export type Reaction = 'champion' | 'cheer' | 'bounce' | 'relief' | 'shrug' | 'sigh' | 'deflated' | 'dejected';
export const REACTIONS: readonly Reaction[] = Object.freeze(['champion', 'cheer', 'bounce', 'relief', 'shrug', 'sigh', 'deflated', 'dejected']);
/** Seconds each reaction's main move lasts; after it a gentle idle in the same mood carries on. */
export const REACTION_SECONDS: Readonly<Record<Reaction, number>> = Object.freeze({
  champion: 3.2, cheer: 3, bounce: 2.6, relief: 2.9, shrug: 2.2, sigh: 4.5, deflated: 4.9, dejected: 5.2,
});
/** The disappointed ones (4th and below): no confetti, no look at the camera until the chin comes up. */
export const sad = (r: Reaction | null): boolean => r === 'sigh' || r === 'deflated' || r === 'dejected';

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
    // (Adam, 30 Sept 2026: "remove cartoony-ness in actions": no leaps, spins or hops; the karts sit on their wheels
    // and the racers carry it with a calm, confident look and nod)
    case 'champion': {
      // a rev back on the springs, a slow look round to the camera, one firm nod
      const back = hold(t, 0.1, 0.5, 2.5, 3.1);
      out.pitch = -0.035 * back;
      out.squash = -0.025 * back;
      out.look = 0.28 * hold(t, 0.6, 1.1, 2.4, 3.0);
      out.nod = -0.08 * back + 0.12 * hump(t, 1.3, 1.8);
      out.lean = 0.05 * hold(t, 0.6, 1.1, 2.4, 3.0);
      break;
    }
    case 'cheer': {
      // a nod to the camera and a small lean out, as a pro takes a podium
      const up = hold(t, 0.1, 0.4, 2.4, 2.9);
      out.squash = -0.015 * up;
      out.nod = 0.1 * hump(t, 0.8, 1.3) - 0.04 * up;
      out.look = 0.2 * hold(t, 0.4, 0.9, 2.3, 2.9);
      out.lean = 0.06 * up;
      break;
    }
    case 'bounce': {
      // two short nods, yes-yes, and a glance
      out.nod = 0.1 * (hump(t, 0.3, 0.7) + hump(t, 0.8, 1.2));
      out.look = 0.16 * hold(t, 0.4, 0.8, 2.0, 2.5);
      out.lean = 0.04 * hold(t, 0.4, 0.8, 2.0, 2.5);
      break;
    }
    case 'relief': {
      // phew (a sag, head down), then up again and a look back at the ones behind
      const sag = hold(t, 0, 0.3, 0.55, 0.8);
      out.squash = -0.05 * sag;
      out.nod = 0.22 * sag - 0.1 * hump(t, 0.75, 1.25);
      out.lean = 0.12 * hump(t, 1.2, 1.75);
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
    case 'sigh':
    case 'deflated':
    case 'dejected':
      return sadReactionPose(kind, t, out);
  }
  // the happy ones settle into an easy sway (no bobbing: 30 Sept 2026)
  out.lean += 0.02 * Math.sin(TAU * 0.4 * t) * tail;
  return out;
}

/**
 * The beats of the disappointed reactions (s from the line), shared by the chassis and head here and
 * the rigged driver's spine, shoulders and arms (driverAnim.ts sadArms, sadBody). Timed from Mario Kart
 * World's losing reactions (every racer: the head drops as the camera comes round, a hand to the
 * forehead, a slow head shake twice, then chin up and a polite clap for the winner, the results list
 * sliding in beside them; docs/sops/kart-controller.md Decisions, 26 Sept 2026), pulled earlier to
 * fit our finish: the camera is round in front ~0.95 s in (its swing runs under the slow-mo) and the
 * results come beside the racer at ~3.6 s, so the slump holds until just before them (a blind read of
 * stills called a racer whose chin was already up "neutral") and the clap plays beside them. `sag`: the slump goes down; `shake`: the head shake; `up`:
 * the chin comes back up; `clap`: the polite clap; `tap` (sigh only): the fist is pulled down ("darn!").
 */
export const SAD_BEATS = Object.freeze({
  sigh: Object.freeze({ tap: 1.15, sag: [1.45, 1.85] as const, shake: [1.85, 3.1] as const, up: [3.2, 3.6] as const, clap: [3.65, 4.35] as const }),
  deflated: Object.freeze({ tap: -1, sag: [0.3, 0.9] as const, shake: [1.0, 2.9] as const, up: [3.1, 3.5] as const, clap: [3.6, 4.7] as const }),
  dejected: Object.freeze({ tap: -1, sag: [0.3, 1.2] as const, shake: [1.4, 3.3] as const, up: [3.4, 3.9] as const, clap: [4.0, 5.0] as const }),
});

/**
 * The quiet idle a disappointed racer settles into, beside the results (Mario Kart World's losers drive on
 * frowning there; ours have no face to frown with, so the posture carries it): the head low, slow breaths,
 * and every `every` s a small head shake, then half a cycle later a sigh (the shoulders lift and drop, the
 * head dips: driverAnim.ts sadBody).
 */
export const GLUM = Object.freeze({ nod: 0.2, sink: -0.015, breathHz: 0.28, breath: 0.01, every: 6.5, shakeHz: 1.2, shake: 0.1, sighAt: 3.2 });

/** The disappointed reactions' chassis and head (reactionPose; the arms, spine and shoulders: driverAnim.ts). Pure. */
function sadReactionPose(kind: 'sigh' | 'deflated' | 'dejected', t: number, out: AnimPose): AnimPose {
  const B = SAD_BEATS[kind], main = REACTION_SECONDS[kind];
  const sag = sstep(B.sag[0], B.sag[1], t) * (1 - sstep(B.up[0], B.up[1], t));
  switch (kind) {
    case 'sigh': {
      // so close: an "aw" (the head drops a little) as a fist comes up, then "darn!", the fist pulled down
      // once the camera is round (the head drops with it, the body jolts: driverAnim.ts sadArms), the
      // sigh (the shoulders), the head low with a small head shake, then chin up
      const aw = hold(t, 0.25, 0.6, B.sag[0], B.sag[0] + 0.3);
      const tap = hump(t, B.tap - 0.03, B.tap + 0.2);
      out.squash = -0.03 * aw - 0.05 * tap - 0.07 * sag;
      out.nod = 0.18 * aw + 0.12 * tap + 0.42 * sag;
      out.pitch = 0.025 * tap + 0.02 * sag;
      out.look = 0.24 * wave(t, B.shake[0], B.shake[1], 1.3);
      out.lean = -0.04 * sag;
      break;
    }
    case 'deflated': {
      // the slump, the head down (a hand to the forehead: driverAnim.ts), a slow head shake twice, then
      // a breath and chin up
      out.squash = -0.085 * sag + 0.03 * hump(t, B.up[0] + 0.1, B.up[1] + 0.15);
      out.nod = 0.46 * sag;
      out.pitch = 0.03 * sag;
      out.look = 0.24 * wave(t, B.shake[0], B.shake[1], 1.25);
      out.lean = -0.06 * sag;
      out.roll = -0.02 * sag;
      break;
    }
    case 'dejected': {
      // the back: slumped right over the wheel (driverAnim.ts: the spine), the head hanging, a long slow
      // head shake, then a big breath in as the chin comes up
      const breath = hump(t, B.up[0], B.up[1] + 0.2);
      out.squash = -0.11 * sag + 0.045 * breath;
      out.nod = 0.5 * sag - 0.05 * breath;
      out.pitch = 0.04 * sag;
      out.look = 0.26 * wave(t, B.shake[0], B.shake[1], 1.1);
      out.lean = -0.08 * sag;
      out.roll = -0.025 * sag;
      break;
    }
  }
  // a small nod as the polite clap starts ("well done"), then the glum idle
  out.nod += 0.06 * hump(t, B.clap[0], B.clap[0] + 0.5);
  const tail = sstep(main - 0.5, main + 0.4, t), g = GLUM, c = t % g.every, sigh = glumSigh(t);
  out.squash += (g.sink + g.breath * Math.sin(TAU * g.breathHz * t) + 0.02 * hump(sigh, 0, 0.7) - 0.015 * hump(sigh, 0.6, 1.5)) * tail;
  out.nod += (g.nod + 0.02 * Math.sin(TAU * g.breathHz * t) + 0.06 * hump(sigh, 0.6, 1.5)) * tail;
  out.look += g.shake * Math.sin(TAU * g.shakeHz * c) * hump(c, 0, 1.25) * tail;
  out.lean += 0.02 * Math.sin(TAU * 0.17 * t) * tail;
  return out;
}

/** Seconds into the glum idle's sigh this cycle (GLUM.sighAt into each GLUM.every s); the lift is its first 0.7 s, the drop to 1.5 s. */
export const glumSigh = (t: number): number => (t + GLUM.every - GLUM.sighAt) % GLUM.every;

/** What the animation needs from the kart's constants (render-only reads; `gravity` forecasts a trick's flight, the schema's 26 m/s² if absent). */
export interface AnimKartConsts { hitSpinSeconds: number; driftVisualSlip: number; gravity?: number }

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
  /** the body's wobble after a shove (a loose spring), and the extra yaw it and the dizzy sway give, on the last two ticks */
  private readonly jolt: Spring = { x: 0, v: 0 };
  private swayPrev = 0;
  private swayCurr = 0;
  /** the clock when the last spin ended (the dizzy recover runs from it) */
  private dizzyAt = -Infinity;
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
  /**
   * The trick's stunt under way (null: none): its kind and way round, the clock it started at and how long it
   * runs, and how many tricks so far (the racer's own stunts are taken in turn); a stunt cut short settles
   * upright from `settleFrom` (its angles then) to `settleTo` (the nearer whole turns) from the clock `settleAt`
   */
  private stunt: StuntKind | null = null;
  private stuntDir: 1 | -1 = 1;
  private stuntAt = 0;
  private stuntLong = 1;
  private stunts = 0;
  private settleAt = -1;
  private settleHard = false;
  private readonly settleFrom: StuntPose = { roll: 0, pitch: 0, yaw: 0, lift: 0 };
  private readonly settleTo: StuntPose = { roll: 0, pitch: 0, yaw: 0, lift: 0 };
  private readonly sp: StuntPose = { roll: 0, pitch: 0, yaw: 0, lift: 0 };
  /** the finish reaction playing (null: none) and the clock it started at; its offsets on the last two ticks */
  private reaction: Reaction | null = null;
  private reactAt = 0;
  private readonly rPrev = newPose();
  private readonly rCurr = newPose();
  /** the engine's shiver on the last two ticks (heave m, roll, pitch, nod rad), its phase, and the rev's last blip and pop seen */
  private readonly sPrev = { heave: 0, roll: 0, pitch: 0, nod: 0 };
  private readonly sCurr = { heave: 0, roll: 0, pitch: 0, nod: 0 };
  private shakePhase = 0;
  private lastBlip = -Infinity;
  private lastPop = -Infinity;

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
  /** Seconds into the reaction playing (the rigged driver's arms follow it: driverAnim.ts). */
  get reactionTime(): number { return this.clock - this.reactAt; }
  /** Seconds the reaction playing's main move lasts (0 with none). */
  get reactionMain(): number { return this.reaction ? REACTION_SECONDS[this.reaction] : 0; }

  /** The trick's stunt under way: its kind (null: none), how far through it is (0..1) and how long it runs (s); the driver's flourish rides on it (driverAnim.ts). */
  get stuntKind(): StuntKind | null { return this.stunt; }
  get stuntProgress(): number { return this.stunt ? Math.min(1, Math.max(0, (this.clock - this.stuntAt) / this.stuntLong)) : 0; }
  get stuntSeconds(): number { return this.stunt ? this.stuntLong : 0; }
  /** How many tricks this kart has done (the racer's own stunts and flourishes are taken in turn). */
  get stuntCount(): number { return this.stunts; }

  /**
   * One sim tick: `s` is the kart after the step, `input` what it drove on, `rev` its engine's own rev
   * (rev.ts, ticked already this tick; none: no engine, no rumble, as on the menu's turntable), `track`
   * the course (a trick's stunt is sized to the flight still to come over it; none: over the ground it
   * left). Reads all four, writes none.
   */
  tick(s: Readonly<KartState>, input: Readonly<InputState>, dt: number, rev?: RevView, track: TrackQuery | null = null): void {
    // a tick of no time moves nothing: the rates below divide by dt, and one NaN stays in the springs
    // for good (the podium ticks on the frame's time, 0 while paused or hidden: its three vanished, 25 Sept 2026)
    if (!(dt > 0)) return;
    const t = this.t;
    const prev = this.prev, curr = this.curr;
    prev.roll = curr.roll; prev.pitch = curr.pitch; prev.yaw = curr.yaw; prev.spin = curr.spin; prev.wobble = curr.wobble;
    prev.squash = curr.squash; prev.lean = curr.lean; prev.look = curr.look; prev.nod = curr.nod; prev.steer = curr.steer;
    prev.hop = curr.hop;
    prev.stuntRoll = curr.stuntRoll; prev.stuntPitch = curr.stuntPitch; prev.stuntYaw = curr.stuntYaw; prev.stuntLift = curr.stuntLift; prev.stuntU = curr.stuntU;
    this.swayPrev = this.swayCurr;
    const sp = this.sPrev, sc = this.sCurr;
    sp.heave = sc.heave; sp.roll = sc.roll; sp.pitch = sc.pitch; sp.nod = sc.nod;
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
      // the body wobbles on after the blow, and the driver's head snaps away from it
      this.jolt.v += t.joltPerShove * k;
      this.look.v -= t.headSnap * k;
    }
    // the same from behind or ahead (braking and boosts change speed far slower than this)
    if (!riding && Math.abs(bump) > t.shoveMin) {
      const k = clamp(bump, -t.shoveCap, t.shoveCap);
      this.pitch.v -= t.shovePitch * k;
      this.nod.v -= t.shovePitch * k;
      this.squash.v -= t.shoveSquash * Math.abs(k);
      // a ram or a head-on stop wobbles it too, the way it slides
      this.jolt.v += t.joltPerShove * 0.6 * Math.abs(k) * (s.lateralVelocity >= 0 ? 1 : -1);
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
      // the head snaps back and aside as the blow lands
      this.nod.v -= t.hitNod;
      this.look.v += this.spinDir * t.hitLook;
    }
    if (!spinning && this.wasSpinning) this.dizzyAt = this.clock;
    const trick = s.airborne.trickQueued;
    if (trick && !this.lastTrick && moved <= t.teleport) {
      // the trick: the kart stretches as it throws itself into its stunt (stunt.ts), sized to the flight still to come
      this.squash.v += t.hopStretch;
      this.startStunt(s, input, track);
    }
    // the engine: a blip rocks the kart back on its springs and the driver's head with it; a pop jolts it
    const onGround = grounded && !spinning;
    if (rev && rev.blipAt > this.lastBlip) {
      this.lastBlip = rev.blipAt;
      if (onGround) { const k = rev.blipSize; this.pitch.v -= t.blipKick * k; this.squash.v -= t.blipSquash * k; this.nod.v -= t.blipNod * k; }
    }
    if (rev && rev.popAt > this.lastPop) {
      this.lastPop = rev.popAt;
      if (onGround) { const k = rev.popSize; this.pitch.v += t.popKick * k; this.squash.v -= t.popSquash * k; }
    }

    // --- targets
    // off the road the engine revs the kart: it squats back on the rev (no engine: never)
    const free = rev ? 1 - rev.load : 0;
    const revving = onGround ? (rev?.rev ?? 0) * free : 0;
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
    const nodT = clamp(t.nodPerAccel * -aLong, -t.nodMax, t.nodMax);

    // the shiver: quicker and harder as the engine revs, pulsing with the limiter's cuts; straight on the
    // pose, none in the air, in a spin, a loop or the claw, nor under a finish reaction's own moves
    const r = rev ? rev.rev : 0;
    const amp = onGround && !this.reaction && rev
      ? free * (t.shakeIdle + t.shakeRev * r * r + t.shakeLimit * rev.limiting * (0.5 + 0.5 * rev.cut))
      : 0;
    this.shakePhase += 2 * Math.PI * lerp(t.shakeHz[0], t.shakeHz[1], r) * dt;
    if (this.shakePhase > 1e4) this.shakePhase -= 2 * Math.PI * Math.floor(this.shakePhase / (2 * Math.PI));
    const ph = this.shakePhase + this.phase;
    sc.heave = amp * (0.65 * Math.sin(ph) + 0.35 * Math.sin(0.73 * ph + 2.1));
    sc.roll = amp * t.shakeRoll * Math.sin(0.57 * ph + 1.3);
    sc.pitch = amp * t.shakePitch * Math.sin(0.81 * ph + 0.4);
    sc.nod = amp * t.shakeNod * Math.sin(ph + 0.9);

    stepSpring(this.roll, clamp(rollT, -t.rollMax, t.rollMax), t.rollSpring, dt);
    stepSpring(this.pitch, pitchT, t.pitchSpring, dt);
    stepSpring(this.squash, 0, t.squashSpring, dt);
    stepSpring(this.yaw, yawT, t.yawSpring, dt);
    stepSpring(this.lean, clamp(lean, -t.leanMax, t.leanMax), t.leanSpring, dt);
    stepSpring(this.look, clamp(look, -t.lookMax, t.lookMax), t.lookSpring, dt);
    stepSpring(this.nod, nodT, t.nodSpring, dt);
    stepSpring(this.steer, spinning ? 0 : clamp(input.steer, -1, 1) * t.steerAngle, t.steerSpring, dt);
    stepSpring(this.jolt, 0, t.joltSpring, dt);

    // --- the hit's spin: from the sim's own spin timer, so it ends with it; the toss (a hop, the nose up, a roll into the spin)
    let tumble = 0;
    curr.hop = 0;
    if (spinning) {
      const T = Math.max(1e-6, this.c.hitSpinSeconds);
      const p = clamp((T - s.status.spinRemaining) / (T * t.spinShare), 0, 1);
      const e = 1 - (1 - p) * (1 - p) * (1 - p);
      curr.spin = this.spinDir * 2 * Math.PI * t.spinTurns * e;
      curr.wobble = this.spinDir * t.spinWobble * Math.sin(3 * Math.PI * p) * (1 - p);
      const el = T - s.status.spinRemaining;
      curr.hop = hitHop(el, t);
      if (el > 0 && el < t.hitHopSeconds) tumble = Math.sin((Math.PI * el) / t.hitHopSeconds);
      // down: it lands with a squash
      if (el >= t.hitHopSeconds && el - dt < t.hitHopSeconds) this.squash.v -= t.hitLand;
    } else if (this.wasSpinning) {
      // done: the turn is whole, so drop it from both ends of the interpolation at once (no unwinding)
      prev.spin -= curr.spin;
      curr.spin = 0;
      curr.wobble = 0;
    }
    // the dizzy recover: the body sways and the head wobbles round, dying away
    let sway = 0, swayRoll = 0, dizzyLook = 0, dizzyNod = 0;
    const since = this.clock - this.dizzyAt;
    if (!spinning && since < t.dizzySeconds) {
      const fade = (1 - since / t.dizzySeconds) ** 2, ph = 2 * Math.PI * t.dizzyHz * since;
      sway = t.dizzySway * fade * Math.sin(ph);
      swayRoll = (t.dizzySway / 3) * fade * Math.sin(ph + 1);
      dizzyLook = t.dizzyLook * fade * Math.sin(ph);
      dizzyNod = t.dizzyNod * fade * Math.cos(ph);
    }

    curr.roll = clamp(this.roll.x, -t.rollMax, t.rollMax) + this.jolt.x * t.joltRoll + swayRoll + this.spinDir * t.hitRoll * tumble;
    curr.pitch = clamp(this.pitch.x, -t.pitchMax * 1.5, t.pitchMax * 1.5) - t.hitTumble * tumble;
    curr.yaw = this.yaw.x;
    this.swayCurr = this.jolt.x + sway;
    curr.squash = clamp(this.squash.x, -t.squashMax, t.squashMax);
    curr.lean = this.lean.x;
    curr.look = this.look.x + dizzyLook;
    curr.nod = clamp(this.nod.x, -t.nodMax * 1.5, t.nodMax * 1.5) + dizzyNod;
    curr.steer = this.steer.x;

    this.stepStunt(grounded || riding, spinning, moved > t.teleport);

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
    const a = this.prev, b = this.curr, t = this.t, ra = this.rPrev, rb = this.rCurr, sa = this.sPrev, sb = this.sCurr;
    const k = reduced ? t.reducedScale : 1;
    // the engine's shiver: none at all under reduced motion (its squat and rocks stay, scaled like the rest)
    const sk = reduced ? 0 : 1;
    out.roll = (lerp(a.roll, b.roll, alpha) + lerp(ra.roll, rb.roll, alpha)) * k + lerp(sa.roll, sb.roll, alpha) * sk;
    out.pitch = (lerp(a.pitch, b.pitch, alpha) + lerp(ra.pitch, rb.pitch, alpha)) * k + lerp(sa.pitch, sb.pitch, alpha) * sk;
    out.spin = reduced ? 0 : lerp(a.spin, b.spin, alpha) + lerp(ra.spin, rb.spin, alpha);
    out.wobble = reduced ? lerp(a.wobble, b.wobble, alpha) : 0;
    // (the drift's slip stays whole with reduced motion: it says which way the kart slides; a shove's wobble and the dizzy sway shrink)
    out.yaw = lerp(a.yaw, b.yaw, alpha) + (lerp(ra.yaw, rb.yaw, alpha) + lerp(this.swayPrev, this.swayCurr, alpha)) * k;
    const squash = (lerp(a.squash, b.squash, alpha) + lerp(ra.squash, rb.squash, alpha)) * k;
    out.squash = squash * t.squashShare;
    out.heave = squash * t.heavePerSquash + lerp(sa.heave, sb.heave, alpha) * sk;
    out.lean = (lerp(a.lean, b.lean, alpha) + lerp(ra.lean, rb.lean, alpha)) * k;
    out.look = (lerp(a.look, b.look, alpha) + lerp(ra.look, rb.look, alpha)) * k;
    out.nod = (lerp(a.nod, b.nod, alpha) + lerp(ra.nod, rb.nod, alpha)) * k + lerp(sa.nod, sb.nod, alpha) * sk;
    out.hop = (lerp(a.hop, b.hop, alpha) + lerp(ra.hop, rb.hop, alpha)) * k;
    out.steer = lerp(a.steer, b.steer, alpha);
    out.lift = t.halfTrack * Math.abs(Math.sin(out.roll)) + t.halfBase * Math.abs(Math.sin(out.pitch));
    // the trick's stunt: whole turns (reduced motion: a small tip over and back instead, the same way round)
    out.stuntU = a.stuntU < 0 && b.stuntU < 0 ? -1 : lerp(Math.max(0, a.stuntU), Math.max(0, b.stuntU), alpha);
    if (reduced) {
      const tip = out.stuntU > 0 && this.stunt ? STUNT.reducedTip * Math.sin(Math.PI * out.stuntU) : 0;
      out.stuntRoll = this.stunt === 'flip' ? 0 : -this.stuntDir * tip;
      out.stuntPitch = this.stunt === 'flip' ? this.stuntDir * tip : 0;
      out.stuntYaw = 0;
      out.stuntLift = 0;
    } else {
      out.stuntRoll = lerp(a.stuntRoll, b.stuntRoll, alpha);
      out.stuntPitch = lerp(a.stuntPitch, b.stuntPitch, alpha);
      out.stuntYaw = lerp(a.stuntYaw, b.stuntYaw, alpha);
      out.stuntLift = lerp(a.stuntLift, b.stuntLift, alpha);
    }
    return out;
  }

  /**
   * A trick pressed this tick (its queue just set): the stunt for it (stunt.ts pickStunt: the stick's way, the
   * brake's backflip or the racer's own) over the flight forecast from here (airLeft), a whole turn done a
   * moment before the touchdown, or a flick over and back when the flight is too short for one.
   */
  private startStunt(s: Readonly<KartState>, input: Readonly<InputState>, track: TrackQuery | null): void {
    const plan = stuntSeconds(airLeft(s, track, this.c.gravity ?? 26));
    const pick = pickStunt(s.racerId, input, this.stunts++);
    this.stunt = plan.whole ? pick.kind : 'flick';
    this.stuntDir = pick.dir;
    this.stuntAt = this.clock;
    this.stuntLong = plan.seconds;
    this.settleAt = -1;
  }

  /**
   * The stunt's pose this tick. Done: its whole turns dropped from both ends of the interpolation at once (as
   * the hit's spin), so it never unwinds. Cut short, it comes upright the nearer way over STUNT.settle: `down`
   * (on the road before it was done: a forecast gone wrong) or `hit` (a spin-out takes over); a set-down
   * (`gone`: a respawn, the claw) at once.
   */
  private stepStunt(down: boolean, hit: boolean, gone: boolean): void {
    const curr = this.curr, prev = this.prev, sp = this.sp;
    if (!this.stunt) { curr.stuntRoll = curr.stuntPitch = curr.stuntYaw = curr.stuntLift = 0; curr.stuntU = -1; return; }
    const u = (this.clock - this.stuntAt) / this.stuntLong;
    if (this.settleAt < 0 && u < 1 && (down || hit || gone)) {
      // bring it upright from where it is: each angle to its nearer whole turn
      this.settleAt = this.clock;
      this.settleHard = gone;
      const f = this.settleFrom, to = this.settleTo;
      f.roll = curr.stuntRoll; f.pitch = curr.stuntPitch; f.yaw = curr.stuntYaw; f.lift = curr.stuntLift;
      to.roll = wholeTurns(f.roll); to.pitch = wholeTurns(f.pitch); to.yaw = wholeTurns(f.yaw); to.lift = 0;
    }
    let done: boolean;
    if (this.settleAt >= 0) {
      const e = this.settleHard ? 1 : Math.min(1, (this.clock - this.settleAt) / STUNT.settle);
      const w = e * e * (3 - 2 * e), f = this.settleFrom, to = this.settleTo;
      sp.roll = f.roll + (to.roll - f.roll) * w; sp.pitch = f.pitch + (to.pitch - f.pitch) * w; sp.yaw = f.yaw + (to.yaw - f.yaw) * w;
      sp.lift = f.lift * (1 - w);
      done = e >= 1;
    } else {
      stuntPose(this.stunt, this.stuntDir, u, sp);
      done = u >= 1;
    }
    curr.stuntRoll = sp.roll; curr.stuntPitch = sp.pitch; curr.stuntYaw = sp.yaw; curr.stuntLift = sp.lift;
    curr.stuntU = Math.min(1, Math.max(0, u));
    if (!done) return;
    // whole turns: dropped from both ends at once (no unwinding); a set-down draws its end pose on both
    for (const key of ['stuntRoll', 'stuntPitch', 'stuntYaw'] as const) {
      const whole = wholeTurns(curr[key]);
      curr[key] -= whole;
      prev[key] = this.settleHard ? curr[key] : prev[key] - whole;
    }
    curr.stuntLift = 0;
    if (this.settleHard) prev.stuntLift = 0;
    curr.stuntU = -1;
    this.stunt = null;
    this.settleAt = -1;
    this.settleHard = false;
  }
}

/** The whole turns nearest `a` (rad). */
const wholeTurns = (a: number): number => Math.round(a / TAU) * TAU;
