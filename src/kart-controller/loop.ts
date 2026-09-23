// The loop-the-loop (design.md Track thrills): a ride on a fixed path, like the claw. A kart that
// reaches a loop's catch line on the ground is eased into the entry lane, carried up and right
// round the ring (upside down at the top) and set down in the exit lane with a boost. The ring
// shifts sideways as it turns, so the way in and the way out never cross. Deterministic: the path
// is a pure function of the track and the lateral the kart was caught at.
import { requestBoost } from './boost.ts';
import type { KartConstants } from './constants.ts';
import { cancelDrift } from './drift.ts';
import { headingOf, type KartEvent, type KartState, type TrackLoop, type TrackQuery, type Vec3 } from './types.ts';

const TAU = Math.PI * 2;

export function inLoop(s: KartState): boolean {
  return s.status.loopIndex >= 0;
}

/** Metres of the whole ride: the run-in, the ring, the run-out. */
export function loopLength(l: TrackLoop): number {
  return l.approach + TAU * l.radius + l.exit;
}

const smooth = (x: number) => { const k = Math.max(0, Math.min(1, x)); return k * k * (3 - 2 * k); };

/** The lanes a kart rides: in left of centre (spread by where it came from), out shifted right by `shift`. */
export function loopLanes(l: TrackLoop, lat0: number, halfWidth: number): [number, number] {
  const entry = -l.shift / 2 + Math.max(-1, Math.min(1, lat0 / halfWidth)) * l.spread;
  return [entry, entry + l.shift];
}

/** The ring's frame: the road centre at its foot, the road's forward and right there (level). */
export function loopFrame(track: TrackQuery, l: TrackLoop): { origin: Vec3; forward: Vec3; right: Vec3; halfWidth: number } {
  const b = track.sample(l.t, 0, 0);
  const h = Math.hypot(b.tangent[0], b.tangent[2]) || 1;
  const fx = b.tangent[0] / h, fz = b.tangent[2] / h;
  return { origin: [...b.position], forward: [fx, 0, fz], right: [fz, 0, -fx], halfWidth: b.halfWidth };
}

export interface LoopPose {
  position: Vec3;
  heading: number;
  /** round the ring, radians: 0 level, π upside down at the top */
  angle: number;
  /** main-line t under the kart (the ring's own t while it is on the ring) */
  t: number;
}

/** Where the ride has a kart `s` metres after it was caught at lateral `lat0`. Pure. */
export function loopPose(track: TrackQuery, l: TrackLoop, lat0: number, s: number): LoopPose {
  const L = track.length;
  const f = loopFrame(track, l);
  const [entry, exit] = loopLanes(l, lat0, f.halfWidth);
  const ring = TAU * l.radius;
  if (s < l.approach) {
    // the run-in: along the road, in the entry lane well before the ring
    const t = l.t + (s - l.approach) / L;
    const k = smooth((s / l.approach) * 1.6);
    const p = track.sample(t, lat0 + (entry - lat0) * k, 0);
    return { position: [...p.position], heading: headingOf(p.tangent), angle: 0, t };
  }
  if (s < l.approach + ring) {
    const a = (s - l.approach) / l.radius;
    const lat = entry + (exit - entry) * (a / TAU);
    const fwd = l.radius * Math.sin(a), up = l.radius * (1 - Math.cos(a));
    const o = f.origin;
    return {
      position: [o[0] + f.right[0] * lat + f.forward[0] * fwd, o[1] + up, o[2] + f.right[2] * lat + f.forward[2] * fwd],
      heading: headingOf(f.forward), angle: a, t: l.t,
    };
  }
  const t = l.t + Math.min(s - l.approach - ring, l.exit) / L;
  const p = track.sample(t, exit, 0);
  return { position: [...p.position], heading: headingOf(p.tangent), angle: 0, t };
}

/** Caught by loop `index` at `lateral`: the ride starts; nothing hits a kart in the ring. */
export function startLoop(s: KartState, index: number, l: TrackLoop, lateral: number, c: KartConstants, events: KartEvent[]): void {
  const st = s.status;
  st.loopIndex = index;
  st.loopS = 0;
  st.loopLat0 = lateral;
  st.loopSpeed = Math.max(Math.abs(s.speed), c.topSpeed * c.loopSpeedFactor);
  st.loopAngle = 0;
  st.intangibleRemaining = Math.max(st.intangibleRemaining, loopLength(l) / st.loopSpeed + 0.2);
  cancelDrift(s);
  events.push({ type: 'loop', phase: 'start' });
}

/** One tick of a ride: along the path at the speed it came in with; at the end, out with a boost. */
export function stepLoop(s: KartState, track: TrackQuery, c: KartConstants, dt: number, events: KartEvent[]): void {
  const st = s.status;
  const l = track.loops?.[st.loopIndex];
  if (!l) { st.loopIndex = -1; st.loopAngle = 0; return; }
  const total = loopLength(l);
  st.loopS = Math.min(total, st.loopS + st.loopSpeed * dt);
  const p = loopPose(track, l, st.loopLat0, st.loopS);
  s.position[0] = p.position[0]; s.position[1] = p.position[1]; s.position[2] = p.position[2];
  s.heading = p.heading;
  s.t = ((p.t % 1) + 1) % 1;
  s.branch = 0;
  s.distanceAlong = s.t * track.length;
  s.speed = st.loopSpeed;
  s.lateralVelocity = 0;
  s.verticalVelocity = 0;
  s.grounded = true;
  st.loopAngle = p.angle;
  if (st.loopS < total) return;
  st.loopIndex = -1;
  st.loopAngle = 0;
  requestBoost(s, 'pad', c.padMultiplier, c.padSeconds, events);
  events.push({ type: 'loop', phase: 'end' });
}
