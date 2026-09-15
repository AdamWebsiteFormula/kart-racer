// Steps 10–11: walls and kart-vs-kart circles. Mass decides the bump.
import { boostLive } from './boost.ts';
import type { KartConstants } from './constants.ts';
import { forwardOf, rightOf, type KartEvent, type KartState, type Vec3 } from './types.ts';

export function collisionMass(s: KartState, c: KartConstants): number {
  return c.mass + (boostLive(s) ? c.dashMassBonus : 0) + (s.status.shield ? c.dashMassBonus : 0);
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
  s: KartState, lateral: number, right: Vec3, halfWidth: number, c: KartConstants, events: KartEvent[],
): void {
  const limit = halfWidth - c.kartRadius;
  if (Math.abs(lateral) <= limit) return;
  const side = Math.sign(lateral);
  const overshoot = Math.abs(lateral) - limit;
  s.position[0] -= right[0] * overshoot * side;
  s.position[2] -= right[2] * overshoot * side;

  const n: Vec3 = [right[0] * side, 0, right[2] * side]; // outward
  const w = worldVelocity(s);
  const out = w[0] * n[0] + w[2] * n[2];
  if (out <= 0) return;
  const total = Math.hypot(w[0], w[2]);
  w[0] -= n[0] * out * (1 + c.wallRestitution);
  w[2] -= n[2] * out * (1 + c.wallRestitution);
  setWorldVelocity(s, w);
  if (total > 0 && out / total > c.hardWallFraction) s.speed *= 1 - c.wallScrub;
  if (s.wallCooldown <= 0) {
    events.push({ type: 'wall' });
    s.wallCooldown = c.wallCooldownSeconds;
  }
}

function skipsContact(s: KartState): boolean {
  return s.isGhost || s.status.intangibleRemaining > 0;
}

/** Step 11 for one pair. Returns true on contact. */
export function collideKarts(
  a: KartState, b: KartState, ca: KartConstants, cb: KartConstants, c: KartConstants,
  eventsA: KartEvent[], eventsB: KartEvent[],
): boolean {
  if (skipsContact(a) || skipsContact(b)) return false;
  const dx = b.position[0] - a.position[0];
  const dz = b.position[2] - a.position[2];
  const dist = Math.hypot(dx, dz);
  const minDist = 2 * c.kartRadius;
  if (dist >= minDist || dist === 0) return false;
  const nx = dx / dist, nz = dz / dist; // from a toward b
  const ma = collisionMass(a, ca);
  const mb = collisionMass(b, cb);
  const sum = ma + mb;
  const overlap = minDist - dist;
  // separate in proportion to inverse mass
  a.position[0] -= nx * overlap * (mb / sum); a.position[2] -= nz * overlap * (mb / sum);
  b.position[0] += nx * overlap * (ma / sum); b.position[2] += nz * overlap * (ma / sum);

  if (a.bumpCooldown > 0 || b.bumpCooldown > 0) return true;
  // the lighter kart takes the bigger shove
  const wa = worldVelocity(a), wb = worldVelocity(b);
  const ka = c.bumpForce * (mb / sum), kb = c.bumpForce * (ma / sum);
  wa[0] -= nx * ka; wa[2] -= nz * ka;
  wb[0] += nx * kb; wb[2] += nz * kb;
  setWorldVelocity(a, wa); setWorldVelocity(b, wb);
  a.bumpCooldown = c.bumpCooldownSeconds; b.bumpCooldown = c.bumpCooldownSeconds;
  eventsA.push({ type: 'bump', otherId: b.racerId });
  eventsB.push({ type: 'bump', otherId: a.racerId });
  return true;
}
