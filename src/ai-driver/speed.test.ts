import { describe, expect, it } from 'vitest';
import { targetSpeed } from '../kart-controller/speed.ts';
import { driftSpeedScale } from '../kart-controller/steer.ts';
import { NEUTRAL_INPUT } from '../kart-controller/types.ts';
import { RACE } from '../race-manager/constants.ts';
import { buildTrack } from '../track-builder/track.ts';
import { PROFILES } from './constants.ts';
import { applyThrottle, cornerSpeed, decideSpeed, reachableYaw, type SpeedDecision } from './speed.ts';
import { OVAL } from './__tests__/fixtures.ts';
import { MEDIUM_150, fakeLine, kartAt, memory } from './__tests__/units.ts';

const track = buildTrack(OVAL);
const c = MEDIUM_150;

describe('speed', () => {
  it('corner speed: infinite on a straight, falls with curvature, higher when drifting, and the steering law agrees', () => {
    expect(cornerSpeed(0, 25, c, 1, false)).toBe(Infinity);
    const gentle = cornerSpeed(1 / 60, 25, c, 1, false);
    const tight = cornerSpeed(1 / 15, 25, c, 1, false);
    expect(gentle).toBeGreaterThan(tight);
    // a drift at full inward stick turns at steerRate × driftSteerMax × driftSpeedScale (tighter below V):
    // at its corner speed that yaw equals curvature × speed, and it holds a bend faster than grip does
    const drift = cornerSpeed(1 / 15, 25, c, 1, true);
    expect(c.steerRate * c.driftSteerMax * driftSpeedScale(drift, 25, c)).toBeCloseTo(drift / 15, 6);
    expect(drift).toBeGreaterThan(tight);
    // at the corner speed, full lock yaw equals curvature × speed
    expect(reachableYaw(tight, 25, c)).toBeCloseTo(tight / 15, 3);
  });

  it('target = power × pace × legal on a straight, capped by the corner speed on a bend', () => {
    const s = kartAt(track, 0.125, 0, 20);
    const m = memory(PROFILES.hard);
    m.powerCap = 0.9; m.fieldPace = 0.95;
    const out: SpeedDecision = { legal: 0, target: 0, corner: 0 };
    decideSpeed(s, c, m, fakeLine(0), false, out);
    expect(out.legal).toBeCloseTo(targetSpeed(s, c).target);
    expect(out.target).toBeCloseTo(0.9 * 0.95 * out.legal);
    decideSpeed(s, c, m, fakeLine(1.4), false, out);
    expect(out.target).toBeLessThan(0.9 * 0.95 * out.legal);
    expect(out.target).toBeGreaterThanOrEqual(4);
    // a planned drift is judged by the drift yaw, not grip
    decideSpeed(s, c, m, fakeLine(1.4), true, out);
    const kappa = 1.4 / 24;
    expect(out.target).toBeCloseTo(Math.min(0.9 * 0.95 * out.legal, cornerSpeed(kappa, targetSpeed(s, c).base, c, 0.55 + 0.35 * m.skill, true)), 6);
    expect(out.corner).toBeGreaterThan(cornerSpeed(kappa, targetSpeed(s, c).base, c, 0.55 + 0.35 * m.skill, false));
  });

  it('throttle: full below target, coast above, brake well above, never idle at a standstill', () => {
    const s = kartAt(track, 0.125, 0, 10);
    const d: SpeedDecision = { legal: 25, target: 20, corner: Infinity };
    const out = { ...NEUTRAL_INPUT };
    applyThrottle(s, d, PROFILES.normal, out);
    expect([out.throttle, out.brake]).toEqual([1, 0]);
    s.speed = 21;
    applyThrottle(s, d, PROFILES.normal, out);
    expect([out.throttle, out.brake]).toEqual([0, 0]);
    s.speed = 20 + PROFILES.normal.brakeAbove + 0.1;
    applyThrottle(s, d, PROFILES.normal, out);
    expect([out.throttle, out.brake]).toEqual([0, 1]);
    s.speed = RACE.stuckSpeed - 0.1;
    applyThrottle(s, { legal: 25, target: 0, corner: 0 }, PROFILES.normal, out);
    expect(out.throttle).toBe(1);
  });
});
