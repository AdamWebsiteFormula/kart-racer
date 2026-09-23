// Race-manager types. RaceState mirrors docs/schemas/race-state.schema.json plus
// the per-kart tracker fields the rules need. No Three.js in here.
import type { Archetype, InputState, KartEvent, KartState, SpeedClass, Vec3 } from '../kart-controller/types.ts';
import type { CreatureKind, HazardHit, TrackChanged } from '../track-builder/types.ts';

export type RaceMode = 'quick' | 'grandPrix' | 'knockout' | 'timeTrial' | 'daily';
export type RacePhase = 'countdown' | 'racing' | 'finalLap' | 'finished';

export interface RacerConfig {
  racerId: string;
  archetype: Archetype;
  isPlayer?: boolean;
  isGhost?: boolean;
  bodyId?: string;
  skinId?: string;
}

export interface KnockoutConfig {
  setId: string;
  /** 0-based segment index */
  segment: number;
  /** racers kept after this segment */
  cutLine: number;
  /** already out before this segment started */
  eliminated: string[];
}

export interface RaceConfig {
  mode: RaceMode;
  trackId: string;
  speedClass: SpeedClass;
  seed: number;
  /** defaults to the track definition's laps */
  laps?: number;
  racers: RacerConfig[];
  knockout?: KnockoutConfig;
  mirrored?: boolean;
}

/** Race-manager's private per-kart state. Serialisable; index-aligned with karts[]. */
export interface KartTracker {
  gridSlot: number;
  nextCheckpoint: number;
  lastCheckpoint: number;
  prevT: number;
  /** tick of each line crossing after the first, one per completed lap */
  lapTicks: number[];
  /** tick the throttle first went above stuckInputMin during the countdown, or -1 */
  throttleHeldSinceTick: number;
  hazardCooldownRemaining: number;
  /** rank last announced by positionChange */
  shownRank: number;
  /** seconds the current raw rank has held */
  rankHeldSeconds: number;
  wrongWayOn: boolean;
  wrongWaySeconds: number;
  stuckSeconds: number;
  freezeRemaining: number;
  respawnCount: number;
  /** force-finished at the grace cut-off */
  dnf: boolean;
}

export interface FeatureTimer { respawnRemaining: number }

export interface RaceState {
  mode: RaceMode;
  trackId: string;
  speedClass: SpeedClass;
  mirrored: boolean;
  seed: number;
  /** Fixed 120 Hz sim ticks since the race object was created (countdown included) */
  tick: number;
  /** tick the lights went green */
  goTick: number;
  /** seconds since go; negative during the countdown */
  time: number;
  phase: RacePhase;
  lapsTotal: number;
  finalLapShiftFired: boolean;
  knockout?: { setId: string; segment: number; cutLineAt: number; eliminated: string[] };
  pickupStates: FeatureTimer[];
  coinStates: FeatureTimer[];
  karts: KartState[];
  trackers: KartTracker[];
  inputLog: InputState[];
  /** tick the player finished, or -1 */
  playerFinishTick: number;
  /** the leader lap last handed to track.setLap; in state so a restored race does not re-fire it */
  leaderLap: number;
}

export type RaceEvent =
  | { type: 'countdown'; stepsLeft: number }
  | { type: 'go' }
  | { type: 'phase'; phase: RacePhase }
  | { type: 'checkpoint'; racerId: string; index: number }
  | { type: 'lap'; racerId: string; lap: number; isFinal: boolean }
  | { type: 'finish'; racerId: string; rank: number; tick: number; dnf: boolean }
  | { type: 'positionChange'; racerId: string; rank: number }
  | { type: 'wrongWay'; racerId: string; on: boolean }
  | { type: 'respawn'; racerId: string; checkpoint: number }
  | { type: 'hazardHit'; racerId: string; hazardId: string; hit: HazardHit }
  | { type: 'pickup'; racerId: string; index: number }
  | { type: 'coin'; racerId: string; coins: number }
  | { type: 'trackChanged'; event: TrackChanged }
  | { type: 'kart'; racerId: string; event: KartEvent }
  | { type: 'creature'; id: string; kind: CreatureKind; action: string; position: Vec3 }
  | { type: 'raceFinished' };

export interface RaceResultRow {
  racerId: string;
  rank: number;
  finishTick: number;
  timeMs: number;
  lapTimesMs: number[];
  dnf: boolean;
}

export interface RaceResults {
  mode: RaceMode;
  trackId: string;
  speedClass: SpeedClass;
  seed: number;
  goTick: number;
  ranks: RaceResultRow[];
}

// ---- series layer ----

export interface GrandPrixState {
  kind: 'grandPrix';
  cupId: string;
  speedClass: SpeedClass;
  trackIds: string[];
  /** next race to run */
  raceIndex: number;
  racers: RacerConfig[];
  points: Record<string, number>;
  bestFinish: Record<string, number>;
  lastFinish: Record<string, number>;
  seed: number;
}

export interface KnockoutState {
  kind: 'knockout';
  setId: string;
  speedClass: SpeedClass;
  trackIds: string[];
  cutLines: number[];
  lapsPerSegment: number;
  /** next segment to run */
  segment: number;
  racers: RacerConfig[];
  eliminated: string[];
  /** rank per racer once decided (winner = 1) */
  placings: Record<string, number>;
  seed: number;
}

export type SeriesState = GrandPrixState | KnockoutState;

export interface GrandPrixTable {
  rows: { racerId: string; points: number; rank: number }[];
  stars: number;
}
