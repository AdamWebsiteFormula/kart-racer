// AI test fixtures: the race-manager oval plus a lap-gated shortcut, a rolling
// barrel and a jump. Nothing here edits the race-manager fixtures.
import { OVAL } from '../../race-manager/__tests__/fixtures.ts';
import { buildTrack } from '../../track-builder/track.ts';
import type { TrackDefinition } from '../../track-builder/types.ts';

export { HARBOUR_LOOP, OVAL } from '../../race-manager/__tests__/fixtures.ts';

function mk(): TrackDefinition {
  const main = buildTrack(OVAL);
  const entry = main.sample(0.28, 0, 0).position;
  const exit = main.sample(0.47, 0, 0).position;
  return {
    ...structuredClone(OVAL),
    id: 'ai-oval',
    name: 'AI Oval',
    shortcuts: [{
      id: 'inner', entryT: 0.28, exitT: 0.47, risk: 'narrow', openOnLaps: [2, 3],
      controlPoints: [
        { x: entry[0], y: entry[1], z: entry[2], halfWidth: 5.5 },
        { x: 52, y: 0, z: -30, halfWidth: 5.5 },
        { x: 48, y: 0, z: 0, halfWidth: 5.5 },
        { x: 52, y: 0, z: 30, halfWidth: 5.5 },
        { x: exit[0], y: exit[1], z: exit[2], halfWidth: 5.5 },
      ],
    }],
    hazards: [
      ...(OVAL.hazards ?? []),
      { id: 'barrel', type: 'rolling', t: 0.86, lateral: 0, period: 4, speed: 8, hit: 'spin' },
    ],
    jumps: [{ id: 'hop', t: 0.66, launch: 4 }],
  };
}

/** Oval + wide inner shortcut open on laps 2 and 3 + rolling barrel on the straight at 0.86 + jump at 0.66. */
export const AI_OVAL: TrackDefinition = mk();

/** Paperclip: two 80 m straights joined by 14 m-radius semicircles laid out as arcs. Where a full-charge drift is possible. */
export const HAIRPIN: TrackDefinition = {
  id: 'hairpin', name: 'Hairpin', biome: 'meadow', cup: 'sunrise', laps: 3,
  medalTimesMs: { gold: 60000, silver: 70000, bronze: 80000 },
  voidY: -10,
  controlPoints: [
    { x: -40, y: 0, z: -14.0, halfWidth: 5 },
    { x: 0, y: 0, z: -14.0, halfWidth: 5 },
    { x: 40, y: 0, z: -14.0, halfWidth: 5 },
    { x: 66.0, y: 0, z: -14.0, halfWidth: 5 },
    { x: 73.0, y: 0, z: -12.12, halfWidth: 5 },
    { x: 78.12, y: 0, z: -7.0, halfWidth: 5 },
    { x: 80.0, y: 0, z: 0.0, halfWidth: 5 },
    { x: 78.12, y: 0, z: 7.0, halfWidth: 5 },
    { x: 73.0, y: 0, z: 12.12, halfWidth: 5 },
    { x: 66.0, y: 0, z: 14.0, halfWidth: 5 },
    { x: 40, y: 0, z: 14.0, halfWidth: 5 },
    { x: 0, y: 0, z: 14.0, halfWidth: 5 },
    { x: -40, y: 0, z: 14.0, halfWidth: 5 },
    { x: -66.0, y: 0, z: 14.0, halfWidth: 5 },
    { x: -73.0, y: 0, z: 12.12, halfWidth: 5 },
    { x: -78.12, y: 0, z: 7.0, halfWidth: 5 },
    { x: -80.0, y: 0, z: -0.0, halfWidth: 5 },
    { x: -78.12, y: 0, z: -7.0, halfWidth: 5 },
    { x: -73.0, y: 0, z: -12.12, halfWidth: 5 },
    { x: -66.0, y: 0, z: -14.0, halfWidth: 5 },
  ],
  checkpointCount: 8,
  startGrid: { t: 0.02, rows: 4, columns: 2, spacing: 3.5 },
  pickups: [], coins: [], hazards: [],
  finalLapShift: { kind: 'storm', label: 'STORM', gripMultiplier: 0.9 },
  environment: { ground: { kind: 'plane', y: 0 } },
};

/** The hairpin track with a rolling barrel in the middle of the first straight. */
export const BARREL_STRAIGHT: TrackDefinition = {
  ...structuredClone(HAIRPIN),
  id: 'barrel-straight',
  hazards: [{ id: 'barrel', type: 'rolling', t: 0.18, lateral: 0, period: 4, speed: 8, hit: 'spin' }],
};
