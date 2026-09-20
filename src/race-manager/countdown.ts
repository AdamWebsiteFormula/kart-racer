// Countdown: step events on tick boundaries, `go` on the go tick, and the start
// boost from how long the throttle was held before green. All from tick.
import type { KartConstants } from '../kart-controller/constants.ts';
import { SIM_HZ, tryStartBoost } from '../kart-controller/step.ts';
import type { InputState, KartEvent, KartState } from '../kart-controller/types.ts';
import { RACE } from './constants.ts';
import type { KartTracker, RaceEvent } from './types.ts';

export const STEP_TICKS = Math.round(RACE.countdownStepSeconds * SIM_HZ);
export const GO_TICK = RACE.countdownSteps * STEP_TICKS;

/**
 * One countdown tick at `tick` (0-based). Returns true on the go tick, after the
 * start boosts have been decided.
 */
export function stepCountdown(
  tick: number, karts: KartState[], trackers: KartTracker[], inputs: readonly InputState[],
  consts: readonly KartConstants[], events: RaceEvent[], kartEvents: KartEvent[][],
): boolean {
  for (let i = 0; i < karts.length; i++) {
    const tr = trackers[i];
    if (inputs[i].throttle > RACE.stuckInputMin) { if (tr.throttleHeldSinceTick < 0) tr.throttleHeldSinceTick = tick; }
    else tr.throttleHeldSinceTick = -1;
  }
  if (tick < GO_TICK) {
    if (tick % STEP_TICKS === 0) events.push({ type: 'countdown', stepsLeft: RACE.countdownSteps - tick / STEP_TICKS });
    return false;
  }
  for (let i = 0; i < karts.length; i++) {
    const held = trackers[i].throttleHeldSinceTick;
    if (held >= 0) tryStartBoost(karts[i], consts[i], (GO_TICK - held) / SIM_HZ, kartEvents[i]);
  }
  events.push({ type: 'go' });
  return true;
}
