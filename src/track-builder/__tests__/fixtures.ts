// Synthetic control-point loops for headless tests. Metres, Y up.
import type { ControlPoint } from '../types.ts';

/** Eight-point rounded square, flat. */
export const SQUARE: ControlPoint[] = [
  { x: -60, y: 0, z: -60, halfWidth: 6 },
  { x: 0, y: 0, z: -70, halfWidth: 6 },
  { x: 60, y: 0, z: -60, halfWidth: 6 },
  { x: 70, y: 0, z: 0, halfWidth: 6 },
  { x: 60, y: 0, z: 60, halfWidth: 6 },
  { x: 0, y: 0, z: 70, halfWidth: 6 },
  { x: -60, y: 0, z: 60, halfWidth: 6 },
  { x: -70, y: 0, z: 0, halfWidth: 6 },
];

/** Harbour-ish loop: uneven spacing, a hill, one banked corner, a dirt stretch. ~900 m. */
export const HARBOURISH: ControlPoint[] = [
  { x: 0, y: 0, z: -120, halfWidth: 8, surface: 'road' },
  { x: 120, y: 0, z: -130, halfWidth: 8, surface: 'road' },
  { x: 200, y: 2, z: -80, halfWidth: 7, bank: 12, surface: 'road' },
  { x: 210, y: 6, z: 20, halfWidth: 6, bank: 12, surface: 'road' },
  { x: 150, y: 10, z: 90, halfWidth: 6, surface: 'dirt' },
  { x: 40, y: 8, z: 120, halfWidth: 7, surface: 'dirt' },
  { x: -60, y: 4, z: 110, halfWidth: 8, surface: 'road' },
  { x: -150, y: 0, z: 60, halfWidth: 8, bank: -8, surface: 'road' },
  { x: -170, y: 0, z: -30, halfWidth: 9, surface: 'road' },
  { x: -120, y: 0, z: -100, halfWidth: 9, surface: 'ice' },
  { x: -50, y: 0, z: -125, halfWidth: 8, surface: 'road' },
];

/** Bernoulli lemniscate with a bridge: one pass through the crossing at y=0, the other at y=8. */
export function figureEight(points = 24, a = 160): ControlPoint[] {
  const out: ControlPoint[] = [];
  for (let i = 0; i < points; i++) {
    const th = (i / points) * Math.PI * 2;
    const den = 1 + Math.sin(th) ** 2;
    const x = (a * Math.cos(th)) / den;
    const z = (a * Math.sin(th) * Math.cos(th)) / den;
    // bridge bump centred on the second crossing (th = 3π/2), 8 m high
    const d = th - 1.5 * Math.PI;
    const y = 8 * Math.exp(-(d * d) / 0.5);
    out.push({ x, y, z, halfWidth: 6 });
  }
  return out;
}

/** Flat oval with a constant 10° bank everywhere. */
export const BANKED: ControlPoint[] = SQUARE.map((p) => ({ ...p, bank: 10 }));

/** Harbour Loop as shipped. */
import harbourLoopJson from '../tracks/harbour-loop.json';
import type { HazardDef, TrackDefinition } from '../types.ts';
export const HARBOUR_LOOP = harbourLoopJson as TrackDefinition;

/** Deep copy so a test can mutate a definition. */
export function cloneDef(def: TrackDefinition): TrackDefinition {
  return JSON.parse(JSON.stringify(def)) as TrackDefinition;
}

/**
 * The course creatures as the tracks shipped them until 25 Sept 2026, by track id (design §6: Adam
 * took them off every track, "extras out until they can move like real 3D characters"; the system
 * stays for a later return). Kept here so the creature tests still run on the real roads; a creature
 * goes back on its track by putting its line back at the head of the track's `hazards`.
 */
export const CREATURE_SPOTS: Readonly<Record<string, HazardDef>> = {
  'harbour-loop': { id: 'crab', type: 'creature', creature: 'crab', t: 0.36, lateral: 1, period: 7.6, hit: 'spin' },
  'meadow-run': { id: 'goose', type: 'creature', creature: 'goose', t: 0.3, lateral: 1, period: 11, hit: 'spin' },
  'canyon-rush': { id: 'rumblesaur', type: 'creature', creature: 'rumblesaur', t: 0.8, lateral: 1, period: 5.6, hit: 'spin' },
  'frostbite-pass': { id: 'yeti', type: 'creature', creature: 'yeti', t: 0.62, lateral: -1, period: 3.6, hit: 'spin' },
  'boardwalk-nights': { id: 'kraken', type: 'creature', creature: 'kraken', t: 0.42, lateral: 1, period: 7.6, hit: 'spin' },
  'skyline-circuit': { id: 'whale', type: 'creature', creature: 'whale', t: 0.5, lateral: -1, period: 12 },
};

/** A copy of `def` with the creature it shipped with until 25 Sept 2026 back at its spot (CREATURE_SPOTS). */
export function withCreature(def: TrackDefinition): TrackDefinition {
  const d = cloneDef(def);
  const c = CREATURE_SPOTS[def.id];
  if (!c) throw new Error(`no creature spot for ${def.id}`);
  d.hazards = [{ ...c }, ...(d.hazards ?? [])];
  return d;
}

/**
 * Harbour Loop plus the pier jetty it shipped with until 21 Sept 2026, kept here as the
 * two-branch example for branch, feature and shift tests. The real track dropped it:
 * a jetty beside a 16 m road cannot be faster than the road (design §6).
 */
export const HARBOUR_WITH_PIER: TrackDefinition = (() => {
  const d = cloneDef(HARBOUR_LOOP);
  d.shortcuts = [...(d.shortcuts ?? []), {
    id: 'pier', entryT: 0.2896, exitT: 0.3588, risk: 'jump',
    controlPoints: [
      { x: 163.54, y: 0.55, z: -39.99, halfWidth: 5.5, surface: 'road' },
      { x: 169, y: 0.3, z: -30, halfWidth: 5.5, surface: 'road' },
      { x: 176, y: 0.6, z: -10, halfWidth: 5.5, surface: 'road' },
      { x: 175, y: 0.8, z: 10, halfWidth: 5.5, surface: 'road' },
      { x: 169.05, y: 1.28, z: 29.88, halfWidth: 5.5, surface: 'road' },
    ],
  }];
  d.jumps = [{ id: 'pier-ramp', t: 0.3492, shortcut: 'pier', launch: 5, width: 6 }];
  return d;
})();

/** Harbor Loop with a wall at the road's edge (no off-road band): for the barrier-post tests. */
export const HARBOUR_WALLED: TrackDefinition = { ...cloneDef(HARBOUR_LOOP), offroad: false };
/** The walled harbor dressed as a pier (Boardwalk's biome): a solid low edge along its road. */
export const HARBOUR_WALLED_PIER: TrackDefinition = { ...cloneDef(HARBOUR_WALLED), biome: 'boardwalk' };
