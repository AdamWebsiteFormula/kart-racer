// Course ambience candidates (28 Sept 2026, for Adam's ears; not installed, and the game has no ambience layer yet):
// one quiet, seamless bed per course under the engines, from CC0 field recordings on Freesound (each stretch scanned
// for human voices first: scripts/sfx/voicescan.py; design §6: no crowd sound) and a touch of synthesis. 24 s loops,
// their wrap crossfaded over 2 s so no seam can be heard; a few sparse events (a gull, a windmill's creak, a coaster's
// chain lift) placed so the loop never announces itself.
import type { Fx, Recipe } from '../types.ts';
import { fs, syn } from './kit.ts';

const LOOP = 24, XF = 2.0, SEC = LOOP + XF + 0.5;
/** a steady bed: a stretch of a field recording, faded in and out only where the loop's crossfade hides it */
const bed = (id: number, from: number, db: number, fx: Fx[] = []) => fs(id, db, [{ op: 'trim', from, to: from + SEC }, ...fx]);
/** a single event placed in the loop, distant: low-passed, panned, a touch of room */
const event = (id: number, from: number, to: number, at: number, db: number, pan: number, lp = 5000, fx: Fx[] = []) =>
  fs(id, db, [{ op: 'trim', from, to }, { op: 'fade', in: 0.05, out: 0.3 }, { op: 'lp', hz: lp }, ...fx, { op: 'pan', pos: pan }], at);
const MASTER: Fx[] = [{ op: 'hp', hz: 40 }, { op: 'comp', threshold: -24, ratio: 2, attack: 0.2, release: 1.5 }, { op: 'limit', ceiling: -1 }];
const why = (s: string) => `${s} A 24 s loop, its wrap crossfaded over 2 s; every stretch scanned for voices by AST (scripts/sfx/voicescan.py).`;

export const RECIPES: readonly Recipe[] = [
  { id: 'ambience-harbour-loop', name: 'ambHarbourA', loop: LOOP, xfade: XF,
    brief: 'The ambient bed of Lighthouse Loop, a sunny seaside harbor course in a polished cartoon kart racing game: gentle surf rolling in and a few distant gulls, quiet under the engines and music. No voices, no crowd.',
    why: why("Lighthouse Loop: calm real surf (SamsterBirdies, 'Calm ocean waves', CC0) with a light onshore breeze under it (felix.blume, prairie wind, CC0), and two distant gull calls (nigelcoop, 'Seagull trill and whine', CC0; the second a little lower), low-passed and panned."),
    layers: [bed(578524, 20, 0), bed(215414, 40, -16, [{ op: 'lp', hz: 3000 }]),
      event(75195, 0, 1.9, 5.5, -11, -0.5, 6000), event(75195, 0, 1.9, 15.5, -14, 0.55, 5000, [{ op: 'pitch', st: -1.5 }])],
    master: MASTER },
  { id: 'ambience-meadow-run', name: 'ambMeadowA', loop: LOOP, xfade: XF,
    brief: 'The ambient bed of Windmill Run, a countryside course of meadows and windmills in a polished cartoon kart racing game: a warm breeze, birdsong and insects, and now and then the far creak of a windmill turning, quiet under the engines and music. No voices.',
    why: why("Windmill Run: a real summer meadow, birds and insects (baryy, 'Summer Meadow', CC0), a warm breeze in tall grass (felix.blume, CC0), and a windmill's slow creak twice a loop (felix.blume, 'A windmill is squeaking alone in the desert', CC0), far off: low-passed at 2.5 kHz and panned."),
    layers: [bed(409143, 34, 0, [{ op: 'hp', hz: 150 }, { op: 'transient', attack: -8 }]), bed(215414, 70, -7, [{ op: 'lp', hz: 4000 }]),
      event(131924, 40.0, 42.2, 4.0, -16, -0.6, 2500, [{ op: 'reverb', seconds: 1.2, mix: 0.25 }]), event(131924, 60.0, 62.0, 16.0, -18, -0.5, 2500, [{ op: 'reverb', seconds: 1.2, mix: 0.25 }])],
    master: MASTER },
  { id: 'ambience-canyon-rush', name: 'ambCanyonA', loop: LOOP, xfade: XF,
    brief: 'The ambient bed of Mesa Rush, a red-rock desert canyon course in a polished cartoon kart racing game: dry desert wind with gusts sweeping the rocks and dry brush rustling, quiet under the engines and music. No voices.',
    why: why("Mesa Rush: real desert air on the brush (felix.blume, 'Desert ambiance with slight wind on bushes', CC0) under real strong desert gusts howling (felix.blume, 'Strong wind blowing and howling in the middle of the desert', CC0) and dry grass rustling (felix.blume, CC0)."),
    layers: [bed(704814, 60, 0), bed(146914, 50, -5, [{ op: 'hp', hz: 120 }]), bed(146436, 10, -10, [{ op: 'hp', hz: 800 }])],
    master: MASTER },
  { id: 'ambience-frostbite-pass', name: 'ambFrostA', loop: LOOP, xfade: XF,
    brief: 'The ambient bed of Frostbite Pass, a snowy mountain course in a polished cartoon kart racing game: cold mountain wind, a thin high whistle and soft gusts, quiet under the engines and music. No voices.',
    why: why("Frostbite Pass: a real howling winter wind with its thin whistle (DBlover, 'Howling Wind Ambience', CC0) and real heavy mountain gusts from the Swiss Alps (kyles, CC0), a little of the high air lifted."),
    layers: [bed(405601, 25, 0), bed(454092, 30, -4, [{ op: 'hp', hz: 100 }]), bed(454092, 90, -12, [{ op: 'hp', hz: 3000 }, { op: 'pan', pos: 0.3 }])],
    master: MASTER },
  { id: 'ambience-boardwalk-nights', name: 'ambBoardwalkA', loop: LOOP, xfade: XF,
    brief: 'The ambient bed of Boardwalk Nights, a seaside carnival boardwalk at night in a polished cartoon kart racing game: the sea washing in the dark and, far away, the clatter of a roller coaster climbing its lift hill and a low fairground hum, quiet under the engines and music. No voices, no crowd, no music.',
    why: why("Boardwalk Nights: real small waves on a beach at night (BonnyOrbit, 'Ocean beach at night with small waves', CC0) and the Black Sea's rustle (tomattka, CC0, past its first 5 s), a real roller coaster's chain lift (esperar, 'Rollercoaster ratchet', CC0) far off once a loop (low-passed, a hall), and a faint low hum of fairground generators (synthesis, 55 and 110 Hz)."),
    layers: [bed(465435, 0.5, 0), bed(400660, 5.0, -6),
      event(171510, 1.5, 8.5, 9.0, -17, 0.6, 1800, [{ op: 'reverb', seconds: 1.5, mix: 0.35 }, { op: 'fade', in: 1.5, out: 2.0 }]),
      syn('tone', { seconds: SEC, wave: 'sine', hz: 55, harmonics: [[2, 0.5], [3, 0.15]], env: 1 }, -31)],
    master: MASTER },
  { id: 'ambience-skyline-circuit', name: 'ambSkylineA', loop: LOOP, xfade: XF,
    brief: 'The ambient bed of Skyline Circuit, a course of cloud islands and airships high in the sky in a polished cartoon kart racing game: strong, airy high-altitude wind with a soft moaning tone, quiet under the engines and music. No voices.',
    why: why("Skyline Circuit: a real steady howling wind with its moaning tone (Fission9, 'Howling Wind', CC0), real Alpine gusts under it (kyles, CC0), and a thin airy layer of a prairie wind (felix.blume, CC0) high-passed for the height."),
    layers: [bed(521736, 10, 0), bed(454092, 120, -6, [{ op: 'hp', hz: 80 }]), bed(215414, 150, -12, [{ op: 'hp', hz: 2500 }])],
    master: MASTER },
];
