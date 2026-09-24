import { describe, expect, it } from 'vitest';
import { BUILDER, KART_RADIUS, T_SEARCH_WINDOW } from './constants.ts';

describe('track-builder constants', () => {
  it('match the SOP values via the schema defaults', () => {
    expect(BUILDER.lutSamples).toBe(2048);
    expect(BUILDER.arcDivisions).toBe(4096);
    expect(BUILDER.globalSearchStep).toBe(8);
    expect(BUILDER.branchHysteresis).toBe(1.0);
    expect(BUILDER.maxBankDeg).toBe(20);
    expect(BUILDER.minTurnRadiusFactor).toBe(1.5);
    expect(BUILDER.minStartHalfWidth).toBe(4);
    expect(BUILDER.chunkCount).toBe(8);
    expect(BUILDER.minimapSamples).toBe(200);
    expect(BUILDER.boostPadHalfLength).toBe(1.75);
    expect(BUILDER.decorBands).toEqual({ roadside: [8, 14], roadsideOffroad: [13, 19], far: [30, 120], sky: [25, 60] });
    expect(BUILDER.offroadReach).toBe(12);
    expect(BUILDER.lapTimeWarn).toEqual([40, 65]);
    expect(BUILDER.trackDrawCallBudget).toBe(40);
  });

  it('reads kart values from the kart schema, never redefined', () => {
    expect(KART_RADIUS).toBe(0.85);
    expect(T_SEARCH_WINDOW).toBe(0.02);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(BUILDER)).toBe(true);
  });
});
