// The racer's own flourish in a trick (driverAnim.ts FLOURISH; second MKW gap review, 28 Sept 2026, item 4):
// each racer's own, over the kart's stunt (stunt.ts), the hands off the wheel for it and back on before the landing.
import { describe, expect, it } from 'vitest';
import { KartAnim } from './anim.ts';
import { makeConstants } from './constants.ts';
import { DRIVER_ANIM, DriverAnim, FLOURISH, flourishArms, flourishWeight, newDriverPose, type ArmPose } from './driverAnim.ts';
import { SIM_DT } from './step.ts';
import { createKartState, NEUTRAL_INPUT } from './types.ts';

const c = makeConstants('medium', 150);
const arm = (): ArmPose => ({ wheel: 1, upper: [0, -1, 0], fore: [0, 0, 1] });

describe('each racer\'s own flourish (MKW: "a quick animation unique to them")', () => {
  it('all eight have one, in character, and they are not all the same', () => {
    const ids = ['pip', 'momo', 'nova', 'juniper', 'otto', 'sprocket', 'boulder', 'gus'];
    for (const id of ids) expect(FLOURISH[id], id).toBeDefined();
    expect(new Set(ids.map((id) => FLOURISH[id])).size).toBe(ids.length);
  });

  it('a fist up or a wave keeps the other hand on the wheel; wings, a star, a flex and a robot\'s arms take both', () => {
    for (const [kind, both] of [['fist', false], ['wave', false], ['pump', false], ['wings', true], ['star', true], ['flex', true], ['robot', true], ['raise', true]] as const) {
      const R = arm(), L = arm();
      flourishArms(kind, 0.2, R, L);
      expect(R.wheel, kind).toBe(0);
      expect(L.wheel, kind).toBe(both ? 0 : 1);
      // the arm that leaves points up or out, never down into the kart
      expect(R.upper[1] + R.fore[1], kind).toBeGreaterThan(0);
    }
  });

  it('off the wheel early in the stunt, back on it before the stunt ends (so, before the wheels touch)', () => {
    expect(flourishWeight(0)).toBe(0);
    expect(flourishWeight(0.5)).toBe(1);
    expect(flourishWeight(DRIVER_ANIM.trickBack[1])).toBe(0);
    expect(flourishWeight(1)).toBe(0);
    expect(flourishWeight(-1)).toBe(0);
  });
});

describe('the flourish on a racer in a trick', () => {
  it('the arms leave the wheel mid-air and hold it again as the kart lands; the head lifts, the body leans back', () => {
    const anim = new KartAnim(c), driver = new DriverAnim(), s = createKartState({ racerId: 'nova' }), pose = newDriverPose();
    s.speed = 20;
    let most = 0, landedWheel = -1, headUp = 0, leanBack = 0;
    for (let i = 0; i < 200; i++) {
      if (i === 10) { s.grounded = false; s.verticalVelocity = 6; }
      if (!s.grounded) {
        s.verticalVelocity -= c.gravity * SIM_DT;
        s.position[1] += s.verticalVelocity * SIM_DT;
        if (s.position[1] <= 0) { s.position[1] = 0; s.verticalVelocity = 0; s.grounded = true; s.airborne.trickQueued = false; }
        else if (i >= 11) s.airborne.trickQueued = true;
      }
      s.position[2] += s.speed * SIM_DT;
      anim.tick(s, NEUTRAL_INPUT, SIM_DT);
      driver.tick(s, NEUTRAL_INPUT, SIM_DT, anim);
      driver.pose(1, false, pose);
      most = Math.max(most, 1 - Math.min(pose.armR.wheel, pose.armL.wheel));
      headUp = Math.min(headUp, pose.headPitch);
      leanBack = Math.min(leanBack, pose.spinePitch);
      if (s.grounded && i > 10 && landedWheel < 0) landedWheel = Math.min(pose.armR.wheel, pose.armL.wheel);
    }
    expect(most).toBeGreaterThan(0.9);
    expect(landedWheel).toBeGreaterThan(0.85);
    expect(headUp).toBeLessThan(-0.1);
    expect(leanBack).toBeLessThan(-0.05);
  });
});
