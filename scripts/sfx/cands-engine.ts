// Candidates for the kart engine loops (29 Sept 2026: Adam, "the sound effects are still atrocious"; the three shipped
// loops are ElevenLabs takes). The game crossfades idle, mid and high by rpm (samples.ts ENGINE_BANDS 1400, 3800, 6600)
// and pitches each with the rpm, so each loop must hold one steady pitch and level. Real recordings, found steady by
// measurement, all from Muted.io Performance Cars (CC0): the idle a car idling (file 039, 3.0-7.2 s at one level and
// a 31.9 Hz pitch; the first try, a Honda CB500F's 3.6-7.9 s, was its rear tire burning out, not an idle), the high a
// car held at high revs (file 029, 9.4 s at ~320 Hz), the mid that same hold lowered by the bands' ratio (3800 / 6600: -9.55 semitones). Built as the shipped ones: 4 s seamless loops.
//   RASCAL_SFX_PACKS=/home/user/rascal-sfx-source/packs python3 scripts/sfx/build.py --recipes=scripts/sfx/cands-engine.ts --out=<dir>
import { lvl, OUT } from './parts.ts';
import type { Fx, Recipe } from './types.ts';

const CAR039 = { pack: 'performance-cars-free-sample-pack-mutedio/performance-cars-free-sample-pack-mutedio/039-performance-cars-mutedio.wav' };
const CAR029 = { pack: 'performance-cars-free-sample-pack-mutedio/performance-cars-free-sample-pack-mutedio/029-performance-cars-mutedio.wav' };
/** an engine bed: no rumble below the note, no hiss above the rasp */
const BED: Fx[] = [{ op: 'hp', hz: 30 }, { op: 'lp', hz: 9500 }, { op: 'comp', threshold: -18, ratio: 2, attack: 0.01, release: 0.2 }, OUT];
const loop = (id: string, brief: string, fx: Fx[], src: { pack: string }): Recipe =>
  ({ id, brief, why: 'candidate, 29 Sept 2026', loop: 4, xfade: 0.12, layers: [{ src, fx: [...fx, ...lvl(0)] }], master: BED });

export const RECIPES: readonly Recipe[] = [
  loop('engine-idle', "The player's kart engine idling on the grid: a small, punchy engine's steady low burble, one constant pitch and level, a seamless loop.",
    [{ op: 'trim', from: 3.0, to: 7.2 }, { op: 'mono' }], CAR039),
  loop('engine-mid', "The player's kart engine at middle revs while racing: a steady, gritty mid-range engine note, one constant pitch and level, a seamless loop.",
    [{ op: 'trim', from: 5.6, to: 13.6 }, { op: 'pitch', st: -9.55 }, { op: 'trim', to: 4.3 }, { op: 'mono' }], CAR029),
  loop('engine-high', "The player's kart engine at high revs, flat out: a bright, buzzing, powerful engine note, one constant pitch and level, a seamless loop.",
    [{ op: 'trim', from: 6.0, to: 10.3 }, { op: 'mono' }], CAR029),
];
