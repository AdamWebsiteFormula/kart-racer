// The racer standing alone (stand.ts; Adam, 28 Sept 2026: "This part should just show the characters, not the karts"),
// on Juniper's and Big Gus's real files: the driver alone (no kart), on its feet on the floor, the feet planted while
// the idle moves the hips and head, still with reduced motion, the head toward the camera, and each flourish's reach
// (a salute at the brow) and its envelopes (every flourish starts and ends at rest).
import { beforeAll, describe, expect, it } from 'vitest';
import { Box3, Vector3, type Object3D, type SkinnedMesh } from 'three';
import { beat, STAND, STAND_TEMPERS, StandingRacer, temperOf, type Flourish } from './stand.ts';
import type { RiggedTemplate } from './rigged.ts';
import { riggedTemplate } from './__tests__/parts.ts';

let juniper: RiggedTemplate;
let gus: RiggedTemplate;
beforeAll(async () => { juniper = await riggedTemplate('juniper'); gus = await riggedTemplate('gus'); }, 120_000);

const at = (o: Object3D | undefined) => { o!.updateWorldMatrix(true, false); return new Vector3().setFromMatrixPosition(o!.matrixWorld); };
const skinned = (f: StandingRacer) => f.root.getObjectByName('rigged') as SkinnedMesh;
/** the soles: the lowest point of the skinned figure as posed */
const floorOf = (f: StandingRacer) => new Box3().setFromObject(f.root, true).min.y;
const MOVES: Flourish[] = ['hop', 'point', 'twirl', 'salute', 'wave', 'cheer', 'bow', 'laugh'];

describe('the racer standing alone', () => {
  it('is the driver alone, no kart: its own bones, only the driver\'s triangles', () => {
    for (const t of [juniper, gus]) {
      const f = new StandingRacer(t);
      const full = (t.root.getObjectByName('rigged') as SkinnedMesh).geometry.index!.count;
      const alone = skinned(f).geometry.index!.count;
      expect(alone, t.racerId).toBeLessThan(full);
      expect(alone, t.racerId).toBe((t.driverOnly.getObjectByName('rigged') as SkinnedMesh).geometry.index!.count);
      // its own copy of the bones: posing it never moves the template's
      expect(f.root.getObjectByName('Hips')).not.toBe(t.driverOnly.getObjectByName('Hips'));
    }
  });

  it('stands on the floor, the hips at its standing height, the knees a touch soft', () => {
    for (const t of [juniper, gus]) {
      const f = new StandingRacer(t);
      f.update(0, null, true);
      expect(Math.abs(floorOf(f)), `${t.racerId}'s soles on the floor`).toBeLessThan(0.03);
      expect(at(f.root.getObjectByName('Hips')).y).toBeCloseTo(f.hipsHeight, 3);
      expect(f.hipsHeight).toBeGreaterThan(0.3);
      // the head well above the hips: standing, not seated
      expect(at(f.root.getObjectByName('Head')).y - at(f.root.getObjectByName('Hips')).y).toBeGreaterThan(0.25);
    }
  });

  it('idles in its own temper: the hips and head move, the feet stay planted; with reduced motion it holds still', () => {
    const f = new StandingRacer(juniper);
    const feet = () => ['LeftFoot', 'RightFoot'].map((n) => at(f.root.getObjectByName(n)));
    const eye = new Vector3(0, 1, 5);
    f.update(0, eye, false);
    const start = feet(), hips0 = at(f.root.getObjectByName('Hips')), head0 = at(f.root.getObjectByName('Head'));
    let hipsMoved = 0, headMoved = 0, footMoved = 0;
    for (let i = 0; i < 90; i++) {
      f.update(1 / 30, eye, false);
      hipsMoved = Math.max(hipsMoved, at(f.root.getObjectByName('Hips')).distanceTo(hips0));
      headMoved = Math.max(headMoved, at(f.root.getObjectByName('Head')).distanceTo(head0));
      feet().forEach((p, k) => { footMoved = Math.max(footMoved, p.distanceTo(start[k])); });
    }
    expect(hipsMoved).toBeGreaterThan(0.005);
    expect(headMoved).toBeGreaterThan(0.005);
    expect(footMoved, 'the feet planted').toBeLessThan(0.01);
    // reduced motion: the same pose whenever it is looked at
    const g = new StandingRacer(juniper);
    g.update(0.3, eye, true);
    const a = at(g.root.getObjectByName('Head'));
    g.update(0.8, eye, true);
    expect(at(g.root.getObjectByName('Head')).distanceTo(a)).toBeLessThan(1e-6);
  });

  it('looks toward the camera: to its left for a camera on its left, to its right for one on its right', () => {
    const face = (x: number) => {
      const f = new StandingRacer(juniper);
      f.update(0, new Vector3(x, 1, 4), true);
      return at(f.root.getObjectByName('headfront')).sub(at(f.root.getObjectByName('Head'))).x;
    };
    expect(face(3)).toBeGreaterThan(face(-3) + 0.01);
  });

  it('gives its flourish: Juniper salutes, her hand up at her brow at its height, and back down at its end', () => {
    expect(temperOf('juniper').move).toBe('salute');
    const f = new StandingRacer(juniper);
    const eye = new Vector3(0, 1, 5);
    f.update(0, eye, false);
    const hand = () => at(f.root.getObjectByName('RightHand')), head = () => at(f.root.getObjectByName('Head'));
    const restGap = hand().distanceTo(head());
    f.flourish();
    expect(f.flourishing).toBe(true);
    const len = STAND.seconds.salute;
    for (let t = 0; t < len * 0.5; t += 1 / 30) f.update(1 / 30, eye, false);
    expect(hand().distanceTo(head()), 'up at the brow (the wrist a hand short of it)').toBeLessThan(restGap * 0.55);
    for (let t = 0; t < len * 0.6; t += 1 / 30) f.update(1 / 30, eye, false);
    expect(f.flourishing).toBe(false);
    expect(hand().distanceTo(head())).toBeGreaterThan(restGap * 0.8);
  });

  it('every flourish starts and ends at rest (no pop in or out), and a twirl comes round to face you again', () => {
    for (const m of MOVES) {
      for (const u of [0, 0.999]) {
        const b = beat(m, u, 0.5);
        expect(b.lift, `${m} ${u}`).toBeCloseTo(0, 2);
        expect(b.crouch, `${m} ${u}`).toBeCloseTo(0, 2);
        expect(Math.abs(b.pitch) + Math.abs(b.twist) + Math.abs(b.headPitch), `${m} ${u}`).toBeLessThan(0.02);
        for (const r of [b.armL, b.armR]) expect(r?.w ?? 0, `${m} ${u}`).toBeLessThan(0.02);
      }
      expect(STAND.seconds[m]).toBeGreaterThan(0.5);
    }
    expect(beat('twirl', 0.999, 0.5).turn).toBeCloseTo(2 * Math.PI, 2);
    // a wave's hand is up at its height; a hop is in the air
    expect(beat('wave', 0.5, 0.5).armR!.up).toBeGreaterThan(0.5);
    expect(beat('hop', 0.47, 0.5).lift).toBeGreaterThan(0.1);
  });

  it('every racer has a temper: a flourish of its own, a bounce and a sway', () => {
    const ids = ['pip', 'momo', 'nova', 'juniper', 'otto', 'sprocket', 'boulder', 'gus'];
    expect(Object.keys(STAND_TEMPERS).sort()).toEqual([...ids].sort());
    expect(new Set(ids.map((id) => temperOf(id).move)).size).toBe(ids.length);
    for (const id of ids) {
      const t = temperOf(id);
      expect(t.bounceHz, id).toBeGreaterThan(0.3);
      expect(t.bounce, id).toBeLessThan(0.03);
      expect(t.armDrop, id).toBeGreaterThan(0.3);
    }
  });

  it('Big Gus laughs with his hands on his belly, in front of him, and his feet stay on the floor through it', () => {
    const f = new StandingRacer(gus);
    const eye = new Vector3(0, 1, 5);
    f.update(0, eye, false);
    f.flourish();
    for (let t = 0; t < STAND.seconds.laugh * 0.5; t += 1 / 30) f.update(1 / 30, eye, false);
    const hips = at(f.root.getObjectByName('Hips'));
    for (const n of ['LeftHand', 'RightHand']) expect(at(f.root.getObjectByName(n)).z, n).toBeGreaterThan(hips.z + 0.1);
    expect(Math.abs(floorOf(f))).toBeLessThan(0.04);
  });
});
