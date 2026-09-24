import { describe, expect, it } from 'vitest';
import type { Material, Mesh } from 'three';
import { isShared, vertexToon } from '../art-pipeline/index.ts';
import type { GhostPath } from '../race-manager/ghost.ts';
import { GHOST_NEAR, GHOST_OPACITY, GhostView, ghostOpacity } from './ghostView.ts';

describe('ghost opacity', () => {
  it('is faint on top of your kart and its usual see-through level farther off', () => {
    expect(ghostOpacity(0)).toBeCloseTo(GHOST_NEAR.opacity);
    expect(ghostOpacity(GHOST_NEAR.farMetres + 5)).toBeCloseTo(GHOST_OPACITY);
    expect(ghostOpacity(6)).toBeGreaterThan(GHOST_NEAR.opacity);
    expect(ghostOpacity(6)).toBeLessThan(GHOST_OPACITY);
  });
});

describe('the ghost in the look its run was set in (design §10 rewards)', () => {
  it('wears the saved paint and body, see-through in materials of its own', () => {
    const path: GhostPath = { step: 4, x: new Float32Array(2), y: new Float32Array(2), z: new Float32Array(2), heading: new Float32Array(2), angle: new Float32Array(2), length: 2 };
    const g = new GhostView(path, 'sprocket', { paint: 'sprocket-alt', body: 'classic' });
    const kart = g.root.getObjectByName('racer-sprocket')!;
    expect(kart.userData.exhaust).toBeDefined(); // the Classic's pipes
    const mats: Material[] = [];
    kart.traverse((o) => { if ((o as Mesh).isMesh) mats.push((o as Mesh).material as Material); });
    expect(mats.length).toBe(1);
    for (const m of mats) {
      expect(m.transparent).toBe(true);
      expect(m.opacity).toBeCloseTo(GHOST_OPACITY);
      expect(m).not.toBe(vertexToon());
      expect(isShared(m)).toBe(false);
    }
  });
});
