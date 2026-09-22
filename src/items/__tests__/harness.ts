// Headless harness: RaceManager + Items on the race-manager OVAL, the game-loop order.
import { SIM_DT } from '../../kart-controller/step.ts';
import { NEUTRAL_INPUT, type InputState, type KartState } from '../../kart-controller/types.ts';
import { GO_TICK } from '../../race-manager/countdown.ts';
import { RaceManager } from '../../race-manager/race.ts';
import type { RaceEvent, RaceMode } from '../../race-manager/types.ts';
import { OVAL, placeAt } from '../../race-manager/__tests__/fixtures.ts';
import { buildTrack, type Track } from '../../track-builder/track.ts';
import { ITEMS_CONFIG, itemById } from '../data.ts';
import { Items } from '../items.ts';
import type { ItemEvent, ItemsConfig } from '../types.ts';

export { placeAt };

export interface H {
  track: Track;
  rm: RaceManager;
  items: Items;
  inputs: InputState[];
  /** every items event so far */
  log: ItemEvent[];
  /** every race event so far */
  race: RaceEvent[];
}

export interface SetupOptions { n?: number; mode?: RaceMode; cc?: 50 | 100 | 150; seed?: number; cfg?: ItemsConfig; laps?: number; knockoutEliminated?: string[] }

export function setup(o: SetupOptions = {}): H {
  const n = o.n ?? 2;
  const track = buildTrack(OVAL);
  const racers = Array.from({ length: n }, (_, i) => ({ racerId: `k${i}`, archetype: 'medium' as const, isPlayer: i === 0 }));
  const rm = new RaceManager(track, {
    mode: o.mode ?? 'quick', trackId: 'oval', speedClass: o.cc ?? 150, seed: o.seed ?? 1, racers, laps: o.laps,
    knockout: o.mode === 'knockout' ? { setId: 'k', segment: 0, cutLine: 6, eliminated: o.knockoutEliminated ?? [] } : undefined,
  });
  const items = new Items(track, rm, o.cfg ?? ITEMS_CONFIG);
  const inputs = rm.state.karts.map(() => ({ ...NEUTRAL_INPUT }));
  return { track, rm, items, inputs, log: [], race: [] };
}

/** One tick in game-loop order. Returns this tick's item events. */
export function tick(h: H, n = 1): ItemEvent[] {
  let last: ItemEvent[] = [];
  for (let i = 0; i < n; i++) {
    const ev = h.rm.step(h.inputs);
    h.race.push(...ev);
    last = h.items.step(h.inputs, ev, SIM_DT);
    h.log.push(...last);
  }
  return last;
}

/** Run the countdown out so the race is on. */
export function go(h: H): void {
  tick(h, GO_TICK + 1);
  if (h.rm.state.phase !== 'racing' && h.rm.state.phase !== 'finalLap') throw new Error(`phase ${h.rm.state.phase} after go`);
}

export function seconds(s: number): number { return Math.round(s / SIM_DT); }

export function give(h: H, i: number, id: string): void {
  const s = h.rm.state.karts[i];
  s.item.held = id;
  s.item.charges = itemById(h.items.cfg, id)?.behaviour.charges ?? 1;
  s.item.rouletteRemaining = 0;
}

/** Press the item button on kart i for one tick, then release it for one tick. Returns the press tick's events. */
export function press(h: H, i: number, lookBack = false): ItemEvent[] {
  h.inputs[i] = { ...h.inputs[i], item: true, lookBack };
  const ev = tick(h);
  h.inputs[i] = { ...h.inputs[i], item: false, lookBack: false };
  tick(h);
  return ev;
}

/** Stand kart i on a track feature (a balloon or coin) so the next tick pops it. */
export function toFeature(h: H, i: number, kind: 'pickup' | 'coin', nth = 0): void {
  const idx = h.track.features.map((f, k) => (f.kind === kind ? k : -1)).filter((k) => k >= 0)[nth];
  const f = h.track.features[idx];
  const s = h.rm.state.karts[i];
  placeAt(h.track, s, f.t, f.lateral);
  s.position = [...f.position];
}

export function kart(h: H, i: number): KartState { return h.rm.state.karts[i]; }

export function count(events: readonly ItemEvent[], type: ItemEvent['type']): number {
  let n = 0;
  for (const e of events) if (e.type === type) n++;
  return n;
}

/** A config clone with one item's behaviour patched. */
export function withBehaviour(id: string, patch: Record<string, unknown>): ItemsConfig {
  const cfg = structuredClone(ITEMS_CONFIG) as ItemsConfig;
  const d = cfg.items.find((x) => x.id === id);
  if (!d) throw new Error(id);
  Object.assign(d.behaviour, patch);
  return cfg;
}
