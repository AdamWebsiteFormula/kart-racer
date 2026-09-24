// mulberry32 on a uint32 kept in AiMemory.rng. The only randomness in the driver;
// seeded from the race seed and the grid slot so a replay is exact.

export function seedFor(raceSeed: number, gridSlot: number): number {
  return (Math.imul(raceSeed | 0, 0x9e3779b1) ^ Math.imul(gridSlot + 1, 0x85ebca77)) >>> 0;
}

function advance(state: number): number {
  return (state + 0x6d2b79f5) >>> 0;
}

function mix(state: number): number {
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (t ^ (t >>> 14)) >>> 0;
}

export function nextU32(m: { rng: number }): number {
  m.rng = advance(m.rng);
  return mix(m.rng);
}

/**
 * [0, 1) from the drift plan's own stream (AiMemory.driftRng): a racer's drift rolls never shift its
 * shortcut, item and lane rolls, so drifting on or off changes the drifts and nothing else.
 */
export function nextDrift(m: { driftRng: number }): number {
  m.driftRng = advance(m.driftRng);
  return mix(m.driftRng) / 4294967296;
}

/**
 * [0, 1), stateless: the same (seed, a, b) always rolls the same. For a decision that must not depend
 * on how many rolls came before it (which item a racer happened to get, when): a shortcut taken or
 * not on a given lap is then the racer's own, the same in every class, drifting or not.
 */
export function rollAt(seed: number, a: number, b: number): number {
  return mix((seed ^ Math.imul(a + 1, 0x9e3779b1) ^ Math.imul(b + 1, 0x85ebca77)) >>> 0) / 4294967296;
}

/** [0, 1) */
export function next(m: { rng: number }): number {
  return nextU32(m) / 4294967296;
}

export function range(m: { rng: number }, lo: number, hi: number): number {
  return lo + (hi - lo) * next(m);
}
