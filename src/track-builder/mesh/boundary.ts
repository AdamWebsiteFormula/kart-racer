// The course boundary (Adam, 23 Sept 2026: "replace our invisible-wall stumps with real off-road
// terrain and physical boundaries"): on an off-road track a continuous wall stands where the kart
// physics stops you, past the off-road band (a hedge on Meadow Run, a sandstone wall on Canyon Rush,
// a snowbank on Frostbite Pass, a sea wall on Harbor Loop); on a pier or a sky road a continuous
// rail runs through the posts at the road's edge (neon on Boardwalk Nights, gold on Skyline Circuit).
// Swept along every open branch, broken at open edges and at shortcut mouths. One mesh.
import { BufferGeometry, DoubleSide, Float32BufferAttribute, Mesh, MeshToonMaterial, type Texture } from 'three';
import type { Branches } from '../branches.ts';
import { BUILDER } from '../constants.ts';
import { insideRoadEnvelope } from './decor.ts';
import { glowFromVertexColours } from './glow.ts';
import type { Rgb } from './palette.ts';

/** A cross-section: points outward from the wall's inner face (dx metres out, y metres up), bottom to top colour, bumpiness. */
interface Profile { pts: readonly (readonly [number, number])[]; foot: Rgb; top: Rgb; bump: number; rail?: boolean }

const PROFILES: Readonly<Record<string, Profile>> = Object.freeze({
  meadow: { pts: [[0, -0.2], [0, 0.95], [0.18, 1.08], [0.72, 1.08], [0.9, 0.95], [0.9, -0.2]], foot: [0.2, 0.42, 0.14], top: [0.42, 0.7, 0.25], bump: 0.12 },          // a clipped hedge
  canyon: { pts: [[0, -0.2], [0.05, 0.72], [0.35, 0.9], [0.8, 0.78], [1.05, -0.2]], foot: [0.62, 0.3, 0.18], top: [0.86, 0.52, 0.32], bump: 0.16 },                // a sandstone wall
  frost: { pts: [[0, -0.2], [0.18, 0.62], [0.55, 0.98], [1.0, 0.72], [1.4, -0.2]], foot: [0.8, 0.86, 0.95], top: [1, 1, 1], bump: 0.14 },                        // a snowbank
  harbour: { pts: [[0, -0.2], [0, 0.78], [0.08, 0.88], [0.62, 0.88], [0.62, -0.2]], foot: [0.66, 0.63, 0.57], top: [0.86, 0.83, 0.76], bump: 0.02 },             // a stone sea wall
  boardwalk: { pts: [[-0.06, 0.86], [0.06, 0.86], [0.06, 0.98], [-0.06, 0.98], [-0.06, 0.86]], foot: [0.3, 1.9, 2.2], top: [0.3, 1.9, 2.2], bump: 0, rail: true }, // a neon rail (lights itself)
  skyline: { pts: [[-0.05, 0.8], [0.05, 0.8], [0.05, 0.9], [-0.05, 0.9], [-0.05, 0.8]], foot: [0.95, 0.7, 0.08], top: [1, 0.8, 0.2], bump: 0, rail: true },        // a gold rail
});

const hash = (i: number) => { const x = Math.sin(i * 127.1) * 43758.5453; return x - Math.floor(x); };

/**
 * The boundary for a biome: `offroad` puts the wall past the off-road band (as the kart physics
 * does, TrackSample.wall), else a rail runs through the posts at the curb. Null for a biome with none.
 */
export function buildBoundary(branches: Branches, biome: string, offroad: boolean, gradientMap: Texture | null): Mesh | null {
  const prof = PROFILES[biome];
  if (!prof) return null;
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const P = prof.pts.length;
  for (const b of branches.list) {
    if (!b.open) continue;
    const lut = b.lut;
    const step = 2;
    for (const side of [-1, 1] as const) {
      let prev = -1; // vertex index of the previous kept ring, or -1
      for (let i = 0; i <= lut.step; i += step) {
        const j = lut.idx(i);
        if (!lut.closed && i > lut.step) break;
        const hw = lut.hw[j];
        const wall = offroad ? hw + BUILDER.kerbWidth + BUILDER.shoulderWidth : hw + BUILDER.kerbWidth;
        const open = (lut.open[j] & (side < 0 ? 1 : 2)) !== 0;
        const u = i / lut.step;
        const foot = lut.sample(u, side * wall).position;
        const blocked = open || (branches.list.length > 1 && insideRoadEnvelope(branches, foot[0], foot[2], b.index, BUILDER.kerbWidth + 0.5));
        if (blocked) { prev = -1; continue; }
        const baseY = foot[1] - (offroad ? BUILDER.shoulderDrop : 0);
        const bump = 1 + (hash(i * 3 + (side > 0 ? 1 : 0) + b.index * 7919) - 0.5) * 2 * prof.bump;
        const rx = lut.rx[j] * side, rz = lut.rz[j] * side;
        const ring = pos.length / 3;
        for (let k = 0; k < P; k++) {
          const [dx, y] = prof.pts[k];
          const yy = prof.rail ? y : y * (y > 0 ? bump : 1);
          pos.push(foot[0] + rx * dx, baseY + yy, foot[2] + rz * dx);
          const f = prof.rail ? 1 : Math.max(0, Math.min(1, (y + 0.2) / 1.2));
          const c: Rgb = [prof.foot[0] + (prof.top[0] - prof.foot[0]) * f, prof.foot[1] + (prof.top[1] - prof.foot[1]) * f, prof.foot[2] + (prof.top[2] - prof.foot[2]) * f];
          const shade = prof.rail ? 1 : 0.94 + hash(i + k * 13) * 0.1;
          col.push(c[0] * shade, c[1] * shade, c[2] * shade);
        }
        if (prev >= 0) {
          for (let k = 0; k + 1 < P; k++) {
            const a = prev + k, c2 = ring + k;
            idx.push(a, c2, a + 1, a + 1, c2, c2 + 1);
          }
        }
        prev = ring;
      }
    }
  }
  if (!idx.length) return null;
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const mat = new MeshToonMaterial({ vertexColors: true, gradientMap, side: DoubleSide });
  glowFromVertexColours(mat); // the neon rail lights itself
  const m = new Mesh(g, mat);
  m.name = 'boundary';
  m.castShadow = !prof.rail;
  m.receiveShadow = true;
  return m;
}
