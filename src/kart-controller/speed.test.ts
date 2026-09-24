import { describe, expect, it } from 'vitest';
import { requestBoost } from './boost.ts';
import { makeConstants } from './constants.ts';
import { stepSpeed, targetSpeed } from './speed.ts';
import { createKartState, NEUTRAL_INPUT, type InputState, type KartState } from './types.ts';

const c = makeConstants('medium', 150);
const DT = 1 / 120;
const full: InputState = { ...NEUTRAL_INPUT, throttle: 1 };

function run(s: KartState, input: InputState, seconds: number) {
  for (let i = 0; i < Math.round(seconds / DT); i++) stepSpeed(s, input, targetSpeed(s, c).target, c, DT);
}

describe('speed', () => {
  it('reaches V from rest in about topSpeed/accel seconds', () => {
    const s = createKartState({ racerId: 'x' });
    run(s, full, 25 / 12 + 0.05);
    expect(s.speed).toBeCloseTo(25, 3);
  });

  it('accel tapers with speed: a punchy launch, 0 to V no slower than the old flat 12 m/s² (2.08 s)', () => {
    const s = createKartState({ racerId: 'x' });
    stepSpeed(s, full, 25, c, DT);
    const launch = s.speed / DT;
    s.speed = 22.5;
    stepSpeed(s, full, 25, c, DT);
    const late = (s.speed - 22.5) / DT;
    expect(launch).toBeCloseTo(c.accel * c.accelLaunch, 6);
    expect(late).toBeLessThan(launch * 0.6);
    const r = createKartState({ racerId: 'x' });
    let ticks = 0;
    while (r.speed < 25 && ticks < 1000) { stepSpeed(r, full, 25, c, DT); ticks++; }
    expect(ticks * DT).toBeLessThanOrEqual(25 / 12);
    expect(ticks * DT).toBeGreaterThan(1.7);
  });

  it('the brake bites above the cap too (after a boost), at the brake rate', () => {
    const s = createKartState({ racerId: 'x' });
    s.speed = 34;
    for (let i = 0; i < 60; i++) stepSpeed(s, { ...NEUTRAL_INPUT, brake: 1 }, 25, c, DT);
    expect(s.speed).toBeCloseTo(34 - c.brake * 0.5, 6);
  });

  it('coins raise V, capped at coinCap', () => {
    const s = createKartState({ racerId: 'x', coins: 10 });
    expect(targetSpeed(s, c).base).toBeCloseTo(25 * (1 + 10 * 0.0066));
    s.coins = 40;
    expect(targetSpeed(s, c).base).toBeCloseTo(25 * (1 + 10 * 0.0066));
  });

  it('boost tails off at overSpeedDecel instead of stopping dead', () => {
    const s = createKartState({ racerId: 'x' });
    s.speed = 25 * 1.4;
    run(s, full, 0.5);
    expect(s.speed).toBeCloseTo(35 - 10 * 0.5, 1);
    run(s, full, 2);
    expect(s.speed).toBeCloseTo(25, 3);
  });

  it('brake at rest reverses to reverseFraction × V', () => {
    const s = createKartState({ racerId: 'x' });
    run(s, { ...NEUTRAL_INPUT, brake: 1 }, 2);
    expect(s.speed).toBeCloseTo(-0.35 * 25, 3);
  });

  it('coasts to zero with no input', () => {
    const s = createKartState({ racerId: 'x' });
    s.speed = 10;
    run(s, NEUTRAL_INPUT, 3);
    expect(s.speed).toBe(0);
  });

  it('mud caps to 0.6 V and bleeds there over ~0.4 s', () => {
    const s = createKartState({ racerId: 'x' });
    s.speed = 25; s.surface = 'mud';
    expect(targetSpeed(s, c).target).toBeCloseTo(15);
    run(s, full, 0.2);
    expect(s.speed).toBeGreaterThan(20); // not one tick
    run(s, full, 1);
    expect(s.speed).toBeCloseTo(15, 3);
    s.surface = 'dirt';
    expect(targetSpeed(s, c).target).toBeCloseTo(17.5);
  });

  it('a live boost ignores the surface cap', () => {
    const s = createKartState({ racerId: 'x' });
    s.speed = 25; s.surface = 'mud';
    requestBoost(s, 'item', 1.4, 1.5, []);
    const t = targetSpeed(s, c);
    expect(t.target).toBeCloseTo(35);
    expect(t.effective).toBeCloseTo(25);
  });

  it('airborne ignores the surface cap', () => {
    const s = createKartState({ racerId: 'x' });
    s.speed = 25; s.surface = 'mud'; s.grounded = false;
    expect(targetSpeed(s, c).target).toBeCloseTo(25);
  });

  it('slowedTo caps below the surface cap and the boost', () => {
    const s = createKartState({ racerId: 'x' });
    s.status.slowedTo = 0.6; s.status.slowRemaining = 3;
    requestBoost(s, 'item', 1.4, 1.5, []);
    expect(targetSpeed(s, c).target).toBeCloseTo(15);
  });
});
