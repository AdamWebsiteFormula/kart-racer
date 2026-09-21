// Shared helpers for the module unit tests: a kart on a track and a memory.
import { makeConstants } from '../../kart-controller/constants.ts';
import type { KartState } from '../../kart-controller/types.ts';
import { placeAt, spawnKart } from '../../race-manager/__tests__/fixtures.ts';
import type { Track } from '../../track-builder/track.ts';
import { PROFILES } from '../constants.ts';
import { createMemory } from '../driver.ts';
import { readLine } from '../line.ts';
import { emptyLine, makeScratch, type AiMemory, type AiPersonality, type AiProfile, type LineInfo } from '../types.ts';

export const MEDIUM_150 = makeConstants('medium', 150);

export function kartAt(track: Track, t: number, lateral = 0, speed = 20, racerId = 'k'): KartState {
  const { s } = spawnKart(track, 0, racerId);
  placeAt(track, s, t, lateral);
  s.speed = speed;
  s.lap = 1;
  return s;
}

export function memory(profile: AiProfile = PROFILES.hard, personality?: Partial<AiPersonality>, seed = 1): AiMemory {
  const m = createMemory(seed, 0, 'zed', profile, 1);
  if (personality) m.personality = { ...m.personality, ...personality };
  return m;
}

export function lineFor(track: Track, s: KartState, m: AiMemory): LineInfo {
  return readLine(s, track, m, makeScratch(), emptyLine());
}

export function fakeLine(turnNear: number, turnFar = turnNear, halfWidth = 6): LineInfo {
  return { ...emptyLine(), L: 15, turnNear, turnFar, probeNear: 24, kappa: Math.abs(turnNear) / 24, halfWidth };
}
