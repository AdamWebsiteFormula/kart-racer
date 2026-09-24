// Engine sound maths: speed → rpm through a fake gearbox, rpm → pitch. Pure.
import type { KartState } from '../kart-controller/types.ts';
import { AUDIO } from './constants.ts';

/** Which gear (0-based) a speed fraction sits in; gears are equal slices of top speed. */
export function gearFor(fraction: number): number {
  const f = Math.min(0.999, Math.max(0, fraction));
  return Math.floor(f * AUDIO.gears);
}

/**
 * RPM for |speed| / topSpeed. Inside each gear the revs climb from the shift-drop point to the
 * redline, so accelerating sounds like a kart changing up, not a siren. Reverse sits near idle.
 */
export function rpmFor(speed: number, topSpeed: number, boosting = false): number {
  const { idleRpm, redlineRpm, shiftDrop, gears } = AUDIO;
  if (!(topSpeed > 0)) return idleRpm;
  if (speed < 0) return idleRpm + (redlineRpm - idleRpm) * 0.25 * Math.min(1, -speed / topSpeed);
  const f = Math.min(1.2, speed / topSpeed);
  if (f <= 0.02) return idleRpm;
  const g = gearFor(f);
  const inGear = Math.min(1, (f - g / gears) * gears); // 0..1 through this gear
  const floor = g === 0 ? idleRpm : redlineRpm * shiftDrop;
  const rpm = floor + (redlineRpm - floor) * inGear;
  return Math.min(redlineRpm * (boosting ? 1.08 : 1), boosting ? rpm * 1.08 : rpm);
}

/** Oscillator base frequency for an rpm (linear, idle → engineIdleHz). */
export function engineHz(rpm: number): number {
  return AUDIO.engineIdleHz * (rpm / AUDIO.idleRpm);
}

/**
 * How loud the off-road rumble is, 0..1: the wheels on dirt or mud (the land beside the road and
 * the mud patches report `dirt` and `mud`), growing with speed. Airborne or on the road: none.
 */
export function offroadAmount(k: Pick<KartState, 'grounded' | 'surface' | 'speed'>, topSpeed: number): number {
  if (!k.grounded || (k.surface !== 'dirt' && k.surface !== 'mud') || !(topSpeed > 0)) return 0;
  return Math.min(1, Math.abs(k.speed) / topSpeed);
}

/** The recorded engine's low-pass cutoff (Hz) at an rpm: `base` at idle, opening as the revs climb. */
export function engineCutoff(rpm: number): number {
  const c = AUDIO.engineCutoff;
  return c.base + c.perRpm * Math.max(0, rpm - AUDIO.idleRpm);
}

/**
 * A racer's own engine pitch, 1 ± `AUDIO.racerPitch`, fixed by their id: three rivals on the same
 * recording never sit on the same note, and each keeps theirs from frame to frame.
 */
export function racerPitch(racerId: string): number {
  let h = 2166136261;
  for (let i = 0; i < racerId.length; i++) h = Math.imul(h ^ racerId.charCodeAt(i), 16777619) >>> 0;
  return 1 + ((h % 2001) / 1000 - 1) * AUDIO.racerPitch;
}

// ---------------------------------------------------------------- class, boost rev, wheels, sparks

export type EngineClass = 'light' | 'medium' | 'heavy';
/** Each cast racer's class (design §4; the same as ui-hud's CAST, held equal by a test). */
const CLASS_OF: Readonly<Record<string, EngineClass>> = Object.freeze({
  pip: 'light', momo: 'light', nova: 'light', juniper: 'medium', otto: 'medium', sprocket: 'medium', boulder: 'heavy', gus: 'heavy',
});
export const engineClass = (racerId: string): EngineClass => CLASS_OF[racerId] ?? 'medium';

/**
 * A racer's engine voice by class: a light kart buzzes higher and brighter, a heavy one sits lower
 * and darker (`pitch` scales the loops' rate, `bright` the low-pass cutoff).
 */
export function classVoice(racerId: string): { pitch: number; bright: number } {
  return AUDIO.engineClass[engineClass(racerId)];
}

/**
 * The rev that rides a boost's whoosh: 1 the moment a boost starts, falling away over
 * `AUDIO.boostRev.tau` (0 before it starts). The engine climbs and swells by it.
 */
export function boostRev(since: number): number {
  return since >= 0 ? Math.exp(-since / AUDIO.boostRev.tau) : 0;
}

/** The land beside the road, per course (their biomes, design §6): sand, grass and dirt, snow. */
export const OFFROAD_BY_TRACK: Readonly<Record<string, string>> = Object.freeze({
  'harbour-loop': 'offroad-sand', 'canyon-rush': 'offroad-sand', 'meadow-run': 'offroad', 'frostbite-pass': 'offroad-snow',
});
/** A course whose road itself sounds (the boardwalk's planks). */
export const ROAD_BY_TRACK: Readonly<Record<string, string>> = Object.freeze({ 'boardwalk-nights': 'road-wood' });

/**
 * What the player's wheels roll on and how loud, 0..1 with speed: the course's own off-road on
 * dirt and mud, ice on ice, the rail's grind on the rail, a plank road's clatter on the road.
 * Airborne or stopped: nothing.
 */
export function wheelSound(k: Pick<KartState, 'grounded' | 'surface' | 'speed'>, trackId: string, topSpeed: number): { id: string | null; amount: number } {
  if (!k.grounded || !(topSpeed > 0)) return { id: null, amount: 0 };
  const f = Math.min(1, Math.abs(k.speed) / topSpeed);
  switch (k.surface) {
    case 'dirt': case 'mud': return { id: OFFROAD_BY_TRACK[trackId] ?? 'offroad', amount: f };
    case 'ice': return { id: 'road-ice', amount: f };
    case 'rail': return { id: 'rail-grind', amount: f > 0.05 ? 0.4 + 0.6 * f : 0 };
    default: { const road = ROAD_BY_TRACK[trackId]; return road ? { id: road, amount: f } : { id: null, amount: 0 }; }
  }
}

/**
 * The drift sparks' crackle under the wheels: silent until the first spark tier, then louder and
 * higher with each (blue, orange, purple), as the sparks grow. Only while drifting on the ground.
 */
export function sparkLayer(k: Pick<KartState, 'grounded' | 'drift'>): { gain: number; rate: number } {
  const tier = k.drift.active && k.grounded ? Math.min(3, k.drift.tier) : 0;
  if (tier < 1) return { gain: 0, rate: 1 };
  return { gain: AUDIO.sparks.tiers[tier - 1], rate: AUDIO.tierRates[tier - 1] };
}
