// Trick and rocket-start candidates (28 Sept 2026, for Adam's ears; not installed), re-aimed at his word on the vibe,
// "cool, and not corny, cheesy or cartoony": real recorded air (CC0 swishes and whooshes on Freesound), the game's own
// boost family for the launch, and for sparkle only real metal (a finger cymbal's ring, a suspended cymbal's shimmer:
// VSCO-2 CE), never a melodic run.
import type { Fx, Layer, Recipe } from '../types.ts';
import { el, fs, hit, ROOM, syn, takes, vs } from './kit.ts';

const END = (len: number, fade = 0.35): Fx[] => [{ op: 'trim', to: len }, { op: 'fade', out: len * fade }, { op: 'limit', ceiling: -1 }];
const ST = [0, 0.7, -0.6, 1.3];

const SWISH = 463763;    // hz37, "throw swish x12": real arm swishes
const QUICK = 683101;    // florianreichelt, "quick woosh": a sharp rod swish
const SWIPE = 60007;     // qubodup, "Swipe Whoosh"
const SWOSH = 60026;     // qubodup, "Swosh swoosh whoosh"
const SHORTLOW = 449992; // DJT4NN3R, "whoosh_short_low"
const BIG = 88532;       // northern87, "Woosh": a long full-band whoosh
const PASSBY = 333515;   // oscaraudiogeek, "Flash and Quicksilver": a pass-by whoosh with a Doppler swoop
const SQUEAL = 614627;   // johnnydekk, "screeching tyres / tires"
const MET = 'VSCO 1 Percussion/varMetal';
/** a finger cymbal's bright ring (VSCO-2 CE), the attack softened, high-passed: a clean metallic 'shing' */
const shing = (db: number, at: number, st = 0, len = 0.45): Layer => vs(`${MET}/various/Fing_Cymb.wav`, db, [hit(0, len, -24, 0.3), { op: 'pitch', st }, { op: 'hp', hz: 3000 }, { op: 'fade', in: 0.004, out: len * 0.6 }], at);

// ---------------------------------------------------------------- trick (the trick button in mid-air)
const TRICK = 'A go-kart does a quick mid-air trick off a ramp in a polished kart racing game (Mario Kart World quality): a fast spinning swish of air with a clean metallic shimmer, stylish and cool, short; never cartoony. No voice.';
const trickA = takes('trickA', 3, (k) => ({ id: 'trick', brief: TRICK,
  why: "A, spin and shing: two real arm swishes (hz37, CC0) 70 ms apart, panned left then right (the kart turning over), and a finger cymbal's bright ring (VSCO-2 CE) high-passed to a clean metallic shing, 13 dB under; three takes.",
  layers: [
    fs(SWISH, 0, [hit([3, 5, 8][k], 0.35), { op: 'pitch', st: 2 + ST[k] }, { op: 'pan', pos: -0.5 }]),
    fs(SWISH, -2, [hit([4, 6, 9][k], 0.35), { op: 'pitch', st: 4 + ST[k] }, { op: 'pan', pos: 0.5 }], 0.07),
    shing(-13, 0.09, ST[k]),
  ],
  master: [{ op: 'hp', hz: 150 }, ROOM(0.12), ...END(0.6)] }));
const trickB = takes('trickB', 3, (k) => ({ id: 'trick', brief: TRICK,
  why: "B, spin-by: a real arm swish (hz37, CC0) swept past the ear left to right (Doppler: the kart spinning through the air past the camera), a suspended cymbal's scrape (VSCO-2 CE) high-passed to a thin sizzle under it; three takes. (A 14 Hz chop that made it tumble read as breathing to AST: removed.)",
  layers: [
    fs(SWISH, 0, [hit([2, 1, 8][k], 0.45), { op: 'pitch', st: 3 + ST[k] }, { op: 'doppler', speed: 10, dist: 1, at: 0.1, pan: 0.7 }]),
    vs(`${MET}/Cymbals/susp/susp_FX_scrape_${[1, 2, 1][k]}.wav`, -15, [{ op: 'trim', from: [0.05, 0.05, 0.5][k], to: [0.45, 0.45, 0.9][k] }, { op: 'hp', hz: 4000 }, { op: 'fade', in: 0.03, out: 0.2 }], 0.03),
  ],
  master: [{ op: 'hp', hz: 150 }, ROOM(0.12), ...END(0.6)] }));
const trickC = takes('trickC', 3, (k) => ({ id: 'trick', brief: TRICK,
  why: "C, twirl: three real swishes in a row (qubodup's swipe, florianreichelt's rod swish, qubodup's swosh; CC0), each a tone higher and panned the other way, and a triangle's clean ring (VSCO-2 CE, high-passed) as the kart comes round. (A soft cymbal swell read as a gasp to AST: replaced.)",
  layers: [
    fs(SWIPE, 0, [{ op: 'trim', to: 0.25 }, { op: 'pitch', st: ST[k] }, { op: 'pan', pos: -0.4 }]),
    fs(QUICK, -1, [{ op: 'trim', from: 0.15, to: 0.35 }, { op: 'pitch', st: 2 + ST[k] }, { op: 'pan', pos: 0.4 }], 0.06),
    fs(SWOSH, -2, [{ op: 'trim', to: 0.3 }, { op: 'pitch', st: 4 + ST[k] }, { op: 'pan', pos: -0.2 }], 0.12),
    vs(`${MET}/triangle/${[1, 2, 3][k]}/triangle${[1, 2, 3][k]}_hit_${['mp', 'mp', 'mf'][k]}.wav`, -16, [hit(0, 0.5, -24, 0.3), { op: 'hp', hz: 3000 }, { op: 'fade', out: 0.3 }], 0.13),
  ],
  master: [{ op: 'hp', hz: 150 }, ROOM(0.12), ...END(0.65)] }));

// ---------------------------------------------------------------- boostStart (a perfect rocket start at the go)
const START = 'A perfect rocket start at the GO in a polished kart racing game (Mario Kart World quality): the tires chirp and the kart launches with a big rushing burst of flame and air, thrilling, punchy and cool, about a second and a half. No voice, nothing like a weapon.';
const chirp = (db: number, at = 0): Layer => fs(SQUEAL, db, [hit(2, 0.16, -14, 0.3), { op: 'bp', hz: 1300, q: 1 }, { op: 'env', pts: [[0, 0], [0.01, 1], [0.06, 0.5], [0.16, 0]] }], at);
const blast = (st: number, db: number, len: number): Layer => el('steamVent', db, [{ op: 'pitch', st }, { op: 'lp', hz: 5000 }, { op: 'lowshelf', hz: 300, db: 4 }, { op: 'env', pts: [[0, 1], [0.001, 1], [0.1, 0.8], [0.45 * len, 0.3], [len * 0.9, 0]] }, { op: 'trim', to: len }]);
const bsA: Recipe[] = [{ id: 'boostStart', name: 'boostStartA', brief: START,
  why: "A, launch: a real tire chirp (johnnydekk, CC0) as the wheels bite, a rising zing of air (band-passed noise sweeping 0.6 to 5 kHz), the game's own steam-vent blast pitched down 5 semitones for the flame (the drift boosts' family, pinned take), a big real whoosh (northern87, CC0) for the rush and a real pass-by swoop (oscaraudiogeek, CC0) trailing off; a room.",
  layers: [chirp(-6), syn('whoosh', { seconds: 0.45, hz: [[0, 600], [0.35, 5000]], q: 3, env: [[0, 0], [0.08, 1], [0.35, 0.8], [0.45, 0]], seed: 81, color: 'white' }, -9), blast(-5, -2, 1.1),
    fs(BIG, 0, [{ op: 'trim', from: 0.15, to: 1.45 }, { op: 'fade', in: 0.02 }, { op: 'env', pts: [[0, 0.6], [0.12, 1], [0.6, 0.55], [1.3, 0]] }], 0.03),
    fs(PASSBY, -8, [{ op: 'trim', from: 0.95, to: 1.9 }, { op: 'fade', in: 0.05 }], 0.15)],
  master: [{ op: 'hp', hz: 45 }, { op: 'comp', threshold: -14, ratio: 2.5, attack: 0.004, release: 0.12 }, ROOM(0.1, 0.4), ...END(1.5, 0.45)] }];
const bsB: Recipe[] = [{ id: 'boostStart', name: 'boostStartB', brief: START,
  why: "B, the boost family: the shipped tier-3 drift boost (its own recipe file, pinned at 527a1c0) so the rocket start sits with the drift boosts, a tire chirp (johnnydekk, CC0) on its front, a low thump under it (the whale's tail take low-passed, pinned) and a real pass-by swoop (oscaraudiogeek, CC0) carrying it away.",
  layers: [el('boost3', 0, [], 0.02, '527a1c0'), chirp(-7), el('tailSlap', -8, [{ op: 'trim', to: 0.3 }, { op: 'lp', hz: 400 }, { op: 'fade', out: 0.1 }]),
    fs(PASSBY, -9, [{ op: 'trim', from: 0.95, to: 1.9 }, { op: 'fade', in: 0.05 }], 0.25)],
  master: [{ op: 'hp', hz: 45 }, { op: 'comp', threshold: -14, ratio: 2.5, attack: 0.004, release: 0.12 }, ROOM(0.1, 0.4), ...END(1.5, 0.45)] }];
const bsC: Recipe[] = [{ id: 'boostStart', name: 'boostStartC', brief: START,
  why: "C, big air: a real low whoosh (DJT4NN3R, CC0) as the thump of the launch, the long real whoosh (northern87, CC0) for the rush, a real pass-by swoop (oscaraudiogeek, CC0) rising out of it, and the chirp; no flame, all air.",
  layers: [chirp(-7), fs(SHORTLOW, -2, [{ op: 'trim', from: 0.05, to: 0.6 }, { op: 'pitch', st: -2 }]), fs(BIG, -1, [{ op: 'trim', from: 0.1, to: 1.5 }, { op: 'fade', in: 0.05 }], 0.05),
    fs(PASSBY, -4, [{ op: 'trim', from: 0.7, to: 1.9 }, { op: 'pitch', st: 2 }, { op: 'fade', in: 0.1 }], 0.1)],
  master: [{ op: 'hp', hz: 45 }, { op: 'comp', threshold: -14, ratio: 2.5, attack: 0.004, release: 0.12 }, ROOM(0.1, 0.4), ...END(1.5, 0.45)] }];

export const RECIPES: readonly Recipe[] = [...trickA, ...trickB, ...trickC, ...bsA, ...bsB, ...bsC];
