// Synthetic control-point loops for headless tests. Metres, Y up.
import type { ControlPoint } from '../types.ts';

/** Eight-point rounded square, flat. */
export const SQUARE: ControlPoint[] = [
  { x: -60, y: 0, z: -60, halfWidth: 6 },
  { x: 0, y: 0, z: -70, halfWidth: 6 },
  { x: 60, y: 0, z: -60, halfWidth: 6 },
  { x: 70, y: 0, z: 0, halfWidth: 6 },
  { x: 60, y: 0, z: 60, halfWidth: 6 },
  { x: 0, y: 0, z: 70, halfWidth: 6 },
  { x: -60, y: 0, z: 60, halfWidth: 6 },
  { x: -70, y: 0, z: 0, halfWidth: 6 },
];

/** Harbour-ish loop: uneven spacing, a hill, one banked corner, a dirt stretch. ~900 m. */
export const HARBOURISH: ControlPoint[] = [
  { x: 0, y: 0, z: -120, halfWidth: 8, surface: 'road' },
  { x: 120, y: 0, z: -130, halfWidth: 8, surface: 'road' },
  { x: 200, y: 2, z: -80, halfWidth: 7, bank: 12, surface: 'road' },
  { x: 210, y: 6, z: 20, halfWidth: 6, bank: 12, surface: 'road' },
  { x: 150, y: 10, z: 90, halfWidth: 6, surface: 'dirt' },
  { x: 40, y: 8, z: 120, halfWidth: 7, surface: 'dirt' },
  { x: -60, y: 4, z: 110, halfWidth: 8, surface: 'road' },
  { x: -150, y: 0, z: 60, halfWidth: 8, bank: -8, surface: 'road' },
  { x: -170, y: 0, z: -30, halfWidth: 9, surface: 'road' },
  { x: -120, y: 0, z: -100, halfWidth: 9, surface: 'ice' },
  { x: -50, y: 0, z: -125, halfWidth: 8, surface: 'road' },
];

/** Bernoulli lemniscate with a bridge: one pass through the crossing at y=0, the other at y=8. */
export function figureEight(points = 24, a = 160): ControlPoint[] {
  const out: ControlPoint[] = [];
  for (let i = 0; i < points; i++) {
    const th = (i / points) * Math.PI * 2;
    const den = 1 + Math.sin(th) ** 2;
    const x = (a * Math.cos(th)) / den;
    const z = (a * Math.sin(th) * Math.cos(th)) / den;
    // bridge bump centred on the second crossing (th = 3π/2), 8 m high
    const d = th - 1.5 * Math.PI;
    const y = 8 * Math.exp(-(d * d) / 0.5);
    out.push({ x, y, z, halfWidth: 6 });
  }
  return out;
}

/** Flat oval with a constant 10° bank everywhere. */
export const BANKED: ControlPoint[] = SQUARE.map((p) => ({ ...p, bank: 10 }));
