import { describe, expect, it } from 'vitest';
import type { RaceEvent } from '../race-manager/types.ts';
import { CameraKick, JUICE, TimeScale, Trauma, directFx, driftRoll, sparkColour } from './juice.ts';

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
  it('boost widens the FOV in 0.12 s and eases back over 0.6 s; a hit narrows it briefly', () => {
    const k = new CameraKick();
    k.boost(10);
    expect(k.fov(10)).toBe(0);
    expect(k.fov(10 + JUICE.fovBoostIn)).toBeCloseTo(JUICE.fovBoost);
    expect(k.fov(10 + JUICE.fovBoostIn + 0.3)).toBeCloseTo(JUICE.fovBoost / 2, 0);
    expect(k.fov(10 + JUICE.fovBoostIn + JUICE.fovBoostOut + 0.01)).toBe(0);
    expect(k.fov(10 + JUICE.fovBoostIn, true)).toBeCloseTo(JUICE.fovBoost / 2);
    k.hit(20);
    expect(k.fov(20)).toBeCloseTo(JUICE.fovHit);
    expect(k.fov(20 + JUICE.fovHitSeconds)).toBe(0);
  });
  it('drift roll leans toward the drift side and never under reduced motion', () => {
    expect(driftRoll(true, 1)).toBeCloseTo(-JUICE.driftRoll);
    expect(driftRoll(false, 1)).toBe(0);
    expect(driftRoll(true, 1, true)).toBe(0);
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
    expect(fx.kickBoost).toBe(true);
    expect(fx.hitStop).toBe(false); // someone else was hit
    expect(fx.bursts.map((b) => b.kind)).toEqual(['hitStars', 'balloon', 'coin', 'confetti']);
    expect(fx.slowMo).toBe(true);
    expect(fx.trauma).toBeCloseTo(JUICE.traumaBoost);
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
  it('spark colours: blue, orange, then a cycling rainbow', () => {
    expect(sparkColour(1, 0)[2]).toBeGreaterThan(1);
    expect(sparkColour(2, 0)[0]).toBeGreaterThan(1);
    expect(sparkColour(3, 0)).not.toEqual(sparkColour(3, 0.1));
    const out: [number, number, number] = [0, 0, 0];
    expect(sparkColour(2, 0, out)).toBe(out); // writes into the caller's array: no garbage per spark
  });
});
