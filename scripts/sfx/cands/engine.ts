// Engine candidates (28 Sept 2026, for Adam's ears; not installed): seamless loops at the rpm the game's mapping
// uses (samples.ts ENGINE_BANDS: 1400, 3800, 6600), each firing at rpm / 60 (one cylinder, two-stroke), pulling
// (load) and coasting (off the gas). Three builds of the same engine:
//   A "real firings": a real engine replayed one firing at a time (the grain technique racing games use: pitch by
//     firing rate, so the exhaust's resonances stay put), from a CC0 dirt bike on Freesound (kyles, 450016): its
//     idle for the idle band, its held rev for mid and high.
//   B "physical two-stroke": physics.py's model (a firing cylinder, the expansion chamber and silencer as
//     waveguides, the intake, the block's modes, piston slap, the drive chain), fitted by measurement to the same
//     dirt bike and the shipped high loop (scripts/sfx/enginefit.py), finished with a smooth match EQ.
//   C "hybrid": A with B under it, 9 dB down: the real firings carry it, the model adds the two-stroke's pipe ring
//     and rasp.
//   D "smaller kart": A's firings read 25% faster (their resonances 4 semitones up), a small engine, not a dirt bike.
// Every loop: a short on-board room (ground and bodywork reflections), gentle warmth, a limiter.
import type { Fx, Layer, Recipe } from '../types.ts';

const BANDS = { idle: 1400, mid: 3800, high: 6600 } as const;
type Band = keyof typeof BANDS;
const ID: Record<Band, string> = { idle: 'engine-idle', mid: 'engine-mid', high: 'engine-high' };

/** A loop of whole firing cycles near 4 s, so the wrap's crossfade meets the same point of the cycle. */
const loopLen = (rpm: number) => { const per = 60 / rpm; return Math.round(4 / per) * per; };

const DIRT = 450016;
/** The dirt bike's steady stretches (measured: scripts/sfx/cands, an_rpm): idle 2-18 s at 15 Hz firing, a held rev 23-28 s at 37 Hz. */
const POOL = {
  idle: { fs: DIRT, from: 2.0, to: 18.0, f: 15.0 },
  rev: { fs: DIRT, from: 23.0, to: 28.0, f: 37.0 },
};

const grains = (band: Band, coast: boolean, seconds: number, seed: number, size = 1): Layer => {
  const rpm = BANDS[band];
  const pool = band === 'idle' ? POOL.idle : POOL.rev;
  return {
    src: { synth: 'grains', args: { seconds, rpm, seed, hold: 1.6, jitter: band === 'idle' ? 0.02 : 0.01, ampVar: band === 'idle' ? 0.14 : 0.08, spread: 4, skip: coast ? 0.3 : 0, size, ...pool } },
    fx: [{ op: 'normalize', db: 0 }],
  };
};

/** The physical model's knobs (enginefit.py's best fit, 600 evaluations), and each band's firing spread. */
const PHYS = { d1: 0.000286, d2: 0.000702, d3: 0.001369, k1: -0.696, k2: 0.31464, rEnd: -0.638707, endLp: 0.419505, wallLp: 0.705344, tauBlow: 0.001277,
  raspHz: 2187.26, muffHz: 1200, muffQ: 1.169, inLevel: 0.0587, blockLevel: 0.5, slap: 0.0053, drive: 1.0, mechLevel: 0.03, wallG: 0.999 };
const SIGMA: Record<Band, number> = { idle: 0.15, mid: 0.06, high: 0.03 };
const RASP: Record<Band, number> = { idle: 0.1, mid: 0.07, high: 0.05 };
/** A smooth match EQ per band, [Hz, dB] (from enginefit.py's per-band differences, smoothed by hand: no notches). */
const EQ: Record<Band, readonly (readonly [number, number])[]> = {
  idle: [[100, 0], [250, 4], [400, 0], [800, 3], [1600, -2], [3200, -2], [6400, -8], [10000, -11]],
  mid: [[100, 5], [250, 4], [500, -3], [800, -7], [1600, -8], [3200, -7], [6400, -9], [10000, -10]],
  high: [[100, -2], [250, 1], [500, 0], [800, -2], [1600, 0], [3200, -3], [6400, -5], [10000, -7]],
};

const piston = (band: Band, coast: boolean, seconds: number, seed: number): Layer => ({
  src: { synth: 'piston', args: { seconds, rpm: BANDS[band], load: coast ? 0.05 : 1, seed, wander: 0, sigma: SIGMA[band], rasp: RASP[band], ...PHYS, eq: EQ[band] } },
  fx: [{ op: 'normalize', db: 0 }],
});

const MASTER = (band: Band, coast: boolean): Fx[] => [
  { op: 'trim', from: 0.25 },
  { op: 'hp', hz: 35 },
  ...(coast ? [{ op: 'lp', hz: 2400 } as Fx, { op: 'highshelf', hz: 800, db: -3 } as Fx] : []),
  { op: 'room', mix: 0.14, size: [2.2, 1.6, 1.2], absorb: 0.55, tail: 0.12, tailLevel: 0.15, hp: 150, lp: 7000 },
  { op: 'sat', drive: 2.0, mix: 0.2, asym: 0.15 },
  { op: 'comp', threshold: band === 'idle' ? -16 : -14, ratio: 2, attack: 0.003, release: 0.08 },
  { op: 'limit', ceiling: -1 },
];

const why = (build: string, band: Band, coast: boolean) =>
  `${build} ${coast ? 'coasting (off the gas)' : 'pulling'} at ${BANDS[band]} rpm, firing at ${(BANDS[band] / 60).toFixed(1)} Hz, a seamless ${loopLen(BANDS[band]).toFixed(3)} s loop of whole cycles.`;

const BRIEF = 'The engine of a small cartoon go-kart in a polished kart racing game (Mario Kart World quality): a small, lively single-cylinder engine, recorded on board, heard for minutes on end and crossfaded with the other rpm loops as it revs; real and punchy, never buzzy or synthetic, never grating.';

const recipes: Recipe[] = [];
for (const band of ['idle', 'mid', 'high'] as const) {
  for (const coast of [false, true]) {
    const L = loopLen(BANDS[band]), secs = L + 0.25 + 0.4, tag = `${band}${coast ? '-coast' : ''}`;
    const id = coast ? `${ID[band]}-coast` : ID[band];
    recipes.push({ id, name: `engA-${tag}`, brief: BRIEF, why: why('A, real firings (a CC0 dirt bike, one firing at a time):', band, coast), loop: L,
      layers: [grains(band, coast, secs, 11)], master: MASTER(band, coast) });
    recipes.push({ id, name: `engB-${tag}`, brief: BRIEF, why: why('B, the physical two-stroke model:', band, coast), loop: L,
      layers: [piston(band, coast, secs, 5)], master: MASTER(band, coast) });
    recipes.push({ id, name: `engD-${tag}`, brief: BRIEF, why: why('D, a smaller kart (the real firings of A read 25% faster, their resonances 4 semitones up: a small engine, not the dirt bike):', band, coast), loop: L,
      layers: [grains(band, coast, secs, 11, 1.25)], master: MASTER(band, coast) });
    recipes.push({ id, name: `engC-${tag}`, brief: BRIEF, why: why('C, hybrid (the real firings, the model 9 dB under them):', band, coast), loop: L,
      layers: [grains(band, coast, secs, 11), { ...piston(band, coast, secs, 5), fx: [{ op: 'normalize', db: 0 }, { op: 'gain', db: -9 }] }], master: MASTER(band, coast) });
  }
}

export const RECIPES: readonly Recipe[] = recipes;
