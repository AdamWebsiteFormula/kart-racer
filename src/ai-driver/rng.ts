// mulberry32 on a uint32 kept in AiMemory.rng. The only randomness in the driver;
// seeded from the race seed and the grid slot so a replay is exact.

export function seedFor(raceSeed: number, gridSlot: number): number {
  return (Math.imul(raceSeed | 0, 0x9e3779b1) ^ Math.imul(gridSlot + 1, 0x85ebca77)) >>> 0;
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

export function range(m: { rng: number }, lo: number, hi: number): number {
  return lo + (hi - lo) * next(m);
}
