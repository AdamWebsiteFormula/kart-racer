// Driving impact candidates (28 Sept 2026, for Adam's ears; not installed): hop, land, bump, wall, hit. One family:
// the karts are toys with rubber bumpers, plastic bodies and small springy suspensions, so every impact is a real
// recorded rubber, plastic or spring (CC0 on Freesound, VSCO-2 CE, Kenney) layered transient + body + tail, carved so
// each layer keeps its own band, finished with a short real room. Each candidate comes as 3-4 takes (`~2`, `~3`...,
// a different recorded hit and a small pitch step each) for the game to pick at random, so a sound heard every few
// seconds never repeats exactly.
import type { Fx, Layer, Recipe } from '../types.ts';

const fs = (id: number, db: number, fx: Fx[] = [], at = 0): Layer => ({ at, src: { freesound: id }, fx: [...fx, { op: 'normalize', db: 0 }, { op: 'gain', db }] });
const vs = (path: string, db: number, fx: Fx[] = [], at = 0): Layer => ({ at, src: { pack: `vsco/${path}` }, fx: [...fx, { op: 'normalize', db: 0 }, { op: 'gain', db }] });
const ke = (path: string, db: number, fx: Fx[] = [], at = 0): Layer => ({ at, src: { pack: `kenney/${path}` }, fx: [...fx, { op: 'normalize', db: 0 }, { op: 'gain', db }] });
const syn = (synth: 'modal' | 'squeal' | 'noise' | 'whoosh', args: Record<string, unknown>, db: number, fx: Fx[] = [], at = 0): Layer =>
  ({ at, src: { synth, args: args as never }, fx: [...fx, { op: 'normalize', db: 0 }, { op: 'gain', db }] });
const hit = (n: number, len: number, floor = -16, gap = 0.2): Fx => ({ op: 'hit', n, len, floor, gap });
/** a short real room: bodywork and ground reflections, no hall */
const ROOM = (mix = 0.1): Fx => ({ op: 'room', mix, size: [3.2, 2.4, 2.0], absorb: 0.5, tail: 0.18, tailLevel: 0.2, hp: 200, lp: 8000 });
const END = (len: number): Fx[] => [{ op: 'trim', to: len }, { op: 'fade', out: len * 0.35 }, { op: 'limit', ceiling: -1 }];

// the recorded takes (Freesound, CC0; their authors in scripts/sfx/freesound.json)
const TIRE_PUNCH = 445781;   // DDT197, "Punching rubber tire": 7 punches (hits 0-6), a real tire's thump
const CUSHION = 593948;      // mincedbeats, "Cushion Impacts": 7 soft whumps
const BANG = 54850;          // qubodup, "Rubber Metal Wood Impact Collision Bang": 4 bangs
const PLASTIC = 581278;      // NetX_Gameplays, "Thumps and bumps of plastic": many small plastic knocks
const BONK = 466202;         // Harrisando, "Bonk": a hollow bonk ringing at 350 and 900 Hz
const THUD = 339114;         // xggw, "thud": a thick low thud
const BOING = 540790;        // magnuswaker, "Boing 2"
const JAW = 95600;           // 3bagbrew, "jaw_harp2"
const BALL = 423778;         // SomeoneCool15, "Rubber ball bouncing": 8 bounces
const SQUEAL = 614627;       // johnnydekk, "screeching tyres / tires": many short squeals

const takes = (base: string, n: number, make: (k: number) => Omit<Recipe, 'name'>): Recipe[] =>
  Array.from({ length: n }, (_, k) => ({ ...make(k), name: k === 0 ? base : `${base}~${k + 1}` }));
const ST = [0, 0.7, -0.6, 1.3]; // each take a small pitch step

// ---------------------------------------------------------------- hop (very frequent: light, quick, never tiring)
const HOP = 'The kart hops to start a drift in a polished cartoon kart racing game (Mario Kart World quality): a light, quick, springy hop off the suspension, bright and bouncy, very short; heard at nearly every corner, so never heavy or tiring. No voice.';
const hopA = takes('hopA', 3, (k) => ({ id: 'hop', brief: HOP,
  why: "A, springy tire: the attack of a real cartoon boing (magnuswaker, 'Boing 2', CC0) cut to 0.13 s and pitched up to a light 'bwip', a rubber ball's bounce (SomeoneCool15, CC0) for the tire leaving the road, a plastic tick for the body; a short room. Three takes: another bounce and a small pitch step each.",
  layers: [
    fs(BOING, 0, [{ op: 'trim', to: 0.16 }, { op: 'pitch', st: 4 + ST[k] }, { op: 'env', pts: [[0, 1], [0.05, 0.6], [0.12, 0]] }, { op: 'hp', hz: 250 }]),
    fs(BALL, -5, [hit([0, 2, 5][k], 0.2, -16), { op: 'pitch', st: 3 + ST[k] }, { op: 'lp', hz: 4000 }]),
    fs(PLASTIC, -14, [hit([1, 3, 6][k], 0.12, -16), { op: 'hp', hz: 800 }], 0.004),
  ],
  master: [{ op: 'transient', attack: 3, sustain: -3 }, ROOM(0.08), ...END(0.22)] }));
const hopB = takes('hopB', 3, (k) => ({ id: 'hop', brief: HOP,
  why: "B, suspension pop: a rubber mode bank struck softly that bends up 3 semitones as the kart leaves the road (physics.py modal synthesis: a 'boink' up), a quick air 'fwip' (band-passed noise sweeping up), and a real rubber-tire punch (DDT197, CC0) 10 dB under for weight; a short room.",
  layers: [
    syn('modal', { seconds: 0.25, hz: 196 * Math.pow(2, ST[k] / 12), material: 'rubber', ring: 1.3, contact: 0.004, glide: [[0, 0], [0.07, 3]], seed: 5 + k, click: 0.2 }, 0),
    syn('whoosh', { seconds: 0.12, hz: [[0, 900], [0.1, 3200]], q: 1.2, env: [[0, 0], [0.02, 1], [0.12, 0]], seed: 9 + k, color: 'pink' }, -12),
    fs(TIRE_PUNCH, -10, [hit([1, 4, 6][k], 0.18), { op: 'pitch', st: 5 }, { op: 'hp', hz: 150 }]),
  ],
  master: [{ op: 'peak', hz: 2500, db: 2, q: 1 }, ROOM(0.08), ...END(0.24)] }));
const hopC = takes('hopC', 3, (k) => ({ id: 'hop', brief: HOP,
  why: "C, jaw-harp spring: the first twang of a real jaw harp (3bagbrew, CC0), its formant's upward swing only (0.12 s), tuned to the menus' G major (G5), on a soft plastic knock; the classic cartoon spring, kept tiny.",
  layers: [
    fs(JAW, 0, [{ op: 'trim', from: 0.07, to: 0.24 }, { op: 'pitch', st: 3 + ST[k] }, { op: 'fade', in: 0.002 }, { op: 'env', pts: [[0, 1], [0.06, 0.55], [0.14, 0]] }, { op: 'hp', hz: 200 }]),
    fs(PLASTIC, -8, [hit([0, 5, 9][k], 0.1, -16), { op: 'lp', hz: 3000 }]),
  ],
  master: [{ op: 'transient', attack: 2 }, ROOM(0.08), ...END(0.2)] }));

// ---------------------------------------------------------------- land (after a hop or a jump: weight and a chirp)
const LAND = 'A go-kart lands on asphalt after a hop or a small jump in a polished cartoon kart racing game (Mario Kart World quality): a solid, rubbery thump of the tires and suspension taking the weight, with a quick tire chirp; punchy and satisfying, heard often. No voice.';
const chirp = (n: number, db: number, at = 0.018): Layer => fs(SQUEAL, db, [hit(n, 0.09, -14, 0.3), { op: 'bp', hz: 1300, q: 1.2 }, { op: 'env', pts: [[0, 0], [0.006, 1], [0.03, 0.45], [0.09, 0]] }], at);
const landA = takes('landA', 3, (k) => ({ id: 'land', brief: LAND,
  why: "A, tire and chirp: a real rubber tire's thump (DDT197, 'Punching rubber tire', CC0) with its lows reinforced, a 90 ms tire chirp cut from a real screech (johnnydekk, CC0) 18 ms later, and a plastic body rattle; a short room. Three takes: another punch, chirp and rattle each.",
  layers: [
    fs(TIRE_PUNCH, 0, [hit([0, 3, 5][k], 0.35), { op: 'pitch', st: ST[k] - 1 }, { op: 'lowshelf', hz: 150, db: 4 }]),
    chirp([2, 7, 12][k], -11),
    fs(PLASTIC, -15, [hit([3, 11, 13][k], 0.15, -16), { op: 'hp', hz: 600 }], 0.006),
  ],
  master: [{ op: 'hp', hz: 40 }, { op: 'transient', attack: 3 }, { op: 'sat', drive: 2.5, mix: 0.15 }, ROOM(0.1), ...END(0.45)] }));
const landB = takes('landB', 3, (k) => ({ id: 'land', brief: LAND,
  why: "B, heavier bounce: a thick real thud (xggw, CC0) low-passed for weight, a rubber ball's bounce (SomeoneCool15, CC0) for the tires' spring, a tire chirp from a real screech and a sub thump from a rubber mode bank (physics.py) so it lands on small speakers too.",
  layers: [
    fs(THUD, -1, [{ op: 'trim', from: 0.24, to: 0.6 }, { op: 'pitch', st: ST[k] }, { op: 'lp', hz: 2500 }, { op: 'env', pts: [[0, 1], [0.07, 0.45], [0.26, 0]] }]),
    fs(BALL, -6, [hit([1, 3, 7][k], 0.25, -16), { op: 'pitch', st: -2 }]),
    syn('modal', { seconds: 0.2, hz: 92, material: 'rubber', ring: 1.0, contact: 0.006, glide: [[0, 0], [0.1, -2]], seed: 3 + k }, -9),
    chirp([4, 9, 15][k], -12, 0.02),
  ],
  master: [{ op: 'hp', hz: 50 }, { op: 'transient', attack: 3, sustain: -4 }, ROOM(0.1), ...END(0.32)] }));
const landC = takes('landC', 3, (k) => ({ id: 'land', brief: LAND,
  why: "C, cartoon bomp: a rubber mode bank that sags 4 semitones as it squashes (physics.py: the landing 'bomp'), a real tire punch (DDT197, CC0) for the contact, the tail of a real spring wobble (EagleStealthTeam, 'Springy Bounce', CC0) 16 dB under, and a chirp.",
  layers: [
    syn('modal', { seconds: 0.35, hz: 130 * Math.pow(2, ST[k] / 12), material: 'rubber', ring: 1.6, contact: 0.006, glide: [[0, 0], [0.1, -4]], seed: 11 + k, click: 0.25 }, 0),
    fs(TIRE_PUNCH, -4, [hit([2, 4, 6][k], 0.3)]),
    fs(238866, -16, [{ op: 'trim', from: 0.12, to: 0.45 }, { op: 'fade', in: 0.01 }, { op: 'hp', hz: 300 }], 0.03),
    chirp([5, 10, 14][k], -13),
  ],
  master: [{ op: 'hp', hz: 40 }, { op: 'transient', attack: 2 }, ROOM(0.1), ...END(0.45)] }));

// ---------------------------------------------------------------- bump (two karts touch: very frequent in the pack)
const BUMP = 'Two go-karts bump into each other in a polished cartoon kart racing game (Mario Kart World quality): one quick, rubbery, toy-like bonk of two bumpers, bouncy and fun, never a crash; very frequent in the pack. No voice.';
const bumpA = takes('bumpA', 4, (k) => ({ id: 'bump', brief: BUMP,
  why: "A, rubber bonk: a real hollow bonk (Harrisando, 'Bonk', CC0) pitched down to a fatter toy bumper, a real rubber tire's thump (DDT197, CC0) under it, the crack of a real collision (qubodup, CC0) high-passed for the snap; four takes, each a different tire punch and a pitch step.",
  layers: [
    fs(BONK, 0, [{ op: 'trim', from: 0.2, to: 0.6 }, { op: 'pitch', st: -2 + ST[k] }, { op: 'fade', in: 0.001 }, { op: 'env', pts: [[0, 1], [0.05, 0.55], [0.2, 0]] }]),
    fs(TIRE_PUNCH, -3, [hit([0, 1, 3, 5][k], 0.3), { op: 'lp', hz: 1500 }]),
    fs(BANG, -12, [hit(k, 0.06, -20, 0.5), { op: 'hp', hz: 1800 }]),
  ],
  master: [{ op: 'hp', hz: 60 }, { op: 'transient', attack: 3, sustain: -2 }, ROOM(0.1), ...END(0.35)] }));
const bumpB = takes('bumpB', 4, (k) => ({ id: 'bump', brief: BUMP,
  why: "B, toy bumpers: two struck bodies from physics.py's modal synthesis (a hollow plastic shell near 240 Hz and a rubber bumper near 120 Hz, a soft contact), a real plastic knock (NetX_Gameplays, CC0) on top for the click of it, a short room; four takes.",
  layers: [
    syn('modal', { seconds: 0.4, hz: 240 * Math.pow(2, ST[k] / 12), material: 'hollow', ring: 0.8, contact: 0.002, seed: 21 + k, click: 0.3 }, 0),
    syn('modal', { seconds: 0.3, hz: 118 * Math.pow(2, ST[k] / 12), material: 'rubber', ring: 1.2, contact: 0.005, seed: 31 + k }, -3),
    fs(PLASTIC, -6, [hit([1, 3, 11, 13][k], 0.08, -16), { op: 'hp', hz: 500 }]),
  ],
  master: [{ op: 'hp', hz: 60 }, { op: 'sat', drive: 2, mix: 0.15 }, ROOM(0.1), ...END(0.3)] }));
const bumpC = takes('bumpC', 4, (k) => ({ id: 'bump', brief: BUMP,
  why: "C, boingy bump: a real low thud (xela_sonitus, 'bonk', CC0) for the bodies, the first 80 ms of a real cartoon boing (magnuswaker, CC0) for the rubber's give, a plastic tick on top; four takes.",
  layers: [
    fs(262703, 0, [hit([0, 1, 0, 1][k], 0.3, -12, 1.0), { op: 'pitch', st: ST[k] + 2 }]),
    fs(BOING, -7, [{ op: 'trim', to: 0.1 }, { op: 'pitch', st: -3 + ST[k] }, { op: 'env', pts: [[0, 1], [0.1, 0]] }, { op: 'hp', hz: 300 }], 0.004),
    fs(PLASTIC, -12, [hit([0, 5, 9, 14][k], 0.1, -16), { op: 'hp', hz: 900 }]),
  ],
  master: [{ op: 'hp', hz: 60 }, { op: 'transient', attack: 2 }, ROOM(0.1), ...END(0.32)] }));

// ---------------------------------------------------------------- wall (a padded barrier)
const WALL = 'A go-kart bumps a padded track barrier in a polished cartoon kart racing game (Mario Kart World quality): one deep, dull, cushioned whump of rubber and padding, then a short rubbery scrape as it slides off; soft and bouncy, never a crash. No voice.';
// the rubber sliding off the padding: a short rubbery scrub (pink noise band-passed at 1.3 kHz, a fast grainy flutter
// over it). A tire squeal pitched down (the first try) read as a sigh and a grunt to AST: no pitched layer here.
const scrape = (db: number, at: number, k: number): Layer => syn('noise', { seconds: 0.22, color: 'pink', seed: 101 + k, env: [[0, 0], [0.02, 1], [0.09, 0.55], [0.22, 0]] }, db,
  [{ op: 'bp', hz: 1300 + 150 * k, q: 1.1 }, { op: 'flutter', depth: 0.7, rate: 90, seed: 7 + k }], at);
const wallA = takes('wallA', 3, (k) => ({ id: 'wall', brief: WALL,
  why: "A, tire wall: a real rubber tire's thump (DDT197, CC0) with a real cushion's whump (mincedbeats, CC0) under it for the padding, and a short rubbery scrub (band-passed noise with a grainy flutter) as the kart slides off; three takes.",
  layers: [
    fs(TIRE_PUNCH, 0, [hit([0, 3, 5][k], 0.4), { op: 'pitch', st: -2 + ST[k] }]),
    fs(CUSHION, -2, [hit([0, 2, 4][k], 0.5, -20, 0.6), { op: 'lp', hz: 1800 }]),
    scrape(-13, 0.05, k),
  ],
  master: [{ op: 'hp', hz: 40 }, { op: 'lowshelf', hz: 120, db: 3 }, { op: 'sat', drive: 2.5, mix: 0.15 }, ROOM(0.12), ...END(0.55)] }));
const wallB = takes('wallB', 3, (k) => ({ id: 'wall', brief: WALL,
  why: "B, cushion whump: a real cushion impact (mincedbeats, CC0) as the body, a thick real thud (xggw, CC0) low-passed under it, a plastic rattle as the bodywork shakes, and the scrape; softer and rounder than A.",
  layers: [
    fs(CUSHION, 0, [hit([1, 3, 5][k], 0.55, -20, 0.6), { op: 'pitch', st: ST[k] }]),
    fs(THUD, -4, [{ op: 'trim', from: 0.24, to: 0.6 }, { op: 'lp', hz: 900 }, { op: 'env', pts: [[0, 1], [0.08, 0.45], [0.3, 0]] }]),
    fs(PLASTIC, -14, [hit([4, 8, 12][k], 0.2, -16), { op: 'hp', hz: 700 }], 0.02),
    scrape(-14, 0.06, k),
  ],
  master: [{ op: 'hp', hz: 40 }, ROOM(0.12), ...END(0.6)] }));
const wallC = takes('wallC', 3, (k) => ({ id: 'wall', brief: WALL,
  why: "C, bounce-off: a real tire punch (DDT197, CC0) and the low body of a real collision (qubodup, CC0, its crack filtered off), then a small cartoon boing (magnuswaker, CC0) as the kart bounces off the padding; the scrape under it.",
  layers: [
    fs(TIRE_PUNCH, 0, [hit([1, 4, 6][k], 0.35), { op: 'pitch', st: -1 + ST[k] }]),
    fs(BANG, -6, [hit([0, 1, 2][k], 0.5, -20, 0.5), { op: 'lp', hz: 1200 }]),
    fs(BOING, -13, [{ op: 'trim', to: 0.28 }, { op: 'pitch', st: -5 + ST[k] }, { op: 'env', pts: [[0, 0], [0.02, 1], [0.28, 0]] }], 0.05),
    scrape(-15, 0.04, k),
  ],
  master: [{ op: 'hp', hz: 40 }, { op: 'transient', attack: 2 }, ROOM(0.12), ...END(0.55)] }));

// ---------------------------------------------------------------- hit (bonked by an item: slowed, not spun)
const HIT = "The player's go-kart is bonked by a thrown toy item in a polished cartoon kart racing game (Mario Kart World quality): a bouncy cartoon bonk with a small plastic crash and a little dizzy twinkle, comic and punchy, never violent. No voice.";
const hitA = takes('hitA', 3, (k) => ({ id: 'hit', brief: HIT,
  why: "A, bonk and crash: a real hollow bonk (Harrisando, CC0), a plastic crash from Kenney's impacts (CC0), bits rattling (a real maraca, VSCO-2 CE), and two quiet glockenspiel notes falling (a dizzy twinkle, G major, VSCO-2 CE) under it; three takes.",
  layers: [
    fs(BONK, 0, [{ op: 'trim', from: 0.2, to: 0.75 }, { op: 'pitch', st: ST[k] }, { op: 'fade', in: 0.001 }, { op: 'env', pts: [[0, 1], [0.08, 0.5], [0.34, 0]] }]),
    ke(`kenney_impact-sounds/Audio/impactPlate_heavy_00${[0, 2, 4][k]}.ogg`, -7, [{ op: 'hp', hz: 500 }]),
    vs(`VSCO 1 Percussion/varWood/maraca${[1, 3, 5][k]}.wav`, -13, [{ op: 'hp', hz: 1500 }], 0.03),
    vs('Glock/glock_medium_G5.wav', -14, [{ op: 'pitch', st: 3.88 }, { op: 'env', pts: [[0, 1], [0.1, 0.4], [0.3, 0]] }, { op: 'trim', to: 0.3 }], 0.09),
    vs('Glock/glock_medium_G5.wav', -15, [{ op: 'pitch', st: -0.12 }, { op: 'env', pts: [[0, 1], [0.1, 0.4], [0.35, 0]] }, { op: 'trim', to: 0.35 }], 0.17),
  ],
  master: [{ op: 'hp', hz: 60 }, { op: 'transient', attack: 3 }, ROOM(0.12), ...END(0.7)] }));
const hitB = takes('hitB', 3, (k) => ({ id: 'hit', brief: HIT,
  why: "B, the cartoon toolbox: a real slapstick crack, a log drum's tonal bonk and a flexatone's wobble (all VSCO-2 CE, CC0: the orchestral percussion classic cartoons are scored with), on a plastic knock; three takes.",
  layers: [
    vs(`VSCO 1 Percussion/varWood/slapstick${[1, 2, 3][k]}.wav`, -3, [{ op: 'trim', to: 0.25 }, { op: 'hp', hz: 300 }]),
    vs(`VSCO 1 Percussion/varWood/log_drum/slitdrum${[1, 2, 3][k]}_ff_1.wav`, 0, [{ op: 'trim', to: 0.5 }, { op: 'pitch', st: 2 + ST[k] }]),
    vs('VSCO 1 Percussion/varMetal/various/flexatone_slap1.wav', -12, [hit(0, 0.45, -20, 0.3), { op: 'fade', out: 0.25 }], 0.05),
    fs(PLASTIC, -9, [hit([3, 11, 15][k], 0.15, -16), { op: 'hp', hz: 600 }]),
  ],
  master: [{ op: 'hp', hz: 60 }, ROOM(0.12), ...END(0.7)] }));
const hitC = takes('hitC', 3, (k) => ({ id: 'hit', brief: HIT,
  why: "C, rubber smack: a real rubber ball's hard hit (cupido-1, 'hit ball rubber', CC0), a real low thud (xela_sonitus, CC0) and the crash of a plastic plate (Kenney, CC0), a quick cartoon boing sagging as the kart slows; three takes.",
  layers: [
    fs(456318, 0, [hit([1, 4, 5][k], 0.35, -16, 0.2), { op: 'pitch', st: ST[k] }]),
    fs(262703, -4, [hit([0, 1, 0][k], 0.3, -12, 1.0)]),
    ke(`kenney_impact-sounds/Audio/impactPlate_medium_00${[1, 3, 4][k]}.ogg`, -8, [{ op: 'hp', hz: 600 }]),
    fs(BOING, -12, [{ op: 'trim', to: 0.35 }, { op: 'bend', st: [[0, 0], [0.35, -5]] }, { op: 'env', pts: [[0, 0], [0.02, 1], [0.35, 0]] }], 0.05),
  ],
  master: [{ op: 'hp', hz: 60 }, { op: 'transient', attack: 2 }, ROOM(0.12), ...END(0.7)] }));

export const RECIPES: readonly Recipe[] = [...hopA, ...hopB, ...hopC, ...landA, ...landB, ...landC, ...bumpA, ...bumpB, ...bumpC, ...wallA, ...wallB, ...wallC, ...hitA, ...hitB, ...hitC];
