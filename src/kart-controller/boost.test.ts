import { describe, expect, it } from 'vitest';
import { boostLive, clearBoost, requestBoost, tickBoost } from './boost.ts';
import { createKartState, type KartEvent } from './types.ts';

const fresh = () => createKartState({ racerId: 'x' });

describe('boost arbitration', () => {
  it('higher priority replaces lower', () => {
    const s = fresh(); const ev: KartEvent[] = [];
    expect(requestBoost(s, 'drift', 1.3, 2.5, ev)).toBe(true);
    expect(requestBoost(s, 'trick', 1.3, 0.7, ev)).toBe(true);
    expect(s.boost.source).toBe('trick');
    expect(s.boost.remaining).toBe(0.7);
    expect(ev.filter((e) => e.type === 'boostStart')).toHaveLength(2);
    // what is left of the mini-turbo waits underneath (its clock running) and runs when the trick ends
    expect(s.boostQueue).toEqual({ source: 'drift', multiplier: 1.3, remaining: 2.5 });
  });

  it('lower priority does not replace higher', () => {
    const s = fresh(); const ev: KartEvent[] = [];
    requestBoost(s, 'item', 1.4, 1.5, ev);
    expect(requestBoost(s, 'drift', 1.3, 2.5, ev)).toBe(false);
    expect(s.boost.source).toBe('item');
    expect(s.boostQueue.source).toBe('drift');
  });

  it('equal priority keeps the longer', () => {
    const s = fresh(); const ev: KartEvent[] = [];
    requestBoost(s, 'drift', 1.3, 2.5, ev);
    expect(requestBoost(s, 'drift', 1.3, 0.6, ev)).toBe(false);
    expect(s.boost.remaining).toBe(2.5);
    expect(requestBoost(s, 'drift', 1.3, 3, ev)).toBe(true);
    expect(s.boost.remaining).toBe(3);
    // slipstream and start tie; the weaker slipstream no longer cuts the start boost's 1.2 (24 Sept 2026): it waits
    const s2 = fresh();
    requestBoost(s2, 'start', 1.2, 1.0, ev);
    expect(requestBoost(s2, 'slipstream', 1.12, 1.5, ev)).toBe(false);
    expect(s2.boost.source).toBe('start');
    expect(s2.boostQueue.source).toBe('slipstream');
  });

  it('never stacks: multiplier is replaced, not multiplied', () => {
    const s = fresh(); const ev: KartEvent[] = [];
    requestBoost(s, 'drift', 1.3, 2.5, ev);
    requestBoost(s, 'item', 1.4, 1.5, ev);
    expect(s.boost.multiplier).toBe(1.4);
  });

  it('clamps any multiplier to the schema ceiling', () => {
    const s = fresh();
    requestBoost(s, 'item', 2.0, 1, []);
    expect(s.boost.multiplier).toBe(1.4);
  });

  it('ticks down and clears', () => {
    const s = fresh(); const ev: KartEvent[] = [];
    requestBoost(s, 'pad', 1.4, 0.02, ev);
    tickBoost(s, 0.01);
    expect(boostLive(s)).toBe(true);
    tickBoost(s, 0.01);
    expect(boostLive(s)).toBe(false);
    expect(s.boost.multiplier).toBe(1);
    expect(s.boost.source).toBe('none');
  });

  // audit 24 Sept 2026: refused boosts were thrown away
  it('an ultra mini-turbo released as a pad boost ends waits underneath, then runs what it has left', () => {
    const s = fresh(); const ev: KartEvent[] = [];
    requestBoost(s, 'pad', 1.4, 0.05, ev);
    expect(requestBoost(s, 'drift', 1.3, 2.5, ev)).toBe(false);
    for (let i = 0; i < 6; i++) tickBoost(s, 1 / 120);
    expect(s.boost.source).toBe('drift');
    expect(s.boost.remaining).toBeCloseTo(2.45, 9);
    expect(s.boostQueue.source).toBe('none');
  });

  it('a trick never cuts a stronger, longer Fizz Pop short (its own clock runs out underneath)', () => {
    const s = fresh(); const ev: KartEvent[] = [];
    requestBoost(s, 'item', 1.4, 1.5, ev);
    expect(requestBoost(s, 'trick', 1.3, 0.7, ev)).toBe(false);
    expect(s.boost).toEqual({ source: 'item', multiplier: 1.4, remaining: 1.5 });
    for (let i = 0; i < 180; i++) tickBoost(s, 1 / 120);
    expect(boostLive(s)).toBe(false); // never less than 1.4 while the Fizz Pop ran, and no boost time made up
  });

  it('a trick over a long mini-turbo: the trick runs, then the mini-turbo has what is left of its 2.5 s', () => {
    const s = fresh(); const ev: KartEvent[] = [];
    requestBoost(s, 'drift', 1.3, 2.5, ev);
    requestBoost(s, 'trick', 1.3, 0.7, ev);
    for (let i = 0; i < 90; i++) tickBoost(s, 1 / 120);
    expect(s.boost.source).toBe('drift');
    expect(s.boost.remaining).toBeCloseTo(1.75, 9);
  });

  it('a slipstream earned during a mini-turbo runs after it', () => {
    const s = fresh(); const ev: KartEvent[] = [];
    requestBoost(s, 'drift', 1.3, 0.6, ev);
    requestBoost(s, 'slipstream', 1.12, 1.5, ev);
    for (let i = 0; i < 80; i++) tickBoost(s, 1 / 120);
    expect(s.boost.source).toBe('slipstream');
    expect(s.boost.multiplier).toBe(1.12);
    expect(s.boost.remaining).toBeCloseTo(1.5 - 80 / 120, 9);
  });

  it('the queue keeps the stronger waiting boost, and clearBoost empties it', () => {
    const s = fresh(); const ev: KartEvent[] = [];
    requestBoost(s, 'trick', 1.3, 0.7, ev);
    requestBoost(s, 'slipstream', 1.12, 1.5, ev);
    requestBoost(s, 'drift', 1.3, 0.6, ev);
    expect(s.boostQueue.source).toBe('drift');
    clearBoost(s);
    expect(boostLive(s)).toBe(false);
    expect(s.boostQueue.source).toBe('none');
  });
});
