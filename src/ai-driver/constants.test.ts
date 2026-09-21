import { describe, expect, it } from 'vitest';
import schema from '../../docs/schemas/kart.schema.json';
import { AI, PROFILES, difficultyFor, targetTierFor } from './constants.ts';

describe('ai constants', () => {
  it('every leaf equals the schema default and nothing is missing', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const walk = (props: Record<string, any>, got: Record<string, unknown>, path: string) => {
      expect(Object.keys(got).length, path).toBe(Object.keys(props).length);
      for (const [k, def] of Object.entries(props)) {
        if ('default' in def) expect(got[k], `${path}.${k}`).toEqual(def.default);
        else walk(def.properties, got[k] as Record<string, unknown>, `${path}.${k}`);
      }
    };
    walk(schema.properties.ai.properties, AI as unknown as Record<string, unknown>, 'ai');
  });

  it('is frozen and carries the SOP numbers', () => {
    expect(Object.isFrozen(AI.line)).toBe(true);
    expect(AI.line.lookAheadMin).toBe(8);
    expect(AI.rubber.min).toBe(0.6);
    expect(PROFILES.hard.skill).toBe(0.95);
  });

  it('difficulty from speed class; drift tier from skill', () => {
    expect([difficultyFor(50), difficultyFor(100), difficultyFor(150)]).toEqual(['easy', 'normal', 'hard']);
    expect([targetTierFor(0.35), targetTierFor(0.65), targetTierFor(0.95)]).toEqual([1, 2, 3]);
  });
});
