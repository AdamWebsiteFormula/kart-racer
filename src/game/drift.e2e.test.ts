// Drifting pays (ai-driver SOP, B, 24 Sept 2026). In Mario Kart World the drift is how you go fast, and
// an audit found the opposite here: the Hard AI was 2-7.5 s slower on every track with its drifts on
// (it set up wide for drifts it then declined, slid into walls and off the road, and let go at the
// edge before a tier). The same solo Time Trial the leaderboard scores (soloConfig, the real sim tick,
// items and all), run by three personalities (drift use 0.9 / 0.7 / 0.5) with their drifts on and
// with driftUse 0: on every track, drifting is no slower on average. The track's hazards are switched
// off for it: a drift gets a racer to a moving crab or cart at another moment, and whether that one
// lands a hit (±1-2 s) swamped the tenths the drifts are worth (with them on, 24 Sept 2026, the drift
// means were 1.6 s faster over the six but 0.15 s slower on Harbour, where one crab hit decided it).
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
  it('Hard with its drifts is no slower than Hard without on every track, and faster over the six', () => {
    let total = 0;
    for (const def of Object.values(FILES)) {
      const mean = (drift: boolean) => DRIVERS.reduce((s, id) => s + run(def, id, drift), 0) / DRIVERS.length;
      const on = mean(true), off = mean(false);
      expect(on, `${def.id}: drifting ${on.toFixed(2)} s, not ${off.toFixed(2)} s`).toBeLessThanOrEqual(off);
      total += on - off;
    }
    expect(total, 'seconds the drifts save over the six tracks, per racer').toBeLessThan(-1.5);
  }, 120_000);
});
