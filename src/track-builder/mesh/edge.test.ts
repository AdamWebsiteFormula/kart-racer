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
/** The crowd's stands and rope lines: where each stands, its turn, its half-sizes (across the road, along it). */
function standsOf(scene: TrackScene): { at: number[]; yaw: number; half: number[] }[] {
  for (const m of scene.vista?.world ?? []) {
    const c = (m.userData.crowd as { layout?: { solids: { at: number[]; yaw: number; half: number[] }[] } } | undefined)?.layout;
    if (c) return c.solids;
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

  it('where the course limit stands, something stands with it: a run of the edge, the rail, a prop, the stands, the gantry (28 Sept 2026: Lighthouse Loop\'s lawn stopped a kart against nothing)', () => {
    const { track, scene } = built(def);
    const e = scene.edge!, L = track.branches.main.lut;
    // what stands up past the limit: the edge's own pieces (not its drive-through cover), every roadside and far prop, the stands
    const standing: { x: number; z: number; r: number }[] = [];
    for (const p of e.pieces) if (p.kind !== 'cover') standing.push({ x: p.x, z: p.z, r: p.r });
    for (const d of scene.decor) {
      // (a placement another dressing takes the place of stands nowhere: the old corner signs, raceDressing.ts)
      if (d.band === 'verge' || d.band === 'sky' || d.hidden) continue;
      for (let i = 0; i < d.count; i++) {
        const m = d.matrices, o = i * 16, s = Math.hypot(m[o], m[o + 1], m[o + 2]);
        if (s > 0) standing.push({ x: m[o + 12], z: m[o + 14], r: d.footprint * s });
      }
    }
    // the race dressing's arrow boards, flags, sponsor boards and banners' poles
    for (const p of scene.race?.pieces ?? []) if (p.kind !== 'banner' && p.kind !== 'gantry') standing.push({ x: p.x, z: p.z, r: p.kind === 'flag' ? 0.5 : 1.5 });
    for (const c of crowdOf(scene)) standing.push({ x: c.at[0], z: c.at[2], r: 0.5 });
    for (const st of standsOf(scene)) {
      // a stand or a rope line: its half-sizes across the road (its local Z) and along it (local X)
      const ax = Math.sin(st.yaw), az = Math.cos(st.yaw);
      for (let q = -st.half[1]; q <= st.half[1] + 1e-6; q += 1) standing.push({ x: st.at[0] + az * q, z: st.at[2] - ax * q, r: st.half[0] });
    }
    const inRun = (t: number, s: number) => e.runs.some((r) => r.side === s && ((((t - r.t0) % 1) + 1) % 1) <= ((((r.t1 - r.t0) % 1) + 1) % 1) + 1e-6);
    // the track as its Final Lap Shift leaves it (scene.ts shiftedTwin): where its road's land reaches past the first
    // laps' limit (Mesa Rush's final lap takes the mine), karts drive there on the last lap, so nothing may stand on it
    const twin = buildTrack(def);
    twin.applyFinalLapShift([]);
    const n = Math.floor(L.length);
    let bare = 0, longest = 0, where = '';
    for (const s of [-1, 1]) {
      let run = 0;
      for (let k = 0; k <= n; k++) {
        const t = (k % n) / n, j = L.idx(Math.round(t * L.step));
        let seen = k === n || !!(L.covered[j] || L.open[j] & (s < 0 ? 1 : 2)) || inRun(t, s);
        if (!seen) {
          const l = L.hw[j] + BUILDER.kerbWidth + (s < 0 ? L.reachL[j] : L.reachR[j]);
          const x = L.px[j] + L.rx[j] * s * l, z = L.pz[j] + L.rz[j] * s * l;
          // within 2.5 m past it; or another road's ground comes within a metre (the two roads' land meets: nothing may
          // stand on either), or the start gantry's pillar stands on it
          seen = standing.some((q) => Math.hypot(q.x - x, q.z - z) - q.r < 2.5) || insideCourse(track.branches, x, z, 1, 0)
            || insideCourse(twin.branches, x + L.rx[j] * s, z + L.rz[j] * s, 0)
            || Math.abs(((t - track.startT + 1.5) % 1) - 0.5) * L.length < 3;
        }
        if (!seen) { run++; continue; }
        // (a sliver under 3 m between two things that stand, at the end of a run or beside a prop, is a gap in a fence line, not a lawn)
        if (run >= 3) bare += run;
        if (run > longest) { longest = run; where = `${s < 0 ? 'left' : 'right'} of t ${((k - run) / n).toFixed(3)}-${t.toFixed(3)}`; }
        run = 0;
      }
    }
    // a few short gaps at the ends of runs and beside props (by this measure, before the rail: Lighthouse Loop 166 m bare
    // of 2,034, the longest 19 m, its lawn by the start 6 and 13 m; Mesa Rush 119, Frostbite Pass 118, Windmill Run 101;
    // after it 20, 20, 21 and 28 m, the longest 10 m, where the limit meets Frostbite's frozen lake and its clear ring)
    expect(bare / (2 * n), `${bare} m bare of ${2 * n}`).toBeLessThan(0.02);
    expect(longest, `the longest bare stretch: ${longest} m, ${where}`).toBeLessThanOrEqual(12);
    // and the rail lines what the runs leave, round what stands there
    expect(e.rails.length).toBeGreaterThan(10);
    expect(e.pieces.filter((p) => p.kind === 'rail').length).toBeGreaterThan(40);
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
