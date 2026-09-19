import { describe, expect, it } from 'vitest';
import { T_SEARCH_WINDOW } from './constants.ts';
import { wrap01 } from './lut.ts';
import { buildTrack } from './track.ts';
import { HARBOUR_LOOP, cloneDef } from './__tests__/fixtures.ts';

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
    expect(track.sample(h.t, 0, h.branch).surface).toBe('dirt');
    expect(track.sample(h.t, 0, h.branch).position[0]).toBeCloseTo(mid[0], 3);
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
