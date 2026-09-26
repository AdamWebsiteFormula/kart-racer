// The land around a track: on a sea track (Harbor Loop, Boardwalk Nights) the coast, and on a land
// track the hills, mesas and mountainsides under every raised road. It follows the road out past
// the roadside decor band and then falls to the sea or the ground plane, so houses, palms, stalls,
// lamps, cacti and pines stand on solid ground and no road floats in the air. One heightfield over the track's box: every vertex
// takes the height of the nearest road sample (any branch) and falls away past the flat band. The
// coastline is where that slope meets the water plane, so it is smooth even on a coarse grid.
// Attributes: world-space `uv` (metres), `blend` 0 on the flat top → 1 on the slope (the material
// mixes its two textures by it), `color` darkening the wet sand at the waterline, and `curb`, metres
// past the nearest curb (the PBR look's soft dirt edge there; the toon look reads none of it).
import { BufferAttribute, BufferGeometry, CylinderGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Branches } from '../branches.ts';
import { BUILDER } from '../constants.ts';
import { wrap01 } from '../lut.ts';
import type { LandPoint, RoadIndex } from '../terrain.ts';
import type { FinalLapShiftDef } from '../types.ts';

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
  /** off-road track: the land meets the curb (offroadDrop under the road), no shoulder strip between */
  offroad?: boolean;
  /** an off-road track's land (terrain.ts): its flat top is the kart's ground past the curb, exactly */
  land?: RoadIndex | null;
  /** per branch, 1 at each road sample a race can hide (hideableRoads): the land stays under it */
  hideable?: readonly Uint8Array[];
}

/** Strata tints (multiplied over the texture), bottom to top, one band per 2.4 m. */
const STRATA: readonly (readonly [number, number, number])[] = [[1.08, 0.98, 0.88], [0.8, 0.5, 0.38], [1, 0.78, 0.62], [0.72, 0.44, 0.34], [1.05, 0.9, 0.76], [0.88, 0.6, 0.46]];

/** Below the "water" a land track's hill or cliff falls before it flattens: never seen (hidden under its own opaque ground plane), so left alone. */
const UNDER = 1.2;
/**
 * Below a real sea (`CoastOptions.wet`) the coast keeps sloping before it flattens: deeper than the
 * water shader's own shallow-to-deep fade (art-pipeline surfaces.ts, about 2.5 m to opaque), so the
 * sandy seabed and anything standing in it (pier posts, boat hulls, rocks) never show a cut edge
 * through the translucent shallows. Sources: Nintendo "Ask the Developer" Vol.18 Pt.3 (MKW's shoal
 * floor shows through crystal-clear shallow water; deep water reads as blue) and Digital Foundry's
 * MKW tech review (Adam's water research brief, 26 Sept 2026).
 */
const SEABED_UNDER = 4.5;

/** How far a coast's slope falls before it flattens: SEABED_UNDER on a real sea, UNDER (unchanged) on a land track's hill. */
function coastFall(o: CoastOptions): number { return o.wet ? SEABED_UNDER : UNDER; }
/** The land's top sits this far under the road's outer shoulder, so the two never fight. */
const UNDER_ROAD = 0.12;
/** Metres over which an open edge's cliff falls: near sheer, as the physics has no ground past it. */
const CLIFF = 2.5;

const LP: LandPoint = { top: 0, edge: 0, next: 0, open: false, cover: NaN, lip: NaN, pieces: 0 };
/** landAt's `bore` bits: land at a tunnel's road level, the mesa over a tunnel, over a road, the mesa's foot in a bore (brought down to the road's level). */
const BORE_LOW = 1, BORE_MESA = 2, BORE_ROAD = 4, BORE_PULL = 8;
/** A cell with low land and the mesa, over the road, would be a sheet across a tunnel's mouth: it is never drawn. */
const SHEET = BORE_LOW | BORE_MESA | BORE_ROAD;
const OUT = { y: 0, mix: 0, edge: 0, under: false, bore: 0 };
/** The land's `curb` attribute where no curb is near (or far past one): no dirt edge there. */
const CURB_FAR = 99;

/**
 * The drawn land at (x, z) on an off-road track: terrain.ts's land (what the kart drives on) out to
 * `flat` past where the old shoulder ended, then the eased fall to below the ground plane. Null with
 * no road within reach (the far ground).
 */
export function landAt(land: RoadIndex, o: CoastOptions, x: number, z: number): typeof OUT | null {
  const q = land.query(x, z, LP, BUILDER.shoulderWidth + o.flat + o.slope + 2);
  if (q.pieces === 0) return null;
  const past = q.edge - BUILDER.shoulderWidth;
  const lip = q.open ? 0 : q.lip === q.lip ? q.lip : o.flat, fall = q.open ? CLIFF : o.slope;
  let y = q.top;
  if (past > lip) {
    const k = Math.min(1, (past - lip) / fall);
    y = q.top + (o.waterY - coastFall(o) - q.top) * (k * k * (3 - 2 * k));
  }
  OUT.y = y;
  OUT.mix = Math.max(0, Math.min(1, (past - lip + 1.5) / 3));
  const tunnel = q.cover === q.cover, mesa = q.lip === q.lip;
  OUT.edge = q.edge;
  OUT.under = q.edge < -0.5 && !tunnel;
  // by a tunnel the land keeps out of its bore (bug hunt 3: it used to be cut there, which left holes
  // beside the road before each portal). Just before a portal it is the road's own, at the curb; the
  // mesa's foot inside the portal, where it would stand in the bore, comes down to that level too
  // (buildCoast; the bore and the cliff face hide it). That low land and the mesa above it meet only
  // beside the road: a cell joining them over the road would be a sheet across the mouth.
  const low = tunnel ? (!mesa ? BORE_LOW : y < q.cover ? BORE_LOW | BORE_PULL : 0) : 0;
  OUT.bore = (low || (mesa ? BORE_MESA : 0)) | (q.edge < -0.25 ? BORE_ROAD : 0);
  return OUT;
}

/**
 * The roads a race can hide, per branch (1 at each LUT sample): a shortcut closed on some laps or by
 * the Final Lap Shift, and the main road a route override is still to replace, except where it runs
 * along an open edge (a bridge that goes leaves its chasm). The land is drawn under them, as the
 * kart's land (terrain.ts) runs under them, so it is there when they go (bug hunt 3: a closed
 * shortcut, or Canyon's old road after the collapse, left a road-shaped hole down to the ground).
 */
export function hideableRoads(branches: Branches, shift: FinalLapShiftDef, shifted: boolean): Uint8Array[] {
  const closes = new Set(shift.closesShortcuts ?? []);
  return branches.list.map((b) => {
    const L = b.lut, m = new Uint8Array(L.n);
    if (!b.isMain) { if (b.openOnLaps.length || closes.has(b.id)) m.fill(1); }
    else if (!shifted) {
      for (const ov of shift.routeOverrides ?? []) {
        const span = wrap01(ov.toT - ov.fromT);
        for (let i = 0; i < L.n; i++) if (!L.open[i] && wrap01(i / L.n - ov.fromT) <= span) m[i] = 1;
      }
    }
    return m;
  });
}

export function buildCoast(branches: Branches, o: CoastOptions): BufferGeometry | null {
  // road samples (every other LUT sample is plenty at a 2–3 m grid), bucketed for the search
  const xs: number[] = [], zs: number[] = [], ys: number[] = [], edges: number[] = [], rxs: number[] = [], rzs: number[] = [], opens: number[] = [], tans: number[] = [], fixed: number[] = [];
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, widest = 0;
  for (const b of branches.list) {
    const L = b.lut;
    for (let i = 0; i < L.n; i += 2) {
      const e = L.hw[i] + BUILDER.kerbWidth + BUILDER.shoulderWidth;
      xs.push(L.px[i]); zs.push(L.pz[i]); ys.push(L.py[i]); edges.push(e);
      rxs.push(L.rx[i]); rzs.push(L.rz[i]); opens.push(L.open[i]); tans.push(Math.tan(L.bank[i])); fixed.push(o.hideable?.[b.index]?.[i] ? 0 : 1);
      if (L.px[i] < minX) minX = L.px[i]; if (L.px[i] > maxX) maxX = L.px[i];
      if (L.pz[i] < minZ) minZ = L.pz[i]; if (L.pz[i] > maxZ) maxZ = L.pz[i];
      if (e > widest) widest = e;
    }
  }
  if (!xs.length) return null;
  const seaFall = coastFall(o);
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
  /** metres past the nearest curb (negative under a road): the PBR look's soft dirt edge (art-pipeline surfaces.ts) */
  const curb = new Float32Array(nx * nz).fill(CURB_FAR);
  /** a vertex wholly under a road that is always drawn (a cell of four is never drawn) */
  const under = new Uint8Array(nx * nz);
  /** landAt's `bore` bits (a SHEET cell is never drawn) */
  const bore = new Uint8Array(nx * nz);
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const x = x0 + i * o.cell, z = z0 + j * o.cell, v = j * nx + i;
      const bx = Math.floor(x / B), bz = Math.floor(z / B);
      const at = o.land ? landAt(o.land, o, x, z) : null;
      let best = Infinity, bk = -1, fixedBest = Infinity, fk = -1;
      if (!o.land || (at && (at.edge < 0 || at.bore & BORE_PULL))) for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        const list = buckets.get(key(bx + dx, bz + dz));
        if (!list) continue;
        for (const k of list) {
          const d = (xs[k] - x) * (xs[k] - x) + (zs[k] - z) * (zs[k] - z);
          if (d < best) { best = d; bk = k; }
          if (fixed[k] && d < fixedBest) { fixedBest = d; fk = k; }
        }
      }
      // a road sample's own land here: its curb's level, banked with it
      const ownLand = (k: number) => {
        const curb = edges[k] - BUILDER.shoulderWidth, lat = (x - xs[k]) * rxs[k] + (z - zs[k]) * rzs[k];
        return ys[k] - Math.max(-curb, Math.min(curb, lat)) * tans[k] - BUILDER.offroadDrop;
      };
      // under a road a race can hide the land stays (it lies offroadDrop under it, as beside every curb)
      const inFixed = fk >= 0 ? edges[fk] - BUILDER.shoulderWidth - Math.sqrt(fixedBest) : -1, onFixed = inFixed > 0.5;
      let y = o.waterY - seaFall, mix = 1;
      if (o.land) {
        if (at) { y = at.y; mix = at.mix; under[v] = at.under && onFixed ? 1 : 0; bore[v] = at.bore; curb[v] = Math.min(CURB_FAR, at.edge); }
        // under a road that is always drawn the land never stands above it (at a shortcut's mouth the
        // two roads' land blend; a kept cell reaching over from the shortcut's side must not show),
        // unless it is a mesa over a tunnel
        if (at && inFixed > 0 && !(at.bore & BORE_MESA)) y = Math.min(y, ownLand(fk));
        // the mesa's foot in a bore: down to its road's own land
        if (at && at.bore & BORE_PULL && bk >= 0) y = Math.min(y, ownLand(bk));
      } else if (bk >= 0) {
        // the road's own height at this lateral (a banked road's low edge is below its middle),
        // and the land a little under it, so no grass ever pokes up through the road
        const lat = (x - xs[bk]) * rxs[bk] + (z - zs[bk]) * rzs[bk];
        const latC = Math.max(-edges[bk], Math.min(edges[bk], lat));
        const d = Math.sqrt(best), top = ys[bk] - latC * tans[bk] - (o.offroad ? BUILDER.offroadDrop : BUILDER.shoulderDrop + UNDER_ROAD);
        // an open edge on this side: no flat past the shoulder, and a sheer drop
        const open = (opens[bk] & (lat < 0 ? 1 : 2)) !== 0;
        const lip = edges[bk] + (open ? 0 : o.flat);
        const fall = open ? CLIFF : o.slope;
        if (d <= lip) y = top;
        else {
          const k = Math.min(1, (d - lip) / fall);
          // an eased fall: a soft lip at the top, a gentle beach into the sea
          y = top + (o.waterY - seaFall - top) * (k * k * (3 - 2 * k));
        }
        mix = Math.max(0, Math.min(1, (d - lip + 1.5) / 3));
        under[v] = onFixed ? 1 : 0;
        curb[v] = Math.min(CURB_FAR, d - (edges[bk] - BUILDER.shoulderWidth));
      }
      pos[v * 3] = x; pos[v * 3 + 1] = y; pos[v * 3 + 2] = z;
      uv[v * 2] = x; uv[v * 2 + 1] = z;
      blend[v] = mix;
      // wet sand darkens toward the waterline; under it, darker and a little blue-green with depth
      // (the water shader itself, surfaces.ts, does most of that fading; this just keeps the seabed
      // itself from reading pure white through the shallows) down to the same floor its slope falls
      // to; a cliff shows its rock bands
      let r = 1, gg = 1, bb = 1;
      if (o.wet) {
        if (y >= o.waterY) { const c = 1 - Math.max(0, Math.min(1, 1 - (y - o.waterY) / 0.8)) * 0.3; r = gg = bb = c; }
        else { const depth = Math.min(1, (o.waterY - y) / seaFall); r = 0.7 - depth * 0.28; gg = 0.7 - depth * 0.16; bb = 0.7 - depth * 0.02; }
      }
      if (o.strata && mix > 0.2) {
        const band = STRATA[((Math.floor((y - o.waterY) / 2.4) % STRATA.length) + STRATA.length) % STRATA.length];
        const k = Math.min(1, (mix - 0.2) / 0.5);
        r *= 1 + (band[0] - 1) * k; gg *= 1 + (band[1] - 1) * k; bb *= 1 + (band[2] - 1) * k;
      }
      col[v * 3] = r; col[v * 3 + 1] = gg; col[v * 3 + 2] = bb;
    }
  }

  // land tracks keep the old, tight cull (anything even slightly under the "water" is hidden under
  // its own opaque ground plane anyway); a real sea only culls once a quad has reached the flattened
  // floor `seaFall` metres down, so the newly deepened, gently-sloping seabed survives to be seen
  // through the translucent shallows (surfaces.ts)
  const cullBelow = o.wet ? o.waterY - seaFall - 0.05 : o.waterY - 0.05;
  const index: number[] = [];
  for (let j = 0; j < nz - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
      if (under[a] && under[b] && under[c] && under[d]) continue;
      if (Math.max(pos[a * 3 + 1], pos[b * 3 + 1], pos[c * 3 + 1], pos[d * 3 + 1]) < cullBelow) continue; // flattened at the floor: nothing left to show
      if (((bore[a] | bore[b] | bore[c]) & SHEET) !== SHEET) index.push(a, c, b);
      if (((bore[b] | bore[c] | bore[d]) & SHEET) !== SHEET) index.push(b, c, d);
    }
  }
  if (!index.length) return null;
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('uv', new BufferAttribute(uv, 2));
  g.setAttribute('color', new BufferAttribute(col, 3));
  g.setAttribute('blend', new BufferAttribute(blend, 1));
  g.setAttribute('curb', new BufferAttribute(curb, 1));
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
