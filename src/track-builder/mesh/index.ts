// Scene layer public surface. Three.js lives only under mesh/.
export { buildTrackScene, type TrackAssets, type TrackScene } from './scene.ts';
export { buildRibbon } from './road.ts';
export { buildBranchChunks, chunkCountFor, chunkTouched, rebuildChunk, type Chunk } from './chunks.ts';
export { placeDecor, placeBarriers, insideRoadEnvelope, hashString, mulberry32, type DecorPlacement } from './decor.ts';
export { paletteFor, hexToRgb, type TrackPalette, type Rgb } from './palette.ts';
