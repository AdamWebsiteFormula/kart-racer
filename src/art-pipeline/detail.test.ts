// Detail maps (detail.ts): a painted texture's relief from its luminance, for the PBR look's normals.
import { describe, expect, it } from 'vitest';
import { DETAIL_SLOPE, detailPixels, luminance } from './detail.ts';

const W = 32, H = 32;
const field = (f: (x: number, y: number) => number) => { const a = new Float32Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) a[y * W + x] = f(x, y); return a; };
const px = (d: Uint8ClampedArray, x: number, y: number) => Array.from(d.subarray((y * W + x) * 4, (y * W + x) * 4 + 4));

describe('detail maps', () => {
  it('a flat field is flat: slope 128, 128 (0 after decoding), height its luminance', () => {
    const d = detailPixels(field(() => 0.5), W, H);
    for (const [x, y] of [[0, 0], [5, 9], [31, 31]]) expect(px(d, x, y)).toEqual([128, 128, 128, 255]);
  });

  it('the normal leans away from a rise: against it along u (the canvas x), with it down the rows (v runs up them)', () => {
    // brighter to the right: the surface rises along +u, so its normal leans toward -u
    const right = detailPixels(field((x) => x / W), W, H);
    const [r, g] = px(right, 16, 16);
    expect(r).toBeLessThan(128);
    expect(g).toBe(128);
    // brighter down the canvas: three samples v upward from the bottom row, so the surface rises toward -v; its normal leans toward +v
    const down = detailPixels(field((_x, y) => y / H), W, H);
    const [r2, g2] = px(down, 16, 16);
    expect(r2).toBe(128);
    expect(g2).toBeGreaterThan(128);
  });

  it("scales a texture's slopes to one strength, whatever its contrast, and never past a steep lean", () => {
    const noise = (s: number) => field((x, y) => 0.5 + s * Math.sin(x * 1.7 + y * 0.9) * Math.cos(y * 2.3 - x * 0.4));
    const lean = (d: Uint8ClampedArray) => {
      const m: number[] = [];
      for (let i = 0; i < W * H; i++) m.push(Math.hypot(d[i * 4] - 127.5, d[i * 4 + 1] - 127.5) / 127.5);
      m.sort((a, b) => a - b);
      return { p90: m[Math.floor(m.length * 0.9)], max: m[m.length - 1] };
    };
    const faint = lean(detailPixels(noise(0.02), W, H)), strong = lean(detailPixels(noise(0.4), W, H));
    expect(faint.p90).toBeCloseTo(DETAIL_SLOPE, 1);
    expect(strong.p90).toBeCloseTo(DETAIL_SLOPE, 1);
    expect(Math.max(faint.max, strong.max)).toBeLessThanOrEqual(0.96);
  });

  it('mirrors at its edges, as the texture repeats: no seam', () => {
    // a ramp along x mirrored at the edge has no step there: the edge pixel leans half as far as the middle
    const d = detailPixels(field((x) => x / W), W, H);
    const edge = 128 - px(d, 31, 5)[0], middle = 128 - px(d, 16, 5)[0];
    expect(edge).toBeGreaterThan(0);
    expect(edge).toBeLessThan(middle);
  });

  it('reads luminance as the eye does', () => {
    const rgba = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255]);
    const l = luminance(rgba, 3, 1);
    expect(l[1]).toBeGreaterThan(l[0]);
    expect(l[0]).toBeGreaterThan(l[2]);
    expect(l[1]).toBeCloseTo(0.7152, 3);
  });
});
