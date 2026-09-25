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

  it('the roster sets all eight racers in one row, class, portrait and name only, so Paint, Body and the 50/100/150cc row fit (852x344 needed a 147 px scroll)', () => {
    expect(value('.roster', 'grid-template-columns', '(max-width: 900px)')).toBe('repeat(2, minmax(0, 1fr))');
    expect(value('.roster', 'grid-template-columns', PHONE)).toBe('repeat(8, minmax(0, 1fr))');
    expect(value('.garage', 'flex-wrap', PHONE)).toBe('nowrap');
    // the sides keep a small margin inside the notch's inset, not 48 px on top of it
    expect(value('.stage', 'padding', PHONE)).toContain('calc(20px + var(--safe-l))');
    expect(value('.card .stats', 'display', PHONE)).toBe('none');
    expect(value('.card .who', 'display', PHONE)).toBe('none');
  });

  it('the title sizes its name by the height too, sets the four buttons two by two, and never spills off the top', () => {
    expect(value('.logo .l1', 'font-size', PHONE)).toMatch(/vh/);
    expect(value('.logo .l2', 'font-size', PHONE)).toMatch(/vh/);
    expect(value('.title .menu', 'grid-template-columns', PHONE)).toBe('1fr 1fr');
    expect(value('.title .stage', 'justify-content', PHONE)).toBe('safe center');
    // on any screen a title taller than the window starts at the top (sweep: at 1366x657 plain centre cut the logo's top off)
    expect(value('.title .stage', 'justify-content')).toBe('safe center');
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

  it('Settings\' help line sits beside Done there, so the rows keep their room (sweep 25 Sept 2026)', () => {
    expect(value('.settings .box.dialog > .foot', 'flex-direction', PHONE)).toBe('row');
    expect(value('.settings .help', 'flex', PHONE)).toMatch(/^1/);
    // over Done on a bigger screen
    expect(value('.settings .box.dialog > .foot', 'flex-direction')).toBe('column');
  });

  it('the mode icons shrink with the cards (sweep 25 Sept 2026)', () => {
    expect(value('.modes .btn .icon', 'width')).toBe('44px');
    expect(value('.modes .btn .icon', 'width', PHONE)).toBe('30px');
  });
});

describe('menu icons and the Settings help line (sweep 25 Sept 2026)', () => {
  it('icons are sized by their box, never by their attributes', () => {
    expect(value('.modes .btn .icon svg', 'width')).toBe('100%');
    expect(value('.unlock .mark svg', 'width')).toBe('100%');
    expect(value('.opt .lock svg', 'width')).toBe('100%');
    expect(value('.arrow-svg', 'width')).toMatch(/em$/);
  });

  it('a locked swatch is grayed but its padlock is not (it sits beside the swatch)', () => {
    expect(value('.opt.locked .sw', 'filter')).toMatch(/grayscale/);
    expect(value('.opt.locked', 'opacity')).toBe('');
    expect(value('.opt .sw-box', 'position')).toBe('relative');
  });

  it('the help line never widens the panel and keeps two lines\' room, so Done holds still as it changes', () => {
    expect(value('.settings .help', 'width')).toBe('0px');
    expect(value('.settings .help', 'min-width')).toBe('100%');
    expect(value('.settings .help', 'min-height')).toBe('2.7em');
    // its new line comes in on the tokens reduced motion cuts to 1 ms; a line kept after a change does not
    expect(value('.settings .help > span', 'animation')).toMatch(/help-in var\(--t-med\)/);
    expect(value('.settings .help > .still', 'animation')).toBe('none');
  });
});

/** A @keyframes rule's keys ('from' or '0%', …). */
function keyframes(name: string): string[] {
  for (const r of rules()) if (r instanceof CSSKeyframesRule && r.name === name) return [...r.cssRules].map((k) => (k as CSSKeyframeRule).keyText);
  return [];
}

describe('sweep of every screen (24 Sept 2026)', () => {
  it('the enter animations end on the element\'s own style, so nothing stays pinned flat after them', () => {
    // a `to { transform: none; opacity: 1 }` held by fill `both` killed the focus lift and the press on every
    // popped-in card and button, the player's results row scale, and the dimming of dnf and knocked-out rows
    for (const name of ['pop-in', 'slide-in']) {
      const keys = keyframes(name);
      expect(keys.length, name).toBe(1);
      expect(keys[0], name).toMatch(/^(from|0%)$/);
    }
    for (const [sel, name] of [['.screen.on .enter', 'pop-in'], ['.row', 'slide-in'], ['.overlay .box', 'pop-in'], ['.stars .star.on', 'pop-in']]) {
      expect(value(sel, 'animation'), sel).toMatch(new RegExp(`${name}.*backwards`));
    }
    expect(value('.row.out', 'opacity')).toBe('0.55');
    expect(value('.btn.focused', 'transform')).toMatch(/scale/);
  });

  it('a dialog keeps its own button (Back, Done) in a foot under the content that scrolls', () => {
    expect(value('.overlay .box.dialog', 'overflow')).toBe('hidden');
    expect(value('.overlay .box.dialog', 'flex-direction')).toBe('column');
    expect(value('.overlay .box.dialog > .scroll', 'overflow')).toBe('hidden auto');
    expect(value('.overlay .box.dialog > .foot', 'flex')).toMatch(/^(none|0 0 auto)$/); // never squeezed out by the content
  });

  it('a dialog over the title or a menu hides the screen under it (the logo peeked round Settings)', () => {
    // (not a screen on its way out: it fades on its own, and a ghost of one is inert from the start)
    expect(value('#ui .screen[inert]:not(.x-out) > .stage', 'opacity')).toBe('0');
  });

  it('a laptop window (1280x720, 1366x657) fits the title and the racer screen down to the class row', () => {
    const LAPTOP = '(max-height: 800px)';
    expect(value('.logo .l1', 'font-size', LAPTOP)).toMatch(/vh/);
    expect(value('.logo .l2', 'font-size', LAPTOP)).toMatch(/vh/);
    expect(value('.card .who', 'display', LAPTOP)).toBe('none');
    expect(value('.pick-hint', 'display', LAPTOP)).toBe('none');
    expect(value('.card .face.has-portrait', 'width', LAPTOP)).toBe('60px');
  });

  it('on a phone on its side the odd last button (Credits, or Quit without Restart) sits centred under the others', () => {
    expect(value('.title .menu .btn:last-child:nth-child(odd)', 'grid-column', PHONE)).toBe('1 / -1');
    expect(value('.pause .list .btn:last-child:nth-child(odd)', 'grid-column', PHONE)).toBe('1 / -1');
  });

  it('on a phone the race HUD keeps its touch layout under the pause (the thumbs hide there; the map and place jumped back)', () => {
    const COARSE = '(pointer: coarse)';
    expect(value(':root .minimap', 'width', COARSE)).toBe('128px');
    expect(value(':root .hud .br', 'top', COARSE)).toMatch(/14px/);
    expect(value(':root .keys-hint', 'display', COARSE)).toBe('none');
  });

  it('the prompts show the keys, or a gamepad\'s buttons once one is pressed', () => {
    expect(value('.only-pad', 'display')).toBe('none');
    expect(value(":root[data-input='pad'] .only-keys", 'display')).toBe('none');
    expect(value(":root[data-input='pad'] .only-pad", 'display')).toBe('revert');
  });

  it('in a race on a touch screen the prompts name a tap (the finish prompt), whatever was pressed before', () => {
    expect(value('.only-touch', 'display')).toBe('none');
    expect(value(":root[data-touch='on'] .only-touch", 'display')).toBe('revert');
    expect(value(":root[data-touch='on'] .only-keys", 'display')).toBe('none');
    expect(value(":root[data-touch='on'] .only-pad", 'display')).toBe('none');
  });

  it('a solo run shows no place numeral, in the race or in its results; the count and GO! sit below the start lights', () => {
    expect(value('.hud.solo .place', 'display')).toBe('none');
    expect(value('.rows .row:only-child .rk', 'display')).toBe('none');
    expect(value(".banner[data-kind='countdown']", 'top')).toBe('30%');
  });
});

describe('the race HUD beside real MKW footage (25 Sept 2026)', () => {
  it('colors the place numeral by place: gold, silver and bronze bring their own face, side and suffix; 4th to 8th keep the yellow-orange', () => {
    for (const tier of ['gold', 'silver', 'bronze']) {
      for (const prop of ['--face', '--side', '--suf']) expect(value(`.place[data-tier='${tier}']`, prop), `${tier} ${prop}`).not.toBe('');
    }
    expect(value('.place', '--face')).toMatch(/linear-gradient/);
    // the outline and face layers repeat the numeral from data-n, with '' for screen readers
    expect(value('.place .n::after', 'content')).toMatch(/attr\(data-n\)/);
    // the color change rides the rank-change flourish (its flash)
    expect(value('.place.flourish', 'animation')).toMatch(/flourish/);
  });

  it('has no box behind the map, and the coins sit in a pill that glows at the cap', () => {
    expect(value('.minimap', 'background')).toBe('');
    expect(value('.minimap', 'border')).toBe('');
    expect(value('.coins', 'border-radius')).toBe('999px');
    expect(value('.coins', 'background')).not.toBe('');
    expect(value('.coins.full', 'box-shadow')).toMatch(/var\(--sun\)/);
    // smaller in a narrow window with keys (the controls strip reached its glow at 880 px); a phone has no strip
    expect(value('.coins', 'font-size', '(max-width: 900px) and (pointer: fine)')).toBe('28px');
    expect(value('.coins', 'font-size', '(max-width: 900px)')).toBe('');
  });
});

describe('results on a phone on its side (sweep 24 Sept 2026)', () => {
  it('all eight rows in sight: more than four sit in two columns, 1st to 4th then 5th to 8th, the headline and the track share a line', () => {
    // at 852x344 with the notch rows 5 to 8, the player's among them, needed a scroll
    expect(value('.rows.many', 'display', PHONE)).toBe('grid');
    expect(value('.rows.many', 'grid-template-columns', PHONE)).toBe('repeat(2, minmax(0, 1fr))');
    expect(value('.rows.many', 'grid-auto-flow', PHONE)).toBe('column');
    expect(value('.rows.many', 'grid-template-rows', PHONE)).toBe('repeat(var(--half, 4), auto)');
    expect(value('.res-words', 'display', PHONE)).toBe('flex');
    // the desktop list is as it was: one column
    expect(value('.rows', 'flex-direction')).toBe('column');
    expect(value('.rows.many', 'display')).toBe('');
  });
});
