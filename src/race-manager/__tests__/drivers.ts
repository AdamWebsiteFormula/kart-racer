// Scripted drivers for headless race tests. Pure functions of kart state and track.
import { NEUTRAL_INPUT, type InputState, type KartState } from '../../kart-controller/types.ts';
import type { Track } from '../../track-builder/track.ts';

export type Driver = (s: KartState, track: Track) => InputState;

function steerToward(s: KartState, target: readonly number[], gain = 3): number {
  const dx = target[0] - s.position[0], dz = target[2] - s.position[2];
  let err = Math.atan2(dx, dz) - s.heading;
  while (err > Math.PI) err -= 2 * Math.PI;
  while (err < -Math.PI) err += 2 * Math.PI;
  return Math.max(-1, Math.min(1, err * gain));
}

/**
 * Follows the current branch a little ahead. Throttle only scales acceleration in
 * the controller, so `maxSpeed` (m/s) is a governor: coast above it, throttle below.
 */
export function lookAheadDriver(maxSpeed = Infinity, lane = 0, lookAhead = 0.02): Driver {
  return (s, track) => {
    const ahead = track.sample(s.t + lookAhead, lane, s.branch).position;
    return { ...NEUTRAL_INPUT, throttle: s.speed < maxSpeed ? 1 : 0, steer: steerToward(s, ahead) };
  };
}

/**
 * Lanes for a field: spread over 3 m so faster karts can pass on every road, kept off
 * lateral +3 (Harbour's rolling barrels, which a no-brake scripted driver cannot dodge)
 * and off the far left (where its shortcuts peel away).
 */
export function laneFor(i: number): number {
  return [0.5, -0.5, -1.5, -2.5][i % 4];
}

/** Holds brake so the kart reverses straight down the track. */
export function reverseDriver(): Driver {
  return () => ({ ...NEUTRAL_INPUT, brake: 1 });
}

/** Does nothing. */
export const parkDriver: Driver = () => ({ ...NEUTRAL_INPUT });

/** Throttle but no steering: wants to move. Tests pin the kart to make it stuck. */
export const pushDriver: Driver = () => ({ ...NEUTRAL_INPUT, throttle: 1 });

/** Full throttle, full lock: leaves the road on a track with no ground. */
export function offRoadDriver(steer = 1): Driver {
  return () => ({ ...NEUTRAL_INPUT, throttle: 1, steer });
}
