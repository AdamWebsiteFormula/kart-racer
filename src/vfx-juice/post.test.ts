import { describe, expect, it } from 'vitest';
import { DAY_GRADE, lightOf } from '../art-pipeline/index.ts';
import { easeGrade, msaaSamples } from './post.ts';

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

describe('MSAA by screen (performance 2026-09-24)', () => {
  it('a Retina screen draws no MSAA, a 1x screen keeps 4x, whatever the governor does to the ratio', () => {
    expect(msaaSamples(2)).toBe(0);
    expect(msaaSamples(1.5)).toBe(0); // the touch-screen cap
    expect(msaaSamples(1)).toBe(4);
    expect(msaaSamples(1.25)).toBe(4);
  });
});
