import { describe, expect, it } from 'vitest';
import { validateTrack } from './validate.ts';
import { HARBOUR_LOOP, cloneDef } from './__tests__/fixtures.ts';
import type { TrackDefinition } from './types.ts';

function bad(mutate: (d: TrackDefinition) => void): string[] {
  const d = cloneDef(HARBOUR_LOOP);
  mutate(d);
  return validateTrack(d).errors;
}

describe('validate', () => {
  it('Harbour Loop passes with no warnings', () => {
    const v = validateTrack(HARBOUR_LOOP);
    expect(v.errors).toEqual([]);
    expect(v.warnings).toEqual([]);
    expect(v.ok).toBe(true);
  });

  it('rejects a hairpin tighter than 1.5 × halfWidth', () => {
    const errs = bad((d) => { d.controlPoints[1] = { x: 20, y: 0, z: -112, halfWidth: 8 }; d.controlPoints.splice(2, 0, { x: 22, y: 0, z: -95, halfWidth: 8 }, { x: 24, y: 0, z: -112, halfWidth: 8 }); });
    expect(errs.some((e) => e.includes('hairpin'))).toBe(true);
  });

  it('rejects a start line narrower than 4', () => {
    const errs = bad((d) => { d.controlPoints[0].halfWidth = 3.5; d.controlPoints[1].halfWidth = 3.5; });
    expect(errs.some((e) => e.includes('start line halfWidth'))).toBe(true);
  });

  it('rejects bank over 20°', () => {
    expect(bad((d) => { d.controlPoints[3].bank = 25; }).some((e) => e.includes('bank'))).toBe(true);
  });

  it('rejects NaN', () => {
    expect(bad((d) => { d.controlPoints[4].y = NaN; }).some((e) => e.includes('NaN'))).toBe(true);
  });

  it('rejects a bad start grid: zero columns, fractional rows, non-positive spacing', () => {
    expect(bad((d) => { d.startGrid.columns = 0; }).some((e) => e.includes('startGrid.columns'))).toBe(true);
    expect(bad((d) => { d.startGrid.rows = 2.5; }).some((e) => e.includes('startGrid.rows'))).toBe(true);
    expect(bad((d) => { d.startGrid.spacing = 0; }).some((e) => e.includes('startGrid.spacing'))).toBe(true);
    expect(bad((d) => { d.startGrid.spacing = NaN; }).some((e) => e.includes('startGrid.spacing'))).toBe(true);
  });

  it('rejects a loop that repeats its first point', () => {
    expect(bad((d) => { d.controlPoints.push({ ...d.controlPoints[0] }); }).some((e) => e.includes('repeats the first'))).toBe(true);
  });

  it('rejects a shortcut whose end is 5 m off the main line', () => {
    const errs = bad((d) => { const cp = d.shortcuts![0].controlPoints; cp[cp.length - 1].x += 5; });
    expect(errs.some((e) => e.includes('last point is') && e.includes('from the main line'))).toBe(true);
  });

  it('rejects a shortcut whose exit does not follow its entry', () => {
    expect(bad((d) => { d.shortcuts![0].exitT = d.shortcuts![0].entryT; }).some((e) => e.includes('exitT must follow'))).toBe(true);
  });

  it('rejects voidY above the road', () => {
    expect(bad((d) => { d.voidY = 0; }).some((e) => e.includes('voidY'))).toBe(true);
  });

  it('rejects fewer than 4 checkpoints and unknown shortcut or hazard names', () => {
    expect(bad((d) => { d.checkpointCount = 3; }).some((e) => e.includes('checkpointCount'))).toBe(true);
    expect(bad((d) => { d.finalLapShift.closesShortcuts = ['cliff']; }).some((e) => e.includes('unknown shortcut'))).toBe(true);
    expect(bad((d) => { d.finalLapShift.enablesHazards = ['rocks']; }).some((e) => e.includes('unknown hazard'))).toBe(true);
    expect(bad((d) => { d.coins![0].shortcut = 'nope'; }).some((e) => e.includes('unknown shortcut'))).toBe(true);
  });

  it('warns when the estimated lap is outside 40–65 s', () => {
    const d = cloneDef(HARBOUR_LOOP);
    d.controlPoints = d.controlPoints.map((p) => ({ ...p, x: p.x * 2, z: p.z * 2 }));
    d.voidY = -20;
    d.shortcuts = [];
    d.finalLapShift.closesShortcuts = [];
    d.jumps = [];
    d.coins = d.coins!.filter((c) => !c.shortcut);
    d.boostPads = d.boostPads!.filter((c) => !c.shortcut);
    const v = validateTrack(d);
    expect(v.ok).toBe(true);
    expect(v.warnings.some((w) => w.includes('estimated lap'))).toBe(true);
  });
});
