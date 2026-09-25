import { describe, expect, it } from 'vitest';
import { ownKartOf } from '../kart-controller/karts.ts';
import { CAST } from '../ui-hud/data/cast.ts';
import { lineup } from './lineup.ts';

describe('lineup: the field for a race (design §5)', () => {
  it('the player first in their chosen kart, every AI racer in its own kart', () => {
    const f = lineup('gus', 'scrap');
    expect(f.map((r) => r.racerId)).toEqual(['gus', 'pip', 'momo', 'nova', 'juniper', 'otto', 'sprocket', 'boulder']);
    expect(f[0]).toEqual({ racerId: 'gus', archetype: 'heavy', isPlayer: true, kartId: 'scrap' });
    for (const r of f.slice(1)) {
      expect(r.isPlayer, r.racerId).toBe(false);
      expect(r.kartId, r.racerId).toBe(ownKartOf(r.racerId));
    }
  });

  it('no kart, or an unknown one: the player drives their own', () => {
    expect(lineup('pip')[0].kartId).toBe('scooter');
    expect(lineup('pip', 'standard')[0].kartId).toBe('scooter');
    expect(lineup('pip', 'buggy')[0].kartId).toBe('buggy');
  });

  it("an all-AI field in racer order, as the game's roster was", () => {
    const f = lineup(null);
    expect(f.map((r) => [r.racerId, r.archetype, r.isPlayer])).toEqual(CAST.map((c) => [c.id, c.archetype, false]));
    expect(f.every((r) => r.kartId === ownKartOf(r.racerId))).toBe(true);
  });
});
