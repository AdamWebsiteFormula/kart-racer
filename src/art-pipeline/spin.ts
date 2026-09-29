// The turning parts of the scenery (the second fresh-eyes review's item 9, 28 Sept 2026: "Windmill Run is named for its
// windmill, and the big windmill by the road never moves its sails ... Boardwalk Nights' Ferris wheel never turns
// either"; Mario Kart World's farm keeps its windmills turning, youtube.com/watch?v=OSU-aguh1AY 1:28:58). A model is one
// mesh (an image-to-3D file is one welded piece), so its moving part is found by where it is (markSpin: the sails, the
// wheel) or, for a code-built one, by the parts that make it (markSpinFrom), and marked with a vertex attribute; the
// vertex shader turns the marked vertices about the axis through the hub (spinMaterial), in the shadow pass too
// (spinDepth). One draw as before, nothing per frame but one angle. Pictures only: nothing here is read by the sim.
import { BufferAttribute, type BufferGeometry, type Material, type Mesh, MeshDepthMaterial, type Vector3 } from 'three';
import type { V3 } from './model.ts';

/** A turning part as placed: a point on its axis and the axis (unit), in its model's own frame; seconds a turn takes (+: anticlockwise seen from the axis's tip). */
export interface Spin { hub: V3; axis: V3; period: number }

/**
 * How a model file's turning part is found (public/models/props.json `spin`, in the file's own frame, before it is
 * fitted). The core: what stands within `radius` of the axis through `hub` and `depth` (behind, in front) of the hub's
 * plane along the axis surely turns. A piece of the model (its triangles joined through their corners, the axle within
 * `axle` of the axis left out, so a sail is not joined to the tower through it) that stands mostly in the core turns
 * whole, out to `reach` (a sail's tip past the core's radius, the back of its lattice behind its plane), and nothing
 * else does; the corners a turning and a still triangle share are split in two, so no triangle is ever stretched
 * between them. `main`: only the model's biggest connected piece turns (a separate booth standing in the wheel's disc
 * stays put). Measured once per file on its vertices (a plane fitted to the sails, the tips' circle).
 */
export interface SpinFind extends Spin {
  radius: number;
  depth: readonly [number, number];
  reach?: { radius: number; depth: readonly [number, number] };
  axle?: number;
  main?: boolean;
}

/** The vertex attribute that marks a turning vertex (1) from a still one (0). */
export const SPIN_ATTRIBUTE = 'aSpin';

/**
 * Each vertex's stand-in among those at the same place (a model's corners are split where its normals or its texture
 * seams part, so its triangles meet through places, not through vertex numbers).
 */
function placeIds(g: BufferGeometry): Int32Array {
  const p = g.getAttribute('position'), n = p.count, ids = new Int32Array(n), seen = new Map<string, number>();
  const q = (x: number) => Math.round(x * 1e5);
  for (let i = 0; i < n; i++) {
    const key = `${q(p.getX(i))},${q(p.getY(i))},${q(p.getZ(i))}`;
    const had = seen.get(key);
    if (had === undefined) { seen.set(key, i); ids[i] = i; } else ids[i] = had;
  }
  return ids;
}

/** The largest connected piece of an indexed geometry (its triangles joined where their corners meet), as a vertex mask. */
function mainPiece(g: BufferGeometry, at: Int32Array): Uint8Array {
  const n = g.getAttribute('position').count, idx = g.index;
  const parent = new Int32Array(n);
  for (let i = 0; i < n; i++) parent[i] = i;
  const find = (i: number): number => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  for (let i = 0; i < n; i++) parent[find(i)] = find(at[i]);
  if (idx) for (let t = 0; t + 2 < idx.count; t += 3) {
    const a = find(idx.getX(t)), b = find(idx.getX(t + 1));
    parent[b] = a;
    parent[find(idx.getX(t + 2))] = find(a);
  }
  const size = new Map<number, number>();
  for (let i = 0; i < n; i++) { const r = find(i); size.set(r, (size.get(r) ?? 0) + 1); }
  let best = -1, most = -1;
  for (const [r, s] of size) if (s > most) { most = s; best = r; }
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = find(i) === best ? 1 : 0;
  return out;
}

/**
 * Mark the triangles of the indexed geometry `g` (in the frame `find` was measured in) that turn (SpinFind: the core,
 * whole pieces out to the reach), splitting the corners a turning and a still triangle share; the marks go on the
 * vertices (SPIN_ATTRIBUTE). Rewrites `g`'s attributes and index when it splits. Returns how many triangles turn.
 */
export function markSpin(g: BufferGeometry, find: SpinFind): number {
  const idx = g.index;
  if (!idx) throw new Error('markSpin: an indexed geometry');
  const p = g.getAttribute('position'), n = p.count, tris = idx.count / 3;
  const [hx, hy, hz] = find.hub, [ax, ay, az] = find.axis;
  const reach = find.reach ?? { radius: find.radius, depth: find.depth }, axle = find.axle ?? 0;
  const at = placeIds(g);
  const main = find.main ? mainPiece(g, at) : null;
  // each triangle's middle: in the core, in the reach, on the axle
  const core = new Uint8Array(tris), within = new Uint8Array(tris), onAxle = new Uint8Array(tris);
  for (let t = 0; t < tris; t++) {
    const a = idx.getX(t * 3), b = idx.getX(t * 3 + 1), c = idx.getX(t * 3 + 2);
    if (main && !(main[a] && main[b] && main[c])) continue;
    const dx = (p.getX(a) + p.getX(b) + p.getX(c)) / 3 - hx, dy = (p.getY(a) + p.getY(b) + p.getY(c)) / 3 - hy, dz = (p.getZ(a) + p.getZ(b) + p.getZ(c)) / 3 - hz;
    const along = dx * ax + dy * ay + dz * az;
    const r = Math.hypot(dx - ax * along, dy - ay * along, dz - az * along);
    within[t] = along >= -reach.depth[0] && along <= reach.depth[1] && r <= reach.radius ? 1 : 0;
    core[t] = within[t] && along >= -find.depth[0] && along <= find.depth[1] && r <= find.radius ? 1 : 0;
    onAxle[t] = r <= axle ? 1 : 0;
  }
  // the pieces within the reach, joined where their corners meet (not through the axle)
  const parent = new Int32Array(tris);
  for (let t = 0; t < tris; t++) parent[t] = t;
  const root = (t: number): number => { while (parent[t] !== t) { parent[t] = parent[parent[t]]; t = parent[t]; } return t; };
  const firstAt = new Int32Array(n).fill(-1);
  for (let t = 0; t < tris; t++) {
    if (!within[t] || onAxle[t]) continue;
    for (let k = 0; k < 3; k++) {
      const v = at[idx.getX(t * 3 + k)];
      if (firstAt[v] < 0) firstAt[v] = t; else parent[root(t)] = root(firstAt[v]);
    }
  }
  const votes = new Map<number, [number, number]>();
  for (let t = 0; t < tris; t++) {
    if (!within[t] || onAxle[t]) continue;
    const r = root(t), v = votes.get(r) ?? [0, 0];
    v[0] += core[t]; v[1]++;
    votes.set(r, v);
  }
  // (with no reach, each triangle by its own middle: a Ferris wheel's legs run into its rim and would join it)
  const pieces = find.reach !== undefined;
  const turns = new Uint8Array(tris);
  let count = 0;
  for (let t = 0; t < tris; t++) {
    if (!within[t]) continue;
    const v = onAxle[t] || !pieces ? null : votes.get(root(t))!;
    turns[t] = (v ? v[0] * 2 >= v[1] : core[t] === 1) ? 1 : 0;
    count += turns[t];
  }
  // a corner shared by a turning and a still triangle is split: the turning ones take a copy of it
  const usedTurn = new Uint8Array(n), usedStill = new Uint8Array(n);
  for (let t = 0; t < tris; t++) for (let k = 0; k < 3; k++) (turns[t] ? usedTurn : usedStill)[idx.getX(t * 3 + k)] = 1;
  const copyOf = new Int32Array(n).fill(-1);
  let extra = 0;
  for (let v = 0; v < n; v++) if (usedTurn[v] && usedStill[v]) copyOf[v] = n + extra++;
  const index = new Uint32Array(idx.count);
  for (let t = 0; t < tris; t++) for (let k = 0; k < 3; k++) {
    const v = idx.getX(t * 3 + k);
    index[t * 3 + k] = turns[t] && copyOf[v] >= 0 ? copyOf[v] : v;
  }
  if (extra > 0) {
    for (const name of Object.keys(g.attributes)) {
      const at = g.getAttribute(name), size = at.itemSize, src = at.array, out = new Float32Array((n + extra) * size);
      for (let i = 0; i < n * size; i++) out[i] = src[i];
      for (let v = 0; v < n; v++) if (copyOf[v] >= 0) for (let k = 0; k < size; k++) out[copyOf[v] * size + k] = src[v * size + k];
      g.setAttribute(name, new BufferAttribute(out, size, at.normalized));
    }
  }
  g.setIndex(new BufferAttribute(index, 1));
  const mark = new Float32Array(n + extra);
  for (let v = 0; v < n; v++) mark[copyOf[v] >= 0 ? copyOf[v] : v] = usedTurn[v] ? 1 : 0;
  g.setAttribute(SPIN_ATTRIBUTE, new BufferAttribute(mark, 1));
  return count;
}

/** Mark the vertices from `from` (inclusive) to `to` (exclusive) of `g` as turning (a code-built model's own parts: ModelBuilder.vertexStart). */
export function markSpinFrom(g: BufferGeometry, from: number, to = g.getAttribute('position').count): void {
  const n = g.getAttribute('position').count, mark = new Float32Array(n);
  for (let i = Math.max(0, from); i < Math.min(n, to); i++) mark[i] = 1;
  g.setAttribute(SPIN_ATTRIBUTE, new BufferAttribute(mark, 1));
}

/**
 * A spin found in a file's own frame, carried through what fitting does to its geometry: turned `yaw` about Y, then a
 * uniform `scale` and a `shift` (glb.ts PropModels.adopt: `fitToBox`). Pure.
 */
export function placedSpin(find: SpinFind, yaw: number, scale: number, shift: Readonly<Vector3>): Spin {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  // three's rotateY: x' = x cos + z sin, z' = -x sin + z cos
  const turn = (v: V3): V3 => [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
  const h = turn(find.hub), a = turn(find.axis);
  return { hub: [h[0] * scale + shift.x, h[1] * scale + shift.y, h[2] * scale + shift.z], axis: a, period: find.period };
}

/** The uniforms a turning material reads: the angle now (main.ts's frame sets it, track-builder scene.ts `update`), the hub and the axis. */
export interface SpinUniforms { uSpinAngle: { value: number }; uSpinHub: { value: V3 }; uSpinAxis: { value: V3 } }

const PARS = `uniform float uSpinAngle;
uniform vec3 uSpinHub;
uniform vec3 uSpinAxis;
attribute float ${SPIN_ATTRIBUTE};
vec3 spinTurn(vec3 v, float a) {
  float c = cos(a), s = sin(a);
  return v * c + cross(uSpinAxis, v) * s + uSpinAxis * dot(uSpinAxis, v) * (1.0 - c);
}
float spinAngle() {
  float a = uSpinAngle;
  #ifdef USE_INSTANCING
    // each copy on its own phase (a field of windmills never turns in step), from where it stands
    a += 6.2831853 * fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453);
  #endif
  return a;
}
`;

function patch(m: Material, u: SpinUniforms, normals: boolean): void {
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (shader, renderer) => {
    prev.call(m, shader, renderer);
    Object.assign(shader.uniforms, u);
    let vs = `${PARS}${shader.vertexShader}`;
    if (normals) vs = vs.replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>\n  if (${SPIN_ATTRIBUTE} > 0.5) objectNormal = spinTurn(objectNormal, spinAngle());`);
    shader.vertexShader = vs.replace('#include <begin_vertex>', `#include <begin_vertex>\n  if (${SPIN_ATTRIBUTE} > 0.5) transformed = uSpinHub + spinTurn(transformed - uSpinHub, spinAngle());`);
  };
  const key = m.customProgramCacheKey.bind(m);
  m.customProgramCacheKey = () => `${key()}|spin`;
}

/**
 * Turn `m`'s marked vertices (SPIN_ATTRIBUTE) about `spin`'s axis. Once per material (a model file's material is shared
 * by every race: its uniforms stay with it, on userData.spin); returns them. The caller sets `uSpinAngle` each frame.
 */
export function spinMaterial(m: Material, spin: Spin): SpinUniforms {
  const had = m.userData.spin as SpinUniforms | undefined;
  if (had) { had.uSpinHub.value = spin.hub; had.uSpinAxis.value = spin.axis; return had; }
  const u: SpinUniforms = { uSpinAngle: { value: 0 }, uSpinHub: { value: spin.hub }, uSpinAxis: { value: spin.axis } };
  patch(m, u, true);
  m.userData.spin = u;
  m.needsUpdate = true;
  return u;
}

/** The shadow pass's depth material for a turning mesh (as the shadow map's own: performance/shadowDepth.ts): its shadow turns with it (the sails' shadow on the grass). */
export function spinDepth(u: SpinUniforms): MeshDepthMaterial {
  const d = new MeshDepthMaterial();
  patch(d, u, false);
  return d;
}

/** The angle a part with `period` seconds a turn stands at, `time` seconds in (wrapped, so it keeps its precision). */
export function spinAngle(time: number, period: number): number {
  const turns = time / period;
  return (turns - Math.floor(turns)) * Math.PI * 2;
}

/**
 * Make `mesh` turn its marked part (its geometry's `userData.spin`, from markSpin or markSpinFrom and where the model
 * was placed): its material patched (once: a model file's is shared by every race), and its shadow's depth material
 * with it (one per material, freed with it). Returns what sets its angle for the scene's clock each frame, or null for
 * a mesh with nothing that turns. (track-builder scene.ts calls it through TrackAssets.spin.)
 */
export function turning(mesh: Mesh): ((time: number) => void) | null {
  const many = mesh.geometry.userData.spins as Spin[] | undefined;
  if (many?.length && mesh.geometry.getAttribute(SPIN_INDEX)) return turningMany(mesh, many);
  const spin = mesh.geometry.userData.spin as Spin | undefined;
  if (!spin || !mesh.geometry.getAttribute(SPIN_ATTRIBUTE)) return null;
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const us = mats.map((m) => spinMaterial(m, spin));
  const u = us[0], m0 = mats[0] as Material & { userData: { spinDepth?: MeshDepthMaterial } };
  if (!m0.userData.spinDepth) {
    const d = spinDepth(u);
    m0.userData.spinDepth = d;
    d.userData.shared = m0.userData.shared === true; // (a shared model material's lives as long as it does)
    m0.addEventListener('dispose', () => d.dispose());
  }
  mesh.customDepthMaterial = m0.userData.spinDepth;
  return (time) => {
    const a = spinAngle(time, spin.period);
    for (let i = 0; i < us.length; i++) us[i].uSpinAngle.value = a;
  };
}

/**
 * The vertex attribute of a merged geometry (track-builder mesh/merge.ts: the dressing, many props baked into one mesh)
 * that says which of its turning copies a vertex belongs to: k + 1 for the geometry's `userData.spins[k]`, 0 for none.
 */
export const SPIN_INDEX = 'aSpinK';

/**
 * A merged mesh's turning copies (a ranch windpump's wheel among the dressing baked into one mesh): each its own hub and
 * axis where it stands, the same period, each on its own phase (from where it stands). Its own material (the dressing's
 * is its own per mesh) and its shadow's.
 */
function turningMany(mesh: Mesh, spins: readonly Spin[]): (time: number) => void {
  const n = spins.length;
  const hubs = new Float32Array(n * 3), axes = new Float32Array(n * 3);
  spins.forEach((s, k) => { hubs.set(s.hub, k * 3); axes.set(s.axis, k * 3); });
  const u = { uSpinAngle: { value: 0 }, uSpinHubs: { value: hubs }, uSpinAxes: { value: axes } };
  const pars = `#define SPIN_N ${n}
uniform float uSpinAngle;
uniform vec3 uSpinHubs[SPIN_N];
uniform vec3 uSpinAxes[SPIN_N];
attribute float ${SPIN_INDEX};
vec3 spinTurnK(vec3 v, vec3 ax, float a) {
  float c = cos(a), s = sin(a);
  return v * c + cross(ax, v) * s + ax * dot(ax, v) * (1.0 - c);
}
`;
  const body = (normals: boolean) => `
  int spinK = int(${SPIN_INDEX} + 0.5) - 1;
  vec3 spinHub = vec3(0.0), spinAx = vec3(0.0, 0.0, 1.0);
  float spinA = 0.0;
  if (spinK >= 0) {
    spinHub = uSpinHubs[spinK]; spinAx = uSpinAxes[spinK];
    spinA = uSpinAngle + 6.2831853 * fract(sin(dot(spinHub.xz, vec2(12.9898, 78.233))) * 43758.5453);
  }${normals ? '\n  if (spinK >= 0) objectNormal = spinTurnK(objectNormal, spinAx, spinA);' : ''}`;
  const patchMany = (m: Material, normals: boolean) => {
    const prev = m.onBeforeCompile;
    m.onBeforeCompile = (shader, renderer) => {
      prev.call(m, shader, renderer);
      Object.assign(shader.uniforms, u);
      let vs = `${pars}${shader.vertexShader}`;
      // (the normal's include comes first in a lit material; a depth material has none: its turn goes with the position's)
      vs = normals
        ? vs.replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>${body(true)}`)
          .replace('#include <begin_vertex>', '#include <begin_vertex>\n  if (spinK >= 0) transformed = spinHub + spinTurnK(transformed - spinHub, spinAx, spinA);')
        : vs.replace('#include <begin_vertex>', `#include <begin_vertex>${body(false)}\n  if (spinK >= 0) transformed = spinHub + spinTurnK(transformed - spinHub, spinAx, spinA);`);
      shader.vertexShader = vs;
    };
    const key = m.customProgramCacheKey.bind(m);
    m.customProgramCacheKey = () => `${key()}|spin${n}`;
    m.needsUpdate = true;
  };
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const m of mats) { patchMany(m, true); m.userData.spin = u; }
  if (mesh.castShadow) {
    const d = new MeshDepthMaterial();
    patchMany(d, false);
    mesh.customDepthMaterial = d;
    mats[0].addEventListener('dispose', () => d.dispose());
  }
  const period = spins[0].period;
  return (time) => { u.uSpinAngle.value = spinAngle(time, period); };
}
