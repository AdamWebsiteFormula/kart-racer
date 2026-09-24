// SOP test 15: the kart controller drives a scripted lap on Harbour Loop.
import { describe, expect, it } from 'vitest';
import { makeConstants } from '../../kart-controller/constants.ts';
import { SIM_DT, stepKart } from '../../kart-controller/step.ts';
import { createKartState, NEUTRAL_INPUT, type InputState, type KartEvent, type KartState } from '../../kart-controller/types.ts';
import { BUILDER } from '../constants.ts';
import { signedOffset } from '../branches.ts';
import { wrap01 } from '../lut.ts';
import { buildTrack, type Track } from '../track.ts';
import { HARBOUR_LOOP } from './fixtures.ts';

const DT = SIM_DT;

function spawn(track: Track, slot = 0): KartState {
  const s = track.spawnGrid[slot];
  return createKartState({ racerId: `k${slot}`, position: [...s.position], heading: s.heading, t: s.t });
}

/** Full throttle, steer toward a point ahead on the current branch. Pure function of state. */
function driver(s: KartState, track: Track, lookAhead = 0.02): InputState {
  const ahead = track.sample(s.t + lookAhead, 0, s.branch).position;
  const dx = ahead[0] - s.position[0], dz = ahead[2] - s.position[2];
  let err = Math.atan2(dx, dz) - s.heading;
  while (err > Math.PI) err -= 2 * Math.PI;
  while (err < -Math.PI) err += 2 * Math.PI;
  return { ...NEUTRAL_INPUT, throttle: 1, steer: Math.max(-1, Math.min(1, err * 3)) };
}

function driveLap(track: Track) {
  const c = makeConstants('medium', 150);
  const s = spawn(track);
  const startT = track.startT;
  const events: { tick: number; t: number; e: KartEvent }[] = [];
  let ticks = 0;
  let crossed = false;
  let prev = wrap01(s.t - startT);
  while (ticks < 120 * 90) {
    const ev = stepKart(s, driver(s, track), track, c, DT);
    ticks++;
    for (const e of ev) events.push({ tick: ticks, t: s.t, e });
    const rel = wrap01(s.t - startT);
    if (ticks > 120 && prev > 0.9 && rel < 0.1) { crossed = true; break; }
    prev = rel;
  }
  return { s, ticks, events, crossed };
}

describe('integration on Harbour Loop', () => {
  const track = buildTrack(HARBOUR_LOOP);

  it('a full-throttle scripted lap crosses the line inside the lapTimeWarn band with no wall on the start straight', () => {
    const { ticks, events, crossed } = driveLap(track);
    expect(crossed).toBe(true);
    const seconds = ticks * DT;
    expect(seconds).toBeGreaterThan(BUILDER.lapTimeWarn[0]);
    expect(seconds).toBeLessThan(BUILDER.lapTimeWarn[1]);
    const wallsOnStraight = events.filter((x) => x.e.type === 'wall' && wrap01(x.t - track.startT) < 0.15);
    expect(wallsOnStraight).toEqual([]);
    expect(events.filter((x) => x.e.type === 'respawn')).toEqual([]);
  });

  it('two runs give the same state hash', () => {
    const a = driveLap(buildTrack(HARBOUR_LOOP));
    const b = driveLap(buildTrack(HARBOUR_LOOP));
    expect(JSON.stringify(a.s)).toBe(JSON.stringify(b.s));
    expect(a.ticks).toBe(b.ticks);
  });

  it('a kart aimed into the beach shortcut takes it and rejoins with t still increasing', () => {
    const c = makeConstants('medium', 150);
    const beach = track.branches.byId('beach')!;
    const s = spawn(track);
    // start just before the beach entry, on the main line
    const t0 = wrap01(beach.entryT - 0.04);
    const p = track.sample(t0, 0);
    s.position = [...p.position]; s.t = t0; s.heading = Math.atan2(p.tangent[0], p.tangent[2]);
    let onBeach = 0, onBeachRoad = 0;
    let prevT = s.t;
    let maxBack = 0;
    for (let i = 0; i < 120 * 20; i++) {
      // steer toward the beach line while it is open ahead, else follow the current branch
      const near = s.branch === 0 && Math.abs(signedOffset(s.t, beach.entryT)) < 0.03;
      const target = near ? beach.lut.sample(0.1, 0).position : track.sample(s.t + 0.02, 0, s.branch).position;
      const dx = target[0] - s.position[0], dz = target[2] - s.position[2];
      let err = Math.atan2(dx, dz) - s.heading;
      while (err > Math.PI) err -= 2 * Math.PI;
      while (err < -Math.PI) err += 2 * Math.PI;
      stepKart(s, { ...NEUTRAL_INPUT, throttle: 1, steer: Math.max(-1, Math.min(1, err * 3)) }, track, c, DT);
      if (s.branch === beach.index) { onBeach++; if (s.surface === 'road') onBeachRoad++; /* boardwalk */ }
      const d = wrap01(s.t - prevT);
      if (d > 0.5) maxBack = Math.max(maxBack, 1 - d);
      prevT = s.t;
      if (onBeach > 0 && s.branch === 0 && wrap01(s.t - beach.exitT) < 0.05) break;
    }
    expect(onBeach).toBeGreaterThan(120 * 5);
    // the beach's own road nearly all the way (it may brush the off-road where it leaves the main road)
    expect(onBeachRoad / onBeach).toBeGreaterThan(0.9);
    expect(s.branch).toBe(0);
    expect(maxBack).toBeLessThan(1e-3);
  });
});
