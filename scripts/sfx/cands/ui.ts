// Menu, pickup and race-sting candidates (28 Sept 2026, for Adam's ears; not installed): rouletteTick, itemReady,
// uiConfirm, uiBack, count and go, lap, finalLap. Re-aimed the same day at Adam's word on the vibe, "cool, and not
// corny, cheesy or cartoony": the countdown and the markers are clean, rounded tones (a sine with a touch of its
// octave and twelfth: the beep made well), real brass for the race's big moments (VSCO-2 CE staccato and sustained
// trumpets, horns, trombones, with timpani, bass drum, snare and cymbals: a real section, not a cartoon band), glass
// and real metal for sparkle; the mallets only where warmth helps (one menu option, the item reveal). Everything
// tuned exactly (measured pitches: scripts/sfx/tune.py) in the menus' G major, the title song's key. No two-note
// rising fourth anywhere (the famous coin's figure: docs/sops/audio.md, 27 Sept).
import type { Fx, Layer, Recipe } from '../types.ts';
import { END, held, hit, ke, syn, takes, tone, vs } from './kit.ts';

const M = 'Marimba', G = 'Glock', H = 'Strings/Harp', TP = 'Brass/Trumpet/stac', HN = 'Brass/F Horn/stac', TB = 'Brass/Tenor Trombone/stac';
/** sustained brass (VSCO-2 CE): a held chord's body under the staccato attack */
const TPS = 'Brass/Trumpet/sus', HNS = 'Brass/F Horn/sus', TBS = 'Brass/Tenor Trombone/sus';
/** a held G major brass chord from `at` for `len` s: trumpets G5, D5, B4 (the top with a staccato attack), horns D4, B3, G3, trombones G3, D3 */
const chordG = (at: number, len: number, db = 0) => [held(TP, 'G5', at, 0.3, db - 3), held(TPS, 'G5', at, len, db - 1), held(TPS, 'D5', at, len, db - 3), held(TPS, 'B4', at, len, db - 4),
  held(HNS, 'D4', at, len, db - 5), held(HNS, 'B3', at, len, db - 5), held(HNS, 'G3', at, len, db - 5), held(TBS, 'G3', at, len, db - 6), held(TBS, 'D3', at, len, db - 7)];
const PERC = 'VSCO 1 Percussion';
const CRASH = `${PERC}/varMetal/Cymbals/clash/crash_hit_ff_tight.wav`;
const SNARE = `${PERC}/drums/snare/drum1/snare1_f_1.wav`;
const KICK = `${PERC}/drums/bass/bdrum_ff_1.wav`;
const TIMP = 'Percussion/Timpani/Timpani1_Hit_v3_rr1_Sum.wav';
const hall = (mix: number, tail = 0.9): Fx => ({ op: 'room', mix, size: [14, 10, 6], absorb: 0.3, tail, tailLevel: 0.35, hp: 300, lp: 8000 });
const HZ: Record<string, number> = { G4: 392.0, B4: 493.88, D5: 587.33, G5: 783.99, A5: 880.0, B5: 987.77, D6: 1174.66, G6: 1567.98, A6: 1760.0, B6: 1975.53, D7: 2349.32, G7: 3135.96 };
/** a clean, rounded tone: a sine with a touch of its octave and twelfth, a 3 ms attack, a short bell-like ring */
const beep = (n: string, len: number, db: number, at = 0, pan = 0): Layer =>
  syn('tone', { seconds: len, wave: 'sine', hz: HZ[n], harmonics: [[2, 0.14], [3, 0.05]], env: [[0, 0], [0.003, 1], [len * 0.35, 0.7], [len, 0]] }, db, pan ? [{ op: 'pan', pos: pan }] : [], at);
/** a finger cymbal's ring (VSCO-2 CE) high-passed to a clean metallic shimmer */
const shing = (db: number, at: number, len = 0.5): Layer => vs(`${PERC}/varMetal/various/Fing_Cymb.wav`, db, [hit(0, len, -24, 0.3), { op: 'hp', hz: 3000 }, { op: 'fade', in: 0.004, out: len * 0.6 }], at);
/** Kenney's glass taps (Interface Sounds, CC0) */
const glass = (n: number, db: number, st = 0, at = 0): Layer => ke(`kenney_interface-sounds/Audio/glass_00${n}.ogg`, db, [{ op: 'pitch', st }, { op: 'hp', hz: 400 }], at);

// ---------------------------------------------------------------- rouletteTick (the item roulette: quick, then slowing; each cuts the last)
const TICK = 'One tick of the item roulette in a polished kart racing game (Mario Kart World quality): a tiny, crisp, tactile tick, like a prize wheel peg; it repeats fast then slows, each tick cutting the last, so it must be very short, bright and never harsh. No voice.';
const tickA = takes('tickA', 3, (k) => ({ id: 'rouletteTick', brief: TICK,
  why: "A, wood: a real wood click (VSCO-2 CE, CC0), a different stroke each take, with a hint of a marimba G7 under it for a note, 45 ms.",
  layers: [vs(`${PERC}/varWood/${['wood_click_f.wav', 'wood_click_f2.wav', 'wood_click_mp.wav'][k]}`, 0, [hit(0, 0.06, -20, 0.05), { op: 'hp', hz: 500 }]),
    tone(M, 'G7', 0.002, 0.05, -12)],
  master: [{ op: 'transient', attack: 2 }, ...END(0.06, 0.5)] }));
const tickB = takes('tickB', 3, (k) => ({ id: 'rouletteTick', brief: TICK,
  why: "B, clay chip: a real clay poker chip laid down (Kenney's Casino Audio, CC0), the click of a prize wheel's peg, a different chip each take, high-passed and cut to 55 ms.",
  layers: [ke(`kenney_casino-audio/Audio/chip-lay-${k + 1}.ogg`, 0, [hit(0, 0.07, -20, 0.05), { op: 'hp', hz: 700 }])],
  master: [...END(0.06, 0.5)] }));
const tickC = takes('tickC', 3, (k) => ({ id: 'rouletteTick', brief: TICK,
  why: "C, glass tick: a real glass tap (Kenney's Interface Sounds, CC0) cut to 40 ms with a faint clean tone under it (G6, B6, D7 across the takes), so a roll flickers like light off a spinning wheel; the most modern of the three.",
  layers: [glass(k + 1, 0, 2, 0), beep(['G6', 'B6', 'D7'][k], 0.05, -13)],
  master: [{ op: 'transient', attack: 2 }, ...END(0.055, 0.5)] }));

// ---------------------------------------------------------------- itemReady (the roulette stops: the item is revealed)
const READY = "The item roulette stops in a polished kart racing game (Mario Kart World quality) and the player's new item is revealed: a quick, bright rising sparkle landing on a clean chime, rewarding and cool, about a second. No voice.";
const readyA: Recipe[] = [{ id: 'itemReady', name: 'readyA', brief: READY,
  why: "A, glockenspiel glissando: a real glockenspiel swept up a pentatonic scale (VSCO-2 CE glissando, CC0), its first 0.4 s, landing on a G major chord of glockenspiel (G6, B6, D7) with a soft marimba G5 under it; a small hall.",
  layers: [vs('Miscellania Raw/Misc 2/glock_glisses/glock_fx_up_pentatonic_med_02.wav', 0, [hit(0, 0.42, -24, 0.5), { op: 'pitch', st: 2 }, { op: 'fade', out: 0.06 }]),
    tone(G, 'G6', 0.28, 0.9, -3, -0.2), tone(G, 'B6', 0.28, 0.9, -5, 0.2), tone(G, 'D7', 0.28, 0.9, -6), tone(M, 'G5', 0.28, 0.5, -6)],
  master: [hall(0.18, 0.8), ...END(1.1, 0.45)] }];
const readyB: Recipe[] = [{ id: 'itemReady', name: 'readyB', brief: READY,
  why: "B, harp and glass: a real harp swept up the G major chord, G4 to D6 (VSCO-2 CE, six plucks 35 ms apart), landing on a clean G6 and D7 (the tone the countdown uses) with a finger cymbal's shimmer; warm, elegant, not cute.",
  layers: [...['G4', 'B4', 'D5', 'G5', 'B5', 'D6'].map((n, i) => tone(H, n, i * 0.035, 0.7, -3 - i * 0.3, -0.3 + i * 0.12)),
    beep('G6', 0.8, -5, 0.21), beep('D7', 0.8, -8, 0.21, 0.2), shing(-14, 0.21)],
  master: [hall(0.2, 0.8), ...END(1.1, 0.45)] }];
const readyC: Recipe[] = [{ id: 'itemReady', name: 'readyC', brief: READY,
  why: "C, modern reveal: a quick rising swell of air (band-passed noise sweeping 1 to 8 kHz, 0.22 s) snapping onto a clean G major chord (G6, B6, D7: pure tones) with a glass tap (Kenney, CC0) for the snap and a finger cymbal's shimmer (VSCO-2 CE); the coolest of the three.",
  layers: [syn('whoosh', { seconds: 0.26, hz: [[0, 1000], [0.22, 8000]], q: 2.2, env: [[0, 0], [0.18, 1], [0.22, 0.3], [0.26, 0]], seed: 21, color: 'white' }, -8),
    glass(2, -6, 4, 0.22), beep('G6', 0.9, -2, 0.22, -0.15), beep('B6', 0.9, -5, 0.22, 0.15), beep('D7', 0.9, -7, 0.22), shing(-12, 0.22, 0.7)],
  master: [hall(0.16, 0.7), ...END(1.1, 0.45)] }];

// ---------------------------------------------------------------- uiConfirm and uiBack (the menus: with the marimba G6 menu tick)
const CONFIRM = 'Menu: an option is confirmed, in a polished kart racing game (Mario Kart World quality): a short, bright, clean musical confirm, tactile and premium, never harsh or cartoony; it goes with a soft marimba menu tick. No voice.';
const BACK = 'Menu: back or cancel, in a polished kart racing game (Mario Kart World quality): a short, soft, clean blip going down, clearly the opposite of confirm, never harsh or cartoony; it goes with a soft marimba menu tick. No voice.';
const confA: Recipe[] = [{ id: 'uiConfirm', name: 'confirmA', brief: CONFIRM,
  why: "A, warm: a soft marimba chord (G5, B5, D6: VSCO-2 CE) with a clean G6 on top, 10 ms rolled up, a small room: the menu tick's own instrument, a whole chord for yes.",
  layers: [tone(M, 'G5', 0, 0.35, -2), tone(M, 'B5', 0.01, 0.35, -3), tone(M, 'D6', 0.02, 0.35, -4), beep('G6', 0.3, -8, 0.03)],
  master: [{ op: 'room', mix: 0.12, size: [5, 4, 3], absorb: 0.45, tail: 0.3, tailLevel: 0.25, hp: 250, lp: 9000 }, ...END(0.4)] }];
const confB: Recipe[] = [{ id: 'uiConfirm', name: 'confirmB', brief: CONFIRM,
  why: "B, clean: two clean tones, B5 then D6 (a minor third up, 45 ms apart: pure sines with a touch of their octave), on a soft real click (Kenney's Interface Sounds, CC0); sleek and modern.",
  layers: [ke('kenney_interface-sounds/Audio/click_002.ogg', -10, [{ op: 'hp', hz: 1500 }]), beep('B5', 0.18, -2), beep('D6', 0.3, -1, 0.045)],
  master: [hall(0.08, 0.4), ...END(0.4)] }];
const confC: Recipe[] = [{ id: 'uiConfirm', name: 'confirmC', brief: CONFIRM,
  why: "C, glass: a real glass tap (Kenney's Interface Sounds, CC0) tuned up, with a clean G6 and D7 ringing under it; the brightest of the three.",
  layers: [glass(1, -2, 3), beep('G6', 0.3, -3, 0.005), beep('D7', 0.3, -7, 0.005)],
  master: [hall(0.1, 0.4), ...END(0.38)] }];
const backA: Recipe[] = [{ id: 'uiBack', name: 'backA', brief: BACK,
  why: "A, warm: marimba D6 down to G5 (VSCO-2 CE), 45 ms apart, softer than confirm.",
  layers: [tone(M, 'D6', 0, 0.2, -3), tone(M, 'G5', 0.045, 0.3, -2)],
  master: [{ op: 'lp', hz: 6000 }, { op: 'room', mix: 0.1, size: [5, 4, 3], absorb: 0.45, tail: 0.3, tailLevel: 0.25, hp: 250, lp: 9000 }, ...END(0.36)] }];
const backB: Recipe[] = [{ id: 'uiBack', name: 'backB', brief: BACK,
  why: "B, clean: two clean tones going down, D6 then B5 (the mirror of confirm B), softer, on a soft real click (Kenney, CC0).",
  layers: [ke('kenney_interface-sounds/Audio/click_003.ogg', -12, [{ op: 'hp', hz: 1500 }]), beep('D6', 0.15, -4), beep('B5', 0.28, -3, 0.045)],
  master: [{ op: 'lp', hz: 7000 }, hall(0.08, 0.4), ...END(0.36)] }];
const backC: Recipe[] = [{ id: 'uiBack', name: 'backC', brief: BACK,
  why: "C, glass: a real glass tap tuned down (Kenney, CC0) with a clean G5 under it; the mirror of confirm C.",
  layers: [glass(3, -3, -2), beep('G5', 0.28, -3, 0.005)],
  master: [{ op: 'lp', hz: 7000 }, hall(0.1, 0.4), ...END(0.34)] }];

// ---------------------------------------------------------------- count and go (a matched pair per candidate: the countdown on D, the go on G)
const COUNT = 'One countdown beep before the start of a race in a polished kart racing game (Mario Kart World quality): 3, 2, 1, one each second, heard by everyone: a clean, rounded, confident tone with a crisp attack and a short ring. Cool and premium, never cartoony. No voice.';
const GO = "GO at the start of a race in a polished kart racing game (Mario Kart World quality): the go tone, a fourth above the countdown's, resolves to the home chord, a bright punchy start hit with a cymbal, big, clean and exciting; the race music comes in right after. No voice.";
const countA: Recipe[] = [{ id: 'count', name: 'countA', brief: COUNT,
  why: "A, the beep made well: a clean rounded tone on D6 (a sine with a touch of its octave and twelfth, a 3 ms attack, a short bell-like ring), a glockenspiel D6's strike quietly under its attack and a faint FM shimmer (pair with goA).",
  layers: [beep('D6', 0.32, 0), tone(G, 'D6', 0, 0.3, -13), syn('fm', { seconds: 0.25, hz: HZ.D6, ratio: 3.5, index: [[0, 1.2], [0.2, 0]], env: [[0, 0], [0.002, 1], [0.25, 0]] }, -18)],
  master: [hall(0.08, 0.5), ...END(0.4)] }];
const goA: Recipe[] = [{ id: 'go', name: 'goA', brief: GO,
  why: "A, the pair of countA: the same clean tone a fourth up on G6 with its octave below, held longer, over a real brass stab (VSCO-2 CE trumpets and horns), a soft marimba chord for warmth and a real crash cymbal.",
  layers: [beep('G6', 0.9, 0), beep('G5', 0.9, -8), tone(M, 'G5', 0, 0.7, -10), tone(M, 'B5', 0, 0.7, -11), tone(M, 'D6', 0, 0.7, -12),
    held(TP, 'G5', 0, 0.3, -8), held(TP, 'D5', 0, 0.3, -10), held(HN, 'B4', 0, 0.3, -11), vs(CRASH, -9, [{ op: 'trim', to: 1.3 }, { op: 'fade', out: 0.8 }, { op: 'hp', hz: 300 }], 0.005)],
  master: [hall(0.12, 0.9), ...END(1.3, 0.55)] }];
const countB: Recipe[] = [{ id: 'count', name: 'countB', brief: COUNT,
  why: "B, brass: a real trumpet staccato D5 (VSCO-2 CE) over a real timpani stroke tuned toward D (VSCO-2 CE), a race official's call rather than a beep (pair with goB).",
  layers: [held(TP, 'D5', 0, 0.28, 0), vs('Percussion/Timpani/Timpani2_Hit_v4_rr1_Sum.wav', -8, [{ op: 'pitch', st: 4 }, { op: 'trim', to: 0.5 }, { op: 'fade', out: 0.3 }])],
  master: [hall(0.12, 0.7), ...END(0.5)] }];
const goB: Recipe[] = [{ id: 'go', name: 'goB', brief: GO,
  why: "B, the pair of countB: a real brass chord on G (trumpets, horns and trombones: VSCO-2 CE, staccato attack on sustained notes, held 0.9 s), a timpani stroke on G, a snare hit and a crash cymbal (VSCO-2 CE).",
  layers: [...chordG(0, 0.9, -1), vs(TIMP, -6, [{ op: 'pitch', st: 1 }, { op: 'trim', to: 0.9 }, { op: 'fade', out: 0.5 }]),
    vs(SNARE, -9, [{ op: 'trim', to: 0.3 }]), vs(CRASH, -7, [{ op: 'trim', to: 1.4 }, { op: 'fade', out: 0.8 }, { op: 'hp', hz: 300 }], 0.005)],
  master: [hall(0.18, 1.1), { op: 'comp', threshold: -14, ratio: 2, attack: 0.005, release: 0.15 }, ...END(1.4, 0.55)] }];
const countC: Recipe[] = [{ id: 'count', name: 'countC', brief: COUNT,
  why: "C, arena: the clean D6 tone with a deep kick under it (a real concert bass drum, VSCO-2 CE, low-passed: a heartbeat of tension before the start) (pair with goC).",
  layers: [beep('D6', 0.3, 0), vs(KICK, -5, [{ op: 'lp', hz: 180 }, { op: 'trim', to: 0.4 }, { op: 'fade', out: 0.25 }])],
  master: [hall(0.1, 0.6), ...END(0.45)] }];
const goC: Recipe[] = [{ id: 'go', name: 'goC', brief: GO,
  why: "C, the pair of countC: the clean tone a fourth up on G6 over the full brass chord (VSCO-2 CE), a real bass drum and a timpani stroke together for the launch, and a big crash cymbal; cinematic.",
  layers: [beep('G6', 1.0, -1), ...chordG(0, 0.9, -3), vs(KICK, -3, [{ op: 'lp', hz: 200 }, { op: 'trim', to: 0.6 }, { op: 'fade', out: 0.3 }]),
    vs(TIMP, -7, [{ op: 'pitch', st: 1 }, { op: 'trim', to: 0.9 }, { op: 'fade', out: 0.5 }]), vs(`${PERC}/varMetal/Cymbals/clash/crash_hit_fff_loose.wav`, -8, [{ op: 'trim', to: 1.4 }, { op: 'fade', out: 0.8 }, { op: 'hp', hz: 300 }], 0.005)],
  master: [hall(0.16, 1.1), { op: 'comp', threshold: -14, ratio: 2, attack: 0.005, release: 0.15 }, ...END(1.4, 0.55)] }];

// ---------------------------------------------------------------- lap and finalLap
const LAP = 'The player starts a new lap (not the last) in a polished kart racing game (Mario Kart World quality): a quick, bright, clean musical marker, once or twice a race; cool, never cartoony. No voice.';
const FINAL = 'The final lap in a polished kart racing game (Mario Kart World quality): a short, exciting brass fanfare while the race music pauses for two seconds and then comes back faster: a quick rising call landing on a bold chord with a cymbal. Heroic and cool. No voice.';
const lapA: Recipe[] = [{ id: 'lap', name: 'lapA', brief: LAP,
  why: "A, clean arpeggio: the countdown's clean tone up the G major chord, G6, B6, D7 (60 ms apart), the last ringing with a finger cymbal's shimmer (VSCO-2 CE); a small hall.",
  layers: [beep('G6', 0.25, -2, 0, -0.2), beep('B6', 0.25, -3, 0.06, 0.2), beep('D7', 0.7, -3, 0.12), shing(-15, 0.12)],
  master: [hall(0.15, 0.8), ...END(0.9, 0.45)] }];
const lapB: Recipe[] = [{ id: 'lap', name: 'lapB', brief: LAP,
  why: "B, a brass call: real trumpet staccato G4, B4, D5 (VSCO-2 CE, 70 ms apart), the last held and doubled by a horn, a clean D6 tone on top; a small hall.",
  layers: [held(TP, 'G4', 0, 0.1, -3), held(TP, 'B4', 0.07, 0.1, -3), held(TP, 'D5', 0.14, 0.3, -2), held(HN, 'B4', 0.14, 0.3, -7), beep('D6', 0.6, -10, 0.14)],
  master: [hall(0.18, 0.9), ...END(0.9, 0.45)] }];
const lapC: Recipe[] = [{ id: 'lap', name: 'lapC', brief: LAP,
  why: "C, swell and chord: a suspended cymbal's soft roll swelling in (VSCO-2 CE, 0.25 s) into a clean G major chord (G6, B6, D7) with a glass tap (Kenney, CC0) for the strike; airy and modern.",
  layers: [vs(`${PERC}/varMetal/Cymbals/susp/susp_hit_softmall_roll2_cresc.wav`, -10, [{ op: 'trim', from: 1.0, to: 1.3 }, { op: 'hp', hz: 1500 }, { op: 'env', pts: [[0, 0.2], [0.25, 1], [0.3, 0]] }]),
    glass(2, -8, 2, 0.25), beep('G6', 0.7, -2, 0.25), beep('B6', 0.7, -5, 0.25), beep('D7', 0.7, -6, 0.25)],
  master: [hall(0.15, 0.8), ...END(1.0, 0.45)] }];
// the final lap: 2.1 s (samples.ts FANFARE_SECONDS: the music comes back after it)
const finalA: Recipe[] = [{ id: 'finalLap', name: 'finalA', brief: FINAL,
  why: "A, brass fanfare: real trumpets in thirds rising G4-B4-D5 (a triplet, VSCO-2 CE staccato) to a bold G major chord of trumpets, horns and trombones (staccato attack, sustained body, held 1.5 s) with a timpani stroke, a snare pickup and a crash cymbal; a hall.",
  layers: [held(TP, 'G4', 0, 0.12, -3), held(TP, 'B4', 0.1, 0.12, -3), held(TP, 'D5', 0.2, 0.12, -3), held(TP, 'B4', 0, 0.12, -7), held(TP, 'D5', 0.1, 0.12, -7), held(TP, 'F#5', 0.2, 0.12, -7),
    ...chordG(0.34, 1.5), vs(SNARE, -12, [{ op: 'trim', to: 0.2 }], 0.22), vs(SNARE, -10, [{ op: 'trim', to: 0.2 }], 0.28),
    vs(TIMP, -5, [{ op: 'pitch', st: 1 }, { op: 'trim', to: 1.4 }, { op: 'fade', out: 0.8 }], 0.34), vs(CRASH, -7, [{ op: 'trim', to: 1.7 }, { op: 'fade', out: 1.0 }, { op: 'hp', hz: 300 }], 0.345)],
  master: [hall(0.22, 1.3), { op: 'comp', threshold: -14, ratio: 2, attack: 0.005, release: 0.15 }, ...END(2.1, 0.5)] }];
const finalB: Recipe[] = [{ id: 'finalLap', name: 'finalB', brief: FINAL,
  why: "B, fanfare with a run: a harp run up the G major scale (VSCO-2 CE) leading into two real brass hits, D major then G major (trumpets, horns, trombones: V to I), each with a timpani stroke, the last held with a crash cymbal; a hall.",
  layers: [...['G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F#5', 'G5'].map((n, i) => tone(H, n, i * 0.03, 0.4, -6)),
    held(TP, 'A5', 0.3, 0.2, -2), held(TP, 'F#5', 0.3, 0.2, -4), held(HN, 'D5', 0.3, 0.2, -5), held(TB, 'D3', 0.3, 0.2, -5),
    vs('Percussion/Timpani/Timpani2_Hit_v4_rr1_Sum.wav', -7, [{ op: 'pitch', st: 4 }, { op: 'trim', to: 0.4 }, { op: 'fade', out: 0.2 }], 0.3),
    held(TP, 'B5', 0.55, 0.3, -2), ...chordG(0.55, 1.3),
    vs(TIMP, -5, [{ op: 'pitch', st: 1 }, { op: 'trim', to: 1.2 }, { op: 'fade', out: 0.7 }], 0.55), vs(CRASH, -7, [{ op: 'trim', to: 1.5 }, { op: 'fade', out: 0.9 }, { op: 'hp', hz: 300 }], 0.555)],
  master: [hall(0.22, 1.3), { op: 'comp', threshold: -14, ratio: 2, attack: 0.005, release: 0.15 }, ...END(2.1, 0.5)] }];
const finalC: Recipe[] = [{ id: 'finalLap', name: 'finalC', brief: FINAL,
  why: "C, drums and brass: a real snare roll-in and bass drum hits (VSCO-2 CE) driving a trumpet call G5-D5-G5 over horns into the held brass chord with a timpani stroke and a big crash cymbal; cinematic and driving.",
  layers: [vs(SNARE, -12, [{ op: 'trim', to: 0.15 }], 0), vs(SNARE, -11, [{ op: 'trim', to: 0.15 }], 0.07), vs(SNARE, -9, [{ op: 'trim', to: 0.2 }], 0.14),
    vs(KICK, -6, [{ op: 'lp', hz: 200 }, { op: 'trim', to: 0.3 }, { op: 'fade', out: 0.15 }], 0.2), vs(KICK, -6, [{ op: 'lp', hz: 200 }, { op: 'trim', to: 0.3 }, { op: 'fade', out: 0.15 }], 0.32),
    held(TP, 'G5', 0.2, 0.12, -2), held(TP, 'D5', 0.32, 0.12, -3), ...chordG(0.44, 1.4, -1),
    vs(KICK, -3, [{ op: 'lp', hz: 200 }, { op: 'trim', to: 0.6 }, { op: 'fade', out: 0.3 }], 0.44), vs(TIMP, -6, [{ op: 'pitch', st: 1 }, { op: 'trim', to: 1.3 }, { op: 'fade', out: 0.8 }], 0.44),
    vs(`${PERC}/varMetal/Cymbals/clash/crash_hit_fff_loose.wav`, -8, [{ op: 'trim', to: 1.6 }, { op: 'fade', out: 1.0 }, { op: 'hp', hz: 300 }], 0.445)],
  master: [hall(0.2, 1.2), { op: 'comp', threshold: -14, ratio: 2, attack: 0.005, release: 0.15 }, ...END(2.1, 0.5)] }];

export const RECIPES: readonly Recipe[] = [...tickA, ...tickB, ...tickC, ...readyA, ...readyB, ...readyC, ...confA, ...confB, ...confC, ...backA, ...backB, ...backC,
  ...countA, ...goA, ...countB, ...goB, ...countC, ...goC, ...lapA, ...lapB, ...lapC, ...finalA, ...finalB, ...finalC];
