import { Group, type Mesh, type ShaderMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { EXHAUST, flameColour, flameGeometry, isShared, JET_PROFILE, RACER_IDS, type FlameUniforms } from '../art-pipeline/index.ts';
import { BASE } from '../kart-controller/constants.ts';
import type { BoostSource } from '../kart-controller/types.ts';
import { BoostTier, ExhaustFlames, FLAME, flameSize, tierBySeconds, TIER_RGB, type FlameKart } from './flames.ts';

const kart = (source: BoostSource, remaining: number, drifting = false, tier = 0): FlameKart => ({ drift: { active: drifting, tier }, boost: { source, remaining } });
const uniforms = (f: ExhaustFlames) => (f.mesh!.material as ShaderMaterial).uniforms as unknown as FlameUniforms;

describe('exhaust pipes and boost flames (design §5)', () => {
  it('every racer has pipes behind the driver, pointing back or up, with a colour that can glow', () => {
    for (const id of RACER_IDS) {
      const e = EXHAUST[id];
      expect(e, id).toBeDefined();
      expect(e.ports.length, id).toBeGreaterThan(0);
      for (const p of e.ports) {
        expect(p[2], id).toBeLessThan(-0.7); // at the back
        expect(Math.abs(p[0]), id).toBeLessThan(0.85); // inside the kart's width
      }
      expect(Math.hypot(...e.dir), id).toBeCloseTo(1, 5);
      expect(e.dir[2], id).toBeLessThanOrEqual(0);
      expect(Math.max(...flameColour(id)), id).toBeGreaterThan(1); // HDR: the bloom catches it
    }
  });

  it('one mesh holds a jet on every pipe (one draw call a kart), rounded at the mouth and tapering to a point', () => {
    const e = EXHAUST.gus;
    const g = flameGeometry(e);
    expect(flameGeometry(e)).toBe(g); // cached per layout
    const pipe = g.getAttribute('aPipe'), s = g.getAttribute('aS');
    const pipes = new Set<number>();
    for (let i = 0; i < pipe.count; i++) pipes.add(pipe.getX(i));
    expect([...pipes].sort()).toEqual([0, 1]);
    expect(JET_PROFILE[0][1]).toBe(0);
    expect(JET_PROFILE[JET_PROFILE.length - 1][1]).toBe(0);
    let lo = 1, hi = 0;
    for (let i = 0; i < s.count; i++) { lo = Math.min(lo, s.getX(i)); hi = Math.max(hi, s.getX(i)); }
    expect([lo, hi]).toEqual([0, 1]);
    expect(g.boundingSphere!.radius).toBeGreaterThan(1.5); // bounds the jets, not just the mouths
    expect(g.userData.shared).toBe(true); // never freed by a race
    expect(flameGeometry(EXHAUST.nova).getAttribute('aPipe').count).toBeLessThan(pipe.count); // her one thruster
  });

  it('a jet is sized to the kart: longer and wider with each mini-turbo tier, compact at every one, never past the kart', () => {
    const d = { len: 0, wid: 0 };
    let last = 0;
    for (const tier of [1, 2, 3]) {
      flameSize(tier, 'drift', 1, 1, 1, d);
      expect(d.len, `tier ${tier}`).toBeGreaterThan(last);
      expect(d.len).toBeGreaterThanOrEqual(0.35);
      expect(d.len).toBeLessThanOrEqual(0.9);
      expect(d.wid).toBeLessThanOrEqual(0.16);
      expect(d.len / d.wid).toBeGreaterThan(4); // a jet, not a ball
      last = d.len;
    }
    // the biggest a flame ever gets (Nova's thruster, a purple mini-turbo as it fires) stays shorter than a kart (2.1 m)
    const top = Math.max(...Object.values(EXHAUST).map((e) => e.size ?? 1));
    flameSize(3, 'drift', 0, 3, top, d);
    expect(d.len).toBeLessThan(1.5);
    // an item's flame is a full one; a slipstream's is small
    expect(flameSize(0, 'item', 1, 1, 1, d).len).toBeGreaterThan(flameSize(0, 'slipstream', 1, 1, 1, { len: 0, wid: 0 }).len);
  });

  it('pops long as the boost fires and shrinks over its last moments', () => {
    const d = { len: 0, wid: 0 };
    const steady = flameSize(2, 'drift', 1, 1, 1, { len: 0, wid: 0 }).len;
    expect(flameSize(2, 'drift', 0, 1, 1, d).len).toBeCloseTo(steady * (1 + FLAME.burst), 6);
    expect(flameSize(2, 'drift', FLAME.burstSeconds / 2, 1, 1, d).len).toBeGreaterThan(steady);
    expect(flameSize(2, 'drift', FLAME.burstSeconds, 1, 1, d).len).toBeCloseTo(steady, 6);
    expect(flameSize(2, 'drift', 1, 0.01, 1, d).len).toBeLessThan(steady * (FLAME.tail + 0.05));
    expect(flameSize(2, 'drift', 1, FLAME.tailSeconds, 1, d).len).toBeCloseTo(steady, 6);
  });

  it('a mini-turbo burns the colour its drift let go at; any other boost burns the racer\'s own', () => {
    const b = new BoostTier();
    expect(b.update(kart('none', 0, true, 1), 0)).toBe(0);
    b.update(kart('none', 0, true, 2), 0.1);
    expect(b.update(kart('drift', BASE.boostSeconds[1]), 0.2)).toBe(2);
    expect(b.since).toBe(0.2);
    expect(b.update(kart('drift', BASE.boostSeconds[1] - 0.1), 0.3)).toBe(2); // the same boost running down
    expect(b.since).toBe(0.2);
    expect(b.update(kart('item', 1.5), 0.4)).toBe(0); // a new, different boost
    expect(b.since).toBe(0.4);
    // a drift boost whose drift was never seen is told by its length
    const fresh = new BoostTier();
    expect(fresh.update(kart('drift', BASE.boostSeconds[2]), 0)).toBe(3);
    for (let t = 1; t <= 3; t++) expect(tierBySeconds(BASE.boostSeconds[t - 1])).toBe(t);
  });

  it('burns only while boosting, one mesh on the chassis, in the tier\'s colour, flickering unless motion is reduced', () => {
    const chassis = new Group();
    const f = new ExhaustFlames(chassis, 'gus');
    expect(chassis.children).toHaveLength(1);
    expect(f.mesh!.name).toBe('exhaust-flame');
    f.update(kart('none', 0), 1);
    expect(f.mesh!.visible).toBe(false);
    // a purple mini-turbo: the drift at tier 3, then let go
    f.update(kart('none', 0, true, 3), 1.1);
    const lengths = new Set<number>();
    for (let t = 1.2; t < 2.2; t += 0.05) { f.update(kart('drift', 2.2 - (t - 1.2)), t); lengths.add(+uniforms(f).uLen.value.x.toFixed(3)); }
    expect(f.mesh!.visible).toBe(true);
    expect(lengths.size).toBeGreaterThan(5); // it flickers
    const u = uniforms(f), purple = TIER_RGB[2];
    expect([u.uColor.value.r, u.uColor.value.g, u.uColor.value.b].map((x) => +x.toFixed(3))).toEqual(purple.map((x) => +x.toFixed(3)));
    expect(Math.max(u.uHot.value.r, u.uHot.value.g, u.uHot.value.b)).toBeGreaterThan(1.5); // a white-hot core
    expect(u.uWave.value).toBe(1);
    // an item boost: Big Gus's own red
    f.update(kart('item', 1.5), 3);
    const red = flameColour('gus', FLAME.racerGain);
    expect(u.uColor.value.r).toBeCloseTo(red[0], 5);
    // reduced motion: steady (after the fire's pop)
    const held = new Set<number>();
    for (let t = 3.3; t < 3.8; t += 0.05) { f.update(kart('item', 1.2), t, true); held.add(+u.uLen.value.x.toFixed(4)); }
    expect(held.size).toBe(1);
    expect(u.uWave.value).toBe(0);
    // each kart has its own flame material, freed with the race; a rival's fades near the lens
    expect(isShared(f.mesh!.material as never)).toBe(false);
    expect(u.uFade.value).toBe(0);
    f.setFade(4);
    expect(u.uFade.value).toBe(4);
    // an unknown racer (the placeholder box kart) simply has no flames
    const none = new ExhaustFlames(new Group(), 'nobody');
    expect(none.mesh).toBeNull();
    none.update(kart('item', 1), 0); // and updating it is harmless
  });

  it('a shared body burns from its own pipes (userData.exhaust)', () => {
    const chassis = new Group();
    chassis.userData.exhaust = { ports: [[0, 0.5, -1.1]], dir: [0, 0, -1], flame: '#ffffff' };
    const f = new ExhaustFlames(chassis, 'gus');
    expect((f.mesh as Mesh).geometry.getAttribute('aPipe').count).toBe(flameGeometry(EXHAUST.nova).getAttribute('aPipe').count);
  });
});
