// The course intro (Adam, 24 Sept 2026: "a Mario Kart World-style course intro before every race").
// Before the countdown the camera flies the course in a few smooth moves: a high sweep toward the far
// landmark ahead of the start, a low glide along the track's signature stretch, a pass by the
// grandstand, and a crane down behind the player's kart that lands exactly on the chase camera's rest
// pose (ChaseCam.settle), so the countdown starts from the same view it always did. Time Trial and the
// Daily get a short one (the sweep and the crane); a restart and the attract race get none.
// The sim never steps meanwhile: the countdown's tick 0 comes after the intro, so input logs,
// determinism and leaderboard replays are what they were (intro.e2e.test.ts). Every move eases in and
// out (never a linear pan), cuts between moves, and stays clear of the scenery: the low moves are laid
// over the road, inside its walls, above it and under a tunnel's beams (clampToRoad, the chase camera's
// own rule), and every path is swept against the built scene headless. Mirror mode reflects every
// spot (lateral → −lateral), so the flight is the authored one seen in the mirror. Reduced motion holds
// each move as a still and cuts. Pure maths on the track spline: no Three.js here.
import type { KartState, TrackHint, TrackSample, Vec3 } from '../kart-controller/types.ts';
import { BUILDER } from '../track-builder/constants.ts';
import type { Track } from '../track-builder/track.ts';
import { CAM, clampToRoad, loopCamPose, type CamPose } from './camera.ts';

export type IntroKind = 'full' | 'short';

/**
 * A place in the track's own terms: main-line t (a shortcut's main-equivalent t with `branch`), metres
 * to the right of the centre line as authored (Mirror mode puts it on the left) and metres over the
 * ground there.
 */
export interface Spot { t: number; lat: number; up: number }

/** One track's intro, authored against its own road (see TRACK_INTROS). */
export interface TrackIntro {
  /**
   * The sweep: from → to high over the course, bowing `bow` metres to the right of the straight line
   * between them (negative: left), looking at the far landmark `drop` metres under its top, tilting up
   * to it from `tilt` metres lower still.
   */
  vista: { from: Spot; to: Spot; bow: number; drop: number; tilt: number };
  /**
   * The signature stretch: low along the road (a shortcut's with `branch`) from → to, looking `ahead`
   * metres up it (`aimUp` over it, `aimLat` across, else in the lens's lane), or at a spot, or at the
   * loop's ring; `eyes: 'free'` flies straight between the spots instead of along the road.
   */
  feature: { name: string; from: Spot; to: Spot; branch?: string; aim: { ahead: number; aimUp: number; aimLat?: number } | Spot | 'loop'; eyes?: 'road' | 'free' };
}

/** The grandstand by the start as built (findStand): the middle of its footprint on the track, its top, its length along the road (m). */
export interface StandSpot { t: number; lat: number; top: number; len: number }

export const INTRO = Object.freeze({
  /** seconds per move: the full intro (5.9 s) and the short one (2.5 s) */
  full: { vista: 1.7, feature: 1.5, stands: 1.25, crane: 1.45 },
  short: { vista: 1.1, crane: 1.4 },
  /** the title card starts to leave this many seconds into the flight (it is in from the start) */
  cardOut: { full: 4.15, short: 1.45 },
  /** vertical field of view per move, start → end (the crane ends on the chase camera's) */
  fov: { vista: [52, 50], feature: [64, 62], stands: [54, 52], crane: [56, CAM.fov] } as Record<string, readonly [number, number]>,
  /** share of a move spent speeding up and slowing down (sine ramps, so the pace never jumps) */
  ease: { vista: [0.5, 0.5], feature: [0.3, 0.3], stands: [0.35, 0.35], crane: [0.25, 0.55] } as Record<string, readonly [number, number]>,
  /** radians the sweep banks into its curve at its middle (a drone's lean) */
  bank: 0.08,
  /** the crane's start behind the player's kart: metres back, up, and across toward the road's middle */
  crane: { back: 15, up: 9.5, across: 4, lookAhead: 9, lookUp: 0.6 },
  /**
   * The grandstand pass: a truck along the road from `from` to `to` metres past the stand's middle,
   * `face` metres in front of its middle line and `up` metres over the ground, looking `lead` metres
   * along the stand's line from itself, `aimUp` over the ground: the crowd slides into the frame and the
   * move comes to rest on it. It trucks back toward the start line (a stand is 10 to 35 m past it), so
   * the start gantry and the grid stand behind the crowd and never across the lens.
   */
  stands: { from: 22, to: 8, face: 12.5, up: [3.6, 3.2] as const, aimUp: 3, lead: -8 },
  /** a low move passes no balloon closer than this (m, from its middle): it is lifted over them */
  balloonClear: 3.5,
  /** metres between the points a low move is laid through along the road */
  step: 3,
  /**
   * Seconds between a held title card leaving and the countdown (CourseIntro.waitFor: the card stayed
   * up while the race waited on something): its exit (380 ms, ui-hud intro.css) and a breath.
   */
  holdBeat: 0.45,
  /** a low move keeps this far inside the road's walls (on top of the chase camera's own margin) */
  wallMargin: 0.4,
});

// ---------------------------------------------------------------- the authored flights

/**
 * Per track, in its own terms (main-line t, metres right, metres up), from its geometry (probe of
 * 24 Sept 2026): the far landmark stands 330 to 610 m out, within 27° of straight ahead of the start.
 * The course creatures move meanwhile (the scene runs on toward the countdown: CourseIntro.sceneTime),
 * so a creature's stretch is timed to its act: the crab's crossing, the goose's charge, the yeti's throw.
 * The grandstand pass is laid from the stand as built (findStand), not authored.
 */
export const TRACK_INTROS: Readonly<Record<string, TrackIntro>> = Object.freeze({
  'harbour-loop': {
    vista: { from: { t: 0.975, lat: 20, up: 16 }, to: { t: 0.008, lat: -2, up: 30 }, bow: 16, drop: 75, tilt: 60 },
    // the pier ramp on the harbor side, the crab's stretch ahead
    feature: { name: 'pier', from: { t: 0.300, lat: -2.5, up: 4.4 }, to: { t: 0.338, lat: -1, up: 5.2 }, aim: { ahead: 28, aimUp: 2 } },
  },
  'meadow-run': {
    vista: { from: { t: 0.018, lat: 20, up: 16 }, to: { t: 0.048, lat: -2, up: 30 }, bow: 16, drop: 60, tilt: 60 },
    // the giant goose's charge down its straight: the lens backs away down the road ahead of it as it
    // comes on honking (charging t 0.2745 → 0.2456 over this move, 16 m back to 10 m from the lens)
    feature: { name: 'goose', from: { t: 0.258, lat: 2.5, up: 3.4 }, to: { t: 0.236, lat: 2, up: 3.8 }, aim: { ahead: 16, aimUp: 2, aimLat: -1 } },
  },
  'canyon-rush': {
    vista: { from: { t: 0.975, lat: 20, up: 17 }, to: { t: 0.01, lat: -2, up: 32 }, bow: 16, drop: 55, tilt: 60 },
    // up the mine shortcut's approach to the timber portal in the cliff (the mine mouth)
    feature: { name: 'mine', from: { t: 0.321, lat: 0, up: 3.4 }, to: { t: 0.347, lat: 0, up: 3 }, branch: 'mine-tunnel', aim: { ahead: 30, aimUp: 2.6 } },
  },
  'frostbite-pass': {
    vista: { from: { t: 0.985, lat: 20, up: 17 }, to: { t: 0.02, lat: -2, up: 32 }, bow: 16, drop: 170, tilt: 60 },
    // up the road under the yeti's ledge as it winds up and throws: the snowball lands ahead and rolls at the lens
    feature: { name: 'yeti', from: { t: 0.584, lat: 2, up: 3.4 }, to: { t: 0.604, lat: 1, up: 3.8 }, aim: { ahead: 30, aimUp: 3.5, aimLat: -7 } },
  },
  'boardwalk-nights': {
    vista: { from: { t: 0.075, lat: 20, up: 16 }, to: { t: 0.11, lat: -2, up: 28 }, bow: 13, drop: 55, tilt: 60 },
    // the neon loop-the-loop, side on as the karts see it
    feature: { name: 'loop', from: { t: 0.43, lat: -16, up: 7 }, to: { t: 0.452, lat: -17, up: 9 }, aim: 'loop', eyes: 'free' },
  },
  'skyline-circuit': {
    vista: { from: { t: 0.978, lat: 20, up: 14 }, to: { t: 0.012, lat: -2, up: 26 }, bow: 16, drop: 100, tilt: 60 },
    // along the rail between the islands
    feature: { name: 'rail', from: { t: 0.49, lat: 0, up: 3.2 }, to: { t: 0.53, lat: 0, up: 3.6 }, branch: 'sky-rail', aim: { ahead: 26, aimUp: 1 } },
  },
});

// ---------------------------------------------------------------- easing and paths

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/**
 * How far along a move (0..1) at time share `x` (0..1): it speeds up over the first `a` of the time,
 * cruises, and slows over the last `b`, on sine ramps, so it starts and stops at rest and its pace
 * never jumps (no linear pan, no lurch).
 */
export function glide(x: number, a: number, b: number): number {
  const k = clamp01(x), v = 1 / (1 - (a + b) / 2);
  if (a > 0 && k < a) return v * (k / 2 - (a / (2 * Math.PI)) * Math.sin((Math.PI * k) / a));
  const y = 1 - k;
  if (b > 0 && y < b) return 1 - v * (y / 2 - (b / (2 * Math.PI)) * Math.sin((Math.PI * y) / b));
  return v * (a / 2 + (k - a));
}

/** Samples per segment of a Rail's length table. */
const SUB = 32;

/** A smooth path through points (Catmull-Rom), walked by distance along it, so an eased share of it is an eased share of the way. */
export class Rail {
  readonly length: number;
  private readonly p: Float64Array;
  private readonly n: number;
  /** cumulative length at each of SUB samples per segment */
  private readonly lens: Float64Array;

  constructor(points: readonly Vec3[]) {
    if (!points.length) throw new Error('Rail: no points');
    this.n = points.length;
    this.p = new Float64Array(this.n * 3);
    points.forEach((q, i) => { this.p[i * 3] = q[0]; this.p[i * 3 + 1] = q[1]; this.p[i * 3 + 2] = q[2]; });
    const segs = Math.max(0, this.n - 1);
    this.lens = new Float64Array(segs * SUB + 1);
    const a: Vec3 = [0, 0, 0], b: Vec3 = [0, 0, 0];
    this.point(0, 0, a);
    let total = 0;
    for (let s = 0; s < segs; s++) {
      for (let k = 1; k <= SUB; k++) {
        this.point(s, k / SUB, b);
        total += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
        this.lens[s * SUB + k] = total;
        a[0] = b[0]; a[1] = b[1]; a[2] = b[2];
      }
    }
    this.length = total;
  }

  /** Control point i, the ends extended in a straight line. */
  private c(i: number, axis: number): number {
    const n = this.n, p = this.p;
    if (i < 0) return n > 1 ? 2 * p[axis] - p[3 + axis] : p[axis];
    if (i >= n) return n > 1 ? 2 * p[(n - 1) * 3 + axis] - p[(n - 2) * 3 + axis] : p[axis];
    return p[i * 3 + axis];
  }

  /** The curve on segment `s` at `u` (0..1). */
  private point(s: number, u: number, out: Vec3): Vec3 {
    if (this.n === 1) { out[0] = this.p[0]; out[1] = this.p[1]; out[2] = this.p[2]; return out; }
    const u2 = u * u, u3 = u2 * u;
    for (let ax = 0; ax < 3; ax++) {
      const p0 = this.c(s - 1, ax), p1 = this.c(s, ax), p2 = this.c(s + 1, ax), p3 = this.c(s + 2, ax);
      out[ax] = 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3);
    }
    return out;
  }

  /** The point `share` (0..1) of the way along by distance. Writes `out`. */
  at(share: number, out: Vec3): Vec3 {
    if (this.n === 1 || this.length <= 0) return this.point(0, 0, out);
    const d = clamp01(share) * this.length, L = this.lens;
    let lo = 0, hi = L.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (L[mid] < d) lo = mid; else hi = mid; }
    const span = L[hi] - L[lo], f = span > 0 ? (d - L[lo]) / span : 0;
    const k = lo + f, s = Math.min(this.n - 2, Math.floor(k / SUB));
    return this.point(s, (k - s * SUB) / SUB, out);
  }
}

// ---------------------------------------------------------------- the plan

/** One move: where the lens goes and where it looks, over `secs`, from `start` seconds into the intro. */
export interface Move {
  name: 'vista' | 'feature' | 'stands' | 'crane';
  start: number;
  secs: number;
  eyes: Rail;
  aim: Rail;
  fov: readonly [number, number];
  ease: readonly [number, number];
  /** radians of roll at the move's middle (sin-shaped over it; + counter-clockwise as the lens sees it) */
  bank?: number;
}

export interface IntroPlan {
  kind: IntroKind;
  moves: Move[];
  /** seconds, all moves */
  duration: number;
  /** seconds in when the title card starts to leave */
  cardOut: number;
  /** where it ends: the chase camera's rest pose behind the player's kart */
  rest: CamPose;
}

/** What the plan is laid against: the race's track (mirrored or not), its far landmark, and the player's kart and chase rest pose. */
export interface IntroScene {
  track: Track;
  /** the far vista's landmark ahead of the start line (TrackScene.farLandmark); absent: the sweep looks up the start straight */
  farLandmark?: readonly [number, number, number];
  kart: Pick<KartState, 'position' | 'heading' | 't' | 'branch'>;
  /** the chase camera's rest pose behind that kart (ChaseCam.restPose) */
  rest: CamPose;
  /** the grandstand by the start (findStand); absent: no pass by it */
  stand?: StandSpot;
}

const scratch: TrackSample = { position: [0, 0, 0], tangent: [0, 0, 0], normal: [0, 0, 0], groundY: 0, halfWidth: 0, surface: 'road', gripScale: 1 };

/** The branch index of a shortcut by id (0, the main line, when absent or unknown). */
function branchOf(track: Track, id?: string): number {
  return id ? track.branches.byId(id)?.index ?? 0 : 0;
}

/** Metres of road per unit of main-equivalent t on a branch (a shortcut runs its own length over its span of the lap). */
function metresPerT(track: Track, branch: number): number {
  const b = track.branches.list[branch] ?? track.branches.main;
  return b.lut.length / (b.span || 1);
}

/** A spot in the world: on the mirrored track its lateral is flipped, so it is the authored spot reflected. */
export function spotAt(track: Track, s: Spot, branch = 0): Vec3 {
  const side = track.def.mirrored ? -1 : 1;
  track.sampleInto(s.t, s.lat * side, branch, scratch);
  return [scratch.position[0], scratch.groundY + s.up, scratch.position[2]];
}

/** Keep a low move's point over the road: inside its walls (with a margin), over it and under a tunnel's beams. */
function onRoad(track: Track, p: Vec3, hint: TrackHint): TrackHint {
  const at = clampToRoad(track, p, hint);
  // a little further in than the chase camera's own margin: the lens swings less than a chase rig
  track.sampleInto(at.t, 0, at.branch, scratch);
  const h = Math.hypot(scratch.tangent[0], scratch.tangent[2]) || 1;
  const rx = scratch.tangent[2] / h, rz = -scratch.tangent[0] / h;
  const lateral = (p[0] - scratch.position[0]) * rx + (p[2] - scratch.position[2]) * rz;
  const reach = Math.max(0, (scratch.wall ?? scratch.halfWidth) - CAM.wallClear - INTRO.wallMargin);
  if (Math.abs(lateral) > reach) {
    const out = lateral - Math.sign(lateral) * reach;
    p[0] -= rx * out; p[2] -= rz * out;
  }
  return at;
}

/** Points along the road from spot `a` to spot `b` (t, lateral and height eased between), every INTRO.step metres; low ones kept over the road. */
function alongRoad(track: Track, a: Spot, b: Spot, branch: number, keepOnRoad: boolean): Vec3[] {
  const dt = ((b.t - a.t) % 1 + 1.5) % 1 - 0.5; // the short way round (a move may cross the start line)
  const n = Math.max(3, Math.ceil((Math.abs(dt) * metresPerT(track, branch)) / INTRO.step));
  const out: Vec3[] = [];
  let hint: TrackHint = { t: a.t, branch };
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const s: Spot = { t: (((a.t + dt * k) % 1) + 1) % 1, lat: a.lat + (b.lat - a.lat) * k, up: a.up + (b.up - a.up) * k };
    const p = spotAt(track, s, branch);
    if (keepOnRoad) hint = onRoad(track, p, hint);
    out.push(p);
  }
  if (keepOnRoad) overBalloons(track, out);
  return out;
}

/**
 * Lift a low move as a whole (no hop in it) until it passes over every balloon on its way by
 * INTRO.balloonClear from each balloon's middle: they float over the road, and the lens is the height
 * of one (the karts pop them; the intro's camera would fly through them).
 */
function overBalloons(track: Track, pts: Vec3[]): void {
  const r = INTRO.balloonClear, top = BUILDER.balloonHeight;
  let lift = 0;
  for (const f of track.features) {
    if (f.kind !== 'pickup') continue;
    const bx = f.position[0], by = f.position[1] + top, bz = f.position[2];
    for (const p of pts) {
      const dx = p[0] - bx, dz = p[2] - bz, flat = dx * dx + dz * dz;
      if (flat >= r * r) continue;
      // the height over the balloon's middle that puts the lens r away from it
      lift = Math.max(lift, by + Math.sqrt(r * r - flat) - p[1]);
    }
  }
  if (lift > 0) for (const p of pts) p[1] += lift;
}

const lerp3 = (a: readonly number[], b: readonly number[], k: number): Vec3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

/** The sweep: a bowed line high over the course, the aim tilting up from the course to the far landmark; the short intro flies only the last `share` of it (as fast as the full one). */
function vistaMove(sc: IntroScene, v: TrackIntro['vista'], start: number, secs: number, share = 1): Move {
  const { track } = sc;
  const k = 1 - share, dt = ((v.to.t - v.from.t) % 1 + 1.5) % 1 - 0.5;
  const from: Spot = { t: v.from.t + dt * k, lat: v.from.lat + (v.to.lat - v.from.lat) * k, up: v.from.up + (v.to.up - v.from.up) * k };
  const a = spotAt(track, from), b = spotAt(track, v.to);
  // bow to the right of the line a → b (right = up × forward); Mirror mode bows the other way
  const dx = b[0] - a[0], dz = b[2] - a[2], l = Math.hypot(dx, dz) || 1, side = track.def.mirrored ? -1 : 1;
  const mid = lerp3(a, b, 0.5);
  mid[0] += (dz / l) * v.bow * share * side; mid[2] += (-dx / l) * v.bow * share * side;
  const far = sc.farLandmark;
  // no landmark: look on up the start straight
  const end: Vec3 = far ? [far[0], far[1] - v.drop, far[2]] : spotAt(track, { t: v.to.t + 150 / track.length, lat: 0, up: 10 });
  // tilting up: the aim rises straight up to it, so the view turns at an even pace
  // it leans into its curve: the bow bulges to the lens's left (a track's +lateral is the screen's left
  // looking up it), so the curve turns right, and the lens rolls clockwise (negative) into it
  const bank = -Math.sign(v.bow * side) * INTRO.bank;
  return { name: 'vista', start, secs, eyes: new Rail([a, mid, b]), aim: new Rail([[end[0], end[1] - v.tilt, end[2]], end]), fov: INTRO.fov.vista, ease: INTRO.ease.vista, bank };
}

/** The signature stretch: low along the road, or free (the loop's side view). */
function featureMove(sc: IntroScene, f: TrackIntro['feature'], start: number, secs: number): Move {
  const { track } = sc;
  const branch = branchOf(track, f.branch);
  const free = f.eyes === 'free';
  const eyes = new Rail(free ? [spotAt(track, f.from, branch), spotAt(track, { t: (f.from.t + f.to.t) / 2, lat: (f.from.lat + f.to.lat) / 2, up: (f.from.up + f.to.up) / 2 }, branch), spotAt(track, f.to, branch)] : alongRoad(track, f.from, f.to, branch, true));
  let aim: Rail;
  if (f.aim === 'loop') {
    const l = track.loops[0];
    aim = new Rail([l ? loopCamPose(track, l).target : spotAt(track, { t: f.to.t, lat: 0, up: 6 }, branch)]);
  } else if ('ahead' in f.aim) {
    const lead = f.aim.ahead / metresPerT(track, branch), up = f.aim.aimUp, lat = f.aim.aimLat;
    aim = new Rail(alongRoad(track, { t: f.from.t + lead, lat: lat ?? f.from.lat, up }, { t: f.to.t + lead, lat: lat ?? f.to.lat, up }, branch, false));
  } else aim = new Rail([spotAt(track, f.aim, branch)]);
  return { name: 'feature', start, secs, eyes, aim, fov: INTRO.fov.feature, ease: INTRO.ease.feature };
}

/** The grandstand pass: a truck along the road in front of the stand, the lens a little above the crowd's heads, the crowd sliding through the frame. */
function standsMove(sc: IntroScene, stand: StandSpot, start: number, secs: number): Move {
  const { track } = sc, c = INTRO.stands, mt = metresPerT(track, 0), side = track.def.mirrored ? -1 : 1;
  // the stand as authored: its lateral as the unmirrored track has it (spotAt mirrors it back)
  const lat = stand.lat * side, dir = Math.sign(lat) || 1;
  const eyeLat = dir * Math.max(0, Math.abs(lat) - c.face);
  const at = (m: number, l: number, up: number): Spot => ({ t: stand.t + m / mt, lat: l, up });
  return {
    name: 'stands', start, secs,
    eyes: new Rail(alongRoad(track, at(c.from, eyeLat, c.up[0]), at(c.to, eyeLat, c.up[1]), 0, true)),
    aim: new Rail(alongRoad(track, at(c.from + c.lead, lat, c.aimUp), at(c.to + c.lead, lat, c.aimUp), 0, false)),
    fov: INTRO.fov.stands, ease: INTRO.ease.stands,
  };
}

/**
 * The biggest grandstand within `reach` metres of the start line, from the world positions of the
 * stands as built (art-pipeline crowd.ts merges them into one mesh, 'crowd-stands'): the vertices
 * gathered into 2.5 m cells, touching cells joined, the most vertices winning.
 */
export function findStand(track: Track, positions: ArrayLike<number>, reach = 80): StandSpot | undefined {
  const s0 = track.sample(track.startT, 0).position, CELL = 2.5;
  const cells = new Map<number, { n: number; x0: number; x1: number; z0: number; z1: number; top: number }>();
  const key = (i: number, j: number) => (i + 32768) * 65536 + (j + 32768);
  for (let v = 0; v + 2 < positions.length; v += 3) {
    const x = positions[v], y = positions[v + 1], z = positions[v + 2];
    if (Math.hypot(x - s0[0], z - s0[2]) > reach) continue;
    const k = key(Math.floor(x / CELL), Math.floor(z / CELL));
    const c = cells.get(k);
    if (c) { c.n++; c.x0 = Math.min(c.x0, x); c.x1 = Math.max(c.x1, x); c.z0 = Math.min(c.z0, z); c.z1 = Math.max(c.z1, z); c.top = Math.max(c.top, y); }
    else cells.set(k, { n: 1, x0: x, x1: x, z0: z, z1: z, top: y });
  }
  const seen = new Set<number>();
  let best: { n: number; x0: number; x1: number; z0: number; z1: number; top: number } | undefined;
  for (const k0 of cells.keys()) {
    if (seen.has(k0)) continue;
    const g = { n: 0, x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity, top: -Infinity };
    const todo = [k0];
    seen.add(k0);
    while (todo.length) {
      const k = todo.pop()!, c = cells.get(k)!;
      g.n += c.n; g.x0 = Math.min(g.x0, c.x0); g.x1 = Math.max(g.x1, c.x1); g.z0 = Math.min(g.z0, c.z0); g.z1 = Math.max(g.z1, c.z1); g.top = Math.max(g.top, c.top);
      const i = Math.floor(k / 65536) - 32768, j = (k % 65536) - 32768;
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
        const n = key(i + di, j + dj);
        if (!seen.has(n) && cells.has(n)) { seen.add(n); todo.push(n); }
      }
    }
    if (!best || g.n > best.n) best = g;
  }
  if (!best) return undefined;
  const cx = (best.x0 + best.x1) / 2, cz = (best.z0 + best.z1) / 2;
  const t = track.nearestTGlobal([cx, best.top, cz]);
  track.sampleInto(t, 0, 0, scratch);
  const h = Math.hypot(scratch.tangent[0], scratch.tangent[2]) || 1;
  const lat = ((cx - scratch.position[0]) * scratch.tangent[2] - (cz - scratch.position[2]) * scratch.tangent[0]) / h;
  const len = Math.abs((best.x1 - best.x0) * scratch.tangent[0] + (best.z1 - best.z0) * scratch.tangent[2]) / h;
  return { t, lat, top: best.top - scratch.position[1], len };
}

/** The crane: from high behind the player's kart, down onto the chase camera's rest pose, the aim coming down the grid onto the chase camera's. */
function craneMove(sc: IntroScene, start: number, secs: number): Move {
  const { track, kart, rest } = sc;
  const c = INTRO.crane, p = kart.position;
  const fx = Math.sin(kart.heading), fz = Math.cos(kart.heading);
  // across toward the road's middle from the kart's slot (a kart on the centre line: to the right as authored)
  track.sampleInto(kart.t, 0, kart.branch, scratch);
  const h = Math.hypot(scratch.tangent[0], scratch.tangent[2]) || 1, rx = scratch.tangent[2] / h, rz = -scratch.tangent[0] / h;
  const lateral = (p[0] - scratch.position[0]) * rx + (p[2] - scratch.position[2]) * rz;
  const toMid = Math.abs(lateral) > 0.3 ? -Math.sign(lateral) : track.def.mirrored ? -1 : 1;
  const from: Vec3 = [p[0] - fx * c.back + rx * c.across * toMid, p[1] + c.up, p[2] - fz * c.back + rz * c.across * toMid];
  onRoad(track, from, { t: kart.t, branch: kart.branch });
  const to = rest.position;
  // a crane's arc: it drops most of the height early and comes in behind the kart along the chase camera's line
  const mid: Vec3 = lerp3(from, to, 0.5);
  mid[1] = to[1] + (from[1] - to[1]) * 0.35;
  const lookFrom: Vec3 = [p[0] + fx * c.lookAhead, p[1] + c.lookUp, p[2] + fz * c.lookAhead];
  return {
    name: 'crane', start, secs,
    eyes: new Rail([from, mid, [to[0], to[1], to[2]]]),
    aim: new Rail([lookFrom, [rest.target[0], rest.target[1], rest.target[2]]]),
    fov: INTRO.fov.crane, ease: INTRO.ease.crane,
  };
}

/** The flight for this race: the authored moves for its track (a track with none gets the crane alone). */
export function planIntro(sc: IntroScene, kind: IntroKind): IntroPlan {
  const spec = TRACK_INTROS[sc.track.def.id];
  const moves: Move[] = [];
  let t = 0;
  const add = (m: Move) => { moves.push(m); t += m.secs; };
  if (kind === 'full') {
    const d = INTRO.full;
    if (spec) {
      add(vistaMove(sc, spec.vista, t, d.vista));
      add(featureMove(sc, spec.feature, t, d.feature));
      if (sc.stand) add(standsMove(sc, sc.stand, t, d.stands));
    }
    add(craneMove(sc, t, d.crane));
  } else {
    const d = INTRO.short;
    if (spec) add(vistaMove(sc, spec.vista, t, d.vista, d.vista / INTRO.full.vista));
    add(craneMove(sc, t, d.crane));
  }
  const cardOut = Math.min(kind === 'full' ? INTRO.cardOut.full : INTRO.cardOut.short, Math.max(0, t - 0.8));
  return { kind, moves, duration: t, cardOut, rest: { position: [...sc.rest.position], target: [...sc.rest.target] } };
}

/** The camera at one moment of an intro. */
/** `roll`: radians about the view axis, + counter-clockwise as the lens sees it (main.ts rotates the camera by it) */
export interface IntroView { pos: Vec3; look: Vec3; fov: number; roll: number; move: number }

/**
 * The camera `time` seconds into `plan`. Reduced motion holds each move still (the sweep and the
 * glides at their middle, the crane at its end: the chase camera's rest pose) and cuts between them.
 * Writes `out`; allocates nothing.
 */
export function sampleIntro(plan: IntroPlan, time: number, reduced: boolean, out: IntroView): IntroView {
  const moves = plan.moves;
  let i = 0;
  while (i < moves.length - 1 && time >= moves[i].start + moves[i].secs) i++;
  const m = moves[i];
  if (!m || time >= plan.duration) {
    for (let k = 0; k < 3; k++) { out.pos[k] = plan.rest.position[k]; out.look[k] = plan.rest.target[k]; }
    out.fov = CAM.fov;
    out.roll = 0;
    out.move = moves.length;
    return out;
  }
  const x = (time - m.start) / m.secs;
  const u = reduced ? (m.name === 'crane' ? 1 : 0.5) : glide(x, m.ease[0], m.ease[1]);
  m.eyes.at(u, out.pos);
  m.aim.at(u, out.look);
  out.fov = m.fov[0] + (m.fov[1] - m.fov[0]) * u;
  out.roll = reduced ? 0 : (m.bank ?? 0) * Math.sin(Math.PI * u);
  out.move = i;
  return out;
}

/**
 * One race's intro as it plays: its clock runs only once the race's shaders are ready (performance
 * warm-up: never a compile stall mid-move) and while the game is not paused; a skip ends it at once.
 * A race can have its countdown wait past the flight for something (waitFor: its racers' models, on
 * a slow line), with a cap: the camera rests on the chase camera's pose and the title card stays up
 * until it comes, then leaves, and the countdown follows a beat later (INTRO.holdBeat).
 */
export class CourseIntro {
  readonly plan: IntroPlan;
  /** seconds of flight shown */
  time = 0;
  /** the flight has started to move (the warm-up is over and its first frame is drawn) */
  moving = false;
  private skipped = false;
  /** what the countdown waits for past the flight, and for how long at most (seconds past its end) */
  private hold: { ready: () => boolean; cap: number } | null = null;
  /** seconds since the flight ended (played through or skipped): the wait */
  private over = 0;
  /** the clock (flight and wait) when the wait was over: what it waited for came, or the cap was a card's exit away */
  private freeAt: number | null = null;
  private readonly view: IntroView = { pos: [0, 0, 0], look: [0, 0, 0], fov: CAM.fov, roll: 0, move: 0 };

  constructor(plan: IntroPlan) { this.plan = plan; }

  /** The flight is over: played through or skipped (the countdown may still wait: waitFor). */
  get flightOver(): boolean { return this.skipped || this.time >= this.plan.duration; }

  /** Seconds since the flight began, the wait past its end included. */
  get clock(): number { return this.time + this.over; }

  /**
   * Over: the flight played through or skipped, and anything waited for is here (or the wait ran
   * out). Free before the card was due, the countdown comes on time (a skip: at once); later, a beat
   * after the card leaves.
   */
  get done(): boolean {
    if (!this.flightOver) return false;
    if (!this.hold) return true;
    if (this.freeAt === null) return false;
    return this.freeAt <= (this.skipped ? this.time : this.plan.cardOut) || this.clock >= this.freeAt + INTRO.holdBeat - 1e-9;
  }

  /** Skip what is left (any button or a tap). */
  skip(): void { this.skipped = true; this.release(); }

  /**
   * Hold the countdown past the flight until `ready()` (checked each frame), at most `cap` seconds
   * past the flight's end; the title card stays up meanwhile.
   */
  waitFor(ready: () => boolean, cap: number): void {
    this.hold = { ready, cap };
    this.release();
  }

  /** Whether the countdown is being held past the flight (the flight over, the wait not). */
  get waiting(): boolean { return this.flightOver && !this.done; }

  /** The title card is leaving (or gone). */
  get cardLeaving(): boolean {
    if (this.done) return true;
    if (!this.hold) return this.time >= this.plan.cardOut;
    return this.freeAt !== null && (this.time >= this.plan.cardOut || this.flightOver);
  }

  /** One drawn frame: `dt` seconds of flight (or of the wait past it), when it runs (the caller passes 0 while paused or warming up). */
  advance(dt: number): void {
    if (this.done) return;
    const d = Math.max(0, dt);
    if (this.flightOver) this.over += d; else this.time = Math.min(this.plan.duration, this.time + d);
    this.release();
  }

  /** Latch the moment the wait is over: what it waits for is here, or the cap is a card's exit away. */
  private release(): void {
    const h = this.hold;
    if (!h || this.freeAt !== null) return;
    if (h.ready() || (this.flightOver && this.over >= h.cap - INTRO.holdBeat)) this.freeAt = this.clock;
  }

  /** The move on screen (plan.moves index; its length once the flight is over): a change from the last frame is a cut. */
  get move(): number {
    if (this.flightOver) return this.plan.moves.length;
    const m = this.plan.moves;
    let i = 0;
    while (i < m.length - 1 && this.time >= m[i].start + m[i].secs) i++;
    return i;
  }

  /** Race time to draw the course at meanwhile (its creatures and hazards): `raceTime` (the sim's, frozen at tick 0) less the flight still to come, so it runs on into the countdown without a jump. */
  sceneTime(raceTime: number): number {
    return this.done ? raceTime : raceTime - (this.plan.duration - this.time);
  }

  /** The camera now (the chase camera's rest pose once the flight is over, through any wait). */
  camera(reduced: boolean): Readonly<IntroView> {
    return sampleIntro(this.plan, this.flightOver ? this.plan.duration : this.time, reduced, this.view);
  }
}
