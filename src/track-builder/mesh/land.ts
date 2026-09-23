// The land around a track: on a sea track (Harbor Loop, Boardwalk Nights) the coast, and on a land
// track the hills, mesas and mountainsides under every raised road. It follows the road out past
// the roadside decor band and then falls to the sea or the ground plane, so houses, palms, stalls,
// lamps, cacti and pines stand on solid ground and no road floats in the air. One heightfield over the track's box: every vertex
// takes the height of the nearest road sample (any branch) and falls away past the flat band. The
// coastline is where that slope meets the water plane, so it is smooth even on a coarse grid.
// Attributes: world-space `uv` (metres), `blend` 0 on the flat top → 1 on the slope (the material
// mixes its two textures by it), and `color` darkening the wet sand at the waterline.
import { BufferAttribute, BufferGeometry, CylinderGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Branches } from '../branches.ts';
import { BUILDER } from '../constants.ts';

export interface CoastOptions {
  /** the sea plane's height */
  waterY: number;
  /** metres of flat land past the shoulder (the roadside decor stands here) */
  flat: number;
  /** metres over which the land falls from the flat top to below the sea */
  slope: number;
  /** grid cell, metres */
  cell: number;
  /** a sea: the sand darkens toward the waterline */
  wet?: boolean;
  /** rock strata: bands of colour down the slope (canyon cliffs) */
  strata?: boolean;
}

/** Strata tints (multiplied over the texture), bottom to top, one band per 2.4 m. */
const STRATA: readonly (readonly [number, number, number])[] = [[1.08, 0.98, 0.88], [0.8, 0.5, 0.38], [1, 0.78, 0.62], [0.72, 0.44, 0.34], [1.05, 0.9, 0.76], [0.88, 0.6, 0.46]];

/** Below the sea by this much the slope stops: nothing there shows. */
const UNDER = 1.2;
/** Metres over which an open edge's cliff falls: near sheer, as the physics has no ground past it. */
const CLIFF = 2.5;

export function buildCoast(branches: Branches, o: CoastOptions): BufferGeometry | null {
  // road samples (every other LUT sample is plenty at a 2–3 m grid), bucketed for the search
  const xs: number[] = [], zs: number[] = [], ys: number[] = [], edges: number[] = [], rxs: number[] = [], rzs: number[] = [], opens: number[] = [];
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, widest = 0;
  for (const b of branches.list) {
    const L = b.lut;
    for (let i = 0; i < L.n; i += 2) {
      const e = L.hw[i] + BUILDER.kerbWidth + BUILDER.shoulderWidth;
      xs.push(L.px[i]); zs.push(L.pz[i]); ys.push(L.py[i]); edges.push(e);
      rxs.push(L.rx[i]); rzs.push(L.rz[i]); opens.push(L.open[i]);
      if (L.px[i] < minX) minX = L.px[i]; if (L.px[i] > maxX) maxX = L.px[i];
      if (L.pz[i] < minZ) minZ = L.pz[i]; if (L.pz[i] > maxZ) maxZ = L.pz[i];
      if (e > widest) widest = e;
    }
  }
  if (!xs.length) return null;
  const reach = widest + o.flat + o.slope;
  const B = Math.max(8, reach);
  const buckets = new Map<number, number[]>();
  const key = (bx: number, bz: number) => (bx * 73856093) ^ (bz * 19349663);
  for (let k = 0; k < xs.length; k++) {
    const kk = key(Math.floor(xs[k] / B), Math.floor(zs[k] / B));
    let list = buckets.get(kk);
    if (!list) buckets.set(kk, (list = []));
    list.push(k);
  }

  const x0 = minX - reach, z0 = minZ - reach;
  const nx = Math.ceil((maxX - minX + 2 * reach) / o.cell) + 1, nz = Math.ceil((maxZ - minZ + 2 * reach) / o.cell) + 1;
  const pos = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2), col = new Float32Array(nx * nz * 3), blend = new Float32Array(nx * nz);
  /** a vertex wholly under the road surface (a cell of four is never drawn) */
  const under = new Uint8Array(nx * nz);
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const x = x0 + i * o.cell, z = z0 + j * o.cell, v = j * nx + i;
      const bx = Math.floor(x / B), bz = Math.floor(z / B);
      let best = Infinity, bk = -1;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        const list = buckets.get(key(bx + dx, bz + dz));
        if (!list) continue;
        for (const k of list) {
          const d = (xs[k] - x) * (xs[k] - x) + (zs[k] - z) * (zs[k] - z);
          if (d < best) { best = d; bk = k; }
        }
      }
      let y = o.waterY - UNDER, mix = 1;
      if (bk >= 0) {
        const d = Math.sqrt(best), top = ys[bk] - BUILDER.shoulderDrop;
        // an open edge on this side: no flat past the shoulder, and a sheer drop
        const lat = (x - xs[bk]) * rxs[bk] + (z - zs[bk]) * rzs[bk];
        const open = (opens[bk] & (lat < 0 ? 1 : 2)) !== 0;
        const lip = edges[bk] + (open ? 0 : o.flat);
        const fall = open ? CLIFF : o.slope;
        if (d <= lip) y = top;
        else {
          const k = Math.min(1, (d - lip) / fall);
          // an eased fall: a soft lip at the top, a gentle beach into the sea
          y = top + (o.waterY - UNDER - top) * (k * k * (3 - 2 * k));
        }
        mix = Math.max(0, Math.min(1, (d - lip + 1.5) / 3));
        under[v] = d < edges[bk] - BUILDER.shoulderWidth - 0.5 ? 1 : 0;
      }
      pos[v * 3] = x; pos[v * 3 + 1] = y; pos[v * 3 + 2] = z;
      uv[v * 2] = x; uv[v * 2 + 1] = z;
      blend[v] = mix;
      // wet sand darkens toward the waterline; a cliff shows its rock bands
      let r = 1, gg = 1, bb = 1;
      if (o.wet) { const c = 1 - Math.max(0, Math.min(1, 1 - (y - o.waterY) / 0.8)) * 0.3; r = gg = bb = c; }
      if (o.strata && mix > 0.2) {
        const band = STRATA[((Math.floor((y - o.waterY) / 2.4) % STRATA.length) + STRATA.length) % STRATA.length];
        const k = Math.min(1, (mix - 0.2) / 0.5);
        r *= 1 + (band[0] - 1) * k; gg *= 1 + (band[1] - 1) * k; bb *= 1 + (band[2] - 1) * k;
      }
      col[v * 3] = r; col[v * 3 + 1] = gg; col[v * 3 + 2] = bb;
    }
  }

  const index: number[] = [];
  for (let j = 0; j < nz - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
      if (under[a] && under[b] && under[c] && under[d]) continue;
      if (Math.max(pos[a * 3 + 1], pos[b * 3 + 1], pos[c * 3 + 1], pos[d * 3 + 1]) < o.waterY - 0.05) continue; // all under the sea
      index.push(a, c, b, b, c, d);
    }
  }
  if (!index.length) return null;
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('uv', new BufferAttribute(uv, 2));
  g.setAttribute('color', new BufferAttribute(col, 3));
  g.setAttribute('blend', new BufferAttribute(blend, 1));
  g.setIndex(index);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  g.computeBoundingBox();
  return g;
}

function painted(g: BufferGeometry, r: number, gg: number, b: number): BufferGeometry {
  g.deleteAttribute('uv');
  const n = g.getAttribute('position').count, c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { c[i * 3] = r; c[i * 3 + 1] = gg; c[i * 3 + 2] = b; }
  g.setAttribute('color', new BufferAttribute(c, 3));
  return g.index ? g.toNonIndexed() : g;
}

/**
 * A round wooden pier for something out at sea (a circus tent, the Ferris wheel): a plank deck of
 * `radius` whose top is at y = 0, a darker rim, and posts down past the water `lift` below. Vertex
 * coloured; one geometry per size, merged.
 */
export function buildPier(radius: number, lift: number): BufferGeometry {
  const parts: BufferGeometry[] = [];
  parts.push(painted(new CylinderGeometry(radius, radius, 0.32, 28).translate(0, -0.16, 0), 0.54, 0.39, 0.27));
  parts.push(painted(new CylinderGeometry(radius + 0.12, radius + 0.12, 0.2, 28, 1, true).translate(0, -0.2, 0), 0.36, 0.24, 0.16));
  const posts = Math.max(6, Math.round(radius * 2.2));
  for (let k = 0; k < posts; k++) {
    const a = (k / posts) * Math.PI * 2, r = radius * 0.86;
    parts.push(painted(new CylinderGeometry(0.2, 0.22, lift + 2.4, 8).translate(Math.cos(a) * r, -(lift + 2.4) / 2, Math.sin(a) * r), 0.33, 0.22, 0.15));
  }
  const g = mergeGeometries(parts, false)!;
  g.computeBoundingSphere();
  return g;
}
