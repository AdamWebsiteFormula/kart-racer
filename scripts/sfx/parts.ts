// The building blocks the recipes are written with: sources (a pack file, one of the game's own earlier
// takes pinned to a commit), tuned mallet notes, and the processing that recurs. Pure data helpers: each
// returns the plain objects build.py reads (types.ts), so a recipe prints the same JSON however it is written.
import type { Fx, Layer } from './types.ts';

/** The commit whose ElevenLabs takes the recipes layer (origin/main, 26 Sept 2026): a take stays buildable after its file is replaced. */
export const TAKES = '979e511';
export const EL = (id: string) => ({ git: TAKES, path: `public/audio/sfx/${id}.mp3` });
/** Kenney's packs (CC0): Impact Sounds, Interface Sounds, Casino Audio, Sci-Fi Sounds, UI Audio. */
export const KI = (f: string) => ({ pack: `kenney/kenney_impact-sounds/Audio/${f}` });
export const KF = (f: string) => ({ pack: `kenney/kenney_interface-sounds/Audio/${f}` });
export const KC = (f: string) => ({ pack: `kenney/kenney_casino-audio/Audio/${f}` });
export const KS = (f: string) => ({ pack: `kenney/kenney_sci-fi-sounds/Audio/${f}` });
export const KU = (f: string) => ({ pack: `kenney/kenney_ui-audio/Audio/${f}` });
// the VSCO-2 Community Edition mallets (CC0)
const XY = (f: string) => ({ pack: `vsco/Xylo/Xylo_Medium_${f}_ff_01_far.wav` });
const GL = (f: string) => ({ pack: `vsco/Glock/glock_medium_${f}.wav` });
const MA = (f: string) => ({ pack: `vsco/Marimba/Marimba_hit_Outrigger_${f}_loud_01.wav` });

/** Peak-normalize, then set the layer's level in dB. */
export const lvl = (db: number): Fx[] => [{ op: 'normalize', db: 0 }, { op: 'gain', db }];

/**
 * Notes at their sounding pitch, A440: the sample and the semitones it is shifted by. The VSCO files are
 * named an octave under what they sound and sit 8-24 cents sharp (measured, 26 Sept 2026), so each shift
 * carries its file's correction. x xylophone, g glockenspiel, m marimba.
 */
export const NOTES: Record<string, readonly [{ pack: string }, number]> = {
  G5x: [XY('G4'), -0.14], A5x: [XY('G4'), 1.86], B5x: [XY('C5'), -1.15], C6x: [XY('C5'), -0.15], D6x: [XY('C5'), 1.85], E6x: [XY('C5'), 3.85],
  F6x: [XY('G5'), -2.16], G6x: [XY('G5'), -0.16], A6x: [XY('G5'), 1.84], B6x: [XY('C6'), -1.17], C7x: [XY('C6'), -0.17], D7x: [XY('C6'), 1.83], E7x: [XY('C6'), 3.83], G7x: [XY('G6'), -0.2],
  G5g: [GL('G4'), -0.08], C6g: [GL('C5'), -0.12], D6g: [GL('C5'), 1.88], G6g: [GL('G5'), -0.12], A6g: [GL('G5'), 1.88], As6g: [GL('G5'), 2.88], B6g: [GL('G5'), 3.88],
  C7g: [GL('C6'), -0.16], D7g: [GL('C6'), 1.84], E7g: [GL('C6'), 3.84], Fs7g: [GL('G6'), -1.16], G7g: [GL('G6'), -0.16], A7g: [GL('G6'), 1.84], B7g: [GL('G6'), 3.84], D8g: [GL('C7'), 1.76],
  G3m: [MA('G2'), 0.05], G4m: [MA('G2'), 12.05], B4m: [MA('C4'), -1.04], D5m: [MA('C4'), 1.96], G5m: [MA('G4'), 0.02], A5m: [MA('G4'), 2.02], B5m: [MA('B4'), 0],
  D6m: [MA('F5'), -2.98], E6m: [MA('F5'), -0.98], G6m: [MA('F5'), 2.02], C7m: [MA('C6'), -0.01], D7m: [MA('C6'), 1.99],
};
/** A mallet note from `at` seconds, rung for `ring` seconds (a fast then slower decay), at `db`, panned. */
export const note = (n: string, at: number, ring: number, db: number, pan = 0): Layer => ({ at, src: NOTES[n][0],
  fx: [{ op: 'pitch', st: NOTES[n][1] }, { op: 'env', pts: [[0, 1], [ring * 0.35, 0.55], [ring, 0]] }, { op: 'trim', to: ring }, ...(pan ? [{ op: 'pan', pos: pan } as Fx] : []), ...lvl(db)] });
/** A small bright hall, highs dying first. */
export const air = (mix: number, seconds = 0.7): Fx => ({ op: 'reverb', seconds, mix, pre: 0.008, hp: 400, lp: 9000, damp: 0.6 });
/** End a sound by `len` seconds, its tail faded: a frequent sound never holds one of its three voices long. */
export const cap = (len: number): Fx[] => [{ op: 'trim', to: len }, { op: 'fade', out: len * 0.4 }];
/** One of the game's own earlier takes as a layer. */
export const el = (id: string, db: number, fx: Fx[] = [], at = 0): Layer => ({ at, src: EL(id), fx: [...fx, ...lvl(db)] });
/** A pack file as a layer. */
export const pk = (src: { pack: string }, db: number, fx: Fx[] = [], at = 0): Layer => ({ at, src, fx: [...fx, ...lvl(db)] });
/** The last step of every recipe: a peak limiter at -1 dBFS. */
export const OUT: Fx = { op: 'limit', ceiling: -1 };

// ---- the boost family
/** The steam-vent blast (the game's own take) pitched down into a flame burst, `len` seconds. */
export const blast = (st: number, db: number, len: number, lp = 6000, soft = 0): Layer => ({ src: EL('steamVent'), fx: [{ op: 'pitch', st }, { op: 'lp', hz: lp }, { op: 'lowshelf', hz: 300, db: 4 },
  { op: 'env', pts: [[0, soft ? 0.25 : 1], [soft || 0.001, 1], [0.08, 0.8], [0.3 * len / 0.75, 0.3], [len * 0.8, 0]] }, { op: 'trim', to: len }, ...lvl(db)] });
/** A whoosh take from `from` seconds (its peak, or just before it), faded out over `len`. */
export const bodyW = (id: string, from: number, len: number, db: number, st = 0): Layer => ({ src: EL(id), fx: [{ op: 'trim', from }, ...(st ? [{ op: 'pitch', st } as Fx] : []),
  { op: 'fade', in: 0.004 }, { op: 'env', pts: [[0, 1], [len * 0.5, 0.6], [len, 0]] }, { op: 'trim', to: len }, ...lvl(db)] });
export const BOOST_MASTER: Fx[] = [{ op: 'hp', hz: 50 }, { op: 'peak', hz: 3000, db: 2, q: 0.8 }, { op: 'comp', threshold: -14, ratio: 2.5, attack: 0.004, release: 0.12 }];
/** A quick tire chirp cut from the drift squeal. */
export const chirp = (db: number, at: number): Layer => ({ at, src: EL('drift'), fx: [{ op: 'trim', from: 0.5, to: 0.6 }, { op: 'bp', hz: 2600, q: 1.2 }, { op: 'env', pts: [[0, 0], [0.006, 1], [0.03, 0.5], [0.1, 0]] }, ...lvl(db)] });
/** A low thump from the whale's tail take, low-passed. */
export const thump = (db: number, at = 0): Layer => ({ at, src: EL('tailSlap'), fx: [{ op: 'trim', to: 0.3 }, { op: 'lp', hz: 450 }, { op: 'fade', out: 0.1 }, ...lvl(db)] });
/** A deep boom (Kenney's low-frequency explosion from its peak: a sub thump, nothing that bangs). */
export const boom = (db: number, at = 0): Layer => pk(KS('lowFrequency_explosion_001.ogg'), db, [{ op: 'trim', from: 0.07 }, { op: 'fade', in: 0.003 }], at);
