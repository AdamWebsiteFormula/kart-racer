// The racer-and-kart pairs for the kart balance gate (game/combos.e2e.test.ts) and the scripted
// drifter's report (game/combos.report.test.ts): design §5, any racer in any kart.
import { comboStats, KART_IDS, RACER_CLASSES } from '../../kart-controller/karts.ts';

/** A pair's total as a key: the exact numbers, so only pairs whose constants are bit-identical share a run. */
export const keyOf = (racerId: string, kartId?: string): string => {
  const t = comboStats(racerId, kartId);
  return `${t.speed} ${t.accel} ${t.handling}`;
};

/** Every racer in every kart (8 × 10). */
export const PAIRS: readonly { racerId: string; kartId: string; key: string }[] = Object.keys(RACER_CLASSES)
  .flatMap((racerId) => KART_IDS.map((kartId) => ({ racerId, kartId, key: keyOf(racerId, kartId) })));

/**
 * Each distinct speed, accel and handling total, raced by the first pair that has it. Pairs with the
 * same total race the same solo race: weight only moves bumps, and a solo run has none.
 */
export const COMBOS = [...new Map(PAIRS.map((p) => [p.key, p])).values()];

/** Every pair with this total, for messages: "pip/wagon, momo/pod". */
export const nameOf = (key: string): string => PAIRS.filter((p) => p.key === key).map((p) => `${p.racerId}/${p.kartId}`).join(', ');

export const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
