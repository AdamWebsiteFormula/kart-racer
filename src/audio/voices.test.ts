import { describe, expect, it } from 'vitest';
import { AUDIO } from './constants.ts';
import type { Cue } from './types.ts';
import { mergeCues, rouletteGap, Voices } from './voices.ts';

describe('voice limiting', () => {
  it('one cue per sound per tick: the loudest, with its pan and pitch; order kept', () => {
    const cues: Cue[] = [
      { sfx: 'spin', gain: 0.3, pan: -1 }, { sfx: 'bump', gain: 1, pan: 0 }, { sfx: 'spin', gain: 0.9, pan: 0.5, rate: 1.1 },
      { sfx: 'spin', gain: 0.5, pan: 0 }, { sfx: 'yelp:pip', gain: 0.8, pan: 0 },
    ];
    expect(mergeCues(cues)).toEqual([{ sfx: 'spin', gain: 0.9, pan: 0.5, rate: 1.1 }, { sfx: 'bump', gain: 1, pan: 0 }, { sfx: 'yelp:pip', gain: 0.8, pan: 0 }]);
    expect(mergeCues([])).toEqual([]);
  });

  it('caps one sound at its voices and all sounds at the total; a sting always plays; ended voices free up', () => {
    const v = new Voices();
    for (let i = 0; i < AUDIO.voicesPerSound; i++) expect(v.admit('bump', 0, 1)).toBe(true);
    expect(v.admit('bump', 0.1, 1)).toBe(false);
    expect(v.admit('bump', 1.01, 1)).toBe(true); // the first three have ended
    const w = new Voices();
    let n = 0;
    for (let i = 0; i < 40; i++) if (w.admit(`s${i}`, 0, 5)) n++;
    expect(n).toBe(AUDIO.voicesTotal);
    expect(w.admit('late', 1, 1)).toBe(false);
    expect(w.admit('finish', 1, 3, true)).toBe(true);
  });
});

describe('the roulette', () => {
  it('ticks quick while it spins and slows to a crawl before the chime', () => {
    expect(rouletteGap(AUDIO.roulette.seconds)).toBeCloseTo(AUDIO.roulette.fast);
    expect(rouletteGap(AUDIO.roulette.seconds * 3)).toBeCloseTo(AUDIO.roulette.fast);
    expect(rouletteGap(0)).toBeCloseTo(AUDIO.roulette.slow);
    let last = 0;
    for (let left = AUDIO.roulette.seconds; left >= 0; left -= 0.05) { const g = rouletteGap(left); expect(g).toBeGreaterThanOrEqual(last); last = g; }
  });
});
