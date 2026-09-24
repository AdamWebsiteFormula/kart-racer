// The mine on Canyon Rush (tunnel.ts, mesh/tunnel.ts): the shortcut runs through a mesa, not under
// the canyon floor (review, 23 Sept 2026: the road ran under the ground sheet, the sky showed
// through, and a kart could drive out of it sideways into the rock).
import { describe, expect, it } from 'vitest';
import { makeConstants } from '../kart-controller/constants.ts';
import { SIM_DT, stepKart } from '../kart-controller/step.ts';
import { createKartState, NEUTRAL_INPUT } from '../kart-controller/types.ts';
import { cloneDef } from './__tests__/fixtures.ts';
import { BUILDER } from './constants.ts';
import { buildTrack } from './track.ts';
import canyonJson from './tracks/canyon-rush.json';
import type { TrackDefinition } from './types.ts';

const c = makeConstants('medium', 150);
const canyon = () => buildTrack(cloneDef(canyonJson as TrackDefinition));

describe('the mine tunnel (Canyon Rush)', () => {
  it('is laid on the mine shortcut, its road above the canyon floor all the way', () => {
    const track = canyon();
    expect(track.tunnels).toHaveLength(1);
    const t = track.tunnels[0];
    expect(t.lut).toBe(track.branches.byId('mine-tunnel')!.lut);
    for (let i = 0; i < t.lut.n; i++) expect(t.lut.py[i]).toBeGreaterThan(track.groundPlaneY + 1);
  });

  it('holds a kart inside: rock walls at the curb, no off-road, full lock into the wall the whole way', () => {
    const track = canyon();
    const t = track.tunnels[0], L = t.lut, br = track.branches.byId('mine-tunnel')!;
    const mid = Math.round((t.i0 + t.i1) / 2);
    const smp = track.sample(br.toMain(mid / L.step), 0, br.index);
    expect(smp.wall).toBeCloseTo(smp.halfWidth + BUILDER.kerbWidth, 6);
    expect(track.sample(br.toMain(mid / L.step), smp.halfWidth + 3, br.index).surface).not.toBe('dirt');
    for (const steer of [-1, 1]) {
      const s = createKartState({ racerId: 'k', position: [L.px[t.i0 + 20], L.py[t.i0 + 20], L.pz[t.i0 + 20]], heading: Math.atan2(L.tx[t.i0 + 20], L.tz[t.i0 + 20]), t: br.toMain((t.i0 + 20) / L.step) });
      s.branch = br.index; s.speed = 20;
      let worst = 0;
      for (let k = 0; k < 600; k++) {
        stepKart(s, { ...NEUTRAL_INPUT, throttle: 1, steer }, track, c, SIM_DT);
        if (s.branch !== br.index) break;
        const m = track.sample(s.t, 0, br.index);
        const lat = (s.position[0] - m.position[0]) * m.tangent[2] - (s.position[2] - m.position[2]) * m.tangent[0];
        const u = br.toLocal(s.t) * L.step;
        if (u > t.i0 + 4 && u < t.i1 - 4) worst = Math.max(worst, Math.abs(lat) - m.halfWidth - BUILDER.kerbWidth);
      }
      expect(worst, `steer ${steer}`).toBeLessThan(0.05 - c.kartRadius + 0.85);
    }
  });

  it('the mesa stands over it: the land clears the roof all along, and meets the approach road at each portal', () => {
    const track = canyon();
    const t = track.tunnels[0], L = t.lut, q = { top: 0, edge: 0, next: 0, open: false, cover: NaN, lip: NaN, pieces: 0 };
    for (let i = t.i0 + Math.ceil(BUILDER.tunnelRamp / (L.length / L.step)); i <= t.i1 - 8; i += 4) {
      track.land!.query(L.px[i], L.pz[i], q);
      expect(q.top, `sample ${i}`).toBeGreaterThan(L.py[i] + BUILDER.tunnelApex + 1);
    }
    const br = track.branches.byId('mine-tunnel')!;
    for (const i of [t.i0 - 30, t.i1 + 12]) {
      const edge = track.sample(br.toMain(i / L.step), L.hw[i] + BUILDER.kerbWidth, br.index);
      const past = track.sample(br.toMain(i / L.step), L.hw[i] + BUILDER.kerbWidth + 0.6, br.index);
      track.land!.query(past.position[0], past.position[2], q);
      // (by the exit the main road is near, and its land blends in a little)
      expect(Math.abs(q.top - (edge.groundY - BUILDER.offroadDrop)), `sample ${i}`).toBeLessThan(0.2);
    }
  });

  it('narrows the off-road beside the approach to the curb at each portal, so a kart on the sand is led into the mouth', () => {
    const track = canyon();
    const t = track.tunnels[0], L = t.lut, ds = L.length / L.step;
    expect(L.covered[t.i0]).toBe(1);
    expect(L.covered[t.i0 - 1]).toBe(0);
    expect(L.reach[t.i0 - 1]).toBeLessThan(0.5);
    expect(L.reach[t.i1 + 1]).toBeLessThan(0.5);
    expect(L.reach[t.i0 - Math.ceil(BUILDER.tunnelFunnel / ds) - 2]).toBeCloseTo(BUILDER.offroadReach, 6);
    for (let i = t.i0 - 40; i < t.i0; i++) expect(L.reach[i]).toBeLessThanOrEqual(L.reach[i - 1] + 1e-6);
  });

  it('on the final lap the main road takes the mine: its samples along the bore are covered too', () => {
    const track = canyon();
    track.applyFinalLapShift([]);
    const main = track.branches.main.lut, t = track.tunnels[0];
    let covered = 0;
    for (let i = 0; i < main.n; i++) covered += main.covered[i];
    const len = (t.i1 - t.i0) * (t.lut.length / t.lut.step);
    expect(covered * (main.length / main.step)).toBeGreaterThan(len * 0.9);
    expect(covered * (main.length / main.step)).toBeLessThan(len * 1.1);
  });
});
