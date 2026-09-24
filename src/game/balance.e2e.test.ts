// Class balance on the real tracks (design §4, kart-controller SOP gate 6). The same AI drivers
// race a Time Trial in each archetype on every track, and the classes must finish within a few
// percent of each other. On paper the archetypes looked even, but the heavy's +10 % top speed
// beat the light's −8 % by 12-20 % on every real track (bug hunt 2, 24 Sept 2026): these tracks
// are fast and flowing, so accel and handling pay about 1 % a lap and top speed pays the rest.
import { describe, expect, it } from 'vitest';
import { AiDriver } from '../ai-driver/index.ts';
import { soloConfig } from '../backend-leaderboard/rules.ts';
import { Items } from '../items/items.ts';
import { SIM_HZ } from '../kart-controller/step.ts';
import { NEUTRAL_INPUT, type Archetype, type SpeedClass } from '../kart-controller/types.ts';
import { RaceManager } from '../race-manager/index.ts';
import { buildTrack } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { simTick, type SimParts } from './simtick.ts';

const FILES = import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' }) as Record<string, TrackDefinition>;
const CLASSES: Archetype[] = ['light', 'medium', 'heavy'];
/** Three AI personalities (drift use 0.9 / 0.7 / 0.5) drive every class, so a class time is not one driver's line. */
const DRIVERS = ['pip', 'juniper', 'gus'];

/** A Time Trial (seed 0, the AI at the wheel) with the racer put in `archetype`; its time in s. */
function run(def: TrackDefinition, racerId: string, archetype: Archetype, cc: SpeedClass): number {
  const solo = soloConfig('timeTrial', def.id, racerId, 0);
  const config = { ...solo, speedClass: cc, racers: [{ ...solo.racers[0], archetype }] };
  const track = buildTrack(def);
  const manager = new RaceManager(track, config);
  const items = new Items(track, manager);
  const ai = new AiDriver(track, config, manager.state, { itemRoles: items.roles });
  ai.drivePlayer = true;
  const inputs = manager.state.karts.map(() => ({ ...NEUTRAL_INPUT }));
  const parts: SimParts = { manager, items, ai, inputs, playerIndex: manager.playerIndex, playerSlot: { ...NEUTRAL_INPUT } };
  for (let t = 0; t < 300 * SIM_HZ && manager.state.phase !== 'finished'; t++) simTick(parts, null);
  const row = manager.results().ranks[0];
  expect(row.dnf, `${def.id} ${racerId} ${archetype} ${cc}cc finishes`).toBe(false);
  return row.timeMs / 1000;
}

describe('archetype balance on the real tracks', () => {
  for (const cc of [150, 100] as const) {
    it(`${cc}cc: every class within 4 % of the others on each track, and no class ahead on average`, () => {
      const gaps: Record<Archetype, number[]> = { light: [], medium: [], heavy: [] };
      for (const def of Object.values(FILES)) {
        const t = Object.fromEntries(CLASSES.map((a) => [a, DRIVERS.reduce((sum, id) => sum + run(def, id, a, cc), 0) / DRIVERS.length])) as Record<Archetype, number>;
        const fastest = Math.min(...CLASSES.map((a) => t[a])), slowest = Math.max(...CLASSES.map((a) => t[a]));
        // "about 3 %": the AI's own line wanders ±2 % when a stat moves, so a track may show a little more
        expect(slowest / fastest - 1, `${def.id} ${cc}cc ${JSON.stringify(t)}`).toBeLessThan(0.04);
        for (const a of CLASSES) gaps[a].push(t[a] / fastest - 1);
      }
      const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
      const means = CLASSES.map((a) => mean(gaps[a]));
      expect(Math.max(...means) - Math.min(...means), `${cc}cc mean gap to the track's fastest ${JSON.stringify(means)}`).toBeLessThan(0.015);
    });
  }
});
