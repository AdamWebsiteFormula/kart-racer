// The eight racers, design §4. Colours only: the real cast needs the art pipeline.
// This moves into the kart data file when one exists (see ai-driver/personalities.ts).
import type { Archetype } from '../kart-controller/types.ts';

export interface RacerCard {
  id: string;
  name: string;
  archetype: Archetype;
  /** accent, as a hex number for Three.js */
  accent: number;
  secondary: number;
}

export const ROSTER: readonly RacerCard[] = Object.freeze([
  { id: 'pip', name: 'Pip', archetype: 'light', accent: 0x2ec4b6, secondary: 0xff6f61 },
  { id: 'momo', name: 'Momo', archetype: 'light', accent: 0x3b3b3b, secondary: 0xffd23f },
  { id: 'nova', name: 'Nova', archetype: 'light', accent: 0xb39ddb, secondary: 0xffffff },
  { id: 'juniper', name: 'Juniper', archetype: 'medium', accent: 0xb7410e, secondary: 0x2d6a4f },
  { id: 'otto', name: 'Otto', archetype: 'medium', accent: 0x64b5f6, secondary: 0xe53935 },
  { id: 'sprocket', name: 'Sprocket', archetype: 'medium', accent: 0xf5e6c8, secondary: 0xb08d57 },
  { id: 'boulder', name: 'Boulder', archetype: 'heavy', accent: 0x708090, secondary: 0x6a994e },
  { id: 'gus', name: 'Big Gus', archetype: 'heavy', accent: 0xe63946, secondary: 0xffffff },
]);
