// @vitest-environment jsdom
// The type on trial (typeface.ts; 28 Sept 2026, Adam: "Why do so many of the graphics with the fonts feel outdated and not
// cool?"): ?type=a and ?type=b each bring a direction's stylesheet and fonts; with neither, the house type stays exactly
// as it was, and neither direction's rules can reach a page that did not ask for it.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { applyTypeDirection, typeDirection } from './typeface.ts';

type Fs = { readFileSync(p: string, enc: 'utf8'): string };
let fs: Fs;
beforeAll(async () => { fs = (await import('node:fs' as string)) as Fs; });
/** the repo root on disk (a plain path: under jsdom node:fs refuses jsdom's URL) */
const ROOT = decodeURIComponent(import.meta.url.replace(/^file:\/\//, '').replace(/src\/ui-hud\/[^/]+$/, ''));
const css = (f: string) => fs.readFileSync(`${ROOT}src/ui-hud/${f}`, 'utf8');

/** A selector list split at its own commas (not those inside :where(), :is() or :not()). */
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

/** Every style rule's selectors in a stylesheet (comments, @import lines and @keyframes blocks left out; @media opened). */
function selectors(text: string): string[] {
  const src = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@import[^;]*;/g, '');
  const out: string[] = [];
  const block = (from: number): number => {
    let depth = 1, j = from;
    while (depth > 0 && j < src.length) { if (src[j] === '{') depth++; else if (src[j] === '}') depth--; j++; }
    return j;
  };
  const walk = (start: number, end: number) => {
    let at = start;
    while (at < end) {
      const open = src.indexOf('{', at);
      if (open < 0 || open >= end) break;
      const prelude = src.slice(at, open).replace(/[;}]/g, ' ').trim();
      const close = block(open + 1);
      if (prelude.startsWith('@keyframes')) { /* frames, not selectors */ } else if (prelude.startsWith('@media')) walk(open + 1, close - 1);
      else out.push(...topLevel(prelude));
      at = close;
    }
  };
  walk(0, src.length);
  return out;
}

afterEach(() => { delete document.documentElement.dataset.type; });

describe('the type on trial', () => {
  it('reads ?type=a and ?type=b from the address, and nothing else', () => {
    expect(typeDirection('?type=a')).toBe('a');
    expect(typeDirection('?mute&type=b')).toBe('b');
    expect(typeDirection('')).toBeNull();
    expect(typeDirection('?type=c')).toBeNull();
    expect(typeDirection('?type=A')).toBeNull();
  });

  it('marks the page with the direction asked for, and leaves it unmarked with none', async () => {
    await applyTypeDirection(document.documentElement, null);
    expect(document.documentElement.dataset.type).toBeUndefined();
    await applyTypeDirection(document.documentElement, 'b');
    expect(document.documentElement.dataset.type).toBe('b');
  });

  it('keeps the house type the default: Lilita One and Fredoka, unchanged', () => {
    const ui = css('ui.css');
    expect(ui).toContain("@import '@fontsource/lilita-one/400.css';");
    expect(ui).toMatch(/--display: 'Lilita One'/);
    expect(ui).toMatch(/--body: 'Fredoka'/);
  });

  it('scopes every rule of each direction to a page that asked for it', () => {
    for (const [file, dir] of [['type-a.css', 'a'], ['type-b.css', 'b']] as const) {
      const sels = selectors(css(file));
      expect(sels.length).toBeGreaterThan(40);
      for (const s of sels) expect(s, `${file}: ${s}`).toMatch(new RegExp(`^:root\\[data-type='${dir}'\\]`));
    }
  });

  it('brings its own OFL fonts through @fontsource, and only those', () => {
    expect(css('type-a.css')).toMatch(/@import '@fontsource-variable\/mona-sans\/standard-italic\.css';/);
    const b = css('type-b.css');
    expect(b).toMatch(/@import '@fontsource-variable\/rubik\/wght-italic\.css';/);
    expect(b).toMatch(/@import '@fontsource-variable\/nunito\/wght\.css';/);
    for (const f of ['type-a.css', 'type-b.css']) expect(css(f)).not.toMatch(/fonts\.googleapis|https?:\/\//);
  });
});
