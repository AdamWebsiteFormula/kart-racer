// Reads the `ai` defaults out of docs/schemas/kart.schema.json into one frozen
// object. No magic numbers anywhere else in the driver.
import schema from '../../docs/schemas/kart.schema.json';
import type { SpeedClass } from '../kart-controller/types.ts';
import type { AiDifficulty, AiProfile } from './types.ts';

export interface AiConstants {
  line: {
    lookAheadGain: number; lookAheadMin: number; lookAheadMax: number;
    turnNearSeconds: number; turnFarSeconds: number;
    insideGain: number; insideBiasMax: number; lateralMaxFraction: number; laneHalfFraction: number;
    edgeMargin: number; aimClampMargin: number; laneRate: number; narrowRoad: number; narrowLookAhead: number; narrowMargin: number; outsideFraction: number; declineFraction: number; branchCommitMetres: number; edgeLift: number; edgeShed: number; airMargin: number; trickBend: number;
    wanderAmpMin: number; wanderAmpMax: number; wanderPeriodMin: number; wanderPeriodMax: number;
  };
  steer: { kP: number; kD: number; dErrMax: number; offroadGain: number; noiseSmoothing: number; kLat: number; kLatMax: number };
  avoid: {
    hazardLookAhead: number; rollingLookAhead: number; hazardLateral: number; dodgeClearance: number; avoidLookAhead: number; stoppedLookAhead: number; slowKartSpeed: number; stoppedClearance: number;
    passDistance: number; passClosing: number; touchDistance: number; spawnBehind: number; seekDistance: number; seekLateral: number; padSkill: number;
  };
  drift: {
    maxHold: number; cooldown: number; abortCooldown: number; hopCommit: number; hopCommitStick: number; chargeSnap: number; chargeSecondsAhead: number; startYawFraction: number; exitYawFraction: number;
    overRotate: number; aligned: number; alignedTurn: number; edgeMargin: number; outsideSlack: number; aimGain: number; tierBySkill: number[];
  };
  recover: { stuckSeconds: number; reverseSeconds: number; cooldownSeconds: number };
  rubber: { min: number; max: number; deadZone: number; scale: number; powerFrom: number; skillGain: number; shortcutRb: number; fieldPaceSpread: number };
  items: {
    forwardRange: number; forwardCone: number; homingRange: number; rearRange: number;
    defenceRadius: number; holdMax: number; speedItemGap: number; straightTurn: number;
    anchorMin: number; anchorMax: number; runnerRange: number; springRange: number; equaliserMinRank: number;
  };
  autopilot: { skill: number; power: number };
  profiles: Record<AiDifficulty, AiProfile>;
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

function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object') for (const v of Object.values(o as object)) deepFreeze(v);
  return Object.freeze(o);
}

export const AI: Readonly<AiConstants> = deepFreeze(walkDefaults(schema.properties.ai.properties) as unknown as AiConstants);
export const PROFILES = AI.profiles;

/** Difficulty comes from the speed class (ai-driver Decisions 2026-09-21). */
export function difficultyFor(cc: SpeedClass): AiDifficulty {
  return cc === 50 ? 'easy' : cc === 100 ? 'normal' : 'hard';
}

/** Drift tier the driver aims for at this skill: 1, 2 or 3. */
export function targetTierFor(skill: number): number {
  const [a, b] = AI.drift.tierBySkill;
  return skill < a ? 1 : skill < b ? 2 : 3;
}
