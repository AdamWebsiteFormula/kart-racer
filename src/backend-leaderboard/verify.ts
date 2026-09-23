// Server-side truth: re-simulate a submitted input log with the real game code and check the
// claimed time. No Three.js; bundled into the Edge Function and unit-tested in node.
import { AiDriver } from '../ai-driver/index.ts';
import { NEUTRAL_INPUT, type InputState } from '../kart-controller/types.ts';
import { Items } from '../items/items.ts';
import { RaceManager } from '../race-manager/index.ts';
import { buildTrack } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { simTick } from '../game/simtick.ts';
import { decodeLog, encodeLog } from './inputlog.ts';
import { soloConfig, type BoardMode } from './rules.ts';

export interface Replay { finished: boolean; timeMs: number; lapTimesMs: number[]; ticks: number }

/** Run a solo leaderboard race from a decoded log. Stops at the finish or when the log runs out. */
export function replay(def: TrackDefinition, mode: BoardMode, racerId: string, seed: number, log: readonly InputState[]): Replay {
  const config = soloConfig(mode, def.id, racerId, seed);
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
 * this never lets a cheat through; it only absorbs last-bit maths differences between browser
 * engines (Safari, Firefox) and the server's V8 that could move an honest finish by a tick or two.
 */
export const CLAIM_TOLERANCE_MS = 1000;

/** Decode, replay, compare. The stored time is always the replay's, never the claim. */
export function verifyRun(def: TrackDefinition, mode: BoardMode, racerId: string, seed: number, inputLog: string, claimedMs: number): Verdict {
  let log: InputState[];
  try { log = decodeLog(inputLog); } catch (e) { return { ok: false, reason: `bad input log: ${(e as Error).message}` }; }
  const r = replay(def, mode, racerId, seed, log);
  if (!r.finished) return { ok: false, reason: 'the replay never reached the finish line' };
  if (Math.abs(r.timeMs - claimedMs) > CLAIM_TOLERANCE_MS) return { ok: false, reason: `claimed ${claimedMs} ms but the replay finished in ${r.timeMs} ms` };
  // the run as stored: cut at the finish and the horn cleared (the one button the sim never
  // reads), so the same drive is always the same string and a copy cannot be posted twice
  const canonical = log.slice(0, r.ticks).map((i) => (i.horn ? { ...i, horn: false } : i));
  return { ok: true, timeMs: r.timeMs, lapTimesMs: r.lapTimesMs, canonicalLog: encodeLog(canonical) };
}
