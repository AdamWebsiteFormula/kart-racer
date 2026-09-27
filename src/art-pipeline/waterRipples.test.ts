// The sea's ripples (waterRipples.ts): the generated tiling map and the layers the shader reads from it.
import { describe, expect, it } from 'vitest';
import { LinearMipmapLinearFilter, NoColorSpace, RepeatWrapping } from 'three';
import { RIPPLE, RIPPLE_GLSL, RIPPLE_LAYERS, rippleField, rippleTexture, rippleWaves } from './waterRipples.ts';

describe('the ripple map', () => {
  it('is the same sines every load (stills and tests repeat), whole-number wave vectors so it tiles, none twice', () => {
    const a = rippleWaves(), b = rippleWaves();
    expect(a).toEqual(b);
    expect(a.length).toBe(RIPPLE.waves);
    const keys = new Set(a.map((w) => `${w.kx},${w.ky}`));
    expect(keys.size).toBe(a.length);
    for (const w of a) {
      expect(Number.isInteger(w.kx) && Number.isInteger(w.ky)).toBe(true);
      expect(Math.hypot(w.kx, w.ky)).toBeGreaterThan(0);
      expect(Math.hypot(w.kx, w.ky)).toBeLessThanOrEqual(RIPPLE.kMax + 1);
    }
  });

  it('tiles with no seam: the step across the edge is no bigger than the steps inside', () => {
    const n = 64, f = rippleField(n);
    let inside = 0, edge = 0;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n - 1; x++) inside = Math.max(inside, Math.abs(f.h[y * n + x + 1] - f.h[y * n + x]));
      edge = Math.max(edge, Math.abs(f.h[y * n] - f.h[y * n + n - 1]));
    }
    for (let x = 0; x < n; x++) {
      for (let y = 0; y < n - 1; y++) inside = Math.max(inside, Math.abs(f.h[(y + 1) * n + x] - f.h[y * n + x]));
      edge = Math.max(edge, Math.abs(f.h[x] - f.h[(n - 1) * n + x]));
    }
    expect(edge).toBeLessThanOrEqual(inside * 1.05);
  });

  it('holds heights in [-1, 1] and slopes up to 1 that really are the height field\'s own slope', () => {
    const n = 128, f = rippleField(n);
    let dot = 0, a2 = 0, b2 = 0;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = y * n + x;
        expect(Math.abs(f.h[i])).toBeLessThanOrEqual(1 + 1e-6);
        expect(Math.hypot(f.sx[i], f.sy[i])).toBeLessThanOrEqual(1 + 1e-6);
        const dh = f.h[y * n + ((x + 1) % n)] - f.h[y * n + ((x + n - 1) % n)];
        dot += dh * f.sx[i]; a2 += dh * dh; b2 += f.sx[i] * f.sx[i];
      }
    }
    expect(dot / Math.sqrt(a2 * b2)).toBeGreaterThan(0.98); // the finite difference and the stored slope agree
  });

  it('is one shared texture: linear data, repeating, mipmapped and anisotropic (a far layer averages out, never aliases)', () => {
    const t = rippleTexture();
    expect(rippleTexture()).toBe(t);
    expect(t.image.width).toBe(RIPPLE.size);
    expect(t.wrapS).toBe(RepeatWrapping);
    expect(t.wrapT).toBe(RepeatWrapping);
    expect(t.minFilter).toBe(LinearMipmapLinearFilter);
    expect(t.generateMipmaps).toBe(true);
    expect(t.anisotropy).toBeGreaterThanOrEqual(4);
    expect(t.colorSpace).toBe(NoColorSpace);
    // flat on average: the slope channels centre on 0.5
    const d = t.image.data as Uint8Array;
    let r = 0, g = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; }
    expect(Math.abs(r / (d.length / 4) - 127.5)).toBeLessThan(4);
    expect(Math.abs(g / (d.length / 4) - 127.5)).toBeLessThan(4);
  });
});

describe('the ripple layers', () => {
  it('four scales from the chop to the finest ripples, each turned its own way, the finest fading first', () => {
    expect(RIPPLE_LAYERS.length).toBe(4);
    const tiles = RIPPLE_LAYERS.map((l) => l.tile);
    expect([...tiles].sort((a, b) => b - a)).toEqual(tiles);
    expect(new Set(RIPPLE_LAYERS.map((l) => l.angle.toFixed(2))).size).toBe(4);
    for (let i = 1; i < RIPPLE_LAYERS.length; i++) expect(RIPPLE_LAYERS[i].fade[1]).toBeLessThan(RIPPLE_LAYERS[i - 1].fade[1]);
    // the chop never fades before the fog does (it carries the waves out to the horizon)
    expect(RIPPLE_LAYERS[0].fade[0]).toBeGreaterThanOrEqual(850);
  });

  it('every layer moves at least a third of its own finest wavelength in half a second (a still pair 0.5 s apart differs), slower than real waves of that length', () => {
    for (const l of RIPPLE_LAYERS) {
      const speed = Math.hypot(l.drift[0], l.drift[1]), finest = l.tile / RIPPLE.kMax, longest = l.tile / RIPPLE.kMin;
      expect(speed * 0.5).toBeGreaterThanOrEqual(finest / 3);
      // calm: under the deep-water speed of the layer's own longest wave
      expect(speed).toBeLessThan(Math.sqrt((9.80665 * longest) / (2 * Math.PI)));
    }
  });

  it('the shader sums every layer from uRipple, with no "--" (a negative number spliced after a minus is a GLSL compile error)', () => {
    expect(RIPPLE_GLSL).toContain('uniform sampler2D uRipple');
    expect(RIPPLE_GLSL).toContain('vec3 lkRipples(vec2 p, float t, float dist)');
    for (const l of RIPPLE_LAYERS) expect(RIPPLE_GLSL).toContain((1 / l.tile).toFixed(5));
    expect(RIPPLE_GLSL).not.toMatch(/--/);
  });
});
