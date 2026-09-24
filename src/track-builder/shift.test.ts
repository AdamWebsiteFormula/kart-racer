import { describe, expect, it } from 'vitest';
import { makeConstants } from '../kart-controller/constants.ts';
import { SIM_DT, stepKart } from '../kart-controller/step.ts';
import { createKartState, NEUTRAL_INPUT } from '../kart-controller/types.ts';
import { BUILDER } from './constants.ts';
import { signedOffset } from './branches.ts';
import { spliceRoute } from './shift.ts';
import { buildTrack } from './track.ts';
import canyonJson from './tracks/canyon-rush.json';
import skylineJson from './tracks/skyline-circuit.json';
import { HARBOUR_WITH_PIER as HARBOUR_LOOP, cloneDef } from './__tests__/fixtures.ts';
import type { TrackChanged, TrackDefinition } from './types.ts';

const c = makeConstants('medium', 150);
/** Canyon Rush or Skyline Circuit on its final lap: the route override has made the shortcut the main road. */
function shifted(json: unknown) {
  const track = buildTrack(cloneDef(json as TrackDefinition));
  track.applyFinalLapShift([]);
  return track;
}

/** Harbour Loop with a bridge that collapses: the shift reroutes t 0.45–0.55 over a longer detour. */
function collapseDef(): TrackDefinition {
  const d = cloneDef(HARBOUR_LOOP);
  // the harbor's open pier edge (0.47-0.6) would straddle this made-up detour; the validator forbids that
  d.openEdges = [];
  d.finalLapShift = {
    kind: 'collapse',
    label: 'BRIDGE OUT',
    routeOverrides: [{ fromT: 0.5, toT: 0.58, controlPoints: [
      { x: 60, y: 8, z: 175, halfWidth: 7 },
      { x: 20, y: 8, z: 185, halfWidth: 7 },
    ] }],
    surfaceOverrides: [{ fromT: 0.1, toT: 0.15, surface: 'mud' }],
    gripMultiplier: 0.8,
    closesShortcuts: ['beach'],
    opensShortcuts: ['pier'],
    addsJumps: [{ id: 'gap', t: 0.3, launch: 6 }],
    disablesHazards: ['barrels'],
    sky: 'storm',
    musicVariant: 'tense',
  };
  return d;
}

describe('spliceRoute', () => {
  const pts = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ x: i, y: 0, z: 0, halfWidth: 5 }));
  const tOf = pts.map((_, i) => i / 8);
  it('replaces the points inside [fromT, toT] with the override points', () => {
    const out = spliceRoute(pts, tOf, [{ fromT: 0.2, toT: 0.45, controlPoints: [{ x: 99, y: 0, z: 0, halfWidth: 5 }] }]);
    expect(out.map((p) => p.x)).toEqual([0, 1, 99, 4, 5, 6, 7]);
  });
  it('wraps across the seam', () => {
    const out = spliceRoute(pts, tOf, [{ fromT: 0.85, toT: 0.1, controlPoints: [{ x: 99, y: 0, z: 0, halfWidth: 5 }] }]);
    expect(out.map((p) => p.x)).toEqual([1, 2, 3, 4, 5, 6, 99]); // same loop, cyclic order
  });
  it('inserts before the next point when nothing is swallowed', () => {
    const out = spliceRoute(pts, tOf, [{ fromT: 0.26, toT: 0.3, controlPoints: [{ x: 99, y: 0, z: 0, halfWidth: 5 }] }]);
    expect(out.map((p) => p.x)).toEqual([0, 1, 2, 99, 3, 4, 5, 6, 7]);
  });
});

describe('applyFinalLapShift', () => {
  it('route override changes length; features stay put; karts keep their position; overrides show in sample(); second call is a no-op', () => {
    const track = buildTrack(collapseDef());
    const before = track.length;
    const featuresBefore = track.features.map((f) => [...f.position]);
    const cpBefore = track.checkpoints.map((c) => c.t);
    const mainKart = createKartState({ racerId: 'a', position: track.sample(0.3, 1).position, t: 0.3 });
    const beach = track.branches.byId('beach')!;
    const branchKart = createKartState({ racerId: 'b', position: beach.lut.sample(0.5, 0).position, t: beach.toMain(0.5) });
    branchKart.branch = beach.index;
    const events: TrackChanged[] = [];
    track.onChanged((e) => events.push(e));

    const e = track.applyFinalLapShift([mainKart, branchKart])!;
    expect(track.length).not.toBeCloseTo(before, 0);
    expect(e.length).toBe(track.length);
    expect(events).toEqual([e]);
    expect(e.label).toBe('BRIDGE OUT');
    expect(e.sky).toBe('storm');

    // baked features did not move
    track.features.forEach((f, i) => {
      if (f.id === 'gap') return;
      const b = featuresBefore[i];
      expect(Math.hypot(f.position[0] - b[0], f.position[1] - b[1], f.position[2] - b[2])).toBeLessThan(0.05);
    });
    // the added jump is in the view
    expect(track.jumps.some((j) => j.id === 'gap' && j.launch === 6)).toBe(true);

    // karts: remapped t points at the kart's own position
    const s = track.sample(mainKart.t, 0);
    expect(Math.hypot(s.position[0] - mainKart.position[0], s.position[2] - mainKart.position[2])).toBeLessThan(1.5);
    expect(mainKart.branch).toBe(0);
    expect(branchKart.branch).toBe(beach.index);
    const bs = track.sample(branchKart.t, 0, branchKart.branch);
    expect(Math.hypot(bs.position[0] - branchKart.position[0], bs.position[2] - branchKart.position[2])).toBeLessThan(0.5);

    // surface and grip overrides
    expect(track.sample(0.12, 0).surface).toBe('mud');
    expect(track.sample(0.3, 0).gripScale).toBeCloseTo(0.8, 9);
    expect(track.sample(0.3, 0, 2).gripScale).toBeCloseTo(0.8, 9);

    // shortcuts, hazards
    expect(beach.open).toBe(false);
    expect(track.branches.byId('pier')!.open).toBe(true);
    expect(track.hazards.isEnabled('barrels')).toBe(false);

    // checkpoints recomputed from the same start-line world point
    expect(track.checkpoints).toHaveLength(HARBOUR_LOOP.checkpointCount);
    const start = track.sample(track.startT, 0).position;
    expect(Math.hypot(start[0] - track.startPoint[0], start[2] - track.startPoint[2])).toBeLessThan(0.05);
    expect(track.checkpoints.map((c) => c.t)).not.toEqual(cpBefore);

    // idempotent
    const snapshot = JSON.stringify({ l: track.length, f: track.features, c: track.checkpoints, g: Array.from(track.branches.main.lut.grip.slice(0, 16)) });
    expect(track.applyFinalLapShift([mainKart])).toBeUndefined();
    expect(JSON.stringify({ l: track.length, f: track.features, c: track.checkpoints, g: Array.from(track.branches.main.lut.grip.slice(0, 16)) })).toBe(snapshot);
    expect(events).toHaveLength(1);
  });

  it('Harbour Loop: the tide closes the beach and nothing else moves', () => {
    const track = buildTrack(HARBOUR_LOOP);
    const before = track.length;
    const e = track.applyFinalLapShift()!;
    expect(e.kind).toBe('flood');
    expect(track.length).toBe(before);
    expect(track.branches.byId('beach')!.open).toBe(false);
    expect(track.branches.byId('pier')!.open).toBe(true);
    expect(e.changedRanges).toEqual([]);
  });
});

// Bug hunt 2 (24 Sept 2026): the route override rebuilt the final-lap road from the shortcut's bare
// control points, but the shortcut had been welded to the main road at its ends, and the mine, its
// mesa, the land and any kart still on the closed shortcut all sit on the weld. The new road ran up
// to 3.4 m under them.
describe('the final-lap road takes the surface of the roads it runs along', () => {
  it('Canyon Rush: the mine on the new main road is covered portal to portal, at the height of the drawn bore', () => {
    const track = shifted(canyonJson);
    const main = track.branches.main.lut, tl = track.tunnels[0], last = tl.x.length - 1, mine = tl.lut;
    let toEntry = Infinity, toExit = Infinity, worst = 0;
    for (let i = 0; i < main.n; i++) {
      if (!main.covered[i]) continue;
      toEntry = Math.min(toEntry, Math.hypot(main.px[i] - tl.x[0], main.pz[i] - tl.z[0]));
      toExit = Math.min(toExit, Math.hypot(main.px[i] - tl.x[last], main.pz[i] - tl.z[last]));
      // the bore (mesh/tunnel.ts) is drawn on the mine shortcut: the road in it is that road's surface
      const at: [number, number, number] = [main.px[i], main.py[i], main.pz[i]];
      const u = mine.nearestT(at, mine.nearestTGlobal(at), 0.01), m = mine.sample(u, 0);
      const lat = ((at[0] - m.position[0]) * m.tangent[2] - (at[2] - m.position[2]) * m.tangent[0]) / Math.hypot(m.tangent[0], m.tangent[2]);
      worst = Math.max(worst, Math.abs(main.py[i] - mine.sample(u, lat).groundY));
    }
    // it ended 5-8 m short of the exit portal, 2.2 m under the bore, and that stretch was open sand (the mesa)
    expect(toEntry).toBeLessThan(1);
    expect(toExit).toBeLessThan(1);
    expect(worst).toBeLessThan(0.05);
  });

  it('Canyon Rush: the new main road meets the land at every curb a kart can reach, both ends of the mine included', () => {
    const track = shifted(canyonJson);
    const main = track.branches.main.lut;
    let worst = 0, where = '';
    for (let i = 0; i < main.n; i++) {
      if (main.covered[i] || main.reach[i] < 0.6) continue;
      for (const side of [-1, 1]) {
        if (main.open[i] & (side < 0 ? 1 : 2)) continue;
        const curb = main.hw[i] + BUILDER.kerbWidth;
        const edge = main.py[i] - side * curb * Math.tan(main.bank[i]) - BUILDER.offroadDrop;
        const step = track.sample(i / main.n, side * (curb + 0.6), 0).groundY - edge;
        if (Math.abs(step) > Math.abs(worst)) { worst = step; where = `t ${(i / main.n).toFixed(4)} side ${side}`; }
      }
    }
    // it stepped up 11.9 m onto the mesa out of the mine, and 2.3 m and 1.2 m around its entry
    expect(Math.abs(worst), where).toBeLessThan(1);
  });

  it('Canyon Rush: a kart hugging either wall out of the mine on the final lap stays on the ground it sees', () => {
    for (const side of [-1, 1]) for (const speed of [14, 20]) for (const back of [25, 40]) {
      const track = shifted(canyonJson);
      const main = track.branches.main.lut;
      let exit = 0;
      for (let i = 0; i < main.n; i++) if (main.covered[i]) exit = i;
      const t0 = (exit - back / (main.length / main.step)) / main.n;
      const p = track.sample(t0, side * (track.sample(t0, 0).halfWidth + BUILDER.kerbWidth - 1));
      const s = createKartState({ racerId: 'k', position: [...p.position], heading: Math.atan2(p.tangent[0], p.tangent[2]), t: t0 });
      s.speed = speed;
      let high = 0, rise = 0;
      for (let k = 0; k < 360; k++) {
        const y = s.position[1], grounded = s.grounded;
        stepKart(s, { ...NEUTRAL_INPUT, throttle: 1, steer: side * 0.25 }, track, c, SIM_DT);
        if (!s.grounded) continue;
        high = Math.max(high, s.position[1] - track.sample(s.t, 0, s.branch).groundY);
        if (grounded) rise = Math.max(rise, s.position[1] - y);
      }
      // it was snapped up 12 m onto the mesa, up to 1.47 m in one tick
      expect(high, `side ${side}, ${speed} m/s, ${back} m before the exit`).toBeLessThan(2.5);
      expect(rise, `side ${side}, ${speed} m/s, ${back} m before the exit`).toBeLessThan(0.3);
    }
  });

  it("Skyline Circuit: a kart finishing the closed sky-rail rides the road drawn under it, not the air 3 m over it", () => {
    for (const back of [150, 60]) for (const lateral of [0, 2]) {
      const track = buildTrack(cloneDef(skylineJson as TrackDefinition));
      const rail = track.branches.byId('sky-rail')!, u0 = 1 - back / rail.lut.length;
      const p = rail.lut.sample(u0, lateral);
      const s = createKartState({ racerId: 'k', position: [...p.position], heading: Math.atan2(p.tangent[0], p.tangent[2]), t: rail.toMain(u0) });
      s.branch = rail.index;
      s.speed = 22;
      track.applyFinalLapShift([s]);
      expect(rail.open).toBe(false); // the scene hides it: only the new main road is drawn
      expect(s.branch).toBe(0); // and the kart is on that road
      let worst = 0, ticks = 0;
      for (let k = 0; k < 900 && signedOffset(s.t, rail.exitT) < 0; k++) {
        stepKart(s, { ...NEUTRAL_INPUT, throttle: 1 }, track, c, SIM_DT);
        if (!s.grounded) continue;
        ticks++;
        const t = track.branches.main.lut.nearestT(s.position, s.t, 0.02), m = track.sample(t, 0);
        const lat = ((s.position[0] - m.position[0]) * m.tangent[2] - (s.position[2] - m.position[2]) * m.tangent[0]) / Math.hypot(m.tangent[0], m.tangent[2]);
        worst = Math.max(worst, Math.abs(s.position[1] - track.sample(t, lat).groundY));
      }
      expect(ticks, `${back} m before the exit, lateral ${lateral}`).toBeGreaterThan(200);
      expect(worst, `${back} m before the exit, lateral ${lateral}`).toBeLessThan(0.1);
    }
  });

  it('Canyon Rush, Skyline Circuit: a kart still on the closed shortcut the new main road runs along is on the main road, where it is (seam review: shots on the new road passed through it)', () => {
    for (const json of [canyonJson, skylineJson]) {
      const track = buildTrack(cloneDef(json as TrackDefinition));
      const sc = track.branches.list[1];
      const karts: ReturnType<typeof createKartState>[] = [];
      // (from its first third on: before that Skyline's new road runs up to 5.6 m beside the old rail, whose
      // karts are not on it and ride the rail out)
      for (let k = 0; k <= 12; k++) {
        const u = 0.3 + k * 0.05, hw = sc.lut.sample(u, 0).halfWidth;
        for (const lateral of [0, hw - c.kartRadius, c.kartRadius - hw]) {
          const p = sc.lut.sample(u, lateral);
          const s = createKartState({ racerId: `k${karts.length}`, position: [...p.position], heading: Math.atan2(p.tangent[0], p.tangent[2]), t: sc.toMain(u) });
          s.branch = sc.index;
          karts.push(s);
        }
      }
      track.applyFinalLapShift(karts);
      for (const s of karts) {
        const at = `${track.id} ${s.racerId}`;
        expect(s.branch, at).toBe(0);
        // its t is where it is on the new road, and it sits on that road's surface
        const m = track.sample(s.t, 0);
        const lat = ((s.position[0] - m.position[0]) * m.tangent[2] - (s.position[2] - m.position[2]) * m.tangent[0]) / Math.hypot(m.tangent[0], m.tangent[2]);
        const on = track.sample(s.t, lat);
        expect(Math.hypot(on.position[0] - s.position[0], on.position[2] - s.position[2]), at).toBeLessThan(0.1);
        expect(Math.abs(on.groundY - s.position[1]), at).toBeLessThan(0.1);
      }
    }
  });
});
