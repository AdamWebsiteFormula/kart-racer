// Render side. The only file in kart-controller that imports Three.js.
// Holds the previous and current sim pose, lerps by the accumulator fraction,
// and adds cosmetic lean, a tilt to the ground under it, and eases a wall's impact turn.
// None of this touches the sim.
import { Group, MathUtils, Object3D } from 'three';
import type { KartConstants } from './constants.ts';
import type { KartState } from './types.ts';

interface Pose { x: number; y: number; z: number; heading: number; angle: number }

const LEAN = Object.freeze({
  yawLag: 8, // 1/s, chassis yaw chases the logical heading
  rollPerSteerSpeed: 0.012, // rad per (steer × m/s)
  rollLag: 8, // 1/s, the roll eases in and out instead of snapping with the key
  pitchPerAccel: 0.02, // rad per m/s²
  pitchLag: 6,
  accelClamp: 12, // m/s²; a bump or a wall changes speed in one tick and must not read as a nose-dive
  pitchMax: 0.12, // rad
  snapYawPerTick: 0.04, // rad; a heading change bigger than this in one tick (a wall's impact turn) is eased on screen
  snapLag: 14, // 1/s, how fast that eased part catches up
  teleport: 3, // m in one tick: a set-down, never eased
  tiltLag: 12, // 1/s, the body settles onto the ground's slope and bank (sim.groundNormal)
  airTiltLag: 2.5, // 1/s, in the air it drifts back toward level
  tiltMax: 0.6, // rad; no road leans further
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
  /** screen-only heading lag left over from a snap (a wall's impact turn), easing to 0 */
  private snapYaw = 0;
  private tiltPitch = 0;
  private tiltRoll = 0;
  private c: KartConstants;

  constructor(c: KartConstants, mesh: Object3D, s: KartState) {
    this.c = c;
    this.chassis = mesh;
    this.root.add(mesh);
    this.prev = this.curr = KartView.pose(s);
    this.lastSpeed = s.speed;
  }

  private static pose(s: KartState): Pose {
    return { x: s.position[0], y: s.position[1], z: s.position[2], heading: s.heading, angle: s.status.loopAngle };
  }

  /** Call once per sim tick, after stepKart. */
  onTick(s: KartState, dt: number): void {
    this.prev = this.curr;
    this.curr = KartView.pose(s);
    // a big one-tick turn (a wall's impact) plays out over a few frames: the interpolation spans
    // only a normal tick's turn and the rest is held back in snapYaw, which then eases away
    let dh = this.curr.heading - this.prev.heading;
    while (dh > Math.PI) dh -= 2 * Math.PI;
    while (dh < -Math.PI) dh += 2 * Math.PI;
    const excess = dh - MathUtils.clamp(dh, -LEAN.snapYawPerTick, LEAN.snapYawPerTick);
    // (a teleport, the claw's set-down, is not eased: it just is there)
    const moved = Math.hypot(this.curr.x - this.prev.x, this.curr.z - this.prev.z);
    if (moved > LEAN.teleport) this.snapYaw = 0;
    else if (excess !== 0) {
      this.prev = { ...this.prev, heading: this.prev.heading + excess };
      this.snapYaw -= excess;
    }
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
    // round a loop-the-loop the kart pitches with the ring: nose up, upside down at the top
    let da = q.angle - p.angle;
    if (da < -Math.PI) da += 2 * Math.PI;
    const angle = p.angle + da * alpha;
    this.snapYaw *= Math.exp(-LEAN.snapLag * frameDt);
    const heading = p.heading + dh * alpha + this.snapYaw;
    // tilt to the ground under the kart (banks, ramps, slopes): the sim stays flat and kinematic
    const onRing = s.status.loopIndex >= 0;
    const n = s.groundNormal;
    const fx = Math.sin(heading), fz = Math.cos(heading); // forward
    const wantPitch = onRing ? 0 : MathUtils.clamp(Math.asin(MathUtils.clamp(n[0] * fx + n[2] * fz, -1, 1)), -LEAN.tiltMax, LEAN.tiltMax);
    const wantRoll = onRing ? 0 : MathUtils.clamp(-Math.asin(MathUtils.clamp(n[0] * fz - n[2] * fx, -1, 1)), -LEAN.tiltMax, LEAN.tiltMax);
    const kt = 1 - Math.exp(-(s.grounded || onRing ? LEAN.tiltLag : LEAN.airTiltLag) * frameDt);
    // airborne, the last ground tilt fades toward level
    this.tiltPitch += ((s.grounded || onRing ? wantPitch : 0) - this.tiltPitch) * kt;
    this.tiltRoll += ((s.grounded || onRing ? wantRoll : 0) - this.tiltRoll) * kt;
    this.root.rotation.set(-angle + this.tiltPitch, heading, this.tiltRoll, 'YXZ');

    // cosmetic lean
    // the sim's +yaw is screen-left, so a drift toward direction d yaws the body by +d, not −d
    // (the tail swings out, the nose points into the bend; 2026-09-21 it pointed out of it)
    const slip = s.drift.active ? s.drift.direction * this.c.driftVisualSlip : 0;
    const k = 1 - Math.exp(-LEAN.yawLag * frameDt);
    this.chassisYaw += (slip - this.chassisYaw) * k;
    const kr = 1 - Math.exp(-LEAN.rollLag * frameDt);
    this.roll += (-steer * s.speed * LEAN.rollPerSteerSpeed - this.roll) * kr;
    const kp = 1 - Math.exp(-LEAN.pitchLag * frameDt);
    this.pitch += (MathUtils.clamp(-this.lastAccel * LEAN.pitchPerAccel, -LEAN.pitchMax, LEAN.pitchMax) - this.pitch) * kp;
    this.chassis.rotation.set(this.pitch, this.chassisYaw, this.roll);
  }
}
