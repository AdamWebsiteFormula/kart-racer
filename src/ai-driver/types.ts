// AI driver types. AiMemory is the per-kart state the driver keeps between ticks:
// plain data, index-aligned with RaceState.karts[], serialisable so a saved race
// resumes byte for byte. No Three.js in here.
import type { TrackSample } from '../kart-controller/types.ts';

export type AiDifficulty = 'easy' | 'normal' | 'hard';

/** One difficulty profile (kart.schema.json ai.profiles). */
export interface AiProfile {
  skill: number;
  power: number;
  noise: number;
  reactionMin: number;
  reactionMax: number;
  driftThreshold: number;
  easeThrottle: number;
  startPressMean: number;
  startPressSpread: number;
  shortcutSkill: number;
  trickChance: number;
}

/** kart.schema.json $defs.aiPersonality */
export interface AiPersonality {
  /** −1..1, fraction of laneHalf */
  lateralBias: number;
  /** 0..1, roll threshold for shortcuts and passes */
  aggression: number;
  /** 0..1, roll threshold for starting a drift */
  driftUse: number;
}

export type RecoveryPhase = 'none' | 'reverse' | 'cooldown';

export interface AiMemory {
  /** mulberry32 state, uint32 */
  rng: number;
  personality: AiPersonality;
  /** seeded per-race pace governor, 1 − fieldPaceSpread .. 1 */
  fieldPace: number;
  /** seconds before go the throttle goes down */
  startPress: number;
  wanderAmp: number;
  wanderPeriod: number;
  wanderPhase: number;
  /** PD previous heading error */
  prevErr: number;
  /** low-passed steering noise */
  noise: number;
  /** rubber band multiplier, mirrored to karts[i].ai.rubberBand */
  rb: number;
  skill: number;
  powerCap: number;
  /** seconds the current drift has been held */
  driftHold: number;
  driftCooldown: number;
  /** −1 | 0 | 1 while drifting */
  driftDir: number;
  trickDone: boolean;
  recovery: RecoveryPhase;
  recoverTimer: number;
  stuckSeconds: number;
  /** seconds left before a newly held item may be used */
  reactionRemaining: number;
  lastItem: string;
  /** seconds the current item has been held */
  itemHold: number;
  /** branch index chosen for the next shortcut entry, 0 = none */
  branchChoice: number;
  /** lateral target from last tick, for smoothing */
  lateral: number;
}

/** Allocation-free scratch samples for the hot path. */
export interface Scratch {
  ahead: TrackSample;
  near: TrackSample;
  far: TrackSample;
  here: TrackSample;
}

export function emptySample(): TrackSample {
  return { position: [0, 0, 0], tangent: [0, 0, 1], normal: [0, 1, 0], groundY: 0, halfWidth: 1, surface: 'road', gripScale: 1 };
}

export function makeScratch(): Scratch {
  return { ahead: emptySample(), near: emptySample(), far: emptySample(), here: emptySample() };
}
