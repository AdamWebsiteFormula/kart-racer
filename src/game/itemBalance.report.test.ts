// A report, not a gate (28 Sept 2026, three item slots; Adam: "Yes, 3 item slots"): item balance by place in
// all-AI eight-kart races at each class, six tracks, two seeds (ITEMS_REPORT_SEEDS for more), the game's own sim
// tick, and the difficulty gate's stand-in races with their numbers. It never runs in CI:
//   ITEMS_REPORT=1 ITEMS_REPORT_FILE=/tmp/items.txt ./node_modules/.bin/vitest run src/game/itemBalance.report.test.ts
// Per place (the kart's rank at the moment): balloon rolls a minute, balloons that gave nothing a minute (a full
// hand), items used a minute, hits taken and dealt a minute, the share of time with an item in hand and the mean
// items held. Per class: how often the lap-1 leader wins, how far the back three at the end of lap 1 climb, the
// winning margin and the first-to-last spread. The numbers before and after are in docs/sops/items.md Decisions.
import { describe, expect, it } from 'vitest';
import { AiDriver } from '../ai-driver/index.ts';
import { Items } from '../items/items.ts';
import { SIM_HZ } from '../kart-controller/step.ts';
import { NEUTRAL_INPUT, type KartState, type SpeedClass } from '../kart-controller/types.ts';
import { RaceManager } from '../race-manager/index.ts';
import { buildTrack } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { fieldRace, type FieldResult } from './__tests__/fieldRace.ts';
import { lineup } from './lineup.ts';
import { simTick, type SimParts } from './simtick.ts';

const FILES = import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' }) as Record<string, TrackDefinition>;
const TRACKS = Object.values(FILES).sort((a, b) => a.id.localeCompare(b.id));
/** ITEMS_REPORT_SEEDS=<n>: seeds 1 to n on every track (default 2, the difficulty gate's) */
const SEEDS = Array.from({ length: Number(import.meta.env.ITEMS_REPORT_SEEDS ?? 2) }, (_, k) => k + 1);
const PLACES = 8;

/** Item slots taken (an item in it, or its roulette rolling), however many slots the state has. */
function slotsTaken(s: KartState): number {
  const it = s.item as unknown as Record<string, string | number | undefined>;
  let n = 0;
  for (const [id, roll] of [['held', 'rouletteRemaining'], ['next', 'nextRouletteRemaining'], ['third', 'thirdRouletteRemaining']]) {
    const v = it[id];
    if (v === undefined) continue;
    if (v !== 'none' || Number(it[roll] ?? 0) > 0) n++;
  }
  return n;
}

interface Tally {
  ticks: number[]; rolls: number[]; wasted: number[]; used: number[]; taken: number[]; dealt: number[]; inHand: number[]; held: number[];
  races: number; lap1LeaderWins: number;
  /** the back three when the leader starts lap 2: places climbed from there to the finish, their finishing places, how many */
  backClimb: number; backFinish: number; backKarts: number;
  margin: number; spread: number;
}

const zeros = () => new Array<number>(PLACES + 1).fill(0);
const tally = (): Tally => ({ ticks: zeros(), rolls: zeros(), wasted: zeros(), used: zeros(), taken: zeros(), dealt: zeros(), inHand: zeros(), held: zeros(), races: 0, lap1LeaderWins: 0, backClimb: 0, backFinish: 0, backKarts: 0, margin: 0, spread: 0 });

/** One all-AI race at `cc` on `def`, seed `seed`, added to `t`. */
function race(def: TrackDefinition, cc: SpeedClass, seed: number, t: Tally): void {
  const track = buildTrack(def);
  const config = { mode: 'quick' as const, trackId: def.id, speedClass: cc, seed, racers: lineup(null) };
  const manager = new RaceManager(track, config);
  const items = new Items(track, manager);
  const ai = new AiDriver(track, config, manager.state, { itemRoles: items.roles });
  const inputs = manager.state.karts.map(() => ({ ...NEUTRAL_INPUT }));
  const parts: SimParts = { manager, items, ai, inputs, playerIndex: -1, playerSlot: { ...NEUTRAL_INPUT } };
  const karts = manager.state.karts;
  const rankOf = (id: string) => karts.find((k) => k.racerId === id)?.rank ?? 0;
  let lap1Leader = '';
  const lap1Back: { id: string; rank: number }[] = [];
  for (let n = 0; n < 400 * SIM_HZ && manager.state.phase !== 'finished'; n++) {
    const ev = simTick(parts, null);
    const st = manager.state;
    if (st.phase !== 'racing' && st.phase !== 'finalLap') continue;
    const rolled = new Set<string>();
    for (const e of ev.items) {
      if (e.type === 'roulette') { t.rolls[rankOf(e.racerId)]++; rolled.add(e.racerId); }
      else if (e.type === 'itemUsed') t.used[rankOf(e.racerId)]++;
      else if (e.type === 'hit') { t.taken[rankOf(e.racerId)]++; t.dealt[rankOf(e.byRacerId)]++; }
    }
    for (const e of ev.race) {
      if (e.type === 'pickup' && !rolled.has(e.racerId)) t.wasted[rankOf(e.racerId)]++;
      // the end of lap 1: the leader starts lap 2
      if (e.type === 'lap' && e.lap === 2 && !lap1Leader) {
        lap1Leader = e.racerId;
        for (const k of karts) if (k.rank > PLACES - 3) lap1Back.push({ id: k.racerId, rank: k.rank });
      }
    }
    for (const k of karts) {
      if (k.finishTick !== undefined || k.rank < 1 || k.rank > PLACES) continue;
      t.ticks[k.rank]++;
      const n = slotsTaken(k);
      t.held[k.rank] += n;
      if (n > 0) t.inHand[k.rank]++;
    }
  }
  expect(manager.state.phase, `${def.id} ${cc}cc seed ${seed} finishes`).toBe('finished');
  const ranks = manager.results().ranks;
  const time = (r: (typeof ranks)[number]) => (r.dnf ? r.projectedMs : r.timeMs) / 1000;
  const byRank = [...ranks].sort((a, b) => a.rank - b.rank);
  t.races++;
  if (byRank[0].racerId === lap1Leader) t.lap1LeaderWins++;
  for (const b of lap1Back) {
    const finish = ranks.find((r) => r.racerId === b.id)?.rank ?? PLACES;
    t.backClimb += b.rank - finish; t.backFinish += finish; t.backKarts++;
  }
  t.margin += time(byRank[1]) - time(byRank[0]);
  t.spread += time(byRank[byRank.length - 1]) - time(byRank[0]);
}

function report(cc: SpeedClass, t: Tally): string {
  const perMin = (xs: number[], p: number) => (t.ticks[p] ? (xs[p] / (t.ticks[p] / SIM_HZ / 60)).toFixed(1) : '-');
  const pct = (xs: number[], p: number) => (t.ticks[p] ? `${Math.round((100 * xs[p]) / t.ticks[p])}%` : '-');
  const mean = (xs: number[], p: number) => (t.ticks[p] ? (xs[p] / t.ticks[p]).toFixed(2) : '-');
  const row = (name: string, f: (p: number) => string) => `  ${name.padEnd(16)}${Array.from({ length: PLACES }, (_, k) => f(k + 1).padStart(6)).join('')}`;
  return [
    `${cc}cc, ${t.races} all-AI races (six tracks, seeds ${SEEDS.join(', ')}); columns are places 1 to 8`,
    row('rolls/min', (p) => perMin(t.rolls, p)),
    row('wasted/min', (p) => perMin(t.wasted, p)),
    row('used/min', (p) => perMin(t.used, p)),
    row('hits taken/min', (p) => perMin(t.taken, p)),
    row('hits dealt/min', (p) => perMin(t.dealt, p)),
    row('item in hand', (p) => pct(t.inHand, p)),
    row('items held', (p) => mean(t.held, p)),
    `  lap-1 leader wins ${t.lap1LeaderWins}/${t.races}; the back three after lap 1 climb ${(t.backClimb / Math.max(1, t.backKarts)).toFixed(2)} places on average (mean finish ${(t.backFinish / Math.max(1, t.backKarts)).toFixed(2)}); winning margin ${(t.margin / t.races).toFixed(2)} s; first to last ${(t.spread / t.races).toFixed(1)} s`,
  ].join('\n');
}

/** Print `text`; ITEMS_REPORT_FILE=<path> also appends it there (a vitest worker's stdout can go missing: race-manager SOP Lessons). */
async function out(text: string): Promise<void> {
  console.log(text);
  const file = import.meta.env.ITEMS_REPORT_FILE;
  if (file) ((await import('node:fs' as string)) as { appendFileSync(p: string, s: string): void }).appendFileSync(String(file), `${text}\n`);
}

describe.runIf(!!import.meta.env.ITEMS_REPORT)('report: item balance by place, all-AI races', () => {
  for (const cc of [50, 100, 150] as const) {
    it(`${cc}cc`, async () => {
      const t = tally();
      for (const def of TRACKS) for (const seed of SEEDS) race(def, cc, seed, t);
      await out(report(cc, t));
    }, 600_000);
  }
});

// The difficulty gate's own races (game/difficulty.e2e.test.ts), with their numbers: the stand-in in the player's seat.
describe.runIf(!!import.meta.env.ITEMS_REPORT)('report: the difficulty gate\'s stand-in races', () => {
  for (const [cc, who] of [[50, 'kid'], [100, 'expert'], [100, 'adult'], [150, 'expert']] as const) {
    it(`${cc}cc ${who}`, async () => {
      const rows = TRACKS.flatMap((def) => SEEDS.map((seed) => fieldRace(def, cc, who, seed)));
      const n = rows.length;
      const mean = (f: (r: FieldResult) => number) => rows.reduce((a, r) => a + f(r), 0) / n;
      await out(`${cc}cc ${who}: ${rows.filter((r) => r.place === 1).length}/${n} wins, ${rows.filter((r) => r.place <= 3).length}/${n} podiums, mean place ${mean((r) => r.place).toFixed(2)}, mean gap to the best AI ${mean((r) => r.gap).toFixed(1)} s`);
    }, 600_000);
  }
});
