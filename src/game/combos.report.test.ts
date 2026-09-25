// A report, not a gate (25 Sept 2026): the kart table as the scripted near-perfect drifter sees it
// (__tests__/scripted.ts: one minimum-curvature line per track, a drift through every bend, coins,
// balloons, pads and hazards off), so later tuning can see the time-trial picture. It never runs in CI:
//   COMBOS_REPORT=1 npx vitest run src/game/combos.report.test.ts --reporter=verbose
// Per track: each class in its own kart against the median of every distinct total, the fastest and
// slowest totals, and the pair furthest from the same racer in their own kart. Why it is not the
// gate: kart-controller SOP Lessons, 25 Sept 2026 (low handling charges the drift at the full rate).
import { describe, expect, it } from 'vitest';
import { ownKartOf } from '../kart-controller/karts.ts';
import { buildTrack } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { COMBOS, keyOf, median, nameOf, PAIRS } from './__tests__/combos.ts';
import { idealLine, runScripted } from './__tests__/scripted.ts';

const FILES = import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' }) as Record<string, TrackDefinition>;
const TRACKS = Object.values(FILES).sort((a, b) => a.id.localeCompare(b.id));
const CLASSES: [string, string][] = [['light', 'pip'], ['medium', 'juniper'], ['heavy', 'gus']];
const pct = (x: number) => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(2)}%`;

describe.runIf(!!import.meta.env.COMBOS_REPORT)('report: the kart table under the scripted near-perfect drifter, 150cc', () => {
  it('prints each track', () => {
    const lines: string[] = [];
    for (const def of TRACKS) {
      const line = idealLine(buildTrack({ ...def, coins: [], pickups: [], boostPads: [] } as TrackDefinition));
      const runs = COMBOS.map((c) => ({ key: c.key, run: runScripted(def, c.racerId, true, { kartId: c.kartId, line }) }));
      const times = new Map(runs.map((r) => [r.key, r.run.time]));
      for (const t of times.values()) expect(t).toBeGreaterThan(0);
      const walls = runs.reduce((s, r) => s + r.run.walls, 0), rescues = runs.reduce((s, r) => s + r.run.rescues, 0);
      const med = median([...times.values()]);
      const sorted = [...times].sort((a, b) => a[1] - b[1]);
      const own = (r: string) => times.get(keyOf(r, ownKartOf(r))) as number;
      const worst = PAIRS.map((p) => ({ p, d: (times.get(p.key) as number) / own(p.racerId) - 1 })).reduce((m, x) => (Math.abs(x.d) > Math.abs(m.d) ? x : m));
      lines.push(`${def.id}: median ${med.toFixed(2)} s; own karts ${CLASSES.map(([c, r]) => `${c} ${pct(own(r) / med - 1)}`).join(', ')}; `
        + `fastest ${nameOf(sorted[0][0])} ${pct(sorted[0][1] / med - 1)}, slowest ${nameOf(sorted[sorted.length - 1][0])} ${pct(sorted[sorted.length - 1][1] / med - 1)}; `
        + `furthest from own kart ${worst.p.racerId} in ${worst.p.kartId} ${pct(worst.d)}; wall hits ${walls}, claw rescues ${rescues} over ${runs.length} runs`);
    }
    console.log(lines.join('\n'));
  }, 600_000);
});
