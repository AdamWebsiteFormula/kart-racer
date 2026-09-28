// The course limit, stretch by stretch (limits.ts; 27 Sept 2026, Adam on how close the hedges and fences may
// come: "Whatever Mario Kart World does"). Measured on Mario Kart World's open-country courses with the road's
// own width as the ruler (track-builder SOP): straights keep a narrow verge, the outside of a bend opens up,
// the inside stays tight, the start straight keeps its own; a shortcut's mouth stays reachable; the limit
// eases along the road, never steps; the same every build, and mirrored in Mirror mode.
import { describe, expect, it } from 'vitest';
import { cloneDef } from './__tests__/fixtures.ts';
import { BUILDER } from './constants.ts';
import { courseLimitRaw } from './limits.ts';
import type { Lut } from './lut.ts';
import { mirrorTrack } from './mirror.ts';
import { buildTrack, type Track } from './track.ts';
import type { TrackDefinition } from './types.ts';

const TRACKS = Object.values(import.meta.glob('./tracks/*.json', { eager: true, import: 'default' })) as TrackDefinition[];
const LIMITED = TRACKS.filter((d) => d.offroad && d.courseLimit);
const built = new Map<string, Track>();
const track = (def: TrackDefinition): Track => {
  let t = built.get(def.id);
  if (!t) built.set(def.id, (t = buildTrack(cloneDef(def))));
  return t;
};
const W = (L: Lut, i: number): number => 2 * (L.hw[i] + BUILDER.kerbWidth);
const clamp = (m: number): number => Math.max(BUILDER.limitMin, Math.min(BUILDER.limitMax, m));
/** Main samples a stretch's own value is laid on: every sample within `metres` has bend weight `w` and none is near the start, a mouth, a tunnel or a shortcut's road. */
function plain(t: Track, bend: Float32Array, pick: (w: number) => boolean, metres: number): number[] {
  const L = t.branches.main.lut, ds = L.length / L.step, k = Math.ceil(metres / ds);
  const busy = new Uint8Array(L.n);
  const mark = (tc: number, m: number) => { const c = Math.round(tc * L.step), r = Math.ceil(m / ds); for (let d = -r; d <= r; d++) busy[L.idx(c + d)] = 1; };
  mark(t.startT, Math.max(...BUILDER.limitStart) + metres);
  for (const b of t.branches.list) if (!b.isMain) { mark(b.entryT, BUILDER.limitMouth + metres); mark(b.exitT, BUILDER.limitMouth + metres); }
  for (let i = 0; i < L.n; i++) if (L.covered[i]) mark(i / L.step, BUILDER.tunnelFunnel + metres);
  const out: number[] = [];
  for (let i = 0; i < L.n; i++) {
    if (busy[i]) continue;
    let ok = true;
    for (let d = -k; d <= k && ok; d++) ok = pick(bend[L.idx(i + d)]);
    if (ok) out.push(i);
  }
  return out;
}
/** Metres the limit can ease across: from limitMin to limitMax at limitSlope. */
const EASE = (BUILDER.limitMax - BUILDER.limitMin) / BUILDER.limitSlope + 2;

describe('the course limit, stretch by stretch (limits.ts)', () => {
  it('is laid on every off-road track that sets one, from shares of its road width with both curbs', () => {
    expect(LIMITED.map((d) => d.id).sort()).toEqual(['canyon-rush', 'frostbite-pass', 'harbour-loop', 'meadow-run']);
    for (const d of LIMITED) {
      const cl = d.courseLimit!;
      // Mario Kart World's measured shares (SOP): a narrow straight, a wide outside, a tight inside
      expect(cl.straight!, d.id).toBeLessThanOrEqual(0.5);
      expect(cl.outside!, d.id).toBeGreaterThanOrEqual(2 * cl.straight!);
      expect(cl.inside!, d.id).toBeLessThanOrEqual(cl.straight!);
    }
  });

  it('on a straight, both sides keep the straight share: a quarter to a half of the road width', () => {
    for (const d of LIMITED) {
      const t = track(d), L = t.branches.main.lut, raw = courseLimitRaw(L, d.courseLimit!, t.startT);
      const at = plain(t, raw.bend, (w) => w === 0, EASE);
      expect(at.length, `${d.id}: long straights`).toBeGreaterThan(20);
      for (const i of at) {
        const want = clamp(d.courseLimit!.straight! * W(L, i));
        expect(L.reachL[i], `${d.id} left at ${i}`).toBeCloseTo(want, 3);
        expect(L.reachR[i], `${d.id} right at ${i}`).toBeCloseTo(want, 3);
      }
    }
  });

  it('in a bend, the outside opens up toward its share and the inside stays tight', () => {
    for (const d of LIMITED) {
      const t = track(d), L = t.branches.main.lut, cl = d.courseLimit!, raw = courseLimitRaw(L, cl, t.startT);
      const at = plain(t, raw.bend, (w) => w > 0.5, 0);
      expect(at.length, `${d.id}: bends`).toBeGreaterThan(20);
      let out = 0, inn = 0, wider = 0;
      for (const i of at) {
        // the bend's own values, by how sharply it turns (easing only widens them)
        const w = raw.bend[i], outL = raw.left[i] > raw.right[i];
        const o = outL ? L.reachL[i] : L.reachR[i], n = outL ? L.reachR[i] : L.reachL[i];
        const straight = cl.straight! * W(L, i);
        expect(o, `${d.id} outside at ${i}`).toBeGreaterThanOrEqual(clamp(straight + w * (cl.outside! * W(L, i) - straight)) - 1e-3);
        expect(n, `${d.id} inside at ${i}`).toBeGreaterThanOrEqual(clamp(straight + w * (cl.inside! * W(L, i) - straight)) - 1e-3);
        out += o / W(L, i); inn += n / W(L, i);
        if (o > n + 1) wider++;
      }
      // (an S-bend's inside can take its neighbour's outside as it eases: most bend samples still read wide outside, tight inside)
      expect(wider / at.length, d.id).toBeGreaterThan(0.6);
      expect(out / at.length - inn / at.length, d.id).toBeGreaterThan(0.2);
    }
  });

  it('the start straight keeps its own share on both sides (the grid and the gantry)', () => {
    for (const d of LIMITED) {
      const t = track(d), L = t.branches.main.lut, i = Math.round(t.startT * L.step) % L.n;
      const want = clamp(d.courseLimit!.start! * W(L, i));
      for (const r of [L.reachL[i], L.reachR[i]]) {
        expect(r, d.id).toBeGreaterThanOrEqual(want - 1e-3);
        expect(r, d.id).toBeLessThan(want + 2);
      }
    }
  });

  it('eases along the road at no more than limitSlope metres per metre: a kart running wide is led back, never stopped by a step', () => {
    for (const d of LIMITED) {
      const t = track(d), L = t.branches.main.lut, ds = L.length / L.step;
      for (const r of [L.reachL, L.reachR]) {
        let worst = 0;
        for (let i = 0; i < L.n; i++) {
          const j = L.idx(i + 1);
          if (L.covered[i] || L.covered[j]) continue;
          worst = Math.max(worst, Math.abs(r[j] - r[i]) / ds);
        }
        expect(worst, d.id).toBeLessThanOrEqual(BUILDER.limitSlope + 1e-3);
      }
    }
  });

  it("keeps a shortcut's mouth reachable: offroadReach on the shortcut's side, limitMouth metres each way", () => {
    let mouths = 0;
    for (const d of LIMITED) {
      const t = track(d), L = t.branches.main.lut, ds = L.length / L.step;
      for (const b of t.branches.list) {
        if (b.isMain) continue;
        for (const [tm, u] of [[b.entryT, 0.12], [b.exitT, 0.88]] as const) {
          const p = b.lut.sample(u, 0).position, c = L.sample(tm, 0), h = Math.hypot(c.tangent[0], c.tangent[2]);
          const lateral = ((p[0] - c.position[0]) * c.tangent[2] - (p[2] - c.position[2]) * c.tangent[0]) / h;
          const r = lateral < 0 ? L.reachL : L.reachR, i0 = Math.round(tm * L.step), k = Math.floor(BUILDER.limitMouth / ds);
          for (let dd = -k; dd <= k; dd++) {
            const i = L.idx(i0 + dd);
            if (!L.covered[i]) expect(r[i], `${d.id} ${b.id} mouth`).toBeGreaterThanOrEqual(BUILDER.offroadReach - 1e-3);
          }
          mouths++;
        }
      }
    }
    expect(mouths).toBeGreaterThanOrEqual(4);
  });

  it('leaves every shortcut, and every track without one, at offroadReach (a tunnel: nothing)', () => {
    for (const d of TRACKS) {
      const t = track(d);
      for (const b of t.branches.list) {
        if (b.isMain && d.offroad && d.courseLimit) continue;
        const L = b.lut;
        for (let i = 0; i < L.n; i++) {
          for (const r of [L.reachL[i], L.reachR[i]]) {
            if (L.covered[i]) expect(r, `${d.id} ${b.id} covered`).toBe(0);
            else expect(r, `${d.id} ${b.id}`).toBeLessThanOrEqual(BUILDER.offroadReach + 1e-6);
          }
        }
      }
    }
  });

  it('is the same every build, and mirrored left for right in Mirror mode', () => {
    for (const d of LIMITED) {
      const a = track(d).branches.main.lut, b = buildTrack(cloneDef(d)).branches.main.lut;
      expect(Array.from(b.reachL)).toEqual(Array.from(a.reachL));
      expect(Array.from(b.reachR)).toEqual(Array.from(a.reachR));
      const m = buildTrack(mirrorTrack(cloneDef(d))).branches.main.lut;
      let worst = 0;
      for (let i = 0; i < a.n; i++) worst = Math.max(worst, Math.abs(m.reachL[i] - a.reachR[i]), Math.abs(m.reachR[i] - a.reachL[i]));
      expect(worst, d.id).toBeLessThan(0.05);
    }
  });
});
