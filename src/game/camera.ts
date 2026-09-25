// Chase camera placement. Pure vector maths: the caller copies the result onto a
// Three.js camera, so this is testable headless.
import { BASE } from '../kart-controller/constants.ts';
import { loopFrame } from '../kart-controller/loop.ts';
import type { KartState, TrackHint, TrackLoop, TrackQuery, TrackSample } from '../kart-controller/types.ts';
import type { Vec3 } from '../kart-controller/types.ts';
import { BUILDER } from '../track-builder/constants.ts';
import type { Track } from '../track-builder/track.ts';
import { JUICE, boostHold } from '../vfx-juice/juice.ts';

export const CAM = Object.freeze({
  /** loop-the-loop side view: out to the left by this many ring radii, back by this many, up by this many */
  loopSide: 2, loopBack: 0.3, loopHeight: 1.1,
  /**
   * seconds to swing into the side view once a kart is caught by a loop, and back behind it after the
   * ride (smoothstep in time; the chase rig stays live meanwhile, so the swing back ends where the chase
   * camera is). It was an exponential ease at 2.2/s in and the chase lag out, which jumped 15 m in one
   * frame (the wall clamp pulled the side view in): the critiques' "static loop camera cut".
   */
  loopIn: 1.1, loopOut: 1.25,
  /**
   * after the ride the side view holds until the kart is this many metres past the ring's front (at
   * most loopHoldMax seconds), so the swing back crosses the ring's lane ahead of it, never through its
   * rising side (camera.e2e.test.ts measures the clearance)
   */
  loopClear: 9, loopHoldMax: 1.2,
  /** the side view is not a still: it turns this share of the way from the ring's centre toward the kart, and slides this share of it */
  loopTrack: 0.7, loopFollow: 0.2,
  /**
   * the move across the road runs ahead of the rest in the swing: it is done by this share of the blend,
   * so the swing out crosses the gantry posts' line well behind them and the swing back well past them
   * (camera.e2e.test.ts measures the clearance, Mirror mode too)
   */
  loopAcross: 0.7,
  /**
   * Falls and the claw (Boardwalk's "jarring underwater transition": the camera followed a kart 5 m
   * down off the pier and aimed 2.4 m under the sea while the claw fetched it). The camera keeps
   * seaClear above a sea (a water track's ground plane); it follows a falling kart no deeper than
   * fallFollow under where it fell, nor under seaFollow above the water, and while the claw carries it
   * (7 m up, over the start gantry's beam at 6.2 m) no higher than carryRise over where it fell: it
   * watches from the road. That followed height eases at fallEase (1/s) and back after, never a jump.
   */
  seaClear: 1.2, fallFollow: 1.5, seaFollow: 0.3, carryRise: 1.8, fallEase: 6,
  /**
   * the height the camera rides at follows the kart's at this rate (1/s), not rigidly: a drift's hop, a
   * bump or a kerb no longer bounce the whole view, and off a ramp the kart rises in the frame before the
   * camera follows it (the critiques: "rigidly mimics the chassis's vertical jitter")
   */
  heightLag: 8,
  /** metres the kart may move in one frame before the road under the camera is looked for afresh (a teleport) */
  lookupJump: 20,
  /**
   * The surge (critiques of 24 Sept 2026: "rigid chase camera"): the camera falls back surgeBack metres
   * per m/s the kart gains on its own eased speed (surgeLag, 1/s) and closes in as it brakes, at most
   * surgeMax back and surgeClose in. A launch trails about 0.4 m, a hard brake closes about 0.45 m.
   */
  surgeBack: 0.08, surgeLag: 3, surgeMax: 0.45, surgeClose: 0.45,
  /**
   * Look into bends: the road's turn from the kart to lookAheadSeconds of speed up it (lookAheadMin to
   * lookAheadMax metres) turns the aim by lookInto of it, at most lookIntoMax radians, eased at
   * lookIntoLag (1/s). Only above aimMinSpeed, never looking back or driving the wrong way.
   */
  lookAheadSeconds: 0.6, lookAheadMin: 8, lookAheadMax: 18, lookInto: 0.5, lookIntoMax: 0.28, lookIntoLag: 3, aimMinSpeed: 4,
  /**
   * ...and swing wide: the camera slides to the outside of a bend, up to swingBend metres as the aim
   * reaches lookIntoMax, and swingDrift more in a drift (to the outside of its side), at most swingMax,
   * eased at swingLag (1/s), so it looks across the corner rather than at the kart's back (the second
   * critiques: "rigidly locked to the kart's rear axis in the drift")
   */
  swingBend: 0.7, swingDrift: 0.6, swingMax: 1.1, swingLag: 2.5,
  /**
   * The mine's light (critiques: "abrupt, flat tunnel lighting"): the camera's depth in a tunnel, from
   * portalLead metres outside a portal to portalFade inside it, eased at tunnelEase (1/s); main.ts dims
   * and warms the day's light by it, so the bore fades in and out over the portal instead of the sun's
   * shadow edge snapping it.
   */
  portalLead: 4, portalFade: 10, tunnelEase: 2.5,
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
  fovAtSpeed: 8,
  /** the widest the view gets with a boost's hold and punch on top (juice.ts JUICE.punch): wider pushes your kart into the distance */
  fovMax: 80,
  /** metres from the lens within which an item dissolves (glow.ts fadeNearCamera): all karts share the item meshes, so what yours trails must stay farther (camera.test.ts) */
  nearFade: 2.8,
  /**
   * the same for a rival's kart, only as it is about to cut into the lens: Mario Kart World keeps rivals solid near the
   * camera, beside you and right behind you too (Adam, 25 Sept 2026, "only what is backed by research"; checked in
   * MKW footage: KkZV6Lp5Z5o 1:24 and 4:56, ngiIINHSiJc 3:25-3:27 and 5:29). Nintendo fades only what reaches the near
   * clip plane (Super Mario Odyssey), so a kart's insides never show. Yours never fades.
   */
  kartFade: 1.3,
  /** riding a Strike Ball (2.6 m across, taller than the lens): the camera rises and backs off by these metres so the road ahead shows over the ball; 1/s, how fast it eases in and out */
  rideUp: 1.8, rideBack: 3, rideEase: 3,
  /** metres the camera keeps inside a wall's line (the mine's bore, Skyline's parapet): behind a kart on the outside of a bend it would sit in the rock */
  wallClear: 0.6,
});

/** A loop-the-loop seen side on, from the side the karts ride in on: far enough out to hold the whole ring, a little behind its foot. */
export function loopCamPose(track: TrackQuery, l: TrackLoop): CamPose {
  const f = loopFrame(track, l);
  // on the side the karts ride in on (left; right in Mirror mode, where the ring shifts the other way)
  const o = f.origin, R = l.radius, side = -Math.sign(l.shift || 1) * R * CAM.loopSide, back = R * CAM.loopBack;
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

/**
 * Where the camera wants to be for this kart pose, given the camera's own (lagged) yaw; `aim` turns
 * only where it looks (radians, + left like yaw: into a bend ahead). Writes `out` when given.
 */
export function idealPose(position: Vec3, heading: number, speed: number, lookBack: boolean, aim = 0, out?: CamPose): CamPose {
  const fx = Math.sin(heading), fz = Math.cos(heading);
  const ax = aim ? Math.sin(heading + aim) : fx, az = aim ? Math.cos(heading + aim) : fz;
  const dir = lookBack ? -1 : 1;
  const back = CAM.back + CAM.backAtSpeed * Math.min(1, Math.abs(speed) / CAM.topSpeed);
  const o = out ?? { position: [0, 0, 0], target: [0, 0, 0] };
  const p = o.position, t = o.target;
  p[0] = position[0] - fx * back * dir; p[1] = position[1] + CAM.height; p[2] = position[2] - fz * back * dir;
  t[0] = position[0] + ax * CAM.aheadLook * dir; t[1] = position[1] + CAM.lookHeight; t[2] = position[2] + az * CAM.aheadLook * dir;
  return o;
}

const under: TrackSample = { position: [0, 0, 0], tangent: [0, 0, 0], normal: [0, 0, 0], groundY: 0, halfWidth: 0, surface: 'road', gripScale: 1 };
const below: Vec3 = [0, 0, 0];

/**
 * Keep the camera between the ground under its own spot and the roof: at least CAM.roadClear above
 * it, and under the timber beams where that road is a tunnel's. The chase pose rides the kart's
 * height, and on a steep climb (the Canyon mine's exit) the road under the camera is metres off
 * the kart's. And inside the walls, CAM.wallClear in from their line (an open edge has none).
 * `kart` is the kart's place on the track; `edges`: an open edge counts as a wall too (a kart falling
 * off one is watched from the road, not followed out past the start gantry's pillars over the sea).
 * Writes pos; returns the road's place under it.
 */
export function clampToRoad(track: Track, pos: Vec3, kart: TrackHint, edges = false): TrackHint {
  // the nearest road point in 3D sits uphill of the one straight below: look again from the road's height
  let at = track.nearest(pos, kart, BASE.tSearchWindow);
  below[0] = pos[0]; below[1] = track.sampleInto(at.t, 0, at.branch, under).groundY; below[2] = pos[2];
  at = track.nearest(below, at, BASE.tSearchWindow);
  const c = track.sampleInto(at.t, 0, at.branch, under);
  const h = Math.hypot(c.tangent[0], c.tangent[2]) || 1, reach = c.wall ?? c.halfWidth;
  const lateral = ((pos[0] - c.position[0]) * c.tangent[2] - (pos[2] - c.position[2]) * c.tangent[0]) / h;
  const side = lateral < 0 ? 1 : 2, inner = reach - CAM.wallClear;
  if (Math.abs(lateral) > inner && inner > 0 && (edges || !((c.open ?? 0) & side))) {
    // back inside the wall, square to the road (right = up × tangent)
    const out = lateral - Math.sign(lateral) * inner;
    pos[0] -= (c.tangent[2] / h) * out;
    pos[2] += (c.tangent[0] / h) * out;
  }
  const ground = track.sampleInto(at.t, Math.max(-reach, Math.min(reach, lateral)), at.branch, under).groundY;
  let y = Math.max(pos[1], ground + CAM.roadClear);
  const b = track.branches.list[at.branch] ?? track.branches.main, L = b.lut;
  const i = L.idx(Math.round(b.toLocal(at.t) * L.step));
  if (L.covered[i] || !Number.isNaN(L.bore[i])) y = Math.min(y, ground + BUILDER.tunnelWall - CAM.beamClear);
  pos[1] = y;
  return at;
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

const smooth01 = (x: number): number => { const k = x < 0 ? 0 : x > 1 ? 1 : x; return k * k * (3 - 2 * k); };
const ease = (rate: number, dt: number): number => 1 - Math.exp(-rate * dt);
const headingOfTangent = (s: TrackSample): number => Math.atan2(s.tangent[0], s.tangent[2]);

/**
 * Radians the road turns from the kart's spot to CAM.lookAheadSeconds of `speed` up it (+ left, like
 * yaw): what the aim looks into. 0 when the kart is not going the road's way. `out` is scratch.
 */
export function bendAhead(track: Track, t: number, branch: number, heading: number, speed: number, out: TrackSample): number {
  track.sampleInto(t, 0, branch, out);
  const here = headingOfTangent(out);
  if (Math.cos(wrapAngle(heading - here)) < 0.3) return 0; // the wrong way, or side-on after a spin
  const d = Math.max(CAM.lookAheadMin, Math.min(CAM.lookAheadMax, Math.abs(speed) * CAM.lookAheadSeconds));
  track.sampleInto(t + d / track.length, 0, branch, out);
  return wrapAngle(headingOfTangent(out) - here);
}

/**
 * Metres the road's place `at` (the road under the camera: clampToRoad) is inside a tunnel's bore
 * (positive: that far in from the nearer portal; negative: that far out in front of one), within
 * -CAM.portalLead .. CAM.portalFade; -Infinity farther out, or on a track with no tunnel.
 */
export function tunnelDepth(track: Track, at: TrackHint): number {
  if (!track.tunnels.length) return -Infinity;
  const b = track.branches.list[at.branch] ?? track.branches.main, L = b.lut;
  const ds = L.length / L.step, i = L.idx(Math.round(b.toLocal(at.t) * L.step));
  const inside = L.covered[i] !== 0;
  const reach = Math.ceil((inside ? CAM.portalFade : CAM.portalLead) / ds);
  for (let k = 1; k <= reach; k++) {
    const a = L.idx(i + k), c = L.idx(i - k);
    // the first sample either way on the other side of a portal
    if ((a !== i && (L.covered[a] !== 0) !== inside) || (c !== i && (L.covered[c] !== 0) !== inside)) return (inside ? 1 : -1) * (k - 0.5) * ds;
  }
  return inside ? CAM.portalFade : -Infinity;
}

/** Metres the camera falls back (+) or closes in (−) for a kart at speed `v` against the camera's own eased `eased` (the surge). */
export function surgeOffset(v: number, eased: number): number {
  return Math.max(-CAM.surgeClose, Math.min(CAM.surgeMax, (v - eased) * CAM.surgeBack));
}

/** The sea's surface on a water track (its ground plane), else -Infinity. */
export function seaLevel(track: Track): number {
  return track.def.environment?.ground?.kind === 'water' ? track.groundPlaneY : -Infinity;
}

/**
 * Where the chase camera settles behind kart `k` at rest (on the grid before the go): the pose update()
 * holds there, kept over the road and out of the sea as it keeps it. The course intro (intro.ts) ends
 * on it and hands over with ChaseCam.reset(k, rest). Writes `out` when given.
 */
export function restPose(track: Track, k: KartState, out?: CamPose): CamPose {
  const o = idealPose(k.position, k.heading, 0, false, 0, out);
  clampToRoad(track, o.position, k);
  const sea = seaLevel(track);
  if (o.position[1] < sea + CAM.seaClear) o.position[1] = sea + CAM.seaClear;
  return o;
}

/**
 * The chase camera (plan §4.7), for whichever kart it follows. It rides with the kart and eases only
 * its offset; its yaw lags the kart's so a turn or a drift shows; it falls back as the kart surges
 * and closes in as it brakes; a running boost holds the view a little wider and farther back (a
 * boost's punch comes from juice.ts CameraKick: `kickBack` here, its FOV in main.ts); it looks into
 * the bend ahead; it lifts over a Strike Ball; it swings smoothly out to a loop's side view and back;
 * it never follows a falling kart into the sea; it stays over the road, inside the walls and under a
 * tunnel's beams. Nothing here touches the sim, and nothing allocates per frame.
 */
export class ChaseCam {
  /** the camera's place and aim this frame (main.ts adds the shake) */
  readonly pos: Vec3 = [0, 20, 40];
  readonly look: Vec3 = [0, 0, 0];
  /** vertical field of view before the punch: speed, plus a running boost's hold */
  fov: number = CAM.fov;
  /** 0..1, eased: how far the view has swung out to a loop's side view */
  loopBlend = 0;
  /** 0..1, eased: how deep in a tunnel the camera is (main.ts dims the day's light by it) */
  tunnel = 0;
  /** 0..1, eased: how much of a running boost's hold the view shows */
  hold = 0;
  /** the chase rig's own place and aim: kept live through a loop's side view, so the swing back lands on it */
  private readonly rig: Vec3 = [0, 0, 0];
  private readonly rigLook: Vec3 = [0, 0, 0];
  /** the followed point last frame: the rig rides along by its move before it eases */
  private readonly last: Vec3 = [0, 0, 0];
  private readonly at: Vec3 = [0, 0, 0];
  private readonly pose: CamPose = { position: [0, 0, 0], target: [0, 0, 0] };
  /** the loop whose side view this is (worked out once per loop) and its ring's centre */
  private sideOf: TrackLoop | null = null;
  /** that loop's foot and forward (the side view holds until the kart is clear of its ring), and seconds since its ride ended */
  private readonly foot: Vec3 = [0, 0, 0];
  private readonly ahead: Vec3 = [0, 0, 1];
  private readonly across: Vec3 = [1, 0, 0];
  private sinceRide = 0;
  private readonly side: CamPose = { position: [0, 0, 0], target: [0, 0, 0] };
  private readonly ring: Vec3 = [0, 0, 0];
  private readonly scratch: TrackSample = { position: [0, 0, 0], tangent: [0, 0, 0], normal: [0, 0, 0], groundY: 0, halfWidth: 0, surface: 'road', gripScale: 1 };
  private yaw = 0;
  private speed = 0;
  private surgeSpeed = 0;
  private ride = 0;
  private aim = 0;
  private swing = 0;
  /** the height a kart that went off the road started to fall from (NaN: it has not) */
  private fallFrom = NaN;
  /** the height the camera follows: the kart's, but eased through a fall and the claw's carry and back after */
  private followY = 0;
  private easingY = false;
  /** the road under the camera last frame: where to look for it while the claw carries the kart (its own place on the track stands still meanwhile) */
  private readonly road: TrackHint = { t: 0, branch: 0 };

  /**
   * A new race: start 12 m back and 6 m up from `k`, so the countdown swoops in; or, after a course
   * intro, at `rest` (restPose), where the intro's crane landed, so the hand-over does not move.
   */
  reset(k: KartState, rest?: CamPose): void {
    const s = Math.sin(k.heading), c = Math.cos(k.heading), p = k.position;
    this.rig[0] = p[0] - s * 12; this.rig[1] = p[1] + 6; this.rig[2] = p[2] - c * 12;
    for (let i = 0; i < 3; i++) { this.rigLook[i] = p[i]; this.last[i] = p[i]; this.pos[i] = this.rig[i]; this.look[i] = p[i]; }
    if (rest) for (let i = 0; i < 3; i++) { this.rig[i] = this.pos[i] = rest.position[i]; this.rigLook[i] = this.look[i] = rest.target[i]; }
    this.yaw = k.heading;
    this.speed = 0; this.surgeSpeed = 0; this.ride = 0; this.aim = 0; this.swing = 0; this.hold = 0;
    this.loopBlend = 0; this.sideOf = null; this.sinceRide = 0; this.tunnel = 0; this.fallFrom = NaN;
    this.followY = p[1]; this.easingY = false; this.road.t = k.t; this.road.branch = k.branch;
    this.fov = fovFor(0);
  }

  /**
   * One rendered frame. `root` is the kart's drawn place (interpolated) and `viewYaw` its drawn heading;
   * `kickBack` the punch's pull-back now (metres, CameraKick.back).
   */
  update(track: Track, k: KartState, root: { x: number; y: number; z: number }, viewYaw: number, lookBack: boolean, kickBack: number, reduced: boolean, dt: number): void {
    const at = this.at;
    at[0] = root.x; at[1] = root.y; at[2] = root.z;
    // off the road (off a pier into the sea, off a sky road): follow it down a little, then watch from
    // there while the claw comes and carries it back; never below the water's surface
    const sea = seaLevel(track), off = k.status.falling || k.status.held;
    if (off && Number.isNaN(this.fallFrom)) this.fallFrom = at[1];
    if (!off) this.fallFrom = NaN;
    let wantY = Math.max(off ? Math.max(at[1], this.fallFrom - CAM.fallFollow) : at[1], sea + CAM.seaFollow);
    if (k.status.held) wantY = Math.min(wantY, Math.max(this.fallFrom, sea + CAM.seaFollow) + CAM.carryRise);
    if (off) this.easingY = true;
    if (this.easingY) {
      this.followY += (wantY - this.followY) * ease(CAM.fallEase, dt);
      if (!off && Math.abs(wantY - this.followY) < 0.02) this.easingY = false;
    } else this.followY += (wantY - this.followY) * ease(CAM.heightLag, dt);
    at[1] = this.followY;

    const want = travelYaw(viewYaw, k.speed, k.lateralVelocity, k.drift.active);
    this.yaw = chaseYaw(this.yaw, want, lookBack ? CAM.flipLag : CAM.yawLag, dt);
    this.speed = easedSpeed(this.speed, k.speed, dt);
    const r = reduced ? JUICE.reducedKick : 1;
    // look into the bend ahead (it helps read the road, so reduced motion keeps half of it)
    const bend = !lookBack && k.speed > CAM.aimMinSpeed ? bendAhead(track, k.t, k.branch, this.yaw, k.speed, this.scratch) : 0;
    const aimWant = Math.max(-CAM.lookIntoMax, Math.min(CAM.lookIntoMax, bend * CAM.lookInto)) * (reduced ? 0.5 : 1);
    this.aim += (aimWant - this.aim) * ease(CAM.lookIntoLag, dt);
    const pose = idealPose(at, this.yaw, this.speed, lookBack, this.aim, this.pose);
    // the surge, and a boost's hold and punch: farther back as the kart pulls away, closer as it brakes
    const v = Math.abs(k.speed);
    this.surgeSpeed += (v - this.surgeSpeed) * ease(CAM.surgeLag, dt);
    const surge = surgeOffset(v, this.surgeSpeed);
    const holdWant = boostHold(k.boost.remaining, k.boost.multiplier);
    this.hold += (holdWant - this.hold) * ease(holdWant > this.hold ? JUICE.holdIn : JUICE.holdOut, dt);
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    // swing wide of a bend or a drift (the screen's right is (-cos yaw, 0, sin yaw); + aim and + drift direction are to its left)
    const swingWant = lookBack ? 0 : Math.max(-CAM.swingMax, Math.min(CAM.swingMax,
      (this.aim / CAM.lookIntoMax) * CAM.swingBend + (k.drift.active && k.grounded ? k.drift.direction * CAM.swingDrift : 0))) * r;
    this.swing += (swingWant - this.swing) * ease(CAM.swingLag, dt);
    if (!lookBack) {
      const back = (surge + JUICE.holdBack * this.hold) * r + kickBack;
      pose.position[0] -= fx * back + fz * this.swing; pose.position[2] -= fz * back - fx * this.swing;
    }
    // inside a Strike Ball: lift the camera over the ball
    this.ride += ((k.status.rideRemaining > 0 ? 1 : 0) - this.ride) * ease(CAM.rideEase, dt);
    if (this.ride > 0.001) {
      const dir = lookBack ? -1 : 1;
      pose.position[0] -= fx * dir * CAM.rideBack * this.ride; pose.position[2] -= fz * dir * CAM.rideBack * this.ride;
      pose.position[1] += CAM.rideUp * this.ride; pose.target[1] += CAM.rideUp * 0.5 * this.ride;
    }
    // the rig rides with the kart, then eases its offset: turns and look-back still swing, speed adds no trail
    const lag = lookBack ? CAM.flipLag : CAM.lag;
    const jump = Math.hypot(at[0] - this.last[0], at[2] - this.last[2]);
    carry(this.rig, this.last, at);
    carry(this.rigLook, this.last, at);
    this.last[0] = at[0]; this.last[1] = at[1]; this.last[2] = at[2];
    smoothTo(this.rig, pose.position, lag, dt);
    // over the road under the camera, and under a tunnel's beams: the pose rides the kart's height. While
    // the claw carries a kart its own place on the track stands still: follow the road under the camera
    // (found afresh after a jump), and keep inside the open edges too
    if (off && jump > CAM.lookupJump) { const g = track.nearestGlobal(this.rig); this.road.t = g.t; this.road.branch = g.branch; }
    const road = clampToRoad(track, this.rig, off ? this.road : k, off);
    this.road.t = road.t; this.road.branch = road.branch;
    smoothTo(this.rigLook, pose.target, lag, dt);

    // a loop-the-loop: swing out to the side view over loopIn, and back behind the kart over loopOut
    const loop = k.status.loopIndex >= 0 ? track.loops[k.status.loopIndex] : undefined;
    if (loop && loop !== this.sideOf) {
      const lp = loopCamPose(track, loop), f = loopFrame(track, loop);
      for (let i = 0; i < 3; i++) { this.side.position[i] = lp.position[i]; this.side.target[i] = lp.target[i]; this.ring[i] = lp.target[i]; this.foot[i] = f.origin[i]; this.ahead[i] = f.forward[i]; this.across[i] = f.right[i]; }
      this.sideOf = loop;
    }
    this.sinceRide = loop ? 0 : this.sinceRide + dt;
    // after the ride: hold the side view until the kart is clear of the ring's front
    const past = (at[0] - this.foot[0]) * this.ahead[0] + (at[2] - this.foot[2]) * this.ahead[2];
    const hold = !loop && this.sideOf !== null && this.loopBlend >= 1 && past < (this.sideOf.radius + CAM.loopClear) && this.sinceRide < CAM.loopHoldMax;
    this.loopBlend = Math.max(0, Math.min(1, this.loopBlend + (loop || hold ? dt / CAM.loopIn : -dt / CAM.loopOut)));
    const w = this.sideOf ? smooth01(this.loopBlend) : 0, wa = this.sideOf ? smooth01(this.loopBlend / CAM.loopAcross) : 0;
    // how far the side view (not a still: it slides a little with the kart round the ring) is across the road from the rig
    const u = this.across;
    let across = 0;
    for (let i = 0; i < 3; i++) across += (this.side.position[i] + (at[i] - this.ring[i]) * CAM.loopFollow - this.rig[i]) * u[i];
    for (let i = 0; i < 3; i++) {
      const off = at[i] - this.ring[i];
      const d = this.side.position[i] + off * CAM.loopFollow - this.rig[i];
      // across the road on its own, sooner: the rest of the way with the blend
      this.pos[i] = this.rig[i] + (d - across * u[i]) * w + across * u[i] * wa;
      // and it turns toward the kart
      this.look[i] = this.rigLook[i] + (this.ring[i] + off * CAM.loopTrack - this.rigLook[i]) * w;
    }
    // never under the sea's surface (the claw's catch is 5 m under a pier's deck)
    if (this.pos[1] < sea + CAM.seaClear) this.pos[1] = sea + CAM.seaClear;

    this.fov = fovFor(this.speed) + JUICE.holdFov * this.hold * r;
    // the mine: how deep the lens is, for the light
    const d = tunnelDepth(track, road);
    const inWant = d === -Infinity ? 0 : smooth01((d + CAM.portalLead) / (CAM.portalLead + CAM.portalFade));
    this.tunnel += (inWant - this.tunnel) * ease(CAM.tunnelEase, dt);
  }
}
