import { describe, expect, it } from 'vitest';
import { AudioBus, busGains } from './bus.ts';
import { AUDIO } from './constants.ts';
import { PATCHES, patchSeconds, playPatch } from './sfx.ts';
import type { SfxId } from './types.ts';

// ---- a tiny fake Web Audio: records nodes, edges and parameter calls ----
class Param {
  value = 0;
  calls: [string, ...number[]][] = [];
  setValueAtTime(v: number, t: number) { this.calls.push(['set', v, t]); this.value = v; return this; }
  linearRampToValueAtTime(v: number, t: number) { this.calls.push(['lin', v, t]); return this; }
  exponentialRampToValueAtTime(v: number, t: number) { this.calls.push(['exp', v, t]); return this; }
  setTargetAtTime(v: number, t: number, k: number) { this.calls.push(['target', v, t, k]); this.value = v; return this; }
  cancelScheduledValues(t: number) { this.calls.push(['cancel', t]); return this; }
}
class Node_ {
  kind: string;
  out: Node_[] = [];
  constructor(kind: string) { this.kind = kind; }
  connect<T extends Node_>(n: T): T { this.out.push(n); return n; }
}
class FakeCtx {
  static last: FakeCtx | null = null;
  state: 'suspended' | 'running' = 'suspended';
  currentTime = 1;
  sampleRate = 8000;
  nodes: Node_[] = [];
  destination = new Node_('destination');
  constructor() { FakeCtx.last = this; }
  private mk<T extends Node_>(n: T): T { this.nodes.push(n); return n; }
  createGain() { return this.mk(Object.assign(new Node_('gain'), { gain: new Param() })); }
  createBiquadFilter() { return this.mk(Object.assign(new Node_('filter'), { type: '', frequency: new Param(), Q: new Param() })); }
  createDynamicsCompressor() { return this.mk(Object.assign(new Node_('comp'), { threshold: new Param(), knee: new Param(), ratio: new Param(), attack: new Param(), release: new Param() })); }
  createStereoPanner() { return this.mk(Object.assign(new Node_('pan'), { pan: new Param() })); }
  createOscillator() { return this.mk(Object.assign(new Node_('osc'), { type: '', frequency: new Param(), detune: new Param(), start() {}, stop() {} })); }
  createBufferSource() { return this.mk(Object.assign(new Node_('noise'), { buffer: null, loop: false, playbackRate: new Param(), start() {}, stop() {} })); }
  createBuffer(_c: number, n: number) { const d = new Float32Array(n); return { sampleRate: this.sampleRate, getChannelData: () => d }; }
  async resume() { this.state = 'running'; }
  async suspend() { this.state = 'suspended'; }
}

const ALL: SfxId[] = Object.keys(PATCHES) as SfxId[];

describe('sfx patches', () => {
  it('every SfxId has a patch with a sane shape and a length under 2 s', () => {
    const expected: SfxId[] = ['count', 'go', 'lap', 'finalLap', 'finish', 'finishLow', 'balloon', 'coin', 'rouletteTick', 'itemReady', 'throw', 'kite', 'drop', 'shieldUp', 'shieldPop', 'airHorn', 'fog', 'rocket', 'fizz', 'strikeRoll', 'strike', 'boing', 'slam', 'anchor', 'slingshot', 'mouse', 'blocked', 'denied', 'trail', 'roar', 'stomp', 'yetiThrow', 'snowThud', 'krakenRise', 'krakenSlam', 'crabClack', 'honk', 'whaleSong', 'tailSlap', 'claw', 'clawDrop', 'loop', 'ventWarn', 'geyser', 'steamVent', 'hit', 'hitConfirm', 'spin', 'boost1', 'boost2', 'boost3', 'boostPad', 'boostTrick', 'boostStart', 'slipstream', 'tierUp', 'tierUp2', 'tierUp3', 'hop', 'land', 'wall', 'bump', 'wrongWay', 'gainPlace', 'losePlace', 'respawn', 'uiMove', 'uiConfirm', 'uiBack', 'horn:pip', 'horn:momo', 'horn:nova', 'horn:juniper', 'horn:otto', 'horn:sprocket', 'horn:boulder', 'horn:gus', 'yelp:pip', 'yelp:momo', 'yelp:nova', 'yelp:juniper', 'yelp:otto', 'yelp:sprocket', 'yelp:boulder', 'yelp:gus'];
    expect(ALL.sort()).toEqual(expected.sort());
    for (const id of ALL) {
      const p = PATCHES[id];
      expect(p.gain, id).toBeGreaterThan(0);
      expect(p.gain, id).toBeLessThanOrEqual(0.6);
      expect(p.attack, id).toBeGreaterThan(0);
      expect(patchSeconds(p), id).toBeLessThan(2);
    }
  });

  it('a patch plays into its destination through a panner when panned', () => {
    const ctx = new FakeCtx() as unknown as AudioContext;
    const dest = (ctx as unknown as FakeCtx).createGain();
    playPatch(ctx, dest as unknown as AudioNode, PATCHES.finish, 1, 1, -0.5);
    const nodes = (ctx as unknown as FakeCtx).nodes;
    expect(nodes.filter((n) => n.kind === 'osc').length).toBe(2 * PATCHES.finish.steps!.length); // detuned pair per step
    const pan = nodes.find((n) => n.kind === 'pan') as unknown as { pan: Param; out: Node_[] };
    expect(pan.pan.value).toBe(-0.5);
    expect(pan.out[0]).toBe(dest);
  });
});

describe('bus', () => {
  it('volumes map through a perceptual square, clamped', () => {
    expect(busGains({ master: 1, music: 0.5, sfx: 2 })).toEqual({ master: AUDIO.master, music: 0.25, sfx: 1 });
    expect(busGains({ master: -1, music: 0, sfx: 0 }).master).toBe(0);
  });

  it('nothing exists until a gesture; then the graph is music → low-pass → master → compressor → out', () => {
    const bus = new AudioBus(FakeCtx as unknown as new () => AudioContext);
    expect(bus.ctx).toBeNull();
    bus.unlock();
    const ctx = FakeCtx.last!;
    expect(ctx.state).toBe('running');
    const b = bus as unknown as { music: Node_; sfx: Node_; master: Node_; musicFilter: Node_ };
    expect(b.music.out[0]).toBe(b.musicFilter);
    expect(b.musicFilter.out[0]).toBe(b.master);
    expect(b.sfx.out[0]).toBe(b.master);
    expect(b.master.out[0].kind).toBe('comp');
    expect(b.master.out[0].out[0]).toBe(ctx.destination);
  });

  it('a hidden tab suspends and a visible one resumes; the duck dips the music filter', () => {
    const bus = new AudioBus(FakeCtx as unknown as new () => AudioContext);
    bus.unlock();
    const ctx = FakeCtx.last!;
    bus.setHidden(true);
    expect(ctx.state).toBe('suspended');
    bus.setHidden(false);
    expect(ctx.state).toBe('running');
    bus.duck();
    const f = (bus as unknown as { musicFilter: { frequency: Param } }).musicFilter.frequency;
    expect(f.calls.find((c) => c[0] === 'set')?.[1]).toBe(AUDIO.duckHz);
    bus.setVolumes({ master: 0.5, music: 1, sfx: 1 });
    const m = (bus as unknown as { master: { gain: Param } }).master.gain;
    expect(m.value).toBeCloseTo(AUDIO.master * 0.25);
  });

  it('without Web Audio at all the game still runs silently', () => {
    const bus = new AudioBus(undefined);
    expect(bus.unlock()).toBe(false);
    expect(() => { bus.duck(); bus.setHidden(true); bus.setVolumes({ master: 1, music: 1, sfx: 1 }); }).not.toThrow();
  });
});
