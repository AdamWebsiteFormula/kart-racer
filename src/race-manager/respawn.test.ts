import { describe, expect, it } from 'vitest';
import { BASE } from '../kart-controller/constants.ts';
import { SIM_DT } from '../kart-controller/step.ts';
import { NEUTRAL_INPUT, headingOf } from '../kart-controller/types.ts';
import { wrap01 } from '../track-builder/lut.ts';
import { buildTrack } from '../track-builder/track.ts';
import { stepCheckpoints } from './checkpoints.ts';
import { RACE } from './constants.ts';
import { respawnKart, respawnLateral, stepStuck } from './respawn.ts';
import { OVAL, placeAt, spawnKart } from './__tests__/fixtures.ts';
import type { RaceEvent } from './types.ts';

const track = buildTrack(OVAL);
const THROTTLE = { ...NEUTRAL_INPUT, throttle: 1 };

describe('stuck', () => {
  it('a player pushing against nothing for stuckSeconds is stuck; releasing resets', () => {
    const { s, tr } = spawnKart(track, 0, 'p', true);
    const ticks = Math.round(RACE.stuckSeconds / SIM_DT);
    for (let i = 0; i < ticks - 1; i++) expect(stepStuck(s, tr, THROTTLE, SIM_DT)).toBe(false);
    expect(stepStuck(s, tr, THROTTLE, SIM_DT)).toBe(true);
    stepStuck(s, tr, NEUTRAL_INPUT, SIM_DT);
    expect(tr.stuckSeconds).toBe(0);
  });

  it('a spinning kart, a moving kart, a frozen kart and an idle player are not stuck; an idle AI is', () => {
    const { s, tr } = spawnKart(track, 0, 'p', true);
    s.status.spinRemaining = 0.5;
    stepStuck(s, tr, THROTTLE, SIM_DT);
    expect(tr.stuckSeconds).toBe(0);
    s.status.spinRemaining = 0;
    s.speed = 2;
    stepStuck(s, tr, THROTTLE, SIM_DT);
    expect(tr.stuckSeconds).toBe(0);
    s.speed = 0;
    tr.freezeRemaining = 0.1;
    stepStuck(s, tr, THROTTLE, SIM_DT);
    expect(tr.stuckSeconds).toBe(0);
    tr.freezeRemaining = 0;
    stepStuck(s, tr, NEUTRAL_INPUT, SIM_DT);
    expect(tr.stuckSeconds).toBe(0);
    const ai = spawnKart(track, 1);
    stepStuck(ai.s, ai.tr, NEUTRAL_INPUT, SIM_DT);
    expect(ai.tr.stuckSeconds).toBeGreaterThan(0);
  });
});

describe('respawn', () => {
  it('places the kart at its last checkpoint, facing the tangent, still, frozen, with coins and item kept', () => {
    const { s, tr } = spawnKart(track, 0);
    tr.lastCheckpoint = 3;
    tr.nextCheckpoint = 4;
    placeAt(track, s, 0.9, 3);
    s.position[1] = -50;
    s.speed = 20; s.lateralVelocity = 3; s.verticalVelocity = -9; s.branch = 1;
    s.coins = 4; s.item.held = 'beachBall';
    s.boost = { source: 'drift', remaining: 1, multiplier: 1.3 };
    s.drift.active = true; s.drift.phase = 'drifting';
    tr.wrongWayOn = true;
    const events: RaceEvent[] = [];
    respawnKart(s, tr, track, events);
    const cp = track.checkpoints[3];
    // its own lateral (3 m), not the centreline
    const at = track.sample(cp.t, 3, 0).position;
    expect(s.position[0]).toBeCloseTo(at[0], 6);
    expect(s.position[1]).toBeCloseTo(at[1] + RACE.respawnLift, 6);
    expect(s.position[2]).toBeCloseTo(at[2], 6);
    expect(s.heading).toBe(headingOf(cp.tangent));
    expect(s.t).toBe(cp.t);
    expect(s.branch).toBe(0);
    expect([s.speed, s.lateralVelocity, s.verticalVelocity]).toEqual([0, 0, 0]);
    expect(s.boost.source).toBe('none');
    expect(s.drift.active).toBe(false);
    expect(s.coins).toBe(4);
    expect(s.item.held).toBe('beachBall');
    expect(tr.freezeRemaining).toBe(RACE.respawnFreezeSeconds);
    expect(s.status.intangibleRemaining).toBe(RACE.respawnFreezeSeconds);
    expect(tr.prevT).toBeLessThan(cp.t);
    expect(tr.prevT).toBeGreaterThan(cp.t - 1e-6);
    expect(tr.nextCheckpoint).toBe(4);
    expect(tr.respawnCount).toBe(1);
    expect(tr.wrongWayOn).toBe(false);
    expect(events).toEqual([
      { type: 'wrongWay', racerId: 'k0', on: false },
      { type: 'respawn', racerId: 'k0', checkpoint: 3 },
    ]);
  });

  it('keeps the lateral it fell at and clamps it inside the road by a kart radius', () => {
    const cp = track.checkpoints[2];
    const hw = cp.halfWidth;
    for (const [fellAt, lands] of [[0, 0], [-3, -3], [20, hw - BASE.kartRadius], [-20, -(hw - BASE.kartRadius)]]) {
      const { s, tr } = spawnKart(track, 0);
      tr.lastCheckpoint = 2; tr.nextCheckpoint = 3;
      placeAt(track, s, 0.3, fellAt);
      s.position[1] = -40;
      expect(respawnLateral(s, track, hw)).toBeCloseTo(lands, 6);
      respawnKart(s, tr, track, []);
      const want = track.sample(cp.t, lands, 0).position;
      expect(s.position[0]).toBeCloseTo(want[0], 6);
      expect(s.position[2]).toBeCloseTo(want[2], 6);
      expect(s.heading).toBe(headingOf(cp.tangent));
    }
  });

  it('a kart respawned before its first line crossing still crosses the line and laps normally', () => {
    const { s, tr } = spawnKart(track, 0);
    const events: RaceEvent[] = [];
    respawnKart(s, tr, track, events);
    expect(tr.nextCheckpoint).toBe(0);
    // sitting on the line, not moving: the line counts as the first crossing
    expect(stepCheckpoints(s, tr, track, 3, 0, events)).toBe('checkpoint');
    expect(tr.nextCheckpoint).toBe(1);
    expect(s.lap).toBe(1);
    // one full loop from here is one lap
    const n = track.checkpoints.length;
    let tick = 1, laps = 0;
    for (let i = 0; i < 404; i++) { // 1.01 laps: float drift must not leave t a hair short of the line
      s.t = wrap01(s.t + 1 / 400);
      if (stepCheckpoints(s, tr, track, 3, tick++, events) === 'lap') laps++;
    }
    expect(laps).toBe(1);
    expect(s.lap).toBe(2);
    expect(events.filter((e) => e.type === 'checkpoint').length).toBe(n - 1);
  });
});
