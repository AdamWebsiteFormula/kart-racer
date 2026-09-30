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
import { blast, bodyW, boom, chirp, EL, note, NOTES, TAKES, thump } from '../../scripts/sfx/parts.ts';

const built = BUILT as Record<string, { recipe: string; sha256: string; seconds: number }>;
const manifest = MANIFEST as { sfx: Record<string, { url: string; loop?: boolean }> };
const recipeIds = new Set(RECIPES.map((r) => r.id));
const sfxIds = new Set(SFX.map((s) => s.id));

/** The approved sources (house rules, 26 Sept 2026): Kenney's packs and the VSCO-2 CE mallets (CC0), the Cascadia Racing Sound Pack (paid license).
 *  29 Sept 2026, the free packs Adam downloaded for the sound overhaul (their raw files only in the private repo
 *  AdamWebsiteFormula/rascal-sfx-source): the Sonniss GDC 2026 bundle (royalty-free, no attribution), 99Sounds' packs
 *  (royalty-free, no redistributing the raw files), Nox Sound's Essentials, Lentikula's spell impacts and Muted.io's
 *  Performance Cars (CC0). */
const NEW_PACKS = '99Sounds_Sci-Fi_Sound_Effects|99Sounds_Electromagnetic_Fields|99_Sound_Effects|99S011_Sound_Design_Tools|Basic_Spell_Impacts|Druid_Spell_Impacts_Pack|Healing_Spell_Impacts_Pack_by_Lentikula|Essentials_Series_NOX_SOUND|Sonniss\\.com-GDC2026-GameAudioBundle[1-5]of5(__1_)?|performance-cars-free-sample-pack-mutedio';
const PACK = new RegExp(`^(kenney\\/kenney_[a-z-]+\\/Audio\\/[\\w -]+\\.(ogg|wav)|vsco\\/(Glock|Xylo|Marimba)\\/[\\w-]+\\.wav|cascadia\\/[\\w ./-]+\\.(wav|ogg|mp3|aif|aiff)|(${NEW_PACKS})\\/[^\\\\:*?"<>|]+\\.(wav|WAV))$`);
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
    // the overhaul's free packs (29 Sept 2026): none asks for credit, but the credits say where every sound came from
    const uses = (re: RegExp) => [...packs].some((p) => re.test(p as string));
    if (uses(/^Sonniss/)) expect(credits).toMatch(/Sonniss/);
    if (uses(/^99/)) expect(credits).toMatch(/99Sounds/);
    if (uses(/NOX_SOUND/)) expect(credits).toMatch(/Nox Sound/);
    if (uses(/Spell_Impacts/)) expect(credits).toMatch(/Lentikula/);
    if (uses(/mutedio/)) expect(credits).toMatch(/Muted\.io/);
  });
});
