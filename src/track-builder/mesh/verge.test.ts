// The PBR look's grass by the road (verge.ts): tufts along both curbs of an off-road track, never on a
// road or curb, the same every build.
import { describe, expect, it } from 'vitest';
import { BUILDER } from '../constants.ts';
import { buildTrack } from '../track.ts';
import { HARBOUR_LOOP, HARBOUR_WALLED } from '../__tests__/fixtures.ts';
import { insideRoadEnvelope } from './decor.ts';
import { placeGrass, VERGE_GRASS } from './verge.ts';

describe('grass by the road', () => {
  const track = buildTrack(HARBOUR_LOOP);
  const g = placeGrass(track.branches, HARBOUR_LOOP.id, undefined, track.jumps);

  it('lines both curbs of Harbor Loop in the thousands, a few with flowers', () => {
    expect(g.count).toBeGreaterThan(4000);
    expect(g.count).toBeLessThan(9000); // 13 triangles each: about 100 k at most
    expect(g.matrices.length).toBe(g.count * 16);
    expect(g.kinds.length).toBe(g.count * 2);
    let flowers = 0;
    for (let i = 0; i < g.count; i++) {
      const kind = g.kinds[i * 2], seed = g.kinds[i * 2 + 1];
      expect([0, 1, 2, 3]).toContain(kind);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThan(1);
      if (kind > 0) flowers++;
    }
    expect(flowers / g.count).toBeGreaterThan(VERGE_GRASS.flowers * 0.6);
    expect(flowers / g.count).toBeLessThan(VERGE_GRASS.flowers * 1.4);
  });

  it('never on a road or a curb, and mostly close to the curb', () => {
    const main = track.branches.main.lut;
    let near = 0;
    for (let i = 0; i < g.count; i++) {
      const x = g.matrices[i * 16 + 12], z = g.matrices[i * 16 + 14];
      expect(insideRoadEnvelope(track.branches, x, z, -1, BUILDER.kerbWidth), `tuft ${i}`).toBe(false);
      // metres past the main road's curb (its nearest sample)
      let best = Infinity, hw = 0;
      for (let k = 0; k < main.n; k += 2) {
        const d = Math.hypot(main.px[k] - x, main.pz[k] - z);
        if (d < best) { best = d; hw = main.hw[k]; }
      }
      if (best - hw - BUILDER.kerbWidth < VERGE_GRASS.edge[1]) near++;
    }
    expect(near / g.count).toBeGreaterThan(0.6);
  });

  it('is the same every build, and a walled track (a pier, a sky road) has none', () => {
    const again = placeGrass(track.branches, HARBOUR_LOOP.id, undefined, track.jumps);
    expect(Array.from(again.matrices)).toEqual(Array.from(g.matrices));
    expect(Array.from(again.kinds)).toEqual(Array.from(g.kinds));
    const walled = buildTrack(HARBOUR_WALLED);
    expect(placeGrass(walled.branches, HARBOUR_WALLED.id).count).toBe(0);
  });

  it("keeps off a ramp's skirts", () => {
    const main = track.branches.main.lut;
    for (const j of track.jumps) {
      if ((j.branch ?? 0) !== 0) continue;
      const c = main.sample(j.t, 0).position;
      for (let i = 0; i < g.count; i++) {
        const d = Math.hypot(g.matrices[i * 16 + 12] - c[0], g.matrices[i * 16 + 14] - c[2]);
        // a tuft beside the ramp's lip would stand in its skirt (the ramp runs back `run` metres from its lip)
        expect(d > main.hw[Math.round(j.t * main.n) % main.n] + BUILDER.kerbWidth + 2 || d > (j.run ?? 0) + 3, `jump ${j.id}, tuft ${i}`).toBe(true);
      }
    }
  });
});
