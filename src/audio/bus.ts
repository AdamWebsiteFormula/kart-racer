// One AudioContext, created and resumed on the first user gesture (Safari and Chrome both need
// it). Graph: sfx → master; music → low-pass (the hit duck) → master; master → compressor → out.
import { AUDIO } from './constants.ts';

export interface Volumes { master: number; music: number; sfx: number }

/** The gains the buses get for a set of slider values (0–1 each). Pure. */
export function busGains(v: Volumes): { master: number; music: number; sfx: number } {
  const c = (x: number) => Math.min(1, Math.max(0, x));
  // perceptual: the square of the slider, so 50 % sounds like half, not a quarter off
  return { master: AUDIO.master * c(v.master) ** 2, music: c(v.music) ** 2, sfx: c(v.sfx) ** 2 };
}

type Ctor = new () => AudioContext;

export class AudioBus {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  music: GainNode | null = null;
  sfx: GainNode | null = null;
  musicFilter: BiquadFilterNode | null = null;
  private volumes: Volumes = { master: 0.8, music: 0.7, sfx: 0.8 };
  private readonly Ctx: Ctor | undefined;
  private readonly listeners: (() => void)[] = [];

  constructor(Ctx: Ctor | undefined = (globalThis as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor }).AudioContext
    ?? (globalThis as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext) {
    this.Ctx = Ctx;
  }

  /** Called on every user gesture until the context is running. Returns true once it is. */
  unlock(): boolean {
    if (!this.Ctx) return false;
    if (!this.ctx) this.build();
    const ctx = this.ctx!;
    if (ctx.state === 'suspended' && !this.hidden) void ctx.resume();
    if (ctx.state === 'running' || !this.wasFresh) this.listeners.splice(0).forEach((f) => f());
    this.wasFresh = false;
    return ctx.state === 'running';
  }

  private wasFresh = true;
  private hidden = false;

  /** Run `f` once the context exists (immediately if it already does). */
  onReady(f: () => void): void {
    if (this.ctx) f(); else this.listeners.push(f);
  }

  private build(): void {
    const ctx = new this.Ctx!();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 10;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.2;
    comp.connect(ctx.destination);
    const master = ctx.createGain();
    master.connect(comp);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = AUDIO.openHz;
    lp.connect(master);
    const music = ctx.createGain();
    music.connect(lp);
    const sfx = ctx.createGain();
    sfx.connect(master);
    Object.assign(this, { ctx, master, music, sfx, musicFilter: lp });
    this.setVolumes(this.volumes);
  }

  setVolumes(v: Volumes): void {
    this.volumes = v;
    if (!this.ctx) return;
    const g = busGains(v), t = this.ctx.currentTime;
    this.master!.gain.setTargetAtTime(g.master, t, 0.03);
    this.music!.gain.setTargetAtTime(g.music, t, 0.03);
    this.sfx!.gain.setTargetAtTime(g.sfx, t, 0.03);
  }

  /** The hit duck: the music drops behind a low-pass for a moment. */
  duck(): void {
    const ctx = this.ctx, f = this.musicFilter;
    if (!ctx || !f) return;
    const t = ctx.currentTime;
    f.frequency.cancelScheduledValues(t);
    f.frequency.setValueAtTime(AUDIO.duckHz, t);
    f.frequency.setTargetAtTime(AUDIO.openHz, t + AUDIO.duckSeconds * 0.4, AUDIO.duckSeconds * 0.4);
  }

  /** Tab hidden → suspend; visible → resume (only after a gesture has unlocked it). */
  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    const ctx = this.ctx;
    if (!ctx) return;
    if (hidden && ctx.state === 'running') void ctx.suspend();
    if (!hidden && ctx.state === 'suspended') void ctx.resume();
  }

  get time(): number { return this.ctx?.currentTime ?? 0; }
  get running(): boolean { return this.ctx?.state === 'running'; }
}
