import { describe, expect, it } from 'vitest';
import { ARCHETYPES, BASE, gripFor, makeConstants } from './constants.ts';

describe('constants', () => {
  it('reads schema defaults', () => {
    expect(BASE.topSpeed).toBe(25);
    expect(BASE.driftTiers).toEqual([250, 550, 850]);
    expect(BASE.surfaceSpeed.mud).toBe(0.6);
    expect(BASE.coinShield.slowedTo).toBe(0.75);
    expect(BASE.speedClasses['150']).toBe(1);
  });

  it('cc scaling only touches top speed', () => {
    const a = makeConstants('medium', 150);
    const b = makeConstants('medium', 50);
    expect(b.topSpeed).toBeCloseTo(a.topSpeed * 0.7);
    expect(b.accel).toBe(a.accel);
    expect(b.steerRate).toBe(a.steerRate);
    expect(b.mass).toBe(a.mass);
  });

  it('archetype multiplies speed, accel, handling, weight', () => {
    const h = makeConstants('heavy', 150);
    expect(h.topSpeed).toBeCloseTo(25 * 1.1);
    expect(h.accel).toBeCloseTo(12 * 0.88);
    expect(h.steerRate).toBeCloseTo(2.4 * 0.9);
    expect(h.mass).toBeCloseTo(1.18);
    expect(ARCHETYPES.medium.hook).toBe('none');
    expect(h.stats.hook).toBe('hardBump');
  });

  it('only ice cuts grip', () => {
    expect(gripFor(BASE, 'dirt')).toBe(gripFor(BASE, 'road'));
    expect(gripFor(BASE, 'mud')).toBe(gripFor(BASE, 'road'));
    expect(gripFor(BASE, 'ice')).toBeLessThan(gripFor(BASE, 'road'));
  });

  it('is frozen', () => {
    const c = makeConstants('light', 100);
    expect(Object.isFrozen(c)).toBe(true);
  });
});
