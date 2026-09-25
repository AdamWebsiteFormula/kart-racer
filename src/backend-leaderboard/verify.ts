// Server-side truth: re-simulate a submitted input log with the real game code and check the
// claimed time. No Three.js; bundled into the Edge Function and unit-tested in node.
import { AiDriver } from '../ai-driver/index.ts';
import { NEUTRAL_INPUT, type InputState } from '../kart-controller/types.ts';
import { Items } from '../items/items.ts';
import { GO_TICK, RaceManager } from '../race-manager/index.ts';
import { buildTrack } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { simTick } from '../game/simtick.ts';
import { RACE } from '../race-manager/constants.ts';
import { decodeLog, encodeLog, quantize } from './inputlog.ts';
import { soloConfig, type BoardMode } from './rules.ts';

export interface Replay { finished: boolean; timeMs: number; lapTimesMs: number[]; ticks: number }

/**
 * Run a solo leaderboard race from a decoded log, in `kartId` (absent or null: the racer's own kart,
 * as every run before 26 Sept 2026). Stops at the finish or when the log runs out.
 */
export function replay(def: TrackDefinition, mode: BoardMode, racerId: string, seed: number, log: readonly InputState[], kartId?: string | null): Replay {
  const config = soloConfig(mode, def.id, racerId, seed, kartId);
  const track = buildTrack(def);
  const manager = new RaceManager(track, config);
  const items = new Items(track, manager);
  const ai = new AiDriver(track, config, manager.state, { itemRoles: items.roles });
  const inputs = manager.state.karts.map(() => ({ ...NEUTRAL_INPUT }));
  const parts = { manager, items, ai, inputs, playerIndex: 0, playerSlot: { ...NEUTRAL_INPUT } };
  let t = 0;
  for (; t < log.length && manager.state.phase !== 'finished'; t++) simTick(parts, log[t]);
  // once the player crosses the line the race is over for a solo run; nothing after matters
  const row = manager.results().ranks[0];
  const finished = row !== undefined && !row.dnf && row.finishTick >= 0;
  return { finished, timeMs: finished ? row.timeMs : -1, lapTimesMs: finished ? row.lapTimesMs : [], ticks: t };
}

export type Verdict = { ok: true; timeMs: number; lapTimesMs: number[]; canonicalLog: string } | { ok: false; reason: string };

/**
 * How far the claim may be from the replay. The replay is the truth and is what gets stored, so
 * this never lets a cheat through. Since the sim moved to sim-math/dmath.ts (24 Sept 2026) every
 * engine and chip replays bit for bit, so an honest claim matches exactly; this is only a margin.
 */
export const CLAIM_TOLERANCE_MS = 1000;

/**
 * Decode, replay in the claimed kart, compare. The stored time is always the replay's, never the
 * claim; the same log claimed in another kart replays to another time and is refused.
 */
export function verifyRun(def: TrackDefinition, mode: BoardMode, racerId: string, seed: number, inputLog: string, claimedMs: number, kartId?: string | null): Verdict {
  let log: InputState[];
  try { log = decodeLog(inputLog); } catch (e) { return { ok: false, reason: `bad input log: ${(e as Error).message}` }; }
  const r = replay(def, mode, racerId, seed, log, kartId);
  if (!r.finished) return { ok: false, reason: 'the replay never reached the finish line' };
  if (Math.abs(r.timeMs - claimedMs) > CLAIM_TOLERANCE_MS) return { ok: false, reason: `claimed ${claimedMs} ms but the replay finished in ${r.timeMs} ms` };
  return { ok: true, timeMs: r.timeMs, lapTimesMs: r.lapTimesMs, canonicalLog: encodeLog(canonicalize(def, mode, racerId, seed, log.slice(0, r.ticks), r.timeMs, kartId)) };
}

/**
 * The run as stored: only what the sim read, so the same drive is always the same string and the
 * unique index refuses a copy with a flipped bit (red-team 2026-09-24). Every tick is quantised
 * (a throttle byte over 127 clamps to 1); the horn is cleared; in the countdown only "throttle
 * held" counts (the start boost); in Time Trial the items are inert, so item and look-back go.
 * If the cleaned log ever replays to a different time, the raw log is kept instead.
 */
export function canonicalize(def: TrackDefinition, mode: BoardMode, racerId: string, seed: number, log: readonly InputState[], timeMs: number, kartId?: string | null): InputState[] {
  const out = log.map((raw, t) => {
    const i = quantize(raw, { ...NEUTRAL_INPUT });
    i.horn = false;
    if (t <= GO_TICK) return { ...NEUTRAL_INPUT, throttle: i.throttle > RACE.stuckInputMin ? 1 : 0 };
    if (mode === 'timeTrial') { i.item = false; i.lookBack = false; }
    return i;
  });
  const again = replay(def, mode, racerId, seed, out, kartId);
  return again.finished && again.timeMs === timeMs ? out : log.map((i) => (i.horn ? { ...i, horn: false } : i));
}
