import { describe, expect, it } from 'vitest';
import type { BufferGeometry, InstancedMesh } from 'three';
import { ITEM_MODEL_KINDS, itemGeometry } from '../art-pipeline/index.ts';
import { ItemsView } from './itemsView.ts';

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
});
