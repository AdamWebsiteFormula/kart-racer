// The turning scenery (spin.ts; the second fresh-eyes review's item 9: "the windmill and the Ferris wheel never turn"):
// which vertices of each model turn, found in the model files by where they stand and in the code-built ones by their
// parts; the axis carried through the file's fit; the scene turning them on its clock; the shadow turning with them.
import { beforeAll, describe, expect, it } from 'vitest';
import { BoxGeometry, BufferAttribute, BufferGeometry, Matrix4, Mesh, MeshStandardMaterial, Vector3, type Material } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildTrack } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { buildTrackScene } from '../track-builder/mesh/scene.ts';
import { mergeInstances } from '../track-builder/mesh/merge.ts';
import canyon from '../track-builder/tracks/canyon-rush.json';
import meadow from '../track-builder/tracks/meadow-run.json';
import boardwalk from '../track-builder/tracks/boardwalk-nights.json';
import { adoptPropFiles } from './__tests__/propFiles.ts';
import { decorGeometry, SPIN_PERIOD } from './decor.ts';
import { PROP_MODELS } from './glb.ts';
import { trackAssets } from './index.ts';
import { markSpin, placedSpin, SPIN_ATTRIBUTE, SPIN_INDEX, spinAngle, turning, type Spin, type SpinFind } from './spin.ts';

/** Each triangle of `g`: whether all, none or some of its corners turn. */
function triangles(g: BufferGeometry): { turn: number; still: number; mixed: number } {
  const s = g.getAttribute(SPIN_ATTRIBUTE), idx = g.index!;
  const out = { turn: 0, still: 0, mixed: 0 };
  for (let t = 0; t < idx.count; t += 3) {
    const n = [0, 1, 2].filter((k) => s.getX(idx.getX(t + k)) > 0.5).length;
    if (n === 3) out.turn++; else if (n === 0) out.still++; else out.mixed++;
  }
  return out;
}

/** Where vertex i stands against a spin: along its axis from the hub, and out from the axis. */
function against(g: BufferGeometry, i: number, s: Spin): { along: number; r: number } {
  const p = g.getAttribute('position'), d = new Vector3(p.getX(i) - s.hub[0], p.getY(i) - s.hub[1], p.getZ(i) - s.hub[2]);
  const a = new Vector3(...s.axis), along = d.dot(a);
  return { along, r: d.addScaledVector(a, -along).length() };
}

describe('marking what turns', () => {
  it('a tower and a cross of sails in front of it on an axle: the sails and the axle turn whole, out to their tips; the tower never; no triangle spans the two', () => {
    // the tower (4 x 10 x 4) and, in front of it on the +z side, the axle and two crossed sails 8 m across (its tips past the core)
    const tower = new BoxGeometry(4, 10, 4).translate(0, 5, 0);
    const axle = new BoxGeometry(0.4, 0.4, 1.2).translate(0, 8, 2.4);
    const sailA = new BoxGeometry(8, 1, 0.2).translate(0, 8, 3), sailB = new BoxGeometry(1, 8, 0.2).translate(0, 8, 3);
    const g = mergeGeometries([tower, axle, sailA, sailB].map((x) => { x.deleteAttribute('uv'); return x; }), false)!;
    const find: SpinFind = { hub: [0, 8, 3], axis: [0, 0, 1], period: 7, radius: 3.5, depth: [0.3, 0.3], reach: { radius: 4.5, depth: [0.8, 0.4] }, axle: 0.3 };
    const turned = markSpin(g, find);
    expect(turned).toBeGreaterThan(0);
    const t = triangles(g);
    expect(t.mixed, 'no triangle stretched between a turning and a still corner').toBe(0);
    const s = g.getAttribute(SPIN_ATTRIBUTE), p = g.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const on = s.getX(i) > 0.5;
      // the sails' tips (4 m out, past the 3.5 m core) turn; the tower's own vertices (z <= 2) never do
      if (p.getZ(i) <= 2.01 && p.getZ(i) >= -2.01 && Math.abs(p.getX(i)) <= 2.01 && p.getY(i) <= 10.01) expect(on, `tower vertex ${i}`).toBe(false);
      if (Math.abs(p.getZ(i) - 3) <= 0.11 && (Math.abs(p.getX(i)) > 3.9 || Math.abs(p.getY(i) - 8) > 3.9)) expect(on, `a sail's tip ${i}`).toBe(true);
    }
    // the geometry's other attributes followed the split corners
    for (const name of Object.keys(g.attributes)) expect(g.getAttribute(name).count).toBe(p.count);
  });

  it('the code-built windmill: its hub and sails turn about the hub, its tower, cap, door and windows never', () => {
    const g = decorGeometry('windmill')!.body, s = g.userData.spin as Spin;
    expect(s).toEqual({ hub: [0, 13.5, 2.6], axis: [0, 0, 1], period: SPIN_PERIOD.windmill });
    const mark = g.getAttribute(SPIN_ATTRIBUTE), p = g.getAttribute('position');
    let on = 0;
    for (let i = 0; i < p.count; i++) {
      const turns = mark.getX(i) > 0.5;
      if (turns) { on++; expect(p.getZ(i), 'a turning vertex is on the hub or the sails, in front of the tower').toBeGreaterThan(1.8); }
      // the sails' sweep (in front, up round the hub; the door stands out at the foot) all turns
      if (p.getZ(i) > 3 && against(g, i, s).r < 9 && p.getY(i) > 4) expect(turns, `a sail's vertex ${i}`).toBe(true);
    }
    expect(on).toBeGreaterThan(40);
  });

  it('the code-built Ferris wheel: the wheel turns about its hub, its legs never; a small windmill\'s sails turn', () => {
    const w = decorGeometry('ferris-wheel')!.body, s = w.userData.spin as Spin;
    expect(s.period).toBe(SPIN_PERIOD.ferrisWheel);
    const mark = w.getAttribute(SPIN_ATTRIBUTE), p = w.getAttribute('position');
    for (let i = 0; i < p.count; i++) if (p.getY(i) < 1) expect(mark.getX(i), 'a leg\'s foot').toBe(0);
    let rim = 0;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 30 && mark.getX(i) > 0.5) rim++;
    expect(rim, 'the rim\'s top turns').toBeGreaterThan(10);
    const sm = decorGeometry('windmill-small')!.body;
    expect((sm.userData.spin as Spin).period).toBe(SPIN_PERIOD.smallWindmill);
    expect([...(sm.getAttribute(SPIN_ATTRIBUTE).array as Float32Array)].some((x) => x > 0.5)).toBe(true);
  });

  it('a ranch windpump\'s wheel turns, its tower and tail vane never; merged into the dressing, each copy turns about its own hub', () => {
    const g = decorGeometry('windpump')!.body, s = g.userData.spin as Spin;
    expect(s.period).toBe(SPIN_PERIOD.windpump);
    const mark = g.getAttribute(SPIN_ATTRIBUTE), p = g.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      // the tower (below the head) and the tail vane (behind it) stand still
      if (p.getY(i) < 8 || p.getZ(i) < -0.5) expect(mark.getX(i), `vertex ${i}`).toBe(0);
    }
    expect([...(mark.array as Float32Array)].filter((x) => x > 0.5).length).toBeGreaterThan(100);
    // two copies merged, one turned a quarter round and moved: each listed with its own hub and axis
    const mats = new Float32Array(32);
    new Matrix4().makeTranslation(10, 0, 5).toArray(mats, 0);
    new Matrix4().makeRotationY(Math.PI / 2).setPosition(-20, 1, 0).toArray(mats, 16);
    const merged = mergeInstances([{ geometry: g, matrices: mats, count: 2 }])!;
    const spins = merged.userData.spins as Spin[];
    expect(spins.length).toBe(2);
    expect(spins[0].hub[0]).toBeCloseTo(10, 6);
    expect(spins[0].hub[2]).toBeCloseTo(5.7, 6);
    expect(spins[1].hub[0]).toBeCloseTo(-20 + 0.7, 6); // +Z turned a quarter round is +X
    expect(spins[1].axis[0]).toBeCloseTo(1, 6);
    const k = merged.getAttribute(SPIN_INDEX);
    const n = p.count, ks = new Set<number>();
    for (let i = 0; i < k.count; i++) ks.add(k.getX(i));
    expect([...ks].sort()).toEqual([0, 1, 2]);
    for (let i = 0; i < n; i++) { expect(k.getX(i) > 0).toBe(mark.getX(i) > 0.5); expect(k.getX(n + i) > 0).toBe(mark.getX(i) > 0.5); }
    // a merged mesh's material turns them, its shadow with it
    const mesh = new Mesh(merged, new MeshStandardMaterial());
    mesh.castShadow = true;
    const set = turning(mesh)!;
    expect(set).toBeTypeOf('function');
    expect(mesh.customDepthMaterial).toBeDefined();
    set(SPIN_PERIOD.windpump / 2);
    expect(((mesh.material as Material).userData.spin as { uSpinAngle: { value: number } }).uSpinAngle.value).toBeCloseTo(Math.PI, 6);
    // nothing turning: nothing listed
    expect(mergeInstances([{ geometry: decorGeometry('house')!.body, matrices: mats, count: 2 }])!.userData.spins).toBeUndefined();
  });

  it('a spin found in a file\'s frame is carried through its fit: turned, scaled and moved as its vertices are', () => {
    const find: SpinFind = { hub: [0.18, 0.16, -0.02], axis: [0.9959, 0.0167, 0.0889], period: 7, radius: 0.4, depth: [0.05, 0.05] };
    const yaw = 1.2, scale = 23.5, shift = new Vector3(3, -1, 7);
    const s = placedSpin(find, yaw, scale, shift);
    // the same point through three's own rotateY, scale and translate
    const g = new BufferGeometry().setAttribute('position', new BufferAttribute(new Float32Array([...find.hub, ...find.hub.map((v, k) => v + find.axis[k])]), 3));
    g.rotateY(yaw); g.scale(scale, scale, scale); g.translate(shift.x, shift.y, shift.z);
    const p = g.getAttribute('position');
    expect(Math.hypot(p.getX(0) - s.hub[0], p.getY(0) - s.hub[1], p.getZ(0) - s.hub[2])).toBeLessThan(1e-4);
    const dir = new Vector3(p.getX(1) - p.getX(0), p.getY(1) - p.getY(0), p.getZ(1) - p.getZ(0)).normalize();
    expect(dir.distanceTo(new Vector3(...s.axis))).toBeLessThan(1e-6);
  });

  it('the angle goes once round each period, wrapped (a long race keeps its precision)', () => {
    expect(spinAngle(0, 7)).toBe(0);
    expect(spinAngle(3.5, 7)).toBeCloseTo(Math.PI, 9);
    expect(spinAngle(7 * 1000 + 1.75, 7)).toBeCloseTo(Math.PI / 2, 6);
    expect(spinAngle(90, 60)).toBeCloseTo(Math.PI, 9);
  });
});

describe('the model files', () => {
  beforeAll(async () => { await adoptPropFiles(['windmill', 'windmill-small', 'ferris-wheel']); }, 60_000);

  it('the windmill\'s sails and hub turn whole, out to their tips, the tower and its cap never; no triangle spans the two', () => {
    const g = PROP_MODELS.get('windmill')!.geometry, s = g.userData.spin as Spin;
    expect(s.period).toBe(SPIN_PERIOD.windmill);
    const t = triangles(g);
    expect(t.mixed).toBe(0);
    // about a third of the model is its sails
    expect(t.turn / (t.turn + t.still)).toBeGreaterThan(0.25);
    expect(t.turn / (t.turn + t.still)).toBeLessThan(0.45);
    const mark = g.getAttribute(SPIN_ATTRIBUTE), p = g.getAttribute('position');
    g.computeBoundingBox();
    const b = g.boundingBox!;
    let tips = 0;
    for (let i = 0; i < p.count; i++) {
      const q = against(g, i, s), on = mark.getX(i) > 0.5;
      // nothing in the tower's lower half (under the sails' sweep), nothing behind the rotor's plane by more than its depth
      if (p.getY(i) < s.hub[1] - q.r - 1 || q.along < -4) expect(on, `vertex ${i}`).toBe(false);
      if (on && q.r > (b.max.y - s.hub[1]) * 0.9) tips++;
    }
    expect(tips, 'the sails\' tips turn with them').toBeGreaterThan(20);
  });

  it('the Ferris wheel turns, its legs, its booth and its pier never', () => {
    const g = PROP_MODELS.get('ferris-wheel')!.geometry, s = g.userData.spin as Spin;
    expect(s.period).toBe(SPIN_PERIOD.ferrisWheel);
    expect(triangles(g).mixed).toBe(0);
    const mark = g.getAttribute(SPIN_ATTRIBUTE), p = g.getAttribute('position');
    g.computeBoundingBox();
    const b = g.boundingBox!, H = b.max.y - b.min.y;
    let rimTop = 0;
    for (let i = 0; i < p.count; i++) {
      const on = mark.getX(i) > 0.5;
      // the feet and the booth stand low, under the wheel's bottom (a fifth of the way up)
      if (p.getY(i) < b.min.y + H * 0.12) expect(on, `a foot or the booth ${i}`).toBe(false);
      if (on && p.getY(i) > b.max.y - H * 0.1) rimTop++;
    }
    expect(rimTop, 'the rim\'s top turns').toBeGreaterThan(100);
  });

  it('the small windmill\'s sails turn, its tower never; no triangle spans the two', () => {
    const g = PROP_MODELS.get('windmill-small')!.geometry;
    const t = triangles(g);
    expect(t.mixed).toBe(0);
    expect(t.turn).toBeGreaterThan(200);
  });
});

describe('in the scene', () => {
  const build = (json: unknown) => { const def = json as TrackDefinition; return buildTrackScene(buildTrack(def), trackAssets(def.biome)); };

  it.each([['meadow-run', meadow, 'windmill', SPIN_PERIOD.windmill], ['boardwalk-nights', boardwalk, 'ferris-wheel', SPIN_PERIOD.ferrisWheel]] as const)('%s: its landmark turns on the scene\'s clock, its shadow with it', (_id, json, name, period) => {
    const scene = build(json);
    const m = scene.group.getObjectByName(`landmark-${name}`) as Mesh;
    expect(m).toBeDefined();
    const u = (m.material as Material).userData.spin as { uSpinAngle: { value: number } };
    expect(u).toBeDefined();
    expect(m.customDepthMaterial?.userData).toBeDefined();
    scene.update(period / 4);
    expect(u.uSpinAngle.value).toBeCloseTo(Math.PI / 2, 6);
    scene.update(period * 3 + period / 2);
    expect(u.uSpinAngle.value).toBeCloseTo(Math.PI, 6);
    // the shader turns only the marked vertices, about the placed hub (its uniforms as the material has them)
    const key = (m.material as Material).customProgramCacheKey();
    expect(key).toContain('spin');
    scene.dispose();
  });

  it('meadow-run: the small windmills turn too, and nothing that does not turn is patched', () => {
    const scene = build(meadow);
    const small = scene.group.getObjectByName('decor:windmill-small') as Mesh | undefined;
    expect(small).toBeDefined();
    expect((small!.material as Material).userData.spin).toBeDefined();
    let patched = 0;
    // (the merged dressing's ranch windpumps turn too: counted apart)
    scene.group.traverse((o) => { const mm = (o as Mesh).material as Material | undefined; if (mm && !Array.isArray(mm) && mm.userData?.spin && !/^dressing:/.test(o.name)) patched++; });
    // the landmark and the small windmills' instancer, and nothing else
    expect(patched).toBe(2);
    scene.dispose();
  });

  it('mesa-rush: the ranch windpumps in its dressing turn, the near ones\' shadows with them', () => {
    const scene = build(canyon);
    let turningMeshes = 0, shadowed = 0;
    scene.group.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh || !/^dressing:/.test(m.name) || !m.geometry.userData.spins) return;
      turningMeshes++;
      expect(((m.material as Material).userData.spin as object | undefined)).toBeDefined();
      if (m.castShadow) { expect(m.customDepthMaterial).toBeDefined(); shadowed++; }
    });
    expect(turningMeshes).toBeGreaterThan(0);
    expect(shadowed).toBeGreaterThan(0);
    scene.dispose();
  });

  it('a mesh with nothing that turns is left alone', () => {
    const m = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial());
    expect(turning(m)).toBeNull();
    expect(m.customDepthMaterial).toBeUndefined();
  });
});
