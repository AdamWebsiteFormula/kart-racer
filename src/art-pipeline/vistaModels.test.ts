// The far vista's big pieces from model files (27 Sept 2026, review: "the big shapes are primitives"):
// each real file, fitted as the game fits it, stands where its code-built piece stood (the same floor,
// height and middle), is one draw however many places it stands in, casts no shadow and outlives the
// scene (shared); what hangs on a piece follows the model's own shape (a volcano's smoke and crater
// glow, the eagles' ring and the cable car's top station round Frostbite's peak, the sky islands'
// waterfalls off their rims), and the landmark still stands ahead of every start line, mirrored too.
// 28 Sept 2026 (review round 2: "the last primitive landmarks"): Mesa's banded columns from one butte file,
// Lighthouse's sea stacks, Mesa's canyon walls (a decor file with no real-time shadow), and two or more
// files on one track sharing one draw over an atlas of their pictures (Mesa's draw budget was full).
import { beforeAll, describe, expect, it } from 'vitest';
import { Box3, BoxGeometry, Matrix4, MeshStandardMaterial, Texture, Vector3, type BufferAttribute, type InstancedMesh, type Material, type Mesh } from 'three';
import PROPS_MANIFEST from '../../public/models/props.json';
import { buildTrackScene, type TrackScene } from '../track-builder/mesh/index.ts';
import { mirrorTrack } from '../track-builder/mirror.ts';
import { buildTrack } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { adoptPropFiles } from './__tests__/propFiles.ts';
import { PROP_MODELS } from './glb.ts';
import { trackAssets } from './index.ts';
import { ATLAS, atlasMesh, heightAt, vistaPieceBox, VISTA_PIECES, type PieceFile } from './vista.ts';

const TRACKS = Object.values(import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' })) as TrackDefinition[];
/** The pieces that have a model file, by biome. */
const FILED = Object.entries(VISTA_PIECES).flatMap(([biome, names]) => names.filter((n) => Object.hasOwn(PROPS_MANIFEST, n)).map((name) => ({ biome, name })));

let taken: string[] = [];
beforeAll(async () => { taken = await adoptPropFiles(FILED.map((f) => f.name)); }, 60_000);

/** Each place a model mesh stands: its world matrix (an instancer's per copy). */
function placements(m: Mesh): Matrix4[] {
  m.updateWorldMatrix(true, false);
  const im = m as InstancedMesh;
  if (!im.isInstancedMesh) return [m.matrixWorld.clone()];
  return Array.from({ length: im.count }, (_, i) => { const a = new Matrix4(); im.getMatrixAt(i, a); return a.premultiply(m.matrixWorld); });
}

function models(scene: TrackScene): Mesh[] {
  const out: Mesh[] = [];
  scene.group.traverse((o) => { if (o.name === 'vista-model') out.push(o as Mesh); });
  return out;
}

describe('the far vista\'s big pieces from model files', () => {
  it('every piece with a file is taken in (fitted onto its code-built piece); a grounded piece is fitted above the floor only', () => {
    expect(FILED.length).toBeGreaterThanOrEqual(3);
    expect(taken.sort()).toEqual(FILED.map((f) => f.name).sort());
    for (const { name } of FILED) {
      const box = vistaPieceBox(name)!, g = PROP_MODELS.get(name)!.geometry;
      g.computeBoundingBox();
      const b = g.boundingBox!;
      // fitted by height: the same floor, height and middle as the code-built piece
      expect(b.min.y, name).toBeCloseTo(box.min.y, 3);
      expect(b.max.y - b.min.y, name).toBeCloseTo(box.max.y - box.min.y, 3);
      expect((b.min.x + b.max.x) / 2, name).toBeCloseTo((box.min.x + box.max.x) / 2, 3);
      expect((b.min.z + b.max.z) / 2, name).toBeCloseTo((box.min.z + box.max.z) / 2, 3);
    }
    // the volcano's code-built island sinks 20 m of its skirt under the sea: its model stands on the sea
    expect(vistaPieceBox('vista-volcano')!.min.y).toBe(0);
    // a floating island hangs below its own middle
    expect(vistaPieceBox('vista-sky-island')!.min.y).toBeLessThan(-40);
  });

  describe.each(TRACKS.filter((d) => FILED.some((f) => f.biome === d.biome)).map((d) => [d.id, d] as const))('%s', (_id, def) => {
    const names = FILED.filter((f) => f.biome === def.biome).map((f) => f.name);

    it('stands each model where its code-built piece stood: one draw each, no shadow, not in the merged solid', () => {
      const scene = buildTrackScene(buildTrack(def), trackAssets(def.biome));
      const ms = models(scene);
      expect(ms.map((m) => m.userData.piece).sort()).toEqual([...names].sort());
      for (const m of ms) {
        const name = m.userData.piece as string, box = vistaPieceBox(name)!;
        expect(m.castShadow, name).toBe(false);
        expect(m.receiveShadow, name).toBe(false);
        expect(m.geometry, name).toBe(PROP_MODELS.get(name)!.geometry);
        expect(scene.vista!.pieces!.some((p) => p.name === name), name).toBe(false);
        for (const at of placements(m)) {
          // the model's box and the code-built piece's box, both where this placement puts them
          const got = m.geometry.boundingBox!.clone().applyMatrix4(at), want = box.clone().applyMatrix4(at);
          expect(got.min.y, name).toBeCloseTo(want.min.y, 1);
          expect(got.max.y, name).toBeCloseTo(want.max.y, 1);
          const c = got.getCenter(new Vector3()), w = want.getCenter(new Vector3());
          expect(Math.hypot(c.x - w.x, c.z - w.z), name).toBeLessThan(0.5 + 0.02 * (want.max.y - want.min.y));
        }
      }
      scene.dispose();
    });

    it('leaves the model files whole when the scene is freed (every race shares them)', () => {
      const scene = buildTrackScene(buildTrack(def), trackAssets(def.biome));
      let freed = 0;
      for (const m of models(scene)) {
        m.geometry.addEventListener('dispose', () => freed++);
        (m.material as Material).addEventListener('dispose', () => freed++);
      }
      scene.dispose();
      expect(freed).toBe(0);
    });

    it.each([['as authored', false], ['mirrored', true]] as const)('keeps its far landmark ahead of the start line (%s)', (_how, mirror) => {
      const d = mirror ? mirrorTrack(def) : def, track = buildTrack(d), scene = buildTrackScene(track, trackAssets(d.biome));
      const lm = scene.farLandmark!;
      const s = track.sample(track.startT, 0), f = Math.hypot(s.tangent[0], s.tangent[2]);
      const dx = lm[0] - s.position[0], dz = lm[2] - s.position[2], dist = Math.hypot(dx, dz);
      expect(Math.acos((dx * s.tangent[0] + dz * s.tangent[2]) / (dist * f)) * (180 / Math.PI)).toBeLessThan(35);
      expect(dist).toBeLessThan(700);
      scene.dispose();
    });
  });

  it('Lighthouse Loop: the volcano\'s smoke and the landmark rise from the model\'s own crater', () => {
    const def = TRACKS.find((d) => d.biome === 'harbour')!, scene = buildTrackScene(buildTrack(def), trackAssets(def.biome));
    const m = models(scene).find((x) => x.userData.piece === 'vista-volcano')!;
    const box = new Box3().setFromObject(m), lm = scene.farLandmark!;
    expect(lm[1]).toBeGreaterThan(box.max.y - 1);
    expect(lm[1]).toBeLessThan(box.max.y + 4);
    // over the model, not beside it
    expect(lm[0]).toBeGreaterThan(box.min.x);
    expect(lm[0]).toBeLessThan(box.max.x);
    expect(lm[2]).toBeGreaterThan(box.min.z);
    expect(lm[2]).toBeLessThan(box.max.z);
    scene.dispose();
  });

  it('Frostbite Pass: the eagles circle clear of the model peak, and the cable car climbs to its own slope', () => {
    const def = TRACKS.find((d) => d.biome === 'frost')!, scene = buildTrackScene(buildTrack(def), trackAssets(def.biome));
    const m = models(scene).find((x) => x.userData.piece === 'vista-peak')!;
    const eagles = (scene.vista!.life!.fliers as { what: string; anchor: number[]; move: number[] }[]).filter((f) => f.what === 'eagle');
    expect(eagles.length).toBe(2);
    const pos = m.geometry.getAttribute('position') as BufferAttribute, at = placements(m)[0], v = new Vector3();
    for (const e of eagles) {
      let reach = 0;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(at);
        if (v.y >= e.anchor[1] - 12) reach = Math.max(reach, Math.hypot(v.x - e.anchor[0], v.z - e.anchor[2]));
      }
      expect(reach, 'the mountain inside the ring').toBeLessThanOrEqual(e.move[3] - 20 + 1e-6);
    }
    // 72 m in front of the peak's middle there is slope to stand the top station on
    expect(heightAt(m.geometry, 0, 72)).toBeGreaterThan(30);
    scene.dispose();
  });

  it('Skyline Circuit: each island\'s waterfall pours off the front of its model\'s rim', () => {
    const def = TRACKS.find((d) => d.biome === 'skyline')!, scene = buildTrackScene(buildTrack(def), trackAssets(def.biome));
    const m = models(scene).find((x) => x.userData.piece === 'vista-sky-island')!;
    const glow = scene.group.getObjectByName('vista-glow') as Mesh, anchors = glow.geometry.getAttribute('aAnchor') as BufferAttribute;
    const seen = new Set<string>();
    const falls: Vector3[] = [];
    for (let i = 0; i < anchors.count; i++) {
      const k = `${anchors.getX(i).toFixed(2)},${anchors.getY(i).toFixed(2)},${anchors.getZ(i).toFixed(2)}`;
      if (!seen.has(k)) { seen.add(k); falls.push(new Vector3(anchors.getX(i), anchors.getY(i), anchors.getZ(i))); }
    }
    for (const at of placements(m)) {
      const box = m.geometry.boundingBox!.clone().applyMatrix4(at).expandByScalar(1);
      const h = box.max.y - box.min.y;
      // one of the glows starts on this island, in its upper part (its lip), not in the air beside it
      expect(falls.some((p) => box.containsPoint(p) && p.y > box.max.y - 0.5 * h)).toBe(true);
    }
    scene.dispose();
  });

  it('Mesa Rush: the butte file stands in for every banded column (the buttes, the trestle, the rope bridge, the gorge), each on its own column; no drum is left', () => {
    const def = TRACKS.find((d) => d.biome === 'canyon')!, track = buildTrack(def);
    const verts = (sc: TrackScene) => {
      const o: Record<string, number> = {};
      for (const p of sc.vista!.pieces!) o[p.name] = (o[p.name] ?? 0) + p.count;
      return o;
    };
    const drums = trackAssets(def.biome);
    delete drums.materials!['vista-butte']; // the file not in: every set-piece builds its own drums
    const before = buildTrackScene(track, drums), vb = verts(before);
    const scene = buildTrackScene(track, trackAssets(def.biome)), va = verts(scene);
    const m = models(scene).find((x) => x.userData.piece === 'vista-butte')!;
    const at = placements(m);
    expect(at.length).toBe(21); // three clusters of three, the trestle's two, the rope bridge's two, the gorge's eight
    expect(va['vista-buttes']).toBeUndefined();
    expect(vb['vista-buttes']).toBeGreaterThan(0);
    for (const k of ['vista-trestle', 'vista-rope-bridge', 'vista-gorge']) expect(va[k], k).toBeLessThan(vb[k]); // deck, planks and river stay
    const floors = at.map((a) => m.geometry.boundingBox!.clone().applyMatrix4(a).min.y);
    for (const a of at) {
      const b = m.geometry.boundingBox!.clone().applyMatrix4(a);
      expect(b.min.y).toBeCloseTo(floors[0], 3); // every one on the vista's floor, as its drums stood
      expect(b.max.y - b.min.y).toBeGreaterThan(35); // as tall as its column (36 to 72 m, with the cluster's scale)
      expect(b.max.y - b.min.y).toBeLessThan(90);
    }
    before.dispose();
    scene.dispose();
  });

  it("Mesa Rush's canyon walls: the wall's file is fitted onto the code-built wall's whole box and casts no real-time shadow (the draw budget; the baked shading shades the sand)", async () => {
    await adoptPropFiles(['cliff']);
    const { decorGeometry } = await import('./decor.ts');
    const box = decorGeometry('cliff')!.body.boundingBox!.clone(), g = PROP_MODELS.get('cliff')!.geometry;
    g.computeBoundingBox();
    for (const k of ['x', 'y', 'z'] as const) {
      expect(g.boundingBox!.min[k]).toBeCloseTo(box.min[k], 3);
      expect(g.boundingBox!.max[k]).toBeCloseTo(box.max[k], 3);
    }
    const def = TRACKS.find((d) => d.biome === 'canyon')!, scene = buildTrackScene(buildTrack(def), trackAssets(def.biome));
    const walls = scene.instancers.get('decor:cliff')!;
    expect(walls.material).toBe(PROP_MODELS.get('cliff')!.material);
    expect(walls.castShadow).toBe(false);
    expect(scene.instancers.get('decor:minecart')!.castShadow).toBe(true); // every other roadside prop still does
    scene.dispose();
  });

  it('two or more files share one draw, over an atlas of their pictures, where the page can draw one', () => {
    const picture = (w: number, h: number) => { const t = new Texture({ width: w, height: h }); t.flipY = false; return t; };
    const file = (w: number, h: number): PieceFile => ({ geometry: new BoxGeometry(1, 1, 1), material: new MeshStandardMaterial({ map: picture(w, h) }) });
    const a = file(64, 32), b = file(32, 32), drawn: { width: number; height: number; xs: number[] }[] = [];
    const canvas = ATLAS.canvas;
    ATLAS.canvas = (width, height, pictures) => { drawn.push({ width, height, xs: pictures.map((p) => p.x) }); return { width, height } as unknown as CanvasImageSource; };
    try {
      const two = new Matrix4().makeTranslation(10, 0, 0);
      const mesh = atlasMesh(new Map([['a', { file: a, at: [new Matrix4()] }], ['b', { file: b, at: [new Matrix4(), two] }]]))!;
      expect(drawn).toEqual([{ width: 96, height: 32, xs: [0, 64] }]);
      expect(mesh.geometry.getAttribute('position').count).toBe(24 * 3); // the three copies merged, in world space
      const uv = mesh.geometry.getAttribute('uv');
      for (let i = 0; i < 24; i++) expect(uv.getX(i)).toBeLessThanOrEqual(64 / 96 + 1e-6); // a's copy on its own part
      for (let i = 24; i < 72; i++) expect(uv.getX(i)).toBeGreaterThanOrEqual(64 / 96 - 1e-6); // b's two on theirs
      mesh.geometry.computeBoundingBox();
      expect(mesh.geometry.boundingBox!.max.x).toBeCloseTo(10.5, 6);
      const mat = mesh.material as MeshStandardMaterial;
      expect(mat.map!.flipY).toBe(false);
      expect(mesh.userData.pieces).toEqual(['a', 'b']);
      expect(mesh.userData.ownGeometry && mesh.userData.ownMaterial && mesh.userData.ownMap).toBe(true);
      // no page to draw on (the tests, a worker): each file keeps its own draw
      ATLAS.canvas = () => null;
      expect(atlasMesh(new Map([['a', { file: a, at: [new Matrix4()] }], ['b', { file: b, at: [two] }]]))).toBeNull();
    } finally { ATLAS.canvas = canvas; }
  });

  it("Lighthouse Loop in a page: the volcano and the sea stacks as one draw over one atlas, this scene's own and freed with it (the files stay whole)", () => {
    const def = TRACKS.find((d) => d.biome === 'harbour')!;
    const files = ['vista-volcano', 'vista-stacks'].map((n) => PROP_MODELS.get(n)!.material as MeshStandardMaterial);
    const maps = files.map((m) => m.map), canvas = ATLAS.canvas;
    files.forEach((m) => { m.map = new Texture({ width: 64, height: 64 }); m.map.flipY = false; });
    ATLAS.canvas = (width, height) => ({ width, height }) as unknown as CanvasImageSource;
    try {
      const scene = buildTrackScene(buildTrack(def), trackAssets(def.biome));
      const ms = models(scene);
      expect(ms.length).toBe(1);
      expect(ms[0].userData.pieces).toEqual(['vista-volcano', 'vista-stacks']);
      const own = ms[0], freed: string[] = [];
      own.geometry.addEventListener('dispose', () => freed.push('geometry'));
      (own.material as Material).addEventListener('dispose', () => freed.push('material'));
      (own.material as MeshStandardMaterial).map!.addEventListener('dispose', () => freed.push('map'));
      let shared = 0;
      for (const n of ['vista-volcano', 'vista-stacks']) {
        PROP_MODELS.get(n)!.geometry.addEventListener('dispose', () => shared++);
        PROP_MODELS.get(n)!.material.addEventListener('dispose', () => shared++);
      }
      scene.dispose();
      expect(freed.sort()).toEqual(['geometry', 'map', 'material']);
      expect(shared).toBe(0);
    } finally {
      files.forEach((m, i) => { m.map = maps[i]; });
      ATLAS.canvas = canvas;
    }
  });

  it('a piece without its file stays code-built (the file not in yet, or broken)', () => {
    const def = TRACKS.find((d) => d.biome === 'harbour')!, a = trackAssets(def.biome);
    // no model file for any piece: the assets' lookups come back empty
    a.materials = {};
    const scene = buildTrackScene(buildTrack(def), a);
    expect(models(scene).length).toBe(0);
    expect(scene.vista!.pieces!.some((p) => p.name === 'vista-volcano')).toBe(true);
    scene.dispose();
  });
});
