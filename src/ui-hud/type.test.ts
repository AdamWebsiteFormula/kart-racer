// The house type (Adam, 28 Sept 2026: "Why do so many of the graphics with the fonts feel outdated and not cool?"; he
// picked "A" of two directions on stills; design §12): Mona Sans, latin only, swapped in; italic and heavy, white with a
// lift; no ink outline and no ink block on any word (the item slots are restyled on their own and left out here). Read
// from disk: vitest hands CSS imports over as empty strings.
import { beforeAll, describe, expect, it } from 'vitest';

type Fs = { readFileSync(p: string, enc: 'utf8'): string; existsSync(p: string): boolean };
let fs: Fs;
beforeAll(async () => { fs = (await import('node:fs' as string)) as Fs; });
/** the repo root on disk (a plain path: under jsdom node:fs refuses jsdom's URL) */
const ROOT = decodeURIComponent(import.meta.url.replace(/^file:\/\//, '').replace(/src\/ui-hud\/[^/]+$/, ''));
const read = (f: string) => fs.readFileSync(`${ROOT}${f}`, 'utf8');
const SHEETS = ['ui.css', 'menus.css', 'select.css', 'podium.css', 'intro.css'].map((f) => `src/ui-hud/${f}`).concat('src/performance/splash.css');

/** A selector list split at its own commas (not those inside :is(), :where() or :not()). */
function topLevel(list: string): string[] {
  const parts: string[] = [];
  let depth = 0, from = 0;
  for (let j = 0; j < list.length; j++) {
    if (list[j] === '(') depth++;
    else if (list[j] === ')') depth--;
    else if (list[j] === ',' && depth === 0) { parts.push(list.slice(from, j)); from = j + 1; }
  }
  parts.push(list.slice(from));
  return parts.map((s) => s.trim()).filter(Boolean);
}

/** Every style rule in a stylesheet as its selectors and its body (comments and @keyframes left out; @media opened). */
function rules(text: string): { sel: string[]; body: string }[] {
  const src = text.replace(/\/\*[\s\S]*?\*\//g, '');
  const out: { sel: string[]; body: string }[] = [];
  const close = (from: number): number => {
    let depth = 1, j = from;
    while (depth > 0 && j < src.length) { if (src[j] === '{') depth++; else if (src[j] === '}') depth--; j++; }
    return j;
  };
  const walk = (start: number, end: number) => {
    let at = start;
    while (at < end) {
      const open = src.indexOf('{', at);
      if (open < 0 || open >= end) break;
      const prelude = src.slice(at, open).replace(/[;}]/g, ' ').replace(/@import[^;]*;?/g, '').trim();
      const stop = close(open + 1);
      if (prelude.startsWith('@media')) walk(open + 1, stop - 1);
      else if (!prelude.startsWith('@')) out.push({ sel: topLevel(prelude), body: src.slice(open + 1, stop - 1) });
      at = stop;
    }
  };
  walk(0, src.length);
  return out;
}

describe('the house type: Mona Sans (Adam picked it on 28 Sept 2026)', () => {
  it('is self-hosted from @fontsource-variable, latin only, swapped in: an italic file (every weight and width) and an upright one', () => {
    const css = read('src/ui-hud/ui.css');
    const faces = css.match(/@font-face \{[^}]*\}/g) ?? [];
    expect(faces).toHaveLength(2);
    for (const f of faces) {
      expect(f).toContain("font-family: 'Mona Sans';");
      expect(f).toContain('font-display: swap;');
      expect(f).toMatch(/url\('@fontsource-variable\/mona-sans\/files\/mona-sans-latin-(standard-italic|wght-normal)\.woff2'\)/);
      expect(f).toMatch(/unicode-range: U\+0000-00FF,/);
    }
    expect(faces.join('\n')).toContain('font-stretch: 75% 125%;');
    // no other font comes in: no @import of a font package, and none of the old or trial families
    for (const f of SHEETS) {
      const text = read(f);
      expect(text, f).not.toMatch(/@import/);
      expect(text, f).not.toMatch(/Lilita|Fredoka|Rubik|Nunito/);
    }
  });

  it('the tokens: the display and the text are Mona Sans; a navy keyline and a lift', () => {
    const css = read('src/ui-hud/ui.css');
    expect(css).toMatch(/--display: 'Mona Sans',/);
    expect(css).toMatch(/--body: 'Mona Sans',/);
    expect(css).toMatch(/--keyline: #141a45;/);
    expect(css).toMatch(/--lift: /);
    // the shared type class is the display voice: italic, heavy, a little wide, lifted
    const display = rules(css).find((r) => r.sel.includes('.display'))!;
    expect(display.body).toMatch(/font-style: italic;/);
    expect(display.body).toMatch(/font-weight: 800;/);
    expect(display.body).toMatch(/text-shadow: var\(--lift\);/);
  });

  it('no word wears an ink outline or an ink block (the item slots aside, restyled on their own)', () => {
    for (const f of SHEETS) {
      for (const r of rules(read(f))) {
        if (r.sel.every((s) => /\.slot\b/.test(s))) continue;
        expect(r.body, `${f} ${r.sel.join(', ')}`).not.toMatch(/-webkit-text-stroke[^;]*var\(--(ink|s-ink)\)/);
        expect(r.body, `${f} ${r.sel.join(', ')}`).not.toMatch(/text-shadow:[^;]*\b0 [\d.]+px 0 var\(--(ink|s-ink)\)/);
      }
    }
  });

  it('the page preloads the italic file the title draws with, and there is no switch left to pick another type', () => {
    expect(read('vite.config.ts')).toContain('/\\/mona-sans-latin-standard-italic-[\\w-]+\\.woff2$/');
    expect(fs.existsSync(`${ROOT}src/ui-hud/typeface.ts`)).toBe(false);
    expect(read('src/main.ts')).not.toMatch(/type=|typeDirection/);
  });

  it('the words drawn outside the stylesheets are in it too: the Daily\'s calendar and the podium\'s place plates', () => {
    expect(read('src/ui-hud/icons.ts')).toMatch(/font-family="Mona Sans, /);
    expect(read('src/game/podium.ts')).toMatch(/'Mona Sans'/);
  });
});
