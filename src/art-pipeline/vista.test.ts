// The far vista (vista.ts): every track frames its corners with set-pieces past the scenery and has a
// far landmark ahead of its start line (design §6: "one landmark visible from the start line"),
// Mirror mode included; all of it casts no shadow, costs at most three draws and frees with the scene.
import { describe, expect, it } from 'vitest';
import type { Material, Mesh } from 'three';
import { buildTrackScene } from '../track-builder/mesh/index.ts';
import { mirrorTrack } from '../track-builder/mirror.ts';
import { buildTrack } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { trackAssets } from './index.ts';

const TRACKS = Object.values(import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' })) as TrackDefinition[];

describe.each(TRACKS.map((d) => [d.id, d] as const))('%s: the far vista', (_id, def) => {
  it('stands out past every road, casts no shadow, and adds at most three draws', () => {
    const track = buildTrack(def), scene = buildTrackScene(track, trackAssets(def.biome));
    const parts: Mesh[] = [];
    scene.group.traverse((o) => { if (o.name === 'vista' || o.name.startsWith('vista-')) parts.push(o as Mesh); });
    const world = parts.filter((m) => m.name !== 'vista-ring-glow');
    expect(world.length).toBeGreaterThanOrEqual(2);
    expect(world.length).toBeLessThanOrEqual(3);
    for (const m of parts) expect(m.castShadow, m.name).toBe(false);
    // the still set-pieces stand wholly past the farthest road from the track's middle
    const solid = parts.find((m) => m.name === 'vista')!;
    const lut = track.branches.main.lut;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < lut.n; i++) { minX = Math.min(minX, lut.px[i]); maxX = Math.max(maxX, lut.px[i]); minZ = Math.min(minZ, lut.pz[i]); maxZ = Math.max(maxZ, lut.pz[i]); }
    const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
    let reach = 0;
    for (let i = 0; i < lut.n; i++) reach = Math.max(reach, Math.hypot(lut.px[i] - cx, lut.pz[i] - cz));
    const pos = solid.geometry.getAttribute('position');
    let near = Infinity;
    for (let i = 0; i < pos.count; i++) near = Math.min(near, Math.hypot(pos.getX(i) - cx, pos.getZ(i) - cz));
    expect(near).toBeGreaterThan(reach + 20);
    scene.dispose();
  });

  it.each([['as authored', false], ['mirrored', true]] as const)('has a far landmark ahead of the start line (%s)', (_how, mirror) => {
    const d = mirror ? mirrorTrack(def) : def, track = buildTrack(d), scene = buildTrackScene(track, trackAssets(d.biome));
    const lm = scene.farLandmark!;
    expect(lm).toBeDefined();
    const s = track.sample(track.startT, 0), f = Math.hypot(s.tangent[0], s.tangent[2]);
    const dx = lm[0] - s.position[0], dz = lm[2] - s.position[2], dist = Math.hypot(dx, dz);
    const bearing = Math.acos((dx * s.tangent[0] + dz * s.tangent[2]) / (dist * f)) * (180 / Math.PI);
    // inside the view from the grid (60° field of view, wider across), and short of the fog's far end (850 m)
    expect(bearing, `${dist.toFixed(0)} m, ${bearing.toFixed(0)}° off the line`).toBeLessThan(35);
    expect(dist).toBeLessThan(700);
    scene.dispose();
  });

  it('frees its geometry and materials with the scene', () => {
    const scene = buildTrackScene(buildTrack(def), trackAssets(def.biome));
    let geos = 0, mats = 0, n = 0;
    scene.group.traverse((o) => {
      if (o.name !== 'vista' && !o.name.startsWith('vista-')) return;
      n++;
      const m = o as Mesh;
      m.geometry.addEventListener('dispose', () => geos++);
      (m.material as Material).addEventListener('dispose', () => mats++);
    });
    scene.dispose();
    expect(n).toBeGreaterThan(0);
    expect(geos).toBe(n);
    expect(mats).toBe(n);
  });
});
