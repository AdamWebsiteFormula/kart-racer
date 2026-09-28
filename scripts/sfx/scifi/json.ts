// Prints the sci-fi item candidates for cand.py: one JSON object {recipes, moments}.
//   node scripts/sfx/scifi/json.ts [file.ts]   (default: scripts/sfx/scifi/items.ts)
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const file = process.argv[2] ? pathToFileURL(resolve(process.argv[2])).href : new URL('./items.ts', import.meta.url).href;
const m = (await import(file)) as { RECIPES: readonly unknown[]; MOMENTS: Record<string, unknown> };
console.log(JSON.stringify({ recipes: m.RECIPES, moments: m.MOMENTS }));
