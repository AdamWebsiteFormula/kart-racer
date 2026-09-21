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
