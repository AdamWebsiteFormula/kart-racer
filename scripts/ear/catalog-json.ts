// Prints the sound catalog as JSON (id, prompt, file) for the ear scripts.
import { fileFor, SFX } from '../elevenlabs/catalog.ts';
console.log(JSON.stringify(SFX.map((s) => ({ id: s.id, prompt: s.prompt, file: `public/audio/sfx/${fileFor(s.id)}` }))));
