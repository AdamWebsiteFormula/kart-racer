import { Group, type DataTexture, type ShaderMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import type { BoostSource } from '../kart-controller/types.ts';
import { FlameBatch } from './flameBatch.ts';
import { ExhaustFlames, type FlameKart } from './flames.ts';
import { BATCH_ROW, type JetUniforms } from './jet.ts';

const kart = (source: BoostSource, remaining: number, drifting = false, tier = 0): FlameKart =>
  ({ drift: { active: drifting, tier }, boost: { source, remaining }, grounded: true, speed: 20, lateralVelocity: 0, isPlayer: false });
const uniforms = (f: ExhaustFlames) => (f.mesh!.material as ShaderMaterial).uniforms as unknown as JetUniforms;
/** a kart's row as the batch packed it (the draw, just before three draws it) */
function rowOf(b: FlameBatch, r: number): Float32Array {
  b.mesh.onBeforeRender(null as never, null as never, null as never, null as never, null as never, null as never);
  const t = (b.mesh.material as ShaderMaterial).uniforms.uKarts.value as DataTexture;
  const T = BATCH_ROW.texels * 4;
  return (t.image.data as Float32Array).subarray(r * T, (r + 1) * T);
}
const texel = (row: Float32Array, i: number) => [...row.subarray(i * 4, i * 4 + 4)];

describe('FlameBatch: the rivals\' flames in one draw call', () => {
  it('merges its karts\' jets into one mesh, each vertex tagged with its row; their own meshes stop drawing', () => {
    const gus = new ExhaustFlames(new Group(), 'gus'), pip = new ExhaustFlames(new Group(), 'pip'), none = new ExhaustFlames(new Group(), 'nobody');
    const b = new FlameBatch();
    b.set([gus, none, pip]);
    const g = b.mesh.geometry, n0 = gus.mesh!.geometry.getAttribute('position').count, n1 = pip.mesh!.geometry.getAttribute('position').count;
    expect(g.getAttribute('position').count).toBe(n0 + n1);
    expect(g.index!.count).toBe(gus.mesh!.geometry.index!.count + pip.mesh!.geometry.index!.count);
    const k = g.getAttribute('aKart');
    expect(k.getX(0)).toBe(0);
    expect(k.getX(n0 - 1)).toBe(0);
    expect(k.getX(n0)).toBe(1); // pip's row (the kart with no pipes has none)
    // pip's triangles point at pip's vertices
    expect(Math.min(...Array.from(g.index!.array).slice(gus.mesh!.geometry.index!.count))).toBe(n0);
    expect((gus.mesh!.material as ShaderMaterial).visible).toBe(false);
    expect((pip.mesh!.material as ShaderMaterial).visible).toBe(false);
    expect((b.mesh.material as ShaderMaterial).defines.JET_BATCHED).toBe(1);
    expect(b.mesh.renderOrder).toBe(gus.mesh!.renderOrder);
    b.dispose();
  });

  it('shows only while one of its karts burns, on their clock', () => {
    const a = new ExhaustFlames(new Group(), 'gus'), c = new ExhaustFlames(new Group(), 'juniper'), b = new FlameBatch();
    b.set([a, c]);
    a.update(kart('none', 0), 1); c.update(kart('none', 0), 1);
    b.update();
    expect(b.mesh.visible).toBe(false);
    c.update(kart('item', 1.2), 2, true);
    b.update();
    expect(b.mesh.visible).toBe(true);
    const mu = (b.mesh.material as ShaderMaterial).uniforms;
    expect(mu.uTime.value).toBe(2);
    expect(mu.uWave.value).toBe(0); // reduced motion, as the kart's own
    b.dispose();
  });

  it('packs each burning kart\'s world matrix and uniforms in its row; a kart not burning, or hidden with its chassis, is not drawn', () => {
    const chassisA = new Group(), chassisB = new Group();
    chassisB.position.set(3, 0.5, -7);
    chassisB.rotation.y = 0.4;
    const a = new ExhaustFlames(chassisA, 'gus'), c = new ExhaustFlames(chassisB, 'juniper'), b = new FlameBatch();
    b.set([a, c]);
    a.update(kart('none', 0), 1);
    c.update(kart('drift', 1.1, false, 0), 1.2);
    c.update(kart('drift', 1, true, 2), 1.3); // a boost and a drift at once: flames and stars
    chassisB.updateMatrixWorld(true);
    b.update();
    const u = uniforms(c), R = BATCH_ROW;
    let row = rowOf(b, 1);
    expect(texel(row, R.star)[3]).toBe(1);
    expect(Array.from(row.subarray(0, 16))).toEqual(c.mesh!.matrixWorld.elements.map((x) => Math.fround(x)));
    expect(texel(row, R.size)).toEqual([u.uLen.value.x, u.uLen.value.y, u.uWid.value.x, u.uWid.value.y].map(Math.fround));
    expect(texel(row, R.fire)).toEqual([u.uOn.value, u.uPop.value, u.uFlash.value, u.uRing.value].map(Math.fround));
    expect(texel(row, R.star).slice(0, 3)).toEqual([u.uStar.value, u.uStarFlash.value, u.uArc.value].map(Math.fround));
    expect(texel(row, R.body)).toEqual([u.uBody.value.r, u.uBody.value.g, u.uBody.value.b, u.uStarGain.value].map(Math.fround));
    expect(texel(row, R.core)[3]).toBe(1); // uKart: fully shown
    expect(texel(rowOf(b, 0), R.star)[3]).toBe(0); // gus is cold
    // the kart's chassis hidden (the podium's field): not drawn
    chassisB.visible = false;
    row = rowOf(b, 1);
    expect(texel(row, R.star)[3]).toBe(0);
    b.dispose();
  });

  it('set again after a chassis swap: the new flames join, the rows follow', () => {
    const a = new ExhaustFlames(new Group(), 'gus'), c = new ExhaustFlames(new Group(), 'pip'), b = new FlameBatch();
    b.set([a]);
    const one = b.mesh.geometry.getAttribute('position').count;
    b.set([a, c]);
    expect(b.mesh.geometry.getAttribute('position').count).toBeGreaterThan(one);
    const t = (b.mesh.material as ShaderMaterial).uniforms.uKarts.value as DataTexture;
    expect(t.image.height).toBe(2);
    b.dispose();
  });
});
