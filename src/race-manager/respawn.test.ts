import { describe, expect, it } from 'vitest';
import { SIM_DT } from '../kart-controller/step.ts';
import { NEUTRAL_INPUT, headingOf } from '../kart-controller/types.ts';
import { buildTrack } from '../track-builder/track.ts';
import { RACE } from './constants.ts';
import { respawnKart, stepStuck } from './respawn.ts';
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
    expect(s.position).toEqual([cp.position[0], cp.position[1] + RACE.respawnLift, cp.position[2]]);
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
    expect(tr.prevT).toBe(cp.t);
    expect(tr.nextCheckpoint).toBe(4);
    expect(tr.respawnCount).toBe(1);
    expect(tr.wrongWayOn).toBe(false);
    expect(events).toEqual([
      { type: 'wrongWay', racerId: 'k0', on: false },
      { type: 'respawn', racerId: 'k0', checkpoint: 3 },
    ]);
  });
});
