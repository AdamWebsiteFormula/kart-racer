import { Group, Vector3, type Mesh, type ShaderMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { BODY_EXHAUST, EXHAUST, isShared, KART_FIT, portDir, RACER_IDS } from '../art-pipeline/index.ts';
import { BODY_WHEELS, MODEL_WHEELS } from '../art-pipeline/rig.ts';
import { BASE } from '../kart-controller/constants.ts';
import type { BoostSource } from '../kart-controller/types.ts';
import {
  arcLevel, BoostTier, ExhaustFlames, FLAME, flamePalette, flameSize, ignition, PALETTE, popScale, shootOut, sputter, STAR, starFlash, starLook, tierBySeconds,
  TIER_HOT, TIER_RGB, wheelContact, type FlameKart, type Ignition,
} from './flames.ts';
import { arcPoint, JET, jetGeometry, jetProfile, PART, type JetUniforms } from './jet.ts';

const kart = (source: BoostSource, remaining: number, drifting = false, tier = 0, more: Partial<FlameKart> = {}): FlameKart =>
  ({ drift: { active: drifting, tier }, boost: { source, remaining }, grounded: true, speed: 20, lateralVelocity: 0, isPlayer: true, ...more });
const uniforms = (f: ExhaustFlames) => (f.mesh!.material as ShaderMaterial).uniforms as unknown as JetUniforms;
const rgbOf = (c: { r: number; g: number; b: number }) => [c.r, c.g, c.b].map((x) => +x.toFixed(3));
const top = (c: readonly number[]) => c.indexOf(Math.max(...c));

describe('exhaust pipes (the anchors the flames burn from; art-pipeline racers.ts)', () => {
  it('every racer has pipes behind the driver, pointing back or up', () => {
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
    }
  });
});

describe('the jet mesh (one a kart, one draw call: jets, flares, billows, ring, tire stars)', () => {
  it('a jet is rounded at the root, widest near it, and tapers to a point', () => {
    expect(jetProfile(0)).toBe(0);
    expect(jetProfile(JET.root)).toBeCloseTo(1, 6);
    expect(jetProfile(1)).toBe(0);
    let last = 1;
    for (let s = JET.root; s <= 1; s += 0.05) { expect(jetProfile(s)).toBeLessThanOrEqual(last + 1e-9); last = jetProfile(s); }
    expect(jetProfile(0.5)).toBeGreaterThan(0.6); // a full body, not a needle
  });

  it('holds every part once per pipe (the ring and the two stars once), cached per layout and never freed', () => {
    const e = EXHAUST.gus;
    const g = jetGeometry(e);
    expect(jetGeometry(e)).toBe(g);
    expect(g.userData.shared).toBe(true);
    const info = g.getAttribute('aInfo');
    const count = new Map<number, number>();
    for (let i = 0; i < info.count; i++) count.set(info.getZ(i), (count.get(info.getZ(i)) ?? 0) + 1);
    const pipes = e.ports.length, tube = JET.rings.length * (JET.sides + 1);
    expect(count.get(PART.jet)).toBe(pipes * tube);
    expect(count.get(PART.flare)).toBe(pipes * 4);
    expect(count.get(PART.puff)).toBe(pipes * JET.puffs * 4);
    expect(count.get(PART.ring)).toBe(4);
    expect(count.get(PART.star)).toBe(8); // a star at each rear tire
    expect(count.get(PART.wind)).toBe(JET.arcs.length * 2 * (JET.arcSegments + 1) * 2); // each arc on both sides, a ribbon's two edges
    expect(count.get(PART.glow)).toBe(pipes * 4); // the light round each jet
    // Nova's one thruster: one jet
    expect(jetGeometry(EXHAUST.nova).getAttribute('aInfo').count).toBeLessThan(info.count);
  });

  it('the jets\' skin faces out as the shader lays it (drawn front faces only)', () => {
    // the shader puts a jet vertex at mouth + axis * s * len + side * radius * wid
    const g = jetGeometry(EXHAUST.pip), pos = g.getAttribute('position'), axis = g.getAttribute('aAxis'), side = g.getAttribute('aSide'), info = g.getAttribute('aInfo');
    const idx = g.getIndex()!;
    const at = (i: number) => new Vector3(pos.getX(i), pos.getY(i), pos.getZ(i))
      .addScaledVector(new Vector3(axis.getX(i), axis.getY(i), axis.getZ(i)), info.getX(i) * 0.7)
      .addScaledVector(new Vector3(side.getX(i), side.getY(i), side.getZ(i)), info.getW(i) * 0.2);
    let checked = 0;
    for (let t = 0; t < idx.count; t += 3) {
      const [a, b, c] = [idx.getX(t), idx.getX(t + 1), idx.getX(t + 2)];
      if (info.getZ(a) !== PART.jet) continue;
      const pa = at(a), n = new Vector3().crossVectors(at(b).sub(pa), at(c).sub(pa));
      if (n.lengthSq() < 1e-10) continue; // the point and the root's first ring are degenerate
      const out = new Vector3(side.getX(a) + side.getX(b) + side.getX(c), side.getY(a) + side.getY(b) + side.getY(c), side.getZ(a) + side.getZ(b) + side.getZ(c));
      expect(n.dot(out)).toBeGreaterThan(0);
      checked++;
    }
    expect(checked).toBeGreaterThan(100);
  });

  it('a measured pipe points where it points (no splay: a layout of its own), and bends any way it points', () => {
    const e = { ports: [[-0.38, 0.79, -0.955], [-0.444, 0.713, -0.952]] as const, dir: [-0.24, 0.966, -0.09] as const, flame: '#ff7a2e' };
    const splayed = jetGeometry({ ...e, ports: e.ports.map((p) => [...p] as [number, number, number]), dir: [...e.dir] as [number, number, number] });
    const measured = jetGeometry({ ...e, ports: e.ports.map((p) => [...p] as [number, number, number]), dir: [...e.dir] as [number, number, number], splay: 0 });
    expect(measured).not.toBe(splayed);
    const axis = measured.getAttribute('aAxis'), info = measured.getAttribute('aInfo');
    for (let i = 0; i < info.count; i++) {
      if (info.getZ(i) !== PART.jet) continue;
      expect([axis.getX(i), axis.getY(i), axis.getZ(i)].map((x) => +x.toFixed(4))).toEqual(portDir({ ...e, splay: 0 } as never, e.ports[0] as never).map((x) => +x.toFixed(4)));
    }
    // its stacks point up (Juniper's): the longest jet straight up stays inside the bounds
    const top = new Vector3(e.ports[0][0], e.ports[0][1], e.ports[0][2]).addScaledVector(new Vector3(...portDir({ ...e, splay: 0 } as never, e.ports[0] as never)), 1.6);
    expect(measured.boundingSphere!.containsPoint(top)).toBe(true);
  });

  it('the wind arcs run from the nose round the sides to the tail, clear of the kart, their ribbons facing the lens', () => {
    const v = new Vector3();
    for (const a of JET.arcs) {
      expect(arcPoint(a, 0, v).toArray()).toEqual([...a.nose]);
      expect(arcPoint(a, 1, v).toArray().map((x) => +x.toFixed(9))).toEqual([...a.tail]);
      expect(arcPoint(a, 0.5, v).toArray().map((x) => +x.toFixed(9))).toEqual([...a.side]);
      expect(a.side[0]).toBeGreaterThan(KART_FIT.width / 2); // out past the kart's flank
      expect(a.nose[2]).toBeGreaterThan(KART_FIT.length / 2 - 0.1);
      expect(a.tail[2]).toBeLessThan(-KART_FIT.length / 2);
    }
    // the shader spreads a ribbon's edges across its screen direction t, turned a quarter left, and the
    // triangles (edge -1, next -1, edge +1) and (edge +1, next -1, next +1) keep their winding for any t
    for (let k = 0; k < 16; k++) {
      const ang = (k / 16) * Math.PI * 2, t = [Math.cos(ang), Math.sin(ang)], n = [-t[1], t[0]];
      const at = (along: number, side: number) => [t[0] * along + n[0] * side, t[1] * along + n[1] * side];
      const tri = (p: number[][]) => (p[1][0] - p[0][0]) * (p[2][1] - p[0][1]) - (p[1][1] - p[0][1]) * (p[2][0] - p[0][0]);
      expect(tri([at(0, -1), at(1, -1), at(0, 1)])).toBeGreaterThan(0);
      expect(tri([at(0, 1), at(1, -1), at(1, 1)])).toBeGreaterThan(0);
    }
  });

  it('its bounds hold the jets at their longest, the shock ring and the tire stars', () => {
    for (const id of RACER_IDS) {
      const e = EXHAUST[id], s = jetGeometry(e).boundingSphere!;
      const longest = FLAME.tier[2].len * (1 + ((e.size ?? 1) - 1) * FLAME.sizeShare) * (1 + FLAME.popLen * FLAME.popBy.tier[2]);
      for (const p of e.ports) {
        const d = portDir(e, p);
        expect(s.containsPoint(new Vector3(p[0] + d[0] * longest, p[1] + d[1] * longest, p[2] + d[2] * longest)), id).toBe(true);
        expect(s.containsPoint(new Vector3(p[0], p[1], p[2]).setX(p[0] + 1.5)), `${id} ring`).toBe(true);
      }
      const w = wheelContact(MODEL_WHEELS[id]?.rear, new Vector3());
      expect(s.containsPoint(w.clone().setX(w.x + STAR.size[3])), `${id} star`).toBe(true);
    }
  });
});

describe('the flame\'s look (Mario Kart World: a compact jet, a blue-white nozzle, flat bands of fire)', () => {
  it('a mini-turbo burns its tier\'s color, any other boost warm orange-gold', () => {
    expect(flamePalette(1)).toBe(PALETTE.tier[0]);
    expect(flamePalette(3)).toBe(PALETTE.tier[2]);
    expect(flamePalette(0)).toBe(PALETTE.other);
    // each tier's body in its spark color's hue
    for (let t = 0; t < 3; t++) expect(top(PALETTE.tier[t].body), `tier ${t + 1}`).toBe(top(TIER_RGB[t]));
    const gold = PALETTE.other;
    expect(gold.body[0]).toBeGreaterThan(gold.body[1]);
    expect(gold.body[1]).toBeGreaterThan(gold.body[2] * 5);
    expect(gold.body[1]).toBeGreaterThan(PALETTE.tier[1].body[1]); // more gold than the orange tier
  });

  it('every palette runs from a near-white core to a darker edge, and its fire stays saturated (no white-out)', () => {
    for (const p of [...PALETTE.tier, PALETTE.other]) {
      expect(Math.min(...p.core) / Math.max(...p.core)).toBeGreaterThan(0.4); // hot: near white
      expect(Math.max(...p.edge)).toBeLessThan(Math.max(...p.body)); // the skin darker
      for (const band of [p.inner, p.body, p.edge]) expect(Math.min(...band) / Math.max(...band)).toBeLessThan(0.3); // saturated (purple has two strong channels)
      // the filmic tone map turns much brighter than this toward white (the first try's billows burned white)
      for (const band of [p.inner, p.body, p.edge]) expect(Math.max(...band)).toBeLessThanOrEqual(2);
      expect(Math.max(...p.mouth)).toBeGreaterThan(1); // the nozzle's ring glows (the bloom catches it)
      expect(p.mouth[2]).toBe(Math.max(...p.mouth)); // blue-white
    }
  });

  it('a jet is sized to the kart: longer and wider with each tier, compact, never past the kart', () => {
    const d = { len: 0, wid: 0 };
    let last = 0;
    for (const tier of [1, 2, 3]) {
      flameSize(tier, 'drift', 1, 1, 1, d);
      expect(d.len, `tier ${tier}`).toBeGreaterThan(last);
      expect(d.len).toBeGreaterThanOrEqual(0.5);
      expect(d.len).toBeLessThanOrEqual(1);
      expect(d.len / d.wid).toBeGreaterThan(2.5); // a jet, not a ball
      last = d.len;
    }
    // the biggest a flame ever gets (Nova's thruster, a purple mini-turbo as it fires) stays shorter than a kart (2.1 m)
    const big = Math.max(...Object.values(EXHAUST).map((e) => e.size ?? 1));
    expect(flameSize(3, 'drift', 0, 3, big, d).len).toBeLessThan(2.1);
    // an item's flame is a full one; a slipstream's is small
    expect(flameSize(0, 'item', 1, 1, 1, d).len).toBeGreaterThan(flameSize(0, 'slipstream', 1, 1, 1, { len: 0, wid: 0 }).len);
  });

  it('shoots out of the pipe, swells at the ignition and shrinks over its last moments', () => {
    const d = { len: 0, wid: 0 };
    const steady = flameSize(2, 'drift', 1, 1, 1, { len: 0, wid: 0 }).len;
    // the first frames: short, the flash reads first; then out to its full, swollen length
    expect(shootOut(0)).toBe(FLAME.shootFrom);
    expect(shootOut(FLAME.shootSeconds)).toBe(1);
    expect(flameSize(2, 'drift', 0, 1, 1, d).len).toBeCloseTo(steady * (1 + FLAME.popLen * popScale(2, 'drift')) * FLAME.shootFrom, 6);
    const p = 1 - FLAME.shootSeconds / FLAME.popSeconds;
    expect(flameSize(2, 'drift', FLAME.shootSeconds, 1, 1, d).len).toBeCloseTo(steady * (1 + FLAME.popLen * popScale(2, 'drift') * p * p), 6);
    let last = 0;
    for (let a = 0; a <= FLAME.shootSeconds; a += 0.005) { const l = flameSize(2, 'drift', a, 1, 1, d).len; expect(l).toBeGreaterThanOrEqual(last); last = l; }
    expect(flameSize(2, 'drift', FLAME.popSeconds / 2, 1, 1, d).len).toBeGreaterThan(steady);
    expect(flameSize(2, 'drift', FLAME.popSeconds, 1, 1, d).len).toBeCloseTo(steady, 6);
    expect(flameSize(2, 'drift', 1, 0.001, 1, d).len).toBeLessThan(steady * (FLAME.tail + 0.05));
    expect(flameSize(2, 'drift', 1, FLAME.tailSeconds, 1, d).len).toBeCloseTo(steady, 6);
    // reduced motion: a calmer swell
    expect(flameSize(2, 'drift', 0, 1, 1, d, true).len).toBeLessThan(steady * (1 + FLAME.popLen));
  });

  it('the ignition: a flash, a swell and a shock ring, each over in a moment; a purple mini-turbo\'s the biggest', () => {
    const o: Ignition = { pop: 0, flash: 0, ring: 0 };
    ignition(0, 1, false, o);
    expect(o).toEqual({ pop: 1, flash: 1, ring: 0 });
    ignition(FLAME.flashSeconds, 1, false, o);
    expect(o.flash).toBe(0);
    expect(o.pop).toBeGreaterThan(0);
    ignition(FLAME.ringSeconds / 2, 1, false, o);
    expect(o.ring).toBeCloseTo(0.5, 6);
    ignition(FLAME.ringSeconds, 1, false, o);
    expect(o.ring).toBe(-1);
    ignition(FLAME.popSeconds, 1, false, o);
    expect(o.pop).toBe(0);
    ignition(-0.1, 1, false, o);
    expect(o).toEqual({ pop: 0, flash: 0, ring: -1 });
    // it only ever eases away
    let last = Infinity;
    for (let t = 0; t <= FLAME.popSeconds; t += 0.01) { ignition(t, 1, false, o); expect(o.pop).toBeLessThanOrEqual(last); last = o.pop; }
    expect(popScale(3, 'drift')).toBeGreaterThan(popScale(1, 'drift'));
    // a slipstream's is small and ringless
    ignition(0.05, popScale(0, 'slipstream'), false, o);
    expect(o.ring).toBe(-1);
    // reduced motion: calmer, and no ring
    ignition(0, 1, true, o);
    expect(o.pop).toBe(FLAME.reducedPop);
    expect(o.flash).toBe(FLAME.reducedPop);
    expect(o.ring).toBe(-1);
  });

  it('the wind arcs show while a boost runs, most at its ignition, fading at its end; a slipstream\'s faint; none under reduced motion', () => {
    expect(arcLevel('none', 0, 0, false)).toBe(0);
    expect(arcLevel('pad', 0, 1, false)).toBeCloseTo(FLAME.arc + FLAME.popArc, 6);
    expect(arcLevel('pad', FLAME.popSeconds, 1, false)).toBeCloseTo(FLAME.arc, 6);
    expect(arcLevel('pad', 1, FLAME.tailSeconds / 2, false)).toBeCloseTo(FLAME.arc / 2, 6);
    expect(arcLevel('pad', 1, 0, false)).toBe(0);
    expect(arcLevel('slipstream', 1, 1, false)).toBeLessThan(arcLevel('item', 1, 1, false));
    expect(arcLevel('drift', 0, 1, true)).toBe(0);
  });

  it('a dying jet sputters (never under reduced motion), and only in its last moments', () => {
    expect(sputter(1, 3.2, 0.5, false)).toBe(1);
    let coughs = 0, n = 0;
    for (let t = 0; t < 20; t += 1 / 60) {
      const left = FLAME.tailSeconds * 0.3;
      if (sputter(left, t, 0.5, false) < 1) coughs++;
      n++;
      expect(sputter(left, t, 0.5, true)).toBe(1);
    }
    expect(coughs / n).toBeGreaterThan(0.2);
    expect(coughs / n).toBeLessThan(0.7);
    expect(sputter(FLAME.tailSeconds * 0.3, 7.25, 0.5, false)).toBe(sputter(FLAME.tailSeconds * 0.3, 7.25, 0.5, false)); // no randomness: a replay looks the same
  });

  it('a mini-turbo burns the color its drift let go at', () => {
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
});

describe('the drift stars at the rear tires', () => {
  it('grow with the tier; a charging drift only glows; a rival\'s are smaller and dimmer', () => {
    const o = { size: 0, rays: 0, gain: 0 };
    let last = 0;
    for (const t of [1, 2, 3]) { starLook(t, true, o); expect(o.size).toBeGreaterThan(last); expect(o.rays).toBe(1); last = o.size; }
    starLook(0, true, o);
    expect(o.rays).toBe(0);
    expect(o.gain).toBeLessThan(STAR.gain);
    expect(o.size).toBeLessThan(STAR.size[1]);
    const mine = starLook(2, true, { size: 0, rays: 0, gain: 0 }), theirs = starLook(2, false, { size: 0, rays: 0, gain: 0 });
    expect(theirs.size).toBeLessThan(mine.size);
    expect(theirs.gain).toBeLessThan(mine.gain);
  });

  it('a tier-up flashes once and briefly, calmer under reduced motion', () => {
    expect(starFlash(0, false)).toBe(1);
    expect(starFlash(STAR.flashSeconds, false)).toBe(0);
    expect(starFlash(-0.01, false)).toBe(0);
    expect(starFlash(0, true)).toBe(STAR.reducedFlash);
    expect(STAR.flashSeconds).toBeLessThan(1 / 3); // never more than 3 flashes a second, however quick the tiers
  });

  it('sit where the rear tires touch the road: outside the tread, behind the axle', () => {
    const r = MODEL_WHEELS.gus.rear, w = wheelContact(r, new Vector3());
    expect(w.x).toBeGreaterThan(r.x);
    expect(w.z).toBeLessThan(r.z);
    expect(w.y).toBeGreaterThan(0);
    expect(w.y).toBeLessThan(0.25);
    expect(wheelContact(undefined, new Vector3()).z).toBeLessThan(0); // the placeholder kart: still behind
  });
});

describe('ExhaustFlames: one mesh on the chassis', () => {
  it('draws nothing while the kart neither boosts nor drifts', () => {
    const chassis = new Group();
    const f = new ExhaustFlames(chassis, 'gus');
    expect(chassis.children).toHaveLength(1);
    expect(f.mesh!.name).toBe('exhaust-flame');
    f.update(kart('none', 0), 1);
    expect(f.mesh!.visible).toBe(false);
    // each kart has its own material, freed with the race; a rival's fades near the lens
    expect(isShared(f.mesh!.material as never)).toBe(false);
    expect(uniforms(f).uFade.value).toBe(0);
    f.setFade(4);
    expect(uniforms(f).uFade.value).toBe(4);
    // an unknown racer (the placeholder box kart) simply has none
    const none = new ExhaustFlames(new Group(), 'nobody');
    expect(none.mesh).toBeNull();
    none.update(kart('item', 1), 0);
  });

  it('a boost lights the jets in its color, fires with a pop and flickers (still under reduced motion)', () => {
    const f = new ExhaustFlames(new Group(), 'gus'), u = uniforms(f);
    // a purple mini-turbo: the drift at tier 3, then let go
    f.update(kart('none', 0, true, 3), 1.1);
    f.update(kart('drift', 2.2), 1.2);
    expect(f.mesh!.visible).toBe(true);
    expect(u.uOn.value).toBe(1);
    expect(u.uFlash.value).toBeGreaterThan(0.9);
    expect(u.uRing.value).toBe(0);
    expect(rgbOf(u.uBody.value)).toEqual(PALETTE.tier[2].body.map((x) => +x.toFixed(3)));
    const lengths = new Set<number>();
    for (let t = 1.5; t < 2.5; t += 0.05) { f.update(kart('drift', 2.2 - (t - 1.2)), t); lengths.add(+u.uLen.value.x.toFixed(3)); }
    expect(lengths.size).toBeGreaterThan(5);
    expect(u.uWave.value).toBe(1);
    expect(u.uFlash.value).toBe(0);
    expect(u.uRing.value).toBe(-1);
    // an item boost: orange-gold
    f.update(kart('item', 1.5), 3);
    expect(rgbOf(u.uBody.value)).toEqual(PALETTE.other.body.map((x) => +x.toFixed(3)));
    // reduced motion: steady (after the ignition's swell)
    const held = new Set<number>();
    for (let t = 3.4; t < 3.9; t += 0.05) { f.update(kart('item', 1.2), t, true); held.add(+u.uLen.value.x.toFixed(4)); }
    expect(held.size).toBe(1);
    expect(u.uWave.value).toBe(0);
  });

  it('the air sweeps the jets back along the kart\'s motion, out to the side in a drift, and not at a standstill', () => {
    const chassis = new Group(), f = new ExhaustFlames(chassis, 'gus'), u = uniforms(f);
    f.update(kart('pad', 1, false, 0, { speed: 0 }), 1);
    expect(u.uBend.value).toBe(0);
    f.update(kart('pad', 0.9, false, 0, { speed: 25 }), 1.1);
    expect(u.uBend.value).toBeCloseTo(FLAME.bend, 6);
    expect(u.uWind.value.z).toBeLessThan(-0.9); // back, in the kart's own frame
    expect(u.uWind.value.y).toBeLessThan(0); // and a little down: the chase camera sees the jets' length
    // sliding right (a drift): the air comes from the right, the jets sweep left
    f.update(kart('pad', 0.8, false, 0, { speed: 20, lateralVelocity: 6 }), 1.2);
    expect(u.uWind.value.x).toBeLessThan(-0.2);
    // the chassis turned under the heading (the drift's yaw, a spin): the same air, turned the other way in its frame
    chassis.rotation.y = 0.5;
    f.update(kart('pad', 0.7, false, 0, { speed: 20 }), 1.3);
    const s = Math.sin(0.5), c = Math.cos(0.5), n = Math.hypot(s, FLAME.windDrop, c);
    expect(u.uWind.value.x).toBeCloseTo(s / n, 6);
    expect(u.uWind.value.z).toBeCloseTo(-c / n, 6);
  });

  it('a drift lights the tire stars in its tier\'s color, flashes each tier-up, and the stars go out with the drift', () => {
    const f = new ExhaustFlames(new Group(), 'juniper'), u = uniforms(f);
    f.update(kart('none', 0, true, 0), 1);
    expect(f.mesh!.visible).toBe(true);
    expect(u.uOn.value).toBe(0); // no flame: only the stars
    expect(u.uStarRays.value).toBe(0); // charging: a glow
    f.update(kart('none', 0, true, 1), 1.5);
    expect(u.uStarRays.value).toBe(1);
    expect(u.uStarFlash.value).toBe(1); // the tier-up
    expect(rgbOf(u.uStarCol.value)).toEqual(TIER_RGB[0].map((x) => +x.toFixed(3)));
    f.update(kart('none', 0, true, 1), 1.5 + STAR.flashSeconds);
    expect(u.uStarFlash.value).toBeCloseTo(0, 6);
    f.update(kart('none', 0, true, 2), 2);
    expect(u.uStarFlash.value).toBe(1);
    expect(rgbOf(u.uStarHot.value)).toEqual(TIER_HOT[1].map((x) => +x.toFixed(3)));
    expect(u.uStar.value).toBeCloseTo(STAR.size[2], 6);
    // in the air: no stars
    f.update(kart('none', 0, true, 2, { grounded: false }), 2.1);
    expect(f.mesh!.visible).toBe(false);
    // a rival's are smaller
    const r = new ExhaustFlames(new Group(), 'juniper');
    r.update(kart('none', 0, true, 2, { isPlayer: false }), 1);
    expect(uniforms(r).uStar.value).toBeLessThan(STAR.size[2]);
    // at the rear tires of the racer's model
    expect(u.uWheel.value.toArray()).toEqual(wheelContact(MODEL_WHEELS.juniper.rear, new Vector3()).toArray());
  });

  it('a kart built from parts: the flames hang off its body bone, its stars sit at its rear hub, and the air still turns with its chassis', () => {
    const chassis = new Group(), body = new Group(), kartBone = new Group(), hub = new Group();
    body.name = 'body'; hub.name = 'hubRL';
    hub.position.set(0.5, 0.29, -0.55);
    kartBone.add(body, hub);
    chassis.add(kartBone);
    chassis.userData.rig = {};
    chassis.userData.exhaustAnchor = body;
    const f = new ExhaustFlames(chassis, 'juniper'), u = uniforms(f);
    expect(f.mesh!.parent).toBe(body);
    expect(u.uWheel.value.toArray()).toEqual(wheelContact({ x: 0.5, z: -0.55, r: 0.29, w: 0.14 }, new Vector3()).toArray());
    // the springs tip the body bone; the air is read from the chassis's own turn
    body.rotation.y = 0.3;
    chassis.rotation.y = 0.5;
    f.update(kart('pad', 0.7, false, 0, { speed: 20 }), 1);
    const s = Math.sin(0.5), c = Math.cos(0.5), n = Math.hypot(s, FLAME.windDrop, c);
    expect(u.uWind.value.x).toBeCloseTo(s / n, 6);
  });

  it('a shared body burns from its own pipes and sparks from its own tires', () => {
    const chassis = new Group();
    chassis.userData.exhaust = { ...BODY_EXHAUST.buggy, flame: '#ffffff' };
    const f = new ExhaustFlames(chassis, 'gus');
    expect((f.mesh as Mesh).geometry).toBe(jetGeometry(chassis.userData.exhaust));
    expect(uniforms(f).uWheel.value.toArray()).toEqual(wheelContact(BODY_WHEELS.buggy.rear, new Vector3()).toArray());
  });
});
