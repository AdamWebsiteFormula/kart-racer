// The Final Lap Shift's show, pure: its beats come on the shift's own tick and read within 3 s, its
// flashes stay at three a second at most (WCAG 2.3.1) with reduced motion gentler still, the fog only
// closes in for a blizzard, and its sounds are the game's own.
import { describe, expect, it } from 'vitest';
import { FIREWORKS } from '../art-pipeline/vista.ts';
import { PATCHES } from '../audio/sfx.ts';
import { CUES, fogAt, FOG, flashOnsets, LIGHTNING, lightning, lightningOnsets, mostInWindow, SHOW, STRIKES, THUNDER } from './shiftShow.ts';
import type { ShiftKind } from './types.ts';

const KINDS: ShiftKind[] = ['flood', 'storm', 'collapse', 'blizzard', 'fireworks', 'sunset'];

/**
 * Boardwalk's far fireworks after the shift (art-pipeline vista.ts, its shader's `burst`): a point bursts
 * where fract((clock - t0) / period + phase) wraps to 0. The finale's points start on the shift
 * (t0 = 0 here); the two that burst all race long (t0 = 0 on the page clock) meet the shift at any
 * offset, so every offset is tried.
 */
function vistaOnsets(offset: number, until: number): number[] {
  const out: number[] = [];
  for (const f of FIREWORKS) {
    const start = f.finaleOnly ? 0 : -offset;
    for (let m = Math.ceil(f.phase - 1e-9); ; m++) {
      const t = start + (m - f.phase) * f.period;
      if (t > until) break;
      if (t >= 0) out.push(t);
    }
  }
  return out;
}

describe('the Final Lap Shift show (shiftShow.ts)', () => {
  it('every kind\'s main move starts on the shift\'s tick and is over within 3 s (readable from the chase camera)', () => {
    const spans: [number, number][] = [
      [SHOW.flood.rise[0], SHOW.flood.rise[1]], [SHOW.storm.clouds[0], SHOW.storm.fall[1]], [SHOW.collapse.snap, SHOW.collapse.snap + 1.5],
      [SHOW.blizzard.freeze[0], SHOW.blizzard.freeze[1]], [SHOW.fireworks.spokes[0], SHOW.fireworks.path[1]], [SHOW.sunset.finish[0], SHOW.sunset.rail[1]],
    ];
    for (const [a, b] of spans) {
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(1);
      expect(b).toBeLessThanOrEqual(3);
    }
    // the rope bridge's planks: from the middle out, every one gone within 3 s of the shift
    expect(SHOW.collapse.snap + 45 * SHOW.collapse.gap).toBeLessThan(3);
  });

  it('flashes stay at three a second at most, far fireworks and all, and fewer with reduced motion', () => {
    for (const kind of KINDS) {
      for (const reduced of [false, true]) {
        const own = flashOnsets(kind, reduced, 120);
        let worst = mostInWindow(own);
        if (kind === 'fireworks') for (let off = 0; off < 10; off += 0.05) worst = Math.max(worst, mostInWindow([...own, ...vistaOnsets(off, 120)]));
        expect(worst, `${kind}${reduced ? ' (reduced)' : ''}`).toBeLessThanOrEqual(3);
        if (reduced) expect(own.length).toBeLessThanOrEqual(flashOnsets(kind, false, 120).length);
      }
    }
    // the storm: the stroke and its return, then a far strike every 5 to 8.5 s
    expect(mostInWindow(lightningOnsets(300, false))).toBe(2);
    expect(mostInWindow(lightningOnsets(300, true))).toBe(1);
    for (let i = 1; i < STRIKES.length; i++) {
      expect(STRIKES[i] - STRIKES[i - 1]).toBeGreaterThanOrEqual(LIGHTNING.gap[0]);
      expect(STRIKES[i] - STRIKES[i - 1]).toBeLessThanOrEqual(LIGHTNING.gap[1]);
    }
  });

  it('lightning: dark before its first strike, a flash at each, gentler with reduced motion', () => {
    for (const t of [-1, 0, 0.3, SHOW.storm.strike - 0.01]) expect(lightning(t, false)).toBe(0);
    const peak = (reduced: boolean) => { let m = 0; for (let t = SHOW.storm.strike; t < SHOW.storm.strike + 0.5; t += 0.005) m = Math.max(m, lightning(t, reduced)); return m; };
    expect(peak(false)).toBeGreaterThan(0.9);
    expect(peak(true)).toBeLessThanOrEqual(LIGHTNING.reducedAmp + 1e-9);
    // it dies away between strikes
    expect(lightning(SHOW.storm.strike + 1.5, false)).toBe(0);
    // thunder follows each far strike, after its flash
    expect(THUNDER.delay).toBeGreaterThan(LIGHTNING.restrike);
  });

  it('the fog closes in for a blizzard only, from the shift', () => {
    const o = { near: 0, far: 0 };
    for (const kind of KINDS) {
      expect(fogAt(kind, -1, o)).toEqual({ near: FOG.near, far: FOG.far });
      fogAt(kind, 10, o);
      if (kind === 'blizzard') expect(o).toEqual({ near: FOG.blizzardNear, far: FOG.blizzardFar });
      else expect(o).toEqual({ near: FOG.near, far: FOG.far });
    }
    // and it eases in: halfway through, halfway there
    fogAt('blizzard', (SHOW.blizzard.fog[0] + SHOW.blizzard.fog[1]) / 2, o);
    expect(o.far).toBeCloseTo((FOG.far + FOG.blizzardFar) / 2, 5);
  });

  it('its sounds are the game\'s own (no new recordings), after the shift\'s sting starts', () => {
    const ids = new Set(Object.keys(PATCHES));
    for (const kind of KINDS) for (const c of CUES[kind] ?? []) {
      expect(ids.has(c.sfx), c.sfx).toBe(true);
      expect(c.at).toBeGreaterThan(0);
      expect(c.gain).toBeLessThanOrEqual(1);
    }
    expect(ids.has(THUNDER.sfx)).toBe(true);
  });
});
