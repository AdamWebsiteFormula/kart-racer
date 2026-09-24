// The edge of a pier or a sky road (Adam, 23 Sept 2026: no stumps, "do what Mario Kart World does"):
// a solid low edge along the road where the kart physics stops you, a plank kickboard with a neon
// strip on Boardwalk Nights, a gold parapet on Skyline Circuit. Off-road tracks have none: their
// ground runs to an invisible course limit and the scenery lines it. Swept along every open branch,
// broken at open edges and at shortcut mouths. One mesh.
import { BufferGeometry, DoubleSide, Float32BufferAttribute, Mesh, MeshToonMaterial, type Texture } from 'three';
import type { Branches } from '../branches.ts';
import { BUILDER } from '../constants.ts';
import { insideRoadEnvelope } from './decor.ts';
import { glowFromVertexColours } from './glow.ts';
import type { Rgb } from './palette.ts';

/** A cross-section: points outward from the wall's inner face (dx metres out, y metres up), bottom to top colour, bumpiness. */
interface Profile { pts: readonly (readonly [number, number])[]; foot: Rgb; top: Rgb; bump: number; rail?: boolean }

const PROFILES: Readonly<Record<string, Profile>> = Object.freeze({
  // a pier's edge: a solid plank kickboard with a neon strip along its top (lights itself)
  boardwalk: { pts: [[0, -0.3], [0, 0.5], [0.05, 0.56], [0.25, 0.56], [0.3, 0.5], [0.3, -0.3]], foot: [0.2, 0.15, 0.32], top: [0.3, 1.9, 2.2], bump: 0, rail: true },
  // a sky road's edge: a smooth gold parapet with a bright gilded lip
  skyline: { pts: [[0, -0.3], [0, 0.55], [0.06, 0.62], [0.28, 0.62], [0.34, 0.55], [0.34, -0.3]], foot: [0.78, 0.55, 0.12], top: [1.05, 0.86, 0.35], bump: 0, rail: true },
});

const hash = (i: number) => { const x = Math.sin(i * 127.1) * 43758.5453; return x - Math.floor(x); };

/** The solid low edge for a pier or a sky road, at the curb's outer edge. Null for a biome with none. */
export function buildBoundary(branches: Branches, biome: string, gradientMap: Texture | null): Mesh | null {
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
        const wall = hw + BUILDER.kerbWidth;
        const open = (lut.open[j] & (side < 0 ? 1 : 2)) !== 0;
        const u = i / lut.step;
        const foot = lut.sample(u, side * wall).position;
        const blocked = open || (branches.list.length > 1 && insideRoadEnvelope(branches, foot[0], foot[2], b.index, BUILDER.kerbWidth + 0.5));
        if (blocked) { prev = -1; continue; }
        const baseY = foot[1];
        const bump = 1 + (hash(i * 3 + (side > 0 ? 1 : 0) + b.index * 7919) - 0.5) * 2 * prof.bump;
        const rx = lut.rx[j] * side, rz = lut.rz[j] * side;
        const ring = pos.length / 3;
        for (let k = 0; k < P; k++) {
          const [dx, y] = prof.pts[k];
          const yy = prof.rail ? y : y * (y > 0 ? bump : 1);
          pos.push(foot[0] + rx * dx, baseY + yy, foot[2] + rz * dx);
          const f = k >= 2 && k <= 3 ? 1 : 0; // the top two points carry the lip colour (neon, gilt)
          const c: Rgb = [prof.foot[0] + (prof.top[0] - prof.foot[0]) * f, prof.foot[1] + (prof.top[1] - prof.foot[1]) * f, prof.foot[2] + (prof.top[2] - prof.foot[2]) * f];
          const shade = 1;
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
  glowFromVertexColours(mat); // the neon strip lights itself
  const m = new Mesh(g, mat);
  m.name = 'boundary';
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
