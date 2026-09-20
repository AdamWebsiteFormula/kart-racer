import { describe, expect, it } from 'vitest';
import raceSchema from '../../docs/schemas/race-state.schema.json';
import { GP_POINTS_BY_RANK, KNOCKOUT_CUT_LINES, KNOCKOUT_LAPS_PER_SEGMENT, RACE } from './constants.ts';

describe('race constants', () => {
  it('every value equals the schema default', () => {
    const props = raceSchema.properties.constants.properties as Record<string, { default: unknown }>;
    for (const [k, def] of Object.entries(props)) {
      expect((RACE as unknown as Record<string, unknown>)[k]).toEqual(def.default);
    }
    expect(Object.keys(RACE).length).toBe(Object.keys(props).length);
  });

  it('is frozen and carries the SOP numbers', () => {
    expect(Object.isFrozen(RACE)).toBe(true);
    expect(RACE.countdownSteps).toBe(3);
    expect(RACE.wrongWayHoldSeconds).toBe(1.2);
    expect(RACE.respawnFreezeSeconds).toBe(0.6);
    expect(RACE.finishGraceSeconds).toBe(12);
  });

  it('reads cup numbers from the cups schema', () => {
    expect(GP_POINTS_BY_RANK).toEqual([15, 12, 10, 8, 7, 6, 5, 4]);
    expect(KNOCKOUT_CUT_LINES).toEqual([6, 4, 2]);
    expect(KNOCKOUT_LAPS_PER_SEGMENT).toBe(2);
  });
});
