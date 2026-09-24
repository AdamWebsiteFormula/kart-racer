// The items system. Pure TypeScript; runs once per tick after RaceManager.step and
// reads the pickup events it returned. Writes to karts only through the
// kart-controller surface (item, status, drift charge multiplier, applyHit, requestBoost).
import type { KartConstants } from '../kart-controller/constants.ts';
import { isRiding } from '../kart-controller/powers.ts';
import { forwardOf, type InputState, type KartEvent, type KartState, type Vec3 } from '../kart-controller/types.ts';
import type { RaceEvent, RaceState } from '../race-manager/types.ts';
import { mainUnder } from '../track-builder/shift.ts';
import type { Track } from '../track-builder/track.ts';
import { ITEMS_CONFIG, ITEM_ROLES } from './data.ts';
import { popGround, stepGround } from './ground.ts';
import { distXZ, hittable, landHit } from './hits.ts';
import { stepPowers } from './powers.ts';
import { lateralOf, popProjectile, stepProjectiles } from './projectiles.ts';
import { seedFor } from './rng.ts';
import { onPickup, stepRoulette } from './roulette.ts';
import type { ItemDefinition, ItemEvent, ItemRole, ItemsConfig, ItemsState, Projectile } from './types.ts';
import { refusal, spend, useItem } from './use.ts';

/** Wholly past the course limit at t (the land beside an off-road road is course): no kart can reach it there. */
function offCourse(track: Track, t: number, branch: number, lateral: number, radius: number): boolean {
  const smp = track.sample(t, 0, branch);
  return Math.abs(lateral) > (smp.wall ?? smp.halfWidth) + radius;
}

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
  /** per balloon (race-manager pickup index): a gold double balloon */
  private readonly doubles: readonly boolean[];

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
      trailing: new Array(n).fill(false), power: new Array(n).fill(''), knocked: new Array(n).fill(0), pogo: new Array(n).fill(0), towing: new Array(n).fill(false),
    };
    this.inert = host.state.mode === 'timeTrial';
    this.doubles = track.features.filter((f) => f.kind === 'pickup').map((f) => f.double === true);
  }

  /** The held item trails behind kart i (hold to trail, design §8). */
  isTrailing(i: number): boolean { return this.state.trailing[i]; }

  private trailable(s: KartState): boolean {
    return this.defs.get(s.item.held)?.behaviour.trailable === true;
  }

  snapshot(): ItemsState { return structuredClone(this.state); }
  restore(m: ItemsState): void { this.state = structuredClone(m); }

  /** One tick. `raceEvents` is what RaceManager.step just returned. */
  step(inputs: readonly InputState[], raceEvents: readonly RaceEvent[], dt: number): ItemEvent[] {
    const events: ItemEvent[] = [];
    if (this.inert) return events;
    const st = this.host.state, consts = this.host.consts, track = this.track, m = this.state, cfg = this.cfg;
    const karts = st.karts;

    // 0. the Final Lap Shift rebuilt the road under the shots and drops
    for (const e of raceEvents) if (e.type === 'trackChanged') { this.reseat(events); break; }

    // 1. timers
    for (let i = 0; i < karts.length; i++) {
      const s = karts[i];
      stepRoulette(s, dt, events);
      if (m.shieldRemaining[i] > 0) {
        m.shieldRemaining[i] = Math.max(0, m.shieldRemaining[i] - dt);
        if (m.shieldRemaining[i] === 0 && s.status.shield) { s.status.shield = false; events.push({ type: 'shieldEnd', racerId: s.racerId }); }
      }
    }

    // 2. pickups (a gold double balloon rolls both slots)
    for (const e of raceEvents) {
      if (e.type !== 'pickup') continue;
      const i = karts.findIndex((k) => k.racerId === e.racerId);
      if (i < 0) continue;
      onPickup(cfg, m, st, consts, track, i, events);
      if (this.doubles[e.index]) onPickup(cfg, m, st, consts, track, i, events);
    }

    // 3. presses: a tap uses the item; a trailable one trails while held and is used on release
    for (let i = 0; i < karts.length; i++) {
      const s = karts[i];
      const down = inputs[i]?.item === true, was = m.prevItem[i];
      m.prevItem[i] = down;
      if (m.trailing[i] && (!this.trailable(s) || s.item.charges <= 0)) m.trailing[i] = false;
      if (m.trailing[i] && s.status.spinRemaining > 0) {
        // hit while trailing: the trailed item is lost
        m.trailing[i] = false;
        events.push({ type: 'itemLost', racerId: s.racerId, itemId: s.item.held });
        spend(s, events);
        continue;
      }
      if (down && !was) {
        if (this.trailable(s) && refusal(st, s) === null) {
          m.trailing[i] = true;
          events.push({ type: 'trailStart', racerId: s.racerId, itemId: s.item.held });
        } else useItem(cfg, m, st, consts, track, i, inputs[i], events, this.scratch);
      } else if (!down && was && m.trailing[i]) {
        m.trailing[i] = false;
        useItem(cfg, m, st, consts, track, i, inputs[i], events, this.scratch);
      }
    }

    // 4. motion and timers
    stepProjectiles(cfg, m, track, karts, dt, events);
    stepGround(m, track, karts, dt, events);

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
        if (s.branch !== p.branch || (p.hitMask & (1 << i)) !== 0) continue;
        if (i === p.owner && p.graceRemaining > 0) continue;
        if (distXZ(p.position, s.position) > p.radius + consts[i].kartRadius) continue;
        if (s.position[1] - (p.position[1] - cfg.projectileHeight) > cfg.hitHeight) continue; // sprung over it
        if (isRiding(s)) { popProjectile(m, p, events); gone = true; continue; } // it smashes on the Strike Ball
        if (!hittable(s)) continue;
        if (m.trailing[i] && this.fromBehind(p, s)) {
          // the trailed item takes it
          events.push({ type: 'trailBlock', racerId: s.racerId, itemId: s.item.held, position: [...p.position] });
          m.trailing[i] = false;
          spend(s, events);
          popProjectile(m, p, events); gone = true;
          continue;
        }
        const def = this.defs.get(p.itemId) as ItemDefinition;
        landHit(karts, consts, m, i, p.ownerId, def, 'projectile', events, this.scratch);
        // the Mouse runs on through the pack until it has bumped its last kart, each kart once
        // (a kart its coins kept from spinning is still in its way next tick)
        p.hitMask |= 1 << i;
        if (--p.hitsLeft <= 0) { popProjectile(m, p, events); gone = true; }
      }
    }
    for (let b = gs.length - 1; b >= 0; b--) {
      const g = gs[b];
      for (let i = 0; i < karts.length; i++) {
        const s = karts[i];
        if (s.branch !== g.branch || !hittable(s)) continue;
        if (i === g.owner && g.graceRemaining > 0) continue;
        if (distXZ(g.position, s.position) > g.radius + consts[i].kartRadius) continue;
        if (s.position[1] - g.position[1] > cfg.hitHeight) continue; // sprung over it
        const def = this.defs.get(g.itemId) as ItemDefinition;
        landHit(karts, consts, m, i, g.ownerId, def, 'item', events, this.scratch);
        popGround(m, g, events);
        break;
      }
    }

    // 6. powers that outlive the press: Strike Ball, Pogo Spring landings, Grapple Anchor
    stepPowers(m, karts, consts, this.defs, events, this.scratch);

    // 7. AI threat flags and the leader warning
    this.threatened.fill(false);
    for (const p of m.projectiles) if (p.target >= 0) this.threatened[p.target] = true;
    let fogHolder = '';
    for (const s of karts) if (this.defs.get(s.item.held)?.role === 'equaliser' || this.defs.get(s.item.next)?.role === 'equaliser') { fogHolder = s.racerId; break; }
    if (fogHolder !== m.fogHeldBy) {
      if (m.fogHeldBy) events.push({ type: 'equaliserHeld', racerId: m.fogHeldBy, on: false });
      if (fogHolder) events.push({ type: 'equaliserHeld', racerId: fogHolder, on: true });
      m.fogHeldBy = fogHolder;
    }
    return events;
  }

  /**
   * After a route-changing Final Lap Shift: the main road changed length, so an old t is somewhere else
   * along it. Every shot and drop finds its t again on its own road from where it is, and one on a
   * shortcut the new main road now runs along is on that (track-builder's shift does the same for karts).
   * One left past the course limit was on the road the shift replaced, and goes with it. A shift that
   * rebuilds no road leaves every t right, and nothing moves (seam review, 24 Sept 2026: on Meadow the
   * nearest road to a Kite on the hairpin's inside grass is the hairpin's other leg, and it was sent up
   * to 115 m along the road, past the kart it was chasing).
   */
  private reseat(events: ItemEvent[]): void {
    const track = this.track, m = this.state;
    if (!track.def.finalLapShift.routeOverrides?.length) return;
    for (let k = m.projectiles.length - 1; k >= 0; k--) {
      const p = m.projectiles[k];
      this.seat(p);
      p.lateral = lateralOf(track, p.t, p.branch, p.position);
      if (offCourse(track, p.t, p.branch, p.lateral, p.radius)) popProjectile(m, p, events);
    }
    for (let k = m.groundItems.length - 1; k >= 0; k--) {
      const g = m.groundItems[k];
      this.seat(g);
      if (offCourse(track, g.t, g.branch, lateralOf(track, g.t, g.branch, g.position), g.radius)) popGround(m, g, events);
    }
  }

  /** A shot's or drop's t on its own road from where it is; on the main road, if that now runs under it. */
  private seat(it: { position: Vec3; t: number; branch: number }): void {
    const branches = this.track.branches;
    const on = it.branch > 0 ? mainUnder(branches, it.position) : -1;
    if (on >= 0) { it.t = on; it.branch = 0; } else it.t = branches.list[it.branch].nearestGlobal(it.position).t;
  }

  /** A projectile reaching kart s from behind (it would hit the trailed item first). */
  private fromBehind(p: Projectile, s: KartState): boolean {
    const f = forwardOf(s.heading);
    return (p.position[0] - s.position[0]) * f[0] + (p.position[2] - s.position[2]) * f[2] < 0;
  }
}
