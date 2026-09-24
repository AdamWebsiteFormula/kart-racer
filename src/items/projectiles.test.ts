// SOP tests 5, 6, 12 (grace and immunity): Beach Ball bounces, Homing Kite, hit rules.
import { describe, expect, it } from 'vitest';
import { ITEMS_CONFIG } from './data.ts';
import { REAL_TRACKS, count, give, go, kart, placeAt, placeOn, press, seconds, setup, tick, trackDef, withBehaviour } from './__tests__/harness.ts';
import { distXZ } from './hits.ts';
import type { Vec3 } from '../kart-controller/types.ts';
import { OVAL } from '../race-manager/__tests__/fixtures.ts';
import meadowJson from '../track-builder/tracks/meadow-run.json';
import type { TrackDefinition } from '../track-builder/types.ts';

/** The oval with the land past its curb drivable (the off-road tracks), and Meadow Run (a 12 degree banked hairpin at t 0.99). */
const OVAL_OFFROAD: TrackDefinition = { ...JSON.parse(JSON.stringify(OVAL)), offroad: true };
const MEADOW = JSON.parse(JSON.stringify(meadowJson)) as TrackDefinition;

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

  it('follows its kart onto the sand past the curb (review: two wheels on the grass dodged it)', () => {
    for (const side of [-1, 1]) {
      const h = setup({ n: 2, def: OVAL_OFFROAD });
      go(h);
      const a = kart(h, 0), b = kart(h, 1);
      const hw = h.track.sample(0.05, 0, 0).halfWidth;
      placeAt(h.track, a, 0.05, 0);
      placeAt(h.track, b, 0.05 + 30 / h.track.length, side * (hw + 3));
      expect(h.track.sample(b.t, side * (hw + 3), 0).surface).toBe('dirt');
      h.inputs[1].throttle = 1; // driving on the sand, as a kart dodging it would be
      tick(h, 2);
      give(h, 0, 'homingKite');
      press(h, 0);
      tick(h, seconds(6));
      expect(h.log.find((e) => e.type === 'hit'), `side ${side}`).toMatchObject({ racerId: 'k1', itemId: 'homingKite' });
    }
  });
});

describe('Beach Ball on a banked corner', () => {
  it('rides the ground where it is: resting on a kart on the high side of the bank, it hits (review: it passed under)', () => {
    const h = setup({ n: 2, def: MEADOW });
    go(h);
    const a = kart(h, 0), b = kart(h, 1);
    const hw = h.track.sample(0.99, 0, 0).halfWidth;
    placeAt(h.track, a, 0.93, 0);
    placeAt(h.track, b, 0.99, -(hw + 4)); // the high side: the bank lifts the left edge
    expect(b.position[1] - h.track.sample(0.99, 0, 0).groundY).toBeGreaterThan(1);
    tick(h, 2);
    give(h, 0, 'beachBall');
    press(h, 0);
    const p = h.items.state.projectiles[0];
    p.position = [b.position[0], b.position[1], b.position[2]];
    p.t = b.t; p.branch = b.branch;
    p.velocity = [0.01, 0, 0];
    p.graceRemaining = 0;
    tick(h, 1);
    expect(h.log.find((e) => e.type === 'hit')).toMatchObject({ racerId: 'k1', itemId: 'beachBall' });
  });
});

describe('shots through a shortcut', () => {
  it('a Beach Ball rolls out of either end onto the main road (bug hunt: it froze at the end for the rest of its life)', () => {
    for (const id of REAL_TRACKS) {
      for (const back of [false, true]) {
        const h = setup({ n: 1, def: trackDef(id), cfg: withBehaviour('beachBall', { bounces: 1000 }) });
        h.track.branches.list[1].forcedOpen = true; // Frostbite's lake opens on lap 3 only
        go(h);
        placeOn(h, 0, 1, back ? 0.1 : 0.9);
        give(h, 0, 'beachBall');
        press(h, 0, back);
        const p = h.items.state.projectiles[0];
        tick(h, seconds(1));
        const before: Vec3 = [...p.position];
        tick(h);
        const at = `${id} ${back ? 'back' : 'ahead'}`;
        expect(h.items.state.projectiles.includes(p), at).toBe(true);
        expect(p.branch, at).toBe(0);
        expect(distXZ(before, p.position), at).toBeGreaterThan(0.2);
      }
    }
  });

  it('a Kite or a Mouse fired in a shortcut hits a kart on the main road past its exit (bug hunt: it flew through it)', () => {
    for (const id of REAL_TRACKS) {
      for (const item of ['homingKite', 'windUpMouse']) {
        const h = setup({ n: 2, def: trackDef(id), cfg: withBehaviour('windUpMouse', { weave: 0 }) });
        h.track.branches.list[1].forcedOpen = true; // Frostbite's lake opens on lap 3 only
        go(h);
        placeOn(h, 0, 1, 0.9);
        placeAt(h.track, kart(h, 1), h.track.branches.list[1].exitT + 25 / h.track.length, 0);
        give(h, 0, item);
        press(h, 0);
        if (item === 'homingKite') expect(h.items.state.projectiles[0].target, id).toBe(1);
        tick(h, seconds(3));
        expect(h.log.find((e) => e.type === 'hit'), `${id} ${item}`).toMatchObject({ racerId: 'k1', itemId: item });
      }
    }
  });

  it('a Kite from the main road chases a kart on it, not a nearer one in the shortcut beside it', () => {
    for (const id of REAL_TRACKS) {
      const h = setup({ n: 3, def: trackDef(id) });
      go(h);
      const sc = h.track.branches.list[1], L = h.track.length;
      const t0 = sc.toMain(0.3);
      placeAt(h.track, kart(h, 0), t0, 0);
      placeOn(h, 1, 1, sc.toLocal(t0 + 15 / L));
      placeAt(h.track, kart(h, 2), t0 + 40 / L, 3); // off the centreline: only a Kite homing on it hits
      give(h, 0, 'homingKite');
      press(h, 0);
      expect(h.items.state.projectiles[0].target, id).toBe(2);
      tick(h, seconds(3));
      expect(h.log.find((e) => e.type === 'hit'), id).toMatchObject({ racerId: 'k2', itemId: 'homingKite' });
    }
  });
});

