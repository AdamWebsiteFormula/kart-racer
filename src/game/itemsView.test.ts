import { describe, expect, it } from 'vitest';
import { Matrix4, Vector3, type BufferGeometry, type InstancedMesh, type Material } from 'three';
import { ITEM_MODEL_KINDS, itemGeometry } from '../art-pipeline/index.ts';
import { CAM } from './camera.ts';
import { ItemsView, TRAIL_BALL_SCALE } from './itemsView.ts';

describe('items view', () => {
  it('dispose frees the Strike Ball and Bubble spheres and every instance buffer, never the shared item models', () => {
    const view = new ItemsView();
    const meshes = view.root.children as InstancedMesh[];
    const shared = new Set<BufferGeometry | null>(ITEM_MODEL_KINDS.map((k) => itemGeometry(k)));
    const freed = new Set<object>();
    for (const m of meshes) {
      m.addEventListener('dispose', () => freed.add(m));
      m.geometry.addEventListener('dispose', () => freed.add(m.geometry));
    }
    view.dispose();
    for (const m of meshes) expect(freed.has(m), `${m.geometry.type} instances`).toBe(true);
    const own = meshes.map((m) => m.geometry).filter((g) => !shared.has(g));
    expect(own).toHaveLength(2); // the Strike Ball and the Bubble
    for (const g of own) expect(freed.has(g)).toBe(true);
    for (const g of shared) if (g) expect(freed.has(g)).toBe(false);
  });

  it('a thrown Beach Ball leaves at its held size and grows to full size over the thrower\'s grace, never popping', () => {
    const view = new ItemsView();
    const mesh = (view.root.children as InstancedMesh[]).find((m) => m.geometry === itemGeometry('beachBall'))!;
    const scaleAt = (graceRemaining: number) => {
      const p = { id: 1, itemId: 'beachBall', graceRemaining, position: [0, 0.5, 0], prevPosition: [0, 0.5, 0] };
      const items = { cfg: { ownerGraceSeconds: 0.35 }, state: { projectiles: [p], groundItems: [], pogo: [] }, isTrailing: () => false };
      view.onFrame(items as never, [], [], 1, 0);
      const m = new Matrix4();
      mesh.getMatrixAt(0, m);
      return new Vector3().setFromMatrixScale(m).x;
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
