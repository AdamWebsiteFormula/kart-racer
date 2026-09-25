// Baked soft shading for the static world (Adam, 25 Sept 2026: "Shading and shadows need to be for
// more things than just the karts"), backed by research (docs/sops/art-pipeline.md Decisions): Mario
// Kart World's world gets its soft shading from baked lighting, not real-time shadows (Digital
// Foundry tech review: "Baked lighting returns in Mario Kart World, with the game relying heavily on
// lightmaps... only limited use of real-time shadows for player vehicles and certain bits of
// trackside detail"). This bakes two things into the SAME vertex `color` attribute every toon and PBR
// material already reads (art-pipeline look.ts: the PBR twin copies `vertexColors` from its toon
// original, so one bake serves `?look=toon` and `?look=pbr` alike), once at track-load time, fixed at
// the track's own sun direction (env.sunDirection, the same one the real-time light uses):
//   - contact/cavity ambient occlusion: a short hemisphere of rays around each vertex's normal against
//     the track's own static geometry, darkening creases and where a solid stands on the ground;
//   - a soft baked sun shadow: a few jittered rays toward the fixed sun, so a bridge, the loop or a
//     tall prop shades the ground and road under it without a second real-time shadow map.
// Uses three-mesh-bvh (already a dependency, MIT) for both, one MeshBVH built once from a plain
// world-space triangle soup: every receiver mesh (so a hill shades its own foot, a wall its own base)
// plus every InstancedMesh decor whose footprint is big enough to matter, stood in for by a cheap
// vertical prism rather than its full-detail geometry (three-mesh-bvh's StaticGeometryGenerator does
// not expand per-instance transforms, so decor is not itself flattened here — see appendDecorProxies).
// Costed by a world-space grid cache, not by vertex count: many nearby vertices (a flat road, a flat
// lawn) share one bucket's rays, so the raycast total stays bounded on any track (BAKE.targetBuckets),
// and every sample direction is a fixed, deterministic pattern (no Math.random), so the bake never
// flickers between runs and a test can pin its output. Render-only: nothing here is read by the sim,
// the input logs or the score core.
import {
  BufferGeometry, DoubleSide, Float32BufferAttribute, Matrix3, Matrix4, Ray, Vector3,
  type BufferAttribute, type InstancedMesh, type Mesh, type Object3D,
} from 'three';
import { MeshBVH } from 'three-mesh-bvh';

export const BAKE = Object.freeze({
  /** caps the world-space cache's cell count on any track, so the raycast total stays bounded regardless of vertex density */
  targetBuckets: 7000,
  minCellXZ: 0.9,
  maxCellXZ: 4.5,
  /** vertical bucket size: coarse enough for cheap reuse, fine enough to keep "under the bridge" apart from "on the bridge" */
  cellY: 1.0,
  aoRays: 5,
  aoRadius: 9,
  aoBias: 0.05,
  aoStrength: 0.85,
  /** never fully black: MKW's own baked AO stays soft */
  aoMin: 0.42,
  sunRays: 3,
  /** radians of jitter around the fixed sun direction: a soft penumbra instead of one hard-edged ray */
  sunSoftness: 0.05,
  /** metres; long enough for the loop, a gantry or a landmark to shadow the road under it */
  sunMaxDistance: 220,
  sunBias: 0.05,
  sunStrength: 0.62,
  sunMin: 0.55,
  /** decor smaller than this footprint radius (tufts, pebbles, flowers) is not a baked occluder */
  minOccluderRadius: 0.5,
  decorProxySides: 6,
});

export interface BakeReceiver {
  mesh: Mesh;
  /** 0 (no bake) to 1 (full); a surface with its own rich procedural shading (the road) can take less. Default 1. */
  strength?: number;
}

export interface BakeInput {
  /** static geometry that both receives the bake and, together, casts it (a hill shades its own foot) */
  receivers: readonly BakeReceiver[];
  /** InstancedMesh decor big enough to shade the ground under it (stood in for by a cheap prism: appendDecorProxies) */
  decor?: readonly InstancedMesh[];
  /** unit-ish vector toward the track's own fixed sun (env.sunDirection: the same one the real-time light uses) */
  sun: readonly [number, number, number];
}

export interface BakeStats {
  receiverMeshes: number;
  receiverVertices: number;
  occluderTriangles: number;
  buckets: number;
  rays: number;
  ms: number;
}

const EMPTY_STATS: Readonly<BakeStats> = Object.freeze({ receiverMeshes: 0, receiverVertices: 0, occluderTriangles: 0, buckets: 0, rays: 0, ms: 0 });

/** Deterministic cosine-weighted hemisphere directions (canonical, +Z the pole), so the bake never flickers run to run. */
function hemisphereSamples(k: number): readonly Vector3[] {
  const out: Vector3[] = [];
  const golden = 0.6180339887498949; // fractional part of the golden ratio: a low-discrepancy 1D sequence
  for (let i = 0; i < k; i++) {
    const u = (i + 0.5) / k, v = (i * golden) % 1;
    const r = Math.sqrt(u), theta = 2 * Math.PI * v;
    out.push(new Vector3(Math.cos(theta) * r, Math.sin(theta) * r, Math.sqrt(Math.max(0, 1 - u))));
  }
  return out;
}

/** A small deterministic pattern on the unit disk (the centre, then a ring): a soft-edged jitter, not a hard single ray. */
function diskSamples(k: number): readonly (readonly [number, number])[] {
  if (k <= 1) return [[0, 0]];
  const out: (readonly [number, number])[] = [[0, 0]];
  for (let i = 1; i < k; i++) {
    const a = ((i - 1) / (k - 1)) * Math.PI * 2;
    out.push([Math.cos(a), Math.sin(a)]);
  }
  return out;
}

const BASIS_UP = new Vector3(0, 1, 0), BASIS_ALT = new Vector3(1, 0, 0);

/** An orthonormal (tangent, bitangent) for `normal`, picked so the cross product never degenerates. */
function basisFor(normal: Vector3, tangent: Vector3, bitangent: Vector3): void {
  const helper = Math.abs(normal.y) < 0.9 ? BASIS_UP : BASIS_ALT;
  tangent.crossVectors(helper, normal).normalize();
  bitangent.crossVectors(normal, tangent);
}

/** Every triangle of `mesh`'s geometry, transformed by its current matrixWorld, appended as a flat position soup. */
function appendMeshTriangles(mesh: Mesh, out: number[]): void {
  const geo = mesh.geometry;
  const pos = geo.getAttribute('position');
  if (!pos) return;
  const idx = geo.getIndex();
  const m = mesh.matrixWorld;
  const v = new Vector3();
  const push = (i: number): void => { v.fromBufferAttribute(pos, i).applyMatrix4(m); out.push(v.x, v.y, v.z); };
  if (idx) for (let i = 0; i < idx.count; i++) push(idx.getX(i));
  else for (let i = 0; i < pos.count; i++) push(i);
}

/**
 * A cheap stand-in for one decor instancer's occlusion: every instance as an open vertical prism (its
 * own footprint's radius and height, from its geometry's bounding box), so a tree or a building shades
 * the ground under it without the bake reading its full-detail geometry (up to a few thousand
 * instances a track: see docs/sops/performance.md triangle counts). Ground cover too small to matter
 * (a tuft, a pebble, a flower) is skipped (BAKE.minOccluderRadius): appended only for its shape, never
 * read back, so the instancer's own geometry and material are untouched.
 */
export function appendDecorProxies(mesh: InstancedMesh, out: number[]): void {
  const geo = mesh.geometry;
  if (!geo.boundingBox) geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const radius = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) / 2;
  if (!(radius >= BAKE.minOccluderRadius) || mesh.count <= 0) return;
  const height = Math.max(0.1, bb.max.y - bb.min.y), baseY = bb.min.y;
  const sides = BAKE.decorProxySides;
  const ring: (readonly [number, number])[] = [];
  for (let s = 0; s < sides; s++) { const a = (s / sides) * Math.PI * 2; ring.push([Math.cos(a) * radius, Math.sin(a) * radius]); }
  const m = new Matrix4(), a0 = new Vector3(), a1 = new Vector3(), a2 = new Vector3(), a3 = new Vector3();
  for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i, m);
    for (let s = 0; s < sides; s++) {
      const [x0, z0] = ring[s], [x1, z1] = ring[(s + 1) % sides];
      a0.set(x0, baseY, z0).applyMatrix4(m);
      a1.set(x1, baseY, z1).applyMatrix4(m);
      a2.set(x1, baseY + height, z1).applyMatrix4(m);
      a3.set(x0, baseY + height, z0).applyMatrix4(m);
      out.push(a0.x, a0.y, a0.z, a1.x, a1.y, a1.z, a2.x, a2.y, a2.z);
      out.push(a0.x, a0.y, a0.z, a2.x, a2.y, a2.z, a3.x, a3.y, a3.z);
    }
  }
}

/**
 * Bakes contact AO and a soft sun shadow into every receiver's existing vertex `color` attribute
 * (multiplied in place; a receiver with none yet gets a white one first, so the bake still shows).
 * `group` must already hold every receiver and every occluder at its final transform; matrixWorld is
 * refreshed here. Pure CPU/geometry work — nothing here touches a renderer or a texture, so it runs
 * the same in a headless test as it does at load time.
 */
export function bakeTrackShading(group: Object3D, input: BakeInput): BakeStats {
  const t0 = performance.now();
  const receivers = input.receivers.filter((r) => r.mesh.geometry.getAttribute('position'));
  if (receivers.length === 0) return EMPTY_STATS;
  group.updateMatrixWorld(true);

  // one world-space triangle soup to raycast against: every receiver (so a hill shades its own foot,
  // a wall its own base), plus a cheap prism for every decor instance big enough to matter
  const tris: number[] = [];
  for (const r of receivers) appendMeshTriangles(r.mesh, tris);
  for (const d of input.decor ?? []) appendDecorProxies(d, tris);
  if (tris.length < 9) return EMPTY_STATS;
  const soup = new BufferGeometry();
  soup.setAttribute('position', new Float32BufferAttribute(Float32Array.from(tris), 3));
  const bvh = new MeshBVH(soup);
  const occluderTriangles = tris.length / 9;

  // the occluder soup's own world footprint (every receiver is in it too), so the cache's cell size
  // fits this track: a small one samples as finely as minCellXZ, a huge one no coarser than
  // maxCellXZ, and none buckets more than targetBuckets cells (the raycast total is bounded by
  // that, not by how fine the geometry is) — read from `tris` directly, no second vertex pass
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < tris.length; i += 3) {
    const x = tris[i], z = tris[i + 2];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  const worldPos = new Vector3();
  const area = Math.max(1, maxX - minX) * Math.max(1, maxZ - minZ);
  const cellXZ = Math.min(BAKE.maxCellXZ, Math.max(BAKE.minCellXZ, Math.sqrt(area / BAKE.targetBuckets)));

  const aoDirs = hemisphereSamples(BAKE.aoRays);
  const sunUnit = new Vector3(input.sun[0], input.sun[1], input.sun[2]);
  if (sunUnit.lengthSq() < 1e-8) sunUnit.set(0.4, 0.8, 0.3);
  sunUnit.normalize();
  const sunTangent = new Vector3(), sunBitangent = new Vector3();
  basisFor(sunUnit, sunTangent, sunBitangent);
  const sunDirs = diskSamples(BAKE.sunRays).map(([ox, oy]) => new Vector3()
    .copy(sunUnit)
    .addScaledVector(sunTangent, ox * BAKE.sunSoftness)
    .addScaledVector(sunBitangent, oy * BAKE.sunSoftness)
    .normalize());

  const cache = new Map<string, number>();
  const ray = new Ray();
  const n = new Vector3(), tangent = new Vector3(), bitangent = new Vector3(), origin = new Vector3(), dir = new Vector3();
  let rays = 0;

  const factorAt = (p: Vector3, normal: Vector3): number => {
    const up = normal.y > 0.5 ? 1 : normal.y < -0.5 ? -1 : 0;
    const key = `${Math.round(p.x / cellXZ)},${Math.round(p.y / BAKE.cellY)},${Math.round(p.z / cellXZ)},${up}`;
    const had = cache.get(key);
    if (had !== undefined) return had;

    basisFor(normal, tangent, bitangent);
    let occluded = 0;
    origin.copy(p).addScaledVector(normal, BAKE.aoBias);
    for (const d of aoDirs) {
      dir.copy(tangent).multiplyScalar(d.x).addScaledVector(bitangent, d.y).addScaledVector(normal, d.z);
      ray.origin.copy(origin); ray.direction.copy(dir);
      if (bvh.raycastFirst(ray, DoubleSide, 1e-4, BAKE.aoRadius)) occluded++;
    }
    rays += aoDirs.length;
    const ao = Math.max(BAKE.aoMin, 1 - (occluded / aoDirs.length) * BAKE.aoStrength);

    let shadowed = 0;
    origin.copy(p).addScaledVector(normal, BAKE.sunBias);
    for (const d of sunDirs) {
      ray.origin.copy(origin); ray.direction.copy(d);
      if (bvh.raycastFirst(ray, DoubleSide, 1e-4, BAKE.sunMaxDistance)) shadowed++;
    }
    rays += sunDirs.length;
    const shadow = Math.max(BAKE.sunMin, 1 - (shadowed / sunDirs.length) * BAKE.sunStrength);

    const factor = ao * shadow;
    cache.set(key, factor);
    return factor;
  };

  let receiverVertices = 0;
  for (const { mesh, strength = 1 } of receivers) {
    const geo = mesh.geometry;
    const pos = geo.getAttribute('position'), nrm = geo.getAttribute('normal');
    let col = geo.getAttribute('color') as BufferAttribute | null;
    if (!col) {
      col = new Float32BufferAttribute(new Float32Array(pos.count * 3).fill(1), 3);
      geo.setAttribute('color', col);
    }
    const normalMatrix = new Matrix3().getNormalMatrix(mesh.matrixWorld);
    receiverVertices += pos.count;
    for (let i = 0; i < pos.count; i++) {
      worldPos.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      if (nrm) n.fromBufferAttribute(nrm, i).applyMatrix3(normalMatrix).normalize(); else n.set(0, 1, 0);
      const raw = factorAt(worldPos, n);
      const factor = strength >= 1 ? raw : 1 - (1 - raw) * strength;
      col.setX(i, col.getX(i) * factor);
      col.setY(i, col.getY(i) * factor);
      col.setZ(i, col.getZ(i) * factor);
    }
    col.needsUpdate = true;
  }

  return { receiverMeshes: receivers.length, receiverVertices, occluderTriangles, buckets: cache.size, rays, ms: performance.now() - t0 };
}
