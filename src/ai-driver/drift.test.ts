import { describe, expect, it } from 'vitest';
import { SIM_DT } from '../kart-controller/step.ts';
import { NEUTRAL_INPUT } from '../kart-controller/types.ts';
import { buildTrack } from '../track-builder/track.ts';
import { AI, PROFILES } from './constants.ts';
import { reachableTier, stepDriftDecision, stepTrick } from './drift.ts';
import { OVAL } from './__tests__/fixtures.ts';
import { MEDIUM_150, fakeLine, kartAt, memory } from './__tests__/units.ts';

const track = buildTrack(OVAL);
const c = MEDIUM_150;
const bend = { ...fakeLine(0.9, 1.1), probeNear: 20, kappaShort: 0.06 }; // a tight bend, already under the nose

describe('drift decision', () => {
  it('hops on a sustained bend at speed when the roll passes; declines wait a cooldown', () => {
    const s = kartAt(track, 0.2, 0, 22);
    const m = memory(PROFILES.hard, { driftUse: 1 });
    const out = { ...NEUTRAL_INPUT, steer: 0.3 };
    stepDriftDecision(s, c, m, PROFILES.hard, bend, 25, out, SIM_DT);
    expect(out.drift).toBe(true);
    expect(out.steer).toBe(1);
    expect(m.driftDir).toBe(1);
    const shy = memory(PROFILES.hard, { driftUse: 0 });
    const o2 = { ...NEUTRAL_INPUT };
    stepDriftDecision(s, c, shy, PROFILES.hard, bend, 25, o2, SIM_DT);
    expect(o2.drift).toBe(false);
    expect(shy.driftCooldown).toBeCloseTo(AI.drift.cooldown);
  });

  it('no hop when slow, on a narrow road, near a branch, on a straight, or inside the cooldown', () => {
    const m = memory(PROFILES.hard, { driftUse: 1 });
    const out = { ...NEUTRAL_INPUT };
    const slow = kartAt(track, 0.2, 0, 5);
    stepDriftDecision(slow, c, m, PROFILES.hard, bend, 25, out, SIM_DT);
    expect(out.drift).toBe(false);
    const s = kartAt(track, 0.2, 0, 22);
    stepDriftDecision(s, c, m, PROFILES.hard, { ...bend, narrow: true }, 25, out, SIM_DT);
    expect(out.drift).toBe(false);
    stepDriftDecision(s, c, m, PROFILES.hard, { ...bend, nearBranch: true }, 25, out, SIM_DT);
    expect(out.drift).toBe(false);
    stepDriftDecision(s, c, m, PROFILES.hard, fakeLine(0.05), 25, out, SIM_DT);
    expect(out.drift).toBe(false);
    stepDriftDecision(s, c, m, PROFILES.hard, { ...bend, kappaShort: 0 }, 25, out, SIM_DT);
    expect(out.drift).toBe(false); // the bend is still ahead, not under the nose
    m.driftCooldown = 1;
    stepDriftDecision(s, c, m, PROFILES.hard, bend, 25, out, SIM_DT);
    expect(out.drift).toBe(false);
  });

  it('holds the side through the hop, releases at the target tier, and an aborted drift waits longer', () => {
    const s = kartAt(track, 0.2, 0, 22);
    const m = memory(PROFILES.hard, { driftUse: 1 });
    const out = { ...NEUTRAL_INPUT, steer: -0.5 };
    stepDriftDecision(s, c, m, PROFILES.hard, bend, 25, out, SIM_DT);
    // hop in the air: steer stays pinned even though PD wants the other way
    s.grounded = false; s.drift.phase = 'hopping';
    out.steer = -0.9;
    stepDriftDecision(s, c, m, PROFILES.hard, bend, 25, out, SIM_DT);
    expect([out.drift, out.steer]).toEqual([true, AI.drift.hopCommitStick]);
    // drifting, below the planned tier: keep holding; the stick stays on the drift side
    s.grounded = true; s.drift.phase = 'drifting'; s.drift.tier = 0;
    m.driftHold = AI.drift.hopCommit + 0.1;
    m.prevErr = 0.2; // aim a little further into the bend
    out.steer = -0.9;
    stepDriftDecision(s, c, m, PROFILES.hard, bend, 25, out, SIM_DT);
    expect(out.drift).toBe(true);
    expect(out.steer).toBeGreaterThanOrEqual(0);
    expect(out.steer).toBeLessThanOrEqual(1);
    // a tighter bend asks for more stick than a gentler one
    const o3 = { ...NEUTRAL_INPUT }, o4 = { ...NEUTRAL_INPUT };
    m.prevErr = 0;
    stepDriftDecision(s, c, m, PROFILES.hard, { ...bend, turnNear: 1.6 }, 25, o3, SIM_DT);
    stepDriftDecision(s, c, m, PROFILES.hard, { ...bend, turnNear: 0.6 }, 25, o4, SIM_DT);
    expect(o3.steer).toBeGreaterThanOrEqual(o4.steer);
    // the planned tier reached: release with the short cooldown
    s.drift.tier = m.driftTier;
    stepDriftDecision(s, c, m, PROFILES.hard, bend, 25, out, SIM_DT);
    expect(out.drift).toBe(false);
    expect(m.driftDir).toBe(0);
    expect(m.driftEndReason).toBe('tier');
    expect(m.driftCooldown).toBeCloseTo(AI.drift.cooldown);
    // an aborted hop (controller went idle) waits the long cooldown
    m.driftCooldown = 0;
    s.drift.phase = 'idle'; s.drift.tier = 0;
    stepDriftDecision(s, c, m, PROFILES.hard, bend, 25, out, SIM_DT);
    expect(m.driftDir).toBe(1);
    s.grounded = true; s.drift.phase = 'idle';
    m.driftHold = c.hopSeconds * c.hopLandWindow + 0.1;
    stepDriftDecision(s, c, m, PROFILES.hard, bend, 25, out, SIM_DT);
    expect(out.drift).toBe(false);
    expect(m.driftEndReason).toBe('abort');
    expect(m.driftCooldown).toBeCloseTo(AI.drift.abortCooldown);
  });

  it('reachable tier: a gentle bend is worth nothing, a tight one a tier or more, and the drift lets go at the planned tier', () => {
    const s = kartAt(track, 0.2, 0, 24);
    const gentle = { ...fakeLine(0.02, 0.03), probeNear: 29 }; // near-straight: even the minimum drift yaw swings past it too fast to pay
    expect(reachableTier(s, c, gentle)).toBe(0);
    expect(reachableTier(s, c, bend)).toBeGreaterThanOrEqual(1);
    const m = memory(PROFILES.hard, { driftUse: 1 });
    const out = { ...NEUTRAL_INPUT };
    stepDriftDecision(s, c, m, PROFILES.hard, gentle, 25, out, SIM_DT);
    expect(out.drift).toBe(false);
    stepDriftDecision(s, c, m, PROFILES.hard, bend, 25, out, SIM_DT);
    expect(out.drift).toBe(true);
    expect(m.driftTier).toBeGreaterThanOrEqual(1);
    expect(m.driftTier).toBeLessThanOrEqual(3);
  });

  it('easy aims for tier 1 and lets go there', () => {
    const s = kartAt(track, 0.2, 0, 22);
    const m = memory(PROFILES.easy, { driftUse: 1 });
    const out = { ...NEUTRAL_INPUT };
    stepDriftDecision(s, c, m, PROFILES.easy, bend, 25, out, SIM_DT);
    s.drift.phase = 'drifting'; s.drift.tier = 1; m.driftHold = 1;
    stepDriftDecision(s, c, m, PROFILES.easy, bend, 25, out, SIM_DT);
    expect(out.drift).toBe(false);
  });

  it('trick: one press per jump, on an edge, only when the roll passes', () => {
    const s = kartAt(track, 0.2, 0, 22);
    s.grounded = false; s.airborne.fromJumpId = 'j'; s.prevDrift = true;
    const m = memory(PROFILES.hard);
    const out = { ...NEUTRAL_INPUT, drift: true };
    stepTrick(s, m, { ...PROFILES.hard, trickChance: 1 }, out);
    expect(out.drift).toBe(false); // let go first
    s.prevDrift = false;
    stepTrick(s, m, { ...PROFILES.hard, trickChance: 1 }, out);
    expect(out.drift).toBe(true);
    out.drift = false;
    stepTrick(s, m, { ...PROFILES.hard, trickChance: 1 }, out);
    expect(out.drift).toBe(false); // once
    s.grounded = true; s.airborne.fromJumpId = undefined;
    stepTrick(s, m, PROFILES.hard, out);
    expect(m.trickRolled).toBe(false);
    s.grounded = false; s.airborne.fromJumpId = 'j2';
    stepTrick(s, m, { ...PROFILES.hard, trickChance: 0 }, out);
    expect(out.drift).toBe(false);
  });
});
