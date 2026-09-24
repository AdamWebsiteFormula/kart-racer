// A small faithful offline Web Audio: the node subset GameAudio uses, rendered block by block
// (128 frames, Chrome's render quantum). Gains are a-rate (per sample); filter frequency, pan and
// playbackRate are k-rate (per block). The DynamicsCompressor is Chromium's kernel (knee curve,
// adaptive release, 6 ms pre-delay, the 0.6-power makeup gain). Nothing here ever reaches a speaker.
export const QUANTUM = 128;

/** Set around a call to tag every node created inside it (stem and per-cue accounting). */
export let CURRENT_TAG: string | number = 'misc';
export const setTag = (t: string | number) => { CURRENT_TAG = t; };

type Ev = { type: 'set' | 'linear' | 'exp' | 'target'; time: number; value: number; tc?: number };

export class Param {
  private evs: Ev[] = [];
  private v: number;
  /** held state after committed events */
  private baseT = 0; private baseV: number;
  private tgt: { t0: number; v0: number; target: number; tc: number } | null = null;
  last: number;
  constructor(private ctx: OfflineCtx, v: number, readonly minV = -Infinity, readonly maxV = Infinity) { this.v = v; this.baseV = v; this.last = v; }
  get value(): number { return this.last; }
  set value(x: number) { this.setValueAtTime(x, this.ctx.currentTime); }
  private insert(e: Ev) { let i = this.evs.length; while (i > 0 && this.evs[i - 1].time > e.time) i--; this.evs.splice(i, 0, e); }
  setValueAtTime(value: number, time: number) { this.insert({ type: 'set', time, value }); return this; }
  linearRampToValueAtTime(value: number, time: number) { this.insert({ type: 'linear', time, value }); return this; }
  exponentialRampToValueAtTime(value: number, time: number) { this.insert({ type: 'exp', time, value }); return this; }
  setTargetAtTime(value: number, time: number, tc: number) { this.insert({ type: 'target', time, value, tc }); return this; }
  cancelScheduledValues(time: number) { this.evs = this.evs.filter((e) => e.time < time); return this; }
  private held(t: number): number {
    if (this.tgt) return this.tgt.target + (this.tgt.v0 - this.tgt.target) * Math.exp(-(t - this.tgt.t0) / this.tgt.tc);
    return this.baseV;
  }
  /** value at time t; t must not go backwards */
  at(t: number): number {
    for (;;) {
      const e = this.evs[0];
      if (!e) break;
      if (e.type === 'linear' || e.type === 'exp') {
        if (t < e.time) {
          const v0 = this.held(this.baseT), t0 = this.baseT;
          const x = e.time > t0 ? (t - t0) / (e.time - t0) : 1;
          if (e.type === 'linear') return this.clamp(v0 + (e.value - v0) * x);
          return this.clamp(v0 > 0 && e.value > 0 ? v0 * Math.pow(e.value / v0, x) : v0 + (e.value - v0) * x);
        }
        this.baseT = e.time; this.baseV = e.value; this.tgt = null; this.evs.shift(); continue;
      }
      if (t < e.time) break;
      if (e.type === 'set') { this.baseT = e.time; this.baseV = e.value; this.tgt = null; }
      else { const v0 = this.held(e.time); this.baseT = e.time; this.tgt = { t0: e.time, v0, target: e.value, tc: Math.max(1e-6, e.tc!) }; }
      this.evs.shift();
    }
    return this.clamp(this.held(t));
  }
  private clamp(x: number) { return Math.min(this.maxV, Math.max(this.minV, x)); }
  /** fill `out` with per-sample values from t0 */
  fill(out: Float32Array, t0: number, dt: number): boolean {
    // fast path: nothing pending and no target in flight
    if (this.evs.length === 0 && !this.tgt) { const v = this.baseV; out.fill(v); this.last = v; return false; }
    for (let i = 0; i < out.length; i++) out[i] = this.at(t0 + i * dt);
    this.last = out[out.length - 1];
    return true;
  }
  block(t0: number): number { const v = this.at(t0); this.last = v; return v; }
}

export type Buf = Float32Array[]; // 1 or 2 channels of QUANTUM frames

export abstract class Node {
  inputs: Node[] = [];
  outs: Node[] = [];
  tag: string | number = CURRENT_TAG;
  private cacheQ = -1; private cache: Buf | null = null;
  constructor(readonly ctx: OfflineCtx) {}
  connect<T extends Node | Param>(n: T): T {
    if (n instanceof Node) { n.inputs.push(this); this.outs.push(n); }
    return n;
  }
  disconnect() { for (const o of this.outs) o.inputs = o.inputs.filter((x) => x !== this); this.outs = []; }
  /** finished: can never sound again (a stopped source, or a node whose inputs all finished) */
  finished(): boolean { return this.inputs.length > 0 && this.inputs.every((i) => i.finished()); }
  pull(q: number): Buf | null {
    if (q !== this.cacheQ) { this.cacheQ = q; this.cache = this.process(q); }
    return this.cache;
  }
  /** sum of inputs (upmixed to the widest), or null when all silent */
  protected mix(q: number): Buf | null {
    let out: Buf | null = null;
    for (let k = 0; k < this.inputs.length; k++) {
      const n = this.inputs[k];
      const b = n.pull(q);
      if (!b) { if (n.finished()) { this.inputs.splice(k, 1); k--; } continue; }
      out = addInto(out, b);
      this.onInput?.(n, b);
    }
    return out;
  }
  onInput?: (from: Node, b: Buf) => void;
  abstract process(q: number): Buf | null;
}

function addInto(out: Buf | null, b: Buf): Buf {
  if (!out) return b.map((c) => Float32Array.from(c));
  if (b.length > out.length) out = [out[0], Float32Array.from(out[0])];
  for (let c = 0; c < out.length; c++) { const s = b[Math.min(c, b.length - 1)], d = out[c]; for (let i = 0; i < QUANTUM; i++) d[i] += s[i]; }
  return out;
}

const tmp = new Float32Array(QUANTUM);

export class GainNode extends Node {
  gain: Param;
  constructor(ctx: OfflineCtx) { super(ctx); this.gain = new Param(ctx, 1); }
  process(q: number): Buf | null {
    const m = this.mix(q);
    const t0 = q * QUANTUM / this.ctx.sampleRate;
    const varying = this.gain.fill(tmp, t0, 1 / this.ctx.sampleRate);
    if (!m) return null;
    if (!varying) { const g = tmp[0]; if (g === 1) return m; for (const c of m) for (let i = 0; i < QUANTUM; i++) c[i] *= g; return m; }
    for (const c of m) for (let i = 0; i < QUANTUM; i++) c[i] *= tmp[i];
    return m;
  }
}

export class BiquadFilterNode extends Node {
  type: 'lowpass' | 'highpass' | 'bandpass' | 'peaking' | 'lowshelf' | 'highshelf' = 'lowpass';
  frequency: Param; Q: Param; gain: Param; detune: Param;
  private st: number[][] = [[0, 0, 0, 0], [0, 0, 0, 0]];
  private quiet = 0;
  constructor(ctx: OfflineCtx) { super(ctx); this.frequency = new Param(ctx, 350); this.Q = new Param(ctx, 1); this.gain = new Param(ctx, 0); this.detune = new Param(ctx, 0); }
  finished(): boolean { return super.finished() && this.quiet > 4; }
  process(q: number): Buf | null {
    const t0 = q * QUANTUM / this.ctx.sampleRate;
    const f = this.frequency.block(t0), Qv = this.Q.block(t0), G = this.gain.block(t0);
    const m = this.mix(q);
    const fs = this.ctx.sampleRate, nyq = fs / 2;
    const f0 = Math.min(nyq, Math.max(0, f));
    const w0 = 2 * Math.PI * f0 / fs, cw = Math.cos(w0), sw = Math.sin(w0);
    let b0 = 1, b1 = 0, b2 = 0, a0 = 1, a1 = 0, a2 = 0;
    const A = Math.pow(10, G / 40);
    if (this.type === 'lowpass' || this.type === 'highpass') {
      // Web Audio: lowpass/highpass Q is a resonance in dB
      const alpha = sw / (2 * Math.pow(10, Qv / 20));
      if (f0 >= nyq) { b0 = this.type === 'lowpass' ? 1 : 0; }
      else if (this.type === 'lowpass') { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = (1 - cw) / 2; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; }
      else { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = (1 + cw) / 2; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; }
    } else if (this.type === 'bandpass') {
      const alpha = sw / (2 * Math.max(1e-4, Qv));
      b0 = alpha; b1 = 0; b2 = -alpha; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
    } else if (this.type === 'peaking') {
      const alpha = sw / (2 * Math.max(1e-4, Qv));
      b0 = 1 + alpha * A; b1 = -2 * cw; b2 = 1 - alpha * A; a0 = 1 + alpha / A; a1 = -2 * cw; a2 = 1 - alpha / A;
    } else {
      // shelves, S = 1
      const alpha = sw / 2 * Math.sqrt((A + 1 / A) * (1 / 1 - 1) + 2), sa = 2 * Math.sqrt(A) * alpha;
      if (this.type === 'lowshelf') { b0 = A * ((A + 1) - (A - 1) * cw + sa); b1 = 2 * A * ((A - 1) - (A + 1) * cw); b2 = A * ((A + 1) - (A - 1) * cw - sa); a0 = (A + 1) + (A - 1) * cw + sa; a1 = -2 * ((A - 1) + (A + 1) * cw); a2 = (A + 1) + (A - 1) * cw - sa; }
      else { b0 = A * ((A + 1) + (A - 1) * cw + sa); b1 = -2 * A * ((A - 1) + (A + 1) * cw); b2 = A * ((A + 1) + (A - 1) * cw - sa); a0 = (A + 1) - (A - 1) * cw + sa; a1 = 2 * ((A - 1) - (A + 1) * cw); a2 = (A + 1) - (A - 1) * cw - sa; }
    }
    b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
    const ringing = this.st.some((s) => Math.abs(s[2]) + Math.abs(s[3]) > 1e-7);
    if (!m && !ringing) { this.quiet++; return null; }
    this.quiet = 0;
    const out = m ?? [new Float32Array(QUANTUM), new Float32Array(QUANTUM)];
    for (let c = 0; c < out.length; c++) {
      const s = this.st[c], d = out[c];
      let [x1, x2, y1, y2] = s;
      for (let i = 0; i < QUANTUM; i++) {
        const x = d[i], y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
        x2 = x1; x1 = x; y2 = y1; y1 = y; d[i] = y;
      }
      s[0] = x1; s[1] = x2; s[2] = y1; s[3] = y2;
    }
    return out;
  }
}

export class StereoPannerNode extends Node {
  pan: Param;
  constructor(ctx: OfflineCtx) { super(ctx); this.pan = new Param(ctx, 0, -1, 1); }
  process(q: number): Buf | null {
    const p = this.pan.block(q * QUANTUM / this.ctx.sampleRate);
    const m = this.mix(q);
    if (!m) return null;
    const L = new Float32Array(QUANTUM), R = new Float32Array(QUANTUM);
    if (m.length === 1) {
      const x = (p + 1) / 2, gl = Math.cos(x * Math.PI / 2), gr = Math.sin(x * Math.PI / 2);
      for (let i = 0; i < QUANTUM; i++) { L[i] = m[0][i] * gl; R[i] = m[0][i] * gr; }
    } else if (p <= 0) {
      const x = p + 1, gl = Math.cos(x * Math.PI / 2), gr = Math.sin(x * Math.PI / 2);
      for (let i = 0; i < QUANTUM; i++) { L[i] = m[0][i] + m[1][i] * gl; R[i] = m[1][i] * gr; }
    } else {
      const x = p, gl = Math.cos(x * Math.PI / 2), gr = Math.sin(x * Math.PI / 2);
      for (let i = 0; i < QUANTUM; i++) { L[i] = m[0][i] * gl; R[i] = m[1][i] + m[0][i] * gr; }
    }
    return [L, R];
  }
}

const db2lin = (d: number) => Math.pow(10, d / 20);
const lin2db = (x: number) => (x > 0 ? 20 * Math.log10(x) : -1000);

/** Chromium's DynamicsCompressorKernel, transcribed. */
export class DynamicsCompressorNode extends Node {
  threshold: Param; knee: Param; ratio: Param; attack: Param; release: Param;
  reduction = 0;
  private detectorAverage = 0; private compressorGain = 1; private maxAttackDb = -1;
  private readonly preDelay: Float32Array[]; private rd = 0; private wr = 0;
  private curve = { thr: NaN, knee: NaN, ratio: NaN, k: 5, linThr: 0, kneeThr: 0, kneeThrDb: 0, yKneeDb: 0, slope: 0.25 };
  /** min over the run of the gain applied, and a histogram of reduction per block */
  grMax = 0; grSum = 0; grBlocks = 0;
  constructor(ctx: OfflineCtx) {
    super(ctx);
    this.threshold = new Param(ctx, -24); this.knee = new Param(ctx, 30); this.ratio = new Param(ctx, 12);
    this.attack = new Param(ctx, 0.003); this.release = new Param(ctx, 0.25);
    const n = 1024; this.preDelay = [new Float32Array(n), new Float32Array(n)];
    this.wr = Math.round(0.006 * ctx.sampleRate); this.rd = 0;
  }
  finished() { return false; }
  private kneeCurve(x: number, k: number) { const c = this.curve; return x < c.linThr ? x : c.linThr + (1 - Math.exp(-k * (x - c.linThr))) / k; }
  private saturate(x: number, k: number) {
    const c = this.curve;
    if (x < c.kneeThr) return this.kneeCurve(x, k);
    return db2lin(c.yKneeDb + c.slope * (lin2db(x) - c.kneeThrDb));
  }
  private slopeAt(x: number, k: number) {
    if (x < this.curve.linThr) return 1;
    const x2 = x * 1.001, xd = lin2db(x), x2d = lin2db(x2), yd = lin2db(this.kneeCurve(x, k)), y2d = lin2db(this.kneeCurve(x2, k));
    return (y2d - yd) / (x2d - xd);
  }
  private updateCurve(thr: number, knee: number, ratio: number) {
    const c = this.curve;
    if (thr === c.thr && knee === c.knee && ratio === c.ratio) return c.k;
    c.thr = thr; c.knee = knee; c.ratio = ratio; c.linThr = db2lin(thr); c.slope = 1 / ratio;
    // KAtSlope
    const x = db2lin(thr + knee);
    let minK = 0.1, maxK = 10000, k = 5;
    for (let i = 0; i < 15; i++) { const s = this.slopeAt(x, k); if (s < 1 / ratio) maxK = k; else minK = k; k = Math.sqrt(minK * maxK); }
    c.k = k; c.kneeThrDb = thr + knee; c.kneeThr = db2lin(thr + knee); c.yKneeDb = lin2db(this.kneeCurve(c.kneeThr, k));
    return k;
  }
  makeup(): number { const k = this.updateCurve(this.threshold.value, this.knee.value, this.ratio.value); return Math.pow(1 / this.saturate(1, k), 0.6); }
  process(q: number): Buf | null {
    const fs = this.ctx.sampleRate, t0 = q * QUANTUM / fs;
    const thr = this.threshold.block(t0), knee = this.knee.block(t0), ratio = this.ratio.block(t0);
    const attackT = this.attack.block(t0), releaseT = this.release.block(t0);
    const m = this.mix(q) ?? [new Float32Array(QUANTUM), new Float32Array(QUANTUM)];
    const src = m.length === 1 ? [m[0], m[0]] : m;
    const k = this.updateCurve(thr, knee, ratio);
    const masterGain = Math.pow(1 / this.saturate(1, k), 0.6);
    const attackFrames = Math.max(0.001, attackT) * fs;
    const releaseFrames = fs * releaseT, satReleaseFrames = 0.0025 * fs;
    const y1 = releaseFrames * 0.09, y2 = releaseFrames * 0.16, y3 = releaseFrames * 0.42, y4 = releaseFrames * 0.98;
    const kA = 0.9999999999999998 * y1 + 1.8432219684323923e-16 * y2 - 1.9373394351676423e-16 * y3 + 8.824516011816245e-18 * y4;
    const kB = -1.5788320352845888 * y1 + 2.3305837032074286 * y2 - 0.9141194204840429 * y3 + 0.1623677525612032 * y4;
    const kC = 0.5334142869106424 * y1 - 1.272736789213631 * y2 + 0.9258856042207512 * y3 - 0.18656310191776226 * y4;
    const kD = 0.08783463138207234 * y1 - 0.1694162967925622 * y2 + 0.08588057951595272 * y3 - 0.00429891410546283 * y4;
    const kE = -0.042416883008123074 * y1 + 0.1115693827987602 * y2 - 0.09764676325265872 * y3 + 0.028494263462021576 * y4;
    const L = new Float32Array(QUANTUM), R = new Float32Array(QUANTUM);
    const N = this.preDelay[0].length;
    let fi = 0, minGain = 1;
    for (let div = 0; div < QUANTUM / 32; div++) {
      let da = this.detectorAverage;
      if (!Number.isFinite(da)) da = 1;
      const desired = da;
      const scaledDesired = Math.asin(desired) / (Math.PI / 2);
      let envRate: number;
      const releasing = scaledDesired > this.compressorGain;
      let diffDb = lin2db(this.compressorGain / scaledDesired);
      if (releasing) {
        this.maxAttackDb = -1;
        if (!Number.isFinite(diffDb)) diffDb = -1;
        let x = Math.min(0, Math.max(-12, diffDb));
        x = 0.25 * (x + 12);
        const rf = kA + kB * x + kC * x * x + kD * x ** 3 + kE * x ** 4;
        envRate = db2lin(5 / rf);
      } else {
        if (!Number.isFinite(diffDb)) diffDb = 1;
        if (this.maxAttackDb === -1 || this.maxAttackDb < diffDb) this.maxAttackDb = diffDb;
        const eff = Math.max(0.5, this.maxAttackDb);
        envRate = 1 - Math.pow(0.25 / eff, 1 / attackFrames);
      }
      let cg = this.compressorGain;
      for (let j = 0; j < 32; j++, fi++) {
        let inp = 0;
        for (let c = 0; c < 2; c++) { const u = src[c][fi]; this.preDelay[c][this.wr] = u; const a = Math.abs(u); if (a > inp) inp = a; }
        const shaped = this.saturate(inp, k);
        const att = inp <= 0.0001 ? 1 : shaped / inp;
        const attDb = Math.max(2, -lin2db(att));
        const satRate = db2lin(attDb / satReleaseFrames) - 1;
        const rate = att > da ? satRate : 1;
        da += (att - da) * rate;
        da = Math.min(1, da);
        if (envRate < 1) cg += (scaledDesired - cg) * envRate;
        else { cg *= envRate; cg = Math.min(1, cg); }
        const post = Math.sin(Math.PI / 2 * cg);
        const g = masterGain * post;
        if (post < minGain) minGain = post;
        L[fi] = this.preDelay[0][this.rd] * g; R[fi] = this.preDelay[1][this.rd] * g;
        this.rd = (this.rd + 1) % N; this.wr = (this.wr + 1) % N;
      }
      this.detectorAverage = da; this.compressorGain = cg;
    }
    const gr = -lin2db(minGain);
    this.reduction = -gr; this.grMax = Math.max(this.grMax, gr); this.grSum += gr; this.grBlocks++;
    return [L, R];
  }
}

export class AudioBuffer {
  readonly numberOfChannels: number; readonly length: number; readonly duration: number;
  constructor(readonly chs: Float32Array[], readonly sampleRate: number) { this.numberOfChannels = chs.length; this.length = chs[0].length; this.duration = this.length / sampleRate; }
  getChannelData(c: number) { return this.chs[c]; }
}

abstract class Source extends Node {
  protected t0 = Infinity; protected tStop = Infinity; ended = false;
  onended: (() => void) | null = null;
  finished() { return this.ended; }
  start(when = 0, _offset?: number) { this.t0 = Math.max(when, this.ctx.currentTime); }
  stop(when = 0) { if (this.t0 === Infinity) throw new Error('InvalidStateError'); this.tStop = Math.max(when, this.ctx.currentTime); }
  protected end() { if (!this.ended) { this.ended = true; this.ctx.later(() => this.onended?.()); } }
}

export class AudioBufferSourceNode extends Source {
  buffer: AudioBuffer | null = null;
  loop = false; loopStart = 0; loopEnd = 0;
  playbackRate: Param; detune: Param;
  private pos = 0; private offset = 0; private begun = false;
  constructor(ctx: OfflineCtx) { super(ctx); this.playbackRate = new Param(ctx, 1); this.detune = new Param(ctx, 0); }
  start(when = 0, offset = 0) { super.start(when); this.offset = offset; }
  process(q: number): Buf | null {
    const fs = this.ctx.sampleRate, tq = q * QUANTUM / fs, tq1 = (q + 1) * QUANTUM / fs;
    const rateP = this.playbackRate.block(tq);
    if (this.ended || !this.buffer || this.t0 >= tq1) return null;
    const b = this.buffer, bl = b.length, step = rateP * b.sampleRate / fs;
    if (!this.begun) { this.begun = true; this.pos = this.offset * b.sampleRate; }
    const out = b.chs.map(() => new Float32Array(QUANTUM));
    const i0 = Math.max(0, Math.ceil((this.t0 - tq) * fs - 1e-9));
    const iStop = Math.min(QUANTUM, Math.max(0, Math.ceil((this.tStop - tq) * fs - 1e-9)));
    const pts = this.loopStart < this.loopEnd && (this.loopStart !== 0 || this.loopEnd !== 0);
    const ls = pts ? Math.max(0, Math.min(bl, this.loopStart * b.sampleRate)) : 0;
    const le = pts && this.loopEnd * b.sampleRate <= bl ? this.loopEnd * b.sampleRate : bl;
    const looping = this.loop;
    for (let i = i0; i < iStop; i++) {
      if (looping) { while (this.pos >= le) this.pos -= le - ls; }
      else if (this.pos >= bl) break;
      const p = this.pos, k = Math.floor(p), fr = p - k;
      const k1 = looping && k + 1 >= le ? Math.floor(ls) : k + 1;
      for (let c = 0; c < out.length; c++) {
        const d = b.chs[c], a = d[k], nx = k1 < bl ? d[k1] : 0;
        out[c][i] = a + (nx - a) * fr;
      }
      this.pos += step;
    }
    if ((!looping && this.pos >= bl) || iStop < QUANTUM) this.end();
    return out;
  }
}

export class OscillatorNode extends Source {
  type: 'sine' | 'square' | 'sawtooth' | 'triangle' = 'sine';
  frequency: Param; detune: Param;
  private ph = 0;
  constructor(ctx: OfflineCtx) { super(ctx); this.frequency = new Param(ctx, 440); this.detune = new Param(ctx, 0); }
  process(q: number): Buf | null {
    const fs = this.ctx.sampleRate, tq = q * QUANTUM / fs, tq1 = (q + 1) * QUANTUM / fs;
    const f = this.frequency.block(tq) * Math.pow(2, this.detune.block(tq) / 1200);
    if (this.ended || this.t0 >= tq1) return null;
    const out = new Float32Array(QUANTUM);
    const i0 = Math.max(0, Math.ceil((this.t0 - tq) * fs - 1e-9));
    const iStop = Math.min(QUANTUM, Math.max(0, Math.ceil((this.tStop - tq) * fs - 1e-9)));
    const inc = f / fs;
    for (let i = i0; i < iStop; i++) {
      const p = this.ph;
      out[i] = this.type === 'sine' ? Math.sin(2 * Math.PI * p) : this.type === 'square' ? (p < 0.5 ? 1 : -1) : this.type === 'sawtooth' ? 2 * p - 1 : 1 - 4 * Math.abs(p - 0.5);
      this.ph = (p + inc) % 1;
    }
    if (iStop < QUANTUM) this.end();
    return [out];
  }
}

class Destination extends Node {
  process(q: number) { return this.mix(q); }
  finished() { return false; }
}

export class OfflineCtx {
  readonly sampleRate: number;
  currentTime = 0;
  state: 'running' | 'suspended' = 'running';
  readonly destination: Destination;
  private q = 0;
  private cbs: (() => void)[] = [];
  constructor(sampleRate = 44100) { this.sampleRate = sampleRate; this.destination = new Destination(this); }
  later(f: () => void) { this.cbs.push(f); }
  createGain() { return new GainNode(this); }
  createBiquadFilter() { return new BiquadFilterNode(this); }
  createStereoPanner() { return new StereoPannerNode(this); }
  createDynamicsCompressor() { return new DynamicsCompressorNode(this); }
  createBufferSource() { return new AudioBufferSourceNode(this); }
  createOscillator() { return new OscillatorNode(this); }
  createBuffer(ch: number, len: number, rate: number) { return new AudioBuffer(Array.from({ length: ch }, () => new Float32Array(len)), rate); }
  decodeAudioData(ab: ArrayBuffer): Promise<AudioBuffer> { return Promise.resolve(decodeWav(Buffer.from(ab), this.sampleRate)); }
  resume() { this.state = 'running'; return Promise.resolve(); }
  suspend() { return Promise.resolve(); }
  addEventListener() { /* no state changes offline */ }
  /** render one quantum; returns the destination's stereo output */
  renderQuantum(): Buf {
    const b = this.destination.pull(this.q) ?? [new Float32Array(QUANTUM), new Float32Array(QUANTUM)];
    this.q++;
    this.currentTime = this.q * QUANTUM / this.sampleRate;
    for (const f of this.cbs.splice(0)) f();
    return b.length === 1 ? [b[0], b[0]] : b;
  }
}

/** float32 or int16 WAV → AudioBuffer at `rate` (linear resampling when it differs). */
export function decodeWav(b: Buffer, rate: number): AudioBuffer {
  let o = 12, ch = 2, sr = 44100, fmt = 3, bits = 32; let data: Buffer | null = null;
  while (o < b.length) {
    const id = b.toString('ascii', o, o + 4), sz = b.readUInt32LE(o + 4);
    if (id === 'fmt ') { fmt = b.readUInt16LE(o + 8); ch = b.readUInt16LE(o + 10); sr = b.readUInt32LE(o + 12); bits = b.readUInt16LE(o + 22); }
    if (id === 'data') data = b.subarray(o + 8, o + 8 + sz);
    o += 8 + sz + (sz & 1);
  }
  const bps = bits / 8, n = data!.length / bps / ch;
  const chs = Array.from({ length: ch }, () => new Float32Array(n));
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) {
    const off = (i * ch + c) * bps;
    chs[c][i] = fmt === 3 ? data!.readFloatLE(off) : data!.readInt16LE(off) / 32768;
  }
  if (sr === rate) return new AudioBuffer(chs, rate);
  const m = Math.round(n * rate / sr);
  return new AudioBuffer(chs.map((d) => { const r = new Float32Array(m); for (let i = 0; i < m; i++) { const p = i * sr / rate, k = Math.floor(p), f = p - k; r[i] = (d[k] ?? 0) + ((d[k + 1] ?? 0) - (d[k] ?? 0)) * f; } return r; }), rate);
}

export function writeWav(path: string, chs: Float32Array[], rate: number, fs: typeof import('node:fs')) {
  const n = chs[0].length, ch = chs.length, b = Buffer.alloc(44 + n * ch * 4);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * ch * 4, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(3, 20); b.writeUInt16LE(ch, 22); b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * ch * 4, 28); b.writeUInt16LE(ch * 4, 32); b.writeUInt16LE(32, 34);
  b.write('data', 36); b.writeUInt32LE(n * ch * 4, 40);
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) b.writeFloatLE(chs[c][i], 44 + (i * ch + c) * 4);
  fs.writeFileSync(path, b);
}
