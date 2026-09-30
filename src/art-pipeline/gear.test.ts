// The speed pickup: a plasma orb on the road since 30 Sept 2026 (decor.ts `coin`), a sound model that stays round
// from every side, never a coin's flat disc; gear.ts's cog outline (the menu's) is checked too.
import { CylinderGeometry, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { decorGeometry } from './decor.ts';
import { GEAR, gearOutline } from './gear.ts';
import { iou, silhouette } from './__tests__/silhouette.ts';

const gear = decorGeometry('coin')!.body;
gear.computeBoundingBox();
const box = gear.boundingBox!;
const frame = { min: [box.min.x, box.min.y, box.min.z], max: [box.max.x, box.max.y, box.max.z] };
/** face on, as the driver meets it: it faces along the road */
const front = silhouette(gear, 0, 1, frame);
/** a coin: a plain disc as tall as the pickup, rasterised the same way */
const disc = silhouette(new CylinderGeometry((box.max.y - box.min.y) / 2, (box.max.y - box.min.y) / 2, 0.1, 48).rotateX(Math.PI / 2), 0, 1, frame);


describe('the speed gear', () => {
  it('is the pickup model (a plasma orb since 30 Sept 2026): centred, round, small beside the energy core, one merged vertex-colored geometry', () => {
    const c = box.getCenter(new Vector3()), sz = box.getSize(new Vector3());
    expect(Math.abs(c.x) + Math.abs(c.y) + Math.abs(c.z)).toBeLessThan(0.01);
    expect(sz.y).toBeGreaterThan(0.35); // reads at speed
    expect(sz.y).toBeLessThan(0.6); // "smaller and less significant" than the 1.9 m energy core
    expect(sz.z).toBeCloseTo(sz.x, 2); // a ball, as deep as it is wide: never a flat coin
    expect(gear.hasAttribute('color')).toBe(true);
    // lean: nine of them on a track add under 3 k triangles to a frame (performance frameBudget.test.ts)
    expect(gear.index!.count / 3).toBeLessThanOrEqual(400);
  });

  it('has a unit normal on every vertex and no flat triangles (a zero normal turns to NaN and bloom spreads it: handoff, 26 Sept)', () => {
    const n = gear.getAttribute('normal'), p = gear.getAttribute('position'), idx = gear.index!;
    for (let i = 0; i < n.count; i++) expect(Math.hypot(n.getX(i), n.getY(i), n.getZ(i))).toBeCloseTo(1, 4);
    const a = new Vector3(), b = new Vector3(), c = new Vector3();
    for (let t = 0; t < idx.count; t += 3) {
      a.fromBufferAttribute(p, idx.getX(t)); b.fromBufferAttribute(p, idx.getX(t + 1)); c.fromBufferAttribute(p, idx.getX(t + 2));
      expect(b.sub(a).cross(c.sub(a)).length()).toBeGreaterThan(1e-7);
    }
  });

  it('winds every triangle toward its own normals (so no face of it is culled as a back face)', () => {
    const n = gear.getAttribute('normal'), p = gear.getAttribute('position'), idx = gear.index!;
    const a = new Vector3(), b = new Vector3(), c = new Vector3(), m = new Vector3();
    for (let t = 0; t < idx.count; t += 3) {
      const i = idx.getX(t), j = idx.getX(t + 1), k = idx.getX(t + 2);
      a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, j); c.fromBufferAttribute(p, k);
      const face = b.sub(a).cross(c.sub(a));
      m.set(n.getX(i) + n.getX(j) + n.getX(k), n.getY(i) + n.getY(j) + n.getY(k), n.getZ(i) + n.getZ(j) + n.getZ(k));
      expect(face.dot(m), `triangle ${t / 3}`).toBeGreaterThan(0);
    }
  });

  it('has eight teeth with round crowns that taper to their tips', () => {
    const o = gearOutline();
    expect(o).toHaveLength(GEAR.teeth * 5);
    const r = o.map(([x, y]) => Math.hypot(x, y));
    expect(Math.max(...r)).toBeCloseTo(GEAR.tip + GEAR.crown, 5);
    expect(Math.min(...r)).toBeCloseTo(GEAR.root, 5);
    // a tooth is narrower at its tip than at its root, in metres, not only in angle
    const pitch = (Math.PI * 2) / GEAR.teeth;
    expect(2 * GEAR.tipHalf * pitch * GEAR.tip).toBeLessThan(2 * GEAR.rootHalf * pitch * GEAR.root);
  });

  it('SOP gate (design §3): seen edge-on it stays round, where a coin shows a thin sliver', () => {
    const side = silhouette(gear, 2, 1, frame), coinSide = silhouette(new CylinderGeometry((box.max.y - box.min.y) / 2, (box.max.y - box.min.y) / 2, 0.1, 48).rotateX(Math.PI / 2), 2, 1, frame);
    expect(iou(side, front)).toBeGreaterThan(0.9);
    expect(iou(coinSide, disc)).toBeLessThan(0.4);
  });
});
