// One sim tick, the single code path the game and the leaderboard server both run, so a
// replayed input log reproduces the race exactly. Order (every SOP assumes it):
// AI fills inputs → the player's quantised input → manager.step → items.step.
import type { AiDriver } from '../ai-driver/index.ts';
import { quantize } from '../backend-leaderboard/inputlog.ts';
import { SIM_DT } from '../kart-controller/step.ts';
import type { InputState } from '../kart-controller/types.ts';
import type { Items } from '../items/items.ts';
import type { ItemEvent } from '../items/types.ts';
import type { RaceManager } from '../race-manager/index.ts';
import type { RaceEvent } from '../race-manager/types.ts';

export interface SimParts { manager: RaceManager; items: Items; ai: AiDriver; inputs: InputState[]; playerIndex: number; playerSlot: InputState }

/** `playerInput` null leaves the player's slot to the AI autopilot (finished, attract, results). */
export function simTick(p: SimParts, playerInput: InputState | null): { race: RaceEvent[]; items: ItemEvent[] } {
  const { manager, ai, items, inputs, playerIndex } = p;
  ai.fill(manager.state, manager.lastActiveHazards, inputs);
  if (playerIndex >= 0 && playerInput && manager.state.karts[playerIndex].finishTick === undefined) {
    inputs[playerIndex] = quantize(playerInput, p.playerSlot);
  }
  const race = manager.step(inputs);
  const itemEvents = items.step(inputs, race, SIM_DT);
  for (let k = 0; k < inputs.length; k++) ai.threatened[k] = items.threatened[k];
  return { race, items: itemEvents };
}
