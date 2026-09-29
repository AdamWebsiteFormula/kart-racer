// art-pipeline public surface.
import type { Material, MeshToonMaterial } from 'three';
import type { TrackAssets } from '../track-builder/mesh/index.ts';
import { trackAssetsFor } from './decor.ts';
import { PROP_MODELS } from './glb.ts';
import { coastMaterial, FROST_LAKE, groundMaterial, roadDetail, roadGrain, roadWear } from './surfaces.ts';
import { SEA_TIDE } from './waterWaves.ts';
import { RIPPLE_GLSL, rippleTexture } from './waterRipples.ts';
import { toonRamp } from './toon.ts';
import { buildVista, VISTA_PIECES } from './vista.ts';
import { withCrowd } from './crowd.ts';
import { applyLook, isPbr } from './look.ts';
import { grassMaterial, tuftGeometry } from './grass.ts';
import { edgeKit } from './edges.ts';
import { turning } from './spin.ts';

export { bodyColours, buildRacerMesh, comboOwnerOf, exhaustFor, racerGeometry, type KartLook } from './kart.ts';
export { BODY_EXHAUST, BODY_IDS, isBodyId, KART_COLOURS, SEAT, type BodyId } from './bodies.ts';
export { PAINTS, paintFor, repaintHex, repaintPixels, repaintRgb, type Paint, type PaintRule } from './paints.ts';
export { clipDriver, DRIVER_CUTS, fitToBox, fitToKart, KART_FIT, PROP_MODELS, PropModels, RACER_MODELS, RacerModels, trackProps, type DriverCut, type ModelManifest } from './glb.ts';
export { EXHAUST, portDir, RACER_IDS, racerModel, type Exhaust } from './racers.ts';
export { buildComboTemplate, freeSkeletons, RACER_POSES, RiggedKart, SEATED, type PartsManifest, type PartsSpec, type RiggedTemplate, type SeatSpec } from './rigged.ts';
export { flameColour } from './flames.ts';
export { ModelBuilder } from './model.ts';
export { DECOR_NAMES, decorGeometry } from './decor.ts';
export { DAY_GRADE, DAY_LIGHT, fadeSky, lightOf, paintSky, preloadSky, SKIES, SKY_FADE, SKY_FADE_FOR, skyTint, type SkyLight, type SkyPreset } from './sky.ts';
export { isShared, toonRamp, vertexToon } from './toon.ts';
export { BUBBLE_CLOCK, bubbleMaterial, ITEM_MODEL_KINDS, itemGeometry, oilSlickMaterial, strikeBallMaterial } from './items.ts';

export { preloadSurfaces, ROAD_LOOKS, ROAD_WET, roadWear, WATER_CLOCK, type RoadLook } from './surfaces.ts';
export { applyLook, DEFAULT_LOOK, isPbr, look, lookFromSearch, LOOKS, PBR, setLook, SkyEnvironment, worldEnvironment, type Look } from './look.ts';

/**
 * The TrackAssets a track scene gets: the modelled decor and the toon ramp, with every prop that
 * has a model file (AI-made, textured) in place of its code-built one, and for a known biome its
 * painted ground or animated water and the road grain.
 */
let tuft: ReturnType<typeof tuftGeometry> | null = null;
/** The one tuft every lawn's grass clones (grass.ts). */
const tuftTemplate = () => (tuft ??= tuftGeometry());

export function trackAssets(biome?: string): TrackAssets {
  const { geometries } = trackAssetsFor();
  const materials: Record<string, Material> = {};
  // (and the far vista's big pieces that have a model file: vista.ts VISTA_PIECES)
  for (const name of [...Object.keys(geometries), ...(biome ? VISTA_PIECES[biome] ?? [] : [])]) {
    const file = PROP_MODELS.get(name);
    if (file) { geometries[name] = file.geometry; materials[name] = file.material; }
  }
  const surfaces = biome ? {
    ground: (kind: string, size: number, sunDirection?: readonly [number, number, number]) => groundMaterial(biome, kind, size, sunDirection), roadMap: roadGrain(), coast: () => coastMaterial(biome),
    // (the PBR look adds the road's racing line, tire marks and its own grain, per biome: roadDetail)
    road: (m: MeshToonMaterial) => { roadWear(m, biome); if (isPbr()) roadDetail(m, biome); },
    // Frostbite's lake on the snow, frozen by its Final Lap Shift (surfaces.ts FROST_LAKE)
    ...(biome === 'frost' ? { lake: FROST_LAKE } : {}),
    // Lighthouse Loop's flood tide (waterWaves.ts SEA_TIDE): the only sea track with a Final Lap Shift that raises the sea
    ...(biome === 'harbour' ? { tide: SEA_TIDE, ripples: { map: rippleTexture(), glsl: RIPPLE_GLSL } } : {}),
  } : {};
  // the far vista: set-pieces, movers and glows past the scenery (vista.ts); the crowd by the road (crowd.ts)
  // the PBR prototype (look.ts, ?look=pbr): the world's materials swapped for their stylized-PBR twins once
  // built, and on a lawn (Harbor, Meadow) tufts of grass and a few flowers along the curbs in place of the
  // old verge tufts (grass.ts; the flower clumps stay, for their colour)
  const lawn = biome === 'harbour' || biome === 'meadow';
  const pbr = isPbr() ? { look: applyLook, ...(lawn ? { grass: { geometry: tuftTemplate(), material: grassMaterial(biome), replaces: ['tuft'] } } : {}) } : {};
  // what lines each land track's edge past the course limit, and the cover inside it (edges.ts); `?noedge` in
  // the address leaves it off, for a side-by-side look at the same build
  const edge = new URLSearchParams(globalThis.location?.search ?? '').has('noedge') ? undefined : edgeKit(biome);
  // a model with a turning part (a windmill's sails, the Ferris wheel: spin.ts) turns in its own vertex shader
  const out: TrackAssets = { geometries, materials, gradientMap: toonRamp(), ...surfaces, ...pbr, ...(edge ? { edge } : {}), spin: turning };
  // the vista's big pieces from their model files, looked up through the assets as every other model is
  const file = (name: string) => {
    const geometry = out.geometries?.[name], material = out.materials?.[name];
    return geometry && material ? { geometry, material } : undefined;
  };
  out.vista = (ctx) => withCrowd(buildVista(ctx, file), ctx);
  return out;
}
