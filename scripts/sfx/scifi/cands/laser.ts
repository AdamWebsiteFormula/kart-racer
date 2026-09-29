// Laser Blaster (was Beach Ball): the shot, its ricochets off the road edge, and the small pop every projectile and
// dropped item makes when it fizzles out.
import type { Cand } from '../parts.ts';
import { bp, cap, comp, conv, fade, FS, GAME, hp, hp4, OUT, rec, sat, snap, SPRING, syn, thump, trim, TUNNEL, verb } from '../parts.ts';

const BRIEF_THROW = `The player fires the Laser Blaster in ${GAME}: a bright energy bolt zips away down the road. Punchy and satisfying, a sci-fi blaster, never a real gun, about half a second. No voice.`;
const BRIEF_BOUNCE = `A laser bolt ricochets off the barrier at the road edge in ${GAME}: a quick spark as it strikes and a zing as it glances off in a new direction, heard a few metres away. Short and crisp; never a bullet ricochet. No voice.`;
const BRIEF_POP = `A small sci-fi item (a laser bolt, a drone, a mine) fizzles out and vanishes in ${GAME}: a tiny, clean energy pop, heard from a little way off. Very short. No voice.`;

const ZAP = FS(136542); // JoelAudio, ELECTRIC_ZAP_001 (CC0): a real electric crack

export const LASER: Cand[] = [
  // ---------------------------------------------------------------- Laser Blaster: fire
  {
    id: 'throw', name: 'throwA', brief: BRIEF_THROW,
    what: 'A, spring blaster: the classic "pew" made the way the film blasters were (a click through a long dispersive spring, so it falls from bright to low), a falling FM tone inside it, a crisp snap in front, a small low punch, and a real spring tank ringing after it.',
    why: 'Synthesis for the voice of the bolt (a dispersive chirp is a real physical sound, not an oscillator), the Roland RE-301 spring impulse response (CC0) for its space.',
    layers: [
      syn('laser', { seconds: 0.7, seed: 1, sections: 900, coef: -0.8, bright: 11000, echoes: [2, 0.055, 0.3], lo: 250, spread: 0.015 }, 0),
      syn('zap', { seconds: 0.34, seed: 2, hz: [[0, 2600], [0.14, 420], [0.3, 260]], ratio: 2.0, index: [[0, 2.5], [0.15, 0.4]], voices: 3, detune: 14,
        env: [[0, 0], [0.002, 1], [0.06, 0.7], [0.3, 0]] }, -6),
      snap(-9, 2500, 10000, 0.018),
      thump(-9, 150, 60, 0.09),
    ],
    master: [hp(70), conv(SPRING, 0.22, { hp: 300, lp: 8000, decay: 0.6 }), sat(1.6, 0.3), comp(-14, 2.5, 0.002, 0.1), ...cap(0.75, 0.3), OUT],
  },
  {
    id: 'throw', name: 'throwB', brief: BRIEF_THROW,
    what: 'B, plasma bolt: a thicker, heavier shot: five detuned saw voices dropping in pitch through a resonant filter that snaps shut, a dispersive zing on top, an electric fizz trailing, a low punch and a phaser sweep for movement.',
    why: 'Synthesis for the tone (a plasma bolt has no real recording), made dense with unison, a moving resonant filter, saturation and a short hall.',
    layers: [
      syn('zap', { seconds: 0.36, seed: 3, hz: [[0, 1400], [0.18, 190], [0.34, 150]], wave: 'saw', ratio: 0.5, index: [[0, 1.2], [0.2, 0.2]], voices: 5, detune: 22,
        noise: 0.15, noiseMult: 2, env: [[0, 0], [0.003, 1], [0.08, 0.8], [0.32, 0]] }, 0, [{ op: 'sweep', mode: 'lp', hz: [[0, 9000], [0.06, 5000], [0.25, 900]], q: 3 }]),
      syn('laser', { seconds: 0.5, seed: 4, sections: 420, coef: -0.78, bright: 12000, echoes: [0, 0.05, 0.3], lo: 1200 }, -7),
      syn('crackle', { seconds: 0.45, seed: 5, rate: 140, lo: 2000, hi: 10000, decay: 0.002, spread: 14, width: 0.8, env: [[0, 0], [0.03, 1], [0.4, 0]] }, -15),
      snap(-10, 2000, 9000, 0.015),
      thump(-7, 160, 55, 0.1),
    ],
    master: [hp(60), { op: 'phaser', rate: 4, lo: 600, hi: 5000, stages: 6, fb: 0.3, mix: 0.3 }, sat(2.0, 0.35), verb(0.5, 0.12), comp(-14, 2.5, 0.002, 0.1), ...cap(0.7, 0.25), OUT],
  },
  {
    id: 'throw', name: 'throwC', brief: BRIEF_THROW,
    what: 'C, ion rail: a real electric crack as the shot leaves, a tight dispersive "tchew", a falling FM whine, a quick whoosh of air flying off down the road and a low punch: sharper and more "rail gun", still a toy.',
    why: 'A real electric zap (JoelAudio, CC0) for the crack and a real quick whoosh (florianreichel, CC0) moved away from the ear; the chirp and whine synthesized; a long-tube impulse response made in code.',
    layers: [
      rec(ZAP, -3, [trim(0, 0.07), hp(900), fade(0.001, 0.03)]),
      syn('laser', { seconds: 0.5, seed: 7, sections: 500, coef: -0.82, bright: 12000, echoes: [0, 0.05, 0.3] }, -2, [hp4(300)]),
      syn('zap', { seconds: 0.3, seed: 8, hz: [[0, 3800], [0.28, 700]], index: [[0, 1.2], [0.28, 0.1]], ratio: 1.41, voices: 3, detune: 12, env: [[0, 0], [0.002, 1], [0.1, 0.5], [0.29, 0]] }, -9),
      rec(FS(683101), -9, [hp(700), fade(0.003, 0.1), { op: 'doppler', speed: 40, dist: 1.2, at: 0.05, pan: 0.6 }], 0.01),
      thump(-8, 150, 55, 0.08),
    ],
    master: [hp(80), sat(1.5, 0.3), conv(TUNNEL, 0.1, { decay: 0.5 }), comp(-14, 2.5, 0.002, 0.1), ...cap(0.7, 0.3), OUT],
  },
  // ---------------------------------------------------------------- Laser Blaster: ricochet
  {
    id: 'bounce', name: 'bounceA', brief: BRIEF_BOUNCE,
    what: 'A, spark and deflect: a real electric spark where the bolt strikes the barrier, then a short "pew" flying off in a new direction (it falls in pitch and pans away), a tick of metal and a few sparks.',
    why: 'A real zap (JoelAudio, CC0) for the strike; the deflected bolt is the dispersive chirp moved away from the ear with a physical Doppler; a spring impulse response (CC0).',
    layers: [
      rec(ZAP, -2, [trim(0, 0.06), hp(1200), fade(0.001, 0.03)]),
      syn('laser', { seconds: 0.4, seed: 12, sections: 220, coef: -0.8, bright: 12000, echoes: [0, 0.05, 0.3], lo: 900 }, -2, [{ op: 'doppler', speed: 25, dist: 1.0, at: 0.03, pan: 0.9 }], 0.01),
      syn('crackle', { seconds: 0.12, seed: 13, rate: 250, lo: 2500, hi: 11000, decay: 0.0015, spread: 10, width: 0.9, env: [[0, 1], [0.1, 0]] }, -12),
      snap(-8, 3000, 12000, 0.008),
    ],
    master: [hp(300), conv(SPRING, 0.12, { hp: 600, decay: 0.3 }), ...cap(0.45, 0.2), OUT],
  },
  {
    id: 'bounce', name: 'bounceB', brief: BRIEF_BOUNCE,
    what: 'B, plasma splash: the bolt splashes off the barrier: a ring-modulated "fzzt" falling in pitch, a crackling arc and a short falling whine.',
    why: 'Synthesis: band-passed noise ring-modulated by a falling tone, an electric arc, a two-voice FM whine; a short hall.',
    layers: [
      syn('noise', { seconds: 0.12, seed: 14, color: 'white', env: [[0, 0], [0.001, 1], [0.1, 0]] }, -2, [bp(3000, 0.8), { op: 'ringmod', hz: [[0, 1500], [0.1, 400]], mix: 0.7 }]),
      syn('arc', { seconds: 0.25, seed: 15, buzz: 180, hum: 0.2, sparks: 0.8, intensity: [[0, 1], [0.24, 0]] }, -6),
      syn('zap', { seconds: 0.18, seed: 16, hz: [[0, 2600], [0.16, 900]], index: [[0, 1.5], [0.16, 0.2]], ratio: 1.41, voices: 2, detune: 12, env: [[0, 0], [0.002, 1], [0.17, 0]] }, -8),
    ],
    master: [hp(250), verb(0.3, 0.1), ...cap(0.4, 0.15), OUT],
  },
  {
    id: 'bounce', name: 'bounceC', brief: BRIEF_BOUNCE,
    what: 'C, glancing zing: a real spark tick, then a bright band of air zinging past and away as the bolt glances off, with a thin metal ring settling.',
    why: 'A real zap (JoelAudio, CC0) cut to its first 50 ms; a band-passed noise whoosh falling and moved past the ear (Doppler); a struck-resonator ring.',
    layers: [
      rec(ZAP, -5, [trim(0, 0.05), hp(1500), fade(0.001, 0.02)]),
      syn('whoosh', { seconds: 0.35, seed: 17, hz: [[0, 7000], [0.3, 2500]], q: 3, env: [[0, 0], [0.01, 1], [0.33, 0]], air: 0.2 }, -2, [{ op: 'doppler', speed: 30, dist: 1.0, at: 0.04, pan: 0.9 }]),
      syn('ring', { seconds: 0.25, seed: 18, hz: [[0, 3400], [0.2, 2600]], modes: [[1, 1, 0.06], [2.32, 0.4, 0.04]], strike: 0.001, hardness: 12000 }, -10),
    ],
    master: [hp(300), ...cap(0.4, 0.15), OUT],
  },
  // ---------------------------------------------------------------- a projectile or dropped item fizzles out
  {
    id: 'pop', name: 'popA', brief: BRIEF_POP,
    what: 'A, dissolve: a real electric zap breaking up into a stutter as it falls in pitch, like a hologram switching off, with a small puff.',
    why: 'A real zap (JoelAudio, CC0) bent down 7 semitones and chopped by a gate that grows; a small puff (qubodup, CC0). The local ear: "a small soft sci-fi energy pop and fizzle", 0.83.',
    layers: [
      rec(ZAP, 0, [trim(0, 0.3), { op: 'bend', st: [[0, 0], [0.3, -7]] }, { op: 'stutter', rate: 35, duty: 0.5, jitter: 0.3, smooth: 1.5, seed: 3, pts: [[0, 0.2], [0.25, 1]] }, hp(400), fade(0.001, 0.12)]),
      rec(FS(714257), -12, [trim(0, 0.2), hp(700), fade(0.001, 0.08)]),
    ],
    master: [hp(200), verb(0.25, 0.08), ...cap(0.35, 0.12), OUT],
  },
  {
    id: 'pop', name: 'popB', brief: BRIEF_POP,
    what: 'B, zap drop: a short real electric zap whose pitch falls away as it dies, with a soft low pop under it.',
    why: 'A real short zap (el_boss\'s Tesla Tower Zap, CC0) bent down 9 semitones; a synthesized pop.',
    layers: [
      rec(FS(853286), 0, [trim(0.0, 0.3), { op: 'bend', st: [[0, 0], [0.3, -9]] }, hp(400), fade(0.002, 0.12)]),
      thump(-10, 180, 80, 0.05),
    ],
    master: [hp(200), verb(0.25, 0.08), ...cap(0.35, 0.12), OUT],
  },
  {
    id: 'pop', name: 'popC', brief: BRIEF_POP,
    what: 'C, snap-out: the crackle of a real electric zap bending down, with a puff of air as the item vanishes.',
    why: 'A real zap (JoelAudio, CC0) bent down 5 semitones, a puff of smoke (qubodup, CC0).',
    layers: [
      rec(ZAP, 0, [trim(0, 0.2), { op: 'bend', st: [[0, 0], [0.2, -5]] }, hp(500), fade(0.001, 0.1)]),
      rec(FS(714257), -8, [trim(0, 0.2), hp(700), fade(0.001, 0.08)]),
    ],
    master: [hp(200), verb(0.25, 0.08), ...cap(0.3, 0.12), OUT],
  },
];
