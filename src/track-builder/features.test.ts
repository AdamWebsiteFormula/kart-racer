import { describe, expect, it } from 'vitest';
import { BUILDER } from './constants.ts';
import { rederive } from './features.ts';
import { buildLut } from './lut.ts';
import { buildTrack } from './track.ts';
import { HARBOUR_WITH_PIER as HARBOUR_LOOP } from './__tests__/fixtures.ts';

describe('features', () => {
  const track = buildTrack(HARBOUR_LOOP);

  it('bakes every authored feature to a world position on its branch', () => {
    const def = HARBOUR_LOOP;
    const n = (def.pickups?.length ?? 0) + (def.coins?.length ?? 0) + (def.boostPads?.length ?? 0) + (def.jumps?.length ?? 0);
    expect(track.features).toHaveLength(n);
    const ramp = track.features.find((f) => f.id === 'pier-ramp')!;
    expect(ramp.branch).toBe(track.branches.byId('pier')!.index);
    expect(ramp.launch).toBe(5);
    const pad = track.features.find((f) => f.kind === 'boostPad')!;
    const s = track.sample(pad.t, pad.lateral);
    expect(pad.position).toEqual(s.position);
    expect(pad.width).toBe(3);
  });

  it('views: jumps and boost pads carry t, branch and halfWidth for the kart controller', () => {
    expect(track.jumps).toHaveLength(1);
    expect(track.jumps[0]).toEqual({ id: 'pier-ramp', t: expect.any(Number), launch: 5, branch: 2 });
    expect(track.boostPads[0].halfWidth).toBe(1.5);
    expect(track.boostPads[0].branch).toBe(0);
    expect(track.boostPads[0].lateral).toBeCloseTo(-4, 6);
  });

  it('positions stay put through a rebuild ± 0.05 m and t re-derives', () => {
    const before = track.features.map((f) => ({ ...f, position: [...f.position] as [number, number, number] }));
    // perturb: rebuild the main LUT at a different sample count, so t values shift slightly
    track.branches.main.lut = buildLut(track.controlPoints, { samples: 1500 });
    rederive(track.features, track.branches);
    track.features.forEach((f, i) => {
      const b = before[i];
      expect(Math.hypot(f.position[0] - b.position[0], f.position[1] - b.position[1], f.position[2] - b.position[2])).toBeLessThan(0.05);
      expect(Math.abs(f.t - b.t)).toBeLessThan(2e-3);
      expect(Math.abs(f.lateral - b.lateral)).toBeLessThan(0.05);
    });
  });

  it('default widths come from the schema builder constants', () => {
    const balloon = track.features.find((f) => f.kind === 'pickup')!;
    expect(balloon.width).toBe(BUILDER.balloonRadius * 2);
    const coin = track.features.find((f) => f.kind === 'coin')!;
    expect(coin.width).toBe(BUILDER.coinRadius * 2);
  });
});
