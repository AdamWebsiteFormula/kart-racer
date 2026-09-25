// The Kart screen (design §5, §12; docs/plans/kart-combos.md §5). Pure view models: the ten kart cards and
// their focus grid, and how the focus runs through them. The stats panel beside them is screens/stats.ts.
import { castCard, nameOf } from '../data/cast.ts';
import { byLine, kartColors, kartLocked, KARTS } from '../data/karts.ts';
import type { StatLine } from '../data/kartStats.ts';
import type { Save } from '../store.ts';
import type { FocusModel, NavAction } from '../types.ts';
import { UNLOCKS } from '../unlocks.ts';
import { panelWords, statPanel } from './stats.ts';

export const KART_SCREEN_TITLE = 'Pick your kart';
/** the "locked in" stamp on a kart as it is chosen */
export const LOCKED_IN = 'Locked in!';

/**
 * A kart card: `by` whose kart it is ("Gus's kart") or what a twin is ("Same stats as the Wind-Up Racer");
 * `colors` its picture's two colors (the owner's; a twin the racer's own or their paint's); `locked` a twin
 * not yet earned, which takes the focus to preview but cannot be chosen, `hint` how to earn it; `chosen` the
 * kart the racer is in now; `words` its stats against that one's, for its label.
 */
export interface KartCardVM { id: string; name: string; by: string; line: string; owner: string | null; colors: readonly [string, string]; locked: boolean; hint?: string; chosen: boolean; words: string }
export interface KartMenuVM { title: string; racerId: string; racerName: string; cards: KartCardVM[]; focus: FocusModel }

/** The cards' columns: 10 karts in 5 × 2, the way the grid sits (MKW sets its parts in a grid too). */
export const KART_COLUMNS = 5;

/**
 * The Kart screen for this racer (their paint dresses a twin), the kart they are in now marked chosen.
 * `stats(kartId)`: the racer's combined line in that kart (data/kartStats.ts comboStats, bound to the racer).
 */
export function kartMenu(save: Save, racerId: string, currentKart: string, stats: (kartId: string) => StatLine): KartMenuVM {
  const paint = save.settings.skinByRacer[racerId];
  const now = stats(currentKart);
  const cards = KARTS.map((k): KartCardVM => {
    const locked = kartLocked(k, save.unlocked.bodies);
    const hint = locked ? UNLOCKS.find((u) => u.id === k.unlock)?.how : undefined;
    return {
      id: k.id, name: k.name, by: byLine(k), line: k.line, owner: k.owner, colors: kartColors(k, racerId, paint),
      locked, ...(hint ? { hint } : {}), chosen: k.id === currentKart, words: panelWords(statPanel(now, stats(k.id))),
    };
  });
  const ids = cards.map((c) => c.id);
  const rows: string[][] = [];
  for (let i = 0; i < ids.length; i += KART_COLUMNS) rows.push(ids.slice(i, i + KART_COLUMNS));
  return { title: KART_SCREEN_TITLE, racerId, racerName: castCard(racerId)?.name ?? nameOf(racerId), cards, focus: { rows } };
}

/**
 * How the focus runs on the Kart screen: left and right through all ten in reading order, wrapping from
 * the last card of a row to the first of the next (and from the tenth to the first); up and down to the
 * other row, same column, wrapping. Every card takes the focus, locked or not (a locked one previews).
 */
export function kartMove(focus: FocusModel, cur: string, dir: NavAction): string {
  const all = focus.rows.flat();
  const at = all.indexOf(cur);
  if (at < 0) return all[0] ?? cur;
  if (dir === 'left' || dir === 'right') return all[(at + (dir === 'right' ? 1 : -1) + all.length) % all.length];
  if (dir === 'up' || dir === 'down') {
    const r = focus.rows.findIndex((row) => row.includes(cur)), n = focus.rows.length;
    const row = focus.rows[(r + (dir === 'down' ? 1 : -1) + n) % n];
    return row[Math.min(focus.rows[r].indexOf(cur), row.length - 1)] ?? cur;
  }
  return cur;
}
