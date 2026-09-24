// Boost flames (design §5): one flame per exhaust pipe in the racer's flame colour, with a
// white-hot core. The colours are HDR (above 1) so the bloom catches them. Geometry only; the
// flicker lives in vfx-juice/flames.ts.
import { Color, type BufferGeometry } from 'three';
import { ModelBuilder, type V3 } from './model.ts';
import { EXHAUST } from './racers.ts';

const HOT: V3 = [1.9, 1.6, 1.1];
const cache = new Map<string, BufferGeometry>();

/** A racer's flame colour in linear RGB, pushed past 1 by `gain` so it glows. `hex`: another colour (an alt paint's flame). */
export function flameColour(racerId: string, gain = 2.6, hex?: string): [number, number, number] {
  const c = new Color(hex ?? EXHAUST[racerId]?.flame ?? '#ff8a3d');
  return [c.r * gain, c.g * gain, c.b * gain];
}

/** One flame from the origin (the pipe mouth) down local −Z, 1 m long at scale 1. Cached per racer (and alt flame colour, `hex`). */
export function flameGeometry(racerId: string, hex?: string): BufferGeometry {
  const key = hex ? `${racerId}|${hex}` : racerId;
  const hit = cache.get(key);
  if (hit) return hit;
  const m = new ModelBuilder(0);
  const aim: V3 = [-Math.PI / 2, 0, 0]; // a cone's tip is +Y; this turns it to −Z
  // a coloured plume forked into two tongues around a small hot core: the racer's colour stays
  // strong (a low HDR gain keeps it from washing to white) and the fork reads as fire, not a jet
  const plume = flameColour(racerId, 1.7, hex), tongue = flameColour(racerId, 1.4, hex);
  m.cone(0.14, 1, plume, [0, 0, -0.5], aim, 12, false);
  m.cone(0.08, 0.7, tongue, [0.05, 0.03, -0.36], [-Math.PI / 2, 0, -0.28], 8, false);
  m.cone(0.08, 0.6, tongue, [-0.05, -0.02, -0.31], [-Math.PI / 2, 0, 0.3], 8, false);
  m.ball([0.1, 0.1, 0.12], plume, [0, 0, -0.05], undefined, 8, false);
  m.cone(0.045, 0.45, HOT, [0, 0, -0.22], aim, 8, false);
  const g = m.build();
  cache.set(key, g);
  return g;
}
