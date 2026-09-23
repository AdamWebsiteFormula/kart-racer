// One path for every hit. Immunity, the Bubble, and the two hit shapes (spin via
// the controller's applyHit, or a plain slow) all live here so no item has a private rule.
import type { KartConstants } from '../kart-controller/constants.ts';
import { isRiding } from '../kart-controller/powers.ts';
import { applyHit } from '../kart-controller/step.ts';
import type { HitKind, KartEvent, KartState, Vec3 } from '../kart-controller/types.ts';
import { clearSlots } from './roulette.ts';
import type { ItemDefinition, ItemEvent, ItemsState } from './types.ts';

export function distXZ(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[2] - b[2]);
}

/** Can this kart be hit at all right now? (A rolling Strike Ball shrugs everything off.) */
export function hittable(s: KartState): boolean {
  return !s.isGhost && s.finishTick === undefined && s.status.intangibleRemaining <= 0 && s.status.spinRemaining <= 0 && !isRiding(s);
}

/**
 * Land `def` on kart `i`. Returns true when something happened (a hit or a shield pop).
 * `kind` is 'projectile' for Ball and Kite, 'item' for Oil, Decoy and Horn.
 */
export function landHit(
  karts: readonly KartState[], consts: readonly KartConstants[], m: ItemsState, i: number, byRacerId: string,
  def: ItemDefinition, kind: HitKind, events: ItemEvent[], scratch: KartEvent[],
): boolean {
  const s = karts[i];
  if (!hittable(s)) return false;
  if (s.status.shield) {
    s.status.shield = false;
    m.shieldRemaining[i] = 0;
    events.push({ type: 'shieldPop', racerId: s.racerId });
    return true;
  }
  const fx = def.hitEffect ?? {};
  let spun = false, coinsLost = 0;
  if ((fx.spinSeconds ?? 0) > 0) {
    scratch.length = 0;
    applyHit(s, consts[i], kind, scratch);
    for (const e of scratch) if (e.type === 'hit') { spun = e.spun; coinsLost = e.coinsLost; }
  } else if (fx.slowTo !== undefined) {
    // a plain slow: stack with a live slow by taking the stronger, longer one
    s.status.slowedTo = Math.min(s.status.slowRemaining > 0 ? s.status.slowedTo : 1, fx.slowTo);
    s.status.slowRemaining = Math.max(s.status.slowRemaining, fx.slowSeconds ?? 0);
  }
  if (fx.dropsItem && s.item.held !== 'none') {
    events.push({ type: 'itemLost', racerId: s.racerId, itemId: s.item.held });
    if (s.item.next !== 'none') events.push({ type: 'itemLost', racerId: s.racerId, itemId: s.item.next });
    clearSlots(s);
  }
  events.push({ type: 'hit', racerId: s.racerId, byRacerId, itemId: def.id, spun, coinsLost });
  return true;
}

/** Fog Bank: every kart ranked ahead of the owner slows and loses its item. Returns the victims. */
export function applyFog(karts: readonly KartState[], owner: number, def: ItemDefinition, events: ItemEvent[]): string[] {
  const me = karts[owner];
  const slowTo = def.behaviour.slowTo ?? 1, seconds = def.behaviour.durationSeconds ?? 0;
  const victims: string[] = [];
  for (let i = 0; i < karts.length; i++) {
    const s = karts[i];
    if (i === owner || s.isGhost || s.finishTick !== undefined || s.rank >= me.rank || isRiding(s)) continue;
    s.status.slowedTo = Math.min(s.status.slowRemaining > 0 ? s.status.slowedTo : 1, slowTo);
    s.status.slowRemaining = Math.max(s.status.slowRemaining, seconds);
    if (def.behaviour.stripsItem) {
      if (s.item.held !== 'none') events.push({ type: 'itemLost', racerId: s.racerId, itemId: s.item.held });
      if (s.item.next !== 'none') events.push({ type: 'itemLost', racerId: s.racerId, itemId: s.item.next });
      clearSlots(s);
    }
    victims.push(s.racerId);
  }
  events.push({ type: 'fog', racerId: me.racerId, victims });
  return victims;
}
