// The racer rig (rig.ts): morph targets that turn the driver and the front wheels of a one-mesh
// model, RIG_UNIT radians' displacement each, soft at the edges, in the geometry's own frame.
import { describe, expect, it } from 'vitest';
import { BufferAttribute, BufferGeometry, Matrix3, Matrix4, Mesh, MeshBasicMaterial, Quaternion, Vector3 } from 'three';
import { DRIVER_CUTS, type DriverCut } from './glb.ts';
import { racerGeometry } from './kart.ts';
import { RACER_IDS } from './racers.ts';
import { BODY_WHEELS, bodyWeight, driverWeight, MODEL_WHEELS, RIG_SOFT, RIG_TARGETS, RIG_UNIT, rigKart, wheelWeight, type Wheels } from './rig.ts';

const CUT: DriverCut = { y: 0.6, x: 0.5, z: [-0.5, 0.5], at: -0.1 };
const WHEELS: Wheels = { front: { x: 0.6, z: 0.6, r: 0.3, w: 0.13 }, rear: { x: 0.6, z: -0.6, r: 0.3, w: 0.13 } };
const WHEEL = WHEELS.front;
const RIG = { driver: CUT, wheels: WHEELS };

/** Named points (kart frame) as a geometry; `M` places them in a model's own frame (its inverse is applied). */
function points(pts: Record<string, [number, number, number]>, M?: Matrix4): { g: BufferGeometry; at: Record<string, number> } {
  const names = Object.keys(pts), arr = new Float32Array(names.length * 3);
  const inv = M ? M.clone().invert() : null, v = new Vector3();
  names.forEach((n, i) => {
    v.set(...pts[n]);
    if (inv) v.applyMatrix4(inv);
    arr.set([v.x, v.y, v.z], i * 3);
  });
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(arr, 3));
  return { g, at: Object.fromEntries(names.map((n, i) => [n, i])) };
}

/** Target `name`'s displacement per radian at point `i`, in the geometry's own frame. */
function delta(g: BufferGeometry, name: string, i: number): Vector3 {
  const a = g.morphAttributes.position!.find((x) => x.name === name)!;
  return new Vector3(a.getX(i), a.getY(i), a.getZ(i)).divideScalar(RIG_UNIT);
}

const PTS: Record<string, [number, number, number]> = {
  head: [0, 1.6, -0.1],
  face: [0, 1.5, 0.2],
  belowHips: [0, 0.45, -0.1],
  side: [0.9, 1.2, -0.1], // outside the driver's box
  wheelFront: [0.6, 0.3, 0.9], // the +X front tyre's leading edge
  wheelBack: [0.6, 0.3, 0.3],
  wheelLeft: [-0.6, 0.3, 0.9],
  rearWheel: [0.6, 0.3, -0.6],
  body: [0, 0.4, 0.6],
  roof: [0, 0.9, -0.7], // the body well over the axles, behind the driver's box
  floor: [0, 0.2, 0], // under the axles
};

describe('rigKart', () => {
  it('adds the five targets, in order, relative, and nothing moves at zero', () => {
    const { g } = points(PTS);
    rigKart(g, null, RIG);
    expect(g.morphAttributes.position!.map((a) => a.name)).toEqual([...RIG_TARGETS]);
    expect(g.morphTargetsRelative).toBe(true);
    expect(g.userData.rigUnit).toBe(RIG_UNIT);
    const m = new Mesh(g, new MeshBasicMaterial());
    expect(m.morphTargetInfluences).toEqual([0, 0, 0, 0, 0]);
    expect(Object.keys(m.morphTargetDictionary!)).toEqual([...RIG_TARGETS]);
  });

  it('lean tips the driver toward +X about the hips; look turns the face; nod tips the head forward; the kart stays', () => {
    const { g, at } = points(PTS);
    rigKart(g, null, RIG);
    const lean = delta(g, 'lean', at.head), look = delta(g, 'look', at.face), nod = delta(g, 'nod', at.head);
    expect(lean.x).toBeCloseTo(1.6 - CUT.y, 5); // a radian's tangent: the height above the hips
    expect(lean.y).toBeCloseTo(0, 5);
    expect(look.x).toBeGreaterThan(0.05); // the face (in front of the head's middle) swings toward +X
    expect(nod.z).toBeCloseTo(1.6 - CUT.y, 5);
    for (const p of ['belowHips', 'side', 'body', 'rearWheel', 'roof']) {
      for (const t of ['lean', 'look', 'nod']) expect(delta(g, t, at[p]).length(), `${t} at ${p}`).toBeCloseTo(0, 6);
    }
  });

  it('heave lifts the body and all on it over the axles; the tyres and what is under the axles stay', () => {
    const { g, at } = points(PTS);
    rigKart(g, null, RIG);
    for (const p of ['head', 'roof', 'side']) {
      const d = delta(g, 'heave', at[p]);
      expect(d.y, p).toBeCloseTo(1, 5);
      expect(Math.hypot(d.x, d.z), p).toBeCloseTo(0, 6);
    }
    for (const p of ['wheelFront', 'wheelBack', 'rearWheel', 'floor']) expect(delta(g, 'heave', at[p]).length(), p).toBeCloseTo(0, 6);
    expect(bodyWeight(WHEELS, 0, WHEEL.r + RIG_SOFT.springs / 2, 0)).toBeCloseTo(0.5, 6);
    // a driver cut out and seated on its own rides the springs whole
    const d = points({ a: [0, 0.7, 0], b: [0.1, 1.5, 0.2] });
    rigKart(d.g, null, { driver: CUT, onSprings: true });
    expect(delta(d.g, 'heave', 0).y).toBeCloseTo(1, 6);
    expect(delta(d.g, 'heave', 1).y).toBeCloseTo(1, 6);
  });

  it('steer turns both front wheels toward +X about their own uprights; the rear wheels and the body stay', () => {
    const { g, at } = points(PTS);
    rigKart(g, null, RIG);
    expect(delta(g, 'steer', at.wheelFront).x).toBeCloseTo(0.3, 5); // 0.3 m ahead of the axle
    expect(delta(g, 'steer', at.wheelBack).x).toBeCloseTo(-0.3, 5);
    expect(delta(g, 'steer', at.wheelLeft).x).toBeCloseTo(0.3, 5); // the mirror wheel turns the same way
    for (const p of ['rearWheel', 'body', 'head']) expect(delta(g, 'steer', at[p]).length(), p).toBeCloseTo(0, 6);
  });

  it('works in a model file\'s own frame (scaled, turned, moved), giving the same motion in the kart frame', () => {
    const M = new Matrix4().compose(new Vector3(0.1, -0.2, 0.3), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -Math.PI / 2), new Vector3(0.004, 0.004, 0.004));
    const flat = points(PTS), placed = points(PTS, M);
    rigKart(flat.g, null, RIG);
    rigKart(placed.g, M, RIG);
    const lin = new Matrix3().setFromMatrix4(M); // a displacement goes through the linear part only
    for (const t of RIG_TARGETS) {
      for (let i = 0; i < Object.keys(PTS).length; i++) {
        const inKart = delta(placed.g, t, i).applyMatrix3(lin);
        expect(inKart.distanceTo(delta(flat.g, t, i)), `${t} at point ${i}`).toBeLessThan(1e-3);
      }
    }
  });

  it('the masks are soft: no step anywhere across the hip line or the tyre\'s edge', () => {
    let last = 0, step = 0;
    for (let y = 0.3; y < 1.0; y += 0.005) { const w = driverWeight(CUT, 0, y, 0); step = Math.max(step, Math.abs(w - last)); last = w; }
    expect(last).toBe(1);
    expect(step).toBeLessThan(0.08);
    last = 0; step = 0;
    for (let z = 0; z < 1.2; z += 0.005) { const w = wheelWeight(WHEEL, 0.6, 0.3, z); step = Math.max(step, Math.abs(w - last)); last = w; }
    expect(step).toBeLessThan(0.15);
  });
});

describe('every racer is rigged', () => {
  it('each racer has wheels and a driver cut, and a shared body and a code-built kart rig theirs', () => {
    for (const id of RACER_IDS) {
      expect(MODEL_WHEELS[id], id).toBeDefined();
      expect(DRIVER_CUTS[id], id).toBeDefined();
      // the front pair in the front half of the footprint, the rear in the back, inside its width, standing on the ground
      const { front, rear } = MODEL_WHEELS[id];
      expect(front.z).toBeGreaterThan(0.3);
      expect(rear.z).toBeLessThan(-0.3);
      for (const w of [front, rear]) {
        expect(w.x + w.w).toBeLessThanOrEqual(0.86);
        expect(w.r).toBeGreaterThan(0.15);
      }
      // the code-built signature kart moves its driver, its front wheels and its body
      const code = racerGeometry(id)!.body;
      for (const t of RIG_TARGETS) {
        const a = code.morphAttributes.position!.find((x) => x.name === t)!;
        let moved = 0;
        for (let i = 0; i < a.count; i++) if (Math.hypot(a.getX(i), a.getY(i), a.getZ(i)) > 1e-7) moved++;
        expect(moved, `${id} ${t}`).toBeGreaterThan(10);
      }
    }
    for (const body of ['classic', 'buggy'] as const) {
      const g = racerGeometry('pip', { body }, false)!.body;
      expect(g.morphAttributes.position?.map((a) => a.name)).toEqual([...RIG_TARGETS]);
      const steer = g.morphAttributes.position!.find((a) => a.name === 'steer')!;
      let moved = 0;
      for (let i = 0; i < steer.count; i++) if (Math.hypot(steer.getX(i), steer.getZ(i)) > 1e-4) moved++;
      expect(moved, body).toBeGreaterThan(20); // the two front tyres and hubs
      expect(BODY_WHEELS[body].front.z).toBeGreaterThan(0);
    }
  });
});
