// The shape of a sound recipe (scripts/sfx/recipes.ts): what a built sound is made of, as data, so the
// builder (build.py) remakes the same file and the tests can hold the manifest to it. Times in seconds,
// levels in dB, frequencies in Hz, breakpoints as [[t, value], ...].

/** Breakpoints over time: [[seconds, value], ...], linear between them (frequencies: in log space). */
export type Curve = number | readonly (readonly [number, number])[];

/** One processing step (dsp.py `fx`), applied in order. */
export type Fx =
  | { op: 'gain'; db: number }
  | { op: 'hp' | 'lp'; hz: number; q?: number; order?: number }
  | { op: 'bp'; hz: number; q?: number; order?: number }
  | { op: 'peak'; hz: number; db: number; q?: number }
  | { op: 'lowshelf' | 'highshelf'; hz: number; db: number }
  | { op: 'sweep'; mode: 'lp' | 'bp' | 'hp'; hz: Curve; q?: Curve }
  /** resample: `st` semitones higher and shorter, like tape */
  | { op: 'pitch'; st: number }
  /** tape-style pitch that moves over time: semitones against output time */
  | { op: 'bend'; st: readonly (readonly [number, number])[] }
  | { op: 'trim'; from?: number; to?: number }
  | { op: 'fade'; in?: number; out?: number }
  /** gain breakpoints (linear) */
  | { op: 'env'; pts: readonly (readonly [number, number])[] }
  | { op: 'reverse' }
  /** tanh saturation (peak kept) */
  | { op: 'drive'; amount: number }
  /** a synthetic hall: decay `seconds` to -60 dB, `mix` 0..1 (equal power) */
  | { op: 'reverb'; seconds: number; mix: number; pre?: number; hp?: number; lp?: number; seed?: number; damp?: number; wetGain?: number }
  | { op: 'comp'; threshold: number; ratio: number; attack?: number; release?: number; knee?: number }
  | { op: 'limit'; ceiling?: number; lookahead?: number; release?: number }
  | { op: 'width'; amount: number }
  | { op: 'pan'; pos: number }
  | { op: 'mono' }
  | { op: 'normalize'; db: number }
  | { op: 'delay'; time: number; feedback?: number; mix?: number; count?: number; pingpong?: boolean }
  /** a moving comb (the jet-flyby swirl): delay in ms over time */
  | { op: 'flanger'; ms: Curve; mix?: number; feedback?: number }
  /** a seamless loop tiled end to start up to `to` seconds (so a loop layer outlasts the wrap's crossfade) */
  | { op: 'repeat'; to: number }
  /** a random amplitude wobble (turbulence) */
  | { op: 'flutter'; depth: number; rate?: number; seed?: number };

/** Code-made sound (dsp.py SYNTHS), seeded so it is the same every build. */
export type Synth = 'noise' | 'whoosh' | 'tone' | 'fm' | 'crackle' | 'silence' | 'flame' | 'engine';

export type Source =
  /** a file in the approved packs (~/.cache/rascal-sfx/packs): kenney/* and vsco/* (CC0), cascadia/* (Racing Sound Pack, paid license) */
  | { pack: string }
  /** a file from this repo's history (the game's own ElevenLabs takes, used as a layer) */
  | { git: string; path: string }
  | { synth: Synth; args: Readonly<Record<string, number | string | boolean | Curve | readonly number[]>> };

export interface Layer { src: Source; at?: number; fx?: readonly Fx[] }

export interface Recipe {
  /** the game's sound id (src/audio/types.ts SfxId), or a new one listed in the report for wiring */
  id: string;
  /** what the sound should be, in plain words: the judge's brief (used for the shipped sound too, so the compare is fair) */
  brief: string;
  /** a loop: its exact length in seconds, made seamless (the material must run `xfade` longer) */
  loop?: number;
  /** a loop's baked crossfade at the wrap, seconds (default 0.06) */
  xfade?: number;
  layers: readonly Layer[];
  /** processing on the summed layers */
  master?: readonly Fx[];
  /** why it replaced what shipped: the judge's scores, the local ears, the date */
  why: string;
}
