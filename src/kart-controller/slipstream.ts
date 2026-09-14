// Step 12: sit in another kart's wake for slipstreamSeconds → boost.
import { requestBoost } from './boost.ts';
import type { KartConstants } from './constants.ts';
import { forwardOf, rightOf, type KartEvent, type KartState } from './types.ts';

const SAME_WAY_DOT = 0.7;

/** Is `s` inside `lead`'s wake? */
export function inWake(s: KartState, lead: KartState, c: KartConstants): boolean {
  if (lead === s || lead.isGhost || s.isGhost) return false;
  const f = forwardOf(lead.heading), r = rightOf(lead.heading);
  const dx = s.position[0] - lead.position[0];
  const dz = s.position[2] - lead.position[2];
  const along = dx * f[0] + dz * f[2]; // negative = behind
  const side = dx * r[0] + dz * r[2];
  if (along >= 0 || along < -c.slipstreamLength) return false;
  if (Math.abs(side) > c.slipstreamHalfWidth) return false;
  const mine = forwardOf(s.heading);
  if (mine[0] * f[0] + mine[2] * f[2] < SAME_WAY_DOT) return false;
  return lead.speed > 0 && s.speed > 0;
}

export function stepSlipstream(s: KartState, others: readonly KartState[], c: KartConstants, dt: number, events: KartEvent[]): void {
  const drafting = others.some((o) => inWake(s, o, c));
  if (!drafting) { s.slipstreamSeconds = 0; return; }
  s.slipstreamSeconds += dt;
  if (s.slipstreamSeconds >= c.slipstreamSeconds) {
    requestBoost(s, 'slipstream', c.slipstreamMultiplier, c.slipstreamBoostSeconds, events);
    s.slipstreamSeconds = 0;
  }
}
