// The race-start warm-up (performance/warmup.ts, docs/sops/performance.md): the one draw of
// everything really shows everything and puts the scene back exactly; and a whole race, items,
// effects, creatures and the Final Lap Shift included, never needs a shader (a material's shader key)
// that no material in the scene had when the race loaded, so compiling the scene at load, and keeping
// what it compiled, covers every shader the race draws. (A material made mid-race, the shift's
// rebuilt balloons, is fine as long as its shader is one already compiled.)
import { describe, expect, it } from 'vitest';
import {
  ACESFilmicToneMapping, BoxGeometry, DirectionalLight, Group, InstancedMesh, Mesh, MeshToonMaterial, NoToneMapping, NormalBlending, PerspectiveCamera, Scene, ShaderMaterial,
  type Material, type Object3D, type WebGLRenderer,
} from 'three';
import { RaceSession } from '../game/session.ts';
import type { RaceConfig } from '../race-manager/types.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { CAST } from '../ui-hud/data/cast.ts';
import { Vfx } from '../vfx-juice/vfx.ts';
import { directFx, newEffects } from '../vfx-juice/juice.ts';
import { exposeAll, materialsOf, MAX_KEPT, Warmup } from './warmup.ts';

const FILES = import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' }) as Record<string, TrackDefinition>;

describe('exposeAll', () => {
  it('shows every hidden object, turns culling off and fills empty instance pools, then restores exactly', () => {
    const scene = new Scene();
    const geo = new BoxGeometry(), mat = new MeshToonMaterial();
    const hiddenParent = new Group(); hiddenParent.visible = false;
    const child = new Mesh(geo, mat);
    hiddenParent.add(child);
    const pool = new InstancedMesh(geo, mat, 8); pool.count = 0; pool.visible = false;
    const busy = new InstancedMesh(geo, mat, 8); busy.count = 3; busy.frustumCulled = false;
    const lamp = new DirectionalLight(); lamp.visible = false;
    scene.add(hiddenParent, pool, busy, lamp);
    const undo = exposeAll(scene);
    expect(hiddenParent.visible && pool.visible).toBe(true);
    expect(child.frustumCulled || pool.frustumCulled).toBe(false);
    expect(pool.count).toBe(1);
    expect(busy.count).toBe(3);
    expect(lamp.visible, 'a light never: it would change every shader').toBe(false);
    undo();
    expect(hiddenParent.visible || pool.visible).toBe(false);
    expect(child.frustumCulled && pool.frustumCulled).toBe(true);
    expect(busy.frustumCulled).toBe(false);
    expect(pool.count).toBe(0);
    expect(busy.count).toBe(3);
    expect(materialsOf(scene)).toEqual(new Set([mat]));
  });
});

/** A stand-in for three's renderer (no WebGL headless): compile() gives each material a program that is ready when told. */
function fakeRenderer() {
  const props = new Map<Material, { currentProgram?: FakeProgram }>();
  const programs: FakeProgram[] = [];
  const compiles: { shadows: boolean; tone: number; target: boolean; materials: Material[] }[] = [];
  const r = {
    shadowMap: { enabled: true }, toneMapping: NoToneMapping as number, target: null as unknown,
    info: { programs },
    properties: { get: (m: Material) => { if (!props.has(m)) props.set(m, {}); return props.get(m)!; } },
    getRenderTarget: () => r.target,
    setRenderTarget: (t: unknown) => { r.target = t; },
    compile(scene: Object3D) {
      const mats = materialsOf(scene);
      compiles.push({ shadows: r.shadowMap.enabled, tone: r.toneMapping, target: r.target !== null, materials: [...mats] });
      for (const m of mats) {
        const p = new FakeProgram();
        programs.push(p);
        r.properties.get(m).currentProgram = p;
      }
      return mats;
    },
  };
  return { r, renderer: r as unknown as WebGLRenderer, compiles, programs };
}
class FakeProgram {
  done = false;
  program: unknown = {};
  usedTimes = 1;
  isReady() { return this.done; }
}

describe('Warmup', () => {
  const sceneWith = (...mats: Material[]) => {
    const scene = new Scene();
    for (const m of mats) scene.add(new Mesh(new BoxGeometry(), m));
    return scene;
  };

  it('holds until every shader is compiled and every file it waits for is in, or the wait runs out', async () => {
    const { renderer, programs } = fakeRenderer();
    const w = new Warmup(renderer, 3);
    const scene = sceneWith(new MeshToonMaterial(), new MeshToonMaterial());
    expect(w.begin(scene, new PerspectiveCamera(), true, 10)).toBe(2);
    expect(w.active).toBe(true);
    let arrive = () => {};
    w.waitFor(new Promise<void>((res) => { arrive = res; }));
    expect(w.ready(10.1)).toBe(false);
    for (const p of programs) p.done = true;
    expect(w.ready(10.2), 'the sky painting is still loading').toBe(false);
    arrive();
    await Promise.resolve();
    expect(w.ready(10.3)).toBe(true);
    // a compile that never reports ready is waited on for `limit` seconds, no longer
    w.begin(sceneWith(new MeshToonMaterial()), new PerspectiveCamera(), true, 20);
    expect(w.ready(22.9)).toBe(false);
    expect(w.ready(23.1)).toBe(true);
    let drawn = 0;
    w.finish(new Scene(), () => { drawn++; });
    expect([drawn, w.active]).toEqual([1, false]);
  });

  it('keeps every compiled shader alive once (one extra use each), so a freed material never deletes it', () => {
    const { renderer, programs } = fakeRenderer();
    const w = new Warmup(renderer);
    w.begin(sceneWith(new MeshToonMaterial()), new PerspectiveCamera(), true, 0);
    w.begin(sceneWith(new MeshToonMaterial()), new PerspectiveCamera(), true, 1);
    expect(programs.map((p) => p.usedTimes)).toEqual([2, 2]);
    expect(MAX_KEPT).toBeGreaterThanOrEqual(128);
  });

  it('a custom shader keeps a never-freed copy of its material, one per source', () => {
    const { renderer, compiles } = fakeRenderer();
    const w = new Warmup(renderer);
    const a = new ShaderMaterial({ vertexShader: 'void main() {}', fragmentShader: 'void main() {}' });
    w.begin(sceneWith(a, a.clone()), new PerspectiveCamera(), true, 0);
    // the scene's compile, then one compile of the stand-in copies: one copy for the one source
    expect(compiles.length).toBe(2);
    expect(compiles[1].materials.length).toBe(1);
    expect(compiles[1].materials[0]).not.toBe(a);
    expect((compiles[1].materials[0] as ShaderMaterial).fragmentShader).toBe(a.fragmentShader);
    w.begin(sceneWith(a.clone()), new PerspectiveCamera(), true, 1);
    expect(compiles.length, 'the same source again: no new copy').toBe(3);
  });

  it('prepares a quality change in the background under its settings, and leaves the renderer as it was', () => {
    const { r, renderer, compiles, programs } = fakeRenderer();
    const w = new Warmup(renderer, 3);
    const scene = sceneWith(new MeshToonMaterial());
    w.prepare(scene, new PerspectiveCamera(), { shadows: false, toneMapping: ACESFilmicToneMapping, intoTarget: false }, 5);
    expect(compiles.at(-1)).toMatchObject({ shadows: false, tone: ACESFilmicToneMapping, target: false });
    expect([r.shadowMap.enabled, r.toneMapping, r.target]).toEqual([true, NoToneMapping, null]);
    expect(w.active, 'the race is not held').toBe(false);
    expect(w.prepared(5.1)).toBe(false);
    for (const p of programs) p.done = true;
    expect(w.prepared(5.2)).toBe(true);
    expect(w.prepared(5.3), 'nothing under way').toBe(true);
  });
});

/** What decides a material's shader, material and mesh side (three's WebGLPrograms key, the parts this game can change). */
function shaderKey(m: Material, o: Object3D): string {
  const x = m as Material & Record<string, unknown>;
  const im = o as InstancedMesh;
  const sm = m as ShaderMaterial;
  return [
    m.type, m.customProgramCacheKey(), JSON.stringify(m.defines ?? {}), m.side, m.transparent && m.blending === NormalBlending,
    m.alphaTest > 0, m.alphaHash, m.premultipliedAlpha, m.toneMapped, m.vertexColors, x.fog, x.flatShading,
    ...['map', 'alphaMap', 'emissiveMap', 'normalMap', 'aoMap', 'lightMap', 'gradientMap', 'envMap', 'bumpMap', 'roughnessMap', 'metalnessMap'].map((k) => !!x[k]),
    sm.isShaderMaterial ? `${sm.vertexShader.length}:${sm.fragmentShader.length}` : '',
    !!im.isInstancedMesh, !!im.instanceColor, !!(o as Mesh).morphTargetInfluences,
  ].join('|');
}

/** where an object hangs in the scene, by name, for the failure message */
function path(o: Object3D): string {
  const names: string[] = [];
  for (let x: Object3D | null = o; x; x = x.parent) if (x.name) names.push(x.name);
  return names.reverse().join('/') || o.type;
}

function keys(root: Object3D): Map<Material, { keys: Set<string>; at: string }> {
  const out = new Map<Material, { keys: Set<string>; at: string }>();
  root.traverse((o) => {
    const mm = (o as Mesh).material;
    if (!mm) return;
    for (const m of Array.isArray(mm) ? mm : [mm]) {
      if (!out.has(m)) out.set(m, { keys: new Set(), at: path(o) });
      out.get(m)!.keys.add(shaderKey(m, o));
    }
  });
  return out;
}

describe('a whole race needs no shader the load-time compile did not see', () => {
  // Boardwalk: a loop, a creature, a crossing, the night sky; Canyon: a mine, rockfalls, a dusk shift; Harbor: the sea and its whale
  for (const id of ['boardwalk-nights', 'canyon-rush', 'harbour-loop']) {
    it(`${id}: 8 AI, items and effects, to the flag`, () => {
      const def = FILES[`../track-builder/tracks/${id}.json`];
      expect(def, id).toBeDefined();
      const config: RaceConfig = {
        mode: 'quick', trackId: def.id, speedClass: 150, seed: 7, laps: 3,
        racers: CAST.map((c, i) => ({ racerId: c.id, archetype: c.archetype, isPlayer: i === 0 })),
      };
      const scene = new Scene();
      const camera = new PerspectiveCamera();
      const vfx = new Vfx(scene, camera);
      const s = new RaceSession(scene, def, config);
      s.ai.drivePlayer = true;
      s.frame(0, 1 / 60);
      const atLoad = new Set([...keys(scene).values()].flatMap((x) => [...x.keys]));
      const fx = newEffects();
      const kartOf = (r: string) => s.state.karts.find((k) => k.racerId === r);
      let t = 0, items = 0, shifts = 0;
      for (let tick = 0; tick < 120 * 60 * 6 && s.state.phase !== 'finished'; tick++) {
        const ev = s.tick(null);
        items += ev.items.length;
        shifts += ev.race.filter((e) => e.type === 'trackChanged').length;
        vfx.onTick(directFx(ev.race, ev.items, s.player?.racerId ?? null, fx), kartOf, t, false);
        if (tick % 2) continue;
        t += 1 / 60;
        s.frame(1, 1 / 60);
        const p = s.player!.position;
        vfx.frame(1 / 60, 2 / 120, t, s.state.karts, s.player, [p[0], p[1] + 3, p[2] - 6], false);
      }
      expect(s.state.phase).toBe('finished');
      expect(items, 'items were used').toBeGreaterThan(0);
      if (def.finalLapShift) expect(shifts, 'the Final Lap Shift fired').toBeGreaterThan(0);
      const late: string[] = [];
      for (const [m, now] of keys(scene)) for (const k of now.keys) if (!atLoad.has(k)) late.push(`${m.type} at ${now.at}: ${k}`);
      expect(late, 'materials or shader keys first seen mid-race').toEqual([]);
      s.dispose();
      vfx.dispose();
    }, 240_000);
  }
});
