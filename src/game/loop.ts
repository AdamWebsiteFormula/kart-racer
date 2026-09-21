// Fixed-timestep accumulator with render interpolation (Fix Your Timestep, plan §6.4).
// Pure: no DOM, no Three.js, so the stepping rule is testable headless.
import { SIM_DT } from '../kart-controller/step.ts';

/** A long stall (tab hidden, GC) must not spiral: run at most this many sim steps per frame. */
export const MAX_STEPS = 6;

export class Accumulator {
  /** seconds of sim time owed */
  private acc = 0;
  /** 0..1 fraction of a tick between the last two sim states, for render lerp */
  alpha = 0;
  /** steps dropped by the clamp since the last reset (debug) */
  dropped = 0;

  /** Frame seconds in → how many sim steps to run now. Sets `alpha` for this frame. */
  steps(frameSeconds: number): number {
    this.acc += Math.max(0, frameSeconds);
    // epsilon: 1 s of ticks does not sum to exactly 1 in floats, and a frame that is
    // one tick long must always be one step (kart-controller uses the same trick)
    let n = Math.floor(this.acc / SIM_DT + 1e-9);
    if (n > MAX_STEPS) {
      this.dropped += n - MAX_STEPS;
      this.acc -= (n - MAX_STEPS) * SIM_DT;
      n = MAX_STEPS;
    }
    this.acc = Math.max(0, this.acc - n * SIM_DT);
    this.alpha = this.acc / SIM_DT;
    return n;
  }

  /** After a pause: throw away the owed time so the race does not fast-forward. */
  reset(): void {
    this.acc = 0;
    this.alpha = 0;
  }
}
