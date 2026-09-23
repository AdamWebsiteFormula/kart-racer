// Steps 8–9: integrate, find t, query the track, gravity, ground snap, ramps,
// landing (fires a queued trick), void.
import { startLoop } from './loop.ts';
import { requestBoost } from './boost.ts';
import type { KartConstants } from './constants.ts';
import { forwardOf, rightOf, type KartEvent, type KartState, type TrackQuery, type TrackSample, type Vec3 } from './types.ts';

/** Signed lateral offset of `pos` from the centreline at `t` (positive = track right). */
export function lateralOffset(track: TrackQuery, t: number, pos: Vec3, branch = 0): { lateral: number; right: Vec3 } {
  const c = track.sample(t, 0, branch);
  const right: Vec3 = [c.tangent[2], 0, -c.tangent[0]];
  const dx = pos[0] - c.position[0], dz = pos[2] - c.position[2];
  return { lateral: dx * right[0] + dz * right[2], right };
}

const wrap01 = (t: number) => ((t % 1) + 1) % 1;

/**
 * Did the fraction x get crossed going forward from a to b (wrap-aware)?
 * A move of more than half a lap in one tick is reverse travel, not a wrap,
 * and reverse never triggers anything.
 */
export function crossed(a: number, b: number, x: number): boolean {
  const d = wrap01(b - a);
  if (d === 0 || d > 0.5) return false;
  const dx = wrap01(x - a);
  return dx > 0 && dx <= d;
}

export interface GroundResult {
  sample: TrackSample;
  lateral: number;
  right: Vec3;
}

/** The shape of a ramp or trick bump: its height `d` metres before its jump line (negative = past it). Pure. */
export function jumpProfile(shape: 'ramp' | 'hump' | undefined, run: number, rise: number, d: number): number {
  if (shape === 'hump') {
    if (Math.abs(d) >= run / 2) return 0;
    const c = Math.cos((Math.PI * d) / run);
    return rise * c * c;
  }
  return d >= 0 && d < run ? rise * (1 - d / run) : 0;
}

/** A bump's height falls away to nothing over `edge` metres at each kerb. Pure. */
export function edgeTaper(edge: number | undefined, lateral: number, halfWidth: number): number {
  if (!edge) return 1;
  const k = (halfWidth - Math.abs(lateral)) / edge;
  if (k >= 1) return 1;
  if (k <= 0) return 0;
  return k * k * (3 - 2 * k);
}

/**
 * Height ramps and trick bumps add to the road at t on a branch, `lateral` metres from its centre
 * line, metres. Karts drive up them; the launch is at the line.
 */
export function jumpLift(track: TrackQuery, t: number, branch: number, lateral = 0, halfWidth = Infinity): number {
  let lift = 0;
  const L = track.length;
  for (const j of track.jumps) {
    if (!j.rise || !j.run || (j.branch ?? 0) !== branch) continue;
    // a ramp spans kerb to kerb; a bump rounds off at the kerbs (edgeTaper)
    if (!j.edge && Math.abs(lateral) > halfWidth) continue;
    let d = (j.t - t) * L;
    if (d > L / 2) d -= L; else if (d < -L / 2) d += L;
    const h = jumpProfile(j.shape, j.run, j.rise, d) * edgeTaper(j.edge, lateral, halfWidth);
    if (h > lift) lift = h;
  }
  return lift;
}

/** Metres around a ramp's lip inside which the lip wall is checked. */
const LIP_ZONE = 8;

/** Is a ramp's lip within LIP_ZONE metres of t on this branch? */
function rampLipNear(track: TrackQuery, t: number, branch: number): boolean {
  for (const j of track.jumps) {
    if (j.shape === 'hump' || !j.rise || (j.branch ?? 0) !== branch) continue;
    const d = Math.abs(wrap01(j.t - t + 0.5) - 0.5) * track.length;
    if (d < LIP_ZONE) return true;
  }
  return false;
}

/** Did the kart back over a ramp's lip line (t went down across it) on the ramp itself? */
function rampLipBehind(track: TrackQuery, prevT: number, t: number, branch: number, lateral: number): boolean {
  for (const j of track.jumps) {
    if (j.shape === 'hump' || !j.rise || (j.branch ?? 0) !== branch) continue;
    if (crossed(t, prevT, j.t) && Math.abs(lateral) <= track.sample(j.t, 0, branch).halfWidth) return true;
  }
  return false;
}

export function stepGround(s: KartState, track: TrackQuery, c: KartConstants, dt: number, events: KartEvent[]): GroundResult {
  // 9. integrate horizontally
  const f = forwardOf(s.heading);
  const r = rightOf(s.heading);
  const vx = f[0] * s.speed + r[0] * s.lateralVelocity;
  const vz = f[2] * s.speed + r[2] * s.lateralVelocity;
  const x0 = s.position[0], z0 = s.position[2], branch0 = s.branch;
  s.position[0] += vx * dt;
  s.position[2] += vz * dt;

  const prevT = s.t;
  const near = track.nearest(s.position, { t: s.t, branch: s.branch }, c.tSearchWindow);
  s.t = near.t;
  s.branch = near.branch;

  let { lateral, right } = lateralOffset(track, s.t, s.position, s.branch);
  // backing into a ramp's lip: the lip is a wall, not a step up. Where the kart was is measured
  // again here: a bump from another kart moved it after last tick's t was taken.
  const t0 = s.grounded && rampLipNear(track, s.t, s.branch)
    ? track.nearest([x0, s.position[1], z0], { t: prevT, branch: branch0 }, c.tSearchWindow).t : prevT;
  if (s.grounded && rampLipBehind(track, t0, s.t, s.branch, lateral)) {
    s.position[0] = x0; s.position[2] = z0;
    s.t = t0; s.branch = branch0;
    s.speed = 0; s.lateralVelocity = 0;
    events.push({ type: 'wall' });
    ({ lateral, right } = lateralOffset(track, s.t, s.position, s.branch));
  }
  s.distanceAlong = s.t * track.length;
  const sample = track.sample(s.t, lateral, s.branch);
  const wasGrounded = s.grounded;

  // ramps: leaving one sets the launch velocity
  if (s.grounded) {
    for (const j of track.jumps) {
      if ((j.branch ?? 0) === s.branch && crossed(prevT, s.t, j.t) && Math.abs(lateral) <= sample.halfWidth) {
        s.verticalVelocity = j.launch;
        s.grounded = false;
        s.airborne.fromJumpId = j.id;
        s.airborne.seconds = 0;
        events.push({ type: 'launched', jumpId: j.id });
        break;
      }
    }
  }

  // boost pads: crossing one while grounded
  if (s.grounded) {
    for (const p of track.boostPads) {
      if ((p.branch ?? 0) === s.branch && crossed(prevT, s.t, p.t) && Math.abs(lateral - p.lateral) <= p.halfWidth) {
        requestBoost(s, 'pad', c.padMultiplier, c.padSeconds, events);
        break;
      }
    }
  }
  const prevSurface = s.surface;

  // 8. gravity and ground
  s.verticalVelocity -= c.gravity * dt;
  s.position[1] += s.verticalVelocity * dt;

  const y = s.position[1];
  // past an open edge's cliff there is no ground at all, and once over it, no road below catches it
  if (sample.overCliff && !s.status.falling) { s.status.falling = true; s.status.fallFromY = sample.groundY; }
  // back over the road it went off (a hop over the lip and back) before it sank: not falling after all.
  // A lower road under the cliff (a tunnel) never counts: only the height it fell from does.
  else if (s.status.falling && !sample.overCliff && Math.abs(sample.groundY - s.status.fallFromY) < c.groundCatch && y >= sample.groundY - c.groundCatch) s.status.falling = false;
  const groundY = s.status.falling ? -Infinity : sample.groundY + jumpLift(track, s.t, s.branch, lateral, sample.halfWidth);
  const canSnap = s.verticalVelocity <= c.groundLaunchVy;
  // Below the road: a slope rising under a grounded kart, or a landing that crossed
  // the surface this tick, snaps up. An airborne kart within groundCatch of the surface
  // landed on it (a hop across a banked road moves the surface under the kart); any
  // deeper it is under the road for real and keeps falling toward voidY.
  const fell = !wasGrounded && y < groundY - Math.max(Math.abs(s.verticalVelocity) * dt + c.groundStick, c.groundCatch);
  if (y < groundY && !fell) {
    s.position[1] = groundY;
    if (canSnap) s.verticalVelocity = 0;
  }
  if (y <= groundY + c.groundStick && canSnap && !fell) {
    s.position[1] = groundY;
    s.verticalVelocity = 0;
    s.grounded = true;
  } else {
    s.grounded = false;
  }

  if (s.grounded) {
    s.surface = sample.surface;
    s.gripScale = sample.gripScale;
    // boost surface: fires on entry, including landing straight onto it
    if (sample.surface === 'boost' && (prevSurface !== 'boost' || !wasGrounded)) {
      requestBoost(s, 'pad', c.padMultiplier, c.padSeconds, events);
    }
    if (!wasGrounded) {
      const trick = s.airborne.trickQueued;
      events.push({ type: 'landed', fromJumpId: s.airborne.fromJumpId, trick });
      if (trick) requestBoost(s, 'trick', c.trickMultiplier, c.trickSeconds, events);
      s.airborne.fromJumpId = undefined;
      s.airborne.trickQueued = false;
      s.airborne.seconds = 0;
    }
  } else {
    s.airborne.seconds += dt;
  }

  // a loop-the-loop's run-in: a kart on the ground anywhere in it is caught, a landing in it too
  const forward = wrap01(s.t - prevT);
  if (s.grounded && s.branch === 0 && track.loops && !s.status.falling && forward > 0 && forward < 0.5) {
    const L = track.length;
    for (let k = 0; k < track.loops.length; k++) {
      const l = track.loops[k];
      const into = wrap01(s.t - (l.t - l.approach / L)) * L;
      if (into < l.approach) { startLoop(s, k, l, lateral, c, events, into); break; }
    }
  }

  // below the void, or fallen well past an open edge: the claw comes (race-manager rescue)
  if (s.position[1] < track.voidY || (s.status.falling && s.position[1] < s.status.fallFromY - c.fallCatchDepth)) events.push({ type: 'respawn' });

  return { sample, lateral, right };
}
