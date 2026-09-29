// Driving impact candidates (28 Sept 2026, for Adam's ears; not installed): hop, land, bump, wall, hit. Re-aimed the
// same day at Adam's word on the vibe, "cool, and not corny, cheesy or cartoony": no boings, jaw harps, slapsticks or
// twinkles. Every impact is a real recorded tire, rubber, cushion, plastic or metal (CC0 on Freesound, Kenney), layered
// the way modern racing games build hits: a transient (the snap), a body (the thump) and a short tail, a sub only
// where the weight needs it, carved so each keeps its own band, a touch of saturation, a short real room (image
// sources). Each candidate comes as 3-4 takes (`~2`, `~3`...: a different recorded hit and a small pitch step) for the
// game to pick at random, so a sound heard every few seconds never repeats exactly.
import type { Fx, Layer, Recipe } from '../types.ts';
import { fs, hit, ke, syn, takes } from './kit.ts';

/** a short real room: bodywork and ground reflections, no hall */
const ROOM = (mix = 0.1): Fx => ({ op: 'room', mix, size: [3.2, 2.4, 2.0], absorb: 0.5, tail: 0.18, tailLevel: 0.2, hp: 200, lp: 8000 });
const END = (len: number): Fx[] => [{ op: 'trim', to: len }, { op: 'fade', out: len * 0.35 }, { op: 'limit', ceiling: -1 }];
const K = (f: string) => `kenney_impact-sounds/Audio/${f}.ogg`;

// the recorded takes (Freesound, CC0; their authors in scripts/sfx/freesound.json)
const TIRE_PUNCH = 445781;   // DDT197, "Punching rubber tire": 7 punches (hits 0-6), a real tire's thump
const CUSHION = 593948;      // mincedbeats, "Cushion Impacts": 7 soft whumps
const BANG = 54850;          // qubodup, "Rubber Metal Wood Impact Collision Bang": 4 bangs
const PLASTIC = 581278;      // NetX_Gameplays, "Thumps and bumps of plastic": many small plastic knocks
const THUD = 339114;         // xggw, "thud": a thick low thud
const SQUEAL = 614627;       // johnnydekk, "screeching tyres / tires": many short squeals
const BALL_HIT = 456318;     // cupido-1, "hit ball rubber": 20 hard rubber hits
const SWISH = 463763;        // hz37, "throw swish x12": real arm swishes
const SWOSH = 60026;         // qubodup, "Swosh swoosh whoosh"

const ST = [0, 0.7, -0.6, 1.3]; // each take a small pitch step
/** a tire's short scuff or chirp, cut from a real screech and band-passed */
const chirp = (n: number, db: number, at = 0.018, len = 0.09, hz = 1300): Layer =>
  fs(SQUEAL, db, [hit(n, len, -14, 0.3), { op: 'bp', hz, q: 1.2 }, { op: 'env', pts: [[0, 0], [0.006, 1], [len / 3, 0.45], [len, 0]] }], at);
/** the rubber sliding off: a short scrub (pink noise band-passed with a grainy flutter; no pitched layer, which AST heard as a voice) */
const scrub = (db: number, at: number, k: number, len = 0.22): Layer => syn('noise', { seconds: len, color: 'pink', seed: 101 + k, env: [[0, 0], [0.02, 1], [0.09, 0.55], [len, 0]] }, db,
  [{ op: 'bp', hz: 1300 + 150 * k, q: 1.1 }, { op: 'flutter', depth: 0.7, rate: 90, seed: 7 + k }], at);

// ---------------------------------------------------------------- hop (very frequent: light, quick, never tiring)
const HOP = 'The kart hops to start a drift in a polished kart racing game (Mario Kart World quality): a light, quick, tight pop of the suspension and tires leaving the road, crisp and satisfying, very short; heard at nearly every corner, so never heavy, tiring or cartoony. No voice.';
const hopA = takes('hopA', 3, (k) => ({ id: 'hop', brief: HOP,
  why: "A, tire pop: a real rubber tire's punch (DDT197, CC0) pitched up 4 semitones to a light kart's and cut to 0.15 s, a quick breath of air under it (a real arm swish, hz37, CC0, low-passed) and the faintest chassis tick (Kenney's light metal, 22 dB down); a short room. Three takes: another punch and swish and a small pitch step each.",
  layers: [
    fs(TIRE_PUNCH, 0, [hit([0, 3, 5][k], 0.16), { op: 'pitch', st: 4 + ST[k] }, { op: 'hp', hz: 160 }, { op: 'env', pts: [[0, 1], [0.05, 0.5], [0.15, 0]] }]),
    fs(SWISH, -12, [hit([1, 4, 8][k], 0.12), { op: 'pitch', st: -3 }, { op: 'lp', hz: 2500 }, { op: 'env', pts: [[0, 0.6], [0.03, 1], [0.12, 0]] }]),
    ke(K(`impactMetal_light_00${k}`), -22, [{ op: 'hp', hz: 3000 }, { op: 'trim', to: 0.06 }], 0.004),
  ],
  master: [{ op: 'transient', attack: 3, sustain: -3 }, ROOM(0.06), ...END(0.2)] }));
const hopB = takes('hopB', 3, (k) => ({ id: 'hop', brief: HOP,
  why: "B, suspension: a rubber mount struck softly (physics.py modal synthesis near 150 Hz, lifting just one semitone as the kart leaves the road: a hop, not a boink), a real tire's punch 8 dB under it for texture (DDT197, CC0) and a short real swish (hz37, CC0); a short room.",
  layers: [
    syn('modal', { seconds: 0.22, hz: 150 * Math.pow(2, ST[k] / 12), material: 'rubber', ring: 1.0, contact: 0.005, glide: [[0, 0], [0.06, 1]], seed: 5 + k, click: 0.15 }, 0),
    fs(TIRE_PUNCH, -8, [hit([0, 3, 6][k], 0.15), { op: 'pitch', st: 6 }, { op: 'hp', hz: 200 }]),
    fs(SWISH, -14, [hit([1, 5, 8][k], 0.12), { op: 'hp', hz: 400 }, { op: 'fade', out: 0.05 }]),
  ],
  master: [{ op: 'peak', hz: 2500, db: 1.5, q: 1 }, ROOM(0.06), ...END(0.2)] }));
const hopC = takes('hopC', 3, (k) => ({ id: 'hop', brief: HOP,
  why: "C, scuff and lift: the tires' short scuff as they leave the road (50 ms of a real screech, johnnydekk, CC0, band-passed), a short low thump for the body (Kenney's soft medium impact pitched up 5 semitones) with a real plastic tick on it (NetX_Gameplays, CC0: the chassis) and a quick real swish for the lift (hz37, CC0); the lightest of the three. (A punch-bag body read as a grunt to AST: replaced.)",
  layers: [
    chirp([6, 12, 18][k], -9, 0, 0.05, 1700),
    ke(K(`impactSoft_medium_00${[0, 2, 4][k]}`), 0, [{ op: 'pitch', st: 5 + ST[k] }, { op: 'hp', hz: 120 }, { op: 'trim', to: 0.14 }, { op: 'fade', out: 0.05 }]),
    fs(PLASTIC, -12, [hit([0, 2, 6][k], 0.06, -16), { op: 'hp', hz: 700 }]),
    fs(SWISH, -11, [hit([0, 2, 6][k], 0.14), { op: 'hp', hz: 400 }, { op: 'fade', out: 0.05 }]),
  ],
  master: [{ op: 'transient', attack: 2 }, ROOM(0.06), ...END(0.2)] }));

// ---------------------------------------------------------------- land (after a hop or a jump: weight and a chirp)
const LAND = 'A go-kart lands on asphalt after a hop or a small jump in a polished kart racing game (Mario Kart World quality): a solid, rubbery thump of the tires and suspension taking the weight, with a quick tire chirp; punchy and satisfying, heard often, never cartoony. No voice.';
const landA = takes('landA', 3, (k) => ({ id: 'land', brief: LAND,
  why: "A, tire and chirp: a real rubber tire's thump (DDT197, 'Punching rubber tire', CC0) with its lows reinforced, a 90 ms tire chirp cut from a real screech (johnnydekk, CC0) 18 ms later, and a plastic body rattle; a short room. Three takes: another punch, chirp and rattle each.",
  layers: [
    fs(TIRE_PUNCH, 0, [hit([0, 3, 1][k], 0.35), { op: 'pitch', st: ST[k] - 1 }, { op: 'lowshelf', hz: 150, db: 4 }]),
    chirp([2, 7, 12][k], -11),
    fs(PLASTIC, -15, [hit([3, 11, 13][k], 0.15, -16), { op: 'hp', hz: 600 }], 0.006),
  ],
  master: [{ op: 'hp', hz: 40 }, { op: 'transient', attack: 3 }, { op: 'sat', drive: 2.5, mix: 0.15 }, ROOM(0.1), ...END(0.45)] }));
const landB = takes('landB', 3, (k) => ({ id: 'land', brief: LAND,
  why: "B, two axles: a real tire's thump for the front wheels (DDT197, CC0) and another 28 ms later, a semitone lower and 3 dB down, for the rear, a short low thump under them (Kenney's soft medium impact: the weight) and a tire chirp from a real screech (johnnydekk, CC0).",
  layers: [
    fs(TIRE_PUNCH, 0, [hit([1, 2, 4][k], 0.3), { op: 'pitch', st: ST[k] }]),
    fs(TIRE_PUNCH, -3, [hit([3, 5, 6][k], 0.3), { op: 'pitch', st: ST[k] - 1 }], 0.028),
    ke(K(`impactSoft_medium_00${k}`), -6, [{ op: 'lp', hz: 300 }, { op: 'trim', to: 0.15 }, { op: 'fade', out: 0.06 }]),
    chirp([1, 13, 19][k], -12, 0.03),
  ],
  master: [{ op: 'hp', hz: 40 }, { op: 'transient', attack: 2 }, { op: 'sat', drive: 2.5, mix: 0.15 }, ROOM(0.1), ...END(0.42)] }));
const landC = takes('landC', 3, (k) => ({ id: 'land', brief: LAND,
  why: "C, heavy landing: a thick real thud (xggw, CC0) shaped to a quarter second, a real tire's punch on it (DDT197, CC0), the chassis' short metal clunk (Kenney's light metal impact, low-passed at 3 kHz, 16 dB down) and a tire chirp; the weightiest of the three, for the big jumps.",
  layers: [
    fs(THUD, -1, [{ op: 'trim', from: 0.24, to: 0.6 }, { op: 'pitch', st: ST[k] }, { op: 'lp', hz: 2500 }, { op: 'env', pts: [[0, 1], [0.07, 0.45], [0.26, 0]] }]),
    fs(TIRE_PUNCH, -4, [hit([2, 4, 6][k], 0.3)]),
    ke(K(`impactMetal_medium_00${k}`), -16, [{ op: 'lp', hz: 3000 }, { op: 'trim', to: 0.15 }, { op: 'fade', out: 0.08 }], 0.008),
    chirp([18, 6, 13][k], -13),
  ],
  master: [{ op: 'hp', hz: 40 }, { op: 'transient', attack: 2 }, { op: 'sat', drive: 2.2, mix: 0.15 }, ROOM(0.1), ...END(0.45)] }));

// ---------------------------------------------------------------- bump (two karts touch: very frequent in the pack)
const BUMP = 'Two go-karts bump into each other in a polished kart racing game (Mario Kart World quality): one quick, solid, rubbery knock of two bumpers, punchy and satisfying, never a crash and never cartoony; very frequent in the pack. No voice.';
const bumpA = takes('bumpA', 4, (k) => ({ id: 'bump', brief: BUMP,
  why: "A, rubber bumpers: a real rubber tire's punch (DDT197, CC0) and another 9 ms later, two semitones up (the other kart), the snap of a real punch's attack (Kenney's medium punch, high-passed at 1.5 kHz) and a short rubber scrub; four takes.",
  layers: [
    fs(TIRE_PUNCH, 0, [hit([0, 1, 3, 5][k], 0.28), { op: 'pitch', st: ST[k] }]),
    fs(TIRE_PUNCH, -4, [hit([2, 4, 6, 0][k], 0.25), { op: 'pitch', st: 2 + ST[k] }], 0.009),
    ke(K(`impactPunch_medium_00${k}`), -10, [{ op: 'hp', hz: 1500 }, { op: 'trim', to: 0.08 }, { op: 'fade', out: 0.04 }]),
    scrub(-16, 0.02, k, 0.15),
  ],
  master: [{ op: 'hp', hz: 60 }, { op: 'transient', attack: 3, sustain: -2 }, { op: 'sat', drive: 2, mix: 0.12 }, ROOM(0.1), ...END(0.3)] }));
const bumpB = takes('bumpB', 4, (k) => ({ id: 'bump', brief: BUMP,
  why: "B, padded bumpers: a real cushion's whump (mincedbeats, CC0), a real plastic knock on top (NetX_Gameplays, CC0: the fairing) and a real tire's punch low-passed under both (DDT197, CC0); softer and rounder than A; four takes.",
  layers: [
    fs(CUSHION, 0, [hit([0, 2, 4, 6][k], 0.35, -20, 0.6), { op: 'pitch', st: 1 + ST[k] }]),
    fs(PLASTIC, -8, [hit([1, 3, 11, 13][k], 0.08, -16), { op: 'hp', hz: 500 }]),
    fs(TIRE_PUNCH, -5, [hit([3, 5, 1, 2][k], 0.25), { op: 'lp', hz: 1500 }]),
  ],
  master: [{ op: 'hp', hz: 60 }, { op: 'transient', attack: 2 }, ROOM(0.1), ...END(0.32)] }));
const bumpC = takes('bumpC', 4, (k) => ({ id: 'bump', brief: BUMP,
  why: "C, rubber and steel: a real tire's punch (DDT197, CC0), the bumper bars touching (Kenney's light metal impact low-passed at 4 kHz, 12 dB down) and the tires' quick scuff (a real screech, johnnydekk, CC0, 60 ms); the hardest-edged of the three; four takes.",
  layers: [
    fs(TIRE_PUNCH, 0, [hit([4, 6, 2, 0][k], 0.28), { op: 'pitch', st: 1 + ST[k] }]),
    ke(K(`impactMetal_light_00${[1, 2, 3, 4][k]}`), -12, [{ op: 'lp', hz: 4000 }, { op: 'trim', to: 0.15 }, { op: 'fade', out: 0.08 }]),
    chirp([7, 12, 18, 19][k], -14, 0.01, 0.06, 1500),
  ],
  master: [{ op: 'hp', hz: 60 }, { op: 'transient', attack: 3 }, ROOM(0.1), ...END(0.3)] }));

// ---------------------------------------------------------------- wall (a padded barrier)
const WALL = 'A go-kart bumps a padded track barrier in a polished kart racing game (Mario Kart World quality): one deep, dull, cushioned whump of rubber and padding, then a short rubbery scrape as it slides off; solid and satisfying, never a crash, never cartoony. No voice.';
const wallA = takes('wallA', 3, (k) => ({ id: 'wall', brief: WALL,
  why: "A, tire wall: a real rubber tire's thump (DDT197, CC0) with a real cushion's whump (mincedbeats, CC0) under it for the padding, and a short rubbery scrub as the kart slides off; three takes.",
  layers: [
    fs(TIRE_PUNCH, 0, [hit([0, 3, 5][k], 0.4), { op: 'pitch', st: -2 + ST[k] }]),
    fs(CUSHION, -2, [hit([0, 2, 4][k], 0.5, -20, 0.6), { op: 'lp', hz: 1800 }]),
    scrub(-13, 0.05, k),
  ],
  master: [{ op: 'hp', hz: 40 }, { op: 'lowshelf', hz: 120, db: 3 }, { op: 'sat', drive: 2.5, mix: 0.15 }, ROOM(0.12), ...END(0.55)] }));
const wallB = takes('wallB', 3, (k) => ({ id: 'wall', brief: WALL,
  why: "B, cushion whump: a real cushion impact (mincedbeats, CC0) as the body, a thick real thud (xggw, CC0) low-passed under it, a plastic rattle as the bodywork shakes, and the scrub; softer and rounder than A.",
  layers: [
    fs(CUSHION, 0, [hit([1, 3, 5][k], 0.55, -20, 0.6), { op: 'pitch', st: ST[k] }]),
    fs(THUD, -4, [{ op: 'trim', from: 0.24, to: 0.6 }, { op: 'lp', hz: 900 }, { op: 'env', pts: [[0, 1], [0.08, 0.45], [0.3, 0]] }]),
    fs(PLASTIC, -14, [hit([4, 10, 12][k], 0.2, -16), { op: 'hp', hz: 700 }], 0.02),
    scrub(-14, 0.06, k),
  ],
  master: [{ op: 'hp', hz: 40 }, ROOM(0.12), ...END(0.6)] }));
const wallC = takes('wallC', 3, (k) => ({ id: 'wall', brief: WALL,
  why: "C, barrier: a real tire's punch (DDT197, CC0), the low body of a real collision (qubodup, CC0, its crack filtered off), a plastic crack (NetX_Gameplays, CC0) as the barrier's cover flexes, and the scrub; the firmest of the three.",
  layers: [
    fs(TIRE_PUNCH, 0, [hit([1, 4, 6][k], 0.35), { op: 'pitch', st: -1 + ST[k] }]),
    fs(BANG, -6, [hit([0, 1, 2][k], 0.3, -20, 0.5), { op: 'lp', hz: 1200 }, { op: 'fade', out: 0.12 }]),
    fs(PLASTIC, -11, [hit([2, 6, 10][k], 0.1, -16), { op: 'hp', hz: 800 }], 0.004),
    scrub(-15, 0.04, k),
  ],
  master: [{ op: 'hp', hz: 40 }, { op: 'transient', attack: 2 }, ROOM(0.12), ...END(0.55)] }));

// ---------------------------------------------------------------- hit (bonked by an item: slowed, not spun)
const HIT = "The player's go-kart is hit by a thrown item in a polished kart racing game (Mario Kart World quality): a punchy, solid impact that jolts the kart, a crack and a thump with the tires skidding for a moment, exciting and satisfying, never violent and never cartoony. No voice.";
const hitA = takes('hitA', 3, (k) => ({ id: 'hit', brief: HIT,
  why: "A, impact: a real hard rubber hit (cupido-1, 'hit ball rubber', CC0) as the crack, a real tire's punch low-passed under it (DDT197, CC0) and Kenney's heavy punch for the weight, then the jolt: a real swish (qubodup, CC0) as the kart is knocked aside and a short tire skid (johnnydekk, CC0); three takes.",
  layers: [
    fs(BALL_HIT, 0, [hit([1, 4, 2][k], 0.35, -16, 0.2), { op: 'pitch', st: ST[k] }, { op: 'env', pts: [[0, 1], [0.06, 0.5], [0.25, 0]] }]),
    fs(TIRE_PUNCH, -4, [hit([0, 3, 1][k], 0.3), { op: 'lp', hz: 1200 }]),
    ke(K(`impactPunch_heavy_00${[0, 1, 3][k]}`), -6, [{ op: 'lp', hz: 2500 }, { op: 'trim', to: 0.3 }, { op: 'fade', out: 0.15 }]),
    fs(SWOSH, -12, [{ op: 'trim', to: 0.35 }, { op: 'pitch', st: ST[k] }], 0.03),
    chirp([2, 12, 18][k], -12, 0.05, 0.16, 1200),
  ],
  master: [{ op: 'hp', hz: 50 }, { op: 'transient', attack: 3 }, { op: 'sat', drive: 2.5, mix: 0.15 }, ROOM(0.12), ...END(0.55)] }));
const hitB = takes('hitB', 3, (k) => ({ id: 'hit', brief: HIT,
  why: "B, crunch: a real collision's bang with its crack (qubodup, CC0), Kenney's heavy punch for the body, a short sub thump (Kenney's soft heavy impact, cut to a quarter second) so it lands on small speakers too, and two bits of plastic debris after it (NetX_Gameplays, CC0); three takes.",
  layers: [
    fs(BANG, 0, [hit([0, 1, 3][k], 0.4, -20, 0.5), { op: 'pitch', st: ST[k] }]),
    ke(K(`impactPunch_heavy_00${k + 1}`), -4, [{ op: 'lp', hz: 3000 }, { op: 'trim', to: 0.28 }, { op: 'fade', out: 0.14 }]),
    ke(K(`impactSoft_heavy_00${k}`), -8, [{ op: 'trim', to: 0.18 }, { op: 'fade', out: 0.1 }, { op: 'lp', hz: 200 }]),
    fs(PLASTIC, -12, [hit([6, 10, 14][k], 0.1, -16), { op: 'hp', hz: 700 }], 0.05),
    fs(PLASTIC, -15, [hit([7, 12, 13][k], 0.1, -16), { op: 'hp', hz: 900 }, { op: 'pan', pos: 0.3 }], 0.11),
  ],
  master: [{ op: 'hp', hz: 45 }, { op: 'transient', attack: 2 }, { op: 'sat', drive: 2.5, mix: 0.18 }, ROOM(0.12), ...END(0.55)] }));
const hitC = takes('hitC', 3, (k) => ({ id: 'hit', brief: HIT,
  why: "C, smack and skid: a real hard rubber hit (cupido-1, CC0), a thick thud (xggw, CC0) under it, the crash of a metal plate high-passed to a bright rattle (Kenney), then a longer tire skid as the kart slows (johnnydekk, CC0, 0.25 s) and a real swish out (hz37, CC0); three takes.",
  layers: [
    fs(BALL_HIT, 0, [hit([7, 10, 13][k], 0.35, -16, 0.2), { op: 'pitch', st: 1 + ST[k] }]),
    fs(THUD, -4, [{ op: 'trim', from: 0.24, to: 0.6 }, { op: 'lp', hz: 1500 }, { op: 'env', pts: [[0, 1], [0.07, 0.45], [0.25, 0]] }]),
    ke(K(`impactPlate_medium_00${k}`), -11, [{ op: 'hp', hz: 1200 }, { op: 'trim', to: 0.2 }, { op: 'fade', out: 0.1 }]),
    chirp([1, 13, 19][k], -11, 0.04, 0.26, 1150),
    fs(SWISH, -14, [hit([6, 8, 9][k], 0.25), { op: 'hp', hz: 300 }], 0.06),
  ],
  master: [{ op: 'hp', hz: 50 }, { op: 'transient', attack: 2 }, ROOM(0.12), ...END(0.6)] }));

export const RECIPES: readonly Recipe[] = [...hopA, ...hopB, ...hopC, ...landA, ...landB, ...landC, ...bumpA, ...bumpB, ...bumpC, ...wallA, ...wallB, ...wallC, ...hitA, ...hitB, ...hitC];
