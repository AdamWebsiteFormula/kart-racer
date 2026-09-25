// A race of racers built from parts (art-pipeline rigged.ts; Juniper's real files standing in for all
// eight): each kart is one draw and one shadow draw, as a fused model file was; the race steps exactly as
// the bare sim does with the rigs animating (render only); a rival's near-lens ghost copies are skinned to
// its own bones; skinned shadows keep a depth material of their own; an item used swings the thrower's
// arm; the drivers look about the grid while the course intro flies (the sim still at tick 0).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PerspectiveCamera, Scene, type Mesh, type Object3D, type SkinnedMesh } from 'three';
import { RACER_MODELS } from '../art-pipeline/index.ts';
import type { RiggedTemplate } from '../art-pipeline/rigged.ts';
import { riggedTemplate } from '../art-pipeline/__tests__/parts.ts';
import { AiDriver } from '../ai-driver/index.ts';
import { Items } from '../items/items.ts';
import { NEUTRAL_INPUT } from '../kart-controller/types.ts';
import { SKINNED_DEPTH } from '../performance/shadowDepth.ts';
import { RaceManager } from '../race-manager/index.ts';
import type { RaceConfig } from '../race-manager/types.ts';
import harbour from '../track-builder/tracks/harbour-loop.json';
import { buildTrack } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { CAST } from '../ui-hud/data/cast.ts';
import { RaceSession } from './session.ts';
import { simTick, type SimParts } from './simtick.ts';

const def = harbour as unknown as TrackDefinition;
const config: RaceConfig = {
  mode: 'quick', trackId: def.id, speedClass: 150, seed: 5, laps: 3,
  racers: CAST.map((c, i) => ({ racerId: c.id, archetype: c.archetype, isPlayer: i === 0 })),
};
const rigs = (RACER_MODELS as unknown as { rigs: Map<string, RiggedTemplate> }).rigs;
let t: RiggedTemplate;

beforeAll(async () => {
  t = await riggedTemplate('juniper');
  for (const c of CAST) rigs.set(c.id, t);
}, 120_000);
afterAll(() => { for (const c of CAST) rigs.delete(c.id); });

/** Visible draws and shadow draws under `o` (the frame budget's count). */
function draws(o: Object3D): { draws: number; shadow: number; tris: number } {
  let d = 0, s = 0, tris = 0;
  o.traverseVisible((x) => {
    const m = x as Mesh;
    if (!m.isMesh) return;
    d++;
    if (m.castShadow) s++;
    tris += (m.geometry.index ? m.geometry.index.count : m.geometry.getAttribute('position').count) / 3;
  });
  return { draws: d, shadow: s, tris };
}

describe('a race of rigged racers', () => {
  it('each kart is one draw and one shadow draw (the flames hidden until they burn)', () => {
    const s = new RaceSession(new Scene(), def, config);
    s.frame(0, 1 / 60);
    for (const v of s.views) {
      expect(v.rigged).toBe(true);
      const c = draws(v.root);
      expect(c.draws, v.chassis.name).toBe(1);
      expect(c.shadow).toBe(1);
      expect(c.tris).toBe(t.triangles);
      const m = v.chassis.getObjectByName('rigged') as SkinnedMesh;
      expect(m.customDepthMaterial, 'its own depth material').toBe(SKINNED_DEPTH);
    }
    s.dispose();
  }, 120_000);

  it('races exactly as the bare sim with every rig animating (render only)', () => {
    const s = new RaceSession(new Scene(), def, config);
    s.ai.drivePlayer = true;
    s.eye = [0, 3, -5];
    const track = buildTrack(def), manager = new RaceManager(track, config), items = new Items(track, manager);
    const ai = new AiDriver(track, config, manager.state, { itemRoles: items.roles });
    ai.drivePlayer = true;
    const bare: SimParts = { manager, items, ai, inputs: manager.state.karts.map(() => ({ ...NEUTRAL_INPUT })), playerIndex: 0, playerSlot: { ...NEUTRAL_INPUT } };
    let spun = 0, looked = 0;
    for (let tick = 0; tick < 120 * 40; tick++) {
      s.tick(null);
      simTick(bare, null);
      if (tick % 2) s.frame((tick % 5) / 5, 1 / 60, tick % 700 < 90);
      for (const v of s.views) { spun = Math.max(spun, Math.abs(v.driver.curr.spin)); looked = Math.max(looked, Math.abs(v.driver.curr.headYaw)); }
      if (tick % 800 === 0) expect(JSON.stringify(s.state), `tick ${tick}`).toBe(JSON.stringify(manager.state));
    }
    expect(JSON.stringify(s.state)).toBe(JSON.stringify(manager.state));
    expect(spun).toBeGreaterThan(10); // the wheels rolled
    expect(looked).toBeGreaterThan(0.1); // the drivers looked about
    for (const v of s.views) {
      const b = (v.chassis.getObjectByName('rigged') as SkinnedMesh).skeleton.bones;
      for (const x of b) expect(Number.isFinite(x.quaternion.w) && Number.isFinite(x.position.y), x.name).toBe(true);
    }
    s.dispose();
  }, 240_000);

  it('a rival\'s ghost copies are skinned to its own bones; an item used swings the arm; the grid looks about during the intro', () => {
    const scene = new Scene();
    const s = new RaceSession(scene, def, config);
    const rival = s.views[1].chassis;
    const kartMesh = rival.getObjectByName('rigged') as SkinnedMesh;
    const ghost = rival.getObjectByName('ghost') as SkinnedMesh, depth = rival.getObjectByName('ghost-depth') as SkinnedMesh;
    for (const g of [ghost, depth]) {
      expect(g.isSkinnedMesh).toBe(true);
      expect(g.skeleton).toBe(kartMesh.skeleton);
    }
    // the fader switches to the copies with the lens right on the rival
    const cam = new PerspectiveCamera();
    s.frame(0, 1 / 60);
    scene.updateMatrixWorld(true);
    cam.position.copy(s.views[1].root.position);
    cam.position.y += 1;
    cam.updateMatrixWorld(true);
    scene.onBeforeRender({} as never, scene, cam, null as never, null as never, null as never);
    expect(ghost.visible).toBe(true);
    // the course intro: the sim waits at tick 0, the drivers still look about (a frame's time at a go)
    const before = s.views.map((v) => v.driver.curr.headYaw);
    for (let i = 0; i < 600; i++) s.frame(1, 1 / 60, false, i / 60);
    expect(s.state.tick).toBe(0);
    expect(s.views.some((v, i) => Math.abs(v.driver.curr.headYaw - before[i]) > 0.1)).toBe(true);
    // an item used: the thrower's right arm leaves the wheel
    const v = s.views[2];
    v.driver.itemUsed('throw');
    for (let i = 0; i < 20; i++) v.onTick(s.state.karts[2], 1 / 120, NEUTRAL_INPUT);
    expect(v.driver.curr.armR.wheel).toBeLessThan(0.5);
    s.dispose();
  }, 120_000);
});
