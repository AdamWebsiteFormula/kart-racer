import { describe, expect, it } from 'vitest';
import { makeConstants } from './constants.ts';
import { applyHit, stepKart, tickTimers, tryStartBoost } from './step.ts';
import { createKartState, headingOf, NEUTRAL_INPUT, type KartEvent } from './types.ts';
import { makeOval } from './__tests__/oval-stub.ts';

const c = makeConstants('medium', 150);
const DT = 1 / 120;

describe('applyHit', () => {
  // the coin buffer is off (Adam, 24 Sept 2026): a hit always spins and costs coins, as in MK8DX and World
  it('with coins: drops 2 and still spins; drift and boost cancelled', () => {
    const s = createKartState({ racerId: 'x', coins: 5 });
    s.drift.phase = 'drifting'; s.drift.tier = 2; s.drift.charge = 600;
    s.boost.source = 'drift'; s.boost.remaining = 1; s.boost.multiplier = 1.3;
    const ev: KartEvent[] = [];
    applyHit(s, c, 'item', ev);
    expect(c.coinShield.enabled).toBe(false);
    expect(s.coins).toBe(3);
    expect(s.status.spinRemaining).toBe(c.hitSpinSeconds);
    expect(s.status.slowRemaining).toBe(0);
    expect(s.drift.phase).toBe('idle');
    expect(s.boost.source).toBe('none');
    expect(ev[0]).toEqual({ type: 'hit', kind: 'item', spun: true, coinsLost: 2 });
  });

  it('at zero coins: spins for hitSpinSeconds', () => {
    const s = createKartState({ racerId: 'x', coins: 0 });
    const ev: KartEvent[] = [];
    applyHit(s, c, 'hazard', ev);
    expect(s.status.spinRemaining).toBe(c.hitSpinSeconds);
    expect(ev[0]).toEqual({ type: 'hit', kind: 'hazard', spun: true, coinsLost: 0 });
  });

  it('one coin: lost, and the kart spins', () => {
    const s = createKartState({ racerId: 'x', coins: 1 });
    applyHit(s, c, 'item', []);
    expect(s.coins).toBe(0);
    expect(s.status.spinRemaining).toBe(c.hitSpinSeconds);
  });
});

describe('timers', () => {
  it('slowedTo and chargeMultiplier reset when their timers end', () => {
    const s = createKartState({ racerId: 'x' });
    s.status.slowedTo = 0.6; s.status.slowRemaining = DT / 2;
    s.drift.chargeMultiplier = 2; s.drift.chargeMultiplierRemaining = DT / 2;
    tickTimers(s, DT);
    expect(s.status.slowedTo).toBe(1);
    expect(s.drift.chargeMultiplier).toBe(1);
  });
});

describe('stepKart', () => {
  it('a spinning kart ignores input and bleeds speed', () => {
    const track = makeOval();
    const { p, tan } = track.centre(0.05);
    const s = createKartState({ racerId: 'x', position: [p[0], 0, p[2]], heading: headingOf(tan), t: 0.05 });
    s.speed = 20; s.status.spinRemaining = 1;
    const h0 = s.heading;
    for (let i = 0; i < 60; i++) stepKart(s, { ...NEUTRAL_INPUT, throttle: 1, steer: 1, drift: true }, track, c, DT);
    expect(s.speed).toBeLessThan(20);
    expect(s.heading).toBe(h0);
    expect(s.drift.phase).toBe('idle');
    for (let i = 0; i < 60; i++) stepKart(s, { ...NEUTRAL_INPUT, throttle: 1 }, track, c, DT);
    expect(s.status.spinRemaining).toBe(0);
    expect(s.speed).toBe(0); // exactly 0 on the tick the spin ends
  });

  it('track gripScale scales the slide', () => {
    const slide = (gripScale: number) => {
      const track = makeOval({ gripScale });
      const { p, tan } = track.centre(0.05);
      const s = createKartState({ racerId: 'x', position: [p[0], 0, p[2]], heading: headingOf(tan), t: 0.05 });
      s.speed = 25;
      for (let i = 0; i < 60; i++) stepKart(s, { ...NEUTRAL_INPUT, throttle: 1, steer: 1 }, track, c, DT);
      return Math.abs(s.lateralVelocity);
    };
    expect(slide(0.5)).toBeGreaterThan(slide(1) * 1.5);
  });

  it('start boost only inside the window around the 2', () => {
    const s = createKartState({ racerId: 'x' });
    const half = c.startBoostWindowSeconds / 2;
    expect(tryStartBoost(s, c, 0.2, [])).toBe(false); // on the GO: too late
    expect(tryStartBoost(s, c, c.startBoostCentreSeconds + half + 0.05, [])).toBe(false); // too early
    expect(tryStartBoost(s, c, c.startBoostCentreSeconds, [])).toBe(true);
    expect(s.boost.source).toBe('start');
  });
});
