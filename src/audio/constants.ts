// audio constants (docs/sops/audio.md). Seconds unless the name says otherwise.
export const AUDIO = Object.freeze({
  /** scheduler: how often the timer runs (ms) and how far ahead it books notes (s) */
  schedulerTickMs: 25,
  scheduleAhead: 0.12,
  /** music bus low-pass on a player hit */
  duckHz: 700,
  duckSeconds: 0.45,
  openHz: 18000,
  /** final-lap lift: semitones up and tempo factor */
  liftSemitones: 2,
  liftTempo: 1.06,
  /** other racers' sounds: full within near, silent beyond far (metres) */
  nearMetres: 12,
  farMetres: 45,
  farGain: 0.35,
  /** other racers are never as loud as the player: their near level */
  otherGain: 0.6,
  /** pitch variation on repeated sfx (±) */
  pitchJitter: 0.03,
  /** engine: fake gearbox */
  gears: 4,
  idleRpm: 1400,
  redlineRpm: 7200,
  /** fraction of the redline a gear drops to after an upshift */
  shiftDrop: 0.62,
  /** engine base frequency at idle rpm (Hz) and the rpm → Hz scale */
  engineIdleHz: 48,
  /** AI engines heard at once */
  aiEngines: 3,
  /** the recorded engine (samples.ts): loop levels by throttle and boost, the drift screech, a near rival */
  engineLoop: Object.freeze({ base: 0.15, throttle: 0.22, boost: 0.08, screech: 0.4, other: 0.18 }),
  master: 0.9,
});
