// Projectiles: the Beach Ball (straight in world space, ground-snapped to the spline,
// reflected off the road edge, 3 bounces), the Homing Kite (rides the spline at
// speed, eases to its target's lateral inside homingSnapDistance) and the Wind-Up Mouse
// (rides the spline either way, weaving across the road, and bumps up to 3 karts).
import { BASE } from '../kart-controller/constants.ts';
import { forwardOf, type KartState, type Vec3 } from '../kart-controller/types.ts';
import { wrap01 } from '../track-builder/lut.ts';
import type { Track } from '../track-builder/track.ts';
import type { ItemDefinition, ItemEvent, ItemsConfig, ItemsState, Projectile } from './types.ts';

/** Unit right vector of the road at t: sample(t, 1) − sample(t, 0). */
function rightAt(track: Track, t: number, branch: number, out: Vec3): Vec3 {
  const a = track.sample(t, 0, branch).position, b = track.sample(t, 1, branch).position;
  out[0] = b[0] - a[0]; out[1] = b[1] - a[1]; out[2] = b[2] - a[2];
  const n = Math.hypot(out[0], out[1], out[2]) || 1;
  out[0] /= n; out[1] /= n; out[2] /= n;
  return out;
}

/** Signed lateral offset of a world point from the centreline at t. */
export function lateralOf(track: Track, t: number, branch: number, p: Vec3): number {
  const c = track.sample(t, 0, branch).position;
  const r = rightAt(track, t, branch, [0, 0, 0]);
  return (p[0] - c[0]) * r[0] + (p[2] - c[2]) * r[2];
}

export function classScale(cc: 50 | 100 | 150): number {
  return BASE.speedClasses[String(cc) as '50' | '100' | '150'];
}

export function inFlightFor(m: ItemsState, owner: number): number {
  let n = 0;
  for (const p of m.projectiles) if (p.owner === owner) n++;
  return n;
}

/** Nearest kart physically ahead of `owner` along the spline (less than half a lap), or -1. */
export function pickTarget(karts: readonly KartState[], owner: number): number {
  const me = karts[owner];
  let best = -1, bestGap = 0.5;
  for (let i = 0; i < karts.length; i++) {
    const o = karts[i];
    if (i === owner || o.isGhost || o.finishTick !== undefined) continue;
    const gap = wrap01(o.t - me.t);
    if (gap > 0 && gap < bestGap) { bestGap = gap; best = i; }
  }
  return best;
}

export function spawnProjectile(
  cfg: ItemsConfig, m: ItemsState, track: Track, karts: readonly KartState[], cc: 50 | 100 | 150,
  owner: number, def: ItemDefinition, backward: boolean, events: ItemEvent[],
): Projectile {
  const s = karts[owner];
  const f = forwardOf(s.heading);
  const dir = backward ? -1 : 1;
  const speed = (def.behaviour.projectileSpeed ?? 30) * classScale(cc);
  const pos: Vec3 = [s.position[0] + f[0] * cfg.spawnAheadMetres * dir, s.position[1], s.position[2] + f[2] * cfg.spawnAheadMetres * dir];
  const near = track.nearest(pos, { t: s.t, branch: s.branch }, BASE.tSearchWindow);
  const smp = track.sample(near.t, 0, near.branch);
  pos[1] = smp.groundY + cfg.projectileHeight;
  const homing = def.behaviour.homing === true;
  const runner = def.role === 'runner';
  const p: Projectile = {
    id: m.nextId++, itemId: def.id, owner, ownerId: s.racerId, t: near.t, branch: near.branch,
    lateral: lateralOf(track, near.t, near.branch, pos),
    velocity: [f[0] * speed * dir, 0, f[2] * speed * dir],
    speed: homing ? speed : runner ? speed * dir : 0,
    position: pos, prevPosition: [...pos],
    bouncesLeft: homing || runner ? 0 : (def.behaviour.bounces ?? 0),
    target: homing ? pickTarget(karts, owner) : -1,
    ttl: def.behaviour.lifetimeSeconds ?? 8, graceRemaining: cfg.ownerGraceSeconds, radius: def.behaviour.radius ?? 0.5,
    hitsLeft: def.behaviour.hits ?? 1, age: 0,
    weave: runner ? (def.behaviour.weave ?? 0) : 0, weaveSeconds: def.behaviour.weaveSeconds ?? 1,
  };
  // the Mouse starts its weave from where it was let go
  if (runner && p.weave > 0) {
    const room = Math.max(1e-6, smp.halfWidth - p.radius);
    p.age = (Math.asin(Math.max(-1, Math.min(1, p.lateral / (room * p.weave)))) / (2 * Math.PI)) * p.weaveSeconds;
  }
  m.projectiles.push(p);
  events.push({ type: 'projectileSpawn', id: p.id, itemId: p.itemId, racerId: s.racerId, position: [...pos] });
  return p;
}

export function popProjectile(m: ItemsState, p: Projectile, events: ItemEvent[]): void {
  const k = m.projectiles.indexOf(p);
  if (k < 0) return;
  m.projectiles.splice(k, 1);
  events.push({ type: 'projectilePop', id: p.id, itemId: p.itemId, position: [...p.position] });
}

const scratchRight: Vec3 = [0, 0, 0];

/** Move every projectile one tick. Pops on ttl, on the 4th edge, and when the branch closes. */
export function stepProjectiles(
  cfg: ItemsConfig, m: ItemsState, track: Track, karts: readonly KartState[], dt: number, events: ItemEvent[],
): void {
  const L = track.length;
  for (let k = m.projectiles.length - 1; k >= 0; k--) {
    const p = m.projectiles[k];
    p.prevPosition[0] = p.position[0]; p.prevPosition[1] = p.position[1]; p.prevPosition[2] = p.position[2];
    p.graceRemaining = Math.max(0, p.graceRemaining - dt);
    p.ttl -= dt;
    p.age += dt;
    if (p.ttl <= 1e-9 || !track.branches.list[p.branch].open) { popProjectile(m, p, events); continue; }

    if (p.speed !== 0) {
      // Homing Kite and Wind-Up Mouse: ride the spline (the Mouse either way)
      const tgt = p.target >= 0 ? karts[p.target] : undefined;
      if (tgt && (tgt.finishTick !== undefined || tgt.isGhost || tgt.status.intangibleRemaining > 0 || tgt.branch !== p.branch)) p.target = -1;
      p.t = wrap01(p.t + (p.speed * dt) / L);
      let want = 0;
      if (p.target >= 0) {
        const o = karts[p.target];
        const ahead = wrap01(o.t - p.t) * L;
        if (ahead <= cfg.homingSnapDistance) want = lateralOf(track, o.t, o.branch, o.position);
      }
      const smp = track.sample(p.t, 0, p.branch);
      if (p.weave > 0) {
        // the Mouse weaves from kerb to kerb
        p.lateral = Math.sin((2 * Math.PI * p.age) / p.weaveSeconds) * p.weave * (smp.halfWidth - p.radius);
      } else {
        const step = cfg.homingLateralRate * dt;
        p.lateral += Math.max(-step, Math.min(step, want - p.lateral));
      }
      p.lateral = Math.max(-smp.halfWidth + p.radius, Math.min(smp.halfWidth - p.radius, p.lateral));
      const at = track.sample(p.t, p.lateral, p.branch);
      p.position[0] = at.position[0]; p.position[1] = at.groundY + cfg.projectileHeight; p.position[2] = at.position[2];
      continue;
    }

    // Beach Ball: straight in world space, snapped to the road, reflected at the edge
    p.position[0] += p.velocity[0] * dt;
    p.position[2] += p.velocity[2] * dt;
    const near = track.nearest(p.position, { t: p.t, branch: p.branch }, BASE.tSearchWindow);
    p.t = near.t; p.branch = near.branch;
    const smp = track.sample(p.t, 0, p.branch);
    const r = rightAt(track, p.t, p.branch, scratchRight);
    let lat = (p.position[0] - smp.position[0]) * r[0] + (p.position[2] - smp.position[2]) * r[2];
    const limit = smp.halfWidth - p.radius;
    if (Math.abs(lat) > limit) {
      p.bouncesLeft--;
      if (p.bouncesLeft < 0) { popProjectile(m, p, events); continue; }
      const vr = p.velocity[0] * r[0] + p.velocity[2] * r[2];
      p.velocity[0] -= 2 * vr * r[0]; p.velocity[2] -= 2 * vr * r[2];
      lat = Math.sign(lat) * limit;
      events.push({ type: 'projectileBounce', id: p.id, itemId: p.itemId, position: [...p.position], bouncesLeft: p.bouncesLeft });
    }
    p.lateral = lat;
    p.position[0] = smp.position[0] + r[0] * lat;
    p.position[2] = smp.position[2] + r[2] * lat;
    p.position[1] = smp.groundY + cfg.projectileHeight;
  }
}
