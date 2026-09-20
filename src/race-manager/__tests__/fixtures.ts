// Race-manager test fixtures: a flat synthetic oval with every hazard kind, and spawn helpers.
import { makeConstants, type KartConstants } from '../../kart-controller/constants.ts';
import { createKartState, type Archetype, type KartState } from '../../kart-controller/types.ts';
import { SQUARE } from '../../track-builder/__tests__/fixtures.ts';
import type { Track } from '../../track-builder/track.ts';
import type { TrackDefinition } from '../../track-builder/types.ts';
import { createTracker } from '../checkpoints.ts';
import type { KartTracker } from '../types.ts';

export { HARBOUR_LOOP, cloneDef } from '../../track-builder/__tests__/fixtures.ts';

/** Flat rounded square, ~400 m, 8 checkpoints, 3 laps, one static hazard of each hit kind. */
export const OVAL: TrackDefinition = {
  id: 'oval', name: 'Oval', biome: 'meadow', cup: 'sunrise', laps: 3,
  medalTimesMs: { gold: 60000, silver: 70000, bronze: 80000 },
  voidY: -10,
  controlPoints: SQUARE,
  checkpointCount: 8,
  startGrid: { t: 0.02, rows: 4, columns: 2, spacing: 3.5 },
  pickups: [{ t: 0.3, lateral: 0 }, { t: 0.3, lateral: 4 }],
  coins: [{ t: 0.35, lateral: 0 }, { t: 0.36, lateral: 0 }],
  hazards: [
    { id: 'spinner', type: 'static', t: 0.5, lateral: 0, hit: 'spin' },
    { id: 'slower', type: 'static', t: 0.55, lateral: 0, hit: 'slow' },
    { id: 'bumper', type: 'static', t: 0.6, lateral: 0, hit: 'bump' },
    { id: 'gust', type: 'gust', t: 0.7, lateral: 0, period: 4, speed: 10 },
  ],
  finalLapShift: { kind: 'storm', label: 'STORM', surfaceOverrides: [{ fromT: 0.4, toT: 0.5, surface: 'dirt' }], gripMultiplier: 0.8 },
  environment: { ground: { kind: 'plane', y: 0 } },
};

export function spawnKart(track: Track, slot: number, racerId = `k${slot}`, isPlayer = false, archetype: Archetype = 'medium'): { s: KartState; tr: KartTracker; c: KartConstants } {
  const g = track.spawnGrid[slot];
  const s = createKartState({ racerId, isPlayer, position: [...g.position], heading: g.heading, t: g.t });
  s.lap = 1;
  return { s, tr: createTracker(slot, g.t), c: makeConstants(archetype, 150) };
}

/** Put the kart on the centreline at t, facing the tangent. */
export function placeAt(track: Track, s: KartState, t: number, lateral = 0): void {
  const p = track.sample(t, lateral, 0);
  s.position = [...p.position];
  s.heading = Math.atan2(p.tangent[0], p.tangent[2]);
  s.t = t;
  s.branch = 0;
}
