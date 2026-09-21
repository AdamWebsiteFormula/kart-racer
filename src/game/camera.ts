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
  lag: 6,
  /** while look-back is held */
  flipLag: 14,
  topSpeed: 25,
  /** vertical field of view at a standstill and the extra at top speed: speed you can see */
  fov: 66,
  fovAtSpeed: 12,
});

export function fovFor(speed: number): number {
  return CAM.fov + CAM.fovAtSpeed * Math.min(1, Math.abs(speed) / CAM.topSpeed);
}

export interface CamPose { position: Vec3; target: Vec3 }

/** Where the camera wants to be for this kart pose, right now. */
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
