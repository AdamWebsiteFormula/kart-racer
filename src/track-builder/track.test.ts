import { describe, expect, it } from 'vitest';
import { T_SEARCH_WINDOW } from './constants.ts';
import { buildTrack } from './track.ts';
import { HARBOUR_LOOP, cloneDef } from './__tests__/fixtures.ts';

const same = (a: ArrayLike<number>, b: ArrayLike<number>) => a.length === b.length && Array.from(a).every((v, i) => v === b[i]);

describe('buildTrack', () => {
  it('determinism: build twice → byte-identical LUTs on every branch', () => {
    const a = buildTrack(HARBOUR_LOOP), b = buildTrack(HARBOUR_LOOP);
    expect(a.branches.list.length).toBe(b.branches.list.length);
    a.branches.list.forEach((ba, i) => {
      const bb = b.branches.list[i];
      for (const key of ['px', 'py', 'pz', 'tx', 'ty', 'tz', 'bank', 'hw', 'grip'] as const) {
        expect(same(ba.lut[key], bb.lut[key])).toBe(true);
      }
      expect(same(ba.lut.surface, bb.lut.surface)).toBe(true);
    });
    expect(JSON.stringify(a.features)).toBe(JSON.stringify(b.features));
    expect(JSON.stringify(a.spawnGrid)).toBe(JSON.stringify(b.spawnGrid));
  });

  it('Harbour Loop: lap about 50 s, 12 checkpoints, 8 spawn slots, 2 branches, lighthouse', () => {
    const t = buildTrack(HARBOUR_LOOP);
    expect(t.id).toBe('harbour-loop');
    expect(t.length / 20).toBeGreaterThan(45);
    expect(t.length / 20).toBeLessThan(60);
    expect(t.checkpoints).toHaveLength(12);
    expect(t.spawnGrid).toHaveLength(8);
    expect(t.branches.list).toHaveLength(3);
    expect(t.def.landmark).toBe('lighthouse');
    expect(t.voidY).toBe(-12);
  });

  it('implements TrackQuery: sample, nearestT, nearest agree on the main line', () => {
    const t = buildTrack(HARBOUR_LOOP);
    const p = t.sample(0.42, 2).position;
    expect(t.nearestT(p, 0.41, T_SEARCH_WINDOW)).toBeCloseTo(0.42, 3);
    expect(t.nearest(p, { t: 0.41, branch: 0 }, T_SEARCH_WINDOW)).toEqual({ t: expect.closeTo(0.42, 3), branch: 0 });
    expect(t.sample(0.42, 2, 0)).toEqual(t.sample(0.42, 2));
  });

  it('refuses an invalid definition unless validation is off', () => {
    const d = cloneDef(HARBOUR_LOOP);
    d.voidY = 100;
    expect(() => buildTrack(d)).toThrow(/voidY/);
    expect(() => buildTrack(d, { validate: false })).not.toThrow();
  });
});
