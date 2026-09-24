// The merged dressing (MKW-density scenery, 24 Sept 2026): every copy of every code-built,
// vertex-coloured prop that a track marks `merge` is baked into a few static meshes, one per slice
// of the track round its centre, so a village, a fence line, a forest and the snow drifts cost one
// draw call per slice instead of one per kind. Pure: geometry in, geometry out.
import { BufferAttribute, BufferGeometry, Matrix3, Matrix4, Vector3 } from 'three';

/** Copies of one geometry: `count` column-major matrices in `matrices`. */
export interface MergeItem { geometry: BufferGeometry; matrices: Float32Array; count: number }

const M = new Matrix4(), N = new Matrix3(), V = new Vector3();

/**
 * One indexed geometry holding every copy of every item, positions and normals moved by each
 * matrix, colours kept. Items must carry position, normal and color (ModelBuilder output); null
 * when there is nothing to merge.
 */
export function mergeInstances(items: readonly MergeItem[]): BufferGeometry | null {
  let verts = 0, tris = 0;
  for (const it of items) {
    verts += it.geometry.getAttribute('position').count * it.count;
    tris += (it.geometry.index ? it.geometry.index.count : it.geometry.getAttribute('position').count) * it.count;
  }
  if (verts === 0) return null;
  const pos = new Float32Array(verts * 3), nor = new Float32Array(verts * 3), col = new Float32Array(verts * 3);
  const index = new Uint32Array(tris);
  let v = 0, k = 0;
  for (const it of items) {
    const g = it.geometry, p = g.getAttribute('position'), n = g.getAttribute('normal'), c = g.getAttribute('color'), idx = g.index;
    for (let i = 0; i < it.count; i++) {
      M.fromArray(it.matrices, i * 16);
      N.getNormalMatrix(M);
      for (let j = 0; j < p.count; j++) {
        V.fromBufferAttribute(p, j).applyMatrix4(M);
        pos[(v + j) * 3] = V.x; pos[(v + j) * 3 + 1] = V.y; pos[(v + j) * 3 + 2] = V.z;
        V.fromBufferAttribute(n, j).applyMatrix3(N).normalize();
        nor[(v + j) * 3] = V.x; nor[(v + j) * 3 + 1] = V.y; nor[(v + j) * 3 + 2] = V.z;
        col[(v + j) * 3] = c.getX(j); col[(v + j) * 3 + 1] = c.getY(j); col[(v + j) * 3 + 2] = c.getZ(j);
      }
      if (idx) for (let j = 0; j < idx.count; j++) index[k++] = v + idx.getX(j);
      else for (let j = 0; j < p.count; j++) index[k++] = v + j;
      v += p.count;
    }
  }
  const out = new BufferGeometry();
  out.setAttribute('position', new BufferAttribute(pos, 3));
  out.setAttribute('normal', new BufferAttribute(nor, 3));
  out.setAttribute('color', new BufferAttribute(col, 3));
  out.setIndex(new BufferAttribute(index, 1));
  out.computeBoundingBox();
  out.computeBoundingSphere();
  return out;
}

/** Slices round the track's centre for the dressing near the road (they cast shadows) and far from it (they do not). */
export const DRESSING_SLICES = Object.freeze({ near: 4, far: 2 });

/** Which of `slices` wedges round (cx, cz) holds (x, z). */
export function sliceOf(x: number, z: number, cx: number, cz: number, slices: number): number {
  const a = (Math.atan2(z - cz, x - cx) + Math.PI) / (Math.PI * 2);
  return Math.min(slices - 1, Math.floor(a * slices));
}
