// Racers built from parts (Adam, 25 Sept 2026: "the wheels don't even spin", "the characters don't move
// like a 3D character"): a skinned driver in A-pose with a 24-bone humanoid skeleton (Meshy auto-rig),
// the kart body with empty wheel arches (Tripo) and one wheel used four times, listed with their fitting
// in public/models/racers/manifest.json. A racer listed there uses these parts; the rest keep their
// fused model file (glb.ts) until theirs come.
//
// At load the three are fitted into the kart's frame (+Z forward, +Y up, +X the sim's right: the
// driver's own left, screen-left seen from behind) and merged into ONE SkinnedMesh with one material:
// the body on a `body` bone (it rides the springs), each wheel on a `wheel` bone under a `hub` bone
// (it rolls, the fronts steer, each bobs on its spring), the steering wheel cut out of the body onto a
// `steer` bone (it turns with the stick), and the driver on its own 24 bones under the body. The three
// textures share one canvas atlas (plus a swatch per attachment color), so a kart is one draw call and
// one shadow draw, as a fused model was. The driver is seated by IK on points of the KART (its seat,
// grips and foot rests), so any driver can sit in any kart (seatDriver). Each kart is a SkeletonUtils
// clone: geometry and material shared, bones its own; RiggedKart puts the kart and driver animation on
// them each frame (kart-controller anim.ts and driverAnim.ts; the hands hold the turning wheel by
// two-bone IK).
import {
  Bone, BufferAttribute, BufferGeometry, CanvasTexture, ClampToEdgeWrapping, Color, CylinderGeometry, Euler, Group, LinearMipmapLinearFilter, Matrix4,
  MeshStandardMaterial, Quaternion, Skeleton, SkinnedMesh, Sphere, SRGBColorSpace, Vector3, type Material, type Mesh, type Object3D, type Texture,
} from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { KART_ANIM, type AnimPose } from '../kart-controller/anim.ts';
import { DRIVER_ANIM, type ArmPose, type DriverPose, type KartRig } from '../kart-controller/driverAnim.ts';
import type { V3 } from './model.ts';
import { isPbr, litWorld } from './look.ts';

// ---------------------------------------------------------------- the manifest
/** A small code-built part on a driver's bone (a beak, a feather): a tapered cone, root at `offset` from the bone (the kart's frame, the driver standing as fitted), pointing +Z turned by `rotation` (radians, XYZ). */
export interface Attachment { bone: string; shape: 'cone'; length: number; radiusRoot: number; radiusTip: number; color: string; offset: V3; rotation?: V3 }
/** The steering wheel in the body's fitted frame: its middle, its column's axis toward the driver, the rim's radius (to its tube's middle). */
export interface SteeringSpec { center: V3; axis: V3; radius: number }
/** Pipe mouths in the body's fitted frame and the way they point (vfx-juice flames burn from them). */
export interface ExhaustSpec { ports: V3[]; dir: V3 }
/**
 * Where a kart holds its driver, in its fitted frame (meters; +X the driver's left): the hip point
 * (`seat`), the hands' targets on the wheel or bars (`grips`, the left hand's first) and the feet's
 * (`feet`, the left's first). Any driver sits in any kart by IK on these (seatDriver).
 */
export interface SeatSpec { seat: V3; grips: readonly [V3, V3]; feet: readonly [V3, V3] }
export interface PartsSpec {
  /** fitted to `height` (m, standing); `seat` (its feet's origin) is used only when the body has no seat */
  driver: { url: string; height: number; seat: V3; attachments?: Attachment[] };
  /** turned `yaw` about Y to face +Z, `length` m nose to tail, its lowest point at `y` */
  body: { url: string; yaw: number; length: number; y: number; seat?: V3; grips?: [V3, V3]; feet?: [V3, V3]; steering?: SteeringSpec; exhaust?: ExhaustSpec };
  /** fitted to `radius`, one at each hub (the kart's frame); the ones at −X mirrored so their rims face out */
  wheel: { url: string; radius: number; hubs: V3[] };
}
export type PartsManifest = Record<string, PartsSpec>;

const isV3 = (v: unknown): v is V3 => Array.isArray(v) && v.length === 3 && v.every((x) => typeof x === 'number' && Number.isFinite(x));
const isPair = (v: unknown): boolean => Array.isArray(v) && v.length === 2 && v.every(isV3);
/** Whether a manifest entry names all three parts with their fitting (anything else is ignored: that racer keeps its old model). */
export function isPartsSpec(s: unknown): s is PartsSpec {
  const p = s as PartsSpec | null;
  return !!p && typeof p === 'object'
    && typeof p.driver?.url === 'string' && typeof p.driver.height === 'number' && isV3(p.driver.seat)
    && typeof p.body?.url === 'string' && typeof p.body.length === 'number' && typeof p.body.y === 'number'
    && (p.body.seat === undefined || isV3(p.body.seat)) && (p.body.grips === undefined || isPair(p.body.grips)) && (p.body.feet === undefined || isPair(p.body.feet))
    && typeof p.wheel?.url === 'string' && typeof p.wheel.radius === 'number' && Array.isArray(p.wheel.hubs) && p.wheel.hubs.length === 4 && p.wheel.hubs.every(isV3);
}

/** A body's seat, or one reckoned from the driver's old fixed placement (no seat: the driver sits where it stands, hands and feet by the old guesses). */
export function seatOf(spec: PartsSpec, hipsAt: V3): SeatSpec {
  const b = spec.body;
  const seat = b.seat ?? hipsAt;
  return {
    seat,
    grips: b.grips ?? [[0.15, seat[1] + 0.27, seat[2] + 0.4], [-0.15, seat[1] + 0.27, seat[2] + 0.4]],
    feet: b.feet ?? [[0.13, seat[1] - 0.29, seat[2] + 0.23], [-0.13, seat[1] - 0.29, seat[2] + 0.23]],
  };
}

// ---------------------------------------------------------------- the seated pose
/**
 * How a driver sits (seatDriver), the same for every kart: the spine leans `lean` forward (rad) and up
 * to `leanMax` when a grip is out of reach; the elbows bend toward `elbow` and the knees toward `knee`
 * (the left side's poles; the right mirrors x); the wrists sit `wrist` m from the grip back toward the
 * shoulder (a hand's length: the palm, not the wrist, holds the rim); `scale` multiplies the manifest's
 * height; `turns` are extra turns of bones about the kart's axes after the IK (degrees), for a racer
 * whose model wants them.
 */
export interface SeatedPose {
  lean: number;
  leanMax: number;
  elbow: V3;
  knee: V3;
  wrist: number;
  scale: number;
  turns: readonly (readonly [bone: string, axis: 'x' | 'y' | 'z', degrees: number])[];
}
export const SEATED: SeatedPose = Object.freeze({
  lean: 0.1,
  leanMax: 0.52,
  elbow: [1, -0.8, -0.35] as V3,
  knee: [0.4, 0.6, 1] as V3,
  wrist: 0.07,
  scale: 1,
  turns: Object.freeze([] as const),
});
/** Each racer's differences from SEATED (tuned on close-ups of the racer in their kart). */
export const RACER_POSES: Readonly<Record<string, Partial<SeatedPose>>> = Object.freeze({
  juniper: {},
  // his long beak would pass through the handlebar stem: the head tips up (25 Sept 2026 fit)
  pip: { turns: [['Head', 'x', -22]] },
});
export const poseFor = (racerId: string): SeatedPose => ({ ...SEATED, ...(RACER_POSES[racerId] ?? {}) });

// ---------------------------------------------------------------- the atlas
/**
 * The atlas the three textures share (flipY off, as glTF's): driver and body at 1024 side by side, the
 * wheel at 512 under the driver, and a row of 16 px color swatches for attachments. Rects [x, y, w, h]
 * in pixels from the top left.
 */
export const ATLAS = Object.freeze({
  w: 2048, h: 1536,
  driver: [0, 0, 1024, 1024] as const,
  body: [1024, 0, 1024, 1024] as const,
  wheel: [0, 1024, 512, 512] as const,
  swatch: [512, 1024, 16, 16] as const,
});
type Rect = readonly [number, number, number, number];
const swatchRect = (i: number): Rect => [ATLAS.swatch[0] + i * ATLAS.swatch[2], ATLAS.swatch[1], ATLAS.swatch[2], ATLAS.swatch[3]];

/** A part's UVs into its atlas rect (in place). */
export function toAtlas(uv: Float32Array, rect: Rect): void {
  const [x, y, w, h] = rect;
  for (let i = 0; i < uv.length / 2; i++) {
    uv[i * 2] = (x + uv[i * 2] * w) / ATLAS.w;
    uv[i * 2 + 1] = (y + uv[i * 2 + 1] * h) / ATLAS.h;
  }
}

// ---------------------------------------------------------------- the parts
/** The kart's own bones, parents first; the driver's 24 hang under `body`. */
export const KART_BONES = Object.freeze(['kart', 'body', 'steer', 'hubFL', 'wheelFL', 'hubFR', 'wheelFR', 'hubRL', 'wheelRL', 'hubRR', 'wheelRR'] as const);
const HUB_BONE = ['hubFL', 'hubFR', 'hubRL', 'hubRR'] as const;
/** Which hub a manifest hub is: front or rear by z, +X or −X by x. */
export function hubSlot(h: V3): number { return (h[2] >= 0 ? 0 : 2) + (h[0] >= 0 ? 0 : 1); }

/** A part baked into the kart's frame: float positions, normals and UVs, its indices, and per vertex up to four bones and weights. */
export interface Part { pos: Float32Array; nrm: Float32Array; uv: Float32Array; index: Uint32Array; joints: Uint16Array; weights: Float32Array }

/** A geometry as a part, every vertex on `bone`. */
export function partOf(g: BufferGeometry, bone: number): Part {
  const n = g.getAttribute('position').count;
  const read = (name: string, size: number) => {
    const a = g.getAttribute(name), out = new Float32Array(n * size);
    if (a) for (let i = 0; i < n; i++) for (let k = 0; k < size; k++) out[i * size + k] = a.getComponent(i, k);
    return out;
  };
  const index = g.index ? Uint32Array.from(g.index.array as ArrayLike<number>) : Uint32Array.from({ length: n }, (_, i) => i);
  const joints = new Uint16Array(n * 4), weights = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { joints[i * 4] = bone; weights[i * 4] = 1; }
  return { pos: read('position', 3), nrm: read('normal', 3), uv: read('uv', 2), index, joints, weights };
}

/** A mesh's geometry with `m` baked in (quantized attributes become floats); `flip` reverses the winding (a mirror). */
export function baked(mesh: Mesh, m: Matrix4, flip = false): BufferGeometry {
  const src = mesh.geometry, g = new BufferGeometry();
  for (const name of ['position', 'normal', 'uv']) {
    const a = src.getAttribute(name);
    if (!a) continue;
    const size = a.itemSize, out = new Float32Array(a.count * size);
    for (let i = 0; i < a.count; i++) for (let k = 0; k < size; k++) out[i * size + k] = a.getComponent(i, k);
    g.setAttribute(name, new BufferAttribute(out, size));
  }
  const idx = src.index ? Uint32Array.from(src.index.array as ArrayLike<number>) : Uint32Array.from({ length: src.getAttribute('position').count }, (_, i) => i);
  if (flip) for (let i = 0; i + 2 < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  g.setIndex(new BufferAttribute(idx, 1));
  g.applyMatrix4(m);
  return g;
}

const firstMesh = (o: Object3D): Mesh | undefined => { let m: Mesh | undefined; o.traverse((x) => { if (!m && (x as Mesh).isMesh) m = x as Mesh; }); return m; };

/** Box of an object's meshes (a skinned one as posed). */
function boxOf(o: Object3D): { min: Vector3; max: Vector3 } {
  const min = new Vector3(Infinity, Infinity, Infinity), max = new Vector3(-Infinity, -Infinity, -Infinity), v = new Vector3();
  o.updateMatrixWorld(true);
  o.traverse((x) => {
    const m = x as Mesh;
    if (!m.isMesh) return;
    const p = m.geometry.getAttribute('position');
    const sk = (m as SkinnedMesh).isSkinnedMesh ? (m as SkinnedMesh) : null;
    for (let i = 0; i < p.count; i++) {
      if (sk) sk.getVertexPosition(i, v); else v.fromBufferAttribute(p, i);
      v.applyMatrix4(m.matrixWorld);
      min.min(v); max.max(v);
    }
  });
  return { min, max };
}

/** The body's fitting: turned to face +Z, `length` long, centered on X and Z, its lowest point at `y`. Returns its mesh's matrix into the kart's frame. */
export function fitBody(scene: Object3D, spec: PartsSpec['body']): Matrix4 {
  const holder = new Group();
  holder.add(scene);
  scene.rotation.set(0, spec.yaw ?? 0, 0);
  scene.position.set(0, 0, 0);
  scene.scale.setScalar(1);
  const box = boxOf(holder);
  scene.scale.setScalar(spec.length / Math.max(1e-6, box.max.z - box.min.z));
  const b2 = boxOf(holder);
  scene.position.set(-(b2.min.x + b2.max.x) / 2, spec.y - b2.min.y, -(b2.min.z + b2.max.z) / 2);
  holder.updateMatrixWorld(true);
  return firstMesh(scene)!.matrixWorld.clone();
}

/** The wheel's fitting: `radius` (half its larger side across the axle), centered on its hub. Returns its mesh's matrix to a hub at the origin. */
export function fitWheel(scene: Object3D, radius: number): Matrix4 {
  const holder = new Group();
  holder.add(scene);
  const box = boxOf(holder);
  const k = (2 * radius) / Math.max(1e-6, box.max.y - box.min.y, box.max.z - box.min.z);
  return new Matrix4().makeScale(k, k, k)
    .multiply(new Matrix4().makeTranslation(-(box.min.x + box.max.x) / 2, -(box.min.y + box.max.y) / 2, -(box.min.z + box.max.z) / 2))
    .multiply(firstMesh(scene)!.matrixWorld);
}

/** The skinned driver as fitted: `height` tall, its Hips at `hips` (or its origin at `origin` when there is none). */
function fitDriver(scene: Object3D, height: number, hips: V3 | null, origin: V3): { mesh: SkinnedMesh; part: Part } {
  const root = new Group();
  root.add(scene);
  root.updateMatrixWorld(true);
  let mesh: SkinnedMesh | undefined;
  scene.traverse((o) => { if (!mesh && (o as SkinnedMesh).isSkinnedMesh) mesh = o as SkinnedMesh; });
  if (!mesh) throw new Error('driver has no skinned mesh');
  // the rest pose once, as three draws it; its height fits the driver, then it moves with the fit
  const part = restPart(mesh);
  let lo = Infinity, hi = -Infinity;
  for (let i = 1; i < part.pos.length; i += 3) { lo = Math.min(lo, part.pos[i]); hi = Math.max(hi, part.pos[i]); }
  const s = height / Math.max(1e-6, hi - lo);
  root.scale.setScalar(s);
  root.updateMatrixWorld(true);
  const h = mesh.skeleton.bones.find((b) => b.name === 'Hips');
  if (hips && h) {
    const at = new Vector3().setFromMatrixPosition(h.matrixWorld);
    root.position.set(hips[0] - at.x, hips[1] - at.y, hips[2] - at.z);
  } else root.position.set(origin[0], origin[1], origin[2]);
  root.updateMatrixWorld(true);
  const t = root.position;
  for (let i = 0; i < part.pos.length; i += 3) {
    part.pos[i] = part.pos[i] * s + t.x; part.pos[i + 1] = part.pos[i + 1] * s + t.y; part.pos[i + 2] = part.pos[i + 2] * s + t.z;
  }
  return { mesh, part };
}

/** A part's joints from the file's skeleton onto the new one (in place). */
function remapJoints(p: Part, map: readonly number[]): Part {
  for (let i = 0; i < p.joints.length; i++) p.joints[i] = map[p.joints[i]] ?? 0;
  return p;
}

/**
 * The driver's rest pose where it stands now (what three draws at rest: each bone's whole transform
 * from the file's bind space, blended by the weights), with the file's own joints. One pass of four
 * matrix blends a vertex (three's own per-vertex skinning multiplies four matrices each time).
 */
function restPart(mesh: SkinnedMesh): Part {
  const g = mesh.geometry, n = g.getAttribute('position').count;
  const P = g.getAttribute('position'), N = g.getAttribute('normal'), U = g.getAttribute('uv');
  const J = g.getAttribute('skinIndex'), W = g.getAttribute('skinWeight');
  const K = mesh.skeleton.bones.map((b, i) => new Matrix4().multiplyMatrices(mesh.matrixWorld, mesh.bindMatrixInverse)
    .multiply(new Matrix4().multiplyMatrices(b.matrixWorld, mesh.skeleton.boneInverses[i])).multiply(mesh.bindMatrix).elements);
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  const joints = new Uint16Array(n * 4), weights = new Float32Array(n * 4);
  const m = new Float32Array(16);
  for (let i = 0; i < n; i++) {
    m.fill(0);
    let sum = 0;
    for (let k = 0; k < 4; k++) {
      const w = W.getComponent(i, k), j = J.getComponent(i, k);
      joints[i * 4 + k] = j;
      weights[i * 4 + k] = w;
      sum += w;
      if (w === 0) continue;
      const e = K[j];
      for (let q = 0; q < 16; q++) m[q] += e[q] * w;
    }
    if (sum > 0 && Math.abs(sum - 1) > 1e-6) { for (let q = 0; q < 16; q++) m[q] /= sum; for (let k = 0; k < 4; k++) weights[i * 4 + k] /= sum; }
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    pos[i * 3] = m[0] * x + m[4] * y + m[8] * z + m[12];
    pos[i * 3 + 1] = m[1] * x + m[5] * y + m[9] * z + m[13];
    pos[i * 3 + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
    if (N) {
      const a = N.getX(i), b = N.getY(i), c = N.getZ(i);
      const nx = m[0] * a + m[4] * b + m[8] * c, ny = m[1] * a + m[5] * b + m[9] * c, nz = m[2] * a + m[6] * b + m[10] * c;
      const l = Math.hypot(nx, ny, nz) || 1;
      nrm[i * 3] = nx / l; nrm[i * 3 + 1] = ny / l; nrm[i * 3 + 2] = nz / l;
    }
    if (U) { uv[i * 2] = U.getX(i); uv[i * 2 + 1] = U.getY(i); }
  }
  const index = g.index ? Uint32Array.from(g.index.array as ArrayLike<number>) : Uint32Array.from({ length: n }, (_, i) => i);
  return { pos, nrm, uv, index, joints, weights };
}

/** An attachment's cone in the kart's frame, root at `at` + its offset, on bone `bone`, its UVs on swatch `swatch`. */
function attachmentPart(a: Attachment, at: Vector3, bone: number, swatch: number): Part {
  const g = new CylinderGeometry(a.radiusTip, a.radiusRoot, a.length, 10, 1);
  g.translate(0, a.length / 2, 0).rotateX(Math.PI / 2); // root at the origin, tip along +Z
  const r = a.rotation ?? [0, 0, 0];
  g.applyMatrix4(new Matrix4().makeRotationFromEuler(new Euler(r[0], r[1], r[2])));
  g.translate(at.x + a.offset[0], at.y + a.offset[1], at.z + a.offset[2]);
  const p = partOf(g, bone);
  const [x, y, w, h] = swatchRect(swatch);
  for (let i = 0; i < p.uv.length / 2; i++) { p.uv[i * 2] = (x + w / 2) / ATLAS.w; p.uv[i * 2 + 1] = (y + h / 2) / ATLAS.h; }
  g.dispose();
  return p;
}

/** Merge parts into one skinned geometry. */
export function mergeParts(parts: readonly Part[]): BufferGeometry {
  let nv = 0, ni = 0;
  for (const p of parts) { nv += p.pos.length / 3; ni += p.index.length; }
  const pos = new Float32Array(nv * 3), nrm = new Float32Array(nv * 3), uv = new Float32Array(nv * 2);
  const joints = new Uint16Array(nv * 4), weights = new Float32Array(nv * 4);
  const index = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  let v = 0, k = 0;
  for (const p of parts) {
    pos.set(p.pos, v * 3); nrm.set(p.nrm, v * 3); uv.set(p.uv, v * 2); joints.set(p.joints, v * 4); weights.set(p.weights, v * 4);
    for (let i = 0; i < p.index.length; i++) index[k + i] = p.index[i] + v;
    v += p.pos.length / 3; k += p.index.length;
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('normal', new BufferAttribute(nrm, 3));
  g.setAttribute('uv', new BufferAttribute(uv, 2));
  g.setAttribute('skinIndex', new BufferAttribute(joints, 4));
  g.setAttribute('skinWeight', new BufferAttribute(weights, 4));
  g.setIndex(new BufferAttribute(index, 1));
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

/** How the steering wheel is cut out of the body: vertices within `slab` m of its plane and `rim` m past its rim's middle (and dark, where the texture can be read). */
export const STEER_CUT = Object.freeze({ slab: 0.04, rim: 0.045, dark: 90 });

/** Put the body's steering wheel on bone `bone` (in place): its disc, and its dark color where `dark` can tell. Returns how many vertices moved. */
export function cutSteering(p: Part, st: SteeringSpec, bone: number, dark: ((u: number, v: number) => boolean) | null): number {
  const c = new Vector3(...st.center), n = new Vector3(...st.axis).normalize(), v = new Vector3();
  let moved = 0;
  for (let i = 0; i < p.pos.length / 3; i++) {
    v.set(p.pos[i * 3], p.pos[i * 3 + 1], p.pos[i * 3 + 2]).sub(c);
    const along = v.dot(n);
    const across = Math.sqrt(Math.max(0, v.lengthSq() - along * along));
    if (Math.abs(along) > STEER_CUT.slab || across > st.radius + STEER_CUT.rim) continue;
    if (dark && !dark(p.uv[i * 2], p.uv[i * 2 + 1])) continue;
    p.joints[i * 4] = bone;
    moved++;
  }
  return moved;
}

// ---------------------------------------------------------------- seating by IK
const AXES = Object.freeze({ x: new Vector3(1, 0, 0), y: new Vector3(0, 1, 0), z: new Vector3(0, 0, 1) });

/** Turn bone `b` by `rad` about the kart-frame axis `axis` (its parent's world turn taken out): q_local' = (Pw⁻¹·R·Pw)·q_local. */
export function turnAbout(b: Object3D, axis: Vector3, rad: number): void {
  b.parent!.updateWorldMatrix(true, false);
  const pw = new Quaternion();
  b.parent!.getWorldQuaternion(pw);
  const r = new Quaternion().setFromAxisAngle(axis, rad);
  b.quaternion.premultiply(pw.clone().invert().multiply(r).multiply(pw));
  b.updateMatrixWorld(true);
}

/** Turn `b` so the direction from it to `child` (world) lies along `dir`, by the smallest turn. */
function aimAt(b: Object3D, child: Object3D, dir: Vector3): void {
  const from = new Vector3().setFromMatrixPosition(child.matrixWorld).sub(new Vector3().setFromMatrixPosition(b.matrixWorld)).normalize();
  const r = new Quaternion().setFromUnitVectors(from, dir.clone().normalize());
  const pw = new Quaternion();
  b.parent!.getWorldQuaternion(pw);
  const bw = new Quaternion();
  b.getWorldQuaternion(bw);
  b.quaternion.copy(pw.invert().multiply(r.multiply(bw)));
  b.updateMatrixWorld(true);
}

/** Two-bone IK in the world: `a` (shoulder, hip) → `b` (elbow, knee) → `c` (wrist, ankle) reaches for `target`, the middle joint toward `pole`. Straight when out of reach. */
export function twoBoneIk(a: Object3D, b: Object3D, c: Object3D, target: Vector3, pole: Vector3): { reach: number; dist: number } {
  a.updateWorldMatrix(true, true);
  const S = new Vector3().setFromMatrixPosition(a.matrixWorld), E0 = new Vector3().setFromMatrixPosition(b.matrixWorld), W0 = new Vector3().setFromMatrixPosition(c.matrixWorld);
  const l1 = E0.distanceTo(S), l2 = W0.distanceTo(E0);
  const to = target.clone().sub(S), raw = to.length();
  const dist = Math.max(Math.abs(l1 - l2) + 1e-4, Math.min(l1 + l2 - 1e-4, raw));
  const d = to.normalize();
  const along = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  const p = pole.clone().addScaledVector(d, -pole.dot(d)).normalize();
  const E = S.clone().addScaledVector(d, along).addScaledVector(p, h);
  aimAt(a, b, E.clone().sub(S));
  aimAt(b, c, S.clone().addScaledVector(d, dist).sub(E));
  return { reach: l1 + l2, dist: raw };
}

/**
 * Seat a driver's bones (the fitted A-pose rest, under `root`, in the kart's frame) by IK on a kart's
 * points: the Hips onto `seat.seat`, the spine leaned `pose.lean` forward (more, up to `pose.leanMax`,
 * while a hand cannot reach its grip), each arm to its grip (the wrist a hand's length short of it,
 * elbows out and down) and each leg to its foot rest (knees up and out), then the pose's extra turns.
 * The bones are reset to `rest` first (names → local place and turn), so a driver can be seated again
 * in another kart.
 */
export function seatDriver(root: Object3D, seat: SeatSpec, pose: SeatedPose, rest: ReadonlyMap<string, { p: Vector3; q: Quaternion }>): { lean: number; reach: number[] } {
  const bone = (n: string) => root.getObjectByName(n) ?? null;
  for (const [name, r] of rest) { const b = bone(name); if (b) { b.position.copy(r.p); b.quaternion.copy(r.q); } }
  root.updateMatrixWorld(true);
  const hips = bone('Hips');
  if (!hips) return { lean: 0, reach: [] };
  hips.position.copy(new Vector3(...seat.seat).applyMatrix4(new Matrix4().copy(hips.parent!.matrixWorld).invert()));
  root.updateMatrixWorld(true);
  const spine = ['Spine02', 'Spine01', 'Spine'].map(bone).filter((b): b is Object3D => !!b);
  const arms = [['LeftArm', 'LeftForeArm', 'LeftHand', 1], ['RightArm', 'RightForeArm', 'RightHand', -1]] as const;
  const wristFor = (i: number) => {
    // the wrist a hand's length short of the grip, back along the line from the shoulder
    const s = new Vector3().setFromMatrixPosition(bone(arms[i][0])!.matrixWorld), g = new Vector3(...seat.grips[i]);
    return g.clone().addScaledVector(g.clone().sub(s).normalize(), -pose.wrist);
  };
  // lean until both hands reach (or the cap): each try from the spine's rest
  const spineRest = spine.map((b) => b.quaternion.clone());
  let lean = pose.lean;
  for (let tries = 0; tries < 12; tries++) {
    spine.forEach((b, i) => { b.quaternion.copy(spineRest[i]); });
    root.updateMatrixWorld(true);
    for (const b of spine) turnAbout(b, AXES.x, lean / spine.length);
    let ok = true;
    for (let i = 0; i < 2; i++) {
      const a = bone(arms[i][0]), f = bone(arms[i][1]), h = bone(arms[i][2]);
      if (!a || !f || !h) continue;
      const S = new Vector3().setFromMatrixPosition(a.matrixWorld);
      const reach = new Vector3().setFromMatrixPosition(f.matrixWorld).distanceTo(S) + new Vector3().setFromMatrixPosition(h.matrixWorld).distanceTo(new Vector3().setFromMatrixPosition(f.matrixWorld));
      if (wristFor(i).distanceTo(S) > reach * 0.97) ok = false;
    }
    if (ok || lean >= pose.leanMax) break;
    lean = Math.min(pose.leanMax, lean + 0.05);
  }
  const reach: number[] = [];
  for (let i = 0; i < 2; i++) {
    const a = bone(arms[i][0]), f = bone(arms[i][1]), h = bone(arms[i][2]);
    if (!a || !f || !h) continue;
    const r = twoBoneIk(a, f, h, wristFor(i), new Vector3(pose.elbow[0] * arms[i][3], pose.elbow[1], pose.elbow[2]));
    reach.push(r.dist / r.reach);
  }
  const legs = [['LeftUpLeg', 'LeftLeg', 'LeftFoot', 1], ['RightUpLeg', 'RightLeg', 'RightFoot', -1]] as const;
  for (let i = 0; i < 2; i++) {
    const a = bone(legs[i][0]), k = bone(legs[i][1]), f = bone(legs[i][2]);
    if (!a || !k || !f) continue;
    twoBoneIk(a, k, f, new Vector3(...seat.feet[i]), new Vector3(pose.knee[0] * legs[i][3], pose.knee[1], pose.knee[2]));
  }
  for (const t of pose.turns) { const b = bone(t[0]); if (b) turnAbout(b, AXES[t[1]], (t[2] * Math.PI) / 180); }
  root.updateMatrixWorld(true);
  return { lean, reach };
}

// ---------------------------------------------------------------- the template
/** The three parts as loaded (glTF scenes). */
export interface LoadedParts { driver: Object3D; body: Object3D; wheel: Object3D }

/** A racer's rigged kart, built once: clone `root` per kart (makeRigged), `driverOnly` for a shared body (makeRiggedDriver). */
export interface RiggedTemplate {
  racerId: string;
  /** the bones and the one skinned mesh: body, wheels, driver; seated in its own kart */
  root: Group;
  /** the driver alone on the same bones (seated again for a shared body) */
  driverOnly: Group;
  material: MeshStandardMaterial;
  spec: PartsSpec;
  pose: SeatedPose;
  /** its own kart's seat (the manifest's, or reckoned) */
  seat: SeatSpec;
  /** the driver's bones at rest (the fitted A-pose, the Hips on the seat): local place and turn by name */
  rest: ReadonlyMap<string, { p: Vector3; q: Quaternion }>;
  /** triangles in the full mesh */
  triangles: number;
}

/**
 * Build a racer's rigged template from its three loaded parts: fitted, merged, skinned, seated.
 * `atlas` is the shared texture (null: no canvas, as in tests) and `dark(u, v)` says whether the body's
 * texture is dark there (the steering wheel is cut out of the body by its disc and its dark color; null:
 * by the disc alone).
 */
export function buildRiggedTemplate(racerId: string, spec: PartsSpec, parts: LoadedParts, atlas: Texture | null, dark: ((u: number, v: number) => boolean) | null = null): RiggedTemplate {
  const pose = poseFor(racerId);
  // --- the bones: the kart's own, then the driver's under `body`, all at unit scale, in the kart's frame
  const bones: Bone[] = [];
  const byName = new Map<string, Bone>();
  const add = (name: string, parent: Bone | null, at: Vector3, q = new Quaternion()) => {
    const b = new Bone();
    b.name = name;
    if (parent) {
      parent.add(b);
      // local = parent⁻¹ · world (parents are unit scale)
      const w = new Matrix4().compose(at, q, new Vector3(1, 1, 1));
      new Matrix4().copy(parent.matrixWorld).invert().multiply(w).decompose(b.position, b.quaternion, new Vector3());
    } else { b.position.copy(at); b.quaternion.copy(q); }
    b.updateMatrixWorld(true);
    bones.push(b);
    byName.set(name, b);
    return b;
  };
  const kart = add('kart', null, new Vector3());
  const body = add('body', kart, new Vector3());
  const st = spec.body.steering;
  add('steer', body, st ? new Vector3(...st.center) : new Vector3(0, 0.75, 0.25));
  const hubAt: V3[] = [[0.5, spec.wheel.radius, 0.6], [-0.5, spec.wheel.radius, 0.6], [0.5, spec.wheel.radius, -0.6], [-0.5, spec.wheel.radius, -0.6]];
  for (const h of spec.wheel.hubs) hubAt[hubSlot(h)] = h;
  HUB_BONE.forEach((name, i) => {
    const hub = add(name, kart, new Vector3(...hubAt[i]));
    add(name.replace('hub', 'wheel'), hub, new Vector3(...hubAt[i]));
  });
  // the driver: fitted, its Hips on the seat, its bones rebuilt in the kart's frame at unit scale
  const { mesh: dmesh, part: dp } = fitDriver(parts.driver, spec.driver.height * pose.scale, spec.body.seat ?? null, spec.driver.seat);
  const src = dmesh.skeleton.bones;
  const wp = new Vector3(), wq = new Quaternion(), ws = new Vector3();
  for (const b of [...src].sort((x, y) => depth(x) - depth(y))) {
    b.matrixWorld.decompose(wp, wq, ws);
    const parent = b.parent && src.includes(b.parent as Bone) ? byName.get(b.parent.name)! : body;
    add(b.name, parent, wp.clone(), wq.clone());
  }
  const map = src.map((b) => bones.indexOf(byName.get(b.name)!));

  // --- the parts in the kart's frame, on their bones, UVs into the atlas
  const bodyGeo = baked(firstMesh(parts.body)!, fitBody(parts.body, spec.body));
  const bp = partOf(bodyGeo, bones.indexOf(body));
  bodyGeo.dispose();
  if (st) cutSteering(bp, st, bones.indexOf(byName.get('steer')!), dark);
  toAtlas(bp.uv, ATLAS.body);
  const wheelMesh = firstMesh(parts.wheel)!;
  const wfit = fitWheel(parts.wheel, spec.wheel.radius);
  const wheelParts = HUB_BONE.map((name, i) => {
    const h = hubAt[i], mirror = h[0] < 0;
    const g = baked(wheelMesh, new Matrix4().makeTranslation(h[0], h[1], h[2]).multiply(new Matrix4().makeScale(mirror ? -1 : 1, 1, 1)).multiply(wfit), mirror);
    const p = partOf(g, bones.indexOf(byName.get(name.replace('hub', 'wheel'))!));
    g.dispose();
    toAtlas(p.uv, ATLAS.wheel);
    return p;
  });
  remapJoints(dp, map);
  toAtlas(dp.uv, ATLAS.driver);
  const extras = (spec.driver.attachments ?? []).flatMap((a, i) => {
    const b = byName.get(a.bone);
    return b ? [attachmentPart(a, new Vector3().setFromMatrixPosition(b.matrixWorld), bones.indexOf(b), i)] : [];
  });

  // --- the skinned meshes: the bind is the fitted A-pose; then the driver sits in its own kart
  const boneInverses = bones.map((b) => new Matrix4().copy(b.matrixWorld).invert());
  const rest = new Map(src.map((b) => { const x = byName.get(b.name)!; return [x.name, { p: x.position.clone(), q: x.quaternion.clone() }] as const; }));
  const hipsAt = new Vector3().setFromMatrixPosition(byName.get('Hips')?.matrixWorld ?? new Matrix4()).toArray() as V3;
  const seat = seatOf(spec, hipsAt);
  const material = riggedMaterial(atlas);
  const full = mergeParts([bp, ...wheelParts, dp, ...extras]);
  const alone = mergeParts([dp, ...extras]);
  const root = skinnedRoot(kart, bones, boneInverses, full, material, `racer-${racerId}`);
  seatDriver(root, seat, pose, rest);
  // the driver alone: its own copy of the bones (the same names and order), the same bind
  const kart2 = kart.clone(true);
  const driverOnly = skinnedRoot(kart2, bones.map((b) => kart2.getObjectByName(b.name) as Bone), boneInverses, alone, material, `driver-${racerId}`);
  return { racerId, root, driverOnly, material, spec, pose, seat, rest, triangles: (full.index!.count / 3) | 0 };
}

function depth(o: Object3D): number { let n = 0; for (let p = o.parent; p; p = p.parent) n++; return n; }

/** A group holding the bones and the one skinned mesh bound to them (the kart's origin, identity bind). */
function skinnedRoot(kart: Bone, bones: Bone[], boneInverses: Matrix4[], geo: BufferGeometry, material: Material, name: string): Group {
  const root = new Group();
  root.name = name;
  root.add(kart);
  const mesh = new SkinnedMesh(geo, material);
  mesh.name = 'rigged';
  mesh.castShadow = true;
  mesh.receiveShadow = true; // the driver shades the seat, a roll bar the driver, a bridge the whole kart
  root.add(mesh);
  root.updateMatrixWorld(true);
  mesh.bind(new Skeleton(bones, boneInverses), new Matrix4());
  // the parts move about: a sphere round the whole kart and a driver's reach, fixed (never recomputed per pose)
  mesh.boundingSphere = new Sphere(new Vector3(0, 0.85, 0), 1.9);
  return root;
}

/** Every skinned mesh of a rigged kart (its levels of detail). */
function skinnedOf(root: Object3D): SkinnedMesh[] {
  const out: SkinnedMesh[] = [];
  root.traverse((o) => { if ((o as SkinnedMesh).isSkinnedMesh) out.push(o as SkinnedMesh); });
  return out;
}

/** A rigged kart's share of the painted sky's light in the PBR look (the world's is PBR.env). */
export const RACER_ENV = 0.5;

/** The racers' look, as the fused model files had it: lit PBR at a high roughness, no metal, no glow (Meshy's driver comes with its color as emission). */
export function riggedMaterial(map: Texture | null): MeshStandardMaterial {
  const m = new MeshStandardMaterial({ map, roughness: 0.82, metalness: 0, color: new Color(1, 1, 1) });
  m.name = 'rigged-racer';
  // the PBR look: the world's sun and the painted sky light the karts too (Adam, 25 Sept 2026: no shading
  // on the karts), in place of the page's even studio room, which lit every side alike
  if (isPbr()) { m.userData.lookEnv = RACER_ENV; litWorld(m); }
  m.userData.shared = true; // every kart and race shares it: a finished race must not dispose it
  return m;
}

/**
 * The atlas on a canvas (a browser only; null elsewhere): the parts' color images drawn into their
 * rects, the attachments' colors as swatches. Returns the texture and a reader of the body's pixels
 * (is it dark at the body's own (u, v)?) for the steering wheel's cut.
 */
export function drawAtlas(images: { driver: CanvasImageSource | null; body: CanvasImageSource | null; wheel: CanvasImageSource | null }, swatches: readonly string[]): { texture: Texture; dark: (u: number, v: number) => boolean } | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = ATLAS.w; c.height = ATLAS.h;
  const g = c.getContext?.('2d', { willReadFrequently: true });
  if (!g) return null;
  g.fillStyle = '#808080';
  g.fillRect(0, 0, c.width, c.height);
  const draw = (img: CanvasImageSource | null, r: Rect) => { if (img) g.drawImage(img, r[0], r[1], r[2], r[3]); };
  draw(images.driver, ATLAS.driver);
  draw(images.body, ATLAS.body);
  draw(images.wheel, ATLAS.wheel);
  swatches.forEach((hex, i) => { const r = swatchRect(i); g.fillStyle = hex; g.fillRect(r[0], r[1], r[2], r[3]); });
  // the body's colors at a quarter size are plenty to tell the steering wheel's dark from the paint (a sixteenth of the read)
  const S = 256, small = document.createElement('canvas');
  small.width = small.height = S;
  const sg = small.getContext?.('2d', { willReadFrequently: true });
  if (sg && images.body) sg.drawImage(images.body, 0, 0, S, S);
  const px = sg ? sg.getImageData(0, 0, S, S).data : new Uint8ClampedArray(S * S * 4);
  const dark = (u: number, v: number) => {
    const x = Math.min(S - 1, Math.max(0, Math.floor(u * S))), y = Math.min(S - 1, Math.max(0, Math.floor(v * S)));
    const k = (y * S + x) * 4;
    return Math.max(px[k], px[k + 1], px[k + 2]) < STEER_CUT.dark;
  };
  const t = new CanvasTexture(c);
  t.flipY = false; // glTF's convention: (0, 0) is the image's top left
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = ClampToEdgeWrapping;
  t.minFilter = LinearMipmapLinearFilter;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return { texture: t, dark };
}

// ---------------------------------------------------------------- one kart
/**
 * One kart's copy of a template (bones its own, geometry and material shared), with its RiggedKart on
 * `userData.rig` and its exhaust's anchor (the body bone: the flames ride the springs) on
 * `userData.exhaustAnchor`.
 */
export function makeRigged(t: RiggedTemplate, material?: Material): Group {
  const g = cloneSkinned(t.root) as Group;
  g.name = `racer-${t.racerId}`;
  if (material) for (const m of skinnedOf(g)) m.material = material;
  g.updateMatrixWorld(true);
  g.userData.rig = new RiggedKart(g, t, t.seat.grips, t.spec.body.steering);
  g.userData.exhaustAnchor = g.getObjectByName('body');
  return g;
}

/** The driver alone for a shared body (bodies.ts), seated by IK on that body's seat, holding its steering wheel. */
export function makeRiggedDriver(t: RiggedTemplate, seat: SeatSpec, steering: SteeringSpec | undefined, material?: Material): Group {
  const g = cloneSkinned(t.driverOnly) as Group;
  g.name = `driver-${t.racerId}`;
  if (material) for (const m of skinnedOf(g)) m.material = material;
  g.updateMatrixWorld(true);
  seatDriver(g, seat, t.pose, t.rest);
  g.userData.rig = new RiggedKart(g, t, seat.grips, steering);
  return g;
}

/** Free the bone textures of the skinned meshes under `root` (rigged karts leaving for good; their geometry and material are the template's). */
export function freeSkeletons(root: Object3D): void {
  root.traverse((o) => { if ((o as SkinnedMesh).isSkinnedMesh) (o as SkinnedMesh).skeleton?.dispose(); });
}

const IDENT = new Quaternion();

/**
 * Puts a kart's animation on its bones each frame (kart-controller view.ts calls apply): the body on
 * its springs (heave), each wheel's roll, steer and bob, the steering wheel's turn, the driver's spine
 * (lean, pitch, twist), neck and head (look, nod, tilt), shoulders (shrug) and arms (the grips on the
 * turning wheel by two-bone IK, or a gesture's aim, blended). The seated pose it starts from is the
 * bones' own when it is made. Everything precomputed; no allocation per frame.
 */
export class RiggedKart implements KartRig {
  readonly wheelRadius: number;
  private readonly body: Bone | null;
  private readonly steer: Bone | null;
  private readonly hubs: (Bone | null)[];
  private readonly wheels: (Bone | null)[];
  private readonly hubRest: Vector3[];
  /** each animated bone's seated local turn, and the kart's axes in its parent's (seated) frame */
  private readonly base = new Map<Object3D, Quaternion>();
  private readonly axes = new Map<Object3D, { x: Vector3; y: Vector3; z: Vector3 }>();
  private readonly spine: Object3D[];
  private readonly neck: Object3D | null;
  private readonly head: Object3D | null;
  private readonly shoulders: [Object3D | null, Object3D | null];
  private readonly arms: [Chain | null, Chain | null];
  /** the grips at rest, and the steering wheel they turn with (null: they stay put) */
  private readonly grips: [Vector3, Vector3] | null;
  private readonly steering: { c: Vector3; n: Vector3 } | null;
  private readonly pose: SeatedPose;
  /** the kart-frame FK down to the hands: bones from the root, each one's parent in the list */
  private readonly fk: Object3D[] = [];
  private readonly fkParent: number[] = [];
  private readonly fkPos: Vector3[] = [];
  private readonly fkRot: Quaternion[] = [];
  private readonly spineBaseRot = new Quaternion();

  constructor(root: Object3D, t: RiggedTemplate, grips: readonly [V3, V3] | null, steering: SteeringSpec | undefined) {
    const bone = (n: string) => root.getObjectByName(n) ?? null;
    this.pose = t.pose;
    this.wheelRadius = t.spec.wheel.radius;
    this.body = bone('body') as Bone | null;
    this.steer = bone('steer') as Bone | null;
    this.hubs = HUB_BONE.map((n) => bone(n) as Bone | null);
    this.wheels = HUB_BONE.map((n) => bone(n.replace('hub', 'wheel')) as Bone | null);
    this.hubRest = this.hubs.map((h) => (h ? h.position.clone() : new Vector3()));
    this.spine = ['Spine02', 'Spine01', 'Spine'].map(bone).filter((b): b is Object3D => !!b);
    this.neck = bone('neck');
    this.head = bone('Head');
    this.shoulders = [bone('LeftShoulder'), bone('RightShoulder')];
    root.updateMatrixWorld(true);
    const rootInv = new Matrix4().copy(root.matrixWorld).invert();
    const kq = (o: Object3D) => { const q = new Quaternion(); new Matrix4().multiplyMatrices(rootInv, o.matrixWorld).decompose(new Vector3(), q, new Vector3()); return q; };
    for (const b of [...this.spine, this.neck, this.head, ...this.shoulders, bone('LeftArm'), bone('LeftForeArm'), bone('RightArm'), bone('RightForeArm')]) {
      if (!b) continue;
      this.base.set(b, b.quaternion.clone());
      const pinv = kq(b.parent!).invert();
      this.axes.set(b, { x: AXES.x.clone().applyQuaternion(pinv), y: AXES.y.clone().applyQuaternion(pinv), z: AXES.z.clone().applyQuaternion(pinv) });
    }
    const top = this.spine[this.spine.length - 1];
    if (top) this.spineBaseRot.copy(kq(top));
    // the FK list: every bone from the kart root to the hands, parents first (in the rig's own frame)
    for (const n of ['kart', 'body', 'Hips', 'Spine02', 'Spine01', 'Spine', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand']) {
      const b = bone(n);
      if (!b) continue;
      this.fkParent.push(this.fk.indexOf(b.parent!));
      this.fk.push(b);
      this.fkPos.push(new Vector3());
      this.fkRot.push(new Quaternion());
    }
    this.arms = [this.chain(bone('LeftArm'), bone('LeftForeArm'), bone('LeftHand'), 1), this.chain(bone('RightArm'), bone('RightForeArm'), bone('RightHand'), -1)];
    this.grips = grips ? [new Vector3(...grips[0]), new Vector3(...grips[1])] : null;
    this.steering = steering ? { c: new Vector3(...steering.center), n: new Vector3(...steering.axis).normalize() } : null;
  }

  private chain(upper: Object3D | null, fore: Object3D | null, hand: Object3D | null, side: number): Chain | null {
    if (!upper || !fore || !hand) return null;
    const i = this.fk.indexOf(upper), j = this.fk.indexOf(fore);
    if (i < 0 || j < 0) return null;
    return { upper, fore, iUpper: i, side, aimUpper: fore.position.clone().normalize(), aimFore: hand.position.clone().normalize(), l1: fore.position.length(), l2: hand.position.length() };
  }

  apply(a: Readonly<AnimPose>, d: Readonly<DriverPose>): void {
    const T = DRIVER_ANIM;
    // --- the body on its springs; each wheel on its own, dropping toward the road as its corner lifts
    if (this.body) this.body.position.set(0, a.heave, 0);
    const sr = Math.sin(a.roll), sp = Math.sin(a.pitch);
    const spin = d.spin % TAU;
    for (let i = 0; i < 4; i++) {
      const h = this.hubs[i], w = this.wheels[i], r = this.hubRest[i];
      if (!h || !w) continue;
      const lift = a.lift + r.x * sr - r.z * sp;
      const bob = Math.max(-T.bobMax, Math.min(T.bobMax, -lift * T.bobShare));
      h.position.set(r.x, r.y + bob, r.z);
      h.rotation.set(0, i < 2 ? a.steer : 0, 0);
      w.rotation.set(spin, 0, 0);
    }
    // --- the steering wheel turns with the road wheels' steer (the stick, sprung)
    const wheelTurn = (a.steer / KART_ANIM.steerAngle) * T.wheelTurn;
    if (this.steer && this.steering) this.steer.quaternion.setFromAxisAngle(this.steering.n, wheelTurn);
    // --- spine: lean (+ top toward +X), pitch (+ forward), twist (+ chest toward +X), spread over its bones
    const ns = this.spine.length;
    for (let i = 0; i < ns; i++) this.offset(this.spine[i], a.lean / ns, d.spinePitch / ns, d.spineTwist / ns);
    // --- neck and head: the kart animation's look and nod, the driver's own look on top, a tilt
    const yaw = a.look + d.headYaw, pitch = a.nod + d.headPitch;
    if (this.neck) this.offset(this.neck, 0, pitch * 0.35, yaw * 0.35);
    if (this.head) this.offset(this.head, d.headRoll, pitch * 0.65, yaw * 0.65);
    // --- shoulders up (a shrug) or down: the left's bone points +X, so up is a turn about +Z
    const s = this.shoulders;
    if (s[0]) this.offset(s[0], -d.shrug * T.shrug, 0, 0);
    if (s[1]) this.offset(s[1], d.shrug * T.shrug, 0, 0);
    // --- arms: the grips on the turned wheel (IK), or the gesture's aim, blended
    this.solveFk();
    if (this.arms[0]) this.arm(this.arms[0], d.armL, wheelTurn, 0);
    if (this.arms[1]) this.arm(this.arms[1], d.armR, wheelTurn, 1);
  }

  /** bone ← its seated turn, then turns about the kart's Z (roll: + tilts the top toward +X), X (pitch: + forward) and Y (yaw: + toward +X). */
  private offset(b: Object3D, roll: number, pitch: number, yaw: number): void {
    const base = this.base.get(b), ax = this.axes.get(b);
    if (!base || !ax) return;
    const q = b.quaternion.copy(base);
    if (roll) q.premultiply(_q.setFromAxisAngle(ax.z, -roll));
    if (pitch) q.premultiply(_q.setFromAxisAngle(ax.x, pitch));
    if (yaw) q.premultiply(_q.setFromAxisAngle(ax.y, yaw));
  }

  /** The kart-frame place and turn of every bone down to the hands, from their local transforms now. */
  private solveFk(): void {
    for (let i = 0; i < this.fk.length; i++) {
      const b = this.fk[i], p = this.fkParent[i];
      if (p < 0) { this.fkPos[i].copy(b.position); this.fkRot[i].copy(b.quaternion); continue; }
      this.fkRot[i].multiplyQuaternions(this.fkRot[p], b.quaternion);
      this.fkPos[i].copy(b.position).applyQuaternion(this.fkRot[p]).add(this.fkPos[p]);
    }
  }

  /** One arm: where the elbow and wrist go (IK to the grip, or the gesture's aim), then aim the upper arm and the forearm there. */
  private arm(c: Chain, pose: Readonly<ArmPose>, wheelTurn: number, side: 0 | 1): void {
    const P = this.pose, S = this.fkPos[c.iUpper];
    const k = 1 - Math.max(0, Math.min(1, pose.wheel)); // 0: the wheel, 1: the gesture
    // the gesture's aims, from the torso's frame into the kart's (the torso turned from its seated rest)
    const top = this.spine.length ? this.fk.indexOf(this.spine[this.spine.length - 1]) : -1;
    _torso.copy(top >= 0 ? this.fkRot[top] : IDENT).multiply(_q.copy(this.spineBaseRot).invert());
    _gu.set(pose.upper[0], pose.upper[1], pose.upper[2]).applyQuaternion(_torso);
    _gf.set(pose.fore[0], pose.fore[1], pose.fore[2]).applyQuaternion(_torso);
    if (k < 1 && this.grips) {
      // the grip, turned with the steering wheel about its column; the wrist a hand's length short of it
      _t.copy(this.grips[side]);
      if (this.steering) _t.sub(this.steering.c).applyQuaternion(_q.setFromAxisAngle(this.steering.n, wheelTurn)).add(this.steering.c);
      if (this.body) _t.y += this.body.position.y; // the wheel rides the springs with the body
      _t.addScaledVector(_d.subVectors(_t, S).normalize(), -P.wrist);
      // two-bone IK: the elbow on the circle round S→T, toward the pole (out, down, back)
      _d.subVectors(_t, S);
      const dist = Math.max(Math.abs(c.l1 - c.l2) + 1e-4, Math.min(c.l1 + c.l2 - 1e-4, _d.length()));
      _d.normalize();
      const along = (c.l1 * c.l1 - c.l2 * c.l2 + dist * dist) / (2 * dist);
      const h = Math.sqrt(Math.max(0, c.l1 * c.l1 - along * along));
      _pole.set(P.elbow[0] * c.side, P.elbow[1], P.elbow[2]).applyQuaternion(_torso);
      _pole.addScaledVector(_d, -_pole.dot(_d)).normalize();
      _e.copy(S).addScaledVector(_d, along).addScaledVector(_pole, h);
      _iu.subVectors(_e, S).normalize();
      _if.copy(S).addScaledVector(_d, dist).sub(_e).normalize();
      if (k > 0) { slerpDir(_gu, _iu, _gu, k); slerpDir(_gf, _if, _gf, k); } else { _gu.copy(_iu); _gf.copy(_if); }
    }
    // aim the upper arm: its bone's aim (toward the forearm) turned onto _gu, in the kart's frame
    const pUp = this.fkParent[c.iUpper];
    _w.multiplyQuaternions(this.fkRot[pUp], this.base.get(c.upper)!);
    _a.copy(c.aimUpper).applyQuaternion(_w);
    _w.premultiply(_r.setFromUnitVectors(_a, _gu));
    c.upper.quaternion.copy(_p.copy(this.fkRot[pUp]).invert()).multiply(_w);
    // then the forearm from its seated turn under the new upper arm
    _w2.multiplyQuaternions(_w, this.base.get(c.fore)!);
    _a.copy(c.aimFore).applyQuaternion(_w2);
    _w2.premultiply(_r.setFromUnitVectors(_a, _gf));
    c.fore.quaternion.copy(_p.copy(_w).invert()).multiply(_w2);
  }
}

interface Chain { upper: Object3D; fore: Object3D; iUpper: number; side: number; aimUpper: Vector3; aimFore: Vector3; l1: number; l2: number }

const TAU = Math.PI * 2;
const _q = new Quaternion(), _p = new Quaternion(), _r = new Quaternion(), _w = new Quaternion(), _w2 = new Quaternion(), _torso = new Quaternion();
const _gu = new Vector3(), _gf = new Vector3(), _t = new Vector3(), _d = new Vector3(), _pole = new Vector3(), _e = new Vector3(), _iu = new Vector3(), _if = new Vector3(), _a = new Vector3();

/** out = the direction k of the way from a to b (a spherical blend of two unit vectors). */
function slerpDir(out: Vector3, a: Vector3, b: Vector3, k: number): Vector3 {
  const dot = Math.max(-1, Math.min(1, a.dot(b)));
  const th = Math.acos(dot);
  if (th < 1e-4) return out.copy(b);
  const s = Math.sin(th);
  const wa = Math.sin((1 - k) * th) / s, wb = Math.sin(k * th) / s;
  return out.set(a.x * wa + b.x * wb, a.y * wa + b.y * wb, a.z * wa + b.z * wb).normalize();
}
