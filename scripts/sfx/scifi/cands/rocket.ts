// Homing Rocket (was Homing Kite): the launch, and (a new id) the big bright energy explosion when it hits.
import type { Cand } from '../parts.ts';
import { bp, cap, comp, conv, fade, FS, GAME, hp, KS, lp, OUT, PLATE, pitch, rec, sat, syn, thump, trim, TUNNEL, verb } from '../parts.ts';

const BRIEF_KITE = `The player launches a Homing Rocket in ${GAME}: it ignites and streaks off after the kart ahead, with a quick lock-on tone as it homes in. Exciting, a toy rocket rather than a real weapon; about a second. No voice.`;
const BRIEF_BOOM = `A Homing Rocket hits a kart in ${GAME}: a big, bright, satisfying energy explosion, punchy, with crackle, fun rather than violent (no debris or destruction), about a second and a half. No voice.`;

/** a lock-on: the same tone twice (never a rising interval) */
const lockOn = (db: number, at: number, hz = 1760) => syn('beeps', { seconds: 0.2, notes: [[0, hz, 0.035, 1], [0.075, hz, 0.05, 1]], wave: 'sine', harmonics: [[2, 0.08]] }, db, [], at);

export const ROCKET: Cand[] = [
  {
    id: 'kite', name: 'kiteA', brief: BRIEF_KITE,
    what: 'A, model-rocket streak: a real rocket fuse fizzing alight, a real rocket launch tearing away, a real hobby rocket\'s roar under it and a quick lock-on tone (one note, twice).',
    why: 'Real recordings: an ignition (derplayer), a rocket launch (qubodup) and a hobby-rocket blast-off (reg7783), all CC0; the lock-on synthesized. The local ear: "a small rocket launching and flying away", 0.96.',
    layers: [
      rec(FS(840511), 0, [trim(0, 1.4), hp(200), { op: 'env', pts: [[0, 0], [0.02, 1], [0.8, 0.7], [1.4, 0]] }]),
      rec(FS(730041), -4, [trim(4.35, 5.8), hp(120), fade(0.02, 0.5)], 0.02),
      rec(FS(587173), -8, [trim(0, 0.7), hp(300), fade(0.005, 0.3)]),
      lockOn(-16, 0.14),
    ],
    master: [hp(40), sat(1.2, 0.15), comp(-14, 2.5), ...cap(1.3, 0.4), OUT],
  },
  {
    id: 'kite', name: 'kiteB', brief: BRIEF_KITE,
    what: 'B, launch tube: a deep pneumatic "thoonk" as the rocket leaves its tube, a hiss of gas, then a real rocket\'s thrust with its falling whistle as it tears away, and a low punch.',
    why: 'Recording-led: a cork pop pitched down more than an octave (Andre_Desartis, CC0) for the tube, a pressure hiss (magnuswaker, CC0), a real rocket launch (qubodup, CC0) for the thrust.',
    layers: [
      rec(FS(335357), -2, [trim(0, 0.5), pitch(-9), lp(3000), fade(0.001, 0.15)]),
      rec(FS(581083), -9, [trim(0, 0.4), hp(1500), fade(0.002, 0.2)]),
      rec(FS(840511), 0, [trim(0, 1.4), hp(200), { op: 'env', pts: [[0, 0], [0.02, 1], [0.8, 0.7], [1.4, 0]] }], 0.05),
      thump(-6, 110, 40, 0.18),
    ],
    master: [hp(40), sat(1.4, 0.25), verb(0.8, 0.1), comp(-14, 2.5), ...cap(1.3, 0.4), OUT],
  },
  {
    id: 'kite', name: 'kiteC', brief: BRIEF_KITE,
    what: 'C, boost rocket: a real rocket\'s boost firing and roaring away from you (Doppler), a fuse hiss at the start and a lock-on tone.',
    why: 'Real recordings: a rocket launch boost (TheLittleCrow, CC0) moved away from the ear, an ignition hiss (derplayer, CC0); the lock-on synthesized.',
    layers: [
      rec(FS(774245), 0, [trim(0.0, 1.4), hp(60), fade(0.01, 0.5), { op: 'doppler', speed: 18, dist: 3, at: 0.2, pan: 0.5 }]),
      rec(FS(587173), -5, [trim(0, 0.7), hp(300), fade(0.005, 0.3)]),
      lockOn(-16, 0.18, 1568),
    ],
    master: [hp(40), sat(1.2, 0.15), comp(-14, 2.5), ...cap(1.3, 0.4), OUT],
  },
  // ---------------------------------------------------------------- the hit (new id: rocketBoom)
  {
    id: 'rocketBoom', name: 'rocketBoomA', brief: BRIEF_BOOM,
    what: 'A, energy blast: a sharp crack, a real cinematic boom for the body, a blast of hot air sweeping down, an energy "vwoom" dissipating, a sub drop and a crackle of sparks.',
    why: 'The crack and blast synthesized (a sharp N-wave front, a turbulent roar whose filter closes); the low body a real cinematic boom (rhapsodize, CC0) given mid-range with saturation (a sub alone reads as a dull bump); a firework-like crackle.',
    layers: [
      syn('nwave', { seconds: 0.2, seed: 41, T: 0.015, rise: 0.0003, double: false, lp: 12000, hp: 300 }, -3),
      rec(FS(255111), -2, [trim(0, 1.6), lp(2500), sat(2.0, 0.6), fade(0.001, 0.6)]),
      syn('thrust', { seconds: 1.4, seed: 42, hz: [[0, 9000], [0.25, 2500], [1.2, 300]], turb: 0.5, turbRate: 30, crackle: 0.3, hiss: 0.3,
        env: [[0, 0], [0.004, 1], [0.15, 0.7], [1.3, 0]] }, -2),
      syn('zap', { seconds: 1.1, seed: 43, hz: [[0, 900], [0.8, 70]], wave: 'saw', voices: 5, detune: 30, env: [[0, 0], [0.01, 1], [0.3, 0.5], [1.0, 0]] }, -11,
        [{ op: 'sweep', mode: 'lp', hz: [[0, 6000], [0.9, 400]], q: 1.5 }]),
      syn('crackle', { seconds: 1.3, seed: 45, rate: 160, lo: 1500, hi: 9000, decay: 0.003, spread: 16, width: 0.9, env: [[0, 0], [0.1, 1], [1.2, 0]] }, -11),
      syn('subdrop', { seconds: 1.0, hz: [[0, 110], [0.8, 32]], drive: 2.5, env: [[0, 0], [0.004, 1], [0.3, 0.6], [1.0, 0]] }, -3),
    ],
    master: [hp(30), conv(PLATE, 0.15, { decay: 1.2 }), sat(1.5, 0.25), comp(-12, 3, 0.003, 0.15), ...cap(1.8, 0.6), OUT],
  },
  {
    id: 'rocketBoom', name: 'rocketBoomB', brief: BRIEF_BOOM,
    what: 'B, thunder blast: a real close thunderclap as the crack, a deep boom under it, then a crackling shower like the last big firework of a show.',
    why: 'A real thunder strike (loganzsound, CC0) and cinematic boom (rhapsodize, CC0) for weight; the crackle synthesized, so it lands as a spectacle, not a war.',
    layers: [
      rec(FS(840628), -1, [trim(0.55, 2.2), hp(150), fade(0.002, 0.8)]),
      rec(FS(255111), -3, [trim(0, 1.5), lp(1800), sat(1.8, 0.5), fade(0.001, 0.5)]),
      syn('crackle', { seconds: 1.5, seed: 46, rate: 380, lo: 1500, hi: 9000, decay: 0.002, spread: 20, width: 0.9, env: [[0, 0], [0.15, 1], [1.4, 0]] }, -8, [], 0.08),
      thump(-5, 90, 35, 0.4),
    ],
    master: [hp(35), verb(1.2, 0.18), sat(1.3, 0.2), comp(-12, 3, 0.003, 0.15), ...cap(1.8, 0.6), OUT],
  },
  {
    id: 'rocketBoom', name: 'rocketBoomC', brief: BRIEF_BOOM,
    what: 'C, plasma burst: an instant ring-modulated "PAH", a long dispersive "tchoooom" falling away, a shockwave of air sweeping up and out across the stereo field, a falling energy whine and a deep boom.',
    why: 'Synthesis-led (ring modulation, a dispersive chain, a rising band of air) over Kenney\'s low explosion (CC0) for weight, in a long-tube impulse response made in code.',
    layers: [
      syn('noise', { seconds: 0.2, seed: 48, color: 'white', env: [[0, 0], [0.001, 1], [0.15, 0]] }, -3, [bp(2500, 0.5), { op: 'ringmod', hz: 180, mix: 0.5 }]),
      syn('laser', { seconds: 1.2, seed: 49, sections: 1400, coef: -0.85, bright: 8000, echoes: [1, 0.12, 0.4], lo: 60 }, -2),
      syn('whoosh', { seconds: 1.0, seed: 50, hz: [[0, 200], [0.45, 5000], [0.9, 9000]], q: 2, env: [[0, 0], [0.02, 1], [0.5, 0.5], [0.9, 0]], air: 0.3 }, -6, [{ op: 'widen', amount: 0.6 }]),
      syn('zap', { seconds: 1.2, seed: 51, hz: [[0, 3000], [1.1, 200]], index: 1, ratio: 1.5, env: [[0, 0], [0.05, 1], [1.1, 0]] }, -15, [], 0.05),
      rec(KS('lowFrequency_explosion_001.ogg'), -3, [trim(0.07), fade(0.003, 0.5)]),
      syn('subdrop', { seconds: 0.9, hz: [[0, 100], [0.7, 30]], drive: 2, env: [[0, 0], [0.004, 1], [0.8, 0]] }, -5),
    ],
    master: [hp(30), { op: 'chorus', voices: 3, depth: 3, rate: 0.7, base: 12, mix: 0.2 }, conv(TUNNEL, 0.12, { decay: 1.0 }), sat(1.6, 0.3), comp(-12, 3, 0.003, 0.15), ...cap(1.7, 0.6), OUT],
  },
];
