import { describe, expect, it } from 'vitest';
import { formatGap, formatMs, formatTime, mph, ordinal, ordinalParts, twoDigits } from './format.ts';

describe('format', () => {
  it('times are M:SS.ss across a minute boundary, and negative clamps', () => {
    expect(formatTime(0)).toBe('0:00.00');
    expect(formatTime(-3)).toBe('0:00.00');
    expect(formatTime(9.5)).toBe('0:09.50');
    expect(formatTime(59.999)).toBe('1:00.00');
    expect(formatTime(61.25)).toBe('1:01.25');
    expect(formatMs(83450)).toBe('1:23.45');
    expect(formatMs(-1)).toBe('—');
  });
  it('ordinals 1st to 8th and beyond', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']);
    expect(ordinal(11)).toBe('11th');
    expect(ordinal(21)).toBe('21st');
    expect(ordinalParts(3)).toEqual({ n: '3', suffix: 'rd' });
  });
  it('two digits for the coin count, never negative', () => {
    expect([0, 5, 9, 10, 12].map(twoDigits)).toEqual(['00', '05', '09', '10', '12']);
    expect(twoDigits(-2)).toBe('00');
  });
  it('gaps and speed', () => {
    expect(formatGap(1.234)).toBe('+1.23');
    expect(formatGap(-0.5)).toBe('−0.50');
    expect(mph(25)).toBe(56);
    expect(mph(-25)).toBe(56);
  });
});
