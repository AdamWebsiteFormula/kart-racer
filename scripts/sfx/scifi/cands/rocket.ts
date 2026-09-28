// Homing Rocket (was Homing Kite): the launch, and (a new id) the big bright energy explosion when it hits.
import type { Cand } from '../parts.ts';
import { bp, cap, comp, conv, fade, FS, hp, hp4, KS, lp, OUT, PLATE, pitch, rec, sat, snap, syn, thump, trim, TUNNEL, verb } from '../parts.ts';

const BRIEF_KITE = 'The player launches a Homing Rocket in a polished, cinematic cartoon kart racing game with a sci-fi look: it ignites and streaks off after the kart ahead, a quick lock-on chirp as it homes in. Exciting and a little edgy, but a toy rocket, never a real weapon; about a second. No voice.';
const BRIEF_BOOM = 'A Homing Rocket hits a kart in a polished cartoon sci-fi kart racer: a big, bright, satisfying energy explosion, punchy with sparkle and crackle, fun rather than violent (fireworks and energy, no debris or destruction), about a second and a half. No voice.';

export const ROCKET: Cand[] = [
  {
    id: 'kite', name: 'kiteA', brief: BRIEF_KITE,
    what: 'A, ignition streak: a real firework rocket igniting, a low launch thump, a synthesized thruster flame that roars past and away (Doppler: it drops in pitch and pans as it goes), a quick two-note lock-on chirp and a small whoosh.',
    why: 'A real ignition (derplayer, CC0) for the fizz of the fuse; the thruster is synthesized (a flaring filtered roar with turbulence, a throat resonance and crackle) and moved past the ear with a physical Doppler; the lock-on chirp tells the player it homes.',
    layers: [
      rec(FS(587173), -4, [trim(0, 0.9), hp(300), { op: 'env', pts: [[0, 0], [0.01, 1], [0.3, 0.6], [0.9, 0]] }]),
      thump(-7, 120, 45, 0.15),
      syn('thrust', { seconds: 1.3, seed: 31, hz: [[0, 500], [0.04, 7000], [0.5, 3500], [1.2, 1800]], throat: [1100, 4, 0.3], turb: 0.35, throb: [30, 0.2], crackle: 0.25, hiss: 0.35,
        env: [[0, 0], [0.01, 1], [0.35, 0.8], [1.25, 0]] }, 0, [{ op: 'doppler', speed: 45, dist: 2.5, at: 0.12, pan: 0.6 }]),
      syn('beeps', { seconds: 0.4, notes: [[0.12, 1568, 0.045, 1], [0.21, 2093, 0.07, 1]], wave: 'sine', blip: 2, harmonics: [[2, 0.1]] }, -13),
      rec(FS(683101), -10, [pitch(2), hp(600), fade(0.003, 0.08)], 0.02),
    ],
    master: [hp(45), sat(1.5, 0.3), conv(TUNNEL, 0.08, { decay: 0.8 }), comp(-14, 2.5), ...cap(1.3, 0.4), OUT],
  },
  {
    id: 'kite', name: 'kiteB', brief: BRIEF_KITE,
    what: 'B, launch tube: a deep pneumatic "thoonk" as the rocket leaves its tube, a hiss of gas, then a real rocket\'s thrust with its falling whistle as it tears away, and a low punch.',
    why: 'Recording-led: a cork pop pitched down an octave and more (Andre_Desartis, CC0) for the tube, a pressure hiss (magnuswaker, CC0), a real rocket launch (qubodup, CC0) for the thrust.',
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
    what: 'C, energy seeker: more sci-fi than rocket: a rising, phasing energy "vwoooip" with a sparkling trail, a lock-on chirp that climbs, a thin thruster hiss and a flick of air.',
    why: 'Synthesis for the energy (four detuned saws through a moving phaser, rising), a real sci-fi riser (Alex_hears_things, CC0) under it, bell grains for the trail.',
    layers: [
      syn('zap', { seconds: 1.0, seed: 32, hz: [[0, 220], [0.35, 1400], [0.9, 1800]], wave: 'saw', voices: 4, detune: 18, env: [[0, 0], [0.01, 1], [0.3, 0.8], [0.9, 0]] }, -2,
        [{ op: 'phaser', rate: 3, lo: 400, hi: 4000, stages: 6, fb: 0.5, mix: 0.5 }, lp(7000)]),
      rec(FS(400906), -9, [trim(1.4, 3.2), pitch(5), fade(0.02, 0.3)]),
      syn('glitter', { seconds: 1.0, seed: 33, density: [[0, 120], [0.8, 0]], lo: 3000, hi: 10000, decay: 0.08, ratio: 1.41, index: 0.8 }, -14),
      rec(FS(683101), -8, [hp(600), fade(0.003, 0.08)]),
      syn('beeps', { seconds: 0.5, notes: [[0.15, 1760, 0.04, 1], [0.23, 1760, 0.04, 1], [0.31, 2637, 0.08, 1]], wave: 'sine', blip: 1.5 }, -13),
      syn('thrust', { seconds: 1.0, seed: 34, hz: 6000, hiss: 0.6, turb: 0.3, env: [[0, 0], [0.02, 1], [0.9, 0]] }, -13),
    ],
    master: [hp(80), { op: 'chorus', voices: 3, depth: 3, rate: 0.9, base: 10, mix: 0.25 }, verb(0.6, 0.15), comp(-14, 2), ...cap(1.2, 0.4), OUT],
  },
  // ---------------------------------------------------------------- the hit (new id: rocketBoom)
  {
    id: 'rocketBoom', name: 'rocketBoomA', brief: BRIEF_BOOM,
    what: 'A, energy blast: a sharp crack, a real cinematic boom for the body, a synthesized blast of hot air sweeping down, an energy "vwoom" dissipating, a sub drop, electric crackle and a shower of bright sparkles.',
    why: 'The crack and blast are synthesized (a sharp N-wave front, a turbulent roar whose filter closes), the low body a real cinematic boom (rhapsodize, CC0) given mid-range with saturation (a sub alone reads as a dull bump), the sparkle bell grains.',
    layers: [
      syn('nwave', { seconds: 0.2, seed: 41, T: 0.015, rise: 0.0003, double: false, lp: 12000, hp: 300 }, -3),
      rec(FS(255111), -2, [trim(0, 1.6), lp(2500), sat(2.0, 0.6), fade(0.001, 0.6)]),
      syn('thrust', { seconds: 1.4, seed: 42, hz: [[0, 9000], [0.25, 2500], [1.2, 300]], turb: 0.5, turbRate: 30, crackle: 0.3, hiss: 0.3,
        env: [[0, 0], [0.004, 1], [0.15, 0.7], [1.3, 0]] }, -2),
      syn('zap', { seconds: 1.1, seed: 43, hz: [[0, 900], [0.8, 70]], wave: 'saw', voices: 5, detune: 30, env: [[0, 0], [0.01, 1], [0.3, 0.5], [1.0, 0]] }, -11,
        [{ op: 'sweep', mode: 'lp', hz: [[0, 6000], [0.9, 400]], q: 1.5 }]),
      syn('glitter', { seconds: 1.3, seed: 44, density: [[0, 140], [1.2, 0]], lo: 2500, hi: 9000, decay: 0.12, ratio: 1.41, index: 1.0 }, -12, [], 0.05),
      syn('crackle', { seconds: 1.3, seed: 45, rate: 90, lo: 1500, hi: 9000, decay: 0.003, spread: 16, width: 0.9, env: [[0, 0], [0.1, 1], [1.2, 0]] }, -14),
      syn('subdrop', { seconds: 1.0, hz: [[0, 110], [0.8, 32]], drive: 2.5, env: [[0, 0], [0.004, 1], [0.3, 0.6], [1.0, 0]] }, -3),
    ],
    master: [hp(30), conv(PLATE, 0.15, { decay: 1.2 }), sat(1.5, 0.25), comp(-12, 3, 0.003, 0.15), ...cap(1.8, 0.6), OUT],
  },
  {
    id: 'rocketBoom', name: 'rocketBoomB', brief: BRIEF_BOOM,
    what: 'B, fireworks finale: a real close thunderclap as the crack, a deep boom under it, then a crackling firework shower and bright sparkles in the notes of a major chord, like the last big firework of a show.',
    why: 'A real thunder strike (loganzsound, CC0) and cinematic boom (rhapsodize, CC0) for weight; the firework crackle and the chord sparkle synthesized, so it lands as a celebration, not a war.',
    layers: [
      rec(FS(840628), -1, [trim(0.55, 2.2), hp(150), fade(0.002, 0.8)]),
      rec(FS(255111), -3, [trim(0, 1.5), lp(1800), sat(1.8, 0.5), fade(0.001, 0.5)]),
      syn('crackle', { seconds: 1.5, seed: 46, rate: 380, lo: 1500, hi: 9000, decay: 0.002, spread: 20, width: 0.9, env: [[0, 0], [0.15, 1], [1.4, 0]] }, -8, [], 0.08),
      syn('glitter', { seconds: 1.5, seed: 47, density: [[0, 80], [1.4, 0]], notes: [2093, 2349, 2637, 3136, 3520, 4186], decay: 0.15, ratio: 2.0, index: 0.7 }, -10, [], 0.1),
      thump(-5, 90, 35, 0.4),
    ],
    master: [hp(35), verb(1.2, 0.18), sat(1.3, 0.2), comp(-12, 3, 0.003, 0.15), ...cap(1.8, 0.6), OUT],
  },
  {
    id: 'rocketBoom', name: 'rocketBoomC', brief: BRIEF_BOOM,
    what: 'C, plasma burst: an instant ring-modulated "PAH", a long dispersive "tchoooom" falling away, a shockwave ring that sweeps up and out across the stereo field, a falling energy whine and a deep boom.',
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
