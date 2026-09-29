// Shockwave (was Air Horn) and Energy Shield (was Bubble): the pulse ring; the shield's power-on, hum (a new loop id),
// the hit it absorbs, and its power-down.
import type { Cand } from '../parts.ts';
import { cap, comp, conv, EVEN, fade, FS, GAME, hp, lp, METAL, OUT, pitch, PLATE, rec, sat, snap, syn, thump, trim, TUNNEL, verb, VS } from '../parts.ts';

const BRIEF_WAVE = `The Shockwave item in ${GAME}: a powerful energy pulse ring blasts out around the kart, shoving rivals aside. Big and punchy, a deep thump with a ring of energy racing outward, a little over a second. No voice, not an air horn, not a real explosion.`;
const BRIEF_UP = `The Energy Shield switches on around the kart in ${GAME}: a quick power-up as a force field wraps around the kart and locks on. Techy and reassuring, under a second. No voice, nothing magical or sparkly.`;
const BRIEF_HUM = `While the Energy Shield is up in ${GAME}: a low, steady force-field hum around the kart, a seamless loop that sits quietly under the engine and music. Alive but never pulsing like an alarm, never annoying. No voice, no singing.`;
const BRIEF_POP = `The Energy Shield absorbs a hit and breaks in ${GAME}: a hard energetic deflection, the field flaring and breaking apart. Satisfying and punchy, under a second. No voice.`;
const BRIEF_END = `The Energy Shield runs out in ${GAME}: the force field flickers and powers down. Quiet and secondary, under a second. No voice, no chimes.`;

const ZAP = FS(136542); // JoelAudio, ELECTRIC_ZAP_001 (CC0)
const GEN = FS(452768); // Euphrosyyn, Scifi_Generator_Lp (CC0): a real generator hum (the local ear: mains hum, a force field)
const DROPSHIP = FS(269241); // MickBoere, Dropship Idle Hum (CC0)

export const FIELD: Cand[] = [
  // ---------------------------------------------------------------- Shockwave
  {
    id: 'airHorn', name: 'airHornA', brief: BRIEF_WAVE,
    what: 'A, sonic pulse: a sharp crack, a deep driven sub pulse dropping away, then a ring of air sweeping up from low to high across the whole stereo field as the wave expands, a phasing low throb inside it and a crackle.',
    why: 'Synthesis: an N-wave crack, a driven sine drop (harmonics so it carries on small speakers), a band of noise whose centre climbs 250 Hz to 9 kHz as the ring grows, a throbbing hum through a phaser; a long-tube impulse response made in code.',
    layers: [
      syn('nwave', { seconds: 0.2, seed: 81, T: 0.02, rise: 0.0004, double: false, lp: 10000, hp: 200 }, -4),
      syn('subdrop', { seconds: 0.75, hz: [[0, 140], [0.35, 38]], drive: 2.5, env: [[0, 0], [0.003, 1], [0.2, 0.7], [0.7, 0]] }, 0),
      syn('whoosh', { seconds: 1.1, seed: 82, hz: [[0, 250], [0.5, 5000], [1.0, 9000]], q: [[0, 3], [1, 1.5]], env: [[0, 0], [0.01, 1], [0.3, 0.6], [1.0, 0]], air: 0.3 }, -3,
        [{ op: 'widen', amount: 0.6 }]),
      syn('hum', { seconds: 0.95, seed: 83, hz: 55, partials: 12, tilt: 1.0, voices: 3, detune: 12, pulse: [[[0, 14], [0.8, 4]], 0.6], env: [[0, 0], [0.01, 1], [0.9, 0]] }, -8,
        [{ op: 'phaser', rate: 2, lo: 200, hi: 2500, stages: 6, fb: 0.4, mix: 0.4 }]),
      syn('crackle', { seconds: 0.9, seed: 84, rate: 90, lo: 2000, hi: 9000, decay: 0.002, spread: 14, width: 0.9, env: [[0, 0], [0.05, 1], [0.85, 0]] }, -16),
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
    what: 'C, resonant ring: a huge struck energy ring, "WHAAANG", with a sub thump under it and the ring of air racing outward, phasing as it goes: more metallic and iconic.',
    why: 'Synthesis: a struck resonator with inharmonic plate modes on G3, a driven sub, the expanding noise ring; a plate impulse response made in code.',
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
    what: 'A, power-on: a real machine powering up, sped up so it climbs in half a second, a sub swelling as the field inflates around the kart, then it locks with a crisp electric snap and a low thunk, and a real generator hum settles in.',
    why: 'Recording-led: a machine start-up (Taylor_Pro_Sounds, CC0; the local ear: "a sci-fi device powering up"), a real zap (JoelAudio, CC0), a generator hum (Euphrosyyn, CC0); a synthesized sub and swell; nothing tonal or sparkly, which the ears hear as magic.',
    layers: [
      rec(FS(210333), 0, [trim(0.45, 1.45), pitch(12), fade(0.02, 0.05)]),
      syn('subdrop', { seconds: 0.45, hz: [[0, 40], [0.4, 90]], drive: 1.5, env: [[0, 0], [0.35, 1], [0.45, 0]] }, -8),
      syn('whoosh', { seconds: 0.45, seed: 92, hz: [[0, 400], [0.4, 2500]], q: 1.2, env: [[0, 0], [0.35, 1], [0.45, 0]] }, -12, [{ op: 'widen', amount: 0.6 }]),
      rec(ZAP, -8, [trim(0, 0.08), hp(1500), fade(0.001, 0.04)], 0.44),
      thump(-8, 110, 60, 0.08, 0.44),
      rec(GEN, -9, [trim(2.0, 2.6), hp(80), fade(0.02, 0.3)], 0.44),
    ],
    master: [hp(50), conv(PLATE, 0.12, { decay: 0.7 }), comp(-14, 2.5), ...cap(1.0, 0.35), OUT],
  },
  {
    id: 'shieldUp', name: 'shieldUpB', brief: BRIEF_UP,
    what: 'B, charge and throw the switch: a short rising charge whine, then a big real breaker switch "ka-chunk" as the field locks on, an electric arc and a dropship-style hum swelling around the kart.',
    why: 'A real large breaker switch (EchoCinematics, CC0) and a real sci-fi hum (MickBoere\'s Dropship Idle Hum, CC0; the local ear: "a force field humming"); the charge whine and arc synthesized.',
    layers: [
      syn('zap', { seconds: 0.3, seed: 93, hz: [[0, 800], [0.28, 4000]], index: 0.4, ratio: 2, env: [[0, 0], [0.25, 1], [0.3, 0]] }, -12),
      rec(FS(131599), -2, [trim(0.25, 0.8), fade(0.001, 0.25)], 0.26),
      rec(DROPSHIP, -6, [trim(0.5, 1.4), hp(60), fade(0.05, 0.3)], 0.28),
      syn('arc', { seconds: 0.4, seed: 94, buzz: 120, hum: 0.2, sparks: 0.6, intensity: [[0, 1], [0.38, 0]] }, -12, [], 0.28),
    ],
    master: [hp(50), verb(0.6, 0.12), comp(-14, 2.5), ...cap(1.0, 0.35), OUT],
  },
  {
    id: 'shieldUp', name: 'shieldUpC', brief: BRIEF_UP,
    what: 'C, blast-door field: a real machine powering up and climbing, then a heavy breaker "ka-chunk" as the field locks like a blast door, and a deep dropship hum settles around the kart.',
    why: 'Real recordings: a machine start-up (Taylor_Pro_Sounds, CC0) pitched up 9 semitones, a large breaker switch (EchoCinematics, CC0), a sci-fi hum (MickBoere\'s Dropship Idle Hum, CC0).',
    layers: [
      rec(FS(210333), 0, [trim(0.45, 1.95), pitch(9), fade(0.02, 0.05)]),
      rec(FS(131599), -3, [trim(0.25, 0.8), fade(0.001, 0.25)], 0.85),
      rec(DROPSHIP, -8, [trim(0.5, 1.2), hp(60), fade(0.03, 0.3)], 0.85),
    ],
    master: [hp(50), comp(-14, 2.5), ...cap(1.3, 0.35), OUT],
  },
  // ---------------------------------------------------------------- Energy Shield: the hum while it is up (new loop id: shieldHum)
  {
    id: 'shieldHum', name: 'shieldHumA', brief: BRIEF_HUM, loop: 3.0, xfade: 0.1,
    what: 'A, generator field: a real sci-fi generator\'s hum, evened out, with a quiet low hum of detuned voices under it and a slow phaser drifting once a loop.',
    why: 'A real generator loop (Euphrosyyn, CC0) as the identity; an additive hum tuned to whole cycles of the 3 s loop so the wrap is seamless; no throb (a pulsing hum reads as an alarm to the local ears).',
    layers: [
      rec(GEN, 0, [trim(2.0, 5.3), hp(50), EVEN]),
      syn('hum', { seconds: 3.3, seed: 101, hz: 110, period: 3.0, partials: 10, tilt: 1.4, voices: 3, detune: 0.667 }, -12),
    ],
    master: [hp(50), { op: 'phaser', rate: 0.3333, lo: 300, hi: 1800, stages: 4, fb: 0.2, mix: 0.2 }, lp(7000), OUT],
  },
  {
    id: 'shieldHum', name: 'shieldHumB', brief: BRIEF_HUM, loop: 3.0, xfade: 0.1,
    what: 'B, dropship field: a real dropship\'s idle hum, deep and steady, with a real 60 Hz mains hum inside it for the electric edge.',
    why: 'Real recordings only (MickBoere\'s Dropship Idle Hum and chungus43A\'s 60 Hz mains hum, CC0), evened so the loop never swells.',
    layers: [
      rec(DROPSHIP, 0, [trim(0.3, 3.6), hp(40), EVEN]),
      rec(FS(733737), -12, [trim(1.0, 4.3), hp(50)]),
    ],
    master: [hp(40), lp(8000), OUT],
  },
  {
    id: 'shieldHum', name: 'shieldHumC', brief: BRIEF_HUM, loop: 3.0, xfade: 0.1,
    what: 'C, glass hum: a clean, glassy chord of near-sine tones (A3, E4, A4) that beat slowly against each other, with a soft breath of air, like a crystal field.',
    why: 'Additive synthesis (nearly pure partials, so it never reads as a voice or an organ), tuned to the loop, a slow chorus.',
    layers: [
      syn('hum', { seconds: 3.2, seed: 105, hz: 220, period: 3.0, partials: 3, tilt: 2.2, voices: 2, detune: 0.3333 }, -2),
      syn('hum', { seconds: 3.2, seed: 106, hz: 329.6, period: 3.0, partials: 2, tilt: 2.5, voices: 2, detune: 0.6667 }, -6),
      syn('hum', { seconds: 3.2, seed: 107, hz: 440, period: 3.0, partials: 2, tilt: 2.5, voices: 2, detune: 1.0 }, -9),
      syn('noise', { seconds: 3.2, seed: 108, color: 'pink' }, -26, [{ op: 'bp', hz: 3000, q: 0.7 }]),
    ],
    master: [hp(80), { op: 'chorus', voices: 2, depth: 2, rate: 0.3333, base: 9, mix: 0.25, lock: true }, OUT],
  },
  // ---------------------------------------------------------------- Energy Shield: absorbs a hit
  {
    id: 'shieldPop', name: 'shieldPopA', brief: BRIEF_POP,
    what: 'A, deflect: a bright metallic "ZANG" as the field takes the hit, an electric crackle, a flick of air as the shot glances off and a small low punch.',
    why: 'A synthesized struck resonator (settling a little in pitch) over a real zap (JoelAudio, CC0) and a real quick whoosh (florianreichel, CC0), in a metal impulse response made in code.',
    layers: [
      syn('ring', { seconds: 0.7, seed: 111, hz: [[0, 1400], [0.4, 1150]], modes: [[1, 1, 0.35], [2.32, 0.6, 0.2], [4.25, 0.4, 0.12], [6.8, 0.25, 0.07]], strike: 0.002, hardness: 9000 }, 0),
      rec(ZAP, -7, [trim(0, 0.2), hp(1000), fade(0.001, 0.08)]),
      rec(FS(683101), -11, [hp(600), fade(0.002, 0.08)], 0.01),
      thump(-8, 120, 50, 0.12),
    ],
    master: [hp(60), conv(METAL, 0.18, { decay: 0.45 }), comp(-12, 3, 0.002, 0.12), ...cap(0.85, 0.3), OUT],
  },
  {
    id: 'shieldPop', name: 'shieldPopB', brief: BRIEF_POP,
    what: 'B, shatter: the field breaks like a pane of crystal (a real glass break, brightened), a real electric zap through it, a crackle of shards and a low thump.',
    why: 'A real glass break (VSCO-2 CE, CC0) pitched up, a real zap (JoelAudio, CC0); synthesized crackle and thump.',
    layers: [
      rec(VS('Miscellania Raw/Misc 1/glass_break.wav'), -2, [pitch(3), hp(1500), trim(0, 0.8), fade(0.001, 0.3)]),
      rec(ZAP, -5, [trim(0, 0.25), hp(600), fade(0.001, 0.1)]),
      syn('crackle', { seconds: 0.5, seed: 113, rate: 200, lo: 2500, hi: 10000, decay: 0.0015, spread: 14, width: 0.9, env: [[0, 1], [0.45, 0]] }, -11),
      thump(-7, 120, 45, 0.12),
    ],
    master: [hp(60), verb(0.6, 0.12), comp(-12, 3, 0.002, 0.12), ...cap(0.85, 0.3), OUT],
  },
  {
    id: 'shieldPop', name: 'shieldPopC', brief: BRIEF_POP,
    what: 'C, overload: the field overloads and dumps its charge: a real high-voltage discharge snapping, a ring-modulated crack and a deep punch.',
    why: 'A real high-voltage discharge (follytowers, CC0) from its first snap; a synthesized ring-modulated crack and driven sub; a metal impulse response made in code.',
    layers: [
      rec(FS(415960), 0, [trim(0.15, 0.75), hp(200), fade(0.001, 0.3)]),
      rec(ZAP, -4, [trim(0, 0.12), hp(800), fade(0.001, 0.05)]),
      syn('noise', { seconds: 0.12, seed: 116, color: 'white', env: [[0, 0], [0.001, 1], [0.11, 0]] }, -8, [{ op: 'bp', hz: 3500, q: 0.7 }, { op: 'ringmod', hz: 1100, mix: 0.6 }]),
      syn('subdrop', { seconds: 0.4, hz: [[0, 140], [0.35, 45]], drive: 2.5, env: [[0, 0], [0.002, 1], [0.38, 0]] }, -4),
    ],
    master: [hp(40), conv(METAL, 0.1, { decay: 0.4 }), sat(1.4, 0.2), comp(-12, 3, 0.002, 0.12), ...cap(0.85, 0.3), OUT],
  },
  // ---------------------------------------------------------------- Energy Shield: runs out
  {
    id: 'shieldEnd', name: 'shieldEndA', brief: BRIEF_END,
    what: 'A, power-down: a real machine winding down, sped up and flickering as the field fails, with a last crackle.',
    why: 'A real power-down (stewdio2003, CC0; the local ear: "a sci-fi device powering down") pitched up 9 semitones and chopped by a gate that grows; a synthesized arc.',
    layers: [
      rec(FS(238367), 0, [trim(0.28, 1.9), pitch(9), fade(0.005, 0.25), { op: 'stutter', rate: 18, duty: 0.6, jitter: 0.3, smooth: 2, seed: 5, pts: [[0, 0], [0.3, 0.4], [0.8, 1]] }]),
      syn('arc', { seconds: 0.5, seed: 121, buzz: 100, hum: 0.1, sparks: 0.5, intensity: [[0, 0.6], [0.45, 0]] }, -12),
    ],
    master: [hp(60), verb(0.4, 0.1), ...cap(0.8, 0.3), OUT],
  },
  {
    id: 'shieldEnd', name: 'shieldEndB', brief: BRIEF_END,
    what: 'B, switched off: a real machine winding down, slower and deeper than A, and a small breaker click as the field\'s power is cut.',
    why: 'A real power-down (stewdio2003, CC0) pitched up 5 semitones, a large breaker switch (EchoCinematics, CC0) pitched up and quiet. The local ear: "a sci-fi force field powering down", 0.77.',
    layers: [
      rec(FS(238367), 0, [trim(0.28, 2.3), pitch(5), fade(0.005, 0.3)]),
      rec(FS(131599), -8, [trim(0.25, 0.6), pitch(3), fade(0.001, 0.15)], 0.55),
    ],
    master: [hp(60), verb(0.4, 0.1), ...cap(0.85, 0.3), OUT],
  },
  {
    id: 'shieldEnd', name: 'shieldEndC', brief: BRIEF_END,
    what: 'C, fade-out: a real sci-fi device\'s power-up played backwards, so its tones fall away smoothly as the field dies, with a little room.',
    why: 'A real power-up (gulfstreamav, CC0) reversed and pitched up 5 semitones.',
    layers: [
      rec(FS(843330), 0, [trim(0.0, 1.5), { op: 'reverse' }, pitch(5), fade(0.01, 0.3)]),
    ],
    master: [hp(60), verb(0.4, 0.1), ...cap(0.8, 0.3), OUT],
  },
];
