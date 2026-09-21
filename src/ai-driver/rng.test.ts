import { describe, expect, it } from 'vitest';
import { next, range, seedFor } from './rng.ts';

describe('rng', () => {
  it('same seed, same stream; state round-trips through JSON', () => {
    const a = { rng: seedFor(7, 3) }, b = { rng: seedFor(7, 3) };
    const sa = Array.from({ length: 5 }, () => next(a));
    const copy = JSON.parse(JSON.stringify(b));
    expect(Array.from({ length: 5 }, () => next(copy))).toEqual(sa);
    expect(seedFor(7, 3)).not.toBe(seedFor(7, 4));
    expect(seedFor(7, 3)).not.toBe(seedFor(8, 3));
  });

  it('is in range and roughly uniform', () => {
    const m = { rng: seedFor(1, 0) };
    let sum = 0;
    for (let i = 0; i < 10000; i++) { const v = range(m, 2, 4); expect(v).toBeGreaterThanOrEqual(2); expect(v).toBeLessThan(4); sum += v; }
    expect(sum / 10000).toBeCloseTo(3, 1);
  });
});
