// The race HUD renderer: design §12 layout. Diffed writes only; the minimap redraws at 30 Hz.
import type { Minimap } from '../../track-builder/minimap.ts';
import { UI } from '../constants.ts';
import { castCard } from '../data/cast.ts';
import { CONTROLS_STRIP, SKIP_PROMPTS, type HudVM, type ItemSlotVM } from '../hudModel.ts';
import { iconFor, iconMarkup, medalSvg, wheelSvg } from '../icons.ts';
import { medalLabel } from '../screens/menus.ts';
import { outlineKey, type MinimapDot } from '../minimap.ts';
import { Attr, clear, Flag, h, Markup, replay, TextField } from './dom.ts';

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
    this.root.setAttribute('role', 'img'); // an icon: its aria-label (below) is its name
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
    this.icon.set(s.itemId ? iconMarkup(s.itemId, this.size) : '');
    this.glyph.set(iconFor(s.itemId)?.glyph ?? '');
    this.charges.set(s.charges);
    this.label.set(s.state === 'ready' ? `Item: ${s.label} ${s.charges}`.trim() : s.state === 'trailing' ? `Item: ${s.label}, held behind you`
      : s.state === 'active' ? `Item: ${s.label} running` : s.state === 'rolling' ? 'Item: rolling' : 'Item: empty');
  }
}

const INK = '#1b1b2f';
const TAU = Math.PI * 2;

/**
 * The racers' concept art (public/art/racers, the roster cards' pictures), asked for once for every race
 * to come. Null until it has loaded, and for anyone not in the cast: the map draws their dot meanwhile.
 */
const FACE_ART = new Map<string, HTMLImageElement>();
function faceArt(racerId: string): HTMLImageElement | null {
  let img = FACE_ART.get(racerId);
  if (!img) {
    if (!castCard(racerId)) return null;
    img = new Image();
    img.decoding = 'async';
    img.src = `${import.meta.env.BASE_URL}art/racers/${racerId}.webp`;
    FACE_ART.set(racerId, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

/** A map marker: the head at `crop` in `art` cut round, `size` px across, in a `ring` px ring of `colour` over an ink rim. Drawn once per racer and size. */
function faceSprite(art: HTMLImageElement, crop: readonly [number, number, number], size: number, colour: string, ring: number, rim: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const c = cv.getContext('2d');
  if (!c) return cv;
  const r = size / 2, face = r - rim - ring;
  c.beginPath();
  c.arc(r, r, r, 0, TAU);
  c.fillStyle = INK;
  c.fill();
  c.beginPath();
  c.arc(r, r, r - rim, 0, TAU);
  c.fillStyle = colour;
  c.fill();
  c.save();
  c.beginPath();
  c.arc(r, r, face, 0, TAU);
  c.clip();
  c.imageSmoothingQuality = 'high';
  const w = art.naturalWidth, [x, y, cr] = crop;
  c.drawImage(art, (x - cr) * w, y * art.naturalHeight - cr * w, 2 * cr * w, 2 * cr * w, r - face, r - face, 2 * face, 2 * face);
  c.restore();
  return cv;
}

export class MinimapView {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private road: HTMLCanvasElement;
  private roadKey = '';
  private px = 0;
  private css = 0;
  private lastDraw = -Infinity;
  /** each racer's face at this map's size, cut once its art is in (by racer id): the rivals', the player's */
  private faces = new Map<string, HTMLCanvasElement>();
  private playerFaces = new Map<string, HTMLCanvasElement>();
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
    if (px === this.px && css === this.css) return;
    this.px = px;
    this.css = css;
    this.canvas.width = this.canvas.height = px;
    this.road.width = this.road.height = px;
    this.roadKey = '';
    this.faces.clear();
    this.playerFaces.clear();
  }

  /** `d`'s face at this map's size (the player's bigger and ringed in white), or null until its art is in */
  private face(d: MinimapDot, dpr: number): HTMLCanvasElement | null {
    const cut = d.player ? this.playerFaces : this.faces;
    const hit = cut.get(d.racerId);
    if (hit) return hit;
    const art = faceArt(d.racerId);
    const crop = art && castCard(d.racerId)?.face;
    if (!art || !crop) return null;
    const across = Math.max(UI.minimapFaceMinPx, this.css * (d.player ? UI.minimapPlayerFace : UI.minimapFace));
    const sprite = faceSprite(art, crop, Math.round(across * dpr), d.player ? '#fffaf0' : d.colour,
      (d.player ? UI.minimapPlayerRingPx : UI.minimapRingPx) * dpr, UI.minimapRimPx * dpr);
    cut.set(d.racerId, sprite);
    return sprite;
  }

  private strokeRoad(map: Minimap): void {
    const c = this.road.getContext('2d');
    if (!c) return;
    const s = this.px, pad = s * 0.08, span = s - 2 * pad;
    c.clearRect(0, 0, s, s);
    c.lineJoin = 'round';
    c.lineCap = 'round';
    for (const pass of [0, 1]) {
      // no box behind the map (MKW has none): the ink outline casts a soft shadow, so the course
      // stands off a bright scene (snow, sand) as well as a dark one
      c.shadowColor = pass === 0 ? 'rgba(27, 27, 47, 0.45)' : 'transparent';
      c.shadowBlur = s * 0.03;
      c.shadowOffsetY = s * 0.015;
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
        c.strokeStyle = pass === 0 ? INK : o.branch === 0 ? '#fffaf0' : '#ffd23f';
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
    const dpr = s / this.css;
    c.clearRect(0, 0, s, s);
    c.drawImage(this.road, 0, 0);
    // each racer as their face (MKW's minimap): in paint order, so the leaders sit on the pack and the
    // player on everyone; a kart over the line dimmed
    for (const d of dots) {
      const x = pad + d.u * span, y = pad + d.v * span, r = d.radius * dpr;
      c.globalAlpha = d.dim ? 0.45 : 1;
      const face = this.face(d, dpr);
      if (face) { c.drawImage(face, x - face.width / 2, y - face.height / 2); continue; }
      // the art not in yet: the racer's dot
      c.beginPath();
      c.arc(x, y, r + UI.dotStrokePx * dpr * 0.5, 0, TAU);
      c.fillStyle = INK;
      c.fill();
      c.beginPath();
      c.arc(x, y, r, 0, TAU);
      c.fillStyle = d.colour;
      c.fill();
      if (d.player) {
        c.lineWidth = UI.dotStrokePx * dpr;
        c.strokeStyle = '#fffaf0';
        c.stroke();
        c.beginPath();
        c.arc(x, y, r + 5 * dpr, 0, TAU);
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
  /** the numeral again for the stylesheet's outline and face layers (`content: attr(data-n)`) */
  private placeLayers: Attr;
  private placeSuf: TextField;
  private placeTier: Attr;
  private coins: TextField;
  private coinsFull: Flag;
  private lapN: TextField;
  private lapOf: TextField;
  private lapFinal: Flag;
  private mirror: Flag;
  private speed: TextField;
  private banner: HTMLElement;
  private bannerBig: TextField;
  private bannerSmall: TextField;
  private bannerKind: Attr;
  private bannerSkip: Flag;
  /** the finish prompt as the eyes see it: a pill at the foot of the screen */
  private skipPill: Flag;
  /** a Time Trial over the line: the medal its time won, under FINISH! */
  private medalIcon: Markup;
  private medalText: TextField;
  private medalOn: Flag;
  private lastBanner = '';
  private flash: Flag;
  private keysHint: Flag;
  /** the strip's two lines (keys, a pad's buttons): the gas's words follow Auto-accelerate */
  private stripKeys: TextField;
  private stripPad: TextField;
  /** Steering assist's badge by the speed readout: off, on, or lit while it turns the wheel */
  private assist: Attr;
  private lastFlourish = false;
  private readonly slots: HTMLElement;
  /** a solo run: no place numeral, the lap splits under the timer */
  private solo: Flag;
  private splits: HTMLElement;
  private splitsKey = '';
  /** the lap popped in the splits as last drawn (lap|delta; '' none) */
  private popKey = '';

  constructor(parent: HTMLElement) {
    this.root = h('section', 'screen hud', parent);
    this.root.setAttribute('aria-label', 'Race');
    const tl = h('div', 'tl', this.root);
    this.slots = tl;
    this.held = new SlotView(tl, false);
    this.next = new SlotView(tl, true);

    const tc = h('div', 'tc', this.root);
    this.timer = new TextField(h('div', 'timer', tc));
    this.splits = h('div', 'splits', tc);
    this.solo = new Flag(this.root, 'solo');

    // the place, the coin pill on its baseline, and a Knockout's goal right under the numeral, where the eye
    // goes for the place (Mario Kart World); it sat under the timer, a glance away from the place it is about
    const bl = h('div', 'bl', this.root);
    const pc = h('div', 'pc', bl);
    this.place = h('div', 'place', pc);
    this.place.setAttribute('aria-label', 'Position');
    const n = h('span', 'n', this.place);
    this.placeN = new TextField(n);
    this.placeLayers = new Attr(n, 'data-n');
    this.placeSuf = new TextField(h('span', 'suf', this.place));
    this.placeTier = new Attr(this.place, 'data-tier');
    const coins = h('div', 'coins', pc);
    h('span', 'coin', coins);
    this.coins = new TextField(h('span', '', coins));
    this.coinsFull = new Flag(coins, 'full');
    this.ko = h('div', 'ko-strip', bl);
    this.koText = new TextField(this.ko);
    this.koDanger = new Flag(this.ko, 'danger');
    this.koShown = new Flag(this.ko, 'sr-only');

    const br = h('div', 'br', this.root);
    this.minimap = new MinimapView(br);
    const lap = h('div', 'lap', br);
    h('span', 'word', lap, 'LAP');
    this.lapN = new TextField(h('span', '', lap));
    this.lapOf = new TextField(h('span', 'of', lap));
    this.lapFinal = new Flag(lap, 'final');
    this.mirror = new Flag(h('div', 'mirror-badge', br, 'MIRROR'), 'on');

    const sp = h('div', 'speedo', this.root);
    const wheel = h('span', 'assist', sp);
    wheel.innerHTML = wheelSvg();
    wheel.setAttribute('role', 'img');
    wheel.setAttribute('aria-label', 'Steering assist on');
    this.assist = new Attr(wheel, 'data-state');
    this.speed = new TextField(h('span', '', sp));
    h('small', '', sp, ' mph');

    this.banner = h('div', 'banner', this.root);
    this.banner.setAttribute('aria-live', 'polite');
    this.banner.setAttribute('role', 'status');
    this.bannerBig = new TextField(h('span', 'big display', this.banner));
    this.bannerSmall = new TextField(h('span', 'small', this.banner));
    this.bannerKind = new Attr(this.banner, 'data-kind');
    const medal = h('span', 'medal-won', this.banner);
    this.medalIcon = new Markup(h('span', 'mw-icon', medal));
    this.medalText = new TextField(h('span', 'mw-text', medal));
    this.medalOn = new Flag(medal, 'on');
    // over the line: how to go on to the results, in the last input's words (the stylesheet shows one). It
    // is drawn on a pill at the foot of the screen, under the kart the finish camera circles (small text
    // under FINISH! sat on the racer's hat); the banner keeps the words, so they are read out with it
    const prompt = (parent: HTMLElement, cls: string) => {
      const e = h('span', cls, parent);
      h('span', 'only-keys', e, SKIP_PROMPTS.keys);
      h('span', 'only-pad', e, SKIP_PROMPTS.pad);
      h('span', 'only-touch', e, SKIP_PROMPTS.touch);
      return e;
    };
    this.bannerSkip = new Flag(prompt(this.banner, 'skip sr-only'), 'on');
    const pill = prompt(this.root, 'finish-go');
    pill.setAttribute('aria-hidden', 'true');
    this.skipPill = new Flag(pill, 'on');

    this.flash = new Flag(h('div', 'flash', this.root), 'on');
    // the keys, or a gamepad's buttons once one is pressed (How to Play's Gamepad column)
    const keys = h('div', 'keys-hint', this.root);
    this.stripKeys = new TextField(h('span', 'only-keys', keys, CONTROLS_STRIP.keys));
    this.stripPad = new TextField(h('span', 'only-pad', keys, CONTROLS_STRIP.pad));
    this.keysHint = new Flag(keys, 'on');
  }

  render(vm: HudVM): void {
    // the stylesheet's display beats the hidden attribute, so hide by style
    const show = vm.items ? '' : 'none';
    if (this.slots.style.display !== show) this.slots.style.display = show;
    this.held.render(vm.held);
    this.next.render(vm.next);
    this.timer.set(vm.timer);
    this.koShown.set(vm.knockout === null);
    this.koText.set(vm.knockout?.text ?? '');
    this.koDanger.set(vm.knockout?.danger ?? false);
    this.placeN.set(vm.position.n);
    this.placeLayers.set(vm.position.n);
    this.placeSuf.set(vm.position.suffix);
    // the color rides the flourish: both change on the rank change's frame
    this.placeTier.set(vm.positionTier);
    this.solo.set(vm.solo);
    // the splits change once a lap: drawn again only then
    let laps = '';
    for (const s of vm.splits) laps += `${s.time}${s.best ? '*' : ''}|`;
    const drawn = laps !== this.splitsKey;
    if (drawn) {
      this.splitsKey = laps;
      clear(this.splits);
      for (const s of vm.splits) {
        const row = h('div', s.best ? 'split best' : 'split', this.splits);
        h('span', 'n', row, `Lap ${s.lap}`);
        h('span', 't', row, s.time);
        h('span', 'd', row);
      }
    }
    // the lap just run pops with the run against the best at its line (a class and a chip: the rows stay)
    const pop = vm.lapPop;
    const pk = pop ? `${pop.lap}|${pop.delta?.text ?? ''}` : '';
    if (drawn || pk !== this.popKey) {
      this.popKey = pk;
      [...this.splits.children].forEach((row, i) => {
        const on = pop !== null && i === pop.lap - 1, d = row.lastElementChild as HTMLElement;
        row.classList.toggle('pop', on);
        d.textContent = on ? pop.delta?.text ?? '' : '';
        d.dataset.kind = on && pop.delta ? (pop.delta.ahead ? 'ahead' : 'behind') : '';
      });
    }
    if (vm.flourish && !this.lastFlourish) replay(this.place, 'flourish');
    this.lastFlourish = vm.flourish;
    this.coins.set(vm.coins);
    this.coinsFull.set(vm.coinsFull);
    const [n, of] = vm.lap.split('/');
    this.lapN.set(n);
    this.lapOf.set(`/${of}`);
    this.lapFinal.set(vm.lapFinal);
    this.mirror.set(vm.mirrored);
    this.speed.set(vm.speed);
    const b = vm.banner;
    const key = b ? `${b.kind}|${b.text}|${b.sub}|${b.skip}` : '';
    if (key !== this.lastBanner) {
      this.lastBanner = key;
      this.bannerBig.set(b?.text ?? '');
      this.bannerSmall.set(b?.sub ?? '');
      this.bannerKind.set(b?.kind ?? 'none');
      this.bannerSkip.set(b?.skip ?? false);
      this.skipPill.set(b?.skip ?? false);
      if (b) replay(this.banner, 'show'); else this.banner.classList.remove('show');
    }
    this.medalIcon.set(vm.medal ? medalSvg(vm.medal, 64) : '');
    this.medalText.set(vm.medal ? `${medalLabel(vm.medal)} medal!` : '');
    this.medalOn.set(vm.medal !== null);
    this.flash.set(vm.flash);
    this.keysHint.set(vm.keysHint);
    this.stripKeys.set(vm.autoGas ? CONTROLS_STRIP.autoKeys : CONTROLS_STRIP.keys);
    this.stripPad.set(vm.autoGas ? CONTROLS_STRIP.autoPad : CONTROLS_STRIP.pad);
    this.assist.set(vm.steeringAssist);
  }
}
