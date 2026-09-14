import { describe, expect, it } from 'vitest';
import { makeConstants } from './constants.ts';
import { inWake, stepSlipstream } from './slipstream.ts';
import { createKartState, type KartEvent } from './types.ts';

const c = makeConstants('medium', 150);
const DT = 1 / 120;

function following(gap = 4, side = 0) {
  const lead = createKartState({ racerId: 'lead', position: [0, 0, 10], heading: 0 }); // forward +Z
  const me = createKartState({ racerId: 'me', position: [side, 0, 10 - gap], heading: 0 });
  lead.speed = 25; me.speed = 25;
  return { lead, me };
}

describe('slipstream', () => {
  it('detects the wake box', () => {
    expect(inWake(following().me, following().lead, c)).toBe(true);
    expect(inWake(following(9).me, following(9).lead, c)).toBe(false);
    expect(inWake(following(4, 2.5).me, following(4, 2.5).lead, c)).toBe(false);
    const { lead, me } = following(-2);
    expect(inWake(me, lead, c)).toBe(false); // ahead, not behind
  });

  it('opposite headings do not draft', () => {
    const { lead, me } = following();
    me.heading = Math.PI;
    expect(inWake(me, lead, c)).toBe(false);
  });

  it('2 s in the wake grants the boost and resets', () => {
    const { lead, me } = following();
    const ev: KartEvent[] = [];
    let ticks = 0;
    while (me.boost.source === 'none' && ticks < 1000) { stepSlipstream(me, [lead], c, DT, ev); ticks++; }
    expect(Math.abs(ticks * DT - c.slipstreamSeconds)).toBeLessThan(0.02);
    expect(me.boost.multiplier).toBe(c.slipstreamMultiplier);
    expect(me.boost.remaining).toBe(c.slipstreamBoostSeconds);
    expect(me.slipstreamSeconds).toBe(0);
  });

  it('leaving the wake resets the timer', () => {
    const { lead, me } = following();
    for (let i = 0; i < 100; i++) stepSlipstream(me, [lead], c, DT, []);
    expect(me.slipstreamSeconds).toBeGreaterThan(0.5);
    me.position[0] = 5;
    stepSlipstream(me, [lead], c, DT, []);
    expect(me.slipstreamSeconds).toBe(0);
  });
});
