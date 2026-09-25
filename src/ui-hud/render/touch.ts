// Touch controls for phones and tablets: a steering pad under the left thumb, and Drift, Item,
// Brake and Look-back buttons under the right, and a pause button up top. From the green light the
// gas is on by itself (let go of nothing), as in mobile kart games; before it, a finger anywhere on
// the screen is the gas, so thumbs down on the 2 make a rocket start, like the gas key. Shown only
// on a coarse pointer, and only while racing. Multi-touch: every finger is tracked by its pointer id.
import { h } from './dom.ts';

export interface TouchInput { steer: number; throttle: number; brake: number; drift: boolean; item: boolean; lookBack: boolean }

type Button = 'drift' | 'item' | 'brake' | 'lookBack';

export class TouchControls {
  readonly root: HTMLElement;
  private readonly pad: HTMLElement;
  private readonly knob: HTMLElement;
  /** every finger down, by pointer id: on the pad, a button, or anywhere else on the screen */
  private readonly held = new Map<number, Button | 'pad' | 'screen'>();
  private steer = 0;
  private readonly down: Record<Button, number> = { drift: 0, item: 0, brake: 0, lookBack: 0 };
  /** true on a phone or tablet (a coarse pointer) */
  readonly enabled: boolean;
  private shown = false;

  private readonly onPause: () => void;

  /** `onPause`: the pause button was tapped (a touch player has no Escape or Start) */
  constructor(parent: HTMLElement, onPause: () => void = () => {}) {
    this.onPause = onPause;
    this.enabled = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    this.root = h('div', 'touch', parent);
    this.root.setAttribute('aria-hidden', 'true');
    this.pad = h('div', 'pad', this.root);
    h('span', 'arrows', this.pad, '◀     ▶');
    this.knob = h('div', 'knob', this.pad);
    const right = h('div', 'buttons', this.root);
    const mk = (id: Button, label: string) => {
      const b = h('div', `tb ${id}`, right);
      b.dataset.touch = id;
      h('span', '', b, label);
    };
    mk('item', 'ITEM');
    mk('lookBack', 'LOOK'); // not BACK: beside BRAKE that reads as reverse
    mk('drift', 'DRIFT');
    mk('brake', 'BRAKE');
    const pause = h('div', 'tb pauseBtn', this.root);
    pause.dataset.pause = '';
    h('span', '', pause);
    for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'lostpointercapture'] as const) {
      this.root.addEventListener(ev, (e) => this.onPointer(e as PointerEvent));
    }
  }

  /** Show or hide (racing and not paused). Hidden, it reads as no input at all. */
  show(on: boolean): void {
    const want = on && this.enabled;
    if (want === this.shown) return;
    this.shown = want;
    this.root.classList.toggle('on', want);
    document.documentElement.dataset.touch = want ? 'on' : 'off';
    if (!want) this.reset();
  }

  private reset(): void {
    this.held.clear();
    this.steer = 0;
    for (const k of Object.keys(this.down) as Button[]) this.down[k] = 0;
    this.knob.style.transform = 'translateX(0)';
    for (const b of this.root.querySelectorAll('.tb')) b.classList.remove('down');
  }

  private onPointer(e: PointerEvent): void {
    e.preventDefault();
    const id = e.pointerId;
    if (e.type === 'pointerdown') {
      const t = e.target as HTMLElement;
      if (t.closest('[data-pause]')) { this.onPause(); return; }
      // a button's own attribute: <html data-touch="on"> matched too, so a tap off the buttons (the
      // countdown's gas) was held as a button called "on" and put a `down` class on the page (sweep)
      const b = t.closest('.tb[data-touch]') as HTMLElement | null;
      if (t.closest('.pad')) {
        this.held.set(id, 'pad');
        // a pointer already up when this runs has nothing to capture, and WebKit and Chromium throw
        // NotFoundError (sweep 25 Sept 2026): the thumb still steers, it just is not held past the pad
        try { this.root.setPointerCapture?.(id); } catch { /* nothing to capture */ }
        this.steerTo(e.clientX);
      }
      else if (b) { const k = b.dataset.touch as Button; this.held.set(id, k); this.down[k]++; b.classList.add('down'); }
      else this.held.set(id, 'screen');
      return;
    }
    const what = this.held.get(id);
    if (!what) return;
    if (e.type === 'pointermove') { if (what === 'pad') this.steerTo(e.clientX); return; }
    // up, cancel, lost
    this.held.delete(id);
    if (what === 'screen') return;
    if (what === 'pad') { this.steer = 0; this.knob.style.transform = 'translateX(0)'; return; }
    this.down[what] = Math.max(0, this.down[what] - 1);
    if (!this.down[what]) this.root.querySelector(`.tb.${what}`)?.classList.remove('down');
  }

  private steerTo(clientX: number): void {
    const r = this.pad.getBoundingClientRect();
    const half = r.width / 2;
    const x = Math.max(-1, Math.min(1, (clientX - (r.left + half)) / (half * 0.8)));
    // a little dead zone in the middle; left is positive steer (kart-controller sign)
    const k = Math.abs(x) < 0.08 ? 0 : x;
    this.steer = -k;
    this.knob.style.transform = `translateX(${(k * half * 0.8).toFixed(1)}px)`;
  }

  /** What the thumbs say this tick, or null when the touch controls are hidden. `countdown`: before
   *  the green light the gas is on only while a finger is down (the start boost times it, race-manager). */
  state(countdown = false): TouchInput | null {
    if (!this.shown) return null;
    const brake = this.down.brake > 0;
    const gas = !brake && (!countdown || this.held.size > 0);
    return { steer: this.steer, throttle: gas ? 1 : 0, brake: brake ? 1 : 0, drift: this.down.drift > 0, item: this.down.item > 0, lookBack: this.down.lookBack > 0 };
  }
}
