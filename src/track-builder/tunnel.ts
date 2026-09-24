// Tunnels (a shortcut's `tunnel` stretch: Canyon Rush's mine). Laid once on the shortcut from its
// def: its road line as world points, and the mesa over it (the land stands tunnelHill above the
// road, rising over tunnelRamp from each portal). Any road that runs along that line (the shortcut,
// and the main line once a route change takes the same road) is covered there: rock walls at the
// curb, no off-road. Just before a portal the off-road beside the road narrows to the curb over
// tunnelFunnel metres, so a kart on the grass is guided into the mouth, not pushed through the hill.
// No Three.js in here (mesh/tunnel.ts draws it).
import { BUILDER } from './constants.ts';
import type { Lut } from './lut.ts';

export interface TunnelLine {
  /** the shortcut it runs on, and its portals as sample indices on that shortcut's LUT */
  lut: Lut;
  i0: number;
  i1: number;
  /** world points along its road centre, portal to portal */
  x: Float64Array;
  y: Float64Array;
  z: Float64Array;
  minX: number; maxX: number; minZ: number; maxZ: number;
}

/** Metres before each portal the land is kept out of the bore too (its cells straddle the portal line). */
const PORTAL_CLEAR = 3;

const smooth = (k: number): number => { const c = k < 0 ? 0 : k > 1 ? 1 : k; return c * c * (3 - 2 * c); };

/** Lay a tunnel on its shortcut's LUT (from, to: fractions of the shortcut). */
export function layTunnel(lut: Lut, from: number, to: number): TunnelLine {
  const i0 = Math.round(from * lut.step), i1 = Math.round(to * lut.step), ds = lut.length / lut.step;
  const n = i1 - i0 + 1;
  const x = new Float64Array(n), y = new Float64Array(n), z = new Float64Array(n);
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = Math.max(0, i0 - Math.ceil(PORTAL_CLEAR / ds)); i <= Math.min(lut.n - 1, i1 + Math.ceil(PORTAL_CLEAR / ds)); i++) lut.bore[i] = BUILDER.tunnelApex + 0.8;
  for (let i = i0; i <= i1; i++) {
    const d = Math.min(i - i0, i1 - i) * ds;
    lut.landAbove[i] = -BUILDER.offroadDrop + (BUILDER.tunnelHill + BUILDER.offroadDrop) * smooth(d / BUILDER.tunnelRamp);
    const k = i - i0;
    x[k] = lut.px[i]; y[k] = lut.py[i]; z[k] = lut.pz[i];
    if (x[k] < minX) minX = x[k]; if (x[k] > maxX) maxX = x[k];
    if (z[k] < minZ) minZ = z[k]; if (z[k] > maxZ) maxZ = z[k];
  }
  return { lut, i0, i1, x, y, z, minX, maxX, minZ, maxZ };
}

/** Cover `lut`'s samples that run along a tunnel's road, and narrow its off-road before each. */
export function coverTunnels(lut: Lut, tunnels: readonly TunnelLine[]): void {
  lut.covered.fill(0);
  lut.reach.fill(BUILDER.offroadReach);
  if (!tunnels.length) return;
  for (let i = 0; i < lut.n; i++) {
    const px = lut.px[i], pz = lut.pz[i];
    for (const t of tunnels) {
      if (px < t.minX - 2 || px > t.maxX + 2 || pz < t.minZ - 2 || pz > t.maxZ + 2) continue;
      let best = Infinity, by = 0, bk = 0;
      for (let k = 0; k < t.x.length; k++) {
        const dx = t.x[k] - px, dz = t.z[k] - pz, d = dx * dx + dz * dz;
        if (d < best) { best = d; by = t.y[k]; bk = k; }
      }
      // on the line (not just past a portal: there the nearest point is the line's end)
      const end = bk === 0 || bk === t.x.length - 1;
      if (best < (end ? 0.3 * 0.3 : 1.5 * 1.5) && Math.abs(lut.py[i] - by) < 2) { lut.covered[i] = 1; lut.reach[i] = 0; break; }
    }
  }
  const ds = lut.length / lut.step, m = Math.ceil(BUILDER.tunnelFunnel / ds);
  for (let i = 0; i < lut.n; i++) {
    if (lut.covered[i]) continue;
    for (let k = 1; k <= m; k++) {
      const a = lut.idx(i + k), b = lut.idx(i - k);
      if ((a !== i && lut.covered[a]) || (b !== i && lut.covered[b])) {
        lut.reach[i] = BUILDER.offroadReach * smooth((k * ds) / BUILDER.tunnelFunnel);
        break;
      }
    }
  }
}
