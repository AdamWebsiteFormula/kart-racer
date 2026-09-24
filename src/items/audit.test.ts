// Items audit, 24 Sept 2026: one regression per fix (docs/sops/items.md Decisions of that date).
import { describe, expect, it } from 'vitest';
import { AI, PROFILES } from '../ai-driver/constants.ts';
import { decideItem } from '../ai-driver/items.ts';
import { fakeLine, memory } from '../ai-driver/__tests__/units.ts';
import { makeConstants } from '../kart-controller/constants.ts';
import type { KartEvent } from '../kart-controller/types.ts';
import { RACE } from '../race-manager/constants.ts';
import { stepHazards } from '../race-manager/hazards.ts';
import type { RaceEvent } from '../race-manager/types.ts';
import { BUILDER } from '../track-builder/constants.ts';
import { buildTrack } from '../track-builder/track.ts';
import { ITEMS_CONFIG, ITEM_ROLES, itemById } from './data.ts';
import { REAL_TRACKS, count, give, go, kart, placeAt, placeOn, press, seconds, setup, tick, trackDef } from './__tests__/harness.ts';
import { landHit } from './hits.ts';
import { pickTarget } from './projectiles.ts';
import { knockoutPool, rowFor, weightsFor } from './roulette.ts';
import type { ItemEvent } from './types.ts';

describe('balloon rows (fixes 1 and 8)', () => {
  it('every row spans the road with no gap a kart slips through, and each track has one or two gold doubles in a row', () => {
    const reach = BUILDER.balloonRadius + makeConstants('medium', 100).kartRadius;
    for (const id of REAL_TRACKS) {
      const def = trackDef(id);
      const track = buildTrack(def);
      const feats = track.features.filter((f) => f.kind === 'pickup');
      const rows = new Map<string, number[]>();
      def.pickups!.forEach((p, i) => {
        const k = `${p.t}|${p.shortcut ?? ''}`;
        rows.set(k, [...(rows.get(k) ?? []), i]);
      });
      let doubles = 0;
      for (const [k, idx] of rows) {
        const f = feats[idx[0]];
        const hw = track.sample(f.t, 0, f.branch).halfWidth;
        const lats = idx.map((i) => def.pickups![i].lateral ?? 0).sort((a, b) => a - b);
        // the main road's rows hold 4 or 5; a shortcut's narrow road 3 or 4
        expect(idx.length, `${id} ${k}`).toBeGreaterThanOrEqual(f.branch === 0 ? 4 : 3);
        // edge to edge, every balloon on the road; balloons 3.6 m apart leave a 0.1 m sliver between two karts' reach, so one kart takes one balloon and leaves the next for the kart behind
        expect(-hw - lats[0], `${id} ${k} left`).toBeLessThanOrEqual(reach + 1.5);
        expect(hw - lats[lats.length - 1], `${id} ${k} right`).toBeLessThanOrEqual(reach + 1.5);
        for (const l of lats) expect(Math.abs(l) + BUILDER.balloonRadius, `${id} ${k}`).toBeLessThanOrEqual(hw + 0.2);
        for (let j = 1; j < lats.length; j++) expect(lats[j] - lats[j - 1], `${id} ${k} gap`).toBeLessThanOrEqual(2 * reach + 0.1 + 1e-9);
        for (const i of idx) if (def.pickups![i].double) {
          doubles++;
          // in the middle of the row, never at its ends
          const l = def.pickups![i].lateral ?? 0;
          expect(l > lats[0] && l < lats[lats.length - 1], `${id} ${k} double`).toBe(true);
        }
      }
      expect(doubles, id).toBeGreaterThanOrEqual(1);
      expect(doubles, id).toBeLessThanOrEqual(2);
    }
  });

  it('a popped balloon is back before the next kart in a close pack gets there', () => {
    expect(RACE.pickupRespawnSeconds).toBeLessThanOrEqual(1);
    const h = setup({ n: 1 });
    go(h);
    const hit = (): boolean => h.race.some((e) => e.type === 'pickup');
    const s = kart(h, 0);
    const f = h.track.features.find((x) => x.kind === 'pickup')!;
    placeAt(h.track, s, f.t, f.lateral);
    s.position = [...f.position];
    tick(h, 1);
    expect(hit()).toBe(true);
    // a kart half a second behind (15 m at 30 m/s) finds it again
    h.race.length = 0;
    s.item.held = 'none'; s.item.rouletteRemaining = 0; s.item.next = 'none'; s.item.nextRouletteRemaining = 0;
    tick(h, seconds(0.5));
    expect(hit()).toBe(true);
  });
});

describe('Homing Kite speed (fix 3)', () => {
  it('catches a kart boosting all the way from 60 m ahead, well inside its life', () => {
    const h = setup({ n: 2 });
    go(h);
    const a = kart(h, 0), b = kart(h, 1);
    placeAt(h.track, a, 0.02, 0);
    placeAt(h.track, b, 0.02 + 60 / h.track.length, 0);
    b.speed = h.rm.consts[1].topSpeed * h.rm.consts[1].itemSpeedMultiplier;
    h.inputs[1].throttle = 1;
    give(h, 0, 'homingKite');
    press(h, 0);
    let when = -1;
    for (let k = 0; k < seconds(10) && when < 0; k++) {
      // a live item boost the whole way: 1.4 × its top speed
      b.boost.source = 'item'; b.boost.multiplier = h.rm.consts[1].itemSpeedMultiplier; b.boost.remaining = 1;
      tick(h, 1);
      if (h.log.some((e) => e.type === 'hit' && e.racerId === 'k1')) when = k;
    }
    expect(when).toBeGreaterThan(0);
    expect(when).toBeLessThan(seconds(6));
  });
});

describe('shots in flight per kart (fix 4)', () => {
  it('a Beach Ball flies while a Kite does; one Kite at a time; three Balls and Mice besides it', () => {
    const h = setup({ n: 2 });
    go(h);
    placeAt(h.track, kart(h, 0), 0.02, 0);
    placeAt(h.track, kart(h, 1), 0.02 + 150 / h.track.length, 0);
    tick(h, 2);
    const refused = (ev: ItemEvent[]) => ev.some((e) => e.type === 'itemRefused' && e.reason === 'inFlight');
    give(h, 0, 'homingKite');
    expect(refused(press(h, 0))).toBe(false);
    give(h, 0, 'homingKite');
    expect(refused(press(h, 0))).toBe(true);
    for (const id of ['beachBall', 'windUpMouse', 'beachBall']) {
      tick(h, seconds(0.3)); // apart, or two shots side by side pop each other
      give(h, 0, id);
      expect(refused(press(h, 0)), id).toBe(false);
    }
    tick(h, seconds(0.3));
    give(h, 0, 'beachBall');
    expect(refused(press(h, 0))).toBe(true);
    expect(h.items.state.projectiles.filter((p) => p.owner === 0).length).toBe(4);
  });
});

describe('Oil Can (fix 5)', () => {
  it('cuts the speed to half at once and ends the drift and the boost', () => {
    const h = setup({ n: 2 });
    go(h);
    const s = kart(h, 1), c = h.rm.consts[1];
    s.speed = c.topSpeed * 1.2;
    s.drift.active = true; s.drift.phase = 'drifting'; s.drift.charge = 1;
    s.boost.source = 'drift'; s.boost.multiplier = 1.3; s.boost.remaining = 1;
    const events: ItemEvent[] = [];
    landHit(h.rm.state.karts, h.rm.consts, h.items.state, 1, 'k0', itemById(ITEMS_CONFIG, 'oilCan')!, 'item', events, [] as KartEvent[]);
    expect(s.speed).toBeCloseTo(c.topSpeed * 0.5, 6);
    expect(s.drift.active).toBe(false);
    expect(s.boost.remaining).toBe(0);
    expect(s.status.slowedTo).toBe(0.5);
    expect(s.status.slowRemaining).toBe(1);
    expect(s.status.spinRemaining).toBe(0);
    // a kart already slower keeps its speed
    s.speed = 5;
    s.status.slowRemaining = 0;
    landHit(h.rm.state.karts, h.rm.consts, h.items.state, 1, 'k0', itemById(ITEMS_CONFIG, 'oilCan')!, 'item', events, []);
    expect(s.speed).toBe(5);
  });
});

describe('roll table over the field (fix 6)', () => {
  it('the rows stretch over the racers left: last place draws the last row in a field of any size', () => {
    for (let r = 1; r <= 8; r++) expect(rowFor(r, 8, 8)).toBe(r);
    expect([1, 2, 3, 4].map((r) => rowFor(r, 4, 8))).toEqual([1, 3, 6, 8]);
    expect([1, 2, 3, 4, 5, 6].map((r) => rowFor(r, 6, 8))).toEqual([1, 2, 4, 5, 7, 8]);
    expect(rowFor(2, 2, 8)).toBe(8);
    expect(rowFor(1, 1, 8)).toBe(1);
    // a field without a pool of its own takes the next smaller one (3 racers: the 2-racer pool)
    expect(knockoutPool(ITEMS_CONFIG, 3)).toBe(ITEMS_CONFIG.knockoutPoolByRacers['2']);
    expect(knockoutPool(ITEMS_CONFIG, 4)).toBe(ITEMS_CONFIG.knockoutPoolByRacers['4']);
  });

  it('last of four in Knockout rolls comeback items; an item it could never use is never drawn', () => {
    const four = setup({ n: 4, mode: 'knockout' });
    go(four); tick(four, seconds(16));
    const w = weightsFor(ITEMS_CONFIG, four.rm.state, four.rm.consts, four.track, 4);
    expect(w.tripleFizz).toBeGreaterThan(0);
    expect(w.beachBall ?? 0).toBe(0);
    expect(w.fogBank ?? 0).toBe(0); // the 4-racer pool
    // 4th of 6 draws row 5, whose Fog Bank needs 5th place: masked, not a dead roll
    const six = setup({ n: 6, mode: 'knockout' });
    go(six); tick(six, seconds(16));
    expect(weightsFor(ITEMS_CONFIG, six.rm.state, six.rm.consts, six.track, 4).fogBank ?? 0).toBe(0);
    expect(weightsFor(ITEMS_CONFIG, six.rm.state, six.rm.consts, six.track, 6).fogBank).toBeGreaterThan(0);
  });
});

describe('Wind-Up Mouse (fix 7)', () => {
  it('never bumps its own kart, even one that drives through it', () => {
    const h = setup({ n: 1 });
    go(h);
    const s = kart(h, 0);
    placeAt(h.track, s, 0.02, 0);
    give(h, 0, 'windUpMouse');
    press(h, 0);
    tick(h, seconds(0.5)); // past the owner grace
    const p = h.items.state.projectiles[0];
    for (let k = 0; k < 10; k++) { s.position = [...p.position]; s.t = p.t; tick(h, 1); }
    expect(count(h.log, 'hit')).toBe(0);
    expect(h.items.state.projectiles.length).toBe(1);
  });
});

describe('Kite threat for the AI (fix 9)', () => {
  it('a Kite locked on 80 m back is no threat yet: the AI keeps its Air Horn; within 8 m it blows it', () => {
    const h = setup({ n: 2 });
    go(h);
    placeAt(h.track, kart(h, 0), 0.02, 0);
    placeAt(h.track, kart(h, 1), 0.02 + 80 / h.track.length, 0);
    tick(h, 2);
    give(h, 0, 'homingKite');
    press(h, 0);
    const b = kart(h, 1);
    b.item.held = 'airHorn'; b.item.charges = 1;
    const m = memory(PROFILES.hard);
    const ctx = () => ({ karts: h.rm.state.karts, roles: ITEM_ROLES, gap: 0, threatened: h.items.threatened[1] });
    let firstPress = Infinity, distAtPress = Infinity;
    for (let k = 0; k < seconds(4) && firstPress === Infinity; k++) {
      tick(h, 1);
      if (decideItem(b, m, PROFILES.hard, fakeLine(0), ctx(), 1 / 120)) { firstPress = k; distAtPress = h.items.threatDistance[1]; }
    }
    expect(firstPress).toBeLessThan(Infinity);
    expect(distAtPress).toBeLessThanOrEqual(Math.max(ITEMS_CONFIG.kiteWarnMetres, 60 * ITEMS_CONFIG.kiteWarnSeconds));
    expect(AI.items.defenceRadius).toBeLessThan(80);
  });
});

describe('Bubble against a hazard (fix 11)', () => {
  it('a creature or hazard spin pops the Bubble instead of spinning the kart', () => {
    for (const hit of ['spin', 'slow'] as const) {
      const h = setup({ n: 1 });
      go(h);
      const s = kart(h, 0);
      give(h, 0, 'bubble');
      press(h, 0);
      expect(s.status.shield).toBe(true);
      const race: RaceEvent[] = [], kev: KartEvent[] = [];
      stepHazards(s, h.rm.state.trackers[0], h.rm.consts[0], [{ id: 'rumblesaur', type: 'creature', position: [...s.position], radius: 3, hit }], 1 / 120, race, kev);
      expect(s.status.shield, hit).toBe(false);
      expect(s.status.spinRemaining).toBe(0);
      expect(s.status.slowRemaining).toBe(0);
      expect(race.filter((e) => e.type === 'hazardHit')).toEqual([]);
      // the next tick of the same hazard does nothing more (the kart is inside it)
      stepHazards(s, h.rm.state.trackers[0], h.rm.consts[0], [{ id: 'rumblesaur', type: 'creature', position: [...s.position], radius: 3, hit }], 1 / 120, race, kev);
      expect(s.status.spinRemaining).toBe(0);
      const ev = tick(h, 1);
      expect(ev.filter((e) => e.type === 'shieldPop')).toEqual([{ type: 'shieldPop', racerId: 'k0' }]);
      expect(h.items.state.shieldRemaining[0]).toBe(0);
    }
  });
});

describe('Kite targets (fix 12)', () => {
  it('never picks a respawning kart, and takes the next kart ahead when its own respawns', () => {
    const h = setup({ n: 3 });
    go(h);
    const [a, b, c] = [kart(h, 0), kart(h, 1), kart(h, 2)];
    placeAt(h.track, a, 0.02, 0);
    placeAt(h.track, b, 0.02 + 40 / h.track.length, 0);
    placeAt(h.track, c, 0.02 + 80 / h.track.length, 0);
    tick(h, 2);
    b.status.intangibleRemaining = 1;
    expect(pickTarget(h.rm.state.karts, 0, 0)).toBe(2);
    b.status.intangibleRemaining = 0;
    give(h, 0, 'homingKite');
    press(h, 0);
    const p = h.items.state.projectiles[0];
    expect(p.target).toBe(1);
    b.status.intangibleRemaining = 2;
    tick(h, 1);
    expect(p.target).toBe(2);
    tick(h, seconds(5));
    expect(h.log.find((e) => e.type === 'hit')).toMatchObject({ racerId: 'k2', itemId: 'homingKite' });
  });
});

describe('where two roads cross at one level (fix 13)', () => {
  it("at Boardwalk's crossing a drop on the arcade alley hits a kart on the main road; one on a bridge above does not", () => {
    for (const lift of [0, 3]) {
      const h = setup({ n: 2, def: trackDef('boardwalk') });
      go(h);
      // the alley crosses the main road at u 0.10 (t 0.320 on the alley, 0.3194 on the main road)
      placeOn(h, 0, 1, 0.3);
      const at = h.track.sample(h.track.branches.list[1].toMain(0.1), 0, 1).position;
      const s = kart(h, 1);
      placeAt(h.track, s, h.track.branches.main.nearestGlobal(at).t, 0);
      s.position = [...at];
      h.items.state.groundItems.push({ id: 99, itemId: 'oilCan', owner: 0, ownerId: 'k0', t: h.track.branches.list[1].toMain(0.1), branch: 1, position: [at[0], at[1] + lift, at[2]], ttl: 20, graceRemaining: 0, radius: 1.2 });
      expect(s.branch).toBe(0);
      tick(h, 1);
      expect(h.log.some((e) => e.type === 'hit' && e.racerId === 'k1'), `lift ${lift}`).toBe(lift === 0);
    }
  });
});
