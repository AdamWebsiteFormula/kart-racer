import { describe, expect, it } from 'vitest';
import { dprCap, Governor, GOVERNOR } from './governor.ts';

/** Run `seconds` of frames at `fps`; returns how many times the quality changed. */
function run(g: Governor, fps: number, seconds: number, t0: number): { changes: number; t: number } {
  let t = t0, changes = 0;
  const dt = 1000 / fps;
  while (t < t0 + seconds) {
    t += dt / 1000;
    if (g.sample(dt, t)) changes++;
  }
  return { changes, t };
}

describe('auto quality governor', () => {
  it('leaves a fast machine alone', () => {
    const g = new Governor(2);
    expect(run(g, 60, 30, 0).changes).toBe(0);
    expect(g.scale).toBe(1);
    expect(g.low).toBe(false);
  });

  it('ignores the warm-up and single hitches', () => {
    const g = new Governor(2);
    g.reset(0);
    expect(run(g, 20, GOVERNOR.warmup - 0.1, 0).changes).toBe(0);
    let t = 5;
    g.reset(t);
    t += GOVERNOR.warmup;
    for (let i = 0; i < 200; i++) { t += 1 / 60; g.sample(i === 100 ? 400 : 1000 / 60, t); }
    expect(g.scale).toBe(1);
  });

  it('gives up resolution to a pixel ratio of 1 first, then the effects, then resolution to the floor', () => {
    const steps = (base: number) => {
      const g = new Governor(base);
      const seen: string[] = [];
      let t = 0;
      for (let k = 0; k < 40; k++) {
        const r = run(g, 30, 1.6, t);
        t = r.t;
        if (r.changes) seen.push(`${g.dpr.toFixed(1)}${g.low ? ' low' : ''}`);
      }
      return { seen, g };
    };
    // a sharp screen never drops below a pixel ratio of 1 (the floor is half its cap of 2)
    const retina = steps(2);
    expect(retina.seen).toEqual(['1.8', '1.6', '1.4', '1.2', '1.0', '1.0 low']);
    expect(retina.g.scale).toBe(GOVERNOR.min);
    // a pixel ratio 1 screen loses the effects first, then resolution down to half
    expect(steps(1).seen).toEqual(['1.0 low', '0.9 low', '0.8 low', '0.7 low', '0.6 low', '0.5 low']);
  });

  it('never steps up mid-race; a clean race earns one step back at the next start', () => {
    const g = new Governor(2);
    let t = run(g, 30, 4, 0).t;
    t = run(g, 60, 3, t).t; // the last slow window settles
    const held = g.scale;
    expect(held).toBeLessThan(1);
    t = run(g, 60, 30, t).t;
    expect(g.scale).toBe(held); // fast again, but no step up mid-race
    expect(g.newRace(t)).toBe(false); // this race stepped down, so no probe
    t = run(g, 60, 30, t).t;
    expect(g.newRace(t)).toBe(true);
    expect(g.scale).toBeCloseTo(held + GOVERNOR.step, 5);
  });

  it('caps the pixel ratio: 2 on desktop, 1.5 on touch', () => {
    expect(dprCap(3, false)).toBe(2);
    expect(dprCap(3, true)).toBe(1.5);
    expect(dprCap(1, true)).toBe(1);
  });
});
