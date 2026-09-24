// The race HUD as data. Events drive the transient things (banner, flash, flourish) through a
// small memory; state drives the steady readouts. Pure: the caller passes the clock.
import type { KartState } from '../kart-controller/types.ts';
import type { ItemEvent } from '../items/types.ts';
import { KNOCKOUT_CUT_LINES } from '../race-manager/constants.ts';
import { STEP_TICKS } from '../race-manager/countdown.ts';
import { ticksToMs } from '../race-manager/race.ts';
import type { RaceEvent, RaceState } from '../race-manager/types.ts';
import { UI } from './constants.ts';
import { formatMs, formatTime, mph, ordinal, ordinalParts } from './format.ts';

/** shift: the Final Lap Shift's own label, when the leader starts the last lap before the player */
export type BannerKind = 'countdown' | 'go' | 'wrongWay' | 'finalLap' | 'shift' | 'finish' | 'strike';
const PRIORITY: Readonly<Record<BannerKind, number>> = { countdown: 1, go: 1, strike: 2, wrongWay: 2, finalLap: 3, shift: 3, finish: 4 };

export interface HudMemory {
  banner: { text: string; sub: string; kind: BannerKind; until: number } | null;
  flashUntil: number;
  flourishUntil: number;
  wrongWay: boolean;
  shiftLabel: string;
  /** the player has started their own last lap */
  finalLap: boolean;
  /** the controls strip shows a moment after the go (through the countdown it shows from state) */
  hintUntil: number;
}

export const newHudMemory = (): HudMemory => ({ banner: null, flashUntil: -1, flourishUntil: -1, wrongWay: false, shiftLabel: '', finalLap: false, hintUntil: -1 });

function show(m: HudMemory, kind: BannerKind, text: string, sub: string, until: number, clock: number): void {
  const cur = m.banner && m.banner.until > clock ? m.banner : null;
  if (cur && PRIORITY[cur.kind] > PRIORITY[kind]) return;
  m.banner = { text, sub, kind, until };
}

/** Feed one tick's events. `clock` is seconds on any monotonic clock. */
export function feedHud(m: HudMemory, race: readonly RaceEvent[], items: readonly ItemEvent[], playerId: string, clock: number): void {
  const hold = clock + UI.bannerHoldSeconds;
  for (const e of race) {
    switch (e.type) {
      case 'go': show(m, 'go', 'GO!', '', clock + 1, clock); m.hintUntil = clock + UI.keysHintSeconds; break;
      case 'trackChanged': m.shiftLabel = e.event.label; break;
      // FINAL LAP is the player's own last lap; the shift fires on the leader's. A leading player
      // gets both on one tick (lap first, then the label): FINAL LAP under the shift's label.
      case 'lap':
        if (e.racerId === playerId && e.isFinal) { m.finalLap = true; show(m, 'finalLap', 'FINAL LAP', m.shiftLabel, hold, clock); }
        break;
      case 'phase':
        if (e.phase !== 'finalLap') break;
        if (m.finalLap) show(m, 'finalLap', 'FINAL LAP', m.shiftLabel, hold, clock);
        else if (m.shiftLabel) show(m, 'shift', m.shiftLabel, '', hold, clock);
        break;
      case 'wrongWay': if (e.racerId === playerId) m.wrongWay = e.on; break;
      case 'positionChange': if (e.racerId === playerId) m.flourishUntil = clock + 0.4; break;
      case 'finish':
        if (e.racerId === playerId) show(m, 'finish', e.dnf ? 'TIME!' : 'FINISH!', ordinal(e.rank), Infinity, clock);
        break;
      case 'kart':
        if (e.racerId === playerId && e.event.type === 'hit') m.flashUntil = clock + UI.flashMs / 1000;
        break;
      default: break;
    }
  }
  for (const e of items) {
    if (e.type === 'burst' && e.racerId === playerId) show(m, 'strike', 'STRIKE!', '', clock + 1.2, clock);
    if (e.type === 'hit' && e.racerId === playerId) m.flashUntil = clock + UI.flashMs / 1000;
    if (e.type === 'fog' && e.victims.includes(playerId)) m.flashUntil = clock + UI.flashMs / 1000;
  }
}

/** ready: use it; active: a power running from this slot (Strike Ball); trailing: held behind the kart */
export interface ItemSlotVM { state: 'empty' | 'rolling' | 'ready' | 'active' | 'trailing'; itemId: string; label: string; charges: string }

export interface HudVM {
  timer: string;
  lap: string;
  lapFinal: boolean;
  position: { n: string; suffix: string };
  flourish: boolean;
  coins: string;
  coinsFull: boolean;
  speed: string;
  held: ItemSlotVM;
  next: ItemSlotVM;
  banner: { text: string; sub: string; kind: BannerKind } | null;
  flash: boolean;
  knockout: { text: string; danger: boolean } | null;
  /** show the controls strip */
  keysHint: boolean;
}

type Def = { id: string; name: string };

function slot(id: string, charges: number, roulette: number, defs: readonly Def[], nowMs: number, trailing = false): ItemSlotVM {
  if (roulette > 0) {
    const d = defs[Math.floor(nowMs / UI.rouletteFlickerMs) % Math.max(1, defs.length)];
    return { state: 'rolling', itemId: d?.id ?? '', label: d?.name ?? '?', charges: '' };
  }
  if (id === 'none' || !id) return { state: 'empty', itemId: '', label: '', charges: '' };
  const d = defs.find((x) => x.id === id);
  const state = charges <= 0 ? 'active' : trailing ? 'trailing' : 'ready';
  return { state, itemId: id, label: d?.name ?? id, charges: charges > 1 ? `×${charges}` : '' };
}

export function itemSlots(p: KartState, defs: readonly Def[], nowMs: number, trailing = false): { held: ItemSlotVM; next: ItemSlotVM } {
  const it = p.item;
  return {
    held: slot(it.held, it.charges, it.rouletteRemaining, defs, nowMs, trailing),
    // offset so the two slots never flicker in step
    next: slot(it.next, it.nextCharges, it.nextRouletteRemaining, defs, nowMs + UI.rouletteFlickerMs * 3),
  };
}

/**
 * The whole HUD for one frame. `shownRank` is race-manager's debounced rank (trackers[i].shownRank),
 * so the numeral never flickers; it changes on the same frame positionChange fires.
 */
export function hudModel(
  state: RaceState, player: KartState, shownRank: number, coinCap: number, m: HudMemory, clock: number,
  defs: readonly Def[], nowMs: number, trailing = false,
): HudVM {
  const rank = shownRank > 0 ? shownRank : player.rank;
  const lap = Math.min(Math.max(player.lap, 1), state.lapsTotal);
  // the countdown runs on sim ticks, so its number and the controls strip come from the sim: a pause
  // (or a hidden tab) holds them, where a wall-clock hold ran out under the pause (bug hunt 3)
  const counting = state.phase === 'countdown' && state.tick > 0;
  // steps left as of the last tick stepped (tick − 1): 3 from the first tick, 2 from STEP_TICKS on, …
  const banner = counting ? { text: `${Math.ceil((state.goTick - (state.tick - 1)) / STEP_TICKS)}`, sub: '', kind: 'countdown' as const }
    : m.banner && m.banner.until > clock ? m.banner
    : m.wrongWay && player.finishTick === undefined ? { text: 'WRONG WAY', sub: '', kind: 'wrongWay' as const, until: Infinity }
    : null;
  let knockout: HudVM['knockout'] = null;
  if (state.knockout && state.mode === 'knockout') {
    // the final has no next round: only 1st wins the Knockout, so 2nd is in danger too
    const final = state.knockout.segment >= KNOCKOUT_CUT_LINES.length - 1;
    const cut = KNOCKOUT_CUT_LINES[state.knockout.segment] ?? KNOCKOUT_CUT_LINES[KNOCKOUT_CUT_LINES.length - 1];
    knockout = final ? { text: 'WIN THE FINAL', danger: rank > 1 } : { text: `TOP ${cut} GO THROUGH`, danger: rank > cut };
  }
  const slots = itemSlots(player, defs, nowMs, trailing);
  return {
    // stops on the player's own time (the one the results show), not the race clock
    timer: player.finishTick !== undefined ? formatMs(ticksToMs(player.finishTick - state.goTick)) : formatTime(state.time),
    lap: `${lap}/${state.lapsTotal}`,
    lapFinal: lap === state.lapsTotal && state.lapsTotal > 1,
    position: ordinalParts(rank),
    flourish: m.flourishUntil > clock,
    coins: `${player.coins}`,
    coinsFull: player.coins >= coinCap,
    speed: `${mph(player.speed)}`,
    held: slots.held,
    next: slots.next,
    banner: banner ? { text: banner.text, sub: banner.sub, kind: banner.kind } : null,
    flash: m.flashUntil > clock,
    knockout,
    keysHint: counting || m.hintUntil > clock,
  };
}
