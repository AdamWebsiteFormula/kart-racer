// Oil Slick (was Oil Can) and Decoy Mine (was Decoy Balloon): the drop, and the mine's arming, proximity beep and burst.
import type { Cand } from '../parts.ts';
import { cap, comp, conv, fade, FS, GAME, hp, KI, lp, OUT, pitch, PLATE, rec, sat, snap, SPRING, syn, thump, trim, verb } from '../parts.ts';

const BRIEF_DROP = `The player drops an Oil Slick behind the kart in ${GAME}: a canister vents and a thick, glossy slick splashes across the road. Heavy and satisfying, under a second. No voice.`;
const BRIEF_MINE_DROP = `The player drops a Decoy Mine behind the kart in ${GAME}: a small device clamps onto the road and arms itself. Sneaky and techy, under a second. No voice.`;
const BRIEF_BEEP = `A Decoy Mine on the road blinks and beeps as a kart comes near, in ${GAME}: one short, clean electronic warning beep (the game repeats it, faster as a kart closes in). Clear, never shrill or annoying. No voice.`;
const BRIEF_BURST = `A kart runs into a Decoy Mine in ${GAME}: it bursts in a quick, bright energy pop with an electric crackle. Punchy, smaller than a rocket's explosion, under a second. No voice, nothing like a real bomb.`;

const ZAP = FS(136542); // JoelAudio, ELECTRIC_ZAP_001 (CC0)

export const DROPS: Cand[] = [
  // ---------------------------------------------------------------- Oil Slick
  {
    id: 'drop', name: 'dropA', brief: BRIEF_DROP,
    what: 'A, canister and slick: the canister vents with a pneumatic hiss and clunks onto the road, then a real thick liquid splash spreads out, pitched down so it moves like oil, with a low thud under it.',
    why: 'Recordings throughout: a pressurized door\'s vent (NeoSpica, CC0), a metal impact (Kenney, CC0), a real liquid gurgle and splash (martinimeniscus, CC0: the local ear hears it as "thick oil splashing onto a road") and a water splash (AardsReal, CC0) pitched down 6 semitones for weight.',
    layers: [
      rec(FS(425090), -9, [trim(0.05, 0.4), hp(500), fade(0.002, 0.15)]),
      rec(KI('impactMetal_medium_001.ogg'), -8, [pitch(-5), lp(3500)]),
      rec(FS(199653), -1, [trim(5.2, 6.1), pitch(-3), fade(0.004, 0.3)], 0.05),
      rec(FS(842165), -4, [trim(0.24, 0.9), pitch(-6), lp(5000), fade(0.002, 0.25)], 0.05),
      thump(-10, 120, 50, 0.1, 0.05),
    ],
    master: [hp(50), verb(0.35, 0.08), comp(-14, 2.5), ...cap(0.8, 0.3), OUT],
  },
  {
    id: 'drop', name: 'dropB', brief: BRIEF_DROP,
    what: 'B, pressure spray: a nozzle fires a hard burst of oil, which slaps down across the road with a wet, heavy splat.',
    why: 'Recordings: an aerosol burst (WeeJee_vdH, CC0), a real splat (Reitanna, CC0) and a liquid gurgle (martinimeniscus, CC0), both pitched down.',
    layers: [
      rec(FS(267709), -4, [trim(0.95, 1.35), hp(900), fade(0.002, 0.15)]),
      rec(FS(215342), 0, [trim(4.85, 5.5), pitch(-3), fade(0.003, 0.25)], 0.06),
      rec(FS(199653), -8, [trim(5.2, 6.0), pitch(-4), fade(0.01, 0.3)], 0.08),
    ],
    master: [hp(60), verb(0.3, 0.08), comp(-14, 2.5), ...cap(0.8, 0.3), OUT],
  },
  {
    id: 'drop', name: 'dropC', brief: BRIEF_DROP,
    what: 'C, heavy slick: a steel plate thuds onto the road and a big, slow, low splash of oil spreads out.',
    why: 'Recordings: Kenney\'s plate impact (CC0) pitched down, a water splash (AardsReal, CC0) pitched down 8 semitones, a real splat (Reitanna, CC0); a little saturation for weight.',
    layers: [
      rec(KI('impactPlate_heavy_001.ogg'), -7, [pitch(-6), lp(2500)]),
      rec(FS(842165), 0, [trim(0.22, 1.0), pitch(-8), lp(3500), fade(0.002, 0.3)], 0.02),
      rec(FS(215342), -6, [trim(10.0, 10.6), pitch(-3), fade(0.003, 0.2)], 0.1),
      thump(-6, 100, 40, 0.14, 0.02),
    ],
    master: [hp(40), verb(0.35, 0.08), sat(1.3, 0.2), comp(-14, 2.5), ...cap(0.85, 0.3), OUT],
  },
  // ---------------------------------------------------------------- Decoy Mine: dropped and armed (new id: mineDrop)
  {
    id: 'mineDrop', name: 'mineDropA', brief: BRIEF_MINE_DROP,
    what: 'A, clamp and charge: a heavy metal hit on the road, a servo as it grips, a rising capacitor whine as it charges, and a latch click when it is armed.',
    why: 'Recordings for the mechanics (Kenney\'s metal impact, JoontheFloof\'s servo, IanStarGem\'s switch, CC0); the charge whine synthesized (a rising FM tone, like a camera flash charging).',
    layers: [
      rec(KI('impactMetal_heavy_002.ogg'), -2, [pitch(-2), lp(4000)]),
      rec(FS(740242), -9, [trim(0.2, 0.5), hp(400), fade(0.002, 0.1)], 0.06),
      syn('zap', { seconds: 0.35, seed: 61, hz: [[0, 1200], [0.33, 5200]], index: 0.3, ratio: 2, env: [[0, 0], [0.3, 1], [0.35, 0]] }, -16, [], 0.15),
      rec(FS(278205), -8, [trim(0.04, 0.25), fade(0.001, 0.08)], 0.5),
    ],
    master: [hp(70), verb(0.35, 0.08), comp(-14, 2.5), ...cap(0.8, 0.25), OUT],
  },
  {
    id: 'mineDrop', name: 'mineDropB', brief: BRIEF_MINE_DROP,
    what: 'B, latch and charge: two real latch clicks as it locks onto the road over a low thunk, then a rising capacitor whine as it arms.',
    why: 'A real metal latch (deleted_user_7, CC0); a synthesized punch and charge whine. The local ear: "a small device clamping to the ground and arming", 0.81.',
    layers: [
      rec(FS(383797), -2, [trim(0.62, 1.0), hp(200), fade(0.002, 0.1)]),
      thump(-5, 160, 60, 0.08),
      syn('zap', { seconds: 0.35, seed: 64, hz: [[0, 1200], [0.33, 5200]], index: 0.3, ratio: 2, env: [[0, 0], [0.3, 1], [0.35, 0]] }, -15, [], 0.3),
    ],
    master: [hp(70), verb(0.35, 0.08), comp(-14, 2.5), ...cap(0.8, 0.25), OUT],
  },
  {
    id: 'mineDrop', name: 'mineDropC', brief: BRIEF_MINE_DROP,
    what: 'C, plate and charge: a heavy steel plate thuds onto the road, a servo grips, and a lower capacitor whine rises as it arms.',
    why: 'Kenney\'s plate impact (CC0) pitched down, a real servo (JoontheFloof, CC0); a synthesized charge whine.',
    layers: [
      rec(KI('impactPlate_heavy_002.ogg'), -2, [pitch(-3), lp(3500)]),
      rec(FS(740242), -9, [trim(0.2, 0.5), hp(400), fade(0.002, 0.1)], 0.06),
      syn('zap', { seconds: 0.35, seed: 62, hz: [[0, 1000], [0.33, 4600]], index: 0.3, ratio: 2, env: [[0, 0], [0.3, 1], [0.35, 0]] }, -16, [], 0.15),
    ],
    master: [hp(70), verb(0.35, 0.08), comp(-14, 2.5), ...cap(0.75, 0.25), OUT],
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
    what: 'B, double blip: two quick identical blips at C7 (2,093 Hz), 50 ms apart, like a mine\'s status light.',
    why: 'Synthesized: two short sines, the same pitch (no melody).',
    layers: [syn('beeps', { seconds: 0.15, notes: [[0, 2093, 0.025, 1], [0.05, 2093, 0.03, 1]], wave: 'sine', harmonics: [[2, 0.08]], attack: 0.0015, release: 0.02 }, 0)],
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
    what: 'A, zap pop: a real electric zap as the charge dumps, a sharp little crack and low punch, and a crackling arc.',
    why: 'A real zap (JoelAudio, CC0) with a synthesized crack (N-wave), arc and crackle.',
    layers: [
      rec(ZAP, -2, [trim(0, 0.35), hp(300), fade(0.001, 0.12)]),
      syn('nwave', { seconds: 0.15, seed: 68, T: 0.01, rise: 0.0003, double: false, lp: 12000, hp: 300 }, -5),
      syn('arc', { seconds: 0.45, seed: 69, buzz: 140, hum: 0.3, sparks: 0.6, intensity: [[0, 1], [0.4, 0]] }, -9),
      syn('crackle', { seconds: 0.5, seed: 70, rate: 120, lo: 2000, hi: 9000, decay: 0.002, spread: 14, width: 0.9, env: [[0, 1], [0.45, 0]] }, -14),
      thump(-5, 130, 45, 0.14),
    ],
    master: [hp(40), sat(1.6, 0.3), verb(0.5, 0.12), comp(-12, 3, 0.002, 0.12), ...cap(0.95, 0.35), OUT],
  },
  {
    id: 'mineBurst', name: 'mineBurstB', brief: BRIEF_BURST,
    what: 'B, charge dump: a real electric crack as the mine fires, a snapped transient, a punchy low drop and a spray of crackle.',
    why: 'A real zap (JoelAudio, CC0) with a synthesized snap, driven sub drop and crackle, in a short plate impulse response made in code.',
    layers: [
      snap(-2, 1500, 11000, 0.02),
      rec(ZAP, -3, [trim(0, 0.2), hp(600), fade(0.001, 0.08)]),
      syn('subdrop', { seconds: 0.4, hz: [[0, 160], [0.3, 45]], drive: 2.5, env: [[0, 0], [0.002, 1], [0.12, 0.6], [0.38, 0]] }, -2),
      syn('crackle', { seconds: 0.5, seed: 72, rate: 220, lo: 2000, hi: 9000, decay: 0.002, spread: 14, width: 0.9, env: [[0, 1], [0.45, 0]] }, -10, [], 0.01),
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
