// Oil Slick (was Oil Can) and Decoy Mine (was Decoy Balloon): the drop, and the mine's arming, proximity beep and burst.
import type { Cand } from '../parts.ts';
import { bp, cap, comp, conv, fade, FS, hp, KI, lp, OUT, pitch, PLATE, rec, sat, snap, SPRING, syn, thump, trim, verb, VS } from '../parts.ts';

const BRIEF_DROP = 'The player drops an Oil Slick behind the kart in a polished cartoon sci-fi kart racer: a canister pops out and a thick glossy slick splats across the road. Gloopy, satisfying and a little gross in a fun way, under a second. No voice.';
const BRIEF_MINE_DROP = 'The player drops a Decoy Mine behind the kart in a polished cartoon sci-fi kart racer: a small device clamps onto the road and arms itself with a quick electronic chirp. Sneaky and cool, under a second. No voice.';
const BRIEF_BEEP = 'A Decoy Mine on the road blinks and beeps as a kart comes near, in a polished cartoon sci-fi kart racer: one short, clean electronic warning beep (the game repeats it, faster as a kart closes in). Clear but never shrill or annoying. No voice.';
const BRIEF_BURST = 'A kart runs into a Decoy Mine in a polished cartoon sci-fi kart racer: it bursts in a quick, bright energy pop with an electric crackle. Punchy and fun, smaller than a rocket\'s explosion, under a second. No voice, nothing like a real bomb.';

export const DROPS: Cand[] = [
  // ---------------------------------------------------------------- Oil Slick
  {
    id: 'drop', name: 'dropA', brief: BRIEF_DROP,
    what: 'A, canister glug-splat: a metal canister clunks out with a pneumatic "pssh", then a real mud splat and a real slime squelch land together, a low gloopy "blorp" under them, and a slow phaser for the oily sheen.',
    why: 'Recordings for the gloop (Breviceps\' Mud Splat and Archos\' Slime 21, CC0) and the clunk (Kenney Impact, CC0); a synthesized falling "blorp" (FM, filtered) gives it weight and a cartoon shape.',
    layers: [
      rec(KI('impactMetal_medium_001.ogg'), -7, [pitch(-3), lp(5000)]),
      rec(FS(581083), -13, [trim(0, 0.25), hp(2000), fade(0.002, 0.12)]),
      rec(FS(445109), 0, [pitch(-2)], 0.06),
      rec(FS(433832), -4, [trim(0.3, 0.9), fade(0.005, 0.25)], 0.07),
      syn('zap', { seconds: 0.25, seed: 61, hz: [[0, 260], [0.2, 90]], index: [[0, 2], [0.2, 0]], ratio: 1.0, env: [[0, 0], [0.004, 1], [0.08, 0.6], [0.24, 0]] }, -8, [lp(900)], 0.06),
    ],
    master: [hp(50), { op: 'phaser', rate: 1.5, lo: 300, hi: 2500, stages: 4, fb: 0.3, mix: 0.2 }, verb(0.4, 0.08), comp(-14, 2.5), ...cap(0.8, 0.3), OUT],
  },
  {
    id: 'drop', name: 'dropB', brief: BRIEF_DROP,
    what: 'B, pressurized spray: a spray valve fires a burst of oil, a real slime squelch spreads across the road, and a descending synth "wub" sells the slick.',
    why: 'A real aerosol burst (WeeJee_vdH, CC0) and a real slime squelch (Archos, CC0), a synthesized falling saw through a closing filter.',
    layers: [
      rec(KI('impactGeneric_light_001.ogg'), -12, [hp(800)]),
      rec(FS(267709), -6, [trim(1.0, 1.5), hp(800), fade(0.004, 0.2)], 0.01),
      rec(FS(433824), 0, [trim(0.65, 1.3), fade(0.005, 0.25)], 0.08),
      syn('zap', { seconds: 0.35, seed: 62, hz: [[0, 400], [0.3, 110]], wave: 'saw', voices: 3, detune: 12, env: [[0, 0], [0.01, 1], [0.34, 0]] }, -11,
        [{ op: 'sweep', mode: 'lp', hz: [[0, 2500], [0.3, 300]], q: 2 }], 0.08),
    ],
    master: [hp(50), verb(0.4, 0.08), comp(-14, 2.5), ...cap(0.8, 0.3), OUT],
  },
  {
    id: 'drop', name: 'dropC', brief: BRIEF_DROP,
    what: 'C, big glob: comic and gloopy: two real splats land as one big "SPLORP", a low synth blorp under them, then a few bubbles blub up out of the slick.',
    why: 'Real splats (Breviceps\' Cartoon Splat and slug splat, CC0), real bubbles (VSCO-2 CE, CC0), a synthesized blorp.',
    layers: [
      rec(FS(445117), 0, [trim(0, 0.4), fade(0.001, 0.1)]),
      rec(FS(447930), -3, [trim(0, 0.35), pitch(-3), fade(0.001, 0.12)], 0.02),
      syn('zap', { seconds: 0.3, seed: 63, hz: [[0, 220], [0.25, 80]], index: [[0, 2.5], [0.25, 0]], ratio: 1.0, env: [[0, 0], [0.004, 1], [0.1, 0.6], [0.28, 0]] }, -7, [lp(800)]),
      rec(VS('Miscellania Raw/Misc 1/bubbles.wav'), -13, [trim(0.2, 0.8), hp(300), fade(0.02, 0.2)], 0.15),
    ],
    master: [hp(50), verb(0.35, 0.08), comp(-14, 2.5), ...cap(0.85, 0.3), OUT],
  },
  // ---------------------------------------------------------------- Decoy Mine: dropped and armed (new id: mineDrop)
  {
    id: 'mineDrop', name: 'mineDropA', brief: BRIEF_MINE_DROP,
    what: 'A, clamp and arm: a real metal clank as it hits the road, a tiny servo whirr as it grips, then two rising arming beeps.',
    why: 'Recordings for the mechanics (Mish7913\'s metal clank, JoontheFloof\'s servo, CC0), synthesized beeps with a chirpy onset.',
    layers: [
      rec(FS(741351), 0, [trim(0.2, 0.6), hp(150), fade(0.001, 0.15)]),
      rec(FS(740244), -11, [trim(0.12, 0.45), hp(400), fade(0.005, 0.1)], 0.08),
      syn('beeps', { seconds: 0.5, notes: [[0.28, 1318.5, 0.045, 1], [0.38, 1760, 0.07, 1]], wave: 'sine', blip: 2, harmonics: [[2, 0.15]] }, -9),
    ],
    master: [hp(80), verb(0.4, 0.1), comp(-14, 2.5), ...cap(0.8, 0.25), OUT],
  },
  {
    id: 'mineDrop', name: 'mineDropB', brief: BRIEF_MINE_DROP,
    what: 'B, magnetic thunk: a heavy magnetic "thunk" onto the road, then a rising "dweep" as it powers on and a short hum.',
    why: 'Kenney\'s heavy metal impact (CC0) pitched down with a synthesized low punch; the power-on chirp and hum synthesized.',
    layers: [
      rec(KI('impactMetal_heavy_001.ogg'), 0, [pitch(-4), lp(3000)]),
      thump(-6, 120, 50, 0.1),
      syn('zap', { seconds: 0.2, seed: 64, hz: [[0, 400], [0.16, 1600]], voices: 2, detune: 10, index: [[0, 1], [0.16, 0.2]], ratio: 2, env: [[0, 0], [0.01, 1], [0.12, 0.8], [0.19, 0]] }, -8, [], 0.12),
      syn('hum', { seconds: 0.4, seed: 65, hz: 220, partials: 8, tilt: 1.4, voices: 2, detune: 6, env: [[0, 0], [0.02, 1], [0.38, 0]] }, -16, [], 0.28),
    ],
    master: [hp(60), verb(0.35, 0.1), comp(-14, 2.5), ...cap(0.75, 0.25), OUT],
  },
  {
    id: 'mineDrop', name: 'mineDropC', brief: BRIEF_MINE_DROP,
    what: 'C, sonar arm: a crisp plate clack onto the road, then a single sonar-like ping that rings out in a spring.',
    why: 'Kenney\'s plate impact (CC0) for the clack; a synthesized struck-resonator ping in the RE-301 spring impulse response (CC0).',
    layers: [
      rec(KI('impactPlate_heavy_002.ogg'), -2, [pitch(2), hp(200)]),
      syn('ring', { seconds: 0.6, seed: 66, hz: 1175, modes: [[1, 1, 0.3], [2.0, 0.2, 0.15], [3.01, 0.08, 0.08]], strike: 0.001, hardness: 7000 }, -6, [conv(SPRING, 0.25, { decay: 0.5, hp: 400 })], 0.12),
    ],
    master: [hp(80), comp(-14, 2), ...cap(0.8, 0.3), OUT],
  },
  // ---------------------------------------------------------------- Decoy Mine: the proximity beep (new id: mineBeep)
  {
    id: 'mineBeep', name: 'mineBeepA', brief: BRIEF_BEEP,
    what: 'A, clean beep: one pure A6 beep (1,760 Hz) with a touch of its octave, a soft attack and a tiny room: the classic device blink.',
    why: 'Synthesized; a sine with a quiet second and third harmonic so it cuts through without being shrill.',
    layers: [syn('beeps', { seconds: 0.12, notes: [[0, 1760, 0.06, 1]], wave: 'sine', harmonics: [[2, 0.12], [3, 0.05]], attack: 0.002, release: 0.04 }, 0)],
    master: [verb(0.25, 0.1, { hp: 800 }), OUT],
  },
  {
    id: 'mineBeep', name: 'mineBeepB', brief: BRIEF_BEEP,
    what: 'B, chirpy blip: a rounder E6 (1,319 Hz) triangle blip that drops a whisker in pitch as it starts, friendlier and more "gadget".',
    why: 'Synthesized; a soft triangle with a quick falling onset.',
    layers: [syn('beeps', { seconds: 0.12, notes: [[0, 1318.5, 0.05, 1]], wave: 'tri', blip: 3, blipTime: 0.008, harmonics: [[2, 0.1]], attack: 0.002, release: 0.035 }, 0)],
    master: [verb(0.2, 0.08, { hp: 800 }), OUT],
  },
  {
    id: 'mineBeep', name: 'mineBeepC', brief: BRIEF_BEEP,
    what: 'C, radar ping: a short bright C7 ping (2,093 Hz) with a metallic edge, ringing briefly in a spring, like a radar blip.',
    why: 'Synthesized struck resonator, a whisper of the RE-301 spring (CC0).',
    layers: [syn('ring', { seconds: 0.2, seed: 67, hz: 2093, modes: [[1, 1, 0.06], [2.76, 0.15, 0.03]], strike: 0.0008, hardness: 9000 }, 0, [conv(SPRING, 0.15, { decay: 0.15, hp: 800 })])],
    master: [...cap(0.2, 0.06), OUT],
  },
  // ---------------------------------------------------------------- Decoy Mine: the burst (new id: mineBurst)
  {
    id: 'mineBurst', name: 'mineBurstA', brief: BRIEF_BURST,
    what: 'A, zap pop: a real electric zap as the charge dumps, a sharp little crack and low punch, a crackling arc and a few sparks.',
    why: 'A real zap (JoelAudio, CC0) with a synthesized crack (N-wave), arc and sparks.',
    layers: [
      rec(FS(136542), -2, [trim(0, 0.35), hp(300), fade(0.001, 0.12)]),
      syn('nwave', { seconds: 0.15, seed: 68, T: 0.01, rise: 0.0003, double: false, lp: 12000, hp: 300 }, -5),
      syn('arc', { seconds: 0.45, seed: 69, buzz: 140, hum: 0.3, sparks: 0.6, intensity: [[0, 1], [0.4, 0]] }, -9),
      syn('glitter', { seconds: 0.5, seed: 70, density: [[0, 80], [0.4, 0]], lo: 3000, hi: 9000, decay: 0.05, ratio: 1.41, index: 0.6 }, -15),
      thump(-5, 130, 45, 0.14),
    ],
    master: [hp(40), sat(1.6, 0.3), verb(0.5, 0.12), comp(-12, 3, 0.002, 0.12), ...cap(0.95, 0.35), OUT],
  },
  {
    id: 'mineBurst', name: 'mineBurstB', brief: BRIEF_BURST,
    what: 'B, energy pop: a round bright "POW": a snapped transient, a ring-modulated shimmer, a punchy low drop and a little confetti of sparkle.',
    why: 'Synthesized (noise snap, ring modulation, a driven sub drop, bell grains) with a short plate impulse response.',
    layers: [
      snap(-2, 1500, 11000, 0.02),
      syn('noise', { seconds: 0.35, seed: 71, color: 'pink', env: [[0, 0], [0.002, 1], [0.3, 0]] }, -5, [bp(1800, 0.6), { op: 'ringmod', hz: [[0, 420], [0.3, 160]], mix: 0.6 }]),
      syn('subdrop', { seconds: 0.4, hz: [[0, 160], [0.3, 45]], drive: 2.5, env: [[0, 0], [0.002, 1], [0.12, 0.6], [0.38, 0]] }, -2),
      syn('glitter', { seconds: 0.6, seed: 72, density: [[0, 120], [0.5, 0]], notes: [2349, 2960, 3520, 4699], decay: 0.08, ratio: 2, index: 0.5 }, -12, [], 0.02),
    ],
    master: [hp(40), conv(PLATE, 0.12, { decay: 0.5 }), sat(1.5, 0.3), comp(-12, 3, 0.002, 0.12), ...cap(0.8, 0.3), OUT],
  },
  {
    id: 'mineBurst', name: 'mineBurstC', brief: BRIEF_BURST,
    what: 'C, mini blast: a smaller cousin of the rocket\'s explosion: a crack, a short burst of hot air sweeping down, a real boom cut short and crackle.',
    why: 'A real cinematic boom (rhapsodize, CC0) cut short and saturated for mid-range; the blast and crack synthesized.',
    layers: [
      syn('nwave', { seconds: 0.15, seed: 73, T: 0.012, rise: 0.0003, double: false, lp: 12000, hp: 300 }, -3),
      syn('thrust', { seconds: 0.8, seed: 74, hz: [[0, 8000], [0.2, 2000], [0.7, 400]], turb: 0.5, crackle: 0.3, hiss: 0.3, env: [[0, 0], [0.003, 1], [0.1, 0.6], [0.75, 0]] }, -2),
      rec(FS(255111), -4, [trim(0, 0.8), lp(2000), sat(2, 0.6), fade(0.001, 0.4)]),
      syn('crackle', { seconds: 0.8, seed: 75, rate: 150, lo: 1500, hi: 9000, decay: 0.002, spread: 16, width: 0.9, env: [[0, 0], [0.05, 1], [0.7, 0]] }, -12),
    ],
    master: [hp(40), verb(0.6, 0.12), sat(1.4, 0.25), comp(-12, 3, 0.002, 0.12), ...cap(0.95, 0.35), OUT],
  },
];
