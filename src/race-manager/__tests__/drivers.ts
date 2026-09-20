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

/** Follows the current branch a little ahead at `throttle`. */
export function lookAheadDriver(throttle = 1, lookAhead = 0.02): Driver {
  return (s, track) => {
    const ahead = track.sample(s.t + lookAhead, 0, s.branch).position;
    return { ...NEUTRAL_INPUT, throttle, steer: steerToward(s, ahead) };
  };
}

/** Holds brake so the kart reverses down the track, steering to stay on the line behind it. */
export function reverseDriver(lookBehind = 0.02): Driver {
  return (s, track) => {
    const behind = track.sample(s.t - lookBehind, 0, s.branch).position;
    // reverse flips steer in the controller; aim the nose away from the target so the tail goes toward it
    return { ...NEUTRAL_INPUT, brake: 1, steer: -steerToward(s, behind) };
  };
}

/** Does nothing. */
export const parkDriver: Driver = () => ({ ...NEUTRAL_INPUT });

/** Throttle but no steering: wants to move. Tests pin the kart to make it stuck. */
export const pushDriver: Driver = () => ({ ...NEUTRAL_INPUT, throttle: 1 });

/** Full throttle, full lock: leaves the road on a track with no ground. */
export function offRoadDriver(steer = 1): Driver {
  return () => ({ ...NEUTRAL_INPUT, throttle: 1, steer });
}
