import { describe, expect, it } from 'vitest';
import { BASE } from '../kart-controller/constants.ts';
import { BUILDER } from '../track-builder/constants.ts';
import { buildTrack } from '../track-builder/track.ts';
import { applyAvoid, type AvoidContext } from './avoid.ts';
import { AI } from './constants.ts';
import { AI_OVAL, OVAL } from './__tests__/fixtures.ts';
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

  it('slow karts are weighed all at once and after the hazards: no dodge lands on a stopped kart (bug hunt 2, 24 Sept 2026)', () => {
    const L = track.length;
    const s = kartAt(track, 0.12, 0, 20);
    const line = lineFor(track, s, memory());
    const kartClear = Math.min(AI.avoid.stoppedClearance, line.halfWidth - BASE.kartRadius - 0.2);
    const clearOf = (lat: number, ...obs: number[]) => obs.every((o) => Math.abs(lat - o) >= kartClear - 1e-6);
    // two stopped karts: dodging the first one used to put the target on the second, and back
    const a = kartAt(track, 0.12 + 15 / L, 0, 0, 'a'), b = kartAt(track, 0.12 + 25 / L, kartClear, 0, 'b');
    expect(clearOf(applyAvoid(s, ctx([s, a, b], []), line, 1, 0, 0), 0, kartClear)).toBe(true);
    // a stopped kart beside the spinner: the spinner's dodge used to win and steer onto it
    const spinner = track.activeHazards(0).find((h) => h.id === 'spinner')!;
    const near = kartAt(track, 0.5 - 20 / L, 0, 20);
    const nearLine = lineFor(track, near, memory());
    const hClear = AI.avoid.dodgeClearance + spinner.radius;
    const parked = kartAt(track, 0.5 - 8 / L, 2, 0, 'p');
    const lat = applyAvoid(near, ctx([near, parked]), nearLine, 1, 0, 0);
    expect(clearOf(lat, 2)).toBe(true);
    expect(Math.abs(lat)).toBeGreaterThanOrEqual(hClear - 1e-6); // and still clear of the spinner: the road has room for both
  });

  it("a stopped kart in a rolling hazard's lane is passed on the side clear of the lane, barrel in range or not", () => {
    const t2 = buildTrack(AI_OVAL); // barrel rolls back from 0.86 at lateral 0, 8 m/s for 4 s
    const L = t2.length;
    const pOf: number[] = [], cOf: number[] = [];
    let np = 0, nc = 0;
    for (const f of t2.features) { pOf.push(f.kind === 'pickup' ? np++ : -1); cOf.push(f.kind === 'coin' ? nc++ : -1); }
    const s = kartAt(t2, 0.86 - 45 / L, 0, 20);
    const parked = kartAt(t2, 0.86 - 20 / L, 1.5, 0, 'p');
    const line = lineFor(t2, s, memory());
    const cx: AvoidContext = {
      track: t2, karts: [s, parked], hazards: [], pickupOf: pOf, coinOf: cOf, sc: makeScratch(),
      pickupStates: Array.from({ length: np }, () => ({ respawnRemaining: 0 })), coinStates: Array.from({ length: nc }, () => ({ respawnRemaining: 0 })),
    };
    const lat = applyAvoid(s, cx, line, 1, 0, 0);
    expect(Math.abs(lat - 1.5)).toBeGreaterThanOrEqual(Math.min(AI.avoid.stoppedClearance, line.halfWidth - BASE.kartRadius - 0.2) - 1e-6);
    expect(Math.abs(lat)).toBeGreaterThanOrEqual(AI.avoid.dodgeClearance + BUILDER.hazardRadius - 1e-6);
  });

  it('seeks a coin when short of coins and a balloon when a slot is free: the one in the row nearest its own pick, not one a kart ahead is lined up on', () => {
    const s = kartAt(track, 0.33);
    const line = lineFor(track, s, memory());
    expect(applyAvoid(s, ctx([s], []), line, 1, 0, 1.5)).toBeCloseTo(0); // coin at 0.35 lateral 0
    s.coins = BASE.coinCap;
    expect(applyAvoid(s, ctx([s], []), line, 1, 0, 1.5)).toBeCloseTo(1.5);
    // the row at 0.3 has balloons at lateral 0 and 4; the pick is a fraction of halfWidth
    const b = kartAt(track, 0.28, 2); // both balloons within reach of where it is
    const bl = lineFor(track, b, memory());
    const right = 4 / bl.halfWidth;
    expect(applyAvoid(b, ctx([b], []), bl, 1, 0, 3, right)).toBeCloseTo(4);
    expect(applyAvoid(b, ctx([b], []), bl, 1, 0, 3, 0)).toBeCloseTo(0); // another racer, another balloon
    b.item.held = 'ball'; // one slot full: still seeks (two slots since items 2026-09-22)
    expect(applyAvoid(b, ctx([b], []), bl, 1, 0, 3, right)).toBeCloseTo(4);
    b.item.next = 'ball'; // both full: stops seeking
    expect(applyAvoid(b, ctx([b], []), bl, 1, 0, 3, right)).toBeCloseTo(3);
    b.item.held = 'none'; b.item.next = 'none';
    const cx = ctx([b], []);
    cx.pickupStates[1].respawnRemaining = 2; // popped: not there, so the other one
    expect(applyAvoid(b, cx, bl, 1, 0, 3, right)).toBeCloseTo(0);
    // a kart between us and the row, lined up on the right balloon, will pop it first
    const o = kartAt(track, 0.29, 4, 20, 'o');
    expect(applyAvoid(b, ctx([b, o], []), bl, 1, 0, 3, right)).toBeCloseTo(0);
    // out of reach: a balloon far across the road with the row close ahead is not chased
    const near = kartAt(track, 0.3 - 5 / track.length, -1.5);
    const nl = lineFor(track, near, memory());
    expect(applyAvoid(near, ctx([near], []), nl, 1, 0, -1.5, right)).toBeCloseTo(0);
  });

  it('a hazard that stays put is dodged from hazardSeconds of travel, and marks the lane a drift would sweep', () => {
    // 40 m short of the spinner at 25 m/s: past the old 25 m look, inside 1.8 s of travel
    const s = kartAt(track, 0.5 - 40 / track.length, 0, 25);
    const line = lineFor(track, s, memory());
    const spinner = track.activeHazards(0).find((h) => h.id === 'spinner')!;
    expect(40).toBeGreaterThan(AI.avoid.hazardLookAhead);
    expect(40).toBeLessThan(25 * AI.avoid.hazardSeconds);
    expect(Math.abs(applyAvoid(s, ctx([s]), line, 1, 0, 0))).toBeGreaterThanOrEqual(AI.avoid.dodgeClearance + spinner.radius - 1e-6);
    expect(line.hazardInLane).toBe(true);
    // slow, the same 40 m is further than it looks: not yet
    const slow = kartAt(track, 0.5 - 40 / track.length, 0, 10);
    const sl = lineFor(track, slow, memory());
    expect(applyAvoid(slow, ctx([slow]), sl, 1, 0, 0)).toBeCloseTo(0);
  });

  it('a shock wave along the ground is hopped, not steered round', () => {
    const s = kartAt(track, 0.12, 0, 25);
    const line = lineFor(track, s, memory());
    const ahead = track.sample(0.12 + 2 / track.length, 0, 0).position;
    const ring = { id: 'ring', type: 'creature' as const, position: [ahead[0], ahead[1], ahead[2]] as [number, number, number], radius: 1, hit: 'bump' as const, ground: true };
    expect(applyAvoid(s, ctx([s], [ring]), line, 1, 0, 0.5)).toBeCloseTo(0.5);
    expect(line.hopRing).toBe(true);
    const far = track.sample(0.12 + 20 / track.length, 0, 0).position;
    applyAvoid(s, ctx([s], [{ ...ring, position: [far[0], far[1], far[2]] }]), line, 1, 0, 0.5);
    expect(line.hopRing).toBe(false);
  });

  it('never targets outside the road edge', () => {
    const s = kartAt(track, 0.12);
    const line = lineFor(track, s, memory());
    const lat = applyAvoid(s, ctx([s], []), line, 1, 0, 50);
    expect(lat).toBeLessThanOrEqual(line.halfWidth - BASE.kartRadius - 0.3 + 1e-6);
  });
});
