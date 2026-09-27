// How hard each class is (Adam, 26 Sept 2026: "The races seem pretty easy"; 21 Sept 2026: 50cc easy,
// 100cc normal, 150cc hard). Two kinds of gate per class, the same kind as ai-driver gate 2:
// 1. Pace: the class's AI at its sharpest (the rubber band's full lift, as when it chases a player out
//    in front) races solo on the main road with the pads, coins, balloons and hazards off, against the
//    scripted drivers on the same road (game/__tests__/scripted.ts and the scripted average player):
//    what a player out in front has to beat, with nothing but the line and the drifts deciding it.
// 2. Races: full eight-kart races on every track, items and hazards live, with a stand-in in the player's
//    seat (game/__tests__/fieldRace.ts): where it finishes against the class's field.
// Targets and why: docs/sops/ai-driver.md, Decisions 26 Sept 2026.
import { describe, expect, it } from 'vitest';
import { AiDriver } from '../ai-driver/index.ts';
import { AI, PROFILES } from '../ai-driver/constants.ts';
import { powerCapFor, skillFor } from '../ai-driver/rubber.ts';
import type { AiProfile } from '../ai-driver/types.ts';
import { soloConfig } from '../backend-leaderboard/rules.ts';
import { Items } from '../items/items.ts';
import { SIM_HZ } from '../kart-controller/step.ts';
import { NEUTRAL_INPUT, type SpeedClass } from '../kart-controller/types.ts';
import { lookAheadDriver } from '../race-manager/__tests__/drivers.ts';
import { RaceManager } from '../race-manager/index.ts';
import { buildTrack } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { fieldRace, type StandIn } from './__tests__/fieldRace.ts';
import { runScripted } from './__tests__/scripted.ts';
import { simTick, type SimParts } from './simtick.ts';

const FILES = import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' }) as Record<string, TrackDefinition>;
const TRACKS = Object.values(FILES);

/** The class's AI as it chases a player out in front: the rubber band's whole lift. */
function sharpest(p: AiProfile): AiProfile {
  return { ...p, skill: skillFor(p, AI.rubber.max), power: powerCapFor(p, AI.rubber.max) };
}

/** A solo 3-lap race on the main road, pads, coins, balloons and hazards off: the AI with `profile`, or the scripted average player. Seconds. */
function lineTime(source: TrackDefinition, cc: SpeedClass, profile: AiProfile | null): number {
  const def = { ...source, coins: [], pickups: [], boostPads: [] } as TrackDefinition;
  const config = { ...soloConfig('timeTrial', def.id, 'juniper', 0), speedClass: cc };
  const track = buildTrack(def);
  for (const id of track.hazards.ids) track.hazards.setEnabled(id, false);
  const manager = new RaceManager(track, config);
  const items = new Items(track, manager);
  const ai = new AiDriver(track, config, manager.state, { itemRoles: items.roles, profile: profile ?? undefined, onlyShortcut: 'none' });
  ai.drivePlayer = profile !== null;
  const inputs = manager.state.karts.map(() => ({ ...NEUTRAL_INPUT }));
  const parts: SimParts = { manager, items, ai, inputs, playerIndex: manager.playerIndex, playerSlot: { ...NEUTRAL_INPUT } };
  const average = lookAheadDriver(Infinity, 0);
  for (let t = 0; t < 400 * SIM_HZ && manager.state.phase !== 'finished'; t++) simTick(parts, profile ? null : average(manager.state.karts[0], track));
  const row = manager.results().ranks[0];
  expect(row.dnf, `${def.id} ${cc}cc finishes`).toBe(false);
  return row.timeMs / 1000;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
/** twelve whole eight-kart races a test: 25-45 s on this Mac, three times that on a CI runner */
const RACES_TIMEOUT = 300_000;

/** Full races at `cc`, the stand-in `who` in the player's seat, two seeds on every track. */
function races(cc: SpeedClass, who: StandIn) {
  const rows = TRACKS.flatMap((def) => [1, 2].map((seed) => ({ track: def.id, seed, ...fieldRace(def, cc, who, seed) })));
  const out = {
    rows,
    wins: rows.filter((r) => r.place === 1).length,
    podiums: rows.filter((r) => r.place <= 3).length,
    meanPlace: sum(rows.map((r) => r.place)) / rows.length,
    meanGap: sum(rows.map((r) => r.gap)) / rows.length,
    toString: () => rows.map((r) => `${r.track} ${r.seed}: P${r.place} ${r.gap.toFixed(1)} s`).join('; '),
  };
  // DIFFICULTY_REPORT=1 prints each class's numbers (the SOP's before and after)
  if (import.meta.env.DIFFICULTY_REPORT) console.log(`${cc}cc ${who}: ${out.wins}/12 wins, ${out.podiums}/12 podiums, mean place ${out.meanPlace.toFixed(2)}, mean gap to the best AI ${out.meanGap.toFixed(1)} s`);
  return out;
}

describe('pace: the class AI at its sharpest against the scripted drivers, over the six tracks', () => {
  it('50cc (easy): even chasing, the Easy AI is slower than the scripted average player', () => {
    const ai = sum(TRACKS.map((d) => lineTime(d, 50, sharpest(PROFILES.easy))));
    const average = sum(TRACKS.map((d) => lineTime(d, 50, null)));
    expect(ai / average - 1, `Easy at its sharpest ${ai.toFixed(1)} s, the average player ${average.toFixed(1)} s`).toBeGreaterThan(0.02);
  }, 120_000);

  it('100cc (normal): the sharpest Normal AI beats a clean driver who never drifts and loses to a near-perfect drifter', () => {
    const ai = sum(TRACKS.map((d) => lineTime(d, 100, sharpest(PROFILES.normal))));
    const grip = sum(TRACKS.map((d) => runScripted(d, 'juniper', false, { cc: 100 }).time));
    const drift = sum(TRACKS.map((d) => runScripted(d, 'juniper', true, { cc: 100 }).time));
    const msg = `Normal at its sharpest ${ai.toFixed(1)} s, clean grip ${grip.toFixed(1)} s, near-perfect drift ${drift.toFixed(1)} s`;
    expect(1 - ai / grip, msg).toBeGreaterThan(0.02);
    expect(ai / drift - 1, msg).toBeGreaterThan(0.02);
    expect(ai / drift - 1, msg).toBeLessThan(0.06);
  }, 120_000);

  it('150cc (hard): the sharpest Hard AI is within 2.5 % of a near-perfect drifter', () => {
    const ai = sum(TRACKS.map((d) => lineTime(d, 150, sharpest(PROFILES.hard))));
    const drift = sum(TRACKS.map((d) => runScripted(d, 'juniper', true).time));
    expect(Math.abs(ai / drift - 1), `Hard at its sharpest ${ai.toFixed(1)} s, near-perfect drift ${drift.toFixed(1)} s`).toBeLessThan(0.025);
  }, 120_000);
});

describe('races: a stand-in in the player\'s seat against the class\'s field, 12 races a class (six tracks, two seeds)', () => {
  let expert100 = 0;

  it('50cc (easy, friendly for a five-year-old): the kid stand-in is on the podium in 9 of 12 or more, well clear on average', () => {
    const r = races(50, 'kid');
    expect(r.podiums, `${r}`).toBeGreaterThanOrEqual(9);
    expect(r.meanGap, `${r}`).toBeGreaterThan(2);
  }, RACES_TIMEOUT);

  it('100cc (normal, a real race for an adult who drives cleanly): the expert wins some, loses some, never by much on average', () => {
    const r = races(100, 'expert');
    expert100 = r.meanGap;
    expect(r.meanPlace, `${r}`).toBeLessThanOrEqual(3);
    expect(r.wins, `${r}`).toBeGreaterThanOrEqual(3);
    expect(r.wins, `${r}`).toBeLessThanOrEqual(9);
    expect(r.meanGap, `${r}`).toBeGreaterThan(-3);
    expect(r.meanGap, `${r}`).toBeLessThan(2.5);
  }, RACES_TIMEOUT);

  it('100cc: the clean adult stand-in (drifts to orange) makes the podium often and wins at most two thirds', () => {
    const r = races(100, 'adult');
    expect(r.podiums, `${r}`).toBeGreaterThanOrEqual(5);
    expect(r.wins, `${r}`).toBeLessThanOrEqual(8);
  }, RACES_TIMEOUT);

  it('150cc (hard, a tough one): the expert wins half at most and trails the best AI on average, by more than at 100cc', () => {
    const r = races(150, 'expert');
    expect(r.wins, `${r}`).toBeLessThanOrEqual(6);
    expect(r.podiums, `${r}`).toBeGreaterThanOrEqual(3);
    expect(r.meanGap, `${r}`).toBeLessThan(0);
    expect(r.meanGap, `${r}; at 100cc ${expert100.toFixed(1)} s`).toBeLessThan(expert100 - 1);
  }, RACES_TIMEOUT);
});
