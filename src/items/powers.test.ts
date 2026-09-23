// SOP tests 16–23 (design §8, Adam 23 Sept 2026): Fizz Pop, Strike Ball, Pogo Spring, Grapple
// Anchor, Wind-Up Mouse, hold to trail, double balloons.
import { describe, expect, it } from 'vitest';
import { OVAL } from '../race-manager/__tests__/fixtures.ts';
import { ITEMS_CONFIG } from './data.ts';
import { wrap01 } from '../track-builder/lut.ts';
import { lateralOf } from './projectiles.ts';
import { count, give, go, hold, kart, letGo, placeAt, press, seconds, setup, tick, toFeature, withBehaviour, type H } from './__tests__/harness.ts';

/** Metres above the road under kart i. */
function clearance(h: H, i: number): number {
  const s = kart(h, i);
  return s.position[1] - h.track.sample(s.t, 0, s.branch).groundY;
}

/** Tick until an event of `type` appears (at most `max` seconds); returns true when it did. */
function until(h: H, type: string, max: number): boolean {
  for (let k = 0; k < seconds(max); k++) if (tick(h).some((e) => e.type === type)) return true;
  return false;
}

describe('Fizz Pop and Triple Fizz', () => {
  it('Fizz Pop is one item boost; only Triple Fizz adds the drift sugar rush', () => {
    const h = setup({ n: 1 });
    go(h);
    const s = kart(h, 0);
    give(h, 0, 'fizzPop');
    give(h, 0, 'bubble', 1);
    press(h, 0);
    expect(s.boost.source).toBe('item');
    expect(s.drift.chargeMultiplier).toBe(1);
    expect(s.item.held).toBe('bubble');
    give(h, 0, 'tripleFizz');
    press(h, 0);
    expect(s.item.charges).toBe(2);
    expect(s.drift.chargeMultiplier).toBe(2);
  });
});

describe('Strike Ball', () => {
  it('rolls down the road on its own at 1.5 × top speed, holds the slot, then frees it', () => {
    const h = setup({ n: 1 });
    go(h);
    const s = kart(h, 0);
    give(h, 0, 'strikeBall');
    give(h, 0, 'fizzPop', 1);
    const t0 = s.t;
    press(h, 0);
    expect(s.status.rideRemaining).toBeGreaterThan(0);
    expect(count(h.log, 'powerStart')).toBe(1);
    // the second slot waits while the ball rolls
    expect(press(h, 0).some((e) => e.type === 'itemRefused' && e.reason === 'inUse')).toBe(true);
    let widest = -Infinity;
    for (let k = 0; k < seconds(2); k++) {
      tick(h);
      widest = Math.max(widest, Math.abs(lateralOf(h.track, s.t, s.branch, s.position)) + h.rm.consts[0].rideRadius - h.track.sample(s.t, 0, s.branch).halfWidth);
    }
    // no input at all: the autopilot drove, fast, and never touched the road edge
    expect(s.speed).toBeGreaterThan(h.rm.consts[0].topSpeed * 1.45);
    expect(wrap01(s.t - t0) * h.track.length).toBeGreaterThan(30);
    expect(widest).toBeLessThan(0);
    expect(until(h, 'powerEnd', 4)).toBe(true);
    expect(s.status.rideRemaining).toBe(0);
    expect(s.item.held).toBe('fizzPop');
  });

  it('shrugs off shots and drops; karts it rolls into fly up and spin like pins', () => {
    const h = setup({ n: 3 });
    go(h);
    const [a, b, c] = [kart(h, 0), kart(h, 1), kart(h, 2)];
    placeAt(h.track, a, 0.02, 0);
    placeAt(h.track, b, 0.08, 0);
    placeAt(h.track, c, 0.11, 0);
    // b ahead drops oil in the ball's path; c fires a beach ball back at it
    give(h, 1, 'oilCan');
    press(h, 1);
    give(h, 2, 'beachBall');
    press(h, 2, true);
    give(h, 0, 'strikeBall');
    press(h, 0);
    let peak = 0;
    for (let k = 0; k < seconds(2.5); k++) { tick(h); peak = Math.max(peak, clearance(h, 1)); }
    const hits = h.log.filter((e) => e.type === 'hit');
    expect(hits.some((e) => e.type === 'hit' && e.racerId === 'k0')).toBe(false);
    expect(hits.some((e) => e.type === 'hit' && e.racerId === 'k1' && e.byRacerId === 'k0' && e.spun)).toBe(true);
    expect(peak).toBeGreaterThan(0.5);
    expect(h.items.state.groundItems.length).toBe(0);
  });

  it('the STRIKE burst spins karts near the ball, never its owner', () => {
    const h = setup({ n: 2, cfg: withBehaviour('strikeBall', { durationSeconds: 0.3 }) });
    go(h);
    const [a, b] = [kart(h, 0), kart(h, 1)];
    placeAt(h.track, a, 0.05, -2.5);
    placeAt(h.track, b, 0.052, 2.5);
    give(h, 0, 'strikeBall');
    press(h, 0);
    expect(until(h, 'burst', 1)).toBe(true);
    expect(b.status.spinRemaining).toBeGreaterThan(0);
    expect(a.status.spinRemaining).toBe(0);
  });
});

describe('Pogo Spring', () => {
  it('boings over a shot, then the second press slams down with a shock ring', () => {
    const h = setup({ n: 3 });
    go(h);
    const [a, b, c] = [kart(h, 0), kart(h, 1), kart(h, 2)];
    placeAt(h.track, a, 0.06, 0);
    placeAt(h.track, b, 0.06, 4);
    placeAt(h.track, c, 0.035, 0);
    give(h, 0, 'pogoSpring');
    press(h, 0);
    expect(count(h.log, 'springLaunch')).toBe(1);
    tick(h, seconds(0.12));
    expect(clearance(h, 0)).toBeGreaterThan(ITEMS_CONFIG.hitHeight);
    // a ball from behind passes under
    give(h, 2, 'beachBall');
    press(h, 2);
    tick(h, seconds(0.3));
    expect(h.log.some((e) => e.type === 'hit' && e.racerId === 'k0')).toBe(false);
    // slam
    press(h, 0);
    expect(until(h, 'springSlam', 1)).toBe(true);
    expect(b.status.spinRemaining).toBeGreaterThan(0);
    expect(a.item.held).toBe('none');
  });

  it('a slam never used is spent on landing', () => {
    const h = setup({ n: 1 });
    go(h);
    const s = kart(h, 0);
    give(h, 0, 'pogoSpring');
    give(h, 0, 'bubble', 1);
    press(h, 0);
    expect(s.item.charges).toBe(1);
    tick(h, seconds(1.5));
    expect(s.grounded).toBe(true);
    expect(s.item.held).toBe('bubble');
  });
});

describe('Grapple Anchor', () => {
  it('with no kart in reach it is refused and kept', () => {
    const h = setup({ n: 1 });
    go(h);
    give(h, 0, 'grappleAnchor');
    expect(press(h, 0).some((e) => e.type === 'itemRefused' && e.reason === 'noTarget')).toBe(true);
    expect(kart(h, 0).item.held).toBe('grappleAnchor');
  });

  it('hooks the kart ahead, reels in, then slingshots past with a boost and tugs it', () => {
    const h = setup({ n: 2 });
    go(h);
    const [a, b] = [kart(h, 0), kart(h, 1)];
    placeAt(h.track, a, 0.02, 0);
    placeAt(h.track, b, 0.02 + 30 / h.track.length, 1);
    give(h, 0, 'grappleAnchor');
    press(h, 0);
    expect(count(h.log, 'tetherStart')).toBe(1);
    expect(a.status.towTarget).toBe(1);
    expect(until(h, 'tetherEnd', 3)).toBe(true);
    const end = h.log.find((e) => e.type === 'tetherEnd');
    expect(end?.type === 'tetherEnd' && end.slingshot).toBe(true);
    expect(a.boost.source).toBe('item');
    expect(b.status.slowRemaining).toBeGreaterThan(0);
    expect(a.status.towTarget).toBe(-1);
    // it drew level beside the hooked kart instead of running into its back
    expect(h.log.some((e) => e.type === 'hit' && e.racerId === 'k1')).toBe(false);
    const r = [Math.cos(b.heading), 0, -Math.sin(b.heading)];
    expect(Math.abs((a.position[0] - b.position[0]) * r[0] + (a.position[2] - b.position[2]) * r[2])).toBeGreaterThan(1);
  });

  it('a Bubble eats the anchor', () => {
    const h = setup({ n: 2 });
    go(h);
    const [a, b] = [kart(h, 0), kart(h, 1)];
    placeAt(h.track, a, 0.02, 0);
    placeAt(h.track, b, 0.02 + 20 / h.track.length, 0);
    b.status.shield = true;
    give(h, 0, 'grappleAnchor');
    press(h, 0);
    expect(count(h.log, 'shieldPop')).toBe(1);
    expect(count(h.log, 'tetherStart')).toBe(0);
    expect(a.item.held).toBe('none');
  });
});

describe('Wind-Up Mouse', () => {
  it('bumps three karts in a row, then runs down', () => {
    const h = setup({ n: 5, cfg: withBehaviour('windUpMouse', { weave: 0 }) });
    go(h);
    placeAt(h.track, kart(h, 0), 0.02, 0);
    for (let k = 1; k <= 4; k++) placeAt(h.track, kart(h, k), 0.02 + (10 * k) / h.track.length, 0);
    give(h, 0, 'windUpMouse');
    press(h, 0);
    tick(h, seconds(2));
    const hit = (id: string) => h.log.some((e) => e.type === 'hit' && e.racerId === id);
    expect([hit('k1'), hit('k2'), hit('k3'), hit('k4')]).toEqual([true, true, true, false]);
    expect(h.items.state.projectiles.length).toBe(0);
  });

  it('weaves across the road, and runs backward with look-back', () => {
    const h = setup({ n: 1 });
    go(h);
    give(h, 0, 'windUpMouse');
    press(h, 0);
    const lats: number[] = [];
    for (let k = 0; k < seconds(1.6); k++) { tick(h); lats.push(h.items.state.projectiles[0]?.lateral ?? 0); }
    expect(Math.max(...lats)).toBeGreaterThan(1);
    expect(Math.min(...lats)).toBeLessThan(-1);
    const b = setup({ n: 1 });
    go(b);
    give(b, 0, 'windUpMouse');
    press(b, 0, true);
    expect(b.items.state.projectiles[0].speed).toBeLessThan(0);
  });
});

describe('hold to trail', () => {
  it('a trailed item blocks one shot from behind and is used up doing it', () => {
    const h = setup({ n: 2 });
    go(h);
    const [a, b] = [kart(h, 0), kart(h, 1)];
    placeAt(h.track, a, 0.07, 0);
    placeAt(h.track, b, 0.04, 0);
    give(h, 0, 'oilCan');
    hold(h, 0, 2);
    expect(h.items.isTrailing(0)).toBe(true);
    give(h, 1, 'beachBall');
    press(h, 1);
    h.inputs[0] = { ...h.inputs[0], item: true };
    tick(h, seconds(1));
    expect(count(h.log, 'trailBlock')).toBe(1);
    expect(h.log.some((e) => e.type === 'hit' && e.racerId === 'k0')).toBe(false);
    expect(a.item.held).toBe('none');
    expect(h.items.isTrailing(0)).toBe(false);
  });

  it('let go and it is used: oil drops behind, a ball flies back with look-back', () => {
    const h = setup({ n: 1 });
    go(h);
    give(h, 0, 'oilCan');
    hold(h, 0, seconds(0.5));
    expect(h.items.state.groundItems.length).toBe(0);
    letGo(h, 0);
    expect(h.items.state.groundItems.length).toBe(1);
    give(h, 0, 'beachBall');
    hold(h, 0, 3);
    const spawn = letGo(h, 0, true).find((e) => e.type === 'projectileSpawn');
    const s = kart(h, 0);
    expect(spawn).toBeDefined();
    const p = spawn?.type === 'projectileSpawn' ? spawn.position : s.position;
    expect((p[0] - s.position[0]) * Math.sin(s.heading) + (p[2] - s.position[2]) * Math.cos(s.heading)).toBeLessThan(0);
  });

  it('a hit while trailing loses the trailed item', () => {
    const h = setup({ n: 1 });
    go(h);
    give(h, 0, 'decoyBalloon');
    hold(h, 0, 2);
    kart(h, 0).status.spinRemaining = 1;
    tick(h);
    expect(count(h.log, 'itemLost')).toBe(1);
    expect(kart(h, 0).item.held).toBe('none');
  });
});

describe('double balloons', () => {
  it('a gold double balloon fills both slots at once', () => {
    const def = structuredClone(OVAL);
    def.pickups = [{ t: 0.3, lateral: 0, double: true }];
    const h = setup({ n: 1, def });
    go(h);
    toFeature(h, 0, 'pickup', 0);
    const ev = tick(h);
    expect(ev.filter((e) => e.type === 'roulette').map((e) => (e.type === 'roulette' ? e.slot : -1))).toEqual([0, 1]);
    const s = kart(h, 0);
    expect(s.item.held).not.toBe('none');
    expect(s.item.next).not.toBe('none');
  });
});
