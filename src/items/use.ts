// The item button. Refusals first, then dispatch by role. items.ts decides when a press
// counts (a tap, or letting go of a trailed item).
import type { KartConstants } from '../kart-controller/constants.ts';
import { requestBoost } from '../kart-controller/boost.ts';
import { isRiding } from '../kart-controller/powers.ts';
import type { InputState, KartEvent, KartState } from '../kart-controller/types.ts';
import type { RaceState } from '../race-manager/types.ts';
import { wrap01 } from '../track-builder/lut.ts';
import type { Track } from '../track-builder/track.ts';
import { placeGround, popGround } from './ground.ts';
import { applyFog, distXZ, landHit } from './hits.ts';
import { inFlightFor, popProjectile, spawnProjectile } from './projectiles.ts';
import { promoteNext } from './roulette.ts';
import type { ItemDefinition, ItemEvent, ItemsConfig, ItemsState, RefuseReason } from './types.ts';

function refuse(events: ItemEvent[], s: KartState, reason: RefuseReason): false {
  events.push({ type: 'itemRefused', racerId: s.racerId, itemId: s.item.held, reason });
  return false;
}

/** One charge spent; at zero the next item moves up, unless `keep` (a power still running from this slot). */
export function spend(s: KartState, events: ItemEvent[], keep = false): void {
  s.item.charges = Math.max(0, s.item.charges - 1);
  events.push({ type: 'itemUsed', racerId: s.racerId, itemId: s.item.held, chargesLeft: s.item.charges });
  if (s.item.charges === 0 && !keep) promoteNext(s);
}

/** Why a press would be refused right now, or null when the held item can be used. */
export function refusal(st: RaceState, s: KartState): RefuseReason | null {
  if (st.phase !== 'racing' && st.phase !== 'finalLap') return 'notRacing';
  if (s.isGhost || s.finishTick !== undefined) return 'notRacing';
  if (s.item.rouletteRemaining > 0) return 'roulette';
  if (s.item.charges <= 0) return 'inUse';
  if (s.status.spinRemaining > 0) return 'spinning';
  if (s.status.intangibleRemaining > 0) return 'intangible';
  return null;
}

/**
 * Grapple Anchor: the nearest kart physically ahead within `range` metres along the road you are on, or -1.
 * A kart in a shortcut beside you (or on the main road beside yours) is behind rock, hedge or sea wall.
 */
export function anchorTarget(karts: readonly KartState[], owner: number, trackLength: number, range: number): number {
  const me = karts[owner];
  let best = -1, bestGap = range / trackLength;
  for (let i = 0; i < karts.length; i++) {
    const o = karts[i];
    if (i === owner || o.branch !== me.branch || o.isGhost || o.finishTick !== undefined || o.status.intangibleRemaining > 0 || isRiding(o)) continue;
    const gap = wrap01(o.t - me.t);
    if (gap > 0 && gap <= bestGap) { bestGap = gap; best = i; }
  }
  return best;
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
  const why = refusal(st, s);
  if (why) return refuse(events, s, why);

  let keep = false;
  switch (def.role) {
    case 'forward':
    case 'homing':
    case 'runner': {
      // one Kite at a time; up to maxProjectilesPerOwner Balls and Mice besides it (24 Sept 2026: one shot of
      // any kind refused a Beach Ball for the whole 10 s a Kite flew)
      const kite = def.role === 'homing';
      if (inFlightFor(cfg, m, i, kite) >= (kite ? cfg.maxKitesPerOwner : cfg.maxProjectilesPerOwner)) return refuse(events, s, 'inFlight');
      spawnProjectile(cfg, m, track, karts, st.speedClass, i, def, def.role !== 'homing' && input.lookBack, events);
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
      if (def.behaviour.chargeMultiplier) {
        s.drift.chargeMultiplier = def.behaviour.chargeMultiplier;
        s.drift.chargeMultiplierRemaining = def.behaviour.chargeSeconds ?? 0;
      }
      break;
    }
    case 'equaliser': {
      if (s.rank < (def.behaviour.minPosition ?? 1)) return refuse(events, s, 'position');
      applyFog(karts, i, def, events);
      break;
    }
    case 'ride': {
      // Strike Ball: the controller rolls it down the road; powers.ts knocks karts and bursts at the end
      const seconds = def.behaviour.durationSeconds ?? 0;
      s.status.rideRemaining = seconds;
      s.status.towRemaining = 0;
      s.status.towTarget = -1;
      m.power[i] = def.id;
      m.knocked[i] = 0;
      m.trailing[i] = false;
      events.push({ type: 'powerStart', racerId: s.racerId, itemId: def.id, seconds });
      keep = true;
      break;
    }
    case 'jump': {
      const c = consts[i];
      if (m.pogo[i] === 0) {
        // boing: straight up; a drift press in the air is a trick, like off a ramp
        s.verticalVelocity = c.springLaunch;
        s.grounded = false;
        s.airborne.fromJumpId = 'pogo';
        s.airborne.seconds = 0;
        s.airborne.trickQueued = false;
        m.pogo[i] = 1;
        events.push({ type: 'springLaunch', racerId: s.racerId });
      } else if (m.pogo[i] === 1) {
        // the second press: slam down; powers.ts sends the shock ring on landing
        s.verticalVelocity = -c.slamSpeed;
        s.airborne.trickQueued = false;
        m.pogo[i] = 2;
      } else return refuse(events, s, 'inUse');
      break;
    }
    case 'tether': {
      const j = anchorTarget(karts, i, track.length, def.behaviour.range ?? 0);
      if (j < 0) return refuse(events, s, 'noTarget');
      const o = karts[j];
      if (o.status.shield) {
        // a Bubble eats the anchor
        landHit(karts, consts, m, j, s.racerId, def, 'item', events, scratch);
        break;
      }
      s.status.towTarget = j;
      s.status.towRemaining = def.behaviour.durationSeconds ?? 0;
      m.towing[i] = true;
      events.push({ type: 'tetherStart', racerId: s.racerId, targetId: o.racerId });
      break;
    }
    case 'chaos':
      break;
  }
  spend(s, events, keep);
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
