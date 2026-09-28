// Menu, pickup and race-sting candidates (28 Sept 2026, for Adam's ears; not installed): rouletteTick, itemReady,
// uiConfirm, uiBack, count and go, lap, finalLap. One musical family: real orchestral instruments (VSCO-2 CE, CC0:
// marimba, xylophone, glockenspiel, harp, trumpet, horn, trombone, timpani, cymbals, wood clicks) tuned exactly
// (measured pitches: scripts/sfx/tune.py) in the menus' G major, the title song's key, as the menu tick already is.
// No two-note rising fourth anywhere (the famous coin's figure: docs/sops/audio.md, 27 Sept).
import type { Fx, Recipe } from '../types.ts';
import { END, fs, held, hit, ke, ROOM, takes, tone, vs } from './kit.ts';

const M = 'Marimba', X = 'Xylo', G = 'Glock', H = 'Strings/Harp', TP = 'Brass/Trumpet/stac', HN = 'Brass/F Horn/stac', TB = 'Brass/Tenor Trombone/stac';
/** sustained brass (VSCO-2 CE): a held chord's body under the staccato attack */
const TPS = 'Brass/Trumpet/sus', HNS = 'Brass/F Horn/sus', TBS = 'Brass/Tenor Trombone/sus';
/** a held G major brass chord from `at` for `len` s: trumpets G5, D5, B4 (the top with a staccato attack), horns D4, B3, G3, trombones G3, D3 */
const chordG = (at: number, len: number, db = 0) => [held(TP, 'G5', at, 0.3, db - 3), held(TPS, 'G5', at, len, db - 1), held(TPS, 'D5', at, len, db - 3), held(TPS, 'B4', at, len, db - 4),
  held(HNS, 'D4', at, len, db - 5), held(HNS, 'B3', at, len, db - 5), held(HNS, 'G3', at, len, db - 5), held(TBS, 'G3', at, len, db - 6), held(TBS, 'D3', at, len, db - 7)];
const CRASH = 'VSCO 1 Percussion/varMetal/Cymbals/clash/crash_hit_ff_tight.wav';
const SNARE = 'VSCO 1 Percussion/drums/snare/drum1/snare1_f_1.wav';
const hall = (mix: number, tail = 0.9): Fx => ({ op: 'room', mix, size: [14, 10, 6], absorb: 0.3, tail, tailLevel: 0.35, hp: 300, lp: 8000 });

// ---------------------------------------------------------------- rouletteTick (the item roulette: quick, then slowing; each cuts the last)
const TICK = 'One tick of the item roulette in a polished cartoon kart racing game (Mario Kart World quality): a tiny, crisp, tactile tock, like a prize wheel peg; it repeats fast then slows, each tick cutting the last, so it must be very short, bright and never harsh. No voice.';
const tickA = takes('tickA', 3, (k) => ({ id: 'rouletteTick', brief: TICK,
  why: "A, wood: a real wood click (VSCO-2 CE, CC0), a different stroke each take, with a hint of a marimba G7 under it for a note, 45 ms.",
  layers: [vs(`VSCO 1 Percussion/varWood/${['wood_click_f.wav', 'wood_click_f2.wav', 'wood_click_mp.wav'][k]}`, 0, [hit(0, 0.06, -20, 0.05), { op: 'hp', hz: 500 }]),
    tone(M, 'G7', 0.002, 0.05, -12)],
  master: [{ op: 'transient', attack: 2 }, ...END(0.06, 0.5)] }));
const tickB = takes('tickB', 3, (k) => ({ id: 'rouletteTick', brief: TICK,
  why: "B, clay chip: a real clay poker chip laid down (Kenney's Casino Audio, CC0), the click of a prize wheel's peg, a different chip each take, high-passed and cut to 55 ms.",
  layers: [ke(`kenney_casino-audio/Audio/chip-lay-${k + 1}.ogg`, 0, [hit(0, 0.07, -20, 0.05), { op: 'hp', hz: 700 }])],
  master: [...END(0.06, 0.5)] }));
const tickC = takes('tickC', 3, (k) => ({ id: 'rouletteTick', brief: TICK,
  why: "C, a note a tick: a hard-mallet marimba note (VSCO-2 CE) on a real claves click, G6, A6 and B6 across the takes, so a roll picked at random flickers like a spinning wheel's pegs.",
  layers: [tone(M, ['G6', 'A6', 'B6'][k], 0, 0.06, 0, 0, [{ op: 'hp', hz: 800 }]), vs('VSCO 1 Percussion/varWood/claves_mf.wav', -7, [hit(0, 0.04, -20, 0.05), { op: 'hp', hz: 1500 }])],
  master: [{ op: 'transient', attack: 3 }, ...END(0.065, 0.5)] }));

// ---------------------------------------------------------------- itemReady (the roulette stops: the item is revealed)
const READY = "The item roulette stops in a polished cartoon kart racing game (Mario Kart World quality) and the player's new item is revealed: a quick, bright rising sparkle landing on a happy chime, magical and rewarding, about a second. No voice.";
const readyA: Recipe[] = [{ id: 'itemReady', name: 'readyA', brief: READY,
  why: "A, glockenspiel glissando: a real glockenspiel swept up a pentatonic scale (VSCO-2 CE glissando, CC0), its first 0.3 s, landing on a G major chord of glockenspiel (G6, B6, D7) with a soft marimba G5 under it and a few wind chimes on top; a small hall.",
  layers: [vs('Miscellania Raw/Misc 2/glock_glisses/glock_fx_up_pentatonic_med_02.wav', 0, [hit(0, 0.42, -24, 0.5), { op: 'pitch', st: 2 }, { op: 'fade', out: 0.06 }]),
    tone(G, 'G6', 0.28, 0.9, -3, -0.2), tone(G, 'B6', 0.28, 0.9, -5, 0.2), tone(G, 'D7', 0.28, 0.9, -6), tone(M, 'G5', 0.28, 0.5, -6),
    vs('VSCO 1 Percussion/varMetal/various/windchimes_asc1.wav', -18, [{ op: 'trim', from: 0.2, to: 0.8 }, { op: 'hp', hz: 3000 }, { op: 'fade', in: 0.05, out: 0.3 }], 0.3)],
  master: [hall(0.18, 0.8), ...END(1.1, 0.45)] }];
const readyB: Recipe[] = [{ id: 'itemReady', name: 'readyB', brief: READY,
  why: "B, harp: a real harp swept up the G major chord, G4 to D6 (VSCO-2 CE, six plucks 35 ms apart), landing on a glockenspiel G6 and D7 ringing; warm and magical.",
  layers: [...['G4', 'B4', 'D5', 'G5', 'B5', 'D6'].map((n, i) => tone(H, n, i * 0.035, 0.7, -3 - i * 0.3, -0.3 + i * 0.12)),
    tone(G, 'G6', 0.21, 0.9, -4), tone(G, 'D7', 0.21, 0.9, -7, 0.2)],
  master: [hall(0.2, 0.8), ...END(1.1, 0.45)] }];
const readyC: Recipe[] = [{ id: 'itemReady', name: 'readyC', brief: READY,
  why: "C, mallet run: marimba and xylophone up the G major chord, G5 to G7, 40 ms a note (VSCO-2 CE), a real bell tree swept under it (VSCO-2 CE), landing on a xylophone G7 and glockenspiel B6.",
  layers: [...['G5', 'B5', 'D6', 'G6', 'B6'].map((n, i) => tone(i < 3 ? M : X, n, i * 0.04, 0.3, -3 - i * 0.2)),
    tone(X, 'G7', 0.2, 0.5, -4), tone(G, 'B6', 0.2, 0.8, -7),
    vs('VSCO 1 Percussion/varMetal/various/bell_tree_scrape1.wav', -14, [{ op: 'trim', to: 0.7 }, { op: 'hp', hz: 2500 }, { op: 'fade', out: 0.3 }], 0.0)],
  master: [hall(0.16, 0.7), ...END(1.0, 0.45)] }];

// ---------------------------------------------------------------- uiConfirm and uiBack (the menus: with the marimba G6 menu tick)
const CONFIRM = 'Menu: an option is confirmed, in a polished cartoon kart racing game (Mario Kart World quality): a short, bright, cheerful musical chime, tactile and premium, never harsh; it goes with a soft marimba menu tick. No voice.';
const BACK = 'Menu: back or cancel, in a polished cartoon kart racing game (Mario Kart World quality): a short, soft, friendly musical blip going down, clearly the opposite of confirm, never harsh; it goes with a soft marimba menu tick. No voice.';
const confA: Recipe[] = [{ id: 'uiConfirm', name: 'confirmA', brief: CONFIRM,
  why: "A, a warm pling: a soft marimba chord (G5, B5, D6: VSCO-2 CE) with a xylophone G6 on top, 10 ms rolled up, a small room: the menu tick's own instrument, a whole chord for yes.",
  layers: [tone(M, 'G5', 0, 0.35, -2), tone(M, 'B5', 0.01, 0.35, -3), tone(M, 'D6', 0.02, 0.35, -4), tone(X, 'G6', 0.03, 0.3, -6)],
  master: [ROOM(0.12, 0.3), ...END(0.4)] }];
const confB: Recipe[] = [{ id: 'uiConfirm', name: 'confirmB', brief: CONFIRM,
  why: "B, a sparkling yes: a glockenspiel grace note B6 into D7 (a minor third up, 35 ms apart) over a soft marimba G5 (VSCO-2 CE), a small room.",
  layers: [tone(G, 'B6', 0, 0.3, -3, -0.15), tone(G, 'D7', 0.035, 0.45, -2, 0.15), tone(M, 'G5', 0.035, 0.3, -6)],
  master: [ROOM(0.12, 0.3), ...END(0.45)] }];
const confC: Recipe[] = [{ id: 'uiConfirm', name: 'confirmC', brief: CONFIRM,
  why: "C, a quick run: marimba B5, D6 then G6 (a G major arpeggio, 40 ms apart: VSCO-2 CE), the last doubled on glockenspiel, snappy and bright.",
  layers: [tone(M, 'B5', 0, 0.2, -3), tone(M, 'D6', 0.04, 0.2, -3), tone(M, 'G6', 0.08, 0.3, -2), tone(G, 'G6', 0.08, 0.35, -9)],
  master: [ROOM(0.12, 0.3), ...END(0.45)] }];
const backA: Recipe[] = [{ id: 'uiBack', name: 'backA', brief: BACK,
  why: "A, a falling fifth: marimba D6 down to G5 (VSCO-2 CE), 45 ms apart, softer than confirm.",
  layers: [tone(M, 'D6', 0, 0.2, -3), tone(M, 'G5', 0.045, 0.3, -2)],
  master: [{ op: 'lp', hz: 6000 }, ROOM(0.1, 0.3), ...END(0.36)] }];
const backB: Recipe[] = [{ id: 'uiBack', name: 'backB', brief: BACK,
  why: "B, a soft tok: a low marimba G4 (VSCO-2 CE) under a real wood click (VSCO-2 CE), round and brief.",
  layers: [tone(M, 'G4', 0, 0.3, -1), vs('VSCO 1 Percussion/varWood/wood_click_mp.wav', -10, [hit(0, 0.05, -20, 0.05), { op: 'lp', hz: 4000 }])],
  master: [ROOM(0.1, 0.3), ...END(0.32)] }];
const backC: Recipe[] = [{ id: 'uiBack', name: 'backC', brief: BACK,
  why: "C, a falling third: marimba B5 down to G5 (VSCO-2 CE) 40 ms apart, the second note a touch longer, the mirror of confirm C's run.",
  layers: [tone(M, 'B5', 0, 0.18, -3), tone(M, 'G5', 0.04, 0.3, -2)],
  master: [{ op: 'lp', hz: 7000 }, ROOM(0.1, 0.3), ...END(0.35)] }];

// ---------------------------------------------------------------- count and go (a matched pair per candidate: the countdown on D, the go on G)
const COUNT = 'One countdown beep before the start of a race in a polished cartoon kart racing game (Mario Kart World quality): 3, 2, 1, one each second, heard by everyone: a clean, rounded, confident musical tone with a crisp attack and a short ring. No voice.';
const GO = 'GO at the start of a race in a polished cartoon kart racing game (Mario Kart World quality): the tone an octave and a fourth above the countdown resolves to the home chord, a bright punchy start hit with a cymbal, big, clean and exciting; the race music comes in right after. No voice.';
const countA: Recipe[] = [{ id: 'count', name: 'countA', brief: COUNT,
  why: "A, mallet bell: a marimba D6 doubled by a glockenspiel D6 an octave of sparkle above it and a soft xylophone D5 body (VSCO-2 CE), rounded and bright; the countdown sits on D, the dominant, so the go on G resolves it (pair with goA).",
  layers: [tone(M, 'D6', 0, 0.4, -1), tone(G, 'D6', 0, 0.5, -8), tone(X, 'D5', 0, 0.3, -9)],
  master: [hall(0.1, 0.6), ...END(0.45)] }];
const goA: Recipe[] = [{ id: 'go', name: 'goA', brief: GO,
  why: "A, the pair of countA: a G major chord struck at once on marimba and glockenspiel (G5, B5, D6, G6), a real trumpet and horn stab on G (VSCO-2 CE staccato brass), a real crash cymbal (VSCO-2 CE) ringing out; the countdown's D resolves to G.",
  layers: [tone(M, 'G5', 0, 0.8, -3), tone(M, 'B5', 0, 0.8, -4), tone(M, 'D6', 0, 0.8, -5), tone(G, 'G6', 0, 1.0, -3),
    held(TP, 'G5', 0, 0.4, -5), held(TP, 'D5', 0, 0.4, -7), held(HN, 'G4', 0, 0.4, -7), held(HN, 'B3', 0, 0.4, -9),
    vs(CRASH, -8, [{ op: 'trim', to: 1.4 }, { op: 'fade', out: 0.8 }, { op: 'hp', hz: 300 }], 0.005)],
  master: [hall(0.15, 1.0), { op: 'comp', threshold: -14, ratio: 2, attack: 0.005, release: 0.15 }, ...END(1.4, 0.55)] }];
const countB: Recipe[] = [{ id: 'count', name: 'countB', brief: COUNT,
  why: "B, brass: a real trumpet staccato D5 (VSCO-2 CE) over a real timpani stroke tuned toward D (VSCO-2 CE), a race official's call rather than a beep (pair with goB).",
  layers: [held(TP, 'D5', 0, 0.28, 0), vs('Percussion/Timpani/Timpani2_Hit_v4_rr1_Sum.wav', -8, [{ op: 'pitch', st: 4 }, { op: 'trim', to: 0.5 }, { op: 'fade', out: 0.3 }])],
  master: [hall(0.12, 0.7), ...END(0.5)] }];
const goB: Recipe[] = [{ id: 'go', name: 'goB', brief: GO,
  why: "B, the pair of countB: a real brass chord on G (trumpets, horns and trombones: VSCO-2 CE, staccato attack on sustained notes, held 0.9 s), a timpani stroke on G, a snare hit and a crash cymbal (VSCO-2 CE).",
  layers: [...chordG(0, 0.9, -1),
    vs('Percussion/Timpani/Timpani1_Hit_v3_rr1_Sum.wav', -6, [{ op: 'pitch', st: 1 }, { op: 'trim', to: 0.9 }, { op: 'fade', out: 0.5 }]),
    vs(SNARE, -9, [{ op: 'trim', to: 0.3 }]), vs(CRASH, -7, [{ op: 'trim', to: 1.4 }, { op: 'fade', out: 0.8 }, { op: 'hp', hz: 300 }], 0.005)],
  master: [hall(0.18, 1.1), { op: 'comp', threshold: -14, ratio: 2, attack: 0.005, release: 0.15 }, ...END(1.4, 0.55)] }];
const countC: Recipe[] = [{ id: 'count', name: 'countC', brief: COUNT,
  why: "C, glass bell: a glockenspiel D6 and a xylophone D6 struck together (VSCO-2 CE) with a harp D5 under them for warmth: a clear, glassy, premium tone (pair with goC).",
  layers: [tone(G, 'D6', 0, 0.6, -2), tone(X, 'D6', 0, 0.3, -4), tone(H, 'D5', 0, 0.5, -6)],
  master: [hall(0.12, 0.7), ...END(0.5)] }];
const goC: Recipe[] = [{ id: 'go', name: 'goC', brief: GO,
  why: "C, the pair of countC: glockenspiel and xylophone G6 with a harp sweep up the G major chord under them (VSCO-2 CE) and a real crash cymbal: bright, sparkling, a starting gun made of bells.",
  layers: [tone(G, 'G6', 0, 1.2, -1), tone(X, 'G6', 0, 0.4, -3), tone(G, 'B6', 0.03, 1.0, -7),
    ...['G3', 'B3', 'D4', 'G4', 'B4', 'D5'].map((n, i) => tone(H, n, i * 0.02, 0.9, -5 - i * 0.3)),
    vs(CRASH, -8, [{ op: 'trim', to: 1.4 }, { op: 'fade', out: 0.8 }, { op: 'hp', hz: 300 }], 0.005)],
  master: [hall(0.16, 1.0), ...END(1.4, 0.55)] }];

// ---------------------------------------------------------------- lap and finalLap
const LAP = 'The player starts a new lap (not the last) in a polished cartoon kart racing game (Mario Kart World quality): a quick, friendly, bright musical marker, once or twice a race. No voice.';
const FINAL = 'The final lap in a polished cartoon kart racing game (Mario Kart World quality): a short, exciting brass fanfare while the race music pauses for two seconds and then comes back faster: a quick rising call landing on a bold chord with a cymbal. Heroic and fun. No voice.';
const lapA: Recipe[] = [{ id: 'lap', name: 'lapA', brief: LAP,
  why: "A, mallet flourish: marimba up the G major chord G5, B5, D6 (VSCO-2 CE, 50 ms apart) into a glockenspiel and xylophone G6 that rings; a small hall.",
  layers: [tone(M, 'G5', 0, 0.2, -3), tone(M, 'B5', 0.05, 0.2, -3), tone(M, 'D6', 0.1, 0.2, -3), tone(G, 'G6', 0.15, 0.8, -2), tone(X, 'G6', 0.15, 0.35, -5)],
  master: [hall(0.15, 0.8), ...END(0.9, 0.45)] }];
const lapB: Recipe[] = [{ id: 'lap', name: 'lapB', brief: LAP,
  why: "B, a brass call: real trumpet staccato G4, B4, D5 (VSCO-2 CE, 70 ms apart), the last held and doubled by a horn, a glockenspiel D6 on top; a small hall.",
  layers: [held(TP, 'G4', 0, 0.1, -3), held(TP, 'B4', 0.07, 0.1, -3), held(TP, 'D5', 0.14, 0.3, -2), held(HN, 'B4', 0.14, 0.3, -7), tone(G, 'D6', 0.14, 0.7, -8)],
  master: [hall(0.18, 0.9), ...END(0.9, 0.45)] }];
const lapC: Recipe[] = [{ id: 'lap', name: 'lapC', brief: LAP,
  why: "C, a shimmer and a ding: a real bell tree swept down (VSCO-2 CE) into a glockenspiel G major chord (G6, B6, D7) struck together, bright and airy.",
  layers: [vs('VSCO 1 Percussion/varMetal/various/bell_tree_scrape2.wav', -8, [{ op: 'trim', to: 0.35 }, { op: 'hp', hz: 2000 }, { op: 'fade', out: 0.15 }]),
    tone(G, 'G6', 0.18, 0.9, -2), tone(G, 'B6', 0.18, 0.9, -4), tone(G, 'D7', 0.18, 0.9, -5), tone(M, 'G5', 0.18, 0.4, -7)],
  master: [hall(0.15, 0.8), ...END(1.0, 0.45)] }];
// the final lap: 2.1 s (samples.ts FANFARE_SECONDS: the music comes back after it)
const finalA: Recipe[] = [{ id: 'finalLap', name: 'finalA', brief: FINAL,
  why: "A, brass fanfare: real trumpets in thirds rising G4-B4-D5 (a triplet, VSCO-2 CE staccato) to a bold G major chord of trumpets, horns and trombones (staccato attack, sustained body, held 1.5 s) with a timpani stroke, a snare pickup and a crash cymbal; a hall.",
  layers: [held(TP, 'G4', 0, 0.12, -3), held(TP, 'B4', 0.1, 0.12, -3), held(TP, 'D5', 0.2, 0.12, -3), held(TP, 'B4', 0, 0.12, -7), held(TP, 'D5', 0.1, 0.12, -7), held(TP, 'F#5', 0.2, 0.12, -7),
    ...chordG(0.34, 1.5),
    vs(SNARE, -12, [{ op: 'trim', to: 0.2 }], 0.22), vs(SNARE, -10, [{ op: 'trim', to: 0.2 }], 0.28),
    vs('Percussion/Timpani/Timpani1_Hit_v3_rr1_Sum.wav', -5, [{ op: 'pitch', st: 1 }, { op: 'trim', to: 1.4 }, { op: 'fade', out: 0.8 }], 0.34),
    vs(CRASH, -7, [{ op: 'trim', to: 1.7 }, { op: 'fade', out: 1.0 }, { op: 'hp', hz: 300 }], 0.345)],
  master: [hall(0.22, 1.3), { op: 'comp', threshold: -14, ratio: 2, attack: 0.005, release: 0.15 }, ...END(2.1, 0.5)] }];
const finalB: Recipe[] = [{ id: 'finalLap', name: 'finalB', brief: FINAL,
  why: "B, fanfare with a run: a harp and glockenspiel run up the G major scale (VSCO-2 CE) leading into two real brass hits, D major then G major (trumpets, horns, trombones staccato: V to I), each with a timpani stroke, the last with a crash cymbal; a hall.",
  layers: [...['G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F#5', 'G5'].map((n, i) => tone(H, n, i * 0.03, 0.4, -6)), ...['G6', 'A6', 'B6', 'C7', 'D7'].map((n, i) => tone(G, n, 0.09 + i * 0.03, 0.3, -12)),
    held(TP, 'A5', 0.3, 0.2, -2), held(TP, 'F#5', 0.3, 0.2, -4), held(HN, 'D5', 0.3, 0.2, -5), held(TB, 'D3', 0.3, 0.2, -5),
    vs('Percussion/Timpani/Timpani2_Hit_v4_rr1_Sum.wav', -7, [{ op: 'pitch', st: 4 }, { op: 'trim', to: 0.4 }, { op: 'fade', out: 0.2 }], 0.3),
    held(TP, 'B5', 0.55, 0.3, -2), ...chordG(0.55, 1.3),
    vs('Percussion/Timpani/Timpani1_Hit_v3_rr1_Sum.wav', -5, [{ op: 'pitch', st: 1 }, { op: 'trim', to: 1.2 }, { op: 'fade', out: 0.7 }], 0.55),
    vs(CRASH, -7, [{ op: 'trim', to: 1.5 }, { op: 'fade', out: 0.9 }, { op: 'hp', hz: 300 }], 0.555)],
  master: [hall(0.22, 1.3), { op: 'comp', threshold: -14, ratio: 2, attack: 0.005, release: 0.15 }, ...END(2.1, 0.5)] }];
const finalC: Recipe[] = [{ id: 'finalLap', name: 'finalC', brief: FINAL,
  why: "C, bells and brass: a real snare roll-in (three strokes), a trumpet call G5-D5-G5 over horns (VSCO-2 CE), then glockenspiel and marimba ringing the G major chord with a crash; lighter and sparklier than A.",
  layers: [vs(SNARE, -12, [{ op: 'trim', to: 0.15 }], 0), vs(SNARE, -11, [{ op: 'trim', to: 0.15 }], 0.07), vs(SNARE, -9, [{ op: 'trim', to: 0.2 }], 0.14),
    held(TP, 'G5', 0.2, 0.12, -2), held(TP, 'D5', 0.32, 0.12, -3), held(TP, 'G5', 0.44, 0.5, -1), held(HN, 'B4', 0.44, 0.5, -5), held(HN, 'G4', 0.44, 0.5, -5),
    tone(G, 'G6', 0.44, 1.4, -4), tone(G, 'B6', 0.44, 1.4, -6), tone(G, 'D7', 0.44, 1.4, -7), tone(M, 'G5', 0.44, 0.8, -6),
    vs(CRASH, -8, [{ op: 'trim', to: 1.6 }, { op: 'fade', out: 1.0 }, { op: 'hp', hz: 300 }], 0.445)],
  master: [hall(0.2, 1.2), ...END(2.1, 0.5)] }];

export const RECIPES: readonly Recipe[] = [...tickA, ...tickB, ...tickC, ...readyA, ...readyB, ...readyC, ...confA, ...confB, ...confC, ...backA, ...backB, ...backC,
  ...countA, ...goA, ...countB, ...goB, ...countC, ...goC, ...lapA, ...lapB, ...lapC, ...finalA, ...finalB, ...finalC];
