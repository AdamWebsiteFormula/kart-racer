// Pickup → roll. The item is decided at pickup from the kart's rank; the HUD hides
// it until rouletteRemaining hits 0. Lockout and Knockout masks zero weights, then
// the rest are drawn from as they are (re-normalised by weightedPick, never re-rolled).
import type { KartConstants } from '../kart-controller/constants.ts';
import type { KartState } from '../kart-controller/types.ts';
import type { RaceState } from '../race-manager/types.ts';
import type { Track } from '../track-builder/track.ts';
import { next, weightedPick } from './rng.ts';
import type { ItemEvent, ItemsConfig, ItemsState } from './types.ts';

/** Seconds the leader needs to reach the line at its top speed; Infinity before the final lap. */
export function leaderSecondsToFinish(st: RaceState, consts: readonly KartConstants[], track: Track): number {
  if (st.phase !== 'finalLap') return Infinity;
  let best = -1;
  for (let i = 0; i < st.karts.length; i++) {
    const s = st.karts[i];
    if (s.isGhost || s.finishTick !== undefined) continue;
    if (best < 0 || s.rank < st.karts[best].rank) best = i;
  }
  if (best < 0) return Infinity;
  const remaining = st.lapsTotal * track.length - st.karts[best].distanceAlong;
  return Math.max(0, remaining) / consts[best].topSpeed;
}

/** Racers still in the race (Knockout: eliminated ids are not on the grid, but count them out if they are). */
export function racersRemaining(st: RaceState): number {
  const out = st.knockout?.eliminated ?? [];
  let n = 0;
  for (const s of st.karts) if (!s.isGhost && !out.includes(s.racerId)) n++;
  return n;
}

/**
 * The table row (1-based) for `rank` in a field of `field` racers: the rows stretch over the field, so
 * last place always draws the last row (24 Sept 2026: Knockout's 6 and 4 racer segments read the raw
 * place, and last of 4 drew the 4th-place row, with no comeback power in it).
 */
export function rowFor(rank: number, field: number, rows: number): number {
  const r = Math.min(Math.max(rank, 1), Math.max(field, 1));
  if (field <= 1) return 1;
  return Math.min(rows, 1 + Math.round(((r - 1) * (rows - 1)) / (field - 1)));
}

/** Knockout's pool for `n` racers: the entry for n, else the nearest smaller one (a 3-racer field uses the 2-racer pool). */
export function knockoutPool(cfg: ItemsConfig, n: number): readonly string[] | undefined {
  let best = -1;
  for (const k of Object.keys(cfg.knockoutPoolByRacers)) { const v = Number(k); if (v <= n && v > best) best = v; }
  return best < 0 ? undefined : cfg.knockoutPoolByRacers[String(best)];
}

/** The weights a kart of `rank` draws from right now, after every mask. */
export function weightsFor(cfg: ItemsConfig, st: RaceState, consts: readonly KartConstants[], track: Track, rank: number): Record<string, number> {
  const field = racersRemaining(st);
  const row = cfg.table[rowFor(rank, field, cfg.table.length) - 1];
  const out: Record<string, number> = { ...row };
  const locked = st.time < cfg.lockoutSeconds || leaderSecondsToFinish(st, consts, track) <= cfg.finalLapLockoutSeconds;
  if (locked) for (const id of cfg.lockedDuringLockout) out[id] = 0;
  // never an item this place could not use (the Fog Bank at 4th of 6 draws row 5)
  for (const d of cfg.items) if (out[d.id] && rank < (d.behaviour.minPosition ?? 1)) out[d.id] = 0;
  if (st.mode === 'knockout') {
    const pool = knockoutPool(cfg, field);
    if (pool) for (const id of Object.keys(out)) if (!pool.includes(id)) out[id] = 0;
  }
  return out;
}

/** A balloon popped under kart i. Rolls when the slot is empty; otherwise nothing. */
export function onPickup(
  cfg: ItemsConfig, m: ItemsState, st: RaceState, consts: readonly KartConstants[], track: Track, i: number, events: ItemEvent[],
): boolean {
  const s = st.karts[i];
  if (s.isGhost || s.finishTick !== undefined) return false;
  // two slots: the first free one takes the roll
  const heldFree = s.item.held === 'none' && s.item.rouletteRemaining <= 0;
  const nextFree = s.item.next === 'none' && s.item.nextRouletteRemaining <= 0;
  if (!heldFree && !nextFree) return false;
  const id = weightedPick(weightsFor(cfg, st, consts, track, s.rank), next(m));
  if (!id) return false;
  const def = cfg.items.find((d) => d.id === id);
  const charges = def?.behaviour.charges ?? 1;
  const slot: 0 | 1 = heldFree ? 0 : 1;
  if (slot === 0) { s.item.held = id; s.item.charges = charges; s.item.rouletteRemaining = cfg.rouletteSeconds; }
  else { s.item.next = id; s.item.nextCharges = charges; s.item.nextRouletteRemaining = cfg.rouletteSeconds; }
  events.push({ type: 'roulette', racerId: s.racerId, itemId: id, seconds: cfg.rouletteSeconds, slot });
  return true;
}

function tickDown(x: number, dt: number): number {
  const n = x - dt;
  return n > 1e-9 ? n : 0;
}

/** Ticks both roulettes; fires itemReady when one lands. */
export function stepRoulette(s: KartState, dt: number, events: ItemEvent[]): void {
  if (s.item.rouletteRemaining > 0) {
    s.item.rouletteRemaining = tickDown(s.item.rouletteRemaining, dt);
    if (s.item.rouletteRemaining === 0 && s.item.held !== 'none') events.push({ type: 'itemReady', racerId: s.racerId, itemId: s.item.held, slot: 0 });
  }
  if (s.item.nextRouletteRemaining > 0) {
    s.item.nextRouletteRemaining = tickDown(s.item.nextRouletteRemaining, dt);
    if (s.item.nextRouletteRemaining === 0 && s.item.next !== 'none') events.push({ type: 'itemReady', racerId: s.racerId, itemId: s.item.next, slot: 1 });
  }
}

/** Empty both slots and cancel both roulettes (Fog Bank). */
export function clearSlots(s: KartState): void {
  s.item.held = 'none'; s.item.charges = 0; s.item.rouletteRemaining = 0;
  s.item.next = 'none'; s.item.nextCharges = 0; s.item.nextRouletteRemaining = 0;
}

/** The next item moves up into the held slot (still rolling if it was). */
export function promoteNext(s: KartState): void {
  s.item.held = s.item.next; s.item.charges = s.item.nextCharges; s.item.rouletteRemaining = s.item.nextRouletteRemaining;
  s.item.next = 'none'; s.item.nextCharges = 0; s.item.nextRouletteRemaining = 0;
}
