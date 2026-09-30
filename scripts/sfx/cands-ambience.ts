// Candidates for a quiet bed of each course's own world under the engines (28 Sept 2026: Adam asked for quiet sounds
// for each course, "waves, wind, birds", no crowd voices; docs/requests.md #11). Nothing plays one yet: the game needs
// a small bed player (one loop per course, under the music, its own slider) once Adam likes these. Real recordings:
// Nox Sound's Iceland sea (Essentials), Just Sound Effects' Norwegian meadow (pipits, insects, wind in grass), 344
// Audio's Connecticut forest night (crickets), InMotionAudio's chimney wind and Epic Stock Media's synthesized wind
// (Sonniss GDC 2026 bundle: free for games, no credit). Ids follow the courses' track ids. Long loops (18-24 s) with a
// slow crossfade so the seam never shows.
//   RASCAL_SFX_PACKS=/home/user/rascal-sfx-source/packs python3 scripts/sfx/build.py --recipes=scripts/sfx/cands-ambience.ts --out=<dir>
import { lvl, OUT } from './parts.ts';
import type { Fx, Layer, Recipe } from './types.ts';

const SEA = (f: string) => ({ pack: `Essentials_Series_NOX_SOUND/Essentials_Series_NOX_SOUND/Iceland_Packs_NOX_SOUND/Iceland_Flows_NOX_SOUND/Ambiance_Sea_Strong_${f}_Loop_Stereo${f.includes('Big') ? '' : '_01'}.wav` });
const MEADOW = { pack: 'Sonniss.com-GDC2026-GameAudioBundle3of5/Just Sound Effects - Highlands of Norway/AMBSwmp_Meadow Pipits calling many Insects humming Wind blowing through Grass_JSE_HoN_Stereo.wav' };
const CRICKETS = { pack: 'Sonniss.com-GDC2026-GameAudioBundle1of5__1_/344 Audio - East Coast America Vol. 1/AMBSubn_Ambience, Forest Crickets, Birds, Connecticut 02_344 Audio_East Coast America.wav' };
const CHIMNEY = { pack: 'Sonniss.com-GDC2026-GameAudioBundle3of5/InMotionAudio - Chimney Wind/WINDInt_ChimneyWind05_InMotionAudio_ChimneyWind.wav' };
const WIND = { pack: 'Sonniss.com-GDC2026-GameAudioBundle2of5/Epic Stock Media - Synthesized Nature Loops and Sounds/WINDInt_Loop Weather Wind Whipping Constricted Flow Turbulent 01_ESM_SNLS.wav' };

const L = (src: { pack: string }, db: number, fx: Fx[] = []): Layer => ({ src, fx: [...fx, ...lvl(db)] });
const bed = (id: string, seconds: number, brief: string, layers: Layer[], master: Fx[] = []): Recipe =>
  ({ id, brief, why: 'candidate, 29 Sept 2026', loop: seconds, xfade: 1.5, layers, master: [...master, { op: 'comp', threshold: -20, ratio: 2, attack: 0.05, release: 0.5 }, OUT] });

export const RECIPES: readonly Recipe[] = [
  bed('amb-harbour-loop', 24, 'Lighthouse Loop: the sea rolling onto a beach a little way off, soft and steady under the race.', [
    L(SEA('Vik_Far'), 0, [{ op: 'trim', from: 2 }]),
  ], [{ op: 'hp', hz: 60 }]),
  bed('amb-meadow-run', 24, 'Windmill Run: a sunny meadow, small birds calling, insects humming and wind in the grass.', [
    L(MEADOW, 0, [{ op: 'trim', from: 28 }]),
  ], [{ op: 'hp', hz: 120 }]),
  bed('amb-canyon-rush', 6, 'Mesa Rush: a dry desert wind blowing steadily through the rocks.', [
    L(WIND, 0, [{ op: 'lp', hz: 4000 }]),
  ], [{ op: 'hp', hz: 60 }]),
  bed('amb-frostbite-pass', 24, 'Frostbite Pass: a cold mountain wind that gusts and howls softly.', [
    L(CHIMNEY, 0, [{ op: 'trim', from: 22 }]),
  ], [{ op: 'hp', hz: 70 }]),
  bed('amb-boardwalk-nights', 24, 'Boardwalk Nights: gentle surf at night with crickets in the dunes.', [
    L(SEA('Kirkjufjara_Far'), 0),
    L(CRICKETS, -8, [{ op: 'trim', from: 4 }]),
  ], [{ op: 'hp', hz: 60 }]),
  bed('amb-skyline-circuit', 4, 'Skyline Circuit: thin, airy high-altitude wind rushing past the cloud islands.', [
    L(WIND, 0, [{ op: 'pitch', st: 5 }, { op: 'hp', hz: 500 }]),
  ]),
];
