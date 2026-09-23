// art-pipeline public surface.
import type { TrackAssets } from '../track-builder/mesh/index.ts';
import { trackAssetsFor } from './decor.ts';
import { toonRamp } from './toon.ts';

export { buildRacerMesh, racerGeometry } from './kart.ts';
export { fitToKart, KART_FIT, RACER_MODELS, RacerModels, type ModelManifest } from './glb.ts';
export { EXHAUST, portDir, RACER_IDS, racerModel, type Exhaust } from './racers.ts';
export { flameColour, flameGeometry } from './flames.ts';
export { ModelBuilder } from './model.ts';
export { DECOR_NAMES, decorGeometry } from './decor.ts';
export { DAY_LIGHT, lightOf, paintSky, SKIES, type SkyLight, type SkyPreset } from './sky.ts';
export { flameMaterial, isShared, toonRamp, vertexToon } from './toon.ts';

/** The TrackAssets every track scene gets: modelled decor and the toon ramp (no outlines). */
export function trackAssets(): TrackAssets {
  return { ...trackAssetsFor(), gradientMap: toonRamp() };
}
