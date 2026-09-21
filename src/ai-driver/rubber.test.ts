import { describe, expect, it } from 'vitest';
import { AI, PROFILES } from './constants.ts';
import { powerCapFor, rubberBand, skillFor } from './rubber.ts';

describe('rubber band', () => {
  it('flat inside the dead zone, bounded far out, monotonic', () => {
    expect(rubberBand(0)).toBe(1);
    expect(rubberBand(AI.rubber.deadZone)).toBe(1);
    expect(rubberBand(-AI.rubber.deadZone)).toBe(1);
    expect(rubberBand(10000)).toBeCloseTo(AI.rubber.max, 3);
    expect(rubberBand(-10000)).toBeCloseTo(AI.rubber.min, 3);
    let last = rubberBand(-10000);
    for (let g = -10000; g <= 10000; g += 50) { const v = rubberBand(g); expect(v).toBeGreaterThanOrEqual(last); last = v; }
  });

  it('skill moves first; power only drops below powerFrom and never above profile.power', () => {
    const p = PROFILES.normal;
    expect(skillFor(p, 1)).toBe(p.skill);
    expect(skillFor(p, 1.4)).toBeGreaterThan(p.skill);
    expect(skillFor(p, 0.6)).toBeLessThan(p.skill);
    expect(skillFor(PROFILES.hard, 1.4)).toBe(1);
    expect(powerCapFor(p, 1.4)).toBe(p.power);
    expect(powerCapFor(p, 1)).toBe(p.power);
    expect(powerCapFor(p, AI.rubber.powerFrom)).toBe(p.power);
    expect(powerCapFor(p, 0.6)).toBeCloseTo(p.power * 0.75, 6);
  });
});
