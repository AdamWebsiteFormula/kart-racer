// Chase camera placement. Pure vector maths: the caller copies the result onto a
// Three.js camera, so this is testable headless.
import { BASE } from '../kart-controller/constants.ts';
import { loopFrame } from '../kart-controller/loop.ts';
import type { TrackHint, TrackLoop, TrackQuery, TrackSample } from '../kart-controller/types.ts';
import { forwardOf, type Vec3 } from '../kart-controller/types.ts';
import { BUILDER } from '../track-builder/constants.ts';
import type { Track } from '../track-builder/track.ts';

export const CAM = Object.freeze({
  /** loop-the-loop side view: out to the left by this many ring radii, back by this many, up by this many; its lag, 1/s */
  loopSide: 2.4, loopBack: 0.3, loopHeight: 1.1, loopLag: 2.2,
  /** metres behind the kart at a standstill and up from it (research plan §4.7: 5.5 back, 2.2 up; 2.4 so the lens clears a 2.2 m racer's head and sees the road past it) */
  back: 5.5,
  /** extra metres of back-off at top speed: a touch, so speed never shrinks your kart to a speck */
  backAtSpeed: 0.5,
  height: 2.4,
  /** metres the camera keeps above the ground under its own spot (a steep climb seen looking back) */
  roadClear: 1.2,
  /** metres the camera keeps under a tunnel's timber beams (tunnelWall: each hangs 0.12 below it, and the near plane is 0.3) */
  beamClear: 0.45,
  /** metres ahead of the kart the camera looks, and up from it (plan §4.7: 6 m ahead; 1.5 up, a shallow tilt, so your kart sits low in frame) */
  aheadLook: 6,
  lookHeight: 1.5,
  /** 1/s, how fast the camera's offset from the kart chases its ideal one (it rides with the kart, so speed adds no trail) */
  lag: 10,
  /** 1/s, how fast the camera's own yaw swings round behind the kart: slow, so the kart turns inside the frame */
  yawLag: 2.5,
  /** below this speed the camera follows the nose; above it, the direction of travel (a drift shows as the kart sideways in frame) */
  travelBlendSpeed: 6,
  /** while look-back is held */
  flipLag: 14,
  /** 1/s, how fast the speed the camera reads (for distance and field of view) follows the real speed: a bump must not pump the view */
  speedLag: 2,
  topSpeed: 25,
  /** vertical field of view at a standstill and the extra at top speed: speed you can see (plan §4.7: 60°, 72° on a boost) */
  fov: 60,
  fovAtSpeed: 6,
  /** the widest the view gets with the boost kick on top: wider pushes your kart into the distance */
  fovMax: 74,
  /** metres from the lens within which an item dissolves (glow.ts fadeNearCamera): all karts share the item meshes, so what yours trails must stay farther (camera.test.ts) */
  nearFade: 2.8,
  /** the same for a rival's kart: one between you and the lens dissolves, one alongside you does not (camera.test.ts); yours never does */
  kartFade: 4,
});

/** A loop-the-loop seen side on, from left of the road: far enough out to hold the whole ring, a little behind its foot. */
export function loopCamPose(track: TrackQuery, l: TrackLoop): CamPose {
  const f = loopFrame(track, l);
  const o = f.origin, R = l.radius, side = -R * CAM.loopSide, back = R * CAM.loopBack;
  return {
    position: [o[0] + f.right[0] * side - f.forward[0] * back, o[1] + R * CAM.loopHeight, o[2] + f.right[2] * side - f.forward[2] * back],
    target: [o[0], o[1] + R, o[2]],
  };
}

export function fovFor(speed: number): number {
  return CAM.fov + CAM.fovAtSpeed * Math.min(1, Math.abs(speed) / CAM.topSpeed);
}

/** The field of view with the vfx kick (boost wider, hit narrower) on top, never wider than CAM.fovMax. */
export function kickedFov(fov: number, kick: number): number {
  return Math.min(CAM.fovMax, fov + kick);
}

export interface CamPose { position: Vec3; target: Vec3 }

export function wrapAngle(a: number): number {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

/**
 * The yaw the camera wants to sit behind: the kart's direction of travel once it is
 * moving (so a drift reads as the kart sideways in frame), the nose when it is not.
 */
export function travelYaw(heading: number, speed: number, lateralVelocity: number, drifting: boolean): number {
  // only a drift's slide counts: a bump also adds sideways velocity, and the camera must not flinch at it
  if (!drifting) return heading;
  const w = Math.min(1, Math.max(0, Math.abs(speed)) / CAM.travelBlendSpeed);
  const slip = Math.atan2(lateralVelocity, Math.max(Math.abs(speed), 1e-3)) * Math.sign(speed || 1);
  return heading + slip * w;
}

/** One frame of the camera's own yaw chasing `want`, frame-rate independent. */
/** The speed the camera believes, eased so a bump or a wall does not pump the distance and the field of view. */
export function easedSpeed(camSpeed: number, speed: number, frameDt: number): number {
  const k = 1 - Math.exp(-CAM.speedLag * frameDt);
  return camSpeed + (Math.abs(speed) - camSpeed) * k;
}

export function chaseYaw(camYaw: number, want: number, lag: number, frameDt: number): number {
  const k = 1 - Math.exp(-lag * frameDt);
  return camYaw + wrapAngle(want - camYaw) * k;
}

/** Where the camera wants to be for this kart pose, given the camera's own (lagged) yaw. */
export function idealPose(position: Vec3, heading: number, speed: number, lookBack: boolean): CamPose {
  const f = forwardOf(heading);
  const dir = lookBack ? -1 : 1;
  const back = CAM.back + CAM.backAtSpeed * Math.min(1, Math.abs(speed) / CAM.topSpeed);
  return {
    position: [position[0] - f[0] * back * dir, position[1] + CAM.height, position[2] - f[2] * back * dir],
    target: [position[0] + f[0] * CAM.aheadLook * dir, position[1] + CAM.lookHeight, position[2] + f[2] * CAM.aheadLook * dir],
  };
}

const under: TrackSample = { position: [0, 0, 0], tangent: [0, 0, 0], normal: [0, 0, 0], groundY: 0, halfWidth: 0, surface: 'road', gripScale: 1 };
const below: Vec3 = [0, 0, 0];

/**
 * Keep the camera between the ground under its own spot and the roof: at least CAM.roadClear above
 * it, and under the timber beams where that road is a tunnel's. The chase pose rides the kart's
 * height, and on a steep climb (the Canyon mine's exit) the road under the camera is metres off
 * the kart's. `kart` is the kart's place on the track. Writes pos[1].
 */
export function clampToRoad(track: Track, pos: Vec3, kart: TrackHint): void {
  // the nearest road point in 3D sits uphill of the one straight below: look again from the road's height
  let at = track.nearest(pos, kart, BASE.tSearchWindow);
  below[0] = pos[0]; below[1] = track.sampleInto(at.t, 0, at.branch, under).groundY; below[2] = pos[2];
  at = track.nearest(below, at, BASE.tSearchWindow);
  const c = track.sampleInto(at.t, 0, at.branch, under);
  const h = Math.hypot(c.tangent[0], c.tangent[2]) || 1, reach = c.wall ?? c.halfWidth;
  const lateral = ((pos[0] - c.position[0]) * c.tangent[2] - (pos[2] - c.position[2]) * c.tangent[0]) / h;
  const ground = track.sampleInto(at.t, Math.max(-reach, Math.min(reach, lateral)), at.branch, under).groundY;
  let y = Math.max(pos[1], ground + CAM.roadClear);
  const b = track.branches.list[at.branch] ?? track.branches.main, L = b.lut;
  const i = L.idx(Math.round(b.toLocal(at.t) * L.step));
  if (L.covered[i] || !Number.isNaN(L.bore[i])) y = Math.min(y, ground + BUILDER.tunnelWall - CAM.beamClear);
  pos[1] = y;
}

/**
 * Move `out` by how far the kart moved since last frame (`from` → `to`).
 * The chase camera rides with the kart first and smooths only its offset, so at speed it never
 * trails v/lag metres behind (that shrank the kart to a speck).
 */
export function carry(out: Vec3, from: Vec3, to: Vec3): void {
  out[0] += to[0] - from[0]; out[1] += to[1] - from[1]; out[2] += to[2] - from[2];
}

/** Exponential smoothing toward `to`, frame-rate independent. Writes into `out`. */
export function smoothTo(out: Vec3, to: Vec3, lag: number, frameDt: number): void {
  const k = 1 - Math.exp(-lag * frameDt);
  out[0] += (to[0] - out[0]) * k;
  out[1] += (to[1] - out[1]) * k;
  out[2] += (to[2] - out[2]) * k;
}
