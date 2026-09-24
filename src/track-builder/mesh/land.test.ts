// The land as drawn (land.ts) on the off-road tracks, raycast from above. Bug hunt 3 (24 Sept 2026):
// the land was never built under any road, so a road the race hides (a closed shortcut, Canyon's old
// road after the collapse) left a road-shaped hole down to the ground while the kart's land (terrain.ts)
// ran on under it; and in front of each mine portal the land was cut away beside the road.
import { describe, expect, it } from 'vitest';
import { Mesh, Raycaster, Vector3 } from 'three';
import { cloneDef } from '../__tests__/fixtures.ts';
import { BUILDER } from '../constants.ts';
import { wrap01 } from '../lut.ts';
import { buildTrack } from '../track.ts';
import type { TrackDefinition } from '../types.ts';
import { buildTrackScene } from './scene.ts';
import canyonJson from '../tracks/canyon-rush.json';

const DEFS = Object.values(import.meta.glob('../tracks/*.json', { eager: true, import: 'default' }) as Record<string, TrackDefinition>);
const OFFROAD = DEFS.filter((d) => d.offroad === true);
const DOWN = new Vector3(0, -1, 0);

/** The first surface of `meshes` straight down from (x, y, z), or -Infinity. */
function below(rc: Raycaster, meshes: Mesh[], x: number, y: number, z: number): number {
  rc.set(new Vector3(x, y, z), DOWN);
  return rc.intersectObjects(meshes, false)[0]?.point.y ?? -Infinity;
}

describe('the land under a road the race can hide', () => {
  it.each(OFFROAD.map((d) => [d.id, d] as const))('%s: it lies offroadDrop under the road, and never under one that is always drawn', (_id, raw) => {
    const def = cloneDef(raw);
    const track = buildTrack(def);
    const scene = buildTrackScene(track);
    const coast = scene.group.getObjectByName('coast') as Mesh;
    const rc = new Raycaster();
    // a shortcut closed on some laps or by the shift; the main road a route override replaces (not its open edges)
    const closes = new Set(def.finalLapShift.closesShortcuts ?? []);
    const hides = (b: (typeof track.branches.list)[number], i: number): boolean => b.isMain
      ? !b.lut.open[i] && (def.finalLapShift.routeOverrides ?? []).some((ov) => wrap01(i / b.lut.n - ov.fromT) <= wrap01(ov.toT - ov.fromT))
      : b.openOnLaps.length > 0 || closes.has(b.id);
    const fixed: [number, number, number][] = [];
    for (const b of track.branches.list) for (let i = 0; i < b.lut.n; i += 2) if (!hides(b, i)) fixed.push([b.lut.px[i], b.lut.pz[i], b.lut.hw[i]]);
    let hidden = 0, bare = 0, where = '', always = 0, landed = 0;
    for (const b of track.branches.list) {
      const L = b.lut;
      for (let i = 0; i < L.n; i += 7) {
        const top = below(rc, [coast], L.px[i], L.py[i] + 20, L.pz[i]);
        if (hides(b, i)) {
          // away from a tunnel (the mesa is over it) and from the roads that stay (they share the land)
          if (L.bore[i] === L.bore[i] || fixed.some(([x, z, hw]) => Math.hypot(x - L.px[i], z - L.pz[i]) < hw + L.hw[i] + BUILDER.kerbWidth + 3)) continue;
          hidden++;
          if (Math.abs(top - (L.py[i] - BUILDER.offroadDrop)) > 0.15) { bare++; where ||= `${b.id} sample ${i}: land ${top.toFixed(2)}, road ${L.py[i].toFixed(2)}`; }
        } else if (b.isMain) {
          always++;
          if (top > L.py[i] - 1) landed++;
        }
      }
    }
    expect(hidden, 'road that can hide').toBeGreaterThan(20);
    expect(bare, where).toBe(0);
    expect(always).toBeGreaterThan(200);
    expect(landed, 'land under the main road').toBe(0);
    scene.dispose();
  });
});

describe("Canyon's mine portals", () => {
  it('the land runs up to the curb in front of each portal, and none of it stands in the bore or across the mouth', () => {
    const track = buildTrack(cloneDef(canyonJson as TrackDefinition));
    const scene = buildTrackScene(track);
    scene.group.updateMatrixWorld(true);
    const coast = scene.group.getObjectByName('coast') as Mesh, tunnels = scene.group.getObjectByName('tunnels') as Mesh;
    const t = track.tunnels[0], L = t.lut, ds = L.length / L.step, rc = new Raycaster();
    let holes = 0, hole = '', inBore = 0, blocked = 0;
    for (const [p, out] of [[t.i0, -1], [t.i1, 1]] as const) {
      // beside the approach, 0-6 m out and 0.3-4 m past each curb: land (or the cliff face), not a drop
      for (let f = 0; f <= 6; f += 0.5) {
        const j = L.idx(p + out * Math.round(f / ds));
        for (const side of [-1, 1]) for (const e of [0.3, 1, 2, 3, 4]) {
          const lat = side * (L.hw[j] + BUILDER.kerbWidth + e);
          const x = L.px[j] + L.rx[j] * lat, z = L.pz[j] + L.rz[j] * lat, y = L.py[j] - lat * Math.tan(L.bank[j]);
          const top = below(rc, [coast, tunnels], x, y + 30, z);
          if (y - top > 1.5) { holes++; hole ||= `portal ${p}, ${f} m out, ${side * e} m past the curb: ${top.toFixed(2)} under a road at ${y.toFixed(2)}`; }
        }
      }
      // from 1 m out to 8 m in, between the walls, under the roof: no land above the road
      for (let f = -1; f <= 8; f += 0.5) {
        const j = L.idx(p - out * Math.round(f / ds)), W = L.hw[j] + BUILDER.kerbWidth;
        for (let lat = -W + 0.05; lat < W; lat += 0.5) {
          const x = L.px[j] + L.rx[j] * lat, z = L.pz[j] + L.rz[j] * lat, y = L.py[j] - lat * Math.tan(L.bank[j]);
          if (below(rc, [coast], x, y + BUILDER.tunnelWall - 0.1, z) > y + 0.02) inBore++;
        }
      }
      // a driver's view: from 10 m out, along the road into the mouth, 1-5 m up
      const j = L.idx(p + out * Math.round(10 / ds)), fl = Math.hypot(L.tx[p], L.tz[p]);
      for (let lat = -L.hw[p] + 0.5; lat < L.hw[p]; lat += 1) for (const h of [1, 3, 5]) {
        rc.set(new Vector3(L.px[j] + L.rx[j] * lat, L.py[p] + h, L.pz[j] + L.rz[j] * lat), new Vector3((-out * L.tx[p]) / fl, 0, (-out * L.tz[p]) / fl));
        rc.far = 22;
        if (rc.intersectObject(coast, false).length) blocked++;
        rc.far = Infinity;
      }
    }
    expect(holes, hole).toBe(0);
    expect(inBore).toBe(0);
    expect(blocked).toBe(0);
    scene.dispose();
  });
});
