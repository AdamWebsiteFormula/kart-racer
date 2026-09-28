import { describe, expect, it } from 'vitest';
import { BatchedMesh, Matrix4, Vector3, type BufferGeometry, type InstancedMesh, type Material } from 'three';
import { ITEM_MODEL_KINDS, itemGeometry } from '../art-pipeline/index.ts';
import { CAM } from './camera.ts';
import { BATCHED_ITEMS, ItemsView, TRAIL_BALL_SCALE } from './itemsView.ts';

/** A frame with these projectiles and ground items out, nothing on the karts. */
const out = (projectiles: object[], groundItems: object[] = []) =>
  ({ cfg: { ownerGraceSeconds: 0.35 }, state: { projectiles, groundItems, pogo: [] }, isTrailing: () => false }) as never;
const flying = (id: number, itemId: string) => ({ id, itemId, graceRemaining: 0, position: [id, 0.5, 0], prevPosition: [id, 0.5, 0] });

describe('items view', () => {
  it('dispose frees the batch, the Strike Ball and Bubble spheres and every instance buffer, never the shared item models', () => {
    const view = new ItemsView();
    const meshes = view.root.children.filter((m) => !(m as BatchedMesh).isBatchedMesh) as InstancedMesh[];
    const shared = new Set<BufferGeometry | null>(ITEM_MODEL_KINDS.map((k) => itemGeometry(k)));
    const freed = new Set<object>();
    for (const m of meshes) {
      m.addEventListener('dispose', () => freed.add(m));
      m.geometry.addEventListener('dispose', () => freed.add(m.geometry));
    }
    view.batch.geometry.addEventListener('dispose', () => freed.add(view.batch.geometry));
    view.dispose();
    for (const m of meshes) expect(freed.has(m), `${m.geometry.type} instances`).toBe(true);
    const own = meshes.map((m) => m.geometry).filter((g) => !shared.has(g));
    expect(own).toHaveLength(2); // the Strike Ball and the Bubble
    for (const g of own) expect(freed.has(g)).toBe(true);
    expect(freed.has(view.batch.geometry), 'the batch\'s own copy of the models').toBe(true);
    expect(shared.has(view.batch.geometry)).toBe(false);
    for (const g of shared) if (g) expect(freed.has(g)).toBe(false);
  });

  it('the solid toon kinds are one batch (one draw a pass however many are out), drawn only while one is out', () => {
    const view = new ItemsView();
    expect(view.batch.isBatchedMesh).toBe(true);
    expect(view.batch.castShadow).toBe(true);
    // every other kind is an instancer of its own, and so every draw is the batch or one of these four
    const own = view.root.children.filter((m) => m !== view.batch) as InstancedMesh[];
    expect(own.map((m) => m.geometry === itemGeometry('oilSlick') || m.geometry === itemGeometry('chainLink') || m.geometry.type === 'SphereGeometry')).toEqual([true, true, true, true]);
    view.onFrame(out([]), [], [], 1, 0);
    expect(view.batch.visible, 'nothing out: not drawn').toBe(false);
    // four kinds out at once, twice each: still one object to draw
    view.onFrame(out([flying(1, 'beachBall'), flying(2, 'homingKite'), flying(3, 'windUpMouse'), flying(4, 'beachBall')], [
      { id: 5, itemId: 'decoyBalloon', position: [0, 0, 5] }, { id: 6, itemId: 'oilCan', position: [0, 0, 9] },
    ]), [], [], 1, 0);
    expect(view.batch.visible).toBe(true);
    const idsOf = (kind: string) => (view as unknown as { kinds: Record<string, { ids: Int32Array }> }).kinds[kind].ids;
    const shownOf = (kind: string) => Array.from(idsOf(kind)).filter((id) => view.batch.getVisibleAt(id)).length;
    for (const [kind, n] of Object.entries(BATCHED_ITEMS)) expect(idsOf(kind), kind).toHaveLength(n);
    expect(['beachBall', 'homingKite', 'windUpMouse', 'decoyBalloon', 'oilCan', 'fizzBottle'].map(shownOf)).toEqual([2, 1, 1, 1, 1, 0]);
    expect(own.find((m) => m.geometry === itemGeometry('oilSlick'))!.count, 'the can\'s slick, its own instancer').toBe(1);
    // and back to none: every copy hidden again, the batch not drawn
    view.onFrame(out([]), [], [], 1, 0);
    expect(view.batch.visible).toBe(false);
    expect(['beachBall', 'homingKite', 'windUpMouse', 'decoyBalloon', 'oilCan'].map(shownOf)).toEqual([0, 0, 0, 0, 0]);
    view.dispose();
  });

  it('a thrown Beach Ball leaves at its held size and grows to full size over the thrower\'s grace, never popping', () => {
    const view = new ItemsView();
    const scaleAt = (graceRemaining: number) => {
      const p = { id: 1, itemId: 'beachBall', graceRemaining, position: [0, 0.5, 0], prevPosition: [0, 0.5, 0] };
      const items = { cfg: { ownerGraceSeconds: 0.35 }, state: { projectiles: [p], groundItems: [], pogo: [] }, isTrailing: () => false };
      view.onFrame(items as never, [], [], 1, 0);
      return new Vector3().setFromMatrixScale(view.matrixOf('beachBall', 0, new Matrix4())).x;
    };
    expect(scaleAt(0.35)).toBeCloseTo(TRAIL_BALL_SCALE, 6);
    const mid = scaleAt(0.175);
    expect(mid).toBeGreaterThan(TRAIL_BALL_SCALE);
    expect(mid).toBeLessThan(1);
    expect(scaleAt(0)).toBeCloseTo(1, 6);
    view.dispose();
  });

  it('every solid item (the Strike Ball too) dissolves within CAM.nearFade of the lens; the see-through slick and bubble are left be', () => {
    const view = new ItemsView();
    const key = `|near${CAM.nearFade.toFixed(2)}`;
    for (const m of view.root.children as InstancedMesh[]) {
      const mat = m.material as Material;
      if ((mat as { isShaderMaterial?: boolean }).isShaderMaterial) continue;
      expect(mat.customProgramCacheKey(), mat.type).toContain(key);
    }
    view.dispose();
  });
});
