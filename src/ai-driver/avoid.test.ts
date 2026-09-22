import { describe, expect, it } from 'vitest';
import { BASE } from '../kart-controller/constants.ts';
import { buildTrack } from '../track-builder/track.ts';
import { applyAvoid, type AvoidContext } from './avoid.ts';
import { AI } from './constants.ts';
import { OVAL } from './__tests__/fixtures.ts';
import { kartAt, lineFor, memory } from './__tests__/units.ts';
import { makeScratch } from './types.ts';

const track = buildTrack(OVAL);
const pickupOf: number[] = [], coinOf: number[] = [];
let p = 0, c = 0;
for (const f of track.features) { pickupOf.push(f.kind === 'pickup' ? p++ : -1); coinOf.push(f.kind === 'coin' ? c++ : -1); }

function ctx(karts = [] as ReturnType<typeof kartAt>[], hazards = track.activeHazards(0)): AvoidContext {
  return {
    track, karts, hazards,
    pickupStates: Array.from({ length: p }, () => ({ respawnRemaining: 0 })),
    coinStates: Array.from({ length: c }, () => ({ respawnRemaining: 0 })),
    pickupOf, coinOf, sc: makeScratch(),
  };
}

describe('avoid and seek', () => {
  it('a static spinner on the line ahead is dodged by its clearance; nothing ahead leaves the line alone', () => {
    const s = kartAt(track, 0.47);
    const line = lineFor(track, s, memory());
    const lat = applyAvoid(s, ctx([s]), line, 1, 0, 0);
    const spinner = track.activeHazards(0).find((h) => h.id === 'spinner')!;
    expect(Math.abs(lat)).toBeGreaterThanOrEqual(AI.avoid.dodgeClearance + spinner.radius - 1e-6);
    const quiet = kartAt(track, 0.12);
    expect(applyAvoid(quiet, ctx([quiet], []), lineFor(track, quiet, memory()), 1, 0, 0.7)).toBeCloseTo(0.7);
  });

  it('a stopped kart ahead is treated as an obstacle; a slower one close ahead is passed on the roomier side', () => {
    const s = kartAt(track, 0.12, 0, 20);
    const parked = kartAt(track, 0.135, 0.5, 0, 'p');
    parked.distanceAlong = s.distanceAlong + 10;
    const line = lineFor(track, s, memory());
    const lat = applyAvoid(s, ctx([s, parked], []), line, 1, 0, 0);
    expect(lat).toBeLessThanOrEqual(0.5 - (2 * BASE.kartRadius + 0.4) + 1e-6);
    const slower = kartAt(track, 0.135, -1, 15, 'q');
    slower.distanceAlong = s.distanceAlong + 6;
    const lat2 = applyAvoid(s, ctx([s, slower], []), line, 1, 0, -1);
    expect(lat2).toBeGreaterThanOrEqual(-1 + 2 * BASE.kartRadius + 0.3 - 1e-6);
  });

  it('seeks a coin when short of coins and a balloon when empty-handed, inside seekLateral only', () => {
    const s = kartAt(track, 0.33);
    const line = lineFor(track, s, memory());
    expect(applyAvoid(s, ctx([s], []), line, 1, 0, 1.5)).toBeCloseTo(0); // coin at 0.35 lateral 0
    s.coins = BASE.coinCap;
    expect(applyAvoid(s, ctx([s], []), line, 1, 0, 1.5)).toBeCloseTo(1.5);
    const b = kartAt(track, 0.28);
    const bl = lineFor(track, b, memory());
    expect(applyAvoid(b, ctx([b], []), bl, 1, 0, 3)).toBeCloseTo(4); // balloon at lateral 4 is within 2.5 m
    b.item.held = 'ball'; // one slot full: still seeks (two slots since items 2026-09-22)
    expect(applyAvoid(b, ctx([b], []), bl, 1, 0, 3)).toBeCloseTo(4);
    b.item.next = 'ball'; // both full: stops seeking
    expect(applyAvoid(b, ctx([b], []), bl, 1, 0, 3)).toBeCloseTo(3);
    b.item.held = 'none'; b.item.next = 'none';
    const cx = ctx([b], []);
    cx.pickupStates[1].respawnRemaining = 2; // popped: not there
    expect(applyAvoid(b, cx, bl, 1, 0, 3)).toBeCloseTo(3);
  });

  it('never targets outside the road edge', () => {
    const s = kartAt(track, 0.12);
    const line = lineFor(track, s, memory());
    const lat = applyAvoid(s, ctx([s], []), line, 1, 0, 50);
    expect(lat).toBeLessThanOrEqual(line.halfWidth - BASE.kartRadius - 0.3 + 1e-6);
  });
});
