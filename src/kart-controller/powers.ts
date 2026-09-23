// The item powers that change how a kart moves (design §8). The items system turns them on
// through KartState.status; the controller only reads them: the two autopilots (the Strike Ball
// rolling along the road, the Grapple Anchor reeling toward another kart) steer and hold speed
// on their own.
import type { KartConstants } from './constants.ts';
import { rightOf, type KartState, type TrackQuery, type Vec3 } from './types.ts';

/** Strike Ball: rolling on autopilot; items, hazards and fog bounce off it. */
export function isRiding(s: KartState): boolean { return s.status.rideRemaining > 0; }
export function isTowed(s: KartState): boolean { return s.status.towRemaining > 0 && s.status.towTarget >= 0; }

/** Collision radius: the Strike Ball is bigger than a kart. */
export function radiusOf(s: KartState, c: KartConstants): number {
  return isRiding(s) ? c.rideRadius : c.kartRadius;
}

/** The Strike Ball's aim: the centreline `rideLookahead` metres ahead on the kart's branch. */
export function rideAim(s: KartState, track: TrackQuery, c: KartConstants, out: Vec3): Vec3 {
  let t = s.t + c.rideLookahead / track.length;
  t -= Math.floor(t);
  const p = track.sample(t, 0, s.branch).position;
  out[0] = p[0]; out[1] = p[1]; out[2] = p[2];
  return out;
}

/**
 * The Grapple Anchor's aim: down the road while the hooked kart is far ahead, then a point
 * `towSideOffset` beside it on the side you are already on, so you draw level and pass.
 */
export function towAim(s: KartState, o: KartState, track: TrackQuery, c: KartConstants, out: Vec3): Vec3 {
  const ahead = (o.t - s.t) - Math.floor(o.t - s.t);
  if (ahead * track.length > c.towFollowRoad) return rideAim(s, track, c, out);
  const r = rightOf(o.heading);
  const side = (s.position[0] - o.position[0]) * r[0] + (s.position[2] - o.position[2]) * r[2] >= 0 ? 1 : -1;
  out[0] = o.position[0] + r[0] * side * c.towSideOffset;
  out[1] = o.position[1];
  out[2] = o.position[2] + r[2] * side * c.towSideOffset;
  return out;
}

/**
 * One autopilot tick: turn toward `aim` at pilotTurnRate, kill the slide, and move the speed
 * toward `speed` (fast up, the usual over-speed tail off down). No drift under autopilot.
 */
export function stepPilot(s: KartState, aim: Vec3, speed: number, c: KartConstants, dt: number): void {
  const dx = aim[0] - s.position[0], dz = aim[2] - s.position[2];
  if (dx * dx + dz * dz > 1e-6) {
    let d = Math.atan2(dx, dz) - s.heading;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    const turn = c.pilotTurnRate * dt;
    s.heading += Math.max(-turn, Math.min(turn, d));
  }
  s.lateralVelocity *= Math.max(0, 1 - 12 * dt);
  s.speed = s.speed < speed ? Math.min(speed, s.speed + c.accel * c.pilotAccel * dt) : Math.max(speed, s.speed - c.overSpeedDecel * dt);
}
