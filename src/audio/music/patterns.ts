// The songs, as data. All original, written for this game. Pure.
// Beats are quarter notes; a bar is 4 beats. Melodic pitches are MIDI numbers.
import type { SongId } from '../types.ts';
import { chord, midi, scale } from './theory.ts';

export type Voice = 'bass' | 'skank' | 'brass' | 'lead' | 'pad' | 'bell' | 'kick' | 'snare' | 'hat' | 'clap';
export const DRUMS: ReadonlySet<Voice> = new Set<Voice>(['kick', 'snare', 'hat', 'clap']);

export interface Note { at: number; len: number; pitch: number; vel: number; chromatic?: boolean }
export interface Part { voice: Voice; notes: Note[]; /** only plays after the final-lap lift */ liftOnly?: boolean; /** muted while drums are off (the countdown) */ isDrum?: boolean }
export interface Song { id: SongId; bpm: number; bars: number; key: { rootPc: number; kind: 'major' | 'minor' | 'dorian' | 'mixolydian' }; parts: Part[] }

type Q = 'maj' | 'min' | 'dom7' | 'min7' | 'maj7' | 'sus4';
type ChordSym = [string, Q]; // root name with octave for the bass, quality

const n = (at: number, len: number, pitch: number, vel = 0.8, chromatic = false): Note => ({ at, len, pitch, vel, ...(chromatic ? { chromatic } : {}) });

/** A melody line from a compact string: "C5:1 D5:0.5 -:0.5 E5:2" (name:beats, '-' is a rest). */
export function line(start: number, text: string, vel = 0.8): Note[] {
  const out: Note[] = [];
  let t = start;
  for (const tok of text.trim().split(/\s+/)) {
    const [name, len] = tok.split(':');
    const beats = Number(len);
    if (name !== '-') {
      const chromatic = name.endsWith('!');
      out.push(n(t, beats, midi(chromatic ? name.slice(0, -1) : name), vel, chromatic));
    }
    t += beats;
  }
  return out;
}

/** Walking/root bass: one bar per chord, pattern of chord-tone offsets on given beats. */
function bass(prog: ChordSym[], pattern: [number, number, number][], vel = 0.85): Note[] {
  const out: Note[] = [];
  prog.forEach(([root, q], bar) => {
    const tones = chord(midi(root), q);
    for (const [beat, idx, len] of pattern) {
      const p = idx >= 0 ? tones[idx % tones.length] + 12 * Math.floor(idx / tones.length) : tones[0] - 12;
      out.push(n(bar * 4 + beat, len, p, vel));
    }
  });
  return out;
}

/** Chord stabs on the given beats of every bar, voiced an octave up. */
function stabs(prog: ChordSym[], beats: number[], len: number, octave = 12, vel = 0.5): Note[] {
  const out: Note[] = [];
  prog.forEach(([root, q], bar) => {
    for (const b of beats) for (const p of chord(midi(root) + octave, q)) out.push(n(bar * 4 + b, len, p, vel));
  });
  return out;
}

/** A drum voice on the given beats of every bar for `bars` bars. */
function hits(bars: number, beats: number[], len = 0.1, vel = 0.8): Note[] {
  const out: Note[] = [];
  for (let b = 0; b < bars; b++) for (const x of beats) out.push(n(b * 4 + x, len, 0, vel));
  return out;
}

// ---------------------------------------------------------------- Sunrise Cup: ska, F major, 150 bpm
const SUN_A: ChordSym[] = [['F2', 'maj'], ['D2', 'min'], ['Bb1', 'maj'], ['C2', 'maj'], ['F2', 'maj'], ['D2', 'min'], ['Bb1', 'maj'], ['C2', 'dom7']];
const SUN_B: ChordSym[] = [['Bb1', 'maj'], ['F2', 'maj'], ['G2', 'min'], ['C2', 'maj'], ['Bb1', 'maj'], ['F2', 'maj'], ['G2', 'min7'], ['C2', 'dom7']];
const SUN = [...SUN_A, ...SUN_B];
const raceSunrise: Song = {
  id: 'raceSunrise', bpm: 150, bars: 16, key: { rootPc: 5, kind: 'major' },
  parts: [
    { voice: 'bass', notes: bass(SUN, [[0, 0, 0.9], [1, 1, 0.9], [2, 2, 0.9], [3, 1, 0.9]]) },
    { voice: 'skank', notes: stabs(SUN, [0.5, 1.5, 2.5, 3.5], 0.22, 24, 0.42) },
    {
      voice: 'brass', notes: [
        ...line(0, 'C5:1.5 A4:0.5 C5:1 D5:1 C5:2 A4:2 Bb4:1 D5:1 F5:1.5 E5:0.5 E5:3 -:1'),
        ...line(16, 'C5:1.5 A4:0.5 C5:1 D5:1 C5:2 F5:2 F5:1 E5:1 D5:1 Bb4:1 C5:2 -:2'),
        ...line(32, 'D5:1 F5:1 D5:1 Bb4:1 C5:2 A4:2 Bb4:1 D5:1 G5:1 F5:1 E5:3 -:1'),
        ...line(48, 'D5:1 F5:1 D5:1 Bb4:1 A4:1 C5:1 F5:2 G5:1.5 F5:0.5 D5:1 Bb4:1 C5:4'),
      ],
    },
    { voice: 'lead', liftOnly: true, notes: line(0, 'F5:0.5 A5:0.5 C6:1 A5:1 F5:1 '.repeat(16), 0.35) },
    { voice: 'kick', isDrum: true, notes: hits(16, [0, 2]) },
    { voice: 'snare', isDrum: true, notes: hits(16, [1, 3], 0.1, 0.7) },
    { voice: 'hat', isDrum: true, notes: hits(16, [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], 0.05, 0.35) },
  ],
};

// ---------------------------------------------------------------- Summit Cup: funk, E dorian, 112 bpm
const SUM: ChordSym[] = [['E2', 'min7'], ['A2', 'dom7'], ['E2', 'min7'], ['A2', 'dom7'], ['G2', 'maj7'], ['F#2', 'min7'], ['E2', 'min7'], ['A2', 'dom7']];
const SUM16 = [...SUM, ...SUM];
const raceSummit: Song = {
  id: 'raceSummit', bpm: 112, bars: 16, key: { rootPc: 4, kind: 'dorian' },
  parts: [
    { voice: 'bass', notes: bass(SUM16, [[0, 0, 0.4], [0.75, 0, 0.2], [1.5, 2, 0.4], [2, -1, 0.25], [2.5, 0, 0.4], [3.25, 3, 0.3], [3.75, 1, 0.2]]) },
    { voice: 'skank', notes: stabs(SUM16, [0.25, 1.75, 2.75], 0.15, 24, 0.4) },
    {
      voice: 'brass', notes: [
        ...line(0, 'B4:0.5 D5:0.5 E5:1 -:1 D5:0.5 B4:0.5 A4:1 G4:1 -:2 E4:0.5 G4:0.5 A4:1 B4:0.5 D5:0.5 E5:2 -:2'),
        ...line(16, 'G5:1 F#5:1 E5:1 D5:1 E5:2 -:2 B4:0.5 D5:0.5 E5:1 F#5:1 A5:1 G5:2 -:2'),
        ...line(32, 'B4:0.5 D5:0.5 E5:1 -:1 D5:0.5 B4:0.5 A4:1 G4:1 -:2 E4:0.5 G4:0.5 A4:1 B4:0.5 D5:0.5 E5:2 -:2'),
        ...line(48, 'D5:1 E5:1 F#5:1 A5:1 B5:2 A5:1 G5:1 F#5:1 E5:1 D5:1 B4:1 E5:4'),
      ],
    },
    { voice: 'lead', liftOnly: true, notes: line(0, 'E6:0.25 -:0.25 B5:0.25 -:0.25 D6:0.5 -:0.5 '.repeat(32), 0.3) },
    { voice: 'kick', isDrum: true, notes: hits(16, [0, 0.75, 2.5]) },
    { voice: 'snare', isDrum: true, notes: hits(16, [1, 3], 0.1, 0.75) },
    { voice: 'hat', isDrum: true, notes: hits(16, [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75], 0.03, 0.25) },
    { voice: 'clap', isDrum: true, notes: hits(16, [3.75], 0.1, 0.35) },
  ],
};

// ---------------------------------------------------------------- Title: sunny pop, G major, 118 bpm
const TIT: ChordSym[] = [['G2', 'maj'], ['E2', 'min'], ['C2', 'maj'], ['D2', 'maj'], ['G2', 'maj'], ['E2', 'min'], ['C2', 'maj'], ['D2', 'sus4']];
const title: Song = {
  id: 'title', bpm: 118, bars: 8, key: { rootPc: 7, kind: 'major' },
  parts: [
    { voice: 'bass', notes: bass(TIT, [[0, 0, 1.5], [1.5, 2, 0.5], [2, 0, 1], [3, 1, 1]], 0.7) },
    { voice: 'pad', notes: stabs(TIT, [0], 3.9, 12, 0.22) },
    {
      voice: 'bell', notes: [
        ...line(0, 'D5:0.5 G5:0.5 B5:0.5 D6:0.5 B5:0.5 G5:0.5 E5:1 G5:0.5 B5:0.5 E6:1 B5:1 C6:0.5 E5:0.5 G5:0.5 C6:0.5 A5:1 F#5:1'),
        ...line(16, 'D5:0.5 G5:0.5 B5:0.5 D6:0.5 B5:0.5 G5:0.5 E5:1 G5:0.5 B5:0.5 E6:1 B5:1 C6:0.5 B5:0.5 A5:1 G5:1 A5:1'),
      ].map((x) => ({ ...x, vel: 0.5 })),
    },
    { voice: 'kick', isDrum: true, notes: hits(8, [0, 2.5], 0.1, 0.6) },
    { voice: 'snare', isDrum: true, notes: hits(8, [1, 3], 0.1, 0.45) },
    { voice: 'hat', isDrum: true, notes: hits(8, [0.5, 1.5, 2.5, 3.5], 0.05, 0.25) },
  ],
};

// ---------------------------------------------------------------- Results: a short happy loop, C major, 100 bpm
const RES: ChordSym[] = [['C2', 'maj'], ['A1', 'min'], ['F1', 'maj'], ['G1', 'dom7']];
const results: Song = {
  id: 'results', bpm: 100, bars: 4, key: { rootPc: 0, kind: 'major' },
  parts: [
    { voice: 'bass', notes: bass(RES, [[0, 0, 1], [1, 2, 1], [2, 1, 1], [3, 2, 1]], 0.7) },
    { voice: 'skank', notes: stabs(RES, [1, 3], 0.4, 24, 0.35) },
    { voice: 'bell', notes: line(0, 'E5:1 G5:1 C6:2 C5:1 E5:1 A5:2 A4:1 C5:1 F5:2 G5:1 F5:1 D5:2', 0.5) },
    { voice: 'kick', isDrum: true, notes: hits(4, [0, 2], 0.1, 0.5) },
    { voice: 'hat', isDrum: true, notes: hits(4, [0.5, 1.5, 2.5, 3.5], 0.05, 0.2) },
  ],
};

export const SONGS: Readonly<Record<SongId, Song>> = Object.freeze({ raceSunrise, raceSummit, title, results });

/** Pitch classes of a song's key. */
export function keyPcs(s: Song): number[] {
  return scale(s.key.rootPc, s.key.kind);
}

/** Which race song a track plays (design §11: Sunrise Cup ska, Summit Cup funk). */
export function songForTrack(trackId: string): SongId {
  return ['frostbite-pass', 'boardwalk-nights', 'skyline-circuit'].includes(trackId) ? 'raceSummit' : 'raceSunrise';
}
