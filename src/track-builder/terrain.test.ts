// The land beside the road (terrain.ts): one rule for the land as drawn and the kart's ground past
// the curb. Review regression (23 Sept 2026): at a shortcut mouth each road's off-road was its own
// banked plane, so a kart on the grass handed from one road to the other was snapped up or dropped
// 1-11 m in one tick, and the drawn land (the nearest road's) stood metres off both.
import { describe, expect, it } from 'vitest';
import { makeConstants } from '../kart-controller/constants.ts';
import { SIM_DT, stepKart } from '../kart-controller/step.ts';
import { createKartState, NEUTRAL_INPUT } from '../kart-controller/types.ts';
import { BUILDER } from './constants.ts';
import { wrap01 } from './lut.ts';
import { buildTrack, type Track } from './track.ts';
import type { TrackDefinition } from './types.ts';

const DEFS = Object.values(import.meta.glob('./tracks/*.json', { eager: true, import: 'default' }) as Record<string, TrackDefinition>);
const OFFROAD = DEFS.filter((d) => d.offroad === true);
const c = makeConstants('medium', 150);

function openAll(track: Track): void {
  for (const b of track.branches.list) b.forcedOpen = true;
}

describe('the land beside the road (off-road tracks)', () => {
  it('covers the four off-road tracks', () => {
    expect(OFFROAD.map((d) => d.id).sort()).toEqual(['canyon-rush', 'frostbite-pass', 'harbour-loop', 'meadow-run']);
  });

  it.each(OFFROAD.map((d) => [d.id, d] as const))('%s: the land meets every curb a hair under its outer edge, on every branch', (_id, def) => {
    const track = buildTrack(def);
    const q = { top: 0, edge: 0, next: 0, open: false, pieces: 0 };
    let worst = 0;
    for (const b of track.branches.list) {
      const L = b.lut;
      for (let i = 0; i < L.n; i += 4) {
        for (const side of [-1, 1]) {
          if (L.open[i] & (side < 0 ? 1 : 2)) continue;
          const curb = side * (L.hw[i] + BUILDER.kerbWidth);
          const edgeY = L.py[i] - curb * Math.tan(L.bank[i]);
          const x = L.px[i] + L.rx[i] * (curb + side * 0.02), z = L.pz[i] + L.rz[i] * (curb + side * 0.02);
          // not where the curb lies on another road or another curb is within 2 m (a mouth's nose: the
          // land there is a slope between two curbs), nor under the ground
          track.land!.query(x, z, q);
          if (q.edge < 0 || q.next < 2 || edgeY - BUILDER.offroadDrop < track.groundPlaneY) continue;
          const top = Math.max(track.groundPlaneY, q.top);
          worst = Math.max(worst, Math.abs(top - (edgeY - BUILDER.offroadDrop)));
        }
      }
    }
    expect(worst).toBeLessThan(0.05);
  });

  it.each(OFFROAD.map((d) => [d.id, d] as const))('%s: the ground plane sits under every curb of the main line', (_id, def) => {
    const track = buildTrack(def);
    const L = track.branches.main.lut;
    for (let i = 0; i < L.n; i++) {
      const low = L.py[i] - (L.hw[i] + BUILDER.kerbWidth) * Math.abs(Math.tan(L.bank[i]));
      expect(low - BUILDER.offroadDrop).toBeGreaterThan(track.groundPlaneY);
    }
  });

  it.each(OFFROAD.map((d) => [d.id, d] as const))('%s: a kart cruising the grass past a shortcut mouth rides it smoothly: no rise or fall over 0.3 m in one tick', (_id, def) => {
    const track = buildTrack(def);
    openAll(track);
    let worst = 0, where = '';
    for (const b of track.branches.list) {
      if (b.isMain) continue;
      for (const t0 of [b.entryT - 0.012, b.entryT - 0.004, b.exitT - 0.03, b.exitT - 0.015]) {
        for (const lat of [-12, -10, -8.5, 8.5, 10, 12]) {
          const t = wrap01(t0);
          const hw = track.sample(t, 0, 0).halfWidth;
          const off = Math.sign(lat) * (hw + Math.abs(lat) - 7); // metres past the curb, both sides
          const p = track.sample(t, off, 0);
          const s = createKartState({ racerId: 'k', position: [...p.position], heading: Math.atan2(p.tangent[0], p.tangent[2]), t });
          s.speed = 18;
          let prevY = s.position[1], wasGrounded = true;
          for (let k = 0; k < 240; k++) {
            stepKart(s, { ...NEUTRAL_INPUT, throttle: 1 }, track, c, SIM_DT);
            const dy = s.position[1] - prevY;
            if (s.grounded && wasGrounded && Math.abs(dy) > worst) { worst = Math.abs(dy); where = `${b.id} t0 ${t0.toFixed(3)} lat ${lat} tick ${k} dy ${dy.toFixed(2)}`; }
            prevY = s.position[1]; wasGrounded = s.grounded;
          }
        }
      }
    }
    expect(worst, where).toBeLessThan(0.3);
  }, 60_000);
});
