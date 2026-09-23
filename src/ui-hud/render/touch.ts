// Touch controls for phones and tablets: a steering pad under the left thumb, and Drift, Item,
// Brake and Look-back buttons under the right. The gas is on by itself (let go of nothing), as in
// mobile kart games. Shown only on a coarse pointer, and only while racing. Multi-touch: every
// finger is tracked by its pointer id.
import { h } from './dom.ts';

export interface TouchInput { steer: number; throttle: number; brake: number; drift: boolean; item: boolean; lookBack: boolean }

type Button = 'drift' | 'item' | 'brake' | 'lookBack';

export class TouchControls {
  readonly root: HTMLElement;
  private readonly pad: HTMLElement;
  private readonly knob: HTMLElement;
  private readonly held = new Map<number, Button | 'pad'>();
  private steer = 0;
  private readonly down: Record<Button, number> = { drift: 0, item: 0, brake: 0, lookBack: 0 };
  /** true on a phone or tablet (a coarse pointer) */
  readonly enabled: boolean;
  private shown = false;

  constructor(parent: HTMLElement) {
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
    mk('lookBack', 'BACK');
    mk('drift', 'DRIFT');
    mk('brake', 'BRAKE');
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
      const b = t.closest('[data-touch]') as HTMLElement | null;
      if (t.closest('.pad')) { this.held.set(id, 'pad'); this.root.setPointerCapture?.(id); this.steerTo(e.clientX); }
      else if (b) { const k = b.dataset.touch as Button; this.held.set(id, k); this.down[k]++; b.classList.add('down'); }
      return;
    }
    const what = this.held.get(id);
    if (!what) return;
    if (e.type === 'pointermove') { if (what === 'pad') this.steerTo(e.clientX); return; }
    // up, cancel, lost
    this.held.delete(id);
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

  /** What the thumbs say this tick, or null when the touch controls are hidden. */
  state(): TouchInput | null {
    if (!this.shown) return null;
    const brake = this.down.brake > 0;
    return { steer: this.steer, throttle: brake ? 0 : 1, brake: brake ? 1 : 0, drift: this.down.drift > 0, item: this.down.item > 0, lookBack: this.down.lookBack > 0 };
  }
}
