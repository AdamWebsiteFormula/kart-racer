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

  it('a class floor: rbMin holds a leader back less, never below rubber.min; the chaser side is the same for every class', () => {
    expect(rubberBand(-10000, 0.85)).toBeCloseTo(0.85, 3);
    expect(rubberBand(-10000, 0.2)).toBeCloseTo(AI.rubber.min, 3);
    expect(rubberBand(-AI.rubber.deadZone, 0.85)).toBe(1);
    expect(rubberBand(10000, 0.85)).toBeCloseTo(AI.rubber.max, 3);
    expect(rubberBand(-10000)).toBeCloseTo(rubberBand(-10000, AI.rubber.min), 12);
  });

  it('by class (26 Sept 2026): a 150cc leader far ahead of the player keeps its full power; 50cc and 100cc leaders still wait', () => {
    for (const p of [PROFILES.easy, PROFILES.normal, PROFILES.hard]) expect(p.rbMin).toBeGreaterThanOrEqual(AI.rubber.min);
    const far = -10000;
    expect(powerCapFor(PROFILES.hard, rubberBand(far, PROFILES.hard.rbMin))).toBe(PROFILES.hard.power);
    expect(skillFor(PROFILES.hard, rubberBand(far, PROFILES.hard.rbMin))).toBeLessThan(PROFILES.hard.skill);
    expect(powerCapFor(PROFILES.normal, rubberBand(far, PROFILES.normal.rbMin))).toBeLessThan(PROFILES.normal.power * 0.8);
    expect(powerCapFor(PROFILES.easy, rubberBand(far, PROFILES.easy.rbMin))).toBeLessThan(PROFILES.easy.power * 0.75);
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
    expect(powerCapFor(p, 0.6)).toBeCloseTo(p.power * (0.6 / AI.rubber.powerFrom), 6);
  });
});
