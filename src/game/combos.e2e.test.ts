// Any racer in any kart is fair (design §5; docs/plans/kart-combos.md §3). Every distinct speed,
// accel and handling total over the 80 racer-and-kart pairs races a 150cc Time Trial on every track
// with the Hard AI at the wheel, the class gate's measure (balance.e2e.test.ts: the same three
// personalities, pip, juniper and gus, averaged; the exact solo race the leaderboard scores, items and
// hazards as they are). Pairs with the same total race the same race: weight only moves bumps, and a
// solo run has none. The gates (decided 25 Sept 2026 with the class gate's tolerance, which Adam
// approved for the classes on 24 Sept):
// G0: every combo within 4% of the track's median.
// G1: every racer in every kart within 4% of the same racer in their own kart on every track, and
//     within 1.5% on the six tracks' mean.
// G2: no combo is the fastest on more than 2 of the 6 tracks.
// One test per track, then G1's mean and G2 over all six. COMBOS_TABLE=1 prints each track's times.
// The scripted near-perfect drifter's view of the same table is a report, not a gate: combos.report.test.ts.
import { describe, expect, it } from 'vitest';
import { AiDriver } from '../ai-driver/index.ts';
import { PERSONALITIES } from '../ai-driver/personalities.ts';
import { soloConfig } from '../backend-leaderboard/rules.ts';
import { Items } from '../items/items.ts';
import { ownKartOf } from '../kart-controller/karts.ts';
import { SIM_HZ } from '../kart-controller/step.ts';
import { NEUTRAL_INPUT } from '../kart-controller/types.ts';
import { RaceManager } from '../race-manager/index.ts';
import { buildTrack } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { COMBOS, keyOf, median, nameOf, PAIRS } from './__tests__/combos.ts';
import { simTick, type SimParts } from './simtick.ts';

const FILES = import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' }) as Record<string, TrackDefinition>;
const TRACKS = Object.values(FILES).sort((a, b) => a.id.localeCompare(b.id));
/** The class gate's three drivers (drift use 0.9 / 0.7 / 0.5), so a combo's time is not one driver's line. */
const DRIVERS = ['pip', 'juniper', 'gus'];
const G0 = 0.04, G1 = 0.04, G1_MEAN = 0.015, G2 = 2;

/** A 150cc Time Trial of `racerId` in `kartId`, the Hard AI at the wheel with `driver`'s personality; its time in s, and the claw rescues. */
function race(def: TrackDefinition, racerId: string, kartId: string, driver: string): { time: number; rescues: number } {
  const solo = soloConfig('timeTrial', def.id, racerId, 0);
  const config = { ...solo, racers: [{ ...solo.racers[0], kartId }] };
  const track = buildTrack(def);
  const manager = new RaceManager(track, config);
  const items = new Items(track, manager);
  const ai = new AiDriver(track, config, manager.state, { itemRoles: items.roles, personalities: { [racerId]: PERSONALITIES[driver] } });
  ai.drivePlayer = true;
  const inputs = manager.state.karts.map(() => ({ ...NEUTRAL_INPUT }));
  const parts: SimParts = { manager, items, ai, inputs, playerIndex: manager.playerIndex, playerSlot: { ...NEUTRAL_INPUT } };
  let rescues = 0;
  for (let t = 0; t < 300 * SIM_HZ && manager.state.phase !== 'finished'; t++) {
    for (const e of simTick(parts, null).race) if (e.type === 'rescue' && e.phase === 'start') rescues++;
  }
  const row = manager.results().ranks[0];
  expect(row.dnf, `${def.id} ${racerId} in ${kartId} (${driver}) finishes`).toBe(false);
  return { time: row.timeMs / 1000, rescues };
}

/** Each track's time (s) per combo key, filled by the per-track tests. */
const TIMES = new Map<string, Map<string, number>>();

describe(`any racer in any kart: ${COMBOS.length} distinct totals over ${PAIRS.length} pairs, the Hard AI, 150cc`, () => {
  for (const def of TRACKS) {
    it(`${def.id}: G0 every combo within 4% of the median, G1 every pair within 4% of the racer in their own kart`, () => {
      const times = new Map<string, number>();
      let rescues = 0;
      for (const c of COMBOS) {
        const runs = DRIVERS.map((d) => race(def, c.racerId, c.kartId, d));
        rescues += runs.reduce((s, r) => s + r.rescues, 0);
        times.set(c.key, runs.reduce((s, r) => s + r.time, 0) / runs.length);
      }
      TIMES.set(def.id, times);
      const med = median([...times.values()]);
      if (import.meta.env.COMBOS_TABLE) {
        const rows = [...times].sort((a, b) => a[1] - b[1]).map(([k, t]) => `  ${t.toFixed(3)} ${((t / med - 1) * 100).toFixed(2).padStart(6)}%  ${k.padEnd(40)} ${nameOf(k)}`);
        console.log(`${def.id} median ${med.toFixed(3)} s, claw rescues ${rescues}\n${rows.join('\n')}`);
      }
      const g0 = [...times].filter(([, t]) => Math.abs(t / med - 1) > G0).map(([k, t]) => `${nameOf(k)} ${((t / med - 1) * 100).toFixed(2)}%`);
      expect(g0, `G0 ${def.id}: combos more than 4% from the median ${med.toFixed(2)} s`).toEqual([]);
      const g1 = PAIRS.map((p) => ({ p, d: (times.get(p.key) as number) / (times.get(keyOf(p.racerId, ownKartOf(p.racerId))) as number) - 1 }))
        .filter((x) => Math.abs(x.d) > G1).map((x) => `${x.p.racerId} in ${x.p.kartId} ${(x.d * 100).toFixed(2)}%`);
      expect(g1, `G1 ${def.id}: pairs more than 4% from the racer in their own kart`).toEqual([]);
    });
  }

  it(`G1 on the mean: every racer in every kart within 1.5% of their own kart over the ${TRACKS.length} tracks; G2: no combo the fastest on more than ${G2}`, () => {
    expect([...TIMES.keys()].sort(), 'every track measured first').toEqual(TRACKS.map((d) => d.id));
    const means = PAIRS.map((p) => {
      const own = keyOf(p.racerId, ownKartOf(p.racerId));
      const d = TRACKS.reduce((s, def) => s + (TIMES.get(def.id)!.get(p.key) as number) / (TIMES.get(def.id)!.get(own) as number) - 1, 0) / TRACKS.length;
      return { p, d };
    });
    const g1 = means.filter((x) => Math.abs(x.d) > G1_MEAN).map((x) => `${x.p.racerId} in ${x.p.kartId} ${(x.d * 100).toFixed(2)}%`);
    expect(g1, 'G1 mean: pairs more than 1.5% from their own kart over the six tracks').toEqual([]);
    const wins = new Map<string, string[]>();
    for (const [track, times] of TIMES) {
      const best = Math.min(...times.values());
      for (const [k, t] of times) if (t === best) wins.set(k, [...(wins.get(k) ?? []), track]);
    }
    const g2 = [...wins].filter(([, tracks]) => tracks.length > G2).map(([k, tracks]) => `${nameOf(k)} fastest on ${tracks.join(', ')}`);
    expect(g2, 'G2').toEqual([]);
    if (import.meta.env.COMBOS_TABLE) {
      const worst = means.reduce((m, x) => (Math.abs(x.d) > Math.abs(m.d) ? x : m));
      console.log(`G1 worst mean: ${worst.p.racerId} in ${worst.p.kartId} ${(worst.d * 100).toFixed(2)}%; fastest: ${[...wins].map(([k, t]) => `${nameOf(k)} (${t.join(', ')})`).join('; ')}`);
    }
  });
});
