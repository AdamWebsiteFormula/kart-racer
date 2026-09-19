// Checkpoints, spawn grid and distance helpers. All from the main-line LUT.
import { headingOf } from '../kart-controller/types.ts';
import { KART_RADIUS } from './constants.ts';
import type { Lut } from './lut.ts';
import { wrap01 } from './lut.ts';
import type { Checkpoint, SpawnSlot, TrackDefinition } from './types.ts';

/** Checkpoint i at t = startT + i / count; checkpoint 0 is the start line. */
export function buildCheckpoints(lut: Lut, startT: number, count: number): Checkpoint[] {
  const out: Checkpoint[] = [];
  for (let i = 0; i < count; i++) {
    const t = wrap01(startT + i / count);
    const s = lut.sample(t, 0);
    out.push({ index: i, t, position: s.position, tangent: s.tangent, halfWidth: s.halfWidth });
  }
  return out;
}

/**
 * rows × columns slots walking backwards from the start line by `spacing` metres per
 * row. Column centres span ±0.5 × halfWidth (never past halfWidth − kartRadius); odd
 * rows pull in symmetrically by a quarter column step so the edge columns never sit
 * directly behind another kart and the row keeps no left/right bias (with an odd
 * column count the centre column repeats). Heading = tangent.
 */
export function buildSpawnGrid(lut: Lut, startT: number, grid: TrackDefinition['startGrid']): SpawnSlot[] {
  const out: SpawnSlot[] = [];
  const { rows, columns, spacing } = grid;
  for (let r = 0; r < rows; r++) {
    const t = wrap01(startT - ((r + 1) * spacing) / lut.length);
    const hw = lut.sample(t, 0).halfWidth;
    const half = Math.max(0, Math.min(0.5 * hw, hw - KART_RADIUS));
    const step = columns > 1 ? (2 * half) / (columns - 1) : 0;
    const inset = r % 2 === 1 ? step / 4 : 0; // odd rows sit a quarter step inside each edge column
    for (let c = 0; c < columns; c++) {
      const lateral = columns > 1
        ? -half + inset + c * (2 * (half - inset)) / (columns - 1)
        : (r % 2 === 1 ? half / 2 : -half / 2);
      const s = lut.sample(t, lateral);
      out.push({ index: r * columns + c, t, lateral, position: s.position, heading: headingOf(s.tangent) });
    }
  }
  return out;
}

/** Forward distance in metres from t a to t b, wrap-aware. */
export function distanceAlong(length: number, a: number, b: number): number {
  return wrap01(b - a) * length;
}

/** Total race progress in metres for sorting positions: laps plus distance from the start line. */
export function raceProgress(length: number, startT: number, lap: number, t: number): number {
  return lap * length + wrap01(t - startT) * length;
}
