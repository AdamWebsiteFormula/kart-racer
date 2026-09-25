// Render side. The only file in kart-controller that imports Three.js.
// Holds the previous and current sim pose, lerps by the accumulator fraction, tilts the body to
// the ground under it and eases a wall's impact turn (all on `root`, which the chase camera
// follows), and puts the kart's secondary animation (anim.ts: roll, pitch, squash and stretch,
// the drift's yaw, the hit's spin) on `chassis` and on the model's morph targets (the driver's
// lean, look and nod, the front wheels' steer, the body on its springs; art-pipeline rig.ts).
// None of this touches the sim.
import { Group, MathUtils, type Mesh, type Object3D } from 'three';
import { KartAnim, newPose } from './anim.ts';
import type { KartConstants } from './constants.ts';
import { NEUTRAL_INPUT, type InputState, type KartState } from './types.ts';

interface Pose { x: number; y: number; z: number; heading: number; angle: number }

const LEAN = Object.freeze({
  snapYawPerTick: 0.04, // rad; a heading change bigger than this in one tick (a wall's impact turn) is eased on screen
  snapLag: 14, // 1/s, how fast that eased part catches up
  teleport: 3, // m in one tick: a set-down, never eased
  tiltLag: 12, // 1/s, the body settles onto the ground's slope and bank (sim.groundNormal)
  airTiltLag: 2.5, // 1/s, in the air it drifts back toward level
  tiltMax: 0.6, // rad; no road leans further
});

/** A rigged mesh under the chassis, where its morph targets sit (-1: it has none), and influence per radian (or metre). */
interface Rig { influences: number[]; lean: number; look: number; nod: number; steer: number; heave: number; perRad: number }

/** Every mesh under `root` that carries the rig's morph targets (art-pipeline rig.ts); none for the placeholder kart. */
function findRigs(root: Object3D): Rig[] {
  const out: Rig[] = [];
  root.traverse((o) => {
    const m = o as Mesh;
    const dict = m.morphTargetDictionary, inf = m.morphTargetInfluences;
    if (!m.isMesh || !dict || !inf) return;
    const at = (name: string) => dict[name] ?? -1;
    // the rig says how many radians one unit of influence turns (art-pipeline rig.ts RIG_UNIT)
    const unit = (m.geometry.userData.rigUnit as number | undefined) ?? 1;
    const r = { influences: inf, lean: at('lean'), look: at('look'), nod: at('nod'), steer: at('steer'), heave: at('heave'), perRad: 1 / unit };
    if (r.lean >= 0 || r.look >= 0 || r.nod >= 0 || r.steer >= 0 || r.heave >= 0) out.push(r);
  });
  return out;
}

export class KartView {
  readonly root = new Group(); // sim pose: position + heading
  readonly chassis: Object3D; // the kart's animation under root
  /** the kart's secondary animation (springs), stepped per sim tick */
  readonly anim: KartAnim;
  private prev: Pose;
  private curr: Pose;
  /** screen-only heading lag left over from a snap (a wall's impact turn), easing to 0 */
  private snapYaw = 0;
  private tiltPitch = 0;
  private tiltRoll = 0;
  private readonly rigs: Rig[];
  private readonly posed = newPose();

  /** `seed`: the kart's index, so the field's idle shivers are out of step */
  constructor(c: KartConstants, mesh: Object3D, s: KartState, seed = 0) {
    this.chassis = mesh;
    this.root.add(mesh);
    this.prev = this.curr = KartView.pose(s);
    this.anim = new KartAnim(c, seed);
    this.rigs = findRigs(mesh);
  }

  private static pose(s: KartState): Pose {
    return { x: s.position[0], y: s.position[1], z: s.position[2], heading: s.heading, angle: s.status.loopAngle };
  }

  /** Call once per sim tick, after stepKart, with the input the kart drove on this tick. */
  onTick(s: KartState, dt: number, input: Readonly<InputState> = NEUTRAL_INPUT): void {
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
    this.anim.tick(s, input, dt);
  }

  /**
   * Call once per frame with the accumulator fraction 0..1 and the current sim state. `reduced`
   * (reduced motion) scales the animation down. `steer` is unused (the animation reads the input
   * per tick); kept for callers.
   */
  onFrame(alpha: number, s: KartState, _steer: number, frameDt: number, reduced = false): void {
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

    // the animation (anim.ts): yaw first (the drift's slip, the hit's spin), then pitch and roll
    // about the kart's own axes, squash and stretch about the wheels' contact, riding up so the
    // low wheel stays on the road as it leans
    const a = this.anim.pose(alpha, reduced, this.posed);
    this.chassis.rotation.set(a.pitch, a.yaw + a.spin + a.wobble, a.roll, 'YXZ');
    this.chassis.position.set(0, a.lift, 0);
    const sy = 1 + a.squash, sxz = 1 / Math.sqrt(sy);
    this.chassis.scale.set(sxz, sy, sxz);
    for (let i = 0; i < this.rigs.length; i++) {
      const r = this.rigs[i], inf = r.influences;
      if (r.lean >= 0) inf[r.lean] = a.lean * r.perRad;
      if (r.look >= 0) inf[r.look] = a.look * r.perRad;
      if (r.nod >= 0) inf[r.nod] = a.nod * r.perRad;
      if (r.steer >= 0) inf[r.steer] = a.steer * r.perRad;
      if (r.heave >= 0) inf[r.heave] = a.heave * r.perRad;
    }
  }
}
