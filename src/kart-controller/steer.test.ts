import { describe, expect, it } from 'vitest';
import { gripFor, makeConstants } from './constants.ts';
import { stepSteer, yawRate } from './steer.ts';
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

  it('drift yaw is outward only and scales with the stick', () => {
    const s = createKartState({ racerId: 'x' });
    s.speed = 20; s.drift.phase = 'drifting'; s.drift.direction = 1;
    const away = yawRate(s, { ...right, steer: -1 }, c, 25);
    const into = yawRate(s, right, c, 25);
    expect(away).toBeCloseTo(c.steerRate * c.driftSteerMin);
    expect(into).toBeCloseTo(c.steerRate * c.driftSteerMax);
  });
});
