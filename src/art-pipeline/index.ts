// art-pipeline public surface.
import type { TrackAssets } from '../track-builder/mesh/index.ts';
import { trackAssetsFor } from './decor.ts';
import { inkMaterial, toonRamp } from './toon.ts';

export { buildRacerMesh, racerGeometry } from './kart.ts';
export { RACER_IDS, racerModel } from './racers.ts';
export { ModelBuilder } from './model.ts';
export { DECOR_NAMES, decorGeometry } from './decor.ts';
export { paintSky, SKIES, type SkyPreset } from './sky.ts';
export { inkMaterial, isShared, toonRamp, vertexToon } from './toon.ts';

/** The TrackAssets every track scene gets: modelled decor, ink hulls, the toon ramp. */
export function trackAssets(): TrackAssets {
  return { ...trackAssetsFor(), ink: inkMaterial(), gradientMap: toonRamp() };
}
