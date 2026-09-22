// mulberry32 on a uint32 in ItemsState.rng (the ai-driver pattern). One stream per
// race, seeded from the race seed and a fixed salt, so a replay rolls the same items.

export const ITEMS_SALT = 0xb1a5;

export function seedFor(raceSeed: number, salt = ITEMS_SALT): number {
  return (Math.imul(raceSeed | 0, 0x9e3779b1) ^ Math.imul(salt + 1, 0x85ebca77)) >>> 0;
}

export function nextU32(m: { rng: number }): number {
  m.rng = (m.rng + 0x6d2b79f5) >>> 0;
  let t = m.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (t ^ (t >>> 14)) >>> 0;
}

/** [0, 1) */
export function next(m: { rng: number }): number {
  return nextU32(m) / 4294967296;
}

/**
 * Weighted pick over the entries of `weights` with `u` in [0, 1). Entries with
 * weight <= 0 are never picked. Returns undefined when every weight is 0.
 */
export function weightedPick(weights: Readonly<Record<string, number>>, u: number): string | undefined {
  let total = 0;
  for (const w of Object.values(weights)) if (w > 0) total += w;
  if (total <= 0) return undefined;
  let acc = 0;
  let last: string | undefined;
  for (const [id, w] of Object.entries(weights)) {
    if (w <= 0) continue;
    last = id;
    acc += w;
    if (u * total < acc) return id;
  }
  return last;
}
