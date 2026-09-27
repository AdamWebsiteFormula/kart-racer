// Prints recipes as JSON for build.py, one per line: {"id", "json"} where json is JSON.stringify(recipe),
// the exact string build.py records in built.json (the tests compare it with the recipe as it stands).
//   node scripts/sfx/recipes-json.ts [file.ts]      (default: scripts/sfx/recipes.ts)
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Recipe } from './types.ts';

const file = process.argv[2] ? pathToFileURL(resolve(process.argv[2])).href : new URL('./recipes.ts', import.meta.url).href;
const { RECIPES } = (await import(file)) as { RECIPES: readonly Recipe[] };
for (const r of RECIPES) console.log(JSON.stringify({ id: r.id, json: JSON.stringify(r) }));
