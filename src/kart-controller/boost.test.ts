import { describe, expect, it } from 'vitest';
import { boostLive, requestBoost, tickBoost } from './boost.ts';
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
  });

  it('lower priority does not replace higher', () => {
    const s = fresh(); const ev: KartEvent[] = [];
    requestBoost(s, 'item', 1.4, 1.5, ev);
    expect(requestBoost(s, 'drift', 1.3, 2.5, ev)).toBe(false);
    expect(s.boost.source).toBe('item');
  });

  it('equal priority keeps the longer', () => {
    const s = fresh(); const ev: KartEvent[] = [];
    requestBoost(s, 'drift', 1.3, 2.5, ev);
    expect(requestBoost(s, 'drift', 1.3, 0.6, ev)).toBe(false);
    expect(s.boost.remaining).toBe(2.5);
    expect(requestBoost(s, 'drift', 1.3, 3, ev)).toBe(true);
    expect(s.boost.remaining).toBe(3);
    // slipstream and start tie
    const s2 = fresh();
    requestBoost(s2, 'start', 1.2, 1.0, ev);
    expect(requestBoost(s2, 'slipstream', 1.12, 1.5, ev)).toBe(true);
  });

  it('never stacks: multiplier is replaced, not multiplied', () => {
    const s = fresh(); const ev: KartEvent[] = [];
    requestBoost(s, 'drift', 1.3, 2.5, ev);
    requestBoost(s, 'item', 1.4, 1.5, ev);
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
});
