// The sun's one shadow map (CLAUDE.md: one shadow map, ≤3 lights): a square box that follows what
// the camera looks at (main.ts), and the bias that keeps it off the faces that cast it.
import type { DirectionalLight } from 'three';

export const SUN_SHADOW = Object.freeze({
  /** texels per side */
  mapSize: 2048,
  /** half the box's width, metres */
  extent: 60,
  /** depth of the box from the sun, metres */
  far: 400,
  // with no bias a low sun shades the very faces that cast (detail review 2026-09-24: striped acne
  // on the mine portal, the cliffs and the mesas). The texel is 120 m / 2048 ≈ 6 cm: look up about
  // one texel out along the normal, and a few cm nearer the sun, so a kart's contact shadow still
  // touches its wheels
  /** world metres along the surface normal */
  normalBias: 0.06,
  /** depth, as a share of `far` (−0.0001 × 400 m = 4 cm) */
  bias: -0.0001,
});

/** One shadow texel, metres. */
export const shadowTexel = (): number => (2 * SUN_SHADOW.extent) / SUN_SHADOW.mapSize;

/** Give the sun its shadow map. */
export function setSunShadow(sun: DirectionalLight): void {
  const s = SUN_SHADOW;
  sun.castShadow = true;
  sun.shadow.mapSize.set(s.mapSize, s.mapSize);
  Object.assign(sun.shadow.camera, { left: -s.extent, right: s.extent, top: s.extent, bottom: -s.extent, far: s.far });
  sun.shadow.normalBias = s.normalBias;
  sun.shadow.bias = s.bias;
}
