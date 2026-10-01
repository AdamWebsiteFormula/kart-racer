// A trick's sparkle (vfx.ts TRICK_SPARKLE; second MKW gap review, 28 Sept 2026, item 4): a twinkle of stars round
// the kart at the press, and a small burst as it lands into its trick boost; every kart's, a rival's small.
import { PerspectiveCamera, Scene } from 'three';
import { describe, expect, it } from 'vitest';
import { createKartState, type KartState } from '../kart-controller/types.ts';
import type { RaceEvent } from '../race-manager/types.ts';
import { directFx } from './juice.ts';
import { TRICK_SPARKLE, Vfx } from './vfx.ts';

const kartEvent = (racerId: string, event: unknown): RaceEvent => ({ type: 'kart', racerId, event } as RaceEvent);

describe('the director: a trick twinkles as it is done and sparkles as it lands into its boost', () => {
  it('every kart\'s, marked yours or a rival\'s; a landing with no trick only scuffs', () => {
    const fx = directFx([kartEvent('me', { type: 'trick' }), kartEvent('r', { type: 'landed', trick: true }), kartEvent('q', { type: 'landed', trick: false })], [], 'me');
    expect(fx.bursts).toContainEqual({ kind: 'trick', racerId: 'me', mine: true });
    expect(fx.bursts).toContainEqual({ kind: 'trickLand', racerId: 'r', mine: false });
    expect(fx.bursts.filter((b) => b.kind === 'trickLand')).toHaveLength(1);
    expect(fx.bursts.filter((b) => b.kind === 'land')).toHaveLength(2);
  });
});

describe('the sparkle itself', () => {
  const kart = (id: string): KartState => { const k = createKartState({ racerId: id, position: [10, 2, -4], heading: 0.4 }); k.speed = 20; return k; };
  const run = (kind: 'trick' | 'trickLand', mine: boolean) => {
    const vfx = new Vfx(new Scene(), new PerspectiveCamera());
    const k = kart(mine ? 'me' : 'r');
    const fx = directFx([], [], 'me');
    fx.bursts.push({ kind, racerId: k.racerId, mine });
    vfx.onTick(fx, (id) => (id === k.racerId ? k : undefined), 0, false);
    return vfx;
  };

  it('the press: a ring of little stars round the kart; yours bright, a rival\'s fewer and under the bloom', () => {
    const mine = run('trick', true), rival = run('trick', false);
    // no stars since 30 Sept 2026 (Adam: "should be removed")
    expect(mine.glow.count).toBe(0);
    expect(rival.glow.count).toBe(0);
    // small, quick: gone within half a second
    mine.glow.update(0.5);
    expect(mine.glow.count).toBe(0);
  });

  it('the landing: a small burst of stars and a gleam for yours, fewer for a rival\'s; gone within half a second', () => {
    const mine = run('trickLand', true), rival = run('trickLand', false);
    expect(mine.glow.count).toBe(TRICK_SPARKLE.land.count + 1); // the gleam alone since 30 Sept 2026
    expect(rival.glow.count).toBeLessThanOrEqual(mine.glow.count);
    expect(TRICK_SPARKLE.land.size).toBeLessThanOrEqual(0.3);
    mine.glow.update(0.5);
    expect(mine.glow.count).toBe(0);
  });
});
