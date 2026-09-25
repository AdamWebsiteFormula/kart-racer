// @vitest-environment jsdom
// The page's Content-Security-Policy (index.html) and what it asks of the code (red-team 24 Sept 2026):
// scripts only from the site, no inline handlers anywhere, the network only to the site and the board.
import { describe, expect, it } from 'vitest';
import { ITEM_DEFINITIONS } from '../../items/data.ts';
import { SUPABASE_URL } from '../../backend-leaderboard/config.ts';
import { iconMarkup } from '../icons.ts';
import { Markup } from './dom.ts';

const HTML = Object.values(import.meta.glob('/index.html', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>)[0];

/** The policy's directives: name → sources. */
function policy(html: string): Map<string, string[]> {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const meta = doc.querySelector('meta[http-equiv="Content-Security-Policy"]');
  const out = new Map<string, string[]>();
  for (const d of (meta?.getAttribute('content') ?? '').split(';')) {
    const [name, ...sources] = d.trim().split(/\s+/);
    if (name) out.set(name, sources);
  }
  return out;
}

describe('the page policy (index.html)', () => {
  const csp = policy(HTML);

  it('is set before anything loads: right after the charset, ahead of every link and script', () => {
    const head = new DOMParser().parseFromString(HTML, 'text/html').head;
    const tags = [...head.children].map((e) => (e.getAttribute('http-equiv') ? `meta:${e.getAttribute('http-equiv')}` : e.tagName.toLowerCase()));
    const at = tags.indexOf('meta:Content-Security-Policy');
    expect(at).toBe(1); // 0 is <meta charset>
    expect(tags.slice(0, at).every((t) => t === 'meta')).toBe(true);
  });

  it('runs scripts from the site only: no inline code, no eval, no other host', () => {
    expect(csp.get('default-src')).toEqual(["'self'"]);
    expect(csp.get('script-src')).toEqual(["'self'"]);
    expect(csp.get('object-src')).toEqual(["'none'"]);
    expect(csp.get('base-uri')).toEqual(["'self'"]);
    expect(csp.get('form-action')).toEqual(["'none'"]);
    for (const [name, sources] of csp) {
      expect(sources, name).not.toContain("'unsafe-eval'");
      expect(sources, name).not.toContain('*');
      expect(sources.filter((s) => /^(https?:|wss?:)$/.test(s)), name).toEqual([]); // no whole scheme
    }
  });

  it('lets the game reach the leaderboard and nothing else off the site', () => {
    const connect = csp.get('connect-src') ?? [];
    expect(connect).toContain(SUPABASE_URL);
    expect(connect.filter((s) => /^https?:\/\//.test(s))).toEqual([SUPABASE_URL]);
  });

  it('sends no referrer', () => {
    expect(new DOMParser().parseFromString(HTML, 'text/html').querySelector('meta[name="referrer"]')?.getAttribute('content')).toBe('no-referrer');
  });
});

describe('no inline script anywhere (the policy refuses it)', () => {
  // every source file as text; tests excluded (they may spell the thing they forbid)
  const SOURCES = Object.entries(import.meta.glob('/src/**/*.ts', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>)
    .filter(([p]) => !/\.test\.ts$/.test(p) && !p.includes('/__tests__/'));

  it('no markup string carries an on* handler or a javascript: address', () => {
    const hits: string[] = [];
    for (const [file, src] of [...SOURCES, ['/index.html', HTML] as [string, string]]) {
      src.split('\n').forEach((line, i) => {
        if (/<[a-z][^>]*\son[a-z]+\s*=/i.test(line) || /setAttribute\(\s*['"`]on[a-z]+/i.test(line) || /javascript:/i.test(line)) hits.push(`${file}:${i + 1}`);
      });
    }
    expect(hits).toEqual([]);
  });

  it('no item icon carries one either', () => {
    for (const d of ITEM_DEFINITIONS) expect(iconMarkup(d.id), d.id).not.toMatch(/\son[a-z]+\s*=/i);
  });

  it('an icon picture that fails to load removes itself, so the shape under it shows', () => {
    const slot = document.createElement('div');
    new Markup(slot).set(iconMarkup(ITEM_DEFINITIONS[0].id));
    const img = slot.querySelector('img.art');
    expect(img).not.toBeNull();
    img!.dispatchEvent(new Event('error'));
    expect(slot.querySelector('img.art')).toBeNull();
    expect(slot.querySelector('.shape svg')).not.toBeNull();
  });
});
