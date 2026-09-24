// SOP tests 16–23 (design §8, Adam 23 Sept 2026): Fizz Pop, Strike Ball, Pogo Spring, Grapple
// Anchor, Wind-Up Mouse, hold to trail, double balloons.
import { describe, expect, it } from 'vitest';
import { OVAL } from '../race-manager/__tests__/fixtures.ts';
import { respawnLateral, startRescue } from '../race-manager/respawn.ts';
import { ITEMS_CONFIG } from './data.ts';
import { wrap01 } from '../track-builder/lut.ts';
import { lateralOf } from './projectiles.ts';
import { REAL_TRACKS, count, give, go, hold, kart, letGo, placeAt, placeOn, press, seconds, setup, tick, toFeature, trackDef, withBehaviour, type H } from './__tests__/harness.ts';

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

  it('knocks each kart once: coins in hand cost 2 (bug hunt: it hit every tick of the touch and took all 10)', () => {
    const h = setup({ n: 2 });
    go(h);
    const [a, b] = [kart(h, 0), kart(h, 1)];
    placeAt(h.track, a, 0.02, 0);
    placeAt(h.track, b, 0.02 + 30 / h.track.length, 0);
    b.coins = 10;
    give(h, 0, 'strikeBall');
    press(h, 0);
    tick(h, seconds(2));
    const hits = h.log.filter((e) => e.type === 'hit' && e.racerId === 'k1');
    expect(hits).toEqual([expect.objectContaining({ itemId: 'strikeBall', spun: false, coinsLost: 2 })]);
    expect(b.coins).toBe(8);
  });

  it('the claw takes the ball away: a held rider knocks nothing and ends without a burst (seam review: a rider the shift stranded spun a kart where the claw set it down)', () => {
    for (const ride of [5, 0.5]) {
      const h = setup({ n: 2, cfg: withBehaviour('strikeBall', { durationSeconds: ride }) });
      go(h);
      const [a, b] = [kart(h, 0), kart(h, 1)];
      placeAt(h.track, a, 0.05, 0);
      give(h, 0, 'strikeBall');
      give(h, 0, 'fizzPop', 1);
      press(h, 0);
      const tr = h.rm.state.trackers[0];
      startRescue(a, tr, h.track, []);
      // a kart waiting where the claw sets the rider down
      placeAt(h.track, b, h.track.checkpoints[tr.lastCheckpoint].t, respawnLateral(a, h.track, h.track.checkpoints[tr.lastCheckpoint].halfWidth, tr.rescue?.lateral));
      const whileHeld: string[] = [];
      for (let k = 0; k < seconds(4) && (a.status.held || k === 0); k++) {
        const held = a.status.held;
        for (const e of tick(h)) if (held) whileHeld.push(e.type === 'hit' ? `hit ${e.racerId}` : e.type);
      }
      expect(a.status.held, `${ride} s`).toBe(false);
      expect(whileHeld.filter((e) => e.startsWith('hit') || e === 'burst'), `${ride} s`).toEqual([]);
      expect(whileHeld.filter((e) => e === 'powerEnd'), `${ride} s`).toHaveLength(1);
      expect(a.status.rideRemaining, `${ride} s`).toBe(0);
      expect(a.item.held, `${ride} s`).toBe('fizzPop');
      expect(b.status.spinRemaining, `${ride} s`).toBe(0);
    }
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

  it('never hooks a kart on the other road (bug hunt: it hooked one in a shortcut and dragged you off the road)', () => {
    for (const id of REAL_TRACKS) {
      const h = setup({ n: 2, def: trackDef(id) });
      h.track.branches.list[1].forcedOpen = true; // Frostbite's lake opens on lap 3 only
      go(h);
      const [a, b] = [kart(h, 0), kart(h, 1)];
      // b in the shortcut, a on the main road 20 m of t behind it: in reach along the road, not by it
      placeOn(h, 1, 1, 0.5);
      placeAt(h.track, a, wrap01(b.t - 20 / h.track.length), 0);
      give(h, 0, 'grappleAnchor');
      expect(press(h, 0).some((e) => e.type === 'itemRefused' && e.reason === 'noTarget'), id).toBe(true);
      expect(a.item.held, id).toBe('grappleAnchor');
      // and the other way round: a in the shortcut, b on the main road
      placeOn(h, 0, 1, 0.5);
      placeAt(h.track, b, wrap01(a.t + 20 / h.track.length), 0);
      expect(press(h, 0).some((e) => e.type === 'itemRefused' && e.reason === 'noTarget'), id).toBe(true);
    }
  });

  it('lets go when the hooked kart turns into a shortcut you are not on, but follows it out of one', () => {
    const h = setup({ n: 2, def: trackDef('meadow') });
    go(h);
    const [a, b] = [kart(h, 0), kart(h, 1)];
    const entry = h.track.branches.list[1].entryT, L = h.track.length;
    placeAt(h.track, a, wrap01(entry - 40 / L), 0);
    placeAt(h.track, b, wrap01(entry - 10 / L), 0);
    give(h, 0, 'grappleAnchor');
    press(h, 0);
    expect(a.status.towTarget).toBe(1);
    placeOn(h, 1, 1, 0.05); // b takes the hedgerow cut
    tick(h);
    const end = h.log.find((e) => e.type === 'tetherEnd');
    expect(end?.type === 'tetherEnd' && !end.slingshot).toBe(true);
    expect(a.status.towTarget).toBe(-1);

    // both in the cut, b driving out ahead: a is pulled out after it and flies past
    const o = setup({ n: 2, def: trackDef('meadow') });
    go(o);
    const [c, d] = [kart(o, 0), kart(o, 1)];
    placeOn(o, 1, 1, 0.97);
    placeOn(o, 0, 1, 0.97 - 40 / (o.track.length * o.track.branches.list[1].span));
    d.speed = 25;
    o.inputs[1].throttle = 1;
    give(o, 0, 'grappleAnchor');
    press(o, 0);
    expect(c.status.towTarget).toBe(1);
    let split = false;
    for (let k = 0; k < seconds(3) && c.status.towTarget >= 0; k++) {
      tick(o);
      if (c.status.towTarget >= 0 && c.branch !== d.branch) split = true;
    }
    expect(split).toBe(true);
    const out = o.log.find((e) => e.type === 'tetherEnd');
    expect(out?.type === 'tetherEnd' && out.slingshot).toBe(true);
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

  it('bumps each kart once, so three karts holding coins each lose 2 (bug hunt: all three bumps went on the first)', () => {
    const h = setup({ n: 5, cfg: withBehaviour('windUpMouse', { weave: 0 }) });
    go(h);
    placeAt(h.track, kart(h, 0), 0.02, 0);
    for (let k = 1; k <= 4; k++) {
      placeAt(h.track, kart(h, k), 0.02 + (10 * k) / h.track.length, 0);
      kart(h, k).coins = 5;
    }
    give(h, 0, 'windUpMouse');
    press(h, 0);
    tick(h, seconds(2));
    const hits = (id: string) => h.log.filter((e) => e.type === 'hit' && e.racerId === id).length;
    expect([hits('k1'), hits('k2'), hits('k3'), hits('k4')]).toEqual([1, 1, 1, 0]);
    expect([1, 2, 3, 4].map((k) => kart(h, k).coins)).toEqual([3, 3, 3, 5]);
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
