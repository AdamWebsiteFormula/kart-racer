// Guard: sim code never calls a Math function whose last bits differ between chips or engines.
// The sim is whatever the leaderboard server bundles (every module reachable from
// backend-leaderboard/server.ts) plus every non-test file of the sim systems, minus the
// render-only files listed below. Those must use sim-math/dmath.ts instead.
import { describe, expect, it } from 'vitest';

// every source file as text, keyed 'src/…' (Vite reads them; no Node APIs needed)
const SOURCES: Record<string, string> = Object.fromEntries(
  Object.entries(import.meta.glob('/src/**/*.ts', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>)
    .map(([k, v]) => [k.slice(1), v]),
);

const SIM_DIRS = ['src/kart-controller', 'src/race-manager', 'src/items', 'src/ai-driver', 'src/track-builder', 'src/sim-math'];
const SIM_FILES = ['src/game/simtick.ts'];
/** Render side only: Three.js views and meshes. Never imported by the sim or the server. */
const RENDER_ONLY = ['src/kart-controller/view.ts', 'src/kart-controller/anim.ts', 'src/track-builder/mesh/'];
const BANNED = /\bMath\.(sin|cos|tan|asin|acos|atan|atan2|sinh|cosh|tanh|asinh|acosh|atanh|exp|expm1|log|log1p|log2|log10|pow|cbrt|hypot|fround|random)\b/g;

const isTest = (p: string) => /\.test\.ts$/.test(p) || p.includes('/__tests__/');
const renderOnly = (p: string) => RENDER_ONLY.some((r) => p === r || (r.endsWith('/') && p.startsWith(r)));

/** Resolve a relative import against the importing file: 'src/a/b.ts' + '../c/d.ts' → 'src/c/d.ts'. */
function resolveImport(from: string, spec: string): string | undefined {
  const parts = from.split('/').slice(0, -1);
  for (const seg of spec.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg !== '.') parts.push(seg);
  }
  const p = parts.join('/');
  if (p in SOURCES) return p;
  if (`${p}/index.ts` in SOURCES) return `${p}/index.ts`;
  return undefined; // JSON and the like: data, not code
}

/** Every .ts module reachable from `entry` through value (not `import type`) relative imports. */
function importGraph(entry: string): Set<string> {
  const seen = new Set<string>();
  const queue = [entry];
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const m of SOURCES[file].matchAll(/^\s*(import|export)\s+(type\s+)?[^'";]*?from\s+['"](\.[^'"]+)['"]/gm)) {
      if (m[2]) continue;
      const p = resolveImport(file, m[3]);
      if (p) queue.push(p);
    }
  }
  return seen;
}

/** Source with comments and quoted strings blanked, so prose never trips the guard (template literals stay: they can hold code). */
function code(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(['"])(?:\\.|(?!\1)[^\\\n])*\1/g, '""')
    .replace(/\/\/.*$/gm, '');
}

const server = importGraph('src/backend-leaderboard/server.ts');
const dirFiles = Object.keys(SOURCES).filter((p) => SIM_DIRS.some((d) => p.startsWith(`${d}/`)) && !renderOnly(p));
const simFiles = [...new Set([...server, ...SIM_FILES, ...dirFiles])].filter((p) => !isTest(p)).sort();

describe('sim code uses dmath, never Math transcendentals', () => {
  it('the server bundle graph was found and reaches every sim system', () => {
    for (const d of ['kart-controller', 'race-manager', 'items', 'ai-driver', 'track-builder', 'sim-math']) {
      expect([...server].some((p) => p.startsWith(`src/${d}/`)), d).toBe(true);
    }
  });

  it('render-only files are not part of the sim', () => {
    expect([...server].filter(renderOnly)).toEqual([]);
  });

  it('no banned Math function or ** operator in any sim file', () => {
    const hits: string[] = [];
    for (const f of simFiles) {
      code(SOURCES[f]).split('\n').forEach((line, i) => {
        for (const m of line.matchAll(BANNED)) hits.push(`${f}:${i + 1} ${m[0]}`);
        if (/\*\*/.test(line)) hits.push(`${f}:${i + 1} ** (use a product, or dmath)`);
      });
    }
    expect(hits).toEqual([]);
    expect(simFiles.length).toBeGreaterThan(60);
  });
});
