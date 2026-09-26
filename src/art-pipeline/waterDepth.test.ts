// The sea's translucency curve (waterDepth.ts), and the GLSL it hands to surfaces.ts: a pure TS mirror
// of what the shader computes, so the two are checked against the same numbers and can never quietly
// drift apart (research brief, 26 Sept 2026: Nintendo "Ask the Developer" Vol.18 Pt.3, Digital Foundry's
// MKW tech review).
import { describe, expect, it } from 'vitest';
import { WATER_DEPTH, WATER_DEPTH_GLSL, waterAlphaAt, waterColorMixAt, waterDepthUniforms, waterFoamAt } from './waterDepth.ts';

describe('waterAlphaAt: about 0.3 at the surface, opaque by WATER_DEPTH.opaqueAt', () => {
  it('is alphaAt0 right at the surface, 1 at and past opaqueAt, and monotonic between', () => {
    expect(waterAlphaAt(0)).toBeCloseTo(WATER_DEPTH.alphaAt0, 5);
    expect(waterAlphaAt(WATER_DEPTH.opaqueAt)).toBeCloseTo(1, 5);
    expect(waterAlphaAt(WATER_DEPTH.opaqueAt * 3)).toBe(1); // clamped, never past 1
    let prev = -1;
    for (let d = 0; d <= WATER_DEPTH.opaqueAt; d += WATER_DEPTH.opaqueAt / 20) {
      const a = waterAlphaAt(d);
      expect(a).toBeGreaterThanOrEqual(prev);
      expect(a).toBeGreaterThanOrEqual(WATER_DEPTH.alphaAt0 - 1e-9);
      expect(a).toBeLessThanOrEqual(1 + 1e-9);
      prev = a;
    }
  });

  it('is fully opaque at or above the surface (d <= 0): dry land, or nothing worth fading for', () => {
    expect(waterAlphaAt(0)).not.toBe(1); // right at the surface is the shallow alpha, not opaque
    expect(waterAlphaAt(-0.01)).toBe(1);
    expect(waterAlphaAt(-5)).toBe(1);
  });
});

describe('waterColorMixAt: 0 (shallow) at the surface, 1 (deep) by WATER_DEPTH.colorAt — a longer reach than the alpha curve, so the last stretch reads as increasingly deep-toned water at full opacity, not a sudden pop', () => {
  it('reaches 1 later than the alpha curve reaches its own 1', () => {
    expect(WATER_DEPTH.colorAt).toBeGreaterThan(WATER_DEPTH.opaqueAt);
    expect(waterColorMixAt(0)).toBe(0);
    expect(waterColorMixAt(WATER_DEPTH.colorAt)).toBeCloseTo(1, 5);
    expect(waterColorMixAt(WATER_DEPTH.opaqueAt)).toBeLessThan(1); // still shifting hue after alpha has already maxed
    expect(waterColorMixAt(-1)).toBe(0);
  });
});

describe('waterFoamAt: a soft line right at the shoreline, gone by WATER_DEPTH.foamWidth down', () => {
  it('is 1 at the surface, 0 past foamWidth, 0 above the surface, and falls monotonically between', () => {
    expect(waterFoamAt(0)).toBe(1);
    expect(waterFoamAt(WATER_DEPTH.foamWidth)).toBeCloseTo(0, 5);
    expect(waterFoamAt(WATER_DEPTH.foamWidth * 2)).toBe(0);
    expect(waterFoamAt(-0.01)).toBe(0);
    expect(waterFoamAt(WATER_DEPTH.foamWidth / 2)).toBeGreaterThan(0);
    expect(waterFoamAt(WATER_DEPTH.foamWidth / 2)).toBeLessThan(1);
  });
});

describe('WATER_DEPTH_GLSL: the shader reads the very same numbers the TS curves above use', () => {
  it('splices WATER_DEPTH.opaqueAt, alphaAt0, colorAt and foamWidth in, not different hand-typed constants', () => {
    expect(WATER_DEPTH_GLSL).toContain(WATER_DEPTH.opaqueAt.toFixed(4));
    expect(WATER_DEPTH_GLSL).toContain(WATER_DEPTH.alphaAt0.toFixed(4));
    expect(WATER_DEPTH_GLSL).toContain(WATER_DEPTH.colorAt.toFixed(4));
    expect(WATER_DEPTH_GLSL).toContain(WATER_DEPTH.foamWidth.toFixed(4));
  });

  it('declares the uniforms waterDepthUniforms() provides, and the fallback/reconstruction plumbing', () => {
    for (const name of Object.keys(waterDepthUniforms())) expect(WATER_DEPTH_GLSL, name).toContain(`uniform`);
    expect(WATER_DEPTH_GLSL).toContain('uniform sampler2D uSceneDepth;');
    expect(WATER_DEPTH_GLSL).toContain('uniform float uHasDepth;');
    // this fragment's own depth, from gl_FragCoord.z (the hardware, perspective-correct value) — not a
    // hand-carried varying, which measured many times too deep on the water's own giant plane
    expect(WATER_DEPTH_GLSL).toContain('lkViewZFromDepth(gl_FragCoord.z)');
    expect(WATER_DEPTH_GLSL).toContain('float lkSceneDropBelow()');
    // "nothing useful found" (uHasDepth off, or a cleared pixel) reads as very deep, not a special case
    expect(WATER_DEPTH_GLSL).toMatch(/uHasDepth < 0\.5\) return 1\.0e4/);
    expect(WATER_DEPTH_GLSL).toMatch(/raw >= 0\.9999\) return 1\.0e4/);
  });

  it('waterDepthUniforms(): starts with no scene depth and uHasDepth off, ready for the first capture', () => {
    const u = waterDepthUniforms();
    expect(u.uSceneDepth.value).toBeNull();
    expect(u.uHasDepth.value).toBe(0);
    expect((u.uResolution.value as { x: number; y: number }).x).toBeGreaterThan(0);
  });
});
