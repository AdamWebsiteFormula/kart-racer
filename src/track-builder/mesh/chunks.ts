// Equal-u chunks per branch, one Mesh each, sharing ONE MeshToonMaterial. The main line
// gets CHUNK_COUNT chunks; a branch gets a count proportional to its length (≥ 1) so
// two shortcuts do not triple the chunk draw calls. A Final Lap Shift rebuilds only the
// main chunks whose t range touches a changed range, or every main chunk when the route
// (and so every LUT sample) moved. Branch LUTs never change, so branch chunks never rebuild.
import { Mesh, type Material } from 'three';
import type { Branch } from '../branches.ts';
import { BUILDER } from '../constants.ts';
import { tInRange } from '../shift.ts';
import type { TrackPalette } from './palette.ts';
import { buildRibbon, type RibbonOptions } from './road.ts';

export interface Chunk {
  branch: number;
  index: number;
  /** local u range on the branch LUT */
  u0: number;
  u1: number;
  mesh: Mesh;
}

export function chunkCountFor(branch: Branch, main: Branch): number {
  if (branch.isMain) return BUILDER.chunkCount;
  return Math.max(1, Math.round((BUILDER.chunkCount * branch.lut.length) / main.lut.length));
}

/** A shortcut ribbon blends into the main road at both ends; the main line never does. */
export function ribbonOptions(branch: Branch): RibbonOptions {
  if (branch.isMain) return {};
  return { blend: Math.min(0.45, BUILDER.branchBlendMetres / branch.lut.length) };
}

export function buildBranchChunks(branch: Branch, main: Branch, palette: TrackPalette, material: Material): Chunk[] {
  const n = chunkCountFor(branch, main);
  const out: Chunk[] = [];
  for (let i = 0; i < n; i++) {
    const u0 = i / n, u1 = (i + 1) / n;
    const mesh = new Mesh(buildRibbon(branch.lut, u0, u1, palette, ribbonOptions(branch)), material);
    mesh.name = `track-chunk-${branch.id}-${i}`;
    mesh.receiveShadow = true;
    out.push({ branch: branch.index, index: i, u0, u1, mesh });
  }
  return out;
}

export function rebuildChunk(chunk: Chunk, branch: Branch, palette: TrackPalette): void {
  chunk.mesh.geometry.dispose();
  chunk.mesh.geometry = buildRibbon(branch.lut, chunk.u0, chunk.u1, palette, ribbonOptions(branch));
}

/** Do two wrap-aware t ranges overlap? */
function rangesTouch(a0: number, a1: number, b0: number, b1: number): boolean {
  return tInRange(a0, b0, b1) || tInRange(a1, b0, b1) || tInRange(b0, a0, a1) || tInRange(b1, a0, a1);
}

/** Does any changed main-line range touch this chunk (in main-equivalent t)? */
export function chunkTouched(chunk: Chunk, branch: Branch, changedRanges: readonly [number, number][]): boolean {
  const t0 = branch.toMain(chunk.u0);
  const t1 = branch.isMain && chunk.u1 === 1 ? 1 : branch.toMain(chunk.u1);
  return changedRanges.some(([a, b]) => rangesTouch(t0, t1, a, b));
}
