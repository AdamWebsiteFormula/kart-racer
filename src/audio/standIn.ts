// A stand-in for the browser's AudioContext: plain objects that take every call the game's audio makes and
// play nothing (no Web Audio at all, so it cannot make a sound). For measuring the sound's timing where
// nothing may be heard (dev: `?mute&standin` runs the real GameAudio on it, docs/sops/audio.md, 28 Sept
// 2026) and for the tests. A file "decodes" to silence of the length it would play at 128 kbps, so the
// songs' analysis (samples.ts cutSong) runs at its real cost; what starts, and when, is kept in `started`.

/** An AudioParam that remembers the last value it was set to. */
export class StandInParam {
  value = 0;
  setValueAtTime(v: number): this { this.value = v; return this; }
  linearRampToValueAtTime(v: number): this { this.value = v; return this; }
  exponentialRampToValueAtTime(v: number): this { this.value = v; return this; }
  setTargetAtTime(v: number): this { this.value = v; return this; }
  cancelScheduledValues(): this { return this; }
}

/** A node: it remembers what it feeds (`to`). */
export class StandInNode {
  readonly kind: string;
  readonly to: unknown[] = [];
  constructor(kind: string) { this.kind = kind; }
  connect<T>(dest: T): T { this.to.push(dest); return dest; }
  disconnect(): void { this.to.length = 0; }
}

/** A source (a buffer or an oscillator): when it starts and stops, in context time, and when that was asked (`at`: ms on the page's clock). */
export class StandInSource extends StandInNode {
  readonly ctx: StandInContext;
  buffer: { duration: number } | null = null;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  type = '';
  readonly playbackRate = new StandInParam();
  readonly frequency = new StandInParam();
  readonly detune = new StandInParam();
  startedAt: number | undefined;
  offset: number | undefined;
  stoppedAt: number | undefined;
  /** when start() was called: page ms, and the context's own time then (`startedAt` less this: how far ahead it was booked) */
  at = -1;
  calledAt = -1;
  onended: (() => void) | null = null;
  constructor(kind: string, ctx: StandInContext) { super(kind); this.ctx = ctx; }
  start(when = 0, offset?: number): void {
    this.startedAt = when;
    this.offset = offset;
    this.at = pageMs();
    this.calledAt = this.ctx.currentTime;
    this.ctx.started.push(this);
    this.ctx.onStart?.(this);
  }
  stop(when = 0): void { this.stoppedAt = when; }
}

/** Silence as a decoded file: `bytes` of MP3 at 128 kbps, two channels at 44.1 kHz. */
export function silence(bytes: number): AudioBuffer {
  const rate = 44100, length = Math.max(1, Math.round(((bytes * 8) / 128000) * rate));
  const chs = [new Float32Array(length), new Float32Array(length)];
  return { sampleRate: rate, numberOfChannels: 2, length, duration: length / rate, getChannelData: (c: number) => chs[c] } as unknown as AudioBuffer;
}

const pageMs = (): number => globalThis.performance?.now() ?? Date.now();

/**
 * The stand-in context. `state` is 'running' as a real one is when made from a press; `now` is its clock
 * (seconds; by default the page's since it was made; tests set their own). Every one made is counted
 * (`StandInContext.made`), so a test can prove ?mute made none.
 */
export class StandInContext {
  static made = 0;
  state: 'suspended' | 'running' = 'running';
  sampleRate = 48000;
  readonly destination = new StandInNode('destination');
  /** every source started, in order */
  readonly started: StandInSource[] = [];
  /** called as each source starts */
  onStart: ((s: StandInSource) => void) | null = null;
  /** when it was made (ms on the page's clock) */
  readonly madeAt = pageMs();
  now: () => number;
  constructor() {
    StandInContext.made++;
    const t0 = this.madeAt;
    this.now = () => (pageMs() - t0) / 1000;
  }
  get currentTime(): number { return this.now(); }
  createGain() { return Object.assign(new StandInNode('gain'), { gain: new StandInParam() }); }
  createBiquadFilter() { return Object.assign(new StandInNode('filter'), { type: '', frequency: new StandInParam(), Q: new StandInParam(), gain: new StandInParam() }); }
  createDynamicsCompressor() {
    return Object.assign(new StandInNode('compressor'), { threshold: new StandInParam(), knee: new StandInParam(), ratio: new StandInParam(), attack: new StandInParam(), release: new StandInParam() });
  }
  createStereoPanner() { return Object.assign(new StandInNode('pan'), { pan: new StandInParam() }); }
  createOscillator() { return new StandInSource('osc', this); }
  createBufferSource() { return new StandInSource('buffer', this); }
  createBuffer(channels: number, length: number, rate: number) {
    const chs = Array.from({ length: channels }, () => new Float32Array(length));
    return { sampleRate: rate, numberOfChannels: channels, length, duration: length / rate, getChannelData: (c: number) => chs[c] };
  }
  /** A file "decoded": silence of its length (the bytes are only counted). */
  decodeAudioData(bytes: ArrayBuffer): Promise<AudioBuffer> { return Promise.resolve(silence(bytes.byteLength)); }
  resume(): Promise<void> { this.state = 'running'; return Promise.resolve(); }
  suspend(): Promise<void> { this.state = 'suspended'; return Promise.resolve(); }
  addEventListener(): void { /* its state never changes by itself */ }
}
