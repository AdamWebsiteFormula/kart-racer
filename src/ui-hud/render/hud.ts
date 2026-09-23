// The race HUD renderer: design §12 layout. Diffed writes only; the minimap redraws at 30 Hz.
import type { Minimap } from '../../track-builder/minimap.ts';
import { UI } from '../constants.ts';
import type { HudVM, ItemSlotVM } from '../hudModel.ts';
import { iconFor, iconSvg } from '../icons.ts';
import { outlineKey, type MinimapDot } from '../minimap.ts';
import { Attr, Flag, h, Markup, replay, TextField } from './dom.ts';

class SlotView {
  readonly root: HTMLElement;
  private state: Attr;
  private icon: Markup;
  private glyph: TextField;
  private charges: TextField;
  private label: Attr;
  private readonly size: number;
  constructor(parent: HTMLElement, next: boolean) {
    this.root = h('div', next ? 'slot next' : 'slot', parent);
    if (next) h('span', 'tag', this.root, 'NEXT');
    const ic = h('span', 'ic', this.root);
    this.icon = new Markup(ic);
    this.glyph = new TextField(h('span', 'glyph', this.root));
    this.charges = new TextField(h('span', 'charges', this.root));
    this.state = new Attr(this.root, 'data-state');
    this.label = new Attr(this.root, 'aria-label');
    this.size = next ? 44 : 72;
  }
  render(s: ItemSlotVM): void {
    this.state.set(s.state);
    this.icon.set(s.itemId ? iconSvg(s.itemId, this.size) : '');
    this.glyph.set(iconFor(s.itemId)?.glyph ?? '');
    this.charges.set(s.charges);
    this.label.set(s.state === 'ready' ? `Item: ${s.label} ${s.charges}`.trim() : s.state === 'rolling' ? 'Item: rolling' : 'Item: empty');
  }
}

export class MinimapView {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private road: HTMLCanvasElement;
  private roadKey = '';
  private px = 0;
  private lastDraw = -Infinity;
  constructor(parent: HTMLElement) {
    this.canvas = h('canvas', 'minimap', parent);
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', 'Track map');
    this.ctx = this.canvas.getContext('2d');
    this.road = document.createElement('canvas');
  }

  private ensureSize(): void {
    const dpr = Math.min(UI.minimapMaxDpr, globalThis.devicePixelRatio || 1);
    const css = this.canvas.clientWidth || 210;
    const px = Math.round(css * dpr);
    if (px === this.px) return;
    this.px = px;
    this.canvas.width = this.canvas.height = px;
    this.road.width = this.road.height = px;
    this.roadKey = '';
  }

  private strokeRoad(map: Minimap): void {
    const c = this.road.getContext('2d');
    if (!c) return;
    const s = this.px, pad = s * 0.08, span = s - 2 * pad;
    c.clearRect(0, 0, s, s);
    c.lineJoin = 'round';
    c.lineCap = 'round';
    for (const pass of [0, 1]) {
      for (const o of map.outlines) {
        if (!o.open) continue;
        // road = the centre between the edges, stroked fat: an outline pass then a fill pass
        c.beginPath();
        const n = o.left.length / 2;
        const last = o.branch === 0 ? n : n - 1; // the main line is a loop; a shortcut is not
        for (let i = 0; i <= last; i++) {
          const k = (i % n) * 2;
          const u = (o.left[k] + o.right[k]) / 2, v = (o.left[k + 1] + o.right[k + 1]) / 2;
          const x = pad + u * span, y = pad + v * span;
          if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
        }
        c.strokeStyle = pass === 0 ? '#1b1b2f' : o.branch === 0 ? '#fffaf0' : '#ffd23f';
        c.lineWidth = s * (pass === 0 ? 0.075 : 0.045);
        c.stroke();
      }
    }
  }

  /** Draws at most minimapHz times a second. `nowMs` is any monotonic clock. */
  render(map: Minimap, dots: readonly MinimapDot[], nowMs: number): void {
    if (!this.ctx) return;
    if (nowMs - this.lastDraw < 1000 / UI.minimapHz) return;
    this.lastDraw = nowMs;
    this.ensureSize();
    const key = outlineKey(map);
    if (key !== this.roadKey) { this.roadKey = key; this.strokeRoad(map); }
    const c = this.ctx, s = this.px, pad = s * 0.08, span = s - 2 * pad;
    const dpr = s / (this.canvas.clientWidth || 210);
    c.clearRect(0, 0, s, s);
    c.drawImage(this.road, 0, 0);
    for (const d of dots) {
      const x = pad + d.u * span, y = pad + d.v * span, r = d.radius * dpr;
      c.globalAlpha = d.dim ? 0.45 : 1;
      c.beginPath();
      c.arc(x, y, r + UI.dotStrokePx * dpr * 0.5, 0, Math.PI * 2);
      c.fillStyle = '#1b1b2f';
      c.fill();
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fillStyle = d.colour;
      c.fill();
      if (d.player) {
        c.lineWidth = UI.dotStrokePx * dpr;
        c.strokeStyle = '#fffaf0';
        c.stroke();
        c.beginPath();
        c.arc(x, y, r + 5 * dpr, 0, Math.PI * 2);
        c.lineWidth = 1.5 * dpr;
        c.strokeStyle = '#fffaf0';
        c.stroke();
      }
    }
    c.globalAlpha = 1;
  }
}

export class HudView {
  readonly root: HTMLElement;
  /** the HUD has nothing to focus */
  readonly buttons = new Map<string, HTMLElement>();
  readonly minimap: MinimapView;
  private held: SlotView;
  private next: SlotView;
  private timer: TextField;
  private ko: HTMLElement;
  private koText: TextField;
  private koDanger: Flag;
  private koShown: Flag;
  private place: HTMLElement;
  private placeN: TextField;
  private placeSuf: TextField;
  private placeP1: Flag;
  private coins: TextField;
  private coinsFull: Flag;
  private lapN: TextField;
  private lapOf: TextField;
  private lapFinal: Flag;
  private speed: TextField;
  private banner: HTMLElement;
  private bannerBig: TextField;
  private bannerSmall: TextField;
  private bannerKind: Attr;
  private lastBanner = '';
  private flash: Flag;
  private keysHint: Flag;
  private lastFlourish = false;

  constructor(parent: HTMLElement) {
    this.root = h('section', 'screen hud', parent);
    this.root.setAttribute('aria-label', 'Race');
    const tl = h('div', 'tl', this.root);
    this.held = new SlotView(tl, false);
    this.next = new SlotView(tl, true);

    const tc = h('div', 'tc', this.root);
    this.timer = new TextField(h('div', 'timer', tc));
    this.ko = h('div', 'ko-strip', tc);
    this.koText = new TextField(this.ko);
    this.koDanger = new Flag(this.ko, 'danger');
    this.koShown = new Flag(this.ko, 'sr-only');

    const bl = h('div', 'bl', this.root);
    this.place = h('div', 'place', bl);
    this.place.setAttribute('aria-label', 'Position');
    this.placeN = new TextField(h('span', 'n', this.place));
    this.placeSuf = new TextField(h('span', 'suf', this.place));
    this.placeP1 = new Flag(this.place, 'p1');
    const coins = h('div', 'coins', bl);
    h('span', 'coin', coins);
    this.coins = new TextField(h('span', '', coins));
    this.coinsFull = new Flag(coins, 'full');

    const br = h('div', 'br', this.root);
    this.minimap = new MinimapView(br);
    const lap = h('div', 'lap', br);
    h('span', 'word', lap, 'LAP');
    this.lapN = new TextField(h('span', '', lap));
    this.lapOf = new TextField(h('span', 'of', lap));
    this.lapFinal = new Flag(lap, 'final');

    const sp = h('div', 'speedo', this.root);
    this.speed = new TextField(h('span', '', sp));
    h('small', '', sp, ' km/h');

    this.banner = h('div', 'banner', this.root);
    this.banner.setAttribute('aria-live', 'polite');
    this.banner.setAttribute('role', 'status');
    this.bannerBig = new TextField(h('span', 'big display', this.banner));
    this.bannerSmall = new TextField(h('span', 'small', this.banner));
    this.bannerKind = new Attr(this.banner, 'data-kind');

    this.flash = new Flag(h('div', 'flash', this.root), 'on');
    this.keysHint = new Flag(h('div', 'keys-hint', this.root, 'W / ↑ go · A D / ← → steer · Shift / Space drift · E use item · S / ↓ brake · Esc pause'), 'on');
  }

  render(vm: HudVM): void {
    this.held.render(vm.held);
    this.next.render(vm.next);
    this.timer.set(vm.timer);
    this.koShown.set(vm.knockout === null);
    this.koText.set(vm.knockout?.text ?? '');
    this.koDanger.set(vm.knockout?.danger ?? false);
    this.placeN.set(vm.position.n);
    this.placeSuf.set(vm.position.suffix);
    this.placeP1.set(vm.position.n === '1');
    if (vm.flourish && !this.lastFlourish) replay(this.place, 'flourish');
    this.lastFlourish = vm.flourish;
    this.coins.set(vm.coins);
    this.coinsFull.set(vm.coinsFull);
    const [n, of] = vm.lap.split('/');
    this.lapN.set(n);
    this.lapOf.set(`/${of}`);
    this.lapFinal.set(vm.lapFinal);
    this.speed.set(vm.speed);
    const b = vm.banner;
    const key = b ? `${b.kind}|${b.text}|${b.sub}` : '';
    if (key !== this.lastBanner) {
      this.lastBanner = key;
      this.bannerBig.set(b?.text ?? '');
      this.bannerSmall.set(b?.sub ?? '');
      this.bannerKind.set(b?.kind ?? 'none');
      if (b) replay(this.banner, 'show'); else this.banner.classList.remove('show');
    }
    this.flash.set(vm.flash);
    this.keysHint.set(vm.keysHint);
  }
}
