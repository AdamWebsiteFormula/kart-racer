// A whole Knockout, end to end (CLAUDE.md definition of done): the same series calls main.ts makes
// and the same sim tick the game runs, three real races per set with the AI driving all eight
// karts, until one racer is left standing. All eight are AI because a race waits for its player
// (it ends when everyone finishes, or 12 s after the player does); the player's menu flow through
// a Knockout is covered in ui-hud/app.test.ts.
import { describe, expect, it } from 'vitest';
import { AiDriver } from '../ai-driver/index.ts';
import { Items } from '../items/items.ts';
import { SIM_HZ } from '../kart-controller/step.ts';
import { NEUTRAL_INPUT } from '../kart-controller/types.ts';
import { RaceManager } from '../race-manager/index.ts';
import { applyResults, createKnockout, isDone, knockoutWinner, nextRace } from '../race-manager/series.ts';
import type { RaceConfig, RaceResults, RacerConfig } from '../race-manager/types.ts';
import { buildTrack } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { CAST } from '../ui-hud/data/cast.ts';
import { KNOCKOUT_SETS } from '../ui-hud/data/catalog.ts';
import { simTick, type SimParts } from './simtick.ts';

const FILES = import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' }) as Record<string, TrackDefinition>;
const TRACKS = new Map(Object.values(FILES).map((d) => [d.id, d]));
const MAX_SECONDS = 300;

/** main.ts roster(null): the whole cast, nobody at the wheel. */
const roster = (): RacerConfig[] => CAST.map((c) => ({ racerId: c.id, archetype: c.archetype, isPlayer: false }));

/** One race as RaceSession runs it, minus the drawing. */
function run(config: RaceConfig): RaceResults {
  const track = buildTrack(TRACKS.get(config.trackId)!);
  const manager = new RaceManager(track, config);
  const items = new Items(track, manager);
  const ai = new AiDriver(track, config, manager.state, { itemRoles: items.roles });
  const inputs = manager.state.karts.map(() => ({ ...NEUTRAL_INPUT }));
  const parts: SimParts = { manager, items, ai, inputs, playerIndex: -1, playerSlot: { ...NEUTRAL_INPUT } };
  for (let t = 0; t < MAX_SECONDS * SIM_HZ && manager.state.phase !== 'finished'; t++) simTick(parts, null);
  expect(manager.state.phase, `${config.trackId} finished`).toBe('finished');
  return manager.results();
}

describe('Knockout, end to end', () => {
  for (const set of KNOCKOUT_SETS) {
    it(`${set.name}: three real races cut the field 8 → 6 → 4 and crown one winner`, () => {
      const series = createKnockout({ id: set.id, trackIds: set.trackIds }, roster(), 150, 4242);
      const fields: number[] = [];
      const raced = new Set<string>();
      for (let config = nextRace(series); config; config = nextRace(series)) {
        expect(config.mode).toBe('knockout');
        fields.push(config.racers.length);
        const results = run(config);
        expect(results.ranks).toHaveLength(config.racers.length);
        expect(results.ranks.every((r) => !r.dnf), `${config.trackId}: everyone finishes`).toBe(true);
        for (const r of config.racers) raced.add(r.racerId);
        applyResults(series, results);
      }
      expect(isDone(series)).toBe(true);
      expect(fields).toEqual([8, 6, 4]);
      expect(new Set(series.eliminated).size).toBe(series.eliminated.length);
      const winner = knockoutWinner(series);
      expect(winner).toBeDefined();
      expect(series.eliminated).not.toContain(winner);
      expect(raced.size).toBe(8);
    }, 60_000);
  }
});
