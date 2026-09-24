// Steps 10–11: walls and kart-vs-kart circles. Mass decides the bump.
import { boostLive } from './boost.ts';
import type { KartConstants } from './constants.ts';
import { isRiding, radiusOf } from './powers.ts';
import { forwardOf, rightOf, type KartEvent, type KartState, type Vec3 } from './types.ts';

export function collisionMass(s: KartState, c: KartConstants): number {
  return c.mass + (boostLive(s) ? c.dashMassBonus : 0) + (s.status.shield ? c.shieldMassBonus : 0)
    + (isRiding(s) ? c.rideMassBonus : 0);
}

function worldVelocity(s: KartState): Vec3 {
  const f = forwardOf(s.heading), r = rightOf(s.heading);
  return [f[0] * s.speed + r[0] * s.lateralVelocity, 0, f[2] * s.speed + r[2] * s.lateralVelocity];
}
function setWorldVelocity(s: KartState, w: Vec3): void {
  const f = forwardOf(s.heading), r = rightOf(s.heading);
  s.speed = w[0] * f[0] + w[2] * f[2];
  s.lateralVelocity = w[0] * r[0] + w[2] * r[2];
}

/** Step 10. `lateral` and `right` come from the ground step. */
export function stepWalls(
  s: KartState, lateral: number, right: Vec3, halfWidth: number, c: KartConstants, dt: number, events: KartEvent[], open = 0,
): void {
  const limit = halfWidth - radiusOf(s, c);
  if (Math.abs(lateral) <= limit) { s.status.wallEasing = false; return; }
  const side = Math.sign(lateral);
  // an open edge has no wall: over the kerb, the shoulder, then the drop
  if (open & (side < 0 ? 1 : 2)) return;
  const overshoot = Math.abs(lateral) - limit;
  // far outside the line (on an open shoulder where the barrier starts): eased all the way back, not teleported
  if (overshoot > c.wallEndOvershoot) s.status.wallEasing = true;
  const push = s.status.wallEasing ? Math.min(overshoot, c.wallEndPushRate * dt) : overshoot;
  if (push >= overshoot) s.status.wallEasing = false;
  s.position[0] -= right[0] * push * side;
  s.position[2] -= right[2] * push * side;
  bounceOff(s, [right[0] * side, 0, right[2] * side], c, dt, events);
}

/**
 * A wall hit's velocity: `n` is the wall's unit outward normal (horizontal, pointing into the wall).
 * What drives into it bounces back (wallRestitution) and what runs along it stays: the velocity
 * after the hit is kept as it is, in the world, never re-pointed along the nose. A hard hit
 * (outward / total > hardWallFraction) scrubs speed once per impact (not every tick of contact),
 * scaled by how far past that line it is: a 30° glance loses 4%, a head-on hit wallScrub.
 * The impact turns the nose most of the way to the new direction of travel; after that, every tick
 * pressed on the wall swings it toward the wall line, so the kart slides along the wall.
 * One `wall` event per wallCooldownSeconds. Walls (stepWalls) and a ramp's lip from behind
 * (ground.ts) share it.
 */
export function bounceOff(s: KartState, n: Vec3, c: KartConstants, dt: number, events: KartEvent[]): void {
  const w = worldVelocity(s);
  const out = w[0] * n[0] + w[2] * n[2];
  if (out <= 0) return;
  const total = Math.hypot(w[0], w[2]);
  w[0] -= n[0] * out * (1 + c.wallRestitution);
  w[2] -= n[2] * out * (1 + c.wallRestitution);
  const square = total > 0 ? out / total : 0; // sin of the angle of the hit
  const impact = s.wallCooldown <= 0;
  if (impact && square > c.hardWallFraction) {
    // nothing at the hard-hit line, all of wallScrub head-on: no step in between
    const keep = 1 - c.wallScrub * (square - c.hardWallFraction) / (1 - c.hardWallFraction);
    w[0] *= keep; w[2] *= keep;
  }
  const f = forwardOf(s.heading);
  const ahead = w[0] * f[0] + w[2] * f[2];
  if (impact && square > c.hardWallFraction && ahead > 0) {
    // the impact turns the nose most of the way (wallDeflect) to where the kart now goes, along the
    // wall and a touch off it, so the grip does not eat the deflected speed as sideways slide
    // (KartView eases the snap on screen)
    let d = Math.atan2(w[0], w[2]) - s.heading;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    s.heading += d * c.wallDeflect;
  } else {
    // pressed on the wall: the nose swings toward the wall line, a few frames at a time, so the kart
    // slides on instead of parking nose-first
    const into = f[0] * n[0] + f[2] * n[2]; // how much the nose points into the wall
    if (into > 0) {
      const tangent: Vec3 = [f[0] - n[0] * into, 0, f[2] - n[2] * into];
      const len = Math.hypot(tangent[0], tangent[2]);
      if (len > 1e-6) {
        const target = Math.atan2(tangent[0] / len, tangent[2] / len);
        let d = target - s.heading;
        while (d > Math.PI) d -= 2 * Math.PI;
        while (d < -Math.PI) d += 2 * Math.PI;
        s.heading += Math.sign(d) * Math.min(Math.abs(d) * c.wallDeflect, c.wallDeflectRate * dt);
      }
    }
  }
  // the same world velocity, seen from the new nose
  setWorldVelocity(s, w);
  if (impact) {
    events.push({ type: 'wall' });
    s.wallCooldown = c.wallCooldownSeconds;
  }
}

/** Two karts close enough in height to touch: the items' rule (src/items/powers.ts level()). */
export function level(a: KartState, b: KartState, c: KartConstants): boolean {
  return Math.abs(a.position[1] - b.position[1]) < c.contactHeight;
}

function skipsContact(s: KartState): boolean {
  return s.isGhost || s.status.intangibleRemaining > 0;
}

/**
 * Step 11 for one pair. Returns true on contact. Karts are solid: the closing speed along the
 * contact normal is taken out every tick of contact, split by mass (so a rear-ender pushes the kart
 * ahead instead of driving through it), and an overlap is eased apart at bumpSeparateRate or the
 * closing speed, whichever is faster. The shove (bumpForce, the lighter kart takes more) comes once
 * per bumpCooldownSeconds, for the feel.
 */
export function collideKarts(
  a: KartState, b: KartState, ca: KartConstants, cb: KartConstants, c: KartConstants, dt: number,
  eventsA: KartEvent[], eventsB: KartEvent[],
): boolean {
  if (skipsContact(a) || skipsContact(b) || !level(a, b, c)) return false;
  const dx = b.position[0] - a.position[0];
  const dz = b.position[2] - a.position[2];
  const dist = Math.hypot(dx, dz);
  const minDist = radiusOf(a, ca) + radiusOf(b, cb);
  if (dist >= minDist || dist === 0) return false;
  const nx = dx / dist, nz = dz / dist; // from a toward b
  const ma = collisionMass(a, ca);
  const mb = collisionMass(b, cb);
  const sum = ma + mb;
  const wa = worldVelocity(a), wb = worldVelocity(b);
  // closing speed along the normal (positive = closing)
  const closing = (wa[0] - wb[0]) * nx + (wa[2] - wb[2]) * nz;
  if (closing > 0) {
    wa[0] -= nx * closing * (mb / sum); wa[2] -= nz * closing * (mb / sum);
    wb[0] += nx * closing * (ma / sum); wb[2] += nz * closing * (ma / sum);
  }
  // ease apart over a few ticks, in proportion to inverse mass; an instant pop is the jarring part
  const overlap = Math.min(minDist - dist, Math.max(c.bumpSeparateRate, closing) * dt);
  a.position[0] -= nx * overlap * (mb / sum); a.position[2] -= nz * overlap * (mb / sum);
  b.position[0] += nx * overlap * (ma / sum); b.position[2] += nz * overlap * (ma / sum);

  const shove = a.bumpCooldown <= 0 && b.bumpCooldown <= 0;
  if (shove) {
    // the lighter kart takes the bigger shove
    const ka = c.bumpForce * (mb / sum), kb = c.bumpForce * (ma / sum);
    wa[0] -= nx * ka; wa[2] -= nz * ka;
    wb[0] += nx * kb; wb[2] += nz * kb;
  }
  if (closing > 0 || shove) { setWorldVelocity(a, wa); setWorldVelocity(b, wb); }
  if (!shove) return true;
  a.bumpCooldown = c.bumpCooldownSeconds; b.bumpCooldown = c.bumpCooldownSeconds;
  eventsA.push({ type: 'bump', otherId: b.racerId });
  eventsB.push({ type: 'bump', otherId: a.racerId });
  return true;
}
