// Checkpoints, spawn grid and distance helpers. All from the main-line LUT.
import { headingOf } from '../kart-controller/types.ts';
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
 * row. Columns spread across ±0.5 × halfWidth; odd rows shift half a column so no kart
 * sits directly behind another. Heading = tangent.
 */
export function buildSpawnGrid(lut: Lut, startT: number, grid: TrackDefinition['startGrid']): SpawnSlot[] {
  const out: SpawnSlot[] = [];
  const { rows, columns, spacing } = grid;
  for (let r = 0; r < rows; r++) {
    const t = wrap01(startT - ((r + 1) * spacing) / lut.length);
    const hw = lut.sample(t, 0).halfWidth;
    const step = hw / columns; // band is hw wide, i.e. ±0.5 × hw
    const shift = r % 2 === 1 ? step / 2 : 0;
    for (let c = 0; c < columns; c++) {
      const lateral = (c + 0.5 - columns / 2) * step + shift;
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
