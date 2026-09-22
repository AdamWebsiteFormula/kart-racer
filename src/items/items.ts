// The items system. Pure TypeScript; runs once per tick after RaceManager.step and
// reads the pickup events it returned. Writes to karts only through the
// kart-controller surface (item, status, drift charge multiplier, applyHit, requestBoost).
import type { KartConstants } from '../kart-controller/constants.ts';
import type { InputState, KartEvent } from '../kart-controller/types.ts';
import type { RaceEvent, RaceState } from '../race-manager/types.ts';
import type { Track } from '../track-builder/track.ts';
import { ITEMS_CONFIG, ITEM_ROLES } from './data.ts';
import { popGround, stepGround } from './ground.ts';
import { distXZ, hittable, landHit } from './hits.ts';
import { popProjectile, stepProjectiles } from './projectiles.ts';
import { seedFor } from './rng.ts';
import { onPickup, stepRoulette } from './roulette.ts';
import type { ItemDefinition, ItemEvent, ItemRole, ItemsConfig, ItemsState } from './types.ts';
import { useItem } from './use.ts';

export interface ItemsHost {
  readonly state: RaceState;
  readonly consts: readonly KartConstants[];
}

export class Items {
  readonly cfg: ItemsConfig;
  readonly track: Track;
  readonly host: ItemsHost;
  state: ItemsState;
  /** id → role, for ai-driver's itemRoles */
  readonly roles: Readonly<Record<string, ItemRole>>;
  /** per kart, true while a Homing Kite targets it; recomputed every tick */
  readonly threatened: boolean[];
  private readonly defs = new Map<string, ItemDefinition>();
  private readonly scratch: KartEvent[] = [];
  private readonly inert: boolean;

  constructor(track: Track, host: ItemsHost, cfg: ItemsConfig = ITEMS_CONFIG) {
    this.cfg = cfg;
    this.track = track;
    this.host = host;
    for (const d of cfg.items) this.defs.set(d.id, d);
    this.roles = cfg === ITEMS_CONFIG ? ITEM_ROLES : Object.fromEntries(cfg.items.map((d) => [d.id, d.role]));
    const n = host.state.karts.length;
    this.threatened = new Array(n).fill(false);
    this.state = {
      rng: seedFor(host.state.seed), nextId: 1,
      prevItem: new Array(n).fill(false), shieldRemaining: new Array(n).fill(0),
      fogHeldBy: '', projectiles: [], groundItems: [],
    };
    this.inert = host.state.mode === 'timeTrial';
  }

  snapshot(): ItemsState { return structuredClone(this.state); }
  restore(m: ItemsState): void { this.state = structuredClone(m); }

  /** One tick. `raceEvents` is what RaceManager.step just returned. */
  step(inputs: readonly InputState[], raceEvents: readonly RaceEvent[], dt: number): ItemEvent[] {
    const events: ItemEvent[] = [];
    if (this.inert) return events;
    const st = this.host.state, consts = this.host.consts, track = this.track, m = this.state, cfg = this.cfg;
    const karts = st.karts;

    // 1. timers
    for (let i = 0; i < karts.length; i++) {
      const s = karts[i];
      stepRoulette(s, dt, events);
      if (m.shieldRemaining[i] > 0) {
        m.shieldRemaining[i] = Math.max(0, m.shieldRemaining[i] - dt);
        if (m.shieldRemaining[i] === 0 && s.status.shield) { s.status.shield = false; events.push({ type: 'shieldEnd', racerId: s.racerId }); }
      }
    }

    // 2. pickups
    for (const e of raceEvents) {
      if (e.type !== 'pickup') continue;
      const i = karts.findIndex((k) => k.racerId === e.racerId);
      if (i >= 0) onPickup(cfg, m, st, consts, track, i, events);
    }

    // 3. presses (edge)
    for (let i = 0; i < karts.length; i++) {
      const down = inputs[i]?.item === true;
      if (down && !m.prevItem[i]) useItem(cfg, m, st, consts, track, i, inputs[i], events, this.scratch);
      m.prevItem[i] = down;
    }

    // 4. motion and timers
    stepProjectiles(cfg, m, track, karts, dt, events);
    stepGround(m, track, dt, events);

    // 5. overlaps: projectile × projectile, projectile × ground, projectile × kart, ground × kart
    const ps = m.projectiles, gs = m.groundItems;
    for (let a = ps.length - 1; a >= 0; a--) {
      const p = ps[a];
      let gone = false;
      for (let b = a - 1; b >= 0 && !gone; b--) {
        const q = ps[b];
        if (q.branch === p.branch && distXZ(p.position, q.position) <= p.radius + q.radius) {
          popProjectile(m, p, events); popProjectile(m, q, events); gone = true; a--;
        }
      }
      if (gone) continue;
      for (let b = gs.length - 1; b >= 0 && !gone; b--) {
        const g = gs[b];
        if (g.branch === p.branch && distXZ(p.position, g.position) <= p.radius + g.radius) {
          popProjectile(m, p, events); popGround(m, g, events); gone = true;
        }
      }
      if (gone) continue;
      for (let i = 0; i < karts.length && !gone; i++) {
        const s = karts[i];
        if (s.branch !== p.branch || !hittable(s)) continue;
        if (i === p.owner && p.graceRemaining > 0) continue;
        if (distXZ(p.position, s.position) > p.radius + consts[i].kartRadius) continue;
        const def = this.defs.get(p.itemId) as ItemDefinition;
        landHit(karts, consts, m, i, p.ownerId, def, 'projectile', events, this.scratch);
        popProjectile(m, p, events); gone = true;
      }
    }
    for (let b = gs.length - 1; b >= 0; b--) {
      const g = gs[b];
      for (let i = 0; i < karts.length; i++) {
        const s = karts[i];
        if (s.branch !== g.branch || !hittable(s)) continue;
        if (i === g.owner && g.graceRemaining > 0) continue;
        if (distXZ(g.position, s.position) > g.radius + consts[i].kartRadius) continue;
        const def = this.defs.get(g.itemId) as ItemDefinition;
        landHit(karts, consts, m, i, g.ownerId, def, 'item', events, this.scratch);
        popGround(m, g, events);
        break;
      }
    }

    // 6. AI threat flags and the leader warning
    this.threatened.fill(false);
    for (const p of m.projectiles) if (p.target >= 0) this.threatened[p.target] = true;
    let fogHolder = '';
    for (const s of karts) if (s.item.held !== 'none' && this.defs.get(s.item.held)?.role === 'equaliser') { fogHolder = s.racerId; break; }
    if (fogHolder !== m.fogHeldBy) {
      if (m.fogHeldBy) events.push({ type: 'equaliserHeld', racerId: m.fogHeldBy, on: false });
      if (fogHolder) events.push({ type: 'equaliserHeld', racerId: fogHolder, on: true });
      m.fogHeldBy = fogHolder;
    }
    return events;
  }
}
