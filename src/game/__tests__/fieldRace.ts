// A full field race with a stand-in player (game/difficulty.e2e.test.ts, 26 Sept 2026): the eight racers
// in the game's own line-up, the player on the back row in their own kart, items and hazards live, the
// real sim tick, and the player's seat driven by the AI with a fixed "player" profile of its own. The
// stand-ins hold the gas (power 1, as a human does) and differ in how sharply they drive:
// - kid: a small child, loose hands and slow reactions, no real drifting (skill 0.2, noise 0.15);
// - adult: a grown-up who drives cleanly and drifts to orange (skill 0.75, noise 0.03);
// - expert: clean lines, purple drifts, sharp items (skill 1, no noise): the level at which Adam called
//   100cc "pretty easy" (26 Sept 2026: it won 9 of 12 races there by 5 s).
import { AiDriver } from '../../ai-driver/index.ts';
import { PROFILES } from '../../ai-driver/constants.ts';
import type { AiProfile } from '../../ai-driver/types.ts';
import { quantize } from '../../backend-leaderboard/inputlog.ts';
import { Items } from '../../items/items.ts';
import { SIM_DT, SIM_HZ } from '../../kart-controller/step.ts';
import { NEUTRAL_INPUT, type InputState, type SpeedClass } from '../../kart-controller/types.ts';
import { RaceManager } from '../../race-manager/index.ts';
import { buildTrack } from '../../track-builder/track.ts';
import type { TrackDefinition } from '../../track-builder/types.ts';
import { lineup } from '../lineup.ts';

export type StandIn = 'kid' | 'adult' | 'expert';

export const STAND_INS: Readonly<Record<StandIn, AiProfile>> = Object.freeze({
  kid: { ...PROFILES.easy, skill: 0.2, power: 1, noise: 0.15 },
  adult: { ...PROFILES.hard, skill: 0.75, power: 1, noise: 0.03 },
  expert: { ...PROFILES.hard, skill: 1, power: 1, noise: 0 },
});

export interface FieldResult {
  /** the stand-in's place, 1..8 */
  place: number;
  /** seconds between the best AI and the stand-in (positive: the stand-in won by that much) */
  gap: number;
}

/** One race at `cc` on `def`, seed `seed`, the stand-in `who` in the player's seat as `racerId`; `field` overrides the class's AI profile (tuning). */
export function fieldRace(def: TrackDefinition, cc: SpeedClass, who: StandIn, seed: number, racerId = 'juniper', field?: AiProfile): FieldResult {
  const track = buildTrack(def);
  const config = { mode: 'quick' as const, trackId: def.id, speedClass: cc, seed, racers: lineup(racerId) };
  const manager = new RaceManager(track, config);
  const items = new Items(track, manager);
  const ai = new AiDriver(track, config, manager.state, { itemRoles: items.roles, profile: field });
  const seat = new AiDriver(track, config, manager.state, { itemRoles: items.roles, profile: STAND_INS[who] });
  seat.drivePlayer = true;
  const pi = manager.playerIndex;
  const inputs: InputState[] = manager.state.karts.map(() => ({ ...NEUTRAL_INPUT }));
  const theirs: InputState[] = manager.state.karts.map(() => ({ ...NEUTRAL_INPUT }));
  const slot = { ...NEUTRAL_INPUT };
  for (let t = 0; t < 400 * SIM_HZ && manager.state.phase !== 'finished'; t++) {
    ai.fill(manager.state, manager.lastActiveHazards, inputs);
    if (manager.state.karts[pi].finishTick === undefined) {
      seat.fill(manager.state, manager.lastActiveHazards, theirs);
      inputs[pi] = quantize(theirs[pi], slot);
    }
    const race = manager.step(inputs);
    items.step(inputs, race, SIM_DT);
    for (let k = 0; k < inputs.length; k++) { ai.threatened[k] = items.threatened[k]; seat.threatened[k] = items.threatened[k]; }
  }
  const ranks = manager.results().ranks;
  const time = (r: (typeof ranks)[number]) => (r.dnf ? r.projectedMs : r.timeMs) / 1000;
  const me = ranks.find((r) => r.racerId === racerId);
  if (!me) throw new Error(`${racerId} not in the results`);
  const best = Math.min(...ranks.filter((r) => r.racerId !== racerId).map(time));
  return { place: me.rank, gap: best - time(me) };
}
