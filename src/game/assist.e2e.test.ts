// The driving assists over whole races, as main.ts runs them: on the sampled input, before the shared
// sim tick (game/simtick.ts) quantizes and logs it. A player who never steers finishes Harbor Loop with
// Steering assist on, the claw never fetching them and hardly off the road; and the race's own log,
// replayed with no assist at all (as the leaderboard server does, backend-leaderboard/verify.ts), is
// the same race bit for bit. Auto-accelerate leaves the countdown, and so the start boost, to the player.
import { describe, expect, it } from 'vitest';
import { AiDriver } from '../ai-driver/index.ts';
import { encodeLog } from '../backend-leaderboard/inputlog.ts';
import { soloConfig } from '../backend-leaderboard/rules.ts';
import { verifyRun } from '../backend-leaderboard/verify.ts';
import { Items } from '../items/items.ts';
import { makeConstants } from '../kart-controller/constants.ts';
import { lateralOffset } from '../kart-controller/ground.ts';
import { SIM_DT, SIM_HZ } from '../kart-controller/step.ts';
import { NEUTRAL_INPUT, type InputState } from '../kart-controller/types.ts';
import { GO_TICK, RaceManager } from '../race-manager/index.ts';
import { BUILDER } from '../track-builder/constants.ts';
import { buildTrack } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { CAST } from '../ui-hud/data/cast.ts';
import { DriveAssist, type AssistSettings } from './assist.ts';
import { simTick, type SimParts } from './simtick.ts';

const FILES = import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' }) as Record<string, TrackDefinition>;
const TRACKS = Object.fromEntries(Object.values(FILES).map((d) => [d.id, d]));

function race(trackId: string, racerId: string) {
  const def = TRACKS[trackId];
  const config = soloConfig('timeTrial', trackId, racerId, 0);
  const track = buildTrack(def);
  const manager = new RaceManager(track, config);
  const items = new Items(track, manager);
  const ai = new AiDriver(track, config, manager.state, { itemRoles: items.roles });
  const inputs = manager.state.karts.map(() => ({ ...NEUTRAL_INPUT }));
  const parts: SimParts = { manager, items, ai, inputs, playerIndex: 0, playerSlot: { ...NEUTRAL_INPUT } };
  return { def, track, manager, parts, kart: manager.state.karts[0] };
}

interface Drive {
  finished: boolean; timeMs: number; finishTick: number; log: InputState[]; claws: number; startBoost: boolean;
  /** seconds off the road (past the curb), in all and in one stretch, over the first lap and the race */
  lap1Off: number; lap1Longest: number; off: number; ticks: number;
  final: string;
}

/**
 * A Time Trial on `trackId` where the player's hands do `raw(tick)` and the assists in `set` go on top,
 * exactly as main.ts puts them: on the input before simTick. Measured from the sim's own state.
 */
function drive(trackId: string, set: AssistSettings, raw: (tick: number) => InputState, racerId = 'juniper'): Drive {
  const r = race(trackId, racerId);
  const { manager, parts, track, kart } = r;
  const assist = new DriveAssist(track, makeConstants(CAST.find((c) => c.id === racerId)!.archetype, 150));
  let claws = 0, startBoost = false, run = 0, off = 0, lap1Off = 0, lap1Longest = 0, ticks = 0;
  while (manager.state.phase !== 'finished' && manager.state.tick < 300 * SIM_HZ) {
    const input = assist.apply(raw(manager.state.tick), kart, manager.state.phase, set, SIM_DT);
    const ev = simTick(parts, input);
    for (const e of ev.race) {
      if (e.type === 'rescue' && e.phase === 'start') claws++;
      if (e.type === 'kart' && e.event.type === 'boostStart' && e.event.source === 'start') startBoost = true;
    }
    if (manager.state.phase === 'countdown' || kart.finishTick !== undefined) continue;
    ticks++;
    const lat = lateralOffset(track, kart.t, kart.position, kart.branch).lateral;
    const isOff = Math.abs(lat) > track.sample(kart.t, 0, kart.branch).halfWidth + BUILDER.kerbWidth;
    run = isOff ? run + 1 : 0;
    if (isOff) off++;
    if (manager.state.trackers[0].lapTicks.length === 0) {
      if (isOff) lap1Off++;
      lap1Longest = Math.max(lap1Longest, run);
    }
  }
  const row = manager.results().ranks[0];
  return {
    finished: !row.dnf, timeMs: row.timeMs, finishTick: kart.finishTick ?? -1, log: manager.state.inputLog, claws, startBoost,
    lap1Off: lap1Off / SIM_HZ, lap1Longest: lap1Longest / SIM_HZ, off: off / SIM_HZ, ticks: ticks / SIM_HZ,
    final: JSON.stringify([kart.position, kart.heading, kart.speed, kart.t, kart.lap, manager.state.trackers[0].lapTicks]),
  };
}

/** The same race from its log alone, no assist: the leaderboard server's replay loop. */
function replay(trackId: string, log: readonly InputState[], racerId = 'juniper'): { finishTick: number; final: string } {
  const { manager, parts, kart } = race(trackId, racerId);
  for (let t = 0; t < log.length && manager.state.phase !== 'finished'; t++) simTick(parts, log[t]);
  return { finishTick: kart.finishTick ?? -1, final: JSON.stringify([kart.position, kart.heading, kart.speed, kart.t, kart.lap, manager.state.trackers[0].lapTicks]) };
}

const straight = () => ({ ...NEUTRAL_INPUT, throttle: 1 });
const STEER: AssistSettings = { autoAccelerate: false, steeringAssist: true };

describe('Steering assist over a race', () => {
  it('Harbor Loop driven dead straight: every lap without the claw and hardly off the road, where without it the kart lives on the sand', () => {
    const on = drive('harbour-loop', STEER, straight);
    expect(on.finished).toBe(true);
    expect(on.claws).toBe(0);
    // the first lap: under a second and a half on the sand, never a second and a quarter at a time (turn 1 is
    // tighter than the full lock at top speed: a new player runs wide there, then is brought back)
    expect(on.lap1Off).toBeLessThan(1.5);
    expect(on.lap1Longest).toBeLessThan(1.25);
    expect(on.off / on.ticks).toBeLessThan(0.03);
    // the same hands with the assist off: off the road most of the race
    const off = drive('harbour-loop', { autoAccelerate: false, steeringAssist: false }, straight);
    expect(off.off / off.ticks).toBeGreaterThan(0.5);
  });

  it('the race\'s log, replayed with no assist, is the same race bit for bit, and the leaderboard takes it at its time', () => {
    const on = drive('harbour-loop', STEER, straight);
    const again = replay('harbour-loop', on.log);
    expect(again.finishTick).toBe(on.finishTick);
    expect(again.final).toBe(on.final);
    const v = verifyRun(TRACKS['harbour-loop'], 'timeTrial', 'juniper', 0, encodeLog(on.log), on.timeMs);
    expect(v).toMatchObject({ ok: true, timeMs: on.timeMs });
  });

  it('on every track, a player who never steers finishes without the claw ever fetching them', () => {
    for (const id of Object.keys(TRACKS)) {
      const r = drive(id, STEER, straight);
      expect(r.finished, id).toBe(true);
      expect(r.claws, id).toBe(0);
    }
  });
});

describe('Auto-accelerate over a race', () => {
  const both: AssistSettings = { autoAccelerate: true, steeringAssist: true };

  it('hands on nothing at all: no gas in the countdown (so no start boost), the gas down from GO, and home without the claw', () => {
    const r = drive('harbour-loop', both, () => ({ ...NEUTRAL_INPUT }));
    expect(r.log.slice(0, GO_TICK + 1).every((i) => i.throttle === 0)).toBe(true);
    expect(r.log[GO_TICK + 1].throttle).toBe(1);
    expect(r.startBoost).toBe(false);
    expect(r.finished).toBe(true);
    expect(r.claws).toBe(0);
    expect(replay('harbour-loop', r.log).final).toBe(r.final);
  });

  it('the start boost stays the player\'s to earn: the gas pressed as the 2 appears still earns it', () => {
    const press = GO_TICK - Math.round(makeConstants('medium', 150).startBoostCentreSeconds * SIM_HZ);
    const r = drive('harbour-loop', both, (t) => ({ ...NEUTRAL_INPUT, throttle: t >= press ? 1 : 0 }));
    expect(r.startBoost).toBe(true);
    expect(r.finished).toBe(true);
  });
});
