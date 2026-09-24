// Drifting pays, Mario Kart World style (Adam, 24 Sept 2026: "drifting is THE core skill"). Two gates,
// every track, 150cc, 3 laps, the track's hazards off (where a crab or a cart happens to be when a racer
// arrives decided a track by ±1-2 s and swamped the drift):
// 1. A scripted near-perfect drifter (game/__tests__/scripted.ts: the same minimum-curvature line as a
//    scripted grip driver, a drift through every bend, chained through the long ones) beats the grip
//    driver by at least 3 s, and reaches purple on every track. Measured 24 Sept 2026: Boardwalk 6.3 s,
//    Canyon 3.8, Frostbite 7.5, Harbour 3.9, Meadow 5.6, Skyline 7.7 (before the rework: 0.4-3.6 s, and
//    the drifts ran onto the inside edge at tier 1 on the gentle bends).
// 2. The Hard AI (pip, juniper, gus: the exact solo race the leaderboard scores, soloConfig, the real sim
//    tick, items and all) is at least 2 s a race faster with its drifts than with driftUse 0, on every
//    track (their mean). Measured 24 Sept 2026: Boardwalk 4.0, Canyon 4.1, Frostbite 7.0, Harbour 4.1,
//    Meadow 2.8, Skyline 2.4 (before: 0.0-1.2 s).
import { describe, expect, it } from 'vitest';
import { AiDriver } from '../ai-driver/index.ts';
import { PERSONALITIES } from '../ai-driver/personalities.ts';
import { soloConfig } from '../backend-leaderboard/rules.ts';
import { Items } from '../items/items.ts';
import { SIM_HZ } from '../kart-controller/step.ts';
import { NEUTRAL_INPUT } from '../kart-controller/types.ts';
import { RaceManager } from '../race-manager/index.ts';
import { buildTrack } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { runScripted } from './__tests__/scripted.ts';
import { simTick, type SimParts } from './simtick.ts';

const FILES = import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' }) as Record<string, TrackDefinition>;
const DRIVERS = ['pip', 'juniper', 'gus'];

/** A 150cc (Hard) Time Trial with the AI at the wheel and the hazards off; its time in s. `drift` false: the racer's driftUse is 0. */
function run(def: TrackDefinition, racerId: string, drift: boolean): number {
  const config = soloConfig('timeTrial', def.id, racerId, 0);
  const track = buildTrack(def);
  for (const id of track.hazards.ids) track.hazards.setEnabled(id, false);
  const manager = new RaceManager(track, config);
  const items = new Items(track, manager);
  const personalities = drift ? undefined : { [racerId]: { ...PERSONALITIES[racerId], driftUse: 0 } };
  const ai = new AiDriver(track, config, manager.state, { itemRoles: items.roles, personalities });
  ai.drivePlayer = true;
  const inputs = manager.state.karts.map(() => ({ ...NEUTRAL_INPUT }));
  const parts: SimParts = { manager, items, ai, inputs, playerIndex: manager.playerIndex, playerSlot: { ...NEUTRAL_INPUT } };
  for (let t = 0; t < 300 * SIM_HZ && manager.state.phase !== 'finished'; t++) simTick(parts, null);
  const row = manager.results().ranks[0];
  expect(row.dnf, `${def.id} ${racerId} finishes`).toBe(false);
  return row.timeMs / 1000;
}

describe('drifting pays', () => {
  it('a scripted near-perfect drifter beats the scripted grip driver by 3 s or more on every track, with purple on each', () => {
    for (const def of Object.values(FILES)) {
      const grip = runScripted(def, 'juniper', false);
      const drift = runScripted(def, 'juniper', true);
      expect(grip.time - drift.time, `${def.id}: drifting ${drift.time.toFixed(2)} s, gripping ${grip.time.toFixed(2)} s`).toBeGreaterThanOrEqual(3);
      expect(Math.max(...drift.tiers.flat()), `${def.id} top tier`).toBe(3);
    }
  }, 120_000);

  it('the Hard AI is 2 s or more a race faster with its drifts than without, on every track', () => {
    for (const def of Object.values(FILES)) {
      const mean = (drift: boolean) => DRIVERS.reduce((s, id) => s + run(def, id, drift), 0) / DRIVERS.length;
      const on = mean(true), off = mean(false);
      expect(off - on, `${def.id}: drifting ${on.toFixed(2)} s, not ${off.toFixed(2)} s`).toBeGreaterThanOrEqual(2);
    }
  }, 120_000);
});
