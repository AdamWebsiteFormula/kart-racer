// Class balance on the real tracks (design §4, kart-controller SOP gate 6). The same AI drivers
// race a Time Trial in each archetype on every track, and the classes must finish within a few
// percent of each other. On paper the archetypes looked even, but the heavy's +10 % top speed
// beat the light's −8 % by 12-20 % on every real track (bug hunt 2, 24 Sept 2026): these tracks
// are fast and flowing, so accel and handling pay about 1 % a lap and top speed pays the rest.
import { describe, expect, it } from 'vitest';
import { AiDriver } from '../ai-driver/index.ts';
import { PERSONALITIES } from '../ai-driver/personalities.ts';
import { soloConfig } from '../backend-leaderboard/rules.ts';
import { Items } from '../items/items.ts';
import { comboStats, KART_IDS, RACER_CLASSES } from '../kart-controller/karts.ts';
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

/**
 * The pairs at each end of each stat (design §5: any racer in any kart): the fastest and slowest flat
 * out, the quickest and slowest off the line, the sharpest and the stiffest in the bends.
 */
function extremes(): { racerId: string; kartId: string }[] {
  const pairs = Object.keys(RACER_CLASSES).flatMap((racerId) => KART_IDS.map((kartId) => ({ racerId, kartId, t: comboStats(racerId, kartId) })));
  const out = new Map<string, { racerId: string; kartId: string }>();
  for (const s of ['speed', 'accel', 'handling'] as const) {
    for (const pick of [Math.min, Math.max]) {
      const v = pick(...pairs.map((p) => p.t[s]));
      const p = pairs.find((x) => x.t[s] === v)!;
      out.set(`${p.t.speed} ${p.t.accel} ${p.t.handling}`, { racerId: p.racerId, kartId: p.kartId });
    }
  }
  return [...out.values()];
}

/** A Time Trial of `racerId` in `kartId`, the Hard AI at the wheel with `driver`'s personality, hazards on: finished, and the claw rescues. */
function runCombo(def: TrackDefinition, racerId: string, kartId: string, driver: string): { finished: boolean; rescues: number } {
  const solo = soloConfig('timeTrial', def.id, racerId, 0);
  const config = { ...solo, racers: [{ ...solo.racers[0], kartId }] };
  const track = buildTrack(def);
  const manager = new RaceManager(track, config);
  const items = new Items(track, manager);
  const ai = new AiDriver(track, config, manager.state, { itemRoles: items.roles, personalities: { [racerId]: PERSONALITIES[driver] } });
  ai.drivePlayer = true;
  const inputs = manager.state.karts.map(() => ({ ...NEUTRAL_INPUT }));
  const parts: SimParts = { manager, items, ai, inputs, playerIndex: manager.playerIndex, playerSlot: { ...NEUTRAL_INPUT } };
  let rescues = 0;
  for (let t = 0; t < 300 * SIM_HZ && manager.state.phase !== 'finished'; t++) {
    for (const e of simTick(parts, null).race) if (e.type === 'rescue' && e.phase === 'start') rescues++;
  }
  return { finished: !manager.results().ranks[0].dnf, rescues };
}

describe('any racer in any kart: the extreme combos (design §5)', () => {
  it('the Hard AI, hazards on, drives each extreme combo round every track: each finishes and the claw never fetches it', () => {
    const combos = extremes();
    expect(combos.length).toBeGreaterThanOrEqual(4);
    for (const def of Object.values(FILES)) {
      for (const c of combos) for (const d of DRIVERS) {
        const r = runCombo(def, c.racerId, c.kartId, d);
        expect(r, `${def.id}: ${c.racerId} in ${c.kartId}, driven as ${d}`).toEqual({ finished: true, rescues: 0 });
      }
    }
  });
});

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
