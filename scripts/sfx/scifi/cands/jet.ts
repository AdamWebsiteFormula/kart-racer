// Jet Mode (was Strike Ball): the spool-up and ignition, the afterburner loop while it flies (a new loop id), and the
// sonic-boom burst at the end. Jump Jets (was Pogo Spring): the thruster kick up, and the dive and slam.
import type { Cand } from '../parts.ts';
import { cap, comp, conv, EVEN, fade, FCP, FS, GAME, hp, lp, OUT, pitch, rec, sat, syn, thump, trim, TUNNEL, verb, VS } from '../parts.ts';

const BRIEF_SPOOL = `Jet Mode starts in ${GAME}: the kart's jet engine whines as it spools up fast, then lights with a big afterburner whoomph as it takes off down the road. Thrilling, about a second and a half. No voice.`;
const BRIEF_LOOP = `Jet Mode in flight in ${GAME}: the kart's jet engine roaring with its turbine whine, a seamless loop for the five seconds it flies. Powerful but not harsh or hissy. No voice.`;
const BRIEF_BOOM = `Jet Mode ends in a sonic-boom burst in ${GAME}: a huge double crack "ba-BOOM" that knocks the karts around it spinning. A big thrilling payoff, fun not violent, under two seconds. No voice, nothing like a bomb.`;
const BRIEF_UP = `Jump Jets fire in ${GAME}: a punchy burst of thrusters launches the kart four metres up into the air. Exciting, under a second. No voice, nothing like a gunshot, no springs.`;
const BRIEF_SLAM = `Jump Jets dive and slam the kart back onto the road in ${GAME}, bumping the karts nearby: a huge, heavy impact with a shockwave and a hiss of thrusters, landing the instant it plays. Big and fun, about a second. No voice.`;

const F16 = FS(322178); // ikbenraar, F16 fighter jet start up (CC0): the local ear hears "Jet engine"
const F22 = FS(187734); // qubodup, Idle F-22 Jet Plane (CC0): "a jet engine roaring"
const FLAME = FS(244926); // hnhnh, fire-whoosh (CC0)
const LAUNCH = FS(480870); // C3Sabertooth, LAUNCH (Futuristic) (CC0)

export const JET: Cand[] = [
  // ---------------------------------------------------------------- Jet Mode: spool and ignite
  {
    id: 'strikeRoll', name: 'strikeRollA', brief: BRIEF_SPOOL,
    what: 'A, real spool: a real F-16\'s start-up whine, sped up as the turbine races (its pitch climbing a whole octave in a second), then a real flame whooshes alight as the afterburner lights with a deep thump, and the jet roars on.',
    why: 'Real recordings for identity (the F-16 start-up, ikbenraar; the idling F-22, qubodup; a fire whoosh, hnhnh; all CC0): the spool is the recording itself bent up 12 semitones, not a synthesizer (the ears heard the synthesized turbine as cheap).',
    layers: [
      rec(F16, 0, [trim(0.2, 2.4), { op: 'bend', st: [[0, -7], [1.1, 5]] }, { op: 'env', pts: [[0, 0], [0.15, 0.5], [1.0, 1], [1.12, 0.6]] }, trim(0, 1.12)]),
      rec(FLAME, -1, [trim(0.08, 1.0), fade(0.004, 0.35)], 1.02),
      rec(F22, -4, [trim(8.0, 9.0), pitch(2), fade(0.02, 0.4)], 1.02),
      thump(-4, 90, 35, 0.3, 1.04),
    ],
    master: [hp(35), sat(1.3, 0.2), comp(-14, 3, 0.003, 0.15), ...cap(2.0, 0.5), OUT],
  },
  {
    id: 'strikeRoll', name: 'strikeRollB', brief: BRIEF_SPOOL,
    what: 'B, turbine whine: a real turbine\'s whine racing up an octave, the F-16 start-up climbing under it, then a real futuristic launch blast as it lights, and the jet roaring on.',
    why: 'The F-16 start-up (ikbenraar, CC0) bent up, a futuristic launch (C3Sabertooth, CC0), the idling F-22 (qubodup, CC0); Apple\'s Final Cut Pro "Turbine" only as a quiet, heavily processed ingredient (an octave up, twice as fast, 8 dB under).',
    layers: [
      rec(FCP('Mech:Tech/Turbine.caf'), -8, [trim(0.3, 3.3), pitch(12), { op: 'env', pts: [[0, 0], [0.1, 0.6], [1.35, 1], [1.5, 0.3]] }, trim(0, 1.5)]),
      rec(F16, -2, [trim(0.2, 1.3), { op: 'bend', st: [[0, -3], [1.1, 4]] }, { op: 'env', pts: [[0, 0], [0.1, 0.6], [1.0, 1], [1.1, 0.4]] }, trim(0, 1.1)]),
      rec(LAUNCH, -1, [trim(0.38, 1.6), hp(60), fade(0.003, 0.5)], 1.0),
      rec(F22, -5, [trim(8.0, 9.0), fade(0.02, 0.4)], 1.0),
      thump(-5, 90, 35, 0.25, 1.02),
    ],
    master: [hp(35), sat(1.3, 0.2), comp(-14, 3, 0.003, 0.15), ...cap(2.0, 0.5), OUT],
  },
  {
    id: 'strikeRoll', name: 'strikeRollC', brief: BRIEF_SPOOL,
    what: 'C, transform and ignite: pneumatic vents and a servo as the kart folds into jet mode, a big "ka-chunk" as it locks, the jet whine climbing, then a flame whoosh and the jet\'s roar.',
    why: 'Real mechanics (NeoSpica\'s pressurized door, JoontheFloof\'s servo, EchoCinematics\' breaker switch, CC0), the F-16 start-up bent up and a fire whoosh (CC0), the idling F-22 (CC0).',
    layers: [
      rec(FS(425090), -6, [trim(0, 0.35), hp(300), fade(0.002, 0.15)]),
      rec(FS(740242), -8, [trim(0.2, 0.55), hp(300), fade(0.002, 0.1)], 0.05),
      rec(FS(131599), -3, [trim(0.25, 0.7), fade(0.001, 0.2)], 0.28),
      rec(F16, -4, [trim(0.2, 1.4), { op: 'bend', st: [[0, -2], [0.6, 6]] }, { op: 'env', pts: [[0, 0], [0.1, 0.7], [0.5, 1], [0.62, 0]] }, trim(0, 0.62)], 0.3),
      rec(FLAME, 0, [trim(0.08, 1.0), fade(0.004, 0.35)], 0.88),
      rec(F22, -5, [trim(14.0, 15.0), pitch(2), fade(0.02, 0.4)], 0.88),
      thump(-5, 90, 35, 0.25, 0.9),
    ],
    master: [hp(35), sat(1.3, 0.2), comp(-14, 3, 0.003, 0.15), ...cap(2.0, 0.5), OUT],
  },
  // ---------------------------------------------------------------- Jet Mode: in flight (new loop id: jetLoop)
  {
    id: 'jetLoop', name: 'jetLoopA', brief: BRIEF_LOOP, loop: 3.0, xfade: 0.12,
    what: 'A, fighter jet: a real F-22\'s engine roar with its whine, pitched up a little for speed, a low afterburner rumble under it and a steady rush of air over the kart.',
    why: 'A real jet (qubodup\'s Idle F-22, CC0; the local ear: "a jet engine roaring", 0.89) as the identity; a real afterburner (StoneyJ, CC0) low-passed into a rumble; synthesized wind; evened so the loop never swells.',
    layers: [
      rec(F22, 0, [trim(8.0, 11.3), pitch(1), hp(40), EVEN]),
      rec(FS(104883), -9, [trim(12.0, 15.3), lp(700), EVEN]),
      syn('whoosh', { seconds: 3.3, seed: 156, hz: 1400, q: 0.6, air: 0.2 }, -18),
    ],
    master: [hp(35), lp(12000), OUT],
  },
  {
    id: 'jetLoop', name: 'jetLoopB', brief: BRIEF_LOOP, loop: 3.0, xfade: 0.12,
    what: 'B, open throttle: the F-22 engine from a louder stretch, pitched up a touch, with a jet\'s full-power roar under it.',
    why: 'A real jet (qubodup\'s Idle F-22, CC0) as the identity; Apple\'s Final Cut Pro "Airplane Jet Engine Revs" only as a quiet processed layer (8 dB under, evened); the local ear: "a jet engine roaring".',
    layers: [
      rec(F22, 0, [trim(14.0, 17.3), pitch(1), hp(40), EVEN]),
      rec(FCP('Transportation/Airplane Jet Engine Revs.caf'), -8, [trim(40.0, 43.3), hp(40), EVEN]),
    ],
    master: [hp(35), lp(12000), OUT],
  },
  {
    id: 'jetLoop', name: 'jetLoopC', brief: BRIEF_LOOP, loop: 3.0, xfade: 0.12,
    what: 'C, fast pass: the loudest, closest stretch of a real jet fly-by held steady, with the F-22\'s whine under it: more speed and rush than engine.',
    why: 'A real jet fly-by (laribum, CC0; the local ear: "a jet engine roaring", 0.97) evened into a steady roar, the F-22 (qubodup, CC0) for the whine.',
    layers: [
      rec(FS(215447), 0, [trim(6.0, 9.3), hp(40), EVEN]),
      rec(F22, -7, [trim(8.0, 11.3), pitch(2), hp(200), EVEN]),
    ],
    master: [hp(35), lp(12000), OUT],
  },
  // ---------------------------------------------------------------- Jet Mode: the sonic boom
  {
    id: 'strike', name: 'strikeA', brief: BRIEF_BOOM,
    what: 'A, thunder boom: the double crack of a sonic boom ("ba-BOOM", two sharp shock fronts 120 ms apart), a real close thunderclap rolling out of it, a deep bass impact and the air rushing past.',
    why: 'Synthesis for the shock fronts (an N-wave with a sub-millisecond rise, the physics of a boom), real weight from a thunder strike (loganzsound, CC0) and a bass impact (D4XX, CC0), a big swoosh (Electroviolence, CC0).',
    layers: [
      syn('nwave', { seconds: 0.4, seed: 160, T: 0.07, rise: 0.0003, gap: 0.12, lp: 11000, hp: 40 }, 0),
      rec(FS(840628), -2, [trim(0.58, 2.6), hp(60), fade(0.002, 0.8)], 0.005),
      rec(FS(617043), -3, [trim(0, 1.5), fade(0.001, 0.6)]),
      rec(FS(234547), -12, [trim(0.2, 0.8), hp(300), fade(0.02, 0.3)], 0.25),
    ],
    master: [hp(30), conv(TUNNEL, 0.08, { decay: 1.2 }), sat(1.3, 0.2), comp(-12, 3, 0.003, 0.15), ...cap(2.0, 0.7), OUT],
  },
  {
    id: 'strike', name: 'strikeB', brief: BRIEF_BOOM,
    what: 'B, designed boom: a synthesized N-wave double crack with its rolling rumble, a real cinematic "sonic boom" for size, a crackle of sparks and a driven sub.',
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
    what: 'C, burst and shut-down: a shock crack, a real cinematic boom, an energy ring racing outward across the stereo field and, as the jet shuts off, a real turbine winding down under it.',
    why: 'A real designed boom (modusmogulus, CC0) and a real machine power-down (stewdio2003, CC0); the crack and ring synthesized.',
    layers: [
      syn('nwave', { seconds: 0.3, seed: 164, T: 0.05, rise: 0.0003, gap: 0.1, lp: 11000, hp: 40 }, -2),
      rec(FS(785927), 0, [trim(0, 2.0), hp(35), fade(0.002, 0.9)]),
      syn('whoosh', { seconds: 1.0, seed: 165, hz: [[0, 300], [0.5, 6000], [1.0, 9000]], q: 2, env: [[0, 0], [0.01, 1], [0.4, 0.5], [1.0, 0]], air: 0.3 }, -8, [{ op: 'widen', amount: 0.6 }]),
      rec(FS(238367), -9, [trim(0.3, 2.3), pitch(4), fade(0.02, 0.6)], 0.2),
      thump(-5, 85, 32, 0.35),
    ],
    master: [hp(30), sat(1.3, 0.2), comp(-12, 3, 0.003, 0.15), ...cap(2.0, 0.7), OUT],
  },
  // ---------------------------------------------------------------- Jump Jets: up
  {
    id: 'boing', name: 'boingA', brief: BRIEF_UP,
    what: 'A, thruster hop: a real rocket thruster\'s burst, bent upward as the kart lifts, with a fuse-like hiss of gas and a low kick.',
    why: 'A real rocket thrust (Maxx222, CC0) bent up 4 semitones, a real ignition hiss (derplayer, CC0); a synthesized kick. The local ear: "a short burst of rocket thrusters launching upward".',
    layers: [
      rec(FS(446764), 0, [trim(1.0, 1.7), hp(60), { op: 'env', pts: [[0, 0], [0.015, 1], [0.3, 0.6], [0.65, 0]] }, { op: 'bend', st: [[0, 0], [0.6, 4]] }]),
      rec(FS(587173), -8, [trim(0.0, 0.5), hp(1500), fade(0.01, 0.2)]),
      thump(-9, 130, 60, 0.1),
    ],
    master: [hp(50), sat(1.2, 0.15), comp(-14, 2.5, 0.003, 0.12), ...cap(0.8, 0.3), OUT],
  },
  {
    id: 'boing', name: 'boingB', brief: BRIEF_UP,
    what: 'B, flame lift: a real flame whoosh bent upward as the kart lifts, a real rocket fuse hissing through it and a low thump.',
    why: 'A real fire whoosh (hnhnh, CC0; the local ear: "a flame whoosh igniting") bent up 4 semitones, a real ignition hiss (derplayer, CC0).',
    layers: [
      rec(FLAME, 0, [trim(0.08, 0.8), { op: 'bend', st: [[0, 0], [0.6, 4]] }, { op: 'env', pts: [[0, 0], [0.01, 1], [0.25, 0.6], [0.6, 0]] }]),
      rec(FS(587173), -6, [trim(0.0, 0.5), hp(1500), fade(0.004, 0.2)]),
      thump(-5, 130, 55, 0.12),
    ],
    master: [hp(50), sat(1.3, 0.2), comp(-14, 2.5, 0.003, 0.12), ...cap(0.8, 0.3), OUT],
  },
  {
    id: 'boing', name: 'boingC', brief: BRIEF_UP,
    what: 'C, rocket hop: a real rocket thruster\'s burst with a synthesized flame flaring open, a deep "fwoomp" and air rushing up.',
    why: 'A real rocket thrust (Maxx222, CC0) with a synthesized flare (a filter opening on turbulent noise) and a band of air rising.',
    layers: [
      rec(FS(446764), -2, [trim(1.0, 1.7), hp(60), { op: 'env', pts: [[0, 0], [0.008, 1], [0.3, 0.6], [0.65, 0]] }]),
      syn('thrust', { seconds: 0.6, seed: 171, hz: [[0, 500], [0.03, 6500], [0.5, 1500]], throb: [35, 0.25], turb: 0.4, crackle: 0.2, hiss: 0.3, env: [[0, 0], [0.005, 1], [0.2, 0.5], [0.58, 0]] }, -3),
      syn('whoosh', { seconds: 0.5, seed: 172, hz: [[0, 600], [0.45, 3500]], q: 1.3, env: [[0, 0], [0.05, 1], [0.48, 0]], air: 0.2 }, -10),
      thump(-8, 120, 55, 0.12),
    ],
    master: [hp(50), sat(1.4, 0.25), comp(-14, 2.5, 0.003, 0.12), ...cap(0.8, 0.3), OUT],
  },
  // ---------------------------------------------------------------- Jump Jets: the slam
  {
    id: 'slam', name: 'slamA', brief: BRIEF_SLAM,
    what: 'A, slam and shockwave: the instant impact (a real bass impact, a real cinematic boom, a sharp crack and a driven sub), a shockwave of air sweeping out and the thrusters hissing off.',
    why: 'Real weight (D4XX\'s bass impact, the local ear: "a heavy impact slam with a boom", 0.92; rhapsodize\'s boom; CC0) saturated for mid-range body (a sub alone reads as a dull bump); a real purge (tranzfusion, CC0) for the thrusters; the crack and ring synthesized.',
    layers: [
      rec(FS(617043), 0, [trim(0, 1.2), fade(0.001, 0.5)]),
      rec(FS(255111), -3, [trim(0, 1.0), lp(2500), sat(2.2, 0.6), fade(0.001, 0.4)]),
      syn('nwave', { seconds: 0.2, seed: 181, T: 0.012, rise: 0.0003, double: false, lp: 11000, hp: 250 }, -5),
      syn('subdrop', { seconds: 0.6, hz: [[0, 100], [0.5, 30]], drive: 2.5, env: [[0, 0], [0.002, 1], [0.55, 0]] }, -3),
      syn('whoosh', { seconds: 0.9, seed: 182, hz: [[0, 300], [0.5, 5000], [0.9, 8000]], q: 2, env: [[0, 0], [0.01, 1], [0.4, 0.4], [0.88, 0]], air: 0.3 }, -9, [{ op: 'widen', amount: 0.6 }]),
      rec(FS(642961), -14, [trim(0.1, 0.8), hp(1200), fade(0.05, 0.3)], 0.08),
    ],
    master: [hp(30), sat(1.5, 0.25), comp(-12, 3, 0.002, 0.15), ...cap(1.2, 0.45), OUT],
  },
  {
    id: 'slam', name: 'slamB', brief: BRIEF_SLAM,
    what: 'B, mech stomp: a giant robot\'s footstep, heavy and mechanical, over a deep bass impact.',
    why: 'Real recordings: a big robot footstep (AudioPapkin, CC0) from its hit, a bass impact (D4XX, CC0). The local ear: "a heavy sci-fi ground slam impact with a shockwave", 0.93.',
    layers: [
      rec(FS(813053), 0, [trim(0.12, 1.4), fade(0.001, 0.5)]),
      rec(FS(617043), -4, [trim(0, 1.2), fade(0.001, 0.5)]),
    ],
    master: [hp(30), sat(1.4, 0.2), comp(-12, 3, 0.002, 0.15), ...cap(1.2, 0.45), OUT],
  },
  {
    id: 'slam', name: 'slamC', brief: BRIEF_SLAM,
    what: 'C, ground pound: a big orchestral timpani hit pitched down with a sharp crack on top, a burst of low dust and a shockwave of air: weighty and deep rather than metallic.',
    why: 'A real timpani (VSCO-2 CE, CC0) with a synthesized crack, dust (a low noise burst), ring and sub.',
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
