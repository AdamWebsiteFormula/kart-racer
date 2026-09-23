// Open edges (track def openEdges): no wall, loose shoulder, then no ground. A kart that drives
// off falls, and the claw is called once it is fallCatchDepth under the road. A walled stretch
// still holds it.
import { describe, expect, it } from 'vitest';
import { BASE } from '../kart-controller/constants.ts';
import { SIM_DT, stepKart } from '../kart-controller/step.ts';
import { NEUTRAL_INPUT, type KartEvent } from '../kart-controller/types.ts';
import { buildTrack } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { OVAL, placeAt, spawnKart } from './__tests__/fixtures.ts';

function trackWithEdge() {
  const def = structuredClone(OVAL) as TrackDefinition;
  def.openEdges = [{ fromT: 0.1, toT: 0.2, side: 'right' }];
  return buildTrack(def);
}

/** Drive a kart hard to the right from the centreline at t; returns what happened. */
function veerRight(t: number) {
  const track = trackWithEdge();
  const { s, c } = spawnKart(track, 0);
  placeAt(track, s, t, 0);
  s.speed = 20;
  const events: KartEvent[] = [];
  let maxLateral = 0, fell = false;
  for (let k = 0; k < 240; k++) {
    // positive sim steer turns toward the track's right (positive lateral), the open side
    events.push(...stepKart(s, { ...NEUTRAL_INPUT, throttle: 1, steer: 1 }, track, c, SIM_DT));
    const smp = track.sample(s.t, 0, 0);
    const lat = (s.position[0] - smp.position[0]) * smp.tangent[2] - (s.position[2] - smp.position[2]) * smp.tangent[0];
    maxLateral = Math.max(maxLateral, lat);
    if (s.position[1] < smp.groundY - 1) fell = true;
  }
  return { track, s, events, maxLateral, fell, hw: track.sample(t, 0, 0).halfWidth };
}

describe('open edges', () => {
  it('on an open stretch the kart goes over the edge, falls, and the claw is called', () => {
    const r = veerRight(0.11);
    expect(r.fell).toBe(true);
    expect(r.maxLateral).toBeGreaterThan(r.hw + 3);
    expect(r.events.some((e) => e.type === 'respawn')).toBe(true);
  });

  it('on a walled stretch the same move is stopped at the wall', () => {
    const r = veerRight(0.35);
    expect(r.fell).toBe(false);
    expect(r.maxLateral).toBeLessThanOrEqual(r.hw - BASE.kartRadius + 0.05);
    expect(r.events.some((e) => e.type === 'respawn')).toBe(false);
  });

  it('the open side only: the left edge of an open-right stretch still has its wall', () => {
    const track = trackWithEdge();
    const s = track.sample(0.15, -20, 0), r = track.sample(0.15, 20, 0);
    expect(s.overCliff).toBe(false);
    expect(r.overCliff).toBe(true);
    expect(track.sample(0.15, 0, 0).open).toBe(2);
    expect(track.sample(0.5, 20, 0).overCliff).toBe(false);
  });
});
