// Regression tests for the loop-the-loop review fixes (2026-09-23): the catch zone, the run-in
// path, ranking on the ring, the ride speed, ramps under the ride, loop feet through a route
// change, and the Boardwalk Nights loop clear of the ferris ramp.
import { describe, expect, it } from 'vitest';
import { makeConstants } from './constants.ts';
import { jumpLift, lateralOffset } from './ground.ts';
import { inLoop, loopFrame, loopLanes, loopLength, loopPose } from './loop.ts';
import { stepKart, stepKarts } from './step.ts';
import { createKartState, forwardOf, headingOf, NEUTRAL_INPUT, type KartEvent, type KartState, type TrackJump, type TrackLoop, type TrackQuery } from './types.ts';
import { makeOval } from './__tests__/oval-stub.ts';
import { createTracker } from '../race-manager/checkpoints.ts';
import { sortOrder } from '../race-manager/ranking.ts';
import { buildTrack } from '../track-builder/track.ts';
import { HARBOUR_LOOP, cloneDef } from '../track-builder/__tests__/fixtures.ts';
import boardwalkJson from '../track-builder/tracks/boardwalk-nights.json';
import type { TrackDefinition } from '../track-builder/types.ts';

const c = makeConstants('medium', 150);
const DT = 1 / 120;
// the builder's shape (track.schema.json builder defaults), foot on the oval's first straight
const LOOP: TrackLoop = { id: 'l', t: 0.1, radius: 9, shift: 7, spread: 1.2, approach: 24, exit: 6, width: 6 };
const RING = 2 * Math.PI * LOOP.radius;

/** A kart on the ground at t, `lat` right of center, nose along the road. */
function kartAt(track: TrackQuery, t: number, lat: number, speed: number, id = 'x'): KartState {
  const p = track.sample(t, lat, 0);
  const s = createKartState({ racerId: id, position: [...p.position], heading: headingOf(p.tangent), t });
  s.speed = speed;
  return s;
}

/** t `m` meters after the loop's catch line (negative = before it). */
const afterLine = (track: TrackQuery, l: TrackLoop, m: number) => l.t + (m - l.approach) / track.length;

/** Angle between two xz directions, radians. */
function angleXZ(a: readonly number[], b: readonly number[]): number {
  const la = Math.hypot(a[0], a[2]), lb = Math.hypot(b[0], b[2]);
  const dot = (a[0] * b[0] + a[2] * b[2]) / (la * lb);
  return Math.acos(Math.max(-1, Math.min(1, dot)));
}

describe('loop-the-loop review fixes (2026-09-23)', () => {
  it('the catch is a zone: a kart on the ground anywhere in the run-in is caught at once, how far in it already is; past the foot it is not', () => {
    const track = makeOval({ loops: [LOOP] });
    for (const into of [1, 6, 12, 18, 23]) {
      const s = kartAt(track, afterLine(track, LOOP, into), 2, 22);
      const ev = stepKart(s, NEUTRAL_INPUT, track, c, DT);
      expect(inLoop(s)).toBe(true);
      expect(s.status.loopIndex).toBe(0);
      // meters already into the run-in: where it stood plus one tick of travel
      expect(s.status.loopS0).toBeCloseTo(into + 22 * DT, 1);
      expect(s.status.loopS).toBe(s.status.loopS0);
      expect(ev.some((e) => e.type === 'loop' && e.phase === 'start')).toBe(true);
    }
    // on the road through the foot or the run-out: not caught again
    for (const past of [0.5, LOOP.exit, LOOP.exit + 5]) {
      const s = kartAt(track, LOOP.t + past / track.length, 2, 22);
      for (let i = 0; i < 30; i++) {
        stepKart(s, NEUTRAL_INPUT, track, c, DT);
        expect(inLoop(s)).toBe(false);
      }
    }
  });

  it('a kart that jumps a ramp over the catch line is caught on the tick it lands in the run-in, never in the air', () => {
    // a ramp whose lip is a meter before the catch line
    const hop: TrackJump = { id: 'hop', t: LOOP.t - (LOOP.approach + 1) / makeOval().length, launch: 5, shape: 'ramp', run: 5, rise: 0.8 };
    const track = makeOval({ loops: [LOOP], jumps: [hop] });
    const s = kartAt(track, hop.t - 20 / track.length, 0, 22);
    let launched = false, caughtAt = -1, wasGrounded = true;
    for (let i = 0; i < 240 && caughtAt < 0; i++) {
      stepKart(s, { ...NEUTRAL_INPUT, throttle: 1 }, track, c, DT);
      if (s.airborne.fromJumpId === 'hop') launched = true;
      // never in the air: the tick it is caught is the tick it came down
      if (inLoop(s)) { expect(wasGrounded).toBe(false); caughtAt = s.status.loopS0; }
      if (!s.grounded) expect(inLoop(s)).toBe(false);
      wasGrounded = s.grounded;
    }
    expect(launched).toBe(true);
    // over the line in the air, caught part way into the run-in where it landed
    expect(caughtAt).toBeGreaterThan(1);
    expect(caughtAt).toBeLessThan(LOOP.approach);
  });

  it('the run-in starts where the kart was caught, eases to the entry lane with its nose along the path, and has no jump at either join', () => {
    const track = makeOval({ loops: [LOOP] });
    const hw = loopFrame(track, LOOP).halfWidth;
    const L = track.length;
    for (const lat0 of [-7, 0, 6]) {
      const [entry] = loopLanes(LOOP, lat0, hw);
      for (const s0 of [0, 9, 20]) {
        // at the catch: exactly where it was, nose along the road
        const start = loopPose(track, LOOP, lat0, s0, s0);
        const at = track.sample(LOOP.t + (s0 - LOOP.approach) / L, lat0, 0);
        for (let k = 0; k < 3; k++) expect(start.position[k]).toBeCloseTo(at.position[k], 6);
        expect(start.heading).toBeCloseTo(headingOf(at.tangent), 6);
        // the whole run-in: the nose points the way the path goes (no crab slide)
        for (let s = s0; s < LOOP.approach - 0.01; s += 0.5) {
          const a = loopPose(track, LOOP, lat0, s, s0), b = loopPose(track, LOOP, lat0, s + 1e-4, s0);
          const move = [b.position[0] - a.position[0], 0, b.position[2] - a.position[2]];
          expect(angleXZ(move, forwardOf(a.heading))).toBeLessThan(0.01);
        }
        // in the entry lane by the foot
        const foot = loopPose(track, LOOP, lat0, LOOP.approach, s0);
        expect(lateralOffset(track, LOOP.t, foot.position).lateral).toBeCloseTo(entry, 3);
        // run-in → ring and ring → run-out: position and heading carry straight on
        for (const join of [LOOP.approach, LOOP.approach + RING]) {
          const before = loopPose(track, LOOP, lat0, join - 1e-6, s0), after = loopPose(track, LOOP, lat0, join, s0);
          expect(Math.hypot(...before.position.map((v, k) => v - after.position[k]))).toBeLessThan(1e-3);
          expect(Math.abs(before.heading - after.heading)).toBeLessThan(1e-3);
        }
      }
    }
  });

  it('a kart caught wide of the entry lane steers into it: every tick of the run-in it moves the way its nose points, with no jump at the catch', () => {
    const track = makeOval({ loops: [LOOP] });
    for (const from of [-3, 10]) {
      const s = kartAt(track, afterLine(track, LOOP, from), 6, 22);
      let prev: number[] = [...s.position], rideTicks = 0;
      for (let i = 0; i < 600; i++) {
        const wasIn = inLoop(s);
        stepKart(s, NEUTRAL_INPUT, track, c, DT);
        const move = [s.position[0] - prev[0], 0, s.position[2] - prev[2]];
        if (wasIn && s.status.loopS < LOOP.approach) {
          rideTicks++;
          // no more than a tick's travel (plus the sideways ease) from where it was: no teleport
          expect(Math.hypot(move[0], move[2])).toBeLessThan(s.status.loopSpeed * DT * 1.5);
          expect(angleXZ(move, forwardOf(s.heading))).toBeLessThan((3 * Math.PI) / 180);
        }
        prev = [...s.position];
        if (wasIn && !inLoop(s)) break;
      }
      expect(rideTicks).toBeGreaterThan(20);
    }
  });

  it('karts round the ring share its t: the one further round ranks ahead, whatever the grid', () => {
    const track = makeOval({ loops: [LOOP] });
    // grid slot 0 behind, grid slot 1 ten meters ahead; both caught at the line
    const karts = [kartAt(track, afterLine(track, LOOP, -12), 0, 22, 'behind'), kartAt(track, afterLine(track, LOOP, -2), 0, 22, 'ahead')];
    const trackers = [createTracker(0, karts[0].t), createTracker(1, karts[1].t)];
    const consts = [c, c];
    let bothOnRing = 0;
    for (let i = 0; i < 480; i++) {
      stepKarts(karts, [NEUTRAL_INPUT, NEUTRAL_INPUT], track, consts, DT);
      const onRing = karts.every((k) => inLoop(k) && k.status.loopS > LOOP.approach && k.status.loopS < LOOP.approach + RING);
      if (onRing) {
        bothOnRing++;
        expect(karts[0].distanceAlong).toBe(karts[1].distanceAlong);
      }
      expect(sortOrder(karts, trackers, [])).toEqual([1, 0]);
    }
    expect(bothOnRing).toBeGreaterThan(10);
  });

  it('the ride goes at the kart\'s own speed, never under topSpeed × loopSpeedFactor (0.8)', () => {
    expect(c.loopSpeedFactor).toBe(0.8);
    const floor = c.topSpeed * c.loopSpeedFactor;
    const track = makeOval({ loops: [LOOP] });
    for (const v of [10, 22, 30]) {
      const s = kartAt(track, afterLine(track, LOOP, -2), 0, v);
      for (let i = 0; i < 60 && !inLoop(s); i++) stepKart(s, NEUTRAL_INPUT, track, c, DT);
      expect(inLoop(s)).toBe(true);
      // the catch tick leaves s.speed as it came in; the ride takes it from the next tick
      const speedIn = s.speed;
      const from = s.status.loopS0;
      expect(s.status.loopSpeed).toBeCloseTo(Math.max(speedIn, floor), 9);
      if (v === 10) expect(s.status.loopSpeed).toBeCloseTo(floor, 9); // a slow kart is carried round at the floor
      if (v === 22) expect(s.status.loopSpeed).toBeLessThan(c.topSpeed); // not flung round faster than it came in
      // the ride takes what is left of it over that speed, and holds the speed
      let ticks = 0;
      while (inLoop(s) && ticks < 1200) {
        stepKart(s, NEUTRAL_INPUT, track, c, DT);
        ticks++;
        if (inLoop(s)) expect(s.speed).toBe(s.status.loopSpeed);
      }
      expect(ticks * DT).toBeCloseTo((loopLength(LOOP) - from) / Math.max(speedIn, floor), 1);
    }
  });

  it('a ramp under the ride lifts it: the kart is handed back on the ramp, not under it, and leaves off its lip', () => {
    const L = makeOval().length;
    // a ramp whose wedge takes in the last 2 m of the run-out, a trick bump in the run-in
    const ramp: TrackJump = { id: 'lip', t: LOOP.t + (LOOP.exit + 3) / L, launch: 5, shape: 'ramp', run: 5, rise: 0.8 };
    const bump: TrackJump = { id: 'bump', t: LOOP.t - 10 / L, launch: 0, shape: 'hump', run: 8, rise: 0.4, edge: 1.6 };
    const track = makeOval({ loops: [LOOP], jumps: [ramp, bump] });
    const hw = loopFrame(track, LOOP).halfWidth;
    const [entry, exit] = loopLanes(LOOP, 0, hw);
    const total = loopLength(LOOP);
    // the pose on road parts sits on the ramp and the bump
    const end = loopPose(track, LOOP, 0, total);
    expect(end.position[1]).toBeCloseTo(jumpLift(track, end.t, 0, exit, hw), 9);
    expect(end.position[1]).toBeCloseTo(0.8 * (1 - 3 / 5), 6);
    const crest = loopPose(track, LOOP, 0, LOOP.approach - 10);
    expect(crest.position[1]).toBeCloseTo(jumpLift(track, bump.t, 0, entry, hw), 6);
    expect(crest.position[1]).toBeGreaterThan(0.3);

    // a kart driven through: no drop at the hand-back, then off the lip
    const s = kartAt(track, afterLine(track, LOOP, -3), 0, 22);
    let handedBackY = NaN, afterY = NaN, launched = false;
    const ev: KartEvent[] = [];
    for (let i = 0; i < 600 && !launched; i++) {
      const wasIn = inLoop(s);
      ev.length = 0;
      ev.push(...stepKart(s, { ...NEUTRAL_INPUT, throttle: 1 }, track, c, DT));
      if (ev.some((e) => e.type === 'loop' && e.phase === 'end')) handedBackY = s.position[1];
      else if (wasIn === false && !Number.isNaN(handedBackY) && Number.isNaN(afterY)) afterY = s.position[1];
      if (s.airborne.fromJumpId === 'lip') launched = true;
    }
    expect(handedBackY).toBeGreaterThan(0.25);
    expect(afterY).toBeGreaterThanOrEqual(handedBackY - 1e-6);
    expect(launched).toBe(true);
  });

  it('a route-changing Final Lap Shift keeps each loop foot where it stands and drops one whose road was replaced', () => {
    const def: TrackDefinition = cloneDef(HARBOUR_LOOP);
    def.loops = [{ id: 'early', t: 0.2 }, { id: 'gone', t: 0.54 }, { id: 'late', t: 0.8 }];
    def.openEdges = []; // the pier edge would straddle this made-up detour (the validator forbids that)
    // the collapsed bridge from shift.test.ts: t 0.5-0.58 rerouted over a longer detour
    def.finalLapShift = {
      kind: 'collapse', label: 'BRIDGE OUT',
      routeOverrides: [{ fromT: 0.5, toT: 0.58, controlPoints: [{ x: 100, y: 8, z: 140, halfWidth: 7 }, { x: 50, y: 8, z: 165, halfWidth: 7 }] }], // smooth: the validator checks the final-lap road (track review, 24 Sept 2026)
    };
    const track = buildTrack(def);
    const before = track.length;
    const feet = new Map(track.loops.map((l) => [l.id, { t: l.t, p: track.sample(l.t, 0).position }]));
    track.applyFinalLapShift();
    expect(track.length).not.toBeCloseTo(before, 0);
    expect(track.loops.map((l) => l.id)).toEqual(['early', 'late']);
    for (const l of track.loops) {
      const was = feet.get(l.id)!;
      // same place in the world, so a new t on the longer road
      const p = track.sample(l.t, 0).position;
      expect(Math.hypot(p[0] - was.p[0], p[1] - was.p[1], p[2] - was.p[2])).toBeLessThan(0.5);
      expect(Math.abs(l.t - was.t) * track.length).toBeGreaterThan(2);
    }
    // and the sim catches a kart at the loop where it now stands
    const late = track.loops.findIndex((l) => l.id === 'late');
    const s = kartAt(track, track.loops[late].t - 10 / track.length, 0, 22);
    stepKart(s, NEUTRAL_INPUT, track, c, DT);
    expect(s.status.loopIndex).toBe(late);
  });

  it('Boardwalk Nights: after the fireworks shift adds the ferris ramp, the loop ride never runs onto its wedge', () => {
    const def = boardwalkJson as TrackDefinition;
    const track = buildTrack(def);
    track.applyFinalLapShift();
    const L = track.length;
    const loop = track.loops.find((l) => l.id === 'neon-loop')!;
    const ferris = track.jumps.find((j) => j.id === 'ferris-ramp')!;
    expect(loop).toBeDefined();
    expect(ferris).toBeDefined();
    // meters: the run-out ends before the wedge starts rising
    const runOutEnd = loop.t * L + loop.exit;
    const wedgeStart = ferris.t * L - (ferris.run ?? 0);
    expect(runOutEnd).toBeLessThan(wedgeStart);
    // and no road part of the ride, at any lane, sits on a ramp or bump
    const hw = loopFrame(track, loop).halfWidth;
    for (const lat0 of [-hw, 0, hw]) {
      const [entry, exit] = loopLanes(loop, lat0, hw);
      for (let s = 0; s <= loopLength(loop); s += 0.25) {
        if (s >= loop.approach && s < loop.approach + 2 * Math.PI * loop.radius) continue;
        const t = s < loop.approach ? loop.t + (s - loop.approach) / L : loop.t + (s - loop.approach - 2 * Math.PI * loop.radius) / L;
        const lat = s < loop.approach ? entry : exit;
        expect(jumpLift(track, t, 0, lat, hw)).toBe(0);
      }
    }
  });
});
