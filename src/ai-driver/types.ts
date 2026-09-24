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
  /** m/s over the corner speed before the brake comes on */
  brakeAbove: number;
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
export type DriftEndReason = 'none' | 'tier' | 'over' | 'aligned' | 'edge' | 'hold' | 'abort' | 'air';

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
  /** tier this drift lets go at: the target for the skill, capped by what the bend allows */
  driftTier: number;
  /** why the last drift ended (tests and tuning) */
  driftEndReason: DriftEndReason;
  /** the trick roll for the current jump has been made */
  trickRolled: boolean;
  trickDone: boolean;
  recovery: RecoveryPhase;
  recoverTimer: number;
  stuckSeconds: number;
  /** seconds left before a newly held item may be used */
  reactionRemaining: number;
  lastItem: string;
  /** seconds the current item has been held */
  itemHold: number;
  /** the item button was down last tick (a tap is one tick down, one tick up) */
  itemPressed: boolean;
  /** holding a trailable item behind on purpose, as a shield */
  itemTrailing: boolean;
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
  short: TrackSample;
  tmp: TrackSample;
}

/** What readLine() learns about the road ahead this tick. Reused, never reallocated. */
export interface LineInfo {
  /** look-ahead metres */
  L: number;
  /** signed heading change (rad, positive = right) over turnNearSeconds / turnFarSeconds of travel */
  turnNear: number;
  turnFar: number;
  /** metres ahead the near probe was taken, so turnNear / probeNear is a curvature */
  probeNear: number;
  /** peak curvature ahead (rad/m): the larger of the short and the near probe */
  kappa: number;
  /** curvature right under the nose (rad/m), from the lookAheadMin probe */
  kappaShort: number;
  /** heading error to the road direction lookAheadMin ahead (rad, positive = road bends right of the nose) */
  roadErr: number;
  halfWidth: number;
  /** branch the look-ahead samples on: the chosen shortcut or the kart's own */
  branch: number;
  /** the kart's own signed lateral, metres right of its centreline */
  myLat: number;
  /** on a shortcut, heading into one, or within L of a branch entry or exit */
  nearBranch: boolean;
  /** halfWidth below narrowRoad: no passing, no drifting, short look-ahead */
  narrow: boolean;
  /** a bump or a ramp within the near probe: the kart will be airborne there, and turn with its air steer only */
  airAhead: boolean;
  /** open branch whose entry is within L ahead on the main line, 0 none */
  branchAhead: number;
  /** which side of the main line that branch peels off to: −1 left, 1 right */
  branchSide: number;
}

export function emptySample(): TrackSample {
  return { position: [0, 0, 0], tangent: [0, 0, 1], normal: [0, 1, 0], groundY: 0, halfWidth: 1, surface: 'road', gripScale: 1 };
}

export function makeScratch(): Scratch {
  return { ahead: emptySample(), near: emptySample(), far: emptySample(), here: emptySample(), short: emptySample(), tmp: emptySample() };
}

export function emptyLine(): LineInfo {
  return { L: 0, turnNear: 0, turnFar: 0, probeNear: 1, kappa: 0, kappaShort: 0, roadErr: 0, halfWidth: 1, branch: 0, myLat: 0, nearBranch: false, narrow: false, airAhead: false, branchAhead: 0, branchSide: 0 };
}

/** Item roles from item.schema.json; the items session supplies the id → role map. */
export type ItemRole =
  | 'forward' | 'homing' | 'rearDrop' | 'deception' | 'defenceArea' | 'defenceHeld' | 'speed' | 'equaliser' | 'chaos'
  | 'ride' | 'jump' | 'tether' | 'runner';
