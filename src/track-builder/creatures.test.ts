// The course creatures (design §6): each one's script is race time only, warns before it can
// hit, and hits only where it says. Built on the race-manager OVAL (a flat rounded square).
import { describe, expect, it } from 'vitest';
import { OVAL } from '../race-manager/__tests__/fixtures.ts';
import { cloneDef } from './__tests__/fixtures.ts';
import { BUILDER } from './constants.ts';
import { CREATURE } from './creatures.ts';
import { buildTrack, type Track } from './track.ts';
import canyonJson from './tracks/canyon-rush.json';
import frostbiteJson from './tracks/frostbite-pass.json';
import harbourJson from './tracks/harbour-loop.json';
import meadowJson from './tracks/meadow-run.json';
import type { ActiveHazard, CreatureKind, TrackDefinition } from './types.ts';

function trackWith(kind: CreatureKind, period: number, lateral = 1): Track {
  const def = structuredClone(OVAL) as TrackDefinition;
  def.hazards = [{ id: kind, type: 'creature', creature: kind, t: 0.3, lateral, period, hit: 'spin' }];
  return buildTrack(def);
}

const mine = (t: Track, time: number): ActiveHazard[] => t.activeHazards(time).filter((h) => h.id !== 'spinner' && h.id !== 'slower' && h.id !== 'bumper' && h.id !== 'gust');
const pose = (t: Track, time: number) => t.hazards.creaturePoses(time)[0];

/** Signed metres right of the centreline at the creature's spot. */
function lateral(t: Track, p: readonly number[]): number {
  const s = t.sample(0.3, 0);
  const rx = s.tangent[2], rz = -s.tangent[0], n = Math.hypot(rx, rz);
  return ((p[0] - s.position[0]) * rx + (p[2] - s.position[2]) * rz) / n;
}

describe('course creatures', () => {
  it('the Rumblesaur rears up (no hit), stomps, and rolls a hop-able shock ring over the road only', () => {
    const P = 7, C = CREATURE.rumblesaur, t = trackWith('rumblesaur', P);
    expect(pose(t, 1).action).toBe('idle');
    expect(mine(t, 1)).toEqual([]);
    expect(pose(t, C.idle + 0.5).action).toBe('rear');
    expect(mine(t, C.idle + 0.5)).toEqual([]);
    const stomp = C.idle + C.rear;
    const foot = mine(t, stomp + 0.05);
    expect(foot.some((h) => h.radius === C.footRadius && !h.ground)).toBe(true);
    const ring = mine(t, stomp + 0.6).filter((h) => h.ground);
    expect(ring.length).toBeGreaterThan(0);
    const hw = t.sample(0.3, 0).halfWidth;
    for (const h of ring) expect(Math.abs(lateral(t, h.position))).toBeLessThanOrEqual(hw + 2 + 1e-6);
    // it rolls outward: later, farther from the foot
    const r0 = pose(t, stomp + 0.3).marks.find((m) => m.kind === 'ring')!.radius;
    const r1 = pose(t, stomp + 0.9).marks.find((m) => m.kind === 'ring')!.radius;
    expect(r1).toBeGreaterThan(r0);
  });

  it('the ring bumps (hop it), only the foot spins (items audit, 24 Sept 2026: the ring spun)', () => {
    const C = CREATURE.rumblesaur, t = trackWith('rumblesaur', 7);
    const stomp = C.idle + C.rear;
    expect(mine(t, stomp + 0.05).filter((h) => !h.ground).map((h) => h.hit)).toEqual(['spin']);
    const ring = mine(t, stomp + 0.6).filter((h) => h.ground);
    expect(ring.length).toBeGreaterThan(0);
    for (const h of ring) expect(h.hit).toBe('bump');
  });

  it('the crab marks its path across the road with shadows before it scuttles (items audit, 24 Sept 2026: no warning)', () => {
    const C = CREATURE.crab, t = trackWith('crab', 9.2);
    // early in the wait: nothing; the last `warn` seconds: a row of shadows across the road, darkening
    expect(pose(t, C.wait - C.warn - 0.1).marks).toEqual([]);
    for (const leg of [0, C.wait + C.cross]) {
      const early = pose(t, leg + C.wait - C.warn + 0.05).marks, late = pose(t, leg + C.wait - 0.02).marks;
      expect(early.length).toBe(C.warnMarks);
      expect(early.every((m) => m.kind === 'shadow')).toBe(true);
      const lats = late.map((m) => lateral(t, m.position));
      const hw = t.sample(0.3, 0).halfWidth;
      expect(Math.min(...lats)).toBeLessThan(-hw);
      expect(Math.max(...lats)).toBeGreaterThan(hw);
      expect(Math.min(...late.map((m) => m.strength))).toBeGreaterThan(Math.min(...early.map((m) => m.strength)));
      // still nothing that hits while it warns
      expect(mine(t, leg + C.wait - 0.02)).toEqual([]);
    }
    expect(pose(t, C.wait + 0.5).marks).toEqual([]);
  });

  it('the Yeti shows where the snowball lands, then it rolls back down the road at oncoming karts', () => {
    const P = 4.2, C = CREATURE.yeti, t = trackWith('yeti', P, -1);
    // in the air: only a shadow on the road, nothing that hits
    const flying = pose(t, P * 3 + 0.5);
    expect(flying.marks.some((m) => m.kind === 'shadow')).toBe(true);
    expect(mine(t, P * 3 + 0.5)).toEqual([]);
    const a = mine(t, P * 3 + C.flight + 0.2), b = mine(t, P * 3 + C.flight + 1.2);
    expect(a.length).toBe(1);
    expect(b.length).toBe(1);
    const ta = t.nearestTGlobal(a[0].position), tb = t.nearestTGlobal(b[0].position);
    expect(tb).toBeLessThan(ta); // against the race direction
  });

  it('the Kraken warns with a line across the road, then its tentacle covers the whole width', () => {
    const P = 8.8, C = CREATURE.kraken, t = trackWith('kraken', P);
    const warn = C.idle + 0.5;
    expect(pose(t, warn).action).toBe('warn');
    expect(pose(t, warn).marks.some((m) => m.kind === 'line')).toBe(true);
    expect(mine(t, warn)).toEqual([]);
    const slam = mine(t, C.idle + C.warn + 0.2);
    const lats = slam.map((h) => lateral(t, h.position));
    const hw = t.sample(0.3, 0).halfWidth;
    expect(Math.min(...lats)).toBeLessThanOrEqual(-hw + C.radius);
    expect(Math.max(...lats)).toBeGreaterThanOrEqual(hw - C.radius);
    expect(mine(t, C.idle + C.warn + C.slam + 0.3)).toEqual([]);
  });

  it('on an off-road track the crab is solid wherever a kart can reach it, waiting on the sand too (review: karts drove through it)', () => {
    const def = structuredClone(OVAL) as TrackDefinition;
    def.offroad = true;
    def.hazards = [{ id: 'crab', type: 'creature', creature: 'crab', t: 0.3, lateral: 1, period: 9.2, hit: 'spin' }];
    const t = buildTrack(def);
    expect(Math.abs(lateral(t, pose(t, 0.5).position))).toBeGreaterThan(t.sample(0.3, 0).halfWidth + BUILDER.kerbWidth);
    expect(mine(t, 0.5)).toHaveLength(1);
  });

  it('the crab only hits on the road; the goose charges back down it; the whale blows a gust across it', () => {
    const crab = trackWith('crab', 9.2);
    expect(mine(crab, 0.5)).toEqual([]); // waiting past the road edge
    const crossing = mine(crab, CREATURE.crab.wait + CREATURE.crab.cross / 2);
    expect(crossing.length).toBe(1);
    const goose = trackWith('goose', 11);
    const g0 = mine(goose, CREATURE.goose.wait + 0.9), g1 = mine(goose, CREATURE.goose.wait + 2.5);
    expect(goose.nearestTGlobal(g1[0].position)).toBeLessThan(goose.nearestTGlobal(g0[0].position));
    const whale = trackWith('whale', 12);
    expect(mine(whale, 2)).toEqual([]);
    const gust = mine(whale, CREATURE.whale.swim + CREATURE.whale.warn + 0.5);
    expect(gust.length).toBe(1);
    expect(gust[0].type).toBe('gust');
    const s = whale.sample(0.3, 0);
    const push = gust[0].push!;
    // across the road, not along it
    expect(Math.abs(push[0] * s.tangent[0] + push[2] * s.tangent[2])).toBeLessThan(1e-6);
  });

  it('Canyon Rush: the Rumblesaur stomps on the canyon floor, off the road the final lap replaces, and its ring rolls across the whole road every lap', () => {
    // bug hunt 2 (24 Sept 2026): authored at t 0.58, inside the collapse's route override (0.32-0.665);
    // on the final lap it moved 69 m into the mesa over the mine and its ring spun karts in the bore
    const def = cloneDef(canyonJson as TrackDefinition);
    const spot = def.hazards!.find((h) => h.id === 'rumblesaur')!;
    for (const ov of def.finalLapShift.routeOverrides!) expect(spot.t < ov.fromT || spot.t > ov.toT).toBe(true);
    const track = buildTrack(def);
    const before = pose(track, 1).position;
    expect(before[1]).toBeLessThan(track.groundPlaneY + 2); // the canyon floor
    track.applyFinalLapShift([]);
    const after = pose(track, 1).position;
    expect(Math.hypot(after[0] - before[0], after[1] - before[1], after[2] - before[2])).toBeLessThan(0.5);
    const main = track.branches.main.lut, t = track.nearestTGlobal(after);
    expect(main.covered[Math.round(t * main.n) % main.n]).toBe(0);
    // over one stomp the ring's hit points reach both curbs
    const C = CREATURE.rumblesaur, s = track.sample(track.hazards.creatures[0].t, 0), curb = s.halfWidth + BUILDER.kerbWidth;
    let lo = Infinity, hi = -Infinity;
    for (let time = C.idle + C.rear; time < spot.period!; time += 0.05) {
      for (const h of track.activeHazards(time)) {
        if (h.id !== 'rumblesaur' || !h.ground) continue;
        const l = (h.position[0] - s.position[0]) * s.tangent[2] - (h.position[2] - s.position[2]) * s.tangent[0];
        if (Math.abs((h.position[0] - s.position[0]) * s.tangent[0] + (h.position[2] - s.position[2]) * s.tangent[2]) > 2) continue;
        lo = Math.min(lo, l); hi = Math.max(hi, l);
      }
    }
    expect(lo).toBeLessThan(-curb);
    expect(hi).toBeGreaterThan(curb);
  });

  it('on an off-road track the Rumblesaur and the yeti stand wholly past the course limit; the stomping foot lands where it did', () => {
    // bug hunt 2 (24 Sept 2026): both stood inside the drivable sand and snow, and karts drove through
    // the Rumblesaur's legs and the yeti's rock ledge with nothing to stop them
    for (const [json, id, footprint] of [[canyonJson, 'rumblesaur', CREATURE.rumblesaur.footprint], [frostbiteJson, 'yeti', CREATURE.yeti.footprint]] as const) {
      const track = buildTrack(cloneDef(json as TrackDefinition));
      const c = track.hazards.creatures.find((x) => x.id === id)!;
      const s = track.sample(c.t, 0), body = track.hazards.creaturePoses(0.1).find((p) => p.id === id)!.position;
      const lat = ((body[0] - s.position[0]) * s.tangent[2] - (body[2] - s.position[2]) * s.tangent[0]) / Math.hypot(s.tangent[0], s.tangent[2]);
      expect(Math.abs(lat) - footprint, id).toBeGreaterThanOrEqual(s.wall! - 1e-6);
    }
    const C = CREATURE.rumblesaur;
    for (const offroad of [false, true]) {
      const def = structuredClone(OVAL) as TrackDefinition;
      def.offroad = offroad;
      def.hazards = [{ id: 'rumblesaur', type: 'creature', creature: 'rumblesaur', t: 0.3, lateral: 1, period: 7, hit: 'spin' }];
      const t = buildTrack(def), hw = t.sample(0.3, 0).halfWidth;
      const foot = mine(t, C.idle + C.rear + 0.05).find((h) => h.radius === C.footRadius)!;
      expect(lateral(t, foot.position)).toBeCloseTo(hw + C.off - C.step, 6);
      expect(lateral(t, pose(t, 1).position)).toBeCloseTo(offroad ? t.sample(0.3, 0).wall! + C.footprint : hw + C.off, 6);
    }
  });

  it('the goose, the crab and the Rumblesaur stand on the ground as drawn, and so does what hits', () => {
    // bug hunt 2 (24 Sept 2026): at the road centre's height the goose waited 0.96 m over Meadow's grass
    for (const [json, id, time] of [[meadowJson, 'goose', 1], [harbourJson, 'crab', 0.5], [canyonJson, 'rumblesaur', 1]] as const) {
      const track = buildTrack(cloneDef(json as TrackDefinition));
      const c = track.hazards.creatures.find((x) => x.id === id)!;
      const p = track.hazards.creaturePoses(time).find((x) => x.id === id)!.position;
      const s = track.sample(c.t, 0);
      const lat = ((p[0] - s.position[0]) * s.tangent[2] - (p[2] - s.position[2]) * s.tangent[0]) / Math.hypot(s.tangent[0], s.tangent[2]);
      const ground = track.sample(c.t, lat).groundY;
      expect(Math.abs(p[1] - ground), id).toBeLessThan(0.02);
      if (id !== 'rumblesaur') expect(Math.abs(track.activeHazards(time).find((h) => h.id === id)!.position[1] - ground), `${id} hit`).toBeLessThan(0.02);
    }
  });

  it('a creature on road a route change replaces is switched off with it: no hits, no pose', () => {
    const def = cloneDef(canyonJson as TrackDefinition);
    def.hazards!.find((h) => h.id === 'rumblesaur')!.t = 0.58; // where it stood until bug hunt 2
    const track = buildTrack(def);
    track.applyFinalLapShift([]);
    expect(track.hazards.isEnabled('rumblesaur')).toBe(false);
    expect(track.hazards.creaturePoses(1)).toEqual([]);
    for (let time = 0; time < 5.6; time += 0.1) expect(track.activeHazards(time).filter((h) => h.id === 'rumblesaur')).toEqual([]);
  });

  it('is the same at the same time (a replay sees the same creature), and can be switched off', () => {
    const t = trackWith('rumblesaur', 7);
    expect(JSON.stringify(t.hazards.creaturePoses(123.456))).toBe(JSON.stringify(t.hazards.creaturePoses(123.456)));
    expect(t.hazards.ids).toContain('rumblesaur');
    t.hazards.setEnabled('rumblesaur', false);
    expect(mine(t, CREATURE.rumblesaur.idle + CREATURE.rumblesaur.rear + 0.6)).toEqual([]);
    expect(t.hazards.isEnabled('rumblesaur')).toBe(false);
  });
});
