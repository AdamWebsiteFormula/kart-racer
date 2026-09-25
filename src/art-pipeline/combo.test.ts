// Any racer in any kart (design §5, K6, 25 Sept 2026): a chosen racer's own driver seated by IK in
// another racer's own kart body and wheels, merged into one skinned mesh (rigged.ts
// buildComboTemplate), never the kart owner's own driver. On two racers' real parts (Pip's own
// Parcel Scooter, Juniper's own driver): the combo's kart-side points (seat, steering, wheel radius)
// are the kart's own, the driver-side points (pose, rest) are the driver's own, and the merged
// geometry is exactly the kart's own body-and-wheels plus the driver's own driver, byte for byte.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Vector3, type Group, type Mesh, type SkinnedMesh } from 'three';
import { comboOwnerOf, exhaustFor } from './kart.ts';
import { RACER_MODELS } from './glb.ts';
import { buildComboTemplate, KART_BONES, makeRigged, type RiggedTemplate } from './rigged.ts';
import { partsManifest, riggedTemplate } from './__tests__/parts.ts';

let pip: RiggedTemplate; // the kart: Pip's own Parcel Scooter
let juniper: RiggedTemplate; // the driver: Juniper, seated in it instead of her own Timber Wagon

beforeAll(async () => {
  [pip, juniper] = await Promise.all([riggedTemplate('pip'), riggedTemplate('juniper')]);
}, 120_000);

const meshOf = (g: Group): SkinnedMesh => g.getObjectByName('rigged') as SkinnedMesh;
const meshCount = (g: Group): number => { let n = 0; g.traverse((o) => { if ((o as Mesh).isMesh) n++; }); return n; };

describe('any racer in any kart: buildComboTemplate (design §5, K6)', () => {
  it("Juniper in Pip's kart: the kart's own points, not the driver's own kart's", () => {
    const combo = buildComboTemplate(pip, juniper);
    expect(combo.racerId).toBe('juniper');
    expect(combo.seat).toBe(pip.seat);
    expect(combo.spec).toBe(pip.spec); // wheel radius, steering, exhaust: the kart's own
    expect(combo.pose).toBe(juniper.pose); // how Juniper sits: her own tuning, not Pip's
    expect(combo.rest).toBe(juniper.rest);
  });

  it('one draw call, and the kart\'s own wheel radius drives the rig, not the driver\'s own kart\'s', () => {
    const combo = buildComboTemplate(pip, juniper);
    const g = makeRigged(combo);
    expect(meshCount(g)).toBe(1);
    const m = meshOf(g);
    expect(m.isSkinnedMesh).toBe(true);
    expect(m.castShadow).toBe(true);
    expect((g.userData.rig as { wheelRadius: number }).wheelRadius).toBe(pip.spec.wheel.radius);
    expect(pip.spec.wheel.radius).not.toBe(juniper.spec.wheel.radius); // (else the check above would prove nothing)
  });

  it("never shows the kart owner's driver: the merged geometry is exactly Pip's own body-and-wheels then Juniper's own driver, byte for byte", () => {
    const combo = buildComboTemplate(pip, juniper);
    const full = meshOf(combo.root).geometry;
    const kartOnly = pip.kartOnly!;
    const driverOnly = meshOf(juniper.driverOnly).geometry;
    const nk = kartOnly.getAttribute('position').count, nd = driverOnly.getAttribute('position').count;
    expect(full.getAttribute('position').count).toBe(nk + nd);
    const fp = full.getAttribute('position').array, kp = kartOnly.getAttribute('position').array, dp = driverOnly.getAttribute('position').array;
    for (let i = 0; i < kp.length; i++) expect(fp[i]).toBe(kp[i]); // the kart's own, unmoved
    for (let i = 0; i < dp.length; i++) expect(fp[kp.length + i]).toBe(dp[i]); // the driver's own, unmoved: never Pip's
    // no bone index needed remapping (rigged.ts buildComboTemplate): the kart's own vertices stay under
    // KART_BONES.length, the driver's own carry their skinIndex values straight across
    const n = KART_BONES.length;
    const fj = full.getAttribute('skinIndex').array, dj = driverOnly.getAttribute('skinIndex').array;
    for (let i = 0; i < nk * 4; i++) expect(fj[i]).toBeLessThan(n);
    for (let i = 0; i < dj.length; i++) expect(fj[nk * 4 + i]).toBe(dj[i]);
  });

  it("a combo is seated at the kart's own seat point, not the driver's own kart's", () => {
    const combo = buildComboTemplate(pip, juniper);
    const g = makeRigged(combo);
    g.updateMatrixWorld(true);
    const hips = g.getObjectByName('Hips');
    expect(hips).toBeDefined();
    const at = hips!.getWorldPosition(new Vector3());
    const pipSeat = new Vector3(...pip.seat.seat), juniperSeat = new Vector3(...juniper.seat.seat);
    expect(pipSeat.distanceTo(juniperSeat)).toBeGreaterThan(0.01); // else this test would prove nothing
    expect(at.distanceTo(pipSeat)).toBeLessThan(1e-4);
    expect(at.distanceTo(juniperSeat)).toBeGreaterThan(0.01);
  });
});

describe('RacerModels.combo (glb.ts): built once per pair, reused; fails soft with a model still loading', () => {
  const rigs = (RACER_MODELS as unknown as { rigs: Map<string, RiggedTemplate> }).rigs;
  afterAll(() => { rigs.delete('pip'); rigs.delete('juniper'); });

  it('the racer\'s own kart, unchanged: a same-id pair is just RacerModels.make', () => {
    rigs.set('pip', pip);
    expect(RACER_MODELS.combo('pip', 'pip')).not.toBeNull();
  });

  it('another racer\'s kart, both loaded: one draw call, cached the second time', () => {
    rigs.set('pip', pip);
    rigs.set('juniper', juniper);
    const first = RACER_MODELS.combo('juniper', 'pip')!;
    expect(first).not.toBeNull();
    expect(meshCount(first)).toBe(1);
    const second = RACER_MODELS.combo('juniper', 'pip')!;
    expect((second.userData.rig as { wheelRadius: number }).wheelRadius).toBe((first.userData.rig as { wheelRadius: number }).wheelRadius);
  });

  it('either racer not built from parts yet: null, so the caller falls back to the racer\'s own kart', () => {
    rigs.delete('juniper');
    expect(RACER_MODELS.combo('juniper', 'pip')).toBeNull();
    expect(RACER_MODELS.combo('pip', 'juniper')).toBeNull();
  });
});

describe('exhaustFor and comboOwnerOf: the kart\'s own pipes, the driver\'s own flame colour', () => {
  it('comboOwnerOf: another racer\'s signature kart names its owner; a twin, an unknown kart, or the racer\'s own name no one', () => {
    expect(comboOwnerOf('juniper', { kartId: 'scooter' })).toBe('pip');
    expect(comboOwnerOf('juniper', { kartId: 'wagon' })).toBeUndefined(); // her own
    expect(comboOwnerOf('juniper', { kartId: 'classic' })).toBeUndefined(); // a twin: bodies.ts, not a combo
    expect(comboOwnerOf('juniper', { kartId: 'not-a-kart' })).toBeUndefined();
    expect(comboOwnerOf('juniper', {})).toBeUndefined();
  });

  it("burns from the kart's own measured pipes, in the driver's own colour", async () => {
    const manifest = await partsManifest();
    const rigs = (RACER_MODELS as unknown as { rigs: Map<string, RiggedTemplate> }).rigs;
    rigs.set('pip', pip);
    try {
      const e = exhaustFor('juniper', { kartId: 'scooter' })!;
      expect(e.flame).toBe('#ff7a2e'); // Juniper's own (racers.ts EXHAUST.juniper), never Pip's '#2ec4b6'
      expect(e.ports).toEqual(manifest.pip.body.exhaust!.ports); // Pip's own measured pipes
      expect(e.dir).toEqual(manifest.pip.body.exhaust!.dir);
    } finally { rigs.delete('pip'); }
  });
});
