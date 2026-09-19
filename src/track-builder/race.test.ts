import { describe, expect, it } from 'vitest';
import { headingOf } from '../kart-controller/types.ts';
import { KART_RADIUS } from './constants.ts';
import { buildLut, wrap01 } from './lut.ts';
import { buildCheckpoints, buildSpawnGrid, distanceAlong, raceProgress } from './race.ts';
import { HARBOURISH } from './__tests__/fixtures.ts';

const lut = buildLut(HARBOURISH);

describe('checkpoints', () => {
  it('has checkpointCount entries, strictly increasing from the start line, wrap-aware', () => {
    const startT = 0.93;
    const cps = buildCheckpoints(lut, startT, 12);
    expect(cps).toHaveLength(12);
    expect(cps[0].t).toBeCloseTo(startT, 9);
    for (let i = 1; i < cps.length; i++) {
      const step = wrap01(cps[i].t - cps[i - 1].t);
      expect(step).toBeGreaterThan(0);
      expect(step).toBeCloseTo(1 / 12, 9);
    }
    for (const c of cps) {
      const s = lut.sample(c.t, 0);
      expect(c.position).toEqual(s.position);
      expect(c.halfWidth).toBe(s.halfWidth);
    }
  });
});

describe('spawn grid', () => {
  it('rows × columns slots, inside the road by ≥ kartRadius, behind the line, facing forward', () => {
    const grid = { t: 0.02, rows: 4, columns: 2, spacing: 3.5 };
    const slots = buildSpawnGrid(lut, grid.t, grid);
    expect(slots).toHaveLength(8);
    let prevT = grid.t;
    slots.forEach((s, i) => {
      expect(s.index).toBe(i);
      const c = lut.sample(s.t, 0);
      expect(Math.abs(s.lateral)).toBeLessThanOrEqual(c.halfWidth - KART_RADIUS);
      // behind the line: forward distance from slot to the line is small and positive
      const ahead = wrap01(grid.t - s.t) * lut.length;
      expect(ahead).toBeGreaterThan(0);
      expect(ahead).toBeLessThanOrEqual(grid.spacing * grid.rows + 1e-9);
      // rows walk backwards
      if (i % grid.columns === 0 && i > 0) expect(wrap01(prevT - s.t)).toBeCloseTo(grid.spacing / lut.length, 9);
      prevT = s.t;
      // heading along the tangent
      const h = headingOf(c.tangent);
      expect(Math.cos(s.heading - h)).toBeGreaterThan(0.99);
      expect(s.position[1]).toBeCloseTo(lut.sample(s.t, s.lateral).position[1], 9);
    });
    // no two slots share the same lateral in adjacent rows (half-column offset)
    expect(slots[0].lateral).not.toBe(slots[2].lateral);
  });
});

describe('distance helpers', () => {
  it('distanceAlong is forward and wrap-aware; raceProgress adds laps', () => {
    expect(distanceAlong(1000, 0.9, 0.1)).toBeCloseTo(200, 9);
    expect(distanceAlong(1000, 0.1, 0.9)).toBeCloseTo(800, 9);
    expect(raceProgress(1000, 0.02, 2, 0.52)).toBeCloseTo(2500, 9);
  });
});
