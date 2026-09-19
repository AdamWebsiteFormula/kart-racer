import { describe, expect, it } from 'vitest';
import { headingOf, rightOf, type Vec3 } from '../kart-controller/types.ts';
import { BUILDER, T_SEARCH_WINDOW } from './constants.ts';
import { buildLut, wrap01 } from './lut.ts';
import { BANKED, HARBOURISH, SQUARE, figureEight } from './__tests__/fixtures.ts';

/** Deterministic noise in [-1, 1). */
function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);

describe('Lut', () => {
  it('uses the schema sample counts', () => {
    const lut = buildLut(SQUARE);
    expect(lut.n).toBe(BUILDER.lutSamples);
    expect(lut.n).toBe(2048);
  });

  for (const [name, pts] of [['harbourish', HARBOURISH], ['figure-eight with overpass', figureEight()]] as const) {
    it(`round trip on ${name}: nearestT(sample(t), t ± 0.01, 0.02) == t ± 1e-3 for 1000 samples`, () => {
      const lut = buildLut(pts);
      for (let k = 0; k < 1000; k++) {
        const t = k / 1000;
        const p = lut.sample(t, 0).position;
        const hint = t + 0.01 * noise(k);
        const got = lut.nearestT(p, hint, T_SEARCH_WINDOW);
        const err = Math.abs(wrap01(got - t + 0.5) - 0.5);
        expect(err).toBeLessThan(1e-3);
      }
    });

    it(`uniform arc length on ${name}: neighbours are length / n apart ± 2%`, () => {
      const lut = buildLut(pts);
      const want = lut.length / lut.n;
      for (let i = 0; i < lut.n; i++) {
        const j = (i + 1) % lut.n;
        const d = Math.hypot(lut.px[j] - lut.px[i], lut.py[j] - lut.py[i], lut.pz[j] - lut.pz[i]);
        expect(Math.abs(d - want) / want).toBeLessThan(0.02);
      }
    });
  }

  it('seam: sample(1) equals sample(0); nearestT crosses the seam both ways', () => {
    const lut = buildLut(HARBOURISH);
    expect(lut.sample(1, 2)).toEqual(lut.sample(0, 2));
    // just past the seam, hinted from just before it
    const pAfter = lut.sample(0.004, 0).position;
    expect(lut.nearestT(pAfter, 0.995, T_SEARCH_WINDOW)).toBeCloseTo(0.004, 3);
    // just before the seam, hinted from just after it
    const pBefore = lut.sample(0.996, 0).position;
    expect(lut.nearestT(pBefore, 0.003, T_SEARCH_WINDOW)).toBeCloseTo(0.996, 3);
  });

  it('never searches outside the window', () => {
    const lut = buildLut(HARBOURISH);
    const p = lut.sample(0.5, 0).position;
    const got = lut.nearestT(p, 0.1, T_SEARCH_WINDOW);
    // edge sample may project one segment further; never beyond that
    expect(Math.abs(got - 0.1)).toBeLessThanOrEqual(T_SEARCH_WINDOW + 1 / lut.n + 1e-9);
  });

  it('lateral: +3 m moves 3 m perpendicular to the tangent, on the kart-controller right', () => {
    const lut = buildLut(SQUARE);
    for (let k = 0; k < 50; k++) {
      const t = k / 50;
      const c = lut.sample(t, 0);
      const r = lut.sample(t, 3);
      const d = sub(r.position, c.position);
      expect(len(d)).toBeCloseTo(3, 6);
      expect(Math.abs(dot(d, c.tangent))).toBeLessThan(1e-6);
      const right = rightOf(headingOf(c.tangent));
      expect(dot(d, right)).toBeCloseTo(3, 6);
      expect(c.normal[1]).toBeCloseTo(1, 6);
      expect(c.groundY).toBe(c.position[1]);
    }
  });

  it('bank: 10° raises the left edge by 5·tan10° at lateral −5 and tilts the normal to the right', () => {
    const lut = buildLut(BANKED);
    const rise = 5 * Math.tan((10 * Math.PI) / 180);
    for (let k = 0; k < 50; k++) {
      const t = k / 50;
      const c = lut.sample(t, 0);
      const left = lut.sample(t, -5);
      const right = lut.sample(t, 5);
      expect(left.position[1] - c.position[1]).toBeCloseTo(rise, 6);
      expect(right.position[1] - c.position[1]).toBeCloseTo(-rise, 6);
      const rv = rightOf(headingOf(c.tangent));
      expect(dot(c.normal, rv)).toBeGreaterThan(0.1); // tilts toward the low side
      expect(Math.abs(dot(c.normal, c.tangent))).toBeLessThan(1e-6);
      expect(len(c.normal)).toBeCloseTo(1, 9);
    }
  });

  it('surface: point i holds to point i+1; halfWidth blends with no step', () => {
    const lut = buildLut(HARBOURISH);
    const cp = HARBOURISH.length;
    // every sample's surface is its segment's start point surface
    for (let i = 0; i < lut.n; i++) {
      const seg = lut.seg[i];
      expect(lut.sample(i / lut.n, 0).surface).toBe(HARBOURISH[seg].surface ?? 'road');
      // halfWidth is between the two endpoints of the segment
      const a = HARBOURISH[seg].halfWidth, b = HARBOURISH[(seg + 1) % cp].halfWidth;
      expect(lut.hw[i]).toBeGreaterThanOrEqual(Math.min(a, b) - 1e-9);
      expect(lut.hw[i]).toBeLessThanOrEqual(Math.max(a, b) + 1e-9);
    }
    // segment indices are non-decreasing around the loop and cover every control point
    let jumps = 0;
    for (let i = 0; i < lut.n; i++) {
      const d = (lut.seg[(i + 1) % lut.n] - lut.seg[i] + cp) % cp;
      expect(d === 0 || d === 1).toBe(true);
      if (d === 1) jumps++;
    }
    expect(jumps).toBe(cp);
    // no visible step: adjacent halfWidth change ≤ 2 × |Δ| / samples in that segment (smoothstep peak is 1.5×)
    for (let i = 0; i < lut.n; i++) {
      const j = (i + 1) % lut.n;
      if (lut.seg[i] !== lut.seg[j]) continue;
      const seg = lut.seg[i];
      const delta = Math.abs(HARBOURISH[(seg + 1) % cp].halfWidth - HARBOURISH[seg].halfWidth);
      let count = 0;
      for (let k = 0; k < lut.n; k++) if (lut.seg[k] === seg) count++;
      expect(Math.abs(lut.hw[j] - lut.hw[i])).toBeLessThanOrEqual((2 * delta) / count + 1e-9);
    }
  });

  it('nearestTGlobal picks the right level on an overpass', () => {
    const lut = buildLut(figureEight());
    // the two crossings: th=π/2 → t≈0.25 at y=0, th=3π/2 → t≈0.75 on the bridge
    const low = lut.nearestTGlobal([0, 0, 0]);
    const high = lut.nearestTGlobal([0, 8, 0]);
    expect(Math.abs(low - 0.25)).toBeLessThan(0.02);
    expect(Math.abs(high - 0.75)).toBeLessThan(0.02);
    // local XZ search stays on its own level
    expect(Math.abs(lut.nearestT([0, 0, 0], 0.74, T_SEARCH_WINDOW) - 0.75)).toBeLessThan(0.02);
    expect(Math.abs(lut.nearestT([0, 8, 0], 0.26, T_SEARCH_WINDOW) - 0.25)).toBeLessThan(0.02);
  });

  it('nearestTGlobal round-trips 200 samples on harbourish ± 1e-3', () => {
    const lut = buildLut(HARBOURISH);
    for (let k = 0; k < 200; k++) {
      const t = k / 200;
      const got = lut.nearestTGlobal(lut.sample(t, 0).position);
      expect(Math.abs(wrap01(got - t + 0.5) - 0.5)).toBeLessThan(1e-3);
    }
  });

  it('is deterministic: build twice gives identical arrays', () => {
    const a = buildLut(HARBOURISH), b = buildLut(HARBOURISH);
    expect(a.length).toBe(b.length);
    expect(Array.from(a.px)).toEqual(Array.from(b.px));
    expect(Array.from(a.py)).toEqual(Array.from(b.py));
    expect(Array.from(a.pz)).toEqual(Array.from(b.pz));
    expect(Array.from(a.hw)).toEqual(Array.from(b.hw));
  });

  it('wrap01', () => {
    expect(wrap01(1)).toBe(0);
    expect(wrap01(-0.1)).toBeCloseTo(0.9);
    expect(wrap01(1.3)).toBeCloseTo(0.3);
  });
});
