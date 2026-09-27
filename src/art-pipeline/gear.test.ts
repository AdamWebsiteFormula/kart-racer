// The speed gear (gear.ts; Adam, 26 Sept 2026: gears, not coins): a sound model, and its 32 px black silhouette
// reads as a cog (eight teeth round an axle hole), never as the disc a coin makes.
import { CylinderGeometry, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { decorGeometry } from './decor.ts';
import { GEAR, gearOutline } from './gear.ts';
import { iou, silhouette, SIZE, svg } from './__tests__/silhouette.ts';

const gear = decorGeometry('coin')!.body;
gear.computeBoundingBox();
const box = gear.boundingBox!;
const frame = { min: [box.min.x, box.min.y, box.min.z], max: [box.max.x, box.max.y, box.max.z] };
/** face on, as the driver meets it: it faces along the road */
const front = silhouette(gear, 0, 1, frame);
/** the coin it replaces, a plain disc as wide as the gear, rasterised the same way */
const disc = silhouette(new CylinderGeometry(GEAR.tip + GEAR.crown, GEAR.tip + GEAR.crown, GEAR.thick, 48).rotateX(Math.PI / 2), 0, 1, frame);
/** metres to pixels in the silhouettes */
const px = SIZE / (box.max.x - box.min.x);

const at = (bmp: Uint8Array, x: number, y: number) => bmp[Math.min(SIZE - 1, Math.max(0, Math.floor(y))) * SIZE + Math.min(SIZE - 1, Math.max(0, Math.floor(x)))];

describe('the speed gear', () => {
  it('is the pickup model: centred, facing ±Z, about the size of the coin it replaces, one merged vertex-colored geometry', () => {
    const c = box.getCenter(new Vector3()), s = box.getSize(new Vector3());
    expect(Math.abs(c.x) + Math.abs(c.y) + Math.abs(c.z)).toBeLessThan(0.01);
    expect(s.x).toBeCloseTo(s.y, 1);
    expect(s.x / 2).toBeGreaterThan(0.5); // at least the coin's 0.5 m radius, so it reads at speed
    expect(s.x / 2).toBeLessThan(0.65);
    expect(s.z).toBeLessThan(0.35); // a flat, chunky cog, not a ball
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

  it('SOP gate (design §3): its 32 px black silhouette reads as a gear, not a disc', async () => {
    // an axle hole through the middle
    expect(at(front, SIZE / 2 - 0.5, SIZE / 2 - 0.5) + at(front, SIZE / 2 + 0.5, SIZE / 2 + 0.5)).toBe(0);
    expect(at(disc, SIZE / 2, SIZE / 2)).toBe(1);
    // eight teeth round the rim: a circle through the middle of the teeth crosses 8 teeth and 8 gaps
    const runs = (bmp: Uint8Array) => {
      const rMid = ((GEAR.tip + GEAR.root) / 2) * px, steps = 720;
      let changes = 0, last = -1;
      for (let s = 0; s <= steps; s++) {
        const a = (s / steps) * Math.PI * 2, v = at(bmp, SIZE / 2 + Math.cos(a) * rMid, SIZE / 2 + Math.sin(a) * rMid);
        if (last >= 0 && v !== last) changes++;
        last = v;
      }
      return changes / 2;
    };
    expect(runs(front)).toBe(GEAR.teeth);
    expect(runs(disc)).toBe(0);
    // and far from a disc overall: the gaps and the hole take out over a fifth of it
    expect(iou(front, disc)).toBeLessThan(0.8);
    // WRITE_SILHOUETTES=1 vitest run src/art-pipeline refreshes docs/silhouettes/
    const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
    if (env.WRITE_SILHOUETTES) {
      const fs = (await import('node:fs' as string)) as { mkdirSync(p: string, o: object): void; writeFileSync(p: string, d: string): void };
      fs.mkdirSync('docs/silhouettes', { recursive: true });
      fs.writeFileSync('docs/silhouettes/gear-front.svg', svg(front));
      fs.writeFileSync('docs/silhouettes/disc-front.svg', svg(disc));
    }
  });
});
