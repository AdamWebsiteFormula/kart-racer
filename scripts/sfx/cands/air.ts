// Air and motion candidates (28 Sept 2026, for Adam's ears; not installed): throw, trick, boostStart, kite, fog.
// Real recorded air (CC0 on Freesound: throw swishes, whooshes, wing flaps, a puff of smoke, an air release) carries
// each one; the game's own boost family (its steam-vent flame, the shipped boost takes, pinned) keeps the rocket start
// kin to the drift boosts; musical sparkles are real mallets (VSCO-2 CE) in the menus' G major.
import type { Fx, Layer, Recipe } from '../types.ts';

const fs = (id: number, db: number, fx: Fx[] = [], at = 0): Layer => ({ at, src: { freesound: id }, fx: [...fx, { op: 'normalize', db: 0 }, { op: 'gain', db }] });
const vs = (path: string, db: number, fx: Fx[] = [], at = 0): Layer => ({ at, src: { pack: `vsco/${path}` }, fx: [...fx, { op: 'normalize', db: 0 }, { op: 'gain', db }] });
const el = (id: string, db: number, fx: Fx[] = [], at = 0, rev = '979e511'): Layer => ({ at, src: { git: rev, path: `public/audio/sfx/${id}.mp3` }, fx: [...fx, { op: 'normalize', db: 0 }, { op: 'gain', db }] });
const syn = (synth: 'modal' | 'whoosh' | 'noise', args: Record<string, unknown>, db: number, fx: Fx[] = [], at = 0): Layer =>
  ({ at, src: { synth, args: args as never }, fx: [...fx, { op: 'normalize', db: 0 }, { op: 'gain', db }] });
const hit = (n: number, len: number, floor = -20, gap = 0.3): Fx => ({ op: 'hit', n, len, floor, gap });
/** a mallet note (VSCO-2 CE, measured tuning: parts.ts NOTES) */
const NOTE: Record<string, [string, number]> = {
  G6g: ['Glock/glock_medium_G5.wav', -0.12], B6g: ['Glock/glock_medium_G5.wav', 3.88], D7g: ['Glock/glock_medium_C6.wav', 1.84], G7g: ['Glock/glock_medium_G6.wav', -0.16],
  G6x: ['Xylo/Xylo_Medium_G5_ff_01_far.wav', -0.16], B6x: ['Xylo/Xylo_Medium_C6_ff_01_far.wav', -1.17], D7x: ['Xylo/Xylo_Medium_C6_ff_01_far.wav', 1.83], G7x: ['Xylo/Xylo_Medium_G6_ff_01_far.wav', -0.2],
};
const note = (n: string, at: number, ring: number, db: number, pan = 0): Layer => vs(NOTE[n][0], db, [{ op: 'pitch', st: NOTE[n][1] }, { op: 'env', pts: [[0, 1], [ring * 0.35, 0.55], [ring, 0]] }, { op: 'trim', to: ring }, ...(pan ? [{ op: 'pan', pos: pan } as Fx] : [])], at);
const ROOM = (mix = 0.1, tail = 0.25): Fx => ({ op: 'room', mix, size: [5, 4, 3], absorb: 0.45, tail, tailLevel: 0.25, hp: 250, lp: 9000 });
const END = (len: number, fade = 0.35): Fx[] => [{ op: 'trim', to: len }, { op: 'fade', out: len * fade }, { op: 'limit', ceiling: -1 }];
const takes = (base: string, n: number, make: (k: number) => Omit<Recipe, 'name'>): Recipe[] =>
  Array.from({ length: n }, (_, k) => ({ ...make(k), name: k === 0 ? base : `${base}~${k + 1}` }));
const ST = [0, 0.7, -0.6, 1.3];

const SWISH = 463763;    // hz37, "throw swish x12": 11 real arm-throw swishes
const QUICK = 683101;    // florianreichelt, "quick woosh": a sharp rod swish
const SWIPE = 60007;     // qubodup, "Swipe Whoosh"
const SWOSH = 60026;     // qubodup, "Swosh swoosh whoosh"
const SHORTLOW = 449992; // DJT4NN3R, "whoosh_short_low"
const POWER = 434869;    // Nic3_one, "Powerfull Whooshes 2": 17 full real whooshes
const BIG = 88532;       // northern87, "Woosh": a long full-band whoosh
const PASSBY = 333515;   // oscaraudiogeek, "Flash and Quicksilver": a pass-by whoosh with a Doppler swoop
const SQUEAL = 614627;   // johnnydekk, "screeching tyres / tires"
const FLUTTER = 561009;  // TurboFool, "Light Wing Flap": a light, fast flutter
const FLAPS = [244978, 244982, 244979, 244976]; // ani_music, "Wing Flap (Flag Flapping)": single flaps
const PAPER = 320913;    // mickdow, "Paper Flutter"
const FABRIC = 701647;   // IENBA, "Fabric Flapping"
const LIFT = 423792;     // ch_ase, "Little Whoosh 1": a smooth swell
const PUFF = 714257;     // qubodup, "Puff of Smoke"
const RELEASE = 457294;  // brunoboselli, "Air (or steam) pressure release"
const BOMB = 332602;     // vckhaze, "Smoke Bomb"
const POOF = 208111;     // Planman, "Poof of Smoke"
const SOFTREL = 275550;  // mbezzola, "Soft Swish Air Release"

// ---------------------------------------------------------------- throw (a Beach Ball, forward or back)
const THROW = 'The player throws a big bouncy beach ball forward in a polished cartoon kart racing game (Mario Kart World quality): a quick, clean arm swish and the soft, rubbery push of the ball leaving the hand, light and fun. No voice, nothing like a weapon.';
const pomf = (db: number, k: number, at = 0.02): Layer => syn('modal', { seconds: 0.25, hz: 330 * Math.pow(2, ST[k] / 12), material: 'hollow', ring: 0.5, contact: 0.006, glide: [[0, 0], [0.08, 2]], seed: 41 + k }, db, [{ op: 'lp', hz: 2500 }], at);
const throwA = takes('throwA', 3, (k) => ({ id: 'throw', brief: THROW,
  why: "A, a real throw: a real arm-throw swish (hz37, 'throw swish x12', CC0: a different throw each take) and the beach ball's soft, rubbery push off the hand (physics.py: a hollow shell struck softly, bending up 2 semitones), a short room.",
  layers: [fs(SWISH, 0, [hit([0, 2, 7][k], 0.45), { op: 'pitch', st: 1 + ST[k] }]), pomf(-9, k)],
  master: [{ op: 'hp', hz: 120 }, ROOM(0.08), ...END(0.45)] }));
const throwB = takes('throwB', 3, (k) => ({ id: 'throw', brief: THROW,
  why: "B, whip past: a real swipe (qubodup, 'Swipe Whoosh', CC0) sent past the ear left to right (Doppler, a quick pan), a real rod swish (florianreichelt, CC0) on its front for the snap, and a rubber ball's light bounce (SomeoneCool15, CC0) pitched up for the ball. (The first B, a low whoosh sent past, read as a door slam to AST: remade.)",
  layers: [
    fs(SWIPE, 0, [{ op: 'trim', to: 0.4 }, { op: 'pitch', st: 2 + ST[k] }, { op: 'doppler', speed: 20, dist: 1.5, at: 0.08, pan: 0.6 }]),
    fs(QUICK, -5, [{ op: 'trim', from: 0.15, to: 0.35 }, { op: 'pitch', st: ST[k] }]),
    fs(423778, -13, [hit([0, 2, 5][k], 0.15, -16, 0.2), { op: 'pitch', st: 6 }, { op: 'lp', hz: 3000 }], 0.01),
  ],
  master: [{ op: 'hp', hz: 150 }, ROOM(0.08), ...END(0.45)] }));
const throwC = takes('throwC', 3, (k) => ({ id: 'throw', brief: THROW,
  why: "C, zippy: a real swish (qubodup, CC0) with a quick air 'zip' rising under it (band-passed noise sweeping 0.7 to 4 kHz), and the ball's rubbery push; brighter and snappier than A.",
  layers: [
    fs(SWOSH, 0, [{ op: 'trim', to: 0.4 }, { op: 'pitch', st: 1 + ST[k] }]),
    syn('whoosh', { seconds: 0.18, hz: [[0, 700], [0.16, 4000]], q: 1.4, env: [[0, 0], [0.03, 1], [0.18, 0]], seed: 51 + k }, -10),
    pomf(-10, k, 0.015),
  ],
  master: [{ op: 'hp', hz: 120 }, { op: 'peak', hz: 3000, db: 1.5, q: 1 }, ROOM(0.08), ...END(0.42)] }));

// ---------------------------------------------------------------- trick (the trick button in mid-air)
const TRICK = 'A go-kart does a quick mid-air flip trick off a ramp in a polished cartoon kart racing game (Mario Kart World quality): a fast spinning swish of air and a small bright sparkle, stylish and fun, short. No voice.';
const trickA = takes('trickA', 3, (k) => ({ id: 'trick', brief: TRICK,
  why: "A, spin and sparkle: two real arm swishes (hz37, CC0) 70 ms apart, panned left then right (the kart turning over), and a glockenspiel sparkle, G6 then D7 (VSCO-2 CE, the menus' G major), 14 dB under.",
  layers: [
    fs(SWISH, 0, [hit([3, 5, 8][k], 0.35), { op: 'pitch', st: 2 + ST[k] }, { op: 'pan', pos: -0.5 }]),
    fs(SWISH, -2, [hit([4, 6, 9][k], 0.35), { op: 'pitch', st: 4 + ST[k] }, { op: 'pan', pos: 0.5 }], 0.07),
    note('G6g', 0.1, 0.35, -14, -0.2), note('D7g', 0.16, 0.4, -15, 0.2),
  ],
  master: [{ op: 'hp', hz: 150 }, ROOM(0.12), ...END(0.6)] }));
const trickB = takes('trickB', 3, (k) => ({ id: 'trick', brief: TRICK,
  why: "B, tumble: a real arm swish (hz37, CC0) chopped at 14 Hz so it tumbles (the kart spinning through the air), and a quick xylophone flourish up G6, B6, D7 (VSCO-2 CE) as it lands the trick. (The first B, a big whoosh, had a thud AST heard as a door: remade.)",
  layers: [
    fs(SWISH, 0, [hit([2, 7, 9][k], 0.45), { op: 'pitch', st: 3 + ST[k] }, { op: 'flutter', depth: 0.55, rate: 14, seed: 3 + k }]),
    note('G6x', 0.12, 0.2, -12), note('B6x', 0.17, 0.2, -12.5), note('D7x', 0.22, 0.3, -13),
  ],
  master: [{ op: 'hp', hz: 150 }, ROOM(0.12), ...END(0.6)] }));
const trickC = takes('trickC', 3, (k) => ({ id: 'trick', brief: TRICK,
  why: "C, twirl: three real swishes in a row (qubodup's swipe, florianreichelt's rod swish, qubodup's swosh; CC0), each a tone higher and panned the other way, and a quick run of wind chimes (VSCO-2 CE) for the sparkle.",
  layers: [
    fs(SWIPE, 0, [{ op: 'trim', to: 0.25 }, { op: 'pitch', st: ST[k] }, { op: 'pan', pos: -0.4 }]),
    fs(QUICK, -1, [{ op: 'trim', from: 0.15, to: 0.35 }, { op: 'pitch', st: 2 + ST[k] }, { op: 'pan', pos: 0.4 }], 0.06),
    fs(SWOSH, -2, [{ op: 'trim', to: 0.3 }, { op: 'pitch', st: 4 + ST[k] }, { op: 'pan', pos: -0.2 }], 0.12),
    vs('VSCO 1 Percussion/varMetal/various/windchimes_fastAsc1.wav', -15, [{ op: 'trim', to: 0.5 }, { op: 'hp', hz: 2000 }, { op: 'fade', out: 0.25 }], 0.1),
  ],
  master: [{ op: 'hp', hz: 150 }, ROOM(0.12), ...END(0.65)] }));

// ---------------------------------------------------------------- boostStart (a perfect rocket start at the go)
const START = "A perfect rocket start at the GO in a polished cartoon kart racing game (Mario Kart World quality): the tires chirp and the kart launches with a big bright rushing burst of flame and air, thrilling and punchy, about a second and a half. No voice, nothing like a weapon.";
const chirp = (db: number, at = 0): Layer => fs(SQUEAL, db, [hit(3, 0.16, -14, 0.3), { op: 'bp', hz: 1300, q: 1 }, { op: 'env', pts: [[0, 0], [0.01, 1], [0.06, 0.5], [0.16, 0]] }], at);
const blast = (st: number, db: number, len: number): Layer => el('steamVent', db, [{ op: 'pitch', st }, { op: 'lp', hz: 5000 }, { op: 'lowshelf', hz: 300, db: 4 }, { op: 'env', pts: [[0, 1], [0.001, 1], [0.1, 0.8], [0.45 * len, 0.3], [len * 0.9, 0]] }, { op: 'trim', to: len }]);
const bsA: Recipe[] = [{ id: 'boostStart', name: 'boostStartA', brief: START,
  why: "A, launch: a real tire chirp (johnnydekk, CC0) as the wheels bite, a rising zing of air (band-passed noise sweeping 0.6 to 5 kHz), the game's own steam-vent blast pitched down 5 semitones for the flame (the drift boosts' family, pinned take), a big real whoosh (northern87, CC0) for the rush and a real pass-by swoop (oscaraudiogeek, CC0) trailing off; a room.",
  layers: [chirp(-6), syn('whoosh', { seconds: 0.45, hz: [[0, 600], [0.35, 5000]], q: 3, env: [[0, 0], [0.08, 1], [0.35, 0.8], [0.45, 0]], seed: 81, color: 'white' }, -9), blast(-5, -2, 1.1), fs(BIG, 0, [{ op: 'trim', from: 0.15, to: 1.45 }, { op: 'fade', in: 0.02 }, { op: 'env', pts: [[0, 0.6], [0.12, 1], [0.6, 0.55], [1.3, 0]] }], 0.03),
    fs(PASSBY, -8, [{ op: 'trim', from: 0.95, to: 1.9 }, { op: 'fade', in: 0.05 }], 0.15)],
  master: [{ op: 'hp', hz: 45 }, { op: 'comp', threshold: -14, ratio: 2.5, attack: 0.004, release: 0.12 }, ROOM(0.1, 0.4), ...END(1.5, 0.45)] }];
const bsB: Recipe[] = [{ id: 'boostStart', name: 'boostStartB', brief: START,
  why: "B, sparkle launch: the shipped tier-3 drift boost (the recipe's own file, pinned at 527a1c0) so the rocket start sits in the boost family, a tire chirp (johnnydekk, CC0) on its front, and a real glockenspiel glissando rising (VSCO-2 CE) 10 dB under it: the reward of a perfect start.",
  layers: [el('boost3', 0, [], 0.02, '527a1c0'), chirp(-7), vs('Miscellania Raw/Misc 2/glock_glisses/glock_fx_up_pentatonic_med_01.wav', -11, [hit(0, 0.7, -20, 0.5), { op: 'hp', hz: 1500 }, { op: 'fade', out: 0.35 }], 0.08)],
  master: [{ op: 'hp', hz: 45 }, ROOM(0.1, 0.4), ...END(1.4, 0.45)] }];
const bsC: Recipe[] = [{ id: 'boostStart', name: 'boostStartC', brief: START,
  why: "C, big air: a real low whoosh (DJT4NN3R, CC0) as the thump of the launch, the long real whoosh (northern87, CC0) for the rush, a real pass-by swoop (oscaraudiogeek, CC0) rising out of it, and the chirp; no flame, all air.",
  layers: [chirp(-7), fs(SHORTLOW, -2, [{ op: 'trim', from: 0.05, to: 0.6 }, { op: 'pitch', st: -2 }]), fs(BIG, -1, [{ op: 'trim', from: 0.1, to: 1.5 }, { op: 'fade', in: 0.05 }], 0.05),
    fs(PASSBY, -4, [{ op: 'trim', from: 0.7, to: 1.9 }, { op: 'pitch', st: 2 }, { op: 'fade', in: 0.1 }], 0.1)],
  master: [{ op: 'hp', hz: 45 }, { op: 'comp', threshold: -14, ratio: 2.5, attack: 0.004, release: 0.12 }, ROOM(0.1, 0.4), ...END(1.5, 0.45)] }];

// ---------------------------------------------------------------- kite (a Homing Kite flies off after the kart ahead)
const KITE = 'The player launches a Homing Kite in a polished cartoon kart racing game (Mario Kart World quality): a paper kite catches the wind with a fast, soft fluttering that rises as it lifts off and zips away after the kart ahead. No voice.';
const kiteA: Recipe[] = [{ id: 'kite', name: 'kiteA', brief: KITE,
  why: "A, real flutter: a real light wing flutter (TurboFool, CC0) bent up 4 semitones as it lifts, a real smooth whoosh (ch_ase, CC0) swelling under it, and a quick air zip as it takes off after its target.",
  layers: [fs(FLUTTER, 0, [{ op: 'trim', from: 0.1, to: 1.3 }, { op: 'bend', st: [[0, 0], [1.1, 4]] }, { op: 'hp', hz: 150 }, { op: 'env', pts: [[0, 0.4], [0.2, 1], [0.8, 0.8], [1.1, 0]] }]),
    fs(LIFT, -6, [{ op: 'trim', from: 0.2, to: 1.4 }, { op: 'pitch', st: 3 }]),
    syn('whoosh', { seconds: 0.3, hz: [[0, 900], [0.28, 3500]], q: 1.3, env: [[0, 0], [0.1, 1], [0.3, 0]], seed: 61 }, -12, [], 0.75)],
  master: [{ op: 'hp', hz: 120 }, ROOM(0.12), ...END(1.2, 0.4)] }];
const kiteB: Recipe[] = [{ id: 'kite', name: 'kiteB', brief: KITE,
  why: "B, flaps that catch: four real single flaps of a flag (ani_music, CC0) coming faster and higher as the wind takes the kite, then the real light flutter (TurboFool, CC0) carrying it off, panned away as it goes.",
  layers: [...FLAPS.map((id, i) => fs(id, -2 - i, [hit(0, 0.2, -20, 0.3), { op: 'pitch', st: i * 1.5 }, { op: 'lp', hz: 6000 }], [0, 0.16, 0.28, 0.37][i])),
    fs(FLUTTER, -2, [{ op: 'trim', from: 0.1, to: 1.0 }, { op: 'bend', st: [[0, 2], [0.9, 5]] }, { op: 'hp', hz: 200 }, { op: 'env', pts: [[0, 0], [0.1, 1], [0.6, 0.7], [0.9, 0]] }, { op: 'doppler', speed: 12, dist: 2, at: 0.1, pan: 0.5 }], 0.42)],
  master: [{ op: 'hp', hz: 100 }, ROOM(0.12), ...END(1.3, 0.35)] }];
const kiteC: Recipe[] = [{ id: 'kite', name: 'kiteC', brief: KITE,
  why: "C, flutter and a homing trill: the real light flutter (TurboFool, CC0) a tone up, real fabric flapping (IENBA, CC0) under it, lifted by the smooth whoosh (ch_ase, CC0), and a soft glockenspiel trill rising G, B, D, G (VSCO-2 CE) as it locks on. (The first C's paper crinkle read as breaking: remade.)",
  layers: [fs(FLUTTER, 0, [{ op: 'trim', from: 0.1, to: 1.2 }, { op: 'pitch', st: 2 }, { op: 'hp', hz: 200 }, { op: 'env', pts: [[0, 0.5], [0.2, 1], [1.0, 0]] }]),
    fs(FABRIC, -7, [{ op: 'trim', from: 1.0, to: 2.1 }, { op: 'pitch', st: 3 }, { op: 'env', pts: [[0, 0], [0.2, 1], [1.0, 0]] }]),
    fs(LIFT, -8, [{ op: 'trim', from: 0.2, to: 1.3 }, { op: 'pitch', st: 3 }]),
    note('G6g', 0.3, 0.3, -16), note('B6g', 0.37, 0.3, -16.5), note('D7g', 0.44, 0.3, -17), note('G7g', 0.51, 0.45, -17.5)],
  master: [{ op: 'hp', hz: 120 }, ROOM(0.14), ...END(1.2, 0.4)] }];

// ---------------------------------------------------------------- fog (a Fog Bank puffs out)
const FOG = 'The Fog Bank item in a polished cartoon kart racing game (Mario Kart World quality): a big soft cloud puffs out and rolls over the karts ahead: a soft whumpf of air and a spreading hiss, cartoonish and gentle. No voice.';
const fogA: Recipe[] = [{ id: 'fog', name: 'fogA', brief: FOG,
  why: "A, puff and spread: a real puff of smoke (qubodup, CC0) for the whumpf, a real air release (brunoboselli, CC0) low-passed and fading as the cloud spreads, widened in stereo, and a low air swell (a band-passed noise whoosh) under it.",
  layers: [fs(PUFF, 0, [{ op: 'trim', to: 0.4 }, { op: 'pitch', st: -3 }]),
    fs(RELEASE, -6, [{ op: 'trim', from: 0.05, to: 1.5 }, { op: 'lp', hz: 5000 }, { op: 'env', pts: [[0, 0], [0.08, 1], [0.5, 0.5], [1.45, 0]] }, { op: 'width', amount: 1.6 }], 0.05),
    syn('whoosh', { seconds: 1.0, hz: [[0, 200], [0.4, 400], [1.0, 250]], q: 0.8, env: [[0, 0], [0.1, 1], [1.0, 0]], seed: 71, color: 'brown' }, -8)],
  master: [{ op: 'hp', hz: 60 }, ROOM(0.15, 0.5), ...END(1.5, 0.45)] }];
const fogB: Recipe[] = [{ id: 'fog', name: 'fogB', brief: FOG,
  why: "B, hiss and billow: a real smoke bomb's hiss (vckhaze, CC0) without its bang, a real air release (brunoboselli, CC0) widened as the cloud rolls out, and a soft low swell under it. (The first B kept the smoke bomb's bang, heard as a door slam: remade.)",
  layers: [fs(BOMB, 0, [{ op: 'trim', from: 0.14, to: 1.3 }, { op: 'fade', in: 0.06 }, { op: 'pitch', st: -2 }, { op: 'width', amount: 1.5 }]),
    fs(RELEASE, -5, [{ op: 'trim', from: 0.05, to: 1.3 }, { op: 'lp', hz: 6000 }, { op: 'env', pts: [[0, 0], [0.1, 1], [0.5, 0.5], [1.25, 0]] }, { op: 'width', amount: 1.6 }], 0.02),
    syn('whoosh', { seconds: 0.9, hz: [[0, 180], [0.3, 350], [0.9, 220]], q: 0.8, env: [[0, 0], [0.12, 1], [0.9, 0]], seed: 73, color: 'brown' }, -9)],
  master: [{ op: 'hp', hz: 60 }, { op: 'highshelf', hz: 6000, db: -3 }, ROOM(0.15, 0.5), ...END(1.3, 0.45)] }];
const fogC: Recipe[] = [{ id: 'fog', name: 'fogC', brief: FOG,
  why: "C, soft cloud: a real poof (Planman, CC0) and a real air release (mcpable, 'Slips air release v1', CC0) as the cloud billows out, and a real maraca's shake (VSCO-2 CE) 16 dB under it for the fine mist settling. (The first C's soft swish read to AST as breathing: remade.)",
  layers: [fs(POOF, 0, [{ op: 'trim', from: 0.2, to: 0.7 }, { op: 'pitch', st: -5 }]), fs(131934, -3, [{ op: 'trim', to: 1.4 }, { op: 'fade', in: 0.04, out: 0.5 }, { op: 'lp', hz: 7000 }], 0.04),
    vs('VSCO 1 Percussion/varWood/maraca_shake.wav', -16, [{ op: 'trim', to: 1.0 }, { op: 'hp', hz: 3000 }, { op: 'fade', in: 0.2, out: 0.5 }], 0.25)],
  master: [{ op: 'hp', hz: 60 }, ROOM(0.15, 0.5), ...END(1.4, 0.45)] }];

export const RECIPES: readonly Recipe[] = [...throwA, ...throwB, ...throwC, ...trickA, ...trickB, ...trickC, ...bsA, ...bsB, ...bsC, ...kiteA, ...kiteB, ...kiteC, ...fogA, ...fogB, ...fogC];
