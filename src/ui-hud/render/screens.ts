// One renderer per screen. Menus rebuild on show (they are small and off the race path);
// each exposes its focusable buttons by id so UiRoot can move the focus ring.
import { GAME_TITLE, UI } from '../constants.ts';
import { arrowSvg, cupSvg, iconFor, iconMarkup, lockSvg, medalSvg, SHAPE_PATHS, starIcon } from '../icons.ts';
import { CREDITS_MADE, type CreditSection } from '../screens/credits.ts';
import { AUTO_GAS_NOTE, CONTROLS, CREATURES, ITEM_LINES, LETTERS_LEAD, TIPS } from '../data/howto.ts';
import { DONE_HELP, type CupVM, type MedalLadderVM, type MenuVM, type RosterVM, type SettingRow, type TrackVM } from '../screens/menus.ts';
import type { BoardVM, CutVM, EndMenuVM, GpRow, GpVM, ResultsVM } from '../screens/results.ts';
import { faceCrop } from '../data/faces.ts';
import type { UnlockRow } from '../unlocks.ts';
import type { GarageVM } from '../garage.ts';
import { button, clear, h, Markup } from './dom.ts';

export interface ScreenView {
  readonly root: HTMLElement;
  readonly buttons: Map<string, HTMLElement>;
  /** the focus moved to `id` (keys, a pad or the pointer): Settings' help line follows it */
  focused?(id: string): void;
}

/** The keys, or a gamepad's buttons once one is pressed (UiRoot sets `data-input`; the stylesheet shows one set) */
const HINT = '<span class="only-keys"><kbd>↑↓←→</kbd>move</span><span class="only-keys"><kbd>Enter</kbd>pick</span><span class="only-keys"><kbd>Esc</kbd>back</span>'
  + '<span class="only-pad"><kbd>D-pad</kbd>move</span><span class="only-pad"><kbd>A</kbd>pick</span><span class="only-pad"><kbd>B</kbd>back</span>';

function stage(root: HTMLElement): HTMLElement {
  h('div', 'dim', root);
  return h('div', 'stage', root);
}

function hint(parent: HTMLElement, html = HINT): void {
  const e = h('div', 'hint', parent);
  e.innerHTML = html;
}

/** The screen's heading, with a Back button at the far end of its row: a mouse or a thumb has no
 *  Escape (UiRoot.confirm sends 'back' the way Escape goes). Not in the focus grid: keys have Escape. */
function heading(st: HTMLElement, title: string, buttons: Map<string, HTMLElement>): void {
  const row = h('div', 'stage-head', st);
  h('h2', 'heading display enter', row, title);
  const back = button(row, 'back', 'btn back-btn enter');
  h('span', 'label', back, 'Back');
  buttons.set('back', back);
}

const delay = (e: HTMLElement, ms: number) => e.style.setProperty('--delay', `${ms}ms`);

/** A row's ◀ or ▶ (a setting, Paint, Body): under a pointer it steps that way (UiRoot.pointer). Drawn:
 *  the triangle characters turn into emoji on some phones. */
function stepArrow(parent: HTMLElement, dir: -1 | 1): void {
  const a = h('span', 'arrow', parent);
  a.innerHTML = arrowSvg(dir);
  a.dataset.dir = String(dir);
}

/** A results or board row as a table row: each part a cell, the face (and anything else hidden) left to the eyes. */
function asRow(row: HTMLElement): void {
  row.setAttribute('role', 'row');
  for (const c of row.children) if (c.getAttribute('aria-hidden') !== 'true') c.setAttribute('role', 'cell');
}

/**
 * A racer's face, as Mario Kart World names every racer in a list: their portrait cropped to the head
 * (data/faces.ts), round and ringed in their color (the row's `--accent`). The name is beside it, so
 * assistive tech skips it.
 */
export function face(parent: HTMLElement, racerId: string): HTMLElement {
  const e = h('span', 'face-ic', parent);
  e.setAttribute('aria-hidden', 'true');
  e.style.setProperty('--portrait', `url("${import.meta.env.BASE_URL}art/racers/${racerId}.webp")`);
  e.style.setProperty('--crop', faceCrop(racerId));
  return e;
}

/** How a racer moved in the standings with this race: an arrow up or down, or a dash, and the words for assistive tech; `by` null draws an empty cell. */
function moveCell(e: HTMLElement, by: number | null): void {
  const m = h('span', by === null ? 'mv' : `mv ${by > 0 ? 'up' : by < 0 ? 'down' : 'same'}`, e);
  if (by === null) return;
  h('i', '', m).setAttribute('aria-hidden', 'true');
  h('span', 'sr-only', m, by > 0 ? `up ${by}` : by < 0 ? `down ${-by}` : 'no change');
}

/** A standings total. The stylesheet draws the number from `--pts` (ui.css), counting it up from `from` when `count`; the words are for assistive tech. */
function total(e: HTMLElement, from: number, to: number, count: boolean): void {
  const t = h('span', 'tm pts', e);
  const n = h('span', count && from !== to ? 'n count' : 'n', t);
  n.setAttribute('aria-hidden', 'true');
  n.style.setProperty('--pts', String(to));
  if (count) n.style.setProperty('--from', String(from));
  h('span', 'sr-only', t, String(to));
  t.append(' pts');
}

/** A standings row's cells: the place, how they moved (none after the first race), the face, the name, the points just won and the total. */
function standing(e: HTMLElement, r: GpRow, moves: boolean, count: boolean, arrow = true): void {
  h('span', 'rk', e, r.rank);
  if (moves) moveCell(e, arrow ? r.moved : null);
  face(e, r.racerId);
  h('span', 'nm', e, r.name + (r.player ? ' (you)' : ''));
  h('span', 'gp gained', e, r.gained ? `+${r.gained}` : '');
  total(e, r.was, r.points, count);
}

/** Relative luminance of a #rrggbb colour, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
}

export class BootView implements ScreenView {
  readonly root: HTMLElement;
  readonly buttons = new Map<string, HTMLElement>();
  constructor(parent: HTMLElement) {
    this.root = h('section', 'screen boot', parent);
    this.root.setAttribute('aria-label', 'Loading');
    h('div', 'display', this.root, 'Loading…');
  }
}

export class TitleView implements ScreenView {
  readonly root: HTMLElement;
  readonly buttons = new Map<string, HTMLElement>();
  constructor(parent: HTMLElement) {
    this.root = h('section', 'screen title', parent);
    this.root.setAttribute('aria-label', GAME_TITLE.join(' '));
  }
  render(vm: MenuVM): void {
    clear(this.root);
    this.buttons.clear();
    const st = stage(this.root);
    const logo = h('h1', 'logo', st);
    h('span', 'l1 display', logo, GAME_TITLE[0]);
    h('span', 'l2 display', logo, GAME_TITLE[1]);
    const menu = h('div', 'menu', st);
    vm.entries.forEach((e, i) => {
      const b = button(menu, e.id);
      h('span', 'label', b, e.label);
      b.classList.add('enter');
      delay(b, 500 + i * 80);
      this.buttons.set(e.id, b);
    });
    h('div', 'press only-keys', st, 'Press Enter');
    h('div', 'press only-pad', st, 'Press A');
  }
}

export class ListView implements ScreenView {
  readonly root: HTMLElement;
  readonly buttons = new Map<string, HTMLElement>();
  constructor(parent: HTMLElement, cls: string, label: string) {
    this.root = h('section', `screen ${cls}`, parent);
    this.root.setAttribute('aria-label', label);
  }
  /** `icons`: each entry's icon, SVG markup (icons.ts modeSvg); the label beside it names the thing */
  render(vm: MenuVM, icons: Record<string, string> = {}): void {
    clear(this.root);
    this.buttons.clear();
    const st = stage(this.root);
    heading(st, vm.title, this.buttons);
    const grid = h('div', 'modes', st);
    vm.entries.forEach((e, i) => {
      const b = button(grid, e.id);
      if (icons[e.id]) {
        const ic = h('span', 'icon', b);
        ic.innerHTML = icons[e.id];
        ic.setAttribute('aria-hidden', 'true');
      }
      h('span', 'label', b, e.label);
      if (e.sub) h('span', 'sub', b, e.sub);
      if (e.badge) h('span', 'badge', b, e.badge);
      if (e.disabled) b.setAttribute('aria-disabled', 'true');
      b.classList.add('enter');
      delay(b, i * UI.staggerRosterMs * 2);
      this.buttons.set(e.id, b);
    });
    hint(st);
  }
}

/** Side views of the three bodies for the Body swatches (the racer's own kart, Classic, Buggy): outline only, currentColor. */
const BODY_ICONS: Record<string, string> = {
  standard: '<path d="M6 19h36l-3-7H27l-4-6h-8l-2 6H9z"/><circle cx="13" cy="21" r="4"/><circle cx="35" cy="21" r="4"/><path d="M19 6l2-3h5"/>',
  classic: '<path d="M3 18h40l-2-4H29l-4-5h-6l-3 5H9z"/><path d="M36 14l2-7h7"/><circle cx="12" cy="20" r="4"/><circle cx="36" cy="20" r="4.5"/>',
  buggy: '<path d="M6 17h36l-4-6H30l-5-6h-9l-3 6H9z"/><path d="M16 5l4-3h8l3 3"/><circle cx="13" cy="20" r="6"/><circle cx="35" cy="20" r="6"/>',
};

export class RosterView implements ScreenView {
  readonly root: HTMLElement;
  readonly buttons = new Map<string, HTMLElement>();
  /** the Paint and Body rows (garage.ts), drawn again on their own when a choice or the dressed racer changes */
  private garage: HTMLElement | null = null;
  /** the hero turntable's caption: who, in which paint and body */
  private heroCap: HTMLElement | null = null;
  /** the hero canvas the game copies the dressed kart into, turning on its pedestal (main.ts), or null */
  turntable: HTMLCanvasElement | null = null;
  constructor(parent: HTMLElement) {
    this.root = h('section', 'screen roster-screen', parent);
    this.root.setAttribute('aria-label', 'Pick your racer');
  }
  render(vm: RosterVM): void {
    clear(this.root);
    this.buttons.clear();
    const st = stage(this.root);
    heading(st, 'Pick your racer', this.buttons);
    const body = h('div', 'roster-body', st);
    const main = h('div', 'roster-main', body);
    const grid = h('div', 'roster', main);
    vm.cards.forEach((c, i) => {
      const b = button(grid, c.id, 'card enter');
      delay(b, i * UI.staggerRosterMs);
      b.style.setProperty('--accent', c.accent);
      b.style.setProperty('--secondary', c.secondary);
      // a pale accent (Sprocket's cream) vanishes on the bar track: use the other colour
      b.style.setProperty('--bar', luminance(c.accent) > 0.6 ? c.secondary : c.accent);
      b.setAttribute('aria-label', `${c.name}, ${c.archetype.toLowerCase()} class. ${c.species} with a ${c.kart.toLowerCase()}. ${c.personality}.`);
      h('span', 'cls', b, c.archetype);
      // the racer's portrait (their concept art, public/art/racers), zoomed to face and shoulders
      const face = h('div', 'face has-portrait', b, c.name[0]);
      face.style.setProperty('--portrait', `url("${import.meta.env.BASE_URL}art/racers/${c.id}.webp")`);
      h('div', 'name', b, c.name);
      h('div', 'who', b, `${c.species} · ${c.kart}`);
      h('div', 'quip', b, c.personality);
      const stats = h('div', 'stats', b);
      c.stats.forEach((s, k) => {
        const row = h('div', 'stat', stats);
        h('span', '', row, s.label);
        const bar = h('span', 'bar', row);
        const fill = h('i', '', bar);
        fill.style.width = `${Math.round(s.value * 100)}%`;
        delay(fill, 200 + i * UI.staggerRosterMs + k * 60);
      });
      this.buttons.set(c.id, b);
    });
    this.garage = h('div', 'garage enter', main);
    if (vm.classes.length) { // Time Trial and Daily have no class row
      const cls = h('div', 'classes', main);
      for (const e of vm.classes) {
        const b = button(cls, e.id);
        h('span', 'label', b, e.label);
        if (e.sub) h('span', 'sub', b, e.sub);
        if (e.badge) h('span', 'badge', b, e.id === 'mirror' ? 'ON' : '✓').setAttribute('aria-hidden', 'true'); // aria-pressed says it
        b.setAttribute('aria-pressed', e.badge ? 'true' : 'false');
        this.buttons.set(e.id, b);
      }
    }
    // the hero: the dressed racer turning on a pedestal under a spotlight (main.ts draws it into the canvas)
    const hero = h('aside', 'hero enter', body);
    this.turntable = h('canvas', 'hero-stage', hero);
    this.turntable.setAttribute('aria-hidden', 'true');
    this.heroCap = h('div', 'hero-cap', hero);
    if (vm.garage) this.renderGarage(vm.garage);
    else this.garage.hidden = true;
    hint(st);
  }

  /** The garage and the hero's caption alone, drawn again when a choice or the dressed racer changes (the cards stay put). */
  renderGarage(g: GarageVM): void {
    const el = this.garage;
    if (!el) return;
    for (const id of ['paint', 'body']) this.buttons.delete(id);
    clear(el);
    el.hidden = g.choices.length === 0;
    for (const c of g.choices) {
      const wrap = h('div', 'pick-wrap', el);
      const b = button(wrap, c.id, 'btn pick');
      h('span', 'label', b, c.label);
      // the arrows step that way under a pointer (UiRoot.pointer); a swatch picks itself
      stepArrow(b, -1);
      const opts = h('span', 'opts', b);
      c.options.forEach((o, i) => {
        const chip = h('span', `opt${i === c.index ? ' on' : ''}${o.locked ? ' locked' : ''}`, opts);
        chip.dataset.opt = o.id;
        // (the lock sits beside the swatch, not in it: a locked swatch is grayed, its lock is not)
        const box = h('span', 'sw-box', chip);
        const sw = h('span', 'sw', box);
        if (typeof o.swatch === 'string') { sw.classList.add('icon'); sw.innerHTML = `<svg viewBox="0 0 48 28" aria-hidden="true">${BODY_ICONS[o.swatch] ?? ''}</svg>`; }
        else sw.style.background = `linear-gradient(135deg, ${o.swatch[0]} 0 55%, ${o.swatch[1]} 55% 100%)`;
        if (o.locked) h('span', 'lock', box).innerHTML = lockSvg();
        h('span', 'nm', chip, o.name);
      });
      stepArrow(b, 1);
      const locked = c.options.filter((o) => o.locked);
      b.setAttribute('aria-label', `${g.racerName}'s ${c.label.toLowerCase()}: ${c.value}. Left and right change it.${locked.map((o) => ` ${o.name} is locked: ${o.hint}.`).join('')}`);
      // how to earn each locked one, under its row, each behind its lock
      if (locked.length) {
        const hint = h('div', 'pick-hint', wrap);
        locked.forEach((o, k) => {
          if (k) hint.append(' · ');
          h('span', 'lk', hint).innerHTML = lockSvg();
          hint.append(`${o.name}: ${o.hint}`);
        });
      }
      this.buttons.set(c.id, b);
    }
    const cap = this.heroCap;
    if (cap) {
      clear(cap);
      h('div', 'hero-name', cap, g.racerName);
      const look = h('div', 'hero-look', cap);
      // a racer with no alt paint shows only the body
      const tags = [...(g.choices.some((c) => c.id === 'paint') ? [['Paint', g.paintName]] : []), ['Body', g.bodyName]];
      for (const [k, v] of tags) {
        const t = h('span', 'tag', look);
        h('small', '', t, k);
        h('b', '', t, v);
      }
    }
  }

  /** Mark the card the garage dresses (it keeps a ring while the focus is down in the garage). */
  markDressed(id: string): void {
    for (const [k, b] of this.buttons) if (b.classList.contains('card')) b.classList.toggle('dressed', k === id);
  }
}

export class CupView implements ScreenView {
  readonly root: HTMLElement;
  readonly buttons = new Map<string, HTMLElement>();
  constructor(parent: HTMLElement) {
    this.root = h('section', 'screen cup-screen', parent);
    this.root.setAttribute('aria-label', 'Pick a cup');
  }
  render(vm: CupVM): void {
    clear(this.root);
    this.buttons.clear();
    this.root.setAttribute('aria-label', vm.title);
    const st = stage(this.root);
    heading(st, vm.title, this.buttons);
    const grid = h('div', 'cups', st);
    vm.cups.forEach((c, i) => {
      const b = button(grid, c.id, 'btn cup enter');
      delay(b, i * 90);
      const row = h('div', 'cup-head', b);
      // its own emblem beside its name (icons.ts cupSvg; its name says it in words)
      const emblem = cupSvg(c.id);
      if (emblem) h('span', 'emblem', row).innerHTML = emblem;
      h('span', 'label', row, c.label);
      if (c.badge) {
        const bd = h('span', 'badge', row);
        // ★★☆: drawn as the results draw their stars (a font's stars differ on every system), and read
        // as how many ("black star, black star, white star" otherwise)
        if (/^[★☆]+$/.test(c.badge)) {
          bd.classList.add('star-badge');
          bd.innerHTML = [...c.badge].map((x) => starIcon(x === '★')).join('');
          bd.setAttribute('role', 'img');
          bd.setAttribute('aria-label', `${[...c.badge].filter((x) => x === '★').length} of ${c.badge.length} stars`);
        } else bd.textContent = c.badge;
      }
      if (c.sub) h('span', 'sub', b, c.sub);
      const tracks = h('div', 'tracks', b);
      for (const t of c.tracks) {
        const e = h('div', t.built ? 'trk' : 'trk soon', tracks);
        e.style.setProperty('--bg', t.bg);
        e.style.setProperty('--accent', t.accent);
        if (t.built) e.style.setProperty('--shot', `url("${import.meta.env.BASE_URL}art/tracks/${t.id}.webp")`);
        h('span', '', e, t.name);
        if (!t.built) h('span', 'soon-tag', e, 'Soon');
      }
      if (c.disabled) b.setAttribute('aria-disabled', 'true');
      this.buttons.set(c.id, b);
    });
    hint(st);
  }
}

export class TrackView implements ScreenView {
  readonly root: HTMLElement;
  readonly buttons = new Map<string, HTMLElement>();
  constructor(parent: HTMLElement) {
    this.root = h('section', 'screen track-screen', parent);
    this.root.setAttribute('aria-label', 'Pick a track');
  }
  render(vm: TrackVM): void {
    clear(this.root);
    this.buttons.clear();
    this.root.setAttribute('aria-label', vm.title);
    const st = stage(this.root);
    heading(st, vm.title, this.buttons);
    const grid = h('div', 'track-cards', st);
    vm.tracks.forEach((t, i) => {
      const b = button(grid, t.id, 'btn track-card enter');
      delay(b, i * 70);
      b.style.setProperty('--bg', t.bg);
      b.style.setProperty('--accent', t.accent);
      // the start grid on that track, shot in the game (public/art/tracks); the colours show under it until it loads
      b.style.setProperty('--shot', `url("${import.meta.env.BASE_URL}art/tracks/${t.id}.webp")`);
      h('span', 'swatch', b);
      h('span', 'label', b, t.label);
      h('span', 'biome', b, t.biome);
      if (t.sub) h('span', 'sub', b, t.sub);
      // Time Trial: the best run's medal, a badge in the corner (the sub line names it too)
      if (t.medal) h('span', 'medal-badge', b).innerHTML = medalSvg(t.medal, 44);
      this.buttons.set(t.id, b);
    });
    hint(st);
  }
}

export class OverlayMenuView implements ScreenView {
  readonly root: HTMLElement;
  readonly buttons = new Map<string, HTMLElement>();
  constructor(parent: HTMLElement, cls: string) {
    this.root = h('section', `screen overlay ${cls}`, parent);
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
  }
  render(vm: MenuVM): void {
    clear(this.root);
    this.buttons.clear();
    this.root.setAttribute('aria-label', vm.title);
    h('div', 'dim', this.root);
    const box = h('div', 'panel box', this.root);
    h('h2', '', box, vm.title);
    const list = h('div', 'list', box);
    for (const e of vm.entries) {
      const b = button(list, e.id);
      h('span', 'label', b, e.label);
      this.buttons.set(e.id, b);
    }
  }
}

/**
 * A dialog's panel with its own button (Settings' Done, Back on How to Play, Credits and Unlocks): the
 * content scrolls in `body` and the button sits in `foot`, always in sight. Back used to sit at the end
 * of the scrolling panel, so it opened cut in half by the panel's edge (sweep, 24 Sept 2026).
 */
function dialog(root: HTMLElement, extra = ''): { box: HTMLElement; body: HTMLElement; foot: HTMLElement } {
  h('div', 'dim', root);
  const box = h('div', `panel box dialog${extra ? ` ${extra}` : ''}`, root);
  return { box, body: h('div', 'scroll', box), foot: h('div', 'foot', box) };
}

export class SettingsView implements ScreenView {
  readonly root: HTMLElement;
  readonly buttons = new Map<string, HTMLElement>();
  /** the help line over Done: what the focused row does (MKW's options say so for the one under the cursor) */
  private help: HTMLElement | null = null;
  /** each row's line, and Done's, by id */
  private readonly helps = new Map<string, string>();
  constructor(parent: HTMLElement) {
    this.root = h('section', 'screen overlay settings', parent);
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', 'Settings');
  }
  /** `redraw`: a value changed, so the new panel keeps the old one's scroll and does not pop in again:
   *  the row stays under the finger (a phone on its side: at scroll 0, the next tap changed another setting) */
  render(rows: SettingRow[], redraw = false): void {
    const top = redraw ? this.root.querySelector<HTMLElement>('.scroll')?.scrollTop ?? 0 : 0;
    // and its help line stays as it was: it comes in afresh only when it says something new (focused)
    const said = redraw ? this.help?.textContent ?? '' : '';
    clear(this.root);
    this.buttons.clear();
    this.helps.clear();
    const { body, foot } = dialog(this.root, redraw ? 'redraw' : '');
    h('h2', '', body, 'Settings');
    const list = h('div', 'list', body);
    for (const r of rows) {
      const b = button(list, r.id, 'btn setting');
      h('span', 'label', b, r.label);
      const val = h('span', 'val', b);
      // the arrows step that way under a pointer (UiRoot.pointer); the rest of the row steps up
      stepArrow(val, -1);
      if (r.fraction !== undefined) {
        const m = h('span', 'meter', val);
        h('i', '', m).style.width = `${Math.round(r.fraction * 100)}%`;
      }
      h('span', '', val, r.value);
      stepArrow(val, 1);
      // the help line is for the eyes; assistive tech hears it with the row
      b.setAttribute('aria-label', `${r.label}: ${r.value}. ${r.help} Left and right change it.`);
      this.helps.set(r.id, r.help);
      this.buttons.set(r.id, b);
    }
    this.help = h('p', 'help', foot);
    this.help.setAttribute('aria-hidden', 'true');
    if (said) h('span', 'still', this.help, said);
    const done = button(foot, 'done');
    h('span', 'label', done, 'Done');
    this.helps.set('done', DONE_HELP);
    this.buttons.set('done', done);
    body.scrollTop = top;
  }

  /** The focus moved (keys, a pad, the pointer): the help line says what that row does, the new line
   *  coming in (ui.css; with reduced motion, at once). */
  focused(id: string): void {
    const text = this.helps.get(id) ?? '';
    if (!this.help || this.help.textContent === text) return;
    clear(this.help);
    h('span', '', this.help, text);
  }
}

/** How to Play: controls, every item with its painted art, the course creatures, and tips. */
export class HowToView implements ScreenView {
  readonly root: HTMLElement;
  readonly buttons = new Map<string, HTMLElement>();
  constructor(parent: HTMLElement) {
    this.root = h('section', 'screen overlay howto', parent);
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', 'How to Play');
  }
  /** `autoGas`: Auto-accelerate is on (Settings), and the Gas row says so */
  render(items: readonly { id: string; name: string }[], autoGas = false): void {
    clear(this.root);
    this.buttons.clear();
    const { body: box, foot } = dialog(this.root);
    h('h2', '', box, 'How to Play');
    h('h3', '', box, 'Controls');
    const t = h('table', 'controls', box);
    const head = h('tr', '', t);
    h('th', '', head, 'Action'); h('th', '', head, 'Keyboard'); h('th', '', head, 'Gamepad'); h('th', '', head, 'Touch');
    for (const c of CONTROLS) {
      const tr = h('tr', '', t);
      const note = autoGas && c.gas ? ` ${AUTO_GAS_NOTE}` : '';
      h('td', '', tr, c.action); h('td', 'k', tr, c.keys + note); h('td', 'k', tr, c.pad + note); h('td', 'k', tr, c.touch);
    }
    h('h3', '', box, 'Items');
    const grid = h('div', 'items', box);
    for (const it of items) {
      const card = h('div', 'item', grid);
      const ic = h('span', 'ic', card);
      new Markup(ic).set(iconMarkup(it.id, 52));
      const txt = h('div', 'txt', card);
      h('b', '', txt, it.name);
      h('span', '', txt, ITEM_LINES[it.id] ?? '');
    }
    // the Item labels setting's key: the letter each item's slot shows when it is on
    const letters = h('p', 'letters', box, `${LETTERS_LEAD} `);
    const keyed = items.filter((it) => iconFor(it.id));
    keyed.forEach((it, i) => {
      h('b', '', letters, iconFor(it.id)!.glyph);
      letters.append(` ${it.name}${i < keyed.length - 1 ? ' · ' : ''}`);
    });
    h('h3', '', box, 'Course creatures');
    const cl = h('ul', 'creatures', box);
    for (const c of CREATURES) {
      const li = h('li', '', cl);
      h('b', '', li, `${c.name} (${c.track}): `);
      h('span', '', li, c.line);
    }
    h('h3', '', box, 'Tips');
    const tl = h('ul', 'tips', box);
    for (const tip of TIPS) h('li', '', tl, tip);
    const back = button(foot, 'back');
    h('span', 'label', back, 'Back');
    this.buttons.set('back', back);
  }
}

export class CreditsView implements ScreenView {
  readonly root: HTMLElement;
  readonly buttons = new Map<string, HTMLElement>();
  constructor(parent: HTMLElement) {
    this.root = h('section', 'screen overlay credits', parent);
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', 'Credits');
  }
  render(sections: CreditSection[]): void {
    clear(this.root);
    this.buttons.clear();
    const { body: box, foot } = dialog(this.root);
    h('h2', '', box, 'Credits');
    for (const s of sections) {
      h('h3', '', box, s.title);
      const t = h('table', '', box);
      for (const r of s.rows) {
        const tr = h('tr', '', t);
        h('td', '', tr, r.work);
        h('td', '', tr, r.author);
        h('td', 'lic', tr, r.licence);
      }
    }
    h('p', 'made', box, CREDITS_MADE);
    const back = button(foot, 'back');
    h('span', 'label', back, 'Back');
    this.buttons.set('back', back);
  }
}

/** Design §10: every unlock, granted or locked, and how to earn it. */
export class UnlocksView implements ScreenView {
  readonly root: HTMLElement;
  readonly buttons = new Map<string, HTMLElement>();
  constructor(parent: HTMLElement) {
    this.root = h('section', 'screen overlay credits unlocks', parent);
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', 'Unlocks');
  }
  render(rows: readonly UnlockRow[]): void {
    clear(this.root);
    this.buttons.clear();
    const { body: box, foot } = dialog(this.root);
    h('h2', '', box, 'Unlocks');
    h('p', 'made', box, `${rows.filter((r) => r.unlocked).length} of ${rows.length} unlocked`);
    const list = h('ul', 'unlock-list', box);
    for (const r of rows) {
      const li = h('li', r.unlocked ? 'unlock on' : 'unlock', list);
      li.setAttribute('aria-label', `${r.name}: ${r.unlocked ? `unlocked. ${r.use}` : `locked. ${r.how}`}`);
      const mark = h('span', 'mark', li);
      mark.innerHTML = r.unlocked ? starIcon(true) : lockSvg();
      mark.setAttribute('aria-hidden', 'true');
      const txt = h('div', 'txt', li);
      h('b', '', txt, r.name);
      h('span', '', txt, r.unlocked ? `Unlocked! ${r.use}` : r.how);
    }
    const back = button(foot, 'back');
    h('span', 'label', back, 'Back');
    this.buttons.set('back', back);
  }
}

/** A Time Trial's medal times under the run: each medal with its time, in color where the run reached it. */
function medalLadder(parent: HTMLElement, m: MedalLadderVM): void {
  const row = h('div', 'medal-ladder', parent);
  row.setAttribute('role', 'list');
  row.setAttribute('aria-label', 'Medal times');
  for (const s of m.steps) {
    const r = h('div', `rung${s.reached ? ' got' : ' miss'}${s.medal === m.won ? ' won' : ''}`, row);
    r.setAttribute('role', 'listitem');
    r.setAttribute('aria-label', `${s.label}: ${s.time}${s.medal === m.won ? ', yours' : s.reached ? ', beaten' : ''}`);
    h('span', 'rung-ic', r).innerHTML = medalSvg(s.medal, 26);
    h('b', '', r, s.label);
    h('span', 'rung-t', r, s.time);
  }
}

/**
 * Where a scroller must scroll to show an item whole: its `top` and `height` measured from the top of the
 * scroller's content, `margin` kept clear above or below. null when it is in sight already. Pure.
 */
export function scrollToShow(scrollTop: number, viewH: number, top: number, height: number, margin = 0): number | null {
  const up = Math.max(0, top - margin);
  if (up < scrollTop) return up;
  const down = top + height + margin - viewH;
  // taller than the view: its top wins
  return down > scrollTop ? Math.min(up, down) : null;
}

/** `atMs`: when the first star pops in (each next one 180 ms on) */
function starSvg(on: boolean, i: number, atMs = 600): string {
  return `<svg class="star${on ? ' on' : ''}" style="--delay:${atMs + i * 180}ms" viewBox="-2 -2 28 28" aria-hidden="true"><path d="${SHAPE_PATHS.star}"/></svg>`;
}

export class ResultsView implements ScreenView {
  readonly root: HTMLElement;
  readonly buttons = new Map<string, HTMLElement>();
  constructor(parent: HTMLElement) {
    this.root = h('section', 'screen results', parent);
    this.root.setAttribute('aria-label', 'Results');
  }

  /** The panel: everything but the buttons scrolls inside it, so it never runs off the screen. */
  /** `label`: the screen's name for assistive tech (the results, the standings, the cut); `n`: how many rows
   *  (more than four sit in two columns on a phone on its side, ui.css, so all eight fit); `lagMs`: the
   *  results over the finish wait this long for FINISH! to leave (UI.finishLagMs): the stage (ui.css) and
   *  everything that comes in with it */
  private frame(headline: string, sub: string, label = 'Results', n = 0, lagMs = 0): { box: HTMLElement; head: HTMLElement; body: HTMLElement; rows: HTMLElement } {
    clear(this.root);
    this.buttons.clear();
    this.root.setAttribute('aria-label', label);
    const st = stage(this.root);
    if (lagMs) st.style.setProperty('--lag', `${lagMs}ms`);
    const box = h('div', 'panel box enter', st);
    if (lagMs) delay(box, lagMs);
    const body = h('div', 'scroll', box);
    const head = h('div', 'res-head', body);
    const words = h('div', 'res-words', head);
    h('h2', '', words, headline);
    h('div', 'sub', words, sub);
    const rows = h('div', n > 4 ? 'rows many' : 'rows', body);
    if (n > 4) rows.style.setProperty('--half', String(Math.ceil(n / 2)));
    rows.setAttribute('role', 'table');
    return { box, head, body, rows };
  }

  /**
   * The player's own row in sight inside the panel (a phone on its side showed the standings from the
   * top, the player 7th below the fold). Only the panel scrolls; a row already in sight stays put.
   */
  revealPlayer(): void {
    const sc = this.root.querySelector<HTMLElement>('.stage > .box > .scroll');
    const me = sc?.querySelector<HTMLElement>('.row.me');
    if (!sc || !me) return;
    // (rects: the stage's slide in is sideways, so the heights and tops are as laid out)
    const r = me.getBoundingClientRect();
    const to = scrollToShow(sc.scrollTop, sc.clientHeight, r.top - sc.getBoundingClientRect().top + sc.scrollTop, r.height, 12);
    if (to !== null) sc.scrollTop = to;
  }

  /**
   * The buttons, under the scrolling part: always in sight. Row by row as the end menu sets them (the first
   * row the main ones, bigger; ui.css sets them in one line in a short window, UI.endOneLineQuery, and
   * UiRoot's focus grid follows); a plain label is the one Continue.
   */
  private actions(box: HTMLElement, end: string | EndMenuVM): void {
    const vm: EndMenuVM = typeof end === 'string' ? { rows: [[{ id: 'continue', label: end }]] } : end;
    const a = h('div', 'actions', box);
    vm.rows.forEach((row, i) => {
      const r = h('div', i === 0 ? 'act-row main' : 'act-row', a);
      for (const e of row) {
        const b = button(r, e.id, e.sub ? 'btn has-sub' : 'btn');
        h('span', 'label', b, e.label);
        if (e.sub) h('span', 'sub', b, e.sub);
        this.buttons.set(e.id, b);
      }
    });
  }

  private board: { list: HTMLElement; sub: HTMLElement; note: HTMLElement; btn: HTMLElement; status: HTMLElement; input: HTMLInputElement } | null = null;

  /** What the player typed in the name box ('' when there is no board on screen). */
  get nameValue(): string { return this.board?.input.value ?? ''; }

  /** Only the board's contents change: the name box and its caret are never rebuilt. */
  updateBoard(vm: BoardVM): void {
    const b = this.board;
    if (!b) return;
    b.sub.textContent = vm.sub;
    b.note.textContent = vm.note;
    b.note.hidden = !vm.note;
    clear(b.list);
    this.buttons.delete('retry');
    if (vm.state !== 'rows') h('div', 'board-empty', b.list, vm.state === 'loading' ? 'Loading the best times…' : vm.state === 'offline' ? 'Could not load the times.' : 'No times yet. Be the first!');
    if (vm.retry) {
      // the board could not be read: read it again (UiRoot re-reads on 'retry')
      const r = button(b.list, 'retry', 'btn retry-btn');
      h('span', 'label', r, 'Try again');
      this.buttons.set('retry', r);
    }
    for (const r of vm.rows) {
      const e = h('div', `board-row${r.me ? ' me' : ''}`, b.list);
      e.style.setProperty('--accent', r.accent);
      h('span', 'rk', e, r.rank);
      face(e, r.racerId);
      h('span', 'nm', e, r.name);
      h('span', 'rc', e, r.racer);
      h('span', 'tm', e, r.time);
      asRow(e);
    }
    (b.btn.querySelector('.label') as HTMLElement).textContent = vm.button;
    b.btn.setAttribute('aria-disabled', vm.buttonDisabled ? 'true' : 'false');
    b.status.textContent = vm.status;
    b.status.dataset.kind = vm.statusKind;
  }

  /** `suggested`: the name is ours, not the player's: the first focus selects it, so typing replaces it */
  private buildBoard(parent: HTMLElement, name: string, suggested = false): void {
    const sec = h('section', 'board', parent);
    sec.setAttribute('aria-label', 'Leaderboard');
    h('h3', '', sec, 'Leaderboard');
    const sub = h('div', 'board-sub', sec);
    const note = h('div', 'board-note', sec);
    note.hidden = true;
    // the name box comes before the times, so on a short screen it shows without scrolling
    const form = h('div', 'board-form', sec);
    const input = h('input', 'name-input', form);
    input.type = 'text';
    input.maxLength = 16;
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.placeholder = 'Your name';
    input.value = name;
    if (suggested) input.addEventListener('focus', () => input.select(), { once: true });
    input.dataset.id = 'name';
    input.tabIndex = -1;
    input.setAttribute('aria-label', 'Your name for the leaderboard, 1 to 16 letters, digits, spaces, underscores or dashes');
    const btn = button(form, 'post');
    h('span', 'label', btn, 'Post my time');
    const status = h('div', 'board-status', sec);
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    const list = h('div', 'board-list', sec);
    list.setAttribute('role', 'table');
    this.buttons.set('name', input);
    this.buttons.set('post', btn);
    this.board = { list, sub, note, btn, status, input };
  }

  /** `end`: the buttons (a plain label: the one Continue); `lagMs`: coming in over the race's finish, the wait for FINISH! to leave (UI.finishLagMs) */
  renderResults(vm: ResultsVM, end: string | EndMenuVM, board?: { name: string; suggested?: boolean }, lagMs = 0): void {
    this.board = null;
    const { box, head, body, rows } = this.frame(vm.headline, vm.sub, 'Results', vm.rows.length, lagMs);
    // a Time Trial's medal: its badge by the headline (which names it)
    if (vm.medal && vm.medal.won !== 'none') {
      const m = h('div', 'res-medal');
      m.innerHTML = medalSvg(vm.medal.won, 76);
      head.prepend(m);
    }
    // a Time Trial against the best it raced: "−1.37" in green by "New best!", "+0.85" in red on a slower run
    if (vm.delta) {
      const d = h('span', `res-delta ${vm.delta.ahead ? 'ahead' : 'behind'}`, null, vm.delta.text);
      d.setAttribute('aria-label', vm.delta.words);
      delay(d, lagMs);
      head.querySelector('h2')?.after(d);
    }
    vm.rows.forEach((r, i) => {
      const e = h('div', `row${r.player ? ' me' : ''}${r.dnf ? ' dnf' : ''} r${i + 1}`, rows);
      delay(e, lagMs + r.delayMs);
      e.style.setProperty('--accent', r.accent);
      h('span', 'rk', e, r.rank);
      face(e, r.racerId);
      h('span', 'nm', e, r.name + (r.player ? ' (you)' : ''));
      h('span', 'tm', e, r.time);
      h('span', 'gp', e, r.gap);
      asRow(e);
    });
    if (vm.playerLaps.length) {
      const laps = h('div', 'laps', body);
      for (const l of vm.playerLaps) h('span', l.best ? 'best' : '', laps, `Lap ${l.lap} ${l.time}`);
    }
    if (vm.medal) medalLadder(body, vm.medal);
    if (board) this.buildBoard(body, board.name, board.suggested);
    this.actions(box, end);
  }

  /**
   * The Grand Prix standings, played as Mario Kart World plays them (`play`): the rows come in as they stood
   * before the race, each total with the points just won beside it; the totals count up; then, one place
   * after another down the list, each place that changes hands flips over to the racer who holds it now,
   * with an arrow for how they moved. All of it is CSS animation on the times set here (ui.css "Grand Prix
   * standings"); the table under it is the new order from the start, as assistive tech reads it. Without
   * `play` (reduced motion, or drawn again) it is the new order as it ends.
   */
  renderGp(vm: GpVM, next: string, play = true): void {
    this.board = null;
    const { box, head, rows } = this.frame(vm.headline, vm.sub, 'Grand Prix standings', vm.rows.length);
    // no arrows after the first race: there were no standings before it
    const moves = vm.rows.some((r) => r.moved !== null);
    rows.classList.add('standings');
    rows.classList.toggle('moves', moves);
    rows.classList.toggle('play', play);
    const countAt = UI.standingsCountAtMs;
    const flipAt = (k: number) => countAt + UI.countUpMs + UI.standingsFlipGapMs + k * UI.flipStaggerMs;
    vm.rows.forEach((r, k) => {
      // who held this place before the race: a place that changes hands turns over to the racer holding it now
      const was = vm.rows[vm.before[k]] ?? r;
      const flips = play && was !== r;
      const e = h('div', `row${r.player ? ' me' : ''}${flips ? ' flip' : ''} r${k + 1}`, rows);
      delay(e, r.delayMs);
      e.style.setProperty('--accent', r.accent);
      e.style.setProperty('--count-at', `${countAt}ms`);
      e.style.setProperty('--flip-at', `${flipAt(k)}ms`);
      standing(e, r, moves, play && !flips);
      if (flips) {
        // the one who held it, on top until the row turns over (the row itself is the standing now)
        const w = h('div', `was${was.player ? ' me' : ''}`, e);
        w.setAttribute('aria-hidden', 'true');
        w.style.setProperty('--accent', was.accent);
        standing(w, { ...was, rank: r.rank }, moves, true, false);
      }
      asRow(e);
    });
    if (vm.done) {
      // the player's stars at the end of the headline's row, once the rows have settled
      const s = h('div', 'stars', head);
      const at = play ? flipAt(vm.rows.length - 1) + UI.flipMs : undefined;
      s.innerHTML = [0, 1, 2].map((i) => starSvg(i < vm.stars, i, at)).join('');
      s.setAttribute('role', 'img');
      s.setAttribute('aria-label', `${vm.stars} of 3 stars`);
    }
    this.actions(box, next);
  }

  /**
   * The Knockout cut. A dashed coral line labeled CUT runs across the list under the last racer who goes
   * through (`vm.cutAt`), over the first who is out, so the cut reads at a glance; it draws in once the rows
   * are in (ui.css `.cut-above`, on the row: in two columns on a phone on its side, a separate element
   * would take a cell). The THROUGH and OUT on every row say it in words.
   */
  renderCut(vm: CutVM, next: string): void {
    this.board = null;
    const { box, rows } = this.frame(vm.headline, vm.sub, 'Knockout results', vm.rows.length);
    rows.classList.add('cut');
    const drawAt = (vm.rows[vm.rows.length - 1]?.delayMs ?? 0) + UI.cutLineLagMs;
    vm.rows.forEach((r, i) => {
      const above = i === vm.cutAt - 1;
      const e = h('div', `row${r.player ? ' me' : ''}${r.out ? ' out' : ''}${above ? ' cut-above' : ''} r${i + 1}`, rows);
      delay(e, r.delayMs);
      if (above) e.style.setProperty('--cut-at', `${drawAt}ms`);
      e.style.setProperty('--accent', r.accent);
      h('span', 'rk', e, r.rank);
      face(e, r.racerId);
      h('span', 'nm', e, r.name + (r.player ? ' (you)' : ''));
      h('span', 'tm', e, r.out ? 'OUT' : r.winner ? 'WINNER' : 'THROUGH');
      h('span', 'gp', e, '');
      asRow(e);
    });
    this.actions(box, next);
  }
}
