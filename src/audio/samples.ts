// Recorded sounds and songs (made with ElevenLabs: scripts/elevenlabs/catalog.ts). The synth stays
// the fallback: anything missing from public/audio/manifest.json, or not decoded yet, plays as before.
// The analysis (trim, level, tempo, loop point, engine bands) is pure and tested; the players are
// thin Web Audio.
import { AUDIO } from './constants.ts';

export interface Manifest {
  sfx: Record<string, { url: string; loop?: boolean }>;
  music: Record<string, { url: string; bpm: number }>;
}

/** What the analysis found in one recording. Times are buffer seconds. */
export interface Cut { start: number; end: number; gain: number }
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
/** a song's next pass fades in this fast; the pass before rings on this long past the loop point */
const FADE_IN = 0.008, TAIL = 0.15;
/** the final-lap fanfare's length: the music waits this long before it comes back faster */
export const FANFARE_SECONDS = 2.1;

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

/**
 * The recorded mix: every recording is levelled to the same peak, then set here. Big moments stand
 * out; sounds that fire every few seconds (boosts, hops, ticks) sit back. Missing ids are 0.9.
 */
const MIX: Readonly<Record<string, number>> = Object.freeze({
  uiMove: 0.5, uiConfirm: 0.7, uiBack: 0.6, rouletteTick: 0.45,
  count: 1, go: 1.2, lap: 0.9, finalLap: 1.2, finish: 1.2, finishLow: 1,
  balloon: 0.8, coin: 0.7, itemReady: 0.8,
  throw: 0.9, kite: 0.8, drop: 0.8, shieldUp: 0.8, shieldPop: 0.9, airHorn: 1.1, fog: 0.8, rocket: 1,
  fizz: 1, strikeRoll: 1, strike: 1.1, boing: 0.9, slam: 1.1, anchor: 0.9, slingshot: 0.9, mouse: 0.8, blocked: 0.8, denied: 0.6, trail: 0.6,
  roar: 1.2, stomp: 1.2, yetiThrow: 0.9, snowThud: 1, krakenRise: 1, krakenSlam: 1.2, crabClack: 0.9, honk: 1.1, whaleSong: 1, tailSlap: 1.1,
  claw: 1, clawDrop: 0.9, loop: 0.9, ventWarn: 0.7, geyser: 0.9, steamVent: 0.85,
  hit: 1, spin: 1,
  boost1: 0.75, boost2: 0.85, boost3: 1, boostPad: 0.85, boostTrick: 0.9, boostStart: 1, tierUp: 0.5,
  hop: 0.6, land: 0.7, wall: 0.8, bump: 0.8,
  gainPlace: 0.6, losePlace: 0.5, wrongWay: 0.8, respawn: 0.8,
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

function cutSfx(b: AudioBuffer, loop: boolean): Sample {
  const chs = channels(b), env = envelope(chs, b.sampleRate);
  if (loop) return { buffer: b, start: 0, end: b.duration, gain: levelGain(meanRms(env), LOOP_RMS) };
  return { buffer: b, start: leadIn(chs, b.sampleRate), end: b.duration, gain: levelGain(peakRms(env), SFX_RMS) };
}

function cutSong(b: AudioBuffer, bpm: number): Sample {
  const env = envelope(channels(b), b.sampleRate);
  const p = loopPoints(env, bpm);
  return { buffer: b, start: p.start, end: Math.min(p.end, b.duration - TAIL), gain: levelGain(meanRms(env), SONG_RMS, 3) };
}

/** The manifest, every decoded sound effect, and songs decoded on demand (two kept: they are big). */
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
      // a decoded song is tens of MB: keep the two most recent
      while (this.songs.size > 2) this.songs.delete(this.songs.keys().next().value!);
    } else {
      this.songs.delete(key);
      this.songs.set(key, p);
    }
    return p;
  }
}

// ---------------------------------------------------------------- players

/** A one-shot from its first sound. */
export function playSample(ctx: BaseAudioContext, dest: AudioNode, s: Sample, when: number, gain: number, pan: number, rate = 1): void {
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
}

/** A song looping between its loop points; on the final lap it pauses for the fanfare and comes back faster. */
export class SongPlayer {
  private readonly ctx: BaseAudioContext;
  private readonly dest: AudioNode;
  private s: Sample | null = null;
  private src: AudioBufferSourceNode | null = null;
  private out: GainNode | null = null;
  /** context time the current pass reaches the loop end */
  private nextAt = Infinity;
  private rate = 1;

  constructor(ctx: BaseAudioContext, dest: AudioNode) {
    this.ctx = ctx;
    this.dest = dest;
  }

  start(s: Sample, when: number): void {
    this.stop(when, 0.3);
    this.s = s;
    this.rate = 1;
    this.pass(when);
  }

  /** One pass from the loop start. The pass before keeps ringing a moment past the loop point. */
  private pass(when: number): void {
    const s = this.s!;
    const src = this.ctx.createBufferSource();
    src.buffer = s.buffer;
    src.playbackRate.value = this.rate;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(s.gain, when + FADE_IN);
    src.connect(g).connect(this.dest);
    src.start(when, s.start);
    if (this.src && this.out) {
      this.out.gain.setValueAtTime(s.gain, when);
      this.out.gain.linearRampToValueAtTime(0, when + TAIL);
      this.src.stop(when + TAIL + 0.02);
    }
    this.src = src;
    this.out = g;
    this.nextAt = when + (s.end - s.start) / this.rate;
  }

  /** Book the next pass shortly before it is due (the audio clock, not frames). */
  pump(now: number): void {
    if (this.s && this.nextAt - now < 0.3) this.pass(this.nextAt);
  }

  /** Final lap: the music stops for the fanfare, then comes back from the top faster and a semitone up. */
  lift(now: number): void {
    if (!this.s) return;
    this.fade(now, 0.25);
    this.rate = AUDIO.liftTempo;
    this.pass(now + FANFARE_SECONDS);
  }

  stop(now: number, fade = 0.4): void {
    this.fade(now, fade);
    this.s = null;
    this.nextAt = Infinity;
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
 * An engine from looped recordings. The player's has three bands crossfaded by rpm (plan §7.4)
 * and the drift screech; the others' have the mid band only, panned.
 */
export class LoopEngine {
  private readonly bands: { src: AudioBufferSourceNode; g: GainNode; s: Sample; band: number }[] = [];
  private readonly out: GainNode;
  private readonly pan: StereoPannerNode | null = null;
  private readonly screech: { g: GainNode; s: Sample } | null = null;

  constructor(ctx: BaseAudioContext, dest: AudioNode, loops: readonly (Sample | undefined)[], drift: Sample | undefined, panned: boolean) {
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    if (panned && 'createStereoPanner' in ctx) {
      this.pan = ctx.createStereoPanner();
      this.out.connect(this.pan).connect(dest);
    } else this.out.connect(dest);
    const loop = (s: Sample, into: AudioNode) => {
      const src = ctx.createBufferSource();
      src.buffer = s.buffer;
      src.loop = true;
      src.connect(into);
      // start each loop at a different point so the bands never phase together
      src.start(0, (s.buffer.duration * (0.13 + 0.29 * this.bands.length)) % s.buffer.duration);
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
    if (drift) {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(dest);
      loop(drift, g);
      this.screech = { g, s: drift };
    }
  }

  /** Follow the rpm; `level` is the engine's loudness, `screech` the drift screech's, `pan` −1..1. */
  set(t: number, rpm: number, level: number, screech = 0, pan = 0): void {
    const w = bandWeights(rpm);
    for (const b of this.bands) {
      b.src.playbackRate.setTargetAtTime(bandRate(rpm, b.band), t, 0.03);
      b.g.gain.setTargetAtTime((this.bands.length === 1 ? 1 : w[b.band]) * b.s.gain, t, 0.05);
    }
    this.out.gain.setTargetAtTime(level, t, 0.05);
    this.pan?.pan.setTargetAtTime(pan, t, 0.1);
    if (this.screech) this.screech.g.gain.setTargetAtTime(screech * this.screech.s.gain, t, 0.05);
  }
}
