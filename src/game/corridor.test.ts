// The chase camera's corridor is clear of scenery (review, 24 Sept 2026: a white slab filled a third
// of the screen on Canyon Rush). Headless: the lens is swept over every drivable metre of every road
// on every track (off-road land out to the course limit too, where the camera follows a kart), at the
// chase height and at the lowest the camera sinks to, and no decor or merged dressing volume may
// hold it. Spans cross high over the road (art-pipeline dressing.test.ts); ground cover is under the lens.
import { describe, expect, it } from 'vitest';
import { Box3, Matrix4, Vector3 } from 'three';
import { trackAssets } from '../art-pipeline/index.ts';
import { buildTrackScene } from '../track-builder/mesh/index.ts';
import { buildTrack } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { CAM } from './camera.ts';

const TRACKS = Object.values(import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' })) as TrackDefinition[];

/** The lens must keep this far from any prop's box: the near plane (0.3 m) and a hand's breadth. */
const LENS = 0.45;
/** Metres between samples along a road, and samples across it. */
const STEP = 2, ACROSS = 9;
const CELL = 16;

/** A prop's volume in its own frame: its box, cut to the round of its widest reach from its axis (a snowball's box has corners it does not). */
interface Solid { inv: Matrix4; box: Box3; round: number; asset: string; x: number; z: number; r: number }

describe.each(TRACKS.map((d) => [d.id, d] as const))('%s: the chase camera corridor', (_id, def) => {
  it('no prop or dressing stands where the lens passes, on any road, across all the drivable width', () => {
    const track = buildTrack(def), assets = trackAssets(def.biome), scene = buildTrackScene(track, assets);
    const grid = new Map<string, Solid[]>();
    const m = new Matrix4(), s = new Vector3(), c = new Vector3();
    for (const p of scene.decor) {
      if (p.layout === 'span' || p.band === 'sky') continue;
      const g = assets.geometries![p.asset];
      if (!g) continue;
      if (!g.boundingBox) g.computeBoundingBox();
      const pos = g.getAttribute('position');
      let round = 0;
      for (let j = 0; j < pos.count; j++) round = Math.max(round, Math.hypot(pos.getX(j), pos.getZ(j)));
      const ground = p.band === 'verge'; // karts and the lens pass over ground cover
      if (ground) continue;
      for (let i = 0; i < p.count; i++) {
        m.fromArray(p.matrices, i * 16);
        s.setFromMatrixScale(m);
        // the lens margin in the prop's own units (its scale is near uniform; a row piece's length stretches only along it)
        const pad = LENS / Math.min(s.x, s.y, s.z), box = g.boundingBox!.clone().expandByScalar(pad);
        box.getCenter(c).applyMatrix4(m);
        const r = (box.getSize(new Vector3()).length() / 2) * Math.max(s.x, s.y, s.z);
        const solid: Solid = { inv: m.clone().invert(), box, round: round + pad, asset: p.asset, x: c.x, z: c.z, r };
        for (let gx = Math.floor((c.x - r) / CELL); gx <= Math.floor((c.x + r) / CELL); gx++) {
          for (let gz = Math.floor((c.z - r) / CELL); gz <= Math.floor((c.z + r) / CELL); gz++) {
            const k = `${gx},${gz}`;
            (grid.get(k) ?? grid.set(k, []).get(k)!).push(solid);
          }
        }
      }
    }
    const v = new Vector3();
    let bad = '', checked = 0;
    for (const b of track.branches.list) {
      const L = b.lut, n = Math.max(8, Math.round(L.length / STEP));
      for (let k = 0; k < n; k++) {
        const u = k / n, c0 = L.sample(u, 0), reach = Math.max(0, (c0.wall ?? c0.halfWidth) - CAM.wallClear);
        for (let a = 0; a < ACROSS; a++) {
          const lateral = -reach + (2 * reach * a) / (ACROSS - 1), smp = L.sample(u, lateral);
          for (const up of [CAM.height, CAM.roadClear]) {
            v.set(smp.position[0], smp.groundY + up, smp.position[2]);
            checked++;
            for (const o of grid.get(`${Math.floor(v.x / CELL)},${Math.floor(v.z / CELL)}`) ?? []) {
              if ((v.x - o.x) ** 2 + (v.z - o.z) ** 2 > o.r * o.r) continue;
              const l = v.clone().applyMatrix4(o.inv);
              if (o.box.containsPoint(l) && Math.hypot(l.x, l.z) <= o.round) bad ||= `${o.asset} holds the lens at ${b.id ?? b.index} t ${u.toFixed(3)} lateral ${lateral.toFixed(1)} height ${up}`;
            }
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(5000);
    expect(bad).toBe('');
    scene.dispose();
  });
});
