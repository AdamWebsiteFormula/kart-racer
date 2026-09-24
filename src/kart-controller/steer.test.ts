import { describe, expect, it } from 'vitest';
import { gripFor, makeConstants } from './constants.ts';
import { driftStickFor, driftTurnTarget, stepSteer, yawRate } from './steer.ts';
import { createKartState, NEUTRAL_INPUT, type InputState, type Surface } from './types.ts';

const c = makeConstants('medium', 150);
const DT = 1 / 120;
const right: InputState = { ...NEUTRAL_INPUT, throttle: 1, steer: 1 };

describe('steer', () => {
  it('turn radius at top speed is about 30 m', () => {
    const s = createKartState({ racerId: 'x' });
    s.speed = 25;
    const r = 25 / yawRate(s, right, c, 25);
    expect(r).toBeGreaterThan(27);
    expect(r).toBeLessThan(33);
  });

  it('no steer when stopped, tight pivot at low speed', () => {
    const s = createKartState({ racerId: 'x' });
    expect(yawRate(s, right, c, 25)).toBe(0);
    s.speed = 4;
    const r = 4 / yawRate(s, right, c, 25);
    expect(r).toBeLessThan(3);
  });

  it('reverse flips the steer sign', () => {
    const s = createKartState({ racerId: 'x' });
    s.speed = -5;
    expect(yawRate(s, right, c, 25)).toBeLessThan(0);
  });

  it('turning right at speed slides outward (left) before grip damps it', () => {
    const s = createKartState({ racerId: 'x' });
    s.speed = 25;
    stepSteer(s, right, c, 25, 0, DT);
    expect(s.lateralVelocity).toBeLessThan(0);
    expect(s.heading).toBeGreaterThan(0);
  });

  function slideAfterTurn(surface: Surface): number {
    const s = createKartState({ racerId: 'x' });
    s.speed = 25;
    // steady-state outward slide after one second of full lock
    for (let i = 0; i < 120; i++) stepSteer(s, right, c, 25, gripFor(c, surface), DT);
    return Math.abs(s.lateralVelocity);
  }

  it('ice slides further than road; dirt and mud equal road', () => {
    const road = slideAfterTurn('road');
    expect(slideAfterTurn('ice')).toBeGreaterThan(road * 2);
    expect(slideAfterTurn('dirt')).toBe(road);
    expect(slideAfterTurn('mud')).toBe(road);
  });

  it('airborne, the wheel barely turns the kart (the hop goes straight; the stick at landing sets the drift)', () => {
    const s = createKartState({ racerId: 'x' });
    s.speed = 20;
    const onGround = yawRate(s, right, c, 25);
    s.grounded = false;
    expect(yawRate(s, right, c, 25)).toBeCloseTo(onGround * c.airSteer);
  });

  it('drift yaw is outward only and scales with the lagged stick (drift.yawK)', () => {
    const s = createKartState({ racerId: 'x' });
    s.speed = 25; s.drift.phase = 'drifting'; s.drift.direction = 1;
    s.drift.yawK = 0;
    expect(yawRate(s, { ...right, steer: -1 }, c, 25)).toBeCloseTo(c.steerRate * c.driftSteerMin);
    s.drift.yawK = 1;
    expect(yawRate(s, right, c, 25)).toBeCloseTo(c.steerRate * c.driftSteerMax);
    // the drift begins loose and tightens: yawK chases the inward stick over driftYawLag
    s.drift.yawK = 0;
    const dt = 1 / 120;
    for (let i = 0; i < Math.round(c.driftYawLag / dt); i++) stepSteer(s, right, c, 25, c.gripRoad, dt);
    expect(s.drift.yawK).toBeCloseTo(1 - Math.exp(-1), 2);
    // and lets go again on counter-steer
    for (let i = 0; i < 240; i++) stepSteer(s, { ...right, steer: -1 }, c, 25, c.gripRoad, dt);
    expect(s.drift.yawK).toBeLessThan(0.01);
  });

  // audit 24 Sept 2026: a centred stick drew the widest drift line (99 m at top speed)
  it('the whole stick range counts: full out wide, centred medium, full in tight', () => {
    expect(driftTurnTarget(-1, 1)).toBe(0);
    expect(driftTurnTarget(0, 1)).toBe(0.5);
    expect(driftTurnTarget(1, 1)).toBe(1);
    expect(driftTurnTarget(1, -1)).toBe(0);
    expect(driftStickFor(driftTurnTarget(0.3, 1))).toBeCloseTo(0.3, 9);
    const s = createKartState({ racerId: 'x' });
    s.speed = 25; s.drift.phase = 'drifting'; s.drift.direction = 1;
    const dt = 1 / 120;
    for (let i = 0; i < 240; i++) stepSteer(s, { ...right, steer: 0 }, c, 25, c.gripDrift, dt);
    expect(s.drift.yawK).toBeCloseTo(0.5, 2);
    s.speed = 25; // stepSteer alone bleeds speed into the slide
    expect(yawRate(s, NEUTRAL_INPUT, c, 25)).toBeCloseTo(c.steerRate * (c.driftSteerMin + c.driftSteerMax) / 2, 2);
  });

  it('a full-inward drift is never wider than steering at full lock at the same speed (was at 70 % of V)', () => {
    for (const frac of [0.35, 0.5, 0.7, 0.9, 1]) {
      const s = createKartState({ racerId: 'x' });
      s.speed = 25 * frac;
      const grip = yawRate(s, right, c, 25);
      s.drift.phase = 'drifting'; s.drift.direction = 1; s.drift.yawK = 1;
      expect(yawRate(s, NEUTRAL_INPUT, c, 25)).toBeGreaterThanOrEqual(grip - 1e-9);
    }
  });
});
