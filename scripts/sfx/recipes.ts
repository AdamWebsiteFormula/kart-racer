// The game's built sounds: every sound here is made by scripts/sfx/build.py from these recipes, out of
// the approved packs (Kenney, CC0; VSCO-2 Community Edition mallets, CC0), the game's own earlier
// ElevenLabs takes (pinned to a commit, so the build is repeatable) and seeded code synthesis. This file
// is their provenance record, as scripts/elevenlabs/catalog.ts is for the ElevenLabs sounds: change a
// recipe, rebuild (build.py), and the tests hold public/audio/sfx and scripts/sfx/built.json to it.
// Rules as for the catalog: original sounds only, no franchise sound or look-alike, no voices or words.
import type { Recipe } from './types.ts';

export const RECIPES: readonly Recipe[] = [];
