// Shockwave (was Air Horn) and Energy Shield (was Bubble): the pulse ring; the shield's power-on, hum (a new loop id),
// the hit it absorbs, and its power-down.
import type { Cand } from '../parts.ts';
import { bp, cap, comp, conv, fade, FS, hp, KS, lp, METAL, OUT, pitch, PLATE, rec, sat, snap, syn, thump, trim, TUNNEL, verb, VS } from '../parts.ts';

const BRIEF_WAVE = 'The Shockwave item in a polished, cinematic cartoon sci-fi kart racer: a powerful energy pulse ring blasts out around the kart, shoving rivals aside. Big, punchy and cool, a deep thump with a ring of energy racing outward, a little over a second. No voice, not an air horn, not a real explosion.';
const BRIEF_UP = 'The Energy Shield switches on around the kart in a polished cartoon sci-fi kart racer: a quick rising power-up as a glowing force field wraps around the kart and locks with a bright shimmer. Cool and reassuring, under a second. No voice.';
const BRIEF_HUM = 'While the Energy Shield is up in a polished cartoon sci-fi kart racer: a gentle, warm force-field hum around the kart, a seamless loop that sits quietly under the engine and music. Soft, alive, never annoying. No voice, no singing.';
const BRIEF_POP = 'The Energy Shield absorbs a hit and breaks in a polished cartoon sci-fi kart racer: a bright energetic deflection, the field flaring and shattering into sparks. Satisfying and punchy, under a second. No voice.';
const BRIEF_END = 'The Energy Shield runs out in a polished cartoon sci-fi kart racer: the force field flickers and powers down, a soft falling shimmer. Quiet and secondary, under a second. No voice.';

export const FIELD: Cand[] = [
  // ---------------------------------------------------------------- Shockwave
  {
    id: 'airHorn', name: 'airHornA', brief: BRIEF_WAVE,
    what: 'A, sonic pulse: a sharp crack, a deep driven sub pulse dropping away, then a ring of air sweeping up from low to high across the whole stereo field as the wave expands, a phasing "wub" and a few sparks.',
    why: 'Synthesis: an N-wave crack, a driven sine drop (harmonics so it carries on small speakers), a band of noise whose centre climbs 250 Hz to 9 kHz as the ring grows, a pulsing hum through a phaser; a long-tube impulse response made in code.',
    layers: [
      syn('nwave', { seconds: 0.2, seed: 81, T: 0.02, rise: 0.0004, double: false, lp: 10000, hp: 200 }, -4),
      syn('subdrop', { seconds: 0.75, hz: [[0, 140], [0.35, 38]], drive: 2.5, env: [[0, 0], [0.003, 1], [0.2, 0.7], [0.7, 0]] }, 0),
      syn('whoosh', { seconds: 1.1, seed: 82, hz: [[0, 250], [0.5, 5000], [1.0, 9000]], q: [[0, 3], [1, 1.5]], env: [[0, 0], [0.01, 1], [0.3, 0.6], [1.0, 0]], air: 0.3 }, -3,
        [{ op: 'widen', amount: 0.6 }]),
      syn('hum', { seconds: 0.95, seed: 83, hz: 55, partials: 12, tilt: 1.0, voices: 3, detune: 12, pulse: [[[0, 14], [0.8, 4]], 0.6], env: [[0, 0], [0.01, 1], [0.9, 0]] }, -8,
        [{ op: 'phaser', rate: 2, lo: 200, hi: 2500, stages: 6, fb: 0.4, mix: 0.4 }]),
      syn('glitter', { seconds: 0.9, seed: 84, density: [[0.05, 50], [0.8, 0]], lo: 3000, hi: 9000, decay: 0.06, ratio: 1.41, index: 0.7 }, -17),
    ],
    master: [hp(30), sat(2, 0.35), comp(-12, 3, 0.003, 0.15), conv(TUNNEL, 0.12, { decay: 0.9 }), ...cap(1.3, 0.45), OUT],
  },
  {
    id: 'airHorn', name: 'airHornB', brief: BRIEF_WAVE,
    what: 'B, force push: a real cinematic boom and a real big swoosh as the wave pushes out, an electric crackle riding the ring and a driven sub.',
    why: 'Recording-led: a cinematic boom (rhapsodize, CC0) saturated for mid-range, a big swoosh (Electroviolence, CC0), a synthesized arc and sub.',
    layers: [
      snap(-6, 1500, 9000, 0.015),
      rec(FS(255111), -1, [trim(0, 1.2), lp(3000), sat(2.2, 0.6), fade(0.001, 0.5)]),
      rec(FS(234547), -3, [trim(0.2, 0.75), hp(250), fade(0.003, 0.25)]),
      syn('arc', { seconds: 0.8, seed: 85, buzz: 110, hum: 0.2, sparks: 0.8, intensity: [[0, 0.3], [0.1, 1], [0.7, 0]] }, -8, [{ op: 'widen', amount: 0.6 }]),
      syn('subdrop', { seconds: 0.6, hz: [[0, 120], [0.4, 40]], drive: 2.5, env: [[0, 0], [0.003, 1], [0.55, 0]] }, -4),
    ],
    master: [hp(30), comp(-12, 3, 0.003, 0.15), verb(0.9, 0.12), ...cap(1.3, 0.45), OUT],
  },
  {
    id: 'airHorn', name: 'airHornC', brief: BRIEF_WAVE,
    what: 'C, harmonic ring: a huge struck energy ring, "WHAAANG", with a sub thump under it and the ring of air racing outward, phasing as it goes: more musical and iconic.',
    why: 'Synthesis: a struck resonator with bell-like modes on G3, a driven sub, the expanding noise ring; a plate impulse response made in code.',
    layers: [
      syn('ring', { seconds: 1.3, seed: 86, hz: [[0, 200], [1.2, 188]], modes: [[1, 1, 0.9], [2.76, 0.6, 0.6], [5.4, 0.4, 0.35], [8.93, 0.25, 0.2], [13.3, 0.15, 0.1]], strike: 0.004, hardness: 5000, detune: 5 }, 0),
      syn('subdrop', { seconds: 0.6, hz: [[0, 90], [0.5, 35]], drive: 2, env: [[0, 0], [0.003, 1], [0.55, 0]] }, -4),
      syn('whoosh', { seconds: 1.0, seed: 87, hz: [[0, 300], [0.5, 6000], [1.0, 9000]], q: 2, env: [[0, 0], [0.01, 1], [0.4, 0.5], [1.0, 0]], air: 0.3 }, -7, [{ op: 'widen', amount: 0.6 }]),
      snap(-8, 2000, 10000, 0.015),
    ],
    master: [hp(30), { op: 'phaser', rate: 1.2, lo: 300, hi: 3000, stages: 6, fb: 0.4, mix: 0.3 }, conv(PLATE, 0.15, { decay: 1.1 }), sat(1.5, 0.25), comp(-12, 3, 0.003, 0.15), ...cap(1.4, 0.5), OUT],
  },
  // ---------------------------------------------------------------- Energy Shield: on
  {
    id: 'shieldUp', name: 'shieldUpA', brief: BRIEF_UP,
    what: 'A, power-on dome: a rising FM "vwooop" as the field charges, a whoosh that swirls round the kart from one side to the other, a soft low "thoom" as it closes and a crystal A-major chord as it locks, then a warm hum settling.',
    why: 'Synthesis: FM with a falling index (bright to warm), a band-passed swirl panned round, a driven sine, bell grains on the chord, an additive hum; a short hall.',
    layers: [
      syn('zap', { seconds: 0.4, seed: 91, hz: [[0, 180], [0.35, 720]], index: [[0, 3], [0.4, 0.5]], ratio: 1.5, voices: 3, detune: 10, env: [[0, 0], [0.02, 1], [0.3, 0.8], [0.4, 0]] }, -2),
      syn('whoosh', { seconds: 0.45, seed: 92, hz: [[0, 500], [0.4, 3000]], q: 1.5, pan: [[0, -1], [0.2, 1], [0.4, -0.4]], env: [[0, 0], [0.05, 1], [0.4, 0]], air: 0.2 }, -10),
      syn('subdrop', { seconds: 0.25, hz: [[0, 95], [0.2, 60]], drive: 1.5, env: [[0, 0], [0.01, 1], [0.24, 0]] }, -11, [], 0.33),
      syn('glitter', { seconds: 0.6, seed: 93, density: [[0, 60], [0.3, 20], [0.55, 0]], notes: [1760, 2217.5, 2637, 3520], decay: 0.25, ratio: 2.0, index: 0.4 }, -8, [], 0.32),
      syn('hum', { seconds: 0.6, seed: 94, hz: 110, partials: 10, tilt: 1.3, voices: 3, detune: 8, env: [[0, 0], [0.1, 1], [0.58, 0]] }, -12, [], 0.3),
    ],
    master: [hp(50), { op: 'chorus', voices: 3, depth: 3, rate: 0.8, base: 11, mix: 0.3 }, verb(0.9, 0.2), comp(-14, 2), ...cap(1.0, 0.35), OUT],
  },
  {
    id: 'shieldUp', name: 'shieldUpB', brief: BRIEF_UP,
    what: 'B, force field snap: an electric "fzzt" as the emitters fire, a resonant hum swelling up with a pulse, and a glassy "shing" with a D-major shimmer as the field locks.',
    why: 'A real short zap (el_boss, CC0) for the fzzt, Kenney\'s force field (CC0) underneath, a synthesized pulsing hum through a phaser, a struck glassy ring and bell grains.',
    layers: [
      rec(FS(853286), -8, [trim(0, 0.15), hp(1500), fade(0.002, 0.06)]),
      rec(KS('forceField_000.ogg'), -10, [hp(150), fade(0.01, 0.3)]),
      syn('hum', { seconds: 0.9, seed: 95, hz: 146.8, partials: 12, tilt: 1.1, voices: 3, detune: 9, pulse: [9, 0.25], env: [[0, 0], [0.3, 1], [0.6, 0.6], [0.88, 0]] }, -3,
        [{ op: 'phaser', rate: 1.5, lo: 300, hi: 3000, stages: 6, fb: 0.4, mix: 0.4 }]),
      syn('ring', { seconds: 0.7, seed: 96, hz: 2349, modes: [[1, 1, 0.4], [2.76, 0.3, 0.2], [5.4, 0.15, 0.1]], strike: 0.001, hardness: 10000 }, -9, [], 0.1),
      syn('glitter', { seconds: 0.6, seed: 97, density: [[0, 50], [0.5, 0]], notes: [2349, 2960, 3520], decay: 0.2, ratio: 2, index: 0.4 }, -12, [], 0.1),
    ],
    master: [hp(60), verb(0.8, 0.18), comp(-14, 2), ...cap(1.0, 0.35), OUT],
  },
  {
    id: 'shieldUp', name: 'shieldUpC', brief: BRIEF_UP,
    what: 'C, hex tiles: a rapid sparkling run of tiny blips climbing a pentatonic scale, like the shield\'s hexagon tiles snapping into place round the kart, then a warm hum blooming and one glass ping.',
    why: 'Synthesis: twelve short triangle blips (A major pentatonic, 880 to 3,520 Hz) widened across the stereo field, an additive hum, a struck glass-like ring.',
    layers: [
      syn('beeps', { seconds: 0.4, wave: 'tri', attack: 0.001, release: 0.02, notes: [
        [0.0, 880, 0.015, 0.7], [0.02, 987.8, 0.015, 0.72], [0.04, 1108.7, 0.015, 0.74], [0.06, 1318.5, 0.015, 0.76], [0.08, 1480, 0.015, 0.78], [0.1, 1760, 0.015, 0.8],
        [0.12, 1975.5, 0.015, 0.82], [0.14, 2217.5, 0.015, 0.84], [0.16, 2637, 0.015, 0.86], [0.18, 2960, 0.015, 0.88], [0.2, 3520, 0.03, 0.9]] }, -5,
        [{ op: 'chorus', voices: 3, depth: 4, rate: 1.2, base: 8, mix: 0.4 }, { op: 'widen', amount: 0.7 }]),
      syn('hum', { seconds: 0.75, seed: 98, hz: 110, partials: 10, tilt: 1.2, voices: 3, detune: 9, env: [[0, 0], [0.15, 1], [0.73, 0]] }, -6, [], 0.18),
      syn('ring', { seconds: 0.6, seed: 99, hz: 1760, modes: [[1, 1, 0.35], [2.76, 0.3, 0.15], [5.4, 0.12, 0.08]], strike: 0.001, hardness: 9000 }, -9, [], 0.22),
      syn('whoosh', { seconds: 0.35, seed: 100, hz: [[0, 800], [0.3, 4000]], q: 1.2, env: [[0, 0], [0.05, 1], [0.33, 0]] }, -14),
    ],
    master: [hp(60), verb(0.8, 0.18), comp(-14, 2), ...cap(1.0, 0.35), OUT],
  },
  // ---------------------------------------------------------------- Energy Shield: the hum while it is up (new loop id: shieldHum)
  {
    id: 'shieldHum', name: 'shieldHumA', brief: BRIEF_HUM, loop: 3.0, xfade: 0.1,
    what: 'A, warm field: a soft A2 hum (110 Hz) of detuned voices that breathes twice a loop, with gentle formants, a slow phaser sweep and the odd faint sparkle.',
    why: 'Additive synthesis tuned to whole cycles of the 3 s loop (so the wrap is seamless), every modulation a whole number of cycles a loop.',
    layers: [
      syn('hum', { seconds: 3.2, seed: 101, hz: 110, period: 3.0, partials: 14, tilt: 1.3, voices: 4, detune: 0.667, formants: [[800, 1.5, 4], [2400, 2, 3]], pulse: [0.6667, 0.2] }, 0,
        [{ op: 'phaser', rate: 0.3333, lo: 300, hi: 2000, stages: 4, fb: 0.3, mix: 0.3 }]),
      syn('glitter', { seconds: 3.2, seed: 102, density: 5, lo: 3000, hi: 8000, decay: 0.1, ratio: 1.41, index: 0.5 }, -24),
    ],
    master: [hp(60), lp(7000), OUT],
  },
  {
    id: 'shieldHum', name: 'shieldHumB', brief: BRIEF_HUM, loop: 3.0, xfade: 0.1,
    what: 'B, electric field: a buzzier E2 hum (82 Hz) with a fine electric sizzle, a quick flutter and a rare crackle, like a charged force field.',
    why: 'Additive synthesis (odd harmonics, a noise sizzle gated by the wave) tuned to the loop, a light tremolo, a sparse crackle.',
    layers: [
      syn('hum', { seconds: 3.2, seed: 103, hz: 82.41, period: 3.0, partials: 20, odd: true, tilt: 1.1, voices: 3, detune: 0.667, buzz: 0.25 }, 0,
        [{ op: 'tremolo', rate: 12, depth: 0.12, stereo: 0.5 }, lp(5000)]),
      syn('crackle', { seconds: 3.2, seed: 104, rate: 6, lo: 2000, hi: 8000, decay: 0.002, spread: 12, width: 0.8 }, -16),
    ],
    master: [hp(50), OUT],
  },
  {
    id: 'shieldHum', name: 'shieldHumC', brief: BRIEF_HUM, loop: 3.0, xfade: 0.1,
    what: 'C, glass hum: a clean, glassy chord of near-sine tones (A3, E4, A4) that beat slowly against each other, with a soft breath of air, like a crystal field.',
    why: 'Additive synthesis (nearly pure partials so it never reads as a voice or an organ), tuned to the loop, a slow chorus.',
    layers: [
      syn('hum', { seconds: 3.2, seed: 105, hz: 220, period: 3.0, partials: 3, tilt: 2.2, voices: 2, detune: 0.3333 }, -2),
      syn('hum', { seconds: 3.2, seed: 106, hz: 329.6, period: 3.0, partials: 2, tilt: 2.5, voices: 2, detune: 0.6667 }, -6),
      syn('hum', { seconds: 3.2, seed: 107, hz: 440, period: 3.0, partials: 2, tilt: 2.5, voices: 2, detune: 1.0 }, -9),
      syn('noise', { seconds: 3.2, seed: 108, color: 'pink' }, -26, [bp(3000, 0.7)]),
    ],
    master: [hp(80), { op: 'chorus', voices: 2, depth: 2, rate: 0.3333, base: 9, mix: 0.25, lock: true }, OUT],
  },
  // ---------------------------------------------------------------- Energy Shield: absorbs a hit
  {
    id: 'shieldPop', name: 'shieldPopA', brief: BRIEF_POP,
    what: 'A, deflect: a bright metallic "ZANG" as the field takes the hit, an electric crackle, a flick of air as the shot glances off and a small low punch.',
    why: 'A synthesized struck resonator (the ring settling a little in pitch) over a real zap (JoelAudio, CC0) and a real quick whoosh (florianreichel, CC0), in a metal impulse response made in code.',
    layers: [
      syn('ring', { seconds: 0.7, seed: 111, hz: [[0, 1400], [0.4, 1150]], modes: [[1, 1, 0.35], [2.32, 0.6, 0.2], [4.25, 0.4, 0.12], [6.8, 0.25, 0.07]], strike: 0.002, hardness: 9000 }, 0),
      rec(FS(136542), -7, [trim(0, 0.2), hp(1000), fade(0.001, 0.08)]),
      rec(FS(683101), -11, [hp(600), fade(0.002, 0.08)], 0.01),
      thump(-8, 120, 50, 0.12),
    ],
    master: [hp(60), conv(METAL, 0.18, { decay: 0.45 }), comp(-12, 3, 0.002, 0.12), ...cap(0.85, 0.3), OUT],
  },
  {
    id: 'shieldPop', name: 'shieldPopB', brief: BRIEF_POP,
    what: 'B, crystal shatter: the field shatters like a pane of crystal (a real glass break, brightened), an energy zap falling through it, a burst of sparkles and a low thump.',
    why: 'A real glass break (VSCO-2 CE, CC0) pitched up; the zap, sparkle and thump synthesized.',
    layers: [
      rec(VS('Miscellania Raw/Misc 1/glass_break.wav'), -2, [pitch(3), hp(1500), trim(0, 0.8), fade(0.001, 0.3)]),
      syn('zap', { seconds: 0.25, seed: 112, hz: [[0, 2500], [0.2, 300]], wave: 'saw', voices: 3, detune: 15, env: [[0, 0], [0.002, 1], [0.24, 0]] }, -8, [lp(6000)]),
      syn('glitter', { seconds: 0.6, seed: 113, density: [[0, 300], [0.5, 0]], lo: 3000, hi: 10000, decay: 0.06, ratio: 1.41, index: 0.6 }, -9),
      thump(-7, 120, 45, 0.12),
    ],
    master: [hp(60), verb(0.6, 0.12), comp(-12, 3, 0.002, 0.12), ...cap(0.85, 0.3), OUT],
  },
  {
    id: 'shieldPop', name: 'shieldPopC', brief: BRIEF_POP,
    what: 'C, absorb wobble: a deep resonant "bwowowom" as the field soaks up the hit and wobbles, slowing as it settles, with a soft zap at the strike.',
    why: 'Synthesis: an additive hum whose pulse slows from 22 to 5 wobbles a second, a falling sine zap, a flick of air.',
    layers: [
      syn('hum', { seconds: 0.85, seed: 114, hz: [[0, 90], [0.8, 70]], partials: 12, tilt: 1.1, voices: 3, detune: 10, pulse: [[[0, 22], [0.8, 5]], 0.7], env: [[0, 0], [0.005, 1], [0.3, 0.6], [0.83, 0]] }, 0),
      syn('zap', { seconds: 0.1, seed: 115, hz: [[0, 1200], [0.08, 300]], index: [[0, 1.5], [0.08, 0]], ratio: 2, env: [[0, 0], [0.002, 1], [0.09, 0]] }, -6),
      syn('whoosh', { seconds: 0.3, seed: 116, hz: [[0, 3000], [0.25, 800]], q: 1.2, env: [[0, 0], [0.01, 1], [0.28, 0]] }, -12),
    ],
    master: [hp(40), verb(0.5, 0.1), sat(1.4, 0.2), comp(-12, 3, 0.002, 0.12), ...cap(0.85, 0.3), OUT],
  },
  // ---------------------------------------------------------------- Energy Shield: runs out
  {
    id: 'shieldEnd', name: 'shieldEndA', brief: BRIEF_END,
    what: 'A, power-down: a falling tone that flickers faster and faster as the field fails, with the shield\'s A-major sparkle falling away under it.',
    why: 'Synthesis: a three-voice FM tone falling 900 to 110 Hz, chopped by a gate that grows, bell grains on a falling chord.',
    layers: [
      syn('zap', { seconds: 0.65, seed: 121, hz: [[0, 900], [0.55, 110]], index: [[0, 1.2], [0.5, 0.2]], ratio: 1.5, voices: 3, detune: 12, env: [[0, 0], [0.01, 1], [0.4, 0.6], [0.63, 0]] }, 0,
        [{ op: 'stutter', rate: 22, duty: 0.55, jitter: 0.25, smooth: 2, seed: 5, pts: [[0, 0], [0.15, 0.2], [0.55, 1]] }]),
      syn('glitter', { seconds: 0.6, seed: 122, density: [[0, 30], [0.5, 0]], notes: [2637, 2217.5, 1760, 1318.5], decay: 0.12, ratio: 2, index: 0.3 }, -10),
    ],
    master: [hp(60), verb(0.5, 0.12), ...cap(0.8, 0.3), OUT],
  },
  {
    id: 'shieldEnd', name: 'shieldEndB', brief: BRIEF_END,
    what: 'B, dissolve: the field breaks up into a soft shower of sparkles falling down the A-major chord, with a gentle falling whoosh.',
    why: 'Synthesis: bell grains whose notes fall over the sound, a band of air sweeping down.',
    layers: [
      syn('glitter', { seconds: 0.4, seed: 123, density: [[0, 60], [0.35, 0]], notes: [3520, 2960, 2637], decay: 0.1, ratio: 2, index: 0.3 }, 0),
      syn('glitter', { seconds: 0.5, seed: 124, density: [[0, 0], [0.12, 50], [0.45, 0]], notes: [2217.5, 1760, 1318.5], decay: 0.12, ratio: 2, index: 0.3 }, -2),
      syn('whoosh', { seconds: 0.6, seed: 125, hz: [[0, 6000], [0.55, 800]], q: 1.2, env: [[0, 0], [0.05, 1], [0.58, 0]] }, -9),
    ],
    master: [hp(100), verb(0.6, 0.15), ...cap(0.8, 0.3), OUT],
  },
  {
    id: 'shieldEnd', name: 'shieldEndC', brief: BRIEF_END,
    what: 'C, collapse: the field sucks inward with a quick rising swirl and winks out in a small soft pop.',
    why: 'Synthesis: a band of air rising and closing, a small tone blip and puff.',
    layers: [
      syn('whoosh', { seconds: 0.35, seed: 126, hz: [[0, 400], [0.3, 3500]], q: 1.5, env: [[0, 0], [0.25, 1], [0.32, 0]], air: 0.2 }, -2),
      syn('zap', { seconds: 0.1, seed: 127, hz: [[0, 500], [0.06, 1200]], voices: 2, detune: 8, env: [[0, 0], [0.002, 1], [0.09, 0]] }, -4, [], 0.3),
      rec(FS(714257), -10, [trim(0, 0.3), hp(700), fade(0.002, 0.1)], 0.3),
    ],
    master: [hp(100), verb(0.4, 0.12), ...cap(0.75, 0.25), OUT],
  },
];
