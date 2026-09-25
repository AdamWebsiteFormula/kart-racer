// The boost flames on each kart's exhaust pipes (design §5; Mario Kart World's are compact, bright
// jets with a hot core): shown while the kart boosts, flickering, sized to the kart and coloured by
// the boost. A mini-turbo burns its drift tier's colour (blue, orange, purple, like the sparks it
// came from); any other boost burns the racer's own exhaust colour. It pops long as the boost fires
// and shrinks over its last moments. One mesh on the chassis for all of a kart's pipes (one draw
// call), so the jets lean and bounce with it; drawn only while it burns.
import { Mesh, type Object3D } from 'three';
import { EXHAUST, flameColour, flameGeometry, flameMaterial, type Exhaust, type FlameUniforms } from '../art-pipeline/index.ts';
import { BASE } from '../kart-controller/constants.ts';
import type { BoostSource } from '../kart-controller/types.ts';

type Rgb = readonly [number, number, number];

/** The drift tiers' colours in linear RGB (above 1 blooms): blue, orange, purple (design §7). The sparks and the flames share them. */
export const TIER_RGB: readonly Rgb[] = Object.freeze([
  Object.freeze([0.22, 0.58, 1.75] as const), Object.freeze([1.75, 0.6, 0.12] as const), Object.freeze([1.2, 0.26, 1.8] as const),
]);

export const FLAME = Object.freeze({
  /** jet length and width (metres, before the exhaust's size) for a mini-turbo's tier 1, 2, 3 */
  tier: Object.freeze([Object.freeze({ len: 0.46, wid: 0.1 }), Object.freeze({ len: 0.6, wid: 0.12 }), Object.freeze({ len: 0.76, wid: 0.14 })]),
  /** an item, pad, trick or start boost; a slipstream's is small */
  other: Object.freeze({ len: 0.7, wid: 0.13 }),
  slip: Object.freeze({ len: 0.44, wid: 0.1 }),
  /** the pop as a boost fires: this much longer (and 0.4 of it wider), easing out over `burstSeconds` */
  burst: 0.35, burstSeconds: 0.16,
  /** over a boost's last `tailSeconds` the jet shrinks to `tail` of its length */
  tailSeconds: 0.3, tail: 0.55,
  /** how much of an exhaust's own `size` counts (Nova's thruster, Boulder's stacks: bigger, not huge) */
  sizeShare: 0.5,
  /** the length wanders this share either way, each pipe out of step (none under reduced motion) */
  flicker: 0.12,
  /** the white the core burns toward, and how far */
  hot: Object.freeze([2.2, 2.05, 1.85] as const), hotMix: 0.55,
  /** a racer's own flame colour, times this */
  racerGain: 1.35,
});

/** What a kart's state tells the flames: its drift (the tier it let go at) and its live boost. */
export interface FlameKart {
  drift: { active: boolean; tier: number };
  boost: { source: BoostSource; remaining: number };
}

/** A drift boost's tier told by its length (BASE.boostSeconds), for when the drift itself was not seen. */
export function tierBySeconds(seconds: number): number {
  const s = BASE.boostSeconds;
  return seconds >= (s[1] + s[2]) / 2 ? 3 : seconds >= (s[0] + s[1]) / 2 ? 2 : 1;
}

/**
 * Which colour a kart's live boost burns in, followed from its state frame to frame: a drift boost
 * its mini-turbo tier (the tier the drift held when it let go: 1 blue, 2 orange, 3 purple), any
 * other boost 0 (the racer's own colour). `since` is the clock when the live boost fired.
 */
export class BoostTier {
  tier = 0;
  source: BoostSource = 'none';
  since = 0;
  private held = 0;
  private left = 0;

  update(k: FlameKart, t: number): number {
    if (k.drift.active) this.held = k.drift.tier;
    const b = k.boost;
    if (b.source === 'none' || b.remaining <= 0) { this.tier = 0; this.source = 'none'; this.left = 0; return 0; }
    if (b.source !== this.source || b.remaining > this.left + 1e-4) {
      // a new boost, or one refreshed: a drift's is the tier it let go at
      this.tier = b.source === 'drift' ? (this.held >= 1 ? Math.min(3, this.held) : tierBySeconds(b.remaining)) : 0;
      this.source = b.source;
      this.since = t;
    }
    this.left = b.remaining;
    return this.tier;
  }
}

/**
 * A jet's length and width in metres: `tier` 1..3 a mini-turbo's (0 any other boost, from `source`),
 * `age` seconds since it fired, `left` seconds still to run, `size` the exhaust's. Writes `out`.
 */
export function flameSize(tier: number, source: BoostSource, age: number, left: number, size: number, out: { len: number; wid: number }): { len: number; wid: number } {
  const base = tier > 0 ? FLAME.tier[Math.min(3, tier) - 1] : source === 'slipstream' ? FLAME.slip : FLAME.other;
  const k = 1 + (size - 1) * FLAME.sizeShare;
  const pop = FLAME.burst * Math.max(0, 1 - Math.max(0, age) / FLAME.burstSeconds);
  const tail = left < FLAME.tailSeconds ? FLAME.tail + (1 - FLAME.tail) * Math.max(0, left) / FLAME.tailSeconds : 1;
  out.len = base.len * k * (1 + pop) * tail;
  out.wid = base.wid * k * (1 + pop * 0.4);
  return out;
}

export class ExhaustFlames {
  /** one mesh for all the kart's pipes (null for a kart with no pipes) */
  readonly mesh: Mesh | null = null;
  /** the live boost's colour tier */
  readonly boost = new BoostTier();
  private readonly u: FlameUniforms | null = null;
  private readonly size: number;
  private readonly phase: number;
  private readonly racerRgb: Rgb = [1, 0.5, 0.2];
  private shownTier = -1;
  private readonly dims = { len: 0, wid: 0 };

  constructor(chassis: Object3D, racerId: string) {
    // a shared body (art-pipeline kart.ts) burns from its own pipes, an alt paint in its own colour
    const e = (chassis.userData.exhaust as Exhaust | undefined) ?? EXHAUST[racerId];
    this.size = e?.size ?? 1;
    let h = 7;
    for (let i = 0; i < racerId.length; i++) h = (h * 31 + racerId.charCodeAt(i)) >>> 0;
    this.phase = (h % 1000) / 100;
    if (!e) return;
    this.racerRgb = flameColour(racerId, FLAME.racerGain, e.flame);
    const mat = flameMaterial();
    mat.uniforms.uSeed.value = this.phase;
    const mesh = new Mesh(flameGeometry(e), mat);
    mesh.name = 'exhaust-flame';
    mesh.visible = false;
    mesh.renderOrder = 2; // after the karts, like the other glows
    chassis.add(mesh);
    this.mesh = mesh;
    this.u = mat.uniforms;
  }

  /** Above 0, the flames go right against the lens (a rival's: CAM.kartFade); 0, never (your own). A rival's kart fader also shares its opacity with them (uKart). */
  setFade(metres: number): void { if (this.u) this.u.uFade.value = metres; }

  /** `k` the kart's state this frame, `t` a clock in seconds. Reduced motion holds the flame steady. */
  update(k: FlameKart, t: number, reduced = false): void {
    const tier = this.boost.update(k, t);
    const on = k.boost.source !== 'none' && k.boost.remaining > 0;
    const mesh = this.mesh, u = this.u;
    if (!mesh || !u) return;
    mesh.visible = on;
    if (!on) return;
    if (tier !== this.shownTier) {
      this.shownTier = tier;
      const c = tier > 0 ? TIER_RGB[tier - 1] : this.racerRgb, hot = FLAME.hot, m = FLAME.hotMix;
      u.uColor.value.setRGB(c[0], c[1], c[2]);
      u.uHot.value.setRGB(c[0] + (hot[0] - c[0]) * m, c[1] + (hot[1] - c[1]) * m, c[2] + (hot[2] - c[2]) * m);
    }
    const d = flameSize(tier, k.boost.source, t - this.boost.since, k.boost.remaining, this.size, this.dims);
    // two out-of-step wobbles per pipe read as fire, and the pipes never flicker together
    const p = this.phase, fl = reduced ? 0 : FLAME.flicker;
    const w0 = Math.sin(t * 43 + p) * Math.sin(t * 27 + p * 0.5), w1 = Math.sin(t * 41 + 2.1 + p) * Math.sin(t * 29 + 1 + p * 0.5);
    u.uLen.value.set(d.len * (1 + fl * w0), d.len * (1 + fl * w1));
    u.uWid.value.set(d.wid * (1 + fl * 0.4 * w0), d.wid * (1 + fl * 0.4 * w1));
    u.uTime.value = t;
    u.uWave.value = reduced ? 0 : 1;
  }
}
