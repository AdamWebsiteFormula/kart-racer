// Time Trial medals against real runs: the exact solo race the leaderboard scores (soloConfig), the
// same sim tick the game runs, the AI at the wheel. The thresholds dated from each track's first
// commit and every run took gold with 20-45 s to spare; they are now set from these runs: gold about
// 6 % over the fastest class's AI time (the mean of its racers), silver 15 %, bronze 30 %. Since the
// classes race level (game/balance.e2e.test.ts), every racer's AI earns gold. Re-measure them when
// the physics, the AI or a track changes and this fails.
import { describe, expect, it } from 'vitest';
import { AiDriver } from '../ai-driver/index.ts';
import { soloConfig } from '../backend-leaderboard/rules.ts';
import { Items } from '../items/items.ts';
import { SIM_HZ } from '../kart-controller/step.ts';
import { NEUTRAL_INPUT } from '../kart-controller/types.ts';
import { RaceManager } from '../race-manager/index.ts';
import { buildTrack } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { CAST } from '../ui-hud/data/cast.ts';
import { medalFor } from '../ui-hud/ui.ts';
import { simTick, type SimParts } from './simtick.ts';

const FILES = import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' }) as Record<string, TrackDefinition>;

/** One Time Trial with the AI driving the player; its time in ms. */
function run(def: TrackDefinition, racerId: string): number {
  const config = soloConfig('timeTrial', def.id, racerId, 0);
  const track = buildTrack(def);
  const manager = new RaceManager(track, config);
  const items = new Items(track, manager);
  const ai = new AiDriver(track, config, manager.state, { itemRoles: items.roles });
  ai.drivePlayer = true;
  const inputs = manager.state.karts.map(() => ({ ...NEUTRAL_INPUT }));
  const parts: SimParts = { manager, items, ai, inputs, playerIndex: manager.playerIndex, playerSlot: { ...NEUTRAL_INPUT } };
  for (let t = 0; t < 300 * SIM_HZ && manager.state.phase !== 'finished'; t++) simTick(parts, null);
  const row = manager.results().ranks[0];
  expect(row.dnf, `${def.id} ${racerId} finishes`).toBe(false);
  return row.timeMs;
}

describe('Time Trial medals', () => {
  for (const def of Object.values(FILES)) {
    it(`${def.id}: gold takes the AI's line in every class, with little to spare`, () => {
      const m = def.medalTimesMs;
      expect(m.gold).toBeLessThan(m.silver);
      expect(m.silver).toBeLessThan(m.bronze);
      const times = Object.fromEntries(CAST.map((c) => [c.id, run(def, c.id)]));
      // gold: every racer's AI run earns it, light, medium or heavy
      for (const [id, t] of Object.entries(times)) expect(medalFor(t, m), `${def.id} ${id} ${t} ms`).toBe('gold');
      // and not a free medal: the fastest run is within 10 % of it
      expect(Math.min(...Object.values(times)), `${def.id} ${JSON.stringify(times)}`).toBeGreaterThan(m.gold * 0.9);
    });
  }
});
