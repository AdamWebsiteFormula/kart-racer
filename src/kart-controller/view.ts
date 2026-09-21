// Render side. The only file in kart-controller that imports Three.js.
// Holds the previous and current sim pose, lerps by the accumulator fraction,
// and adds cosmetic lean. None of this touches the sim.
import { Group, MathUtils, Object3D } from 'three';
import type { KartConstants } from './constants.ts';
import type { KartState } from './types.ts';

interface Pose { x: number; y: number; z: number; heading: number }

const LEAN = Object.freeze({
  yawLag: 8, // 1/s, chassis yaw chases the logical heading
  rollPerSteerSpeed: 0.012, // rad per (steer × m/s)
  rollLag: 8, // 1/s, the roll eases in and out instead of snapping with the key
  pitchPerAccel: 0.02, // rad per m/s²
  pitchLag: 6,
  accelClamp: 12, // m/s²; a bump or a wall changes speed in one tick and must not read as a nose-dive
  pitchMax: 0.12, // rad
});

export class KartView {
  readonly root = new Group(); // sim pose: position + heading
  readonly chassis: Object3D; // cosmetic lean under root
  private prev: Pose;
  private curr: Pose;
  private chassisYaw = 0;
  private roll = 0;
  private pitch = 0;
  private lastSpeed = 0;
  private lastAccel = 0;
  private c: KartConstants;

  constructor(c: KartConstants, mesh: Object3D, s: KartState) {
    this.c = c;
    this.chassis = mesh;
    this.root.add(mesh);
    this.prev = this.curr = KartView.pose(s);
    this.lastSpeed = s.speed;
  }

  private static pose(s: KartState): Pose {
    return { x: s.position[0], y: s.position[1], z: s.position[2], heading: s.heading };
  }

  /** Call once per sim tick, after stepKart. */
  onTick(s: KartState, dt: number): void {
    this.prev = this.curr;
    this.curr = KartView.pose(s);
    this.lastAccel = MathUtils.clamp((s.speed - this.lastSpeed) / dt, -LEAN.accelClamp, LEAN.accelClamp);
    this.lastSpeed = s.speed;
  }

  /** Call once per frame with the accumulator fraction 0..1 and the current sim state. */
  onFrame(alpha: number, s: KartState, steer: number, frameDt: number): void {
    const p = this.prev, q = this.curr;
    let dh = q.heading - p.heading;
    while (dh > Math.PI) dh -= 2 * Math.PI;
    while (dh < -Math.PI) dh += 2 * Math.PI;
    this.root.position.set(
      MathUtils.lerp(p.x, q.x, alpha), MathUtils.lerp(p.y, q.y, alpha), MathUtils.lerp(p.z, q.z, alpha),
    );
    this.root.rotation.set(0, p.heading + dh * alpha, 0);

    // cosmetic lean
    const slip = s.drift.active ? -s.drift.direction * this.c.driftVisualSlip : 0;
    const k = 1 - Math.exp(-LEAN.yawLag * frameDt);
    this.chassisYaw += (slip - this.chassisYaw) * k;
    const kr = 1 - Math.exp(-LEAN.rollLag * frameDt);
    this.roll += (-steer * s.speed * LEAN.rollPerSteerSpeed - this.roll) * kr;
    const kp = 1 - Math.exp(-LEAN.pitchLag * frameDt);
    this.pitch += (MathUtils.clamp(-this.lastAccel * LEAN.pitchPerAccel, -LEAN.pitchMax, LEAN.pitchMax) - this.pitch) * kp;
    this.chassis.rotation.set(this.pitch, this.chassisYaw, this.roll);
  }
}
