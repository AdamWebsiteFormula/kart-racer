// Racers built from parts (rigged.ts), on Juniper's real files: the manifest's shape, the part files'
// triangle budget, the merge into one skinned mesh (every part on its bones, the mirrored wheels' faces
// still outward, the steering wheel cut out of the body), the seat by IK on the kart's points (Hips on
// the seat, hands at the grips, feet on the rests; in a shared body too), and the rig putting the
// animation on the bones (wheels roll and steer, the steering wheel turns and the hands go with it,
// head, spine, body on its springs, a gesture's aim).
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { DataTexture, Matrix4, Quaternion, Vector3, type Bone, type MeshStandardMaterial, type Object3D, type SkinnedMesh, type Texture } from 'three';
import { newPose } from '../kart-controller/anim.ts';
import { DRIVER_ANIM, newDriverPose } from '../kart-controller/driverAnim.ts';
import { KART_ANIM } from '../kart-controller/anim.ts';
import { SEATS } from './bodies.ts';
import { RACER_MODELS, RacerModels, textureWithImage } from './glb.ts';
import { buildRacerMesh, exhaustFor } from './kart.ts';
import { portDir } from './racers.ts';
import { isShared } from './toon.ts';
import { cutSteering, hubSlot, isPartsSpec, KART_BONES, makeRigged, makeRiggedDriver, partOf, riggedMaterial, type PartsSpec, type RiggedKart, type RiggedTemplate } from './rigged.ts';
import { partsManifest, riggedTemplate, trianglesIn } from './__tests__/parts.ts';

/** The triangle budget per part file (scripts/models/racer-parts.sh shrinks a racer's files to it). */
const BUDGET = Object.freeze({ driver: 20_000, body: 8_000, wheel: 2_500 });

let MANIFEST: Record<string, PartsSpec>;
let spec: PartsSpec;
let t: RiggedTemplate;
beforeAll(async () => { MANIFEST = await partsManifest(); spec = MANIFEST.juniper; t = await riggedTemplate('juniper'); }, 120_000);

const mesh = (o: Object3D) => o.getObjectByName('rigged') as SkinnedMesh;
const bone = (o: Object3D, n: string) => o.getObjectByName(n) as Bone;
const world = (o: Object3D) => { o.updateWorldMatrix(true, false); return new Vector3().setFromMatrixPosition(o.matrixWorld); };

describe('the parts manifest', () => {
  it('lists every racer with all three parts and their fitting; anything less is ignored (that racer keeps its fused file)', () => {
    for (const [id, s] of Object.entries(MANIFEST)) expect(isPartsSpec(s), id).toBe(true);
    const bad = structuredClone(MANIFEST.juniper) as Partial<PartsSpec>;
    delete bad.wheel;
    expect(isPartsSpec(bad)).toBe(false);
    expect(isPartsSpec({ ...MANIFEST.juniper, body: { ...MANIFEST.juniper.body, grips: [[0, 1, 0]] } })).toBe(false);
    expect(isPartsSpec({ url: 'models/juniper.glb' })).toBe(false);
  });

  it('every racer\'s part files are within the triangle budget (scripts/models/racer-parts.sh)', async () => {
    for (const [id, s] of Object.entries(MANIFEST)) {
      for (const part of ['driver', 'body', 'wheel'] as const) {
        expect(await trianglesIn(s[part].url), `${id} ${part}`).toBeLessThanOrEqual(BUDGET[part]);
      }
    }
  });
});

describe('the merge: one skinned mesh', () => {
  it('holds the body, four wheels and the driver on 11 kart bones and the driver\'s 24', async () => {
    const m = mesh(t.root);
    expect(m.isSkinnedMesh).toBe(true);
    const names = m.skeleton.bones.map((b) => b.name);
    expect(names.slice(0, KART_BONES.length)).toEqual([...KART_BONES]);
    for (const n of ['Hips', 'Spine', 'neck', 'Head', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm', 'RightForeArm', 'RightHand', 'LeftUpLeg', 'RightFoot']) expect(names).toContain(n);
    expect(names.length).toBe(KART_BONES.length + 24);
    let meshes = 0;
    t.root.traverse((o) => { if ((o as SkinnedMesh).isMesh) meshes++; });
    expect(meshes, 'one draw call').toBe(1);
    const files = await trianglesIn(spec.driver.url) + await trianglesIn(spec.body.url) + 4 * await trianglesIn(spec.wheel.url);
    expect(t.triangles).toBe(files);
    // every vertex on real bones, weights summing to one
    const J = m.geometry.getAttribute('skinIndex'), W = m.geometry.getAttribute('skinWeight');
    for (let i = 0; i < J.count; i += 7) {
      let sum = 0;
      for (let k = 0; k < 4; k++) { expect(J.getComponent(i, k)).toBeLessThan(names.length); sum += W.getComponent(i, k); }
      expect(Math.abs(sum - 1)).toBeLessThan(1e-3);
    }
  });

  it('each wheel sits on its hub at its radius, and the mirrored ones still face out (winding and normals agree)', () => {
    const g = mesh(t.root).geometry, P = g.getAttribute('position'), N = g.getAttribute('normal'), J = g.getAttribute('skinIndex'), idx = g.index!;
    const names = mesh(t.root).skeleton.bones.map((b) => b.name);
    for (const h of spec.wheel.hubs) {
      const slot = hubSlot(h), wb = names.indexOf(['wheelFL', 'wheelFR', 'wheelRL', 'wheelRR'][slot]);
      const min = new Vector3(Infinity, Infinity, Infinity), max = new Vector3(-Infinity, -Infinity, -Infinity), v = new Vector3();
      let agree = 0, tris = 0;
      for (let k = 0; k < idx.count; k += 3) {
        const a = idx.getX(k), b = idx.getX(k + 1), c = idx.getX(k + 2);
        if (J.getX(a) !== wb) continue;
        for (const i of [a, b, c]) { v.fromBufferAttribute(P, i); min.min(v); max.max(v); }
        const pa = new Vector3().fromBufferAttribute(P, a), pb = new Vector3().fromBufferAttribute(P, b), pc = new Vector3().fromBufferAttribute(P, c);
        const face = pb.sub(pa).cross(pc.sub(pa));
        if (face.lengthSq() < 1e-14) continue;
        tris++;
        if (face.dot(new Vector3().fromBufferAttribute(N, a)) > 0) agree++;
      }
      expect(tris, `wheel at ${h}`).toBeGreaterThan(500);
      expect(agree / tris, `faces out at ${h}`).toBeGreaterThan(0.9);
      const c = min.clone().add(max).multiplyScalar(0.5);
      expect(Math.abs(c.y - h[1])).toBeLessThan(0.02);
      expect(Math.abs(c.z - h[2])).toBeLessThan(0.02);
      expect((max.y - min.y) / 2).toBeCloseTo(spec.wheel.radius, 2);
    }
  });

  it('the steering wheel is cut out of the body onto its own bone: its disc, nothing past it', () => {
    const names = mesh(t.root).skeleton.bones.map((b) => b.name);
    const g = mesh(t.root).geometry, P = g.getAttribute('position'), J = g.getAttribute('skinIndex');
    const st = spec.body.steering!, c = new Vector3(...st.centre), n = new Vector3(...st.axis).normalize(), v = new Vector3();
    let onSteer = 0;
    for (let i = 0; i < J.count; i++) {
      if (J.getX(i) !== names.indexOf('steer')) continue;
      onSteer++;
      v.fromBufferAttribute(P, i).sub(c);
      expect(Math.abs(v.dot(n))).toBeLessThan(0.041);
      expect(v.length()).toBeLessThan(st.radius + 0.05);
    }
    expect(onSteer).toBeGreaterThan(100);
    // with the texture read, only its dark vertices go (none here: everything reads light)
    const p = partOf(mesh(t.root).geometry, 1);
    expect(cutSteering(p, st, 2, () => false)).toBe(0);
  });
});

describe('seated by IK on the kart\'s points', () => {
  const near = (a: Vector3, b: readonly number[], d: number) => expect(a.distanceTo(new Vector3(b[0], b[1], b[2]))).toBeLessThan(d);

  it('its own kart: the Hips on the seat, the hands a hand\'s length from the grips, the feet on the rests', () => {
    const k = makeRigged(t);
    near(world(bone(k, 'Hips')), spec.body.seat!, 0.002);
    for (const [i, side] of [[0, 'Left'], [1, 'Right']] as const) {
      const wrist = world(bone(k, `${side}Hand`)), grip = new Vector3(...spec.body.grips![i]);
      expect(Math.abs(wrist.distanceTo(grip) - t.pose.wrist), `${side} hand`).toBeLessThan(0.03);
      near(world(bone(k, `${side}Foot`)), spec.body.feet![i], 0.03);
      // elbows out to their own side and below the shoulders
      const elbow = world(bone(k, `${side}ForeArm`)), shoulder = world(bone(k, `${side}Arm`));
      expect(Math.sign(elbow.x)).toBe(i === 0 ? 1 : -1);
      expect(elbow.y).toBeLessThan(shoulder.y + 0.05);
    }
  });

  it('a shared body: the same driver sits on the Classic\'s seat and holds its wheel', () => {
    for (const body of ['classic', 'buggy'] as const) {
      const s = SEATS[body], k = makeRiggedDriver(t, s, undefined);
      near(world(bone(k, 'Hips')), s.seat, 0.002);
      for (const [i, side] of [[0, 'Left'], [1, 'Right']] as const) {
        expect(world(bone(k, `${side}Hand`)).distanceTo(new Vector3(...s.grips[i])), `${body} ${side}`).toBeLessThan(t.pose.wrist + 0.03);
      }
      let meshes = 0;
      k.traverse((o) => { if ((o as SkinnedMesh).isMesh) meshes++; });
      expect(meshes).toBe(1);
    }
  });
});

describe('RiggedKart: the animation on the bones', () => {
  const kartQuat = (k: Object3D, o: Object3D) => {
    k.updateMatrixWorld(true);
    const q = new Quaternion();
    new Matrix4().multiplyMatrices(new Matrix4().copy(k.matrixWorld).invert(), o.matrixWorld).decompose(new Vector3(), q, new Vector3());
    return q;
  };

  it('rolls the wheels, steers the fronts, turns the steering wheel, and the hands go round with it', () => {
    const k = makeRigged(t), rig = k.userData.rig as RiggedKart;
    const a = newPose(), d = newDriverPose();
    a.steer = KART_ANIM.steerAngle; // full lock toward +X
    d.spin = 7.5;
    rig.apply(a, d);
    for (const n of ['wheelFL', 'wheelFR', 'wheelRL', 'wheelRR']) expect(bone(k, n).rotation.x).toBeCloseTo(7.5 % (2 * Math.PI), 6);
    expect(bone(k, 'hubFL').rotation.y).toBeCloseTo(a.steer, 6);
    expect(bone(k, 'hubRR').rotation.y).toBe(0);
    const turn = DRIVER_ANIM.wheelTurn, st = spec.body.steering!, n = new Vector3(...st.axis).normalize(), c = new Vector3(...st.centre);
    expect(bone(k, 'steer').quaternion.angleTo(new Quaternion())).toBeCloseTo(turn, 3);
    // the left grip, turned with the wheel about its column: the left wrist follows it there
    const grip = new Vector3(...spec.body.grips![0]).sub(c).applyAxisAngle(n, turn).add(c);
    expect(Math.abs(world(bone(k, 'LeftHand')).distanceTo(grip) - t.pose.wrist)).toBeLessThan(0.035);
    // the body rides its springs; the wheels do not
    a.heave = -0.05;
    rig.apply(a, d);
    expect(bone(k, 'body').position.y).toBeCloseTo(-0.05, 6);
    expect(world(bone(k, 'hubRL')).y).toBeCloseTo(spec.wheel.hubs[2][1], 2);
  });

  it('turns the head with the look, leans the spine with the lean, and aims an arm off the wheel for a gesture', () => {
    const k = makeRigged(t), rig = k.userData.rig as RiggedKart;
    const a = newPose(), d = newDriverPose();
    rig.apply(a, d);
    const head0 = kartQuat(k, bone(k, 'Head')), chest0 = world(bone(k, 'neck'));
    a.look = 0.5;
    a.lean = 0.3; // the top toward +X
    rig.apply(a, d);
    const turn = kartQuat(k, bone(k, 'Head')).multiply(head0.clone().invert());
    const fwd = new Vector3(0, 0, 1).applyQuaternion(turn);
    expect(Math.atan2(fwd.x, fwd.z)).toBeCloseTo(0.5, 1);
    expect(world(bone(k, 'neck')).x - chest0.x).toBeGreaterThan(0.03); // spread over the three spine bones
    // the right arm, off the wheel, straight up
    d.armR.wheel = 0; d.armR.upper = [0, 1, 0]; d.armR.fore = [0, 1, 0];
    a.look = 0; a.lean = 0;
    rig.apply(a, d);
    const up = world(bone(k, 'RightForeArm')).sub(world(bone(k, 'RightArm'))).normalize();
    expect(up.y).toBeGreaterThan(0.95);
    const hand = world(bone(k, 'RightHand')).sub(world(bone(k, 'RightForeArm'))).normalize();
    expect(hand.y).toBeGreaterThan(0.95);
    for (const b of mesh(k).skeleton.bones) expect(Number.isFinite(b.quaternion.x)).toBe(true);
  });
});

describe('a rigged racer\'s look: paint and pipes', () => {
  it('an alt paint repaints its one atlas once, into one shared material on every kart; the pipes burn from the measured mouths, riding the body', () => {
    const models = new RacerModels('/', () => Promise.reject(new Error('no network in tests')));
    const map = new DataTexture(new Uint8Array([0x2e, 0xc4, 0xb6, 255]), 1, 1);
    const own = riggedMaterial(map);
    const pip: RiggedTemplate = { ...t, racerId: 'pip', material: own };
    (models as unknown as { rigs: Map<string, RiggedTemplate> }).rigs.set('pip', pip);
    const repaint = vi.fn((x: Texture) => textureWithImage(x, { data: new Uint8Array([200, 30, 90, 255]), width: 1, height: 1 }));
    models.repaintTexture = repaint;
    const skinned = (o: Object3D) => { const out: SkinnedMesh[] = []; o.traverse((x) => { if ((x as SkinnedMesh).isSkinnedMesh) out.push(x as SkinnedMesh); }); return out; };
    const a = models.make('pip', 'pip-alt')!, b = models.make('pip', 'pip-alt')!;
    const ma = skinned(a)[0].material as MeshStandardMaterial;
    expect(ma).toBe(skinned(b)[0].material);
    expect(ma).not.toBe(own);
    expect(repaint).toHaveBeenCalledTimes(1);
    expect(isShared(ma)).toBe(true);
    expect(map.image).not.toBe(ma.map!.image); // the racer's own atlas untouched
    // the pipes: the manifest's mouths, no splay, and the flames hang off the body bone (its springs)
    (RACER_MODELS as unknown as { rigs: Map<string, RiggedTemplate> }).rigs.set('juniper', t);
    try {
      const e = exhaustFor('juniper')!;
      expect(e.ports).toEqual(spec.body.exhaust!.ports);
      expect(e.dir).toEqual(spec.body.exhaust!.dir);
      expect(e.splay).toBe(0);
      expect(portDir(e, e.ports[0])).toEqual(portDir({ ...e, ports: [[0, 0, 0]] }, [0, 0, 0]));
      const k = buildRacerMesh('juniper')!;
      expect(k.userData.exhaustAnchor).toBe(k.getObjectByName('body'));
    } finally { (RACER_MODELS as unknown as { rigs: Map<string, RiggedTemplate> }).rigs.delete('juniper'); }
  });
});
