import { describe, expect, it } from 'vitest';
import { createKartState } from '../kart-controller/types.ts';
import { spliceRoute } from './shift.ts';
import { buildTrack } from './track.ts';
import { HARBOUR_LOOP, cloneDef } from './__tests__/fixtures.ts';
import type { TrackChanged, TrackDefinition } from './types.ts';

/** Harbour Loop with a bridge that collapses: the shift reroutes t 0.45–0.55 over a longer detour. */
function collapseDef(): TrackDefinition {
  const d = cloneDef(HARBOUR_LOOP);
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
