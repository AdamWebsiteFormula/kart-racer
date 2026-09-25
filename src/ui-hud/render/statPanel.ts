// The stats panel (design §5, §12), one piece on the Racer and Kart screens: four bars, each a solid bar for
// the combo chosen now and a ghost for the one under the focus: a light extension for a gain, a hatched cut-back
// for a loss (the solid bar gives way to it), and a chevron a step, up to three. Built once; a render writes only
// what changed (karts.css moves the bars by scaleX alone, 240 ms on the house ease, 40 ms apart, the ghost fading
// in over 120 ms; at once with reduced motion). The words are for screen readers: "Speed 7 of 10, up 2".
import type { StatPanelVM } from '../screens/stats.ts';
import { STAT_KEYS } from '../data/kartStats.ts';
import { STAT_LABELS, MAX_CHEVRONS } from '../screens/stats.ts';
import { Attr, h, StyleVar, TextField } from './dom.ts';

/** A chevron, pointing up (the stylesheet turns it over for a loss). */
const CHEVRON = '<svg class="chev-svg" viewBox="0 0 12 9" width="12" height="9" aria-hidden="true" focusable="false"><path d="M1.6 7.6 6 3.2l4.4 4.4" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** A CSS number a scale takes, to four places (no churn from float noise). */
const num = (v: number) => String(Math.round(v * 10000) / 10000);

interface Row { fill: StyleVar; gain: StyleVar; loss: StyleVar; ghost: Attr; dir: Attr; n: Attr; words: TextField; level: Attr }

export class StatPanel {
  readonly root: HTMLElement;
  private readonly rows: Row[] = [];
  private readonly who: TextField;

  /** `cls`: the panel's place and entrance (`kart-stats enter` on the Kart screen, `roster-stats enter` by the racer screen's turntable) */
  constructor(parent: HTMLElement, cls = '') {
    this.root = h('div', `stat-panel${cls ? ` ${cls}` : ''}`, parent);
    this.root.setAttribute('role', 'group');
    this.root.setAttribute('aria-label', 'Stats');
    this.who = new TextField(h('span', 'sr-only', this.root));
    STAT_KEYS.forEach((key, i) => {
      const row = h('div', 'sp-row', this.root);
      row.dataset.stat = key;
      row.style.setProperty('--i', String(i));
      const label = h('span', 'sp-label', row, STAT_LABELS[key]);
      label.setAttribute('aria-hidden', 'true');
      const track = h('span', 'sp-track', row);
      track.setAttribute('aria-hidden', 'true');
      // under the solid bar: the gain's light extension and the loss's hatched cut-back (each a scaleX of the whole track)
      const gain = h('i', 'sp-gain', track), loss = h('i', 'sp-loss', track), fill = h('i', 'sp-fill', track);
      const chev = h('span', 'sp-chev', row);
      chev.setAttribute('aria-hidden', 'true');
      chev.innerHTML = CHEVRON.repeat(MAX_CHEVRONS);
      const words = h('span', 'sr-only', row);
      this.rows.push({
        fill: new StyleVar(fill, '--x'), gain: new StyleVar(gain, '--x'), loss: new StyleVar(loss, '--x'),
        ghost: new Attr(row, 'data-ghost'), dir: new Attr(chev, 'data-dir'), n: new Attr(chev, 'data-n'), words: new TextField(words), level: new Attr(row, 'data-level'),
      });
    });
  }

  /** `who`: whose combo it is, for assistive tech ("Pip in the Snack Truck"). Writes only what changed. */
  render(vm: StatPanelVM, who = ''): void {
    this.who.set(who);
    vm.rows.forEach((r, i) => {
      const row = this.rows[i];
      if (!row) return;
      // the solid bar gives way to a loss's cut-back; a gain's extension shows past it
      row.fill.set(num(Math.min(r.value, r.ghost)));
      row.gain.set(num(r.ghost));
      row.loss.set(num(r.value));
      row.ghost.set(r.ghost > r.value ? 'gain' : r.ghost < r.value ? 'loss' : 'none');
      row.dir.set(r.steps > 0 ? 'up' : r.steps < 0 ? 'down' : 'none');
      row.n.set(String(r.chevrons));
      row.level.set(String(r.level));
      row.words.set(r.words);
    });
  }
}
