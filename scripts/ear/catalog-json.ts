// Prints the sound catalog as JSON (id, prompt, file) for the ear scripts.
// Built sounds (scripts/sfx/recipes.ts) come with their brief as the prompt.
import { fileFor, SFX } from '../elevenlabs/catalog.ts';
import { RECIPES } from '../sfx/recipes.ts';
console.log(JSON.stringify([...SFX.map((s) => ({ id: s.id, prompt: s.prompt })), ...RECIPES.map((r) => ({ id: r.id, prompt: r.brief }))]
  .map((s) => ({ ...s, file: `public/audio/sfx/${fileFor(s.id)}` }))));
