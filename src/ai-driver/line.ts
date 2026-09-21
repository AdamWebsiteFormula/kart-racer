// The road ahead: look-ahead distance, turn angles, the personality lateral target
// and the shortcut choice. Pure pursuit on the spline, turbo-kart-rush shape.
import type { KartConstants } from '../kart-controller/constants.ts';
import { headingOf, type KartState } from '../kart-controller/types.ts';
import { signedOffset } from '../track-builder/branches.ts';
import { wrap01 } from '../track-builder/lut.ts';
import type { Track } from '../track-builder/track.ts';
import { AI } from './constants.ts';
import { driftNeedsRoom } from './drift.ts';
import { next } from './rng.ts';
import type { AiMemory, AiProfile, LineInfo, Scratch } from './types.ts';

export function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

export function wrapAngle(a: number): number {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

/** L = clamp(speed × gain, min, max) metres. */
export function lookAhead(speed: number): number {
  const l = AI.line;
  return clamp(Math.abs(speed) * l.lookAheadGain, l.lookAheadMin, l.lookAheadMax);
}

/** Minimum speed used to place the turn samples, so a slow kart still looks ahead. */
const MIN_PROBE_SPEED = 5;

/** Fills `out` from three samples. Allocation-free. */
export function readLine(s: KartState, track: Track, m: AiMemory, sc: Scratch, out: LineInfo): LineInfo {
  const l = AI.line;
  const len = track.length;
  const branch = m.branchChoice > 0 ? m.branchChoice : s.branch;
  const v = Math.max(Math.abs(s.speed), MIN_PROBE_SPEED);
  track.sampleInto(s.t, 0, s.branch, sc.here);
  track.sampleInto(wrap01(s.t + (v * l.turnNearSeconds) / len), 0, branch, sc.near);
  track.sampleInto(wrap01(s.t + (v * l.turnFarSeconds) / len), 0, branch, sc.far);
  const h = headingOf(sc.here.tangent);
  out.turnNear = wrapAngle(headingOf(sc.near.tangent) - h);
  out.turnFar = wrapAngle(headingOf(sc.far.tangent) - h);
  out.probeNear = v * l.turnNearSeconds;
  // a fixed short probe catches the tightest part of a bend the 1.2 s probe averages out
  track.sampleInto(wrap01(s.t + l.lookAheadMin / len), 0, branch, sc.short);
  const hShort = headingOf(sc.short.tangent);
  const turnShort = wrapAngle(hShort - h);
  out.kappaShort = Math.abs(turnShort) / l.lookAheadMin;
  out.kappa = Math.max(out.kappaShort, Math.abs(out.turnNear) / out.probeNear);
  out.roadErr = wrapAngle(hShort - s.heading);
  out.halfWidth = sc.here.halfWidth;
  out.narrow = sc.here.halfWidth < l.narrowRoad;
  let L = lookAhead(s.speed);
  // a branch entry or exit inside the look-ahead: the road is about to fork or rejoin
  let nearBranch = s.branch !== 0 || m.branchChoice > 0;
  out.branchAhead = 0;
  out.branchSide = 0;
  const list = track.branches.list;
  for (let i = 1; i < list.length; i++) {
    const b = list[i];
    if (!b.open) continue;
    const de = signedOffset(b.entryT, s.t) * len, dx = signedOffset(b.exitT, s.t) * len;
    if ((de > -L && de < L) || (dx > -L && dx < L)) nearBranch = true;
    if (s.branch === 0 && de > 0 && de < L && out.branchAhead === 0) {
      // which way does it peel off? Its line a little past the entry, seen from the main line.
      const tPast = wrap01(b.entryT + b.span * 0.25);
      const bp = track.sampleInto(tPast, 0, i, sc.tmp).position;
      const mp = track.sampleInto(tPast, 0, 0, sc.ahead);
      const side = (bp[0] - mp.position[0]) * mp.tangent[2] - (bp[2] - mp.position[2]) * mp.tangent[0];
      out.branchAhead = i;
      out.branchSide = side > 0.3 ? 1 : side < -0.3 ? -1 : 0;
    }
  }
  if (out.narrow || nearBranch) L = Math.max(l.lookAheadMin, L * l.narrowLookAhead);
  out.L = L;
  out.nearBranch = nearBranch;
  out.branch = branch;
  const tg = sc.here.tangent, p = sc.here.position;
  // right = (tangent.z, 0, −tangent.x)
  out.myLat = (s.position[0] - p[0]) * tg[2] - (s.position[2] - p[2]) * tg[0];
  return out;
}

/** Personality lane + inside-corner bias + tick-driven wander, clamped. Off the road surface: the centre. */
export function lateralTarget(s: KartState, c: KartConstants, m: AiMemory, profile: AiProfile, line: LineInfo, seconds: number): number {
  const l = AI.line;
  // shortcuts are narrow: hold the middle, and aim for it before the fork
  if (s.branch !== 0 || line.narrow || m.branchChoice > 0) return 0;
  if (s.surface === 'dirt' || s.surface === 'mud') return 0;
  const hw = line.halfWidth;
  const lane = m.personality.lateralBias * l.laneHalfFraction * hw;
  // a drift-worthy bend coming and this racer drifts: set up wide so the drift has room
  if (m.driftDir === 0 && m.personality.driftUse > 0 && driftNeedsRoom(s, c, profile, line)) {
    return -Math.sign(line.turnFar) * l.outsideFraction * hw;
  }
  // positive turn = right turn = inside on the right = positive lateral
  const inside = clamp(line.turnNear * l.insideGain, -l.insideBiasMax, l.insideBiasMax) * hw;
  const wander = m.wanderAmp * Math.sin((2 * Math.PI * seconds) / m.wanderPeriod + m.wanderPhase);
  const max = l.lateralMaxFraction * hw;
  return clamp(lane + inside + wander, -max, max);
}

/**
 * Decide once per approach whether to take an open shortcut whose entry is within
 * 2L ahead. branchChoice > 0 = taking it, < 0 = declined it, 0 = nothing pending.
 */
export function chooseBranch(s: KartState, track: Track, m: AiMemory, profile: AiProfile, line: LineInfo, onlyShortcut?: string): void {
  if (s.branch !== 0) { m.branchChoice = 0; return; }
  const list = track.branches.list;
  const len = track.length;
  if (m.branchChoice !== 0) {
    const b = list[Math.abs(m.branchChoice)];
    if (!b || !b.open) { m.branchChoice = 0; return; }
    const d = signedOffset(b.entryT, s.t) * len;
    // a taken fork stays taken past the entry: the two roads overlap there and the
    // controller only moves the kart onto the branch once it has left the main road
    if (m.branchChoice > 0 ? d < -AI.line.branchCommitMetres : d < 0) m.branchChoice = 0;
    return;
  }
  for (let i = 1; i < list.length; i++) {
    const b = list[i];
    if (!b.open) continue;
    const d = signedOffset(b.entryT, s.t) * len;
    if (d <= 0 || d > 2 * line.L) continue;
    // a narrow shortcut is slower for the AI (it centres and brakes): only as a catch-up
    const narrow = b.lut.sample(0.5, 0).halfWidth < AI.line.narrowRoad;
    const able = m.skill >= profile.shortcutSkill;
    const take = onlyShortcut !== undefined
      ? b.id === onlyShortcut
      : able && (m.rb >= AI.rubber.shortcutRb || (!narrow && next(m) < m.personality.aggression));
    m.branchChoice = take ? i : -i;
    return;
  }
}
