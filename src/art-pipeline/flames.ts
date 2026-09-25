// A racer's exhaust color (design §5: the racer's accent, or an alt paint's). The boost flames
// themselves, their mesh and shader, are the effects layer's (vfx-juice/jet.ts and flames.ts: a
// mini-turbo burns its tier's color, any other boost orange-gold; 25 Sept 2026).
import { Color } from 'three';
import { EXHAUST } from './racers.ts';

/** A racer's flame colour in linear RGB, pushed past 1 by `gain` so it glows. `hex`: another colour (an alt paint's flame). */
export function flameColour(racerId: string, gain = 2.6, hex?: string): [number, number, number] {
  const c = new Color(hex ?? EXHAUST[racerId]?.flame ?? '#ff8a3d');
  return [c.r * gain, c.g * gain, c.b * gain];
}
