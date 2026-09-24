// Review regressions for open edges: they keep their world place through a route-changing
// Final Lap Shift (and go with the road they were on), the physics shoulder falls away like
// the drawn one, and a kart far outside a wall's line is eased back in, not teleported.
import { describe, expect, it } from 'vitest';
import { stepWalls } from '../kart-controller/collide.ts';
import { makeConstants } from '../kart-controller/constants.ts';
import { SIM_DT, stepKart } from '../kart-controller/step.ts';
import { createKartState, NEUTRAL_INPUT, type KartEvent, type KartState } from '../kart-controller/types.ts';
import { BUILDER } from './constants.ts';
import { wrap01 } from './lut.ts';
import { buildTrack, type Track } from './track.ts';
import canyonJson from './tracks/canyon-rush.json';
import type { TrackDefinition, Vec3 } from './types.ts';

const c = makeConstants('medium', 150);
const canyon = () => JSON.parse(JSON.stringify(canyonJson)) as TrackDefinition;
/** Canyon Rush with its wall at the road's edge (no off-road band): the open-edge shoulder on its own. */
const walledCanyon = () => { const d = canyon(); d.offroad = false; return d; };
const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Signed meters right of the main-line center at the kart's t. */
function lateralOf(track: Track, s: KartState): number {
  const m = track.sample(s.t, 0, 0);
  return (s.position[0] - m.position[0]) * m.tangent[2] - (s.position[2] - m.position[2]) * m.tangent[0];
}

/** A kart at (t, lateral) facing along the road. */
function kartAt(track: Track, t: number, lateral: number, speed: number): KartState {
  const p = track.sample(t, lateral, 0);
  const s = createKartState({ racerId: 'k', position: [...p.position], heading: Math.atan2(p.tangent[0], p.tangent[2]), t });
  s.speed = speed;
  return s;
}

describe('open edges through a route-changing Final Lap Shift (Canyon Rush collapse)', () => {
  it('the edges on the collapsed bridge go with it: nothing in the mine tunnel is open and a kart cannot fall off it', () => {
    const def = canyon();
    const track = buildTrack(def);
    track.applyFinalLapShift([]);
    const lut = track.branches.main.lut;
    // both shipped edges sit on the replaced road (0.46-0.6 left, 0.51-0.56 right, inside 0.32-0.665)
    expect(track.openEdges).toEqual([]);

    // the tunnel's span on the new road: from its first to its last control point
    const cps = def.finalLapShift.routeOverrides![0].controlPoints;
    const from = lut.nearestTGlobal([cps[0].x, cps[0].y, cps[0].z]);
    const to = lut.nearestTGlobal([cps[cps.length - 1].x, cps[cps.length - 1].y, cps[cps.length - 1].z]);
    let inside = 0;
    for (let i = 0; i < lut.n; i++) {
      const u = i / lut.n;
      if (wrap01(u - from) > wrap01(to - from)) continue;
      inside++;
      expect(lut.open[i], `open bits at t ${u.toFixed(4)}`).toBe(0);
      const far = track.sample(u, 0).halfWidth + BUILDER.kerbWidth + BUILDER.shoulderWidth + 2;
      expect(track.sample(u, -far).overCliff).toBe(false);
      expect(track.sample(u, far).overCliff).toBe(false);
    }
    expect(inside).toBeGreaterThan(400); // the span really is the tunnel, not a sliver

    // steering hard into either tunnel wall: held by the wall, never falls, no claw
    for (const [t, steer] of [[0.47, -1], [0.515, 1]] as const) {
      const s = kartAt(track, t, 0, 20);
      const events: KartEvent[] = [];
      let maxLat = 0, fell = false;
      for (let k = 0; k < 360; k++) {
        events.push(...stepKart(s, { ...NEUTRAL_INPUT, throttle: 1, steer }, track, c, SIM_DT));
        const smp = track.sample(s.t, 0);
        maxLat = Math.max(maxLat, Math.abs(lateralOf(track, s)) - ((smp.wall ?? smp.halfWidth) - c.kartRadius));
        if (s.status.falling) fell = true;
      }
      expect(fell).toBe(false);
      expect(events.some((e) => e.type === 'respawn')).toBe(false);
      expect(maxLat).toBeLessThan(0.05);
    }
  });

  it('an edge off the replaced road keeps its world place (its t is re-derived, not reused)', () => {
    const withExtra = () => { const d = canyon(); d.openEdges!.push({ fromT: 0.75, toT: 0.85, side: 'right' }); return d; };
    const twin = buildTrack(withExtra()); // never shifted: where the edge was laid
    const fromP = twin.sample(0.75, 0).position, toP = twin.sample(0.85, 0).position;

    const track = buildTrack(withExtra());
    track.applyFinalLapShift([]);
    const lut = track.branches.main.lut;
    expect(track.openEdges).toHaveLength(1);
    expect(track.openEdges[0].side).toBe('right');

    // the right-open run on the new (shorter) road starts and ends at the same world points
    const run: number[] = [];
    for (let i = 0; i < lut.n; i++) if (lut.open[i] & 2) run.push(i);
    expect(run.length).toBeGreaterThan(0);
    expect(run[run.length - 1] - run[0] + 1).toBe(run.length); // one unbroken run
    expect(dist(lut.sample(run[0] / lut.n, 0).position, fromP)).toBeLessThan(1.5);
    expect(dist(lut.sample(run[run.length - 1] / lut.n, 0).position, toP)).toBeLessThan(1.5);
    // nothing is open on the left any more (that edge was on the bridge)
    expect(lut.open.some((b) => (b & 1) !== 0)).toBe(false);
  });
});

describe('the open shoulder falls away like the drawn one', () => {
  // Canyon Rush before the shift: left open at 0.46-0.6, right walled here (right opens at 0.51)
  const T = 0.48;
  const track = buildTrack(walledCanyon());
  const flat = (() => { const d = walledCanyon(); d.openEdges = []; return buildTrack(d); })(); // same road, all walled
  const hw = track.sample(T, 0).halfWidth;
  const { kerbWidth: kw, shoulderWidth: sw, shoulderDrop: drop } = BUILDER;

  it('0 at the outer curb, down to -shoulderDrop at the lip, linear between; the walled side and the curb do not drop', () => {
    expect(track.sample(T, 0).open).toBe(1);
    const cases: [number, number][] = [
      [-(hw + kw * 0.5), 0], // on the curb
      [-(hw + kw), 0], // outer curb edge
      [-(hw + kw + sw * 0.25), drop * 0.25],
      [-(hw + kw + sw * 0.5), drop * 0.5],
      [-(hw + kw + sw), drop], // the lip
      [hw + kw + sw * 0.5, 0], // walled right side: no shoulder drop
    ];
    for (const [lat, want] of cases) {
      const a = track.sample(T, lat), b = flat.sample(T, lat);
      expect(b.groundY - a.groundY, `drop at lateral ${lat.toFixed(2)}`).toBeCloseTo(want, 9);
      expect(a.position[1]).toBeCloseTo(a.groundY, 9);
    }
    expect(track.sample(T, -(hw + kw + sw)).overCliff).toBe(false);
  });

  it('a kart parked on the open shoulder settles onto the lowered ground', () => {
    const lat = -(hw + kw + sw * 0.75);
    const s = kartAt(track, T, lat, 0);
    s.position[1] = flat.sample(T, lat).groundY; // start at road-plane height
    for (let k = 0; k < 120; k++) stepKart(s, NEUTRAL_INPUT, track, c, SIM_DT);
    expect(s.grounded).toBe(true);
    expect(s.status.falling).toBe(false);
    const now = lateralOf(track, s);
    expect(Math.abs(now - lat)).toBeLessThan(0.1); // parked: it stayed on the shoulder
    // it rests on the open shoulder's ground, about 3/4 of shoulderDrop under the road plane
    expect(s.position[1]).toBeCloseTo(track.sample(s.t, now).groundY, 3);
    expect(flat.sample(s.t, now).groundY - s.position[1]).toBeGreaterThan(drop * 0.7);
  });
});

describe('a kart far outside a wall line is eased back, not teleported', () => {
  it('stepWalls: far out moves wallEndPushRate x dt a tick; an ordinary hit still snaps exactly', () => {
    expect(c.wallEndOvershoot).toBe(1.2);
    expect(c.wallEndPushRate).toBe(10);
    const limit = 8 - c.kartRadius;
    // 4 m past the right wall line: one tick eases it in by 10/120 m
    const far = createKartState({ racerId: 'x', position: [0, 0, 0], heading: 0 });
    stepWalls(far, limit + 4, [1, 0, 0], 8, c, SIM_DT, []);
    expect(far.position[0]).toBeCloseTo(-c.wallEndPushRate * SIM_DT, 9);
    // the left side the same way, mirrored
    const left = createKartState({ racerId: 'y', position: [0, 0, 0], heading: 0 });
    stepWalls(left, -(limit + 3), [1, 0, 0], 8, c, SIM_DT, []);
    expect(left.position[0]).toBeCloseTo(c.wallEndPushRate * SIM_DT, 9);
    // 0.5 m and exactly wallEndOvershoot past: snapped to the line in one tick, as before
    for (const over of [0.5, c.wallEndOvershoot]) {
      const s = createKartState({ racerId: 'z', position: [0, 0, 0], heading: 0 });
      stepWalls(s, limit + over, [1, 0, 0], 8, c, SIM_DT, []);
      expect(s.position[0]).toBeCloseTo(-over, 9);
    }
  });

  it('driving off the end of an open shoulder into the barrier: no big jump, back on the road, no fall', () => {
    // Canyon Rush before the shift: the left edge closes at t 0.6; start 2 m out on its shoulder
    const track = buildTrack(canyon());
    const t0 = 0.585;
    const hw = track.sample(t0, 0).halfWidth;
    expect((track.sample(t0, -20).open ?? 0) & 1).toBe(1);
    const s = kartAt(track, t0, -(hw + BUILDER.kerbWidth + 2), 15);
    const events: KartEvent[] = [];
    let prev = lateralOf(track, s), maxJump = 0, easingTicks = 0, fell = false;
    for (let k = 0; k < 240; k++) {
      events.push(...stepKart(s, { ...NEUTRAL_INPUT, throttle: 1 }, track, c, SIM_DT));
      const lat = lateralOf(track, s);
      maxJump = Math.max(maxJump, Math.abs(lat - prev));
      prev = lat;
      const limit = track.sample(s.t, 0).halfWidth - c.kartRadius;
      if (((track.sample(s.t, lat).open ?? 0) & 1) === 0 && Math.abs(lat) > limit + 0.05) easingTicks++;
      if (s.status.falling) fell = true;
    }
    expect(fell).toBe(false);
    expect(events.some((e) => e.type === 'respawn')).toBe(false);
    // it came back over many ticks (the old code snapped ~3.9 m in one)
    expect(easingTicks).toBeGreaterThan(20);
    expect(maxJump).toBeLessThanOrEqual(c.wallEndOvershoot + 0.05);
    expect(Math.abs(prev)).toBeLessThanOrEqual(track.sample(s.t, 0).halfWidth - c.kartRadius + 0.05);
  });
});

describe('off-road (Adam, 23 Sept 2026: the Mario Kart way)', () => {
  const track = buildTrack(canyon());
  const T = 0.3;
  const hw = track.sample(T, 0).halfWidth;
  const { kerbWidth: kw, shoulderWidth: sw, shoulderDrop: drop } = BUILDER;

  it('past the curb on a walled side: loose ground (dirt) that falls away like the drawn shoulder, and the wall at its far edge', () => {
    expect(track.sample(T, 0).open ?? 0).toBe(0);
    expect(track.sample(T, hw + kw * 0.5).surface).toBe('road'); // the curb
    const mid = track.sample(T, hw + kw + sw * 0.5);
    expect(mid.surface).toBe('dirt');
    expect(track.sample(T, 0).groundY - mid.groundY).toBeGreaterThan(drop * 0.4);
    expect(mid.overCliff).toBe(false);
    expect(mid.wall).toBeCloseTo(hw + kw + sw, 6);
  });

  it('a kart steered off the road rolls onto the off-road, slows to the dirt cap, and is stopped by the wall, not the road edge', () => {
    const s = kartAt(track, T, 0, 22);
    let maxLat = 0, dirtTicks = 0;
    for (let k = 0; k < 360; k++) {
      stepKart(s, { ...NEUTRAL_INPUT, throttle: 1, steer: 1 }, track, c, SIM_DT);
      maxLat = Math.max(maxLat, Math.abs(lateralOf(track, s)));
      if (s.surface === 'dirt') dirtTicks++;
    }
    expect(maxLat).toBeGreaterThan(hw + kw); // it left the road
    expect(maxLat).toBeLessThanOrEqual(hw + kw + sw - c.kartRadius + 0.05); // held by the boundary wall
    expect(dirtTicks).toBeGreaterThan(0);
    expect(s.status.falling).toBe(false);
  });
});
