// The Kart screen (design §5, §12; docs/plans/kart-combos.md §5; 26 Sept 2026, as Mario Kart World's vehicle
// select: render/select.ts): the ten karts on glass tiles, three across, each only its picture, rendered from
// our own 3D kart model (public/art/karts, scripts/headless/kart-icons.mjs; the SVG drawing under it until it
// loads) — a twin still locked shows as a dark shape with our padlock and how to earn it. Beside them the racer
// seated in the kart under the focus, large (the game draws it in `turntable`, the box left for it:
// game/showroom.ts), the kart's name big on a ribbon under it, and the stats only when the Stats button shows
// them. Built when what it shows changes; drawn again the same, it writes nothing.
import { UI } from '../constants.ts';
import { kartSvg, lockSvg } from '../icons.ts';
import { LOCKED_IN, type KartCardVM, type KartMenuVM } from '../screens/karts.ts';
import type { StatPanelVM } from '../screens/stats.ts';
import { button, clear, h, replay, TextField } from './dom.ts';
import { face, luminance, type ScreenView } from './screens.ts';
import { nameplate, promptBar, type Nameplate } from './select.ts';
import { StatPanel } from './statPanel.ts';

/** A kart's tile picture: the kart rendered from its 3D model in these colors (data/karts.ts kartArt). */
export const kartArtUrl = (art: string): string => `${import.meta.env.BASE_URL}art/karts/${art}.webp`;

/** What the hero shows: the kart under the focus, on the racer, and its bars over the chosen combo's. */
export interface KartPreview { kartId: string; name: string; colors: readonly [string, string]; locked: boolean; hint?: string; twin?: string; racerId: string; racerName: string; paintName?: string; panel: StatPanelVM }

/** A tile's words for assistive tech: the kart, whose, how it drives, locked or chosen, and its bars against the chosen one's. */
export function kartCardLabel(c: KartCardVM): string {
  const state = c.locked ? ` Locked: ${c.hint ?? ''}.` : c.chosen ? ' Your kart now.' : '';
  return `${c.name}, ${c.by}. ${c.line}.${state} ${c.words}.`;
}

export class KartView implements ScreenView {
  readonly root: HTMLElement;
  readonly buttons = new Map<string, HTMLElement>();
  /** the box the game draws the racer in the focused kart in, turning (main.ts drawStage), or null before the first render */
  turntable: HTMLElement | null = null;
  private panel: StatPanel | null = null;
  private plate: Nameplate | null = null;
  private plateName: TextField | null = null;
  private plateSub: TextField | null = null;
  private side: HTMLElement | null = null;
  private statsBtn: HTMLElement | null = null;
  private statsOn = false;
  /** what the last render drew (a render of the same draws nothing) */
  private drawn = '';
  private shownKart = '';
  /** the tile that played "Locked in!" (cleared when the screen is drawn again) */
  private lockedIn: string | null = null;

  constructor(parent: HTMLElement) {
    this.root = h('section', 'screen kart-screen select-screen', parent);
    this.root.setAttribute('aria-label', 'Pick your kart');
  }

  render(vm: KartMenuVM): void {
    const key = JSON.stringify([vm.racerId, vm.cards, vm.focus.rows[0]?.length]);
    if (this.lockedIn) { this.buttons.get(this.lockedIn)?.classList.remove('locked-in'); this.side?.classList.remove('locked-in'); this.lockedIn = null; }
    if (key === this.drawn) return;
    this.drawn = key;
    this.shownKart = '';
    clear(this.root);
    this.buttons.clear();
    h('div', 'dim', this.root);
    const st = h('div', 'stage select-stage', this.root);
    const head = h('div', 'stage-head', st);
    h('h2', 'heading display enter', head, vm.title);
    // who is picking, by the heading, where the hero has no room (select.css: a narrower screen)
    const who = h('div', 'kart-who enter', head);
    who.setAttribute('aria-hidden', 'true'); // the stats name them: "Pip in the Boss Roadster"
    face(who, vm.racerId);
    h('span', '', who, vm.racerName);
    const body = h('div', 'select-body', st);
    const grid = h('div', `select-grid kart-grid cols-${vm.focus.rows[0]?.length ?? 3}`, body);
    vm.cards.forEach((c, i) => this.card(grid, c, i));
    const side = h('div', 'select-side', body);
    this.side = side;
    this.panel = new StatPanel(side, 'select-stats');
    this.turntable = h('div', 'hero-box', side);
    this.turntable.setAttribute('aria-hidden', 'true');
    this.plate = nameplate(side, 'enter');
    this.plateName = new TextField(this.plate.name);
    this.plateSub = new TextField(this.plate.sub);
    this.statsBtn = promptBar(st, this.buttons);
    this.setStats(this.statsOn);
  }

  private card(grid: HTMLElement, c: KartCardVM, i: number): void {
    const b = button(grid, c.id, `tile kart-tile enter${c.locked ? ' locked' : ''}${c.chosen ? ' chosen' : ''}`);
    b.style.setProperty('--delay', `${i * UI.staggerRosterMs}ms`);
    b.style.setProperty('--kart-a', c.colors[0]);
    b.style.setProperty('--kart-b', c.colors[1]);
    // the glass is lit in the kart's color; a pale one (Sprocket's cream) in its other
    if (!c.locked) b.style.setProperty('--glow', luminance(c.colors[0]) > 0.6 ? c.colors[1] : c.colors[0]);
    // a locked twin takes the focus (it previews) but cannot be chosen: UiRoot refuses it
    if (c.locked) { b.setAttribute('aria-disabled', 'true'); b.dataset.locked = 'true'; }
    b.setAttribute('aria-label', kartCardLabel(c));
    const pic = h('span', 'kc-art', b);
    // our side-view drawing stands under the rendered picture until it loads (and if it never does, it stays)
    pic.innerHTML = kartSvg(c.id, c.colors[0], c.colors[1]);
    const img = h('img', 'art', pic);
    img.alt = '';
    img.draggable = false;
    img.decoding = 'async';
    img.src = kartArtUrl(c.art);
    img.addEventListener('error', () => img.remove(), { once: true });
    if (c.locked) {
      h('span', 'kc-lock', pic).innerHTML = lockSvg();
      const hint = h('span', 'kc-hint', b);
      h('span', 'lk', hint).innerHTML = lockSvg();
      hint.append(c.hint ?? '');
    }
    // the kart the racer is in now: a check in the corner (the label says it in words)
    if (c.chosen) h('span', 'kc-chosen', b, '✓').setAttribute('aria-hidden', 'true');
    h('span', 'kc-stamp', b, LOCKED_IN).setAttribute('aria-hidden', 'true');
    this.buttons.set(c.id, b);
  }

  /** The stats, shown or hidden (the Stats button: UiRoot.toggleStats). The hero makes room for them (the stage eases it). */
  setStats(on: boolean): void {
    this.statsOn = on;
    this.side?.classList.toggle('stats-on', on);
    this.statsBtn?.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (this.panel) this.panel.root.hidden = !on;
  }

  /** The kart under the focus on show: large in the hero (the stage), its name on the ribbon, its bars as a ghost over the chosen combo's. Writes only what changed. */
  preview(p: KartPreview): void {
    const plate = this.plate;
    if (!plate) return;
    const at = `${p.kartId}|${p.colors.join()}|${p.locked}`;
    if (this.shownKart !== at) {
      const swap = this.shownKart.split('|')[0] !== p.kartId;
      this.shownKart = at;
      plate.root.style.setProperty('--ribbon', p.locked ? '#8d8a99' : p.colors[0]);
      plate.root.classList.toggle('locked', p.locked);
      if (swap) replay(plate.root, 'swap');
      if (this.turntable) this.turntable.dataset.kart = p.kartId;
    }
    this.plateName?.set(p.name);
    // under the name: how to earn a locked twin, or what a twin is (its stats are another kart's); a racer's own kart needs no line (MKW names the vehicle alone)
    this.plateSub?.set(p.locked ? p.hint ?? '' : p.twin ?? '');
    this.panel?.render(p.panel, `${p.racerName} in the ${p.name}`);
  }

  /** A kart chosen: its tile plays the "Locked in!" pulse (UI.lockInMs) before the next screen comes. */
  lockIn(id: string): void {
    this.lockedIn = id;
    this.buttons.get(id)?.classList.add('locked-in');
    this.side?.classList.add('locked-in');
  }

  /** A locked twin refused: its tile shakes no (its hint says how to earn it). */
  refuse(id: string): void {
    const b = this.buttons.get(id);
    if (!b) return;
    b.classList.remove('refused');
    void b.offsetWidth; // one forced reflow, only on the press that is refused, to play the shake again
    b.classList.add('refused');
  }
}
