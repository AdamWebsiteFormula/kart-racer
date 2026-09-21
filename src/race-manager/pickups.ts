// Balloon and coin timers. A kart on the feature's branch inside its radius pops it;
// coins add one (capped); balloons fire `pickup` and the items system does the rest.
import type { KartConstants } from '../kart-controller/constants.ts';
import type { KartState } from '../kart-controller/types.ts';
import type { Track } from '../track-builder/track.ts';
import { RACE } from './constants.ts';
import type { FeatureTimer, RaceEvent } from './types.ts';
import { countDown, distXZ } from './util.ts';

/** Feature indices by kind, fixed at race start (a shift only appends jumps). */
export interface FeatureIndex { pickups: number[]; coins: number[] }

export function indexFeatures(track: Track): FeatureIndex {
  const fi: FeatureIndex = { pickups: [], coins: [] };
  track.features.forEach((f, i) => {
    if (f.kind === 'pickup') fi.pickups.push(i);
    else if (f.kind === 'coin') fi.coins.push(i);
  });
  return fi;
}

export function initTimers(fi: FeatureIndex): { pickupStates: FeatureTimer[]; coinStates: FeatureTimer[] } {
  return {
    pickupStates: fi.pickups.map(() => ({ respawnRemaining: 0 })),
    coinStates: fi.coins.map(() => ({ respawnRemaining: 0 })),
  };
}

function stepKind(
  kind: 'pickup' | 'coin', indices: readonly number[], states: FeatureTimer[], track: Track,
  karts: KartState[], consts: readonly KartConstants[], dt: number, events: RaceEvent[],
): void {
  for (let j = 0; j < indices.length; j++) {
    const st = states[j];
    st.respawnRemaining = countDown(st.respawnRemaining, dt);
    if (st.respawnRemaining > 0) continue;
    const f = track.features[indices[j]];
    if (!track.branches.list[f.branch].open) continue; // a closed shortcut hides its balloons and coins
    const radius = f.width / 2;
    for (let i = 0; i < karts.length; i++) {
      const s = karts[i];
      if (s.isGhost || s.finishTick !== undefined || s.branch !== f.branch) continue;
      if (distXZ(s.position, f.position) > radius + consts[i].kartRadius) continue;
      if (kind === 'coin') {
        st.respawnRemaining = RACE.coinRespawnSeconds;
        s.coins = Math.min(consts[i].coinCap, s.coins + 1);
        events.push({ type: 'coin', racerId: s.racerId, coins: s.coins });
      } else {
        st.respawnRemaining = RACE.pickupRespawnSeconds;
        events.push({ type: 'pickup', racerId: s.racerId, index: j });
      }
      break; // one kart per pop
    }
  }
}

export function stepPickups(
  fi: FeatureIndex, pickupStates: FeatureTimer[], coinStates: FeatureTimer[], track: Track,
  karts: KartState[], consts: readonly KartConstants[], dt: number, events: RaceEvent[],
): void {
  stepKind('pickup', fi.pickups, pickupStates, track, karts, consts, dt, events);
  stepKind('coin', fi.coins, coinStates, track, karts, consts, dt, events);
}
