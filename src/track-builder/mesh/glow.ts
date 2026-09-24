// Material patches for props. Lights that light themselves: a vertex colour brighter than white (a lamp globe, a bulb, a neon
// sign, a flag tip; art-pipeline models write linear RGB above 1 for these) also emits that colour,
// so it glows through the bloom at night as well as by day, however dark the scene light is.
import type { MeshToonMaterial } from 'three';

export function glowFromVertexColours(m: MeshToonMaterial): void {
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (shader, renderer) => {
    prev.call(m, shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      #ifdef USE_COLOR
        float lamp = step(1.001, max(vColor.r, max(vColor.g, vColor.b)));
        totalEmissiveRadiance += vColor.rgb * lamp * 0.9;
      #endif`);
  };
  const key = m.customProgramCacheKey.bind(m);
  m.customProgramCacheKey = () => `${key()}|glow`;
}

/**
 * Pickups that light themselves after dark (detail review 2026-09-24: on Boardwalk Nights the
 * balloons and coins read as near-black blobs): their own colour, times `amount.value`, as
 * emission. The scene sets it from the sky (SkyLight.glow: 0 by day) and pulses it gently.
 */
export function selfLit(m: MeshToonMaterial, amount: { value: number }): void {
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (shader, renderer) => {
    prev.call(m, shader, renderer);
    shader.uniforms.pickupGlow = amount;
    shader.fragmentShader = `uniform float pickupGlow;\n${shader.fragmentShader}`.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      #ifdef USE_COLOR
        totalEmissiveRadiance += vColor.rgb * pickupGlow;
      #else
        totalEmissiveRadiance += diffuse * pickupGlow;
      #endif`);
  };
  const key = m.customProgramCacheKey.bind(m);
  m.customProgramCacheKey = () => `${key()}|pickup`;
}

/**
 * A prop the chase camera brushes past (a hay bale, a balloon, a palm at the roadside) dissolves
 * within NEAR_FADE metres of the lens instead of filling the screen: an ordered dither, no sorting.
 */
const NEAR_FADE = 2.6;
export function fadeNearCamera(m: MeshToonMaterial): void {
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (shader, renderer) => {
    prev.call(m, shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
      {
        float near = clamp(length(vViewPosition) / ${NEAR_FADE.toFixed(2)}, 0.0, 1.0);
        vec2 cell = mod(floor(gl_FragCoord.xy), 4.0);
        float bayer = mod(cell.x * 3.0 + cell.y * 2.0 + cell.x * cell.y, 16.0) / 16.0;
        if (near < 1.0 && near * near < bayer + 0.03) discard;
      }`);
  };
  const key = m.customProgramCacheKey.bind(m);
  m.customProgramCacheKey = () => `${key()}|near`;
}
