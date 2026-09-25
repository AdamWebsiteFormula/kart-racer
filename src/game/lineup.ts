// The field for a race (design §5): the eight racers in racer order, the player first (the race
// manager puts them on the back row), the player in the kart they picked and every AI racer in its
// own kart, in every mode: the field reads at a glance, and every AI gate and medal time was measured
// on these constants. Each racer carries its kart id, so a Grand Prix or a Knockout keeps it race to race.
import { kartFor } from '../kart-controller/karts.ts';
import type { RacerConfig } from '../race-manager/types.ts';
import { ROSTER } from './racers.ts';

/** `playerId` null: an all-AI field (the attract race). `kartId` absent or unknown: the player's own kart. */
export function lineup(playerId: string | null, kartId?: string): RacerConfig[] {
  const order = playerId ? [...ROSTER.filter((r) => r.id === playerId), ...ROSTER.filter((r) => r.id !== playerId)] : [...ROSTER];
  return order.map((r) => {
    const isPlayer = r.id === playerId;
    return { racerId: r.id, archetype: r.archetype, isPlayer, kartId: kartFor(r.id, isPlayer ? kartId : undefined) };
  });
}
