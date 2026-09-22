import { describe, expect, it } from 'vitest';
import { InstancedMesh, Mesh } from 'three';
import { BUILDER } from '../constants.ts';
import { buildTrack } from '../track.ts';
import type { TrackDefinition } from '../types.ts';
import { HARBOUR_LOOP, cloneDef } from '../__tests__/fixtures.ts';
import { chunkCountFor } from './chunks.ts';
import { insideRoadEnvelope } from './decor.ts';
import { paletteFor } from './palette.ts';
import { buildRibbon } from './road.ts';
import { buildTrackScene, isDrawn } from './scene.ts';

function collapseDef(): TrackDefinition {
  const d = cloneDef(HARBOUR_LOOP);
  d.finalLapShift = {
    kind: 'collapse', label: 'BRIDGE OUT',
    routeOverrides: [{ fromT: 0.5, toT: 0.58, controlPoints: [{ x: 60, y: 8, z: 175, halfWidth: 7 }, { x: 20, y: 8, z: 185, halfWidth: 7 }] }],
    addsJumps: [{ id: 'gap', t: 0.3, launch: 6 }],
    fogDensity: 0.01,
  };
  return d;
}

function meshes(scene: ReturnType<typeof buildTrackScene>): Mesh[] {
  const out: Mesh[] = [];
  scene.group.traverse((o) => { if (isDrawn(o as Mesh)) out.push(o as Mesh); });
  return out;
}

describe('draw-call budget (SOP test 14)', () => {
  const track = buildTrack(HARBOUR_LOOP);
  const scene = buildTrackScene(track);

  it('Harbour Loop scene has ≤ 40 Mesh + InstancedMesh objects, each with one material', () => {
    const list = meshes(scene);
    expect(list.length).toBe(scene.drawables());
    expect(list.length).toBeLessThanOrEqual(BUILDER.trackDrawCallBudget);
    for (const m of list) expect(Array.isArray(m.material)).toBe(false);
  });

  it('chunks: 8 on the main line, proportional (≥ 1) on shortcuts, one shared material', () => {
    const main = scene.chunks.filter((c) => c.branch === 0);
    expect(main).toHaveLength(BUILDER.chunkCount);
    for (const b of track.branches.list) {
      if (b.isMain) continue;
      const n = chunkCountFor(b, track.branches.main);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThan(BUILDER.chunkCount);
      expect(scene.chunks.filter((c) => c.branch === b.index)).toHaveLength(n);
    }
    const mats = new Set(scene.chunks.map((c) => c.mesh.material));
    expect(mats.size).toBe(1);
  });

  it('a popped balloon or taken coin is hidden (zero scale) until its timer runs out', () => {
    const balloons = scene.instancers.get('balloons')!;
    const n = HARBOUR_LOOP.pickups!.length;
    const timers = Array.from({ length: n }, () => ({ respawnRemaining: 0 }));
    timers[1].respawnRemaining = 2;
    scene.update(0, [], { pickups: timers });
    const a = balloons.instanceMatrix.array as Float32Array;
    expect(a[16 * 1 + 0]).toBe(0); // scale x of slot 1
    expect(a[16 * 0 + 0]).not.toBe(0);
    timers[1].respawnRemaining = 0;
    scene.update(0, [], { pickups: timers });
    expect(a[16 * 1 + 0]).not.toBe(0);
  });

  it('every expected instancer exists and is an InstancedMesh', () => {
    for (const name of ['barriers', 'balloons', 'coins', 'boostPads', 'ramps', 'hazard:barrel', 'decor:palm', 'decor:boat']) {
      expect(scene.instancers.get(name), name).toBeInstanceOf(InstancedMesh);
    }
    expect(scene.instancers.get('balloons')!.count).toBe(HARBOUR_LOOP.pickups!.length);
    expect(scene.instancers.get('coins')!.count).toBe(HARBOUR_LOOP.coins!.length);
    expect(scene.instancers.get('decor:palm')!.count).toBe(60);
  });
});

describe('ribbon geometry', () => {
  const track = buildTrack(HARBOUR_LOOP);
  const lut = track.branches.main.lut;
  const palette = paletteFor(HARBOUR_LOOP);

  it('has no NaN, normals point up, road strip edges sit at ±halfWidth', () => {
    const g = buildRibbon(lut, 0, 0.125, palette);
    const pos = g.getAttribute('position').array as Float32Array;
    const nrm = g.getAttribute('normal').array as Float32Array;
    for (const v of pos) expect(Number.isFinite(v)).toBe(true);
    // strip 4 is the road: verts [4 × perStrip, 5 × perStrip). Kerb faces are vertical, so only the road is checked for up.
    const count = Math.ceil(0.125 * lut.step) + 1;
    const perStrip = count * 2;
    const roadStart = 4 * perStrip;
    for (let k = 0; k < count; k++) {
      const a = roadStart + k * 2, b = a + 1;
      const j = lut.idx(k);
      const dx = pos[b * 3] - pos[a * 3], dz = pos[b * 3 + 2] - pos[a * 3 + 2];
      expect(Math.hypot(dx, dz)).toBeCloseTo(2 * lut.hw[j], 4);
      expect(nrm[a * 3 + 1]).toBeGreaterThan(0.9);
      expect(nrm[b * 3 + 1]).toBeGreaterThan(0.9);
    }
  });

  it('on a banked span the road normal matches the sim normal (tilted, not up)', () => {
    // Harbour control point 5 banks 10°; find the most banked sample and build a chunk around it
    let best = 0;
    for (let i = 0; i < lut.n; i++) if (Math.abs(lut.bank[i]) > Math.abs(lut.bank[best])) best = i;
    expect(Math.abs(lut.bank[best])).toBeGreaterThan(0.1);
    const u0 = Math.max(0, (best - 4) / lut.step), u1 = Math.min(1, (best + 4) / lut.step);
    const g = buildRibbon(lut, u0, u1, palette);
    const nrm = g.getAttribute('normal').array as Float32Array;
    const count = Math.ceil(u1 * lut.step) - Math.floor(u0 * lut.step) + 1;
    const k = best - Math.floor(u0 * lut.step);
    const a = 4 * count * 2 + k * 2; // road strip, left vertex at the banked sample
    const sim = lut.sample(best / lut.step, -lut.hw[best]).normal;
    const dot = nrm[a * 3] * sim[0] + nrm[a * 3 + 1] * sim[1] + nrm[a * 3 + 2] * sim[2];
    expect(dot).toBeGreaterThan(0.995);
    expect(Math.abs(sim[0]) + Math.abs(sim[2])).toBeGreaterThan(0.1);
  });

  it('uv v advances by 1 every ROAD_TILE_LENGTH metres', () => {
    const g = buildRibbon(lut, 0, 0.125, palette);
    const uv = g.getAttribute('uv').array as Float32Array;
    const metresPerSample = lut.length / lut.step;
    expect(uv[2 * 2 + 1] - uv[1]).toBeCloseTo(metresPerSample / BUILDER.roadTileLength, 6);
  });

  it('the last main chunk closes the seam: its final section equals sample 0', () => {
    const g = buildRibbon(lut, 0.875, 1, palette);
    const pos = g.getAttribute('position').array as Float32Array;
    const count = Math.ceil(lut.step) - Math.floor(0.875 * lut.step) + 1;
    const perStrip = count * 2;
    const roadStart = 4 * perStrip;
    const lastA = roadStart + (count - 1) * 2;
    const c = lut.sample(0, -lut.hw[0]).position;
    expect(pos[lastA * 3]).toBeCloseTo(c[0], 3);
    expect(pos[lastA * 3 + 2]).toBeCloseTo(c[2], 3);
  });
});

describe('decor and barriers', () => {
  const track = buildTrack(HARBOUR_LOOP);
  const scene = buildTrackScene(track);

  it('ground decor never sits inside any road envelope; sky decor floats above the road', () => {
    for (const p of scene.decor) {
      for (let i = 0; i < p.count; i++) {
        const x = p.matrices[i * 16 + 12], y = p.matrices[i * 16 + 13], z = p.matrices[i * 16 + 14];
        if (p.band === 'sky') expect(y).toBeGreaterThan(track.branches.main.lut.minY + BUILDER.decorBands.sky[0] - 1);
        else expect(insideRoadEnvelope(track.branches, x, z)).toBe(false);
      }
    }
  });

  it('decor is deterministic: two builds give byte-identical matrices (SOP test 13)', () => {
    const other = buildTrackScene(buildTrack(HARBOUR_LOOP));
    expect(other.decor.length).toBe(scene.decor.length);
    scene.decor.forEach((p, i) => {
      expect(Array.from(other.decor[i].matrices)).toEqual(Array.from(p.matrices));
    });
    const a = scene.chunks[3].mesh.geometry.getAttribute('position').array;
    const b = other.chunks[3].mesh.geometry.getAttribute('position').array;
    expect(Array.from(b)).toEqual(Array.from(a));
  });

  it('barriers: two per BARRIER_SPACING on every branch, minus the few posts that would fence a shortcut mouth', () => {
    let expected = 0;
    for (const b of track.branches.list) expected += 2 * Math.max(1, Math.floor(b.lut.length / BUILDER.barrierSpacing));
    const count = scene.instancers.get('barriers')!.count;
    expect(count).toBeLessThan(expected);
    expect(count).toBeGreaterThan(expected * 0.9);
    // no surviving post stands on another branch's road
    const a = scene.instancers.get('barriers')!.instanceMatrix.array;
    for (let i = 0; i < count; i++) {
      const x = a[i * 16 + 12], z = a[i * 16 + 14];
      let onRoads = 0;
      for (const b of track.branches.list) {
        const one = { list: [b], main: track.branches.main } as unknown as typeof track.branches;
        if (insideRoadEnvelope(one, x, z, -1, BUILDER.kerbWidth + 0.5)) onRoads++;
      }
      expect(onRoads).toBeLessThanOrEqual(1);
    }
  });

  it('a closed shortcut has no posts and its chunks are hidden after the shift', () => {
    const t = buildTrack(HARBOUR_LOOP); // the tide closes the beach
    const s = buildTrackScene(t);
    const before = s.instancers.get('barriers')!.count;
    t.applyFinalLapShift();
    const beach = t.branches.byId('beach')!;
    expect(s.instancers.get('barriers')!.count).toBeLessThan(before - 100);
    for (const c of s.chunks) expect(c.mesh.visible).toBe(c.branch !== beach.index);
  });
});

describe('Final Lap Shift swap and hazards', () => {
  it('a route override rebuilds every main chunk and the barriers, adds the new ramp, keeps branch chunks', () => {
    const track = buildTrack(collapseDef());
    const scene = buildTrackScene(track);
    const before = scene.chunks.map((c) => c.mesh.geometry);
    const barriersBefore = scene.instancers.get('barriers');
    const rampsBefore = scene.instancers.get('ramps')!.count;
    track.applyFinalLapShift();
    scene.chunks.forEach((c, i) => {
      if (c.branch === 0) expect(c.mesh.geometry).not.toBe(before[i]);
      else expect(c.mesh.geometry).toBe(before[i]);
    });
    expect(scene.instancers.get('barriers')).not.toBe(barriersBefore);
    expect(scene.instancers.get('ramps')!.count).toBe(rampsBefore + 1);
    expect(scene.fog.density).toBe(0.01);
    expect(scene.drawables()).toBeLessThanOrEqual(BUILDER.trackDrawCallBudget);
  });

  it('a surface-only shift rebuilds just the touched chunks', () => {
    const d = cloneDef(HARBOUR_LOOP);
    d.finalLapShift = { kind: 'storm', label: 'RAIN', surfaceOverrides: [{ fromT: 0.3, toT: 0.34, surface: 'mud' }] };
    const track = buildTrack(d);
    const scene = buildTrackScene(track);
    const before = scene.chunks.map((c) => c.mesh.geometry);
    track.applyFinalLapShift();
    const rebuilt = scene.chunks.filter((c, i) => c.mesh.geometry !== before[i]);
    expect(rebuilt.map((c) => `${c.branch}:${c.index}`)).toEqual(['0:2']);
  });

  it('update(time) moves the barrel and never exceeds its capacity', () => {
    const track = buildTrack(HARBOUR_LOOP);
    const scene = buildTrackScene(track);
    const m = scene.instancers.get('hazard:barrel')!;
    expect(m.count).toBe(1);
    const x0 = m.instanceMatrix.array[12];
    scene.update(2);
    expect(m.count).toBe(1);
    expect(m.instanceMatrix.array[12]).not.toBe(x0);
  });

  it('lap gating: a shortcut closed on lap 1 starts hidden, with no coins or posts, and appears when its lap comes', () => {
    const d = cloneDef(HARBOUR_LOOP);
    d.shortcuts![0].openOnLaps = [2];
    const t = buildTrack(d);
    const s = buildTrackScene(t);
    const beach = t.branches.byId('beach')!;
    for (const c of s.chunks) if (c.branch === beach.index) expect(c.mesh.visible).toBe(false);
    const coinsClosed = s.instancers.get('coins')!.count;
    const postsClosed = s.instancers.get('barriers')!.count;
    expect(coinsClosed).toBe(HARBOUR_LOOP.coins!.length - 1); // the beach coin
    t.setLap(2);
    s.update(0);
    for (const c of s.chunks) if (c.branch === beach.index) expect(c.mesh.visible).toBe(true);
    expect(s.instancers.get('coins')!.count).toBe(coinsClosed + 1);
    expect(s.instancers.get('barriers')!.count).toBeGreaterThan(postsClosed + 100);
  });

  it('dispose unsubscribes: a later shift does not touch the group', () => {
    const track = buildTrack(collapseDef());
    const scene = buildTrackScene(track);
    scene.dispose();
    expect(scene.group.children).toHaveLength(0);
    expect(() => track.applyFinalLapShift()).not.toThrow();
    expect(scene.group.children).toHaveLength(0);
  });
});
