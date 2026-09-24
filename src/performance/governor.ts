// Quality "Auto" (docs/sops/performance.md): watch the frame rate and give up the least visible
// thing first. Resolution steps down 10 % at a time to a device pixel ratio of 1, then shadows and
// the post chain go (Low), then resolution steps down again to the floor. It only ever steps down
// during a race (no mid-race flicker); a race that ran clean earns one step back up at the next
// start. If the whole ladder buys no frame rate, the rate was the display's or the browser's limit
// (a 30 fps battery saver, a 50 Hz screen), not load: full quality comes back and that rate is held
// from then on. Pure: fed frame times, never touches the renderer.

export interface GovernorOptions {
  /** frames per second to hold */
  target: number;
  /** seconds ignored after a reset (shader compiles, loading hitches) */
  warmup: number;
  /** seconds per measurement */
  window: number;
  /** scale change per step */
  step: number;
  /** lowest scale (fraction of the device's pixel ratio cap) */
  min: number;
  /** a single frame longer than this is a hitch (GC, tab switch), not a trend */
  hitchMs: number;
  /** a race that averaged at least this many fps earns a step back up */
  cleanFps: number;
  /** steps down all the way that lifted the frame rate by less than this share bought nothing: the rate is a cap, not load */
  capGain: number;
  /** once a cap is found, the frame rate to hold is this share of it (a steady 30 on a 30 fps display is not a miss) */
  capShare: number;
}

export const GOVERNOR: GovernorOptions = Object.freeze({ target: 55, warmup: 2, window: 1, step: 0.1, min: 0.5, hitchMs: 250, cleanFps: 59, capGain: 0.05, capShare: 0.9 });

export interface Quality {
  /** multiplier on the device pixel ratio cap */
  scale: number;
  /** shadows and the post chain off */
  low: boolean;
}

export class Governor {
  scale = 1;
  low = false;
  /** the frame rate the display or browser allows (found when stepping down bought nothing); Infinity until then */
  ceiling = Infinity;
  private readonly o: GovernorOptions;
  /** the device pixel ratio cap the scale multiplies (2 desktop, 1.5 touch) */
  private readonly baseDpr: number;
  private since = 0;
  private started = false;
  private frames = 0;
  private seconds = 0;
  /** this race so far: every frame counted after the warm-up */
  private raceFrames = 0;
  private raceSeconds = 0;
  private dropped = false;
  /** where this run of steps down began: the quality to put back and the frame rate it had */
  private descent: { scale: number; low: boolean; fps: number } | null = null;

  constructor(baseDpr: number, o: GovernorOptions = GOVERNOR) {
    this.baseDpr = baseDpr;
    this.o = o;
  }

  /** The device pixel ratio to render at. */
  get dpr(): number { return this.baseDpr * this.scale; }

  /** Forget the current window and warm up again (a new scene, the tab came back, settings changed). */
  reset(nowS: number): void {
    this.since = nowS;
    this.started = true;
    this.frames = 0;
    this.seconds = 0;
  }

  /**
   * A new race starts. If the last one held the frame rate with room to spare and never
   * stepped down, try one step better; if that is too much, the next window steps back.
   */
  newRace(nowS: number): boolean {
    const clean = this.raceSeconds > 10 && !this.dropped && this.raceFrames / this.raceSeconds >= this.o.cleanFps;
    this.raceFrames = 0;
    this.raceSeconds = 0;
    this.dropped = false;
    this.reset(nowS);
    return clean ? this.up() : false;
  }

  /** Feed one frame. True when the quality changed and the renderer should apply it. */
  sample(dtMs: number, nowS: number): boolean {
    if (!this.started) this.reset(nowS);
    if (nowS - this.since < this.o.warmup || dtMs > this.o.hitchMs || dtMs <= 0) return false;
    this.frames++;
    this.seconds += dtMs / 1000;
    this.raceFrames++;
    this.raceSeconds += dtMs / 1000;
    if (this.seconds < this.o.window) return false;
    const fps = this.frames / this.seconds;
    this.frames = 0;
    this.seconds = 0;
    const { capGain, capShare } = this.o;
    if (fps > this.ceiling * (1 + 2 * capGain)) this.ceiling = Infinity; // the cap lifted (the charger went in)
    if (fps >= Math.min(this.o.target, this.ceiling * capShare)) { this.descent = null; return false; }
    const d = (this.descent ??= { scale: this.scale, low: this.low, fps });
    if (this.down()) {
      this.dropped = true;
      this.settle(nowS);
      return true;
    }
    if (fps >= d.fps * (1 + capGain)) return false; // the floor helped, just not enough: stay there
    // every step bought nothing: the display or the browser sets this rate. Put the quality back and hold it
    this.ceiling = Math.max(fps, d.fps);
    this.scale = d.scale;
    this.low = d.low;
    this.descent = null;
    this.settle(nowS);
    return true;
  }

  /** Let a new setting show its effect before judging it (a short settle, not a full warm-up). */
  private settle(nowS: number): void {
    this.since = nowS - this.o.warmup + 0.5;
  }

  private down(): boolean {
    const { step, min } = this.o;
    // above a pixel ratio of 1, resolution is the least visible loss
    if (!this.low && this.dpr > 1 + 1e-6) { this.scale = Math.max(1 / this.baseDpr, round(this.scale - step)); return true; }
    if (!this.low) { this.low = true; return true; }
    if (this.scale > min + 1e-6) { this.scale = Math.max(min, round(this.scale - step)); return true; }
    return false;
  }

  private up(): boolean {
    const { step } = this.o;
    // the reverse order: resolution back to a pixel ratio of 1, then the effects, then full resolution
    if (this.low && this.dpr < 1 - 1e-6) { this.scale = Math.min(1 / this.baseDpr, round(this.scale + step)); return true; }
    if (this.low) { this.low = false; return true; }
    if (this.scale < 1 - 1e-6) { this.scale = Math.min(1, round(this.scale + step)); return true; }
    return false;
  }
}

const round = (x: number) => Math.round(x * 100) / 100;

/** The pixel ratio cap for this device (SOP: 2 on desktop, 1.5 on touch screens). */
export function dprCap(devicePixelRatio: number, coarsePointer: boolean): number {
  return Math.min(devicePixelRatio, coarsePointer ? 1.5 : 2);
}
