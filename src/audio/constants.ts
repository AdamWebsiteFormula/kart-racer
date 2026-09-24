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
  /** the off-road rumble under the player's wheels (dirt, mud) at top speed: the recorded loop, the synth noise and its low-pass (Hz) */
  offroad: Object.freeze({ loop: 0.35, synth: 0.09, synthHz: 320 }),
  /** the pause menu: the music drops to this share of its level behind this low-pass (Hz), over `seconds` */
  pause: Object.freeze({ music: 0.3, hz: 1200, seconds: 0.15 }),
  /** the race song fades this fast when the player crosses the line, so the finish sting plays alone */
  finishFade: 0.25,
  /** the drift spark tiers' zaps (blue, orange, purple) also climb in pitch: two semitones, then four */
  tierRates: Object.freeze([1, 1.12, 1.26]),
  master: 0.9,
  /** the worst place that still earns the finish fanfare outside a Knockout (the podium) */
  podium: 3,
});
