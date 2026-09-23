// One renderer per screen. Menus rebuild on show (they are small and off the race path);
// each exposes its focusable buttons by id so UiRoot can move the focus ring.
import { GAME_TAGLINE, GAME_TITLE, UI } from '../constants.ts';
import { SHAPE_PATHS } from '../icons.ts';
import type { CreditSection } from '../screens/credits.ts';
import type { CupVM, MenuVM, RosterVM, SettingRow } from '../screens/menus.ts';
import type { BoardVM, CutVM, GpVM, ResultsVM } from '../screens/results.ts';
import { button, clear, h } from './dom.ts';

export interface ScreenView {
  readonly root: HTMLElement;
  readonly buttons: Map<string, HTMLElement>;
}

const HINT = '<span><kbd>↑↓←→</kbd>move</span><span><kbd>Enter</kbd>pick</span><span><kbd>Esc</kbd>back</span>';

function stage(root: HTMLElement): HTMLElement {
  h('div', 'dim', root);
  return h('div', 'stage', root);
}

function hint(parent: HTMLElement, html = HINT): void {
  const e = h('div', 'hint', parent);
  e.innerHTML = html;
}

const delay = (e: HTMLElement, ms: number) => e.style.setProperty('--delay', `${ms}ms`);

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
    this.root.setAttribute('aria-label', 'Title');
  }
  render(vm: MenuVM): void {
    clear(this.root);
    this.buttons.clear();
    const st = stage(this.root);
    const logo = h('h1', 'logo', st);
    h('span', 'l1 display', logo, GAME_TITLE[0]);
    h('span', 'l2 display', logo, GAME_TITLE[1]);
    h('span', 'tag', logo, GAME_TAGLINE);
    const menu = h('div', 'menu', st);
    vm.entries.forEach((e, i) => {
      const b = button(menu, e.id);
      h('span', 'label', b, e.label);
      b.classList.add('enter');
      delay(b, 500 + i * 80);
      this.buttons.set(e.id, b);
    });
    h('div', 'press', st, 'Press Enter');
  }
}

export class ListView implements ScreenView {
  readonly root: HTMLElement;
  readonly buttons = new Map<string, HTMLElement>();
  constructor(parent: HTMLElement, cls: string, label: string) {
    this.root = h('section', `screen ${cls}`, parent);
    this.root.setAttribute('aria-label', label);
  }
  render(vm: MenuVM, icons: Record<string, string> = {}): void {
    clear(this.root);
    this.buttons.clear();
    const st = stage(this.root);
    h('h2', 'heading display enter', st, vm.title);
    const grid = h('div', 'modes', st);
    vm.entries.forEach((e, i) => {
      const b = button(grid, e.id);
      if (icons[e.id]) h('span', 'icon', b, icons[e.id]);
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

export class RosterView implements ScreenView {
  readonly root: HTMLElement;
  readonly buttons = new Map<string, HTMLElement>();
  constructor(parent: HTMLElement) {
    this.root = h('section', 'screen roster-screen', parent);
    this.root.setAttribute('aria-label', 'Pick your racer');
  }
  render(vm: RosterVM): void {
    clear(this.root);
    this.buttons.clear();
    const st = stage(this.root);
    h('h2', 'heading display enter', st, 'Pick your racer');
    const grid = h('div', 'roster', st);
    vm.cards.forEach((c, i) => {
      const b = button(grid, c.id, 'card enter');
      delay(b, i * UI.staggerRosterMs);
      b.style.setProperty('--accent', c.accent);
      b.style.setProperty('--secondary', c.secondary);
      // a pale accent (Sprocket's cream) vanishes on the bar track: use the other colour
      b.style.setProperty('--bar', luminance(c.accent) > 0.6 ? c.secondary : c.accent);
      b.setAttribute('aria-label', `${c.name}, ${c.archetype}. ${c.species}. ${c.personality}.`);
      h('span', 'cls', b, c.archetype);
      h('div', 'face', b, c.name[0]);
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
    const cls = h('div', 'classes', st);
    for (const e of vm.classes) {
      const b = button(cls, e.id);
      h('span', 'label', b, e.label);
      if (e.sub) h('span', 'sub', b, e.sub);
      if (e.badge) h('span', 'badge', b, e.badge);
      b.setAttribute('aria-pressed', e.badge ? 'true' : 'false');
      this.buttons.set(e.id, b);
    }
    hint(st);
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
    const st = stage(this.root);
    h('h2', 'heading display enter', st, vm.title);
    const grid = h('div', 'cups', st);
    vm.cups.forEach((c, i) => {
      const b = button(grid, c.id, 'btn cup enter');
      delay(b, i * 90);
      const row = h('div', 'cup-head', b);
      h('span', 'label', row, c.label);
      if (c.badge) h('span', 'badge', row, c.badge);
      if (c.sub) h('span', 'sub', b, c.sub);
      const tracks = h('div', 'tracks', b);
      for (const t of c.tracks) {
        const e = h('div', t.built ? 'trk' : 'trk soon', tracks);
        e.style.setProperty('--bg', t.bg);
        e.style.setProperty('--accent', t.accent);
        h('span', '', e, t.name);
        if (!t.built) h('span', 'soon-tag', e, 'Soon');
      }
      if (c.disabled) b.setAttribute('aria-disabled', 'true');
      this.buttons.set(c.id, b);
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

export class SettingsView implements ScreenView {
  readonly root: HTMLElement;
  readonly buttons = new Map<string, HTMLElement>();
  constructor(parent: HTMLElement) {
    this.root = h('section', 'screen overlay settings', parent);
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', 'Settings');
  }
  render(rows: SettingRow[]): void {
    clear(this.root);
    this.buttons.clear();
    h('div', 'dim', this.root);
    const box = h('div', 'panel box', this.root);
    h('h2', '', box, 'Settings');
    const list = h('div', 'list', box);
    for (const r of rows) {
      const b = button(list, r.id, 'btn setting');
      h('span', 'label', b, r.label);
      const val = h('span', 'val', b);
      h('span', 'arrow', val, '◀');
      if (r.fraction !== undefined) {
        const m = h('span', 'meter', val);
        h('i', '', m).style.width = `${Math.round(r.fraction * 100)}%`;
      }
      h('span', '', val, r.value);
      h('span', 'arrow', val, '▶');
      b.setAttribute('aria-label', `${r.label}: ${r.value}. Left and right change it.`);
      this.buttons.set(r.id, b);
    }
    const done = button(list, 'done');
    h('span', 'label', done, 'Done');
    this.buttons.set('done', done);
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
    h('div', 'dim', this.root);
    const box = h('div', 'panel box', this.root);
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
    h('p', 'made', box, 'An original game. Built for fun, with no Nintendo names, characters or assets.');
    const back = button(box, 'back');
    h('span', 'label', back, 'Back');
    back.style.marginTop = '16px';
    this.buttons.set('back', back);
  }
}

function starSvg(on: boolean, i: number): string {
  return `<svg class="star${on ? ' on' : ''}" style="--delay:${600 + i * 180}ms" viewBox="-2 -2 28 28" aria-hidden="true"><path d="${SHAPE_PATHS.star}"/></svg>`;
}

export class ResultsView implements ScreenView {
  readonly root: HTMLElement;
  readonly buttons = new Map<string, HTMLElement>();
  constructor(parent: HTMLElement) {
    this.root = h('section', 'screen results', parent);
    this.root.setAttribute('aria-label', 'Results');
  }

  private frame(headline: string, sub: string): { box: HTMLElement; rows: HTMLElement } {
    clear(this.root);
    this.buttons.clear();
    const st = stage(this.root);
    const box = h('div', 'panel box enter', st);
    h('h2', '', box, headline);
    h('div', 'sub', box, sub);
    const rows = h('div', 'rows', box);
    rows.setAttribute('role', 'table');
    return { box, rows };
  }

  private actions(box: HTMLElement, label: string): void {
    const a = h('div', 'actions', box);
    const b = button(a, 'continue');
    h('span', 'label', b, label);
    this.buttons.set('continue', b);
  }

  private board: { list: HTMLElement; sub: HTMLElement; btn: HTMLElement; status: HTMLElement; input: HTMLInputElement } | null = null;

  /** What the player typed in the name box ('' when there is no board on screen). */
  get nameValue(): string { return this.board?.input.value ?? ''; }

  /** Only the board's contents change: the name box and its caret are never rebuilt. */
  updateBoard(vm: BoardVM): void {
    const b = this.board;
    if (!b) return;
    b.sub.textContent = vm.sub;
    clear(b.list);
    if (vm.state !== 'rows') h('div', 'board-empty', b.list, vm.state === 'loading' ? 'Loading the best times…' : vm.state === 'offline' ? 'Leaderboard offline' : 'No times yet. Be the first!');
    for (const r of vm.rows) {
      const e = h('div', `board-row${r.me ? ' me' : ''}`, b.list);
      e.setAttribute('role', 'row');
      e.style.setProperty('--accent', r.accent);
      h('span', 'rk', e, r.rank);
      h('span', 'sw', e);
      h('span', 'nm', e, r.name);
      h('span', 'rc', e, r.racer);
      h('span', 'tm', e, r.time);
    }
    (b.btn.querySelector('.label') as HTMLElement).textContent = vm.button;
    b.btn.setAttribute('aria-disabled', vm.buttonDisabled ? 'true' : 'false');
    b.status.textContent = vm.status;
    b.status.dataset.kind = vm.statusKind;
  }

  private buildBoard(box: HTMLElement, name: string): void {
    const sec = h('section', 'board', box);
    sec.setAttribute('aria-label', 'Leaderboard');
    h('h3', '', sec, 'Leaderboard');
    const sub = h('div', 'board-sub', sec);
    const list = h('div', 'board-list', sec);
    list.setAttribute('role', 'table');
    const form = h('div', 'board-form', sec);
    const input = h('input', 'name-input', form);
    input.type = 'text';
    input.maxLength = 16;
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.placeholder = 'Your name';
    input.value = name;
    input.dataset.id = 'name';
    input.tabIndex = -1;
    input.setAttribute('aria-label', 'Your name for the leaderboard, 1 to 16 letters, digits, spaces, underscores or dashes');
    const btn = button(form, 'post');
    h('span', 'label', btn, 'Post my time');
    const status = h('div', 'board-status', sec);
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    this.buttons.set('name', input);
    this.buttons.set('post', btn);
    this.board = { list, sub, btn, status, input };
  }

  renderResults(vm: ResultsVM, next: string, board?: { name: string }): void {
    this.board = null;
    const { box, rows } = this.frame(vm.headline, vm.sub);
    vm.rows.forEach((r, i) => {
      const e = h('div', `row${r.player ? ' me' : ''}${r.dnf ? ' dnf' : ''} r${i + 1}`, rows);
      e.setAttribute('role', 'row');
      delay(e, r.delayMs);
      e.style.setProperty('--accent', r.accent);
      h('span', 'rk', e, r.rank);
      h('span', 'sw', e);
      h('span', 'nm', e, r.name + (r.player ? ' (you)' : ''));
      h('span', 'tm', e, r.time);
      h('span', 'gp', e, r.gap);
    });
    if (vm.playerLaps.length) {
      const laps = h('div', 'laps', box);
      for (const l of vm.playerLaps) h('span', l.best ? 'best' : '', laps, `Lap ${l.lap} ${l.time}`);
    }
    if (board) this.buildBoard(box, board.name);
    this.actions(box, next);
  }

  renderGp(vm: GpVM, next: string): void {
    this.board = null;
    const { box, rows } = this.frame(vm.headline, vm.sub);
    if (vm.done) {
      const s = h('div', 'stars', box);
      s.innerHTML = [0, 1, 2].map((i) => starSvg(i < vm.stars, i)).join('');
      s.setAttribute('aria-label', `${vm.stars} of 3 stars`);
      box.insertBefore(s, rows);
    }
    vm.rows.forEach((r, i) => {
      const e = h('div', `row${r.player ? ' me' : ''} r${i + 1}`, rows);
      delay(e, r.delayMs);
      e.style.setProperty('--accent', r.accent);
      h('span', 'rk', e, r.rank);
      h('span', 'sw', e);
      h('span', 'nm', e, r.name + (r.player ? ' (you)' : ''));
      h('span', 'tm', e, `${r.points} pts`);
      h('span', 'gp gained', e, r.gained ? `+${r.gained}` : '');
    });
    this.actions(box, next);
  }

  renderCut(vm: CutVM, next: string): void {
    this.board = null;
    const { box, rows } = this.frame(vm.headline, vm.sub);
    vm.rows.forEach((r, i) => {
      const e = h('div', `row${r.player ? ' me' : ''}${r.out ? ' out' : ''} r${i + 1}`, rows);
      delay(e, r.delayMs);
      e.style.setProperty('--accent', r.accent);
      h('span', 'rk', e, r.rank);
      h('span', 'sw', e);
      h('span', 'nm', e, r.name + (r.player ? ' (you)' : ''));
      h('span', 'tm', e, r.out ? 'OUT' : 'THROUGH');
      h('span', 'gp', e, '');
    });
    this.actions(box, next);
  }
}
