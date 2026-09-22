// Test-drive HUD: the numbers that tell you whether the handling feels right.
// The real HUD (ui-hud) replaces this; nothing here is final art.
import { SIM_HZ } from '../kart-controller/step.ts';
import type { KartState } from '../kart-controller/types.ts';
import type { RaceState } from '../race-manager/types.ts';

export interface HudNumbers {
  banner: string;
  lap: string;
  position: string;
  speed: string;
  drift: string;
  boost: string;
  time: string;
}

const ORDINAL = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];

export function formatTime(seconds: number): string {
  if (seconds < 0) return '0:00.00';
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m}:${s < 10 ? '0' : ''}${s.toFixed(2)}`;
}

/** Everything the test-drive overlay shows, as strings. Pure, so it is testable. */
export function hudNumbers(state: RaceState, player: KartState, tiers: readonly number[]): HudNumbers {
  const goIn = (state.goTick - state.tick) / SIM_HZ;
  const banner =
    state.phase === 'countdown' ? (goIn > 2 ? '3' : goIn > 1 ? '2' : goIn > 0 ? '1' : 'GO!')
    : player.finishTick !== undefined ? `FINISHED ${ORDINAL[player.rank - 1] ?? player.rank}`
    : state.phase === 'finalLap' ? 'FINAL LAP — THE TIDE IS IN'
    : '';
  const d = player.drift;
  const tier = d.tier > 0 ? `${'★'.repeat(d.tier)} ${Math.round(d.charge)}` : d.active ? `charging ${Math.round(d.charge)} / ${tiers[0]}` : '—';
  return {
    banner,
    lap: `LAP ${Math.min(player.lap, state.lapsTotal)}/${state.lapsTotal}`,
    position: ORDINAL[player.rank - 1] ?? `${player.rank}`,
    speed: `${Math.round(player.speed * 3.6)} km/h`,
    drift: tier,
    boost: player.boost.remaining > 0 ? `${player.boost.source} ×${player.boost.multiplier.toFixed(2)} ${player.boost.remaining.toFixed(1)}s` : '—',
    time: formatTime(state.time),
  };
}

export interface ItemSlot { state: 'empty' | 'rolling' | 'ready'; label: string; charges: string }

/** ROULETTE_FLICKER_MS: the rolling slot changes name this often; wall time drives it (cosmetic only). */
export const ROULETTE_FLICKER_MS = 90;

function slotFor(id: string, charges: number, roulette: number, defs: readonly { id: string; name: string }[], nowMs: number): ItemSlot {
  if (roulette > 0) {
    const d = defs[Math.floor(nowMs / ROULETTE_FLICKER_MS) % Math.max(1, defs.length)];
    return { state: 'rolling', label: d?.name ?? '?', charges: '' };
  }
  if (id === 'none') return { state: 'empty', label: '', charges: '' };
  const d = defs.find((x) => x.id === id);
  return { state: 'ready', label: d?.name ?? id, charges: charges > 1 ? `×${charges}` : '' };
}

/** What the two HUD item slots show. `defs` come from the items config in order; the flicker walks them. */
export function itemSlots(player: KartState, defs: readonly { id: string; name: string }[], nowMs: number): { held: ItemSlot; next: ItemSlot } {
  const it = player.item;
  return {
    held: slotFor(it.held, it.charges, it.rouletteRemaining, defs, nowMs),
    next: slotFor(it.next, it.nextCharges, it.nextRouletteRemaining, defs, nowMs + ROULETTE_FLICKER_MS * 3),
  };
}
