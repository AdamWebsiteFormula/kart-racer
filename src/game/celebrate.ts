// The finish celebration (Adam, 24 Sept 2026: Mario Kart World's finish): over the line the camera
// swings round to the front of the player's kart in slow motion and circles it while the racer
// reacts to the placing (kart-controller anim.ts reactions), then the results slide in. A press on
// the finish banner (Enter, pad A, a tap) still goes straight to the results. With reduced motion
// the chase view holds a moment, then one cut to the front shot: no swing, no circling, no slow-mo.
// Pure maths: main.ts copies the pose onto the camera. Nothing here touches the sim.
import { stepSpring, type Reaction } from '../kart-controller/anim.ts';
import type { KartState, TrackSample, Vec3 } from '../kart-controller/types.ts';
import type { Track } from '../track-builder/track.ts';
import { CAM, chaseYaw, clampAboveSea, clampToRoad } from './camera.ts';

export const CELEBRATE = Object.freeze({
  /** seconds (real time, a pause not counted) from the line to the results; a press skips the rest */
  seconds: 4.2,
  /** seconds the swing from behind round to the front takes (the finish slow-mo runs under its first second) */
  swing: 1.5,
  /** where the swing ends: this far off the kart's nose (rad), this far out and up (m), looking at this height over the kart
   *  (26 Sept 2026: a little closer and higher, 4.4 → 4 m and 1.35 → 1.6 m, so a dropped head and a slump read over a high hood) */
  angle: 0.55, distance: 4, height: 1.6, lookHeight: 0.95,
  /** rad/s it keeps circling after the swing, across the front and on round (under the results too) */
  orbit: 0.2,
  /** vertical field of view once round (degrees): tighter than the chase's, a close-up */
  fov: 48,
  /** 1/s: how fast the frame the camera circles in follows the kart's heading through a bend */
  yawLag: 3,
  /** reduced motion: the chase view holds this long, then one cut to the front shot */
  reducedHold: 0.7,
  /**
   * The results beside the racer (Mario Kart World: the list slides in on the right and the racer stays in
   * view on the left, still reacting; 26 Sept 2026): the camera eases its aim so the kart sits in the room
   * left of the panel (besideAt), at this rate (1/s), and its circling settles on a front three-quarter view
   * from the kart's −X side (rad), where its nose points into the frame, toward the list, on this spring (Hz)
   */
  besideRate: 2.5,
  besideAngle: -0.45,
  besideSpring: 0.55,
  /** degrees the view widens per unit the kart moves across (normalized screen x): a laptop window's narrower room still holds the whole kart */
  besideZoom: 10,
  /**
   * A disappointed finish (4th and below) framed on the driver (FinishCam.frameDriver; 27 Sept 2026): its
   * reaction is the upper body alone (the head bowed, a hand to the face, a slow shake), and from 4 m out and
   * 1.6 m up the small drivers showed only the tops of their heads and the drivers sitting deep in their
   * karts not even that. Mario Kart World's losing shot (muted stills, YouTube igoZK9g7-I8 at about 6 s and
   * 20 s): a front three-quarter view close on the racer, the camera about level with its head. So: this far
   * out (m), `angle` off the nose (rad; the swing's own, 45° read worse), `rise` over the driver's own seated head (the
   * rig's Head bone), aimed `look` from it; it holds there rather than circling on across the front (dead ahead
   * a bowed head is only its top, and the hand at the face, the one nearer the camera as the move starts, went
   * round to the far side). A driver sitting deep behind a kart's front that rises over its head (KART_FRAME
   * front) is seen from higher and nearer its nose (`deepAngle`), `deep` metres up per metre the front stands
   * over the head (plus `clear`): from the side, the pod's hull hid Nova whatever the height; from high in
   * front, over the nose into the cockpit, her bowed helmet shows. When the results come in beside the racer,
   * the camera backs off to the whole kart's distance as the kart moves `aside` of the way across the frame
   * (normalized screen x): closer, a kart moved into the room left of the panel ran off the screen's edge.
   */
  sad: Object.freeze({ distance: 3.2, rise: 0.35, look: -0.05, angle: 0.55, deep: 4, clear: 0.05, deepAngle: 0.3, aside: 0.4 }),
});

/**
 * The karts whose shape stands in front of a seated driver's face (measured from the models, 27 Sept 2026):
 * `front`, how high the kart's front rises in front of its driver all across (m over the kart's origin, its
 * middle band: Nova's pod 1.04 against her head at 0.80 to 0.86; the Wind-Up Racer's round nose 1.06 against
 * Sprocket's 0.84 to 0.89), seen over from higher; `angle`, a narrow thing right in front of the face seen past
 * from further round (rad off the nose: the Parcel Scooter's lamp, 1.18 m, 0.2 m in front of Pip's face: at
 * 0.55 his wing over his face showed only as a tip beside it, "a wave"; at 1 rad it is plain). Every other
 * kart's front sits under its drivers' heads.
 */
export const KART_FRAME: Readonly<Record<string, Readonly<{ front?: number; angle?: number }>>> = Object.freeze({
  pod: Object.freeze({ front: 1.04 }), windup: Object.freeze({ front: 1.06 }), scooter: Object.freeze({ angle: 1 }),
});

/** The finish camera's pose over a disappointed driver: its distance, height and aim height over the kart (m) and its angle off the nose (rad), from the driver's seated `head` height and its kart's KART_FRAME (none: an open kart). */
export function sadFrame(head: number, kart: Readonly<{ front?: number; angle?: number }> | undefined, out: { distance: number; height: number; look: number; angle: number }): { distance: number; height: number; look: number; angle: number } {
  const S = CELEBRATE.sad, deep = Math.max(0, (kart?.front ?? 0) + S.clear - head);
  out.distance = S.distance;
  out.height = head + S.rise + S.deep * deep;
  out.look = head + S.look;
  out.angle = kart?.angle ?? (deep > 0 ? S.deepAngle : S.angle);
  return out;
}

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
 * The reaction for a placing (Adam, 26 Sept 2026: "When you lose a race, the character should look
 * disappointed, like he lost. When you win, you know, first, second, or third, he should look happy"):
 * joyful and distinct for 1st (champion), 2nd (cheer) and 3rd (bounce), relief for a Knockout
 * round's other safe places; disappointed for 4th and below, a Knockout cut and the Knockout final's
 * 2nd to 4th (only 1st wins it), more so toward the back (lostReaction). A solo run reacts to its
 * medal (a Daily, to finishing), as before.
 */
export function reactionFor(p: Placing): Reaction {
  if (p.dnf) return 'dejected';
  if (p.field <= 1) {
    if (p.medal === undefined) return 'relief';
    return p.medal === 'gold' ? 'champion' : p.medal === 'silver' ? 'cheer' : p.medal === 'bronze' ? 'bounce' : 'shrug';
  }
  if (p.rank === 1) return 'champion';
  if (p.knockout?.final) return lostReaction(p.rank, p.field, 2);
  if (p.rank === 2) return 'cheer';
  if (p.rank === 3) return 'bounce';
  if (p.knockout) return p.rank <= p.knockout.cutLine ? 'relief' : lostReaction(p.rank, p.field, p.knockout.cutLine + 1);
  return lostReaction(p.rank, p.field, 4);
}

/**
 * How disappointed a losing place is, graded from the first losing place (`first`: 4th in a race, the
 * first place under a Knockout's cut line, 2nd in its final) to the back, as Mario Kart World grades
 * its places (mariowiki: moderate, then mediocre, then losing reactions down the field): the front
 * half of the losing places a sigh (so close: 4th and 5th of 8, the final's 2nd), then deflated (6th
 * and 7th, a cut racer's first place under the line), and the very back dejected (8th, the last of
 * any field).
 */
export function lostReaction(rank: number, field: number, first: number): Reaction {
  const n = field - first + 1, i = rank - first;
  if (i >= n - 1) return 'dejected';
  return i < Math.floor((n - 1) / 2) ? 'sigh' : 'deflated';
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
  /** where the kart sits across the frame (normalized screen x: 0 the middle, −1 the left edge), eased toward `frameWant` (besideAt) */
  private frameX = 0;
  private frameWant = 0;
  /** the circling's angle and speed this frame; once the results are beside the kart it settles on CELEBRATE.besideAngle */
  private readonly orbit = { x: 0, v: 0 };
  private settling = false;
  /** a disappointed finish framed on its driver (frameDriver), or none: the kart as a whole (CELEBRATE) */
  private readonly driver = { on: false, distance: 0, height: 0, look: 0, angle: 0 };
  private readonly under: TrackSample = { position: [0, 0, 0], tangent: [0, 0, 0], normal: [0, 0, 0], groundY: 0, halfWidth: 0, surface: 'road', gripScale: 1 };

  /**
   * The player crossed the line. `root` and `viewYaw` are the kart's drawn place and heading; `pos`,
   * `look` and `fov` the chase camera's this frame: the swing starts exactly there.
   */
  start(track: Track, k: KartState, root: { x: number; y: number; z: number }, viewYaw: number, pos: Vec3, look: Vec3, fov: number): void {
    this.time = 0;
    this.frameX = this.frameWant = 0;
    this.settling = false;
    this.driver.on = false; // (frameDriver, just after, for a disappointed one)
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
    this.orbit.x = this.a0; this.orbit.v = 0;
  }

  /**
   * Frame the driver for a disappointed reaction (`sad`; CELEBRATE.sad): `head` the driver's seated head over
   * the kart (m; the rig's Head bone; null: a kart with no rig, framed as a whole), `kartId` its kart
   * (KART_FRAME). Not sad: the kart as a whole, as ever (a leap and a turn in the air need the room).
   */
  frameDriver(head: number | null, kartId: string | undefined, sad: boolean): void {
    this.driver.on = sad && head !== null && Number.isFinite(head);
    if (this.driver.on) sadFrame(head!, kartId ? KART_FRAME[kartId] : undefined, this.driver);
  }

  /**
   * The results are up beside the kart (Mario Kart World): `ndcX` is where across the frame the kart goes,
   * the middle of the room left of the panel (normalized screen x, −1 the left edge; main.ts from UiRoot's
   * besideRoom); 0 puts it back in the middle. The first time, the circling starts to settle (CELEBRATE.besideAngle).
   */
  besideAt(ndcX: number): void {
    this.frameWant = Math.max(-0.9, Math.min(0, ndcX));
    if (this.frameWant < 0) this.settling = true;
  }

  /** The kart's angle this frame: 0 ahead, ± to its ±X side (after the swing it circles on; over a disappointed driver it holds the three-quarter view). */
  angleAt(time: number, reduced: boolean): number {
    const C = CELEBRATE, end = this.side * (this.driver.on ? this.driver.angle : C.angle);
    if (reduced) return time < C.reducedHold ? this.a0 : end;
    return lerp(this.a0, end, smoother(time / C.swing)) - this.side * (this.driver.on ? 0 : C.orbit) * Math.max(0, time - C.swing);
  }

  /** One rendered frame; `dt` real seconds that ran (0 while paused); `aspect` the view's width over height (to frame the kart beside the results). */
  update(track: Track, k: KartState, root: { x: number; y: number; z: number }, viewYaw: number, reduced: boolean, dt: number, aspect = 16 / 9): void {
    const C = CELEBRATE;
    this.time += dt;
    this.yaw = chaseYaw(this.yaw, viewYaw, C.yawLag, dt);
    this.y += (root.y - this.y) * (1 - Math.exp(-CAM.heightLag * dt));
    // how far from the chase pose to the close-up: eased along the swing, or one cut with reduced motion
    const e = reduced ? (this.time < C.reducedHold ? 0 : 1) : smoother(this.time / C.swing);
    // the circling: the swing and on round; beside the results it settles on a spring from its own speed (no
    // jolt as it turns), or with reduced motion cuts there
    const o = this.orbit;
    if (!this.settling) {
      const a = this.angleAt(this.time, reduced);
      if (dt > 0) o.v = (a - o.x) / dt;
      o.x = a;
    } else if (reduced) { o.x = C.besideAngle; o.v = 0; } else if (dt > 0) stepSpring(o, C.besideAngle, [C.besideSpring, 1], dt);
    const a = o.x;
    this.frameX = reduced ? this.frameWant : this.frameX + (this.frameWant - this.frameX) * (1 - Math.exp(-C.besideRate * dt));
    const F = this.driver.on ? this.driver : null;
    // beside the results the kart moves into the room left of them: the close-up on a disappointed driver backs
    // off to the whole kart's distance as it goes (the kart still fits there; its height and aim stay the driver's)
    const aside = F ? Math.min(1, -this.frameX / C.sad.aside) : 0;
    const d = lerp(this.d0, F ? lerp(F.distance, C.distance, aside) : C.distance, e), h = lerp(this.h0, F ? F.height : C.height, e);
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw), sx = fz, sz = -fx;
    const ca = Math.cos(a), sa = Math.sin(a);
    const p = this.pos;
    p[0] = root.x + (fx * ca + sx * sa) * d;
    p[1] = this.y + h;
    p[2] = root.z + (fz * ca + sz * sa) * d;
    clampToRoad(track, p, k);
    // review, 26 Sept 2026, finding 1: every camera near a water track's sea keeps clear of its own
    // crest, not only the road (this swing can pass close by a coastal finish line)
    clampAboveSea(p, track);
    const lf = lerp(this.look0[0], 0, e), ls = lerp(this.look0[1], 0, e);
    this.look[0] = root.x + fx * lf + sx * ls;
    this.look[1] = this.y + lerp(this.look0[2], F ? F.look : C.lookHeight, e);
    this.look[2] = root.z + fz * lf + sz * ls;
    this.fov = lerp(this.fov0, C.fov, e);
    // beside the results: a little wider, and aimed to the camera's right of the kart, so the kart sits at frameX across the view
    if (this.frameX < -1e-4) {
      this.fov += C.besideZoom * -this.frameX;
      const dx = this.look[0] - p[0], dz = this.look[2] - p[2], d = Math.hypot(dx, dz);
      if (d > 1e-3) {
        const k = -this.frameX * d * Math.tan((this.fov * Math.PI) / 360) * aspect;
        this.look[0] += (-dz / d) * k;
        this.look[2] += (dx / d) * k;
      }
    }
  }
}
