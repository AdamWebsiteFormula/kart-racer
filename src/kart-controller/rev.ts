// Render side, pure maths (no Three.js): the engine's own rev, free of the road (Adam, 26 Sept 2026:
// "When you give it gas, I don't hear the engine revving ... your kart doesn't seem to kind of rumble").
// On the grid, or stopped anywhere, the gas revs the engine as a kart in neutral does: it climbs fast
// to the limiter and bounces there, falls back slower when let go, and a tap is a blip; as the kart
// gets going the road takes the engine over (a centrifugal clutch biting). The engine sound's rpm, the
// kart's rumble and the pipes' fire all read this one state, so they agree. Events, stamped on its own
// clock: a blip (the gas pressed from low revs), a pop (let off after a high rev: a backfire, then a
// crackle or two), a launch (moving off from a standstill: a start boost, a hard launch, or a start held
// too early, which coughs). On the grid it also reads how the start goes if the gas stays down, by the
// sim's own start-boost rule (KartConstants), so the pipes can show it as Mario Kart's do ("the flames
// coming out of the vehicle's exhaust pipes determine the strength of the Rocket Start",
// mariowiki.com/Rocket_Start). It reads the kart state and its input and writes neither: the sim never
// sees it (game/viewSim.test.ts). KartView ticks it on the sim tick, before KartAnim. No allocation
// after construction.
import type { KartConstants } from './constants.ts';
import { SIM_HZ } from './step.ts';
import type { InputState, KartState } from './types.ts';

/** Every tuning number of the free rev (render only, not sim tuning). Seconds, m/s, shares of the rev range. */
export const ENGINE_REV = Object.freeze({
  /** the gas counts as down past this: the sim's own start-boost threshold (race-state stuckInputMin) */
  gasOn: 0.3,
  /** seconds: the rev climbs toward the gas this fast, and falls back toward idle this slow (a light engine in neutral) */
  rise: 0.2,
  fall: 0.45,
  /** where full gas pulls the rev: past the limiter (1), so a held gas reaches it */
  aim: 1.2,
  /** the limiter: this many cuts a second while the gas holds the engine there, each dropping the rev by `limitDip` */
  limitHz: 11,
  limitDip: 0.07,
  /** m/s: the road starts taking the engine over (a centrifugal clutch biting), and has all of it */
  clutchIn: 0.5,
  clutchFull: 7,
  /** the road's share (load) past which there are no blips, pops or launches: the kart is driving */
  driving: 0.5,
  /** a press with the rev under this is a blip */
  blipBelow: 0.5,
  /** letting off above this rev pops (a backfire), then `crackles` smaller pops, `crackleGap` s apart (each up to half that more), `crackleSize` as big */
  popAbove: 0.7,
  crackles: 2,
  crackleGap: 0.11,
  crackleSize: 0.7,
  /** seconds: the pipes' heat follows the rev, warming this fast and cooling this slow */
  heatUp: 0.3,
  heatDown: 1.1,
  /** m/s: moving off from a standstill; a launch with the rev above `hardAbove` is a hard one */
  moving: 0.05,
  hardAbove: 0.5,
  /** a start held too early coughs: the rev drops by this share, a backfire and three crackles */
  cough: 0.5,
  coughCrackles: 3,
});

export type EngineRevTuning = typeof ENGINE_REV;

/** The start as the grid reads it while the gas is down: too early (no boost), in the window (a start boost), too late; none: gas up, or not on the grid. */
export type StartRead = 'none' | 'early' | 'ready' | 'late';
/** How a kart moved off from a standstill: a start boost, a hard launch (high revs), a soft one, or a start held too early (a cough). */
export type Launch = 'none' | 'boost' | 'hard' | 'soft' | 'early';

/** The start-boost constants the grid's read needs (KartConstants). */
export type StartRule = Pick<KartConstants, 'startBoostCentreSeconds' | 'startBoostWindowSeconds'>;

/**
 * How a start goes for a press `secondsBeforeGo` before the go, held to it: the sim's own rule
 * (step.ts tryStartBoost: a boost inside the window round the centre, else nothing), too early above it.
 */
export function readStart(secondsBeforeGo: number, c: StartRule): StartRead {
  if (!(secondsBeforeGo >= 0)) return 'none';
  const off = secondsBeforeGo - c.startBoostCentreSeconds;
  if (Math.abs(off) <= c.startBoostWindowSeconds / 2) return 'ready';
  return off > 0 ? 'early' : 'late';
}

const clamp = (x: number, lo: number, hi: number) => (x < lo ? lo : x > hi ? hi : x);
const smooth = (a: number, b: number, x: number) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
/** a repeatable number in [0, 1) from an integer (the crackles' spacing; render only) */
function hash01(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** The read-only face of an EngineRev: what the sound, the rumble and the pipes use. */
export interface RevView {
  readonly rev: number;
  readonly load: number;
  readonly gas: number;
  readonly heat: number;
  readonly limiting: number;
  readonly cut: number;
  readonly clock: number;
  readonly blipAt: number;
  readonly blipSize: number;
  readonly popAt: number;
  readonly popSize: number;
  readonly pops: number;
  readonly launchAt: number;
  readonly launch: Launch;
  readonly start: StartRead;
}

/** One kart's engine rev. Call tick() once per sim tick after the sim has stepped, with the input the kart drove on. */
export class EngineRev implements RevView {
  /** 0 idle .. 1 the limiter: the engine's own rev, free of the road, the limiter's bounce in it */
  rev = 0;
  /** 0 free (a standstill: the gas alone sets the rev) .. 1 on the road (the speed sets it) */
  load = 0;
  /** the gas this tick, 0..1 */
  gas = 0;
  /** 0..1: the pipes' heat, following the rev (off the road) slowly */
  heat = 0;
  /** 0..1: how hard the limiter works (0 under it); `cut` is 1 at each cut, falling to 0 by the next */
  limiting = 0;
  cut = 0;
  /** seconds this rev has run: its events are stamped on this clock */
  clock = 0;
  /** the last blip (clock; -Infinity: none yet) and its size 0..1 */
  blipAt = -Infinity;
  blipSize = 0;
  /** the last pop (clock) and its size 0..1 (a backfire near 1, a crackle smaller), and how many so far */
  popAt = -Infinity;
  popSize = 0;
  pops = 0;
  /** the last launch from a standstill (clock) and its kind */
  launchAt = -Infinity;
  launch: Launch = 'none';
  /** on the grid with the gas down: how the start goes if it stays down */
  start: StartRead = 'none';
  /** the free rev before the limiter's bounce */
  private x = 0;
  private limitPhase = 0;
  private wasDown = false;
  private wasStill = true;
  /** the press's ticks before the go (NaN: not pressed on the grid), and whether the kart has moved off yet */
  private pressTicks = Number.NaN;
  private launched = false;
  private crackleLeft = 0;
  private crackleNext = 0;
  private readonly c: StartRule;
  private readonly t: EngineRevTuning;

  constructor(c: StartRule, tuning: EngineRevTuning = ENGINE_REV) {
    this.c = c;
    this.t = tuning;
  }

  /**
   * One sim tick: `s` the kart after the step, `input` what it drove on, `toGoTicks` the ticks from the
   * tick just stepped to the go (0 on the go tick itself; NaN or negative after it, or with no race).
   * Reads all three, writes none.
   */
  tick(s: Readonly<KartState>, input: Readonly<InputState>, dt: number, toGoTicks = Number.NaN): void {
    if (!(dt > 0)) return; // (anim.ts: a tick of no time moves nothing)
    const R = this.t;
    this.clock += dt;
    const gas = clamp(input.throttle, 0, 1), down = gas > R.gasOn;
    const speed = Math.abs(s.speed);
    this.gas = gas;
    this.load = smooth(R.clutchIn, R.clutchFull, speed);
    const free = this.load < R.driving;

    // the grid: where the press began, by the sim's own count (a hold with no break), and what it earns
    if (down && !this.wasDown) this.pressTicks = toGoTicks >= 0 ? toGoTicks : Number.NaN;
    if (!down) this.pressTicks = Number.NaN;
    this.start = down && !this.launched && this.pressTicks >= 0 ? readStart(this.pressTicks / SIM_HZ, this.c) : 'none';

    // a press from low revs is a blip; letting off from high revs pops, and it crackles after
    if (down && !this.wasDown && free && this.x < R.blipBelow) { this.blipAt = this.clock; this.blipSize = 1 - 0.5 * (this.x / R.blipBelow); }
    if (!down && this.wasDown && free && this.x > R.popAbove) {
      // the higher it revved, the bigger the pop; only a let-off from near the limiter crackles on after it
      const k = clamp((this.x - R.popAbove) / (1 - R.popAbove), 0, 1);
      this.popNow(0.6 + 0.4 * k, k > 0.8 ? R.crackles : k > 0.5 ? 1 : 0);
    }
    if (down) this.crackleLeft = 0; // back on the gas: the crackle stops
    if (this.crackleLeft > 0 && this.clock >= this.crackleNext) {
      this.crackleLeft--;
      this.popNow(R.crackleSize * (0.7 + 0.6 * hash01(this.pops * 7 + 3)), -1);
    }

    // the free rev: it climbs toward the gas fast and falls slower; held, the limiter cuts it
    const aim = gas * R.aim;
    this.x += (aim - this.x) * (1 - Math.exp(-dt / (aim > this.x ? R.rise : R.fall)));
    if (this.x >= 1 && aim > 1) {
      this.x = 1;
      this.limiting = Math.min(1, this.limiting + dt * R.limitHz);
      this.limitPhase += R.limitHz * dt;
      this.cut = 1 - (this.limitPhase - Math.floor(this.limitPhase));
    } else {
      this.x = Math.min(this.x, 1);
      this.limiting = Math.max(0, this.limiting - dt * R.limitHz);
      this.limitPhase = 0;
      this.cut = 0;
    }

    // moving off from a standstill with the gas down: a start boost, a start held too early (a cough), or a launch by the revs
    const still = speed < R.moving;
    if (this.wasStill && !still && down) {
      const kind: Launch = s.boost.source === 'start' && s.boost.remaining > 0 ? 'boost'
        : !this.launched && this.start === 'early' ? 'early'
        : this.x >= R.hardAbove ? 'hard' : 'soft';
      this.launch = kind;
      this.launchAt = this.clock;
      this.launched = true;
      this.start = 'none';
      if (kind === 'early') { this.x = Math.max(0, this.x - R.cough); this.popNow(1, R.coughCrackles); }
    }
    this.wasStill = still;
    this.wasDown = down;

    this.rev = clamp(this.x - R.limitDip * this.cut * this.limiting, 0, 1);
    const hot = this.rev * (1 - this.load);
    this.heat += (hot - this.heat) * (1 - Math.exp(-dt / (hot > this.heat ? R.heatUp : R.heatDown)));
  }

  /** A pop of `size` now, and `crackles` more after it (-1: this is one of them). */
  private popNow(size: number, crackles: number): void {
    this.popAt = this.clock;
    this.popSize = size;
    this.pops++;
    if (crackles >= 0) this.crackleLeft = crackles;
    this.crackleNext = this.clock + this.t.crackleGap * (1 + 0.5 * hash01(this.pops));
  }
}
