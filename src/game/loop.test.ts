import { describe, expect, it } from 'vitest';
import { SIM_DT, SIM_HZ } from '../kart-controller/step.ts';
import { Accumulator, MAX_STEPS } from './loop.ts';
import { formatTime, hudNumbers } from './hud.ts';
import { CAM, chaseYaw, easedSpeed, fovFor, idealPose, smoothTo, travelYaw } from './camera.ts';
import { buildTrack } from '../track-builder/track.ts';
import { RaceManager } from '../race-manager/race.ts';
import { HARBOUR_LOOP } from '../race-manager/__tests__/fixtures.ts';
import type { Vec3 } from '../kart-controller/types.ts';

const wrapTo = (a: number) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

describe('accumulator', () => {
  it('runs one step per tick of frame time and keeps the remainder as alpha', () => {
    const a = new Accumulator();
    expect(a.steps(SIM_DT)).toBe(1);
    expect(a.alpha).toBeCloseTo(0, 6);
    // a 60 fps frame is two sim ticks exactly
    expect(a.steps(2 * SIM_DT)).toBe(2);
    // half a tick: no step yet, alpha halfway
    expect(a.steps(SIM_DT / 2)).toBe(0);
    expect(a.alpha).toBeCloseTo(0.5, 6);
    expect(a.steps(SIM_DT / 2)).toBe(1);
  });

  it('never runs more than MAX_STEPS after a stall, and does not owe the dropped time', () => {
    const a = new Accumulator();
    expect(a.steps(5)).toBe(MAX_STEPS); // a 5 second stall
    expect(a.dropped).toBe(5 * SIM_HZ - MAX_STEPS);
    expect(a.steps(SIM_DT)).toBe(1); // back to normal at once
  });

  it('reset throws the owed time away', () => {
    const a = new Accumulator();
    a.steps(SIM_DT * 0.75);
    a.reset();
    expect(a.alpha).toBe(0);
    expect(a.steps(SIM_DT * 0.5)).toBe(0);
  });
});

describe('chase camera', () => {
  it('sits behind the kart and looks ahead of it; look-back swaps both', () => {
    const p = idealPose([0, 0, 0], 0, 0, false); // heading 0 = facing +Z
    expect(p.position[2]).toBeCloseTo(-CAM.back);
    expect(p.position[1]).toBeCloseTo(CAM.height);
    expect(p.target[2]).toBeCloseTo(CAM.aheadLook);
    const back = idealPose([0, 0, 0], 0, 0, true);
    expect(back.position[2]).toBeCloseTo(CAM.back);
    expect(back.target[2]).toBeCloseTo(-CAM.aheadLook);
  });

  it('the camera yaw chases the direction of travel slowly, and follows the nose at a standstill', () => {
    expect(travelYaw(0.5, 0, 3, true)).toBeCloseTo(0.5); // stopped: the nose
    expect(travelYaw(0.5, 20, 5, false)).toBeCloseTo(0.5); // a bump's slide is ignored
    const sliding = travelYaw(0, 20, 5, true); // drifting with a rightward slide: travel is right of the nose
    expect(sliding).toBeGreaterThan(0.2);
    expect(sliding).toBeLessThan(0.3);
    let yaw = 0;
    for (let i = 0; i < 60; i++) yaw = chaseYaw(yaw, 1, CAM.yawLag, 1 / 60);
    expect(yaw).toBeCloseTo(1 - Math.exp(-CAM.yawLag), 2); // one second: 92 % of the way
    // wraps: chasing across ±π takes the short way
    expect(chaseYaw(3.0, -3.0, 100, 1)).toBeCloseTo(3.0 + wrapTo(-6.0), 1);
  });

  it('the speed the camera reads is eased, so a bump does not pump the view', () => {
    let v = 20;
    v = easedSpeed(v, 15, 1 / 60); // a 5 m/s drop in one frame
    expect(20 - v).toBeLessThan(0.2);
    for (let i = 0; i < 240; i++) v = easedSpeed(v, 15, 1 / 60);
    expect(v).toBeCloseTo(15, 1);
  });

  it('field of view widens with speed and caps at top speed', () => {
    expect(fovFor(0)).toBe(CAM.fov);
    expect(fovFor(CAM.topSpeed / 2)).toBeCloseTo(CAM.fov + CAM.fovAtSpeed / 2);
    expect(fovFor(CAM.topSpeed * 3)).toBe(CAM.fov + CAM.fovAtSpeed);
  });

  it('backs off with speed and smoothing converges', () => {
    const slow = idealPose([0, 0, 0], 0, 0, false);
    const fast = idealPose([0, 0, 0], 0, CAM.topSpeed, false);
    expect(Math.abs(fast.position[2])).toBeGreaterThan(Math.abs(slow.position[2]));
    const at: Vec3 = [0, 0, 0];
    for (let i = 0; i < 120; i++) smoothTo(at, [10, 2, -4], CAM.lag, 1 / 60);
    expect(at[0]).toBeCloseTo(10, 1);
    expect(at[2]).toBeCloseTo(-4, 1);
  });
});

describe('hud', () => {
  it('counts down, then shows lap, place and speed', () => {
    const track = buildTrack(HARBOUR_LOOP);
    const rm = new RaceManager(track, {
      mode: 'quick', trackId: track.id, speedClass: 150, seed: 1,
      racers: [{ racerId: 'pip', archetype: 'medium', isPlayer: true }, { racerId: 'momo', archetype: 'medium' }],
    });
    const tiers = [250, 550, 850];
    const p = rm.state.karts[0];
    expect(hudNumbers(rm.state, p, tiers).banner).toBe('3');
    while (rm.state.phase === 'countdown') rm.step(rm.state.karts.map(() => ({ steer: 0, throttle: 0, brake: 0, drift: false, item: false, lookBack: false, horn: false })));
    p.speed = 20;
    p.lap = 2;
    p.rank = 1;
    const h = hudNumbers(rm.state, p, tiers);
    expect(h.banner).toBe('');
    expect(h.lap).toBe('LAP 2/3');
    expect(h.position).toBe('1st');
    expect(h.speed).toBe('72 km/h');
    expect(h.drift).toBe('—');
    p.drift.active = true; p.drift.tier = 2; p.drift.charge = 600;
    expect(hudNumbers(rm.state, p, tiers).drift).toBe('★★ 600');
  });

  it('formats race time', () => {
    expect(formatTime(-1)).toBe('0:00.00');
    expect(formatTime(9.5)).toBe('0:09.50');
    expect(formatTime(75.25)).toBe('1:15.25');
  });
});
