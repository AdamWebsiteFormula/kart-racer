// SOP test 17: a live RaceState carries every required key of race-state.schema.json
// with the right shapes and enums. No validator library in the repo, so this walks
// the schema by hand: required keys, enums, and the kart entry's required keys.
import { describe, expect, it } from 'vitest';
import schema from '../../docs/schemas/race-state.schema.json';
import { buildTrack } from '../track-builder/track.ts';
import { lookAheadDriver } from './__tests__/drivers.ts';
import { OVAL } from './__tests__/fixtures.ts';
import { RaceManager } from './index.ts';

describe('RaceState against the schema', () => {
  const track = buildTrack(OVAL);
  const rm = new RaceManager(track, {
    mode: 'knockout', trackId: 'oval', speedClass: 150, seed: 9,
    racers: [{ racerId: 'p', archetype: 'light', isPlayer: true }, { racerId: 'a', archetype: 'heavy' }],
    knockout: { setId: 'k1', segment: 0, cutLine: 6, eliminated: [] },
  });
  const drivers = [lookAheadDriver(20, -1), lookAheadDriver(18, 1)];
  for (let i = 0; i < 1200; i++) rm.step(drivers.map((d, k) => d(rm.state.karts[k], track)));
  const st = rm.state as unknown as Record<string, unknown>;

  it('has every required top-level key', () => {
    for (const k of schema.required) expect(st, k).toHaveProperty(k);
  });

  it('enums hold', () => {
    expect(schema.properties.mode.enum).toContain(st.mode);
    expect(schema.properties.phase.enum).toContain(st.phase);
    expect(schema.properties.speedClass.enum).toContain(st.speedClass);
  });

  it('every kart carries the required kart keys and the knockout block matches', () => {
    const karts = st.karts as Record<string, unknown>[];
    expect(karts.length).toBeGreaterThanOrEqual(1);
    for (const k of karts) for (const key of schema.properties.karts.items.required) expect(k, key).toHaveProperty(key);
    expect(st.knockout).toEqual({ setId: 'k1', segment: 0, cutLineAt: 3, eliminated: [] });
    expect((st.inputLog as unknown[]).length).toBe(1200);
    expect(Object.keys(rm.state.karts[0].item)).toEqual(['held', 'charges', 'rouletteRemaining', 'next', 'nextCharges', 'nextRouletteRemaining']);
  });
});
