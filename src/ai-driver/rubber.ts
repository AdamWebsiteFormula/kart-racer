// Rubber band: gap to the player → rb in [min, max], flat inside the dead zone.
// Skill before power: behind the player the AI drives better; only far ahead does
// it lose top speed, and never above the player-legal cap.
import { AI } from './constants.ts';
import type { AiProfile } from './types.ts';
import * as dmath from '../sim-math/dmath.ts';

/** gap = player.distanceAlong − kart.distanceAlong (metres); positive = AI behind. */
export function rubberBand(gap: number): number {
  const r = AI.rubber;
  const a = Math.abs(gap);
  if (a <= r.deadZone) return 1;
  const x = dmath.tanh((a - r.deadZone) / r.scale);
  return gap > 0 ? 1 + (r.max - 1) * x : 1 - (1 - r.min) * x;
}

export function skillFor(profile: AiProfile, rb: number): number {
  const s = profile.skill + (rb - 1) * AI.rubber.skillGain;
  return s < 0 ? 0 : s > 1 ? 1 : s;
}

/** Fraction of the legal top speed. Flat at profile.power until rb < powerFrom. */
export function powerCapFor(profile: AiProfile, rb: number): number {
  const f = rb / AI.rubber.powerFrom;
  return profile.power * (f < 1 ? f : 1);
}
