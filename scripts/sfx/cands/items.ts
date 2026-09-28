// Item candidates (28 Sept 2026, for Adam's ears; not installed): drop, anchor, mouse, fizz, airHorn, boing (the Pogo
// Spring) and strike. Each item's identity is a real recording of the thing itself (CC0 on Freesound and VSCO-2 CE:
// plops, chains, a squeeze toy and a toy ratchet, a champagne cork and a soda bottle, air horns, a jaw harp and a
// cartoon spring, a bowling strike), layered and carved like the rest, musical flourishes in the menus' G major.
import type { Layer, Recipe } from '../types.ts';
import { END, fs, held, hit, ke, ROOM, syn, takes, tone, vs } from './kit.ts';

const G = 'Glock', X = 'Xylo', M = 'Marimba', TP = 'Brass/Trumpet/stac';
const ST = [0, 0.8, -0.7];
const BALL = 423778;

// ---------------------------------------------------------------- drop (an Oil Can or a Decoy Balloon behind the kart)
const DROP = 'The player drops an item (an oil can or a decoy balloon) behind the kart onto the road in a polished cartoon kart racing game (Mario Kart World quality): a soft, round plop and a little rubbery bounce, light and fun. No voice.';
const bounce = (db: number, at: number, st: number, n: number): Layer => fs(BALL, db, [hit(n, 0.12, -16, 0.2), { op: 'pitch', st }, { op: 'lp', hz: 3500 }], at);
const dropA = takes('dropA', 2, (k) => ({ id: 'drop', brief: DROP,
  why: "A, plop and hop: a real plop (edschaefer, 'PlopEnhanced', CC0) with a rubber ball's small bounce after it and a smaller one after that (SomeoneCool15, CC0, pitched up), each take a little different.",
  layers: [fs(343097, 0, [{ op: 'trim', from: 0.05, to: 0.4 }, { op: 'pitch', st: -1 + ST[k] }]), bounce(-8, 0.14, 7 + ST[k], [0, 3][k]), bounce(-15, 0.24, 9 + ST[k], [2, 5][k])],
  master: [{ op: 'hp', hz: 100 }, ROOM(0.1), ...END(0.45)] }));
const dropB = takes('dropB', 2, (k) => ({ id: 'drop', brief: DROP,
  why: "B, a can and a bounce: a real bottle-cap plop (Breviceps, 'Plop!', CC0) pitched down, a tin can's clunk (Kenney's impacts, CC0) under it for the oil can, and one small rubber bounce.",
  layers: [fs(447910, 0, [{ op: 'trim', to: 0.25 }, { op: 'pitch', st: -3 + ST[k] }]), ke(`kenney_impact-sounds/Audio/impactTin_medium_00${[0, 3][k]}.ogg`, -9, [{ op: 'lp', hz: 3000 }]), bounce(-10, 0.13, 6, [1, 4][k])],
  master: [{ op: 'hp', hz: 100 }, ROOM(0.1), ...END(0.4)] }));
const dropC = takes('dropC', 2, (k) => ({ id: 'drop', brief: DROP,
  why: "C, blup: a soft rubber shell struck and sagging 3 semitones (physics.py modal synthesis: a cartoon 'blup'), a real plop on its front (edschaefer, CC0) and two quick rubber bounces from the same model, smaller each time.",
  layers: [syn('modal', { seconds: 0.3, hz: 260 * Math.pow(2, ST[k] / 12), material: 'hollow', ring: 0.7, contact: 0.005, glide: [[0, 0], [0.1, -3]], seed: 91 + k }, 0),
    fs(343097, -8, [{ op: 'trim', from: 0.05, to: 0.3 }]),
    syn('modal', { seconds: 0.15, hz: 420, material: 'rubber', ring: 0.8, contact: 0.003, seed: 93 + k }, -9, [], 0.15),
    syn('modal', { seconds: 0.12, hz: 470, material: 'rubber', ring: 0.7, contact: 0.003, seed: 95 + k }, -15, [], 0.25)],
  master: [{ op: 'hp', hz: 100 }, ROOM(0.1), ...END(0.42)] }));

// ---------------------------------------------------------------- anchor (a Grapple Anchor thrown on its chain; it hooks the kart ahead)
const ANCHOR = 'The Grapple Anchor item in a polished cartoon kart racing game (Mario Kart World quality): a metal chain rattles fast as it is thrown out, links clinking and jangling, then one heavy metal clank as the anchor hooks on; weighty and fun, about a second. No voice.';
const anchorA: Recipe[] = [{ id: 'anchor', name: 'anchorA', brief: ANCHOR,
  why: "A, chain and clank: a real heavy chain paying out (qubodup, 'Big Metal Chain', CC0) with a throw's swish, then a real brake-drum clank (VSCO-2 CE, the orchestra's 'anvil') pitched down for the anchor hooking on and a low thump under it; a room.",
  layers: [fs(199282, 0, [{ op: 'trim', from: 0.12, to: 0.72 }, { op: 'pitch', st: 1 }, { op: 'fade', out: 0.1 }]),
    fs(463763, -8, [hit(2, 0.35), { op: 'pitch', st: -2 }]),
    vs('VSCO 1 Percussion/varMetal/various/brake_fff.wav', -2, [{ op: 'pitch', st: -4 }, { op: 'trim', to: 0.7 }, { op: 'fade', out: 0.4 }], 0.6),
    fs(445781, -7, [hit(3, 0.3, -16, 0.2), { op: 'lp', hz: 800 }], 0.6)],
  master: [{ op: 'hp', hz: 60 }, ROOM(0.14, 0.4), ...END(1.35, 0.4)] }];
const anchorB: Recipe[] = [{ id: 'anchor', name: 'anchorB', brief: ANCHOR,
  why: "B, jangle and ting: a real chain grinding through (VSCO-2 CE 'chain_grind') and a real quick chain drop (Hitrison, CC0) for the jangle, then a heavy metal clank (Kenney's impacts, CC0) with a small agogo bell's ring on top (VSCO-2 CE): the hook biting.",
  layers: [vs('Miscellania Raw/Misc 1/chain_grind.wav', 0, [{ op: 'trim', to: 0.55 }, { op: 'fade', out: 0.1 }]),
    fs(191511, -4, [hit(3, 0.5, -18, 0.4), { op: 'fade', out: 0.15 }], 0.05),
    ke('kenney_impact-sounds/Audio/impactMetal_heavy_002.ogg', -1, [{ op: 'pitch', st: -2 }], 0.55),
    vs('VSCO 1 Percussion/varMetal/various/agogoBell3_ff_1.wav', -13, [{ op: 'pitch', st: 2 }, { op: 'trim', to: 0.5 }, { op: 'fade', out: 0.3 }], 0.56)],
  master: [{ op: 'hp', hz: 60 }, ROOM(0.14, 0.4), ...END(1.2, 0.4)] }];
const anchorC: Recipe[] = [{ id: 'anchor', name: 'anchorC', brief: ANCHOR,
  why: "C, a whirl and a hook: a real chain rattle (nettimato, 'chain', CC0) whirled round (a quick tremolo) with a rope swish, then a real metal hit (VSCO-2 CE 'metal_hit') and the brake drum's clank together, bigger and brighter than A.",
  layers: [fs(387240, 0, [hit(2, 0.6, -18, 0.4), { op: 'flutter', depth: 0.4, rate: 11, seed: 5 }, { op: 'fade', out: 0.1 }]),
    fs(463763, -9, [hit(7, 0.35), { op: 'pitch', st: -3 }]),
    vs('Miscellania Raw/Misc 1/metal_hit3.wav', -2, [hit(0, 0.6, -20, 0.3), { op: 'pitch', st: -2 }], 0.58),
    vs('VSCO 1 Percussion/varMetal/various/brake_fff.wav', -6, [{ op: 'pitch', st: -2 }, { op: 'trim', to: 0.6 }, { op: 'fade', out: 0.35 }], 0.58)],
  master: [{ op: 'hp', hz: 60 }, ROOM(0.14, 0.4), ...END(1.3, 0.4)] }];

// ---------------------------------------------------------------- mouse (a Wind-Up Mouse scurries off after rivals)
const MOUSE = 'The Wind-Up Mouse item in a polished cartoon kart racing game (Mario Kart World quality): a tiny tin toy mouse is let go: one quick high squeak, a whirr of its clockwork, then a very fast, light pitter-patter of tiny metal feet scurrying off and fading away. Small, quick and cute. No voice.';
/** a repeatable 0..1 from two integers (the patter's small irregularities) */
const r01 = (i: number, s: number) => { const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return x - Math.floor(x); };
/**
 * tiny metal feet: `n` little taps in a gallop (pairs: a foot, then the other close behind it, `rate` pairs a second),
 * each a small metal tap (Kenney's light metal impacts) pitched up, the two feet a little apart in pitch, every tap a
 * touch early or late and a touch louder or softer, fading and drifting right as the mouse runs off
 */
const patter = (n: number, rate: number, start: number, db: number, seed: number): Layer[] => Array.from({ length: n }, (_, i) => {
  const pair = Math.floor(i / 2), second = i % 2;
  const t = start + pair / rate + second * (0.32 / rate) + (r01(i, seed) - 0.5) * (0.12 / rate);
  return ke(`kenney_impact-sounds/Audio/impactMetal_light_00${(i * 3 + seed) % 5}.ogg`, db - (i * 14) / n - 3 * r01(i + 7, seed) - (second ? 2.5 : 0),
    [{ op: 'pitch', st: 14 + (second ? -1.2 : 0.4) + r01(i + 3, seed) * 0.6 }, { op: 'hp', hz: 1200 }, { op: 'trim', to: 0.045 }, { op: 'fade', out: 0.03 }, { op: 'pan', pos: -0.2 + (0.6 * i) / n }], t);
});
const mouseA: Recipe[] = [{ id: 'mouse', name: 'mouseA', brief: MOUSE,
  why: "A, squeak and patter: a real squeeze toy's squeak (survivalzombie, CC0) pitched up 5 semitones to a mouse's size, three turns of a real toy ratchet for its clockwork (monotraum, CC0), then eighteen tiny metal footfalls in a gallop, the two feet a little apart in pitch and each a touch early or late (Kenney's light metal impacts pitched up 14 semitones), fading off to the right over the clockwork's whirr (a music-box spring wound fast, OrbitalChiller, CC0).",
  layers: [fs(240015, 0, [hit(0, 0.18, -20, 0.2), { op: 'pitch', st: 5 }]),
    ...[0, 1, 2].map((i) => fs(376195, -8, [hit(i, 0.05, -20, 0.1), { op: 'pitch', st: 7 }, { op: 'hp', hz: 1200 }], 0.14 + i * 0.045)),
    ...patter(18, 11, 0.3, -5, 1),
    // the clockwork whirring as it runs: the music-box spring's wind sped up to a buzz, far under the feet
    fs(171233, -17, [{ op: 'trim', from: 0.5, to: 1.4 }, { op: 'pitch', st: 12 }, { op: 'hp', hz: 1500 }, { op: 'env', pts: [[0, 0], [0.05, 1], [0.45, 0]] }], 0.28)],
  master: [{ op: 'hp', hz: 300 }, ROOM(0.1), ...END(1.15, 0.3)] }];
const mouseB: Recipe[] = [{ id: 'mouse', name: 'mouseB', brief: MOUSE,
  why: "B, a real wind-up toy: a wind-up toy's own clatter as it runs (lmbubec, 'Wind Up Toy', CC0) sped up and pitched up an octave for a tiny one, on the squeeze-toy squeak (survivalzombie, CC0), panned away as it scurries off.",
  layers: [fs(240015, -1, [hit(2, 0.16, -20, 0.2), { op: 'pitch', st: 6 }]),
    fs(118816, 0, [{ op: 'trim', from: 3.55, to: 5.4 }, { op: 'pitch', st: 12 }, { op: 'hp', hz: 800 }, { op: 'env', pts: [[0, 1], [0.5, 0.8], [0.92, 0]] }, { op: 'doppler', speed: 6, dist: 1, at: 0.1, pan: 0.6 }], 0.15)],
  master: [{ op: 'hp', hz: 300 }, ROOM(0.1), ...END(1.15, 0.3)] }];
const mouseC: Recipe[] = [{ id: 'mouse', name: 'mouseC', brief: MOUSE,
  why: "C, music-box mouse: a real music-box spring being wound (OrbitalChiller, CC0) for the key's turn, a quick squeak (survivalzombie, CC0), then a patter of tiny metal feet (Kenney's light metal impacts, pitched up) with a soft pizzicato of glockenspiel ticks (G major) running away with it.",
  layers: [fs(171233, -3, [{ op: 'trim', from: 0.5, to: 0.8 }, { op: 'pitch', st: 5 }, { op: 'hp', hz: 800 }, { op: 'fade', out: 0.06 }]),
    fs(240015, 0, [hit(1, 0.16, -20, 0.2), { op: 'pitch', st: 5 }], 0.22),
    ...patter(16, 10, 0.36, -5, 3),
    ...['G6', 'B6', 'D7'].map((n, i) => tone(G, n, 0.4 + i * 0.12, 0.12, -17 - i))],
  master: [{ op: 'hp', hz: 300 }, ROOM(0.1), ...END(1.15, 0.3)] }];

// ---------------------------------------------------------------- fizz (a Fizz Pop: a shaken soda sprays and shoots the kart forward)
const FIZZ = 'The Fizz Pop item in a polished cartoon kart racing game (Mario Kart World quality): a shaken soda bottle cap pops off, then a strong fizzy foam blast sprays out and shoots the kart forward: a pop, then a rushing carbonated fizz whoosh. No voice.';
const fizzA: Recipe[] = [{ id: 'fizz', name: 'fizzA', brief: FIZZ,
  why: "A, cork and spray: a real champagne cork's pop (KenRT, CC0), then a real air release (brunoboselli, CC0) band-limited into the spray, a real soda bottle's hiss (ShawnyBoy, CC0) and real bubbles (VSCO-2 CE) for the carbonation, swelling and fading as the kart shoots off.",
  layers: [fs(392624, 0, [{ op: 'trim', to: 0.35 }]),
    fs(457294, -4, [{ op: 'trim', from: 0.05, to: 1.1 }, { op: 'bp', hz: 4000, q: 0.5 }, { op: 'env', pts: [[0, 0], [0.05, 1], [0.5, 0.6], [1.05, 0]] }], 0.06),
    fs(166057, -8, [{ op: 'trim', from: 0.3, to: 1.4 }, { op: 'hp', hz: 2500 }, { op: 'env', pts: [[0, 0], [0.1, 1], [1.1, 0]] }], 0.08),
    vs('Miscellania Raw/Misc 1/bubbles.wav', -12, [{ op: 'trim', from: 0.8, to: 1.8 }, { op: 'hp', hz: 1500 }, { op: 'fade', in: 0.1, out: 0.4 }], 0.1)],
  master: [{ op: 'hp', hz: 80 }, ROOM(0.1, 0.35), ...END(1.2, 0.4)] }];
const fizzB: Recipe[] = [{ id: 'fizz', name: 'fizzB', brief: FIZZ,
  why: "B, can and foam: a real cork pop (Andre_Desartistes, CC0) for the cap, a real soda can's hiss (Kodack, CC0), a fizzing crackle of bursting bubbles (dsp.py seeded crackle, 300 tiny bursts a second) and a real whoosh (northern87, CC0) for the blast forward.",
  layers: [fs(335357, 0, [{ op: 'trim', to: 0.3 }, { op: 'fade', out: 0.1 }]),
    fs(256317, -6, [{ op: 'trim', from: 1.0, to: 2.2 }, { op: 'hp', hz: 2000 }, { op: 'env', pts: [[0, 0], [0.08, 1], [1.2, 0]] }], 0.05),
    syn('crackle', { seconds: 1.1, seed: 7, rate: 300, lo: 3000, hi: 11000, decay: 0.0015, spread: 16, width: 0.8, env: [[0, 0], [0.1, 1], [0.6, 0.6], [1.1, 0]] }, -10, [], 0.06),
    fs(88532, -7, [{ op: 'trim', from: 0.2, to: 1.2 }, { op: 'fade', in: 0.05 }], 0.05)],
  master: [{ op: 'hp', hz: 80 }, ROOM(0.1, 0.35), ...END(1.2, 0.4)] }];
const fizzC: Recipe[] = [{ id: 'fizz', name: 'fizzC', brief: FIZZ,
  why: "C, pop and gush: a real champagne cork (KenRT, CC0) and a real steam burst (pengo_au, CC0) as the foam gushes, real bubbles (VSCO-2 CE) under it, and a bright rising zip as the kart shoots forward; punchier than A.",
  layers: [fs(392624, 0, [{ op: 'trim', to: 0.3 }, { op: 'pitch', st: 1 }]),
    fs(90143, -3, [{ op: 'trim', to: 1.1 }, { op: 'hp', hz: 800 }, { op: 'fade', out: 0.4 }], 0.05),
    vs('Miscellania Raw/Misc 1/bubbles2.wav', -10, [{ op: 'trim', from: 0.5, to: 1.5 }, { op: 'hp', hz: 1500 }, { op: 'fade', in: 0.05, out: 0.4 }], 0.08),
    syn('whoosh', { seconds: 0.4, hz: [[0, 800], [0.35, 4500]], q: 1.5, env: [[0, 0], [0.1, 1], [0.4, 0]], seed: 13 }, -11, [], 0.1)],
  master: [{ op: 'hp', hz: 80 }, ROOM(0.1, 0.35), ...END(1.2, 0.4)] }];

// ---------------------------------------------------------------- airHorn (the Air Horn blast shoves nearby karts)
const HORN = 'The Air Horn item in a polished cartoon kart racing game (Mario Kart World quality): one big, loud, comic stadium air horn blast that shoves the karts nearby aside: a bright brassy honk, about a second. No voice.';
const hornA: Recipe[] = [{ id: 'airHorn', name: 'airHornA', brief: HORN,
  why: "A, a stadium chord: a real air horn (jacksonacademyashmore, 'Airhorn', CC0) doubled a major third up by a second real horn (mcpable, 'Industrial Air Horn', CC0, tuned to it), the chord real stadium horns blow, with a short arena room.",
  layers: [fs(414208, 0, [{ op: 'trim', from: 0.02, to: 1.15 }, { op: 'fade', out: 0.12 }]),
    fs(131930, -4, [{ op: 'trim', from: 0.4, to: 1.5 }, { op: 'pitch', st: 3.3 }, { op: 'fade', in: 0.01, out: 0.12 }], 0.01)],
  master: [{ op: 'hp', hz: 100 }, { op: 'room', mix: 0.18, size: [20, 15, 8], absorb: 0.3, tail: 0.8, tailLevel: 0.3, hp: 300, lp: 7000 }, { op: 'comp', threshold: -12, ratio: 2, attack: 0.005, release: 0.12 }, ...END(1.4, 0.3)] }];
const hornB: Recipe[] = [{ id: 'airHorn', name: 'airHornB', brief: HORN,
  why: "B, the big one: a real industrial air horn (mcpable, CC0) as the blast, a real tuba staccato (VSCO-2 CE) under its start for a comic weight, and a gentle saturation so it cuts on small speakers.",
  layers: [fs(131930, 0, [{ op: 'trim', from: 0.38, to: 1.5 }, { op: 'fade', in: 0.005, out: 0.12 }]), held('Brass/Tuba/stac', 'D2', 0, 0.35, -8)],
  master: [{ op: 'hp', hz: 60 }, { op: 'sat', drive: 2.5, mix: 0.2, asym: 0.1 }, { op: 'room', mix: 0.16, size: [20, 15, 8], absorb: 0.3, tail: 0.8, tailLevel: 0.3, hp: 300, lp: 7000 }, ...END(1.35, 0.3)] }];
const hornC: Recipe[] = [{ id: 'airHorn', name: 'airHornC', brief: HORN,
  why: "C, a comic triad: the real air horn (jacksonacademyashmore, CC0) at three pitches at once (root, major third, fifth: a stadium horn's chord), its end bending down a semitone as the can runs out, a short arena room.",
  layers: [0, 4, 7].map((st, i) => fs(414208, -3 * i, [{ op: 'trim', from: 0.02, to: 1.15 }, { op: 'pitch', st: st - 2 }, { op: 'bend', st: [[0, 0], [0.8, 0], [1.1, -1]] }, { op: 'fade', out: 0.15 }, { op: 'pan', pos: [0, -0.3, 0.3][i] }])),
  master: [{ op: 'hp', hz: 100 }, { op: 'room', mix: 0.18, size: [20, 15, 8], absorb: 0.3, tail: 0.8, tailLevel: 0.3, hp: 300, lp: 7000 }, ...END(1.35, 0.3)] }];

// ---------------------------------------------------------------- boing (the Pogo Spring launches the kart)
const BOING = 'The Pogo Spring item launches the kart high into the air in a polished cartoon kart racing game (Mario Kart World quality): one big, long, exaggerated wobbly cartoon boing, springy and fun, about a second. No voice.';
const boingA: Recipe[] = [{ id: 'boing', name: 'boingA', brief: BOING,
  why: "A, jaw harp and spring: a real jaw-harp boing (C-V, CC0), the classic cartoon spring, over a real cartoon spring bouncing (Denis Chapon, CC0), with a whoosh rising as the kart takes off.",
  layers: [fs(518645, 0, [hit(0, 0.95, -18, 0.4)]), fs(109435, -6, [hit(0, 0.9, -18, 0.4), { op: 'pitch', st: 2 }]),
    syn('whoosh', { seconds: 0.7, hz: [[0, 400], [0.6, 2400]], q: 1.0, env: [[0, 0], [0.15, 1], [0.7, 0]], seed: 17 }, -12, [], 0.05)],
  master: [{ op: 'hp', hz: 80 }, ROOM(0.12, 0.3), ...END(1.0, 0.3)] }];
const boingB: Recipe[] = [{ id: 'boing', name: 'boingB', brief: BOING,
  why: "B, flexatone boing: a real flexatone's wobble (VSCO-2 CE, the orchestra's cartoon spring) on a real jaw harp's first twang (3bagbrew, CC0), bending up 3 semitones as the kart flies.",
  layers: [vs('VSCO 1 Percussion/varMetal/various/flexatone_fast.wav', 0, [hit(0, 1.0, -20, 0.4), { op: 'bend', st: [[0, 0], [0.9, 3]] }]),
    fs(95600, -3, [{ op: 'trim', from: 0.07, to: 0.6 }, { op: 'fade', in: 0.002, out: 0.2 }])],
  master: [{ op: 'hp', hz: 80 }, ROOM(0.12, 0.3), ...END(1.0, 0.3)] }];
const boingC: Recipe[] = [{ id: 'boing', name: 'boingC', brief: BOING,
  why: "C, a big elastic: a real elastic band plucked (dsebeste, CC0) pitched down for a big spring, a real spring's wobble (EagleStealthTeam, CC0) and a quick rising whoosh.",
  layers: [fs(355041, 0, [hit(3, 0.9, -18, 0.4), { op: 'pitch', st: -3 }]), fs(238866, -6, [{ op: 'trim', to: 0.9 }, { op: 'fade', out: 0.3 }]),
    syn('whoosh', { seconds: 0.6, hz: [[0, 500], [0.5, 3000]], q: 1.1, env: [[0, 0], [0.12, 1], [0.6, 0]], seed: 19 }, -12, [], 0.05)],
  master: [{ op: 'hp', hz: 80 }, ROOM(0.12, 0.3), ...END(1.0, 0.3)] }];

// ---------------------------------------------------------------- strike (the Strike Ball bursts and scatters karts like pins)
const STRIKE = 'The Strike Ball bursts and scatters the karts around it like bowling pins in a polished cartoon kart racing game (Mario Kart World quality): a heavy ball crashing into wooden pins, a loud clattering scatter of pins, then a short sparkly celebration chime; a big payoff. No voice.';
const strikeA: Recipe[] = [{ id: 'strike', name: 'strikeA', brief: STRIKE,
  why: "A, a real strike: a real bowling strike (SieuAmThanh, CC0) with more real pins scattering after it (Yarmonics, CC0), then a real brass stab on G (VSCO-2 CE staccato trumpets) and a glockenspiel sparkle: the celebration.",
  layers: [fs(514385, 0, [{ op: 'trim', from: 0.12, to: 1.3 }]), fs(441856, -5, [hit(1, 0.8, -18, 0.4), { op: 'pan', pos: 0.3 }], 0.15),
    held(TP, 'G5', 0.6, 0.3, -6), held(TP, 'D5', 0.6, 0.3, -8), held(TP, 'B4', 0.6, 0.3, -9),
    tone(G, 'G6', 0.62, 0.8, -10), tone(G, 'D7', 0.7, 0.8, -12), tone(G, 'G7', 0.78, 0.8, -14)],
  master: [{ op: 'hp', hz: 50 }, ROOM(0.16, 0.6), { op: 'comp', threshold: -14, ratio: 2, attack: 0.005, release: 0.15 }, ...END(1.8, 0.35)] }];
const strikeB: Recipe[] = [{ id: 'strike', name: 'strikeB', brief: STRIKE,
  why: "B, a bigger crash: a real bowling ball hitting pins (Iamgiorgio, CC0) with four single pin knocks (Rvgerxini, CC0) scattering left and right after it, a low boom under the burst, and a xylophone run up the G major chord with a crash cymbal (VSCO-2 CE).",
  layers: [fs(371346, 0, [hit(1, 1.0, -18, 0.3)]), ...[0, 2, 4, 6].map((n, i) => fs(499788, -8 - i, [hit(n, 0.35, -18, 0.3), { op: 'pitch', st: [0, 2, -1, 3][i] }, { op: 'pan', pos: [-0.6, 0.6, -0.3, 0.4][i] }], 0.12 + i * 0.07)),
    fs(445781, -6, [hit(5, 0.4, -16, 0.2), { op: 'lp', hz: 500 }]),
    ...['G5', 'B5', 'D6', 'G6'].map((n, i) => tone(X, n, 0.6 + i * 0.05, 0.3, -9)),
    vs('VSCO 1 Percussion/varMetal/Cymbals/clash/crash_hit_mp_loose.wav', -12, [{ op: 'trim', to: 1.0 }, { op: 'fade', out: 0.6 }, { op: 'hp', hz: 400 }], 0.75)],
  master: [{ op: 'hp', hz: 50 }, ROOM(0.16, 0.6), { op: 'comp', threshold: -14, ratio: 2, attack: 0.005, release: 0.15 }, ...END(1.8, 0.35)] }];
const strikeC: Recipe[] = [{ id: 'strike', name: 'strikeC', brief: STRIKE,
  why: "C, strike and shimmer: the real strike (SieuAmThanh, CC0) with a real bowling ball's roll into it (driftworks, CC0), a timpani stroke under the burst, then a real glockenspiel glissando rising (VSCO-2 CE) for the sparkle.",
  layers: [fs(128969, -8, [{ op: 'trim', from: 2.8, to: 3.25 }, { op: 'fade', in: 0.1 }]), fs(514385, 0, [{ op: 'trim', from: 0.12, to: 1.3 }], 0.3),
    vs('Percussion/Timpani/Timpani1_Hit_v3_rr1_Sum.wav', -8, [{ op: 'pitch', st: 1 }, { op: 'trim', to: 0.8 }, { op: 'fade', out: 0.5 }], 0.3),
    vs('Miscellania Raw/Misc 2/glock_glisses/glock_fx_up_pentatonic_med_02.wav', -10, [hit(0, 0.6, -24, 0.5), { op: 'fade', out: 0.3 }], 0.85)],
  master: [{ op: 'hp', hz: 50 }, ROOM(0.16, 0.6), ...END(1.9, 0.35)] }];

export const RECIPES: readonly Recipe[] = [...dropA, ...dropB, ...dropC, ...anchorA, ...anchorB, ...anchorC, ...mouseA, ...mouseB, ...mouseC, ...fizzA, ...fizzB, ...fizzC,
  ...hornA, ...hornB, ...hornC, ...boingA, ...boingB, ...boingC, ...strikeA, ...strikeB, ...strikeC];
