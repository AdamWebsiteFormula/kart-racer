// The Kart screen (design §5, §12; docs/plans/kart-combos.md §5): ten kart cards in 5 × 2, each its picture in
// its colors, its name, whose it is and how it drives (a twin still locked grayed, with our padlock and how to
// earn it); beside them the hero: the kart under the focus shown large, captioned "Pip · Snack Truck · Berry",
// over the stats panel. Built when what it shows changes; drawn again the same, it writes nothing. The hero's
// canvas is the turntable's hook (the plan's K6): the game draws the racer in the focused kart there
// (UiRoot.turntable), covering the picture under it; until it does, the picture shows.
import '../karts.css';
import { UI } from '../constants.ts';
import { kartSvg, lockSvg } from '../icons.ts';
import { LOCKED_IN, type KartCardVM, type KartMenuVM } from '../screens/karts.ts';
import type { StatPanelVM } from '../screens/stats.ts';
import { button, clear, h, Markup, TextField } from './dom.ts';
import { face, type ScreenView } from './screens.ts';
import { StatPanel } from './statPanel.ts';

/** The keys, or a gamepad's buttons once one is pressed (as every menu's hint strip). */
const HINT = '<span class="only-keys"><kbd>↑↓←→</kbd>move</span><span class="only-keys"><kbd>Enter</kbd>pick</span><span class="only-keys"><kbd>Esc</kbd>back</span>'
  + '<span class="only-pad"><kbd>D-pad</kbd>move</span><span class="only-pad"><kbd>A</kbd>pick</span><span class="only-pad"><kbd>B</kbd>back</span>';

/** What the hero shows: the kart under the focus, on the racer, and its bars over the chosen combo's. */
export interface KartPreview { kartId: string; name: string; colors: readonly [string, string]; locked: boolean; hint?: string; racerId: string; racerName: string; paintName?: string; panel: StatPanelVM }

/** A card's words for assistive tech: the kart, whose, how it drives, locked or chosen, and its bars against the chosen one's. */
export function kartCardLabel(c: KartCardVM): string {
  const state = c.locked ? ` Locked: ${c.hint ?? ''}.` : c.chosen ? ' Your kart now.' : '';
  return `${c.name}, ${c.by}. ${c.line}.${state} ${c.words}.`;
}

export class KartView implements ScreenView {
  readonly root: HTMLElement;
  readonly buttons = new Map<string, HTMLElement>();
  /** the turntable's canvas in the hero (K6 draws the racer in the focused kart into it), or null before the first render */
  turntable: HTMLCanvasElement | null = null;
  private panel: StatPanel | null = null;
  private hero: { stage: HTMLElement; art: Markup; name: TextField; kart: TextField; paint: TextField; lock: TextField; face: HTMLElement | null; cap: HTMLElement } | null = null;
  /** what the last render drew (a render of the same draws nothing) */
  private drawn = '';
  private shownKart = '';
  private faceOf = '';
  /** the card that played "Locked in!" (cleared when the screen is drawn again) */
  private lockedIn: string | null = null;

  constructor(parent: HTMLElement) {
    this.root = h('section', 'screen kart-screen', parent);
    this.root.setAttribute('aria-label', 'Pick your kart');
  }

  render(vm: KartMenuVM): void {
    const key = JSON.stringify([vm.racerId, vm.cards]);
    if (this.lockedIn) { this.buttons.get(this.lockedIn)?.classList.remove('locked-in'); this.hero?.stage.classList.remove('locked-in'); this.lockedIn = null; }
    if (key === this.drawn) return;
    this.drawn = key;
    this.shownKart = '';
    this.faceOf = '';
    clear(this.root);
    this.buttons.clear();
    h('div', 'dim', this.root);
    const st = h('div', 'stage', this.root);
    const head = h('div', 'stage-head', st);
    h('h2', 'heading display enter', head, vm.title);
    // who is picking, by the heading, where the hero has no room (karts.css: a narrower screen)
    const who = h('div', 'kart-who enter', head);
    who.setAttribute('aria-hidden', 'true'); // the panel names them: "Pip in the Snack Truck"
    face(who, vm.racerId);
    h('span', '', who, vm.racerName);
    const back = button(head, 'back', 'btn back-btn enter');
    h('span', 'label', back, 'Back');
    this.buttons.set('back', back);
    const body = h('div', 'kart-body', st);
    const grid = h('div', 'kart-grid', body);
    vm.cards.forEach((c, i) => this.card(grid, c, i));
    // the hero: the focused kart large (the game's turntable covers it once it draws: K6), and who is in it
    const aside = h('div', 'kart-hero enter', body);
    const stage = h('div', 'kh-stage', aside);
    const art = h('div', 'kh-art', stage);
    this.turntable = h('canvas', 'kh-canvas', stage);
    this.turntable.setAttribute('aria-hidden', 'true');
    const lock = h('div', 'kh-lock', stage);
    lock.setAttribute('aria-hidden', 'true');
    h('span', 'lk', lock).innerHTML = lockSvg();
    const lockText = h('span', '', lock);
    const cap = h('div', 'kh-cap', aside);
    cap.setAttribute('aria-hidden', 'true'); // the focused card's label says it all
    const words = h('div', 'kh-words', cap);
    const name = h('span', 'kh-name', words);
    const look = h('span', 'kh-look', words);
    h('span', 'sep', look, '· ');
    const kart = h('b', '', look), paint = h('span', 'kh-paint', look);
    this.hero = { stage, art: new Markup(art), name: new TextField(name), kart: new TextField(kart), paint: new TextField(paint), lock: new TextField(lockText), face: null, cap };
    this.panel = new StatPanel(body, 'kart-stats enter');
    const hint = h('div', 'hint', st);
    hint.innerHTML = HINT;
  }

  private card(grid: HTMLElement, c: KartCardVM, i: number): void {
    const b = button(grid, c.id, `kart-card enter${c.locked ? ' locked' : ''}${c.chosen ? ' chosen' : ''}`);
    b.style.setProperty('--delay', `${i * UI.staggerRosterMs}ms`);
    b.style.setProperty('--kart-a', c.colors[0]);
    b.style.setProperty('--kart-b', c.colors[1]);
    // a locked twin takes the focus (it previews) but cannot be chosen: UiRoot refuses it
    if (c.locked) { b.setAttribute('aria-disabled', 'true'); b.dataset.locked = 'true'; }
    b.setAttribute('aria-label', kartCardLabel(c));
    const pic = h('span', 'kc-art', b);
    pic.innerHTML = kartSvg(c.id, c.colors[0], c.colors[1]);
    if (c.locked) h('span', 'kc-lock', pic).innerHTML = lockSvg();
    h('span', 'kc-name', b, c.name);
    h('span', 'kc-by', b, c.by);
    if (c.locked) {
      const hint = h('span', 'kc-hint', b);
      h('span', 'lk', hint).innerHTML = lockSvg();
      hint.append(c.hint ?? '');
    } else h('span', 'kc-line', b, c.line);
    // the kart the racer is in now: a check in the corner (the label says it in words)
    if (c.chosen) h('span', 'kc-chosen', b, '✓').setAttribute('aria-hidden', 'true');
    h('span', 'kc-stamp', b, LOCKED_IN).setAttribute('aria-hidden', 'true');
    this.buttons.set(c.id, b);
  }

  /** The kart under the focus on show: large in the hero, its bars as a ghost over the chosen combo's. Writes only what changed. */
  preview(p: KartPreview): void {
    const hero = this.hero;
    if (!hero) return;
    if (this.shownKart !== `${p.kartId}|${p.colors.join()}`) {
      this.shownKart = `${p.kartId}|${p.colors.join()}`;
      hero.art.set(kartSvg(p.kartId, p.colors[0], p.colors[1]));
    }
    if (this.faceOf !== p.racerId) {
      this.faceOf = p.racerId;
      hero.face?.remove();
      hero.face = face(hero.cap, p.racerId);
      hero.cap.prepend(hero.face);
    }
    hero.name.set(p.racerName);
    hero.kart.set(p.name);
    hero.paint.set(p.paintName ? ` · ${p.paintName}` : '');
    hero.lock.set(p.locked ? p.hint ?? '' : '');
    hero.stage.classList.toggle('locked', p.locked);
    this.panel?.render(p.panel, `${p.racerName} in the ${p.name}`);
  }

  /** A kart chosen: its card plays the "Locked in!" pulse (UI.lockInMs) before the next screen comes. */
  lockIn(id: string): void {
    this.lockedIn = id;
    this.buttons.get(id)?.classList.add('locked-in');
    this.hero?.stage.classList.add('locked-in');
  }

  /** A locked twin refused: its card shakes no (its hint says how to earn it). */
  refuse(id: string): void {
    const b = this.buttons.get(id);
    if (!b) return;
    b.classList.remove('refused');
    void b.offsetWidth; // one forced reflow, only on the press that is refused, to play the shake again
    b.classList.add('refused');
  }
}
