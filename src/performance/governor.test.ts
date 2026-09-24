import { describe, expect, it } from 'vitest';
import { dprCap, Governor, GOVERNOR } from './governor.ts';

/**
 * Run `seconds` of frames at `fps` (or at the rate the governor's current quality allows), each
 * frame off by up to ±`jitterMs`; returns how many times the quality changed.
 */
function run(g: Governor, fps: number | ((g: Governor) => number), seconds: number, t0: number, jitterMs = 0): { changes: number; t: number } {
  let t = t0, changes = 0, n = 0;
  while (t < t0 + seconds) {
    const dt = 1000 / (typeof fps === 'number' ? fps : fps(g)) + (n++ % 2 ? jitterMs : -jitterMs);
    t += dt / 1000;
    if (g.sample(dt, t)) changes++;
  }
  return { changes, t };
}

/** A machine too slow for its screen: each frame 20 ms of fixed work, plus fill that scales with the pixels, plus 5 ms of shadows and post. */
const loaded = (g: Governor) => 1000 / (20 + 10 * (g.dpr / 2) ** 2 + (g.low ? 0 : 5));

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
        const r = run(g, loaded, 1.6, t);
        t = r.t;
        if (r.changes) seen.push(`${g.dpr.toFixed(1)}${g.low ? ' low' : ''}`);
      }
      return { seen, g };
    };
    // a sharp screen never drops below a pixel ratio of 1 (the floor is half its cap of 2); far
    // short of the goal (29 fps) it drops several steps at once, so three changes, not six
    const retina = steps(2);
    expect(retina.seen).toEqual(['1.4', '1.0', '1.0 low']);
    expect(retina.g.scale).toBe(GOVERNOR.min);
    // a pixel ratio 1 screen loses the effects first, then resolution down to half
    expect(steps(1).seen).toEqual(['1.0 low', '0.8 low', '0.7 low', '0.6 low', '0.5 low']);
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

  it('a display or browser capped at 30 or 50 fps gets its full quality back once stepping down buys nothing, and keeps it', () => {
    for (const [hz, base] of [[30, 2], [50, 2], [30, 1], [50, 1]]) {
      const g = new Governor(base);
      // the ladder runs once, finds the rate does not move, and puts everything back
      let t = run(g, hz, 20, 0, 0.3).t;
      expect([g.scale, g.low, g.ceiling], `${hz} Hz at ${base}x`).toEqual([1, false, hz === 30 ? expect.closeTo(30, 0) : expect.closeTo(50, 0)]);
      // and never runs again: not in this race, not in the next three
      for (let race = 0; race < 3; race++) {
        expect(run(g, hz, 150, t, 0.3).changes, `${hz} Hz race ${race}`).toBe(0);
        t += 150;
        g.newRace(t);
      }
      expect([g.scale, g.low]).toEqual([1, false]);
    }
  });

  it('under a known cap, real load still steps down; a lifted cap is judged against the full target again', () => {
    const g = new Governor(2);
    let t = run(g, 30, 20, 0, 0.3).t;
    expect(g.ceiling).toBeCloseTo(30, 0);
    // load below 90 % of the cap is a miss: steps down, and they help, so they stay
    t = run(g, (q) => loaded(q) * 0.6, 12, t).t;
    expect(g.scale).toBeLessThan(1);
    // the charger goes in: 60 fps lifts the cap
    run(g, 60, 3, t);
    expect(g.ceiling).toBe(Infinity);
  });

  it('a move to another screen rebases the cap: stepping down still stops at a pixel ratio of 1 before the effects go', () => {
    const g = new Governor(2);
    let t = 0;
    while (g.dpr > 1.6 + 1e-6) t = run(g, loaded, 1, t).t;
    expect(g.low).toBe(false);
    // dragged onto a 1x monitor: 0.8 of a cap of 1 would be a pixel ratio under 1 with the effects still on
    g.rebase(1);
    expect(g.dpr).toBe(1);
    const seen: string[] = [];
    for (let k = 0; k < 3; k++) {
      const r = run(g, loaded, 1.6, t);
      t = r.t;
      if (r.changes) seen.push(`${g.dpr.toFixed(1)}${g.low ? ' low' : ''}`);
    }
    expect(seen[0]).toBe('1.0 low');
    // and back onto the Retina screen: the same scale of the new cap, sharp again
    const h = new Governor(1);
    h.rebase(2);
    expect(h.dpr).toBe(2);
  });

  it('a stall of a few frames in a steady 60 (a shader, a texture, a GC) is not a reason to step down; a heavier scene is', () => {
    const g = new Governor(2);
    let t = run(g, 60, 3, 0).t;
    // four 200 ms stalls over 8 s: each window still averages under 55 fps with them counted
    for (let k = 0; k < 4; k++) {
      t += 0.2;
      expect(g.sample(200, t)).toBe(false);
      t = run(g, 60, 1.8, t).t;
    }
    expect([g.scale, g.low]).toEqual([1, false]);
    // a scene that really runs at 11 fps (and faster with less quality) is judged, not skipped as one long hitch
    run(g, (q) => loaded(q) * 0.4, 6, t);
    expect(g.scale).toBeLessThan(1);
  });

  it('one short window (a second of explosions) changes nothing; two in a row do', () => {
    const g = new Governor(2);
    let t = run(g, 60, 4, 0).t;
    t = run(g, 40, 1, t).t;
    t = run(g, 60, 4, t).t;
    expect([g.scale, g.low]).toEqual([1, false]);
    run(g, 40, 2.2, t);
    expect(g.scale).toBeLessThan(1);
  });

  it('a race-start step up that fails is never tried again, so quality does not flip-flop race after race', () => {
    // this machine holds 60 at a pixel ratio of 1.6 and misses at 1.8
    const fits = (q: Governor) => (q.dpr > 1.7 ? 50 : 60);
    const g = new Governor(2);
    let t = 0, midRace = 0;
    for (let race = 0; race < 8; race++) {
      g.newRace(t); // a step at the start is not a mid-race change
      const r = run(g, fits, 60, t);
      midRace += r.changes;
      t = r.t;
    }
    // steps down to 1.6 in the first race, probes 1.8 once, steps back, and never probes again
    expect(g.dpr).toBeCloseTo(1.6, 5);
    expect(midRace).toBe(3);
  });

  it('caps the pixel ratio: 2 on desktop, 1.5 on touch', () => {
    expect(dprCap(3, false)).toBe(2);
    expect(dprCap(3, true)).toBe(1.5);
    expect(dprCap(1, true)).toBe(1);
  });
});
