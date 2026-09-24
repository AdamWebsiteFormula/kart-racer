import { describe, expect, it } from 'vitest';
import { SIM_DT } from '../kart-controller/step.ts';
import { buildTrack } from '../track-builder/track.ts';
import { headingError, steerTo } from './steer.ts';
import { OVAL } from './__tests__/fixtures.ts';
import { kartAt, memory } from './__tests__/units.ts';

const track = buildTrack(OVAL);

describe('steer', () => {
  it('signs: an aim to the right steers right; dead ahead steers straight', () => {
    const s = kartAt(track, 0.12);
    s.position = [0, 0, 0]; s.heading = 0;
    expect(headingError(s, [5, 0, 10])).toBeGreaterThan(0);
    expect(steerTo(s, [5, 0, 10], memory(), 0, 1, 0, SIM_DT)).toBeGreaterThan(0);
    expect(steerTo(s, [-5, 0, 10], memory(), 0, 1, 0, SIM_DT)).toBeLessThan(0);
    expect(Math.abs(steerTo(s, [0, 0, 10], memory(), 0, 1, 0, SIM_DT))).toBeLessThan(1e-9);
  });

  it('converges on a fixed aim without hunting', () => {
    const s = kartAt(track, 0.12);
    s.position = [0, 0, 0]; s.heading = 1.2;
    const m = memory();
    let flips = 0, last = 0;
    for (let i = 0; i < 360; i++) {
      const st = steerTo(s, [0, 0, 100], m, 0, 1, 0, SIM_DT);
      s.heading += st * 2.4 * SIM_DT; // a stand-in for the controller's yaw at low speed
      if (i > 120 && Math.sign(st) !== Math.sign(last) && st !== 0) flips++;
      last = st;
    }
    expect(Math.abs(headingError(s, [0, 0, 100]))).toBeLessThan(0.03);
    expect(flips).toBeLessThanOrEqual(2);
  });

  it('a lane target to the right adds right steer, clamped', () => {
    const s = kartAt(track, 0.12);
    s.position = [0, 0, 0]; s.heading = 0;
    expect(steerTo(s, [0, 0, 10], memory(), 0, 1, 2, SIM_DT)).toBeCloseTo(0.3);
    expect(steerTo(s, [0, 0, 10], memory(), 0, 1, -20, SIM_DT)).toBeCloseTo(-0.6);
  });

  it('airborne off a jump it keeps steering for the landing (the kart has a little air steer); noise is seeded and bounded', () => {
    const s = kartAt(track, 0.12);
    s.grounded = false; s.airborne.fromJumpId = 'j';
    s.position = [0, 0, 0]; s.heading = 0;
    expect(steerTo(s, [5, 0, 10], memory(), 0, 1, 0, SIM_DT)).toBeGreaterThan(0);
    s.grounded = true; s.airborne.fromJumpId = undefined;
    s.position = [0, 0, 0]; s.heading = 0;
    const a = memory(), b = memory();
    const sa = Array.from({ length: 50 }, () => steerTo(s, [0, 0, 10], a, 0.5, 1, 0, SIM_DT));
    const sb = Array.from({ length: 50 }, () => steerTo(s, [0, 0, 10], b, 0.5, 1, 0, SIM_DT));
    expect(sa).toEqual(sb);
    expect(sa.every((v) => Math.abs(v) <= 0.5)).toBe(true);
  });
});
