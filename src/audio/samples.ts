// Recorded sounds and songs (made with ElevenLabs: scripts/elevenlabs/catalog.ts). The synth stays
// the fallback: anything missing from public/audio/manifest.json, or not decoded yet, plays as before.
// The analysis (trim, level, tempo, loop point, engine bands) is pure and tested; the players are
// thin Web Audio.
import { AUDIO } from './constants.ts';
import { engineCutoff } from './engine.ts';

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
}
export interface Sample extends Cut { buffer: AudioBuffer }

/** Music per track (design §11: five race themes; the two cup finales share the orchestral one). */
export const RACE_THEME: Readonly<Record<string, string>> = Object.freeze({
  'harbour-loop': 'race-harbour', 'meadow-run': 'race-meadow', 'canyon-rush': 'race-finale',
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
export const STING_SECONDS = Object.freeze({ finish: 4.1, finishLow: 2.3, koOut: 2.3, koSafe: 2.1 });

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
  uiMove: -8, uiConfirm: -5, uiBack: -6, rouletteTick: -3, itemReady: -2, coin: 0, balloon: -1,
  gainPlace: -2, losePlace: -3, wrongWay: -2, respawn: -3, denied: -6,
  // items
  throw: -3, kite: -3, drop: -1, shieldUp: -3, shieldPop: -2, shieldEnd: -3, airHorn: 0, fog: -3, bounce: -5, pop: -5,
  fizz: -2, strikeRoll: -2, strike: 0, boing: -2, slam: 0, anchor: -2, slingshot: -2, mouse: -3, blocked: -3, trail: -1, hitConfirm: -1,
  hit: 0, spin: 0,
  // boosts and sparks: each tier over the last
  boost1: -3, boost2: -2, boost3: -1, boostPad: -3, boostTrick: -2, boostStart: -1, slipstream: -2.5, trick: -3,
  tierUp: -1.5, tierUp2: -0.5, tierUp3: 0.5,
  // driving
  hop: -5, land: -3, wall: -1, bump: -3, loop: -2, claw: -2, clawDrop: -3,
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
  return { buffer: b, start: Math.min(p.start, w.start), end: w.end, loopStart: w.start, loopEnd: w.end, gain: peakSafe(levelGain(songLevel(chs, b.sampleRate, w.start, w.end), SONG_K, 3), samplePeak(chs)) };
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
  ['uiMove', 'uiConfirm', 'uiBack'],
  ['count', 'go', 'engine-idle', 'engine-mid', 'engine-high', 'drift', 'sparks', 'hop', 'land', 'tierUp', 'tierUp2', 'tierUp3',
    'boost1', 'boost2', 'boost3', 'boostStart', 'boostPad'],
  ['balloon', 'rouletteTick', 'itemReady', 'coin', 'throw', 'kite', 'drop', 'shieldUp', 'shieldPop', 'shieldEnd', 'airHorn', 'fog', 'fizz',
    'strikeRoll', 'strike', 'boing', 'slam', 'anchor', 'slingshot', 'mouse', 'blocked', 'trail', 'hitConfirm', 'hit', 'spin', 'bounce',
    'pop', 'denied', 'bump', 'wall', 'gainPlace', 'losePlace'],
]);
const TIER_OF: ReadonlyMap<string, number> = new Map(SFX_TIERS.flatMap((ids, tier) => ids.map((id) => [id, tier] as const)));
/** A sound effect's turn (SFX_TIERS): the hit yelps go with the hits, everything unlisted last. */
export const sfxTier = (id: string): number => TIER_OF.get(id) ?? (id.startsWith('yelp:') ? 2 : SFX_TIERS.length);
/** The turn a song is fetched at: one is only asked for when it is wanted now (the title on the first key press, a race's as it loads). */
export const SONG_TIER = 0;

/**
 * Runs a file's download when its turn comes (main.ts: the game's one background line,
 * performance/loadQueue.ts): `tier` its turn (sfxTier, SONG_TIER), `song` the song's key when it is
 * one (big, and wanted at a moment of its own: the title's on the menus, a race's on its go).
 */
export type AudioSchedule = <T>(job: () => Promise<T>, tier: number, song?: string) => Promise<T>;

/**
 * The manifest, every decoded sound effect, and songs decoded on demand (title, results and two race
 * songs kept: they are big). Every file comes down through `schedule`, in turn.
 */
export class SampleBank {
  private manifest: Manifest | null = null;
  private readonly sfx = new Map<string, Sample>();
  private readonly songs = new Map<string, Promise<Sample | null>>();
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

  constructor(base: string = import.meta.env?.BASE_URL ?? '/', f: typeof fetch = (...a) => fetch(...a)) {
    this.base = base;
    this.get_ = f;
  }

  /**
   * Fetch the manifest, then every sound effect in turn (SFX_TIERS: the menus', the race start's, the
   * items' and hits', the rest), each decoded as it lands. Safe to call again; fails soft.
   */
  load(ctx: BaseAudioContext): Promise<void> {
    this.loading ??= (async () => {
      const r = await this.get_(`${this.base}audio/manifest.json`).catch(() => null);
      if (!r?.ok) return;
      const manifest = (await r.json()) as Manifest;
      this.manifest = manifest;
      this.onManifest?.();
      // asked for in turn order (a stable sort: the manifest's order within a turn)
      const ids = Object.keys(manifest.sfx).sort((a, b) => sfxTier(a) - sfxTier(b));
      await Promise.all(ids.map(async (id) => {
        const m = manifest.sfx[id];
        const b = await this.decode(ctx, m.url, sfxTier(id));
        if (b) this.sfx.set(id, cutSfx(b, !!m.loop, id));
      }));
      this.onLoaded?.();
    })().catch(() => undefined);
    return this.loading;
  }

  /** The file's bytes when its turn comes (the line is free again once they are in), then decoded. */
  private async decode(ctx: BaseAudioContext, url: string, tier: number, song?: string): Promise<AudioBuffer | null> {
    try {
      const bytes = await this.schedule(async () => {
        const r = await this.get_(`${this.base}${url}`);
        return r.ok ? await r.arrayBuffer() : null;
      }, tier, song);
      return bytes ? await ctx.decodeAudioData(bytes) : null;
    } catch {
      return null;
    }
  }

  get(id: string): Sample | undefined { return this.sfx.get(id); }
  hasSong(key: string): boolean { return !!this.manifest?.music[key]; }
  /** Whether the song's recording is decoded (else the synth stands in while it comes down). */
  isReady(key: string): boolean { return this.ready.has(key); }

  /** A decoded song, fetched on first ask (at SONG_TIER: it is wanted now). */
  song(ctx: BaseAudioContext, key: string): Promise<Sample | null> {
    const m = this.manifest?.music[key];
    if (!m) return Promise.resolve(null);
    let p = this.songs.get(key);
    if (!p) {
      const mine: Promise<Sample | null> = this.decode(ctx, m.url, SONG_TIER, key).then((b) => {
        const s = b ? cutSong(b, m.bpm, m.loop) : null;
        if (s && this.songs.get(key) === mine) this.ready.add(key);
        return s;
      });
      p = mine;
      this.songs.set(key, p);
      // a decoded song is tens of MB: title and results stay (every race comes back to them), and the
      // two most recent race songs (a Grand Prix's next track, a retry)
      const race = [...this.songs.keys()].filter((k) => !KEEP_SONGS.has(k));
      for (let i = 0; i < race.length - RACE_SONGS_KEPT; i++) { this.songs.delete(race[i]); this.ready.delete(race[i]); }
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
    this.out.connect(this.lp);
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
   * `bright` the class's low-pass factor.
   */
  set(t: number, rpm: number, level: number, screech = 0, pan = 0, rumble = 0, pitch = 1, bright = 1): void {
    const w = bandWeights(rpm);
    for (const b of this.bands) {
      b.src.playbackRate.setTargetAtTime(bandRate(rpm, b.band) * pitch, t, 0.03);
      b.g.gain.setTargetAtTime((this.bands.length === 1 ? 1 : w[b.band]) * b.s.gain, t, 0.05);
    }
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
