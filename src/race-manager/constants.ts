// Race constants come from the `constants` defaults in docs/schemas/race-state.schema.json.
// Kart, track and cup numbers are read from their own schemas and never redefined here.
import raceSchema from '../../docs/schemas/race-state.schema.json';
import cupsSchema from '../../docs/schemas/cups.schema.json';

export interface RaceConstants {
  countdownSteps: number; countdownStepSeconds: number; playerGridSlot: number;
  wrongWaySpeed: number; wrongWayHoldSeconds: number; wrongWayClearSpeed: number;
  stuckSeconds: number; stuckSpeed: number; stuckInputMin: number;
  respawnFreezeSeconds: number; respawnLift: number;
  rankDebounceSeconds: number; finishGraceSeconds: number;
  checkpointResyncSectors: number; teleportGuardFraction: number;
  hazardSlowTo: number; hazardSlowSeconds: number; hazardBumpLateral: number; hazardCooldownSeconds: number;
  pickupRespawnSeconds: number; coinRespawnSeconds: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function walkDefaults(props: Record<string, any>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, def] of Object.entries(props)) {
    if ('default' in def) out[key] = structuredClone(def.default);
    else if (def.type === 'object' && def.properties) out[key] = walkDefaults(def.properties);
  }
  return out;
}

export const RACE: Readonly<RaceConstants> = Object.freeze(
  walkDefaults(raceSchema.properties.constants.properties) as unknown as RaceConstants,
);

/** From cups.schema.json. Points for ranks 1..8. */
export const GP_POINTS_BY_RANK: readonly number[] = Object.freeze([...cupsSchema.properties.gpPointsByRank.default]);
/** From cups.schema.json. Racers kept after each Knockout segment. */
export const KNOCKOUT_CUT_LINES: readonly number[] = Object.freeze([...cupsSchema.properties.knockoutSets.items.properties.cutLines.default]);
export const KNOCKOUT_LAPS_PER_SEGMENT: number = cupsSchema.properties.knockoutSets.items.properties.lapsPerSegment.default;
/** Star thresholds as fractions of the cup maximum (Adam, 19 Sept 2026: 60 / 80 / 100 %). */
export const STAR_FRACTIONS: readonly number[] = Object.freeze([0.6, 0.8, 1.0]);
