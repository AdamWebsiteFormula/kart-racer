// Quality "Auto" (docs/sops/performance.md): watch the frame rate and give up the least visible
// thing first. Resolution steps down in 10 % steps (several at once when far short) to a device
// pixel ratio of 1, then shadows and the post chain go (Low), then resolution steps down again to
// the floor. It only ever steps down during a race (no mid-race flicker); a race that ran clean
// earns one step back up at the next start, and a step up that failed is never tried again. A
// stall of a few frames (a shader, a texture, a GC) is not judged at all. If the whole ladder buys
// no frame rate, the rate was the display's or the browser's limit (a 30 fps battery saver, a
// 50 Hz screen), not load: full quality comes back and that rate is held from then on. Pure: fed
// frame times, never touches the renderer.

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
  /** nor is a frame this many times the last window's average (a 200 ms stall in a 60 fps window) */
  hitchRatio: number;
  /** a race that averaged at least this many fps earns a step back up */
  cleanFps: number;
  /** steps down all the way that lifted the frame rate by less than this share bought nothing: the rate is a cap, not load */
  capGain: number;
  /** once a cap is found, the frame rate to hold is this share of it (a steady 30 on a 30 fps display is not a miss) */
  capShare: number;
}

export const GOVERNOR: GovernorOptions = Object.freeze({ target: 55, warmup: 2, window: 1, step: 0.1, min: 0.5, hitchMs: 250, hitchRatio: 4, cleanFps: 59, capGain: 0.05, capShare: 0.9 });

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
  /** the device pixel ratio cap the scale multiplies (2 desktop, 1.5 touch); rebase() when the screen changes */
  private baseDpr: number;
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
  /** a first short window's frame rate: a second one at the same quality confirms it before anything changes */
  private armed: number | null = null;
  /** the last window's average frame, ms (a frame far over it is a hitch) */
  private typical = 0;
  /** long frames in a row: past HITCH_STREAK it is a trend, not a hitch */
  private streak = 0;
  /** this race began one step up (newRace): if it steps down, that level is not tried again */
  private probed: number | null = null;
  /** the lowest quality level (rank()) a race-start step up failed at: never stepped up to again, so races never flip-flop */
  private failedAt = Infinity;

  constructor(baseDpr: number, o: GovernorOptions = GOVERNOR) {
    this.baseDpr = baseDpr;
    this.o = o;
  }

  /** The device pixel ratio to render at. */
  get dpr(): number { return this.baseDpr * this.scale; }

  /**
   * The window moved to a screen with another pixel ratio cap (or the browser zoom changed it).
   * The scale carries over; above Low it never leaves the pixel ratio under 1.
   */
  rebase(baseDpr: number): void {
    if (baseDpr === this.baseDpr) return;
    this.baseDpr = baseDpr;
    if (!this.low) this.scale = Math.max(this.scale, Math.min(1, 1 / baseDpr));
  }

  /** Forget the current window and warm up again (a new scene, the tab came back, settings changed). */
  reset(nowS: number): void {
    this.since = nowS;
    this.streak = 0;
    this.armed = null;
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
    if (this.probed !== null && this.dropped) this.failedAt = Math.min(this.failedAt, this.probed);
    this.probed = null;
    this.raceFrames = 0;
    this.raceSeconds = 0;
    this.dropped = false;
    this.reset(nowS);
    if (!clean) return false;
    const was = { scale: this.scale, low: this.low };
    if (!this.up()) return false;
    // the step up was tried and failed before: stay where the frame rate held
    if (this.rank() >= this.failedAt) { this.scale = was.scale; this.low = was.low; return false; }
    this.probed = this.rank();
    return true;
  }

  /** The current quality as one number, higher is better: every level with the effects is above every Low one. */
  private rank(): number { return (this.low ? 0 : 1) + this.scale; }

  /** Feed one frame. True when the quality changed and the renderer should apply it. */
  sample(dtMs: number, nowS: number): boolean {
    if (!this.started) this.reset(nowS);
    if (nowS - this.since < this.o.warmup || dtMs > this.o.hitchMs || dtMs <= 0) return false;
    // one stall (a shader, a texture, a GC) says nothing about the resolution: judge the frames around it
    if (this.typical > 0 && dtMs > this.typical * this.o.hitchRatio) { if (++this.streak <= HITCH_STREAK) return false; } else this.streak = 0;
    this.frames++;
    this.seconds += dtMs / 1000;
    this.raceFrames++;
    this.raceSeconds += dtMs / 1000;
    if (this.seconds < this.o.window) return false;
    const fps = this.frames / this.seconds;
    this.typical = (this.seconds * 1000) / this.frames;
    this.frames = 0;
    this.seconds = 0;
    const { capGain, capShare } = this.o;
    if (fps > this.ceiling * (1 + 2 * capGain)) this.ceiling = Infinity; // the cap lifted (the charger went in)
    const goal = Math.min(this.o.target, this.ceiling * capShare);
    if (fps >= goal) { this.descent = null; this.armed = null; return false; }
    if (!this.descent) {
      // one short window is not a trend (a burst of effects, or a window half in a heavier scene):
      // the next one confirms it, and the slower of the two is the rate the steps must beat
      if (this.armed === null) { this.armed = fps; return false; }
      this.descent = { scale: this.scale, low: this.low, fps: Math.min(this.armed, fps) };
      this.armed = null;
    }
    const d = this.descent;
    if (this.down(fps / goal)) {
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

  /**
   * One change for the worse. `short` is the frame rate over the goal (under 1). Resolution falls
   * as far as it would have to if the whole frame were pixels (they go as the scale squared): one
   * step when close, several at once when far short, so a slow machine settles in one or two
   * changes, not six (each change resizes every buffer).
   */
  private down(short: number): boolean {
    const { step, min } = this.o;
    const steps = () => Math.max(1, Math.ceil((this.scale * (1 - Math.sqrt(Math.max(0.05, short)))) / step - 1e-6));
    // above a pixel ratio of 1, resolution is the least visible loss
    if (!this.low && this.dpr > 1 + 1e-6) { this.scale = Math.max(1 / this.baseDpr, round(this.scale - steps() * step)); return true; }
    if (!this.low) { this.low = true; return true; }
    if (this.scale > min + 1e-6) { this.scale = Math.max(min, round(this.scale - steps() * step)); return true; }
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

/** more long frames in a row than this are the new normal (a heavier scene), not a stall */
const HITCH_STREAK = 3;

const round = (x: number) => Math.round(x * 100) / 100;

/** The pixel ratio cap for this device (SOP: 2 on desktop, 1.5 on touch screens). */
export function dprCap(devicePixelRatio: number, coarsePointer: boolean): number {
  return Math.min(devicePixelRatio, coarsePointer ? 1.5 : 2);
}
