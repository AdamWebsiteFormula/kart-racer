import { describe, expect, it } from 'vitest';
import { BUILDER } from './constants.ts';
import { fallingPhase } from './hazards.ts';
import { buildTrack } from './track.ts';
import { HARBOUR_LOOP, cloneDef } from './__tests__/fixtures.ts';
import type { HazardDef } from './types.ts';

function withHazards(hazards: HazardDef[]) {
  const def = cloneDef(HARBOUR_LOOP);
  def.hazards = hazards;
  def.finalLapShift.enablesHazards = undefined;
  return buildTrack(def);
}

describe('hazards', () => {
  it('activeHazards(T) is deterministic', () => {
    const a = buildTrack(HARBOUR_LOOP), b = buildTrack(HARBOUR_LOOP);
    for (const T of [0, 1.5, 7.99, 8, 123.456]) expect(a.activeHazards(T)).toEqual(b.activeHazards(T));
  });

  it('rolling moves against the tangent at speed and respawns every period', () => {
    const t = withHazards([{ id: 'r', type: 'rolling', t: 0.36, lateral: 3, period: 8, speed: 6 }]);
    const p0 = t.activeHazards(0)[0].position;
    const p1 = t.activeHazards(1)[0].position;
    const p8 = t.activeHazards(8)[0].position;
    const p9 = t.activeHazards(9)[0].position;
    expect(Math.hypot(p1[0] - p0[0], p1[2] - p0[2])).toBeCloseTo(6, 0);
    expect(p8).toEqual(p0);
    expect(p9).toEqual(p1);
    // against the tangent: moved to a smaller t
    const c = t.sample(0.36, 0);
    const d = [p1[0] - p0[0], 0, p1[2] - p0[2]];
    expect(d[0] * c.tangent[0] + d[2] * c.tangent[2]).toBeLessThan(0);
  });

  it('crossing stays inside halfWidth minus its radius', () => {
    const t = withHazards([{ id: 'c', type: 'crossing', t: 0.1, period: 4 }]);
    const hw = t.sample(0.1, 0).halfWidth;
    const centre = t.sample(0.1, 0).position;
    let maxOff = 0;
    for (let T = 0; T < 8; T += 0.05) {
      const p = t.activeHazards(T)[0].position;
      const off = Math.hypot(p[0] - centre[0], p[2] - centre[2]);
      maxOff = Math.max(maxOff, off);
      expect(off).toBeLessThanOrEqual(hw - BUILDER.hazardRadius + 1e-6);
    }
    expect(maxOff).toBeGreaterThan(hw / 2);
  });

  it('falling is active for fallingActiveSeconds of every period; static is always there; gust pushes sideways for half a period', () => {
    const t = withHazards([
      { id: 'f', type: 'falling', t: 0.2, period: 5 },
      { id: 's', type: 'static', t: 0.3 },
      { id: 'g', type: 'gust', t: 0.4, lateral: -3, period: 6, speed: 4 },
    ]);
    const ids = (T: number) => t.activeHazards(T).map((h) => h.id);
    expect(ids(0.1)).toEqual(['f', 's', 'g']);
    expect(ids(0.6)).toEqual(['s', 'g']);
    expect(ids(3.5)).toEqual(['s']);
    expect(ids(30.1)).toEqual(['f', 's', 'g']); // 30.1 = 6 × 5 + 0.1 = 5 × 6 + 0.1
    const g = t.activeHazards(0)[2];
    expect(g.push).toBeDefined();
    expect(g.radius).toBe(BUILDER.gustWindow / 2);
    const c = t.sample(0.4, 0);
    const hh = Math.hypot(c.tangent[0], c.tangent[2]);
    const right = [c.tangent[2] / hh, 0, -c.tangent[0] / hh];
    // authored on the left (lateral −3) so it pushes to the right
    expect(g.push![0] * right[0] + g.push![2] * right[2]).toBeCloseTo(4, 6);
  });

  it('a falling rock drops for fallingWarnSeconds before it lands, then lies there (and hits) for fallingActiveSeconds', () => {
    // bug hunt 2 (24 Sept 2026): the drop was left to the scene, which never drew it
    const def = { id: 'f', type: 'falling' as const, t: 0.2, period: 5 };
    const t = withHazards([def]);
    const W = BUILDER.fallingWarnSeconds, A = BUILDER.fallingActiveSeconds;
    expect(fallingPhase(def, 5 - W - 0.01).state).toBe('idle');
    expect(fallingPhase(def, 5 - W + 0.01).state).toBe('drop');
    expect(fallingPhase(def, 5 - W / 2)).toEqual({ state: 'drop', k: 0.5 });
    expect(fallingPhase(def, 5.01).state).toBe('down');
    expect(fallingPhase(def, 5 + A + 0.01).state).toBe('idle');
    // it hits only on the ground; the scene sees the whole drop, where it lands
    for (let T = 0; T < 10; T += 0.05) {
      expect(t.activeHazards(T).length, `time ${T}`).toBe(fallingPhase(def, T).state === 'down' ? 1 : 0);
      const views = t.hazards.falling(T);
      expect(views).toHaveLength(1);
      expect(views[0].position).toEqual(t.sample(0.2, 0).position);
    }
  });

  it('enable and disable by id', () => {
    const t = buildTrack(HARBOUR_LOOP);
    expect(t.hazards.isEnabled('barrels')).toBe(true);
    t.hazards.setEnabled('barrels', false);
    expect(t.hazards.isEnabled('barrels')).toBe(false);
    // Harbor's one hazard (its crab came off the track on 25 Sept 2026): nothing left to hit
    expect(t.activeHazards(0)).toEqual([]);
    t.hazards.setEnabled('barrels', true);
    expect(t.activeHazards(0).map((h) => h.id)).toEqual(['barrels']);
  });
});
