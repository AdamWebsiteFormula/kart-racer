// The title's attract camera (design §12; the second fresh-eyes review's item 1, 28 Sept 2026: "the first screen
// is a low shot of asphalt with the leading kart hiding behind the new menu"). Mario Kart World's title frames its
// racer in the open part of the screen the whole time and shows the world round it (muted stills of
// youtube.com/watch?v=_9JZhslBy3E 0:03 to 0:27: on the start screen the kart sits in the middle under the logo, from
// behind, from the side, from behind and above; once the menu is in, right of it, the camera higher). Ours: a TV
// director on the attract race's leader, cutting in turn between four shots (a high trailing shot along the road
// toward the world ahead, a tracking shot alongside, a low shot ahead looking back at the pack, a rear three-quarter),
// each riding with the kart, and the aim solved every frame so the kart sits on one spot of the screen: in the middle
// under the start screen's logo, then in the middle of the room right of the menu (main.ts measures it: UiRoot.titleRoom).
// Pure maths on the track spline: no Three.js here (main.ts copies pos, look and fov onto the camera).
import type { KartState, TrackSample, Vec3 } from '../kart-controller/types.ts';
import type { Track } from '../track-builder/track.ts';
import { clampAboveSea, clampToRoad, wrapAngle } from './camera.ts';

export type TitleShotKind = 'trail' | 'side' | 'ahead' | 'rear';

/**
 * One shot, in the followed kart's road frame: metres along the road from the kart (+ ahead), across it (+ toward the
 * road's middle from the kart's lane, the side with room), up from the kart; each from → to over the shot (eased), so
 * every shot moves a little as a crane or a dolly does. Its vertical field of view.
 */
export interface TitleShot { kind: TitleShotKind; along: readonly [number, number]; across: readonly [number, number]; up: readonly [number, number]; fov: number; drop?: number }

export const TITLE_CAM = Object.freeze({
  /**
   * the shots, cut in this order. Every lens stands over the pickup balloons (their tops are about 2.1 m up: a lens at
   * their height met a row of them as big red blobs across the frame)
   */
  shots: [
    // a crane high behind, over the pack, looking along the road at the world ahead (MKW 0:06, 0:09; ngiIINHSiJc 0:43)
    { kind: 'trail', along: [-18, -15], across: [0.5, 0.5], up: [8, 7], fov: 52, drop: 0.03 },
    // alongside from the road's middle, tracking with it and sliding forward a little, the roadside behind it (MKW 0:12)
    { kind: 'side', along: [-3.5, 1.5], across: [10, 9.5], up: [3.2, 3], fov: 48 },
    // low ahead, looking back at the leader with the pack behind it
    { kind: 'ahead', along: [13, 10], across: [2.5, 2], up: [3.2, 2.9], fov: 50 },
    // a rear three-quarter, rising (MKW 0:03, 0:15); far enough that the kart stays clear of the start screen's prompt
    { kind: 'rear', along: [-8.5, -9], across: [5.5, 5], up: [3.2, 4], fov: 50, drop: 0.03 },
  ] as readonly TitleShot[],
  /** seconds a shot is held before the cut to the next; with reduced motion, longer and still */
  shotSeconds: 6.5,
  reducedShotSeconds: 9,
  /** 1/s: the road frame the offsets are laid in turns after the road's own heading at this rate (no whip at a hairpin) */
  yawLag: 2.2,
  /** 1/s: the screen spot eases from the start screen's to the menu's at this rate */
  spotLag: 3.5,
  /** metres over the followed kart's root the spot is on (its middle, driver and all) */
  aimUp: 0.8,
  /**
   * the spot, from the top of the screen (a share of its height): under the start screen's logo (its box ends 0.44 down
   * at 1600x900) and over its prompt at the foot; beside the menu, lower. Low in the frame, so the lens looks out over
   * the kart at the world (measured over the attract race, 1600x900, the road's share of the frame: 0.26 to 0.39 a shot
   * with the kart 0.72 down, 0.45 to 0.56 at 0.6; each shot's `drop` adds to it)
   */
  startY: 0.67,
  menuY: 0.72,
  /** a menu reaching past this share of the width leaves no room beside it (a narrow window): the spot goes under it */
  menuWide: 0.75,
  underY: 0.87,
});

/** Share of the width where the spot goes on the start screen (under the logo, in the middle). */
export const START_X = 0.5;

/**
 * Where on screen the followed kart goes (shares of the width from the left and of the height from the top), given the
 * title's menu's right edge (`menuRight`, a share of the width; 0: no menu, the start screen): in the middle under the
 * start screen's logo; in the middle of the room right of the menu; under it on a window too narrow for room beside it.
 */
export function titleSpot(menuRight: number, out: [number, number]): [number, number] {
  if (!(menuRight > 0)) { out[0] = START_X; out[1] = TITLE_CAM.startY; }
  else if (menuRight > TITLE_CAM.menuWide) { out[0] = START_X; out[1] = TITLE_CAM.underY; }
  else { out[0] = (menuRight + 1) / 2; out[1] = TITLE_CAM.menuY; }
  return out;
}

/**
 * The look point that puts `target` at the screen spot (`sx`, `sy`: shares of the width from the left and of the height
 * from the top) for a lens at `pos` with a vertical field of view `fovDeg` and this `aspect`, looked at with no roll
 * (three's lookAt). Exact, closed form: the target's direction in the lens's frame, then the pitch that gives its
 * height and the yaw that gives its heading. Writes `out` (a point 10 m along the view).
 */
export function aimFor(pos: Readonly<Vec3>, target: Readonly<Vec3>, sx: number, sy: number, fovDeg: number, aspect: number, out: Vec3): Vec3 {
  const dx = target[0] - pos[0], dy = target[1] - pos[1], dz = target[2] - pos[2];
  const d = Math.hypot(dx, dy, dz) || 1;
  const tanHalf = Math.tan((fovDeg * Math.PI) / 360);
  // the target's direction in the lens's frame (right, up, forward), unit
  let vx = (2 * sx - 1) * tanHalf * aspect, vy = (1 - 2 * sy) * tanHalf, vz = 1;
  const vl = Math.hypot(vx, vy, vz);
  vx /= vl; vy /= vl; vz /= vl;
  // pitch: the lens's up and forward carry the target's height (sin of its elevation)
  const sinE = dy / d, r = Math.hypot(vy, vz);
  const pitch = Math.asin(Math.max(-1, Math.min(1, sinE / r))) - Math.atan2(vy, vz);
  // yaw (heading as atan2(x, z)): screen right is (-cos ψ, 0, sin ψ), so a target on the right turns the lens left of it
  const w = vz * Math.cos(pitch) - vy * Math.sin(pitch);
  const yaw = Math.atan2(dx, dz) + Math.atan2(vx, w);
  const cp = Math.cos(pitch);
  out[0] = pos[0] + Math.sin(yaw) * cp * 10;
  out[1] = pos[1] + Math.sin(pitch) * 10;
  out[2] = pos[2] + Math.cos(yaw) * cp * 10;
  return out;
}

const glide = (x: number): number => { const k = x < 0 ? 0 : x > 1 ? 1 : x; return k * k * (3 - 2 * k); };

/** The kart the camera follows: its place on the track and where it is drawn this frame. */
export interface Followed { kart: Pick<KartState, 't' | 'branch'>; at: Readonly<{ x: number; y: number; z: number }> }

/**
 * The title's TV camera. Each shot follows the kart that led when it began (a pass mid-shot never jerks the camera
 * onto another kart; the next shot takes the new leader), riding with it: its place is the kart's plus the shot's
 * offset in the road's frame, kept over the ground and inside the course's limit, never under the sea. Allocates
 * nothing per frame.
 */
export class TitleCam {
  readonly pos: Vec3 = [0, 20, 40];
  readonly look: Vec3 = [0, 0, 0];
  fov = 50;
  /** the shot on screen (TITLE_CAM.shots index) and the kart it follows (-1: none yet) */
  shot = -1;
  star = -1;
  /** seconds into the shot */
  private time = 0;
  /** +1 or -1: which way across is the road's middle from the followed kart (fixed for the shot) */
  private side = 1;
  /** the road frame's heading, eased (NaN: take the road's at once) */
  private yaw = Number.NaN;
  /** the spot on screen now (shares of the width and height), eased toward the one asked for */
  private sx = START_X;
  private sy = TITLE_CAM.startY;
  private readonly s: TrackSample = { position: [0, 0, 0], tangent: [0, 0, 0], normal: [0, 0, 0], groundY: 0, halfWidth: 0, surface: 'road', gripScale: 1 };
  private readonly aim: Vec3 = [0, 0, 0];

  /** Start again on the first shot (a new attract race). */
  reset(): void { this.shot = -1; this.star = -1; this.time = 0; this.yaw = Number.NaN; }

  /**
   * One frame. `leader`: the kart leading now (a new shot follows it); `karts(i)`: kart i as drawn. `spotX`, `spotY`:
   * where on screen the followed kart goes (shares of the width and height); `snap` puts it there at once (the first
   * frame). `aspect`: the view's width over its height.
   */
  update(track: Track, leader: number, karts: (i: number) => Followed | undefined, spotX: number, spotY: number, aspect: number, reduced: boolean, dt: number, snap = false): void {
    const hold = reduced ? TITLE_CAM.reducedShotSeconds : TITLE_CAM.shotSeconds;
    this.time += Math.max(0, dt);
    let cut = false;
    if (this.shot < 0 || this.time >= hold || !karts(this.star)) {
      this.shot = (this.shot + 1) % TITLE_CAM.shots.length;
      this.star = leader;
      this.time = 0;
      cut = true;
    }
    const f = karts(this.star);
    if (!f) return;
    const shot = TITLE_CAM.shots[this.shot];
    // the road frame at the kart: its heading eased (a hairpin turns the shot round smoothly), its middle's side
    const s = track.sampleInto(f.kart.t, 0, f.kart.branch, this.s);
    const roadYaw = Math.atan2(s.tangent[0], s.tangent[2]);
    const h = Math.hypot(s.tangent[0], s.tangent[2]) || 1;
    const lateral = ((f.at.x - s.position[0]) * s.tangent[2] - (f.at.z - s.position[2]) * s.tangent[0]) / h;
    if (cut) {
      // across toward the road's middle (from a kart near the middle: the sea's side on a coast is as good as any)
      this.side = Math.abs(lateral) > 0.8 ? -Math.sign(lateral) : 1;
      this.yaw = roadYaw;
    } else this.yaw += wrapAngle(roadYaw - this.yaw) * (1 - Math.exp(-TITLE_CAM.yawLag * dt));
    const k = reduced ? 0.5 : glide(this.time / hold);
    const along = shot.along[0] + (shot.along[1] - shot.along[0]) * k;
    const across = (shot.across[0] + (shot.across[1] - shot.across[0]) * k) * this.side;
    const up = shot.up[0] + (shot.up[1] - shot.up[0]) * k;
    // forward (sin yaw, cos yaw); the track's +lateral (its right) is (cos yaw, -sin yaw)
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    const p = this.pos;
    p[0] = f.at.x + fx * along + fz * across;
    p[1] = f.at.y + up;
    p[2] = f.at.z + fz * along - fx * across;
    // over the ground and inside the course's limit (an open edge too: never out over a drop), never under the sea
    clampToRoad(track, p, f.kart, true);
    clampAboveSea(p, track);
    // the spot: eased from the start screen's to the menu's (and back), at once on the first frame
    const e = snap ? 1 : 1 - Math.exp(-TITLE_CAM.spotLag * dt);
    this.sx += (spotX - this.sx) * e;
    this.sy += (spotY - this.sy) * e;
    this.fov = shot.fov;
    const t = this.aim;
    t[0] = f.at.x; t[1] = f.at.y + TITLE_CAM.aimUp; t[2] = f.at.z;
    aimFor(p, t, this.sx, Math.min(0.9, this.sy + (shot.drop ?? 0)), this.fov, aspect, this.look);
  }
}
