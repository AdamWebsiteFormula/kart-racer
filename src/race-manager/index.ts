// Public surface of the race manager. Headless sim only; nothing here imports Three.js.
export { RaceManager, ticksToMs } from './race.ts';
export { RACE, GP_POINTS_BY_RANK, KNOCKOUT_CUT_LINES, KNOCKOUT_LAPS_PER_SEGMENT, STAR_FRACTIONS, type RaceConstants } from './constants.ts';
export { GO_TICK, STEP_TICKS } from './countdown.ts';
export { distanceAlong } from './checkpoints.ts';
export { alongTrack } from './wrongway.ts';
export {
  applyResults, createGrandPrix, createKnockout, grandPrixTable, isDone, knockoutWinner, nextRace, starThresholdsFor,
  type CupDef, type KnockoutSetDef, type SeriesEvent,
} from './series.ts';
export * from './types.ts';
