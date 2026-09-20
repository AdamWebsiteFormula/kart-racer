// Instance transforms for decor, barriers and features. Pure maths over the sim layer;
// deterministic: decor is seeded by hash(track.id) so two builds give identical matrices.
import { Matrix4, Quaternion, Vector3 } from 'three';
import type { Branches } from '../branches.ts';
import { BUILDER } from '../constants.ts';
import type { Lut } from '../lut.ts';
import type { DecorBand, EnvironmentDef, Vec3 } from '../types.ts';
import { headingOf } from '../../kart-controller/types.ts';

/** FNV-1a 32-bit. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** mulberry32: small, fast, deterministic. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const M = new Matrix4();
const P = new Vector3();
const Q = new Quaternion();
const S = new Vector3();
const UP = new Vector3(0, 1, 0);

/** position + yaw + uniform (or per-axis) scale → 16 floats appended to `out`. */
export function pushTransform(out: number[], position: Vec3, yaw: number, scale: Vec3 = [1, 1, 1]): void {
  P.set(position[0], position[1], position[2]);
  Q.setFromAxisAngle(UP, yaw);
  S.set(scale[0], scale[1], scale[2]);
  M.compose(P, Q, S);
  for (let i = 0; i < 16; i++) out.push(M.elements[i]);
}

/** Squared XZ distance to the nearest LUT sample and that sample's halfWidth. Coarse stride then refine. */
function nearestXZ(lut: Lut, x: number, z: number): { d2: number; hw: number } {
  const step = BUILDER.globalSearchStep;
  let best = 0, bestD = Infinity;
  for (let i = 0; i < lut.n; i += step) {
    const dx = lut.px[i] - x, dz = lut.pz[i] - z;
    const d = dx * dx + dz * dz;
    if (d < bestD) { bestD = d; best = i; }
  }
  for (let k = -step; k <= step; k++) {
    const i = lut.idx(best + k);
    const dx = lut.px[i] - x, dz = lut.pz[i] - z;
    const d = dx * dx + dz * dz;
    if (d < bestD) { bestD = d; best = i; }
  }
  return { d2: bestD, hw: lut.hw[best] };
}

/** Full envelope past the road edge: kerb + shoulder + 1 m air. */
export const ENVELOPE_PAD = BUILDER.kerbWidth + BUILDER.shoulderWidth + 1;

/** Is (x, z) within `pad` metres past any branch's road edge? `except` skips one branch index. */
export function insideRoadEnvelope(branches: Branches, x: number, z: number, except = -1, pad = ENVELOPE_PAD): boolean {
  for (const b of branches.list) {
    if (b.index === except) continue;
    const { d2, hw } = nearestXZ(b.lut, x, z);
    const r = hw + pad;
    if (d2 < r * r) return true;
  }
  return false;
}

export interface DecorPlacement {
  asset: string;
  band: DecorBand;
  /** 16 floats per instance, column-major */
  matrices: Float32Array;
  count: number;
}

/**
 * Place `instances` of one decor entry in its band. roadside: 8–14 m past the road edge
 * at road height minus the shoulder drop. far: 30–120 m from the centreline at ground
 * height. sky: 25–60 m above the road. Anything inside a road envelope is rejected and
 * retried; the RNG is shared across entries so order matters and is fixed by the JSON.
 */
export function placeDecor(branches: Branches, entry: NonNullable<EnvironmentDef['decor']>[number], rng: () => number, groundY: number): DecorPlacement {
  const main = branches.main.lut;
  const band = BUILDER.decorBands[entry.band];
  const out: number[] = [];
  let placed = 0;
  const maxTries = entry.instances * 20;
  for (let tries = 0; placed < entry.instances && tries < maxTries; tries++) {
    const t = rng();
    const side = rng() < 0.5 ? -1 : 1;
    const dist = band[0] + (band[1] - band[0]) * rng();
    const yaw = rng() * Math.PI * 2;
    const scale = 0.85 + 0.3 * rng();
    const c = main.sample(t, 0);
    let x: number, y: number, z: number;
    if (entry.band === 'sky') {
      const lateral = side * (c.halfWidth + 10 + 30 * rng());
      x = c.position[0] + c.tangent[2] * lateral;
      z = c.position[2] - c.tangent[0] * lateral;
      y = c.position[1] + dist;
    } else {
      const lateral = side * (entry.band === 'roadside' ? c.halfWidth + BUILDER.kerbWidth + dist : dist);
      x = c.position[0] + c.tangent[2] * lateral;
      z = c.position[2] - c.tangent[0] * lateral;
      y = entry.band === 'roadside' ? c.position[1] - BUILDER.shoulderDrop : groundY;
      if (insideRoadEnvelope(branches, x, z)) continue;
    }
    pushTransform(out, [x, y, z], yaw, [scale, scale, scale]);
    placed++;
  }
  return { asset: entry.asset, band: entry.band, matrices: Float32Array.from(out), count: placed };
}

/**
 * Barrier posts every BARRIER_SPACING metres on both edges of every OPEN branch, at
 * halfWidth + KERB_WIDTH, facing along the road. A post inside another branch's road
 * envelope is skipped so shortcut mouths stay open.
 */
export function placeBarriers(branches: Branches): Float32Array {
  const out: number[] = [];
  for (const b of branches.list) {
    if (!b.open) continue;
    const lut = b.lut;
    const count = Math.max(1, Math.floor(lut.length / BUILDER.barrierSpacing));
    const last = lut.closed ? count : count - 1;
    for (let i = 0; i < count; i++) {
      const u = last === 0 ? 0 : i / last;
      const c = lut.sample(u, 0);
      const yaw = headingOf(c.tangent);
      for (const side of [-1, 1]) {
        const p = lut.sample(u, side * (c.halfWidth + BUILDER.kerbWidth)).position;
        if (branches.list.length > 1 && insideRoadEnvelope(branches, p[0], p[2], b.index, BUILDER.kerbWidth + 0.5)) continue;
        pushTransform(out, p, yaw);
      }
    }
  }
  return Float32Array.from(out);
}
