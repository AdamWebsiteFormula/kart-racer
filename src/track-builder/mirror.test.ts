// Mirror mode (design §10): every authored track reflected left to right validates, builds to the
// exact reflection of the original (length, checkpoints, grid, features, hazards), and flips every
// left/right the data carries. The whole-race gate (8 AI finish, nobody respawns) is in
// src/game/mirror.e2e.test.ts.
import { describe, expect, it } from 'vitest';
import { GUST_MIRROR_LATERAL, mirrored, mirrorTrack } from './mirror.ts';
import { buildTrack } from './track.ts';
import type { TrackDefinition, Vec3 } from './types.ts';
import { validateTrack } from './validate.ts';

const TRACKS = Object.values(import.meta.glob('./tracks/*.json', { eager: true, import: 'default' })) as TrackDefinition[];
const flipX = (p: readonly number[]): Vec3 => [-p[0], p[1], p[2]];
const near = (a: readonly number[], b: readonly number[], eps = 1e-6) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < eps;

describe('mirrorTrack', () => {
  it('six tracks, each mirrored validates with no errors (and no more warnings than the original)', () => {
    expect(TRACKS.length).toBe(6);
    for (const def of TRACKS) {
      const m = mirrorTrack(def);
      const v = validateTrack(m), o = validateTrack(def);
      expect(v.errors, def.id).toEqual([]);
      expect(v.ok, def.id).toBe(true);
      expect(v.warnings.length, def.id).toBeLessThanOrEqual(o.warnings.length);
    }
  });

  it('builds the exact reflection: length, checkpoints, spawn grid, baked features and hazards', () => {
    for (const def of TRACKS) {
      const a = buildTrack(def), b = buildTrack(mirrorTrack(def));
      expect(b.length, def.id).toBeCloseTo(a.length, 6);
      expect(b.checkpoints.length).toBe(a.checkpoints.length);
      a.checkpoints.forEach((c, i) => expect(near(b.checkpoints[i].position, flipX(c.position)), `${def.id} checkpoint ${i}`).toBe(true));
      a.spawnGrid.forEach((s, i) => {
        // the grid's columns are laid across the road in lateral order: the mirror's slot i is the reflection of some slot in the same row
        const hit = a.spawnGrid.some((o) => near(b.spawnGrid[i].position, flipX(o.position), 1e-6));
        expect(hit, `${def.id} grid slot ${i}`).toBe(true);
        expect(b.spawnGrid[i].heading, `${def.id} grid heading ${i}`).toBeCloseTo(-a.spawnGrid.find((o) => near(b.spawnGrid[i].position, flipX(o.position), 1e-6))!.heading, 9);
        void s;
      });
      expect(b.features.length).toBe(a.features.length);
      a.features.forEach((f, i) => {
        expect(near(b.features[i].position, flipX(f.position), 1e-6), `${def.id} ${f.id}`).toBe(true);
        expect(b.features[i].lateral, `${def.id} ${f.id} lateral`).toBeCloseTo(-f.lateral, 6);
      });
      for (const time of [0, 3.3, 11.7]) {
        const ha = a.activeHazards(time), hb = b.activeHazards(time);
        const ids = new Set(ha.map((h) => h.id));
        for (const h of hb) {
          if (!ids.has(h.id)) continue;
          const o = ha.find((x) => x.id === h.id && x.type === h.type && near(h.position, flipX(x.position), 1e-3));
          // a crossing hazard sweeps the same arc the other way round, and the yeti's snowballs land at
          // the same pseudo-random laterals (creatures.ts hash): their points at one time need not reflect
          if (h.type === 'crossing' || h.id.startsWith('yeti')) continue;
          expect(o, `${def.id} hazard ${h.id} at ${time}s`).toBeDefined();
          if (h.push && o?.push) expect(near(h.push, flipX(o.push), 1e-6), `${def.id} ${h.id} push`).toBe(true);
        }
      }
    }
  });

  it('flips every left and right the data carries, and mirroring twice gives the same road back', () => {
    for (const def of TRACKS) {
      const m = mirrorTrack(def);
      expect(m.mirrored).toBe(true);
      expect(def.mirrored).toBeUndefined(); // the source is never touched
      m.controlPoints.forEach((p, i) => {
        expect(p.x).toBe(-def.controlPoints[i].x || 0);
        expect(p.bank ?? 0).toBe(-(def.controlPoints[i].bank ?? 0) || 0);
      });
      (def.openEdges ?? []).forEach((e, i) => expect(m.openEdges![i].side).toBe(e.side === 'left' ? 'right' : e.side === 'right' ? 'left' : 'both'));
      (def.environment?.decor ?? []).forEach((d, i) => {
        const s = m.environment!.decor![i].side;
        expect(s).toBe(d.side === 'left' ? 'right' : d.side === 'right' ? 'left' : d.side);
      });
      if (def.environment?.sunDirection) expect(m.environment!.sunDirection![0]).toBe(-def.environment.sunDirection[0] || 0);
      (def.finalLapShift.routeOverrides ?? []).forEach((r, i) => r.controlPoints.forEach((p, k) => expect(m.finalLapShift.routeOverrides![i].controlPoints[k].x).toBe(-p.x || 0)));
      const back = mirrorTrack(m);
      expect(back.mirrored).toBe(false);
      expect(back.controlPoints).toEqual(def.controlPoints.map((p) => ({ ...p, x: p.x || 0, ...(p.bank !== undefined ? { bank: p.bank || 0 } : {}) })));
      expect(back.pickups).toEqual(def.pickups?.map((p) => (p.lateral === undefined ? p : { ...p, lateral: p.lateral || 0 })));
    }
  });

  it('a gust at the centre pushes the mirrored way; a creature with no side stands on the other side', () => {
    const base = TRACKS[0];
    const def: TrackDefinition = { ...base, hazards: [{ id: 'g', type: 'gust', t: 0.3, period: 2, speed: 10 }] };
    const a = buildTrack(def), b = buildTrack(mirrorTrack(def));
    const ga = a.activeHazards(0.1).find((h) => h.id === 'g')!, gb = b.activeHazards(0.1).find((h) => h.id === 'g')!;
    expect(near(gb.push!, flipX(ga.push!), 1e-6)).toBe(true);
    expect(mirrorTrack(def).hazards![0].lateral).toBe(GUST_MIRROR_LATERAL);
    expect(mirrorTrack({ ...base, hazards: [{ id: 'c', type: 'creature', creature: 'crab', t: 0.3 }] }).hazards![0].lateral).toBe(-1);
  });

  it('mirrored() makes each track once and hands back the same object', () => {
    expect(mirrored(TRACKS[0])).toBe(mirrored(TRACKS[0]));
    expect(mirrored(TRACKS[0])).not.toBe(TRACKS[0]);
  });
});
