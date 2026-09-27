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

  it('the Paint and Body rows stay side by side on one row, and every stage keeps a small margin inside the notch (select.css sets the racers in one row: its own tests)', () => {
    expect(value('.garage', 'flex-wrap', PHONE)).toBe('nowrap');
    // the sides keep a small margin inside the notch's inset, not 48 px on top of it
    expect(value('.stage', 'padding', PHONE)).toContain('calc(20px + var(--safe-l))');
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

  it('the dialogs are the setup\'s glass, not cream cards (design §12, 26 Sept 2026): white words, the focus the one ring, the rows\' old ink drop gone', () => {
    expect(value('.overlay .box', 'color')).toBe('rgb(255, 255, 255)');
    expect(value('.overlay .box', 'border-radius')).toBe('26px');
    expect(value('.overlay .btn.focused', 'box-shadow')).toMatch(/var\(--sun\)/);
    expect(value('.overlay .btn.focused', 'color')).toBe('var(--sun)');
    expect(value('.setting', 'box-shadow')).toBe('');
    // the earned unlock stays in the sun, its words in ink
    expect([value('.unlock.on', 'background'), value('.unlock.on', 'color')]).toEqual(['var(--sun)', 'var(--ink)']);
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
});

describe('menu icons and the Settings help line (sweep 25 Sept 2026)', () => {
  it('icons are sized by their box, never by their attributes', () => {
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

  it('a laptop window (1280x720, 1366x657): the Paint row drops its hints (the title fits: menus.css, its own tests)', () => {
    const LAPTOP = '(max-height: 800px)';
    expect(value('.pick-hint', 'display', LAPTOP)).toBe('none');
  });

  it('on a phone on its side the odd last button of the pause (Quit without Restart) sits centred under the others', () => {
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

  it('has no box behind the map, and the gears sit in a pill that glows teal at the cap (gears, not coins: 26 Sept 2026)', () => {
    expect(value('.minimap', 'background')).toBe('');
    expect(value('.minimap', 'border')).toBe('');
    expect(value('.gears', 'border-radius')).toBe('999px');
    expect(value('.gears', 'background')).not.toBe('');
    expect(value('.gears.full', 'box-shadow')).toMatch(/var\(--teal\)/);
    // smaller in a narrow window with keys (the controls strip reached its glow at 880 px); a phone has no strip
    expect(value('.gears', 'font-size', '(max-width: 900px) and (pointer: fine)')).toBe('28px');
    expect(value('.gears', 'font-size', '(max-width: 900px)')).toBe('');
    expect(value('.gears .gear', 'width', '(max-width: 900px) and (pointer: fine)')).toBe('27px');
    // no gold coin left in the stylesheet
    expect(value('.coins', 'border-radius')).toBe('');
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

describe('the finish and the end screens (25 Sept 2026)', () => {
  it('a racer\'s face in every results-type row: the portrait cropped to the head, ringed in their color, smaller where the rows are', () => {
    expect(value('.face-ic', 'border-radius')).toBe('50%');
    expect(value('.face-ic', 'border')).toContain('var(--accent');
    expect(value('.face-ic', 'background')).toMatch(/var\(--portrait\) var\(--crop/);
    // ~36 px at 1600x900, the column the face sits in
    expect(value('.row', '--face')).toBe('36px');
    expect(value('.row', 'grid-template-columns')).toBe('56px var(--face) 1fr auto auto');
    expect(value('.row', '--face', '(max-height: 800px)')).toBe('30px');
    expect(value('.row', '--face', PHONE)).toBe('26px');
    expect(value('.row', 'grid-template-columns', PHONE)).toBe('34px var(--face) minmax(0, 1fr) auto auto');
    // a narrow window: the panel takes the width, the gap to the winner goes, a long name gives way (at 390x844 all were one letter)
    const NARROW = '(max-width: 600px)';
    expect(value('.row', 'grid-template-columns', NARROW)).toContain('minmax(0, 1fr)');
    expect(value('.row .nm', 'text-overflow', NARROW)).toBe('ellipsis');
    expect(value('.rows:not(.standings) .row .gp', 'display', NARROW)).toBe('none');
    expect(value('.results .stage', 'padding-left', NARROW)).toContain('12px');
    expect(value('.board-row', 'grid-template-columns')).toBe('48px var(--face) 1fr auto auto');
  });

  it('the finish: the place beside FINISH! on a pill, and the prompt on a pill at the foot of the screen', () => {
    expect(value(".banner[data-kind='finish'] .small", 'display')).toBe('inline-block');
    expect(value(".banner[data-kind='finish'] .small", 'background')).toMatch(/27,? 27,? 47/);
    expect(value(".banner[data-kind='finish'] .small:empty", 'display')).toBe('none');
    expect(value('.finish-go', 'position')).toBe('absolute');
    expect(value('.finish-go', 'bottom')).toContain('var(--safe-b)');
    expect(value('.finish-go', 'background')).toMatch(/27,? 27,? 47/);
    expect(value('.finish-go.on', 'display')).toBe('block');
    expect(value('.finish-go', 'bottom', PHONE)).toContain('12px');
    // a narrow window: above the big place in the corner (it sat on it)
    expect(value('.finish-go', 'bottom', '(max-width: 600px)')).toContain('128px');
  });

  it('the standings: the tokens are the UI\'s, the totals count and the changing rows turn over only when it plays', () => {
    let root: CSSStyleDeclaration | null = null;
    for (const r of rules()) if (r instanceof CSSStyleRule && r.selectorText === ':root') root = r.style;
    expect(root?.getPropertyValue('--t-count').trim()).toBe(`${UI.countUpMs}ms`);
    expect(root?.getPropertyValue('--t-flip').trim()).toBe(`${UI.flipMs}ms`);
    // the number is a registered integer, so it counts as it animates (jsdom drops @property: read the text)
    expect(css).toMatch(/@property --pts \{ syntax: '<integer>'; inherits: false; initial-value: 0; \}/);
    expect(css).toMatch(/\.pts \.n \{ counter-reset: pts var\(--pts\); \}\n\.pts \.n::before \{ content: counter\(pts\); \}/);
    expect(value('.standings.play .n.count', 'animation')).toMatch(/count-up var\(--t-count\).*var\(--count-at\) backwards/);
    // the flip is listed before the row's slide in (which wins while it runs) and holds nothing after
    expect(value('.standings.play .row.flip', 'animation')).toMatch(/^row-flip .*var\(--flip-at\) backwards, slide-in /);
    expect(keyframes('row-flip').map((k) => (k === 'from' ? '0%' : k === 'to' ? '100%' : k))).toEqual(['0%', '50%', '50.1%', '100%']);
    expect(value('.standings .was', 'opacity')).toBe('0');
    expect(value('.standings.play .row.flip > .was', 'animation')).toMatch(/was-on .*var\(--flip-at\) backwards/);
  });
});

describe('the finish celebration keeps clear of the kart (podium.css, 25 Sept 2026)', () => {
  let pcss = '';
  beforeAll(async () => {
    const fs = (await import('node:fs' as string)) as { readFileSync(p: string, enc: 'utf8'): string };
    pcss = fs.readFileSync(decodeURIComponent(import.meta.url.replace(/^file:\/\//, '').replace(/[^/]+$/, 'podium.css')), 'utf8');
  });
  /** `selector`'s `prop` in podium.css, top level or in the @media `media` */
  const pvalue = (selector: string, prop: string, media?: string) => {
    const saved = css;
    css = pcss;
    try { return value(selector, prop, media); } finally { css = saved; }
  };

  it('FINISH! and its place rise under the timer; the scale is a variable, so FINISH! keeps it as it leaves for the results', () => {
    expect(pvalue('#ui .hud.celebrate .banner', 'top')).toBe('12%');
    expect(pvalue('#ui .hud.celebrate .banner', 'transform')).toBe('scale(var(--banner-scale))');
    // a laptop window (1366x657): a little smaller and higher, clear of the hat; the Knockout strip steps aside
    expect(pvalue('#ui .hud.celebrate .banner', '--banner-scale', '(max-height: 700px)')).toBe('0.48');
    expect(pcss).toMatch(/#ui \.hud\.celebrate :is\([^)]*\.ko-strip\) \{ opacity: 0;/);
    expect(css).toMatch(/@keyframes x-rise-out \{[^\n]*scale\(calc\(var\(--banner-scale, 1\)/);
  });

  it('under a solo run\'s lap splits, and on a phone on its side, the timer steps aside to the top left and FINISH! takes the top', () => {
    expect(pvalue('#ui .hud.solo.celebrate .tc', 'left')).toContain('24px');
    expect(pvalue('#ui .hud.solo.celebrate .tc', 'transform')).toBe('none');
    expect(pvalue('#ui .hud.solo.celebrate .banner', 'top')).toContain('16px');
    expect(pvalue('#ui .hud.celebrate .tc', 'transform', PHONE)).toBe('none');
    expect(pvalue('#ui .hud.celebrate .banner', 'top', PHONE)).toContain('8px');
    // a Time Trial's medal sits beside FINISH! there, not under it on the racer's goggles
    expect(pvalue('#ui .hud.celebrate .banner .medal-won.on', 'display', PHONE)).toBe('inline-flex');
  });

  it('the results beside the racer (Mario Kart World, 26 Sept 2026): a wide window sets the panel at the right edge and dims only behind it', () => {
    expect(value('.results.beside .stage', 'align-items', UI.besideQuery)).toBe('flex-end');
    expect(value('.results.beside .dim', 'background', UI.besideQuery)).toMatch(/^linear-gradient\(90deg, rgba\(27, 27, 47, 0\) 32%/);
    // narrower windows (a tablet, a phone) keep the panel in the middle, dimmed all round, as before
    expect(value('.results .stage', 'align-items')).toBe('center');
    expect(value('.results.beside .stage', 'align-items')).toBe('');
  });
});

describe('the end buttons, the lap pop and the Knockout goal (25 Sept 2026)', () => {
  it('in a short window (UI.endOneLineQuery: 1366x657, a phone on its side) the end buttons sit in one line, as their focus grid does', () => {
    const q = UI.endOneLineQuery;
    expect(value('.results .actions', 'flex-direction', q)).toBe('row');
    expect(value('.results .act-row', 'display', q)).toBe('contents');
    // elsewhere row by row, the main row first
    expect(value('.results .actions', 'flex-direction')).toBe('column');
    expect(value('.results .act-row', 'display')).toBe('flex');
  });

  it('on a phone on its side a lap pops alone and at its own size, clear of FINAL LAP; the Knockout goal sits under the place', () => {
    expect(value('.splits:has(.pop) .split:not(.pop)', 'display', PHONE)).toBe('none');
    expect(value('.split.pop', 'transform', PHONE)).toBe('none');
    expect(value('.split.pop', 'transform')).toMatch(/^scale\(1\.\d+\)$/);
    expect(value('.hud .bl', 'flex-direction')).toBe('column');
    expect(value('.ko-strip.danger', 'animation')).toContain('pulse');
  });

  it('the Knockout cut: a dashed coral line labeled CUT under the last one through', () => {
    expect(value('.rows.cut .row.cut-above::after', 'border-top')).toBe('4px dashed var(--coral)');
    expect(css).toMatch(/\.rows\.cut \.row\.cut-above::before \{[^}]*content: 'CUT';/);
  });
});

describe('the race\'s big moments and the end screens at the menus\' quality (27 Sept 2026)', () => {
  /** the keyframes `name` animates only these properties (a timing function per step is no property) */
  const moves = (name: string, allowed: readonly string[]) => {
    for (const r of rules()) {
      if (!(r instanceof CSSKeyframesRule) || r.name !== name) continue;
      for (const k of r.cssRules) {
        const st = (k as CSSKeyframeRule).style;
        for (let i = 0; i < st.length; i++) if (st[i] !== 'animation-timing-function') expect(allowed, `${name} ${st[i]}`).toContain(st[i]);
      }
      return;
    }
    throw new Error(`no keyframes ${name}`);
  };

  it('the banners are struck letters: an ink outline and a face cut to each glyph from its data-ch, over its deep side', () => {
    expect(value('.ch::before', 'content')).toMatch(/attr\(data-ch\)/);
    expect(value('.ch::after', 'background')).toBe('var(--face)');
    expect(value('.ch', 'transform')).toBe('skewX(-9deg)');
    expect(value('.banner .big', '--face')).toMatch(/linear-gradient/);
    for (const kind of ['go', 'finalLap', 'wrongWay']) expect(value(`.banner[data-kind='${kind}'] .big`, '--face'), kind).toMatch(/linear-gradient/);
    // the count and GO! bigger than the rest, under the start lamps, and still below the gantry's own (24 Sept)
    expect(value(".banner[data-kind='countdown']", 'top')).toBe('30%');
    expect(value(".banner[data-kind='countdown'] .big", 'font-size')).toMatch(/236px/);
  });

  it('they drop in one after another and land with a squash and a stretch; the words going squash and stretch away; transforms and opacity only', () => {
    expect(value('.banner.show .ch', 'animation')).toMatch(/^ch-drop .*backwards/);
    expect(value('.banner.show .ch', 'animation-delay')).toContain('var(--i)');
    expect(value(".banner[data-kind='countdown'].show .ch", 'animation-name')).toBe('ch-slam');
    expect(value('.banner.ghost.out .ch', 'animation')).toMatch(/^ch-out /);
    for (const k of ['ch-drop', 'ch-slam', 'ch-out', 'sash-in']) moves(k, ['opacity', 'transform']);
    // the words going sit under the ones coming, and show only while they leave (a screen's exit cannot bring them back)
    expect([value('.banner', 'z-index'), value('.banner.ghost', 'z-index'), value('.banner.ghost .ch', 'opacity')]).toEqual(['1', '0', '0']);
    // reduced motion: no stagger either, all at once
    expect(value(":root[data-reduced-motion='on'] .ch", 'animation-delay')).toBe('0ms');
    // FINISH! lands before it rises out of the way of the celebration (podium.css)
    expect(value(".banner[data-kind='finish'] .chs::before", 'background')).toMatch(/repeating-conic-gradient/);
  });

  it('the start lamps: held near the camera under the timer, hidden until the count, lit red then green, hauled away after', () => {
    expect(value('.lamps', 'visibility')).toBe('hidden');
    expect(value('.lamps.on', 'visibility')).toBe('visible');
    expect(value('.lamps', 'top')).toContain('var(--safe-t)');
    expect(css).toMatch(/\.lamps\[data-lit='2'\] \.lamp:nth-child\(-n \+ 2\)/);
    expect(value(".lamps[data-lit='go'] .lamp", 'background')).toMatch(/radial-gradient/);
    expect(value('.lamps.leaving', 'animation')).toMatch(/^lamps-up /);
    moves('lamps-drop', ['transform']);
    moves('lamps-sway', ['transform']);
    moves('lamps-up', ['transform', 'visibility']);
    moves('lamp-on', ['transform', 'filter']);
    // the HUD's own layers (the lamps, the banners over their ghost, the timer over the cables) stay inside it: the pause
    // over the countdown is on top of them all
    expect(value('#ui .hud', 'isolation')).toBe('isolate');
    expect([value('.lamps', 'z-index'), value('.hud .tc', 'z-index')]).toEqual(['1', '2']);
  });

  it('the end screens: no paper card, glass rows, the player\'s in the sun and inked, the buttons glass with the one focus ring', () => {
    expect(value('.results .box', 'background')).toBe('');
    expect(value('.row', 'background')).toMatch(/linear-gradient/);
    expect(value('.row', 'background')).not.toMatch(/rgb\(255, 255, 255\)|var\(--paper\)/);
    expect(value('.row', 'border')).toBe('3px solid transparent');
    expect(value('.row.me', 'border-color')).toBe('var(--ink)');
    expect(value('.row.me', 'animation')).toMatch(/^slide-in .*backwards, me-sheen /);
    expect(css).toMatch(/:is\(\.results, \.podium\) \.btn\.focused, :is\(\.results, \.podium\) \.btn:focus-visible \{[^}]*var\(--sun\)/);
    // the headline on the menus' ribbon, in the finish's color
    for (const tone of ['gold', 'good', 'out']) expect(value(`.res-head[data-tone='${tone}']`, '--ribbon'), tone).not.toBe('');
    // the standings' old holder is opaque: the row under it must not show through before it turns over
    expect(value('.standings .was', 'background')).toMatch(/rgb\(35, 42, 100\)/);
  });
});

describe('the Racer and Kart screens (select.css; design §12, 26 Sept 2026: as Mario Kart World\'s select screens)', () => {
  let kcss = '';
  beforeAll(async () => {
    const fs = (await import('node:fs' as string)) as { readFileSync(p: string, enc: 'utf8'): string };
    kcss = fs.readFileSync(decodeURIComponent(import.meta.url.replace(/^file:\/\//, '').replace(/[^/]+$/, 'select.css')), 'utf8');
  });
  /** `selector`'s `prop` in select.css, top level or in the @media `media` */
  const kvalue = (selector: string, prop: string, media?: string) => {
    const saved = css;
    css = kcss;
    try { return value(selector, prop, media); } finally { css = saved; }
  };
  const COMPACT = UI.selectCompactQuery;
  const LAPTOP = '(max-height: 800px)';

  it('the tiles on the left (racers four across, karts three), the hero\'s room on the right; a small screen: the hero goes, the karts five across, the stats a strip under the tiles', () => {
    expect(kvalue('.select-body', 'grid-template-columns')).toBe('minmax(0, 1.24fr) minmax(0, 1fr)');
    expect(kvalue('.roster.select-grid', 'grid-template-columns')).toBe('repeat(4, minmax(0, 1fr))');
    expect(kvalue('.kart-grid.select-grid', 'grid-template-columns')).toBe('repeat(3, minmax(0, 1fr))');
    expect(kvalue('.kart-grid.cols-5', 'grid-template-columns')).toBe('repeat(5, minmax(0, 1fr))');
    // sized by the room's height too, so the rows always fit it
    expect(kvalue('.roster.select-grid', 'width')).toMatch(/cqh/);
    expect(kvalue('.select-body', 'container-type')).toBe('size');
    expect(kvalue('.hero-box', 'flex')).toBe('1 1 auto');
    expect(kvalue('.select-body', 'grid-template-columns', COMPACT)).toBe('minmax(0, 1fr)');
    expect(kvalue('.hero-box', 'display', COMPACT)).toBe('none');
    expect(kvalue('.select-side .stat-panel', 'grid-template-columns', COMPACT)).toBe('repeat(4, minmax(0, 1fr))');
    expect(kvalue('.select-side .stat-panel', 'position', COMPACT)).toBe('static');
    expect(kvalue('.kart-who', 'display', COMPACT)).toBe('inline-flex');
  });

  it('nothing on a tile but its picture; the stats hidden until asked for, then over the hero, which steps back to make room', () => {
    expect(kvalue('.stat-panel[hidden]', 'display')).toBe('none');
    expect(kvalue('.select-side .stat-panel', 'position')).toBe('absolute');
    expect(kvalue('.select-side.stats-on .hero-box', 'transform')).toMatch(/scale/);
    expect(kvalue('.hero-box', 'transition')).toBe('transform var(--t-med) var(--out)');
    expect(kvalue('.racer-tile', 'aspect-ratio')).toBe('4 / 5');
    expect(kvalue('.tile-art', 'object-fit')).toBe('cover');
    expect(kvalue('.kc-art img.art', 'object-fit')).toBe('contain');
    // the drawing under the picture only until the picture loads
    expect(kvalue('.kc-art:has(> img.art) > .kart-svg', 'display')).toBe('none');
    // a locked twin: a dark shape
    expect(kvalue('.kart-tile.locked .kc-art img.art', 'filter')).toMatch(/brightness\(0\)/);
  });

  it('focus: a white and sun ring, a glow and a lift (less in a laptop window, where the ring must clear the heading); a sheen sweeps the glass once', () => {
    expect(kvalue('.tile.focused', 'transform')).toBe('translateY(-6px) scale(1.06)');
    expect(kvalue('.tile.focused', 'box-shadow')).toMatch(/var\(--sun\)/);
    expect(kvalue('.tile.focused', 'transform', LAPTOP)).toBe('translateY(-3px) scale(1.05)');
    expect(kvalue('.tile.focused::before', 'animation')).toMatch(/^tile-sheen /);
  });

  it('a phone on its side: the racers in one row, the karts two rows of five, the name beside its line, the strip thin; the prompts stay on a touch screen, as buttons', () => {
    expect(kvalue('.roster.select-grid', 'grid-template-columns', PHONE)).toBe('repeat(8, minmax(0, 1fr))');
    expect(kvalue('.roster.select-grid', 'grid-template-columns', '(max-width: 720px) and (min-height: 501px)')).toBe('repeat(2, minmax(0, 1fr))');
    expect(kvalue('.nameplate', 'flex-direction', PHONE)).toBe('row');
    expect(kvalue('.sp-track', 'height', PHONE)).toBe('8px');
    expect(kvalue('.select-stage .prompts', 'display', '(pointer: coarse)')).toBe('flex');
    expect(kvalue('.prompts .prompt:not(.prompt-btn)', 'display', '(pointer: coarse)')).toBe('none');
  });

  it('the bars move by scaleX alone, on the UI\'s timings, and at once with reduced motion (no stagger either)', () => {
    expect(kvalue('.sp-track > i', 'transform')).toBe('scaleX(var(--x, 0))');
    expect(kvalue('.sp-track > i', 'transition')).toBe('transform var(--t-bar) var(--out) calc(var(--i, 0) * var(--t-bar-stagger)), opacity var(--t-ghost) ease');
    expect(kvalue(':root', '--t-bar')).toBe(`${UI.statBarMs}ms`);
    expect(kvalue(':root', '--t-bar-stagger')).toBe(`${UI.statStaggerMs}ms`);
    expect(kvalue(':root', '--t-ghost')).toBe(`${UI.statGhostMs}ms`);
    expect(kvalue(':root', '--t-lock-in')).toBe(`${UI.lockInMs}ms`);
    expect(kvalue(":root[data-reduced-motion='on'] .sp-track > i", 'transition-delay')).toBe('0ms');
    // a gain's light extension and a loss's hatching show only with a ghost; the bar in five segments
    expect(kvalue('.sp-gain', 'opacity')).toBe('0');
    expect(kvalue(".sp-row[data-ghost='gain'] .sp-gain", 'opacity')).toBe('1');
    expect(kvalue('.sp-loss', 'background')).toMatch(/repeating-linear-gradient/);
    // (jsdom's parser drops a gradient with a calc in it: read the rule's text)
    expect(kcss).toMatch(/\.sp-track::after \{[^}]*repeating-linear-gradient\(90deg, transparent 0 calc\(20% - 3px\)/);
  });

  it('its animations move only transforms and opacity', () => {
    document.head.innerHTML = '';
    const s = document.createElement('style');
    s.textContent = kcss;
    document.head.appendChild(s);
    const names: string[] = [];
    for (const r of s.sheet!.cssRules) {
      if (!(r instanceof CSSKeyframesRule)) continue;
      names.push(r.name);
      for (const k of r.cssRules) {
        const style = (k as CSSKeyframeRule).style;
        for (let i = 0; i < style.length; i++) expect(['opacity', 'transform'], `${r.name} ${style[i]}`).toContain(style[i]);
      }
    }
    expect(names.sort()).toEqual(['lock-pulse', 'np-flash', 'np-swap', 'refuse-shake', 'stats-in', 'tile-sheen']);
  });
});

describe('the title, Mode, Cup and Track screens (menus.css; design §12, 26 Sept 2026: as Mario Kart World\'s own menus)', () => {
  let mcss = '';
  beforeAll(async () => {
    const fs = (await import('node:fs' as string)) as { readFileSync(p: string, enc: 'utf8'): string };
    mcss = fs.readFileSync(decodeURIComponent(import.meta.url.replace(/^file:\/\//, '').replace(/[^/]+$/, 'menus.css')), 'utf8');
  });
  /** `selector`'s `prop` in menus.css, top level or in the @media `media` */
  const mvalue = (selector: string, prop: string, media?: string) => {
    const saved = css;
    css = mcss;
    try { return value(selector, prop, media); } finally { css = saved; }
  };
  const LAPTOP = '(max-height: 800px)';

  it('the title: the bands one under another down the left, the logo sized by the height too on a laptop and a phone (on one line there), never spilling off the top', () => {
    expect(mvalue('.title .stage', 'align-items')).toBe('flex-start');
    // on any screen a title taller than the window starts at the top (sweep: at 1366x657 plain centre cut the logo's top off)
    expect(mvalue('.title .stage', 'justify-content')).toBe('safe center');
    expect(mvalue('.title .menu', 'flex-direction')).toBe('column');
    for (const m of [LAPTOP, PHONE]) {
      expect(mvalue('.logo .l1', 'font-size', m), m).toMatch(/vh/);
      expect(mvalue('.logo .l2', 'font-size', m), m).toMatch(/vh/);
    }
    expect(mvalue('.logo .l2', 'display', PHONE)).toBe('inline-block');
    expect(mvalue('.title .menu', '--band-h', PHONE)).toBe('42px');
    // the prompt shows the keys or the pad's: it never sets its own display over .only-keys and .only-pad
    expect(mvalue('.title .press', 'display')).toBe('');
  });

  it('a band: slanted glass, its emblem on a disc sized by the band (the icons by their box, never their attributes), the focus a ring, a glow, a slide and a sheen', () => {
    expect(mvalue('.band > .glass', 'transform')).toMatch(/^skewX\(-\d+deg\)$/);
    expect(mvalue('.band > .icon', 'width')).toBe('calc(var(--band-h, 64px) + 8px)');
    expect(mvalue('.band > .icon svg', 'width')).toBe('70%');
    expect(mvalue('.cup-tile .emblem svg', 'width')).toBe('100%');
    expect(mvalue('.band.focused > .glass', 'box-shadow')).toMatch(/var\(--sun\)/);
    expect(mvalue('.band.focused', 'transform')).toMatch(/translateX/);
    expect(mvalue('.band.focused > .glass::after', 'animation')).toMatch(/^band-sheen /);
    // each mode's own line is for assistive tech; the eyes read the focused one's at the foot
    expect([mvalue('.band > .sub', 'position'), mvalue('.band > .sub', 'width')]).toEqual(['absolute', '1px']);
    expect(mvalue('.modes.bands', '--band-h', PHONE)).toBe('42px');
  });

  it('the Mode screen keeps its hero beside the bands on a phone on its side; a narrow window gives the bands the width', () => {
    expect(mvalue('.menu-side .hero-box', 'display')).toBe('block');
    expect(mvalue('.menu-side .hero-box', 'display', '(max-width: 720px) and (min-height: 501px)')).toBe('none');
  });

  it('the pictures: big, sized to the room (its height too), a wider cut on a phone on its side with the names on them', () => {
    expect(mvalue('.cup-show', 'container-type')).toBe('size');
    expect(mvalue('.track-groups', 'container-type')).toBe('size');
    expect(mvalue('.cup-preview .shots', 'grid-template-columns')).toBe('repeat(3, minmax(0, 1fr))');
    expect(mvalue('.track-cards', 'grid-template-columns')).toBe('repeat(3, minmax(0, 1fr))');
    expect(mvalue('.frame', 'aspect-ratio')).toBe('16 / 9');
    expect(mvalue('.frame', 'aspect-ratio', PHONE)).toBe('2 / 1');
    expect(mvalue('.track-card .words', 'position', PHONE)).toBe('absolute');
    expect(mvalue('.cup-preview[hidden]', 'display')).toBe('none');
    expect(mvalue('.track-card.focused > .frame', 'box-shadow')).toMatch(/var\(--sun\)/);
  });

  it('the class row: glass pills, the class chosen in the sun, the focus the ring', () => {
    expect(mvalue('.classes', 'display')).toBe('flex');
    expect(mvalue('.classes .pill[aria-pressed=\'true\']', 'color')).toBe('var(--ink)');
    expect(mvalue('.classes .pill.focused', 'box-shadow')).toMatch(/var\(--sun\)/);
  });

  it('its animations move only transforms and opacity', () => {
    document.head.innerHTML = '';
    const st = document.createElement('style');
    st.textContent = mcss;
    document.head.appendChild(st);
    const names: string[] = [];
    for (const r of st.sheet!.cssRules) {
      if (!(r instanceof CSSKeyframesRule)) continue;
      names.push(r.name);
      for (const k of r.cssRules) {
        const style = (k as CSSKeyframeRule).style;
        for (let i = 0; i < style.length; i++) expect(['opacity', 'transform'], `${r.name} ${style[i]}`).toContain(style[i]);
      }
    }
    expect(names.sort()).toEqual(['band-sheen', 'medal-stick', 'say-in', 'shot-in']);
  });
});
