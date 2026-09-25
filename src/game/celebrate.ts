// The finish celebration (Adam, 24 Sept 2026: Mario Kart World's finish): over the line the camera
// swings round to the front of the player's kart in slow motion and circles it while the racer
// reacts to the placing (kart-controller anim.ts reactions), then the results slide in. A press on
// the finish banner (Enter, pad A, a tap) still goes straight to the results. With reduced motion
// the chase view holds a moment, then one cut to the front shot: no swing, no circling, no slow-mo.
// Pure maths: main.ts copies the pose onto the camera. Nothing here touches the sim.
import type { Reaction } from '../kart-controller/anim.ts';
import type { KartState, TrackSample, Vec3 } from '../kart-controller/types.ts';
import type { Track } from '../track-builder/track.ts';
import { CAM, chaseYaw, clampToRoad } from './camera.ts';

export const CELEBRATE = Object.freeze({
  /** seconds (real time, a pause not counted) from the line to the results; a press skips the rest */
  seconds: 4.2,
  /** seconds the swing from behind round to the front takes (the finish slow-mo runs under its first second) */
  swing: 1.5,
  /** where the swing ends: this far off the kart's nose (rad), this far out and up (m), looking at this height over the kart */
  angle: 0.55, distance: 4.4, height: 1.35, lookHeight: 0.85,
  /** rad/s it keeps circling after the swing, across the front and on round (under the results too) */
  orbit: 0.2,
  /** vertical field of view once round (degrees): tighter than the chase's, a close-up */
  fov: 48,
  /** 1/s: how fast the frame the camera circles in follows the kart's heading through a bend */
  yawLag: 3,
  /** reduced motion: the chase view holds this long, then one cut to the front shot */
  reducedHold: 0.7,
});

/** How the player placed, for their reaction. */
export interface Placing {
  rank: number;
  /** racers in the race (1: a solo Time Trial or Daily) */
  field: number;
  dnf?: boolean;
  /** a Knockout round: racers kept after it, and whether it is the final (no next round) */
  knockout?: { cutLine: number; final: boolean };
  /** Time Trial: the medal the time earned (a Daily has none) */
  medal?: 'gold' | 'silver' | 'bronze' | 'none';
}

/**
 * The reaction for a placing: joyful and distinct for 1st (champion), 2nd (cheer) and 3rd
 * (bounce), relief for a Knockout round's other safe places; a friendly shrug for the middle of
 * the field (and the Knockout final's 4th), deflated-then-chin-up for the back, a Knockout cut or
 * a DNF. A solo run reacts to its medal (a Daily, to finishing).
 */
export function reactionFor(p: Placing): Reaction {
  if (p.dnf) return 'deflated';
  if (p.field <= 1) {
    if (p.medal === undefined) return 'relief';
    return p.medal === 'gold' ? 'champion' : p.medal === 'silver' ? 'cheer' : p.medal === 'bronze' ? 'bounce' : 'shrug';
  }
  if (p.rank === 1) return 'champion';
  if (p.rank === 2) return 'cheer';
  if (p.rank === 3) return 'bounce';
  if (p.knockout) return p.knockout.final ? 'shrug' : p.rank <= p.knockout.cutLine ? 'relief' : 'deflated';
  return p.rank <= Math.ceil(p.field * 0.75) ? 'shrug' : 'deflated';
}

/** A joyful reaction: the finish confetti falls for it (a win, a podium place, a safe Knockout place, a medal). */
export const joyful = (r: Reaction): boolean => r === 'champion' || r === 'cheer' || r === 'bounce' || r === 'relief';

const smoother = (u: number): number => { const k = u < 0 ? 0 : u > 1 ? 1 : u; return k * k * k * (k * (k * 6 - 15) + 10); };
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * The finish camera: from wherever the chase camera is at the line, round the side with more road to
 * a close three-quarter view of the front of the kart, then slowly circling on across it while the
 * racer reacts. It rides with the kart (the autopilot drives it on, slower), keeps level, eases its
 * height over bumps and stays over the road, inside the walls and under a tunnel's beams
 * (camera.ts clampToRoad). No allocation per frame.
 */
export class FinishCam {
  readonly pos: Vec3 = [0, 0, 0];
  readonly look: Vec3 = [0, 0, 0];
  /** vertical field of view this frame (degrees) */
  fov: number = CELEBRATE.fov;
  /** seconds since the line, pauses not counted (main.ts adds only the frames that ran) */
  time = 0;
  /** +1: round by the kart's +X side; −1: by its −X side */
  side = 1;
  private yaw = 0;
  private y = 0;
  /** where the camera was at the line, in the kart's frame: its angle (0 ahead, ±π behind), distance, height and field of view */
  private a0 = Math.PI;
  private d0: number = CAM.back;
  private h0: number = CAM.height;
  private fov0: number = CAM.fov;
  /** the chase camera's aim at the line, in the kart's frame (forward, across to +X, up) */
  private readonly look0: Vec3 = [CAM.aheadLook, 0, CAM.lookHeight];
  private readonly under: TrackSample = { position: [0, 0, 0], tangent: [0, 0, 0], normal: [0, 0, 0], groundY: 0, halfWidth: 0, surface: 'road', gripScale: 1 };

  /**
   * The player crossed the line. `root` and `viewYaw` are the kart's drawn place and heading; `pos`,
   * `look` and `fov` the chase camera's this frame: the swing starts exactly there.
   */
  start(track: Track, k: KartState, root: { x: number; y: number; z: number }, viewYaw: number, pos: Vec3, look: Vec3, fov: number): void {
    this.time = 0;
    this.yaw = viewYaw;
    this.y = root.y;
    const fx = Math.sin(viewYaw), fz = Math.cos(viewYaw), sx = fz, sz = -fx;
    const dx = pos[0] - root.x, dz = pos[2] - root.z;
    const f = dx * fx + dz * fz, s = dx * sx + dz * sz;
    this.a0 = Math.atan2(s, f);
    this.d0 = Math.max(1, Math.hypot(f, s));
    this.h0 = pos[1] - root.y;
    this.fov0 = fov;
    const lx = look[0] - root.x, lz = look[2] - root.z;
    this.look0[0] = lx * fx + lz * fz; this.look0[1] = lx * sx + lz * sz; this.look0[2] = look[1] - root.y;
    // round by the side with more road: away from the nearer edge
    track.sampleInto(k.t, 0, k.branch, this.under);
    const c = this.under.position;
    this.side = (root.x - c[0]) * sx + (root.z - c[2]) * sz > 0 ? -1 : 1;
    // the start angle on that side, so the swing passes the kart's flank, never its nose
    if (this.side > 0 && this.a0 < 0) this.a0 += 2 * Math.PI;
    if (this.side < 0 && this.a0 > 0) this.a0 -= 2 * Math.PI;
  }

  /** The kart's angle this frame: 0 ahead, ± to its ±X side (after the swing it circles on). */
  angleAt(time: number, reduced: boolean): number {
    const C = CELEBRATE, end = this.side * C.angle;
    if (reduced) return time < C.reducedHold ? this.a0 : end;
    return lerp(this.a0, end, smoother(time / C.swing)) - this.side * C.orbit * Math.max(0, time - C.swing);
  }

  /** One rendered frame; `dt` real seconds that ran (0 while paused). */
  update(track: Track, k: KartState, root: { x: number; y: number; z: number }, viewYaw: number, reduced: boolean, dt: number): void {
    const C = CELEBRATE;
    this.time += dt;
    this.yaw = chaseYaw(this.yaw, viewYaw, C.yawLag, dt);
    this.y += (root.y - this.y) * (1 - Math.exp(-CAM.heightLag * dt));
    // how far from the chase pose to the close-up: eased along the swing, or one cut with reduced motion
    const e = reduced ? (this.time < C.reducedHold ? 0 : 1) : smoother(this.time / C.swing);
    const a = this.angleAt(this.time, reduced);
    const d = lerp(this.d0, C.distance, e), h = lerp(this.h0, C.height, e);
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw), sx = fz, sz = -fx;
    const ca = Math.cos(a), sa = Math.sin(a);
    const p = this.pos;
    p[0] = root.x + (fx * ca + sx * sa) * d;
    p[1] = this.y + h;
    p[2] = root.z + (fz * ca + sz * sa) * d;
    clampToRoad(track, p, k);
    const lf = lerp(this.look0[0], 0, e), ls = lerp(this.look0[1], 0, e);
    this.look[0] = root.x + fx * lf + sx * ls;
    this.look[1] = this.y + lerp(this.look0[2], C.lookHeight, e);
    this.look[2] = root.z + fz * lf + sz * ls;
    this.fov = lerp(this.fov0, C.fov, e);
  }
}
