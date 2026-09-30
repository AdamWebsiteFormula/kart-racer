// Candidates for the driving sounds (29 Sept 2026: Adam, "The existing sounds on the game are super cheap. I need a
// complete sound effects overhaul"): the drift loop, the kart bumps, the wall, being hit, the hop and the landing. Real
// recordings from the free libraries Adam downloaded: SoundBits' Honda CB500F (Sonniss GDC 2026 bundle: free for games,
// no credit), Epic Stock Media's Anime Game (same bundle), 99Sounds' 99 Sound Effects and Nox Sound's Essentials
// footsteps. The raw files live in the private repo AdamWebsiteFormula/rascal-sfx-source; only the finished mixes ship.
// Each keeps the length of the sound it replaces. The free libraries hold no clean tire squeal on asphalt, so the drift
// is the Honda's rear tire skidding; SilverPlatter's Go Karts ($19) has real kart screeches if this one doesn't convince.
//   RASCAL_SFX_PACKS=/home/user/rascal-sfx-source/packs python3 scripts/sfx/build.py --recipes=scripts/sfx/cands-drive.ts --out=<dir>
import { cap, lvl, OUT } from './parts.ts';
import type { Fx, Layer, Recipe } from './types.ts';

const S5 = 'Sonniss.com-GDC2026-GameAudioBundle5of5';
const S2 = 'Sonniss.com-GDC2026-GameAudioBundle2of5';
const HONDA = { pack: `${S5}/SoundBits - Motorcycles - Honda/VEHSkid_Honda CB500F Engine Start Tires Skidding Stop 02_SNDBTS_MCH.wav` };
/** Epic Stock Media, Anime Game */
const AG = (f: string) => ({ pack: `${S2}/Epic Stock Media - Anime Game/${f}` });
/** 99Sounds, 99 Sound Effects */
const NN = (f: string) => ({ pack: `99_Sound_Effects/99 Sound Effects/WAV/${f}.wav` });
/** Nox Sound, Essentials: metal footsteps (a jump's push-off and landing) */
const NOX = (f: string) => ({ pack: `Essentials_Series_NOX_SOUND/Essentials_Series_NOX_SOUND/Footsteps_Essentials_NOX_SOUND/Footsteps_Metal/Footsteps_Metal_Jump/${f}.wav` });

const L = (src: { pack: string }, db: number, fx: Fx[] = [], at = 0): Layer => ({ at, src, fx: [...fx, ...lvl(db)] });
/** a sub thump under an impact: 99 Sound Effects' Mini Impact, its low end only */
const SUB = (db: number, len: number, at = 0): Layer => L(NN('Sub - Mini Impact'), db, [{ op: 'lp', hz: 260 }, ...cap(len)], at);
const MASTER: Fx[] = [{ op: 'hp', hz: 35 }, { op: 'comp', threshold: -16, ratio: 2.5, attack: 0.003, release: 0.15 }, OUT];
const r = (id: string, brief: string, layers: Layer[], master: Fx[] = MASTER): Recipe => ({ id, brief, why: 'candidate, 29 Sept 2026', layers, master });

export const RECIPES: readonly Recipe[] = [
  {
    id: 'drift', why: 'candidate, 29 Sept 2026', loop: 3, xfade: 0.1,
    brief: 'The steady tire screech and scrub of a kart drifting sideways through a long corner: one even level all the way, a seamless loop.',
    // the Honda's rear tire skidding (3.5-12.5 s holds one level, bright to 12 kHz); the engine's body under 500 Hz cut
    layers: [L(HONDA, 0, [{ op: 'trim', from: 4.0, to: 7.2 }, { op: 'hp', hz: 500 }, { op: 'lp', hz: 11000 }, { op: 'mono' }])],
    master: [{ op: 'comp', threshold: -18, ratio: 2, attack: 0.01, release: 0.2 }, OUT],
  },
  r('bump', 'Two karts bump into each other: one short, solid, crunchy smack with a clank of the metal frame, under half a second.', [
    L(AG('FGHTImpt_Combat Punch Impact Light Hit Delay Crunchy Vintage Quick Smack 05_ESM_AG.wav'), 0, cap(0.48)),
    L(NOX('Footsteps_MetalV1_Jump_Land_02'), -7, cap(0.4)),
  ]),
  r('wall', 'A kart hits the wall: a heavy, dull thud of the frame with a short metal clang, about half a second.', [
    L(NN('Impact - Low Blow'), 0, cap(0.6)),
    L(NOX('Footsteps_MetalV1_Jump_Land_01'), -5, cap(0.5)),
    SUB(-6, 0.5),
  ]),
  r('hit', 'A kart is hit by an item: a crunchy small blast and crash with a deep thump, under a second.', [
    L(AG('EXPLDsgn_Explosion Small Blast Enemy Death Crunchy Boom Cartoon Noisy Crash Impact Delay 03_ESM_AG.wav'), 0, cap(0.8)),
    SUB(-5, 0.6),
  ]),
  r('hop', 'The kart hops before a drift: a quick springy bounce of the frame and a small whoosh of air, under half a second.', [
    L(NN('Short - Springy Gun'), 0, cap(0.46)),
    L(NOX('Footsteps_MetalV1_Jump_Start_01'), -6, [{ op: 'trim', from: 0.12 }, ...cap(0.3)]),
  ]),
  r('land', 'The kart lands after a jump: a solid metal-frame thud with a deep thump, about half a second.', [
    L(NOX('Footsteps_MetalV1_Jump_Land_01'), 0, cap(0.6)),
    SUB(-4, 0.5),
  ]),
];
