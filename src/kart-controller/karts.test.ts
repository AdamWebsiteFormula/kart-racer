// Any racer in any kart (design §5): the kart table and the combine rule. The unit gate of the plan
// (docs/plans/kart-combos.md §3): every pair inside the bounds; whole steps, limits, balance; racers
// in their own karts identical to the classes as they were, value for value; twins; the mass spread.
import { describe, expect, it } from 'vitest';
import schema from '../../docs/schemas/kart.schema.json';
import { CAST } from '../ui-hud/data/cast.ts';
import { ROSTER } from '../game/racers.ts';
import { BASE, makeConstants, type KartConstants } from './constants.ts';
import {
  ARCHETYPES, COMBO_BOUNDS, KART_IDS, KART_LIMITS, KART_PACE, KART_STEPS, KARTS, RACER_CLASSES, STAT_KEYS,
  comboStats, isKartId, kartById, kartFor, kartPace, ownKartOf, racerClassOf,
} from './karts.ts';
import type { Archetype, SpeedClass } from './types.ts';

const RACERS = Object.keys(RACER_CLASSES);
const CLASSES: Archetype[] = ['light', 'medium', 'heavy'];
const CCS: SpeedClass[] = [50, 100, 150];
const EPS = 1e-12;

/** The classes exactly as constants.ts held them before 25 Sept 2026 (design §4). */
const LEGACY_CLASSES = {
  light: { speed: -0.01, accel: 0.12, handling: 0.12, weight: -0.15, hook: 'none' },
  medium: { speed: 0, accel: 0, handling: 0, weight: 0, hook: 'none' },
  heavy: { speed: 0.01, accel: -0.12, handling: -0.10, weight: 0.18, hook: 'hardBump' },
} as const;

/** makeConstants as it was before karts: the class alone. */
function legacy(archetype: Archetype, cc: SpeedClass): Record<string, unknown> {
  const s = LEGACY_CLASSES[archetype];
  const ccScale = BASE.speedClasses[String(cc) as '50' | '100' | '150'];
  return {
    ...structuredClone(BASE), archetype, cc, stats: s, baseTopSpeed: BASE.topSpeed,
    topSpeed: BASE.topSpeed * ccScale * (1 + s.speed), accel: BASE.accel * (1 + s.accel),
    steerRate: BASE.steerRate * (1 + s.handling), mass: 1 + s.weight,
  };
}

/** Every key but kartId, bit for bit (Object.is: 0 and −0 differ, NaN equals NaN). */
function sameHandling(a: Readonly<KartConstants> | Record<string, unknown>, b: Readonly<KartConstants> | Record<string, unknown>, label: string): void {
  const ka = Object.keys(a).filter((k) => k !== 'kartId').sort(), kb = Object.keys(b).filter((k) => k !== 'kartId').sort();
  expect(ka, label).toEqual(kb);
  for (const k of ka) {
    const x = (a as Record<string, unknown>)[k], y = (b as Record<string, unknown>)[k];
    if (typeof x === 'number') expect(Object.is(x, y), `${label} ${k}: ${x} vs ${y}`).toBe(true);
    else expect(x, `${label} ${k}`).toEqual(y);
  }
}

describe('the kart table (design §5)', () => {
  it('ten karts: one signature kart per racer, then Classic and Buggy, twins of owned karts with no numbers of their own', () => {
    expect(KART_IDS).toHaveLength(10);
    expect(new Set(KART_IDS).size).toBe(10);
    for (const r of RACERS) expect(KARTS.filter((k) => k.owner === r), r).toHaveLength(1);
    const twins = KARTS.filter((k) => k.twinOf);
    expect(twins.map((k) => [k.id, k.twinOf])).toEqual([['classic', 'windup'], ['buggy', 'scrap']]);
    for (const t of twins) {
      const of = kartById(t.twinOf) as NonNullable<ReturnType<typeof kartById>>;
      expect(of.owner, `${t.id} copies an owned kart`).toBeDefined();
      expect(t.owner).toBeUndefined();
      for (const s of STAT_KEYS) expect(t[s], `${t.id} ${s}`).toBe(of[s]);
      const row = (schema.properties.karts.default as Record<string, unknown>[]).find((x) => x.id === t.id) as Record<string, unknown>;
      for (const s of STAT_KEYS) expect(row[s], `${t.id} carries no ${s} of its own`).toBeUndefined();
    }
    expect(Object.isFrozen(KARTS)).toBe(true);
    expect(Object.isFrozen(KARTS[0])).toBe(true);
  });

  it('the racer classes match the game roster and the menus', () => {
    expect(RACERS).toEqual(ROSTER.map((r) => r.id));
    for (const r of ROSTER) expect(RACER_CLASSES[r.id], r.id).toBe(r.archetype);
    expect(CAST.map((c) => [c.id, c.archetype])).toEqual(ROSTER.map((r) => [r.id, r.archetype]));
  });

  it('the classes moved into the schema with the same values', () => {
    for (const a of CLASSES) {
      expect(Object.keys(ARCHETYPES[a])).toEqual(Object.keys(LEGACY_CLASSES[a]));
      for (const s of STAT_KEYS) expect(Object.is(ARCHETYPES[a][s], LEGACY_CLASSES[a][s]), `${a} ${s}`).toBe(true);
      expect(ARCHETYPES[a].hook).toBe(LEGACY_CLASSES[a].hook);
    }
  });

  it('every kart is whole steps, inside its limits, and balanced (kartPace)', () => {
    for (const k of KARTS) {
      for (const s of STAT_KEYS) {
        const n = k[s] / KART_STEPS[s];
        expect(Math.abs(n - Math.round(n)), `${k.id} ${s} ${k[s]} is whole steps`).toBeLessThan(1e-9);
        expect(Math.abs(Math.round(n)), `${k.id} ${s} within ${KART_LIMITS[s]} steps`).toBeLessThanOrEqual(KART_LIMITS[s]);
      }
      expect(Math.abs(kartPace(k)), `${k.id} predicted lap effect ${(1000 * kartPace(k)).toFixed(2)} per mille`).toBeLessThanOrEqual(KART_PACE.balance + EPS);
    }
  });

  it('every racer-and-kart pair stays inside the bounds', () => {
    for (const r of RACERS) for (const k of KART_IDS) {
      const t = comboStats(r, k);
      for (const s of STAT_KEYS) {
        const [lo, hi] = COMBO_BOUNDS[s];
        expect(t[s], `${r} in ${k}: ${s}`).toBeGreaterThanOrEqual(lo - EPS);
        expect(t[s], `${r} in ${k}: ${s}`).toBeLessThanOrEqual(hi + EPS);
      }
    }
  });

  it('a racer in their own kart handles exactly as their class did (8 racers × 3 classes × 3 cc, value for value)', () => {
    for (const r of RACERS) for (const a of CLASSES) for (const cc of CCS) {
      const was = legacy(a, cc);
      const own = ownKartOf(r) as string;
      sameHandling(makeConstants(a, cc, r), was, `${r} as ${a} ${cc}cc`);
      sameHandling(makeConstants(a, cc, r, own), was, `${r} in ${own} as ${a} ${cc}cc`);
      sameHandling(makeConstants(a, cc, r, 'no-such-kart'), was, `${r} in an unknown kart as ${a} ${cc}cc`);
      sameHandling(makeConstants(a, cc), was, `no racer as ${a} ${cc}cc`);
      expect(makeConstants(a, cc, r).kartId).toBe(own);
      expect(makeConstants(a, cc, r, 'no-such-kart').kartId).toBe(own);
    }
  });

  it('twins handle exactly as the kart they copy, for every racer', () => {
    for (const r of RACERS) for (const cc of CCS) {
      const a = racerClassOf(r) as Archetype;
      for (const t of KARTS.filter((k) => k.twinOf)) {
        sameHandling(makeConstants(a, cc, r, t.id), makeConstants(a, cc, r, t.twinOf), `${r} in ${t.id} ${cc}cc`);
        expect(makeConstants(a, cc, r, t.id).kartId).toBe(t.id);
      }
    }
  });

  it('the constants are the combined line: speed, accel, handling and weight from comboStats', () => {
    for (const r of RACERS) for (const k of KART_IDS) {
      const c = makeConstants(racerClassOf(r) as Archetype, 150, r, k);
      const t = comboStats(r, k);
      expect(c.stats).toEqual(t);
      expect(c.kartId).toBe(k);
      expect(c.topSpeed).toBe(BASE.topSpeed * BASE.speedClasses['150'] * (1 + t.speed));
      expect(c.accel).toBe(BASE.accel * (1 + t.accel));
      expect(c.steerRate).toBe(BASE.steerRate * (1 + t.handling));
      expect(c.mass).toBe(1 + t.weight);
      expect(c.stats.hook).toBe(ARCHETYPES[racerClassOf(r) as Archetype].hook);
      expect(Object.isFrozen(c)).toBe(true);
    }
    // another kart really changes the kart: Gus in the Scrap Buggy is quicker off the line and in the bends, slower flat out
    const gus = makeConstants('heavy', 150, 'gus'), inScrap = makeConstants('heavy', 150, 'gus', 'scrap');
    expect(inScrap.topSpeed).toBeLessThan(gus.topSpeed);
    expect(inScrap.accel).toBeGreaterThan(gus.accel);
    expect(inScrap.steerRate).toBeGreaterThan(gus.steerRate);
    expect(inScrap.mass).toBeLessThan(gus.mass);
  });

  it("the mass spread stays under a boost's extra bump weight, and inside today's classes (0.85 to 1.18)", () => {
    const masses = RACERS.flatMap((r) => KART_IDS.map((k) => makeConstants(racerClassOf(r) as Archetype, 150, r, k).mass));
    const lo = Math.min(...masses), hi = Math.max(...masses);
    expect(hi - lo).toBeLessThan(BASE.dashMassBonus);
    expect(lo).toBeGreaterThanOrEqual(1 + LEGACY_CLASSES.light.weight - EPS);
    expect(hi).toBeLessThanOrEqual(1 + LEGACY_CLASSES.heavy.weight + EPS);
  });

  it("another kart moves a racer's predicted pace by at most two kart balances", () => {
    for (const r of RACERS) {
      const own = kartPace(comboStats(r));
      for (const k of KART_IDS) expect(Math.abs(kartPace(comboStats(r, k)) - own), `${r} in ${k}`).toBeLessThanOrEqual(2 * KART_PACE.balance + EPS);
    }
  });

  it('unknown karts and racers never throw: an unknown kart is the racer’s own, an unknown racer takes the class alone', () => {
    expect(kartFor('pip')).toBe('scooter');
    expect(kartFor('pip', 'no-such-kart')).toBe('scooter');
    expect(kartFor('pip', 'snacktruck')).toBe('snacktruck');
    expect(kartFor('k0', 'snacktruck')).toBe('');
    expect(isKartId('buggy')).toBe(true);
    expect(isKartId('standard')).toBe(false);
    expect(isKartId(undefined)).toBe(false);
    expect(ownKartOf('k0')).toBeUndefined();
    expect(racerClassOf('k0')).toBeUndefined();
    expect(comboStats('k0', 'snacktruck', 'heavy')).toEqual(ARCHETYPES.heavy);
    expect(comboStats('k0')).toEqual(ARCHETYPES.medium);
    sameHandling(makeConstants('heavy', 100, 'k0', 'snacktruck'), legacy('heavy', 100), 'k0 in the Snack Truck');
    expect(makeConstants('heavy', 100, 'k0', 'snacktruck').kartId).toBe('');
    expect(makeConstants('light', 150).kartId).toBe('');
  });
});
