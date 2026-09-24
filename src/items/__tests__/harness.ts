// Headless harness: RaceManager + Items on the race-manager OVAL, the game-loop order.
import { SIM_DT } from '../../kart-controller/step.ts';
import { NEUTRAL_INPUT, type InputState, type KartState } from '../../kart-controller/types.ts';
import { GO_TICK } from '../../race-manager/countdown.ts';
import { RaceManager } from '../../race-manager/race.ts';
import type { RaceEvent, RaceMode } from '../../race-manager/types.ts';
import { OVAL, placeAt } from '../../race-manager/__tests__/fixtures.ts';
import { buildTrack, type Track } from '../../track-builder/track.ts';
import type { TrackDefinition } from '../../track-builder/types.ts';
import boardwalkJson from '../../track-builder/tracks/boardwalk-nights.json';
import canyonJson from '../../track-builder/tracks/canyon-rush.json';
import frostbiteJson from '../../track-builder/tracks/frostbite-pass.json';
import harbourJson from '../../track-builder/tracks/harbour-loop.json';
import meadowJson from '../../track-builder/tracks/meadow-run.json';
import skylineJson from '../../track-builder/tracks/skyline-circuit.json';
import { ITEMS_CONFIG, itemById } from '../data.ts';
import { Items } from '../items.ts';
import type { ItemEvent, ItemsConfig } from '../types.ts';

export { placeAt };

const TRACK_JSON = {
  boardwalk: boardwalkJson, canyon: canyonJson, frostbite: frostbiteJson,
  harbour: harbourJson, meadow: meadowJson, skyline: skylineJson,
} as const;
export type RealTrack = keyof typeof TRACK_JSON;
/** The six tracks; each has one shortcut, branch 1. */
export const REAL_TRACKS = Object.keys(TRACK_JSON) as RealTrack[];

/** A fresh copy of a real track's definition (a build or a shift never touches the JSON). */
export function trackDef(id: RealTrack): TrackDefinition {
  return JSON.parse(JSON.stringify(TRACK_JSON[id])) as TrackDefinition;
}

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

export interface SetupOptions { n?: number; mode?: RaceMode; cc?: 50 | 100 | 150; seed?: number; cfg?: ItemsConfig; laps?: number; knockoutEliminated?: string[]; def?: TrackDefinition }

export function setup(o: SetupOptions = {}): H {
  const n = o.n ?? 2;
  const track = buildTrack(o.def ?? OVAL);
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

export function give(h: H, i: number, id: string, slot: 0 | 1 = 0): void {
  const s = h.rm.state.karts[i];
  const charges = itemById(h.items.cfg, id)?.behaviour.charges ?? 1;
  if (slot === 0) { s.item.held = id; s.item.charges = charges; s.item.rouletteRemaining = 0; }
  else { s.item.next = id; s.item.nextCharges = charges; s.item.nextRouletteRemaining = 0; }
}

/**
 * Tap the item button on kart i: one tick down, one tick up, holding look-back through both like
 * a thumb would (a trailable item is used on the up tick). Returns both ticks' events.
 */
export function press(h: H, i: number, lookBack = false): ItemEvent[] {
  h.inputs[i] = { ...h.inputs[i], item: true, lookBack };
  const down = tick(h);
  h.inputs[i] = { ...h.inputs[i], item: false, lookBack };
  const up = tick(h);
  h.inputs[i] = { ...h.inputs[i], lookBack: false };
  return [...down, ...up];
}

/** Hold the item button on kart i for `n` ticks (a trailable item trails); release with `let go`. */
export function hold(h: H, i: number, n: number): ItemEvent[] {
  h.inputs[i] = { ...h.inputs[i], item: true };
  const out: ItemEvent[] = [];
  for (let k = 0; k < n; k++) out.push(...tick(h));
  return out;
}

/** Let go of a held item button on kart i (one tick). */
export function letGo(h: H, i: number, lookBack = false): ItemEvent[] {
  h.inputs[i] = { ...h.inputs[i], item: false, lookBack };
  const ev = tick(h);
  h.inputs[i] = { ...h.inputs[i], lookBack: false };
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

/** Stand kart i on a shortcut (branch index) at its local u, facing along it. */
export function placeOn(h: H, i: number, branch: number, u: number, lateral = 0): void {
  const t = h.track.branches.list[branch].toMain(u);
  const p = h.track.sample(t, lateral, branch);
  const s = h.rm.state.karts[i];
  s.position = [...p.position];
  s.heading = Math.atan2(p.tangent[0], p.tangent[2]);
  s.t = t;
  s.branch = branch;
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
