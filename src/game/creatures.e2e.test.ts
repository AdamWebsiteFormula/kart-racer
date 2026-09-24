// Every track's course creature in a whole race (design §6): all eight karts AI, the game's own
// sim tick, to the flag. The creature must act (its events fire), hit karts now and then, and
// never leave a kart stuck, lost or NaN.
import { describe, expect, it } from 'vitest';
import { AiDriver } from '../ai-driver/index.ts';
import { Items } from '../items/items.ts';
import { SIM_HZ } from '../kart-controller/step.ts';
import { NEUTRAL_INPUT } from '../kart-controller/types.ts';
import { RaceManager } from '../race-manager/index.ts';
import type { RaceConfig, RaceEvent } from '../race-manager/types.ts';
import { buildTrack } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { CAST } from '../ui-hud/data/cast.ts';
import { simTick, type SimParts } from './simtick.ts';

const FILES = import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' }) as Record<string, TrackDefinition>;

describe('course creatures in a whole race', () => {
  for (const def of Object.values(FILES)) {
    const found = def.hazards?.find((h) => h.type === 'creature');
    if (!found) continue;
    const creature = found;
    it(`${def.id}: the ${creature.creature} acts all race and every kart still finishes`, () => {
      // four seeds: a creature catches 0 to 8 karts in one two-lap race, so one race alone is luck.
      // Since the classes race level (24 Sept 2026) the pack runs closer, and the rumblesaur and the
      // yeti catch nobody in about half their races (12 seeds), so two races were no longer enough
      let hits = 0;
      for (const seed of [1, 2, 3, 4]) hits += race(seed);
      // a real threat (the whale only pushes): it catches somebody in four races of eight karts
      if (creature.creature !== 'whale') expect(hits, `${creature.creature} caught somebody`).toBeGreaterThan(0);
    }, 120_000);

    function race(seed: number): number {
      const track = buildTrack(def);
      const config: RaceConfig = {
        mode: 'quick', trackId: def.id, speedClass: 150, seed, laps: 2,
        racers: CAST.map((c) => ({ racerId: c.id, archetype: c.archetype, isPlayer: false })),
      };
      const manager = new RaceManager(track, config);
      const items = new Items(track, manager);
      const ai = new AiDriver(track, config, manager.state, { itemRoles: items.roles });
      const inputs = manager.state.karts.map(() => ({ ...NEUTRAL_INPUT }));
      const parts: SimParts = { manager, items, ai, inputs, playerIndex: -1, playerSlot: { ...NEUTRAL_INPUT } };
      const actions = new Set<string>();
      let hits = 0, rescues = 0;
      const step = manager.step.bind(manager);
      manager.step = (inp) => {
        const ev: RaceEvent[] = step(inp);
        for (const e of ev) {
          if (e.type === 'creature') actions.add(e.action);
          if (e.type === 'hazardHit' && e.hazardId === creature.id) hits++;
          if (e.type === 'rescue' && e.phase === 'start') rescues++;
        }
        return ev;
      };
      for (let t = 0; t < 300 * SIM_HZ && manager.state.phase !== 'finished'; t++) simTick(parts, null);
      expect(manager.state.phase).toBe('finished');
      expect(manager.results().ranks.every((r) => !r.dnf)).toBe(true);
      for (const k of manager.state.karts) expect(k.position.every(Number.isFinite)).toBe(true);
      expect(actions.size, `${creature.creature} changed what it does`).toBeGreaterThanOrEqual(2);
      // open cliff edges are a risk for a careless driver, not a trap for the AI
      expect(rescues, `${def.id}: claw rescues in a two-lap AI race`).toBeLessThanOrEqual(3);
      return hits;
    }
  }
});
