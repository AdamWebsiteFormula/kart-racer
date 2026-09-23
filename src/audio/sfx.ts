// Sound effects as small synth patches, played by one generic voice. Every SfxId has a patch.
// The patch table is pure data (tested); playPatch() is the only Web Audio code here.
import type { SfxId } from './types.ts';

export type Wave = OscillatorType | 'noise';

export interface Patch {
  wave: Wave;
  /** start and end frequency (Hz); the pitch glides over `glide` seconds */
  f0: number;
  f1?: number;
  glide?: number;
  attack: number;
  /** seconds from peak to silence */
  decay: number;
  /** seconds held at peak before the decay */
  hold?: number;
  gain: number;
  filter?: { type: BiquadFilterType; f0: number; f1?: number; q?: number };
  /** semitone steps played in sequence, each `stepDur` long (arpeggios, fanfares, double chirps) */
  steps?: number[];
  stepDur?: number;
  /** a second oscillator this many cents off (fatter tone) */
  detune?: number;
  /** vibrato depth (cents) and rate (Hz) */
  vibrato?: [number, number];
}

const P = (p: Patch) => Object.freeze(p);

export const PATCHES: Readonly<Record<SfxId, Patch>> = Object.freeze({
  // race flow
  count: P({ wave: 'square', f0: 523, attack: 0.005, hold: 0.12, decay: 0.12, gain: 0.35, filter: { type: 'lowpass', f0: 3000 } }),
  go: P({ wave: 'square', f0: 1047, attack: 0.005, hold: 0.3, decay: 0.35, gain: 0.4, detune: 7, filter: { type: 'lowpass', f0: 4000 } }),
  lap: P({ wave: 'triangle', f0: 784, attack: 0.005, decay: 0.18, gain: 0.45, steps: [0, 4, 7], stepDur: 0.08 }),
  finalLap: P({ wave: 'sawtooth', f0: 523, attack: 0.01, hold: 0.05, decay: 0.3, gain: 0.35, steps: [0, 4, 7, 12, 7, 12], stepDur: 0.1, detune: 9, filter: { type: 'lowpass', f0: 1800, f1: 5000 } }),
  finish: P({ wave: 'sawtooth', f0: 523, attack: 0.01, hold: 0.1, decay: 0.8, gain: 0.35, steps: [0, 4, 7, 12, 16, 19, 24], stepDur: 0.09, detune: 8, filter: { type: 'lowpass', f0: 2500, f1: 6000 } }),
  finishLow: P({ wave: 'triangle', f0: 392, attack: 0.01, decay: 0.5, gain: 0.4, steps: [0, 4, 7, 5], stepDur: 0.14 }),
  // pickups and items
  balloon: P({ wave: 'noise', f0: 1, attack: 0.001, decay: 0.12, gain: 0.5, filter: { type: 'bandpass', f0: 2600, f1: 900, q: 1.5 } }),
  coin: P({ wave: 'square', f0: 988, attack: 0.002, decay: 0.16, gain: 0.25, steps: [0, 5], stepDur: 0.06 }),
  rouletteTick: P({ wave: 'square', f0: 1760, attack: 0.001, decay: 0.03, gain: 0.12 }),
  itemReady: P({ wave: 'triangle', f0: 880, attack: 0.003, decay: 0.2, gain: 0.4, steps: [0, 7, 12], stepDur: 0.05 }),
  throw: P({ wave: 'sine', f0: 300, f1: 900, glide: 0.12, attack: 0.005, decay: 0.15, gain: 0.45 }),
  kite: P({ wave: 'sawtooth', f0: 500, f1: 1200, glide: 0.35, attack: 0.02, decay: 0.3, gain: 0.25, vibrato: [60, 9], filter: { type: 'lowpass', f0: 2000 } }),
  drop: P({ wave: 'sine', f0: 420, f1: 160, glide: 0.15, attack: 0.003, decay: 0.2, gain: 0.45 }),
  shieldUp: P({ wave: 'sine', f0: 400, f1: 1200, glide: 0.3, attack: 0.02, decay: 0.3, gain: 0.35, vibrato: [30, 12] }),
  shieldPop: P({ wave: 'noise', f0: 1, attack: 0.001, decay: 0.2, gain: 0.45, filter: { type: 'highpass', f0: 1800 } }),
  airHorn: P({ wave: 'sawtooth', f0: 233, attack: 0.02, hold: 0.45, decay: 0.2, gain: 0.45, detune: 14, filter: { type: 'lowpass', f0: 1400 } }),
  fog: P({ wave: 'noise', f0: 1, attack: 0.25, hold: 0.3, decay: 0.8, gain: 0.35, filter: { type: 'lowpass', f0: 500, f1: 180 } }),
  rocket: P({ wave: 'noise', f0: 1, attack: 0.01, decay: 0.6, gain: 0.45, filter: { type: 'bandpass', f0: 600, f1: 3500, q: 0.8 } }),
  hit: P({ wave: 'square', f0: 220, f1: 110, glide: 0.2, attack: 0.002, decay: 0.25, gain: 0.4, filter: { type: 'lowpass', f0: 1200 } }),
  spin: P({ wave: 'square', f0: 700, f1: 120, glide: 0.6, attack: 0.002, decay: 0.65, gain: 0.35, vibrato: [300, 14], filter: { type: 'lowpass', f0: 1800 } }),
  // boosts: the drift tiers rise in pitch and length
  boost1: P({ wave: 'noise', f0: 1, attack: 0.01, decay: 0.35, gain: 0.35, filter: { type: 'bandpass', f0: 800, f1: 2200, q: 1 } }),
  boost2: P({ wave: 'noise', f0: 1, attack: 0.01, decay: 0.6, gain: 0.4, filter: { type: 'bandpass', f0: 1000, f1: 3200, q: 1 } }),
  boost3: P({ wave: 'noise', f0: 1, attack: 0.01, decay: 0.9, gain: 0.45, filter: { type: 'bandpass', f0: 1200, f1: 4500, q: 1.2 } }),
  boostPad: P({ wave: 'sawtooth', f0: 330, f1: 990, glide: 0.2, attack: 0.005, decay: 0.3, gain: 0.25, filter: { type: 'lowpass', f0: 3000 } }),
  boostTrick: P({ wave: 'triangle', f0: 660, attack: 0.003, decay: 0.25, gain: 0.35, steps: [0, 4, 7, 12], stepDur: 0.05 }),
  boostStart: P({ wave: 'sawtooth', f0: 440, f1: 1320, glide: 0.25, attack: 0.005, decay: 0.4, gain: 0.3, detune: 10, filter: { type: 'lowpass', f0: 3500 } }),
  tierUp: P({ wave: 'square', f0: 1320, attack: 0.002, decay: 0.08, gain: 0.18, steps: [0, 7], stepDur: 0.04 }),
  hop: P({ wave: 'sine', f0: 260, f1: 520, glide: 0.08, attack: 0.003, decay: 0.1, gain: 0.25 }),
  land: P({ wave: 'noise', f0: 1, attack: 0.002, decay: 0.12, gain: 0.35, filter: { type: 'lowpass', f0: 400 } }),
  wall: P({ wave: 'noise', f0: 1, attack: 0.002, decay: 0.18, gain: 0.45, filter: { type: 'lowpass', f0: 700 } }),
  bump: P({ wave: 'sine', f0: 160, f1: 70, glide: 0.1, attack: 0.002, decay: 0.15, gain: 0.5 }),
  wrongWay: P({ wave: 'square', f0: 440, attack: 0.005, hold: 0.12, decay: 0.08, gain: 0.25, steps: [0, -3, 0, -3], stepDur: 0.18, filter: { type: 'lowpass', f0: 2000 } }),
  gainPlace: P({ wave: 'triangle', f0: 660, attack: 0.003, decay: 0.12, gain: 0.25, steps: [0, 5], stepDur: 0.05 }),
  losePlace: P({ wave: 'triangle', f0: 440, attack: 0.003, decay: 0.12, gain: 0.2, steps: [0, -5], stepDur: 0.06 }),
  respawn: P({ wave: 'sine', f0: 900, f1: 300, glide: 0.4, attack: 0.01, decay: 0.4, gain: 0.3, vibrato: [40, 7] }),
  // UI
  uiMove: P({ wave: 'triangle', f0: 1200, attack: 0.001, decay: 0.04, gain: 0.18 }),
  uiConfirm: P({ wave: 'square', f0: 880, attack: 0.002, decay: 0.12, gain: 0.2, steps: [0, 7], stepDur: 0.05, filter: { type: 'lowpass', f0: 3000 } }),
  uiBack: P({ wave: 'triangle', f0: 660, attack: 0.002, decay: 0.1, gain: 0.2, steps: [0, -5], stepDur: 0.05 }),
  // horns, one per racer (design §5)
  'horn:pip': P({ wave: 'sine', f0: 2200, f1: 3200, glide: 0.06, attack: 0.003, decay: 0.07, gain: 0.3, steps: [0, 0], stepDur: 0.1 }),
  'horn:momo': P({ wave: 'sawtooth', f0: 90, f1: 150, glide: 0.35, attack: 0.02, decay: 0.2, hold: 0.2, gain: 0.4, vibrato: [80, 22], filter: { type: 'lowpass', f0: 700 } }),
  'horn:nova': P({ wave: 'sine', f0: 1319, attack: 0.002, decay: 0.6, gain: 0.3, steps: [0, 7, 12], stepDur: 0.12 }),
  'horn:juniper': P({ wave: 'sine', f0: 1760, f1: 2350, glide: 0.25, attack: 0.01, hold: 0.15, decay: 0.1, gain: 0.3, vibrato: [25, 11] }),
  'horn:otto': P({ wave: 'square', f0: 900, f1: 1400, glide: 0.1, attack: 0.005, decay: 0.12, gain: 0.2, steps: [0, 3], stepDur: 0.12, filter: { type: 'lowpass', f0: 2500 } }),
  'horn:sprocket': P({ wave: 'noise', f0: 1, attack: 0.001, decay: 0.03, gain: 0.5, steps: [0, 0, 0, 0], stepDur: 0.12, filter: { type: 'bandpass', f0: 3200, q: 6 } }),
  'horn:boulder': P({ wave: 'sawtooth', f0: 55, f1: 45, glide: 0.6, attack: 0.05, hold: 0.3, decay: 0.3, gain: 0.5, filter: { type: 'lowpass', f0: 280 } }),
  'horn:gus': P({ wave: 'sawtooth', f0: 110, attack: 0.08, hold: 0.55, decay: 0.3, gain: 0.45, detune: -1200, filter: { type: 'lowpass', f0: 600 } }),
  // hit yelps, one per racer (design §11): short creature squeaks at each racer's own pitch
  'yelp:pip': P({ wave: 'sine', f0: 1800, f1: 2600, glide: 0.08, attack: 0.003, decay: 0.12, gain: 0.25, vibrato: [60, 30] }),
  'yelp:momo': P({ wave: 'sawtooth', f0: 700, f1: 480, glide: 0.2, attack: 0.01, decay: 0.25, gain: 0.25, vibrato: [80, 12], filter: { type: 'lowpass', f0: 1800 } }),
  'yelp:nova': P({ wave: 'sine', f0: 1400, f1: 1900, glide: 0.15, attack: 0.01, decay: 0.2, gain: 0.25, vibrato: [40, 18] }),
  'yelp:juniper': P({ wave: 'square', f0: 900, f1: 1300, glide: 0.06, attack: 0.003, decay: 0.1, gain: 0.2, filter: { type: 'lowpass', f0: 2500 } }),
  'yelp:otto': P({ wave: 'sine', f0: 1200, f1: 1700, glide: 0.05, attack: 0.003, decay: 0.12, gain: 0.25, steps: [0, 3], stepDur: 0.07 }),
  'yelp:sprocket': P({ wave: 'square', f0: 600, f1: 300, glide: 0.15, attack: 0.003, decay: 0.18, gain: 0.2, vibrato: [200, 25], filter: { type: 'lowpass', f0: 2200 } }),
  'yelp:boulder': P({ wave: 'sawtooth', f0: 120, f1: 80, glide: 0.2, attack: 0.01, decay: 0.3, gain: 0.4, filter: { type: 'lowpass', f0: 500 } }),
  'yelp:gus': P({ wave: 'sawtooth', f0: 160, f1: 110, glide: 0.25, attack: 0.02, decay: 0.3, gain: 0.35, vibrato: [30, 8], filter: { type: 'lowpass', f0: 700 } }),
});

let noiseBuf: AudioBuffer | null = null;
/** One second of white noise, made once and shared. Seeded LCG so no Math.random. */
export function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
  const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = b.getChannelData(0);
  let x = 0x2545f491;
  for (let i = 0; i < d.length; i++) { x = (x * 1664525 + 1013904223) >>> 0; d[i] = x / 0x80000000 - 1; }
  noiseBuf = b;
  return b;
}

/** Length of a patch in seconds, steps included. */
export function patchSeconds(p: Patch): number {
  const steps = p.steps?.length ?? 1;
  return (steps - 1) * (p.stepDur ?? 0) + p.attack + (p.hold ?? 0) + p.decay;
}

/** Play one patch at `when` into `dest`. `rate` multiplies every pitch (the ±3 % jitter). */
export function playPatch(ctx: BaseAudioContext, dest: AudioNode, p: Patch, when: number, gain: number, pan: number, rate = 1): void {
  const steps = p.steps ?? [0];
  const stepDur = p.stepDur ?? 0;
  const out = ctx.createGain();
  out.gain.value = 0;
  let tail: AudioNode = out;
  if (pan !== 0 && 'createStereoPanner' in ctx) {
    const sp = ctx.createStereoPanner();
    sp.pan.value = pan;
    out.connect(sp);
    tail = sp;
  }
  tail.connect(dest);
  const end = when + patchSeconds(p) + 0.05;

  let input: AudioNode = out;
  if (p.filter) {
    const f = ctx.createBiquadFilter();
    f.type = p.filter.type;
    f.Q.value = p.filter.q ?? 0.7;
    f.frequency.setValueAtTime(p.filter.f0, when);
    if (p.filter.f1) f.frequency.exponentialRampToValueAtTime(p.filter.f1, end - 0.05);
    f.connect(out);
    input = f;
  }

  steps.forEach((semi, i) => {
    const t = when + i * stepDur;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(p.gain * gain, t + p.attack);
    const hold = i === steps.length - 1 ? (p.hold ?? 0) : Math.max(0, stepDur - p.attack - 0.01);
    g.gain.setValueAtTime(p.gain * gain, t + p.attack + hold);
    const stepDecay = i === steps.length - 1 ? p.decay : Math.min(p.decay, 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + p.attack + hold + stepDecay);
    g.connect(input);
    const stop = t + p.attack + hold + stepDecay + 0.02;
    const k = rate * 2 ** (semi / 12);
    const sources: AudioScheduledSourceNode[] = [];
    if (p.wave === 'noise') {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(ctx);
      src.loop = true;
      src.playbackRate.value = k;
      src.connect(g);
      sources.push(src);
    } else {
      const mk = (cents: number) => {
        const o = ctx.createOscillator();
        o.type = p.wave as OscillatorType;
        o.frequency.setValueAtTime(p.f0 * k, t);
        if (p.f1) o.frequency.exponentialRampToValueAtTime(p.f1 * k, t + (p.glide ?? p.decay));
        o.detune.value = cents;
        if (p.vibrato) {
          const lfo = ctx.createOscillator(), depth = ctx.createGain();
          lfo.frequency.value = p.vibrato[1];
          depth.gain.value = p.vibrato[0];
          lfo.connect(depth).connect(o.detune);
          lfo.start(t);
          lfo.stop(stop);
        }
        o.connect(g);
        sources.push(o);
      };
      mk(0);
      if (p.detune) mk(p.detune);
    }
    for (const s of sources) { s.start(t); s.stop(stop); }
  });
  // the shared output gain opens for the patch and is released by GC after the sources stop
  out.gain.setValueAtTime(1, when);
}
