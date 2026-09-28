// Building blocks for the sci-fi item candidates (scifi/items.ts): the same plain data build.py reads (../types.ts),
// plus the sources and ops the sci-fi toolkit adds (synth.py). Pure data helpers: each returns plain objects.

/** A processing step: any op build.py knows (../types.ts Fx) or synth.py adds (chorus, phaser, convolve, sat, doppler...). */
export type Op = { op: string } & Record<string, unknown>;
export type Src = Record<string, unknown>;
export interface Layer { src: Src; at?: number; fx?: readonly Op[] }

/** One candidate: a recipe (as in ../recipes.ts) with its own file name and a plain description for the listening page. */
export interface Cand {
  /** the game's sound id, or a proposed new one (see NEW_IDS) */
  id: string;
  /** the candidate's file name, e.g. "throwA" */
  name: string;
  /** what it is, in a sentence or two, for Adam's listening page */
  what: string;
  /** the brief: what the sound should be (for a judge, and the recipe's brief when installed) */
  brief: string;
  why: string;
  loop?: number;
  xfade?: number;
  layers: readonly Layer[];
  master?: readonly Op[];
}

/** Freesound CC0 recordings (sources.py records name, author and licence beside each). */
export const FS = (id: number): Src => ({ freesound: id });
/** Apple's Final Cut Pro library: a minor, heavily processed ingredient only. */
export const FCP = (rel: string): Src => ({ fcp: rel });
export const PK = (path: string): Src => ({ pack: path });
export const KS = (f: string): Src => PK(`kenney/kenney_sci-fi-sounds/Audio/${f}`);
export const KI = (f: string): Src => PK(`kenney/kenney_impact-sounds/Audio/${f}`);
export const KU = (f: string): Src => PK(`kenney/kenney_ui-audio/Audio/${f}`);
export const KF = (f: string): Src => PK(`kenney/kenney_interface-sounds/Audio/${f}`);
export const VS = (f: string): Src => PK(`vsco/${f}`);
/** The game's own ElevenLabs takes, pinned (as ../parts.ts). */
export const EL = (id: string): Src => ({ git: '979e511', path: `public/audio/sfx/${id}.mp3` });

export const lvl = (db: number): Op[] => [{ op: 'normalize', db: 0 }, { op: 'gain', db }];
/** A recording (or pack file) as a layer: its processing, then its level (peak-normalised, then `db`). */
export const rec = (src: Src, db: number, fx: Op[] = [], at = 0): Layer => ({ at, src, fx: [...fx, ...lvl(db)] });
/** A synth as a layer. */
export const syn = (synth: string, args: Record<string, unknown>, db: number, fx: Op[] = [], at = 0): Layer => ({ at, src: { synth, args }, fx: [...fx, ...lvl(db)] });
export const OUT: Op = { op: 'limit', ceiling: -1 };

// common processing
export const trim = (from: number, to?: number): Op => (to === undefined ? { op: 'trim', from } : { op: 'trim', from, to });
export const fade = (i: number, o: number): Op => ({ op: 'fade', in: i, out: o });
export const env = (pts: [number, number][]): Op => ({ op: 'env', pts });
export const hp = (hz: number, q?: number): Op => (q ? { op: 'hp', hz, q } : { op: 'hp', hz });
/** a steeper high-pass (24 dB an octave) */
export const hp4 = (hz: number): Op => ({ op: 'hp', hz, order: 4 });
/** end the sound by `len` seconds, its last `out` faded (reverb tails kept short for a sound heard often) */
export const cap = (len: number, out = len * 0.35): Op[] => [{ op: 'trim', to: len }, { op: 'fade', out }];
export const lp = (hz: number, q?: number): Op => (q ? { op: 'lp', hz, q } : { op: 'lp', hz });
export const bp = (hz: number, q = 1): Op => ({ op: 'bp', hz, q });
export const pitch = (st: number): Op => ({ op: 'pitch', st });
export const pan = (pos: number): Op => ({ op: 'pan', pos });
export const sat = (drive: number, mix = 1, extra: Record<string, unknown> = {}): Op => ({ op: 'sat', drive, mix, ...extra });
export const comp = (threshold: number, ratio: number, attack = 0.004, release = 0.12): Op => ({ op: 'comp', threshold, ratio, attack, release });
export const verb = (seconds: number, mix: number, extra: Record<string, unknown> = {}): Op => ({ op: 'reverb', seconds, mix, pre: 0.01, hp: 300, lp: 9000, damp: 0.6, ...extra });
export const conv = (ir: Record<string, unknown>, mix: number, extra: Record<string, unknown> = {}): Op => ({ op: 'convolve', ir, mix, ...extra });
/** the spring tank (Roland RE-301, a CC0 impulse response), trimmed */
export const SPRING = { freesound: 131034, trim: 1.2 };
/** impulse responses made in synth.py */
export const METAL = { kind: 'metal', seconds: 1.2, modes: 90, lo: 400, hi: 9000, decay: 0.5, seed: 5 };
export const TUNNEL = { kind: 'tunnel', seconds: 1.6, seed: 9, lp: 6000 };
export const SPRING_SYN = { kind: 'spring', seconds: 1.5, sections: 90, coef: -0.7, gap: 0.04, fb: 0.55, lp: 6000, seed: 3 };
export const PLATE = { kind: 'plate', seconds: 1.4, seed: 11, damp: 0.5 };

/** a tiny noise snap: the crisp front of a zap */
export const snap = (db: number, lo = 2000, hi = 9000, len = 0.02, at = 0, seed = 21): Layer =>
  syn('noise', { seconds: len + 0.01, seed, color: 'white', env: [[0, 0], [0.0008, 1], [len, 0]] }, db, [hp(lo), lp(hi)], at);
/** a low punch under a hit (a short sine drop, driven) */
export const thump = (db: number, from = 140, to = 50, len = 0.12, at = 0): Layer =>
  syn('subdrop', { seconds: len + 0.02, hz: [[0, from], [len, to]], drive: 2, env: [[0, 0], [0.002, 1], [len * 0.4, 0.6], [len, 0]] }, db, [], at);
