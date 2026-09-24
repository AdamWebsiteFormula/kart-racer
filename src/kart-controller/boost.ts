// Step 7: one live boost. Priorities trick 5 > item 4 > pad 3 > drift 2 >
// slipstream 1 = start 1. Boosts never add: one multiplier at a time. A boost that
// cannot run now is not thrown away: it keeps its own clock in one slot underneath the
// live one and takes over for whatever it has left when the live one ends (24 Sept 2026:
// an ultra mini-turbo released 0.05 s before a pad boost ended was lost; a trick cut a
// Fizz Pop from 1.4 × 1.5 s to 1.3 × 0.7 s). Its clock runs while it waits, so boosts
// never chain into more boost time than they were each worth.
import { BASE } from './constants.ts';
import type { BoostSource, KartEvent, KartState } from './types.ts';

export const BOOST_PRIORITY: Readonly<Record<BoostSource, number>> = Object.freeze({
  none: 0, start: 1, slipstream: 1, drift: 2, pad: 3, item: 4, trick: 5,
});

export function boostLive(s: KartState): boolean {
  return s.boost.source !== 'none' && s.boost.remaining > 0;
}

/** Put a boost in the slot underneath; if one waits already, the stronger (then the longer) stays. */
function enqueue(s: KartState, source: BoostSource, multiplier: number, seconds: number): void {
  const q = s.boostQueue;
  if (q.source !== 'none' && q.remaining > 0 && (q.multiplier > multiplier || (q.multiplier === multiplier && q.remaining >= seconds))) return;
  q.source = source; q.multiplier = multiplier; q.remaining = seconds;
}

function start(s: KartState, source: BoostSource, multiplier: number, seconds: number, events: KartEvent[]): void {
  s.boost.source = source;
  s.boost.multiplier = multiplier;
  s.boost.remaining = seconds;
  events.push({ type: 'boostStart', source, multiplier, seconds });
}

/**
 * Ask for a boost. Returns true when it runs now. The multiplier is clamped to the schema
 * ceiling so no caller can exceed 1.4 × V.
 * - Nothing live: it runs.
 * - The same source: one boost, refreshed to the longer time (and the stronger multiplier).
 * - Lower priority than the live one, or weaker: it waits in the queue (never stacks).
 * - Higher priority and at least as strong: it runs, and what was left of the live one waits.
 * - Equal priority (start, slipstream): the longer runs, the other waits.
 */
export function requestBoost(
  s: KartState, source: BoostSource, multiplier: number, seconds: number, events: KartEvent[],
): boolean {
  if (source === 'none' || seconds <= 0) return false;
  multiplier = Math.min(multiplier, BASE.maxBoostMultiplier);
  if (!boostLive(s)) { start(s, source, multiplier, seconds, events); return true; }
  const live = s.boost;
  if (source === live.source) {
    if (seconds <= live.remaining && multiplier <= live.multiplier) return false;
    start(s, source, Math.max(multiplier, live.multiplier), Math.max(seconds, live.remaining), events);
    return true;
  }
  const p = BOOST_PRIORITY[source];
  const q = BOOST_PRIORITY[live.source];
  if (p < q || multiplier < live.multiplier || (p === q && seconds <= live.remaining)) {
    enqueue(s, source, multiplier, seconds);
    return false;
  }
  enqueue(s, live.source, live.multiplier, live.remaining);
  start(s, source, multiplier, seconds, events);
  return true;
}

export function clearBoost(s: KartState): void {
  s.boost.source = 'none';
  s.boost.multiplier = 1;
  s.boost.remaining = 0;
  s.boostQueue.source = 'none';
  s.boostQueue.multiplier = 1;
  s.boostQueue.remaining = 0;
}

/** Counts the live boost and the one underneath down; when the live one ends, what is left of the other takes over. */
export function tickBoost(s: KartState, dt: number): void {
  const q = s.boostQueue;
  if (q.remaining > 0) {
    const left = q.remaining - dt;
    if (left > 1e-9) q.remaining = left;
    else { q.source = 'none'; q.multiplier = 1; q.remaining = 0; }
  }
  if (s.boost.remaining <= 0) return;
  // snap float dust to 0: 1.5 s of 120 Hz ticks does not sum to exactly 1.5 (Lessons 2026-09-15)
  const next = s.boost.remaining - dt;
  s.boost.remaining = next > 1e-9 ? next : 0;
  if (s.boost.remaining > 0) return;
  if (q.source !== 'none' && q.remaining > 0) {
    s.boost.source = q.source; s.boost.multiplier = q.multiplier; s.boost.remaining = q.remaining;
    q.source = 'none'; q.multiplier = 1; q.remaining = 0;
  } else clearBoost(s);
}
