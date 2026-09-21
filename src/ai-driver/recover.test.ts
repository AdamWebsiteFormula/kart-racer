import { describe, expect, it } from 'vitest';
import { SIM_DT } from '../kart-controller/step.ts';
import { NEUTRAL_INPUT } from '../kart-controller/types.ts';
import { buildTrack } from '../track-builder/track.ts';
import { AI } from './constants.ts';
import { stepRecovery } from './recover.ts';
import { OVAL } from './__tests__/fixtures.ts';
import { kartAt, memory } from './__tests__/units.ts';

const track = buildTrack(OVAL);

describe('recovery', () => {
  it('a stopped kart reverses after stuckSeconds, steering against the error, then cools down', () => {
    const s = kartAt(track, 0.1, 0, 0);
    const m = memory();
    m.prevErr = 0.4;
    const out = { ...NEUTRAL_INPUT, throttle: 1, steer: 0.8 };
    const ticks = Math.round(AI.recover.stuckSeconds / SIM_DT);
    for (let i = 0; i < ticks - 1; i++) expect(stepRecovery(s, m, out, SIM_DT)).toBe(false);
    expect(stepRecovery(s, m, out, SIM_DT)).toBe(true);
    expect([out.throttle, out.brake, out.steer]).toEqual([0, 1, -1]);
    expect(m.recovery).toBe('reverse');
    const rev = Math.round(AI.recover.reverseSeconds / SIM_DT);
    for (let i = 0; i < rev - 1; i++) expect(stepRecovery(s, m, out, SIM_DT)).toBe(true);
    expect(stepRecovery(s, m, out, SIM_DT)).toBe(true);
    expect(m.recovery).toBe('cooldown');
    expect(stepRecovery(s, m, out, SIM_DT)).toBe(false);
    const cool = Math.round(AI.recover.cooldownSeconds / SIM_DT);
    for (let i = 0; i < cool; i++) stepRecovery(s, m, out, SIM_DT);
    expect(m.recovery).toBe('none');
  });

  it('spinning, airborne, frozen or moving karts are not stuck', () => {
    const m = memory();
    const out = { ...NEUTRAL_INPUT };
    const s = kartAt(track, 0.1, 0, 0);
    s.status.spinRemaining = 0.5;
    stepRecovery(s, m, out, SIM_DT);
    expect(m.stuckSeconds).toBe(0);
    s.status.spinRemaining = 0; s.grounded = false;
    stepRecovery(s, m, out, SIM_DT);
    expect(m.stuckSeconds).toBe(0);
    s.grounded = true; s.status.intangibleRemaining = 0.3;
    stepRecovery(s, m, out, SIM_DT);
    expect(m.stuckSeconds).toBe(0);
    s.status.intangibleRemaining = 0; s.speed = 3;
    stepRecovery(s, m, out, SIM_DT);
    expect(m.stuckSeconds).toBe(0);
    s.speed = 0;
    stepRecovery(s, m, out, SIM_DT);
    expect(m.stuckSeconds).toBeGreaterThan(0);
  });
});
