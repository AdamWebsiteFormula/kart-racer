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
 * A prop the chase camera brushes past (a hay bale, a balloon, a palm at the roadside) dissolves
 * within NEAR_FADE metres of the lens instead of filling the screen: an ordered dither, no sorting.
 * A rival's kart, its flames or an item pressed against the lens passes its own `fade` (game/camera.ts).
 * Any built-in material works (it carries its own view-space varying, so unlit flames too); patching
 * one twice is a no-op, so a shared material (vertexToon) can be handed in by every user.
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
        vec2 cell = mod(floor(gl_FragCoord.xy), 4.0);
        float bayer = mod(cell.x * 3.0 + cell.y * 2.0 + cell.x * cell.y, 16.0) / 16.0;
        if (near < 1.0 && near * near < bayer + 0.03) discard;
      }`);
  };
  const key = m.customProgramCacheKey.bind(m);
  m.customProgramCacheKey = () => `${key()}|near${fade.toFixed(2)}`;
  m.needsUpdate = true; // a material already drawn (vertexToon, shared across races) recompiles with it
}
