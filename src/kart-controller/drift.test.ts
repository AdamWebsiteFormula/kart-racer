import { describe, expect, it } from 'vitest';
import { makeConstants } from './constants.ts';
import { stepDrift, tierFor } from './drift.ts';
import { createKartState, NEUTRAL_INPUT, type InputState, type KartEvent, type KartState } from './types.ts';

const c = makeConstants('medium', 150);
const DT = 1 / 120;
const V = 25;
const hold: InputState = { ...NEUTRAL_INPUT, throttle: 1, steer: 1, drift: true };

/** A kart already locked into a right drift at full speed. */
function drifting(): KartState {
  const s = createKartState({ racerId: 'x' });
  s.speed = 25;
  s.drift.phase = 'drifting'; s.drift.active = true; s.drift.direction = 1;
  s.prevDrift = true;
  return s;
}

/** Ticks until a driftTierUp with `tier` fires, or -1. */
function ticksToTier(s: KartState, input: InputState, tier: number, mult = 1): number {
  s.drift.chargeMultiplier = mult;
  s.drift.chargeMultiplierRemaining = mult === 1 ? 0 : 10;
  for (let i = 1; i <= 1200; i++) {
    const ev: KartEvent[] = [];
    stepDrift(s, input, c, V, DT, ev);
    if (ev.some((e) => e.type === 'driftTierUp' && e.tier === tier)) return i;
  }
  return -1;
}

describe('drift', () => {
  it('tierFor counts thresholds and honours a max', () => {
    expect(tierFor(0, c.driftTiers)).toBe(0);
    expect(tierFor(250, c.driftTiers)).toBe(1);
    expect(tierFor(900, c.driftTiers)).toBe(3);
    expect(tierFor(900, c.driftTiers, 1)).toBe(1);
  });

  it('tiers fire at 0.83 / 1.83 / 2.83 s with full stick (± 1 tick)', () => {
    const s = drifting();
    const t1 = ticksToTier(s, hold, 1);
    const t2 = ticksToTier(s, hold, 2);
    const t3 = ticksToTier(s, hold, 3);
    expect(Math.abs(t1 - 100)).toBeLessThanOrEqual(1);
    expect(Math.abs(t1 + t2 - 220)).toBeLessThanOrEqual(1);
    expect(Math.abs(t1 + t2 + t3 - 340)).toBeLessThanOrEqual(1);
  });

  // the whole stick range steers a drift (24 Sept 2026): centred is the medium line and charges at the full rate;
  // pushed out, the wide line, charges at the neutral rate
  it('the stick pushed out of the drift charges slower; centred charges full', () => {
    const t1 = ticksToTier(drifting(), { ...hold, steer: -1 }, 1);
    expect(Math.abs(t1 - 250)).toBeLessThanOrEqual(1);
    const t0 = ticksToTier(drifting(), { ...hold, steer: 0 }, 1);
    expect(Math.abs(t0 - 100)).toBeLessThanOrEqual(1);
  });

  it('chargeMultiplier 2 halves the time to tier 1', () => {
    const s = drifting();
    const t1 = ticksToTier(s, hold, 1, 2);
    expect(Math.abs(t1 - 50)).toBeLessThanOrEqual(1);
  });

  it('release grants the tier boost; tier 0 grants nothing', () => {
    const s = drifting();
    ticksToTier(s, hold, 2);
    const ev: KartEvent[] = [];
    stepDrift(s, { ...hold, drift: false }, c, V, DT, ev);
    expect(s.boost.source).toBe('drift');
    expect(s.boost.remaining).toBe(c.boostSeconds[1]);
    expect(s.boost.multiplier).toBe(c.boostMultiplier);
    expect(s.drift.phase).toBe('idle');

    const s0 = drifting();
    stepDrift(s0, { ...hold, drift: false }, c, V, DT, ev);
    expect(s0.boost.source).toBe('none');
  });

  it('press while grounded and fast enough hops; too slow does nothing', () => {
    const s = createKartState({ racerId: 'x' });
    s.speed = 25;
    const ev: KartEvent[] = [];
    stepDrift(s, hold, c, V, DT, ev);
    expect(s.drift.phase).toBe('hopping');
    expect(s.verticalVelocity).toBe(c.hopVelocity);
    expect(ev[0]).toEqual({ type: 'hop' });

    const slow = createKartState({ racerId: 'x' });
    slow.speed = 5;
    stepDrift(slow, hold, c, V, DT, []);
    expect(slow.drift.phase).toBe('idle');
  });

  it('landing with stick and button held locks the drift direction', () => {
    const s = createKartState({ racerId: 'x' });
    s.speed = 25;
    stepDrift(s, { ...hold, steer: -1 }, c, V, DT, []);
    s.grounded = true; // ground step would do this
    const ev: KartEvent[] = [];
    stepDrift(s, { ...hold, steer: -1 }, c, V, DT, ev);
    expect(s.drift.phase).toBe('drifting');
    expect(s.drift.direction).toBe(-1);
    expect(ev[0]).toEqual({ type: 'driftStart', direction: -1 });
  });

  it('landing without steer wastes the hop', () => {
    const s = createKartState({ racerId: 'x' });
    s.speed = 25;
    stepDrift(s, hold, c, V, DT, []);
    s.grounded = true;
    stepDrift(s, { ...hold, steer: 0 }, c, V, DT, []);
    expect(s.drift.phase).toBe('idle');
  });

  it('cancels with no boost when too slow', () => {
    const s = drifting();
    ticksToTier(s, hold, 2);
    s.speed = 5;
    stepDrift(s, hold, c, V, DT, []);
    expect(s.drift.phase).toBe('idle');
    expect(s.boost.source).toBe('none');
  });

  it('release on the same tick as a cancel condition grants no boost', () => {
    const s = drifting();
    ticksToTier(s, hold, 2);
    s.speed = 5; // below driftKeepSpeed × V
    stepDrift(s, { ...hold, drift: false }, c, V, DT, []);
    expect(s.drift.phase).toBe('idle');
    expect(s.boost.source).toBe('none');
  });

  it('cancels when airborne too long', () => {
    const s = drifting();
    s.grounded = false;
    s.airborne.seconds = c.driftAirCancelSeconds + 0.01;
    stepDrift(s, hold, c, V, DT, []);
    expect(s.drift.phase).toBe('idle');
  });

  it('a hold is not a press: no re-hop while the button stays down', () => {
    const s = createKartState({ racerId: 'x' });
    s.speed = 25; s.prevDrift = true;
    const ev: KartEvent[] = [];
    stepDrift(s, { ...hold, steer: 0 }, c, V, DT, ev);
    expect(s.drift.phase).toBe('idle');
    // held with the stick over it is a late drift (24 Sept 2026): drifting at once, still no hop
    stepDrift(s, hold, c, V, DT, ev);
    expect(s.drift.phase).toBe('drifting');
    expect(ev).toEqual([{ type: 'driftStart', direction: 1 }]);
  });

  it('drift press while airborne from a jump queues a trick', () => {
    const s = createKartState({ racerId: 'x' });
    s.speed = 25; s.grounded = false; s.airborne.fromJumpId = 'j1';
    const events: KartEvent[] = [];
    stepDrift(s, hold, c, V, DT, events);
    expect(s.airborne.trickQueued).toBe(true);
    expect(s.drift.phase).toBe('idle');
    // the trick is announced the moment it is done (its sound), once per jump
    expect(events).toEqual([{ type: 'trick' }]);
    s.prevDrift = false;
    stepDrift(s, hold, c, V, DT, events);
    expect(events).toEqual([{ type: 'trick' }]);
  });

  it('maxDriftTier caps the tier', () => {
    const s = drifting();
    for (let i = 0; i < 600; i++) stepDrift(s, hold, c, V, DT, [], { maxDriftTier: 1 });
    expect(s.drift.tier).toBe(1);
  });
});
