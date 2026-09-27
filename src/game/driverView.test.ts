// Every racer reads in every kart from the chase camera (the MKW gap review of 27 Sept 2026, item 5: "your
// racer barely shows ... in the Timber Wagon, Juniper sits behind a tall black seatback"; design §5, any
// racer in any kart). On the real part files: each of the eight racers in each of the eight signature
// karts (64 pairs, art-pipeline rigged.ts buildComboTemplate) and in the two shared bodies (bodies.ts),
// seated as the game seats them (the kart's trims and its booster), seen from the chase camera's own
// pose at rest and at top speed (camera.ts idealPose, fovFor). A grid of rays over the driver's head and
// shoulders on screen: the share of them that meet the driver before any part of the kart.
import { beforeAll, describe, expect, it } from 'vitest';
import { BufferAttribute, BufferGeometry, DoubleSide, PerspectiveCamera, Raycaster, Vector2, Vector3, type Object3D, type SkinnedMesh } from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { bodyInto, SEATS } from '../art-pipeline/bodies.ts';
import { ModelBuilder } from '../art-pipeline/model.ts';
import { BOOSTER, buildComboTemplate, KART_BONES, makeRiggedDriver, seatDriver, shoulderHeight, type RiggedTemplate } from '../art-pipeline/rigged.ts';
import { riggedTemplate } from '../art-pipeline/__tests__/parts.ts';
import { CAM, fovFor, idealPose } from './camera.ts';

const IDS = ['juniper', 'pip', 'momo', 'nova', 'otto', 'sprocket', 'boulder', 'gus'] as const;
const T: Record<string, RiggedTemplate> = {};
beforeAll(async () => { for (const id of IDS) T[id] = await riggedTemplate(id); }, 300_000);

/** The driver's head (its hat, ears and antennae too) and shoulders (the neck, shoulders, upper back and upper arms), by each vertex's main bone. */
const HEAD = /^(Head|head_end|headfront|HeadTop_End)$/;
const SHOULDERS = /^(neck|LeftShoulder|RightShoulder|Spine02|LeftArm|RightArm)$/;
const bvh = (tris: number[]): MeshBVH => { const g = new BufferGeometry(); g.setAttribute('position', new BufferAttribute(new Float32Array(tris), 3)); return new MeshBVH(g); };

/**
 * The share of the head and of the shoulders the chase camera sees (the lower at rest or at top speed):
 * rays through a 48 × 48 grid over their box on screen, each counted for the part it meets first, and
 * seen when no part of the kart (its body and wheels as posed, and `extra`, a shared body) comes first.
 */
function seen(root: Object3D, extra?: BufferGeometry): { head: number; shoulders: number } {
  const m = root.getObjectByName('rigged') as SkinnedMesh;
  root.updateMatrixWorld(true);
  const n = KART_BONES.length, names = m.skeleton.bones.map((b) => b.name);
  const g = m.geometry, P = g.getAttribute('position'), J = g.getAttribute('skinIndex'), W = g.getAttribute('skinWeight'), idx = g.index!;
  const pos = new Float32Array(P.count * 3), part = new Int8Array(P.count); // 0 the kart, 1 head, 2 shoulders, 3 the rest of the driver
  const v = new Vector3(), lo = new Vector3(Infinity, Infinity, Infinity), hi = new Vector3(-Infinity, -Infinity, -Infinity);
  for (let i = 0; i < P.count; i++) {
    m.getVertexPosition(i, v).applyMatrix4(m.matrixWorld);
    pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
    let best = 0, bone = 0;
    for (let k = 0; k < 4; k++) { const w = W.getComponent(i, k); if (w > best) { best = w; bone = J.getComponent(i, k); } }
    part[i] = bone < n ? 0 : HEAD.test(names[bone]) ? 1 : SHOULDERS.test(names[bone]) ? 2 : 3;
    if (part[i] === 1 || part[i] === 2) { lo.min(v); hi.max(v); }
  }
  const soup: number[][] = [[], [], [], []];
  for (let i = 0; i < idx.count; i += 3) {
    const a = idx.getX(i), b = idx.getX(i + 1), c = idx.getX(i + 2);
    const k = part[a] === part[b] || part[a] === part[c] ? part[a] : part[b];
    for (const q of [a, b, c]) soup[k].push(pos[q * 3], pos[q * 3 + 1], pos[q * 3 + 2]);
  }
  if (extra) {
    const ep = extra.getAttribute('position'), ei = extra.index, count = ei ? ei.count : ep.count;
    for (let i = 0; i < count; i++) { const q = ei ? ei.getX(i) : i; soup[0].push(ep.getX(q), ep.getY(q), ep.getZ(q)); }
  }
  const kart = bvh(soup[0]), head = bvh(soup[1]), shoulders = bvh(soup[2]);
  let H = 1, S = 1;
  const cam = new PerspectiveCamera(CAM.fov, 16 / 9, 0.3, 100), ray = new Raycaster(), nd = new Vector2(), N = 48;
  for (const speed of [0, CAM.topSpeed]) {
    const pose = idealPose([0, 0, 0], 0, speed, false);
    cam.fov = fovFor(speed); cam.updateProjectionMatrix();
    cam.position.set(...pose.position); cam.lookAt(new Vector3(...pose.target)); cam.updateMatrixWorld(true);
    let x0 = 1, x1 = -1, y0 = 1, y1 = -1;
    for (const x of [lo.x, hi.x]) for (const y of [lo.y, hi.y]) for (const z of [lo.z, hi.z]) {
      const q = v.set(x, y, z).project(cam);
      x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y);
    }
    let hs = 0, ha = 0, ss = 0, sa = 0;
    for (let ix = 0; ix < N; ix++) for (let iy = 0; iy < N; iy++) {
      ray.setFromCamera(nd.set(x0 + ((x1 - x0) * (ix + 0.5)) / N, y0 + ((y1 - y0) * (iy + 0.5)) / N), cam);
      const th = head.raycastFirst(ray.ray, DoubleSide, 0, 100)?.distance ?? Infinity;
      const ts = shoulders.raycastFirst(ray.ray, DoubleSide, 0, 100)?.distance ?? Infinity;
      if (th === Infinity && ts === Infinity) continue;
      const tk = kart.raycastFirst(ray.ray, DoubleSide, 0, 100)?.distance ?? Infinity;
      if (th <= ts) { ha++; if (tk > th) hs++; } else { sa++; if (tk > ts) ss++; }
    }
    H = Math.min(H, hs / Math.max(1, ha)); S = Math.min(S, ss / Math.max(1, sa));
  }
  return { head: H, shoulders: S };
}

/**
 * The one pair short of it, and by how much: Gus's tall chef's hat crosses the top of the Scrap Buggy's
 * roll cage, lifted to clear every other racer's head (manifest.json momo's trim); his face shows under it.
 */
const HAT_UNDER_CAGE = { pair: 'gus in momo', head: 0.5 };

describe('every racer\'s head and shoulders show from the chase camera, in every kart', () => {
  it('each racer in each signature kart (64 pairs): the head 95% seen, the shoulders 75%', () => {
    const short: string[] = [];
    for (const k of IDS) for (const d of IDS) {
      const t = k === d ? T[k] : buildComboTemplate(T[k], T[d]);
      const r = seen(t.root), name = `${d} in ${k}`;
      const head = name === HAT_UNDER_CAGE.pair ? HAT_UNDER_CAGE.head : 0.95;
      if (r.head < head || r.shoulders < 0.75) short.push(`${name}: head ${(r.head * 100).toFixed(0)}%, shoulders ${(r.shoulders * 100).toFixed(0)}%`);
    }
    expect(short).toEqual([]);
  });

  it('each racer in the Classic and the Buggy: the same', () => {
    const short: string[] = [];
    for (const b of ['classic', 'buggy'] as const) {
      const body = bodyInto(new ModelBuilder(), b, '#e63946', '#ffffff').build();
      for (const d of IDS) {
        const r = seen(makeRiggedDriver(T[d], SEATS[b], undefined), body);
        if (r.head < 0.95 || r.shoulders < 0.75) short.push(`${d} in ${b}: head ${(r.head * 100).toFixed(0)}%, shoulders ${(r.shoulders * 100).toFixed(0)}%`);
      }
      body.dispose();
    }
    expect(short).toEqual([]);
  });

  it('the trims do the most of it; the booster brings the smaller racers up the rest of the way', () => {
    // the Comet Pod's own racer at its seat with no booster: the pod's trimmed hump alone shows her
    const nova = T.nova;
    seatDriver(nova.root, { ...nova.seat, shoulders: undefined }, nova.pose, nova.rest);
    expect(seen(nova.root).shoulders).toBeGreaterThan(0.75);
    seatDriver(nova.root, nova.seat, nova.pose, nova.rest); // back as built
    // Pip in the Snack Truck: without the booster the truck's back hides his shoulders; with it they show
    const combo = buildComboTemplate(T.gus, T.pip);
    expect(seen(combo.root).shoulders).toBeGreaterThanOrEqual(0.75);
    seatDriver(combo.root, { ...combo.seat, shoulders: undefined }, combo.pose, combo.rest);
    expect(seen(combo.root).shoulders).toBeLessThan(0.75);
  });

  it('the booster lifts only a driver whose shoulders sit under the kart\'s line, to it, never more than BOOSTER', () => {
    let lifted = 0;
    for (const k of IDS) {
      const line = T[k].seat.shoulders;
      for (const d of IDS) {
        const t = k === d ? T[k] : buildComboTemplate(T[k], T[d]);
        const r = seatDriver(t.root, t.seat, t.pose, t.rest), name = `${d} in ${k}`;
        expect(r.lift, name).toBeGreaterThanOrEqual(0);
        expect(r.lift, name).toBeLessThanOrEqual(BOOSTER + 1e-9);
        if (line === undefined) { expect(r.lift, name).toBe(0); continue; }
        if (r.lift > 0) lifted++;
        // up to the line (the IK leans the spine a hair differently from the higher seat), or as high as the booster goes
        if (r.lift < BOOSTER - 1e-9) expect(shoulderHeight(t.root), name).toBeGreaterThan(line - 0.03);
      }
    }
    expect(lifted).toBeGreaterThan(5); // the small racers in the big karts
  });
});
