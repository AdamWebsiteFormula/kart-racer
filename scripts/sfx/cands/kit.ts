// Shared building blocks for the candidate recipes (28 Sept 2026): layers from each approved source, the `hit` pick,
// a short real room, the ending, takes (variants the game picks at random), and tuned notes from measured pitches.
import type { Fx, Layer, Recipe } from '../types.ts';
import PITCHES from './pitches.json' with { type: 'json' };

const LV = (db: number): Fx[] => [{ op: 'normalize', db: 0 }, { op: 'gain', db }];
/** a CC0 Freesound recording (its author in scripts/sfx/freesound.json) */
export const fs = (id: number, db: number, fx: Fx[] = [], at = 0): Layer => ({ at, src: { freesound: id }, fx: [...fx, ...LV(db)] });
/** a VSCO-2 Community Edition file (CC0) by its repo path */
export const vs = (path: string, db: number, fx: Fx[] = [], at = 0): Layer => ({ at, src: { pack: `vsco/${path}` }, fx: [...fx, ...LV(db)] });
/** a Kenney pack file (CC0) */
export const ke = (path: string, db: number, fx: Fx[] = [], at = 0): Layer => ({ at, src: { pack: `kenney/${path}` }, fx: [...fx, ...LV(db)] });
/** one of the game's own takes pinned at a commit (979e511: the ElevenLabs originals; 527a1c0: the files as of 28 Sept) */
export const el = (id: string, db: number, fx: Fx[] = [], at = 0, rev = '979e511'): Layer => ({ at, src: { git: rev, path: `public/audio/sfx/${id}.mp3` }, fx: [...fx, ...LV(db)] });
/** seeded synthesis (dsp.py and physics.py) */
export const syn = (synth: 'modal' | 'squeal' | 'noise' | 'whoosh' | 'tone' | 'fm' | 'crackle', args: Record<string, unknown>, db: number, fx: Fx[] = [], at = 0): Layer =>
  ({ at, src: { synth, args: args as never }, fx: [...fx, ...LV(db)] });
/** the n-th separate hit of a recording of several */
export const hit = (n: number, len: number, floor = -20, gap = 0.3): Fx => ({ op: 'hit', n, len, floor, gap });
/** a short real room (image sources and a diffuse tail) */
export const ROOM = (mix = 0.1, tail = 0.25, size: number[] = [5, 4, 3]): Fx => ({ op: 'room', mix, size, absorb: 0.45, tail, tailLevel: 0.25, hp: 250, lp: 9000 });
/** end by `len` s, the last share faded, limited at -1 dBFS */
export const END = (len: number, fade = 0.35): Fx[] => [{ op: 'trim', to: len }, { op: 'fade', out: len * fade }, { op: 'limit', ceiling: -1 }];
/** `n` takes of a candidate (`base`, `base~2`, ...): the game picks one at random each time */
export const takes = (base: string, n: number, make: (k: number) => Omit<Recipe, 'name'>): Recipe[] =>
  Array.from({ length: n }, (_, k) => ({ ...make(k), name: k === 0 ? base : `${base}~${k + 1}` }));

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
/** MIDI number of a note name like 'G5', 'F#6' */
export const midi = (n: string): number => { const m = /^([A-G]#?)(-?\d)$/.exec(n)!; return NAMES.indexOf(m[1]) + 12 * (Number(m[2]) + 1); };
/** the mallets' measured tuning (parts.ts NOTES: pyin misreads glockenspiel partials) */
const MALLET: Record<string, number> = {
  'Glock/glock_medium_G4.wav': 79.08, 'Glock/glock_medium_C5.wav': 84.12, 'Glock/glock_medium_G5.wav': 91.12, 'Glock/glock_medium_C6.wav': 96.16, 'Glock/glock_medium_G6.wav': 103.16, 'Glock/glock_medium_C7.wav': 108.24,
  'Xylo/Xylo_Medium_G4_ff_01_far.wav': 79.14, 'Xylo/Xylo_Medium_C5_ff_01_far.wav': 84.15, 'Xylo/Xylo_Medium_G5_ff_01_far.wav': 91.16, 'Xylo/Xylo_Medium_C6_ff_01_far.wav': 96.17, 'Xylo/Xylo_Medium_G6_ff_01_far.wav': 103.2,
};
const pitchOf = (path: string): number => MALLET[path] ?? (PITCHES as Record<string, number>)[`vsco/${path}`];
/** the nearest sample of an instrument folder to a note (the smallest shift) */
export const nearest = (folder: string, target: number): string => {
  let best = '', d = 1e9;
  for (const k of [...Object.keys(PITCHES), ...Object.keys(MALLET).map((m) => `vsco/${m}`)]) {
    if (!k.startsWith(`vsco/${folder}/`)) continue;
    const p = pitchOf(k.slice(5)), dd = Math.abs(p - target);
    if (dd < d) { d = dd; best = k.slice(5); }
  }
  return best;
};
/** a tuned note of a VSCO instrument folder (`Glock`, `Xylo`, `Marimba`, `Brass/Trumpet/stac`, `Strings/Harp`...): rung for `ring` s */
export const tone = (folder: string, name: string, at: number, ring: number, db: number, pan = 0, extra: Fx[] = []): Layer => {
  const target = midi(name), file = nearest(folder, target);
  return vs(file, db, [{ op: 'pitch', st: +(target - pitchOf(file)).toFixed(2) }, ...extra, { op: 'env', pts: [[0, 1], [ring * 0.35, 0.55], [ring, 0]] }, { op: 'trim', to: ring }, ...(pan ? [{ op: 'pan', pos: pan } as Fx] : [])], at);
};
/** a held brass or woodwind note: no mallet decay, just a fade at its end */
export const held = (folder: string, name: string, at: number, len: number, db: number, pan = 0, extra: Fx[] = []): Layer => {
  const target = midi(name), file = nearest(folder, target);
  return vs(file, db, [{ op: 'pitch', st: +(target - pitchOf(file)).toFixed(2) }, ...extra, { op: 'trim', to: len }, { op: 'fade', out: Math.min(0.15, len * 0.4) }, ...(pan ? [{ op: 'pan', pos: pan } as Fx] : [])], at);
};
