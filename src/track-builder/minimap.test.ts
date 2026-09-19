import { describe, expect, it } from 'vitest';
import { BUILDER } from './constants.ts';
import { buildTrack } from './track.ts';
import { HARBOUR_LOOP } from './__tests__/fixtures.ts';

describe('minimap', () => {
  const track = buildTrack(HARBOUR_LOOP);
  const mm = track.minimap;

  it('outline is inside the unit square with the padding, one per branch', () => {
    expect(mm.outlines).toHaveLength(track.branches.list.length);
    const pad = BUILDER.minimapPadding;
    for (const o of mm.outlines) {
      for (const arr of [o.left, o.right]) {
        for (let i = 0; i < arr.length; i++) {
          expect(arr[i]).toBeGreaterThanOrEqual(pad - 1e-6);
          expect(arr[i]).toBeLessThanOrEqual(1 - pad + 1e-6);
        }
      }
    }
    expect(mm.outlines[0].left.length).toBe(BUILDER.minimapSamples * 2);
    // the main line touches the padding box on its long axis
    const all = mm.outlines.flatMap((o) => [...o.left, ...o.right]);
    const xs = all.filter((_, i) => i % 2 === 0), zs = all.filter((_, i) => i % 2 === 1);
    const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs));
    expect(span).toBeCloseTo(1 - 2 * pad, 6);
  });

  it('toMinimap(sample(t,0).position) lies within 1/200 of the outline', () => {
    const main = mm.outlines[0];
    for (let k = 0; k < 100; k++) {
      const t = k / 100;
      const [u, v] = mm.toMinimap(track.sample(t, 0).position);
      // nearest outline sample on the left or right edge
      let best = Infinity;
      for (const arr of [main.left, main.right]) {
        for (let i = 0; i < arr.length; i += 2) best = Math.min(best, Math.hypot(arr[i] - u, arr[i + 1] - v));
      }
      // centre sits halfWidth from each edge; that is under 1/200 on this scale plus one sample of slack
      const hwUnits = track.sample(t, 0).halfWidth * mm.scale;
      expect(best).toBeLessThan(hwUnits + 1 / BUILDER.minimapSamples);
    }
  });
});
