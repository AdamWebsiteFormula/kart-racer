// The race's big words as game banners (27 Sept 2026, the fresh-eyes review's item 9: "the countdown and banners
// are flat text"): each letter its own span, so the letters can come in one after another (they dash in from the
// right since the type of 28 Sept 2026), each struck in three layers from its `data-ch` (ui.css `.ch`: the side in a
// deeper tone, the face's gradient cut to the glyph over it, a navy keyline round both), as the place numeral is. Our
// own letters: Mona Sans Expanded Black Italic in the house colors; never Mario Kart World's numerals or banner art.
import { clear, h } from './dom.ts';

/**
 * `text` as banner letters in `parent` (anything there before goes). A space stays a plain space, where a long line
 * may wrap (the podium's headline); `--i` is each letter's place for the stylesheet's stagger and `--n` the count.
 * The words stay whole in `parent`'s text; screen readers may hear inline-block letters one by one, so a caller hides
 * `parent` from them and says the words once elsewhere (the banner's .sr-only, the podium headline's label).
 */
export function letters(parent: HTMLElement, text: string): void {
  clear(parent);
  let i = 0;
  for (const ch of text) {
    if (ch === ' ') { parent.append(' '); continue; }
    const s = h('span', 'ch', parent, ch);
    s.dataset.ch = ch;
    s.style.setProperty('--i', String(i++));
  }
  parent.style.setProperty('--n', String(i));
}
