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
  /**
   * How much of the sun a cast shadow takes away (three's LightShadow.intensity; 1 took all of it). The second
   * MKW gap review (28 Sept 2026, item 5) found ours near-black and hard. Measured the same way on both (a shadow's
   * core against the same road lit, display values, docs/sops/performance.md): Mario Kart World's kart shadows sit
   * at 0.39 to 0.55 of the lit road (OSU-aguh1AY 1:11, 2:44, 1:29:15), cool gray (R 0.41-0.45, G 0.52-0.58,
   * B 0.60-0.65 of the lit road's); ours took 0.17 to 0.30, deep navy (R 0.2, G 0.3, B 0.5). At 0.8 they sit at
   * 0.42 to 0.50 on the day tracks, R 0.43-0.51, G 0.47-0.51, B 0.55-0.64: the sky and its bounce fill them as
   * MKW's are filled. The karts keep their grounding from the contact shade under the wheels (contactShadow.ts).
   */
  intensity: 0.8,
  /**
   * Texels of PCF blur (three r185's Vogel-disk PCF: five hardware 2x2 taps spread over this radius): 2 texels
   * is 12 cm, a soft edge that still holds the shape of a flag or a wheel (1, three's default, read hard)
   */
  radius: 2,
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
  sun.shadow.intensity = s.intensity;
  sun.shadow.radius = s.radius;
}
