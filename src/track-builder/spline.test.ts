import { describe, expect, it } from 'vitest';
import { CatmullRomCurve3, Vector3 } from 'three';
import { ClosedSpline, OpenSpline, wrapU } from './spline.ts';
import { HARBOURISH, SQUARE, figureEight } from './__tests__/fixtures.ts';

const SHAPES = { square: SQUARE, harbourish: HARBOURISH, figureEight: figureEight() };

describe('ClosedSpline', () => {
  for (const [name, pts] of Object.entries(SHAPES)) {
    it(`matches three.js CatmullRomCurve3 centripetal on ${name} ± 1e-6`, () => {
      const ours = new ClosedSpline(pts);
      const ref = new CatmullRomCurve3(pts.map((p) => new Vector3(p.x, p.y, p.z)), true, 'centripetal');
      const v = new Vector3();
      for (let k = 0; k <= 5000; k++) {
        const u = k / 5000;
        const p = ours.pointAt(u);
        ref.getPoint(u, v);
        expect(Math.abs(p[0] - v.x)).toBeLessThan(1e-6);
        expect(Math.abs(p[1] - v.y)).toBeLessThan(1e-6);
        expect(Math.abs(p[2] - v.z)).toBeLessThan(1e-6);
      }
    });
  }

  it('is closed: u=0 and u=1 give the same point, and it is control point 0', () => {
    const s = new ClosedSpline(HARBOURISH);
    expect(s.pointAt(1)).toEqual(s.pointAt(0));
    expect(s.pointAt(0)).toEqual([HARBOURISH[0].x, HARBOURISH[0].y, HARBOURISH[0].z]);
  });

  it('passes through every control point at u = i / count', () => {
    const s = new ClosedSpline(HARBOURISH);
    HARBOURISH.forEach((cp, i) => {
      const p = s.pointAt(i / HARBOURISH.length);
      expect(p[0]).toBeCloseTo(cp.x, 9);
      expect(p[1]).toBeCloseTo(cp.y, 9);
      expect(p[2]).toBeCloseTo(cp.z, 9);
    });
  });

  it('segmentOf: segment i spans point i to i+1; u=1 wraps to segment 0', () => {
    const s = new ClosedSpline(SQUARE);
    expect(s.segmentOf(0)).toEqual({ index: 0, local: 0 });
    expect(s.segmentOf(1)).toEqual({ index: 0, local: 0 });
    expect(s.segmentOf(3.5 / 8)).toEqual({ index: 3, local: 0.5 });
    expect(s.segmentOf(-0.5 / 8).index).toBe(7);
    expect(s.pointIn(2, 0.25)).toEqual(s.pointAt(2.25 / 8));
  });

  it('walkArcLength is cumulative and converges to the three.js length', () => {
    const s = new ClosedSpline(HARBOURISH);
    const arc = s.walkArcLength(4096);
    expect(arc[0]).toBe(0);
    for (let k = 1; k < arc.length; k++) expect(arc[k]).toBeGreaterThan(arc[k - 1]);
    const ref = new CatmullRomCurve3(HARBOURISH.map((p) => new Vector3(p.x, p.y, p.z)), true, 'centripetal');
    ref.arcLengthDivisions = 4096;
    expect(arc[4096]).toBeCloseTo(ref.getLength(), 6);
  });

  it('rejects fewer than 4 points', () => {
    expect(() => new ClosedSpline(SQUARE.slice(0, 3))).toThrow();
  });

  it('wrapU', () => {
    expect(wrapU(1)).toBe(0);
    expect(wrapU(-0.25)).toBeCloseTo(0.75);
    expect(wrapU(2.5)).toBeCloseTo(0.5);
  });
});

describe('OpenSpline', () => {
  it('matches three.js CatmullRomCurve3 centripetal open on the harbour points ± 1e-6', () => {
    const pts = HARBOURISH.slice(0, 6);
    const ours = new OpenSpline(pts);
    const ref = new CatmullRomCurve3(pts.map((p) => new Vector3(p.x, p.y, p.z)), false, 'centripetal');
    const v = new Vector3();
    for (let k = 0; k <= 2000; k++) {
      const u = k / 2000;
      const p = ours.pointAt(u);
      ref.getPoint(u, v);
      expect(Math.abs(p[0] - v.x)).toBeLessThan(1e-6);
      expect(Math.abs(p[1] - v.y)).toBeLessThan(1e-6);
      expect(Math.abs(p[2] - v.z)).toBeLessThan(1e-6);
    }
    expect(ours.pointAt(0)).toEqual([pts[0].x, pts[0].y, pts[0].z]);
    expect(ours.pointAt(1)[0]).toBeCloseTo(pts[5].x, 9);
    expect(ours.pointAt(1.5)).toEqual(ours.pointAt(1));
  });
});
