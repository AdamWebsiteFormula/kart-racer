// art-pipeline public surface.
import type { Material } from 'three';
import type { TrackAssets } from '../track-builder/mesh/index.ts';
import { trackAssetsFor } from './decor.ts';
import { PROP_MODELS } from './glb.ts';
import { coastMaterial, groundMaterial, roadGrain } from './surfaces.ts';
import { toonRamp } from './toon.ts';

export { buildRacerMesh, racerGeometry } from './kart.ts';
export { fitToBox, fitToKart, KART_FIT, PROP_MODELS, PropModels, RACER_MODELS, RacerModels, type ModelManifest } from './glb.ts';
export { EXHAUST, portDir, RACER_IDS, racerModel, type Exhaust } from './racers.ts';
export { flameColour, flameGeometry } from './flames.ts';
export { ModelBuilder } from './model.ts';
export { DECOR_NAMES, decorGeometry } from './decor.ts';
export { DAY_LIGHT, lightOf, paintSky, SKIES, type SkyLight, type SkyPreset } from './sky.ts';
export { flameMaterial, isShared, toonRamp, vertexToon } from './toon.ts';
export { BUBBLE_CLOCK, bubbleMaterial, ITEM_MODEL_KINDS, itemGeometry, oilSlickMaterial, strikeBallMaterial } from './items.ts';

export { preloadSurfaces, WATER_CLOCK } from './surfaces.ts';

/**
 * The TrackAssets a track scene gets: the modelled decor and the toon ramp, with every prop that
 * has a model file (AI-made, textured) in place of its code-built one, and for a known biome its
 * painted ground or animated water and the road grain.
 */
export function trackAssets(biome?: string): TrackAssets {
  const { geometries } = trackAssetsFor();
  const materials: Record<string, Material> = {};
  for (const name of Object.keys(geometries)) {
    const file = PROP_MODELS.get(name);
    if (file) { geometries[name] = file.geometry; materials[name] = file.material; }
  }
  const surfaces = biome ? { ground: (kind: string, size: number) => groundMaterial(biome, kind, size), roadMap: roadGrain(), coast: () => coastMaterial(biome) } : {};
  return { geometries, materials, gradientMap: toonRamp(), ...surfaces };
}
