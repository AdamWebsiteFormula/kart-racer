// The race HUD as data. Events drive the transient things (banner, flash, flourish) through a
// small memory; state drives the steady readouts. Pure: the caller passes the clock.
import type { KartState } from '../kart-controller/types.ts';
import type { ItemEvent } from '../items/types.ts';
import { KNOCKOUT_CUT_LINES } from '../race-manager/constants.ts';
import { STEP_TICKS } from '../race-manager/countdown.ts';
import { ticksToMs } from '../race-manager/race.ts';
import type { RaceEvent, RaceState } from '../race-manager/types.ts';
import { UI } from './constants.ts';
import { formatMs, formatTime, mph, ordinal, ordinalParts, twoDigits } from './format.ts';
import { medalFor, type MedalTimes, type MedalWon } from './screens/menus.ts';

/** shift: the Final Lap Shift's own label, when the leader starts the last lap before the player */
/** Over the line, how to go on to the results, in the words of the last input used: the renderer draws all
 *  three and the stylesheet shows one (`data-input` keys or pad, `data-touch` on), as the other prompts do. */
export const SKIP_PROMPTS = Object.freeze({ keys: 'Press Enter for results', pad: 'Press A for results', touch: 'Tap for results' });

export type BannerKind = 'countdown' | 'go' | 'wrongWay' | 'finalLap' | 'shift' | 'finish' | 'strike';
const PRIORITY: Readonly<Record<BannerKind, number>> = { countdown: 1, go: 1, strike: 2, wrongWay: 2, finalLap: 3, shift: 3, finish: 4 };

export interface HudMemory {
  /** `skip`: the finish banner's prompt to go on to the results shows under it */
  banner: { text: string; sub: string; kind: BannerKind; until: number; skip: boolean } | null;
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

function show(m: HudMemory, kind: BannerKind, text: string, sub: string, until: number, clock: number, skip = false): void {
  const cur = m.banner && m.banner.until > clock ? m.banner : null;
  if (cur && PRIORITY[cur.kind] > PRIORITY[kind]) return;
  m.banner = { text, sub, kind, until, skip };
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
        // over the line, a press skips the wait for the field (UiRoot: Enter, pad A or a tap)
        if (e.racerId === playerId) show(m, 'finish', e.dnf ? 'TIME!' : 'FINISH!', ordinal(e.rank), Infinity, clock, !e.dnf);
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

/** The place numeral's color (ui.css `.place[data-tier]`): gold, silver and bronze for 1st to 3rd, the pack's yellow-orange behind them */
export type PositionTier = 'gold' | 'silver' | 'bronze' | 'pack';
const PODIUM_TIERS: readonly PositionTier[] = ['gold', 'silver', 'bronze'];
export const positionTier = (rank: number): PositionTier => PODIUM_TIERS[rank - 1] ?? 'pack';

/** ready: use it; active: a power running from this slot (Strike Ball); trailing: held behind the kart */
export interface ItemSlotVM { state: 'empty' | 'rolling' | 'ready' | 'active' | 'trailing'; itemId: string; label: string; charges: string }

export interface HudVM {
  timer: string;
  lap: string;
  lapFinal: boolean;
  /** Mirror mode (design §10): a MIRROR badge by the lap counter */
  mirrored: boolean;
  position: { n: string; suffix: string };
  /** the numeral's color by place: it changes with the numeral, on the frame the flourish starts */
  positionTier: PositionTier;
  flourish: boolean;
  /** two digits (05), as the coin pill shows them */
  coins: string;
  coinsFull: boolean;
  speed: string;
  held: ItemSlotVM;
  next: ItemSlotVM;
  /** `skip`: show the prompt to go on to the results (SKIP_PROMPTS) */
  banner: { text: string; sub: string; kind: BannerKind; skip: boolean } | null;
  flash: boolean;
  knockout: { text: string; danger: boolean } | null;
  /** show the controls strip */
  keysHint: boolean;
  /** show the item slots (Time Trial has no items) */
  items: boolean;
  /** a solo run (Time Trial, Daily): nobody to be placed against, so no place numeral; the lap splits instead */
  solo: boolean;
  /** a solo run: each lap finished so far and its time, the fastest marked once there are two */
  splits: readonly LapSplit[];
  /** a Time Trial over the line: the medal its time won (its badge under FINISH!), or null */
  medal: MedalWon | null;
}

export interface LapSplit { lap: number; time: string; best: boolean }
const NO_SPLITS: readonly LapSplit[] = Object.freeze([]);

/** The player's finished laps as splits (`lapTicks`: the tick of each line crossing after the start). */
export function lapSplits(lapTicks: readonly number[], goTick: number): readonly LapSplit[] {
  if (!lapTicks.length) return NO_SPLITS;
  const ms = lapTicks.map((t, k) => ticksToMs(t - (k === 0 ? goTick : lapTicks[k - 1])));
  const best = ms.length > 1 ? ms.indexOf(Math.min(...ms)) : -1;
  return ms.map((m, k) => ({ lap: k + 1, time: formatMs(m), best: k === best }));
}

type Def = { id: string; name: string };

/** Items whose charges are not more of the item: a Pogo Spring's second charge is its slam (items/use.ts), so no ×2 */
const ONE_OF: ReadonlySet<string> = new Set(['pogoSpring']);

function slot(id: string, charges: number, roulette: number, defs: readonly Def[], nowMs: number, trailing = false): ItemSlotVM {
  if (roulette > 0) {
    const d = defs[Math.floor(nowMs / UI.rouletteFlickerMs) % Math.max(1, defs.length)];
    return { state: 'rolling', itemId: d?.id ?? '', label: d?.name ?? '?', charges: '' };
  }
  if (id === 'none' || !id) return { state: 'empty', itemId: '', label: '', charges: '' };
  const d = defs.find((x) => x.id === id);
  const state = charges <= 0 ? 'active' : trailing ? 'trailing' : 'ready';
  return { state, itemId: id, label: d?.name ?? id, charges: charges > 1 && !ONE_OF.has(id) ? `×${charges}` : '' };
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
 * so the numeral never flickers; it changes on the same frame positionChange fires. `medalTimes`: a
 * Time Trial's track's, for the medal its finish wins.
 */
export function hudModel(
  state: RaceState, player: KartState, shownRank: number, coinCap: number, m: HudMemory, clock: number,
  defs: readonly Def[], nowMs: number, trailing = false, medalTimes?: MedalTimes,
): HudVM {
  const rank = shownRank > 0 ? shownRank : player.rank;
  const lap = Math.min(Math.max(player.lap, 1), state.lapsTotal);
  // the countdown runs on sim ticks, so its number and the controls strip come from the sim: a pause
  // (or a hidden tab) holds them, where a wall-clock hold ran out under the pause (bug hunt 3)
  const counting = state.phase === 'countdown' && state.tick > 0;
  // steps left as of the last tick stepped (tick − 1): 3 from the first tick, 2 from STEP_TICKS on, …
  const banner = counting ? { text: `${Math.ceil((state.goTick - (state.tick - 1)) / STEP_TICKS)}`, sub: '', kind: 'countdown' as const, skip: false }
    : m.banner && m.banner.until > clock ? m.banner
    : m.wrongWay && player.finishTick === undefined ? { text: 'WRONG WAY', sub: '', kind: 'wrongWay' as const, until: Infinity, skip: false }
    : null;
  let knockout: HudVM['knockout'] = null;
  if (state.knockout && state.mode === 'knockout') {
    // the final has no next round: only 1st wins the Knockout, so 2nd is in danger too
    const final = state.knockout.segment >= KNOCKOUT_CUT_LINES.length - 1;
    const cut = KNOCKOUT_CUT_LINES[state.knockout.segment] ?? KNOCKOUT_CUT_LINES[KNOCKOUT_CUT_LINES.length - 1];
    knockout = final ? { text: 'WIN THE FINAL', danger: rank > 1 } : { text: `TOP ${cut} GO THROUGH`, danger: rank > cut };
  }
  const slots = itemSlots(player, defs, nowMs, trailing);
  // a solo run: one racer (a Time Trial's ghost is no racer)
  let racers = 0;
  for (const k of state.karts ?? []) if (!k.isGhost) racers++;
  const solo = racers === 1;
  const won = state.mode === 'timeTrial' && medalTimes && player.finishTick !== undefined && banner?.kind === 'finish' && banner.skip
    ? medalFor(ticksToMs(player.finishTick - state.goTick), medalTimes) : 'none';
  return {
    // stops on the player's own time (the one the results show), not the race clock
    timer: player.finishTick !== undefined ? formatMs(ticksToMs(player.finishTick - state.goTick)) : formatTime(state.time),
    lap: `${lap}/${state.lapsTotal}`,
    lapFinal: lap === state.lapsTotal && state.lapsTotal > 1,
    mirrored: state.mirrored === true,
    position: ordinalParts(rank),
    positionTier: positionTier(rank),
    flourish: m.flourishUntil > clock,
    coins: twoDigits(player.coins),
    coinsFull: player.coins >= coinCap,
    speed: `${mph(player.speed)}`,
    held: slots.held,
    next: slots.next,
    // a solo run's finish names no place ("1st" of one), as its HUD and results show none
    banner: banner ? { text: banner.text, sub: banner.kind === 'finish' && solo ? '' : banner.sub, kind: banner.kind, skip: banner.skip } : null,
    flash: m.flashUntil > clock,
    knockout,
    keysHint: counting || m.hintUntil > clock,
    items: state.mode !== 'timeTrial',
    solo,
    splits: solo ? lapSplits(state.trackers?.[state.karts.indexOf(player)]?.lapTicks ?? [], state.goTick) : NO_SPLITS,
    medal: won === 'none' ? null : won,
  };
}
