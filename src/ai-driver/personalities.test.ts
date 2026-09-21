import { describe, expect, it } from 'vitest';
import schema from '../../docs/schemas/kart.schema.json';
import { PERSONALITIES, personalityFor } from './personalities.ts';
import { seedFor } from './rng.ts';

describe('personalities', () => {
  it('eight racers, every value inside the schema bounds', () => {
    const ids = Object.keys(PERSONALITIES);
    expect(ids).toEqual(['pip', 'momo', 'nova', 'juniper', 'otto', 'sprocket', 'boulder', 'gus']);
    const props = schema.$defs.aiPersonality.properties;
    for (const p of Object.values(PERSONALITIES)) for (const [k, def] of Object.entries(props)) {
      const v = (p as unknown as Record<string, number>)[k];
      expect(v).toBeGreaterThanOrEqual(def.minimum);
      expect(v).toBeLessThanOrEqual(def.maximum);
    }
  });

  it('unknown ids get a seeded neutral personality, the same for the same seed', () => {
    const a = personalityFor('zed', { rng: seedFor(3, 1) });
    const b = personalityFor('zed', { rng: seedFor(3, 1) });
    expect(a).toEqual(b);
    expect(Math.abs(a.lateralBias)).toBeLessThanOrEqual(0.5);
    expect(personalityFor('pip', { rng: 0 })).toEqual(PERSONALITIES.pip);
  });
});
