import { describe, expect, it } from 'vitest';
import { makeConstants } from '../kart-controller/constants.ts';
import { lateralOffset } from '../kart-controller/ground.ts';
import { SIM_DT, stepKart } from '../kart-controller/step.ts';
import { createKartState, headingOf, NEUTRAL_INPUT, type Vec3 } from '../kart-controller/types.ts';
import { T_SEARCH_WINDOW } from './constants.ts';
import { wrap01 } from './lut.ts';
import { buildTrack } from './track.ts';
import canyonJson from './tracks/canyon-rush.json';
import type { TrackDefinition } from './types.ts';
import { HARBOUR_WITH_PIER as HARBOUR_LOOP, cloneDef } from './__tests__/fixtures.ts';

const track = buildTrack(HARBOUR_LOOP);
const beach = track.branches.byId('beach')!;
const pier = track.branches.byId('pier')!;

/** Walk a branch centreline from before the entry to after the exit, main-line hint only. */
function drive(branch: typeof beach, lateral = 0, startOn = 0) {
  const trace: { t: number; branch: number }[] = [];
  let hint = { t: wrap01(branch.entryT - 0.01), branch: startOn };
  const stepsBefore = 10, stepsIn = 60, stepsAfter = 10;
  for (let i = -stepsBefore; i <= stepsIn + stepsAfter; i++) {
    let p;
    if (i < 0) p = track.sample(wrap01(branch.entryT + (i / stepsBefore) * 0.01), lateral, 0).position;
    else if (i <= stepsIn) p = branch.lut.sample(i / stepsIn, lateral).position;
    else p = track.sample(wrap01(branch.exitT + ((i - stepsIn) / stepsAfter) * 0.01), lateral, 0).position;
    hint = track.nearest(p, hint, T_SEARCH_WINDOW);
    trace.push(hint);
  }
  return trace;
}

describe('branches', () => {
  it('a kart on the shortcut gets the shortcut ground and t is monotonic through it', () => {
    const trace = drive(beach);
    expect(trace[0].branch).toBe(0);
    const onBranch = trace.filter((h) => h.branch === beach.index);
    expect(onBranch.length).toBeGreaterThan(40);
    expect(trace.at(-1)!.branch).toBe(0);
    for (let i = 1; i < trace.length; i++) {
      const d = wrap01(trace[i].t - trace[i - 1].t);
      expect(d).toBeLessThan(0.05); // forward or equal, never backwards
    }
    // ground on the branch is the branch's surface, not the main line's
    const mid = beach.lut.sample(0.5, 0).position;
    const h = track.nearest(mid, { t: beach.toMain(0.5), branch: beach.index }, T_SEARCH_WINDOW);
    expect(h.branch).toBe(beach.index);
    expect(track.sample(h.t, 0, h.branch).surface).toBe('road'); // the beach is a boardwalk since 2026-09-21; the point is that the sample comes from the branch
    expect(track.sample(h.t, 0, h.branch).position[0]).toBeCloseTo(mid[0], 3);
  });

  it('a kart still on the main road is not taken by a fork it drives past; off the road it is', () => {
    // just past the beach entry the beach line runs a few metres left of the main line
    const t = wrap01(beach.entryT + beach.span * 0.05);
    const main = track.sample(t, 0, 0);
    const beachLine = beach.lut.sample(0.05, 0).position;
    const side = Math.sign((beachLine[0] - main.position[0]) * main.tangent[2] - (beachLine[2] - main.position[2]) * main.tangent[0]);
    const hw = main.halfWidth;
    // on the main road, well over to the fork side: stays on main
    const onRoad = track.sample(t, side * (hw - 2.0), 0).position;
    expect(track.nearest(onRoad, { t, branch: 0 }, T_SEARCH_WINDOW).branch).toBe(0);
    // beyond the main road's edge, where only the beach is under the wheels: the beach
    const off = track.sample(t, side * (hw + 1.5), 0).position;
    expect(track.nearest(off, { t, branch: 0 }, T_SEARCH_WINDOW).branch).toBe(beach.index);
  });

  it('a closed shortcut is never selected', () => {
    beach.forcedOpen = false;
    try {
      const trace = drive(beach);
      expect(trace.every((h) => h.branch === 0)).toBe(true);
    } finally {
      beach.forcedOpen = undefined;
    }
  });

  it('a kart mid-branch when it closes finishes it', () => {
    const trace: number[] = [];
    let hint = track.nearest(beach.lut.sample(0.4, 0).position, { t: beach.toMain(0.4), branch: beach.index }, T_SEARCH_WINDOW);
    expect(hint.branch).toBe(beach.index);
    beach.forcedOpen = false;
    try {
      for (let i = 41; i <= 60; i++) {
        hint = track.nearest(beach.lut.sample(i / 60, 0).position, hint, T_SEARCH_WINDOW);
        trace.push(hint.branch);
      }
      expect(trace.every((b) => b === beach.index)).toBe(true);
      // and then rejoins the main line
      hint = track.nearest(track.sample(wrap01(beach.exitT + 0.01), 0).position, hint, T_SEARCH_WINDOW);
      expect(hint.branch).toBe(0);
    } finally {
      beach.forcedOpen = undefined;
    }
  });

  it('a stale hint on a closed shortcut, outside its range, is treated as main', () => {
    beach.forcedOpen = false;
    try {
      // hint says "on the beach" but its t is a quarter lap before the entry
      const t = wrap01(beach.entryT - 0.25);
      const h = track.nearest(track.sample(t, 0).position, { t, branch: beach.index }, T_SEARCH_WINDOW);
      expect(h.branch).toBe(0);
      expect(Math.abs(h.t - t)).toBeLessThan(1e-6);
    } finally {
      beach.forcedOpen = undefined;
    }
  });

  it('openOnLaps: a lap-gated shortcut opens only on those laps', () => {
    const def = cloneDef(HARBOUR_LOOP);
    def.shortcuts![1].openOnLaps = [3];
    const t2 = buildTrack(def);
    const p2 = t2.branches.byId('pier')!;
    expect(p2.open).toBe(false); // built at lap 1
    t2.setLap(2); expect(p2.open).toBe(false);
    t2.setLap(3); expect(p2.open).toBe(true);
  });

  it('main-equivalent t on a branch spans entryT..exitT; the pier ends within 2 m of the main line', () => {
    expect(pier.toMain(0)).toBeCloseTo(pier.entryT, 9);
    expect(pier.toMain(1)).toBeCloseTo(pier.exitT, 9);
    const e = pier.lut.sample(0, 0).position, m = track.sample(pier.entryT, 0).position;
    expect(Math.hypot(e[0] - m[0], e[1] - m[1], e[2] - m[2])).toBeLessThan(2);
    const x = pier.lut.sample(1, 0).position, n = track.sample(pier.exitT, 0).position;
    expect(Math.hypot(x[0] - n[0], x[1] - n[1], x[2] - n[2])).toBeLessThan(2);
  });

  it('nearestGlobal finds a branch point in 3D and the main line elsewhere', () => {
    const g = track.nearestGlobal(pier.lut.sample(0.5, 0).position);
    expect(g.branch).toBe(pier.index);
    const m = track.nearestGlobal(track.sample(0.1, 0).position);
    expect(m.branch).toBe(0);
    expect(m.t).toBeCloseTo(0.1, 3);
  });
});

describe('handing a kart between roads (bug hunt, 24 Sept 2026)', () => {
  const canyon = buildTrack(cloneDef(canyonJson as TrackDefinition));
  const mine = canyon.branches.byId('mine-tunnel')!;
  const main = canyon.branches.main;

  /** `metres` along the mine's centreline tangent from its end at u (0 or 1). */
  function offEnd(u: 0 | 1, metres: number): Vec3 {
    const e = mine.lut.sample(u, 0), h = Math.hypot(e.tangent[0], e.tangent[2]);
    return [e.position[0] + (e.tangent[0] / h) * metres, e.position[1], e.position[2] + (e.tangent[2] / h) * metres];
  }

  it('past either end of a shortcut the kart is on the road it joins; short of the end it is still on the shortcut', () => {
    // out of the exit, then reversing out of the entry: 2 m is well inside the road's half-width,
    // where the clamped end point used to hold the kart
    const out = canyon.nearest(offEnd(1, 2), { t: mine.exitT, branch: mine.index }, T_SEARCH_WINDOW);
    expect(out.branch).toBe(0);
    expect(mine.nearestLocal(offEnd(1, 2), mine.exitT, T_SEARCH_WINDOW).d2).toBe(Infinity);
    const back = canyon.nearest(offEnd(0, -2), { t: mine.entryT, branch: mine.index }, T_SEARCH_WINDOW);
    expect(back.branch).toBe(0);
    // 2 m short of either end it is still the mine's
    expect(canyon.nearest(offEnd(1, -2), { t: mine.exitT, branch: mine.index }, T_SEARCH_WINDOW).branch).toBe(mine.index);
    expect(canyon.nearest(offEnd(0, 2), { t: mine.entryT, branch: mine.index }, T_SEARCH_WINDOW).branch).toBe(mine.index);
  });

  it("Canyon Rush: driving out of the mine, straight or wide onto the sand, rides no flat extension of the mine's end", () => {
    const c = makeConstants('medium', 150);
    const L = mine.lut, end = L.n - 1;
    for (const [u, turn] of [[0.95, 0], [0.98, 0.3]] as const) {
      const p = L.sample(u, 0);
      const s = createKartState({ racerId: 'k', position: [...p.position], heading: headingOf(p.tangent) + turn, t: mine.toMain(u) });
      s.branch = mine.index;
      s.speed = 22;
      let past = 0, onMine = 0, worst = 0;
      for (let k = 0; k < 400 && past < 1.5 / SIM_DT; k++) {
        stepKart(s, { ...NEUTRAL_INPUT, throttle: 1 }, canyon, c, SIM_DT);
        if ((s.position[0] - L.px[end]) * L.tx[end] + (s.position[2] - L.pz[end]) * L.tz[end] <= 0) continue;
        past++;
        if (s.branch === mine.index) onMine++;
        // standing on the ground, it stands on the main road's ground under it, not on a plane above it
        const mt = main.nearestGlobal(s.position).t;
        const g = canyon.sample(mt, lateralOffset(canyon, mt, s.position, 0).lateral, 0).groundY;
        if (s.grounded) worst = Math.max(worst, Math.abs(s.position[1] - g));
      }
      expect(past, `from u ${u}, turned ${turn}`).toBeGreaterThan(100);
      // it rode the mine's end for 37 ticks straight and 234 wide, up to 4.8 m over the sand
      expect(onMine, `from u ${u}, turned ${turn}`).toBe(0);
      expect(worst, `from u ${u}, turned ${turn}`).toBeLessThan(0.2);
    }
  });

  it("Canyon Rush: off the mine onto the main road beside its entry, the ground is read under the kart, not at the edge of the mine's window", () => {
    // on the sand left of the main road, turned back toward the mine entry: it is taken by the mine,
    // then handed to the main road; that hand-over read the ground 12.5 m away, 1.2 m higher
    const c = makeConstants('light', 150);
    const p = canyon.sample(0.3075, -17.4, 0);
    const s = createKartState({ racerId: 'k', position: [...p.position], heading: headingOf(p.tangent) + (3 * Math.PI) / 4, t: 0.3075 });
    s.speed = 15;
    let switches = 0, worstOff = 0, worstRise = 0;
    for (let k = 0; k < 120; k++) {
      const branch = s.branch, y = s.position[1], grounded = s.grounded;
      stepKart(s, { ...NEUTRAL_INPUT, throttle: 1 }, canyon, c, SIM_DT);
      if (grounded && s.grounded) worstRise = Math.max(worstRise, s.position[1] - y);
      if (s.branch === branch) continue;
      switches++;
      const smp = canyon.sample(s.t, lateralOffset(canyon, s.t, s.position, s.branch).lateral, s.branch);
      worstOff = Math.max(worstOff, Math.hypot(smp.position[0] - s.position[0], smp.position[2] - s.position[2]));
    }
    expect(switches).toBeGreaterThanOrEqual(2); // main → mine → main
    expect(worstOff).toBeLessThan(0.5);
    expect(worstRise).toBeLessThan(0.3);
  });

  it('every welded shortcut end is a smooth road, not a saw: the weld reads the main road where it really is nearest', () => {
    // bug hunt 2 (24 Sept 2026): the weld's nearest-sample walk moved its window mid-scan and read the
    // main road up to 4 samples off; out of Canyon's mine the road sawed ±0.45 m from one sample to the
    // next (second difference 0.86 m; Skyline's rail 0.56, Frostbite 0.15, Harbor 0.13)
    const defs = Object.values(import.meta.glob('./tracks/*.json', { eager: true, import: 'default' }) as Record<string, TrackDefinition>);
    for (const def of defs) {
      for (const b of buildTrack(def).branches.list) {
        if (b.isMain) continue;
        const L = b.lut;
        let worst = 0, at = 0;
        for (let i = 1; i < L.n - 1; i++) {
          const d2 = Math.abs(L.py[i + 1] - 2 * L.py[i] + L.py[i - 1]);
          if (d2 > worst) { worst = d2; at = i; }
        }
        expect(worst, `${def.id} ${b.id} at sample ${at} of ${L.n}`).toBeLessThan(0.1);
      }
    }
  });
});
