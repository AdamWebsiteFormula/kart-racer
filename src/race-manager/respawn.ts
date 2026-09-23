// Stuck detection and respawn placement at the last hit checkpoint, main line, at
// the kart's own lateral clamped inside the road (the centreline is the racing line,
// and a kart parked there is a hazard: ai-driver Decisions 2026-09-21), facing the
// tangent, with a short input freeze. Coins and the held item stay.
import { clearBoost } from '../kart-controller/boost.ts';
import { BASE } from '../kart-controller/constants.ts';
import { cancelDrift } from '../kart-controller/drift.ts';
import { lateralOffset } from '../kart-controller/ground.ts';
import { headingOf, type InputState, type KartState, type Vec3 } from '../kart-controller/types.ts';
import { wrap01 } from '../track-builder/lut.ts';
import type { Track } from '../track-builder/track.ts';
import { RACE } from './constants.ts';
import type { KartTracker, RaceEvent, Rescue } from './types.ts';
import { resetWrongWay } from './wrongway.ts';

/** Accumulates stuckSeconds; true on the tick the kart has been stuck long enough. */
export function stepStuck(s: KartState, tr: KartTracker, input: InputState, dt: number): boolean {
  const wants = s.isPlayer ? input.throttle > RACE.stuckInputMin || input.brake > RACE.stuckInputMin : true;
  const stuck = wants && Math.abs(s.speed) < RACE.stuckSpeed && s.status.spinRemaining === 0 && s.grounded && tr.freezeRemaining === 0;
  tr.stuckSeconds = stuck ? tr.stuckSeconds + dt : 0;
  return tr.stuckSeconds + 1e-9 >= RACE.stuckSeconds;
}

/** The kart's lateral where it was, measured on its own branch, clamped inside the road. */
export function respawnLateral(s: KartState, track: Track, halfWidth: number): number {
  const lat = lateralOffset(track, s.t, s.position, s.branch).lateral;
  const max = Math.max(0, Math.min(halfWidth - BASE.kartRadius, halfWidth * RACE.respawnInset));
  if (!Number.isFinite(lat)) return 0;
  return lat < -max ? -max : lat > max ? max : lat;
}

/** Where a kart goes back to: its last checkpoint, at its own lateral (clamped), facing the road. */
export function respawnTarget(s: KartState, tr: KartTracker, track: Track): { position: Vec3; heading: number } {
  const cp = track.checkpoints[tr.lastCheckpoint];
  const p = track.sample(cp.t, respawnLateral(s, track, cp.halfWidth), 0).position;
  return { position: [p[0], p[1] + RACE.respawnLift, p[2]], heading: headingOf(cp.tangent) };
}

const smooth = (x: number) => { const k = Math.max(0, Math.min(1, x)); return k * k * (3 - 2 * k); };

/**
 * The claw comes for a kart that fell off (or is stuck): it holds where it is while the claw
 * drops to it, is lifted and carried in an arc back over the road, and lowered onto it. Race time
 * only, so a replay sees the same rescue. The kart is frozen and cannot be hit meanwhile.
 */
export function startRescue(s: KartState, tr: KartTracker, track: Track, events: RaceEvent[]): void {
  const to = respawnTarget(s, tr, track);
  tr.rescue = { from: [...s.position], fromHeading: s.heading, to: to.position, toHeading: to.heading, remaining: RACE.rescueSeconds };
  s.status.falling = false;
  tr.freezeRemaining = Math.max(tr.freezeRemaining, RACE.rescueSeconds + RACE.respawnFreezeSeconds);
  s.status.intangibleRemaining = Math.max(s.status.intangibleRemaining, RACE.rescueSeconds + RACE.respawnFreezeSeconds);
  cancelDrift(s);
  clearBoost(s);
  events.push({ type: 'rescue', racerId: s.racerId, phase: 'start' });
}

/** Where the claw holds the kart, `since` seconds into the rescue. Pure. */
export function rescuePose(r: Rescue, since: number): { position: Vec3; heading: number } {
  const D = RACE.rescueSeconds;
  const grab = 0.8 * (D / 2.4), carry = 2.0 * (D / 2.4);
  const f = r.from, t = r.to;
  if (since < grab) return { position: [f[0], f[1] + 0.3 * smooth((since - grab * 0.7) / (grab * 0.3)), f[2]], heading: r.fromHeading };
  if (since < carry) {
    const e = smooth((since - grab) / (carry - grab));
    // up to the peak over the first half, then down to just above the road
    const top = Math.max(f[1], t[1]) + RACE.rescueRise, u = (since - grab) / (carry - grab);
    const y = u < 0.5 ? f[1] + 0.3 + (top - f[1] - 0.3) * smooth(u * 2) : top + (t[1] + 1.5 - top) * smooth((u - 0.5) * 2);
    let dh = r.toHeading - r.fromHeading;
    while (dh > Math.PI) dh -= 2 * Math.PI;
    while (dh < -Math.PI) dh += 2 * Math.PI;
    return { position: [f[0] + (t[0] - f[0]) * e, y, f[2] + (t[2] - f[2]) * e], heading: r.fromHeading + dh * e };
  }
  const e = smooth((since - carry) / (D - carry));
  return { position: [t[0], t[1] + 1.5 * (1 - e), t[2]], heading: r.toHeading };
}

/** One tick of a live rescue: hold the kart in the claw; at the end set it down for real. */
export function stepRescue(s: KartState, tr: KartTracker, track: Track, dt: number, events: RaceEvent[]): void {
  const r = tr.rescue;
  if (!r) return;
  r.remaining = Math.max(0, r.remaining - dt);
  const pose = rescuePose(r, RACE.rescueSeconds - r.remaining);
  s.position = pose.position;
  s.heading = pose.heading;
  s.speed = 0;
  s.lateralVelocity = 0;
  s.verticalVelocity = 0;
  s.grounded = false;
  if (r.remaining > 1e-9) return;
  tr.rescue = undefined;
  respawnKart(s, tr, track, events);
  events.push({ type: 'rescue', racerId: s.racerId, phase: 'end' });
}

export function respawnKart(s: KartState, tr: KartTracker, track: Track, events: RaceEvent[]): void {
  const cp = track.checkpoints[tr.lastCheckpoint];
  const target = respawnTarget(s, tr, track);
  s.position = target.position;
  s.heading = target.heading;
  s.t = cp.t;
  s.branch = 0;
  s.speed = 0;
  s.lateralVelocity = 0;
  s.verticalVelocity = 0;
  s.grounded = true;
  s.status.falling = false;
  s.airborne.fromJumpId = undefined;
  s.airborne.trickQueued = false;
  s.airborne.seconds = 0;
  cancelDrift(s);
  clearBoost(s);
  s.status.intangibleRemaining = Math.max(s.status.intangibleRemaining, RACE.respawnFreezeSeconds);
  // A hair behind the checkpoint, so a kart that has never crossed the line (next ===
  // last === 0) can still "cross" the line it now sits on. Any other next checkpoint is
  // a sector ahead, so the nudge changes nothing for it.
  tr.prevT = wrap01(cp.t - 1e-7);
  tr.freezeRemaining = RACE.respawnFreezeSeconds;
  tr.stuckSeconds = 0;
  tr.respawnCount++;
  resetWrongWay(s, tr, events);
  events.push({ type: 'respawn', racerId: s.racerId, checkpoint: tr.lastCheckpoint });
}
