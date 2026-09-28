// The course's edge (edge.ts; art-pipeline edges.ts; fresh-eyes review item 1, 27 Sept 2026: "the road runs
// through an empty lawn"): on each land track a continuous, varied boundary just past the invisible course
// limit, clusters at the bends and jumps, and soft cover on the verge. Visual only, so it must stand where no
// kart can reach (the cover: only where karts drive through it), leave every other prop and the crowd where
// they stood, and be the same every build.
import { describe, expect, it } from 'vitest';
import type { BufferGeometry, Mesh } from 'three';
import { trackAssets } from '../../art-pipeline/index.ts';
import { EDGE_MODELS, edgeKit } from '../../art-pipeline/edges.ts';
import { decorGeometry } from '../../art-pipeline/decor.ts';
import { BUILDER } from '../constants.ts';
import { buildTrack } from '../track.ts';
import type { TrackDefinition } from '../types.ts';
import { insideCourse, insideRoadEnvelope } from './decor.ts';
import { freeStretches, profileAt } from './edge.ts';
import { buildTrackScene, type TrackAssets, type TrackScene } from './scene.ts';

const TRACKS = Object.values(import.meta.glob('../tracks/*.json', { eager: true, import: 'default' })) as TrackDefinition[];
const LAND = TRACKS.filter((d) => d.offroad);
/** Every road's drivable land reaches past its curb to the invisible course limit, stretch by stretch and side by side (limits.ts): pastCourse measures from it. */

function crowdOf(scene: TrackScene): { at: number[] }[] {
  for (const m of scene.vista?.world ?? []) {
    const c = (m.userData.crowd as { layout?: { spectators: { at: number[] }[] } } | undefined)?.layout;
    if (c) return c.spectators;
  }
  return [];
}

const scenes = new Map<string, { track: ReturnType<typeof buildTrack>; scene: TrackScene }>();
function built(def: TrackDefinition, assets: TrackAssets = trackAssets(def.biome)) {
  const key = `${def.id}:${assets.edge ? 'edge' : 'none'}`;
  let s = scenes.get(key);
  if (!s) {
    const track = buildTrack(def);
    s = { track, scene: buildTrackScene(track, assets) };
    scenes.set(key, s);
  }
  return s;
}

describe('the edge kit', () => {
  it('every land biome has one, a pier and a sky road none (their solid low edge is boundary.ts)', () => {
    for (const d of TRACKS) expect(!!edgeKit(d.biome), d.id).toBe(!!d.offroad);
  });

  it('every piece is code-built, vertex-coloured, cheap and stands on its origin (touching the ground; a rock or a mound partly sunk in it)', () => {
    for (const name of Object.keys(EDGE_MODELS)) {
      const g = decorGeometry(name)!.body;
      expect(g.hasAttribute('color'), name).toBe(true);
      expect(g.index!.count / 3, name).toBeLessThan(260);
      g.computeBoundingBox();
      expect(g.boundingBox!.min.y, name).toBeLessThanOrEqual(0.05);
      expect(g.boundingBox!.min.y, name).toBeGreaterThan(-0.8); // a mound is half under the snow
    }
  });

  it('the cover is small and low: karts drive through it (no taller than a kart, scaled up)', () => {
    for (const d of LAND) {
      for (const c of edgeKit(d.biome)!.drifts ?? []) {
        const g = decorGeometry(c.asset)!.body;
        g.computeBoundingBox();
        const b = g.boundingBox!, up = (c.scale ?? [0.8, 1.25])[1];
        expect(b.max.y * up, c.asset).toBeLessThan(1.1);
        expect(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) * up, c.asset).toBeLessThan(2.2);
      }
    }
  });

  it('a profile is linear between its points and nothing outside them', () => {
    const p = [[0, 0], [1, 1], [3, 0]] as const;
    expect(profileAt(p, -1)).toBe(0);
    expect(profileAt(p, 0.5)).toBeCloseTo(0.5);
    expect(profileAt(p, 2)).toBeCloseTo(0.5);
    expect(profileAt(p, 3)).toBe(0);
  });

  it('free stretches run round the lap, over the list\'s own start', () => {
    expect(freeStretches(Uint8Array.from([1, 1, 0, 1, 1, 0, 1]))).toEqual([[3, 2], [6, 3]]);
    expect(freeStretches(Uint8Array.from([1, 1, 1]))).toEqual([[0, 3]]);
    expect(freeStretches(Uint8Array.from([0, 0]))).toEqual([]);
  });
});

describe.each(LAND.map((d) => [d.id, d] as const))('%s: the course edge', (_id, def) => {
  it('lines most of the lap on both sides, with clusters and cover', () => {
    const { track, scene } = built(def);
    const e = scene.edge!;
    const L = track.branches.main.lut.length;
    const metres = e.runs.reduce((a, r) => a + ((((r.t1 - r.t0) % 1) + 1) % 1) * L, 0);
    // (where it cannot run: open edges and tunnels, buildings, the stands and rope lines, shortcut mouths)
    expect(metres / (2 * L), `${Math.round(metres)} m of ${Math.round(2 * L)}`).toBeGreaterThan(0.4);
    expect(new Set(e.runs.map((r) => r.style)).size, 'every style of the kit shows up').toBe(edgeKit(def.biome)!.styles.length);
    expect(e.pieces.filter((p) => p.kind === 'cluster').length).toBeGreaterThanOrEqual(6);
    expect(e.pieces.filter((p) => p.kind === 'cover').length).toBeGreaterThanOrEqual(60);
    expect(e.bank, 'the land rises into banks').not.toBeNull();
  });

  it('nothing of it stands where a kart can drive; its cover lies only on the drivable land, off every road and curb', () => {
    const { track, scene } = built(def);
    const e = scene.edge!, b = track.branches;
    let bad = '';
    for (const p of e.pieces) {
      if (p.kind === 'cover') {
        if (insideRoadEnvelope(b, p.x, p.z, -1, BUILDER.kerbWidth + 0.3)) bad ||= `cover ${p.asset} on a road at (${p.x.toFixed(1)}, ${p.z.toFixed(1)})`;
        if (!insideCourse(b, p.x, p.z, 0)) bad ||= `cover ${p.asset} past the limit at (${p.x.toFixed(1)}, ${p.z.toFixed(1)})`;
      } else if (insideCourse(b, p.x, p.z, p.row ? 0.2 : p.r * 0.9)) bad ||= `${p.kind} ${p.asset} inside the limit at (${p.x.toFixed(1)}, ${p.z.toFixed(1)})`;
    }
    // the bank's every point past every road's limit (the karts' land ends there), by the 0.1 m edge.ts keeps (the
    // limit moves along the road, limits.ts: a point's nearest sample may stand a tenth or so wider than its station's);
    // it joined the land's own mesh
    const pos = e.bank!.getAttribute('position'), coast = (scene.group.getObjectByName('coast') as Mesh).geometry.getAttribute('position');
    expect(coast.count).toBeGreaterThan(pos.count);
    for (let i = 0; i < pos.count; i += 3) {
      if (insideCourse(b, pos.getX(i), pos.getZ(i), 0.1 - 1e-6)) { bad ||= `bank point ${i} inside the limit`; break; }
    }
    expect(bad).toBe('');
  });

  it('keeps clear of the crowd, and leaves every other prop and every critter where it stood', () => {
    const withEdge = built(def), without = built(def, { ...trackAssets(def.biome), edge: undefined });
    const crowd = crowdOf(withEdge.scene);
    expect(crowd.length).toBeGreaterThan(20);
    expect(crowd).toEqual(crowdOf(without.scene));
    let near = '';
    for (const p of withEdge.scene.edge!.pieces) {
      if (p.kind === 'cover') continue;
      for (const c of crowd) if (Math.hypot(c.at[0] - p.x, c.at[2] - p.z) < 1.5) near ||= `${p.asset} by a critter`;
    }
    expect(near).toBe('');
    // the decor's places: the same, but where a bank now runs under one it is lifted onto it
    const a = withEdge.scene.decor, z = without.scene.decor;
    expect(a.length).toBe(z.length);
    for (let k = 0; k < a.length; k++) {
      expect(a[k].count, a[k].asset).toBe(z[k].count);
      for (let i = 0; i < a[k].count; i++) {
        const o = i * 16;
        expect(a[k].matrices[o + 12], a[k].asset).toBe(z[k].matrices[o + 12]);
        expect(a[k].matrices[o + 14], a[k].asset).toBe(z[k].matrices[o + 14]);
        expect(a[k].matrices[o + 13], a[k].asset).toBeGreaterThanOrEqual(z[k].matrices[o + 13] - 1e-6);
      }
    }
  });

  it('is the same every build', () => {
    const one = built(def).scene.edge!;
    const two = buildTrackScene(buildTrack(def), trackAssets(def.biome));
    expect(two.edge!.runs).toEqual(one.runs);
    expect(two.edge!.pieces).toEqual(one.pieces);
    const g1 = (built(def).scene.group.getObjectByName('coast') as Mesh).geometry as BufferGeometry;
    const g2 = (two.group.getObjectByName('coast') as Mesh).geometry as BufferGeometry;
    expect(Array.from(g2.getAttribute('position').array as Float32Array)).toEqual(Array.from(g1.getAttribute('position').array as Float32Array));
    two.dispose();
  });
});

it('a pier and a sky road get no edge', () => {
  for (const d of TRACKS.filter((t) => !t.offroad)) {
    const scene = buildTrackScene(buildTrack(d), trackAssets(d.biome));
    expect(scene.edge?.runs.length ?? 0, d.id).toBe(0);
    scene.dispose();
  }
});
