// Time Trial medals against real runs: the exact solo race the leaderboard scores (soloConfig), the
// same sim tick the game runs, the AI at the wheel. The thresholds dated from each track's first
// commit and every run took gold with 20-45 s to spare; they are now set from these runs (gold
// about 7 % over the heavy AI's time, silver 15 %, bronze 30 %), so re-measure them when the
// physics, the AI or a track changes and this fails.
import { describe, expect, it } from 'vitest';
import { AiDriver } from '../ai-driver/index.ts';
import { soloConfig } from '../backend-leaderboard/rules.ts';
import { Items } from '../items/items.ts';
import { SIM_HZ } from '../kart-controller/step.ts';
import { NEUTRAL_INPUT } from '../kart-controller/types.ts';
import { RaceManager } from '../race-manager/index.ts';
import { buildTrack } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
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
    it(`${def.id}: gold takes the heavy AI's line, a light racer on it is short of gold, and every medal is in reach`, () => {
      const m = def.medalTimesMs;
      expect(m.gold).toBeLessThan(m.silver);
      expect(m.silver).toBeLessThan(m.bronze);
      const heavy = run(def, 'boulder'), light = run(def, 'pip');
      // gold: the AI's best run earns it, with little to spare (not a free medal)
      expect(medalFor(heavy, m)).toBe('gold');
      expect(heavy).toBeGreaterThan(m.gold * 0.9);
      // the same line in a light kart falls short of gold, but still earns a medal
      expect(medalFor(light, m)).not.toBe('gold');
      expect(medalFor(light, m)).not.toBe('none');
    });
  }
});
