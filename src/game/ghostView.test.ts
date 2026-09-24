import { describe, expect, it } from 'vitest';
import { GHOST_NEAR, GHOST_OPACITY, ghostOpacity } from './ghostView.ts';

describe('ghost opacity', () => {
  it('is faint on top of your kart and its usual see-through level farther off', () => {
    expect(ghostOpacity(0)).toBeCloseTo(GHOST_NEAR.opacity);
    expect(ghostOpacity(GHOST_NEAR.farMetres + 5)).toBeCloseTo(GHOST_OPACITY);
    expect(ghostOpacity(6)).toBeGreaterThan(GHOST_NEAR.opacity);
    expect(ghostOpacity(6)).toBeLessThan(GHOST_OPACITY);
  });
});
