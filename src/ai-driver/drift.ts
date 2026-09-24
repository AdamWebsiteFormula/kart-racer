// Drift decision: plan each bend's drift once on the approach, hop just before the bend gets tight,
// steer the slide by its course so it follows the road inside its lane, charge at the full rate
// while the course can still be taken back, release at the top tier or where the bend lets go,
// and never bunny-hop. Also the trick press off a jump.
//
// The controller's drift yaw is steerRate × lerp(driftSteerMin, driftSteerMax, yawK) ×
// driftSpeedScale, where yawK chases the whole stick range ((1 + stick) / 2 toward the drift side)
// over driftYawLag and starts at 0 on the lock; the charge runs at chargeFull with the stick centred
// or in (yawK target ≥ 0.5), else chargeNeutral. So a drift always turns at least the widest line,
// and on a bend gentler than a half-stick drift the full charge swings the kart inward: it
// alternates. reachableTier() plans the tier from that before the hop.
import type { KartConstants } from '../kart-controller/constants.ts';
import { tierFor } from '../kart-controller/drift.ts';
import { driftSpeedScale, driftStickFor } from '../kart-controller/steer.ts';
import type { InputState, KartState } from '../kart-controller/types.ts';
import { AI, targetTierFor } from './constants.ts';
import { clamp } from './line.ts';
import { next, nextDrift } from './rng.ts';
import type { AiMemory, AiProfile, DriftEndReason, LineInfo } from './types.ts';
import * as dmath from '../sim-math/dmath.ts';

function countDown(x: number, dt: number): number {
  const n = x - dt;
  return n > 1e-9 ? n : 0;
}

/** rad/s the drift turns at stick fraction k toward its side. */
export function driftYaw(c: KartConstants, k: number): number {
  return c.steerRate * (c.driftSteerMin + (c.driftSteerMax - c.driftSteerMin) * k);
}

/**
 * The speed a drift is planned at: the kart's own, but not a boost's (a drift planned at a pad's 34 m/s
 * on a bend that asks little at 25 swung onto Boardwalk's inside rail once the boost ran out).
 */
export function planSpeed(s: KartState, c: KartConstants): number {
  return Math.max(1, Math.min(Math.abs(s.speed), c.topSpeed * AI.drift.planTop));
}

/** The lowest tier worth a hop for this skill: minTier, or the racer's own target if lower. */
export function minTierFor(skill: number): number {
  return Math.min(targetTierFor(skill), AI.drift.minTier);
}

/**
 * The tier the charge can reach on the bend ahead at the current speed. The drift lasts from the hop
 * (where the bend gets tight enough, LineInfo.bendStart) to where the road stops turning, no longer
 * than maxHold and ending airLead before a bump or a ramp. At half stick or more the charge runs at
 * the full rate; on a bend gentler than a half-stick drift the kart alternates half stick (full rate,
 * swinging in) with less (the slow rate, running wide), in proportion to the yaw the bend asks for.
 * 0 = the drift would not pay.
 */
export function reachableTier(s: KartState, c: KartConstants, line: LineInfo): number {
  const d = AI.drift;
  const v = planSpeed(s, c);
  const finite = Number.isFinite(line.bendMetres);
  const start = finite ? Math.max(0, line.bendStart - v * d.hopLead) : 0; // where the hop comes
  const end = Math.min(finite ? line.bendMetres : Infinity, line.airMetres - v * d.airLead);
  const seconds = Math.min(d.maxHold, (end - start) / v) - c.hopSeconds;
  if (!(seconds > 0)) return 0;
  // mean yaw over the bend (rad/s); a fake line without the scan uses the near probe
  const roadYaw = finite && line.bendMetres > start ? (line.bendAngle * v) / (line.bendMetres - start + 1e-9) : Math.abs(line.turnNear) / AI.line.turnNearSeconds;
  const yMin = driftYaw(c, 0), yHalf = driftYaw(c, 0.5);
  const mult = s.drift.chargeMultiplierRemaining > 0 ? s.drift.chargeMultiplier : 1;
  if (roadYaw - yMin < d.easePlan) {
    // a bend barely tighter than the widest drift (or gentler): the drift cannot hold it, only sweep
    // once across the road at half stick (outside to inside) and let go
    const sweep = Math.sqrt((2 * line.halfWidth * d.sweepRoom) / (v * Math.max(1e-3, yHalf - roadYaw)));
    return tierFor(c.chargeFull * 60 * mult * Math.min(seconds, sweep), c.driftTiers);
  }
  const f = clamp((roadYaw - yMin) / (yHalf - yMin), 0, 1);
  const rate = (c.chargeFull * f + c.chargeNeutral * (1 - f)) * 60 * mult;
  return tierFor(rate * seconds, c.driftTiers);
}

/** A bend worth drifting: sustained, no hazard that stays put in the drift's lane, and the drift reaches minTierFor(skill). */
export function driftWorthy(s: KartState, c: KartConstants, profile: AiProfile, line: LineInfo, skill = profile.skill): boolean {
  const near = line.turnNear, far = line.turnFar;
  if (Math.abs(far) <= profile.driftThreshold || Math.abs(near) <= profile.driftThreshold * 0.5) return false;
  if (Math.sign(near) !== Math.sign(far)) return false;
  if (line.hazardInLane) return false; // a slide cannot dodge a teacup
  if (line.bendHalfWidth < AI.line.narrowRoad) return false; // narrow where it gets tight: no hop there
  return reachableTier(s, c, line) >= minTierFor(skill);
}

/**
 * Will the hop come on this bend now? Worth drifting and the tight part within hopLead of travel:
 * the corner-speed plan then takes the drift yaw, not grip.
 */
export function driftWillFire(s: KartState, c: KartConstants, profile: AiProfile, line: LineInfo): boolean {
  return driftWorthy(s, c, profile, line) && line.bendStart <= Math.abs(s.speed) * AI.drift.hopLead;
}

/**
 * A bend worth setting up wide for: the drift will swing past the road (the road asks
 * for less yaw than a half-stick drift gives), so it needs room on the inside. A bend
 * that asks for more than that is driven from the ordinary line.
 */
export function driftNeedsRoom(s: KartState, c: KartConstants, profile: AiProfile, line: LineInfo): boolean {
  if (!driftWorthy(s, c, profile, line)) return false;
  const needed = Math.abs(line.turnNear) / AI.line.turnNearSeconds;
  return needed < driftYaw(c, 0.5);
}

/**
 * Decide each bend's drift once, on the approach, the moment the bend is worth drifting: roll
 * driftUse and keep the answer until the bend is behind (or turns the other way). The wide set-up,
 * the drift corner speed and the hop all read the plan, so a racer that grips a bend drives it from
 * the grip line at the grip speed (it used to set up wide and come in fast for a drift it then
 * declined at the hop, and lost 2-7 s a race to it). Call before lateralTarget.
 */
export function stepDriftPlan(s: KartState, c: KartConstants, m: AiMemory, profile: AiProfile, line: LineInfo): void {
  if (m.driftDir !== 0) return; // drifting: the plan stands
  const far = line.turnFar;
  if (m.driftPlan !== 0) {
    // the bend is behind, or the next one turns the other way: decide afresh
    if (Math.abs(far) <= profile.driftThreshold || Math.sign(far) !== m.driftPlanSide) m.driftPlan = 0;
    // the tight part is here and the hop never came (no room, off line, a bump): grip it, from the grip
    // line at the grip speed, not the drift set-up
    else {
      const deep = line.turnShort * m.driftPlanSide * Math.abs(s.speed) * (c.hopSeconds + c.driftYawLag) / AI.line.lookAheadMin > AI.drift.hopMidBend;
      if (m.driftPlan === 1 && deep && m.driftCooldown === 0) m.driftPlan = -1;
      return;
    }
  }
  if (line.narrow || line.nearBranch || !driftWorthy(s, c, profile, line, m.skill)) return;
  m.driftPlan = m.personality.driftUse > 0 && nextDrift(m) < m.personality.driftUse ? 1 : -1;
  m.driftPlanSide = Math.sign(far);
}

/**
 * Reads the PD steer already in `out.steer`; over-rotation is judged against the road
 * direction lookAheadMin ahead (line.roadErr), not the aim point, which swings in tight bends.
 * Writes out.drift and may override out.steer. `legal` is the kart's legal top speed now.
 */
export function stepDriftDecision(
  s: KartState, c: KartConstants, m: AiMemory, profile: AiProfile, line: LineInfo, legal: number, out: InputState, dt: number,
): void {
  const d = AI.drift;
  m.driftCooldown = countDown(m.driftCooldown, dt);
  out.drift = false;

  if (m.driftDir === 0) {
    if (m.driftCooldown > 0 || !s.grounded || s.drift.phase !== 'idle') return;
    if (line.narrow || line.nearBranch) return; // a hop at a fork or on a 3 m road ends in the water
    if (line.airAhead) return; // bumps or a ramp ahead: a drift thrown into the air slides off the road
    if (line.hazardInLane) return; // a hazard that stays put in the lane the slide sweeps
    if (s.speed < c.driftMinSpeed * legal) return;
    const near = line.turnNear, far = line.turnFar;
    const bends = Math.abs(far) > profile.driftThreshold && Math.abs(near) > profile.driftThreshold * 0.5 && Math.sign(near) === Math.sign(far);
    if (!bends) return;
    // hop hopLead before the bend gets tight: the hop does not turn and the drift locks loose and
    // tightens over driftYawLag, so a hop in the bend (as before 24 Sept 2026) slid 5-6 m wide
    if (line.bendStart > Math.abs(s.speed) * d.hopLead) return;
    // the slide sweeps to the inside: hop from the outside half, nose along the road (not swinging
    // out to a wide set-up: a hop pointing 0.5 rad outward slid 14 m across Meadow's sweeper)
    if (line.myLat * Math.sign(far) > line.halfWidth - d.apexMargin - d.hopRoom) return;
    // (the heading error to the road here: roadErr looks lookAheadMin ahead, where the bend has turned on)
    const side = Math.sign(far), v = Math.abs(s.speed);
    const under = line.turnShort * side; // the road under the nose, + = turning the drift's way
    // going along the road: not swinging out to a set-up, nor already sweeping in (a hop from a course
    // 0.4 rad inward hit Boardwalk's inside rail 0.3 s after the lock)
    if (Math.abs(line.course) > d.hopAlign) return;
    // and not deep in a tight bend: the hop does not turn and the lock is loose, so a hop at a hairpin's
    // apex flies off its outside; nor while the road under the kart still turns the other way (the
    // middle of an S: it turned away from under a hop and the drift hit the far edge in 0.4 s)
    const swing = (Math.abs(under) / AI.line.lookAheadMin) * v * (c.hopSeconds + c.driftYawLag);
    if (under > 0 ? swing > d.hopMidBend : swing > d.hopMidBend * 0.5) return;
    const reach = Math.min(targetTierFor(m.skill), reachableTier(s, c, line));
    if (reach < minTierFor(m.skill)) return; // the bend is too short or too gentle for the drift to pay
    if (m.driftPlan !== 1) return; // this bend is gripped (stepDriftPlan)
    m.driftDir = near > 0 ? 1 : -1;
    m.driftTier = reach;
    m.driftHold = 0;
    out.drift = true;
    out.steer = m.driftDir;
    return;
  }

  // holding
  const dir = m.driftDir;
  m.driftHold += dt;
  out.drift = true;
  const landWindow = c.hopSeconds * c.hopLandWindow + dt;
  // the controller cancelled it (landed without the stick, too slow, too long in the air)
  const aborted = s.drift.phase === 'idle' && m.driftHold > landWindow;
  if (aborted) { release(m, d.abortCooldown, out, 'abort'); return; }

  if (m.driftHold <= d.hopCommit || s.drift.phase !== 'drifting') {
    out.steer = dir * d.hopCommitStick; // stick on so the landing locks the drift, without the full swing
    return;
  }
  // the bend may tighten as it unfolds: the plan only ever grows
  m.driftTier = Math.max(m.driftTier, Math.min(targetTierFor(m.skill), reachableTier(s, c, line)));
  // Steer the slide by where the kart is going (its course, the velocity), not where its nose points:
  // in a drift the nose points inside the path by the slip angle, and holding the nose on the road slid
  // the kart outward at ~3 m/s into the walls (Boardwalk, Skyline). The stick acts through the yaw lag
  // and the slide (driftYawLag + 1 / gripDrift), so the course is judged where it will be after them.
  // Feed-forward the road's yaw; steer the course toward the drift's lane (the apex on the inside, or
  // the dodge when a hazard or a slow kart is near), no faster than the widest drift can take back.
  const v = Math.max(Math.abs(s.speed), 1);
  const scale = driftSpeedScale(s.speed, legal, c);
  const roadYaw = (line.turnNear * dir) / AI.line.turnNearSeconds; // rad/s toward the drift side
  const inside = line.myLat * dir; // + = toward the inside of the bend
  const psi = line.course * dir; // + = going inward of the road
  const lane = line.dodging || line.hazardInLane ? m.lateral * dir : Math.max(0, line.halfWidth - d.apexMargin);
  const lag = c.driftYawLag + 1 / c.gripDrift;
  const yawNow = driftYaw(c, s.drift.yawK) * scale;
  const psiAhead = psi + (yawNow - roadYaw) * lag;
  const ease = Math.max(d.easeMin, roadYaw - driftYaw(c, 0) * scale); // rad/s the course turns back out, stick out
  const e = lane - inside - v * psi * lag;
  const psiWant = Math.sign(e) * Math.min(d.latCourseMax, Math.sqrt((2 * ease * Math.abs(e)) / v));
  const wanted = roadYaw + d.aimGain * (psiWant - psiAhead);
  let k = clamp((wanted / (c.steerRate * scale) - c.driftSteerMin) / (c.driftSteerMax - c.driftSteerMin), 0, 1);
  if (k < 0.5 && s.drift.tier < m.driftTier) {
    // Half stick or more keeps the full charge rate, but on a bend gentler than a half-stick drift it
    // swings the course inward. Bang-bang: take the half stick while that inward course can still be
    // taken back (stick out) before the lane; else follow the lane at the slow rate. Short of the
    // release line, also for a tier that is close.
    const reach = swingIn(s, c, dir, v, scale, roadYaw, inside, psi);
    const mult = s.drift.chargeMultiplierRemaining > 0 ? s.drift.chargeMultiplier : 1;
    const nextTier = c.driftTiers[Math.min(s.drift.tier, c.driftTiers.length - 1)];
    const secondsLeft = (nextTier - s.drift.charge) / (c.chargeFull * 60 * mult);
    const close = secondsLeft <= d.chargeSecondsAhead && reach < line.halfWidth - d.edgeMargin - d.snapRoom;
    if (reach < lane || close) k = 0.5;
  }
  out.steer = dir * driftStickFor(k);
  // full stick in and still running wide of the road (a hairpin taken too fast): lift, and brake if it
  // runs wide fast, so the drift holds the bend instead of sliding across it
  if (k >= 1 && psi < -d.wideLift) { out.throttle = 0; if (psi < -2 * d.wideLift) out.brake = 1; }

  // the outside limit: where the wall stops the kart, less a margin (Boardwalk and Skyline stop it 0.85 m
  // inside the road edge, and a drift that let go only past the edge scraped the wall 265-331 times a
  // race); on an open edge, a little past the road onto the curb
  const openOut = (line.open & (dir > 0 ? 1 : 2)) !== 0;
  const outLimit = openOut ? line.halfWidth + d.outsideSlack : Math.min(line.halfWidth + d.outsideSlack, line.wall - c.kartRadius - d.wallMargin);
  const bendOver = Math.sign(line.turnNear !== 0 ? line.turnNear : line.turnFar) !== dir || line.bendMetres < v * d.exitLead;
  // touched a wall since the hop
  const walled = s.wallCooldown > 0 && s.wallCooldown > c.wallCooldownSeconds - m.driftHold;
  const err = line.roadErr;
  const tier = s.drift.tier;
  const why: DriftEndReason =
    // at the planned tier: let go at once for the top tier, else hold it (the charge may still reach the
    // next) until the bend lets go, so the boost goes onto the exit and not into the corner speed cap
    tier >= m.driftTier && tier >= targetTierFor(m.skill) ? 'tier'
    // the bend lets go (it stops turning within exitLead, or the road now turns the other way): so does the
    // drift, boost onto the exit. Held on, a drift at the widest still turns in and ran onto the inside curb.
    : bendOver && (tier >= 1 || m.driftHold > d.hopCommit + c.driftYawLag) ? 'aligned'
    : walled ? 'wall'
    : err * dir < -d.overRotate ? 'over'
    : tier >= 1 && Math.abs(err) < d.aligned && line.kappaShort * Math.abs(s.speed) < d.exitYawFraction * driftYaw(c, 0) ? 'aligned'
    : inside > line.halfWidth - d.edgeMargin ? 'edge'
    : -inside > outLimit ? 'edge'
    : m.driftHold > d.maxHold ? 'hold'
    // a hazard that stays put in the lane and the kart not yet on its dodge: grip steers round it sharper
    : line.hazardInLane && Math.abs(m.lateral - line.myLat) > d.hazardMiss ? 'hazard'
    // bumps or a ramp coming: let go on the road (the boost fires now), not in the air mid-slide
    : line.airMetres < v * d.airLead ? 'air'
    : 'none';
  if (why !== 'none') release(m, tier === 0 ? d.abortCooldown : d.cooldown, out, why);
}

/**
 * How far inside (metres, + = inside) the drift gets if the stick goes full out now: a short forward
 * run of the drift turn value (easing over driftYawLag), the slide (gripDrift) and the course against
 * the road, until the course turns back out. The course swings on well after the stick moves, and a
 * closed-form guess ran 1-2 m short on a 60 m bend. Allocation-free.
 */
export function swingIn(s: KartState, c: KartConstants, dir: number, v: number, scale: number, roadYaw: number, inside: number, psi: number): number {
  const d = AI.drift;
  const h = d.swingStep;
  const easeK = 1 - dmath.exp(-h / c.driftYawLag);
  let yawK = s.drift.yawK, beta = -dmath.atan2(s.lateralVelocity, v) * dir, y = inside, p = psi, most = inside;
  for (let t = 0; t < d.swingSeconds; t += h) {
    yawK -= yawK * easeK;
    const w = c.steerRate * (c.driftSteerMin + (c.driftSteerMax - c.driftSteerMin) * yawK) * scale;
    beta += (w - c.gripDrift * beta) * h;
    p += (c.gripDrift * beta - roadYaw) * h;
    y += v * p * h;
    if (y > most) most = y;
    if (p < 0) break;
  }
  return most;
}

function release(m: AiMemory, cooldown: number, out: InputState, why: DriftEndReason): void {
  m.driftDir = 0;
  // grip the rest of this bend: planned afresh at once, the next drift set up wide mid-bend and the
  // grip steering threw the kart, boosting, across the road into the far wall
  m.driftPlan = -1;
  m.driftHold = 0;
  m.driftCooldown = cooldown;
  m.driftEndReason = why;
  out.drift = false;
}

/**
 * Off a jump: roll once, then press the button on a tick where it makes an edge. Not over bumps on a
 * bend (`line`): each trick's boost carries it faster into the next bump, and airborne it cannot turn.
 */
export function stepTrick(s: KartState, m: AiMemory, profile: AiProfile, out: InputState, line?: LineInfo): void {
  if (s.grounded || s.airborne.fromJumpId === undefined) {
    m.trickRolled = false;
    m.trickDone = false;
    return;
  }
  if (m.driftDir !== 0) return; // a drift hop is not a jump; the drift logic owns the button
  if (!m.trickRolled) {
    m.trickRolled = true;
    m.trickDone = next(m) >= profile.trickChance; // "done" = decided not to
    if (line && line.airAhead && Math.abs(line.turnNear) > AI.line.trickBend) m.trickDone = true;
  }
  if (m.trickDone) return;
  if (s.prevDrift) { out.drift = false; return; } // let go first so the press is an edge
  out.drift = true;
  m.trickDone = true;
}
