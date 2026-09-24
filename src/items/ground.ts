// Ground items: Oil Can and Decoy Balloon. Static on the road; they pop on a kart,
// on ttl, on a closed branch no kart is on, or when a Horn or projectile reaches them.
import { jumpLift } from '../kart-controller/ground.ts';
import { BASE } from '../kart-controller/constants.ts';
import { forwardOf, type KartState } from '../kart-controller/types.ts';
import type { Track } from '../track-builder/track.ts';
import { lateralOf } from './projectiles.ts';
import type { GroundItem, ItemDefinition, ItemEvent, ItemsConfig, ItemsState } from './types.ts';

export function placeGround(
  cfg: ItemsConfig, m: ItemsState, track: Track, karts: readonly KartState[], owner: number, def: ItemDefinition, events: ItemEvent[],
): GroundItem {
  const s = karts[owner];
  // the owner may keep maxGroundPerOwner on the road; the oldest goes first
  const mine = m.groundItems.filter((g) => g.owner === owner);
  while (mine.length >= cfg.maxGroundPerOwner) {
    const old = mine.shift() as GroundItem;
    popGround(m, old, events);
  }
  const f = forwardOf(s.heading);
  const pos: [number, number, number] = [s.position[0] - f[0] * cfg.dropBehindMetres, s.position[1], s.position[2] - f[2] * cfg.dropBehindMetres];
  const near = track.nearest(pos, { t: s.t, branch: s.branch }, BASE.tSearchWindow);
  // the road's height where the drop lands, not on the centreline (a banked road is higher on one side)
  const lat = lateralOf(track, near.t, near.branch, pos);
  const smp = track.sample(near.t, lat, near.branch);
  pos[1] = smp.groundY + jumpLift(track, near.t, near.branch, lat, smp.halfWidth);
  const g: GroundItem = {
    id: m.nextId++, itemId: def.id, owner, ownerId: s.racerId, t: near.t, branch: near.branch, position: pos,
    ttl: def.behaviour.lifetimeSeconds ?? 20, graceRemaining: cfg.ownerGraceSeconds, radius: def.behaviour.radius ?? 1,
  };
  m.groundItems.push(g);
  events.push({ type: 'groundPlace', id: g.id, itemId: g.itemId, racerId: s.racerId, position: [...g.position] });
  return g;
}

export function popGround(m: ItemsState, g: GroundItem, events: ItemEvent[]): void {
  const k = m.groundItems.indexOf(g);
  if (k < 0) return;
  m.groundItems.splice(k, 1);
  events.push({ type: 'groundPop', id: g.id, itemId: g.itemId, position: [...g.position] });
}

/** Is any kart on `branch`? */
function riddenBy(karts: readonly KartState[], branch: number): boolean {
  for (let i = 0; i < karts.length; i++) if (karts[i].branch === branch) return true;
  return false;
}

/**
 * Timers and branch closure. On a closed shortcut a drop stays while karts are still riding it out, then
 * goes: no one can reach it (seam review, 24 Sept 2026: it popped on closing, so one dropped from a
 * shortcut the Final Lap Shift had closed died on the tick it was let go). Kart overlap is resolved in
 * items.ts with the other overlaps.
 */
export function stepGround(m: ItemsState, track: Track, karts: readonly KartState[], dt: number, events: ItemEvent[]): void {
  for (let k = m.groundItems.length - 1; k >= 0; k--) {
    const g = m.groundItems[k];
    g.graceRemaining = Math.max(0, g.graceRemaining - dt);
    g.ttl -= dt;
    if (g.ttl <= 1e-9 || (!track.branches.list[g.branch].open && !riddenBy(karts, g.branch))) popGround(m, g, events);
  }
}
