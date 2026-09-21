// Chase camera placement. Pure vector maths: the caller copies the result onto a
// Three.js camera, so this is testable headless.
import { forwardOf, type Vec3 } from '../kart-controller/types.ts';

export const CAM = Object.freeze({
  /** metres behind the kart at a standstill */
  back: 7.5,
  /** extra metres of back-off at top speed */
  backAtSpeed: 2.5,
  height: 3.2,
  /** metres ahead of the kart the camera looks */
  aheadLook: 8,
  lookHeight: 1.0,
  /** 1/s, how fast the camera position chases its ideal spot */
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
  /** vertical field of view at a standstill and the extra at top speed: speed you can see */
  fov: 66,
  fovAtSpeed: 12,
});

export function fovFor(speed: number): number {
  return CAM.fov + CAM.fovAtSpeed * Math.min(1, Math.abs(speed) / CAM.topSpeed);
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

/** Exponential smoothing toward `to`, frame-rate independent. Writes into `out`. */
export function smoothTo(out: Vec3, to: Vec3, lag: number, frameDt: number): void {
  const k = 1 - Math.exp(-lag * frameDt);
  out[0] += (to[0] - out[0]) * k;
  out[1] += (to[1] - out[1]) * k;
  out[2] += (to[2] - out[2]) * k;
}
