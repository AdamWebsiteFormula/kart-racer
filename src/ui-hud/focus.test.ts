import { describe, expect, it } from 'vitest';
import { firstFocus, move, reachable } from './focus.ts';
import type { FocusModel } from './types.ts';

const grid: FocusModel = { rows: [['a', 'b', 'c', 'd'], ['e', 'f', 'g', 'h'], ['go']], disabled: ['c'] };

describe('focus', () => {
  it('moves in four directions, wraps, and skips disabled entries', () => {
    expect(move(grid, 'b', 'right')).toBe('d');
    expect(move(grid, 'd', 'right')).toBe('a');
    expect(move(grid, 'a', 'left')).toBe('d');
    expect(move(grid, 'g', 'up')).toBe('b'); // c is disabled, nearest enabled column
    expect(move(grid, 'h', 'down')).toBe('go');
    expect(move(grid, 'go', 'down')).toBe('a');
    expect(move(grid, 'a', 'up')).toBe('go');
  });

  it('every enabled entry is reachable from the first focus, no disabled one ever is', () => {
    const start = firstFocus(grid)!;
    const r = reachable(grid, start);
    expect([...r].sort()).toEqual(['a', 'b', 'd', 'e', 'f', 'g', 'go', 'h']);
  });

  it('an unknown id falls back to the first enabled entry', () => {
    expect(move({ rows: [['x', 'y']], disabled: ['x'] }, 'nope', 'down')).toBe('y');
  });
});
