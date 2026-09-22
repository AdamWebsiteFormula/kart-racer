// SOP tests 2, 3, 4 (roll side), 15: distribution, lockouts, Knockout pool, Time Trial.
import { describe, expect, it } from 'vitest';
import { ITEMS_CONFIG, ITEM_TABLE } from './data.ts';
import { next, seedFor, weightedPick } from './rng.ts';
import { weightsFor } from './roulette.ts';
import { give, go, kart, press, seconds, setup, tick, toFeature } from './__tests__/harness.ts';

describe('roll', () => {
  it('10,000 draws per rank match the table within 2 %', () => {
    const h = setup({ n: 8 });
    go(h);
    tick(h, seconds(ITEMS_CONFIG.lockoutSeconds + 1));
    const m = { rng: seedFor(7) };
    for (let rank = 1; rank <= 8; rank++) {
      const w = weightsFor(ITEMS_CONFIG, h.rm.state, h.rm.consts, h.track, rank);
      expect(w).toEqual(ITEM_TABLE[rank - 1]);
      const counts: Record<string, number> = {};
      for (let k = 0; k < 10000; k++) { const id = weightedPick(w, next(m)) as string; counts[id] = (counts[id] ?? 0) + 1; }
      for (const [id, weight] of Object.entries(w)) expect(Math.abs((counts[id] ?? 0) / 10000 - weight / 100), `${rank} ${id}`).toBeLessThan(0.02);
      for (const id of Object.keys(counts)) expect(w[id], `${rank} drew ${id}`).toBeGreaterThan(0);
    }
  });

  it('a masked id is never drawn and the rest keep their ratio', () => {
    const m = { rng: 1 };
    const w = { a: 50, b: 50, c: 0 };
    const counts: Record<string, number> = {};
    for (let k = 0; k < 4000; k++) { const id = weightedPick(w, next(m)) as string; counts[id] = (counts[id] ?? 0) + 1; }
    expect(counts.c).toBeUndefined();
    expect(Math.abs(counts.a / 4000 - 0.5)).toBeLessThan(0.03);
    expect(weightedPick({ a: 0 }, 0.5)).toBeUndefined();
  });

  it('Fog Bank weighs 0 in the first 15 s and in the last 8 s of the final lap', () => {
    const h = setup({ n: 8, laps: 1 });
    go(h);
    const rank8 = () => weightsFor(ITEMS_CONFIG, h.rm.state, h.rm.consts, h.track, 8);
    expect(h.rm.state.time).toBeLessThan(ITEMS_CONFIG.lockoutSeconds);
    expect(rank8().fogBank).toBe(0);
    tick(h, seconds(ITEMS_CONFIG.lockoutSeconds + 0.5));
    expect(h.rm.state.phase).toBe('finalLap'); // a 1-lap race is on its final lap from GO
    expect(rank8().fogBank).toBe(25);
    // a leader within 8 s of the line at its top speed (a state copy: teleporting past checkpoints is not allowed)
    const st = h.rm.state;
    const li = st.karts.findIndex((k) => k.rank === 1);
    const near = (secs: number) => ({
      ...st, karts: st.karts.map((k, i) => (i === li ? { ...k, distanceAlong: st.lapsTotal * h.track.length - h.rm.consts[li].topSpeed * secs } : k)),
    });
    expect(weightsFor(ITEMS_CONFIG, near(ITEMS_CONFIG.finalLapLockoutSeconds - 1), h.rm.consts, h.track, 8).fogBank).toBe(0);
    expect(weightsFor(ITEMS_CONFIG, near(ITEMS_CONFIG.finalLapLockoutSeconds + 1), h.rm.consts, h.track, 8).fogBank).toBe(25);
  });

  it('the Knockout pool shrinks with the racers left', () => {
    const four = setup({ n: 4, mode: 'knockout' });
    go(four); tick(four, seconds(16));
    expect(weightsFor(ITEMS_CONFIG, four.rm.state, four.rm.consts, four.track, 4).fogBank).toBeUndefined();
    const st = four.rm.state; st.karts[3].rank = 8;
    expect(weightsFor(ITEMS_CONFIG, st, four.rm.consts, four.track, 8).fogBank).toBe(0);
    const two = setup({ n: 2, mode: 'knockout' });
    go(two); tick(two, seconds(16));
    expect(weightsFor(ITEMS_CONFIG, two.rm.state, two.rm.consts, two.track, 1).decoyBalloon).toBe(0);
    const eight = setup({ n: 8, mode: 'knockout' });
    go(eight); tick(eight, seconds(16));
    expect(weightsFor(ITEMS_CONFIG, eight.rm.state, eight.rm.consts, eight.track, 8).fogBank).toBe(25);
  });

  it('a balloon rolls an item, hides it for rouletteSeconds, and gives nothing while holding', () => {
    const h = setup({ n: 2 });
    go(h);
    const s = kart(h, 0);
    toFeature(h, 0, 'pickup', 0);
    const ev = tick(h);
    expect(ev.some((e) => e.type === 'roulette')).toBe(true);
    expect(s.item.held).not.toBe('none');
    expect(s.item.rouletteRemaining).toBeCloseTo(ITEMS_CONFIG.rouletteSeconds, 5);
    const held = s.item.held;
    expect(press(h, 0).some((e) => e.type === 'itemRefused' && e.reason === 'roulette')).toBe(true);
    const evs = tick(h, seconds(ITEMS_CONFIG.rouletteSeconds) + 1);
    expect(h.log.some((e) => e.type === 'itemReady' && e.itemId === held)).toBe(true);
    expect(evs.length).toBe(0);
    // a second balloon while holding gives nothing
    toFeature(h, 0, 'pickup', 1);
    tick(h);
    expect(s.item.held).toBe(held);
    expect(h.log.filter((e) => e.type === 'roulette').length).toBe(1);
  });

  it('Time Trial and ghosts never roll or step', () => {
    const h = setup({ n: 1, mode: 'timeTrial' });
    go(h);
    toFeature(h, 0, 'pickup');
    give(h, 0, 'beachBall');
    expect(press(h, 0)).toEqual([]);
    expect(h.items.state.projectiles.length).toBe(0);
    const g = setup({ n: 2 });
    go(g);
    const ghost = kart(g, 1); ghost.isGhost = true;
    toFeature(g, 1, 'pickup');
    tick(g, 3);
    expect(ghost.item.held).toBe('none');
  });
});
