// Laser Blaster (was Beach Ball): the shot, its ricochets off the road edge, and the small pop every projectile and
// dropped item makes when it fizzles out.
import type { Cand } from '../parts.ts';
import { bp, cap, comp, conv, fade, FS, hp, hp4, KI, METAL, OUT, pitch, rec, sat, snap, SPRING, syn, thump, trim, verb } from '../parts.ts';

const BRIEF_THROW = 'The player fires the Laser Blaster in a polished, cinematic cartoon kart racing game with a sci-fi look: a bright energy bolt zips away down the road. Punchy, cool and satisfying, a toy-like sci-fi blaster, never a real gun, about half a second. No voice.';
const BRIEF_BOUNCE = 'A laser bolt ricochets off the barrier at the road edge in a polished cartoon sci-fi kart racer: a quick bright zing and spark as it deflects, heard a few metres away. Short, crisp, playful; never a bullet ricochet. No voice.';
const BRIEF_POP = 'A small sci-fi item (a laser bolt, a drone, a mine) fizzles out and vanishes in a polished cartoon kart racer: a tiny soft energy pop and sparkle, heard from a little way off. Very short, clean. No voice.';

export const LASER: Cand[] = [
  // ---------------------------------------------------------------- Laser Blaster: fire
  {
    id: 'throw', name: 'throwA', brief: BRIEF_THROW,
    what: 'A, spring blaster: the classic "pew" made the way the film blasters were (a click through a long dispersive spring, so it falls from bright to low), a bright FM tone falling with it, a crisp snap in front, a small low punch for weight, and a real spring tank ringing after it.',
    why: 'Synthesis for the voice of the bolt (a dispersive chirp is a real physical sound, not an oscillator), the Roland RE-301 spring impulse (CC0) for its space.',
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
    what: 'B, plasma bolt: a chunkier, thicker shot: five detuned saw voices dropping in pitch through a resonant filter that snaps shut, a dispersive zing on top, an electric fizz trailing, a low punch and a phaser sweep for movement.',
    why: 'Synthesis only for the tone (a plasma bolt has no real recording), made rich with unison, a moving resonant filter, saturation and a short hall.',
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
    what: 'C, ricochet ringer: a bright bolt that rings like struck metal as it leaves (so the ricochets that follow sound like the same bolt): a falling metallic ping, a thin dispersive zing, a quick real whoosh as it flies off and a pinch of sparkle.',
    why: 'Synthesis (a struck resonator bending down, the dispersive chirp) with a real whoosh (florianreichel, CC0) and a metal impulse response made in code.',
    layers: [
      syn('ring', { seconds: 0.55, seed: 6, hz: [[0, 2300], [0.3, 950]], modes: [[1, 1, 0.16], [2.32, 0.5, 0.1], [4.25, 0.35, 0.06], [6.8, 0.2, 0.04]], strike: 0.002, hardness: 9000, detune: 6 }, -3),
      syn('laser', { seconds: 0.5, seed: 7, sections: 260, coef: -0.85, stretch: 2, bright: 12000, echoes: [1, 0.05, 0.35] }, -4, [hp4(450)]),
      syn('zap', { seconds: 0.16, seed: 8, hz: [[0, 3400], [0.12, 700]], index: [[0, 1.5], [0.12, 0]], voices: 2, detune: 10, env: [[0, 0], [0.002, 1], [0.14, 0]] }, -7),
      rec(FS(683101), -13, [pitch(5), hp(800), fade(0.004, 0.08)], 0.02),
      syn('glitter', { seconds: 0.3, seed: 9, density: [[0, 90], [0.25, 0]], lo: 4000, hi: 10000, decay: 0.05, ratio: 1.41, index: 0.8 }, -19, [], 0.02),
    ],
    master: [hp(120), conv(METAL, 0.15, { hp: 500, decay: 0.35 }), comp(-14, 2, 0.002, 0.1), ...cap(0.7, 0.3), OUT],
  },
  // ---------------------------------------------------------------- Laser Blaster: ricochet
  {
    id: 'bounce', name: 'bounceA', brief: BRIEF_BOUNCE,
    what: 'A, zing deflect: a quick up-flick, then a bright metallic "pteeew" bending down as the bolt glances off, a zip of spring, and a few sparks where it struck.',
    why: 'Synthesis (a struck resonator bending down, a dispersive chirp, a crackle) in a spring impulse response (CC0).',
    layers: [
      syn('zap', { seconds: 0.05, seed: 10, hz: [[0, 900], [0.035, 3200]], env: [[0, 0], [0.002, 1], [0.045, 0]] }, -9),
      syn('ring', { seconds: 0.4, seed: 11, hz: [[0, 3600], [0.05, 2800], [0.3, 1700]], modes: [[1, 1, 0.14], [2.32, 0.45, 0.09], [4.25, 0.3, 0.05]], strike: 0.0015, hardness: 10000 }, -1, [], 0.02),
      syn('laser', { seconds: 0.35, seed: 12, sections: 250, coef: -0.8, bright: 11000, echoes: [0, 0.05, 0.3], lo: 900 }, -5, [], 0.02),
      syn('crackle', { seconds: 0.12, seed: 13, rate: 250, lo: 2500, hi: 11000, decay: 0.0015, spread: 10, width: 0.9, env: [[0, 1], [0.1, 0]] }, -12, [], 0.02),
    ],
    master: [hp(300), conv(SPRING, 0.2, { hp: 500, decay: 0.35 }), ...cap(0.45, 0.2), OUT],
  },
  {
    id: 'bounce', name: 'bounceB', brief: BRIEF_BOUNCE,
    what: 'B, energy bonk: bouncier and more cartoon: a quick rising "bwip" of energy off the wall with a small metal tick and a fizz.',
    why: 'Synthesis (a rising two-voice tone, a struck resonator) over a real metal impact from Kenney\'s Impact Sounds (CC0), high-passed so it only ticks.',
    layers: [
      syn('zap', { seconds: 0.2, seed: 14, hz: [[0, 520], [0.04, 1900], [0.18, 1300]], voices: 2, detune: 12, index: [[0, 1.2], [0.1, 0.2]], ratio: 2,
        env: [[0, 0], [0.002, 1], [0.05, 0.7], [0.19, 0]] }, 0),
      syn('ring', { seconds: 0.25, seed: 15, hz: 2600, modes: [[1, 1, 0.08], [2.76, 0.4, 0.05], [5.4, 0.25, 0.03]], strike: 0.001, hardness: 12000 }, -7),
      rec(KI('impactMetal_light_002.ogg'), -12, [hp(1500)]),
      syn('crackle', { seconds: 0.1, seed: 16, rate: 220, lo: 3000, hi: 11000, decay: 0.0015, spread: 10, width: 0.9, env: [[0, 1], [0.09, 0]] }, -15, [], 0.01),
    ],
    master: [hp(250), verb(0.35, 0.12), OUT],
  },
  {
    id: 'bounce', name: 'bounceC', brief: BRIEF_BOUNCE,
    what: 'C, spark ricochet: a real electric zap cut short as the strike, a falling ping and a short whoosh as the bolt flies off the other way.',
    why: 'A real zap (JoelAudio, ELECTRIC_ZAP_001, CC0) for the strike, synthesis for the ping, a real whoosh (ch_ase, CC0) moving past.',
    layers: [
      rec(FS(136542), -2, [trim(0, 0.12), hp(600), fade(0.001, 0.05)]),
      syn('ring', { seconds: 0.35, seed: 17, hz: [[0, 3000], [0.3, 1500]], modes: [[1, 1, 0.12], [2.32, 0.4, 0.08], [4.25, 0.25, 0.05]], strike: 0.001, hardness: 10000 }, -5),
      rec(FS(423792), -14, [trim(0.1, 0.5), pitch(4), hp(900), fade(0.005, 0.2), { op: 'doppler', speed: 30, dist: 1.5, at: 0.05, pan: 0.8 }], 0.01),
    ],
    master: [hp(200), ...cap(0.4, 0.15), OUT],
  },
  // ---------------------------------------------------------------- a projectile or dropped item fizzles out
  {
    id: 'pop', name: 'popA', brief: BRIEF_POP,
    what: 'A, energy fizzle: a soft "fzzt-bup": a small falling tone, a puff of electric fizz and a few sparkles.',
    why: 'Synthesis: a sine falling an octave, band-passed noise, a crackle, bell grains.',
    layers: [
      syn('zap', { seconds: 0.12, seed: 18, hz: [[0, 700], [0.1, 300]], index: [[0, 1], [0.1, 0]], ratio: 1.5, env: [[0, 0], [0.002, 1], [0.1, 0]] }, 0),
      syn('noise', { seconds: 0.2, seed: 19, color: 'pink', env: [[0, 0], [0.004, 1], [0.18, 0]] }, -6, [bp(3500, 1.2)]),
      syn('crackle', { seconds: 0.2, seed: 20, rate: 180, lo: 2500, hi: 9000, decay: 0.0015, spread: 12, width: 0.8, env: [[0, 1], [0.18, 0]] }, -10),
      syn('glitter', { seconds: 0.3, seed: 21, density: [[0, 50], [0.2, 0]], lo: 3500, hi: 9000, decay: 0.05, ratio: 1.41, index: 0.6 }, -14, [], 0.02),
    ],
    master: [hp(150), verb(0.3, 0.1), OUT],
  },
  {
    id: 'pop', name: 'popB', brief: BRIEF_POP,
    what: 'B, bubble blink: a round little "pwip" rising as it winks out, a puff of air and a sparkle.',
    why: 'Synthesis for the tone and sparkle, a real puff of smoke (qubodup, CC0) for the air.',
    layers: [
      syn('zap', { seconds: 0.1, seed: 22, hz: [[0, 420], [0.06, 1100]], voices: 2, detune: 8, env: [[0, 0], [0.002, 1], [0.03, 0.6], [0.09, 0]] }, 0),
      rec(FS(714257), -9, [trim(0, 0.3), hp(700), fade(0.002, 0.1)]),
      syn('glitter', { seconds: 0.3, seed: 23, density: [[0, 60], [0.2, 0]], notes: [2349, 2960, 3520, 4699], decay: 0.06, ratio: 2.0, index: 0.5 }, -13, [], 0.03),
    ],
    master: [hp(150), verb(0.3, 0.08), OUT],
  },
  {
    id: 'pop', name: 'popC', brief: BRIEF_POP,
    what: 'C, digital blink-out: a tiny stuttering "brrp" that falls away, like a hologram switching off.',
    why: 'Synthesis: a falling FM tone chopped by a fast gate, a short dispersive zip.',
    layers: [
      syn('zap', { seconds: 0.18, seed: 24, hz: [[0, 1800], [0.16, 400]], ratio: 1.5, index: [[0, 2], [0.16, 0.3]], voices: 2, detune: 10, env: [[0, 0], [0.002, 1], [0.17, 0]] }, 0,
        [{ op: 'stutter', rate: 45, duty: 0.55, jitter: 0.2, smooth: 1.5, seed: 3 }]),
      syn('laser', { seconds: 0.25, seed: 25, sections: 160, coef: -0.8, bright: 11000, echoes: [0, 0.05, 0.3], lo: 800 }, -8),
    ],
    master: [hp(200), verb(0.25, 0.08), OUT],
  },
];
