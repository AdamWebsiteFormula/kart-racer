// Headless race harness for the AI tests: RaceManager + AiDriver, the game-loop order.
import { SIM_HZ } from '../../kart-controller/step.ts';
import { NEUTRAL_INPUT, type InputState, type KartState } from '../../kart-controller/types.ts';
import { RaceManager } from '../../race-manager/race.ts';
import type { RaceConfig, RaceEvent, RacerConfig } from '../../race-manager/types.ts';
import type { Track } from '../../track-builder/track.ts';
import { AiDriver, type AiDriverOptions } from '../driver.ts';

export const RACER_IDS = ['pip', 'momo', 'nova', 'juniper', 'otto', 'sprocket', 'boulder', 'gus'];
export const MAX_TICKS = SIM_HZ * 400;

export function racers(n: number, playerAt = -1): RacerConfig[] {
  return RACER_IDS.slice(0, n).map((id, i) => ({ racerId: id, archetype: 'medium' as const, isPlayer: i === playerAt }));
}

export function config(track: Track, rs: RacerConfig[], speedClass: 50 | 100 | 150 = 100, seed = 1, laps?: number): RaceConfig {
  return { mode: 'quick', trackId: track.id, speedClass, seed, racers: rs, laps };
}

export type Driver = (s: KartState, track: Track, tick: number) => InputState;

export interface RunResult {
  rm: RaceManager;
  ai: AiDriver;
  log: { tick: number; e: RaceEvent }[];
}

/**
 * Runs a race to the finish. `manual` drivers take the slots the AI leaves alone
 * (the player until finished). `onTick` sees the inputs after the AI filled them.
 */
export function runRace(
  track: Track, cfg: RaceConfig, opts: AiDriverOptions = {}, manual: Record<number, Driver> = {},
  onTick?: (tick: number, inputs: InputState[], rm: RaceManager, ai: AiDriver) => void, maxTicks = MAX_TICKS,
): RunResult {
  const rm = new RaceManager(track, cfg);
  const ai = new AiDriver(track, cfg, rm.state, opts);
  const log: { tick: number; e: RaceEvent }[] = [];
  const inputs: InputState[] = rm.state.karts.map(() => ({ ...NEUTRAL_INPUT }));
  while (rm.state.phase !== 'finished' && rm.state.tick < maxTicks) {
    const tick = rm.state.tick;
    for (const [k, d] of Object.entries(manual)) inputs[Number(k)] = d(rm.state.karts[Number(k)], track, tick);
    ai.fill(rm.state, rm.lastActiveHazards, inputs);
    onTick?.(tick, inputs, rm, ai);
    for (const e of rm.step(inputs)) log.push({ tick, e });
  }
  return { rm, ai, log };
}

export function finishes(log: RunResult['log']) {
  return log.filter((x) => x.e.type === 'finish').map((x) => ({ ...(x.e as Extract<RaceEvent, { type: 'finish' }>), tick: x.tick }));
}

export function count(log: RunResult['log'], type: RaceEvent['type']): number {
  return log.filter((x) => x.e.type === type).length;
}
