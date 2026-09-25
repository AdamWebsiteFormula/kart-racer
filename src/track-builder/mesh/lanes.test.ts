// The PBR look's road (look review, 25 Sept 2026): the racing line and the red-and-white curbs on the
// inside of tight corners, both read from the spline's curvature (road.ts racingLine, insideCurbs), and
// the ribbon attributes that carry them (`lane`, `curb`). The toon look reads neither.
import { describe, expect, it } from 'vitest';
import { buildLut, type Lut } from '../lut.ts';
import { buildTrack } from '../track.ts';
import type { ControlPoint } from '../types.ts';
import { HARBOUR_LOOP } from '../__tests__/fixtures.ts';
import { paletteFor } from './palette.ts';
import { buildRibbon, CURBS, insideCurbs, racingLine, RACING_LINE, ROAD_MARK, turnAt } from './road.ts';

/** A stadium: two 220 m straights joined by two hairpins of radius `r` round (±110, 0). */
function stadium(r: number): ControlPoint[] {
  const pts: ControlPoint[] = [];
  for (const [cx, from] of [[110, -Math.PI / 2], [-110, Math.PI / 2]] as const) {
    for (let k = 0; k <= 6; k++) {
      const a = from + (k / 6) * Math.PI;
      pts.push({ x: cx + Math.cos(a) * r, y: 0, z: Math.sin(a) * r, halfWidth: 7 });
    }
    // down the straight to the other end
    for (const f of [0.25, 0.5, 0.75]) pts.push({ x: cx > 0 ? 110 - 220 * f : -110 + 220 * f, y: 0, z: cx > 0 ? r : -r, halfWidth: 7 });
  }
  return pts;
}

/** Where the road's sample i is, and a point `side` (±1) metres × `m` across it. */
const across = (L: Lut, i: number, side: number, m: number): [number, number] => [L.px[i] + L.rx[i] * side * m, L.pz[i] + L.rz[i] * side * m];

describe('curbs on the inside of tight corners, from the curvature', () => {
  const L = buildLut(stadium(25));
  const curbs = insideCurbs(L);

  it('the turn reads as radians a metre, signed toward the side it turns to', () => {
    // a hairpin of radius 25: about 1/25 a metre at its middle, 0 on a straight's middle
    let most = 0, straight = Infinity;
    for (let i = 0; i < L.n; i++) {
      const k = Math.abs(turnAt(L, i, 6));
      most = Math.max(most, k);
      if (Math.abs(L.pz[i]) > 20 && Math.abs(L.px[i]) < 20) straight = Math.min(straight, k);
    }
    expect(most).toBeGreaterThan(0.03);
    expect(most).toBeLessThan(0.06);
    expect(straight).toBeLessThan(0.002);
  });

  it('a hairpin gets a curb on its inside only, a straight none', () => {
    let onTurn = 0, onStraight = 0;
    for (let i = 0; i < L.n; i++) {
      const w = curbs[i];
      const hairpin = Math.abs(L.px[i]) > 112; // past the hairpins' centres
      if (Math.abs(L.px[i]) < 60) { if (Math.abs(w) > 0) onStraight++; continue; }
      if (!hairpin) continue;
      expect(Math.abs(w), `sample ${i}`).toBeGreaterThan(0.95);
      onTurn++;
      // the curb's side is the one nearer the hairpin's centre
      const cx = L.px[i] > 0 ? 110 : -110;
      const [ax, az] = across(L, i, Math.sign(w), 8), [bx, bz] = across(L, i, -Math.sign(w), 8);
      expect(Math.hypot(ax - cx, az)).toBeLessThan(Math.hypot(bx - cx, bz));
    }
    expect(onTurn).toBeGreaterThan(40);
    expect(onStraight).toBe(0);
  });

  it('a gentle sweep gets none; a curb runs on a little past its corner', () => {
    // (a spline's small wobble where a straight meets a sweep may read a trace, well under where the road
    // material starts a stripe: scene.ts paintRoadLines, smoothstep(0.3, 0.6))
    const sweep = insideCurbs(buildLut(stadium(90)));
    expect(Math.max(...Array.from(sweep, Math.abs))).toBeLessThan(0.3);
    // run on: some samples just before the hairpin's turn-in (still straight) carry the curb
    const ds = L.length / L.step;
    let runOn = 0;
    for (let i = 0; i < L.n; i++) if (Math.abs(turnAt(L, i, 6)) < CURBS.from && Math.abs(curbs[i]) > 0.5) runOn++;
    expect(runOn * ds).toBeGreaterThan(CURBS.runOn);
  });

  it('mirrors with the track: the other way round the curb is on the other side', () => {
    const back = buildLut(stadium(25).map((p) => ({ ...p, x: -p.x })));
    const c = insideCurbs(back);
    let agree = 0;
    for (let i = 0; i < back.n; i++) {
      if (Math.abs(c[i]) < 0.95) continue;
      const cx = back.px[i] > 0 ? 110 : -110;
      const [ax, az] = across(back, i, Math.sign(c[i]), 8), [bx, bz] = across(back, i, -Math.sign(c[i]), 8);
      if (Math.hypot(ax - cx, az) < Math.hypot(bx - cx, bz)) agree++; else agree -= 1000;
    }
    expect(agree).toBeGreaterThan(40);
  });

  it("Harbor Loop: turn one's inside is curbed; its long straights are not; curbs are a small share of the lap", () => {
    const main = buildTrack(HARBOUR_LOOP).branches.main.lut, c = insideCurbs(main);
    // turn one, a ~20 m radius left at t 0.2 to 0.25 (its inside is the turn's own side)
    for (let t = 0.215; t <= 0.24; t += 0.005) {
      const i = Math.round(t * main.n);
      expect(Math.abs(c[i]), `t ${t}`).toBeGreaterThan(0.9);
      expect(Math.sign(c[i])).toBe(Math.sign(turnAt(main, i, 6)));
    }
    for (const t of [0.05, 0.1, 0.33, 0.62]) expect(c[Math.round(t * main.n)], `t ${t}`).toBe(0);
    let n = 0;
    for (let i = 0; i < main.n; i++) if (Math.abs(c[i]) > 0.5) n++;
    expect(n / main.n).toBeLessThan(0.2);
  });
});

describe('the racing line', () => {
  const L = buildLut(stadium(25));
  const line = racingLine(L), curbs = insideCurbs(L);

  it('swings to the inside of a hairpin and runs down the middle of a straight, never off the road', () => {
    for (let i = 0; i < L.n; i++) {
      expect(Math.abs(line[i])).toBeLessThanOrEqual((L.hw[i] - RACING_LINE.margin) * RACING_LINE.share + 1e-6);
      if (Math.abs(L.px[i]) < 40) expect(Math.abs(line[i]), `straight ${i}`).toBeLessThan(0.5);
      if (Math.abs(L.px[i]) > 128) {
        expect(Math.sign(line[i])).toBe(Math.sign(curbs[i]));
        expect(Math.abs(line[i])).toBeGreaterThan(2);
      }
    }
  });
});

describe('the ribbon carries them', () => {
  it('`lane` holds the line across the road (as uv.x) and the half-width; `curb` is on the inside kerb strips only', () => {
    const L = buildLut(stadium(25)), palette = paletteFor(HARBOUR_LOOP);
    const g = buildRibbon(L, 0, 1, palette), lane = g.getAttribute('lane'), curb = g.getAttribute('curb'), mark = g.getAttribute('mark'), pos = g.getAttribute('position');
    const line = racingLine(L);
    expect(lane.itemSize).toBe(2);
    let curbed = 0;
    for (let v = 0; v < lane.count; v++) {
      expect(lane.getX(v)).toBeGreaterThanOrEqual(0);
      expect(lane.getX(v)).toBeLessThanOrEqual(1);
      expect(lane.getY(v)).toBeCloseTo(7, 5);
      if (curb.getX(v) > 0) {
        expect(mark.getX(v)).toBe(ROAD_MARK.kerb);
        curbed++;
        // an inside kerb is the one nearer its hairpin's centre
        const x = pos.getX(v), z = pos.getZ(v), cx = x > 0 ? 110 : -110;
        if (curb.getX(v) > 0.95 && Math.abs(x) > 112) expect(Math.hypot(x - cx, z)).toBeLessThan(25);
      }
    }
    expect(curbed).toBeGreaterThan(100);
    // uv.x 0.5 is the middle: the line's own lateral comes back out (the first strip's vertices, two a sample)
    for (const i of [L.n >> 3, L.n >> 2, (L.n * 3) >> 3]) expect((lane.getX(i * 2) - 0.5) * 14).toBeCloseTo(line[i], 4);
  });
});
