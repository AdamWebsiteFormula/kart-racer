// The crowd (crowd.ts): every track lines its road with spectators, placed where no kart and no lens
// can reach them, on the ground (or their stand), clear of the creature; two InstancedMeshes (the
// stands' crowds, the lite crowd along the road) and one stand mesh, no shadow; posed in the vertex
// shader as a pure function of the clock.
import { describe, expect, it } from 'vitest';
import { Matrix4, Vector3, type BufferGeometry, type InstancedMesh, type Mesh } from 'three';
import { BUILDER } from '../track-builder/constants.ts';
import { buildTrackScene } from '../track-builder/mesh/index.ts';
import { mirrorTrack } from '../track-builder/mirror.ts';
import { buildTrack, type Track } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { CAM, loopCamPose } from '../game/camera.ts';
import { trackAssets } from './index.ts';
import { CLEAR, CROWD, CROWD_GROUPS, crowdPose, RIG_HEIGHT, SPECIES, type Crowd, type Spectator } from './crowd.ts';

const TRACKS = Object.values(import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' })) as TrackDefinition[];

function crowdOf(group: { traverse(f: (o: { name: string; userData: Record<string, unknown> }) => void): void }): { crowd: Crowd; meshes: Mesh[] } {
  let crowd: Crowd | undefined;
  const meshes: Mesh[] = [];
  group.traverse((o) => {
    if (o.name === 'crowd' || o.name === 'crowd-lite' || o.name === 'crowd-stands') meshes.push(o as unknown as Mesh);
    if (o.userData.crowd) crowd = o.userData.crowd as Crowd;
  });
  return { crowd: crowd!, meshes };
}

/** Each road of `track` as points with the distance from its centre to its course limit (off-road) or solid edge (pier, sky road). */
function limits(track: Track): { x: number; z: number; lim: number }[] {
  const out: { x: number; z: number; lim: number }[] = [];
  for (const b of track.branches.list) {
    const L = b.lut;
    for (let i = 0; i < L.n; i += 2) {
      const s = L.sample(i / L.n, 0);
      out.push({ x: L.px[i], z: L.pz[i], lim: Math.max(s.wall ?? 0, L.hw[i] + BUILDER.kerbWidth) });
    }
  }
  return out;
}

/** How far (x, z) stands past the nearest road's limit. */
function pastLimit(lims: readonly { x: number; z: number; lim: number }[], x: number, z: number): number {
  let best = Infinity;
  for (const l of lims) best = Math.min(best, Math.hypot(l.x - x, l.z - z) - l.lim);
  return best;
}

/** Points covering a critter (its feet's circle) and a solid's footprint, for the checks. */
function footprints(c: Crowd): { x: number; z: number; r: number; what: string }[] {
  const out: { x: number; z: number; r: number; what: string }[] = [];
  for (const s of c.layout.spectators) out.push({ x: s.at[0], z: s.at[2], r: 0.45 * s.scale, what: `${s.species} ${s.on}` });
  for (const so of c.layout.solids) {
    const cs = Math.cos(so.yaw), sn = Math.sin(so.yaw);
    for (let a = -1; a <= 1; a += 0.25) {
      for (let b = -1; b <= 1; b += 0.5) {
        const lx = a * so.half[1], lz = b * so.half[0];
        out.push({ x: so.at[0] + lx * cs + lz * sn, z: so.at[2] - lx * sn + lz * cs, r: 0, what: so.kind });
      }
    }
  }
  return out;
}

/** The drawn land's height at (x, z) (the scene's coast or hills mesh: a regular grid), or null off its grid. */
function landHeight(coast: Mesh | undefined): ((x: number, z: number) => number | null) {
  if (!coast) return () => null;
  const pos = (coast.geometry as BufferGeometry).getAttribute('position');
  const x0 = pos.getX(0), z0 = pos.getZ(0), cell = pos.getX(1) - x0;
  let nx = 1;
  while (nx < pos.count && Math.abs(pos.getZ(nx) - z0) < 1e-6) nx++;
  const nz = pos.count / nx;
  return (x, z) => {
    const fi = (x - x0) / cell, fj = (z - z0) / cell, i = Math.floor(fi), j = Math.floor(fj);
    if (i < 0 || j < 0 || i >= nx - 1 || j >= nz - 1) return null;
    const u = fi - i, v = fj - j, y = (a: number, b: number) => pos.getY((j + b) * nx + i + a);
    return y(0, 0) * (1 - u) * (1 - v) + y(1, 0) * u * (1 - v) + y(0, 1) * (1 - u) * v + y(1, 1) * u * v;
  };
}

/** Metres every spectator keeps from each course creature (its reach, and room to be seen watching it). */
const CLEAR_OF: Readonly<Record<string, number>> = { rumblesaur: 11, yeti: 12, kraken: 9, crab: 7, goose: 6, whale: 20 };

describe.each(TRACKS.map((d) => [d.id, d] as const))('%s: the crowd', (_id, def) => {
  it('is two InstancedMeshes of critters (full and lite rigs) and one stand mesh, none casting a shadow, with a crowd of sensible size', () => {
    const scene = buildTrackScene(buildTrack(def), trackAssets(def.biome));
    const { crowd, meshes } = crowdOf(scene.group);
    expect(crowd, 'every track has a crowd').toBeDefined();
    const full = meshes.find((m) => m.name === 'crowd') as InstancedMesh, lite = meshes.find((m) => m.name === 'crowd-lite') as InstancedMesh;
    expect(full.isInstancedMesh && lite.isInstancedMesh).toBe(true);
    expect(meshes.filter((m) => m.name === 'crowd-stands')).toHaveLength(1);
    expect(meshes).toHaveLength(3);
    for (const m of meshes) expect(m.castShadow, m.name).toBe(false);
    const n = crowd.layout.spectators.length;
    expect(full.count + lite.count).toBe(n);
    expect(full.count).toBe(crowd.layout.spectators.filter((s) => !s.lite).length);
    // the lite rig carries about half the full one's triangles
    const tris = (m: Mesh) => m.geometry.index!.count / 3;
    expect(tris(lite)).toBeLessThan(tris(full) * 0.6);
    expect(n).toBeGreaterThanOrEqual(80);
    expect(n).toBeLessThanOrEqual(220);
    // a grandstand, more stands or bleachers, groups and cheer groups (under the shader's slots)
    expect(crowd.layout.solids.filter((s) => s.kind === 'stand').length).toBeGreaterThanOrEqual(1);
    expect(crowd.layout.solids.length).toBeGreaterThanOrEqual(4);
    expect(crowd.layout.groups.length).toBeGreaterThanOrEqual(5);
    expect(crowd.layout.groups.length).toBeLessThanOrEqual(CROWD_GROUPS);
    for (const s of crowd.layout.spectators) expect(s.anim[2]).toBeLessThan(CROWD_GROUPS);
    scene.dispose();
  });

  it('stands wholly past the course limit of every road (shortcuts, and the final lap too), Mirror mode included', () => {
    for (const d of [def, mirrorTrack(def)]) {
      const track = buildTrack(d), scene = buildTrackScene(track, trackAssets(d.biome));
      const { crowd } = crowdOf(scene.group);
      const pts = footprints(crowd);
      const check = (when: string) => {
        const lims = limits(track);
        let worst = Infinity, what = '';
        for (const p of pts) {
          const past = pastLimit(lims, p.x, p.z) - p.r;
          if (past < worst) { worst = past; what = `${p.what} at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`; }
        }
        // the placement keeps CLEAR; the checks allow half of it for the footprint's sampling
        expect(worst, `${d.id}${d.mirrored ? ' (mirrored)' : ''} ${when}: ${what}`).toBeGreaterThan(CLEAR / 2);
      };
      check('lap 1');
      if (d.finalLapShift) { track.applyFinalLapShift(); check('final lap'); }
      scene.dispose();
    }
  });

  it('keeps out of the chase camera corridor (every drivable metre, chase height and lowest) and the loop camera', () => {
    const track = buildTrack(def), scene = buildTrackScene(track, trackAssets(def.biome));
    const { crowd } = crowdOf(scene.group);
    // every critter a standing cylinder (as tall as it can jump), every solid its box, with the lens's margin
    const LENS = 0.45;
    // a critter: an upright cylinder; a solid: its box (yaw, half-sizes across and along the road)
    const vols: { x: number; z: number; r: number; y0: number; y1: number; yaw?: number; half?: [number, number] }[] = [];
    for (const s of crowd.layout.spectators) {
      const hover = SPECIES[s.species].body[3] * 1.2;
      vols.push({ x: s.at[0], z: s.at[2], r: 0.55 * s.scale + LENS, y0: s.at[1] - LENS, y1: s.at[1] + (RIG_HEIGHT + 0.7 + CROWD.maxLift + hover) * s.scale + LENS });
    }
    for (const so of crowd.layout.solids) vols.push({ x: so.at[0], z: so.at[2], r: Math.hypot(so.half[0], so.half[1]) + LENS, y0: so.at[1] - 3, y1: so.top + LENS, yaw: so.yaw, half: so.half });
    const holds = (v: (typeof vols)[number], x: number, y: number, z: number) => {
      const dx = x - v.x, dz = z - v.z;
      if (dx * dx + dz * dz > v.r * v.r || y < v.y0 || y > v.y1) return false;
      if (!v.half) return true;
      const c = Math.cos(v.yaw!), sn = Math.sin(v.yaw!), along = dx * c - dz * sn, across = dx * sn + dz * c;
      return Math.abs(along) <= v.half[1] + LENS && Math.abs(across) <= v.half[0] + LENS;
    };
    let bad = '', checked = 0;
    for (const b of track.branches.list) {
      const L = b.lut, n = Math.max(8, Math.round(L.length / 2));
      for (let k = 0; k < n; k++) {
        const u = k / n, c0 = L.sample(u, 0), reach = Math.max(0, (c0.wall ?? c0.halfWidth) - CAM.wallClear);
        for (let a = 0; a < 9; a++) {
          const lateral = -reach + (2 * reach * a) / 8, smp = L.sample(u, lateral);
          for (const up of [CAM.height, CAM.roadClear]) {
            const x = smp.position[0], y = smp.groundY + up, z = smp.position[2];
            checked++;
            for (const v of vols) if (holds(v, x, y, z)) bad ||= `lens at ${b.id ?? b.index} t ${u.toFixed(3)} lateral ${lateral.toFixed(1)} in the crowd at ${v.x.toFixed(1)}, ${v.z.toFixed(1)}`;
          }
        }
      }
    }
    for (const l of track.loops) {
      // the loop's side-on camera (and 3 m round it) holds no one
      const pose = loopCamPose(track, l), [x, y, z] = pose.position;
      for (const v of vols) for (const [ox, oz] of [[0, 0], [3, 0], [-3, 0], [0, 3], [0, -3]]) if (holds({ ...v, y0: -Infinity, y1: Infinity }, x + ox, y, z + oz)) bad ||= `the loop camera in the crowd at ${v.x.toFixed(1)}, ${v.z.toFixed(1)}`;
    }
    expect(checked).toBeGreaterThan(5000);
    expect(bad).toBe('');
    scene.dispose();
  });

  it('stands on the land as drawn (a critter on the ground, a stand on its foundation), never over water, clear of the course creature', () => {
    const track = buildTrack(def), scene = buildTrackScene(track, trackAssets(def.biome));
    const { crowd } = crowdOf(scene.group);
    const land = landHeight(scene.group.getObjectByName('coast') as Mesh | undefined);
    const water = def.environment?.ground?.kind === 'water' ? def.environment.ground.y ?? 0 : -Infinity;
    const plane = def.environment?.ground?.kind === 'plane' ? track.groundPlaneY : NaN;
    // the drawn surface: the land where it stands over the plane (hills fall away under it), else the plane
    const groundAt = (x: number, z: number) => {
      const l = land(x, z);
      if (Number.isFinite(plane)) return Math.max(plane, l ?? -Infinity);
      return l;
    };
    if (def.environment?.ground?.kind !== 'none') {
      for (const s of crowd.layout.spectators) {
        if (s.on !== 'ground') continue;
        const g = groundAt(s.at[0], s.at[2]);
        expect(g, `${s.species} off the land's grid`).not.toBeNull();
        expect(Math.abs(s.at[1] - g!), `${s.species} at ${s.at.map((v) => v.toFixed(1))}`).toBeLessThan(0.35);
        expect(g!, 'above the water').toBeGreaterThan(water + 0.3);
      }
      for (const so of crowd.layout.solids) {
        const cs = Math.cos(so.yaw), sn = Math.sin(so.yaw);
        for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]]) {
          const lx = a * (so.half[1] - 0.3), lz = b * (so.half[0] - 0.7);
          const x = so.at[0] + lx * cs + lz * sn, z = so.at[2] - lx * sn + lz * cs, g = groundAt(x, z);
          expect(g, `${so.kind} corner off the land`).not.toBeNull();
          expect(g!, `${so.kind} over the water`).toBeGreaterThan(water + 0.3);
          // a stand's foundation reaches 0.8 m into the ground and it never buries its tiers (a rope line's
          // posts each stand on the ground under them, from its lowest up)
          if (so.kind === 'rope') { expect(g! - so.at[1], 'a rope post floats').toBeGreaterThan(-0.3); continue; }
          expect(g! - so.at[1], `${so.kind} floats or sinks at a corner`).toBeGreaterThan(-0.75);
          expect(g! - so.at[1], `${so.kind} buried at a corner`).toBeLessThan(0.45);
        }
      }
    }
    // the creature at its spot, all its moves over 30 s: nobody within its reach and a little more
    for (let t = 0; t < 30; t += 0.25) {
      for (const p of track.hazards.creaturePoses(t)) {
        for (const s of crowd.layout.spectators) {
          const d = Math.hypot(p.position[0] - s.at[0], p.position[2] - s.at[2]);
          expect(d, `${s.species} by the ${p.kind}`).toBeGreaterThan(CLEAR_OF[p.kind] ?? 9);
        }
      }
    }
    scene.dispose();
  });

  it('never reads as floating: the coast still holds a stretch out past every ground critter, roughly the way it faces away from the road (bug hunt, 25 Sept 2026: a Harbour Loop village pair stood on dry land that fell to the sea a few metres on, out of the single-point check)', () => {
    const track = buildTrack(def), scene = buildTrackScene(track, trackAssets(def.biome));
    const { crowd } = crowdOf(scene.group);
    const water = def.environment?.ground?.kind === 'water' ? def.environment.ground.y ?? 0 : null;
    if (water !== null) {
      const land = landHeight(scene.group.getObjectByName('coast') as Mesh | undefined);
      for (const s of crowd.layout.spectators) {
        if (s.on !== 'ground') continue;
        // yaw's local +Z faces the road; away from it (roughly toward the sea, for a coastal spot) is -Z
        const ax = -Math.sin(s.yaw), az = -Math.cos(s.yaw);
        for (const d of [-0.6, 0, 0.6]) {
          const dx = ax * Math.cos(d) - az * Math.sin(d), dz = ax * Math.sin(d) + az * Math.cos(d);
          const g = land(s.at[0] + dx * 7, s.at[2] + dz * 7);
          const where = `${s.species} at ${s.at.map((v) => v.toFixed(1)).join(',')}, 7 m off ${d.toFixed(1)} rad from its own outward line`;
          expect(g, `${where}: off the land's grid`).not.toBeNull();
          expect(g!, `${where}: the coast already reads as water there`).toBeGreaterThan(water + 0.5);
        }
      }
    }
    scene.dispose();
  });

  it('frees its geometry and material with the scene', () => {
    const scene = buildTrackScene(buildTrack(def), trackAssets(def.biome));
    const { meshes } = crowdOf(scene.group);
    let geos = 0, mats = 0;
    for (const m of meshes) {
      m.geometry.addEventListener('dispose', () => geos++);
      (m.material as { addEventListener(e: string, f: () => void): void }).addEventListener('dispose', () => mats++);
    }
    scene.dispose();
    expect([geos, mats]).toEqual([3, 3]);
  });
});

describe('the crowd comes alive', () => {
  const def = TRACKS.find((d) => d.id === 'harbour-loop')!;
  const track = buildTrack(def), scene = buildTrackScene(track, trackAssets(def.biome));
  const { crowd } = crowdOf(scene.group);
  const someone = (style: number): Spectator => crowd.layout.spectators.find((s) => s.anim[1] === style && s.anim[2] >= 0)!;

  it('poses every critter as a pure function of the clock: the same clock, the same pose; bounded and never walking off its spot', () => {
    const trig = new Float32Array(CROWD_GROUPS).fill(-1);
    trig[3] = 10;
    for (const s of crowd.layout.spectators.slice(0, 40)) {
      const hover = SPECIES[s.species].body[3];
      for (let t = 0; t < 30; t += 0.37) {
        const a = crowdPose(s, t, [0, 0, 0], trig, hover), b = crowdPose(s, t, [0, 0, 0], trig, hover);
        expect(a).toEqual(b);
        expect(a.lift - hover * 1.15).toBeLessThanOrEqual(CROWD.maxLift + 1e-9);
        expect(a.lift).toBeGreaterThanOrEqual(0);
        expect(Math.abs(a.yawBody)).toBeLessThanOrEqual(0.45 * CROWD.maxTurn + 1e-9);
        expect(Math.abs(a.yawHead)).toBeLessThanOrEqual(1 + 1e-9);
        for (const arm of [a.armL, a.armR]) { expect(arm).toBeGreaterThanOrEqual(0); expect(arm).toBeLessThanOrEqual(Math.PI); }
        expect(Math.abs(a.sway)).toBeLessThanOrEqual(0.14);
      }
    }
    // idle life moves: a hopper leaves the ground now and then, a waver's arm swings
    const hopper = someone(4), lifts = Array.from({ length: 60 }, (_, k) => crowdPose(hopper, k * 0.05, [0, 0, 0], trig).lift);
    expect(Math.max(...lifts)).toBeGreaterThan(0.2);
    const waver = someone(1), arms = Array.from({ length: 30 }, (_, k) => crowdPose(waver, k * 0.05, [0, 0, 0], trig).armR);
    expect(Math.max(...arms) - Math.min(...arms)).toBeGreaterThan(0.3);
  });

  it('turns heads and bodies toward the pack as it passes, and not at all when it is far', () => {
    const s = crowd.layout.spectators[0], trig = new Float32Array(CROWD_GROUPS).fill(-1);
    const fwd: [number, number] = [Math.sin(s.yaw), Math.cos(s.yaw)], side: [number, number] = [Math.cos(s.yaw), -Math.sin(s.yaw)];
    // the pack 20 m in front and 15 m to the critter's left (its +X): it looks that way, body and head together
    const near: [number, number, number] = [s.at[0] + fwd[0] * 20 + side[0] * 15, s.at[1], s.at[2] + fwd[1] * 20 + side[1] * 15];
    const p = crowdPose(s, 5, near, trig), want = Math.atan2(15, 20);
    expect(p.yawBody).toBeGreaterThan(0.1);
    expect(p.yawBody + p.yawHead).toBeCloseTo(want, 1);
    const far: [number, number, number] = [s.at[0] + fwd[0] * 400, s.at[1], s.at[2] + fwd[1] * 400 + 300];
    expect(crowdPose(s, 5, far, trig).yawBody).toBeCloseTo(0, 9);
  });

  it('cheers when the pack passes its spot on the road: once a pass, a burst of CROWD.cheer seconds, back on watch once the pack is gone', () => {
    const g = crowd.layout.groups[0].at;
    crowd.trig.fill(-1);
    const along = (t: number) => { const s = track.sample(t, 0); return [s.position[0], s.position[1], s.position[2]] as const; };
    // a lens driving the lap at 25 m/s, looking along the road
    let fired = 0, clock = 100;
    const len = track.length;
    for (let lap = 0; lap < 2; lap++) {
      for (let d = 0; d < len; d += 25 / 60) {
        // from the far side of the lap, so each pass of the group's spot is a whole pass
        const t = (0.5 + d / len) % 1, p = along(t), q = along(t + 0.001), h = Math.hypot(q[0] - p[0], q[2] - p[2]) || 1;
        const cam: [number, number, number] = [p[0] - ((q[0] - p[0]) / h) * CROWD.focusAhead, p[1] + 2.4, p[2] - ((q[2] - p[2]) / h) * CROWD.focusAhead];
        const before = crowd.trig[0];
        crowd.tick(cam, [(q[0] - p[0]) / h, (q[2] - p[2]) / h], clock, 1);
        if (crowd.trig[0] !== before && crowd.trig[0] >= 0) {
          fired++;
          // it fired as the pack came by its spot
          expect(Math.hypot(crowd.focus.x - g[0], crowd.focus.z - g[2])).toBeLessThan(CROWD.tripNear + 1);
        }
        clock += 1 / 60;
      }
    }
    expect(fired, 'once a lap').toBe(2);
    // the burst: a critter of that group cheers after its stagger and is done by CROWD.cheer + stagger
    const s = crowd.layout.spectators.find((x) => x.anim[2] === 0)!, trig = new Float32Array(CROWD_GROUPS).fill(-1);
    trig[0] = 50;
    expect(crowdPose(s, 50 + CROWD.stagger + 0.4, [0, 0, 0], trig).cheer).toBeGreaterThan(0.9);
    expect(crowdPose(s, 50 + CROWD.stagger + CROWD.cheer + 0.01, [0, 0, 0], trig).cheer).toBe(0);
    expect(crowdPose(s, 49.9, [0, 0, 0], trig).cheer).toBe(0);
    // the Final Lap Shift: every group cheers at once
    crowd.trig.fill(-1);
    crowd.shift(200);
    for (let k = 0; k < crowd.layout.groups.length; k++) expect(crowd.trig[k]).toBe(200);
  });

  it('drops out entirely at the governor\'s Low, and comes back', () => {
    const n = crowd.layout.spectators.length;
    crowd.tick([0, 0, 0], [0, 1], 1, 0);
    for (const m of crowd.meshes) expect(m.count).toBe(0);
    crowd.tick([0, 0, 0], [0, 1], 1, 1);
    expect(crowd.meshes.reduce((k, m) => k + m.count, 0)).toBe(n);
  });

  it('has its instance matrices where its layout says, each critter upright and facing its yaw', () => {
    const m = new Matrix4(), p = new Vector3(), z = new Vector3();
    const full = crowd.layout.spectators.filter((s) => !s.lite), lite = crowd.layout.spectators.filter((s) => s.lite);
    const [fullMesh, liteMesh] = crowd.meshes;
    [...full.map((s, i) => [s, fullMesh, i] as const), ...lite.map((s, i) => [s, liteMesh, i] as const)].forEach(([s, im, i]) => {
      im.getMatrixAt(i, m);
      p.setFromMatrixPosition(m);
      expect(p.distanceTo(new Vector3(...s.at))).toBeLessThan(1e-4);
      z.set(0, 0, 1).transformDirection(m);
      expect(z.y).toBeCloseTo(0, 5);
      expect(Math.atan2(z.x, z.z)).toBeCloseTo(Math.atan2(Math.sin(s.yaw), Math.cos(s.yaw)), 4);
    });
  });
});
