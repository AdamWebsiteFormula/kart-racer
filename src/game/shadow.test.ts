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
  });
});
