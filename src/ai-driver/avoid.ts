// Nudges to the lateral target, lowest priority applied first so the higher one wins:
// coin → balloon → boost pad → pass → declined fork → hazard → hazard spawn spot → slow or stopped kart.
// Everything is measured in the track frame: metres ahead along the spline and
// metres right of the centreline.
import { BASE } from '../kart-controller/constants.ts';
import type { KartState } from '../kart-controller/types.ts';
import type { FeatureTimer } from '../race-manager/types.ts';
import { signedOffset } from '../track-builder/branches.ts';
import { BUILDER } from '../track-builder/constants.ts';
import type { Track } from '../track-builder/track.ts';
import type { ActiveHazard } from '../track-builder/types.ts';
import { AI } from './constants.ts';
import { clamp } from './line.ts';
import type { LineInfo, Scratch } from './types.ts';

export interface AvoidContext {
  track: Track;
  karts: readonly KartState[];
  hazards: readonly ActiveHazard[];
  pickupStates: readonly FeatureTimer[];
  coinStates: readonly FeatureTimer[];
  /** feature index → pickupStates / coinStates index, −1 when not that kind */
  pickupOf: readonly number[];
  coinOf: readonly number[];
  sc: Scratch;
}

/** Signed lateral of a world position from the centreline at main-equivalent t on `branch`. */
export function lateralAt(ctx: AvoidContext, t: number, branch: number, pos: readonly number[]): number {
  const c = ctx.track.sampleInto(t, 0, branch, ctx.sc.tmp);
  const tg = c.tangent, p = c.position;
  return (pos[0] - p[0]) * tg[2] - (pos[2] - p[2]) * tg[0];
}

/** The side with more road, away from an obstacle at `obsLat`; falls back to the kart's own side. */
function awayFrom(obsLat: number, myLat: number): number {
  if (obsLat > 0.05) return -1;
  if (obsLat < -0.05) return 1;
  return myLat >= obsLat ? 1 : -1;
}

/** Move `lat` off an obstacle at obsLat by `clear` metres if it is inside `clear` of it. */
function dodge(lat: number, obsLat: number, clear: number, myLat: number): number {
  if (Math.abs(lat - obsLat) >= clear) return lat;
  return obsLat + awayFrom(obsLat, myLat) * clear;
}

// applyAvoid's scratch, reused every call: the slow karts ahead, and the hazards that stay put with their clearance
const slowLat: number[] = [];
const aheadD: number[] = [], aheadLat: number[] = [];
const hzLat: number[] = [], hzClear: number[] = [];
const EPS = 1e-6;

/**
 * The lateral inside ±edge that keeps kartClear from every slow kart ahead at once (or gets
 * furthest from them on a road too narrow for it), still clear of the hazards where there is
 * room for both, and the least move from both `lat` and where the kart is (`myLat`), so the side
 * it passes on does not flip under it. Candidates: each side of every obstacle, and both edges.
 */
function pastSlowKarts(lat: number, myLat: number, edge: number, kartClear: number, nSlow: number, nHz: number): number {
  let best = lat, bestGap = -1, bestHit = true, bestD = Infinity;
  for (let k = 0; k < 2 * (nSlow + nHz + 1); k++) {
    const i = k >> 1, side = k & 1 ? 1 : -1;
    const c = clamp(i < nSlow ? slowLat[i] + side * kartClear : i < nSlow + nHz ? hzLat[i - nSlow] + side * hzClear[i - nSlow] : side * edge, -edge, edge);
    let gap = kartClear, hit = false;
    for (let j = 0; j < nSlow; j++) gap = Math.min(gap, Math.abs(c - slowLat[j]));
    for (let j = 0; j < nHz; j++) if (Math.abs(c - hzLat[j]) < hzClear[j] - EPS) hit = true;
    const d = Math.abs(c - lat) + Math.abs(c - myLat);
    if (gap > bestGap + EPS || (gap > bestGap - EPS && (hit !== bestHit ? !hit : d < bestD))) {
      best = c; bestGap = gap; bestHit = hit; bestD = d;
    }
  }
  return best;
}

/** `pick` (−1..1): where across a balloon row this racer goes for, as a fraction of halfWidth (AiMemory.balloonPick). */
export function applyAvoid(s: KartState, ctx: AvoidContext, line: LineInfo, skill: number, branchChoice: number, lat: number, pick = 0): number {
  const a = AI.avoid;
  const { track, karts } = ctx;
  const len = track.length;
  const hw = line.halfWidth;
  const kartR = BASE.kartRadius;
  // the most a dodge can move off an obstacle and still fit on this road
  const fit = Math.max(0.5, hw - kartR - 0.2);
  const kartClear = Math.min(a.stoppedClearance, fit);
  const passClear = Math.min(2 * kartR + 0.3, fit);

  // the other karts ahead on this branch: how far, and where across the road (the balloon pick and the passes use them)
  let nAhead = 0;
  for (let i = 0; i < karts.length; i++) {
    const o = karts[i];
    if (o === s || o.isGhost || o.branch !== s.branch) continue;
    const d = signedOffset(o.t, s.t) * len;
    if (d <= 0 || d > a.seekDistance) continue;
    aheadD[nAhead] = d; aheadLat[nAhead++] = lateralAt(ctx, o.t, o.branch, o.position);
  }

  // --- seek: coins, balloons, boost pads (lowest priority) ---
  const feats = track.features;
  let bestD = Infinity, bestLat = lat, bestKind = 0; // 1 coin, 3 pad
  let bD = Infinity, bOff = Infinity, bLat = lat; // the balloon picked
  for (let i = 0; i < feats.length; i++) {
    const f = feats[i];
    if (f.branch !== s.branch) continue;
    let kind = 0;
    if (f.kind === 'coin') {
      if (s.coins >= BASE.coinCap) continue;
      const j = i < ctx.coinOf.length ? ctx.coinOf[i] : -1;
      if (j < 0 || ctx.coinStates[j].respawnRemaining > 0) continue;
      kind = 1;
    } else if (f.kind === 'pickup') {
      const heldFull = s.item.held !== 'none' || s.item.rouletteRemaining > 0;
      const nextFull = s.item.next !== 'none' || s.item.nextRouletteRemaining > 0;
      if (heldFull && nextFull) continue; // two slots: seek while either is free
      const j = i < ctx.pickupOf.length ? ctx.pickupOf[i] : -1;
      if (j < 0 || ctx.pickupStates[j].respawnRemaining > 0) continue;
      kind = 2;
    } else if (f.kind === 'boostPad') {
      if (skill < a.padSkill) continue;
      kind = 3;
    } else continue;
    const d = signedOffset(f.t, s.t) * len;
    if (d <= 0 || d > a.seekDistance) continue;
    if (kind === 2) {
      // a balloon: any free one in the row the kart can still steer to (reach grows with the distance
      // left), the one nearest this racer's own pick across the row. Only the one on its line, it was
      // before 24 Sept 2026: under the 3.6 m spacing, so the whole pack aimed at one balloon.
      if (Math.abs(f.lateral - line.myLat) > Math.max(a.seekLateral, d * a.seekSlope)) continue;
      if (Math.abs(f.lateral) > hw - kartR) continue;
      // a kart between us and the row, lined up on this balloon, pops it first
      let claimed = false;
      for (let j = 0; j < nAhead; j++) if (aheadD[j] < d && Math.abs(aheadLat[j] - f.lateral) < a.claimWidth) { claimed = true; break; }
      const off = Math.abs(f.lateral - pick * hw) + (claimed ? a.claimCost : 0);
      if (bD === Infinity || d < bD - a.rowGap || (d <= bD + a.rowGap && off < bOff)) { bD = d; bOff = off; bLat = f.lateral; }
      continue;
    }
    if (Math.abs(f.lateral - lat) > a.seekLateral) continue;
    // a pad beats a balloon beats a coin; nearer wins inside a kind
    if (kind > bestKind || (kind === bestKind && d < bestD)) { bestKind = kind; bestD = d; bestLat = f.lateral; }
  }
  if (bD < Infinity && bestKind < 3) bestLat = bLat;
  lat = bestLat;

  // --- other karts: draft or pass; a slow one is noted and dodged last ---
  let nSlow = 0;
  for (let i = 0; i < karts.length; i++) {
    const o = karts[i];
    if (o === s || o.isGhost) continue;
    // along the track, wrap-aware: a kart that never crossed the line is still ahead of you
    const d = signedOffset(o.t, s.t) * len;
    if (d <= 0 || d > a.stoppedLookAhead) continue;
    if (o.branch !== s.branch) continue;
    const slow = o.speed < a.slowKartSpeed || o.status.spinRemaining > 0 || o.status.intangibleRemaining > 0 || o.finishTick !== undefined;
    if (slow) {
      slowLat[nSlow++] = lateralAt(ctx, o.t, o.branch, o.position);
      continue;
    }
    if (d > a.avoidLookAhead) continue;
    const oLat = lateralAt(ctx, o.t, o.branch, o.position);
    if (line.narrow || line.nearBranch || d > a.passDistance) continue;
    const closing = s.speed - o.speed;
    if (closing > a.passClosing || d < a.touchDistance) lat = dodge(lat, oLat, passClear, line.myLat);
    else if (bD === Infinity && d <= BASE.slipstreamLength && Math.abs(lat - oLat) < BASE.slipstreamHalfWidth) lat = oLat; // sit in the wake (not when going for a balloon)
  }

  // --- a declined fork ahead: keep to the far side so the controller does not switch us onto it ---
  if (branchChoice < 0 && line.branchAhead === -branchChoice && line.branchSide !== 0) {
    const keep = AI.line.declineFraction * hw;
    if (lat * -line.branchSide < keep) lat = -line.branchSide * keep;
  }

  // --- hazards ---
  // dodged from hazardSeconds of travel (a lane change takes time), and the drift's lane checked further
  const v = Math.abs(s.speed);
  const hzReach = Math.max(a.hazardLookAhead, v * a.hazardSeconds);
  const laneReach = v * AI.drift.hazardSeconds;
  // the lane a drift sweeps: from where the kart is to its apex on the inside
  const apex = Math.sign(line.turnNear) * Math.max(0, hw - AI.drift.apexMargin);
  const laneLo = Math.min(line.myLat, apex), laneHi = Math.max(line.myLat, apex);
  line.hazardInLane = false;
  line.dodging = false;
  line.hopRing = false;
  const before = lat;
  let nHz = 0;
  const hz = ctx.hazards;
  if (hz.length) {
    const window = Math.max(a.rollingLookAhead, hzReach, laneReach) / len + 0.02;
    for (let i = 0; i < hz.length; i++) {
      const h = hz[i];
      if (h.type === 'gust' || h.type === 'vent') continue; // a gust is steered through; a vent is a free trick
      if (h.ground) {
        // a shock wave along the ground (the Rumblesaur's footstep ring): hop it, as a player would, when
        // it is about to reach the kart. Steering round a ring of points swerved the pack into the foot.
        const gap = Math.hypot(h.position[0] - s.position[0], h.position[2] - s.position[2]) - h.radius - kartR;
        if (gap < v * a.ringHop) line.hopRing = true;
        continue;
      }
      // one that stays put is dodged from hazardSeconds of travel; a creature or a crossing cart moves on,
      // so where it is now only matters close by
      const stays = h.type === 'static' || h.type === 'falling';
      const reach = h.type === 'rolling' ? a.rollingLookAhead : stays ? hzReach : a.hazardLookAhead;
      const ht = track.nearestT(h.position, s.t, window);
      const d = signedOffset(ht, s.t) * len;
      if (d <= 0 || d > (stays ? Math.max(reach, laneReach) : reach)) continue;
      const hLat = lateralAt(ctx, ht, 0, h.position);
      if (Math.abs(hLat) > hw + h.radius) continue; // off the road
      const clear = Math.min(a.dodgeClearance + h.radius, fit);
      if (stays && hLat > laneLo - clear && hLat < laneHi + clear) line.hazardInLane = true;
      if (d > reach) continue;
      lat = dodge(lat, hLat, clear, line.myLat);
      // kept clear of when passing a slow kart only if it stays put (a rolling one by its lane, below):
      // swerving round a stopped kart for a creature or a crossing cart that moves on crosses in front of it
      if (stays) { hzLat[nHz] = hLat; hzClear[nHz++] = clear; }
    }
  }

  // where rolling and falling hazards (re)appear: give the spot a berth even when empty,
  // because one can land right in front of the kart
  const defs = track.def.hazards;
  if (defs) {
    for (let i = 0; i < defs.length; i++) {
      const h = defs[i];
      if (h.type !== 'rolling' && h.type !== 'falling') continue;
      const d = signedOffset(h.t, s.t) * len;
      const clear = Math.min(a.dodgeClearance + BUILDER.hazardRadius, fit);
      // a rolling hazard's whole lane, its spot back to where it respawns, is kept clear of when passing
      // a slow kart: which side to pass on must not flip each time a barrel rolls into range
      if (h.type === 'rolling' && d > 0 && d - (h.speed ?? 0) * (h.period ?? 1) < a.stoppedLookAhead) { hzLat[nHz] = h.lateral ?? 0; hzClear[nHz++] = clear; }
      if (h.type === 'falling' && d > 0 && d < laneReach && (h.lateral ?? 0) > laneLo - clear && (h.lateral ?? 0) < laneHi + clear) line.hazardInLane = true;
      if (d < -a.spawnBehind || d > a.hazardLookAhead) continue;
      lat = dodge(lat, h.lateral ?? 0, clear, line.myLat);
      hzLat[nHz] = h.lateral ?? 0; hzClear[nHz++] = clear;
    }
  }

  const edge = Math.max(0, Math.min(hw - AI.line.edgeMargin, hw - kartR - 0.3));
  if (Math.abs(lat - before) > EPS) line.dodging = true;
  lat = clamp(lat, -edge, edge);
  // --- slow, spun or stopped karts ahead (highest priority), all at once: a stopped kart is a sure
  // hit, a hazard lane may be empty when we get there. Dodged before the hazards and one at a time,
  // Harbour's barrel dodge steered the field onto a kart stopped 35 m short of the barrels (bug hunt 2,
  // 24 Sept 2026: 30 of 85 passes hit it at 20–35 m/s), and a second slow kart's dodge could undo the first's.
  for (let j = 0; j < nSlow; j++) {
    if (Math.abs(lat - slowLat[j]) < kartClear - EPS) { line.dodging = true; return pastSlowKarts(lat, line.myLat, edge, kartClear, nSlow, nHz); }
  }
  return lat;
}
