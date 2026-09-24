// One AudioContext, created and resumed on the first user gesture (Safari and Chrome both need
// it). Graph: sfx → master; music → duck gain (big sounds) → presence dip (room for the cues) →
// low-pass (the hit duck, the pause) → master; master → top-octave low-pass → compressor → limiter → out.
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
  /** the music's own dip under a big sound (`musicDuck`), apart from the volume slider and the pause */
  musicDuckGain: GainNode | null = null;
  /** a wide dip in the music's presence band, so the cues are not masked there (`AUDIO.musicPocket`) */
  musicPocket: BiquadFilterNode | null = null;
  private volumes: Volumes = { master: 0.8, music: 0.7, sfx: 0.8 };
  private readonly Ctx: Ctor | undefined;
  private readonly listeners: (() => void)[] = [];

  constructor(Ctx: Ctor | null | undefined = (globalThis as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor }).AudioContext
    ?? (globalThis as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext) {
    this.Ctx = Ctx ?? undefined;
  }

  /**
   * A bus that never makes a sound: no audio context is ever created, whatever is pressed or
   * played (the game's `?mute`: automated checks in a browser, 24 Sept 2026, after a hidden test
   * page played the title music through the night).
   */
  static silent(): AudioBus {
    return new AudioBus(null);
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
    // a brick-wall limiter last: a pile of loud sounds at once never clips the output. Its threshold
    // sits low enough that, with the makeup gain Chrome's compressor adds (+3.4 dB here), the loudest
    // pile-up at full sliders stays under −1 dB true peak (offline render, 24 Sept 2026)
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = AUDIO.limiterDb;
    lim.knee.value = 0;
    lim.ratio.value = 20;
    lim.attack.value = 0.001;
    lim.release.value = 0.1;
    comp.connect(lim);
    lim.connect(ctx.destination);
    // a gentle low-pass over the top octave before the dynamics: the sparkles and zaps (itemReady,
    // the ticks) carry energy near the top of the band that peaks between samples, past what the
    // limiter sees (+1.3 dB over at full sliders in the offline render); nothing up there is heard
    const air = ctx.createBiquadFilter();
    air.type = 'lowpass';
    air.frequency.value = AUDIO.masterLowpassHz;
    air.Q.value = -3; // Web Audio's low-pass Q is in dB: −3 is Butterworth, no bump
    air.connect(comp);
    const master = ctx.createGain();
    master.connect(air);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = AUDIO.openHz;
    lp.connect(master);
    // the cues live in 1–4 kHz, and so do the songs' brass and guitars: a wide, gentle dip there
    // gives every hit, pickup and zap its own room (offline render, 24 Sept 2026)
    const pocket = ctx.createBiquadFilter();
    pocket.type = 'peaking';
    pocket.frequency.value = AUDIO.musicPocket.hz;
    pocket.Q.value = AUDIO.musicPocket.q;
    pocket.gain.value = AUDIO.musicPocket.db;
    pocket.connect(lp);
    const duck = ctx.createGain();
    duck.gain.value = 1;
    duck.connect(pocket);
    const music = ctx.createGain();
    music.connect(duck);
    const sfx = ctx.createGain();
    sfx.connect(master);
    Object.assign(this, { ctx, master, music, sfx, musicFilter: lp, musicDuckGain: duck, musicPocket: pocket });
    this.setVolumes(this.volumes);
    if (this.paused) this.setPaused(true);
  }

  setVolumes(v: Volumes): void {
    this.volumes = v;
    if (!this.ctx) return;
    const g = busGains(v), t = this.ctx.currentTime;
    this.master!.gain.setTargetAtTime(g.master, t, 0.03);
    this.music!.gain.setTargetAtTime(g.music * (this.paused ? AUDIO.pause.music : 1), t, 0.03);
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

  /**
   * A big sound (the go, a creature's slam, the Final Lap Shift): the music dips (about 6 dB, or `depth`)
   * and stays down for `hold` seconds before it comes back, so a long sting is framed from start to end.
   */
  musicDuck(hold = 0, depth: number = AUDIO.musicDuck.gain): void {
    const ctx = this.ctx, d = this.musicDuckGain;
    if (!ctx || !d) return;
    const t = ctx.currentTime, { down, up } = AUDIO.musicDuck;
    d.gain.cancelScheduledValues(t);
    d.gain.setValueAtTime(d.gain.value, t);
    d.gain.linearRampToValueAtTime(depth, t + down);
    if (hold > 0) d.gain.setValueAtTime(depth, t + down + hold);
    d.gain.linearRampToValueAtTime(1, t + down + hold + up);
  }

  private paused = false;

  /**
   * The pause menu: the music drops back behind a low-pass, as in the classics, and comes back on
   * resume. The sound effects bus stays open for the menu's clicks.
   */
  setPaused(on: boolean): void {
    this.paused = on;
    const ctx = this.ctx, f = this.musicFilter;
    if (!ctx || !f) return;
    const t = ctx.currentTime, k = AUDIO.pause.seconds / 3;
    this.music!.gain.setTargetAtTime(busGains(this.volumes).music * (on ? AUDIO.pause.music : 1), t, k);
    f.frequency.cancelScheduledValues(t);
    f.frequency.setTargetAtTime(on ? AUDIO.pause.hz : AUDIO.openHz, t, k);
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
