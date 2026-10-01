// Recorded sounds and songs (made with ElevenLabs: scripts/elevenlabs/catalog.ts). The synth stays
// the fallback: anything missing from public/audio/manifest.json, or not decoded yet, plays as before.
// The analysis (trim, level, tempo, loop point, engine bands) is pure and tested; the players are
// thin Web Audio.
import { AUDIO } from './constants.ts';
import { engineCutoff } from './engine.ts';
import { isIntroKey } from './introCue.ts';
import type { Bark } from './types.ts';

export interface Manifest {
  sfx: Record<string, { url: string; loop?: boolean }>;
  /** `loop`: a song with an intro names its loop, bar-aligned seconds [start, end]: the intro plays once, then the loop (else the loop is found) */
  music: Record<string, { url: string; bpm: number; loop?: readonly [number, number] }>;
}

/** What the analysis found in one recording. Times are buffer seconds. */
export interface Cut {
  start: number; end: number; gain: number;
  /** where a loop wraps (a crossfade is baked in before loopEnd); a one-shot has none */
  loopStart?: number; loopEnd?: number;
  /** a song's or intro piece's bar grid: its first beat (buffer seconds) and its bar (seconds), for a cue cut on a bar line (introCue.ts) */
  beat0?: number; bar?: number;
}
export interface Sample extends Cut { buffer: AudioBuffer }

/** Music per track (design §11; Canyon Rush has its own song since 30 Sept 2026, Skyline Circuit keeps the finale). */
export const RACE_THEME: Readonly<Record<string, string>> = Object.freeze({
  'harbour-loop': 'race-harbour', 'meadow-run': 'race-meadow', 'canyon-rush': 'race-mesa',
  'frostbite-pass': 'race-frost', 'boardwalk-nights': 'race-boardwalk', 'skyline-circuit': 'race-finale',
});
export const themeForTrack = (trackId: string): string => RACE_THEME[trackId] ?? 'race-harbour';

const HOP = 0.01;
/**
 * Loudness targets, K-weighted RMS (the BS.1770 ear, `kWeight`): a sound effect over its loudest
 * 100 ms (0.19 ≈ −12 LUFS for a stereo sound at mix 1), a loop and a song on average. Measured by
 * rendering whole races offline (docs/sops/audio.md, 24 Sept 2026): the game's mix then lands near
 * −16 LUFS integrated with every gameplay cue over the music and engines.
 */
const SFX_K = 0.19, LOOP_K = 0.12, SONG_K = 0.083;
export const LEVELS = Object.freeze({ sfx: SFX_K, loop: LOOP_K, song: SONG_K });
/** a song fades in this fast when it starts; the loop end stays this far inside the file */
const FADE_IN = 0.008, TAIL = 0.15;
/** one-shots: a fade-in this long at the cut start (no click), and a fade-out over the end (longer when the recording stops while still loud) */
const EDGE_IN = 0.002, EDGE_OUT = 0.012, EDGE_OUT_LOUD = 0.09;
/**
 * Sounds whose moment is the hit (a bump, a pickup, a zap): their start is cut to 20 dB under the
 * peak, not 36, so a soft lead-in never delays the thud (the bump's first 110 ms were scrape noise).
 */
export const TIGHT: ReadonlySet<string> = new Set([
  'bump', 'hit', 'spin', 'wall', 'land', 'hop', 'balloon', 'coin', 'pop', 'bounce', 'blocked', 'drop', 'trail', 'throw', 'hitConfirm',
  'count', 'uiMove', 'uiConfirm', 'uiBack', 'rouletteTick', 'tierUp', 'tierUp2', 'tierUp3', 'boost1', 'boost2', 'boost3', 'boostPad',
  'gainPlace', 'losePlace', 'denied', 'snowThud', 'shieldPop', 'trick',
]);
/**
 * The boosts' whooshes swell for 100-250 ms before their peak (the air takes a moment to rush), but the
 * kart jumps forward the instant the boost fires: their start is cut to 12 dB under the peak, so the
 * sound surges at once and still swells the last stretch (24 Sept 2026, the remade whooshes).
 */
export const PUNCH: ReadonlySet<string> = new Set(['boost1', 'boost2', 'boost3', 'slipstream']);
/** How far under a sound's peak its start is cut (dB): the boosts closest, then the thuds and zaps, then the rest. */
export const cutDb = (id: string): number => (PUNCH.has(id) ? -12 : TIGHT.has(id) ? -20 : -36);
/** the final-lap fanfare's length: the music waits this long before it comes back faster */
export const FANFARE_SECONDS = 2.1;
/** the stings' lengths (catalog `finish`, `finishLow`, `koOut`, `koSafe`, plus a breath): the results song waits for their last chord */
// finish raised 3.6 -> 4.1 on 26 Sept 2026: the remade finish-fanfare (audition pack, judge 10/9) runs 4.0 s, up from 3.5 s
// koSafe raised 2.1 -> 2.3 on 27 Sept 2026: the mallet sting that replaced it (scripts/sfx/recipes.ts) rings 2.2 s
export const STING_SECONDS = Object.freeze({ finish: 4.1, finishLow: 2.3, koOut: 2.3, koSafe: 2.3 });

// ---------------------------------------------------------------- analysis (pure)

/** Mono RMS per `hop` seconds over all channels. */
export function envelope(chs: readonly Float32Array[], rate: number, hop = HOP): Float32Array {
  const n = Math.max(1, Math.round(rate * hop));
  const len = chs[0]?.length ?? 0;
  const out = new Float32Array(Math.ceil(len / n));
  for (let h = 0; h < out.length; h++) {
    let s = 0, c = 0;
    const a = h * n, b = Math.min(len, a + n);
    for (const ch of chs) for (let i = a; i < b; i++) { s += ch[i] * ch[i]; c++; }
    out[h] = c ? Math.sqrt(s / c) : 0;
  }
  return out;
}

/** Seconds of near-silence before a sound starts, less a little pre-roll so the attack is kept. */
export function leadIn(chs: readonly Float32Array[], rate: number, threshold = 0.02, preRoll = 0.004): number {
  const len = chs[0]?.length ?? 0;
  for (let i = 0; i < len; i++) for (const ch of chs) if (Math.abs(ch[i]) >= threshold) return Math.max(0, i / rate - preRoll);
  return 0;
}

/**
 * Where a sound starts: the first 2 ms whose level is within `relDb` of the loudest 2 ms, less a
 * little pre-roll so the attack is kept. Relative, so a quiet recording is cut as closely as a
 * loud one; on the level, not single samples, so the odd spike in a noisy lead-in does not count.
 */
export function onset(chs: readonly Float32Array[], rate: number, relDb = -36, preRoll = 0.003): number {
  const env = envelope(chs, rate, 0.002);
  let top = 0;
  for (const e of env) top = Math.max(top, e);
  if (!(top > 0)) return 0;
  const th = top * Math.pow(10, relDb / 20), hop = Math.max(1, Math.round(rate * 0.002)) / rate;
  for (let i = 0; i < env.length; i++) if (env[i] >= th) return Math.max(0, i * hop - preRoll);
  return 0;
}

/**
 * The BS.1770 K-weighting the loudness meters use (a +4 dB shelf over about 1.7 kHz, a high-pass
 * under about 40 Hz), at any sample rate; new arrays. A rate too low for the shelf skips it.
 */
export function kWeight(chs: readonly Float32Array[], rate: number): Float32Array[] {
  const stages: number[][] = [];
  const fc1 = 1681.974450955533;
  if (fc1 < 0.45 * rate) {
    const A = Math.pow(10, 3.999843853973347 / 40), w = (2 * Math.PI * fc1) / rate, c = Math.cos(w), al = Math.sin(w) / (2 * 0.7071752369554196), r = 2 * Math.sqrt(A) * al;
    const a0 = A + 1 - (A - 1) * c + r;
    stages.push([A * (A + 1 + (A - 1) * c + r) / a0, -2 * A * (A - 1 + (A + 1) * c) / a0, A * (A + 1 + (A - 1) * c - r) / a0, 2 * (A - 1 - (A + 1) * c) / a0, (A + 1 - (A - 1) * c - r) / a0]);
  }
  {
    const w = (2 * Math.PI * 38.13547087602444) / rate, c = Math.cos(w), al = Math.sin(w) / (2 * 0.5003270373238773), a0 = 1 + al;
    stages.push([(1 + c) / 2 / a0, -(1 + c) / a0, (1 + c) / 2 / a0, (-2 * c) / a0, (1 - al) / a0]);
  }
  return chs.map((ch) => {
    const out = Float32Array.from(ch);
    for (const [b0, b1, b2, a1, a2] of stages) {
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
      for (let i = 0; i < out.length; i++) {
        const x = out[i], y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
        x2 = x1; x1 = x; y2 = y1; y1 = y; out[i] = y;
      }
    }
    return out;
  });
}

/** Take each channel's average (DC) out, in place: an offset thumps at every start and stop. */
export function removeDc(chs: readonly Float32Array[]): void {
  for (const ch of chs) {
    let m = 0;
    for (let i = 0; i < ch.length; i++) m += ch[i];
    m /= ch.length || 1;
    if (m !== 0) for (let i = 0; i < ch.length; i++) ch[i] -= m;
  }
}

/**
 * Shape a one-shot's edges in place and find where it really ends: a raised-cosine fade-in of
 * `EDGE_IN` from `start` (a recording that begins mid-wave clicks), the end moved in to the last
 * sample within 60 dB of the peak, and a fade-out over the end (`EDGE_OUT_LOUD` when the recording
 * is still loud in its last 50 ms, as a clipped-off whoosh is). Returns the end in seconds.
 */
export function shapeEdges(chs: readonly Float32Array[], rate: number, start: number): number {
  const len = chs[0]?.length ?? 0, a = Math.round(start * rate), pk = samplePeak(chs);
  let b = len;
  const floor = pk * 1e-3;
  outer: for (; b > a + 1; b--) for (const ch of chs) if (Math.abs(ch[b - 1]) > floor) break outer;
  b = Math.min(len, b + Math.round(0.005 * rate));
  // loud tail: the last 50 ms still within 30 dB of the loudest 50 ms
  const env = envelope(chs.map((ch) => ch.subarray(a, b)), rate, 0.05);
  let top = 0;
  for (const e of env) top = Math.max(top, e);
  const loud = env.length > 1 && env[env.length - 1] > top * 0.0316;
  const nIn = Math.min(Math.round(EDGE_IN * rate), (b - a) >> 2), nOut = Math.min(Math.round((loud ? EDGE_OUT_LOUD : EDGE_OUT) * rate), (b - a) >> 2);
  for (const ch of chs) {
    for (let i = 0; i < nIn; i++) ch[a + i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / nIn);
    for (let i = 0; i < nOut; i++) ch[b - 1 - i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / nOut);
    for (let i = b; i < len; i++) ch[i] = 0;
  }
  return b / rate;
}

/** RMS of the loudest `win`-second window: how loud a sound is at its peak, clicks and tails aside. */
export function peakRms(env: Float32Array, hop = HOP, win = 0.05): number {
  const k = Math.max(1, Math.round(win / hop));
  let best = 0, acc = 0;
  for (let i = 0; i < env.length; i++) {
    acc += env[i] * env[i];
    if (i >= k) acc -= env[i - k] * env[i - k];
    best = Math.max(best, Math.sqrt(Math.max(0, acc) / Math.min(k, i + 1)));
  }
  return best;
}

/** Average RMS over the whole envelope. */
export function meanRms(env: Float32Array): number {
  let s = 0;
  for (const x of env) s += x * x;
  return env.length ? Math.sqrt(s / env.length) : 0;
}

/** Gain that brings `level` to `target`, never more than `max` (so near-silence is not blown up). */
export const levelGain = (level: number, target: number, max = 6): number => (level > 1e-4 ? Math.min(max, target / level) : 1);

/** The loudest sample, over all channels. */
export function samplePeak(chs: readonly Float32Array[]): number {
  let p = 0;
  for (const ch of chs) for (let i = 0; i < ch.length; i++) { const a = Math.abs(ch[i]); if (a > p) p = a; }
  return p;
}

/** A level gain held so the recording's sample peak lands at or under `AUDIO.peakCeiling`. */
export const peakSafe = (gain: number, peak: number): number => (peak > 0 ? Math.min(gain, AUDIO.peakCeiling / peak) : gain);

/**
 * Bake a seamless wrap into a loop, in place: the last `fade` seconds before the loop end blend (at
 * equal power) into the audio just before the loop start, so the wrap from end to start carries on
 * sample for sample with no click and no overlap. A loop start too close to the file's start moves
 * later (and the end with it, when the file has room, so a song's loop keeps its bar length).
 * Returns the loop points in seconds.
 */
export function bakeLoop(chs: readonly Float32Array[], rate: number, start: number, end: number, fade: number): { start: number; end: number } {
  const len = chs[0]?.length ?? 0;
  const n = Math.max(1, Math.round(fade * rate));
  let a = Math.max(0, Math.round(start * rate)), b = Math.min(len, Math.round(end * rate));
  if (a < n) { const shift = n - a; a = n; if (b + shift <= len) b += shift; }
  if (b - a < 2 * n) return { start: a / rate, end: b / rate }; // too short to fade: leave it
  for (const ch of chs) {
    for (let i = 0; i < n; i++) {
      const th = ((i + 1) / n) * (Math.PI / 2); // the last sample is all loop-start side: the wrap is exact
      ch[b - n + i] = ch[b - n + i] * Math.cos(th) + ch[a - n + i] * Math.sin(th);
    }
  }
  return { start: a / rate, end: b / rate };
}

/**
 * The recorded mix, in dB against the level every recording is brought to (`SFX_K`, loudness as
 * heard): the race's stings and your hits on top, big items and creatures level, the sounds that
 * fire every few seconds (boosts, hops, sparks, ticks, menu clicks) set back. Rebalanced from an
 * offline render of whole races (24 Sept 2026): every gameplay cue of your own sits over the music
 * and engines. Missing ids are −2 dB (yelps and horns −2 too).
 */
const MIX_DB: Readonly<Record<string, number>> = Object.freeze({
  // the race
  count: -1, go: 1, lap: -1, finalLap: 1, finish: 1, finishLow: 0, shift: 1, koOut: 0, koSafe: 0,
  // menus, pickups and place
  // coin (the gear pickup, 27 Sept 2026): its ratchet clicks are spiky, so 3 dB down keeps the mix's true peak where it was
  uiMove: -12, uiConfirm: -9, uiBack: -6, rouletteTick: -3, itemReady: -2, coin: -3, balloon: -1, /* uiMove a quiet tick since 30 Sept 2026 (Adam: "boing"y); hit and wall play the bump (audio.ts SOUND_AS) */
  gainPlace: -2, losePlace: -3, wrongWay: -2, respawn: -3, denied: -6,
  // items
  throw: -3, kite: -3, drop: -1, shieldUp: -3, shieldPop: -2, shieldEnd: -3, airHorn: 0, fog: -3, bounce: -5, pop: -5,
  fizz: -2, strikeRoll: -2, strike: 0, boing: -2, slam: 0, anchor: -2, slingshot: -2, mouse: -3, blocked: -3, trail: -1, hitConfirm: -1,
  hit: -11, spin: -4, /* hit -11 since 30 Sept 2026 (Adam: blunt and faint, as a wall) */
  // boosts and sparks: each tier over the last
  boost1: -3, boost2: -2, boost3: -1, boostPad: -3, boostTrick: -2, boostStart: -1, slipstream: -2.5, trick: -3,
  tierUp: -1.5, tierUp2: -0.5, tierUp3: 0.5,
  // driving
  hop: -5, land: -11, wall: -11, bump: -11, /* (bump -3, wall -1 until 30 Sept 2026, Adam: "too loud") */ loop: -2, claw: -2, clawDrop: -3,
  // the course
  roar: 0, stomp: 0, yetiThrow: 0, snowThud: 0, krakenRise: 0, krakenSlam: 0, crabClack: -2, honk: 0, whaleSong: 0, tailSlap: 0,
  ventWarn: -1, geyser: 0, steamVent: 0,
});
export const mixDb = (id: string): number => MIX_DB[id] ?? -2;
export const mixLevel = (id: string): number => Math.pow(10, mixDb(id) / 20);

/** Onset strength per hop: how much the level rises from the hop before. */
export function onsets(env: Float32Array): Float32Array {
  const o = new Float32Array(env.length);
  for (let i = 1; i < env.length; i++) o[i] = Math.max(0, env[i] - env[i - 1]);
  return o;
}

/**
 * The real bar length (seconds) near the one the prompt asked for: the lag around `bars` bars
 * where the onsets repeat best, refined between hops. The asked-for bar when the song is too short.
 */
export function barLength(on: Float32Array, bpm: number, hop = HOP, bars = 8, spread = 0.05): number {
  const bar0 = 240 / bpm;
  const centre = (bar0 * bars) / hop;
  const lo = Math.floor(centre * (1 - spread)), hi = Math.ceil(centre * (1 + spread));
  if (hi + 1 >= on.length / 2) return bar0;
  const score = (lag: number) => {
    let s = 0;
    for (let i = 0; i + lag < on.length; i++) s += on[i] * on[i + lag];
    return s / (on.length - lag);
  };
  const scores: number[] = [];
  let best = lo;
  for (let lag = lo; lag <= hi; lag++) {
    scores[lag - lo] = score(lag);
    if (scores[lag - lo] > scores[best - lo]) best = lag;
  }
  let lag = best;
  const a = scores[best - lo - 1], b = scores[best - lo], c = scores[best - lo + 1];
  if (a !== undefined && c !== undefined) {
    const d = a - 2 * b + c;
    if (d < 0) lag = best + (0.5 * (a - c)) / d;
  }
  return (lag * hop) / bars;
}

/**
 * Where a song loops, in buffer seconds: from its first beat to the last whole phrase (4 bars,
 * or whole bars in a short song) before the energy fades, nudged to where the beats line up
 * best with the opening, so the next pass lands on the downbeat.
 */
export function loopPoints(env: Float32Array, bpm: number, hop = HOP): { start: number; end: number; bar: number } {
  const n = env.length;
  const on = onsets(env);
  const bar = barLength(on, bpm, hop);
  const sorted = Float32Array.from(env).sort();
  const med = sorted[n >> 1] ?? 0;
  let s = 0;
  while (s < n - 1 && env[s] < 0.25 * med) s++;
  // fade: the last hop whose centred one-second average is still at least 60 % of the median
  const w = Math.round(1 / hop), half = w >> 1;
  const prefix = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i] + env[i];
  const avg = (i: number) => { const a = Math.max(0, i - half), b = Math.min(n, i + half + 1); return (prefix[b] - prefix[a]) / (b - a); };
  let fade = n - 1;
  while (fade > s && avg(fade) < 0.6 * med) fade--;
  const start = s * hop;
  let k = Math.floor((fade * hop - 0.3 - start) / bar);
  if (k >= 8) k -= k % 4;
  k = Math.max(1, k);
  const end = start + k * bar;
  // nudge up to ±80 ms so two bars after the loop point match the first two bars best
  const span = Math.round((2 * bar) / hop), base = Math.round(end / hop);
  let bestD = 0, best = -1;
  for (let d = -8; d <= 8; d++) {
    let c = 0;
    for (let i = 0; i < span && base + d + i < n && s + i < n; i++) c += on[s + i] * on[base + d + i];
    if (c > best) { best = c; bestD = d; }
  }
  return { start, end: end + bestD * hop, bar };
}

/** rpm each engine recording stands for: idle, mid, high (plan §7.4). */
export const ENGINE_BANDS = [AUDIO.idleRpm, 3800, 6600] as const;

/** Equal-power weights of the three engine loops at an rpm. */
export function bandWeights(rpm: number): [number, number, number] {
  const [a, b, c] = ENGINE_BANDS;
  if (rpm <= a) return [1, 0, 0];
  if (rpm >= c) return [0, 0, 1];
  const q = Math.PI / 2;
  if (rpm < b) { const x = (rpm - a) / (b - a); return [Math.cos(x * q), Math.sin(x * q), 0]; }
  const x = (rpm - b) / (c - b);
  return [0, Math.cos(x * q), Math.sin(x * q)];
}

/** Playback rate of a band's loop so its pitch follows the rpm, inside a range that still sounds real. */
export const bandRate = (rpm: number, band: number): number => Math.min(2, Math.max(0.5, rpm / ENGINE_BANDS[band]));

// ---------------------------------------------------------------- loading

function channels(b: AudioBuffer): Float32Array[] {
  const out: Float32Array[] = [];
  for (let c = 0; c < b.numberOfChannels; c++) out.push(b.getChannelData(c));
  return out;
}

/**
 * Even out a loop that swells and dips, in place: a crunch or rumble whose level wanders by several
 * dB pulses once it repeats every few seconds. Only a loop whose 100 ms level varies by more than
 * `minSd` dB (standard deviation) is touched, so the engines' own lope is left alone; each 100 ms
 * then moves part of the way (`amount`) to the loop's average, at most `maxDb`, the gain curve read
 * round the loop so the wrap stays seamless.
 */
export function evenLoop(chs: readonly Float32Array[], rate: number, amount = 0.7, maxDb = 6, minSd = 2.5): void {
  const env = envelope(chs, rate, 0.1), n = env.length;
  if (n < 4) return;
  const dbs = Array.from(env, (e) => 20 * Math.log10(Math.max(e, 1e-6)));
  const m = dbs.reduce((x, y) => x + y, 0) / n;
  if (Math.sqrt(dbs.reduce((x, y) => x + (y - m) ** 2, 0) / n) < minSd) return;
  const len = chs[0].length, hop = len / n;
  // a cyclic 3-tap smoothing so the gain does not flutter
  const sm = Float32Array.from(env, (_, i) => (env[(i + n - 1) % n] + 2 * env[i] + env[(i + 1) % n]) / 4);
  const mean = meanRms(sm);
  const lim = Math.pow(10, maxDb / 20);
  const g = Float32Array.from(sm, (e) => (e > 1e-6 ? Math.min(lim, Math.max(1 / lim, Math.pow(mean / e, amount))) : 1));
  for (let i = 0; i < len; i++) {
    const x = i / hop - 0.5, k = Math.floor(x), f = x - k;
    const a = g[(k + n) % n], b = g[(k + 1 + n) % n], v = a + (b - a) * f;
    for (const ch of chs) ch[i] *= v;
  }
}

/**
 * Level a sound effect by its loudness as heard (K-weighted, loudest 100 ms), its peak never past
 * the ceiling; its DC taken out, its start cut to the sound (`cutDb`: closer for the thuds and the boosts), its edges faded.
 * A loop is levelled on its K-weighted average and gets its wrap baked seamless.
 */
export function cutSfx(b: AudioBuffer, loop: boolean, id = ''): Sample {
  const chs = channels(b), rate = b.sampleRate;
  removeDc(chs);
  if (loop) {
    evenLoop(chs, rate);
    const env = envelope(kWeight(chs, rate), rate), peak = samplePeak(chs);
    const w = bakeLoop(chs, rate, 0, b.duration, AUDIO.loopFade);
    return { buffer: b, start: w.start, end: w.end, loopStart: w.start, loopEnd: w.end, gain: peakSafe(levelGain(meanRms(env), LOOP_K), peak) };
  }
  const env = envelope(kWeight(chs, rate), rate), peak = samplePeak(chs);
  const start = onset(chs, rate, cutDb(id));
  const end = shapeEdges(chs, rate, start);
  return { buffer: b, start, end, gain: peakSafe(levelGain(peakRms(env, HOP, 0.1), SFX_K, 8), peak) };
}

/**
 * Level a song on its K-weighted average and find its loop; the first pass starts on its first beat,
 * the wrap is baked seamless. `loop` (seconds, from the manifest) names the loop of a song that opens
 * with an intro: the intro plays once, then the loop, as race songs do (26 Sept 2026: looping a
 * Lyria song from its top brought its opening fanfare back in the middle of the groove).
 */
export function cutSong(b: AudioBuffer, bpm: number, loop?: readonly [number, number]): Sample {
  const chs = channels(b), env = envelope(chs, b.sampleRate);
  const p = loopPoints(env, bpm);
  const [a, z] = loop ?? [p.start, p.end];
  const w = bakeLoop(chs, b.sampleRate, a, Math.min(z, b.duration - TAIL), AUDIO.songFade);
  return {
    buffer: b, start: Math.min(p.start, w.start), end: w.end, loopStart: w.start, loopEnd: w.end, beat0: p.start, bar: p.bar,
    gain: peakSafe(levelGain(songLevel(chs, b.sampleRate, w.start, w.end), SONG_K, 3), samplePeak(chs)),
  };
}

/**
 * A course's intro piece (introCue.ts; the manifest's `intro:<trackId>`): a one-shot, played once from its first
 * sound to the end of its ring (its edges shaped as a sound effect's are), levelled as a song is so it sits with the
 * race songs; its bar grid from its first sound at the manifest's tempo (a piece starts on its downbeat).
 */
export function cutIntro(b: AudioBuffer, bpm: number): Sample {
  const chs = channels(b), rate = b.sampleRate;
  removeDc(chs);
  const start = onset(chs, rate);
  const end = shapeEdges(chs, rate, start);
  return { buffer: b, start, end, beat0: start, bar: 240 / bpm, gain: peakSafe(levelGain(songLevel(chs, rate, start, end), SONG_K, 3), samplePeak(chs)) };
}

/**
 * A song's loudness as heard (K-weighted RMS) over its loop, read from `parts` stretches of `span`
 * seconds spread across it rather than the whole minute and a half: within a fraction of a dB of
 * the full measure for a whole-song groove, at a sixth of the work (it runs while the race song
 * decodes in the countdown). A loop shorter than the stretches together is read whole.
 */
export function songLevel(chs: readonly Float32Array[], rate: number, start: number, end: number, span = 4, parts = 4): number {
  const a = Math.max(0, Math.round(start * rate)), b = Math.min(chs[0]?.length ?? 0, Math.round(end * rate));
  const n = Math.round(span * rate), warm = Math.round(0.05 * rate);
  const starts = b - a <= parts * n ? [a] : Array.from({ length: parts }, (_, p) => a + Math.floor(((b - a - n) * p) / (parts - 1)));
  const len = starts.length === 1 ? b - a : n;
  let sum = 0, count = 0;
  for (const s0 of starts) {
    const from = Math.max(0, s0 - warm); // the filters settle before the stretch is read
    for (const ch of kWeight(chs.map((c) => c.subarray(from, s0 + len)), rate)) {
      for (let i = s0 - from; i < ch.length; i++) sum += ch[i] * ch[i];
      count += ch.length - (s0 - from);
    }
  }
  return count ? Math.sqrt(sum / count) : 0;
}

/** Songs kept decoded whatever else is asked for: the menus' and the results'. Race songs: the two most recent. */
const KEEP_SONGS: ReadonlySet<string> = new Set(['title', 'results']);
const RACE_SONGS_KEPT = 2;

// ---------------------------------------------------------------- the order the files come down in

/**
 * The sound effects' turns in the download line, first to last (24 Sept 2026: on the first key press
 * all 102 files and the title song were asked for at once, the same flood the models had): 0 the
 * menus' clicks (the title song comes with them), 1 a race's first seconds (the countdown and go, the
 * engines, the drift, its sparks and hop, the boosts), 2 the items and the hits (the first balloon, the
 * jostle after the go, the yelps), 3 the rest (the course's creatures and surfaces, the horns, the lap
 * and finish stings). A sound not in yet plays on the synth (or, for a loop, waits), as before.
 */
export const SFX_TIERS: readonly (readonly string[])[] = Object.freeze([
  // the menus' clicks, and the pick's whoosh (a race picked: AUDIO.sting, 28 Sept 2026)
  ['uiMove', 'uiConfirm', 'uiBack', 'slipstream'],
  ['count', 'go', 'engine-idle', 'engine-mid', 'engine-high', 'drift', 'sparks', 'hop', 'land', 'tierUp', 'tierUp2', 'tierUp3',
    'boost1', 'boost2', 'boost3', 'boostStart', 'boostPad'],
  ['balloon', 'rouletteTick', 'itemReady', 'coin', 'throw', 'kite', 'drop', 'shieldUp', 'shieldPop', 'shieldEnd', 'airHorn', 'fog', 'fizz',
    'strikeRoll', 'strike', 'boing', 'slam', 'anchor', 'slingshot', 'mouse', 'blocked', 'trail', 'hitConfirm', 'hit', 'spin', 'bounce',
    'pop', 'denied', 'bump', 'wall', 'gainPlace', 'losePlace'],
]);
const TIER_OF: ReadonlyMap<string, number> = new Map(SFX_TIERS.flatMap((ids, tier) => ids.map((id) => [id, tier] as const)));
/**
 * A sound effect's turn (SFX_TIERS): the hit yelps go with the hits, the pick's sting (AUDIO.sting.id, the music lab's
 * when the manifest names it) with the menus' clicks, everything unlisted last.
 */
/** A course's bed of its own world in the manifest's sfx (28 Sept 2026, Adam: quiet sounds for each course, "waves,
 *  wind, birds", no voices). Long loops, so only the course being raced is fetched and kept (SampleBank.bed), never at
 *  the start with every other sound. */
export const ambienceId = (trackId: string): string => `amb-${trackId}`;
export const isAmbience = (id: string): boolean => id.startsWith('amb-');
export const sfxTier = (id: string): number => TIER_OF.get(id) ?? (id.startsWith('yelp:') ? 2 : id === AUDIO.sting.id ? 0 : SFX_TIERS.length);
/** The turn a song is fetched at: one is only asked for when it is wanted now (the title on the first key press, a race's as it loads). */
export const SONG_TIER = 0;
/**
 * The turn of a song's file fetched well ahead of its moment (a series' next course's music during the results:
 * GameAudio.courseChosen): behind every file wanted now, the results song first (main.ts moves it up as its race loads).
 */
export const SONG_AHEAD_TIER = 1;
/**
 * A song's file wanted this moment (a chosen course's music at its pick, the race about to be built: GameAudio.courseChosen):
 * main.ts fetches it at once, never waiting a turn in the line behind the background files.
 */
export const SONG_NOW_TIER = -1;
/** The racers' voice lines come down after every sound effect: a line not in yet is simply not said. */
export const VOICE_TIER = SFX_TIERS.length + 1;

/** The racers' voice lines (public/audio/voice.json, written by scripts/voice/build.ts): racer → moment → files, in take order. */
export type VoiceManifest = Record<string, Partial<Record<Bark, string[]>>>;

/**
 * A context that decodes at the voice lines' own 24 kHz (half the memory of the game's 48 kHz; an
 * AudioBuffer plays in any context), or the game's own where the browser has none.
 */
function voiceContext(ctx: BaseAudioContext): BaseAudioContext {
  const Off = (globalThis as { OfflineAudioContext?: new (channels: number, length: number, rate: number) => BaseAudioContext }).OfflineAudioContext;
  try { return Off ? new Off(1, 1, 24000) : ctx; } catch { return ctx; }
}

/**
 * Runs a file's download when its turn comes (main.ts: the game's one background line,
 * performance/loadQueue.ts): `tier` its turn (sfxTier, SONG_TIER), `song` the song's key when it is
 * one (big, and wanted at a moment of its own: the title's on the menus, a race's on its go).
 */
export type AudioSchedule = <T>(job: () => Promise<T>, tier: number, song?: string) => Promise<T>;

/** A song's file on its way: when its first bytes came (the bank's clock, ms), how many are in, of how many. */
interface Coming { t0: number; got: number; total: number }

/**
 * The manifest, every decoded sound effect, and songs decoded on demand (title, results and two race
 * songs kept: they are big). Every file comes down through `schedule`, in turn; a song's file can come
 * down ahead of its moment, bytes only (`prefetch`: the title's while the start screen waits).
 */
export class SampleBank {
  private manifest: Manifest | null = null;
  /** the manifest's fetch, once (no audio context needed) */
  private listing: Promise<Manifest | null> | null = null;
  private readonly sfx = new Map<string, Sample>();
  /** the course whose bed was asked for last (bed) */
  private bedWant = '';
  private readonly songs = new Map<string, Promise<Sample | null>>();
  /** each song's file by key, fetched once; a decode takes the bytes (it detaches them), so a song decoded is dropped here */
  private readonly files = new Map<string, Promise<ArrayBuffer | null>>();
  /** songs' files on their way, with how far they have got (readyIn), and those in hand, not decoded yet */
  private readonly coming = new Map<string, Coming>();
  private readonly inHand = new Set<string>();
  /** each racer's lines by `racer:moment`, in take order; a moment is here only once all its takes are in */
  private readonly lines = new Map<string, Sample[]>();
  private voicing: Promise<void> | null = null;
  /** songs whose recording is decoded and kept */
  private readonly ready = new Set<string>();
  private loading: Promise<void> | null = null;
  private readonly base: string;
  private readonly get_: typeof fetch;
  /** how each file waits its turn (the game's background line); unset, everything is fetched at once */
  schedule: AudioSchedule = (job) => job();
  /** called once the manifest is in (the songs can be asked for) */
  onManifest: (() => void) | null = null;
  /** called once the manifest and every sound effect are in */
  onLoaded: (() => void) | null = null;
  /** the clock a song's download is timed on (ms: readyIn); tests replace it */
  now: () => number = () => performance.now();

  constructor(base: string = import.meta.env?.BASE_URL ?? '/', f: typeof fetch = (...a) => fetch(...a)) {
    this.base = base;
    this.get_ = f;
  }

  /** The recordings' list, fetched once (no audio context needed); `onManifest` is told as it lands. Null offline. */
  private list(): Promise<Manifest | null> {
    this.listing ??= (async () => {
      const r = await this.get_(`${this.base}audio/manifest.json`).catch(() => null);
      if (!r?.ok) return null;
      const manifest = (await r.json()) as Manifest;
      this.manifest = manifest;
      this.onManifest?.();
      return manifest;
    })().catch(() => null);
    return this.listing;
  }

  /**
   * Fetch the manifest, then every sound effect in turn (SFX_TIERS: the menus', the race start's, the
   * items' and hits', the rest), each decoded as it lands. Safe to call again; fails soft.
   */
  load(ctx: BaseAudioContext): Promise<void> {
    this.loading ??= (async () => {
      const manifest = await this.list();
      if (!manifest) return;
      // asked for in turn order (a stable sort: the manifest's order within a turn)
      const ids = Object.keys(manifest.sfx).filter((id) => !isAmbience(id)).sort((a, b) => sfxTier(a) - sfxTier(b));
      await Promise.all(ids.map(async (id) => {
        const m = manifest.sfx[id];
        const b = await this.decode(ctx, m.url, sfxTier(id));
        if (b) this.sfx.set(id, cutSfx(b, !!m.loop, id));
      }));
      this.onLoaded?.();
    })().catch(() => undefined);
    return this.loading;
  }

  /**
   * The song `key`'s file, fetched ahead of its moment (the title's while the start screen waits for the first press;
   * browsers refuse sound before one; a chosen course's music: GameAudio.courseChosen): its bytes only, at its turn in
   * the line (`tier`: SONG_TIER; SONG_NOW_TIER at once; SONG_AHEAD_TIER well before its moment), and no audio context (none may start before
   * the press, and ?mute never makes one). With the recordings' list in, it is asked for at once, in the caller's own
   * turn (a race picked: before the race is built). `song()` decodes the bytes when the song is asked for, so its moment
   * waits for a decode, not a download. Safe to call again (a file is fetched once); fails soft.
   */
  prefetch(key: string, tier = SONG_TIER): Promise<void> {
    const ask = (l: Manifest | null): Promise<void> => {
      const m = l?.music?.[key];
      return m && !this.songs.has(key) ? this.file(key, m.url, tier).then(() => undefined) : Promise.resolve();
    };
    return this.manifest ? ask(this.manifest) : this.list().then(ask);
  }

  /** The file's bytes when its turn comes (the line is free again once they are in), then decoded. */
  private async decode(ctx: BaseAudioContext, url: string, tier: number): Promise<AudioBuffer | null> {
    try {
      const bytes = await this.schedule(async () => {
        const r = await this.get_(`${this.base}${url}`);
        return r.ok ? await r.arrayBuffer() : null;
      }, tier);
      return bytes ? await ctx.decodeAudioData(bytes) : null;
    } catch {
      return null;
    }
  }

  /** The song `key`'s file, once, at its turn (`tier`: SONG_TIER, SONG_NOW_TIER or SONG_AHEAD_TIER; the line knowing it for a song); how fast it comes is measured (readyIn). */
  private file(key: string, url: string, tier = SONG_TIER): Promise<ArrayBuffer | null> {
    let f = this.files.get(key);
    if (!f) {
      const mine = this.schedule(() => this.bytes(key, `${this.base}${url}`), tier, key).catch(() => null);
      f = mine;
      this.files.set(key, f);
      void mine.then((b) => {
        this.coming.delete(key);
        if (b && this.files.get(key) === mine) this.inHand.add(key);
      });
    }
    return f;
  }

  /** A song file's bytes, read as they come when the server gives its size (so readyIn can tell how long the rest will take). */
  private async bytes(key: string, url: string): Promise<ArrayBuffer | null> {
    const r = await this.get_(url);
    if (!r.ok) return null;
    const total = Number(r.headers?.get?.('content-length')) || 0;
    const reader = total > 0 ? r.body?.getReader?.() : undefined;
    if (!reader) return r.arrayBuffer();
    const c: Coming = { t0: this.now(), got: 0, total };
    this.coming.set(key, c);
    const parts: Uint8Array[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
      c.got += value.length;
    }
    const out = new Uint8Array(c.got);
    let at = 0;
    for (const p of parts) { out.set(p, at); at += p.length; }
    return out.buffer;
  }

  /**
   * About how long (seconds) until the song `key`'s recording can play: 0 once it is decoded; a decode's worth
   * (AUDIO.songDecode) with its file in hand or decoding; while its file comes, the rest of it at the speed it has
   * come so far, plus that; Infinity when nobody can tell (not asked for, waiting its turn, no size given).
   */
  readyIn(key: string): number {
    if (this.ready.has(key)) return 0;
    if (this.inHand.has(key)) return AUDIO.songDecode;
    const c = this.coming.get(key);
    const s = c ? (this.now() - c.t0) / 1000 : 0;
    if (!c || c.got <= 0 || s <= 0 || c.got > c.total) return Infinity;
    return (c.total - c.got) / (c.got / s) + AUDIO.songDecode;
  }

  /** Whether the song `key`'s file is in hand (fetched, or decoded already). */
  fetched(key: string): boolean { return this.inHand.has(key) || this.ready.has(key); }

  get(id: string): Sample | undefined { return this.sfx.get(id); }

  /**
   * The course `trackId`'s bed (ambienceId), fetched and decoded when its race is built, at once (SONG_NOW_TIER); then
   * `get` has it. One is kept: the last course's goes (a bed is long). Nothing when the manifest lists none; fails soft.
   */
  bed(ctx: BaseAudioContext, trackId: string): Promise<void> {
    const id = ambienceId(trackId);
    for (const k of this.sfx.keys()) if (isAmbience(k) && k !== id) this.sfx.delete(k);
    if (this.sfx.has(id)) return Promise.resolve();
    this.bedWant = id;
    return this.list().then(async (manifest) => {
      const m = manifest?.sfx[id];
      if (!m) return;
      const b = await this.decode(ctx, m.url, SONG_NOW_TIER);
      // a newer race's course asked meanwhile: this one is not kept
      if (b && this.bedWant === id) this.sfx.set(id, cutSfx(b, !!m.loop, id));
    }).catch(() => undefined);
  }

  /**
   * Fetch the voice list, then every racer's lines at VOICE_TIER, each levelled like a sound effect
   * (cutSfx) as it lands. Safe to call again; fails soft (no list, no lines: nobody speaks).
   */
  loadVoices(ctx: BaseAudioContext): Promise<void> {
    this.voicing ??= (async () => {
      const r = await this.get_(`${this.base}audio/voice.json`).catch(() => null);
      if (!r?.ok) return;
      const list = (await r.json()) as VoiceManifest;
      const low = voiceContext(ctx);
      await Promise.all(Object.entries(list).flatMap(([racerId, moments]) => Object.entries(moments).map(async ([bark, urls]) => {
        const got = await Promise.all((urls ?? []).map((u) => this.decode(low, u, VOICE_TIER)));
        if (got.length && got.every((b) => b)) this.lines.set(`${racerId}:${bark}`, got.map((b) => cutSfx(b!, false, 'voice')));
      })));
    })().catch(() => undefined);
    return this.voicing;
  }

  /** How many takes of a moment a racer has in (0 until they all are). */
  voiceCount(racerId: string, bark: Bark): number { return this.lines.get(`${racerId}:${bark}`)?.length ?? 0; }
  /** Take `n` of a racer's moment. */
  voiceLine(racerId: string, bark: Bark, n: number): Sample | undefined { return this.lines.get(`${racerId}:${bark}`)?.[n]; }
  hasSong(key: string): boolean { return !!this.manifest?.music[key]; }
  /** Whether the song's recording is decoded (else the synth stands in while it comes down). */
  isReady(key: string): boolean { return this.ready.has(key); }

  /** A decoded song, fetched on first ask (at SONG_TIER: it is wanted now) unless its file came ahead (prefetch). */
  song(ctx: BaseAudioContext, key: string): Promise<Sample | null> {
    const m = this.manifest?.music[key];
    if (!m) return Promise.resolve(null);
    let p = this.songs.get(key);
    if (!p) {
      const mine: Promise<Sample | null> = this.file(key, m.url).then(async (bytes) => {
        // the decode takes the bytes: a song dropped later (below) is fetched again when it is asked for again
        this.files.delete(key);
        const b = bytes ? await ctx.decodeAudioData(bytes).catch(() => null) : null;
        this.inHand.delete(key);
        // a course's intro piece plays once (introCue.ts); a song loops
        const s = b ? (isIntroKey(key) ? cutIntro(b, m.bpm) : cutSong(b, m.bpm, m.loop)) : null;
        if (s && this.songs.get(key) === mine) this.ready.add(key);
        return s;
      }).catch(() => null);
      p = mine;
      this.songs.set(key, p);
      // a decoded song is tens of MB: title and results stay (every race comes back to them), and the
      // two most recent race songs (a Grand Prix's next track, a retry); the intro pieces, small, the two most recent too
      const keys = [...this.songs.keys()];
      for (const kept of [keys.filter((k) => !KEEP_SONGS.has(k) && !isIntroKey(k)), keys.filter(isIntroKey)]) {
        for (let i = 0; i < kept.length - RACE_SONGS_KEPT; i++) { this.songs.delete(kept[i]); this.ready.delete(kept[i]); }
      }
    } else {
      this.songs.delete(key);
      this.songs.set(key, p);
    }
    return p;
  }
}

// ---------------------------------------------------------------- players

/** A playing one-shot that can be cut short (a quick fade, then it stops). */
export interface Voice { stop(at: number): void }

/** A one-shot from its first sound. */
export function playSample(ctx: BaseAudioContext, dest: AudioNode, s: Sample, when: number, gain: number, pan: number, rate = 1): Voice {
  const src = ctx.createBufferSource();
  src.buffer = s.buffer;
  src.playbackRate.value = rate;
  const g = ctx.createGain();
  g.gain.value = gain * s.gain;
  let tail: AudioNode = g;
  if (pan !== 0 && 'createStereoPanner' in ctx) {
    const sp = ctx.createStereoPanner();
    sp.pan.value = pan;
    g.connect(sp);
    tail = sp;
  }
  tail.connect(dest);
  src.connect(g);
  src.start(when, s.start);
  return {
    stop(at: number) {
      g.gain.cancelScheduledValues(at);
      g.gain.setTargetAtTime(0, at, 0.004);
      try { src.stop(at + 0.03); } catch { /* already stopped */ }
    },
  };
}

/**
 * A song looping between its loop points, sample-accurately (the source's own loop, with the wrap's
 * crossfade baked into the buffer by `cutSong`): no second pass to book, nothing to flam. On the
 * final lap it pauses for the fanfare and comes back from the top faster.
 */
export class SongPlayer {
  private readonly ctx: BaseAudioContext;
  private readonly dest: AudioNode;
  private s: Sample | null = null;
  private src: AudioBufferSourceNode | null = null;
  private out: GainNode | null = null;
  private rate = 1;

  constructor(ctx: BaseAudioContext, dest: AudioNode) {
    this.ctx = ctx;
    this.dest = dest;
  }

  start(s: Sample, when: number): void {
    this.stop(when, 0.3);
    this.s = s;
    this.rate = 1;
    this.play(when);
  }

  /** From the first beat, looping for as long as it plays. */
  private play(when: number): void {
    const s = this.s!;
    const src = this.ctx.createBufferSource();
    src.buffer = s.buffer;
    src.loop = true;
    src.loopStart = s.loopStart ?? s.start;
    src.loopEnd = s.loopEnd ?? s.end;
    src.playbackRate.value = this.rate;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(s.gain, when + FADE_IN);
    src.connect(g).connect(this.dest);
    src.start(when, s.start);
    this.src = src;
    this.out = g;
  }

  /** Final lap: the music stops for the fanfare, then comes back from the top faster and a semitone up. */
  lift(now: number): void {
    if (!this.s) return;
    this.fade(now, 0.25);
    this.rate = AUDIO.liftTempo;
    this.play(now + FANFARE_SECONDS);
  }

  stop(now: number, fade = 0.4): void {
    this.fade(now, fade);
    this.s = null;
  }

  private fade(now: number, seconds: number): void {
    if (!this.src || !this.out) return;
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setTargetAtTime(0, now, seconds / 4);
    this.src.stop(now + seconds + 0.05);
    this.src = null;
    this.out = null;
  }
}

/**
 * An engine from looped recordings. The player's has three bands crossfaded by rpm (plan §7.4),
 * the drift screech and the off-road rumble; the others' have the mid band only, panned. The bands
 * run through a low-pass that opens with the rpm (`engineCutoff`), so a slow kart is not all fizz.
 * `seed` sets where each loop starts, so no two engines (or bands) ever run in phase.
 */
export class LoopEngine {
  private readonly bands: { src: AudioBufferSourceNode; g: GainNode; s: Sample; band: number }[] = [];
  /** loops started on first use (the wheels' surfaces, the drift sparks), silent when not asked for */
  private readonly extras = new Map<string, { g: GainNode; src: AudioBufferSourceNode; s: Sample }>();
  private readonly ctx: BaseAudioContext;
  private readonly dest: AudioNode;
  private readonly out: GainNode;
  private readonly lp: BiquadFilterNode;
  private readonly pan: StereoPannerNode | null = null;
  private readonly screech: { g: GainNode; s: Sample } | null = null;
  private readonly rumble: { g: GainNode; s: Sample } | null = null;
  /**
   * The limiter's flutter (the player's engine, unpanned): a sawtooth at `AUDIO.engineRev.flutterHz`
   * chopping the level (`chop`: each cut drops it, then it climbs back) and wobbling the loops' rate a
   * little, audio-rate, so it holds at any frame rate. Silent (0 deep) until set() asks for it.
   */
  private readonly flutter: { osc: OscillatorNode; chopDepth: GainNode; rateDepth: GainNode[] } | null = null;

  constructor(ctx: BaseAudioContext, dest: AudioNode, loops: readonly (Sample | undefined)[], drift: Sample | undefined, panned: boolean, offroad?: Sample, seed = 0) {
    this.ctx = ctx;
    this.dest = dest;
    this.seed = seed;
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.lp = ctx.createBiquadFilter();
    this.lp.type = 'lowpass';
    this.lp.Q.value = 0.7;
    this.lp.frequency.value = engineCutoff(AUDIO.idleRpm);
    let chop: GainNode | null = null;
    if (!panned) { chop = ctx.createGain(); this.out.connect(chop).connect(this.lp); } else this.out.connect(this.lp);
    if (panned && 'createStereoPanner' in ctx) {
      this.pan = ctx.createStereoPanner();
      this.lp.connect(this.pan).connect(dest);
    } else this.lp.connect(dest);
    const loop = (s: Sample, into: AudioNode) => this.loop(s, into);
    loops.forEach((s, i) => {
      if (!s) return;
      const band = loops.length === 1 ? 1 : i;
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(this.out);
      this.bands.push({ src: loop(s, g), g, s, band });
    });
    if (chop) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = AUDIO.engineRev.flutterHz;
      const chopDepth = ctx.createGain();
      chopDepth.gain.value = 0;
      osc.connect(chopDepth).connect(chop.gain);
      const rateDepth = this.bands.map((b) => { const d = ctx.createGain(); d.gain.value = 0; osc.connect(d).connect(b.src.playbackRate); return d; });
      osc.start();
      this.flutter = { osc, chopDepth, rateDepth };
    }
    const layer = (s: Sample) => {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(dest);
      loop(s, g);
      return { g, s };
    };
    if (drift) this.screech = layer(drift);
    if (offroad) this.rumble = layer(offroad);
  }

  private layers = 0;
  private readonly seed: number;

  private loop(s: Sample, into: AudioNode): AudioBufferSourceNode {
    const src = this.ctx.createBufferSource();
    src.buffer = s.buffer;
    src.loop = true;
    const a = s.loopStart ?? 0, b = s.loopEnd ?? s.buffer.duration;
    if (s.loopEnd !== undefined) { src.loopStart = a; src.loopEnd = b; }
    src.connect(into);
    src.start(0, a + (b - a) * loopPhase(this.layers++, this.seed));
    return src;
  }

  /**
   * The extra loops for this frame, id → [level, rate]: each starts the first time it is asked for
   * (so a course only runs the surfaces it has) and every one not asked for fades to silence.
   */
  setExtras(t: number, want: ReadonlyMap<string, { s: Sample; gain: number; rate: number }>): void {
    for (const [id, w] of want) {
      let x = this.extras.get(id);
      if (!x) {
        if (w.gain <= 0) continue;
        const g = this.ctx.createGain();
        g.gain.value = 0;
        g.connect(this.dest);
        x = { g, s: w.s, src: this.loop(w.s, g) };
        this.extras.set(id, x);
      }
      x.g.gain.setTargetAtTime(w.gain * x.s.gain, t, 0.05);
      x.src.playbackRate.setTargetAtTime(w.rate, t, 0.05);
    }
    for (const [id, x] of this.extras) if (!want.has(id)) x.g.gain.setTargetAtTime(0, t, 0.05);
  }

  /** Whether this engine plays the recorded off-road rumble (else the synth one stands in). */
  get hasRumble(): boolean { return this.rumble !== null; }

  /**
   * Follow the rpm; `level` is the engine's loudness, `screech` the drift screech's, `rumble` the
   * off-road's, `pan` −1..1, `pitch` this racer's own pitch offset (racerPitch, class, boost rev),
   * `bright` the class's low-pass factor, `limit` 0..1 how hard the rev limiter works (its flutter:
   * the player's engine only).
   */
  set(t: number, rpm: number, level: number, screech = 0, pan = 0, rumble = 0, pitch = 1, bright = 1, limit = 0): void {
    const w = bandWeights(rpm), f = this.flutter, E = AUDIO.engineRev;
    for (let i = 0; i < this.bands.length; i++) {
      const b = this.bands[i], rate = bandRate(rpm, b.band) * pitch;
      b.src.playbackRate.setTargetAtTime(rate, t, 0.03);
      b.g.gain.setTargetAtTime((this.bands.length === 1 ? 1 : w[b.band]) * b.s.gain, t, 0.05);
      f?.rateDepth[i].gain.setTargetAtTime(limit * E.flutterRate * rate, t, 0.04);
    }
    f?.chopDepth.gain.setTargetAtTime(limit * E.flutterChop, t, 0.04);
    this.lp.frequency.setTargetAtTime(engineCutoff(rpm) * bright, t, 0.05);
    this.out.gain.setTargetAtTime(level, t, 0.05);
    this.pan?.pan.setTargetAtTime(pan, t, 0.1);
    if (this.screech) this.screech.g.gain.setTargetAtTime(screech * this.screech.s.gain, t, 0.05);
    if (this.rumble) this.rumble.g.gain.setTargetAtTime(rumble * this.rumble.s.gain, t, 0.05);
  }
}

/** Where loop `layer` of the engine with `seed` starts, as a share of the loop (0..1): no two alike. */
export function loopPhase(layer: number, seed: number): number {
  const x = 0.13 + 0.29 * layer + 0.37 * seed;
  return x - Math.floor(x);
}
