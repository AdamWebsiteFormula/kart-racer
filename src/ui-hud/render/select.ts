// The Racer and Kart screens' shared frame (design §12, 26 Sept 2026, Adam: "imitate Mario Kart World as
// much as possible"), taken from Mario Kart World's own character and vehicle select (stills:
// youtube.com/watch?v=PI0dNuQNq5k, B9sACzOphLc, _9JZhslBy3E): the grid of tiles on the left, the pick large
// on the right over the blurred world (the game draws both: game/showroom.ts), its name big on a ribbon
// under it, and along the bottom the prompts, what each button does. The stats wait behind a button, as
// MKW's "Details" on Y ("You can check vehicle stats by pressing the Y Button", mario.nintendo.com's own
// tips); ours on Y too, on the keys and a pad, and a tap on the prompt. Our own art throughout: Lilita One
// and Fredoka, the house ink and sun, the intro title card's ribbon.
import '../select.css';
import { lockSvg } from '../icons.ts';
import { button, h } from './dom.ts';

/** The Stats prompt's words and the keys that press it (input.ts isStatsKey, UI.padStatsButton). */
export const STATS_PROMPT = 'Stats';

/**
 * The prompt bar along the bottom: what moves and picks (the keys, or a pad's buttons once one is pressed),
 * and Stats and Back as buttons of their own, so a mouse or a thumb can press them too (not in the focus
 * grid: the keys have Y and Escape). Returns the Stats button (aria-pressed says whether the stats show).
 */
export function promptBar(parent: HTMLElement, buttons: Map<string, HTMLElement>): HTMLElement {
  const bar = h('div', 'prompts hint', parent);
  const say = (keys: string, pad: string, words: string) => {
    const e = h('span', 'prompt', bar);
    h('kbd', 'only-keys', e, keys);
    h('kbd', 'only-pad', e, pad);
    h('span', '', e, words);
  };
  say('↑↓←→', 'D-pad', 'Move');
  say('Enter', 'A', 'Pick');
  const stats = button(bar, 'stats', 'prompt prompt-btn');
  stats.setAttribute('aria-pressed', 'false');
  h('kbd', '', stats, 'Y');
  h('span', '', stats, STATS_PROMPT);
  buttons.set('stats', stats);
  const back = button(bar, 'back', 'prompt prompt-btn back-btn');
  h('kbd', 'only-keys', back, 'Esc');
  h('kbd', 'only-pad', back, 'B');
  h('span', 'label', back, 'Back');
  buttons.set('back', back);
  return stats;
}

/** The name on its ribbon, and a line on an ink pill under it (`sub`, its words; the pill hides when they are empty; with `.locked` on the plate our padlock leads them). */
export interface Nameplate { root: HTMLElement; name: HTMLElement; sub: HTMLElement }
export function nameplate(parent: HTMLElement, cls = ''): Nameplate {
  const root = h('div', `nameplate${cls ? ` ${cls}` : ''}`, parent);
  root.setAttribute('aria-hidden', 'true'); // the focused tile's label says it all
  const name = h('div', 'np-name display', root);
  const line = h('div', 'np-sub', root);
  h('span', 'np-lock', line).innerHTML = lockSvg();
  const sub = h('span', 'np-text', line);
  return { root, name, sub };
}
