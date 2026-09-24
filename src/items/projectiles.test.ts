// SOP tests 5, 6, 12 (grace and immunity): Beach Ball bounces, Homing Kite, hit rules.
import { describe, expect, it } from 'vitest';
import { ITEMS_CONFIG, itemById } from './data.ts';
import { REAL_TRACKS, count, give, go, kart, placeAt, placeOn, press, seconds, setup, tick, trackDef, withBehaviour, type H, type RealTrack } from './__tests__/harness.ts';
import { distXZ } from './hits.ts';
import { spawnProjectile } from './projectiles.ts';
import type { GroundItem, Projectile } from './types.ts';
import type { Vec3 } from '../kart-controller/types.ts';
import { GO_TICK } from '../race-manager/countdown.ts';
import { OVAL } from '../race-manager/__tests__/fixtures.ts';
import { signedOffset } from '../track-builder/branches.ts';
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
      // locked on, but a threat (the AI's cue to horn or hop) only once it is about to arrive
      expect(h.items.threatened[1]).toBe(false);
      expect(h.items.threatDistance[1]).toBeGreaterThan(ITEMS_CONFIG.kiteWarnMetres);
      give(h, 0, 'homingKite');
      expect(press(h, 0).some((e) => e.type === 'itemRefused' && e.reason === 'inFlight')).toBe(true);
      let warned = false;
      for (let k = 0; k < seconds(6) && !h.log.some((e) => e.type === 'hit'); k++) {
        tick(h, 1);
        const p = h.items.state.projectiles.find((q) => q.itemId === 'homingKite');
        if (h.items.threatened[1] && !warned && p) {
          warned = true;
          expect(h.items.threatDistance[1]).toBeLessThanOrEqual(Math.max(ITEMS_CONFIG.kiteWarnMetres, p.speed * ITEMS_CONFIG.kiteWarnSeconds));
        }
      }
      expect(warned, `ahead ${ahead}`).toBe(true);
      tick(h, seconds(1));
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

describe('across the Final Lap Shift', () => {
  /** A one-lap race fires the shift at GO: put a shot of `item` on the main road at t0 just before it. */
  function shotBeforeShift(id: RealTrack, item: string, t0: number): { h: H; p: Projectile } {
    const h = setup({ n: 1, def: trackDef(id), laps: 1 });
    tick(h, GO_TICK - 3);
    const p = spawnProjectile(h.items.cfg, h.items.state, h.track, h.rm.state.karts, 150, 0, itemById(h.items.cfg, item)!, false, []);
    const smp = h.track.sample(t0, 0, 0), flat = Math.hypot(smp.tangent[0], smp.tangent[2]), v = Math.hypot(...p.velocity);
    p.t = t0; p.branch = 0; p.lateral = 0; p.target = -1;
    p.position = [smp.position[0], smp.groundY + h.items.cfg.projectileHeight, smp.position[2]];
    p.velocity = [(smp.tangent[0] / flat) * v, 0, (smp.tangent[2] / flat) * v];
    return { h, p };
  }

  /** Metres the shot moved on the tick the shift fired (NaN if it popped). */
  function shiftStep(h: H, p: Projectile): number {
    for (let k = 0; k < 10; k++) {
      const before: Vec3 = [...p.position];
      tick(h);
      if (h.race.some((e) => e.type === 'trackChanged')) return h.items.state.projectiles.includes(p) ? distXZ(before, p.position) : NaN;
    }
    throw new Error('no shift');
  }

  it('shots keep flying from where they are (bug hunt: on Canyon and Skyline they jumped up to 34 m along the road)', () => {
    const cases: [RealTrack, number][] = [['canyon', 0.2], ['canyon', 0.7], ['canyon', 0.85], ['skyline', 0.2], ['skyline', 0.85]];
    for (const [id, t0] of cases) {
      for (const item of ['homingKite', 'windUpMouse', 'beachBall']) {
        const { h, p } = shotBeforeShift(id, item, t0);
        const bounces = p.bouncesLeft;
        expect(shiftStep(h, p), `${id} ${t0} ${item}`).toBeLessThan(1);
        expect(p.bouncesLeft, `${id} ${t0} ${item}`).toBe(bounces);
      }
    }
  });

  it('shots and drops on the road the shift replaced go with it; drops on the rest stay', () => {
    for (const [id, gone] of [['canyon', 0.5], ['skyline', 0.6]] as [RealTrack, number][]) {
      const { h, p } = shotBeforeShift(id, 'homingKite', gone);
      const drop = (t: number): GroundItem => {
        const g: GroundItem = { id: 90 + h.items.state.groundItems.length, itemId: 'oilCan', owner: 0, ownerId: 'k0', t, branch: 0, position: h.track.sample(t, 0, 0).position, ttl: 20, graceRemaining: 0, radius: 1.2 };
        h.items.state.groundItems.push(g);
        return g;
      };
      drop(gone);
      const kept = drop(0.9);
      expect(shiftStep(h, p), id).toBeNaN();
      expect(h.items.state.groundItems, id).toEqual([kept]);
      expect(kept.t, id).toBeCloseTo(h.track.nearestTGlobal(kept.position), 6);
    }
  });

  it("a shift that rebuilds no road moves no shot (seam review: on Meadow's hairpin grass a Kite was sent 70 m along the road, past its kart)", () => {
    for (const item of ['homingKite', 'beachBall']) {
      for (const [t0, lat0] of [[0.94, -18], [0.92, -21]] as const) {
        const h = setup({ n: 3, def: trackDef('meadow'), laps: 2 });
        go(h);
        const L = h.track.length, at = `${item} at t ${t0}, lateral ${lat0}`;
        placeAt(h.track, kart(h, 0), 0.5, 0);
        placeAt(h.track, kart(h, 1), t0 + 12 / L, lat0 + 1); // its kart, on the grass ahead
        placeAt(h.track, kart(h, 2), 0.05, 0);
        for (const i of [0, 1, 2]) kart(h, i).speed = 0;
        const p = spawnProjectile(h.items.cfg, h.items.state, h.track, h.rm.state.karts, 150, 0, itemById(h.items.cfg, item)!, false, []);
        const smp = h.track.sample(t0, lat0, 0), c = h.track.sample(t0, 0, 0), flat = Math.hypot(c.tangent[0], c.tangent[2]), v = Math.hypot(...p.velocity);
        p.t = t0; p.branch = 0; p.lateral = lat0; p.target = item === 'homingKite' ? 1 : -1; p.graceRemaining = 0;
        p.position = [smp.position[0], smp.groundY + h.items.cfg.projectileHeight, smp.position[2]];
        p.velocity = [(c.tangent[0] / flat) * v, 0, (c.tangent[2] / flat) * v];
        // kart 2 starts the last lap on this tick: the storm rolls in
        kart(h, 2).lap = 2;
        const t = p.t;
        tick(h);
        expect(h.rm.state.finalLapShiftFired, at).toBe(true);
        expect(Math.abs(signedOffset(p.t, t)) * L, at).toBeLessThan(2);
        tick(h, seconds(1.5));
        expect(h.log.find((e) => e.type === 'hit'), at).toMatchObject({ racerId: 'k1', itemId: item });
      }
    }
  });
});

describe('a shortcut the Final Lap Shift closes', () => {
  const CLOSING: RealTrack[] = ['harbour', 'meadow', 'canyon', 'skyline'];

  /** Kart 0 in the shortcut at u, kart `last` starts the last lap: the shift closes the shortcut under kart 0. */
  function closeUnder(id: RealTrack, n: number, u: number): H {
    const h = setup({ n, def: trackDef(id), laps: 2 });
    go(h);
    placeOn(h, 0, 1, u);
    placeAt(h.track, kart(h, n - 1), 0.05, 0);
    tick(h);
    kart(h, n - 1).lap = 2;
    tick(h);
    expect(h.rm.state.finalLapShiftFired, id).toBe(true);
    expect(h.track.branches.list[1].open, id).toBe(false);
    return h;
  }

  it('a shot or drop let go by a kart still riding it out rides it out too (seam review: it popped on the tick it was let go, the charge spent)', () => {
    for (const id of CLOSING) {
      for (const item of ['homingKite', 'windUpMouse', 'beachBall', 'oilCan', 'decoyBalloon']) {
        const h = closeUnder(id, 2, 0.4);
        kart(h, 0).speed = 20;
        give(h, 0, item);
        const from = h.log.length;
        press(h, 0);
        tick(h, 2);
        const ev = h.log.slice(from), at = `${id} ${item}`;
        expect(count(ev, 'projectileSpawn') + count(ev, 'groundPlace'), at).toBe(1);
        expect(count(ev, 'projectilePop') + count(ev, 'groundPop'), at).toBe(0);
        expect(h.items.state.projectiles.length + h.items.state.groundItems.length, at).toBe(1);
      }
    }
  });

  it('a drop left on it goes once no kart is on it (no one can reach it)', () => {
    for (const id of ['harbour', 'meadow'] as const) {
      const h = closeUnder(id, 2, 0.4);
      expect(kart(h, 0).branch, id).toBe(1);
      give(h, 0, 'oilCan');
      press(h, 0);
      tick(h, seconds(1));
      expect(h.items.state.groundItems, id).toHaveLength(1);
      placeAt(h.track, kart(h, 0), 0.2, 0);
      tick(h);
      expect(h.items.state.groundItems, id).toHaveLength(0);
      expect(count(h.log, 'groundPop'), id).toBe(1);
    }
  });

  it('a Kite already flying along it flies on and hits the kart it chases (seam review: the shift popped it)', () => {
    for (const id of CLOSING) {
      const h = setup({ n: 3, def: trackDef(id), laps: 2 });
      go(h);
      placeOn(h, 0, 1, 0.3);
      placeOn(h, 1, 1, 0.7);
      kart(h, 1).speed = 0;
      placeAt(h.track, kart(h, 2), 0.05, 0);
      give(h, 0, 'homingKite');
      press(h, 0);
      expect(h.items.state.projectiles[0]?.target, id).toBe(1);
      kart(h, 2).lap = 2;
      tick(h);
      expect(h.rm.state.finalLapShiftFired, id).toBe(true);
      expect(h.items.state.projectiles, id).toHaveLength(1);
      tick(h, seconds(4));
      expect(h.log.find((e) => e.type === 'hit'), id).toMatchObject({ racerId: 'k1', itemId: 'homingKite' });
    }
  });

  it('Canyon Rush, Skyline Circuit: a kart still in the mine or on the rail is on the new road with everyone else: shots hit it, the Anchor hooks it (seam review: they passed through it)', () => {
    for (const id of ['canyon', 'skyline'] as const) {
      for (const item of ['beachBall', 'homingKite', 'grappleAnchor']) {
        const h = closeUnder(id, 3, 0.55);
        const [a, b] = [kart(h, 1), kart(h, 0)];
        const at = `${id} ${item}`;
        expect(b.branch, at).toBe(0);
        // a kart on the new main road 18 m behind it
        placeAt(h.track, a, b.t - 18 / h.track.length, 0);
        a.speed = 0; b.speed = 0;
        give(h, 1, item);
        const from = h.log.length;
        press(h, 1);
        tick(h, seconds(2));
        const ev = h.log.slice(from);
        if (item === 'grappleAnchor') expect(count(ev, 'tetherStart'), at).toBe(1);
        else expect(ev.find((e) => e.type === 'hit'), at).toMatchObject({ racerId: 'k0', itemId: item });
      }
    }
  });
});

