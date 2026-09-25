// The course intro's title card (screens/intro.ts), over the course while the camera flies it
// (game/intro.ts): on ink while the race's shaders compile ('hold'), over the flight ('show'), on its
// way out ('out') a beat before the countdown, then gone ('off'). The HUD waits under it (ui.ts).
import '../intro.css';
import type { IntroCardVM } from '../screens/intro.ts';
import { Attr, h, TextField } from './dom.ts';

export type IntroPhase = 'off' | 'hold' | 'show' | 'out';

export class IntroCardView {
  readonly root: HTMLElement;
  private readonly plate: HTMLElement;
  private readonly driver: HTMLElement;
  private readonly face: HTMLElement;
  private readonly cup: TextField;
  private readonly name: TextField;
  private readonly sub: TextField;
  private readonly who: TextField;
  private readonly skip: TextField;
  private readonly phaseAttr: Attr;
  private now: IntroPhase = 'off';

  constructor(parent: HTMLElement) {
    this.root = h('div', 'intro', parent);
    this.root.setAttribute('role', 'status');
    this.root.setAttribute('aria-live', 'polite');
    this.phaseAttr = new Attr(this.root, 'data-phase');
    this.phaseAttr.set('off');
    h('div', 'curtain', this.root);
    this.plate = h('div', 'plate', this.root);
    this.cup = new TextField(h('span', 'cup', this.plate));
    this.name = new TextField(h('span', 'name display', this.plate));
    this.sub = new TextField(h('span', 'sub', this.plate));
    this.driver = h('div', 'driver', this.root);
    this.face = h('span', 'face', this.driver);
    this.face.setAttribute('aria-hidden', 'true');
    this.who = new TextField(h('span', 'who', this.driver));
    this.skip = new TextField(h('div', 'skip', this.root));
  }

  get phase(): IntroPhase { return this.now; }

  /** A new race's card, from the top (in on ink: 'hold'). */
  show(vm: IntroCardVM): void {
    this.cup.set(vm.cup);
    this.name.set(vm.name);
    this.sub.set(vm.sub);
    this.skip.set(vm.skip);
    this.plate.style.setProperty('--track-bg', vm.bg);
    this.plate.style.setProperty('--track-accent', vm.accent);
    this.driver.style.display = vm.racer ? '' : 'none'; // (the stylesheet's display beats the hidden attribute)
    if (vm.racer) {
      this.who.set(vm.racer.name);
      this.driver.style.setProperty('--accent', vm.racer.accent);
      this.face.style.setProperty('--portrait', `url("${import.meta.env.BASE_URL}art/racers/${vm.racer.id}.webp")`);
    }
    // a card already up (a race started over it): off first, so its entrance plays again
    if (this.now !== 'off') { this.set('off'); void this.root.offsetWidth; }
    this.set('hold');
  }

  set(p: IntroPhase): void {
    if (p === this.now) return;
    this.now = p;
    this.phaseAttr.set(p);
  }
}
