// The boost streaks keep to the screen's lower sides (28 Sept 2026; the fresh-eyes review: "boost streaks
// cross the whole sky and read as scratches or rain"; Mario Kart World draws its boost streaks low, at the
// road's height beside the kart, never over the sky).
import { describe, expect, it } from 'vitest';
import { LINES, lineAngle, SpeedLines } from './trails.ts';

describe('the boost speed lines (trails.ts)', () => {
  it('lie only on the lower sides: never over `top` above the level, never in the cone straight down', () => {
    const n = LINES.count;
    let right = 0, left = 0;
    for (let i = 0; i < n; i++) {
      for (const j of [0, 0.5, 0.999]) {
        const a = lineAngle(i, n, j), y = Math.sin(a), x = Math.cos(a);
        expect(y, `streak ${i}`).toBeLessThanOrEqual(Math.sin(LINES.top) + 1e-9);
        // straight down is (0, -1): the streak stays out of the `under` cone round it
        expect(Math.acos(Math.min(1, -y)), `streak ${i}`).toBeGreaterThanOrEqual(LINES.under - 1e-9);
        if (j === 0.5) { if (x > 0) right++; else left++; }
      }
    }
    expect(right).toBe(n / 2);
    expect(left).toBe(n / 2);
  });

  it('spreads each side evenly from the cone up to the level (no bunching)', () => {
    const n = LINES.count, ups: number[] = [];
    for (let i = 0; i < n; i += 2) ups.push(lineAngle(i, n, 0.5));
    const gaps = ups.slice(1).map((a, k) => a - ups[k]);
    for (const g of gaps) expect(g).toBeCloseTo(gaps[0], 9);
    expect(ups[0]).toBeGreaterThan(-(Math.PI / 2 - LINES.under));
    expect(ups[ups.length - 1]).toBeLessThan(LINES.top);
  });

  it('are one instanced mesh of LINES.count streaks, each with its angle from lineAngle', () => {
    const s = new SpeedLines();
    expect(s.mesh.count).toBe(LINES.count);
    const a = s.mesh.geometry.getAttribute('aLine');
    for (let i = 0; i < LINES.count; i++) expect(Math.sin(a.getX(i))).toBeLessThanOrEqual(Math.sin(LINES.top) + 1e-6);
    s.dispose();
  });
});
