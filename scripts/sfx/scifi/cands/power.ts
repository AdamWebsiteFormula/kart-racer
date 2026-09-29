// Nitro and Triple Nitro (were Fizz Pop and Triple Fizz), and the EMP Blast (was Fog Bank).
import type { Cand } from '../parts.ts';
import { cap, comp, conv, EL, fade, FS, GAME, hp, lp, OUT, pitch, rec, sat, syn, thump, trim, TUNNEL, verb } from '../parts.ts';

const BRIEF_NITRO = `The player fires Nitro in ${GAME}: a canister cracks open with a sharp hiss and a roaring blue flame blasts the kart forward. Punchy, hot and thrilling, about a second. No voice, nothing like a gunshot.`;
const BRIEF_EMP = `The EMP Blast in ${GAME}: a deep electric pulse rolls over the karts ahead, crackling as their power stutters out. Big and a bit ominous, but fun; about one and a half seconds. No voice.`;

const FLAME = FS(244926); // hnhnh, fire-whoosh (CC0): the local ear hears "a flame whoosh igniting"
const PURGE = FS(642961); // tranzfusion, Fire Extinguisher (CC0): "a gas burst hissing"

export const POWER: Cand[] = [
  // ---------------------------------------------------------------- Nitro
  {
    id: 'fizz', name: 'fizzA', brief: BRIEF_NITRO,
    what: 'A, purge and blue flame: the canister purges with a hard hiss of pressurized gas, a real flame whooshes alight and the game\'s own boost flame roars under it.',
    why: 'Recording-led: a fire extinguisher burst (tranzfusion, CC0) as the purge, a fire whoosh (hnhnh, CC0) as the flame, the steam-vent blast the boosts use pitched down (the game\'s own take, so Nitro belongs to the boost family); a quiet synthesized flame for body.',
    layers: [
      rec(PURGE, -3, [trim(0.03, 0.5), hp(600), fade(0.002, 0.2)]),
      rec(FLAME, 0, [trim(0.08, 1.2), fade(0.005, 0.4)], 0.02),
      rec(EL('steamVent'), -7, [pitch(-5), lp(6000), { op: 'env', pts: [[0, 1], [0.08, 0.8], [0.35, 0.3], [0.8, 0]] }, trim(0, 0.9)], 0.03),
      syn('thrust', { seconds: 1.0, seed: 131, hz: [[0, 1500], [0.05, 6000], [0.6, 2500], [1.0, 1200]], throat: [700, 2, 0.3], throb: [26, 0.2], crackle: 0.1, hiss: 0.4,
        env: [[0, 0], [0.03, 1], [0.5, 0.6], [1.0, 0]] }, -11, [], 0.03),
    ],
    master: [hp(40), sat(1.4, 0.2), comp(-14, 3, 0.003, 0.12), ...cap(1.2, 0.45), OUT],
  },
  {
    id: 'fizz', name: 'fizzB', brief: BRIEF_NITRO,
    what: 'B, jet kick: a quick purge, then a real futuristic launch blast as the flame lights, and a whoosh of air past.',
    why: 'Recording-led: the purge (tranzfusion, CC0), a futuristic launch (C3Sabertooth, CC0; the local ear: "a flame whoosh igniting"), a big swoosh (Electroviolence, CC0).',
    layers: [
      rec(PURGE, -8, [trim(0.03, 0.3), hp(1000), fade(0.002, 0.1)]),
      rec(FS(480870), 0, [trim(0.38, 1.5), hp(60), fade(0.004, 0.5)], 0.01),
      rec(FS(234547), -10, [trim(0.2, 0.7), hp(300), fade(0.003, 0.25)], 0.02),
    ],
    master: [hp(40), sat(1.4, 0.2), comp(-14, 3, 0.003, 0.12), ...cap(1.2, 0.45), OUT],
  },
  {
    id: 'fizz', name: 'fizzC', brief: BRIEF_NITRO,
    what: 'C, hyper nitro: a mechanical "tschk" as the canister seats, a quick rush of air sucked in, then a bright flame jet with a crackle of sparks and a whoosh.',
    why: 'A real servo tick (JoontheFloof, CC0), a real flamethrower burst (1bob, CC0) and fire whoosh (LookIMadeAThing, CC0), a synthesized noise rush and sparks.',
    layers: [
      rec(FS(740239), -6, [trim(0.05, 0.2), hp(600), fade(0.001, 0.05)]),
      syn('noise', { seconds: 0.07, seed: 132, color: 'pink', env: [[0, 0], [0.05, 1], [0.065, 0]] }, -9, [{ op: 'sweep', mode: 'bp', hz: [[0, 800], [0.065, 5000]], q: 1.2 }]),
      rec(FS(831929), -1, [trim(0.03, 0.9), fade(0.003, 0.3)], 0.05),
      rec(FS(260555), -5, [trim(0.02, 1.0), fade(0.01, 0.4)], 0.06),
      syn('crackle', { seconds: 0.8, seed: 133, rate: 90, lo: 2000, hi: 9000, decay: 0.002, spread: 16, width: 0.9, env: [[0, 0], [0.1, 1], [0.7, 0]] }, -15, [], 0.06),
      thump(-8, 110, 45, 0.15, 0.05),
    ],
    master: [hp(40), sat(1.5, 0.25), comp(-14, 3, 0.003, 0.12), ...cap(1.15, 0.45), OUT],
  },
  // ---------------------------------------------------------------- EMP Blast
  {
    id: 'fog', name: 'fogA', brief: BRIEF_EMP,
    what: 'A, EMP pulse: a deep driven pulse, a real electric arc crackling through it, a real high-voltage buzz swelling, then a real machine powering down, sped up and stuttering as the karts ahead lose power.',
    why: 'Real electricity (Wakerone\'s electric arc, Johnnie_Holiday\'s high voltage, CC0) and a real power-down (stewdio2003, CC0) over a synthesized driven sub; a long-tube impulse response made in code.',
    layers: [
      syn('subdrop', { seconds: 0.9, hz: [[0, 150], [0.5, 40]], drive: 2.5, env: [[0, 0], [0.004, 1], [0.3, 0.6], [0.85, 0]] }, -1),
      rec(FS(393822), -3, [trim(0.12, 1.7), hp(150), fade(0.004, 0.5)]),
      rec(FS(612159), -8, [trim(5.2, 6.6), hp(100), fade(0.01, 0.4)], 0.05),
      rec(FS(238367), -8, [trim(0.28, 2.3), pitch(7), fade(0.01, 0.4), { op: 'stutter', rate: 24, duty: 0.6, jitter: 0.3, smooth: 2, seed: 7, pts: [[0, 0], [0.5, 0.3], [1.3, 1]] }], 0.35),
    ],
    master: [hp(35), conv(TUNNEL, 0.12, { decay: 1.0 }), sat(1.3, 0.2), comp(-12, 3, 0.003, 0.15), ...cap(1.8, 0.6), OUT],
  },
  {
    id: 'fog', name: 'fogB', brief: BRIEF_EMP,
    what: 'B, thunder-zap: a real close thunder crack for the pulse, a real Tesla coil buzzing through it and a sharp real electric zap on top.',
    why: 'Recording-led: a close thunder strike (loganzsound, CC0), a big Tesla coil (follytowers, CC0), an electric zap (JoelAudio, CC0).',
    layers: [
      rec(FS(840628), -1, [trim(0.55, 2.3), hp(150), fade(0.002, 0.7)]),
      rec(FS(362975), -5, [trim(1.0, 2.5), hp(200), fade(0.05, 0.5)], 0.02),
      rec(FS(136542), -4, [trim(0, 0.5), hp(400), fade(0.001, 0.2)]),
      syn('subdrop', { seconds: 0.6, hz: [[0, 120], [0.5, 40]], drive: 2, env: [[0, 0], [0.005, 1], [0.55, 0]] }, -6),
    ],
    master: [hp(35), sat(1.3, 0.2), comp(-12, 3, 0.003, 0.15), ...cap(1.8, 0.6), OUT],
  },
  {
    id: 'fog', name: 'fogC', brief: BRIEF_EMP,
    what: 'C, blackout: a giant breaker switch slams as the power is cut, the high voltage stutters out and everything winds down under a deep thump.',
    why: 'Real recordings: a large breaker switch (EchoCinematics, CC0), a high-voltage discharge (follytowers, CC0) chopped by a gate, a device powering down (peepholecircus, CC0); a synthesized sub.',
    layers: [
      rec(FS(131599), 0, [trim(0.22, 1.2), fade(0.001, 0.4)]),
      rec(FS(415960), -6, [trim(0.1, 1.4), hp(200), { op: 'stutter', rate: 25, duty: 0.5, jitter: 0.5, smooth: 1.5, seed: 9, pts: [[0, 0.3], [1.2, 1]] }, fade(0.005, 0.5)], 0.03),
      rec(FS(169994), -8, [trim(0.12, 1.5), pitch(3), fade(0.01, 0.3)], 0.15),
      syn('subdrop', { seconds: 0.5, hz: [[0, 130], [0.4, 40]], drive: 2.5, env: [[0, 0], [0.004, 1], [0.48, 0]] }, -4, [], 0.03),
    ],
    master: [hp(35), verb(0.8, 0.12), sat(1.3, 0.2), comp(-12, 3, 0.003, 0.15), ...cap(1.6, 0.5), OUT],
  },
];
