// Race day on the course (raceDressing.ts; art-pipeline signs.ts; the second fresh-eyes review, item 2, 28 Sept 2026:
// "arrow boards stand on one bend per track, 13 m out, as 20-pixel specks, and nothing anywhere carries a word, a banner
// or a flag"). Visual only: every piece stands where no kart can reach, off every road the race or its Final Lap Shift
// lays, clear of the crowd; the arrows point the way the road goes, every face reads the right way round from where it
// is seen, and it all rides in the merged dressing (no new draw on a land track) inside each track's triangle budget.
import { describe, expect, it } from 'vitest';
import { Vector3, type BufferAttribute, type BufferGeometry, type MeshStandardMaterial, type MeshToonMaterial } from 'three';
import { trackAssets } from '../../art-pipeline/index.ts';
import { signKit } from '../../art-pipeline/signs.ts';
import { buildTrack, type Track } from '../track.ts';
import type { TrackDefinition } from '../types.ts';
import { pastCourse } from './decor.ts';
import { DRESSING_SLICES, mergeInstances } from './merge.ts';
import { ARROWS, BANNERS, BENDS, gantryDressing, placeRaceDressing, realBends, type RaceDressingKit } from './raceDressing.ts';
import { buildTrackScene, type TrackScene } from './scene.ts';

const TRACKS = Object.values(import.meta.glob('../tracks/*.json', { eager: true, import: 'default' })) as TrackDefinition[];

const scenes = new Map<string, { track: Track; twin: Track; scene: TrackScene }>();
function built(def: TrackDefinition) {
  let s = scenes.get(def.id);
  if (!s) {
    const track = buildTrack(def), twin = buildTrack(def);
    twin.applyFinalLapShift([]);
    s = { track, twin, scene: buildTrackScene(track, trackAssets(def.biome)) };
    scenes.set(def.id, s);
  }
  return s;
}
const crowdOf = (scene: TrackScene): { at: number[] }[] => {
  for (const m of scene.vista?.world ?? []) {
    const c = (m.userData.crowd as { layout?: { spectators: { at: number[] }[] } } | undefined)?.layout;
    if (c) return c.spectators;
  }
  return [];
};
const wrap = (t: number) => ((t % 1) + 1) % 1;

describe('the bends', () => {
  it('finds the real bends of every track (turning 25 degrees or more at a radius under 140 m), each with its outside', () => {
    for (const def of TRACKS) {
      const lut = buildTrack(def).branches.main.lut, bends = realBends(lut);
      expect(bends.length, def.id).toBeGreaterThanOrEqual(2);
      for (const b of bends) {
        expect(b.turn, def.id).toBeGreaterThanOrEqual(BENDS.turn);
        expect(Math.abs(b.side), def.id).toBe(1);
      }
    }
    // the hairpin and the long sweep of Windmill Run; Lighthouse Loop's turn one
    const meadow = realBends(buildTrack(TRACKS.find((d) => d.id === 'meadow-run')!).branches.main.lut);
    expect(meadow.some((b) => b.turn > (150 * Math.PI) / 180 && wrap(b.t0 - 0.95) < 0.02)).toBe(true);
    const harbour = realBends(buildTrack(TRACKS.find((d) => d.id === 'harbour-loop')!).branches.main.lut);
    expect(harbour.some((b) => b.t0 > 0.18 && b.t0 < 0.22)).toBe(true);
  });
});

describe.each(TRACKS.map((d) => [d.id, d] as const))('%s: race day', (_id, def) => {
  it('arrow boards on every real bend, on its outside, their chevrons pointing the way the road goes', () => {
    const { track, scene } = built(def), race = scene.race!, L = track.branches.main.lut;
    expect(race).toBeDefined();
    for (const b of race.bends) {
      const on = race.pieces.filter((p) => p.kind === 'arrow' && wrap(p.t - b.t0) <= wrap(b.t1 - b.t0));
      expect(on.length, `${def.id} bend ${b.t0.toFixed(3)}`).toBeGreaterThanOrEqual(2);
      for (const p of on) expect(p.side, `${def.id} bend ${b.t0.toFixed(3)}: the outside`).toBe(b.side);
    }
    for (const p of race.pieces.filter((q) => q.kind === 'arrow')) {
      // a driver 30 m back looks at it: the road 25 m on runs off to the side its chevrons point to
      const eye = L.sample(wrap(p.t - 30 / L.length), 0), ahead = L.sample(wrap(p.t + 25 / L.length), 0).position;
      const fx = eye.tangent[0], fz = eye.tangent[2], rightX = -fz, rightZ = fx; // forward × up: the viewer's right
      const toward = (ahead[0] - p.x) * rightX + (ahead[2] - p.z) * rightZ;
      expect(toward > 0, `${def.id} t ${p.t.toFixed(3)}: chevrons ${p.flip ? 'right' : 'left'}`).toBe(p.flip === true);
    }
  });

  it('boards face the karts coming at them, and every face reads left to right from the side it is seen', () => {
    const { track, scene } = built(def), L = track.branches.main.lut;
    for (const p of scene.race!.pieces.filter((q) => q.kind === 'arrow' || q.kind === 'billboard')) {
      const nx = -Math.sin(p.yaw), nz = -Math.cos(p.yaw), back = L.sample(wrap(p.t - 20 / L.length), 0).position;
      expect((back[0] - p.x) * nx + (back[2] - p.z) * nz, `${def.id} ${p.kind} t ${p.t.toFixed(3)}`).toBeGreaterThan(0);
    }
    // every textured triangle of the dressing: its u runs toward its viewer's right ((-n) × up)
    const kit = signKit(def.biome)!;
    let faces = 0;
    for (const m of scene.dressing) {
      const g = m.geometry, uv = g.getAttribute('uv') as BufferAttribute, pos = g.getAttribute('position'), idx = g.index!;
      for (let f = 0; f < idx.count; f += 3) {
        const [a, b, c] = [idx.getX(f), idx.getX(f + 1), idx.getX(f + 2)];
        if (uv.getX(a) === kit.white[0] && uv.getY(a) === kit.white[1]) continue;
        // (the chevrons carry no words: a bend the other way mirrors them on purpose)
        const [u0, v0, u1, v1] = kit.arrow, ua = uv.getX(a), va = uv.getY(a);
        if (ua >= u0 - 1e-6 && ua <= u1 + 1e-6 && va >= v0 - 1e-6 && va <= v1 + 1e-6) continue;
        faces++;
        const P = [a, b, c].map((i) => new Vector3().fromBufferAttribute(pos, i)), U = [a, b, c].map((i) => uv.getX(i));
        const e1 = P[1].clone().sub(P[0]), e2 = P[2].clone().sub(P[0]), n = e1.clone().cross(e2).normalize();
        const right = n.clone().negate().cross(new Vector3(0, 1, 0));
        // the gradient of u across the triangle, in its own plane: g . e1 = du1, g . e2 = du2
        const du1 = U[1] - U[0], du2 = U[2] - U[0], a11 = e1.dot(e1), a22 = e2.dot(e2), a12 = e1.dot(e2), D = a11 * a22 - a12 * a12;
        if (D < 1e-12) continue;
        const grad = e1.clone().multiplyScalar((du1 * a22 - du2 * a12) / D).add(e2.clone().multiplyScalar((du2 * a11 - du1 * a12) / D));
        if (grad.length() < 1e-9 || right.length() < 0.5) continue; // a face lying flat has no left or right
        expect(grad.dot(right), `${def.id}: a face at (${P[0].x.toFixed(1)}, ${P[0].y.toFixed(1)}, ${P[0].z.toFixed(1)}) u ${U.map((u) => u.toFixed(3))} reads backwards`).toBeGreaterThan(0);
      }
    }
    expect(faces).toBeGreaterThan(50);
  });

  it('stands wholly where no kart can reach: past every road the race or its final lap lays, clear of the crowd', () => {
    const { track, twin, scene } = built(def);
    const course = [...track.branches.list.map((b) => b.lut), twin.branches.main.lut];
    const crowd = crowdOf(scene);
    for (const p of scene.race!.pieces) {
      if (p.kind === 'banner') {
        // its poles, each past its side's limit; the banner itself hangs over the road, clear over any kart and the lens
        const L = track.branches.main.lut, j = L.idx(Math.round(p.t * L.step));
        for (const [k, s] of [[0, -1], [1, 1]] as const) {
          const o = p.poles![k], x = L.px[j] + L.rx[j] * s * o, z = L.pz[j] + L.rz[j] * s * o;
          for (const lut of course) expect(pastCourse(lut, x, z), `${def.id} banner pole t ${p.t.toFixed(3)}`).toBeGreaterThan(0.1);
        }
        expect(BANNERS.bottom).toBeGreaterThan(6);
        continue;
      }
      const ax = Math.cos(p.yaw), az = -Math.sin(p.yaw);
      for (const e of [-1, 0, 1]) {
        const x = p.x + ax * p.half * e, z = p.z + az * p.half * e;
        for (const lut of course) expect(pastCourse(lut, x, z), `${def.id} ${p.kind} t ${p.t.toFixed(3)}`).toBeGreaterThan(0.1);
      }
      for (const c of crowd) expect(Math.hypot(c.at[0] - p.x, c.at[2] - p.z), `${def.id} ${p.kind} in the crowd`).toBeGreaterThan(1);
    }
  });

  it('flags line the start straight, and the straights carry flags and sponsor boards; banners hang over the road', () => {
    const { track, scene } = built(def), race = scene.race!, L = track.length;
    const near = race.pieces.filter((p) => p.kind === 'flag' && Math.abs(((p.t - track.startT + 1.5) % 1) - 0.5) * L < 70);
    expect(near.length, def.id).toBeGreaterThanOrEqual(6);
    expect(new Set(near.map((p) => p.side)).size, `${def.id}: both sides`).toBe(2);
    expect(race.pieces.filter((p) => p.kind === 'billboard').length, def.id).toBeGreaterThanOrEqual(3);
    if (def.offroad) expect(race.pieces.filter((p) => p.kind === 'aframe').length, def.id).toBeGreaterThanOrEqual(5);
    expect(race.pieces.filter((p) => p.kind === 'banner').length, def.id).toBeGreaterThanOrEqual(1);
  });

  it('rides in the merged dressing: the atlas on its material, plain white under every other prop, inside the triangle budget', () => {
    const { scene } = built(def), kit = signKit(def.biome)!;
    expect(scene.dressing.length).toBeGreaterThan(0);
    // a pier or a sky road has nothing else merged: one slice, two draws with its shadow
    if (!def.offroad) expect(scene.dressing.filter((m) => m.name.includes(':near:')).length).toBe(1);
    else expect(scene.dressing.length).toBeLessThanOrEqual(DRESSING_SLICES.near + DRESSING_SLICES.far);
    for (const m of scene.dressing) {
      const mat = m.material as MeshToonMaterial | MeshStandardMaterial;
      expect(mat.map, m.name).toBe(kit.atlas);
      expect(m.geometry.hasAttribute('uv'), m.name).toBe(true);
    }
    let tris = 0;
    for (const it of scene.race!.items) tris += (it.geometry.index!.count / 3) * it.count;
    expect(tris, def.id).toBeLessThan(1600);
  });

  it('is the same every build', () => {
    const one = built(def).scene.race!;
    const two = buildTrackScene(buildTrack(def), trackAssets(def.biome)).race!;
    expect(two.pieces).toEqual(one.pieces);
  });
});

describe('the pieces', () => {
  const kit = signKit('meadow') as RaceDressingKit;
  it('the old little corner signs are placed as before (the same random numbers after them) but drawn nowhere', () => {
    const def = TRACKS.find((d) => d.id === 'frostbite-pass')!, { scene } = built(def);
    const signs = scene.decor.filter((p) => p.asset === 'frost-sign');
    expect(signs.length).toBe(2);
    for (const p of signs) { expect(p.hidden).toBe(true); expect(p.count).toBeGreaterThan(0); }
    expect(scene.instancers.has('decor:frost-sign')).toBe(false);
  });

  it('a merge without the atlas carries no uv; with it, a sign keeps its own and every other copy the white spot', () => {
    const plain = mergeInstances([{ geometry: scene0().dressing[0].geometry, matrices: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]), count: 1 }]);
    expect(plain).not.toBeNull();
    expect(plain!.hasAttribute('uv')).toBe(false);
    const g = gantryDressing(kit, [0, 0, 0], [0, 0, 1], 10, 7.7, 6.0, 2.8)!;
    expect(g.geometry.userData.atlas).toBe(true);
    const merged = mergeInstances([g, { geometry: stripUv(g.geometry), matrices: g.matrices, count: 1 }], kit.white)!;
    const uv = merged.getAttribute('uv'), n = g.geometry.getAttribute('position').count;
    let own = 0;
    for (let i = 0; i < n; i++) if (uv.getX(i) !== kit.white[0] || uv.getY(i) !== kit.white[1]) own++;
    expect(own).toBeGreaterThan(8);
    for (let i = n; i < 2 * n; i++) expect([uv.getX(i), uv.getY(i)]).toEqual([...kit.white]);
  });

  it('a board is two to three times the old corner sign (1.9 m by 1.05 m), up where it reads over the verge', () => {
    expect(ARROWS.w / 1.9).toBeGreaterThanOrEqual(2);
    expect(ARROWS.w / 1.9).toBeLessThanOrEqual(3);
    expect(ARROWS.lift).toBeGreaterThanOrEqual(1);
  });

  it('never throws on a track with no room: an empty dressing', () => {
    const def = TRACKS.find((d) => d.id === 'skyline-circuit')!, track = buildTrack(def);
    const everywhere = { hits: () => true, add: () => {} } as unknown as Parameters<typeof placeRaceDressing>[0]['occupied'];
    const r = placeRaceDressing({ branches: track.branches, course: [track.branches.main.lut], kit, seed: def.id, startT: track.startT, jumps: [], loops: [], occupied: everywhere, avoid: [], spans: [], edgeTop: 0.6 });
    expect(r.pieces.length).toBe(0);
    expect(r.items.length).toBe(0);
  });
});

function scene0(): TrackScene { return built(TRACKS.find((d) => d.id === 'meadow-run')!).scene; }
function stripUv(g: BufferGeometry): BufferGeometry {
  const c = g.clone();
  c.userData = {};
  return c;
}
