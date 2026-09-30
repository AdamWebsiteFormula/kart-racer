// Candidates for the boost family (29 Sept 2026: Adam, "The existing sounds on the game are super cheap. I need a
// complete sound effects overhaul"): the three drift mini-turbos, the rocket start, the boost pad, the trick and its
// boost, the slipstream, the drift's spark tier-ups and the sparks loop. One family: a real exhaust pop (a performance
// car's crackle on the upshift, Muted.io Performance Cars, CC0) under a sci-fi whoosh (Rescopic Sound's Sci-Fi Energy
// Weapons and Parallax, 99Sounds licence), and electric crackle for the sparks (Lentikula's Lightning Spell Impacts,
// CC0). More pops and a longer whoosh as the tier grows. The raw files live in the private repo
// AdamWebsiteFormula/rascal-sfx-source; only the finished mixes ship. Each keeps the length of the sound it replaces.
//   RASCAL_SFX_PACKS=/home/user/rascal-sfx-source/packs python3 scripts/sfx/build.py --recipes=scripts/sfx/cands-boost.ts --out=<dir>
import { cap, lvl, OUT } from './parts.ts';
import type { Fx, Layer, Recipe } from './types.ts';

const SCI = '99Sounds_Sci-Fi_Sound_Effects/99Sounds Sci-Fi Sound Effects';
/** Rescopic Sound, Sci-Fi Energy Weapons (99Sounds version) */
const SF = (p: string) => ({ pack: `${SCI}/Rescopic Sound - Sci-Fi Energy Weapons (99Sounds Version)/Audio Files/${p}` });
/** Rescopic Sound, Parallax (99Sounds version) */
const PX = (p: string) => ({ pack: `${SCI}/Rescopic Sound - Parallax (99Sounds Version)/Audio Files/${p}` });
/** Lentikula, Basic Spell Impacts: lightning (CC0) */
const ZAP = (n: number) => ({ pack: `Basic_Spell_Impacts/Lightning Spell Impacts/Lightning Spell Impact ${n}.wav` });
const CAR = (n: string) => ({ pack: `performance-cars-free-sample-pack-mutedio/performance-cars-free-sample-pack-mutedio/${n}-performance-cars-mutedio.wav` });

const L = (src: { pack: string }, db: number, fx: Fx[] = [], at = 0): Layer => ({ at, src, fx: [...fx, ...lvl(db)] });
/** one exhaust pop: the car's crackle on an upshift, 10 ms before it to its tail (each measured: a 15-20 dB jump in 10 ms) */
const POPS: Record<string, readonly [string, number]> = { a: ['066', 2.93], b: ['064', 3.93], c: ['064', 1.98], d: ['049', 0.97] };
const pop = (k: keyof typeof POPS, db: number, at = 0, st = 0): Layer =>
  L(CAR(POPS[k][0]), db, [{ op: 'trim', from: POPS[k][1] - 0.01, to: POPS[k][1] + 0.22 }, ...(st ? [{ op: 'pitch', st } as Fx] : []), { op: 'fade', in: 0.002, out: 0.15 }], at);
/** a whoosh from just before its peak: the rush of the boost */
const rush = (src: { pack: string }, from: number, len: number, db: number, at = 0, fx: Fx[] = []): Layer => L(src, db, [{ op: 'trim', from }, ...fx, ...cap(len)], at);
const MASTER: Fx[] = [{ op: 'hp', hz: 40 }, { op: 'comp', threshold: -16, ratio: 2.5, attack: 0.003, release: 0.15 }, OUT];
const r = (id: string, brief: string, layers: Layer[], master: Fx[] = MASTER): Recipe => ({ id, brief, why: 'candidate, 29 Sept 2026', layers, master });

const WHOOSH = {
  small: PX('Whooshes/WHSH_Whoosh Fused Small 09_RSCPC_PX.wav'), // peak 1.08 s
  plasma: SF('Source Sounds/Whoosh/WHSH_Whoosh Plasma 03_RSCPC_SFEW.wav'), // peak 1.33 s
  energy: SF('Source Sounds/Whoosh/WHSH_Whoosh Energy 06_RSCPC_SFEW.wav'), // peak 1.19 s
  granular: SF('Source Sounds/Whoosh/WHSH_Whoosh Granular 22_RSCPC_SFEW.wav'), // peak 1.12 s
  plasma4: SF('Source Sounds/Whoosh/WHSH_Whoosh Plasma 04_RSCPC_SFEW.wav'), // peak 1.30 s
};

export const RECIPES: readonly Recipe[] = [
  r('boost1', 'A drift mini-turbo, tier 1 of 3: the kart darts forward with one sharp exhaust pop and a quick rush of air, about half a second.', [
    pop('a', 0),
    rush(WHOOSH.small, 1.0, 0.5, -3, 0.02),
  ]),
  r('boost2', 'A drift mini-turbo, tier 2 of 3: two quick exhaust pops and a bigger energy whoosh as the kart surges forward, under a second.', [
    pop('b', 0),
    pop('a', -2, 0.07, 1),
    rush(WHOOSH.plasma, 1.22, 0.8, -2, 0.02),
  ]),
  r('boost3', 'A drift mini-turbo, tier 3 of 3 (the biggest): a crackle of three exhaust pops and a powerful rushing energy blast with a sparkling tail, about a second.', [
    pop('c', 0),
    pop('a', -1, 0.06, 1),
    pop('b', -3, 0.13, 2),
    rush(WHOOSH.energy, 1.08, 1.1, -1, 0.02),
    rush(PX('Pings/SCIMisc_Ping 05_RSCPC_PX.wav'), 0.85, 0.7, -14, 0.3),
  ]),
  r('boostStart', 'The rocket start: a fast rising energy charge that bursts into exhaust pops and a big rushing whoosh as the kart launches, trailing off smoothly.', [
    rush(SF('Source Sounds/Charge Up/DSGNRise_Charge Up Processed Pulse 19_RSCPC_SFEW.wav'), 2.3, 0.42, -4, 0, [{ op: 'fade', in: 0.1 }]),
    pop('b', 0, 0.36),
    pop('a', -2, 0.43, 1),
    rush(WHOOSH.granular, 0.98, 1.2, -1, 0.36),
  ]),
  r('boostPad', 'The kart drives over a glowing boost pad: an instant electric zap and a rushing burst of energy and air, under a second, heard many times a race.', [
    L(ZAP(5), -6, [{ op: 'trim', from: 0.88 }, { op: 'hp', hz: 1200 }, ...cap(0.25)]),
    pop('d', -3, 0.01),
    rush(WHOOSH.plasma4, 1.18, 0.75, 0, 0.02),
  ]),
  r('trick', 'A quick mid-air trick: a fast, crisp spinning swish of air, under a second.', [
    rush(PX('Swishes/SWSH_Swish Crisp Large 01_RSCPC_PX.wav'), 1.05, 0.68, 0),
  ]),
  r('boostTrick', 'Landing a trick gives a boost: one exhaust pop, a quick swish and a small bright ping, under a second.', [
    pop('d', 0),
    rush(PX('Swishes/SWSH_Swish Fused Small 04_RSCPC_PX.wav'), 0.62, 0.6, -2, 0.02),
    rush(PX('Pings/SCIMisc_Ping 05_RSCPC_PX.wav'), 0.85, 0.5, -12, 0.08),
  ]),
  r('slipstream', "The kart shoots out of another kart's slipstream: a smooth, fast rush of air that swells and passes, about a second.", [
    rush(PX('Whooshes/WHSH_Whoosh Crisp Small 13_RSCPC_PX.wav'), 0.55, 1.0, 0, 0, [{ op: 'fade', in: 0.25 }]),
  ]),
  r('tierUp', 'The drift sparks reach tier 1: one quick, bright crackle of electricity, under half a second.', [
    L(ZAP(1), 0, [{ op: 'trim', from: 0.36 }, { op: 'pitch', st: 4 }, ...cap(0.48)]),
  ]),
  r('tierUp2', 'The drift sparks reach tier 2: a sharper crackle of electricity that zaps upward, bigger than tier 1, about half a second.', [
    L(ZAP(2), 0, [{ op: 'trim', from: 0.8 }, { op: 'pitch', st: 2 }, ...cap(0.6)]),
  ]),
  r('tierUp3', 'The drift sparks reach full charge: a powerful crackling surge of electricity with a bright shimmer on top, under a second.', [
    L(ZAP(4), 0, [{ op: 'trim', from: 0.45 }, ...cap(0.8)]),
    rush(PX('Pings/SCIMisc_Ping 05_RSCPC_PX.wav'), 0.85, 0.55, -10, 0.4),
  ]),
];
