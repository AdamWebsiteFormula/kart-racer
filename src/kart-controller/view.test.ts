// KartView puts the animation (anim.ts) on the chassis and on a rigged model's morph targets, and
// leaves `root` (the sim pose the chase camera follows) exactly as the sim has it.
import { describe, expect, it } from 'vitest';
import { BufferAttribute, BufferGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import { KART_ANIM, KartAnim, newPose } from './anim.ts';
import { makeConstants } from './constants.ts';
import { SIM_DT } from './step.ts';
import { createKartState, NEUTRAL_INPUT } from './types.ts';
import { KartView } from './view.ts';

const c = makeConstants('medium', 150);

/** A mesh carrying the rig's four targets (as art-pipeline rig.ts makes them), `unit` radians each. */
function rigged(unit: number): Mesh {
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(9), 3));
  g.morphAttributes.position = ['lean', 'look', 'nod', 'steer'].map((name) => {
    const a = new BufferAttribute(new Float32Array(9), 3);
    a.name = name;
    return a;
  });
  g.morphTargetsRelative = true;
  g.userData.rigUnit = unit;
  return new Mesh(g, new MeshBasicMaterial());
}

describe('KartView', () => {
  it('drives the chassis and the rig from the animation; the root stays the sim pose', () => {
    const chassis = new Group(), model = rigged(0.001);
    chassis.add(model);
    const s = createKartState({ racerId: 'x' });
    s.speed = 25;
    const v = new KartView(c, chassis, s);
    const twin = new KartAnim(c); // the same animation, stepped alongside, to read the pose it should show
    const input = { ...NEUTRAL_INPUT, throttle: 1, steer: 1 };
    for (let i = 0; i < 120; i++) {
      s.heading += 0.8 * SIM_DT;
      s.position[0] += Math.sin(s.heading) * s.speed * SIM_DT;
      s.position[2] += Math.cos(s.heading) * s.speed * SIM_DT;
      v.onTick(s, SIM_DT, input);
      twin.tick(s, input, SIM_DT);
      v.onFrame(0.5, s, input.steer, 1 / 60);
    }
    const p = twin.pose(0.5, false, newPose());
    expect(chassis.rotation.z).toBeCloseTo(p.roll, 9);
    expect(chassis.rotation.x).toBeCloseTo(p.pitch, 9);
    expect(chassis.rotation.order).toBe('YXZ');
    expect(chassis.position.y).toBeCloseTo(p.lift, 9);
    expect(chassis.scale.y).toBeCloseTo(1 + p.squash, 9);
    const inf = model.morphTargetInfluences!, at = model.morphTargetDictionary!;
    expect(inf[at.steer] * 0.001).toBeCloseTo(p.steer, 9);
    expect(inf[at.lean] * 0.001).toBeCloseTo(p.lean, 9);
    expect(inf[at.look] * 0.001).toBeCloseTo(p.look, 9);
    expect(p.steer).toBeGreaterThan(0.2);
    // the root is the sim's: heading only, no roll, the camera's to follow
    expect(v.root.rotation.z).toBe(0);
    expect(v.root.position.x).toBeCloseTo(s.position[0] - Math.sin(s.heading) * s.speed * SIM_DT * 0.5, 2);
  });

  it('reduced motion shows the calmer pose; a code-built kart with no rig is fine', () => {
    const chassis = new Group();
    const s = createKartState({ racerId: 'x' });
    s.speed = 25;
    const v = new KartView(c, chassis, s);
    for (let i = 0; i < 120; i++) {
      s.heading += 0.8 * SIM_DT;
      v.onTick(s, SIM_DT, { ...NEUTRAL_INPUT, steer: 1 });
    }
    v.onFrame(1, s, 1, 1 / 60, false);
    const full = chassis.rotation.z;
    v.onFrame(1, s, 1, 1 / 60, true);
    expect(chassis.rotation.z).toBeCloseTo(full * KART_ANIM.reducedScale, 9);
    expect(full).toBeGreaterThan(0.02);
  });
});
