// Rank order: finished karts by finish tick, then everyone else by distanceAlong,
// tie by grid slot. Ghosts get rank 0 and never appear in the order.
import type { KartState } from '../kart-controller/types.ts';
import { RACE } from './constants.ts';
import type { KartTracker, RaceEvent } from './types.ts';

function compare(karts: KartState[], trackers: KartTracker[], i: number, j: number): number {
  const a = karts[i], b = karts[j];
  const af = a.finishTick !== undefined, bf = b.finishTick !== undefined;
  if (af && bf) return (a.finishTick as number) - (b.finishTick as number) || trackers[i].gridSlot - trackers[j].gridSlot;
  if (af !== bf) return af ? -1 : 1;
  if (a.distanceAlong !== b.distanceAlong) return b.distanceAlong - a.distanceAlong;
  return trackers[i].gridSlot - trackers[j].gridSlot;
}

/** Fills `order` with kart indices, best first. Insertion sort: 8 entries, nearly sorted every tick. */
export function sortOrder(karts: KartState[], trackers: KartTracker[], order: number[]): number[] {
  order.length = 0;
  for (let i = 0; i < karts.length; i++) if (!karts[i].isGhost) order.push(i);
  for (let i = 1; i < order.length; i++) {
    const v = order[i];
    let j = i - 1;
    while (j >= 0 && compare(karts, trackers, order[j], v) > 0) { order[j + 1] = order[j]; j--; }
    order[j + 1] = v;
  }
  return order;
}

/**
 * Sets kart.rank from the order and fires positionChange once a new rank has held
 * for rankDebounceSeconds. A kart that just finished announces at once.
 */
export function assignRanks(karts: KartState[], trackers: KartTracker[], order: readonly number[], dt: number, events: RaceEvent[]): void {
  for (let r = 0; r < order.length; r++) {
    const i = order[r];
    const s = karts[i], tr = trackers[i];
    const rank = r + 1;
    tr.rankHeldSeconds = rank === s.rank ? tr.rankHeldSeconds + dt : dt;
    s.rank = rank;
    if (rank === tr.shownRank) continue;
    const justFinished = s.finishTick !== undefined;
    if (justFinished || tr.rankHeldSeconds + 1e-9 >= RACE.rankDebounceSeconds) {
      tr.shownRank = rank;
      events.push({ type: 'positionChange', racerId: s.racerId, rank });
    }
  }
}
