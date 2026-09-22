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

/** The weights a kart of `rank` draws from right now, after every mask. */
export function weightsFor(cfg: ItemsConfig, st: RaceState, consts: readonly KartConstants[], track: Track, rank: number): Record<string, number> {
  const row = cfg.table[Math.min(Math.max(rank, 1), cfg.table.length) - 1];
  const out: Record<string, number> = { ...row };
  const locked = st.time < cfg.lockoutSeconds || leaderSecondsToFinish(st, consts, track) <= cfg.finalLapLockoutSeconds;
  if (locked) for (const id of cfg.lockedDuringLockout) out[id] = 0;
  if (st.mode === 'knockout') {
    const pool = cfg.knockoutPoolByRacers[String(racersRemaining(st))];
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
  if (s.item.held !== 'none' || s.item.rouletteRemaining > 0) return false;
  const id = weightedPick(weightsFor(cfg, st, consts, track, s.rank), next(m));
  if (!id) return false;
  const def = cfg.items.find((d) => d.id === id);
  s.item.held = id;
  s.item.charges = def?.behaviour.charges ?? 1;
  s.item.rouletteRemaining = cfg.rouletteSeconds;
  events.push({ type: 'roulette', racerId: s.racerId, itemId: id, seconds: cfg.rouletteSeconds });
  return true;
}

/** Ticks the roulette; fires itemReady when it lands. */
export function stepRoulette(s: KartState, dt: number, events: ItemEvent[]): void {
  if (s.item.rouletteRemaining <= 0) return;
  const nextR = s.item.rouletteRemaining - dt;
  s.item.rouletteRemaining = nextR > 1e-9 ? nextR : 0;
  if (s.item.rouletteRemaining === 0 && s.item.held !== 'none') events.push({ type: 'itemReady', racerId: s.racerId, itemId: s.item.held });
}
