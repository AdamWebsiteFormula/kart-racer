// Note names ↔ frequencies. Pure. Equal temperament, A4 = 440 Hz.
const SEMI: Readonly<Record<string, number>> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** MIDI number for a name like 'C4', 'F#3', 'Bb2'. */
export function midi(name: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`bad note ${name}`);
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return (Number(m[3]) + 1) * 12 + SEMI[m[1]] + acc;
}

export function freqOfMidi(n: number): number {
  return 440 * 2 ** ((n - 69) / 12);
}

export function freq(name: string): number {
  return freqOfMidi(midi(name));
}

/** Pitch classes of a major or minor scale on a root pitch class. */
export function scale(rootPc: number, kind: 'major' | 'minor' | 'dorian' | 'mixolydian'): number[] {
  const steps = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], mixolydian: [0, 2, 4, 5, 7, 9, 10] }[kind];
  return steps.map((s) => (rootPc + s) % 12);
}

/** Triad (or seventh) on a root midi note: 'maj' | 'min' | 'dom7' | 'min7' | 'maj7'. */
export function chord(root: number, quality: 'maj' | 'min' | 'dom7' | 'min7' | 'maj7' | 'sus4'): number[] {
  const iv = { maj: [0, 4, 7], min: [0, 3, 7], dom7: [0, 4, 7, 10], min7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], sus4: [0, 5, 7] }[quality];
  return iv.map((i) => root + i);
}
