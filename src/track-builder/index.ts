// Public surface of the track-builder sim layer. The scene layer lives under mesh/.
export { buildTrack, Track, type BuildOptions, type TrackListener } from './track.ts';
export { validateTrack, assertValid, type Validation } from './validate.ts';
export { applyFinalLapShift, type ShiftKart } from './shift.ts';
export { Branch, Branches, signedOffset } from './branches.ts';
export { Lut, buildLut, wrap01, clamp01 } from './lut.ts';
export { ClosedSpline, OpenSpline, type Spline } from './spline.ts';
export { Hazards } from './hazards.ts';
export { buildMinimap, type Minimap, type MinimapOutline } from './minimap.ts';
export { buildCheckpoints, buildSpawnGrid, distanceAlong, raceProgress } from './race.ts';
export { BUILDER, KART_RADIUS, T_SEARCH_WINDOW } from './constants.ts';
export * from './types.ts';
