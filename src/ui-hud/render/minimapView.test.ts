// @vitest-environment jsdom
// The minimap's faces (25 Sept 2026): each racer drawn as their round portrait once its art is in, the
// colored dot until then; the player's bigger, white-ringed and last; a finished kart dimmed; each face cut
// once and reused. jsdom has no canvas, so a stand-in context records what is drawn, one per canvas.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Minimap } from '../../track-builder/minimap.ts';
import { UI } from '../constants.ts';
import type { MinimapDot } from '../minimap.ts';
import { MinimapView } from './hud.ts';

interface Op { op: string; args: unknown[]; alpha: number; fill: unknown }
type Recorder = CanvasRenderingContext2D & { ops: Op[] };

function recorder(): Recorder {
  const ops: Op[] = [];
  const ctx: Record<string, unknown> = { ops, globalAlpha: 1, fillStyle: '' };
  for (const op of ['clearRect', 'drawImage', 'beginPath', 'arc', 'fill', 'stroke', 'moveTo', 'lineTo', 'save', 'restore', 'clip']) {
    ctx[op] = (...args: unknown[]) => { ops.push({ op, args, alpha: ctx.globalAlpha as number, fill: ctx.fillStyle }); };
  }
  return ctx as unknown as Recorder;
}

const contexts = new Map<HTMLCanvasElement, Recorder>();
let artIn = false;
const map = { outlines: [], toMinimap: () => [0, 0] } as unknown as Minimap;
const dot = (racerId: string, u: number, over: Partial<MinimapDot> = {}): MinimapDot =>
  ({ u, v: 0.5, racerId, colour: '#123456', radius: UI.aiDotPx, player: false, dim: false, rank: 2, ...over });
// back to front as minimapDots paints them: a rival, a finished rival, someone with no art, the player
const dots = [dot('momo', 0.2), dot('nova', 0.4, { dim: true }), dot('k9', 0.5), dot('pip', 0.6, { player: true, radius: UI.playerDotPx })];
const drawn = (r: Recorder, op: string) => r.ops.filter((o) => o.op === op);

beforeEach(() => {
  contexts.clear();
  artIn = false;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    let r = contexts.get(this);
    if (!r) { r = recorder(); contexts.set(this, r); }
    return r;
  } as never);
  vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
  vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockImplementation(() => (artIn ? 512 : 0));
  vi.spyOn(HTMLImageElement.prototype, 'naturalHeight', 'get').mockImplementation(() => (artIn ? 512 : 0));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

describe('minimap faces', () => {
  it('draws the colored dots until the art is in, then each racer as a face (the player last and bigger, a finished kart dimmed)', () => {
    const v = new MinimapView(document.body);
    v.render(map, dots, 0);
    const main = contexts.get(v.canvas)!;
    expect(drawn(main, 'drawImage').length).toBe(1); // the road layer, no face yet
    expect(drawn(main, 'arc').length).toBe(2 * dots.length + 1); // rim and dot each, and the player's halo

    artIn = true;
    main.ops.length = 0;
    v.render(map, dots, 1000);
    const faces = drawn(main, 'drawImage').slice(1);
    // k9 is no cast member: no art to ask for, so its dot (rim and fill)
    expect(faces.length).toBe(3);
    expect(drawn(main, 'arc').length).toBe(2);
    const [momo, nova, pip] = faces.map((f) => f.args[0] as HTMLCanvasElement);
    // jsdom lays nothing out: the map's own 210 px, at 1x
    expect(momo.width).toBe(Math.round(210 * UI.minimapFace));
    expect(pip.width).toBe(Math.round(210 * UI.minimapPlayerFace));
    expect(faces.map((f) => f.alpha)).toEqual([1, 0.45, 1]);
    // centred on the kart: pad 8 %, the rest the course
    const pad = 210 * 0.08, span = 210 - 2 * pad;
    expect((faces[2].args[1] as number) + pip.width / 2).toBeCloseTo(pad + 0.6 * span);
    expect((faces[2].args[2] as number) + pip.height / 2).toBeCloseTo(pad + 0.5 * span);

    // each face: an ink rim, a ring (the racer's color, the player's white), and the art clipped round
    const cut = (c: HTMLCanvasElement) => contexts.get(c)!;
    expect(drawn(cut(momo), 'fill').map((o) => o.fill)).toEqual(['#1b1b2f', '#123456']);
    expect(drawn(cut(pip), 'fill').map((o) => o.fill)).toEqual(['#1b1b2f', '#fffaf0']);
    expect(drawn(cut(pip), 'clip').length).toBe(1);
    expect((drawn(cut(pip), 'drawImage')[0].args[0] as HTMLImageElement).src).toContain('art/racers/pip.webp');

    // cut once: the next frames draw the same faces
    main.ops.length = 0;
    v.render(map, dots, 2000);
    const again = drawn(main, 'drawImage').slice(1).map((f) => f.args[0]);
    expect(again[0]).toBe(momo);
    expect(again[1]).toBe(nova);
    expect(again[2]).toBe(pip);
  });

  it('redraws at 30 Hz at most, and cuts the faces again when the map changes size', () => {
    artIn = true;
    const v = new MinimapView(document.body);
    v.render(map, dots, 0);
    const main = contexts.get(v.canvas)!;
    const before = drawn(main, 'drawImage').at(-1)!.args[0] as HTMLCanvasElement;
    main.ops.length = 0;
    v.render(map, dots, 1000 / UI.minimapHz - 1);
    expect(main.ops.length).toBe(0);
    vi.stubGlobal('devicePixelRatio', 2);
    v.render(map, dots, 1000);
    const after = drawn(main, 'drawImage').at(-1)!.args[0] as HTMLCanvasElement;
    expect(after).not.toBe(before);
    expect(after.width).toBe(Math.round(210 * UI.minimapPlayerFace * 2));
  });
});
