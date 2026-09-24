// @vitest-environment jsdom
// The stylesheet's rules for a phone on its side. jsdom has no layout, so these pin the rules; the
// sizes they give were measured in the browser at 844x390 and 740x360 (docs/sops/ui-hud.md Decisions).
import { beforeAll, describe, expect, it } from 'vitest';
import { UI } from './constants.ts';

let css = '';
beforeAll(async () => {
  // read from disk: vitest hands CSS imports (?raw too) over as empty strings. A plain path: under
  // jsdom node:fs refuses jsdom's URL, and Vite rewrites `new URL('./x', import.meta.url)` to a served one
  const fs = (await import('node:fs' as string)) as { readFileSync(p: string, enc: 'utf8'): string };
  css = fs.readFileSync(decodeURIComponent(import.meta.url.replace(/^file:\/\//, '').replace(/[^/]+$/, 'ui.css')), 'utf8');
});

function rules(): CSSRuleList {
  document.head.innerHTML = '';
  const s = document.createElement('style');
  s.textContent = css;
  document.head.appendChild(s);
  return s.sheet!.cssRules;
}

/** The value of `prop` for exactly `selector`: top level, or inside the @media whose condition is `media`. The last one wins, as in the cascade. */
function value(selector: string, prop: string, media?: string): string {
  let out = '';
  const walk = (list: CSSRuleList, inMedia: string | null) => {
    for (const r of list) {
      if (r instanceof CSSMediaRule) walk(r.cssRules, r.media.mediaText);
      else if (r instanceof CSSStyleRule && inMedia === (media ?? null) && r.selectorText.split(',').map((x) => x.trim()).includes(selector)) {
        const v = r.style.getPropertyValue(prop);
        if (v) out = v;
      }
    }
  };
  walk(rules(), null);
  return out;
}

const PHONE = '(max-height: 500px)';

describe('menus on a phone on its side (bug hunt 3)', () => {
  it('every menu stage scrolls when it is taller than the screen (html and body never do)', () => {
    expect(value('html', 'overflow')).toBe('hidden');
    expect(value('.stage', 'overflow')).toBe('hidden auto');
    expect(value('.stage', 'overscroll-behavior')).toBe('contain');
  });

  it('the roster keeps all eight racers on two rows of four, name and class only, so the 50/100/150cc row fits', () => {
    expect(value('.roster', 'grid-template-columns', '(max-width: 900px)')).toBe('repeat(2, minmax(0, 1fr))');
    expect(value('.roster', 'grid-template-columns', PHONE)).toBe('repeat(4, minmax(0, 1fr))');
    expect(value('.card .stats', 'display', PHONE)).toBe('none');
    expect(value('.card .who', 'display', PHONE)).toBe('none');
  });

  it('the title sizes its name by the height too, sets the four buttons two by two, and never spills off the top', () => {
    expect(value('.logo .l1', 'font-size', PHONE)).toMatch(/vh/);
    expect(value('.logo .l2', 'font-size', PHONE)).toMatch(/vh/);
    expect(value('.title .menu', 'grid-template-columns', PHONE)).toBe('1fr 1fr');
    expect(value('.title .stage', 'justify-content', PHONE)).toBe('safe center');
    // the desktop title is as it was
    expect(value('.title .stage', 'justify-content')).toBe('center');
  });

  it('the rotate prompt takes the taps, so none goes through to the buttons hidden under it', () => {
    expect(value('#ui', 'pointer-events')).toBe('none');
    expect(value('.rotate-hint', 'pointer-events')).toBe('auto');
    expect(value('.rotate-hint', 'display', '(orientation: portrait) and (pointer: coarse)')).toBe('flex');
  });

  it('the touch controls, shown, take a touch anywhere (a thumb on the screen is the gas before the green light)', () => {
    expect(value('.touch', 'pointer-events')).toBe('none');
    expect(value('.touch.on', 'pointer-events')).toBe('auto');
  });

  it('cups sit side by side and track cards fit the stage', () => {
    expect(value('.cups', 'grid-template-columns', PHONE)).toBe('repeat(auto-fit, minmax(260px, 1fr))');
    expect(value('.track-cards', 'width', PHONE)).toBe('100%');
  });

  it('the pause fits without a scroll, its six buttons two by two, under the query the focus grids use (seam review)', () => {
    // at 740x360 its content was 536 px in a 309 px box: Credits and Quit sat below the panel
    expect(UI.shortScreenQuery).toBe(PHONE);
    expect(value('.pause .list', 'display', PHONE)).toBe('grid');
    expect(value('.pause .list', 'grid-template-columns', PHONE)).toBe('1fr 1fr');
    expect(value('.pause .btn', 'padding', PHONE)).toBe('10px 18px');
    expect(value('.overlay h2', 'font-size', PHONE)).toBe('28px');
    // the desktop pause is as it was: one column
    expect(value('.overlay .list', 'flex-direction')).toBe('column');
    expect(value('.pause .list', 'display')).toBe('');
  });

  it('Settings drawn again after a change does not pop in again (seam review)', () => {
    expect(value('.overlay .box', 'animation')).toMatch(/pop-in/);
    expect(value('.overlay .box.redraw', 'animation')).toBe('none');
  });
});
