import { describe, expect, it } from 'vitest';
import type { BufferAttribute, Mesh } from 'three';
import { buildBackdrop, FACE_LIGHT, FLANK_LIGHT, flankLight, recolourBackdrop } from './backdrop.ts';
import type { Rgb } from './palette.ts';

const HORIZON: Rgb = [0.9, 0.8, 0.7];
const rings = (biome: string, sunAz = 0) => buildBackdrop(biome, 0, HORIZON, sunAz)?.getObjectByName('horizon-rings') as Mesh | undefined;

describe('far horizon ring (detail review 2026-09-24: flat unlit cut-outs)', () => {
  // one peak at a = π/2, rising from both sides
  const peak = (a: number) => Math.max(0, 50 * (1 - Math.abs(a - Math.PI / 2) / 0.2));

  it('a peak has a lit flank toward the sun and a shaded one away from it', () => {
    // the sun a quarter turn round from the peak, on its rising side (a < π/2)
    const sunAz = 0;
    const rising = flankLight(peak, Math.PI / 2 - 0.1, sunAz), falling = flankLight(peak, Math.PI / 2 + 0.1, sunAz);
    expect(rising).toBeGreaterThan(0);
    expect(falling).toBeLessThan(0);
    // and with the sun on the other side the flanks swap
    expect(flankLight(peak, Math.PI / 2 - 0.1, Math.PI)).toBeLessThan(0);
    expect(flankLight(peak, Math.PI / 2 + 0.1, Math.PI)).toBeGreaterThan(0);
    // flat ground only takes the face term: lit opposite the sun, backlit toward it
    expect(flankLight(() => 10, Math.PI, 0)).toBeCloseTo(FACE_LIGHT, 9);
    expect(flankLight(() => 10, 0, 0)).toBeCloseTo(-FACE_LIGHT, 9);
    expect(Math.abs(rising)).toBeLessThanOrEqual(FLANK_LIGHT + FACE_LIGHT);
  });

  it('the rings bake both flanks into their colours, never brighter than white', () => {
    for (const biome of ['meadow', 'canyon', 'frost', 'harbour']) {
      const m = rings(biome)!;
      const col = (m.geometry.getAttribute('color') as BufferAttribute).array as Float32Array;
      let min = Infinity, max = -Infinity;
      for (let i = 0; i < col.length; i++) { min = Math.min(min, col[i]); max = Math.max(max, col[i]); }
      expect(max, biome).toBeLessThanOrEqual(1);
      // the sun moved round the ring changes the colours: it is lit, not flat
      const other = (rings(biome, Math.PI)!.geometry.getAttribute('color') as BufferAttribute).array as Float32Array;
      let diff = 0;
      for (let i = 0; i < col.length; i++) diff = Math.max(diff, Math.abs(col[i] - other[i]));
      expect(diff, biome).toBeGreaterThan(0.05);
    }
  });

  it('the sky road has no ring: its sky painting carries the cloud sea', () => {
    expect(buildBackdrop('skyline', 0, HORIZON, 0)).toBeNull();
  });

  it('a Final Lap Shift recolours the ring: tinted by the new light, hazed toward the new horizon', () => {
    const m = rings('canyon')!;
    const attr = m.geometry.getAttribute('color') as BufferAttribute;
    const before = Float32Array.from(attr.array as Float32Array);
    const group = m.parent!;
    // the same horizon and no tint gives back the baked colours
    recolourBackdrop(group, HORIZON, [1, 1, 1]);
    for (let i = 0; i < before.length; i++) expect((attr.array as Float32Array)[i]).toBeCloseTo(before[i], 5);
    const dusk: Rgb = [0.45, 0.05, 0.1];
    recolourBackdrop(group, dusk, [0.7, 0.55, 1]);
    const after = attr.array as Float32Array;
    const haze = m.userData.haze as Float32Array, base = m.userData.base as Float32Array;
    for (const v of [0, 7, 300, haze.length - 1]) {
      const w = haze[v];
      expect(after[v * 3]).toBeCloseTo(Math.min(1, base[v * 3] * 0.7) * (1 - w) + dusk[0] * w, 5);
      expect(after[v * 3 + 2]).toBeCloseTo(Math.min(1, base[v * 3 + 2]) * (1 - w) + dusk[2] * w, 5);
    }
    // no ring, nothing to do
    expect(() => recolourBackdrop(undefined, dusk, [1, 1, 1])).not.toThrow();
  });
});
