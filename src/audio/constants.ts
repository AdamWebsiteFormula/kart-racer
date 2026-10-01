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
  engineLoop: Object.freeze({ base: 0.27, throttle: 0.46, boost: 0.15, screech: 0.4, other: 0.3 }), // (0.115, 0.17, 0.062, 0.14 until 30 Sept 2026, Adam: the karts "don't rev or make any noise really")
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
  /**
   * The engine's own rev (kart-controller rev.ts; engine.ts engineRpm, engineDrive), mapped onto the
   * engine loops (engine-idle, engine-mid, engine-high: samples.ts ENGINE_BANDS; any new recordings
   * fit here): the free rev's top, the limiter (rpm; under the gearbox's redline, so a boost still
   * climbs past it). At the limiter the player's engine flutters (samples.ts LoopEngine): a sawtooth at
   * `flutterHz` (rev.ts ENGINE_REV.limitHz) chops its level by up to ±`flutterChop` and its pitch by
   * ±`flutterRate`. A rival revving on the grid swells by up to `rivalLift` of its level. Pops (a
   * let-off after a high rev, a start held too early): the synth pop's level (sfx.ts ENGINE_POP; a
   * thump under it from `thumpFrom` of a full pop), a rival's share of it, at most `popsPerSecond` a kart.
   */
  engineRev: Object.freeze({ limiterRpm: 7000, flutterHz: 11, flutterChop: 0.25, flutterRate: 0.025, rivalLift: 0.5, pop: 0.35, rivalPop: 0.3, thumpFrom: 0.92, popsPerSecond: 12 }),
  /** the wheel loops under the player (engine.ts wheelSound), at full speed */
  wheels: Object.freeze({ offroad: 0.35, 'offroad-sand': 0.35, 'offroad-snow': 0.4, 'road-ice': 0.25, 'road-wood': 0.12, 'rail-grind': 0.3 } as Record<string, number>),
  /** the drift sparks' crackle (engine.ts sparkLayer): its level, and its share of that per spark tier */
  sparks: Object.freeze({ level: 0.35, tiers: Object.freeze([0.5, 0.75, 1]) }),
  /** the course's own quiet bed of its world (waves, wind, birds: Adam, 28 Sept 2026), under the engines: the manifest's `amb-<trackId>` (samples.ts ambienceId), when it has one */
  ambience: 0.2,
  /** the pause menu: the music drops to this share of its level behind this low-pass (Hz), over `seconds` */
  pause: Object.freeze({ music: 0.3, hz: 1200, seconds: 0.15 }),
  /** the race song fades this fast when the player crosses the line, so the finish sting plays alone */
  finishFade: 0.25,
  /**
   * The course intro's music (introCue.ts; Adam, 28 Sept 2026: "There should be music when clicking to start a new race
   * that happens before the race begins, like Mario Kart World does"). It plays under the flight and is silent `breath`
   * before the countdown's first beep (World's opening piece ends on a held chord as its flyover ends; its countdown has
   * only the beeps). A cue longer than its room fades out over `fadeBeats` beats (`fadeMin` to `fadeMax` seconds) that
   * end on a bar line of its own, with at least `minFull` at full level before the fade; a skip fades it in `skipFade`.
   * A recording that lands with less than `minPlay` of its room left does not start.
   */
  intro: Object.freeze({ breath: 0.4, fadeBeats: 2, fadeMin: 0.6, fadeMax: 1.2, minFull: 0.4, skipFade: 0.15, minPlay: 1.2 }),
  /**
   * A race picked (World's start press: a falling whoosh over its confirm as the menu music stops): the manifest's `pick`
   * sting when the music lab's is in, else the slipstream's falling whoosh; each at this gain (over its mix level).
   */
  sting: Object.freeze({ id: 'pick', gain: 1, standIn: 'slipstream', standInGain: 0.7 }),
  /**
   * A song's recording due within `songWait` of its start is waited for, with no synth stand-in (28 Sept 2026: a
   * synth flash, then the switch to the recording, sounds cheap; the title's file comes down while the start screen
   * waits, so after the press only its decode is left). One waited for that has still not started `songGiveUp` after
   * its start (a stalled line) gets the synth after all. `songDecode`: a song's decode and analysis, as the bank
   * reckons it (samples.ts readyIn).
   */
  songWait: 0.5,
  songGiveUp: 1.5,
  songDecode: 0.25,
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
  /** the racers' voice lines on their bus, over the level every recording is cut to (samples.ts cutSfx) */
  voiceLevel: 1,
});
