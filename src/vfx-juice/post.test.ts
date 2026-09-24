import { describe, expect, it } from 'vitest';
import { DAY_GRADE, lightOf } from '../art-pipeline/index.ts';
import { easeGrade } from './post.ts';

describe('colour lift per sky (detail review 2026-09-24: the canyon dusk clipped red)', () => {
  it('eases from the day lift to the dusk one over a couple of seconds, like the lights', () => {
    const to = lightOf('canyon-dusk').grade!;
    let g = DAY_GRADE;
    for (let i = 0; i < 60; i++) g = easeGrade(g, to, 1 / 60); // one second
    expect(g).toBeLessThan(DAY_GRADE);
    expect(g).toBeGreaterThan(to);
    for (let i = 0; i < 240; i++) g = easeGrade(g, to, 1 / 60);
    expect(g).toBeCloseTo(to, 3);
    expect(easeGrade(0.1, 0.1, 1)).toBe(0.1);
  });
});
