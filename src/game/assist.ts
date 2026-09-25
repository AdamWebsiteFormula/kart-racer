// The driving assists in Settings, for a new player on a keyboard (MKW's own options are what make it
// drivable by a five-year-old): Auto-accelerate keeps the gas down from GO, and Steering assist nudges
// the kart back from the road's edge and away from a drop. They change the player's input, never the
// sim. main.ts runs them on the input it has just sampled, before session.tick, from the race state that
// tick starts from; simtick.ts then quantizes and logs what they return. So the log already holds the
// assist, and the leaderboard's replay of it (backend-leaderboard/verify.ts, which never runs this file)
// is the same race bit for bit. Pure maths on the kart and the track: no Three.js, no clock, and nothing
// made per tick.
import { emptySample } from '../ai-driver/types.ts';
import { gripFor, type KartConstants } from '../kart-controller/constants.ts';
import { inLoop } from '../kart-controller/loop.ts';
import { isRiding, isTowed } from '../kart-controller/powers.ts';
import { targetSpeed } from '../kart-controller/speed.ts';
import { driftSpeedScale } from '../kart-controller/steer.ts';
import { NEUTRAL_INPUT, type InputState, type KartState, type TrackSample } from '../kart-controller/types.ts';
import type { RacePhase } from '../race-manager/types.ts';
import * as dmath from '../sim-math/dmath.ts';
import { BUILDER } from '../track-builder/constants.ts';
import { wrap01 } from '../track-builder/lut.ts';
import type { Track } from '../track-builder/track.ts';

export const ASSIST = Object.freeze({
  /** a brake pressed this far (0..1) lifts the auto gas, so the brake brakes and reverses as ever (a resting pad trigger reads a hair over 0) */
  gasBrakeMin: 0.12,
  /** where the kart would be this many seconds on if the player kept the stick where it is: the path the assist checks, nearest first */
  probeSeconds: [0.3, 0.75] as readonly number[],
  /** the path is kept this many metres inside the road's edge (the curb counts as road): an open edge (a drop the claw fetches you from), the land, a wall */
  dropMargin: 1.2,
  landMargin: 0.8,
  wallMargin: 0.4,
  /** heading across the road: once the turn that stops the sideways run short of the safe line is this share of the whole wheel, the assist starts it */
  stopShare: 0.3,
  /** the player's own stick toward an edge takes the assist off it, from `strongLo` (all of it) to `strongHi` (none): strong input wins. Never before a drop */
  strongLo: 0.35,
  strongHi: 0.85,
  /** the assist's stick eases in and out at this many full turns of the wheel a second (a key's ramp is 1 / 0.14 s) */
  easeRate: 7,
  /** past full lock before a drop: the gas lifts, and past this much the brake comes on (`brakeGain` per unit over) */
  brakeOver: 0.4,
  brakeGain: 1.5,
  /** it leaves the kart alone under this speed (m/s), or turned further than this from the road (rad: the wrong way) */
  minSpeed: 4,
  maxHeadingErr: 1.75,
  /** another road the path runs onto (a fork, a shortcut's end) is road only within this height of the kart (m): not a road far under a bridge */
  roadHeight: 3,
  /** the assist's stick over this counts as the assist at work (the HUD badge lights up) */
  workingPush: 0.05,
  /** the HUD badge stays lit this long after the assist last turned the wheel (s), so it glows rather than flickers */
  litSeconds: 0.3,
});

/** The Settings the assists read (store.ts Settings). */
export interface AssistSettings { autoAccelerate: boolean; steeringAssist: boolean }

/**
 * Auto-accelerate: the gas is down from GO on, unless the brake is pressed (then the input is the
 * player's own, so the brake brakes and reverses). Never in the countdown: the start boost stays the
 * player's to earn with their own press on the 2 (design §7), and the logged countdown is theirs.
 */
export function autoGas(raw: Readonly<InputState>, phase: RacePhase): number {
  if (phase === 'countdown' || raw.brake >= ASSIST.gasBrakeMin) return raw.throttle;
  return 1;
}

/** One side of the road as the assist keeps to it: metres from the centre line, and whether past it is a drop. */
export interface SafeLine { line: number; drop: boolean }

/**
 * The road's safe line on one side (`side` −1 or +1: the sim's left or right) of a sample, into `out`:
 * inside the curb before an open edge (past it, the shoulder falls away to the drop), at the curb before
 * the land (drivable, but slow), or clear of a wall (a pier's kickboard, a sky road's parapet, a tunnel).
 */
export function safeLine(sample: TrackSample, side: number, kartRadius: number, out: SafeLine = { line: 0, drop: false }): SafeLine {
  const hw = sample.halfWidth, curb = hw + BUILDER.kerbWidth, wall = sample.wall ?? hw;
  out.drop = ((sample.open ?? 0) & (side < 0 ? 1 : 2)) !== 0;
  out.line = out.drop ? curb - ASSIST.dropMargin : wall > curb + 0.5 ? curb - ASSIST.landMargin : wall - kartRadius - ASSIST.wallMargin;
  return out;
}

const smoothstep = (lo: number, hi: number, x: number): number => {
  const k = Math.min(1, Math.max(0, (x - lo) / (hi - lo)));
  return k * k * (3 - 2 * k);
};
const clamp = (x: number, lo: number, hi: number): number => (x < lo ? lo : x > hi ? hi : x);
function wrapAngle(a: number): number {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

/**
 * Steering assist, for one kart. Each tick: where would the kart be `probeSeconds` on if the player kept
 * the stick where it is, and is it running sideways across the road faster than it could stop? If that
 * point is past the road's safe line (or the sideways run would carry it there), it adds the stick that
 * keeps it inside, eased in. Strong input toward the edge wins, except before a drop, where it may take
 * the whole wheel and lift the gas. A point the kart would be handed to another road at (a fork, a
 * shortcut the player chose) is road. It never decides a drift (whether one locks, or which way), and
 * it never drives: in the middle of the road it does nothing at all.
 */
export class DriveAssist {
  /** the steering assist turned the wheel or lifted the gas on the last tick */
  working = false;
  /** seconds the HUD's badge stays lit: ASSIST.litSeconds from the last tick it worked */
  private litFor = 0;
  /** the stick the steering assist added on the last tick (eased: ASSIST.easeRate) */
  private push = 0;
  private readonly out: InputState = { ...NEUTRAL_INPUT };
  private readonly here = emptySample();
  private readonly probe = emptySample();
  private readonly alt = emptySample();
  private readonly side: SafeLine = { line: 0, drop: false };
  /** this tick's strongest ask: the stick (+ = the sim's right), the side of the edge it keeps off, and whether that edge is a drop */
  private best = 0;
  private bestSide = 0;
  private bestDrop = false;
  private readonly track: Track;
  private readonly c: KartConstants;

  constructor(track: Track, c: KartConstants) {
    this.track = track;
    this.c = c;
  }

  /**
   * The player's input with the assists on it (a copy: `raw` is never written). Call once per sim tick,
   * before the tick, with the player's kart as the tick starts; what it returns is what the sim runs and logs.
   */
  apply(raw: Readonly<InputState>, s: KartState, phase: RacePhase, set: AssistSettings, dt: number): InputState {
    const o = this.out;
    o.steer = raw.steer; o.throttle = raw.throttle; o.brake = raw.brake;
    o.drift = raw.drift; o.item = raw.item; o.lookBack = raw.lookBack; o.horn = raw.horn;
    if (set.autoAccelerate) o.throttle = autoGas(raw, phase);
    this.working = false;
    this.litFor = Math.max(0, this.litFor - dt);
    // airborne (a hop too) the wheel does next to nothing; on the tick a hop lands its stick sets the drift's side (drift.ts)
    if (!set.steeringAssist || !s.grounded || s.drift.phase === 'hopping' || !this.active(s, phase)) { this.push = 0; return o; }
    this.ask(s, raw);
    // strong input toward the edge wins, but never over a drop
    const toward = raw.steer * this.bestSide;
    const want = this.best * (this.bestDrop ? 1 : 1 - smoothstep(ASSIST.strongLo, ASSIST.strongHi, toward));
    const step = ASSIST.easeRate * dt;
    // eased toward what it wants, and never wound up past full lock
    this.push = clamp(this.push + clamp(want - this.push, -step, step), -1 - raw.steer, 1 - raw.steer);
    let steer = raw.steer + this.push;
    // the drift button held, not drifting: a late drift locks at once on the stick (drift.ts). The assist never
    // changes whether one locks or which way: short of driftLateSteer it stays short, past it on the player's side
    const c = this.c, late = c.driftLateSteer;
    if (!this.bestDrop && raw.drift && s.drift.phase === 'idle') {
      if (Math.abs(raw.steer) < late) steer = clamp(steer, 0.02 - late, late - 0.02);
      else steer = raw.steer > 0 ? clamp(steer, late, 1) : clamp(steer, -1, -late);
    }
    o.steer = steer;
    // before a drop, past full lock: the turn cannot be made at this speed, so the gas lifts (and the brake comes on)
    const over = this.bestDrop ? Math.abs(raw.steer + this.best) - 1 : 0;
    if (over > 0) {
      o.throttle = 0;
      o.brake = Math.max(o.brake, Math.min(1, Math.max(0, over - ASSIST.brakeOver) * ASSIST.brakeGain));
    }
    this.working = Math.abs(this.push) > ASSIST.workingPush || over > 0;
    if (this.working) this.litFor = ASSIST.litSeconds;
    return o;
  }

  /** The HUD's badge is lit: the assist worked within the last ASSIST.litSeconds of race time. */
  get lit(): boolean { return this.litFor > 0; }

  /** Racing, driving forward along the road under its own steam: the assist has a kart to help. Leaves the road under it in `here`. */
  private active(s: KartState, phase: RacePhase): boolean {
    if (phase !== 'racing' && phase !== 'finalLap') return false;
    const st = s.status;
    if (s.finishTick !== undefined || st.spinRemaining > 0 || st.held || st.falling || inLoop(s) || isRiding(s) || isTowed(s)) return false;
    if (s.speed < ASSIST.minSpeed) return false;
    const tg = this.track.sampleInto(s.t, 0, s.branch, this.here).tangent;
    return Math.abs(wrapAngle(dmath.atan2(tg[0], tg[2]) - s.heading)) <= ASSIST.maxHeadingErr;
  }

  /** This tick's ask, into best / bestSide / bestDrop: from each look-ahead point, then from the sideways run. */
  private ask(s: KartState, raw: Readonly<InputState>): void {
    const c = this.c, V = targetSpeed(s, c).base, v = s.speed;
    const grip = (s.drift.phase === 'drifting' ? Math.min(gripFor(c, s.surface), c.gripDrift) : gripFor(c, s.surface)) * s.gripScale;
    this.best = 0; this.bestSide = 0; this.bestDrop = false;
    for (const T of ASSIST.probeSeconds) {
      const yaw = this.yawAhead(s, raw.steer, V, T);
      // along the arc the stick holds (its chord), plus what is left of the slide as grip damps it
      const h = s.heading + yaw * T * 0.5, slide = s.lateralVelocity * Math.min(T, 1 / Math.max(grip, 1e-3));
      const x = s.position[0] + v * T * dmath.sin(h) + slide * dmath.cos(s.heading);
      const z = s.position[2] + v * T * dmath.cos(h) - slide * dmath.sin(s.heading);
      const t = s.t + (v * T) / this.metresPerT(s.branch);
      const lat = this.project(x, z, t, s.branch, this.probe);
      const side = lat < 0 ? -1 : 1;
      const excess = Math.abs(lat) - safeLine(this.probe, side, c.kartRadius, this.side).line;
      if (excess <= 0 || this.takesOtherRoad(x, z, s.position[1], t, s.branch, Math.abs(lat) - this.probe.halfWidth)) continue;
      // the extra turn that is back inside the line in T: v × Δyaw × T² / 2 = excess; then the stick that turns it
      this.take((-side * 2 * excess) / (v * T * T * this.gain(s, V, T)), side, this.side.drop);
    }
    this.across(s, V);
  }

  /** One ask: the first (the nearest) wins a disagreement (an S-bend); on the same side the stronger wins. */
  private take(cand: number, side: number, drop: boolean): void {
    if (this.best === 0) { this.best = cand; this.bestSide = side; this.bestDrop = drop; return; }
    if (Math.sign(cand) !== Math.sign(this.best)) return;
    this.bestDrop ||= drop;
    if (Math.abs(cand) > Math.abs(this.best)) this.best = cand;
  }

  /**
   * Heading across the road, the look-ahead sees the edge late: a kart running sideways at u m/s stops
   * short of the safe line d metres off only with an extra turn of u² / (2 v d) (what the look-ahead asks
   * at 2d / u seconds, where it asks most). Asked for once it is a good share of the whole wheel
   * (stopShare), so a kart easing across the middle of the road is left alone.
   */
  private across(s: KartState, V: number): void {
    const here = this.here, tg = here.tangent, hl = dmath.hypot(tg[0], tg[2]) || 1, v = s.speed;
    const err = wrapAngle(s.heading - dmath.atan2(tg[0], tg[2]));
    const u = v * dmath.sin(err) + s.lateralVelocity * dmath.cos(err);
    if (Math.abs(u) < 0.5) return;
    const side = u < 0 ? -1 : 1;
    const lat = ((s.position[0] - here.position[0]) * tg[2] - (s.position[2] - here.position[2]) * tg[0]) / hl;
    const line = safeLine(here, side, this.c.kartRadius, this.side).line, drop = this.side.drop;
    // (past the line already: the look-ahead has it)
    const d = line - lat * side;
    if (d <= 0) return;
    const need = (u * u) / (2 * v * d) / this.gain(s, V, (2 * d) / Math.abs(u));
    if (need < ASSIST.stopShare) return;
    // where it would cross: a road it would be handed to there (a fork, a shortcut) is road
    const k = d / Math.abs(u), fx = dmath.sin(s.heading), fz = dmath.cos(s.heading);
    const x = s.position[0] + (v * fx + s.lateralVelocity * fz) * k, z = s.position[2] + (v * fz - s.lateralVelocity * fx) * k;
    if (this.takesOtherRoad(x, z, s.position[1], s.t + (v * k) / this.metresPerT(s.branch), s.branch, line - here.halfWidth)) return;
    this.take(-side * need, side, drop);
  }

  /** The kart's yaw rate over the next T seconds with the stick at `steer` (rad/s, + right), as kart-controller steer.ts turns it. */
  private yawAhead(s: KartState, steer: number, V: number, T: number): number {
    const c = this.c;
    if (s.drift.phase === 'drifting') {
      // the drift's turn value chases the stick over driftYawLag: taken halfway along
      const target = (1 + clamp(steer * s.drift.direction, -1, 1)) / 2;
      const k = target + (s.drift.yawK - target) * dmath.exp(-T / (2 * c.driftYawLag));
      return s.drift.direction * c.steerRate * (c.driftSteerMin + (c.driftSteerMax - c.driftSteerMin) * k) * driftSpeedScale(s.speed, V, c);
    }
    return steer * this.gripGain(s, V);
  }

  /** Yaw rate per unit of stick in a grip turn (steer.ts yawRate). */
  private gripGain(s: KartState, V: number): number {
    const c = this.c, v = Math.abs(s.speed);
    if (V <= 0) return 0;
    return c.steerRate * Math.min(1, v / (c.steerLowSpeed * V)) * (1 - c.steerFalloff * Math.min(1, v / V));
  }

  /** How much the yaw rate over T moves per unit of stick: the grip turn's, or a drift's (its line tightens or widens with the stick, lagging). */
  private gain(s: KartState, V: number, T: number): number {
    const c = this.c;
    if (s.drift.phase !== 'drifting') return Math.max(1e-3, this.gripGain(s, V));
    const lag = 1 - dmath.exp(-T / (2 * c.driftYawLag));
    return Math.max(1e-3, c.steerRate * (c.driftSteerMax - c.driftSteerMin) * 0.5 * driftSpeedScale(s.speed, V, c) * lag);
  }

  /** Metres of road per unit of main-equivalent t on a branch (the main line: its length). */
  private metresPerT(branch: number): number {
    const b = this.track.branches.list[branch];
    return !b || b.isMain ? this.track.length : b.lut.length / b.span;
  }

  /**
   * The world point (x, z) seen from the road on `branch` near main-equivalent t `t0`: its lateral there
   * (+ = the sim's right; the road's sample left in `out`). Walks t along the road until the point is square to it.
   */
  private project(x: number, z: number, t0: number, branch: number, out: TrackSample): number {
    let t = wrap01(t0);
    const mpt = this.metresPerT(branch);
    for (let k = 0; ; k++) {
      this.track.sampleInto(t, 0, branch, out);
      const tg = out.tangent, hl = dmath.hypot(tg[0], tg[2]) || 1;
      const along = ((x - out.position[0]) * tg[0] + (z - out.position[2]) * tg[2]) / hl;
      if (k === 2 || Math.abs(along) < 0.05) return ((x - out.position[0]) * tg[2] - (z - out.position[2]) * tg[0]) / hl;
      t = wrap01(t + along / mpt);
    }
  }

  /**
   * Would a kart at (x, z), `pastHere` metres past its own road's edge, be on another open road near its
   * height (a shortcut it steers into, the road a shortcut rejoins)? As the controller hands a kart over
   * (track-builder branches.ts nearest): further inside that road's edge by branchHysteresis. Only just
   * onto it is not enough: at a fork's point the kart is still on its own road, and meets that road's wall.
   */
  private takesOtherRoad(x: number, z: number, y: number, t: number, branch: number, pastHere: number): boolean {
    const list = this.track.branches.list;
    if (list.length < 2) return false;
    for (const b of list) {
      if (b.index === branch || !b.open || !b.overlaps(wrap01(t), 0)) continue;
      const past = Math.abs(this.project(x, z, t, b.index, this.alt)) - this.alt.halfWidth;
      if (past <= 0 && past < pastHere - BUILDER.branchHysteresis && Math.abs(this.alt.groundY - y) < ASSIST.roadHeight) return true;
    }
    return false;
  }
}
