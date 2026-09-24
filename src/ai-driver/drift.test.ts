import { describe, expect, it } from 'vitest';
import { SIM_DT } from '../kart-controller/step.ts';
import { NEUTRAL_INPUT } from '../kart-controller/types.ts';
import { buildTrack } from '../track-builder/track.ts';
import { AI, PROFILES } from './constants.ts';
import { driftWorthy, reachableTier, stepDriftDecision, stepDriftPlan, stepTrick, swingIn } from './drift.ts';
import { OVAL } from './__tests__/fixtures.ts';
import { MEDIUM_150, fakeLine, kartAt, memory } from './__tests__/units.ts';

const track = buildTrack(OVAL);
const c = MEDIUM_150;
// a 60 m bend turning 1.5 rad (about 40 m radius) that gets tight 10 m ahead: the hop comes now
const bend = { ...fakeLine(0.9, 1.1), probeNear: 20, kappaShort: 0.005, bendStart: 10, bendMetres: 60, bendAngle: 1.5 };
/** A memory whose drift for this bend is planned (stepDriftPlan's roll passed). */
function planned(profile = PROFILES.hard) {
  const m = memory(profile, { driftUse: 1 });
  m.driftPlan = 1;
  return m;
}

describe('drift decision', () => {
  it('decides each bend once on the approach, then hops before the bend gets tight; a declined bend is gripped', () => {
    const s = kartAt(track, 0.2, 0, 22);
    const m = memory(PROFILES.hard, { driftUse: 1 });
    stepDriftPlan(s, c, m, PROFILES.hard, bend);
    expect([m.driftPlan, m.driftPlanSide]).toEqual([1, 1]);
    const out = { ...NEUTRAL_INPUT, steer: 0.3 };
    stepDriftDecision(s, c, m, PROFILES.hard, bend, 25, out, SIM_DT);
    expect(out.drift).toBe(true);
    expect(out.steer).toBe(1);
    expect(m.driftDir).toBe(1);
    const shy = memory(PROFILES.hard, { driftUse: 0 });
    stepDriftPlan(s, c, shy, PROFILES.hard, bend);
    expect(shy.driftPlan).toBe(-1);
    const o2 = { ...NEUTRAL_INPUT };
    stepDriftDecision(s, c, shy, PROFILES.hard, bend, 25, o2, SIM_DT);
    expect(o2.drift).toBe(false);
    // the plan stands while the bend lasts (no second roll), and is dropped once it is behind
    stepDriftPlan(s, c, shy, PROFILES.hard, bend);
    expect(shy.driftPlan).toBe(-1);
    stepDriftPlan(s, c, shy, PROFILES.hard, fakeLine(0));
    expect(shy.driftPlan).toBe(0);
    // no plan for a bend with a hazard that stays put in the lane the slide sweeps
    const wary = memory(PROFILES.hard, { driftUse: 1 });
    stepDriftPlan(s, c, wary, PROFILES.hard, { ...bend, hazardInLane: true });
    expect(wary.driftPlan).toBe(0);
  });

  it('no hop when slow, on a narrow road, near a branch, on a straight, deep in a tight bend, from the inside, or inside the cooldown', () => {
    const m = planned();
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
    stepDriftDecision(s, c, m, PROFILES.hard, { ...bend, bendStart: 40 }, 25, out, SIM_DT);
    expect(out.drift).toBe(false); // the bend gets tight too far ahead yet
    stepDriftDecision(s, c, m, PROFILES.hard, { ...bend, bendStart: 0, kappaShort: 0.06, turnShort: 0.48 }, 25, out, SIM_DT);
    expect(out.drift).toBe(false); // already deep in a tight bend: the hop would fly off its outside
    stepDriftDecision(kartAt(track, 0.2, 5, 22), c, m, PROFILES.hard, { ...bend, myLat: 5 }, 25, out, SIM_DT);
    expect(out.drift).toBe(false); // on the inside: no room for the slide
    stepDriftDecision(s, c, m, PROFILES.hard, { ...bend, hazardInLane: true }, 25, out, SIM_DT);
    expect(out.drift).toBe(false); // a teacup in the lane the slide sweeps
    m.driftCooldown = 1;
    stepDriftDecision(s, c, m, PROFILES.hard, bend, 25, out, SIM_DT);
    expect(out.drift).toBe(false);
  });

  it('holds the side through the hop, releases at the target tier, and an aborted drift waits longer', () => {
    const s = kartAt(track, 0.2, 0, 22);
    const m = planned();
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
    // the planned tier reached short of the top tier while the bend goes on: hold it for the exit
    m.driftTier = 2; s.drift.tier = 2;
    const inBend = { ...bend, kappaShort: 0.03 };
    stepDriftDecision(s, c, m, PROFILES.hard, inBend, 25, out, SIM_DT);
    expect(out.drift).toBe(true);
    // the bend lets go: release with the short cooldown, and grip the rest of this bend
    stepDriftDecision(s, c, m, PROFILES.hard, { ...inBend, bendMetres: 5 }, 25, out, SIM_DT);
    expect(out.drift).toBe(false);
    expect(m.driftDir).toBe(0);
    expect(m.driftEndReason).toBe('aligned');
    expect(m.driftPlan).toBe(-1);
    expect(m.driftCooldown).toBeCloseTo(AI.drift.cooldown);
    // an aborted hop (controller went idle) waits the long cooldown
    m.driftCooldown = 0; m.driftPlan = 1;
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
    // a near-straight: the charge model alone would call a 2.4 s neutral swing a tier, but the bend
    // gate (driftThreshold) never lets a drift start there
    const gentle = { ...fakeLine(0.02, 0.03), probeNear: 29 };
    expect(driftWorthy(s, c, PROFILES.hard, gentle)).toBe(false);
    expect(reachableTier(s, c, bend)).toBeGreaterThanOrEqual(1);
    const m = planned();
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
    const m = planned(PROFILES.easy);
    const out = { ...NEUTRAL_INPUT };
    stepDriftDecision(s, c, m, PROFILES.easy, bend, 25, out, SIM_DT);
    s.drift.phase = 'drifting'; s.drift.tier = 1; m.driftHold = 1;
    stepDriftDecision(s, c, m, PROFILES.easy, bend, 25, out, SIM_DT);
    expect(out.drift).toBe(false);
  });

  it('lets go short of the outside wall (walls stop a kart 0.85 m inside the road edge), on a wall hit, and before a bump', () => {
    const s = kartAt(track, 0.2, 0, 22);
    const hold = (line: typeof bend) => {
      const m = planned();
      m.driftDir = 1; m.driftTier = 3; m.driftHold = 1;
      s.drift.phase = 'drifting'; s.drift.direction = 1; s.drift.tier = 0; s.grounded = true;
      const out = { ...NEUTRAL_INPUT };
      stepDriftDecision(s, c, m, PROFILES.hard, line, 25, out, SIM_DT);
      return [out.drift, m.driftEndReason];
    };
    // right-hand drift: the outside is the left (negative lateral). A walled edge at the road edge (wall = halfWidth)
    const walled = { ...bend, halfWidth: 7, wall: 7, open: 0 };
    expect(hold({ ...walled, myLat: -5 })).toEqual([true, 'none']);
    expect(hold({ ...walled, myLat: -(7 - c.kartRadius - AI.drift.wallMargin) - 0.05 })).toEqual([false, 'edge']);
    // an open (off-road) left edge: a little past the road first
    expect(hold({ ...walled, open: 1, myLat: -(7 - c.kartRadius) })).toEqual([true, 'none']);
    expect(hold({ ...walled, open: 1, myLat: -7 - AI.drift.outsideSlack - 0.05 })).toEqual([false, 'edge']);
    // touched a wall since the hop
    s.wallCooldown = c.wallCooldownSeconds * 0.9; // an impact just now, 1 s into the drift
    expect(hold(walled)).toEqual([false, 'wall']);
    s.wallCooldown = 0;
    // a bump or a ramp airLead ahead
    expect(hold({ ...walled, airMetres: 22 * AI.drift.airLead - 1 })).toEqual([false, 'air']);
  });

  it('swingIn: with the stick out a drift still swings further in, more the harder it turns', () => {
    const s = kartAt(track, 0.2, 0, 25);
    s.drift.phase = 'drifting'; s.drift.direction = 1;
    s.drift.yawK = 0.5;
    const soft = swingIn(s, c, 1, 25, 1, 0.42, 0, 0.1);
    s.drift.yawK = 1;
    const hard = swingIn(s, c, 1, 25, 1, 0.42, 0, 0.1);
    expect(soft).toBeGreaterThan(0.1 * 25 * c.driftYawLag);
    expect(hard).toBeGreaterThan(soft);
    // already heading out: it gets no further in
    expect(swingIn(s, c, 1, 25, 1, 0.42, 2, -0.1)).toBeLessThanOrEqual(2 + 1e-9);
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
