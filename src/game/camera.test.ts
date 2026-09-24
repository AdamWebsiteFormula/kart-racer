import { describe, expect, it } from 'vitest';
import { Raycaster, Vector3 } from 'three';
import { BUILDER } from '../track-builder/constants.ts';
import { buildTrackScene } from '../track-builder/mesh/index.ts';
import { buildTrack } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import canyonJson from '../track-builder/tracks/canyon-rush.json';
import { CAM, clampToRoad, idealPose } from './camera.ts';

const TRACKS = import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' }) as Record<string, TrackDefinition>;

describe('chase camera', () => {
  it('Canyon mine: over the road under it when looking back up the exit climb, under the timber beams looking forward', () => {
    const track = buildTrack(canyonJson as unknown as TrackDefinition);
    const mine = track.branches.byId('mine-tunnel')!;
    const L = mine.lut;
    // the road as drawn: a ray straight down from the camera onto the mine's own road
    const scene = buildTrackScene(track);
    const road = scene.chunks.filter((c) => c.branch === mine.index).map((c) => c.mesh);
    scene.group.updateMatrixWorld(true);
    const ray = new Raycaster(new Vector3(), new Vector3(0, -1, 0));
    const groundUnder = (p: number[]) => {
      ray.set(new Vector3(p[0], p[1] + 20, p[2]), new Vector3(0, -1, 0));
      return ray.intersectObjects(road, false).find((h) => h.point.y < p[1] + 20)?.point.y;
    };
    const beams = BUILDER.tunnelWall - CAM.beamClear;
    const raw = { under: 0, over: 0 }, clamped = { under: 0, over: 0 };
    const tally = (n: { under: number; over: number }, p: number[], inBore: boolean) => {
      const g = groundUnder(p);
      if (g === undefined) return;
      if (p[1] < g + CAM.roadClear - 0.05) n.under++;
      if (inBore && p[1] > g + beams + 0.05) n.over++;
    };
    // a kart on every other LUT sample of the shortcut, at a standstill and at top speed, both ways round
    let checked = 0;
    for (let i = 0; i < L.n; i += 2) {
      const t = mine.toMain(i / L.step);
      const kart = track.sample(t, 0, mine.index);
      const heading = Math.atan2(kart.tangent[0], kart.tangent[2]);
      for (const speed of [0, CAM.topSpeed]) {
        for (const lookBack of [false, true]) {
          const pos = idealPose(kart.position, heading, speed, lookBack).position;
          // in the bore where the camera is: the samples of the mine it is over
          const j = L.nearestT(pos, i / L.step, 0.1);
          const inBore = L.covered[L.idx(Math.round(j * L.step))] !== 0;
          tally(raw, pos, inBore);
          clampToRoad(track, pos, { t, branch: mine.index });
          tally(clamped, pos, inBore);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(800);
    // the pose on its own rides the kart's height: the climb puts it under the road and over the beams
    expect(raw.under).toBeGreaterThan(0);
    expect(raw.over).toBeGreaterThan(0);
    expect(clamped).toEqual({ under: 0, over: 0 });
    scene.dispose();
  });

  it('elsewhere it only lifts a camera that would come within roadClear of the road: four tracks it never touches', () => {
    for (const def of Object.values(TRACKS)) {
      const track = buildTrack(def);
      let moved = 0;
      for (const b of track.branches.list) {
        const tunnel = track.tunnels.some((tl) => tl.lut === b.lut);
        for (let k = 0; k < 500; k++) {
          const t = b.toMain(k / 500);
          const kart = track.sample(t, 0, b.index);
          for (const lookBack of [false, true]) {
            const pos = idealPose(kart.position, Math.atan2(kart.tangent[0], kart.tangent[2]), CAM.topSpeed, lookBack).position;
            const y = pos[1];
            clampToRoad(track, pos, { t, branch: b.index });
            // only a tunnel's roof ever pushes it down
            if (!tunnel) expect(pos[1], `${def.id} ${b.id} t ${t}`).toBeGreaterThanOrEqual(y);
            if (pos[1] !== y) moved++;
          }
        }
      }
      // Canyon's mine and Skyline's steepest drop; nowhere on the other four
      if (def.id !== 'canyon-rush' && def.id !== 'skyline-circuit') expect(moved, def.id).toBe(0);
    }
  });
});
