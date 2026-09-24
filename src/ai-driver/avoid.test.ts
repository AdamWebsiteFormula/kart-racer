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
