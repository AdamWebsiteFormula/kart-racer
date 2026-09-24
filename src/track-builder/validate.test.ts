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

  // track review, 24 Sept 2026
  it('warns of a shortcut that leaves or rejoins the main line at a T-junction (over 30°); no shipped track has one', () => {
    // the beach as it was: a straight chord off the main line at 51°, back on at 74°
    const d = cloneDef(HARBOUR_LOOP);
    d.shortcuts![0].controlPoints = [[-95.48, 4.37, 112.9], [-108, 3, 60], [-115, 1, 0], [-125, 0, -55], [-133.84, 0, -95.28]]
      .map(([x, y, z]) => ({ x, y, z, halfWidth: 5.5, surface: 'road' as const }));
    const w = validateTrack(d).warnings;
    expect(w.some((e) => e.includes('leaves the main line at'))).toBe(true);
    expect(w.some((e) => e.includes('rejoins the main line at'))).toBe(true);
    for (const def of Object.values(import.meta.glob('./tracks/*.json', { eager: true, import: 'default' }) as Record<string, TrackDefinition>)) {
      const v = validateTrack(def);
      expect(v.errors, def.id).toEqual([]);
      expect(v.warnings.filter((x) => x.includes('main line at')), def.id).toEqual([]);
    }
  });

  it('rejects control points under 4 m apart and a width that flares faster than 0.25 m per metre', () => {
    const p = HARBOUR_LOOP.controlPoints[5];
    expect(bad((d) => { d.controlPoints.splice(6, 0, { ...p, z: p.z + 1 }); }).some((e) => e.includes('m apart'))).toBe(true);
    expect(bad((d) => { d.controlPoints[3].halfWidth = 16; }).some((e) => e.includes('halfWidth changes'))).toBe(true);
  });

  it('checks the final-lap road a route override builds, not only the lap-1 main line', () => {
    const errs = bad((d) => {
      d.openEdges = [];
      d.finalLapShift.routeOverrides = [{ fromT: 0.5, toT: 0.58, controlPoints: [{ x: 60, y: 8, z: 175, halfWidth: 7 }, { x: 20, y: 8, z: 185, halfWidth: 7 }] }];
    });
    expect(errs.some((e) => e.startsWith('final-lap road: hairpin'))).toBe(true);
  });

  it('rejects a fixed hazard on or just past a checkpoint (respawns land there); one well behind it is fine', () => {
    const cp3 = HARBOUR_LOOP.startGrid.t + 3 / HARBOUR_LOOP.checkpointCount;
    const on = bad((d) => { d.hazards!.push({ id: 'cup', type: 'static', t: cp3 + 0.002, lateral: 3, hit: 'spin' }); });
    expect(on.some((e) => e.includes('hazard cup (static)') && e.includes('past checkpoint 3'))).toBe(true);
    expect(bad((d) => { d.hazards!.push({ id: 'cup', type: 'static', t: cp3 - 0.012, lateral: 3, hit: 'spin' }); })).toEqual([]);
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
