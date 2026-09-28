import { describe, expect, it } from 'vitest';
import { DirectionalLight } from 'three';
import { setSunShadow, shadowTexel, SUN_SHADOW } from './shadow.ts';

describe('sun shadow bias (detail review 2026-09-24: acne on the mine portal, cliffs and mesas)', () => {
  it('pushes the lookup out by about one shadow texel, and the depth by a few cm only', () => {
    const texel = shadowTexel();
    expect(SUN_SHADOW.normalBias).toBeGreaterThanOrEqual(0.75 * texel);
    expect(SUN_SHADOW.normalBias).toBeLessThanOrEqual(1.5 * texel);
    // the depth bias moves the map toward the sun (negative), by under 10 cm: contact shadows still touch the wheels
    expect(SUN_SHADOW.bias).toBeLessThan(0);
    expect(-SUN_SHADOW.bias * SUN_SHADOW.far).toBeLessThan(0.1);
  });

  it('gives the sun its one shadow map', () => {
    const sun = new DirectionalLight();
    setSunShadow(sun);
    expect(sun.castShadow).toBe(true);
    expect(sun.shadow.mapSize.x).toBe(SUN_SHADOW.mapSize);
    expect(sun.shadow.camera.right - sun.shadow.camera.left).toBe(2 * SUN_SHADOW.extent);
    expect(sun.shadow.normalBias).toBe(SUN_SHADOW.normalBias);
    expect(sun.shadow.bias).toBe(SUN_SHADOW.bias);
    expect(sun.shadow.intensity).toBe(SUN_SHADOW.intensity);
    expect(sun.shadow.radius).toBe(SUN_SHADOW.radius);
  });
});

describe('sun shadow fill and softness (second MKW gap review, 28 Sept 2026, item 5: "near-black and hard")', () => {
  it('leaves a fifth of the sun in a cast shadow, so the sky fills it (MKW: a shadow core at 0.39-0.55 of the lit road)', () => {
    // measured on screen at 0.8 (docs/sops/performance.md): 0.42-0.50 of the lit road on the day tracks, where 1 gave 0.17-0.30
    expect(SUN_SHADOW.intensity).toBeGreaterThanOrEqual(0.7);
    expect(SUN_SHADOW.intensity).toBeLessThanOrEqual(0.85);
  });

  it('blurs the edge over about 2 texels (12 cm, at most 20): soft, the shape of a flag or a wheel still there', () => {
    expect(SUN_SHADOW.radius).toBeGreaterThanOrEqual(1.5);
    expect(SUN_SHADOW.radius * shadowTexel()).toBeLessThanOrEqual(0.2);
  });
});
