// Per-tick upkeep of the powers that outlive the press (design §8): the Strike Ball knocks
// karts it rolls into and bursts when it stops, the Pogo Spring lands (with or without its
// slam), and the Grapple Anchor lets go (with a slingshot when it reeled you in).
import { requestBoost } from '../kart-controller/boost.ts';
import type { KartConstants } from '../kart-controller/constants.ts';
import { isRiding, isTowed, radiusOf } from '../kart-controller/powers.ts';
import type { KartEvent, KartState } from '../kart-controller/types.ts';
import { popGround } from './ground.ts';
import { distXZ, landHit } from './hits.ts';
import { promoteNext } from './roulette.ts';
import type { ItemDefinition, ItemEvent, ItemsState } from './types.ts';

/** Two karts close enough in height to touch (a kart high on a spring passes over). */
function level(a: KartState, b: KartState): boolean {
  return Math.abs(a.position[1] - b.position[1]) < 2;
}

/** Hit every other kart within `radius` of kart `owner` with `def` (burst, slam). */
function ring(
  karts: readonly KartState[], consts: readonly KartConstants[], m: ItemsState, owner: number, def: ItemDefinition,
  radius: number, events: ItemEvent[], scratch: KartEvent[],
): void {
  const me = karts[owner];
  for (let j = 0; j < karts.length; j++) {
    if (j === owner || !level(me, karts[j])) continue;
    if (distXZ(karts[j].position, me.position) <= radius + consts[j].kartRadius) landHit(karts, consts, m, j, me.racerId, def, 'item', events, scratch);
  }
}

export function stepPowers(
  m: ItemsState, karts: readonly KartState[], consts: readonly KartConstants[], defs: ReadonlyMap<string, ItemDefinition>,
  events: ItemEvent[], scratch: KartEvent[],
): void {
  for (let i = 0; i < karts.length; i++) {
    const s = karts[i];

    // Strike Ball
    if (m.power[i]) {
      const def = defs.get(m.power[i]) as ItemDefinition;
      if (!isRiding(s)) {
        // it stops: STRIKE! the burst spins karts around, and the slot frees up
        const radius = def.behaviour.burstRadius ?? 0;
        events.push({ type: 'burst', racerId: s.racerId, position: [...s.position], radius });
        ring(karts, consts, m, i, def, radius, events, scratch);
        events.push({ type: 'powerEnd', racerId: s.racerId, itemId: def.id });
        if (s.item.held === def.id && s.item.charges === 0) promoteNext(s);
        m.power[i] = '';
      } else {
        // rolling: karts it touches fly up and spin like pins; drops on the road are crushed
        for (let j = 0; j < karts.length; j++) {
          const o = karts[j];
          if (j === i || !level(s, o)) continue;
          if (distXZ(o.position, s.position) > radiusOf(s, consts[i]) + radiusOf(o, consts[j]) + 0.3) continue;
          if (landHit(karts, consts, m, j, s.racerId, def, 'item', events, scratch) && o.status.spinRemaining > 0) {
            o.verticalVelocity = def.behaviour.popSpeed ?? 0;
            o.grounded = false;
          }
        }
        for (let k = m.groundItems.length - 1; k >= 0; k--) {
          const g = m.groundItems[k];
          if (distXZ(g.position, s.position) <= radiusOf(s, consts[i]) + g.radius) popGround(m, g, events);
        }
      }
    }

    // Pogo Spring: back on the ground
    if (m.pogo[i] > 0 && s.grounded) {
      const def = defs.get('pogoSpring');
      if (m.pogo[i] === 2 && def) {
        const radius = def.behaviour.slamRadius ?? 0;
        events.push({ type: 'springSlam', racerId: s.racerId, position: [...s.position], radius });
        ring(karts, consts, m, i, def, radius, events, scratch);
      } else if (s.item.held === 'pogoSpring' && s.item.charges === 1) {
        // the slam was never used: the spring is spent on landing
        s.item.charges = 0;
        promoteNext(s);
      }
      m.pogo[i] = 0;
    }

    // Grapple Anchor
    if (m.towing[i]) {
      const def = defs.get('grappleAnchor');
      const j = s.status.towTarget;
      const o = j >= 0 ? karts[j] : undefined;
      let slingshot = false, done = !isTowed(s) || !o || !def;
      if (!done && o && def) {
        if (o.finishTick !== undefined || o.isGhost || o.status.intangibleRemaining > 0 || isRiding(o)) done = true;
        // it turned into a shortcut you are not on: the pull would drag you off the road at it. (One that
        // left your shortcut ahead of you, onto the main road, you follow out.)
        else if (o.branch !== s.branch && o.branch !== 0) done = true;
        else if (distXZ(s.position, o.position) <= (def.behaviour.releaseMetres ?? 0)) {
          // reeled in: fly past with a boost, and tug the hooked kart
          done = slingshot = true;
          requestBoost(s, 'item', consts[i].itemSpeedMultiplier, def.behaviour.slingshotSeconds ?? 0, scratch);
          o.status.slowedTo = Math.min(o.status.slowRemaining > 0 ? o.status.slowedTo : 1, def.behaviour.tugSlowTo ?? 1);
          o.status.slowRemaining = Math.max(o.status.slowRemaining, def.behaviour.tugSeconds ?? 0);
        }
      }
      if (done) {
        events.push({ type: 'tetherEnd', racerId: s.racerId, targetId: o?.racerId ?? '', slingshot });
        s.status.towRemaining = 0;
        s.status.towTarget = -1;
        m.towing[i] = false;
      }
    }
  }
}
