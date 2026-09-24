// Recorded sounds and songs (made with ElevenLabs: scripts/elevenlabs/catalog.ts). The synth stays
// the fallback: anything missing from public/audio/manifest.json, or not decoded yet, plays as before.
// The analysis (trim, level, tempo, loop point, engine bands) is pure and tested; the players are
// thin Web Audio.
import { AUDIO } from './constants.ts';
import { engineCutoff } from './engine.ts';

export interface Manifest {
  sfx: Record<string, { url: string; loop?: boolean }>;
  music: Record<string, { url: string; bpm: number }>;
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
/** loudness targets (RMS): a sound effect at its loudest moment, a loop and a song on average */
const SFX_RMS = 0.2, LOOP_RMS = 0.16, SONG_RMS = 0.16;
/** a song fades in this fast when it starts; the loop end stays this far inside the file */
const FADE_IN = 0.008, TAIL = 0.15;
/** the final-lap fanfare's length: the music waits this long before it comes back faster */
export const FANFARE_SECONDS = 2.1;
/** the stings' lengths (catalog `finish`, `finishLow`, `koOut`, `koSafe`, plus a breath): the results song waits for their last chord */
export const STING_SECONDS = Object.freeze({ finish: 3.6, finishLow: 2.3, koOut: 2.3, koSafe: 2.1 });

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
 * The recorded mix: every recording is levelled to the same peak, then set here. Big moments stand
 * out; sounds that fire every few seconds (boosts, hops, ticks) sit back. Missing ids are 0.9.
 */
const MIX: Readonly<Record<string, number>> = Object.freeze({
  uiMove: 0.5, uiConfirm: 0.7, uiBack: 0.6, rouletteTick: 0.45,
  count: 1, go: 1.2, lap: 0.9, finalLap: 1.2, finish: 1.2, finishLow: 1,
  balloon: 0.8, coin: 0.7, itemReady: 0.8,
  throw: 0.9, kite: 0.8, drop: 0.8, shieldUp: 0.8, shieldPop: 0.9, shieldEnd: 0.6, airHorn: 1.1, fog: 0.8, bounce: 0.7, pop: 0.7,
  fizz: 1, strikeRoll: 1, strike: 1.1, boing: 0.9, slam: 1.1, anchor: 0.9, slingshot: 0.9, mouse: 0.8, blocked: 0.8, denied: 0.6, trail: 0.6,
  roar: 1.2, stomp: 1.2, yetiThrow: 0.9, snowThud: 1, krakenRise: 1, krakenSlam: 1.2, crabClack: 0.9, honk: 1.1, whaleSong: 1, tailSlap: 1.1,
  claw: 1, clawDrop: 0.9, loop: 0.9, ventWarn: 0.7, geyser: 0.9, steamVent: 0.85,
  hit: 1, hitConfirm: 0.9, spin: 1,
  boost1: 0.75, boost2: 0.85, boost3: 1, boostPad: 0.85, boostTrick: 0.9, boostStart: 1, slipstream: 0.85, tierUp: 0.5, tierUp2: 0.6, tierUp3: 0.7,
  hop: 0.6, land: 0.7, wall: 0.8, bump: 0.8,
  gainPlace: 0.6, losePlace: 0.5, wrongWay: 0.8, respawn: 0.8,
  shift: 1.2, koOut: 1.1, koSafe: 1.1, trick: 0.8,
});
export const mixLevel = (id: string): number => MIX[id] ?? (id.startsWith('yelp:') ? 1 : 0.9);

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

/** Level a sound effect (its peak never past the ceiling); a loop also gets its wrap baked seamless. */
export function cutSfx(b: AudioBuffer, loop: boolean): Sample {
  const chs = channels(b), env = envelope(chs, b.sampleRate), peak = samplePeak(chs);
  if (loop) {
    const w = bakeLoop(chs, b.sampleRate, 0, b.duration, AUDIO.loopFade);
    return { buffer: b, start: w.start, end: w.end, loopStart: w.start, loopEnd: w.end, gain: peakSafe(levelGain(meanRms(env), LOOP_RMS), peak) };
  }
  return { buffer: b, start: leadIn(chs, b.sampleRate), end: b.duration, gain: peakSafe(levelGain(peakRms(env), SFX_RMS), peak) };
}

/** Level a song and find its loop; the first pass starts on its first beat, the wrap is baked seamless. */
export function cutSong(b: AudioBuffer, bpm: number): Sample {
  const chs = channels(b), env = envelope(chs, b.sampleRate);
  const p = loopPoints(env, bpm);
  const w = bakeLoop(chs, b.sampleRate, p.start, Math.min(p.end, b.duration - TAIL), AUDIO.songFade);
  return { buffer: b, start: p.start, end: w.end, loopStart: w.start, loopEnd: w.end, gain: peakSafe(levelGain(meanRms(env), SONG_RMS, 3), samplePeak(chs)) };
}

/** Songs kept decoded whatever else is asked for: the menus' and the results'. Race songs: the two most recent. */
const KEEP_SONGS: ReadonlySet<string> = new Set(['title', 'results']);
const RACE_SONGS_KEPT = 2;

/** The manifest, every decoded sound effect, and songs decoded on demand (title, results and two race songs kept: they are big). */
export class SampleBank {
  private manifest: Manifest | null = null;
  private readonly sfx = new Map<string, Sample>();
  private readonly songs = new Map<string, Promise<Sample | null>>();
  private loading: Promise<void> | null = null;
  private readonly base: string;
  private readonly get_: typeof fetch;
  /** called once the manifest and the sound effects are ready */
  onLoaded: (() => void) | null = null;

  constructor(base: string = import.meta.env?.BASE_URL ?? '/', f: typeof fetch = (...a) => fetch(...a)) {
    this.base = base;
    this.get_ = f;
  }

  /** Fetch the manifest and decode every sound effect. Safe to call again; fails soft. */
  load(ctx: BaseAudioContext): Promise<void> {
    this.loading ??= (async () => {
      const r = await this.get_(`${this.base}audio/manifest.json`).catch(() => null);
      if (!r?.ok) return;
      this.manifest = (await r.json()) as Manifest;
      await Promise.all(Object.entries(this.manifest.sfx).map(async ([id, m]) => {
        const b = await this.decode(ctx, m.url);
        if (b) this.sfx.set(id, cutSfx(b, !!m.loop));
      }));
      this.onLoaded?.();
    })().catch(() => undefined);
    return this.loading;
  }

  private async decode(ctx: BaseAudioContext, url: string): Promise<AudioBuffer | null> {
    try {
      const r = await this.get_(`${this.base}${url}`);
      return r.ok ? await ctx.decodeAudioData(await r.arrayBuffer()) : null;
    } catch {
      return null;
    }
  }

  get(id: string): Sample | undefined { return this.sfx.get(id); }
  hasSong(key: string): boolean { return !!this.manifest?.music[key]; }

  /** A decoded song, fetched on first ask. */
  song(ctx: BaseAudioContext, key: string): Promise<Sample | null> {
    const m = this.manifest?.music[key];
    if (!m) return Promise.resolve(null);
    let p = this.songs.get(key);
    if (!p) {
      p = this.decode(ctx, m.url).then((b) => (b ? cutSong(b, m.bpm) : null));
      this.songs.set(key, p);
      // a decoded song is tens of MB: title and results stay (every race comes back to them), and the
      // two most recent race songs (a Grand Prix's next track, a retry)
      const race = [...this.songs.keys()].filter((k) => !KEEP_SONGS.has(k));
      for (let i = 0; i < race.length - RACE_SONGS_KEPT; i++) this.songs.delete(race[i]);
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
  private readonly out: GainNode;
  private readonly lp: BiquadFilterNode;
  private readonly pan: StereoPannerNode | null = null;
  private readonly screech: { g: GainNode; s: Sample } | null = null;
  private readonly rumble: { g: GainNode; s: Sample } | null = null;

  constructor(ctx: BaseAudioContext, dest: AudioNode, loops: readonly (Sample | undefined)[], drift: Sample | undefined, panned: boolean, offroad?: Sample, seed = 0) {
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
    let layers = 0;
    const loop = (s: Sample, into: AudioNode) => {
      const src = ctx.createBufferSource();
      src.buffer = s.buffer;
      src.loop = true;
      const a = s.loopStart ?? 0, b = s.loopEnd ?? s.buffer.duration;
      if (s.loopEnd !== undefined) { src.loopStart = a; src.loopEnd = b; }
      src.connect(into);
      src.start(0, a + (b - a) * loopPhase(layers++, seed));
      return src;
    };
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

  /** Whether this engine plays the recorded off-road rumble (else the synth one stands in). */
  get hasRumble(): boolean { return this.rumble !== null; }

  /**
   * Follow the rpm; `level` is the engine's loudness, `screech` the drift screech's, `rumble` the
   * off-road's, `pan` −1..1, `pitch` this racer's own pitch offset (racerPitch).
   */
  set(t: number, rpm: number, level: number, screech = 0, pan = 0, rumble = 0, pitch = 1): void {
    const w = bandWeights(rpm);
    for (const b of this.bands) {
      b.src.playbackRate.setTargetAtTime(bandRate(rpm, b.band) * pitch, t, 0.03);
      b.g.gain.setTargetAtTime((this.bands.length === 1 ? 1 : w[b.band]) * b.s.gain, t, 0.05);
    }
    this.lp.frequency.setTargetAtTime(engineCutoff(rpm), t, 0.05);
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
