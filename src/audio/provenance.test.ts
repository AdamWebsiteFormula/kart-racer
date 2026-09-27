// Every recorded sound effect has a recorded origin, and only one: an ElevenLabs prompt
// (scripts/elevenlabs/catalog.ts SFX) or a recipe (scripts/sfx/recipes.ts, built by build.py). The manifest
// lists exactly those, and every built file is the one its recipe makes (scripts/sfx/built.json holds each
// recipe as built and its file's hash), so a recipe changed without a rebuild, or a file changed by hand,
// fails here. Recipes draw only on the approved packs, the game's own earlier takes and seeded synthesis.
import { describe, expect, it } from 'vitest';
import MANIFEST from '../../public/audio/manifest.json';
import BUILT from '../../scripts/sfx/built.json';
import { fileFor, MOMENT, REPLACED, SFX } from '../../scripts/elevenlabs/catalog.ts';
import { RECIPES } from '../../scripts/sfx/recipes.ts';
import type { Layer } from '../../scripts/sfx/types.ts';

const built = BUILT as Record<string, { recipe: string; sha256: string; seconds: number }>;
const manifest = MANIFEST as { sfx: Record<string, { url: string; loop?: boolean }> };
const recipeIds = new Set(RECIPES.map((r) => r.id));
const sfxIds = new Set(SFX.map((s) => s.id));

/** The approved sources (house rules, 26 Sept 2026): Kenney's packs and the VSCO-2 CE mallets (CC0), the Cascadia Racing Sound Pack (paid license). */
const PACK = /^(kenney\/kenney_[a-z-]+\/Audio\/[\w -]+\.(ogg|wav)|vsco\/(Glock|Xylo|Marimba)\/[\w-]+\.wav|cascadia\/[\w ./-]+\.(wav|ogg|mp3|aif|aiff))$/;
const GIT = /^[0-9a-f]{7,40}$/;
const SYNTHS = new Set(['noise', 'whoosh', 'tone', 'fm', 'crackle', 'silence', 'flame', 'engine', 'kart']);

describe('sound provenance: one maker per sound', () => {
  it('every sound in the manifest is made by exactly one of the catalog and the recipes', () => {
    for (const id of Object.keys(manifest.sfx)) expect(Number(sfxIds.has(id)) + Number(recipeIds.has(id)), id).toBe(1);
    for (const id of recipeIds) expect(sfxIds.has(id), `${id}: made twice`).toBe(false);
    // a replaced ElevenLabs prompt is history: its sound has a recipe now, and generate.ts never makes it again
    for (const s of REPLACED) {
      expect(recipeIds.has(s.id), `${s.id}: replaced but no recipe`).toBe(true);
      expect(sfxIds.has(s.id), `${s.id}: still in SFX`).toBe(false);
    }
  });

  it('the manifest lists every recipe sound at its own file, as a loop exactly when its recipe is one', () => {
    for (const r of RECIPES) {
      const m = manifest.sfx[r.id];
      expect(m, r.id).toBeDefined();
      expect(m.url, r.id).toBe(`audio/sfx/${fileFor(r.id)}`);
      expect(!!m.loop, r.id).toBe(r.loop !== undefined);
    }
  });

  it('every built file is the one its recipe makes (rebuild with scripts/sfx/build.py after any change)', async () => {
    const fs = (await import('node:fs' as string)) as { readFileSync(p: URL): Uint8Array; existsSync(p: URL): boolean };
    const { createHash } = (await import('node:crypto' as string)) as { createHash(a: string): { update(b: Uint8Array): { digest(e: string): string } } };
    expect(Object.keys(built).sort()).toEqual([...recipeIds].sort());
    for (const r of RECIPES) {
      expect(built[r.id].recipe, `${r.id}: recipe changed since it was built`).toBe(JSON.stringify(r));
      const file = new URL(`../../public/audio/sfx/${fileFor(r.id)}`, import.meta.url);
      expect(fs.existsSync(file), r.id).toBe(true);
      expect(createHash('sha256').update(fs.readFileSync(file)).digest('hex'), `${r.id}: file is not the built one`).toBe(built[r.id].sha256);
    }
  });

  it('recipes use only the approved packs, the game’s own takes at a pinned commit, and seeded synthesis', () => {
    const layers = (ls: readonly Layer[]) => ls.map((l) => l.src);
    for (const r of RECIPES) {
      expect(r.layers.length, r.id).toBeGreaterThan(0);
      for (const src of layers(r.layers)) {
        if ('pack' in src) expect(src.pack, r.id).toMatch(PACK);
        else if ('git' in src) {
          expect(src.git, r.id).toMatch(GIT);
          expect(src.path, r.id).toMatch(/^public\/audio\/sfx\/[\w-]+\.mp3$/);
        } else {
          expect(SYNTHS.has(src.synth), `${r.id}: ${src.synth}`).toBe(true);
          const seeded = ['noise', 'whoosh', 'crackle', 'flame', 'engine', 'kart'].includes(src.synth);
          if (seeded) expect(typeof src.args.seed, `${r.id}: ${src.synth} needs a seed`).toBe('number');
        }
      }
    }
  });

  it('every recipe says what it is, where it plays and why it replaced what shipped; no voice asked for', () => {
    for (const r of RECIPES) {
      expect(r.brief.length, r.id).toBeGreaterThan(40);
      expect(r.why.length, r.id).toBeGreaterThan(20);
      expect(MOMENT[r.id]?.length, r.id).toBeGreaterThan(20);
      expect(r.brief, r.id).not.toMatch(/\b(crowds?|cheer(s|ing)?|chant\w*|shout\w*|sing(s|ing|ers?)?|sung|choir|vocal\w*|people|person|announcer|laugh\w*|scream\w*)\b/i);
    }
  });

  it('CREDITS.md credits every pack the recipes draw on', async () => {
    const fs = (await import('node:fs' as string)) as { readFileSync(p: URL, enc: 'utf8'): string };
    const credits = fs.readFileSync(new URL('../../CREDITS.md', import.meta.url), 'utf8');
    const packs = new Set(RECIPES.flatMap((r) => r.layers.map((l) => ('pack' in l.src ? l.src.pack.split('/')[0] : null))).filter(Boolean));
    if (packs.has('kenney')) expect(credits).toMatch(/Kenney.*CC0/);
    if (packs.has('vsco')) expect(credits).toMatch(/VSCO.*CC0/);
    if (packs.has('cascadia')) expect(credits).toMatch(/Cascadia/);
  });
});
