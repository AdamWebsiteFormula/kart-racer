// Focus grids: one model serves keyboard, gamepad and pointer. Pure.
import type { FocusModel, NavAction } from './types.ts';

function locate(m: FocusModel, id: string): [number, number] | null {
  for (let r = 0; r < m.rows.length; r++) {
    const c = m.rows[r].indexOf(id);
    if (c >= 0) return [r, c];
  }
  return null;
}

const enabled = (m: FocusModel, id: string) => !(m.disabled?.includes(id) ?? false);

/** The first enabled entry, reading order. */
export function firstFocus(m: FocusModel): string | null {
  for (const row of m.rows) for (const id of row) if (enabled(m, id)) return id;
  return null;
}

/** Move focus one step. Wraps. Never lands on a disabled id; returns `from` if nothing else is reachable. */
export function move(m: FocusModel, from: string, dir: NavAction): string {
  const at = locate(m, from);
  if (!at) return firstFocus(m) ?? from;
  const [r0, c0] = at;
  if (dir === 'left' || dir === 'right') {
    const row = m.rows[r0];
    const step = dir === 'right' ? 1 : -1;
    for (let k = 1; k < row.length; k++) {
      const id = row[(c0 + step * k + row.length * k) % row.length];
      if (enabled(m, id)) return id;
    }
    return from;
  }
  if (dir === 'up' || dir === 'down') {
    const n = m.rows.length;
    const step = dir === 'down' ? 1 : -1;
    for (let k = 1; k < n; k++) {
      const row = m.rows[(r0 + step * k + n * k) % n];
      if (row.length === 0) continue;
      // nearest enabled column to c0 in that row
      let best: string | null = null, bestD = Infinity;
      for (let c = 0; c < row.length; c++) {
        if (!enabled(m, row[c])) continue;
        const d = Math.abs(c - Math.min(c0, row.length - 1));
        if (d < bestD) { bestD = d; best = row[c]; }
      }
      if (best) return best;
    }
    return from;
  }
  return from;
}

/** Every id reachable by arrows alone from `start`. */
export function reachable(m: FocusModel, start: string): Set<string> {
  const seen = new Set<string>([start]);
  const queue = [start];
  const dirs: NavAction[] = ['up', 'down', 'left', 'right'];
  while (queue.length) {
    const id = queue.shift() as string;
    for (const d of dirs) {
      const next = move(m, id, d);
      if (!seen.has(next)) { seen.add(next); queue.push(next); }
    }
  }
  return seen;
}
