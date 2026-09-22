// SOP tests 7–11, 13: Oil, Decoy, Air Horn, Bubble, Rocket Lolly, Fog Bank, no boost stacking.
import { describe, expect, it } from 'vitest';
import { collisionMass } from '../kart-controller/collide.ts';
import { ITEMS_CONFIG } from './data.ts';
import { count, give, go, kart, placeAt, press, seconds, setup, tick } from './__tests__/harness.ts';

describe('ground items', () => {
  it('Oil slows to 0.5 for 1 s with no spin; Decoy spins; both expire at 20 s', () => {
    for (const [id, spins] of [['oilCan', false], ['decoyBalloon', true]] as const) {
      const h = setup({ n: 2 });
      go(h);
      const a = kart(h, 0), b = kart(h, 1);
      placeAt(h.track, a, 0.1, 0);
      placeAt(h.track, b, 0.05, 0);
      give(h, 0, id);
      press(h, 0);
      const g = h.items.state.groundItems[0];
      expect(g).toBeDefined();
      placeAt(h.track, b, g.t, 0);
      b.position = [...g.position];
      tick(h);
      expect(count(h.log, 'hit')).toBe(1);
      expect(b.status.spinRemaining > 0).toBe(spins);
      if (!spins) { expect(b.status.slowedTo).toBe(0.5); expect(b.status.slowRemaining).toBeCloseTo(1, 5); }
      expect(h.items.state.groundItems.length).toBe(0);

      const e = setup({ n: 1 });
      go(e);
      placeAt(e.track, kart(e, 0), 0.1, 0);
      give(e, 0, id);
      press(e, 0);
      tick(e, seconds(20) - 3); // the drop tick already counted
      expect(e.items.state.groundItems.length).toBe(1);
      tick(e, 3);
      expect(e.items.state.groundItems.length).toBe(0);
    }
  });

  it('a third drop pops the owner\'s oldest; a parked owner never sits on its own drop, but can back into it', () => {
    const h = setup({ n: 1 });
    go(h);
    const s = kart(h, 0);
    placeAt(h.track, s, 0.1, 0);
    for (let k = 0; k < 3; k++) { give(h, 0, 'oilCan'); press(h, 0); }
    expect(h.items.state.groundItems.length).toBe(ITEMS_CONFIG.maxGroundPerOwner);
    expect(count(h.log, 'groundPop')).toBe(1);
    expect(count(h.log, 'hit')).toBe(0);
    tick(h, seconds(ITEMS_CONFIG.ownerGraceSeconds) + 2);
    expect(count(h.log, 'hit')).toBe(0);
    const g = h.items.state.groundItems[0];
    placeAt(h.track, s, g.t, 0);
    s.position = [...g.position];
    tick(h);
    expect(count(h.log, 'hit')).toBe(2); // both drops sit on the same spot; a slow does not make the kart immune to the second
    expect(h.items.state.groundItems.length).toBe(0);
  });
});

describe('Air Horn', () => {
  it('clears projectiles and ground items within 6 m, spins other karts within 6 m, never the owner', () => {
    const h = setup({ n: 3 });
    go(h);
    const a = kart(h, 0), b = kart(h, 1), c = kart(h, 2);
    placeAt(h.track, a, 0.1, 0);
    placeAt(h.track, b, 0.1 + 4 / h.track.length, 2);
    placeAt(h.track, c, 0.1 + 20 / h.track.length, 0);
    give(h, 1, 'oilCan'); press(h, 1);
    give(h, 2, 'oilCan'); press(h, 2);
    give(h, 1, 'beachBall');
    press(h, 1);
    h.items.state.projectiles[0].velocity = [0, 0, 0];
    expect(h.items.state.groundItems.length).toBe(2);
    give(h, 0, 'airHorn');
    const ev = press(h, 0);
    expect(ev.some((e) => e.type === 'horn')).toBe(true);
    expect(h.items.state.projectiles.length).toBe(0);
    expect(h.items.state.groundItems.length).toBe(1);
    expect(b.status.spinRemaining).toBeGreaterThan(0);
    expect(c.status.spinRemaining).toBe(0);
    expect(a.status.spinRemaining).toBe(0);
    expect(a.item.held).toBe('none');
  });
});

describe('Bubble', () => {
  it('absorbs exactly one hit, pops at 8 s, and adds 0.5 mass while up', () => {
    const h = setup({ n: 2 });
    go(h);
    const a = kart(h, 0), b = kart(h, 1);
    placeAt(h.track, a, 0.1, 0);
    placeAt(h.track, b, 0.1 + 15 / h.track.length, 0);
    const bare = collisionMass(b, h.rm.consts[1]);
    give(h, 1, 'bubble');
    press(h, 1);
    expect(b.status.shield).toBe(true);
    expect(collisionMass(b, h.rm.consts[1])).toBeCloseTo(bare + 0.5, 9);
    give(h, 0, 'beachBall'); press(h, 0);
    tick(h, seconds(1));
    expect(count(h.log, 'shieldPop')).toBe(1);
    expect(count(h.log, 'hit')).toBe(0);
    expect(b.status.shield).toBe(false);
    expect(b.status.spinRemaining).toBe(0);
    give(h, 0, 'beachBall'); press(h, 0);
    tick(h, seconds(1));
    expect(count(h.log, 'hit')).toBe(1);

    const e = setup({ n: 1 });
    go(e);
    give(e, 0, 'bubble'); press(e, 0);
    tick(e, seconds(8) - 2);
    expect(kart(e, 0).status.shield).toBe(true);
    tick(e, 3);
    expect(kart(e, 0).status.shield).toBe(false);
    expect(count(e.log, 'shieldEnd')).toBe(1);
  });
});

describe('Rocket Lolly', () => {
  it('3 charges; each boosts 1.4 × for 1.5 s and doubles the drift charge for 2 s; a Trick wins', () => {
    const h = setup({ n: 1 });
    go(h);
    const s = kart(h, 0);
    const c = h.rm.consts[0];
    give(h, 0, 'rocketLolly');
    expect(s.item.charges).toBe(3);
    press(h, 0);
    expect(s.boost.source).toBe('item');
    expect(s.boost.multiplier).toBe(c.itemSpeedMultiplier);
    expect(s.boost.remaining).toBeCloseTo(c.itemSpeedSeconds, 1);
    expect(s.drift.chargeMultiplier).toBe(2);
    expect(s.drift.chargeMultiplierRemaining).toBeCloseTo(2, 1);
    expect(s.item.charges).toBe(2);
    expect(s.item.held).toBe('rocketLolly');
    s.boost.source = 'trick'; s.boost.multiplier = c.trickMultiplier; s.boost.remaining = 0.7;
    press(h, 0);
    expect(s.boost.source).toBe('trick');
    expect(s.item.charges).toBe(1);
    press(h, 0);
    expect(s.item.charges).toBe(0);
    expect(s.item.held).toBe('none');
    expect(press(h, 0).length).toBe(0);
  });
});

describe('Fog Bank', () => {
  it('slows every kart ahead to 0.6 for 3 s and strips their items; owner and karts behind untouched; refused above rank 5', () => {
    const h = setup({ n: 6 });
    go(h);
    for (let i = 0; i < 6; i++) placeAt(h.track, kart(h, i), 0.03 + (5 - i) * 0.012, 0); // k0 leads … k5 last, all inside the first sector
    tick(h, 3);
    expect(kart(h, 4).rank).toBe(5);
    give(h, 0, 'beachBall'); give(h, 1, 'bubble'); give(h, 5, 'oilCan');
    kart(h, 2).item.held = 'oilCan'; kart(h, 2).item.rouletteRemaining = 1; // mid-roulette
    give(h, 4, 'fogBank');
    const ev = press(h, 4);
    const fog = ev.find((e) => e.type === 'fog');
    expect(fog).toMatchObject({ racerId: 'k4', victims: ['k0', 'k1', 'k2', 'k3'] });
    for (let i = 0; i < 4; i++) {
      expect(kart(h, i).status.slowedTo).toBe(0.6);
      expect(kart(h, i).status.slowRemaining).toBeCloseTo(3, 1);
      expect(kart(h, i).item.held).toBe('none');
      expect(kart(h, i).item.rouletteRemaining).toBe(0);
    }
    expect(count(ev, 'itemLost')).toBe(3);
    expect(kart(h, 4).status.slowRemaining).toBe(0);
    expect(kart(h, 5).status.slowRemaining).toBe(0);
    expect(kart(h, 5).item.held).toBe('oilCan');
    expect(kart(h, 4).item.held).toBe('none');

    give(h, 0, 'fogBank');
    expect(press(h, 0).some((e) => e.type === 'itemRefused' && e.reason === 'position')).toBe(true);
    expect(kart(h, 0).item.held).toBe('fogBank');
  });

  it('holding it warns the leaders', () => {
    const h = setup({ n: 2 });
    go(h);
    give(h, 1, 'fogBank');
    expect(tick(h).find((e) => e.type === 'equaliserHeld')).toMatchObject({ racerId: 'k1', on: true });
    kart(h, 1).item.held = 'none';
    expect(tick(h).find((e) => e.type === 'equaliserHeld')).toMatchObject({ racerId: 'k1', on: false });
  });
});
