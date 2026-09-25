// @vitest-environment jsdom
// The race HUD on a phone on its side as its browser shows it, a toolbar up (300 to 360 px tall).
// jsdom has no layout, so this pins the rules; the fit was measured in headless Chrome and WebKit at
// 852x344 with the notch's insets, 915x356, 780x304 and 667x325: no HUD corner on another or on a
// thumb button (cross-browser sweep, 24 Sept 2026; before, the place sat on the item slot and the lap
// counter on Item and Drift).
import { beforeAll, describe, expect, it } from 'vitest';

let css = '';
beforeAll(async () => {
  const fs = (await import('node:fs' as string)) as { readFileSync(p: string, enc: 'utf8'): string };
  css = fs.readFileSync(decodeURIComponent(import.meta.url.replace(/^file:\/\//, '').replace(/[^/]+$/, 'ui.css')), 'utf8');
});

/** The declarations of `selector` inside the @media whose condition names every one of `media`. */
function inMedia(media: string[], selector: string): CSSStyleDeclaration | null {
  document.head.innerHTML = '';
  const s = document.createElement('style');
  s.textContent = css;
  document.head.appendChild(s);
  let out: CSSStyleDeclaration | null = null;
  for (const r of s.sheet!.cssRules) {
    if (!(r instanceof CSSMediaRule) || !media.every((m) => r.media.mediaText.includes(m))) continue;
    for (const x of r.cssRules) if (x instanceof CSSStyleRule && x.selectorText === selector) out = x.style;
  }
  return out;
}

describe('the race HUD on a short touch screen', () => {
  const SHORT = ['pointer: coarse', 'max-height: 420px'];
  it('draws the corners smaller, from their own corners, so none reaches another', () => {
    expect(inMedia(SHORT, ':root .hud .tl')?.getPropertyValue('transform')).toMatch(/scale\(0\.\d+\)/);
    expect(inMedia(SHORT, ':root .hud .tl')?.getPropertyValue('transform-origin')).toBe('top left');
    expect(inMedia(SHORT, ':root .hud .br')?.getPropertyValue('transform-origin')).toBe('top right');
    expect(inMedia(SHORT, ':root .touch .buttons')?.getPropertyValue('transform-origin')).toBe('bottom right');
  });
  it('sets the coins beside the place, just above the steering pad', () => {
    const bl = inMedia(SHORT, ':root .hud .bl');
    expect(bl?.getPropertyValue('flex-direction')).toBe('row');
    expect(bl?.getPropertyValue('transform-origin')).toBe('bottom left');
    expect(bl?.getPropertyValue('bottom')).toContain('126px');
  });
  it('keeps Look and Brake, the smallest thumb buttons, at least 44 px at that scale', () => {
    const k = Number(/scale\(([\d.]+)\)/.exec(inMedia(SHORT, ':root .touch .buttons')?.getPropertyValue('transform') ?? '')?.[1]);
    expect(58 * k).toBeGreaterThanOrEqual(44);
  });
});
