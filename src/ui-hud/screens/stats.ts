// The stats panel (design §5, §12; docs/plans/kart-combos.md §5), one piece on the Racer and Kart screens:
// a racer-and-kart pair's four stats as bars on the fair band's scale, with the ghost of the combo under the
// focus over the one chosen, a chevron per step, and words for a screen reader. Pure.
import { COMBO_BOUNDS, KART_STEP, STAT_KEYS, type StatKey, type StatLine } from '../data/kartStats.ts';

/** each stat's name on its bar */
export const STAT_LABELS: Readonly<Record<StatKey, string>> = Object.freeze({ speed: 'Speed', accel: 'Accel', handling: 'Handling', weight: 'Weight' });
/** the words for a stat's bar: 1 to this */
export const STAT_SCALE = 10;
/** at most this many chevrons beside a bar, one a step */
export const MAX_CHEVRONS = 3;

/** A stat's total as a bar, 0.08 (the band's low end: never an empty bar) to 1 (its high end). Pure. */
export function comboBar(key: StatKey, total: number): number {
  const [lo, hi] = COMBO_BOUNDS[key];
  const t = Math.min(1, Math.max(0, (total - lo) / (hi - lo)));
  return 0.08 + 0.92 * t;
}

/** A bar in the words' scale, 1 to 10 ("Speed 7 of 10"). */
export const statLevel = (bar: number): number => Math.min(STAT_SCALE, Math.max(1, Math.round(bar * STAT_SCALE)));

/**
 * One stat's bar: `value` the current combo's (the solid bar), `ghost` the focused combo's; `steps` how far
 * the focused one moves it in the kart's whole steps (+ up, − down) and `chevrons` one a step, at most 3;
 * `level` the focused combo's bar out of 10; `words` for a screen reader ("Speed 7 of 10, up 2": its level,
 * and how far that is from the current one's).
 */
export interface StatRowVM { key: StatKey; label: string; value: number; ghost: number; steps: number; chevrons: number; level: number; words: string }
export interface StatPanelVM { rows: StatRowVM[] }

/** The four bars: `current` the combo on show as chosen, `focused` the one under the focus (the same: no ghost). Pure. */
export function statPanel(current: StatLine, focused: StatLine = current): StatPanelVM {
  return {
    rows: STAT_KEYS.map((key) => {
      const value = comboBar(key, current[key]), ghost = comboBar(key, focused[key]);
      const steps = Math.round((focused[key] - current[key]) / KART_STEP[key]);
      const level = statLevel(ghost), by = level - statLevel(value);
      const label = STAT_LABELS[key];
      const change = by > 0 ? `, up ${by}` : by < 0 ? `, down ${-by}` : '';
      return { key, label, value, ghost, steps, chevrons: Math.min(MAX_CHEVRONS, Math.abs(steps)), level, words: `${label} ${level} of ${STAT_SCALE}${change}` };
    }),
  };
}

/** A panel's words in one line, for a card's label ("Speed 7 of 10, up 2. Accel 4 of 10, …"). */
export const panelWords = (p: StatPanelVM): string => p.rows.map((r) => r.words).join('. ');
