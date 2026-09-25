// The podium ceremony's overlay (screens/podium.ts): no dim and no panel over the scene, so the 3D
// ceremony (game/podium.ts) shows through: the headline and the series at the top, the player's stars
// after a Grand Prix, and along the bottom the three places as they stand, the player's own place
// when it is off the podium, and Continue (the one focusable control).
import '../podium.css';
import { SHAPE_PATHS } from '../icons.ts';
import type { PodiumVM } from '../screens/podium.ts';
import { button, clear, h } from './dom.ts';
import type { ScreenView } from './screens.ts';

export class PodiumView implements ScreenView {
  readonly root: HTMLElement;
  readonly buttons = new Map<string, HTMLElement>();

  constructor(parent: HTMLElement) {
    this.root = h('section', 'screen podium', parent);
    this.root.setAttribute('aria-label', 'Podium');
  }

  render(vm: PodiumVM): void {
    clear(this.root);
    this.buttons.clear();
    const top = h('div', 'podium-top', this.root);
    h('h2', 'podium-head', top, vm.headline);
    // the series and the player's stars on one row under it, clear of the cup the camera shows above the winner
    const meta = h('div', 'podium-meta', top);
    h('div', 'podium-sub', meta, vm.sub);
    if (vm.stars !== null) {
      const s = h('div', 'stars podium-stars', meta);
      s.innerHTML = [0, 1, 2].map((i) => `<svg class="star${i < vm.stars! ? ' on' : ''}" viewBox="-2 -2 28 28" aria-hidden="true"><path d="${SHAPE_PATHS.star}"/></svg>`).join('');
      s.querySelectorAll<SVGElement>('svg').forEach((e, i) => e.style.setProperty('--delay', `${1500 + i * 180}ms`));
      s.setAttribute('role', 'img');
      s.setAttribute('aria-label', `${vm.stars} of 3 stars`);
    }
    const bar = h('div', 'podium-bar', this.root);
    const list = h('ul', 'podium-places', bar);
    list.setAttribute('aria-label', `Podium: ${[...vm.places].sort((a, b) => a.place - b.place).map((p) => `${p.label} ${p.name}`).join(', ')}`);
    for (const p of vm.places) {
      const li = h('li', `podium-place p${p.place}${p.player ? ' me' : ''}`, list);
      li.style.setProperty('--accent', p.accent);
      h('span', 'rk', li, p.label);
      h('span', 'sw', li);
      h('span', 'nm', li, p.name + (p.player ? ' (you)' : ''));
    }
    if (vm.mine) h('div', 'podium-mine', bar, vm.mine);
    const b = button(bar, 'continue');
    h('span', 'label', b, 'Continue');
    this.buttons.set('continue', b);
  }
}
