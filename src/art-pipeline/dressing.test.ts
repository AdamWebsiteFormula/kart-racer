// The Mario Kart World density pass (24 Sept 2026): Frostbite Pass and Canyon Rush layered near, mid
// and far, most of it baked into the track's merged dressing (track-builder mesh/merge.ts). Real art
// (trackAssets), so footprints, rows and spans are the game's own.
import { describe, expect, it } from 'vitest';
import { BoxGeometry, BufferAttribute, Matrix4, Vector3, type BufferGeometry, type Mesh } from 'three';
import { BUILDER } from '../track-builder/constants.ts';
import { buildTrack } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { cloneDef } from '../track-builder/__tests__/fixtures.ts';
import { insideRoadEnvelope, pushTransform } from '../track-builder/mesh/decor.ts';
import { DRESSING_SLICES, mergeInstances, sliceOf } from '../track-builder/mesh/merge.ts';
import { buildTrackScene } from '../track-builder/mesh/scene.ts';
import frostJson from '../track-builder/tracks/frostbite-pass.json';
import canyonJson from '../track-builder/tracks/canyon-rush.json';
import { DRESSING_MODELS, SPAN_HALF } from './dressing.ts';
import { decorGeometry } from './decor.ts';
import { trackAssets } from './index.ts';

const all = Object.values(import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' })) as TrackDefinition[];
const dense = [frostJson, canyonJson] as unknown as TrackDefinition[];

function coloured(g: BufferGeometry): BufferGeometry {
  const n = g.getAttribute('position').count;
  g.setAttribute('color', new BufferAttribute(new Float32Array(n * 3).fill(0.5), 3));
  return g;
}

describe('mergeInstances', () => {
  it('bakes every copy of every item into one indexed geometry: moved, turned, colours kept', () => {
    const box = coloured(new BoxGeometry(1, 2, 1)), m: number[] = [];
    pushTransform(m, [10, 0, 0], Math.PI / 2, [2, 2, 2]);
    pushTransform(m, [0, 5, 0], 0);
    const g = mergeInstances([{ geometry: box, matrices: Float32Array.from(m), count: 2 }, { geometry: box, matrices: Float32Array.from(m), count: 1 }])!;
    expect(g.getAttribute('position').count).toBe(box.getAttribute('position').count * 3);
    expect(g.index!.count).toBe(box.index!.count * 3);
    g.computeBoundingBox();
    expect(g.boundingBox!.max.x).toBeCloseTo(11, 5);
    expect(g.boundingBox!.max.y).toBeCloseTo(6, 5);
    const n = g.getAttribute('normal') as BufferAttribute, v = new Vector3();
    for (let i = 0; i < n.count; i++) expect(v.fromBufferAttribute(n, i).length()).toBeCloseTo(1, 5);
    expect(Array.from(g.getAttribute('color').array).every((c) => c === 0.5)).toBe(true);
    expect(mergeInstances([])).toBeNull();
  });

  it('slices the ground round the centre into wedges', () => {
    const seen = new Set<number>();
    for (let a = 0; a < 64; a++) seen.add(sliceOf(Math.cos(a / 10) * 50, Math.sin(a / 10) * 50, 0, 0, 4));
    expect([...seen].sort()).toEqual([0, 1, 2, 3]);
  });
});

describe.each(dense.map((d) => [d.id, d] as const))('%s at Mario Kart World density', (_id, raw) => {
  const def = cloneDef(raw), track = buildTrack(def), scene = buildTrackScene(track, trackAssets(def.biome));
  const lut = track.branches.main.lut, entries = def.environment!.decor!;
  const limit = BUILDER.kerbWidth + BUILDER.offroadReach;

  it('places (nearly) every piece of every entry, and bakes the merged ones into at most six slices', () => {
    // exact today; a little slack so a reshaped road does not fail here first (scene.test.ts checks exact counts)
    scene.decor.forEach((p, k) => expect(p.count, `${k} ${p.asset}`).toBeGreaterThanOrEqual(Math.floor(entries[k].instances * 0.85)));
    const merged = new Set(entries.filter((e) => e.merge).map((e) => e.asset));
    expect(merged.size).toBeGreaterThanOrEqual(12);
    expect(scene.dressing.length).toBeLessThanOrEqual(DRESSING_SLICES.near + DRESSING_SLICES.far);
    for (const e of entries.filter((x) => x.merge)) expect(scene.instancers.has(`decor:${e.asset}`), e.asset).toBe(false);
    for (const m of scene.dressing) expect(m.castShadow).toBe(m.name.includes(':near:'));
  });

  it('no prop stands where a kart can drive: every ground prop past the course limit (ground cover off the road and curb)', () => {
    let bad = '';
    scene.decor.forEach((p) => {
      if (p.layout === 'span' || p.band === 'sky') return;
      const pad = p.band === 'verge' ? BUILDER.kerbWidth + 0.5 : limit + 0.5;
      for (let i = 0; i < p.count; i++) {
        const x = p.matrices[i * 16 + 12], z = p.matrices[i * 16 + 14];
        if (insideRoadEnvelope(track.branches, x, z, -1, pad)) bad ||= `${p.asset} ${i} at (${x.toFixed(1)}, ${z.toFixed(1)})`;
      }
    });
    expect(bad).toBe('');
  });

  it('something stands near the road all the way round, and a middle and far layer frame every quarter of the lap', () => {
    const near = scene.decor.filter((p) => p.band === 'roadside');
    const far = scene.decor.filter((p) => p.band === 'far');
    const step = Math.max(1, Math.round(20 / (lut.length / lut.step)));
    let worst = 0, where = 0;
    const farPerQuarter = [0, 0, 0, 0];
    for (let i = 0; i < lut.n; i += step) {
      const x = lut.px[i], z = lut.pz[i];
      if (lut.open[i]) continue; // a drop beside the road (a ledge, a bridge): nothing stands there
      let best = Infinity;
      for (const p of near) for (let k = 0; k < p.count; k++) best = Math.min(best, Math.hypot(p.matrices[k * 16 + 12] - x, p.matrices[k * 16 + 14] - z) - lut.hw[i]);
      if (best > worst) { worst = best; where = i / lut.step; }
      for (const p of far) for (let k = 0; k < p.count; k++) {
        const d = Math.hypot(p.matrices[k * 16 + 12] - x, p.matrices[k * 16 + 14] - z);
        if (d < 110) farPerQuarter[Math.min(3, Math.floor((i / lut.n) * 4))]++;
      }
    }
    // never more than this far past the road's edge to the nearest roadside piece, anywhere on the lap
    expect(worst, `gap at t ${where.toFixed(3)}`).toBeLessThan(26);
    for (const n of farPerQuarter) expect(n).toBeGreaterThan(40);
  });

  it('disposes every merged slice: geometry and material', () => {
    const s = buildTrackScene(buildTrack(cloneDef(raw)), trackAssets(def.biome));
    let geos = 0, mats = 0;
    for (const m of s.dressing as Mesh[]) {
      m.geometry.addEventListener('dispose', () => geos++);
      (m.material as unknown as { addEventListener: (t: string, f: () => void) => void }).addEventListener('dispose', () => mats++);
    }
    expect(s.dressing.length).toBeGreaterThan(0);
    s.dispose();
    expect(geos).toBe(s.dressing.length);
    expect(mats).toBe(s.dressing.length);
    expect(s.group.children.length).toBe(0);
  });
});

const spanned = all.filter((d) => (d.environment?.decor ?? []).some((e) => e.layout === 'span'));
describe.each(spanned.map((d) => [d.id, d] as const))('%s: spans', (_id, raw) => {
  const def = cloneDef(raw), track = buildTrack(def), scene = buildTrackScene(track, trackAssets(def.biome));
  const limit = BUILDER.kerbWidth + BUILDER.offroadReach;

  it('a span crosses high over the road, its legs past the course limit on both sides', () => {
    const spans = scene.decor.filter((p) => p.layout === 'span');
    expect(spans.reduce((n, p) => n + p.count, 0)).toBeGreaterThanOrEqual(2);
    const m = new Matrix4(), v = new Vector3();
    for (const p of spans) {
      const g = trackAssets(def.biome).geometries![p.asset], pos = g.getAttribute('position');
      for (let i = 0; i < p.count; i++) {
        m.fromArray(p.matrices, i * 16);
        const roadY = p.matrices[i * 16 + 13];
        let legs = 0;
        for (let j = 0; j < pos.count; j++) {
          v.fromBufferAttribute(pos, j).applyMatrix4(m);
          // over the drivable ground it stays well above a kart in the air; near the ground it is only its legs, past the limit
          if (insideRoadEnvelope(track.branches, v.x, v.z, -1, limit)) expect(v.y - roadY, `${p.asset} over the road`).toBeGreaterThan(5.5);
          else if (v.y - roadY < 1) legs++;
        }
        expect(legs).toBeGreaterThan(0);
      }
    }
  });

});

it('only off-road tracks take spans (their legs stand past a course limit)', () => {
  for (const d of all) {
    const spans = (d.environment?.decor ?? []).filter((e) => e.layout === 'span');
    if (spans.length) expect(d.offroad, d.id).toBe(true);
  }
});

describe('the dressing models', () => {
  it('stand on the ground, under their budgets, vertex-coloured; spans are SPAN_HALF wide with legs reaching below the road', () => {
    for (const name of Object.keys(DRESSING_MODELS)) {
      const g = decorGeometry(name)!.body;
      g.computeBoundingBox();
      const b = g.boundingBox!;
      expect(g.hasAttribute('color'), name).toBe(true);
      expect(b.min.y, name).toBeLessThanOrEqual(0.02);
      // repeated by the hundred: small; set-pieces and spans (a handful a track) a little more
      expect(g.index!.count / 3, name).toBeLessThan(/bunting|span|falls|cliff|pond/.test(name) ? 950 : 400);
      if (/bunting|span/.test(name)) {
        expect(Math.max(-b.min.x, b.max.x), name).toBeCloseTo(SPAN_HALF, 0);
        expect(b.min.y, name).toBeLessThan(-2.5);
      }
    }
  });
});
