// The eight racers' AI flavour (design §4, SOP table). Lives here until a kart data
// file exists; then it moves there and this becomes a reader.
import { range } from './rng.ts';
import type { AiPersonality } from './types.ts';

export const PERSONALITIES: Readonly<Record<string, Readonly<AiPersonality>>> = Object.freeze({
  pip: { lateralBias: -0.2, aggression: 0.7, driftUse: 0.9 },
  momo: { lateralBias: 0.1, aggression: 0.5, driftUse: 0.8 },
  nova: { lateralBias: 0.35, aggression: 0.3, driftUse: 0.6 },
  juniper: { lateralBias: 0.0, aggression: 0.8, driftUse: 0.7 },
  otto: { lateralBias: -0.4, aggression: 0.2, driftUse: 0.5 },
  sprocket: { lateralBias: 0.2, aggression: 0.4, driftUse: 0.75 },
  boulder: { lateralBias: -0.1, aggression: 0.3, driftUse: 0.4 },
  gus: { lateralBias: 0.4, aggression: 0.6, driftUse: 0.5 },
});

/** Known id → its table row; anything else → a seeded neutral personality. */
export function personalityFor(racerId: string, m: { rng: number }): AiPersonality {
  const p = PERSONALITIES[racerId];
  if (p) return { ...p };
  return { lateralBias: range(m, -0.5, 0.5), aggression: range(m, 0.3, 0.7), driftUse: range(m, 0.5, 0.9) };
}
