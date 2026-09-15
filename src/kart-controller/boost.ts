// Step 7: one live boost. Priorities trick 5 > item 4 > pad 3 > drift 2 >
// slipstream 1 = start 1. Boosts never add.
import { BASE } from './constants.ts';
import type { BoostSource, KartEvent, KartState } from './types.ts';

export const BOOST_PRIORITY: Readonly<Record<BoostSource, number>> = Object.freeze({
  none: 0, start: 1, slipstream: 1, drift: 2, pad: 3, item: 4, trick: 5,
});

export function boostLive(s: KartState): boolean {
  return s.boost.source !== 'none' && s.boost.remaining > 0;
}

/**
 * Ask for a boost. Replaces the live one only if priority is >= the live
 * priority; equal priority keeps the longer remaining time. The multiplier
 * is clamped to the schema ceiling so no caller can exceed 1.4 × V.
 */
export function requestBoost(
  s: KartState, source: BoostSource, multiplier: number, seconds: number, events: KartEvent[],
): boolean {
  if (source === 'none' || seconds <= 0) return false;
  multiplier = Math.min(multiplier, BASE.maxBoostMultiplier);
  if (boostLive(s)) {
    const p = BOOST_PRIORITY[source];
    const q = BOOST_PRIORITY[s.boost.source];
    if (p < q) return false;
    if (p === q && s.boost.remaining >= seconds) return false;
  }
  s.boost.source = source;
  s.boost.multiplier = multiplier;
  s.boost.remaining = seconds;
  events.push({ type: 'boostStart', source, multiplier, seconds });
  return true;
}

export function clearBoost(s: KartState): void {
  s.boost.source = 'none';
  s.boost.multiplier = 1;
  s.boost.remaining = 0;
}

export function tickBoost(s: KartState, dt: number): void {
  if (s.boost.remaining <= 0) return;
  s.boost.remaining = Math.max(0, s.boost.remaining - dt);
  if (s.boost.remaining === 0) clearBoost(s);
}
