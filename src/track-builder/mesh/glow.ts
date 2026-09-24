// Lights that light themselves: a vertex colour brighter than white (a lamp globe, a bulb, a neon
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
