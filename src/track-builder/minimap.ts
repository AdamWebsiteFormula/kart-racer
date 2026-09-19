// Minimap outline: left/right road-edge polylines per branch, fitted into the unit
// square with padding. x → u, z → v. Uniform scale so the shape is not stretched.
import type { Branches } from './branches.ts';
import { BUILDER } from './constants.ts';
import type { Vec3 } from './types.ts';

export interface MinimapOutline {
  branch: number;
  open: boolean;
  /** u,v pairs */
  left: Float32Array;
  right: Float32Array;
}

export interface Minimap {
  outlines: MinimapOutline[];
  /** world → unit square */
  toMinimap(position: Vec3): [number, number];
  readonly scale: number;
  readonly offsetX: number;
  readonly offsetZ: number;
}

export function buildMinimap(branches: Branches): Minimap {
  const n = BUILDER.minimapSamples;
  const pad = BUILDER.minimapPadding;
  const raw: { branch: number; open: boolean; left: number[]; right: number[] }[] = [];
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const b of branches.list) {
    const left: number[] = [], right: number[] = [];
    const count = b.isMain ? n : Math.max(8, Math.round((n * b.lut.length) / branches.main.lut.length));
    const last = b.isMain ? count : count - 1;
    for (let i = 0; i < count; i++) {
      const u = i / last;
      const c = b.lut.sample(u, 0);
      const hw = c.halfWidth;
      const l = b.lut.sample(u, -hw).position;
      const r = b.lut.sample(u, hw).position;
      left.push(l[0], l[2]);
      right.push(r[0], r[2]);
      for (const p of [l, r]) {
        if (p[0] < minX) minX = p[0];
        if (p[0] > maxX) maxX = p[0];
        if (p[2] < minZ) minZ = p[2];
        if (p[2] > maxZ) maxZ = p[2];
      }
    }
    raw.push({ branch: b.index, open: b.open, left, right });
  }
  const w = maxX - minX || 1, h = maxZ - minZ || 1;
  const scale = (1 - 2 * pad) / Math.max(w, h);
  // centre the smaller axis
  const offsetX = pad + ((1 - 2 * pad) - w * scale) / 2 - minX * scale;
  const offsetZ = pad + ((1 - 2 * pad) - h * scale) / 2 - minZ * scale;
  const toMinimap = (p: Vec3): [number, number] => [p[0] * scale + offsetX, p[2] * scale + offsetZ];
  const fit = (xz: number[]): Float32Array => {
    const out = new Float32Array(xz.length);
    for (let i = 0; i < xz.length; i += 2) {
      out[i] = xz[i] * scale + offsetX;
      out[i + 1] = xz[i + 1] * scale + offsetZ;
    }
    return out;
  };
  return {
    outlines: raw.map((r) => ({ branch: r.branch, open: r.open, left: fit(r.left), right: fit(r.right) })),
    toMinimap,
    scale,
    offsetX,
    offsetZ,
  };
}
