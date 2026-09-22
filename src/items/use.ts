// The item button. Edge-detected per kart; refusals first, then dispatch by role.
import type { KartConstants } from '../kart-controller/constants.ts';
import { requestBoost } from '../kart-controller/boost.ts';
import type { InputState, KartEvent, KartState } from '../kart-controller/types.ts';
import type { RaceState } from '../race-manager/types.ts';
import type { Track } from '../track-builder/track.ts';
import { placeGround, popGround } from './ground.ts';
import { applyFog, distXZ, landHit } from './hits.ts';
import { inFlightFor, popProjectile, spawnProjectile } from './projectiles.ts';
import type { ItemDefinition, ItemEvent, ItemsConfig, ItemsState, RefuseReason } from './types.ts';

function refuse(events: ItemEvent[], s: KartState, reason: RefuseReason): false {
  events.push({ type: 'itemRefused', racerId: s.racerId, itemId: s.item.held, reason });
  return false;
}

function spend(s: KartState, events: ItemEvent[]): void {
  s.item.charges = Math.max(0, s.item.charges - 1);
  events.push({ type: 'itemUsed', racerId: s.racerId, itemId: s.item.held, chargesLeft: s.item.charges });
  if (s.item.charges === 0) s.item.held = 'none';
}

/** A press on kart i. Returns true when the item was used (one charge spent). */
export function useItem(
  cfg: ItemsConfig, m: ItemsState, st: RaceState, consts: readonly KartConstants[], track: Track,
  i: number, input: InputState, events: ItemEvent[], scratch: KartEvent[],
): boolean {
  const karts = st.karts;
  const s = karts[i];
  if (s.item.held === 'none') return false;
  const def = cfg.items.find((d) => d.id === s.item.held);
  if (!def) return false;
  if (st.phase !== 'racing' && st.phase !== 'finalLap') return refuse(events, s, 'notRacing');
  if (s.isGhost || s.finishTick !== undefined) return refuse(events, s, 'notRacing');
  if (s.item.rouletteRemaining > 0) return refuse(events, s, 'roulette');
  if (s.status.spinRemaining > 0) return refuse(events, s, 'spinning');
  if (s.status.intangibleRemaining > 0) return refuse(events, s, 'intangible');

  switch (def.role) {
    case 'forward':
    case 'homing': {
      if (inFlightFor(m, i) >= cfg.maxProjectilesPerOwner) return refuse(events, s, 'inFlight');
      spawnProjectile(cfg, m, track, karts, st.speedClass, i, def, def.role === 'forward' && input.lookBack, events);
      break;
    }
    case 'rearDrop':
    case 'deception':
      placeGround(cfg, m, track, karts, i, def, events);
      break;
    case 'defenceArea':
      blastHorn(m, karts, consts, i, def, events, scratch);
      break;
    case 'defenceHeld':
      s.status.shield = true;
      m.shieldRemaining[i] = def.behaviour.durationSeconds ?? 0;
      events.push({ type: 'shieldUp', racerId: s.racerId });
      break;
    case 'speed': {
      const c = consts[i];
      requestBoost(s, 'item', c.itemSpeedMultiplier, c.itemSpeedSeconds, scratch);
      s.drift.chargeMultiplier = def.behaviour.chargeMultiplier ?? 1;
      s.drift.chargeMultiplierRemaining = def.behaviour.chargeSeconds ?? 0;
      break;
    }
    case 'equaliser': {
      if (s.rank < (def.behaviour.minPosition ?? 1)) return refuse(events, s, 'position');
      applyFog(karts, i, def, events);
      break;
    }
    case 'chaos':
      break;
  }
  spend(s, events);
  return true;
}

/** Air Horn: pops every projectile and ground item in range, spins every other kart in range. */
export function blastHorn(
  m: ItemsState, karts: readonly KartState[], consts: readonly KartConstants[], owner: number, def: ItemDefinition,
  events: ItemEvent[], scratch: KartEvent[],
): void {
  const me = karts[owner];
  const radius = def.behaviour.radius ?? 0;
  events.push({ type: 'horn', racerId: me.racerId, position: [...me.position], radius });
  for (let k = m.projectiles.length - 1; k >= 0; k--) {
    const p = m.projectiles[k];
    if (distXZ(p.position, me.position) <= radius + p.radius) popProjectile(m, p, events);
  }
  for (let k = m.groundItems.length - 1; k >= 0; k--) {
    const g = m.groundItems[k];
    if (distXZ(g.position, me.position) <= radius + g.radius) popGround(m, g, events);
  }
  for (let i = 0; i < karts.length; i++) {
    if (i === owner) continue;
    if (distXZ(karts[i].position, me.position) <= radius + consts[i].kartRadius) landHit(karts, consts, m, i, me.racerId, def, 'item', events, scratch);
  }
}
