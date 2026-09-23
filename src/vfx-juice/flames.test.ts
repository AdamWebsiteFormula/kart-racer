import { Group } from 'three';
import { describe, expect, it } from 'vitest';
import { EXHAUST, flameColour, flameGeometry, flameMaterial, isShared, RACER_IDS } from '../art-pipeline/index.ts';
import { ExhaustFlames } from './flames.ts';

describe('exhaust pipes and boost flames (design §5)', () => {
  it('every racer has pipes behind the driver, pointing back or up, with a flame that glows', () => {
    for (const id of RACER_IDS) {
      const e = EXHAUST[id];
      expect(e, id).toBeDefined();
      expect(e.ports.length, id).toBeGreaterThan(0);
      for (const p of e.ports) {
        expect(p[2], id).toBeLessThan(-0.7); // at the back
        expect(Math.abs(p[0]), id).toBeLessThan(0.85); // inside the kart's width
      }
      expect(Math.hypot(...e.dir), id).toBeCloseTo(1, 5);
      expect(e.dir[2], id).toBeLessThanOrEqual(0);
      // HDR: above 1 so the bloom catches it
      expect(Math.max(...flameColour(id)), id).toBeGreaterThan(1);
      const col = flameGeometry(id).getAttribute('color');
      let top = 0;
      for (let i = 0; i < col.count * 3; i++) top = Math.max(top, (col.array as Float32Array)[i]);
      expect(top, id).toBeGreaterThan(1);
    }
  });

  it('burns only while boosting, flickers, and grows with the boost left', () => {
    const chassis = new Group();
    const f = new ExhaustFlames(chassis, 'gus');
    expect(f.meshes).toHaveLength(2);
    expect(chassis.children).toHaveLength(2);
    f.update(0, 1);
    expect(f.meshes.every((m) => !m.visible)).toBe(true);
    const lengths = new Set<number>();
    for (let t = 0; t < 1; t += 0.05) { f.update(1.2, t); lengths.add(+f.meshes[0].scale.z.toFixed(3)); }
    expect(f.meshes.every((m) => m.visible)).toBe(true);
    expect(lengths.size).toBeGreaterThan(5); // it flickers
    f.update(0.1, 0.5, true);
    const short = f.meshes[0].scale.z;
    f.update(2, 0.5, true);
    expect(f.meshes[0].scale.z).toBeGreaterThan(short);
    // the flame material is shared, so a finished race never disposes it
    expect(isShared(flameMaterial())).toBe(true);
    // an unknown racer (the placeholder box kart) simply has no flames
    expect(new ExhaustFlames(new Group(), 'nobody').meshes).toHaveLength(0);
  });
});
