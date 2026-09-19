// Steps 8–9: integrate, find t, query the track, gravity, ground snap, ramps,
// landing (fires a queued trick), void.
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

export function stepGround(s: KartState, track: TrackQuery, c: KartConstants, dt: number, events: KartEvent[]): GroundResult {
  // 9. integrate horizontally
  const f = forwardOf(s.heading);
  const r = rightOf(s.heading);
  const vx = f[0] * s.speed + r[0] * s.lateralVelocity;
  const vz = f[2] * s.speed + r[2] * s.lateralVelocity;
  s.position[0] += vx * dt;
  s.position[2] += vz * dt;

  const prevT = s.t;
  const near = track.nearest(s.position, { t: s.t, branch: s.branch }, c.tSearchWindow);
  s.t = near.t;
  s.branch = near.branch;
  s.distanceAlong = s.t * track.length;

  const { lateral, right } = lateralOffset(track, s.t, s.position, s.branch);
  const sample = track.sample(s.t, lateral, s.branch);
  const wasGrounded = s.grounded;

  // ramps: leaving one sets the launch velocity
  if (s.grounded) {
    for (const j of track.jumps) {
      if ((j.branch ?? 0) === s.branch && crossed(prevT, s.t, j.t)) {
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
  const groundY = sample.groundY;
  const canSnap = s.verticalVelocity <= c.groundLaunchVy;
  if (y < groundY) {
    s.position[1] = groundY;
    if (canSnap) s.verticalVelocity = 0;
  }
  if (y <= groundY + c.groundStick && canSnap) {
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

  if (s.position[1] < track.voidY) events.push({ type: 'respawn' });

  return { sample, lateral, right };
}
