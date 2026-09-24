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
  /** other racers' sounds: full within near, silent beyond far (metres), a smooth fall between (distanceGain) */
  nearMetres: 12,
  farMetres: 45,
  /** other racers are never as loud as the player: their near level */
  otherGain: 0.6,
  /** pitch variation on repeated sfx (±); musical and menu cues never vary (NO_JITTER in audio.ts) */
  pitchJitter: 0.03,
  /** each rival's engine sits this far off the others in pitch (±), so three never phase together */
  racerPitch: 0.02,
  /** voices: at most this many of one sound at once, and this many sounds in all (priority stings aside) */
  voicesPerSound: 3,
  voicesTotal: 24,
  /** no recording is levelled so loud that its sample peak passes this */
  peakCeiling: 0.9,
  /** the music bus's presence dip (a peaking filter): centre Hz, width Q, depth dB */
  musicPocket: Object.freeze({ hz: 2500, q: 0.8, db: -3 }),
  /** the music dips by this factor under a big sound: down in `down` s, back over `up` s */
  musicDuck: Object.freeze({ gain: 0.5, down: 0.05, up: 0.4 }),
  /** the Final Lap Shift holds the music down (about 9 dB) for this share of its own length, then lets it back under the shimmer */
  shiftDuck: Object.freeze({ gain: 0.35, hold: 0.6 }),
  /** the roulette's ticks: `fast` apart while it spins, slowing to `slow` as its `seconds` run out */
  roulette: Object.freeze({ seconds: 1.5, fast: 0.06, slow: 0.22 }),
  /** the recorded engine's low-pass: `base` Hz at idle, opening `perRpm` Hz for every rpm above it */
  engineCutoff: Object.freeze({ base: 2500, perRpm: 0.9 }),
  /** equal-power crossfades baked into each loop's wrap (s): engine and rumble loops, songs */
  loopFade: 0.03,
  songFade: 0.012,
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
  engineLoop: Object.freeze({ base: 0.115, throttle: 0.17, boost: 0.062, screech: 0.4, other: 0.14 }),
  /** the off-road rumble under the player's wheels (dirt, mud) at top speed: the recorded loop, the synth noise and its low-pass (Hz) */
  offroad: Object.freeze({ loop: 0.35, synth: 0.09, synthHz: 320 }),
  /** engine voice per class (engine.ts classVoice): loop rate and low-pass brightness */
  engineClass: Object.freeze({
    light: Object.freeze({ pitch: 1.12, bright: 1.3 }),
    medium: Object.freeze({ pitch: 1, bright: 1 }),
    heavy: Object.freeze({ pitch: 0.84, bright: 0.72 }),
  }),
  /** a boost's engine rev: it falls away over `tau` s; the loops climb by up to `pitch` and swell by up to `gain` */
  boostRev: Object.freeze({ tau: 0.35, pitch: 0.12, gain: 0.1 }),
  /** the wheel loops under the player (engine.ts wheelSound), at full speed */
  wheels: Object.freeze({ offroad: 0.35, 'offroad-sand': 0.35, 'offroad-snow': 0.4, 'road-ice': 0.25, 'road-wood': 0.12, 'rail-grind': 0.3 } as Record<string, number>),
  /** the drift sparks' crackle (engine.ts sparkLayer): its level, and its share of that per spark tier */
  sparks: Object.freeze({ level: 0.35, tiers: Object.freeze([0.5, 0.75, 1]) }),
  /** the pause menu: the music drops to this share of its level behind this low-pass (Hz), over `seconds` */
  pause: Object.freeze({ music: 0.3, hz: 1200, seconds: 0.15 }),
  /** the race song fades this fast when the player crosses the line, so the finish sting plays alone */
  finishFade: 0.25,
  /** the drift spark tiers' zaps (blue, orange, purple) also climb in pitch: two semitones, then four */
  tierRates: Object.freeze([1, 1.12, 1.26]),
  /** the master gain at full slider; over 1 because the recordings are levelled with headroom and the limiter holds the peaks */
  master: 1.1,
  /** the whole mix's low-pass before the dynamics (Hz): keeps inter-sample peaks under the limiter's ceiling */
  masterLowpassHz: 16000,
  /** the output limiter's threshold (dB) */
  limiterDb: -6,
  /** the worst place that still earns the finish fanfare outside a Knockout (the podium) */
  podium: 3,
});
