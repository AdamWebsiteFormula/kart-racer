// The title's attract camera (game/titleCam.ts; the second fresh-eyes review's item 1): its aim puts the followed kart
// exactly on its spot, the spot is in the open part of the screen (under the start screen's logo, right of the menu),
// and through an attract race on its track the leader is framed there every frame, cut between the shots in turn,
// the lens over the ground and out of the sea. The sim as RaceSession runs it, minus the drawing.
import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { AiDriver } from '../ai-driver/index.ts';
import { Items } from '../items/items.ts';
import { NEUTRAL_INPUT, type Vec3 } from '../kart-controller/types.ts';
import { RaceManager } from '../race-manager/index.ts';
import type { RaceConfig } from '../race-manager/types.ts';
import { buildTrack } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { attractTrack } from '../ui-hud/index.ts';
import { lineup } from './lineup.ts';
import { seaLevel } from './camera.ts';
import { simTick, type SimParts } from './simtick.ts';
import { aimFor, START_X, TITLE_CAM, TitleCam, titleSpot, type Followed } from './titleCam.ts';

const FILES = Object.values(import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' })) as TrackDefinition[];
const DT = 1 / 60;

/** Where `p` lands on a camera at `pos` looking at `look` (three's lookAt): shares of the width and height, and its depth (under 1: in front). */
function onScreen(pos: Readonly<Vec3>, look: Readonly<Vec3>, p: Readonly<Vec3>, fov: number, aspect: number): { x: number; y: number; z: number } {
  const cam = new PerspectiveCamera(fov, aspect, 0.3, 1400);
  cam.position.set(pos[0], pos[1], pos[2]);
  cam.lookAt(look[0], look[1], look[2]);
  cam.updateMatrixWorld(true);
  const q = new Vector3(p[0], p[1], p[2]).project(cam);
  return { x: (q.x + 1) / 2, y: (1 - q.y) / 2, z: q.z };
}

describe('the title camera\'s aim', () => {
  it('puts the target exactly on the spot asked for, from any side and height a shot has', () => {
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const out: Vec3 = [0, 0, 0];
    let n = 0;
    for (let i = 0; i < 300; i++) {
      // a lens 0 to 9 m over the kart, 5 to 21 m from it on any side (a level lens cannot put a point steeply
      // under it at the frame's edge: no shot looks down that steeply)
      const pos: Vec3 = [rnd() * 40 - 20, rnd() * 12, rnd() * 40 - 20];
      const a = rnd() * Math.PI * 2, r = 5 + rnd() * 16;
      const target: Vec3 = [pos[0] + Math.sin(a) * r, pos[1] - rnd() * 9, pos[2] + Math.cos(a) * r];
      n++;
      const sx = 0.2 + rnd() * 0.7, sy = 0.35 + rnd() * 0.5, fov = 45 + rnd() * 15, aspect = [16 / 9, 4 / 3, 2.2][i % 3];
      aimFor(pos, target, sx, sy, fov, aspect, out);
      const s = onScreen(pos, out, target, fov, aspect);
      expect(s.z).toBeLessThan(1);
      expect(Math.abs(s.x - sx), `case ${i} x`).toBeLessThan(1e-6);
      expect(Math.abs(s.y - sy), `case ${i} y`).toBeLessThan(1e-6);
    }
    expect(n).toBe(300);
  });

  it('frames the kart in the open: under the start screen\'s logo, in the middle of the room right of the menu, under a menu that fills the width', () => {
    const at: [number, number] = [0, 0];
    expect(titleSpot(0, at)).toEqual([START_X, TITLE_CAM.startY]);
    titleSpot(0.34, at);
    expect(at[0]).toBeCloseTo(0.67, 6);
    expect(at[1]).toBe(TITLE_CAM.menuY);
    expect(titleSpot(0.9, at)).toEqual([START_X, TITLE_CAM.underY]);
    // low in the frame, clear of the start screen's big logo (its box ends about halfway down)
    expect(TITLE_CAM.startY).toBeGreaterThan(0.6);
    expect(TITLE_CAM.underY).toBeLessThan(0.9);
  });
});

describe('through an attract race', () => {
  const def = FILES.find((d) => d.id === (attractTrack(new Set(FILES.map((f) => f.id))) ?? FILES[0].id))!;
  it(`${def.id}: frames the kart it follows on its spot every frame, cut between the four shots in turn, over the ground and out of the sea`, () => {
    const config: RaceConfig = { mode: 'quick', trackId: def.id, speedClass: 150, seed: 424242, racers: lineup(null) };
    const track = buildTrack(def);
    const manager = new RaceManager(track, config);
    const items = new Items(track, manager);
    const ai = new AiDriver(track, config, manager.state, { itemRoles: items.roles });
    const inputs = manager.state.karts.map(() => ({ ...NEUTRAL_INPUT }));
    const parts: SimParts = { manager, items, ai, inputs, playerIndex: -1, playerSlot: { ...NEUTRAL_INPUT } };
    const karts = manager.state.karts;
    const follow: Followed = { kart: karts[0], at: { x: 0, y: 0, z: 0 } };
    const at = { x: 0, y: 0, z: 0 };
    const kartAt = (i: number): Followed | undefined => {
      const k = karts[i];
      if (!k) return undefined;
      at.x = k.position[0]; at.y = k.position[1]; at.z = k.position[2];
      follow.kart = k; follow.at = at;
      return follow;
    };
    const leader = () => { let best = 0; for (let i = 1; i < karts.length; i++) if (karts[i].rank > 0 && karts[i].rank < karts[best].rank) best = i; return best; };
    const cam = new TitleCam();
    const spot: [number, number] = [0, 0];
    titleSpot(0.34, spot); // a 1600-wide window's menu (measured: its right edge at 541 px)
    const aspect = 16 / 9, sea = seaLevel(track);
    const shots: number[] = [];
    let worst = 0, lowest = Infinity, frames = 0;
    for (let f = 0; f < 60 * 45; f++) {
      for (let n = 0; n < 2; n++) simTick(parts, null);
      const was = cam.shot;
      cam.update(track, leader(), kartAt, spot[0], spot[1], aspect, false, DT, f === 0);
      if (cam.shot !== was) { shots.push(cam.shot); expect(cam.star, 'a shot follows the kart leading as it begins').toBe(leader()); }
      const k = karts[cam.star];
      expect(Number.isFinite(cam.pos[0] + cam.pos[1] + cam.pos[2] + cam.look[0] + cam.look[1] + cam.look[2])).toBe(true);
      const s = onScreen(cam.pos, cam.look, [k.position[0], k.position[1] + TITLE_CAM.aimUp, k.position[2]], cam.fov, aspect);
      const want = spot[1] + (TITLE_CAM.shots[cam.shot].drop ?? 0);
      expect(s.z).toBeLessThan(1);
      worst = Math.max(worst, Math.abs(s.x - spot[0]), Math.abs(s.y - want));
      const ground = track.sample(track.nearestGlobal(cam.pos).t, 0).groundY;
      lowest = Math.min(lowest, cam.pos[1] - Math.max(ground, sea));
      frames++;
    }
    expect(frames).toBe(2700);
    // on its spot: right of the menu (it ends at 0.34 of the width), never behind it
    expect(worst).toBeLessThan(1e-6);
    expect(spot[0] - 0.34).toBeGreaterThan(0.25);
    // four shots in turn, one every TITLE_CAM.shotSeconds
    expect(shots.slice(0, 5)).toEqual([0, 1, 2, 3, 0]);
    expect(shots.length).toBe(Math.floor(45 / TITLE_CAM.shotSeconds) + 1);
    expect(lowest, 'the lens over the ground and the sea').toBeGreaterThan(0.9);
  });
});
