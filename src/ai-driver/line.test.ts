import { describe, expect, it } from 'vitest';
import { headingOf } from '../kart-controller/types.ts';
import { buildTrack } from '../track-builder/track.ts';
import { AI, PROFILES } from './constants.ts';
import { chooseBranch, lateralTarget, lookAhead, readLine, wrapAngle } from './line.ts';
import { AI_OVAL, OVAL } from './__tests__/fixtures.ts';
import { MEDIUM_150, fakeLine, kartAt, lineFor, memory } from './__tests__/units.ts';
import { emptyLine, makeScratch } from './types.ts';

const track = buildTrack(OVAL);
const c = MEDIUM_150;

describe('line', () => {
  it('look-ahead scales with speed inside the clamp', () => {
    expect(lookAhead(0)).toBe(AI.line.lookAheadMin);
    expect(lookAhead(20)).toBeCloseTo(18);
    expect(lookAhead(100)).toBe(AI.line.lookAheadMax);
  });

  it('turn angles are near zero on a straight and signed like the road on a corner', () => {
    const m = memory();
    const straight = lineFor(track, kartAt(track, 0.125), m);
    expect(Math.abs(straight.turnNear)).toBeLessThan(0.15);
    const s = kartAt(track, 0.23);
    const corner = lineFor(track, s, m);
    expect(Math.abs(corner.turnNear)).toBeGreaterThan(0.4);
    const h0 = headingOf(track.sample(s.t, 0).tangent), h1 = headingOf(track.sample(s.t + 0.04, 0).tangent);
    expect(Math.sign(corner.turnNear)).toBe(Math.sign(wrapAngle(h1 - h0)));
    expect(corner.kappa).toBeGreaterThan(0);
    expect(corner.myLat).toBeCloseTo(0, 3);
    expect(lineFor(track, kartAt(track, 0.125, 2.5), m).myLat).toBeCloseTo(2.5, 3);
  });

  it('lateral target follows the personality lane, is clamped, and centres on narrow roads and branches', () => {
    const wide = fakeLine(0);
    const half = AI.line.laneHalfFraction * wide.halfWidth;
    const s = kartAt(track, 0.125);
    const lat = (p: Partial<Parameters<typeof memory>[1]>, line = wide) => lateralTarget(s, c, memory(PROFILES.hard, p), PROFILES.hard, line, 0);
    expect(Math.abs(lat({ lateralBias: 1 }) - half)).toBeLessThan(AI.line.wanderAmpMax + 1e-9);
    expect(Math.abs(lat({ lateralBias: -1 }) + half)).toBeLessThan(AI.line.wanderAmpMax + 1e-9);
    // inside-corner bias pulls toward the turn side, never past the clamp
    expect(lat({ lateralBias: 1, driftUse: 0 }, fakeLine(1.5))).toBeLessThanOrEqual(AI.line.lateralMaxFraction * wide.halfWidth + 1e-9);
    expect(lat({ lateralBias: 1 }, { ...wide, narrow: true })).toBe(0);
    s.branch = 1;
    expect(lat({ lateralBias: 1 })).toBe(0);
    s.branch = 0;
    // a tight bend at 20 m/s: the drift reaches a tier, so a drifter sets up wide
    const tight = { ...fakeLine(0.9, 1.2), probeNear: 20 };
    expect(lat({ lateralBias: 1, driftUse: 1 }, tight)).toBeCloseTo(-AI.line.outsideFraction * wide.halfWidth);
    // a gentle bend: no drift pays, so the ordinary lane with the inside bias applies
    expect(lat({ lateralBias: 0, driftUse: 1 }, { ...fakeLine(0.31, 0.35), probeNear: 30 })).toBeGreaterThan(0);
  });

  it('a closed shortcut is never chosen; an open one depends on skill, width and the aggression roll', () => {
    const t2 = buildTrack(AI_OVAL);
    const sc = makeScratch();
    const at = () => kartAt(t2, 0.265);
    t2.setLap(1);
    const m = memory(PROFILES.hard, { aggression: 1 });
    let s = at();
    chooseBranch(s, t2, m, PROFILES.hard, readLine(s, t2, m, sc, emptyLine()));
    expect(m.branchChoice).toBe(0);
    t2.setLap(2);
    s = at();
    chooseBranch(s, t2, m, PROFILES.hard, readLine(s, t2, m, sc, emptyLine()));
    expect(m.branchChoice).toBe(1);
    const shy = memory(PROFILES.hard, { aggression: 0 });
    chooseBranch(s, t2, shy, PROFILES.hard, readLine(s, t2, shy, sc, emptyLine()));
    expect(shy.branchChoice).toBe(-1);
    // past the entry the choice clears
    s = kartAt(t2, 0.30);
    chooseBranch(s, t2, shy, PROFILES.hard, readLine(s, t2, shy, sc, emptyLine()));
    expect(shy.branchChoice).toBe(0);
    // easy never has the skill
    const easy = memory(PROFILES.easy, { aggression: 1 });
    s = at();
    chooseBranch(s, t2, easy, PROFILES.easy, readLine(s, t2, easy, sc, emptyLine()));
    expect(easy.branchChoice).toBe(-1);
    // a narrow shortcut is only a catch-up: declined at rb 1 whatever the roll, taken when behind
    const t3 = buildTrack({ ...AI_OVAL, id: 'narrow', shortcuts: [{ ...AI_OVAL.shortcuts![0], controlPoints: AI_OVAL.shortcuts![0].controlPoints.map((p) => ({ ...p, halfWidth: 3.5 })) }] });
    t3.setLap(2);
    const keen = memory(PROFILES.hard, { aggression: 1 });
    let k = kartAt(t3, 0.265);
    chooseBranch(k, t3, keen, PROFILES.hard, readLine(k, t3, keen, sc, emptyLine()));
    expect(keen.branchChoice).toBe(-1);
    const behind = memory(PROFILES.hard, { aggression: 0 });
    behind.rb = AI.rubber.shortcutRb;
    k = kartAt(t3, 0.265);
    chooseBranch(k, t3, behind, PROFILES.hard, readLine(k, t3, behind, sc, emptyLine()));
    expect(behind.branchChoice).toBe(1);
  });
});
