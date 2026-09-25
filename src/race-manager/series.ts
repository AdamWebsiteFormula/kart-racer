// Series layer above single races. Pure functions over SeriesState: Grand Prix
// points and stars, Knockout cut lines and eliminations, and the next RaceConfig.
import type { SpeedClass } from '../kart-controller/types.ts';
import { GP_POINTS_BY_RANK, KNOCKOUT_CUT_LINES, KNOCKOUT_LAPS_PER_SEGMENT, STAR_FRACTIONS } from './constants.ts';
import type { GrandPrixState, GrandPrixTable, KnockoutState, RaceConfig, RaceResults, RacerConfig, SeriesState } from './types.ts';

export interface CupDef { id: string; trackIds: string[] }
export interface KnockoutSetDef { id: string; trackIds: string[]; cutLines?: number[]; lapsPerSegment?: number }

export type SeriesEvent =
  | { type: 'points'; racerId: string; points: number; total: number }
  | { type: 'eliminated'; racerIds: string[]; segment: number }
  | { type: 'seriesFinished' };

export function createGrandPrix(cup: CupDef, racers: RacerConfig[], speedClass: SpeedClass, seed: number): GrandPrixState {
  const zero = () => Object.fromEntries(racers.map((r) => [r.racerId, 0]));
  return {
    kind: 'grandPrix', cupId: cup.id, speedClass, trackIds: [...cup.trackIds], raceIndex: 0, racers: [...racers],
    points: zero(), bestFinish: Object.fromEntries(racers.map((r) => [r.racerId, Infinity])), lastFinish: zero(), seed,
  };
}

export function createKnockout(set: KnockoutSetDef, racers: RacerConfig[], speedClass: SpeedClass, seed: number): KnockoutState {
  return {
    kind: 'knockout', setId: set.id, speedClass, trackIds: [...set.trackIds],
    cutLines: [...(set.cutLines ?? KNOCKOUT_CUT_LINES)], lapsPerSegment: set.lapsPerSegment ?? KNOCKOUT_LAPS_PER_SEGMENT,
    segment: 0, racers: [...racers], eliminated: [], placings: {}, seed,
  };
}

export function isDone(series: SeriesState): boolean {
  return series.kind === 'grandPrix' ? series.raceIndex >= series.trackIds.length : series.segment >= series.trackIds.length;
}

/** The next race to run, or undefined when the series is over. */
export function nextRace(series: SeriesState): RaceConfig | undefined {
  if (isDone(series)) return undefined;
  if (series.kind === 'grandPrix') {
    return { mode: 'grandPrix', trackId: series.trackIds[series.raceIndex], speedClass: series.speedClass, seed: series.seed + series.raceIndex, racers: series.racers };
  }
  const out = new Set(series.eliminated);
  return {
    mode: 'knockout', trackId: series.trackIds[series.segment], speedClass: series.speedClass, seed: series.seed + series.segment,
    laps: series.lapsPerSegment,
    racers: series.racers.filter((r) => !out.has(r.racerId)),
    knockout: { setId: series.setId, segment: series.segment, cutLine: series.cutLines[series.segment] ?? 1, eliminated: [...series.eliminated] },
  };
}

/** Feed one race's results in. Mutates the series and returns what happened. */
export function applyResults(series: SeriesState, results: RaceResults): SeriesEvent[] {
  const events: SeriesEvent[] = [];
  const ranks = [...results.ranks].sort((a, b) => a.rank - b.rank);
  if (series.kind === 'grandPrix') {
    for (const row of ranks) {
      const pts = GP_POINTS_BY_RANK[Math.min(row.rank, GP_POINTS_BY_RANK.length) - 1] ?? 0;
      series.points[row.racerId] = (series.points[row.racerId] ?? 0) + pts;
      series.bestFinish[row.racerId] = Math.min(series.bestFinish[row.racerId] ?? Infinity, row.rank);
      series.lastFinish[row.racerId] = row.rank;
      events.push({ type: 'points', racerId: row.racerId, points: pts, total: series.points[row.racerId] });
    }
    series.raceIndex++;
  } else {
    const keep = series.cutLines[series.segment] ?? 1;
    const cut = ranks.slice(keep).map((r) => r.racerId);
    // an eliminated racer's final placing is its rank in the field it left
    for (const row of ranks.slice(keep)) series.placings[row.racerId] = row.rank;
    series.eliminated.push(...cut);
    series.segment++;
    if (cut.length) events.push({ type: 'eliminated', racerIds: cut, segment: series.segment - 1 });
    if (series.segment >= series.trackIds.length) for (const row of ranks.slice(0, keep)) series.placings[row.racerId] = row.rank;
  }
  if (isDone(series)) events.push({ type: 'seriesFinished' });
  return events;
}

/** Star thresholds for a cup: fractions of the maximum points, rounded up. */
export function starThresholdsFor(trackCount: number): number[] {
  const max = GP_POINTS_BY_RANK[0] * trackCount;
  return STAR_FRACTIONS.map((f) => Math.ceil(f * max));
}

/** Points table, ties by best single finish then the latest race, and the player's stars. */
export function grandPrixTable(series: GrandPrixState, starThresholds = starThresholdsFor(series.trackIds.length)): GrandPrixTable {
  const rows = series.racers.map((r) => ({ racerId: r.racerId, points: series.points[r.racerId] ?? 0, rank: 0 }));
  rows.sort((a, b) =>
    b.points - a.points
    || (series.bestFinish[a.racerId] ?? Infinity) - (series.bestFinish[b.racerId] ?? Infinity)
    || (series.lastFinish[a.racerId] ?? Infinity) - (series.lastFinish[b.racerId] ?? Infinity)
    || a.racerId.localeCompare(b.racerId));
  rows.forEach((row, i) => { row.rank = i + 1; });
  const player = series.racers.find((r) => r.isPlayer);
  const pts = player ? series.points[player.racerId] ?? 0 : 0;
  const stars = starThresholds.filter((t) => pts >= t).length;
  return { rows, stars };
}

/** Knockout winner once the series is done, else undefined. */
export function knockoutWinner(series: KnockoutState): string | undefined {
  if (!isDone(series)) return undefined;
  return Object.entries(series.placings).find(([, p]) => p === 1)?.[0];
}

/**
 * The podium once the series is done (the ceremony, design §9): the Grand Prix table's top three,
 * or the Knockout's placings 1 to 3; empty while it runs.
 */
export function podiumOf(series: SeriesState): string[] {
  if (!isDone(series)) return [];
  if (series.kind === 'grandPrix') return grandPrixTable(series).rows.slice(0, 3).map((r) => r.racerId);
  return Object.entries(series.placings).filter(([, p]) => p >= 1 && p <= 3).sort((a, b) => a[1] - b[1]).map(([id]) => id);
}
