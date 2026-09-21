// Nudges to the lateral target, lowest priority applied first so the higher one wins:
// coin → balloon → boost pad → pass → slow or stopped kart → hazard.
// Everything is measured in the track frame: metres ahead along the spline and
// metres right of the centreline.
import { BASE } from '../kart-controller/constants.ts';
import type { KartState } from '../kart-controller/types.ts';
import type { FeatureTimer } from '../race-manager/types.ts';
import { signedOffset } from '../track-builder/branches.ts';
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

export function applyAvoid(s: KartState, ctx: AvoidContext, line: LineInfo, skill: number, lat: number): number {
  const a = AI.avoid;
  const { track, karts } = ctx;
  const len = track.length;
  const hw = line.halfWidth;
  const kartR = BASE.kartRadius;
  // the most a dodge can move off an obstacle and still fit on this road
  const fit = Math.max(0.5, hw - kartR - 0.2);
  const kartClear = Math.min(2 * kartR + 0.4, fit);
  const passClear = Math.min(2 * kartR + 0.3, fit);

  // --- seek: coins, balloons, boost pads (lowest priority) ---
  const feats = track.features;
  let bestD = Infinity, bestLat = lat, bestKind = 0; // 1 coin, 2 balloon, 3 pad
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
      if (s.item.held !== 'none' || s.item.rouletteRemaining > 0) continue;
      const j = i < ctx.pickupOf.length ? ctx.pickupOf[i] : -1;
      if (j < 0 || ctx.pickupStates[j].respawnRemaining > 0) continue;
      kind = 2;
    } else if (f.kind === 'boostPad') {
      if (skill < a.padSkill) continue;
      kind = 3;
    } else continue;
    const d = signedOffset(f.t, s.t) * len;
    if (d <= 0 || d > a.seekDistance) continue;
    if (Math.abs(f.lateral - lat) > a.seekLateral) continue;
    // a pad beats a balloon beats a coin; nearer wins inside a kind
    if (kind > bestKind || (kind === bestKind && d < bestD)) { bestKind = kind; bestD = d; bestLat = f.lateral; }
  }
  lat = bestLat;

  // --- other karts: draft, pass, or dodge a slow one ---
  for (let i = 0; i < karts.length; i++) {
    const o = karts[i];
    if (o === s || o.isGhost) continue;
    const d = o.distanceAlong - s.distanceAlong;
    if (d <= 0 || d > a.avoidLookAhead) continue;
    if (o.branch !== s.branch) continue;
    const oLat = lateralAt(ctx, o.t, o.branch, o.position);
    const slow = o.speed < a.slowKartSpeed || o.status.spinRemaining > 0 || o.status.intangibleRemaining > 0 || o.finishTick !== undefined;
    if (slow) {
      lat = dodge(lat, oLat, kartClear, line.myLat);
      continue;
    }
    if (line.narrow || line.nearBranch || d > a.passDistance) continue;
    const closing = s.speed - o.speed;
    if (closing > a.passClosing || d < a.touchDistance) lat = dodge(lat, oLat, passClear, line.myLat);
    else if (d <= BASE.slipstreamLength && Math.abs(lat - oLat) < BASE.slipstreamHalfWidth) lat = oLat; // sit in the wake
  }

  // --- hazards (highest priority) ---
  const hz = ctx.hazards;
  if (hz.length) {
    const window = a.hazardLookAhead / len + 0.02;
    for (let i = 0; i < hz.length; i++) {
      const h = hz[i];
      if (h.type === 'gust') continue;
      const ht = track.nearestT(h.position, s.t, window);
      const d = signedOffset(ht, s.t) * len;
      if (d <= 0 || d > a.hazardLookAhead) continue;
      const hLat = lateralAt(ctx, ht, 0, h.position);
      if (Math.abs(hLat) > hw + h.radius) continue; // off the road
      lat = dodge(lat, hLat, Math.min(a.dodgeClearance + h.radius, fit), line.myLat);
    }
  }

  const edge = Math.max(0, Math.min(hw - AI.line.edgeMargin, hw - kartR - 0.3));
  return clamp(lat, -edge, edge);
}
