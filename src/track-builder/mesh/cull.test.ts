// The governor's Low tier thins the scenery (TrackScene.cull, 24 Sept 2026): a software-drawn GPU ran
// 4 to 6 fps at Low with 430 to 750 k triangles a frame, most of them decor copies out of view or a few
// pixels big (an instancer draws every copy it holds). At Low each decor instancer draws only its copies
// in view and at least LOW_MIN_SIZE of the screen, the far and sky bands every other one; off Low,
// every copy as placed, exactly.
import { describe, expect, it } from 'vitest';
import { Frustum, InstancedMesh, Matrix4, PerspectiveCamera, Sphere, Vector3, type Mesh } from 'three';
import { trackAssets } from '../../art-pipeline/index.ts';
import { buildTrack } from '../track.ts';
import type { TrackDefinition } from '../types.ts';
import { buildTrackScene, LOW_MIN_SIZE, LOW_RECULL } from './scene.ts';
import meadow from '../tracks/meadow-run.json';
import boardwalk from '../tracks/boardwalk-nights.json';

const decorPools = (g: { traverse(f: (o: unknown) => void): void }) => {
  const out: InstancedMesh[] = [];
  g.traverse((o) => { const m = o as InstancedMesh; if (m.isInstancedMesh && /^(decor|pier):/.test(m.name)) out.push(m); });
  return out;
};

describe.each([['meadow-run', meadow], ['boardwalk-nights', boardwalk]] as const)('%s at the Low tier', (_id, json) => {
  it('draws only the decor copies in view, far ones every other one, and every copy again off Low', () => {
    const def = json as unknown as TrackDefinition;
    const track = buildTrack(def);
    const scene = buildTrackScene(track, trackAssets(def.biome));
    const pools = decorPools(scene.group);
    expect(pools.length).toBeGreaterThan(3);
    const placed = new Map(pools.map((m) => [m, { count: m.count, matrices: Float32Array.from(m.instanceMatrix.array as Float32Array) }]));
    // a chase camera on the start straight, looking up the road
    const s = track.sample(track.startT, 0), a = track.sample((track.startT + 0.02) % 1, 0);
    const camera = new PerspectiveCamera(60, 16 / 9, 0.3, 1400);
    camera.position.set(s.position[0], s.position[1] + 3, s.position[2]);
    camera.lookAt(a.position[0], a.position[1] + 1, a.position[2]);

    scene.cull(camera, true);
    camera.updateMatrixWorld();
    const frustum = new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    // the cull's own view is LOW_RECULL.margin degrees wider (so a small move or turn between its runs shows no gap)
    const wide = camera.clone();
    wide.fov += LOW_RECULL.margin;
    wide.updateProjectionMatrix();
    wide.updateMatrixWorld();
    const wideFrustum = new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(wide.projectionMatrix, wide.matrixWorldInverse));
    let before = 0, after = 0;
    const m4 = new Matrix4(), v = new Vector3(), sphere = new Sphere();
    for (const m of pools) {
      const p = placed.get(m)!;
      before += p.count;
      after += m.count;
      expect(m.count).toBeLessThanOrEqual(p.count);
      const g = m.geometry;
      if (!g.boundingSphere) g.computeBoundingSphere();
      // every copy drawn is one placed, in view
      const drawn = new Set<string>();
      for (let j = 0; j < m.count; j++) {
        m4.fromArray(m.instanceMatrix.array as Float32Array, j * 16);
        sphere.center.copy(v.copy(g.boundingSphere!.center).applyMatrix4(m4));
        sphere.radius = g.boundingSphere!.radius * m4.getMaxScaleOnAxis();
        expect(wideFrustum.intersectsSphere(sphere), `${m.name} copy ${j} is in view`).toBe(true);
        drawn.add(Array.from(m.instanceMatrix.array.slice(j * 16, j * 16 + 16)).join());
      }
      // and every copy of the road's own bands in view and big enough to see is drawn (their density never thins)
      if (!/boat|barn|windmill|tent|rock|knoll/.test(m.name)) {
        for (let i = 0; i < p.count; i++) {
          m4.fromArray(p.matrices, i * 16);
          sphere.center.copy(v.copy(g.boundingSphere!.center).applyMatrix4(m4));
          sphere.radius = g.boundingSphere!.radius * m4.getMaxScaleOnAxis();
          const seen = sphere.radius / (sphere.center.distanceTo(camera.position) * Math.tan((camera.fov * Math.PI) / 360));
          if (frustum.intersectsSphere(sphere) && seen >= LOW_MIN_SIZE * 1.001) {
            expect(drawn.has(Array.from(p.matrices.slice(i * 16, i * 16 + 16)).join()), `${m.name} copy ${i} in view`).toBe(true);
          }
        }
      }
      // the hull outline follows its model's copies; an instancer with none in view is not drawn at all
      const hull = m.userData.hull as Mesh | undefined;
      if ((hull as InstancedMesh | undefined)?.isInstancedMesh) expect((hull as InstancedMesh).count).toBe(m.count);
      expect(m.visible).toBe(m.count > 0);
    }
    expect(after, 'most copies are out of view or too small to see from any one spot').toBeLessThan(before * 0.6);
    // the far vista's movers and the crowd skip their draws at Low
    for (const w of scene.vista?.world ?? []) if (w.name === 'vista-movers' || w.name === 'crowd' || w.name === 'crowd-lite') expect(w.visible, w.name).toBe(false);

    // the lens barely moved: nothing is run again (and nothing uploaded); a turn past LOW_RECULL.turn runs it again
    const counts = pools.map((m) => m.count), versions = pools.map((m) => m.instanceMatrix.version);
    camera.position.x += 0.3;
    camera.updateMatrixWorld();
    scene.cull(camera, true);
    expect(pools.map((m) => m.instanceMatrix.version)).toEqual(versions);
    camera.rotateY((LOW_RECULL.turn * 2 * Math.PI) / 180);
    camera.updateMatrixWorld();
    scene.cull(camera, true);
    expect(pools.some((m, i) => m.instanceMatrix.version !== versions[i] || m.count !== counts[i]), 'run again after a turn').toBe(true);

    // off Low: every copy as placed, exactly
    scene.cull(camera, false);
    for (const m of pools) {
      const p = placed.get(m)!;
      expect(m.count).toBe(p.count);
      expect(m.visible).toBe(true);
      expect(Array.from(m.instanceMatrix.array as Float32Array)).toEqual(Array.from(p.matrices));
    }
    for (const w of scene.vista?.world ?? []) expect(w.visible, w.name).toBe(true);
    scene.dispose();
  }, 120_000);
});
