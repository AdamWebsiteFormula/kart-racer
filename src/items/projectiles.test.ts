// SOP tests 5, 6, 12 (grace and immunity): Beach Ball bounces, Homing Kite, hit rules.
import { describe, expect, it } from 'vitest';
import { ITEMS_CONFIG } from './data.ts';
import { count, give, go, kart, placeAt, press, seconds, setup, tick, withBehaviour } from './__tests__/harness.ts';

describe('Beach Ball', () => {
  it('bounces exactly 3 times then pops, fired forward across the road', () => {
    const h = setup({ n: 1 });
    go(h);
    const s = kart(h, 0);
    placeAt(h.track, s, 0.1, -3);
    s.heading += 0.6; // aim across the road so it meets the edge
    give(h, 0, 'beachBall');
    press(h, 0);
    expect(h.items.state.projectiles.length).toBe(1);
    tick(h, seconds(8.5));
    expect(count(h.log, 'projectileBounce')).toBe(3);
    expect(count(h.log, 'projectilePop')).toBe(1);
    expect(h.items.state.projectiles.length).toBe(0);
    expect(s.item.held).toBe('none');
  });

  it('fired backward with look-back, it goes the other way and still bounces 3 times', () => {
    const h = setup({ n: 1 });
    go(h);
    const s = kart(h, 0);
    placeAt(h.track, s, 0.1, 3);
    s.heading += 0.6;
    give(h, 0, 'beachBall');
    const ev = press(h, 0, true);
    const spawn = ev.find((e) => e.type === 'projectileSpawn');
    expect(spawn).toBeDefined();
    const p = h.items.state.projectiles[0];
    const f = [Math.sin(s.heading), Math.cos(s.heading)];
    expect(p.velocity[0] * f[0] + p.velocity[2] * f[1]).toBeLessThan(0);
    tick(h, seconds(8.5));
    expect(count(h.log, 'projectileBounce')).toBe(3);
    expect(h.items.state.projectiles.length).toBe(0);
  });

  it('pops on ttl when it never meets an edge', () => {
    const h = setup({ n: 1, cfg: withBehaviour('beachBall', { bounces: 1000 }) });
    go(h);
    placeAt(h.track, kart(h, 0), 0.1, 0);
    give(h, 0, 'beachBall');
    press(h, 0);
    tick(h, seconds(8) - 3); // the firing tick already counted
    expect(h.items.state.projectiles.length).toBe(1);
    tick(h, 3);
    expect(h.items.state.projectiles.length).toBe(0);
    expect(count(h.log, 'projectilePop')).toBe(1);
  });

  it('speed scales with the class', () => {
    const a = setup({ n: 1, cc: 100 }), b = setup({ n: 1, cc: 150 });
    for (const h of [a, b]) { go(h); placeAt(h.track, kart(h, 0), 0.1, 0); give(h, 0, 'beachBall'); press(h, 0); }
    const va = Math.hypot(...a.items.state.projectiles[0].velocity), vb = Math.hypot(...b.items.state.projectiles[0].velocity);
    expect(va).toBeCloseTo(38 * a.rm.consts[0].speedClasses['100'], 6);
    expect(vb).toBeGreaterThan(va);
  });

  it('spins a kart it reaches; the owner is safe inside the grace window, spinning and intangible karts are immune', () => {
    const h = setup({ n: 2 });
    go(h);
    const a = kart(h, 0), b = kart(h, 1);
    placeAt(h.track, a, 0.1, 0);
    placeAt(h.track, b, 0.1 + 20 / h.track.length, 0);
    give(h, 0, 'beachBall');
    press(h, 0);
    tick(h, seconds(1));
    const hit = h.log.find((e) => e.type === 'hit');
    expect(hit).toMatchObject({ racerId: 'k1', byRacerId: 'k0', itemId: 'beachBall', spun: true });
    expect(b.status.spinRemaining).toBeGreaterThan(0);
    expect(b.item.held).toBe('none');

    // grace: a ball placed on its owner does nothing until the grace runs out
    const g = setup({ n: 1 });
    go(g);
    const s = kart(g, 0);
    placeAt(g.track, s, 0.1, 0);
    give(g, 0, 'beachBall');
    press(g, 0);
    const p = g.items.state.projectiles[0];
    p.velocity = [0, 0, 0];
    p.position = [...s.position];
    tick(g, seconds(ITEMS_CONFIG.ownerGraceSeconds) - 4);
    expect(s.status.spinRemaining).toBe(0);
    p.position = [...s.position];
    tick(g, 5);
    expect(s.status.spinRemaining).toBeGreaterThan(0);

    // immunity: a spinning kart and an intangible kart are passed through
    for (const field of ['spinRemaining', 'intangibleRemaining'] as const) {
      const im = setup({ n: 2 });
      go(im);
      const x = kart(im, 0), y = kart(im, 1);
      placeAt(im.track, x, 0.1, 0);
      placeAt(im.track, y, 0.1 + 10 / im.track.length, 0);
      y.status[field] = 5;
      give(im, 0, 'beachBall');
      press(im, 0);
      tick(im, seconds(0.5));
      expect(count(im.log, 'hit')).toBe(0);
    }
  });
});

describe('Homing Kite', () => {
  it('reaches a target ahead on a straight and on a bend; one in flight per owner', () => {
    for (const ahead of [30, 90]) {
      const h = setup({ n: 2 });
      go(h);
      const a = kart(h, 0), b = kart(h, 1);
      placeAt(h.track, a, 0.05, -2);
      placeAt(h.track, b, 0.05 + ahead / h.track.length, 2);
      tick(h, 2); // ranks and distanceAlong settle
      give(h, 0, 'homingKite');
      press(h, 0);
      expect(h.items.state.projectiles[0].target).toBe(1);
      expect(h.items.threatened[1]).toBe(true);
      give(h, 0, 'homingKite');
      expect(press(h, 0).some((e) => e.type === 'itemRefused' && e.reason === 'inFlight')).toBe(true);
      tick(h, seconds(6));
      expect(h.log.find((e) => e.type === 'hit'), `ahead ${ahead}`).toMatchObject({ racerId: 'k1', itemId: 'homingKite' });
      expect(h.items.threatened[1]).toBe(false);
    }
  });

  it('pops on an Oil Can dropped in its path, and flies straight with no target', () => {
    const h = setup({ n: 2 });
    go(h);
    const a = kart(h, 0), b = kart(h, 1);
    placeAt(h.track, a, 0.05, 0);
    placeAt(h.track, b, 0.05 + 40 / h.track.length, 0);
    tick(h, 2);
    give(h, 1, 'oilCan');
    press(h, 1);
    give(h, 0, 'homingKite');
    press(h, 0);
    tick(h, seconds(4));
    expect(count(h.log, 'hit')).toBe(0);
    expect(count(h.log, 'groundPop')).toBe(1);
    expect(count(h.log, 'projectilePop')).toBe(1);

    const solo = setup({ n: 1 });
    go(solo);
    placeAt(solo.track, kart(solo, 0), 0.05, 0);
    give(solo, 0, 'homingKite');
    press(solo, 0);
    expect(solo.items.state.projectiles[0].target).toBe(-1);
    tick(solo, seconds(5));
    expect(solo.items.state.projectiles.length).toBe(1);
    tick(solo, seconds(5.1));
    expect(solo.items.state.projectiles.length).toBe(0);
  });
});
