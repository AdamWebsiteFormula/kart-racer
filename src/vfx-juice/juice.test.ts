import { describe, expect, it } from 'vitest';
import type { RaceEvent } from '../race-manager/types.ts';
import { CameraKick, DriftRoll, JUICE, TimeScale, Trauma, boostHold, directFx, driftRoll, punchFor, type PunchKind } from './juice.ts';

describe('trauma', () => {
  it('clamps at 1, decays to 0, and shake = trauma² with rotation under 0.6°', () => {
    const t = new Trauma();
    t.add(0.8); t.add(0.8);
    expect(t.value).toBe(1);
    const o = { x: 0, y: 0, z: 0, roll: 0 };
    let maxRoll = 0;
    for (let i = 0; i < 400; i++) { t.shake(i / 60, o); maxRoll = Math.max(maxRoll, Math.abs(o.roll)); }
    expect(maxRoll).toBeLessThanOrEqual(JUICE.shakeMaxRot);
    expect(maxRoll).toBeGreaterThan(0);
    for (let i = 0; i < 60; i++) t.update(1 / 60);
    expect(t.value).toBe(0);
    t.shake(1.234, o);
    expect([o.x, o.y, o.z, o.roll].map((v) => v + 0)).toEqual([0, 0, 0, 0]); // −0 counts as 0
  });
  it('reduced motion means no shake at all', () => {
    const t = new Trauma(); t.add(1);
    const o = t.shake(0.37, { x: 1, y: 1, z: 1, roll: 1 }, false);
    expect([o.x, o.y, o.z, o.roll].map((v) => v + 0)).toEqual([0, 0, 0, 0]); // −0 counts as 0
  });
});

describe('camera kick', () => {
  it('a boost punches the FOV wider in 0.1 s and eases back over 0.65 s, by its kind; a hit narrows it briefly', () => {
    const k = new CameraKick();
    k.boost(10, 'item');
    const item = JUICE.punch.item;
    expect(k.fov(10)).toBe(0);
    expect(k.fov(10 + JUICE.fovBoostIn)).toBeCloseTo(item.fov);
    expect(k.back(10 + JUICE.fovBoostIn)).toBeCloseTo(item.back);
    expect(k.fov(10 + JUICE.fovBoostIn + JUICE.fovBoostOut / 2)).toBeCloseTo(item.fov / 2, 5);
    expect(k.fov(10 + JUICE.fovBoostIn + JUICE.fovBoostOut + 0.01)).toBe(0);
    expect(k.back(10 + JUICE.fovBoostIn + JUICE.fovBoostOut + 0.01)).toBe(0);
    k.hit(20);
    expect(k.fov(20)).toBeCloseTo(JUICE.fovHit);
    expect(k.fov(20 + JUICE.fovHitSeconds)).toBe(0);
  });
  it('the punch scales with the boost: blue < orange < purple mini-turbo, and a pad or an item beats a trick or a slipstream', () => {
    const peak = (kind: PunchKind) => { const k = new CameraKick(); k.boost(0, kind); return { fov: k.fov(JUICE.fovBoostIn), back: k.back(JUICE.fovBoostIn), level: k.level(JUICE.fovBoostIn) }; };
    const order: PunchKind[] = ['slipstream', 'mini', 'trick', 'super', 'pad', 'item', 'ultra'];
    for (let i = 1; i < order.length; i++) {
      expect(peak(order[i]).fov, order[i]).toBeGreaterThanOrEqual(peak(order[i - 1]).fov);
      expect(peak(order[i]).back, order[i]).toBeGreaterThanOrEqual(peak(order[i - 1]).back);
    }
    expect(peak('mini').fov).toBeLessThan(peak('super').fov);
    expect(peak('super').fov).toBeLessThan(peak('ultra').fov);
    expect(peak('ultra').level).toBe(1); // the strongest there is
    expect(peak('mini').level).toBeGreaterThan(0.3);
    // a clear punch: at least 4 degrees and 25 cm for the weakest mini-turbo
    expect(peak('mini').fov).toBeGreaterThanOrEqual(4);
    expect(peak('mini').back).toBeGreaterThanOrEqual(0.25);
    // and a short, low shake with it: under 5 cm of lens travel
    for (const kind of order) expect(JUICE.punch[kind].trauma ** 2 * JUICE.shakeMaxMove, kind).toBeLessThan(0.05);
  });
  it('reduced motion keeps a small share of every widening and pull-back', () => {
    const k = new CameraKick();
    k.boost(0, 'ultra');
    expect(k.fov(JUICE.fovBoostIn, true)).toBeCloseTo(JUICE.punch.ultra.fov * JUICE.reducedKick);
    expect(k.back(JUICE.fovBoostIn, true)).toBeCloseTo(JUICE.punch.ultra.back * JUICE.reducedKick);
    k.hit(5);
    expect(k.fov(5, true)).toBeCloseTo(JUICE.fovHit * JUICE.reducedKick);
  });
  it('a drift boost is told by its length: 0.8 s blue, 1.5 s orange, 2.4 s purple', () => {
    expect([0.8, 1.5, 2.4].map((s) => punchFor('drift', s))).toEqual(['mini', 'super', 'ultra']);
    expect(punchFor('pad', 1)).toBe('pad');
    expect(punchFor('trick', 0.7)).toBe('trick');
    expect(punchFor('start', 1)).toBe('start');
    expect(punchFor('none', 1)).toBeNull();
  });
  it('a running boost holds by its strength and fades out over its last moments', () => {
    expect(boostHold(0, 1.4)).toBe(0);
    expect(boostHold(1, 1.4)).toBeCloseTo(1); // a pad or an item
    expect(boostHold(1, 1.3)).toBeCloseTo(0.75); // a mini-turbo
    expect(boostHold(1, 1.12)).toBeCloseTo(0.3); // a slipstream
    expect(boostHold(JUICE.holdFade / 2, 1.4)).toBeCloseTo(0.5);
    expect(boostHold(0.01, 1.4)).toBeLessThan(0.01);
  });
  it('drift roll leans toward the drift side, eased in and out (never a snap), and never under reduced motion', () => {
    expect(driftRoll(true, 1)).toBeCloseTo(-JUICE.driftRoll);
    expect(driftRoll(false, 1)).toBe(0);
    expect(driftRoll(true, 1, true)).toBe(0);
    const r = new DriftRoll();
    let maxStep = 0, last = 0;
    for (let i = 0; i < 60; i++) { r.update(1 / 60, true, 1, 20, false); maxStep = Math.max(maxStep, Math.abs(r.value - last)); last = r.value; }
    expect(r.value).toBeCloseTo(-JUICE.driftRoll, 3); // in a second it is all the way over
    expect(maxStep).toBeLessThan(JUICE.driftRoll * 0.1); // never more than a tenth of it in a frame
    for (let i = 0; i < 12; i++) r.update(1 / 60, false, 0, 20, false);
    expect(Math.abs(r.value)).toBeGreaterThan(0.2 * JUICE.driftRoll); // the drift let go: it eases back
    for (let i = 0; i < 120; i++) r.update(1 / 60, false, 0, 20, false);
    expect(Math.abs(r.value)).toBeLessThan(1e-4);
    const calm = new DriftRoll();
    for (let i = 0; i < 60; i++) calm.update(1 / 60, true, 1, 20, true);
    expect(calm.value).toBe(0);
  });
});

describe('time scale', () => {
  it('hit-stop freezes for 75 ms, finish slow-mo runs at 0.3 for a second, reduced motion skips both', () => {
    const ts = new TimeScale();
    ts.hitStop(5);
    expect(ts.scale(5.05)).toBe(0);
    expect(ts.scale(5.08)).toBe(1);
    ts.slowMo(6);
    expect(ts.scale(6.5)).toBe(JUICE.slowMoScale);
    expect(ts.scale(7.01)).toBe(1);
    ts.hitStop(8);
    expect(ts.scale(8.01, true)).toBe(1);
    ts.reset(); // a new race never inherits a freeze
    expect(ts.scale(8.01)).toBe(1);
  });
});

describe('fx director', () => {
  const k = (racerId: string, event: object) => ({ type: 'kart', racerId, event }) as RaceEvent;
  it('maps events to effects; only the player shakes the camera and stops time', () => {
    const fx = directFx([
      k('p', { type: 'driftTierUp', tier: 2 }), k('p', { type: 'boostStart', source: 'drift', multiplier: 1.3, seconds: 1.5 }),
      k('a', { type: 'hit', kind: 'item', spun: true, coinsLost: 0 }),
      { type: 'pickup', racerId: 'a', index: 0 }, { type: 'coin', racerId: 'p', coins: 2 },
      { type: 'finish', racerId: 'p', rank: 1, tick: 9, dnf: false },
    ], [], 'p');
    expect(fx.sparks).toEqual([{ racerId: 'p', tier: 2 }]);
    expect(fx.boosts).toEqual([{ racerId: 'p', source: 'drift' }]);
    expect(fx.kickBoost).toBe('super'); // a 1.5 s drift boost: the orange mini-turbo
    expect(fx.hitStop).toBe(false); // someone else was hit
    expect(fx.bursts.map((b) => b.kind)).toEqual(['hitStars', 'balloon', 'coin', 'confetti']);
    expect(fx.slowMo).toBe(true);
    expect(fx.trauma).toBeCloseTo(JUICE.punch.super.trauma);
  });
  it('a hit on the player shakes, kicks and stops time; trauma never exceeds 1', () => {
    const fx = directFx([], [
      { type: 'hit', racerId: 'p', byRacerId: 'x', itemId: 'beachBall', spun: true, coinsLost: 0 },
      { type: 'hit', racerId: 'p', byRacerId: 'x', itemId: 'beachBall', spun: true, coinsLost: 0 },
      { type: 'hit', racerId: 'p', byRacerId: 'x', itemId: 'beachBall', spun: true, coinsLost: 0 },
    ], 'p');
    expect([fx.hitStop, fx.kickHit]).toEqual([true, true]);
    expect(fx.trauma).toBe(1);
  });
  it('a bumper car\'s shove and a rockfall jolt the player like a wall; a spin hazard jolts through its kart hit', () => {
    const hz = (racerId: string, hit: 'spin' | 'slow' | 'bump'): RaceEvent => ({ type: 'hazardHit', racerId, hazardId: 'h', hit });
    for (const hit of ['bump', 'slow'] as const) {
      const fx = directFx([hz('p', hit)], [], 'p');
      expect(fx.trauma, hit).toBeCloseTo(JUICE.traumaWall);
      expect(fx.bursts, hit).toEqual([{ kind: 'wall', racerId: 'p' }]);
    }
    const other = directFx([hz('a', 'bump')], [], 'p');
    expect([other.trauma, other.bursts.length]).toEqual([0, 0]); // someone else's shove: no shake
    const spin = directFx([hz('p', 'spin')], [], 'p');
    expect([spin.trauma, spin.bursts.length]).toEqual([0, 0]); // applyHit's kart 'hit' event does it
  });
  it("the player's item boosts punch too (their kart events stay inside the items step): a Fizz Pop, a Grapple's slingshot", () => {
    const fizz = directFx([], [{ type: 'itemUsed', racerId: 'p', itemId: 'fizzPop', chargesLeft: 0 }], 'p');
    expect(fizz.kickBoost).toBe('item');
    expect(fizz.trauma).toBeCloseTo(JUICE.punch.item.trauma);
    expect(fizz.bursts.map((b) => b.kind)).toEqual(['fizz']);
    const sling = directFx([], [{ type: 'tetherEnd', racerId: 'p', targetId: 'a', slingshot: true }], 'p');
    expect(sling.kickBoost).toBe('item');
    expect(directFx([], [{ type: 'tetherEnd', racerId: 'p', targetId: 'a', slingshot: false }], 'p').kickBoost).toBeNull();
    // a rival's: no punch for you
    expect(directFx([], [{ type: 'itemUsed', racerId: 'a', itemId: 'fizzPop', chargesLeft: 0 }], 'p').kickBoost).toBeNull();
    // the same boost reported twice in a tick punches and shakes once
    const both = directFx([{ type: 'kart', racerId: 'p', event: { type: 'boostStart', source: 'item', multiplier: 1.4, seconds: 1.5 } } as RaceEvent],
      [{ type: 'itemUsed', racerId: 'p', itemId: 'fizzPop', chargesLeft: 0 }], 'p');
    expect(both.trauma).toBeCloseTo(JUICE.punch.item.trauma);
  });
});

describe('pickup pops know whose they are', () => {
  it('marks the player’s own balloon and coin pops, not a rival’s', () => {
    const fx = directFx([
      { type: 'pickup', racerId: 'p', index: 0 }, { type: 'pickup', racerId: 'a', index: 1 },
      { type: 'coin', racerId: 'p', coins: 1 }, { type: 'coin', racerId: 'a', coins: 1 },
    ], [], 'p');
    expect(fx.bursts.map((b) => `${b.kind}:${b.mine}`)).toEqual(['balloon:true', 'balloon:false', 'coin:true', 'coin:false']);
  });
});
