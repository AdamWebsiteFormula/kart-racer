// Every recorded sound effect has a recorded origin, and only one: an ElevenLabs prompt
// (scripts/elevenlabs/catalog.ts SFX) or a recipe (scripts/sfx/recipes.ts, built by build.py). The manifest
// lists exactly those, and every built file is the one its recipe makes (scripts/sfx/built.json holds each
// recipe as built and its file's hash), so a recipe changed without a rebuild, or a file changed by hand,
// fails here. Recipes draw only on the approved packs, the game's own earlier takes and seeded synthesis.
import { describe, expect, it } from 'vitest';
import MANIFEST from '../../public/audio/manifest.json';
import BUILT from '../../scripts/sfx/built.json';
import FREESOUND from '../../scripts/sfx/freesound.json';
import { fileFor, MOMENT, REPLACED, SFX } from '../../scripts/elevenlabs/catalog.ts';
import { RECIPES } from '../../scripts/sfx/recipes.ts';
import type { Layer } from '../../scripts/sfx/types.ts';
import { blast, bodyW, boom, chirp, EL, note, NOTES, TAKES, thump } from '../../scripts/sfx/parts.ts';

const built = BUILT as Record<string, { recipe: string; sha256: string; seconds: number }>;
const manifest = MANIFEST as { sfx: Record<string, { url: string; loop?: boolean }> };
const recipeIds = new Set(RECIPES.map((r) => r.id));
const sfxIds = new Set(SFX.map((s) => s.id));

/**
 * The approved sources (house rules, 26 and 28 Sept 2026): Kenney's packs and any VSCO-2 Community Edition file
 * (CC0, kept at its repo path), the Cascadia Racing Sound Pack (paid license), CC0 recordings on Freesound (each
 * recorded in scripts/sfx/freesound.json), and Apple's Final Cut Pro library only as a minor, processed ingredient.
 */
const PACK = /^(kenney\/kenney_[a-z-]+\/Audio\/[\w -]+\.(ogg|wav)|vsco\/[\w '#()./-]+\.wav|cascadia\/[\w ./-]+\.(wav|ogg|mp3|aif|aiff))$/;
const GIT = /^[0-9a-f]{7,40}$/;
const SYNTHS = new Set(['noise', 'whoosh', 'tone', 'fm', 'crackle', 'silence', 'flame', 'engine', 'kart', 'modal', 'squeal', 'piston', 'grains']);
const SEEDED = ['noise', 'whoosh', 'crackle', 'flame', 'engine', 'kart', 'modal', 'squeal', 'piston', 'grains'];
const freesound = FREESOUND as Record<string, { name: string; username: string; license: string; url: string }>;
const FCP = /^[A-Z][\w &:.]+\/[\w .&'()-]+\.caf$/;
/** What turns an FCP recording into an ingredient rather than itself: pitch, filters, reversal, a moving comb. */
const PROCESS = new Set(['pitch', 'bend', 'sweep', 'lp', 'hp', 'bp', 'reverse', 'flanger', 'doppler']);
/** A layer's level: its last gain after its normalize (every recipe layer ends normalize, gain). */
const levelOf = (l: Layer) => { const g = [...(l.fx ?? [])].reverse().find((f) => f.op === 'gain'); return g && 'db' in g ? g.db : 0; };

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
        } else if ('freesound' in src) {
          const f = freesound[String(src.freesound)];
          expect(f, `${r.id}: freesound ${src.freesound} not in scripts/sfx/freesound.json`).toBeDefined();
          expect(f.license, `${r.id}: freesound ${src.freesound}`).toMatch(/Creative Commons 0|publicdomain\/zero/);
        } else if ('fcp' in src) {
          expect(src.fcp, r.id).toMatch(FCP);
        } else {
          expect(SYNTHS.has(src.synth), `${r.id}: ${src.synth}`).toBe(true);
          if (SEEDED.includes(src.synth)) expect(typeof src.args.seed, `${r.id}: ${src.synth} needs a seed`).toBe('number');
          // a synth that plays a recording back (the engine's firings) names it: it is held to the same rules
          for (const k of ['fs', 'fs2']) if (k in src.args) expect(freesound[String(src.args[k])], `${r.id}: freesound ${src.args[k]}`).toBeDefined();
        }
      }
      // Final Cut Pro: never the sound itself, only a minor, processed ingredient under a louder layer of another kind
      for (const l of r.layers.filter((x) => 'fcp' in x.src)) {
        expect((l.fx ?? []).some((f) => PROCESS.has(f.op)), `${r.id}: an FCP layer must be processed`).toBe(true);
        const loudest = Math.max(...r.layers.filter((x) => !('fcp' in x.src)).map(levelOf));
        expect(levelOf(l), `${r.id}: an FCP layer sits at least 6 dB under the recipe's own layers`).toBeLessThanOrEqual(loudest - 6);
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

  it('the building blocks for new recipes (parts.ts) draw only on the approved packs and the pinned takes', () => {
    for (const [name, [src, st]] of Object.entries(NOTES)) {
      expect(src.pack, name).toMatch(PACK);
      expect(Math.abs(st), name).toBeLessThanOrEqual(12.5);
      expect(note(name, 0, 0.2, 0).src, name).toEqual(src);
    }
    expect(EL('boost2')).toEqual({ git: TAKES, path: 'public/audio/sfx/boost2.mp3' });
    expect(TAKES).toMatch(GIT);
    for (const l of [blast(-3, 0, 0.5), bodyW('boost3', 0.1, 0.7, 0), chirp(-3, 0), thump(-6), boom(-4)]) {
      if ('pack' in l.src) expect(l.src.pack).toMatch(PACK);
      else if ('git' in l.src) expect(l.src.git).toBe(TAKES);
    }
  });

  it('CREDITS.md credits every pack the recipes draw on', async () => {
    const fs = (await import('node:fs' as string)) as { readFileSync(p: URL, enc: 'utf8'): string };
    const credits = fs.readFileSync(new URL('../../CREDITS.md', import.meta.url), 'utf8');
    const packs = new Set(RECIPES.flatMap((r) => r.layers.map((l) => ('pack' in l.src ? l.src.pack.split('/')[0] : null))).filter(Boolean));
    if (packs.has('kenney')) expect(credits).toMatch(/Kenney.*CC0/);
    if (packs.has('vsco')) expect(credits).toMatch(/VSCO.*CC0/);
    if (packs.has('cascadia')) expect(credits).toMatch(/Cascadia/);
    // Freesound (CC0: no credit owed, but every author is named as a courtesy) and the Final Cut Pro ingredients
    const ids = RECIPES.flatMap((r) => r.layers.flatMap((l) => ('freesound' in l.src ? [l.src.freesound] : 'synth' in l.src ? [l.src.args.fs, l.src.args.fs2].filter((x) => x !== undefined) : [])));
    if (ids.length) expect(credits).toMatch(/Freesound/);
    for (const id of ids) expect(credits, `freesound ${id}: its author`).toContain(freesound[String(id)].username);
    if (RECIPES.some((r) => r.layers.some((l) => 'fcp' in l.src))) expect(credits).toMatch(/Final Cut Pro/);
  });
});
