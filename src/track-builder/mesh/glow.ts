// Material patches for props. Lights that light themselves: a vertex colour brighter than white (a lamp globe, a bulb, a neon
// sign, a flag tip; art-pipeline models write linear RGB above 1 for these) also emits that colour,
// so it glows through the bloom at night as well as by day, however dark the scene light is.
import type { Material, MeshToonMaterial } from 'three';

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
 * within NEAR_FADE metres of the lens instead of filling the screen: a dither, no sorting. The
 * pattern is interleaved gradient noise (Jimenez 2014), a fine, even stipple with no grid in it (the
 * old 4x4 Bayer read as a coarse screen door at 720p and 1080p). An item pressed against the lens
 * passes its own `fade` (game/camera.ts CAM.nearFade); a rival's kart fades as a see-through ghost
 * instead (game/kartFade.ts). Any built-in material works (it carries its own view-space varying);
 * patching one twice is a no-op, so a shared material (vertexToon) can be handed in by every user.
 */
const NEAR_FADE = 2.6;
const FADED = new WeakSet<Material>(); // not userData: a clone copies that but not the patch
export function fadeNearCamera(m: Material, fade = NEAR_FADE): void {
  if (FADED.has(m)) return;
  FADED.add(m);
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (shader, renderer) => {
    prev.call(m, shader, renderer);
    shader.vertexShader = `varying vec3 vNearView;\n${shader.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vNearView = mvPosition.xyz;')}`;
    shader.fragmentShader = `varying vec3 vNearView;\n${shader.fragmentShader}`.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
      {
        float near = clamp(length(vNearView) / ${fade.toFixed(2)}, 0.0, 1.0);
        float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
        if (near < 1.0 && near * near < ign * 0.97 + 0.03) discard;
      }`);
  };
  const key = m.customProgramCacheKey.bind(m);
  m.customProgramCacheKey = () => `${key()}|near${fade.toFixed(2)}`;
  m.needsUpdate = true; // a material already drawn (vertexToon, shared across races) recompiles with it
}

/**
 * A small solid thing against the lens (an item a rival trails or throws, a Strike Ball) fades out
 * smoothly instead of dithering: it draws in the see-through pass, still writing depth so it hides
 * what is behind it like a solid one, its opacity falling as the square of the way from `fade` to
 * `near` metres from the lens. Patching one twice is a no-op.
 */
const ALPHA_FADED = new WeakSet<Material>();
export function fadeNearCameraAlpha(m: Material, fade: number, near = 0.6): void {
  if (ALPHA_FADED.has(m)) return;
  ALPHA_FADED.add(m);
  m.transparent = true;
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (shader, renderer) => {
    prev.call(m, shader, renderer);
    shader.vertexShader = `varying vec3 vNearView;\n${shader.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vNearView = mvPosition.xyz;')}`;
    shader.fragmentShader = `varying vec3 vNearView;\n${shader.fragmentShader}`.replace('#include <opaque_fragment>', `{
        float nearT = clamp((length(vNearView) - ${near.toFixed(2)}) / ${(fade - near).toFixed(2)}, 0.0, 1.0);
        diffuseColor.a *= nearT * nearT;
      }
      #include <opaque_fragment>`);
  };
  const key = m.customProgramCacheKey.bind(m);
  m.customProgramCacheKey = () => `${key()}|near${fade.toFixed(2)}|alpha`;
  m.needsUpdate = true;
}
