// Jet Mode (was Strike Ball): the spool-up and ignition, the afterburner loop while it flies (a new loop id), and the
// sonic-boom burst at the end. Jump Jets (was Pogo Spring): the thruster kick up, and the dive and slam.
import type { Cand } from '../parts.ts';
import { bp, cap, comp, conv, fade, FS, hp, KI, lp, OUT, pitch, PLATE, rec, sat, snap, syn, thump, trim, TUNNEL, verb, VS } from '../parts.ts';

const BRIEF_SPOOL = 'Jet Mode starts in a polished, cinematic cartoon sci-fi kart racer: the kart\'s jet engine whines as it spools up fast, then lights with a big afterburner whoomph as it takes off down the road. Thrilling, about a second and a half. No voice.';
const BRIEF_LOOP = 'Jet Mode in flight in a polished cartoon sci-fi kart racer: the kart\'s afterburner roaring with a turbine whine over it, a seamless loop for the five seconds it flies. Powerful but not harsh. No voice.';
const BRIEF_BOOM = 'Jet Mode ends in a sonic-boom burst in a polished cartoon sci-fi kart racer: a huge double crack "ba-BOOM" that knocks the karts around it spinning, with a shower of sparkle. A big thrilling payoff, fun not violent, under two seconds. No voice, nothing like a bomb.';
const BRIEF_UP = 'Jump Jets fire in a polished cartoon sci-fi kart racer: a punchy burst of thrusters launches the kart four metres up into the air. Springy and exciting, under a second. No voice, nothing like a gunshot.';
const BRIEF_SLAM = 'Jump Jets dive and slam the kart back onto the road in a polished cartoon sci-fi kart racer, bumping the karts nearby: a huge, heavy impact with a shockwave ring and a hiss of thrusters, landing the instant it plays. Big and fun, about a second. No voice.';

export const JET: Cand[] = [
  // ---------------------------------------------------------------- Jet Mode: spool and ignite
  {
    id: 'strikeRoll', name: 'strikeRollA', brief: BRIEF_SPOOL,
    what: 'A, turbine spool: a real jet engine\'s start-up whine compressed from eleven seconds into one (granular, so its pitch stays true) as the turbine races up, a synthesized turbine singing with it, air rushing into the intake, then a real afterburner lighting with a deep thump.',
    why: 'A real jet start-up (SamsterBirdies, CC0) time-compressed by granular resynthesis, a real close afterburner (JSK_Production, CC0) for the ignition; synthesis for the blade-pass whine and intake air.',
    layers: [
      rec(FS(491407), -3, [{ op: 'grain', seconds: 1.15, size: 0.08, density: 90, pos: [[0, 6.0], [1.15, 16.8]], st: 3, jitterSt: 0.1, scatter: 0.01, width: 0.3, seed: 3 },
        hp(150), { op: 'env', pts: [[0, 0], [0.1, 0.6], [1.0, 1], [1.15, 0.5]] }]),
      syn('turbine', { seconds: 1.8, seed: 151, spool: [[0, 0.05], [1.05, 0.9], [1.25, 1.0], [1.8, 1.0]], rpsLo: 25, rpsHi: 170, whine: 0.7, fan: 0.35, roar: 0.35,
        env: [[0, 0], [0.1, 0.7], [1.0, 1], [1.8, 0]] }, -6),
      syn('whoosh', { seconds: 1.1, seed: 152, hz: [[0, 300], [1.05, 4000]], q: 1.4, env: [[0, 0], [0.9, 1], [1.08, 0]], air: 0.3 }, -11),
      rec(FS(829068), 0, [trim(1.15, 2.6), hp(60), fade(0.004, 0.5)], 1.05),
      thump(-4, 90, 35, 0.3, 1.08),
    ],
    master: [hp(35), sat(1.4, 0.25), comp(-14, 3, 0.003, 0.15), ...cap(1.9, 0.5), OUT],
  },
  {
    id: 'strikeRoll', name: 'strikeRollB', brief: BRIEF_SPOOL,
    what: 'B, synth spool: a synthesized turbine racing up (fan and compressor whine climbing together), a rising rush of intake air, then a real rocket-launch transient as it lights and a roaring flame.',
    why: 'Synthesis for the spool (blade-pass partials that follow the shaft speed, with jitter), a real futuristic launch (C3Sabertooth, CC0) for the ignition, a synthesized roar.',
    layers: [
      syn('turbine', { seconds: 1.0, seed: 153, spool: [[0, 0.02], [0.95, 1.0]], rpsLo: 20, rpsHi: 190, whine: 0.8, fan: 0.4, roar: 0.25, env: [[0, 0], [0.05, 0.6], [0.9, 1], [1.0, 0.3]] }, -2),
      syn('whoosh', { seconds: 1.0, seed: 154, hz: [[0, 250], [0.95, 5000]], q: 1.4, env: [[0, 0], [0.85, 1], [0.98, 0]], air: 0.3 }, -9),
      rec(FS(480870), 0, [trim(0.38, 1.7), hp(60), fade(0.003, 0.5)], 0.93),
      syn('thrust', { seconds: 0.9, seed: 155, hz: [[0, 6000], [0.8, 2000]], throb: [28, 0.15], turb: 0.35, crackle: 0.15, hiss: 0.3, env: [[0, 0], [0.02, 1], [0.85, 0]] }, -7, [], 0.96),
    ],
    master: [hp(35), sat(1.4, 0.25), comp(-14, 3, 0.003, 0.15), ...cap(1.9, 0.5), OUT],
  },
  {
    id: 'strikeRoll', name: 'strikeRollC', brief: BRIEF_SPOOL,
    what: 'C, transform and ignite: a mechanical "ka-chunk" and servo whirr as the kart folds into jet mode, a real power-up surge, then a real jet\'s thundering onset as it lights.',
    why: 'Real mechanics (Mish7913\'s clank, JoontheFloof\'s servo, CC0), a real power-up (michael_grinne, CC0) and a real jet fly-past onset (laribum, CC0).',
    layers: [
      rec(FS(741351), -3, [trim(0.2, 0.55), hp(200), fade(0.001, 0.12)]),
      rec(FS(740242), -8, [trim(0.2, 0.6), hp(300), fade(0.002, 0.1)], 0.05),
      rec(FS(512474), -4, [trim(0.12, 0.9), fade(0.01, 0.2)], 0.12),
      rec(FS(215447), 0, [trim(2.5, 3.9), hp(50), fade(0.004, 0.5)], 0.72),
      thump(-5, 90, 35, 0.25, 0.75),
    ],
    master: [hp(35), sat(1.3, 0.2), comp(-14, 3, 0.003, 0.15), ...cap(1.9, 0.5), OUT],
  },
  // ---------------------------------------------------------------- Jet Mode: in flight (new loop id: jetLoop)
  {
    id: 'jetLoop', name: 'jetLoopA', brief: BRIEF_LOOP, loop: 3.0, xfade: 0.12,
    what: 'A, afterburner: a real afterburner\'s steady roar with a synthesized turbine whine riding over it.',
    why: 'A real afterburner (StoneyJ, CC0) for the roar; the whine synthesized so its pitch is steady.',
    layers: [
      rec(FS(104883), 0, [trim(12.0, 15.3), hp(40)]),
      syn('turbine', { seconds: 3.3, seed: 156, spool: 1.0, rpsLo: 150, rpsHi: 150, whine: 0.6, fan: 0.3, roar: 0 }, -12),
    ],
    master: [hp(35), lp(12000), OUT],
  },
  {
    id: 'jetLoop', name: 'jetLoopB', brief: BRIEF_LOOP, loop: 3.0, xfade: 0.12,
    what: 'B, fighter jet: a real fighter jet engine running (its own whine and rumble) with a synthesized flame roar under it for body.',
    why: 'A real F-16 engine (ikbenraar, CC0), a synthesized thruster roar with a low throb.',
    layers: [
      rec(FS(322178), 0, [trim(30.0, 33.3), hp(40)]),
      syn('thrust', { seconds: 3.3, seed: 157, hz: 3000, throb: [30, 0.12], turb: 0.3, crackle: 0.1, hiss: 0.2 }, -8),
    ],
    master: [hp(35), lp(12000), OUT],
  },
  {
    id: 'jetLoop', name: 'jetLoopC', brief: BRIEF_LOOP, loop: 3.0, xfade: 0.12,
    what: 'C, hover jet: more sci-fi: a real jetpack\'s roar, a dropship\'s low hum and a bright synthesized turbine whine.',
    why: 'A real jetpack (velcronator, CC0) and a sci-fi dropship idle hum (MickBoere, CC0); the turbine synthesized.',
    layers: [
      rec(FS(733987), 0, [trim(1.0, 4.3), hp(40)]),
      rec(FS(269241), -8, [trim(0.5, 3.8), lp(600)]),
      syn('turbine', { seconds: 3.3, seed: 158, spool: 1.0, rpsLo: 180, rpsHi: 180, whine: 0.6, fan: 0.3, roar: 0 }, -10),
    ],
    master: [hp(35), lp(12000), OUT],
  },
  // ---------------------------------------------------------------- Jet Mode: the sonic boom
  {
    id: 'strike', name: 'strikeA', brief: BRIEF_BOOM,
    what: 'A, real sonic boom: a recorded sonic boom\'s double crack ("ba-BOOM") and its rolling thunder, a deep kick, a shower of sparkles and a whoosh as the air settles.',
    why: 'A real sonic boom (qubodup, CC0) cut to its double crack; synthesized sparkle and kick; a long-tube impulse response made in code.',
    layers: [
      rec(FS(182050), 0, [trim(0.64, 2.8), hp(35), fade(0.002, 0.8)]),
      thump(-4, 80, 30, 0.4),
      syn('glitter', { seconds: 1.4, seed: 161, density: [[0, 120], [1.2, 0]], lo: 2500, hi: 9000, decay: 0.12, ratio: 1.41, index: 0.8 }, -13, [], 0.05),
      rec(FS(234547), -12, [trim(0.2, 0.8), hp(300), fade(0.02, 0.3)], 0.3),
    ],
    master: [hp(30), conv(TUNNEL, 0.1, { decay: 1.2 }), sat(1.4, 0.2), comp(-12, 3, 0.003, 0.15), ...cap(2.0, 0.7), OUT],
  },
  {
    id: 'strike', name: 'strikeB', brief: BRIEF_BOOM,
    what: 'B, designed boom: a synthesized N-wave double crack (the physics of a sonic boom: two sharp shock fronts), a real cinematic "sonic boom" for size, a crackle of confetti sparks and a driven sub.',
    why: 'Synthesis for the shock fronts (an N-wave with sub-millisecond rise, its tail shock 140 ms later), a real designed boom (modusmogulus, CC0), synthesized crackle.',
    layers: [
      syn('nwave', { seconds: 1.8, seed: 162, T: 0.09, rise: 0.0003, gap: 0.14, rumble: 0.5, tail: 0.9, lp: 11000, hp: 30 }, 0),
      rec(FS(785927), -3, [trim(0, 2.0), hp(40), fade(0.002, 0.8)]),
      syn('crackle', { seconds: 1.4, seed: 163, rate: 300, lo: 1500, hi: 9000, decay: 0.002, spread: 20, width: 0.9, env: [[0, 0], [0.1, 1], [1.3, 0]] }, -11, [], 0.1),
      syn('subdrop', { seconds: 0.8, hz: [[0, 90], [0.6, 30]], drive: 2.5, env: [[0, 0], [0.003, 1], [0.75, 0]] }, -4),
    ],
    master: [hp(30), verb(1.2, 0.15), sat(1.5, 0.25), comp(-12, 3, 0.003, 0.15), ...cap(2.0, 0.7), OUT],
  },
  {
    id: 'strike', name: 'strikeC', brief: BRIEF_BOOM,
    what: 'C, boom and power-down: a real rocket\'s sonic boom, an energy ring racing outward and, as the jet shuts down, a real turbine winding down under a shower of sparkle.',
    why: 'A real sonic boom from a Falcon 9 landing (g0ggs, CC0), a real machine power-down (stewdio2003, CC0); the ring and sparkle synthesized.',
    layers: [
      rec(FS(668561), 0, [trim(1.85, 4.2), hp(35), fade(0.002, 0.9)]),
      syn('whoosh', { seconds: 1.0, seed: 164, hz: [[0, 300], [0.5, 6000], [1.0, 9000]], q: 2, env: [[0, 0], [0.01, 1], [0.4, 0.5], [1.0, 0]], air: 0.3 }, -8, [{ op: 'widen', amount: 0.6 }]),
      rec(FS(238367), -10, [trim(0.3, 2.3), pitch(4), fade(0.02, 0.6)], 0.2),
      syn('glitter', { seconds: 1.4, seed: 165, density: [[0, 100], [1.3, 0]], lo: 2500, hi: 9000, decay: 0.12, ratio: 1.41, index: 0.8 }, -13, [], 0.05),
      thump(-5, 85, 32, 0.35),
    ],
    master: [hp(30), sat(1.3, 0.2), comp(-12, 3, 0.003, 0.15), ...cap(2.0, 0.7), OUT],
  },
  // ---------------------------------------------------------------- Jump Jets: up
  {
    id: 'boing', name: 'boingA', brief: BRIEF_UP,
    what: 'A, thruster kick: a sharp pneumatic hiss, a real futuristic launch blast, a quick whoosh upward and a low kick.',
    why: 'Recording-led: a pressure hiss (magnuswaker, CC0), a futuristic launch (C3Sabertooth, CC0), a quick whoosh (florianreichel, CC0).',
    layers: [
      rec(FS(581083), -6, [trim(0.03, 0.35), hp(1200), fade(0.002, 0.15)]),
      rec(FS(480870), 0, [trim(0.38, 1.15), hp(80), fade(0.003, 0.35)]),
      rec(FS(683101), -8, [pitch(3), hp(700), fade(0.003, 0.08)], 0.04),
      thump(-7, 130, 60, 0.1),
    ],
    master: [hp(50), sat(1.3, 0.2), comp(-14, 2.5, 0.003, 0.12), ...cap(0.8, 0.3), OUT],
  },
  {
    id: 'boing', name: 'boingB', brief: BRIEF_UP,
    what: 'B, jet hop: a real jetpack burst with its whistle turned to rise as the kart lifts, a short puff of thrust and a flick of air.',
    why: 'A real jetpack (velcronator, CC0) with a rising pitch bend, a real jump-jet whistle (insanity54, CC0) played backwards so it climbs, a quick whoosh.',
    layers: [
      rec(FS(733987), -1, [trim(0.2, 0.9), { op: 'bend', st: [[0, 0], [0.6, 5]] }, { op: 'env', pts: [[0, 0], [0.01, 1], [0.25, 0.7], [0.6, 0]] }]),
      rec(FS(763148), -7, [trim(0.3, 0.9), { op: 'reverse' }, hp(1500), fade(0.01, 0.05)]),
      rec(FS(683101), -9, [pitch(4), hp(700), fade(0.003, 0.08)], 0.02),
      thump(-8, 130, 60, 0.1),
    ],
    master: [hp(50), comp(-14, 2.5, 0.003, 0.12), ...cap(0.8, 0.3), OUT],
  },
  {
    id: 'boing', name: 'boingC', brief: BRIEF_UP,
    what: 'C, rocket hop: a real rocket thruster\'s burst with a synthesized flame flaring open, a deep "fwoomp" and air rushing up.',
    why: 'A real rocket thrust (Maxx222, CC0) with a synthesized flare (a filter opening on turbulent noise) and a band of air rising.',
    layers: [
      rec(FS(446764), -2, [trim(1.0, 1.7), hp(60), { op: 'env', pts: [[0, 0], [0.008, 1], [0.3, 0.6], [0.65, 0]] }]),
      syn('thrust', { seconds: 0.6, seed: 171, hz: [[0, 500], [0.03, 6500], [0.5, 1500]], throb: [35, 0.25], turb: 0.4, crackle: 0.2, hiss: 0.3, env: [[0, 0], [0.005, 1], [0.2, 0.5], [0.58, 0]] }, -3),
      syn('whoosh', { seconds: 0.5, seed: 172, hz: [[0, 600], [0.45, 3500]], q: 1.3, env: [[0, 0], [0.05, 1], [0.48, 0]], air: 0.2 }, -10),
      thump(-6, 120, 55, 0.12),
    ],
    master: [hp(50), sat(1.4, 0.25), comp(-14, 2.5, 0.003, 0.12), ...cap(0.8, 0.3), OUT],
  },
  // ---------------------------------------------------------------- Jump Jets: the slam
  {
    id: 'slam', name: 'slamA', brief: BRIEF_SLAM,
    what: 'A, slam and ring: the instant impact (a real cinematic boom, a heavy metal clank pitched down, a sharp crack and a driven sub), a shockwave ring sweeping out and the thrusters hissing off.',
    why: 'Real weight (rhapsodize\'s boom, Mish7913\'s clank, CC0) saturated for mid-range body (a sub alone reads as a dull bump); synthesized crack, ring and hiss.',
    layers: [
      rec(FS(255111), -2, [trim(0, 1.0), lp(2500), sat(2.2, 0.6), fade(0.001, 0.4)]),
      rec(FS(741351), -4, [trim(0.2, 0.9), pitch(-5), hp(100), fade(0.001, 0.3)]),
      syn('nwave', { seconds: 0.2, seed: 181, T: 0.012, rise: 0.0003, double: false, lp: 11000, hp: 250 }, -5),
      syn('subdrop', { seconds: 0.6, hz: [[0, 100], [0.5, 30]], drive: 2.5, env: [[0, 0], [0.002, 1], [0.55, 0]] }, -2),
      syn('whoosh', { seconds: 0.9, seed: 182, hz: [[0, 300], [0.5, 5000], [0.9, 8000]], q: 2, env: [[0, 0], [0.01, 1], [0.4, 0.4], [0.88, 0]], air: 0.3 }, -9, [{ op: 'widen', amount: 0.6 }]),
      syn('thrust', { seconds: 0.8, seed: 183, hz: [[0, 4000], [0.8, 800]], hiss: 0.4, turb: 0.3, env: [[0, 0], [0.05, 0.6], [0.78, 0]] }, -13, [], 0.05),
    ],
    master: [hp(30), sat(1.6, 0.3), comp(-12, 3, 0.002, 0.15), ...cap(1.2, 0.45), OUT],
  },
  {
    id: 'slam', name: 'slamB', brief: BRIEF_SLAM,
    what: 'B, discharge slam: a real sci-fi impact with a force-field knock, an electric discharge crackling out in a ring and a low punch.',
    why: 'Real sci-fi impacts (Kierham\'s Sci-Fi Impact, modusmogulus\' Force Field Knock, CC0), a synthesized arc and sub.',
    layers: [
      rec(FS(646831), 0, [trim(0, 1.2), hp(40), fade(0.001, 0.5)]),
      rec(FS(787866), -4, [trim(0.03, 0.9), fade(0.001, 0.3)]),
      syn('arc', { seconds: 0.7, seed: 184, buzz: 100, hum: 0.2, sparks: 0.9, intensity: [[0, 1], [0.65, 0]] }, -8, [{ op: 'widen', amount: 0.6 }]),
      syn('subdrop', { seconds: 0.5, hz: [[0, 110], [0.4, 35]], drive: 2.5, env: [[0, 0], [0.002, 1], [0.48, 0]] }, -3),
    ],
    master: [hp(30), sat(1.4, 0.25), comp(-12, 3, 0.002, 0.15), ...cap(1.2, 0.45), OUT],
  },
  {
    id: 'slam', name: 'slamC', brief: BRIEF_SLAM,
    what: 'C, ground pound: a big orchestral timpani hit pitched down with a sharp crack on top, a burst of dust and a shockwave ring: weighty and bouncy rather than metallic.',
    why: 'A real timpani (VSCO-2 CE, CC0) with synthesized crack, dust (low noise burst), ring and sub.',
    layers: [
      rec(VS('Percussion/Timpani/Timpani1_Hit_v3_rr1_Sum.wav'), 0, [pitch(-4), fade(0.001, 0.4), trim(0, 1.1)]),
      syn('nwave', { seconds: 0.2, seed: 185, T: 0.012, rise: 0.0003, double: false, lp: 11000, hp: 250 }, -4),
      syn('noise', { seconds: 0.6, seed: 186, color: 'brown', env: [[0, 0], [0.005, 1], [0.55, 0]] }, -8, [lp(1200)]),
      syn('whoosh', { seconds: 0.8, seed: 187, hz: [[0, 300], [0.5, 5000], [0.8, 8000]], q: 2, env: [[0, 0], [0.01, 1], [0.4, 0.4], [0.78, 0]], air: 0.3 }, -10, [{ op: 'widen', amount: 0.6 }]),
      syn('subdrop', { seconds: 0.5, hz: [[0, 90], [0.4, 32]], drive: 2.5, env: [[0, 0], [0.002, 1], [0.48, 0]] }, -3),
    ],
    master: [hp(30), sat(1.5, 0.25), comp(-12, 3, 0.002, 0.15), ...cap(1.2, 0.45), OUT],
  },
];
