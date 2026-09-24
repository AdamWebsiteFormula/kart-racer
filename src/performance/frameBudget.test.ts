// Performance SOP gate, headless: every track with 8 karts and the effects layer stays inside the
// frame budget before any browser sees it. A browser culls what is off screen, so counting every
// visible mesh (and every shadow caster again, for the shadow pass) is an upper bound. The post
// chain and the effects in use get the rest of the 100 (docs/sops/performance.md). Live on an
// M4 Pro the whole frame measured 51 to 74 draw calls.
import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Scene, type InstancedMesh, type Mesh, type Object3D } from 'three';
import { RaceSession } from '../game/session.ts';
import type { RaceConfig } from '../race-manager/types.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { CAST } from '../ui-hud/data/cast.ts';
import { Vfx } from '../vfx-juice/vfx.ts';

const TRACKS = Object.values(import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' })) as TrackDefinition[];

/** The SOP's ceiling is 100 a frame; the scene and its shadow pass may use this much of it. */
const SCENE_AND_SHADOW_DRAWS = 80;
/** Triangles in the scene (shadow pass not counted); the code-built karts stand in for the racer models. */
const SCENE_TRIANGLES = 400_000;

function count(o: Object3D): { draws: number; shadow: number; tris: number } {
  let draws = 0, shadow = 0, tris = 0;
  o.traverseVisible((x) => {
    const m = x as Mesh;
    if (!m.isMesh) return;
    const im = m as InstancedMesh;
    if (im.isInstancedMesh && im.count === 0) return;
    const mats = Array.isArray(m.material) ? m.material.length : 1;
    draws += mats;
    if (m.castShadow) shadow += mats;
    const g = m.geometry;
    tris += ((g.index ? g.index.count : g.getAttribute('position').count) / 3) * (im.isInstancedMesh ? im.count : 1);
  });
  return { draws, shadow, tris };
}

describe('frame budget (performance SOP)', () => {
  it.each(TRACKS.map((d) => [d.id, d] as const))('%s with 8 karts stays under the draw-call and triangle budget', (_id, def) => {
    const config: RaceConfig = {
      mode: 'quick', trackId: def.id, speedClass: 150, seed: 1, laps: 3,
      racers: CAST.map((c, i) => ({ racerId: c.id, archetype: c.archetype, isPlayer: i === 0 })),
    };
    const scene = new Scene();
    const s = new RaceSession(scene, def, config);
    new Vfx(scene, new PerspectiveCamera());
    s.frame(0, 1 / 60);
    const c = count(scene);
    expect(s.state.karts.length).toBe(8);
    expect(c.draws + c.shadow, `${def.id}: ${c.draws} draws + ${c.shadow} shadow`).toBeLessThanOrEqual(SCENE_AND_SHADOW_DRAWS);
    expect(c.tris, def.id).toBeLessThanOrEqual(SCENE_TRIANGLES);
    s.dispose();
  }, 120_000); // CI runs about 3.5x slower than the Mac
});
