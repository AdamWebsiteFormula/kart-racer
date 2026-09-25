// The one place the UI reads the kart numbers: a racer-and-kart pair's four stats, the step each stat moves
// in, and the fair band every pair stays inside, the stat bars' ends (docs/plans/kart-combos.md §2). They are
// the sim's own (kart-controller karts.ts, from kart.schema.json), so the panel shows what the race runs:
// kartStats.test holds the panel to makeConstants for all 80 racer-and-kart pairs.
import { COMBO_BOUNDS, comboStats as simCombo, KART_STEPS, STAT_KEYS, type StatKey } from '../../kart-controller/karts.ts';

export type { StatKey };
export type StatLine = Readonly<Record<StatKey, number>>;
/** the four stats in the order the bars sit */
export { STAT_KEYS };
/** One step of each stat: whole steps are the karts' only unit (0.005 speed = 0.06 accel = 0.06 handling = 0.05 weight). */
export const KART_STEP: StatLine = KART_STEPS;
/** The fair band: every racer-and-kart pair's total stays inside it; the bars span it. */
export { COMBO_BOUNDS };

/**
 * A racer in a kart: their class with the kart's stats put in place of their own kart's (the sim's rule, bit
 * for bit). An unknown kart is their own; an unknown racer is the medium class alone. Never throws.
 */
export function comboStats(racerId: string, kartId: string | undefined): StatLine {
  return simCombo(racerId, kartId);
}
