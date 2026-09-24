import { describe, expect, it } from 'vitest';
import { CUPS } from './data/catalog.ts';
import { defaultSave } from './store.ts';
import { grantUnlocks, ULTRA_TURBOS_FOR_SPROCKET, UNLOCKS, unlockRows } from './unlocks.ts';

const times = new Map(CUPS.flatMap((c) => c.trackIds).map((id) => [id, { gold: 100000, silver: 110000, bronze: 120000 }]));
const ids = (list: { id: string }[]) => list.map((u) => u.id);

describe('design §10 unlocks: deterministic, from the save alone', () => {
  it('nothing on a new save', () => {
    const s = defaultSave();
    expect(grantUnlocks(s, times)).toEqual([]);
    expect(unlockRows(s).every((r) => !r.unlocked)).toBe(true);
    expect(unlockRows(s).length).toBe(UNLOCKS.length);
  });

  it('each one on its own condition, granted once, never taken back', () => {
    const s = defaultSave();
    s.stats.ultraTurbos = ULTRA_TURBOS_FOR_SPROCKET - 1;
    expect(grantUnlocks(s, times)).toEqual([]);
    s.stats.ultraTurbos++;
    expect(ids(grantUnlocks(s, times))).toEqual(['sprocket-alt']);
    expect(grantUnlocks(s, times)).toEqual([]); // the reveal fires once

    s.grandPrix.sunrise = { '50': { finished: true, stars: 0 } };
    s.knockout.coastline = { finished: true, won: false, bestPlacing: 2 };
    expect(ids(grantUnlocks(s, times))).toEqual(['classic', 'buggy']);
    s.knockout.peaks = { finished: false, won: false, bestPlacing: 7 }; // knocked out: no win
    expect(grantUnlocks(s, times)).toEqual([]);
    s.knockout.peaks = { finished: true, won: true, bestPlacing: 1 };
    expect(ids(grantUnlocks(s, times))).toEqual(['boulder-alt']);
    expect(s.unlocked).toEqual({ skins: ['sprocket-alt', 'boulder-alt'], bodies: ['classic', 'buggy'], mirror: false });
  });

  it('gold on every Sunrise track gives Pip\'s paint; gold on every track gives Mirror; medals are graded against today\'s times', () => {
    const s = defaultSave();
    const sunrise = CUPS.find((c) => c.id === 'sunrise')!.trackIds;
    for (const t of sunrise) s.timeTrial[t] = { bestMs: 99000, medal: 'gold' };
    s.timeTrial[sunrise[0]] = { bestMs: 105000, medal: 'gold' }; // gold once, silver under today's times
    expect(grantUnlocks(s, times)).toEqual([]);
    s.timeTrial[sunrise[0]].bestMs = 99000;
    expect(ids(grantUnlocks(s, times))).toEqual(['pip-alt']);
    for (const t of CUPS.flatMap((c) => c.trackIds)) s.timeTrial[t] = { bestMs: 99000, medal: 'gold' };
    expect(ids(grantUnlocks(s, times))).toEqual(['mirror']);
    expect(s.unlocked.mirror).toBe(true);
    expect(unlockRows(s).filter((r) => r.unlocked).map((r) => r.id)).toEqual(['pip-alt', 'mirror']);
  });
});
