// View models for the end-of-race screens: the finish table, the Grand Prix table, the Knockout cut.
import { grandPrixTable, starThresholdsFor } from '../../race-manager/series.ts';
import type { GrandPrixState, KnockoutState, RaceResults } from '../../race-manager/types.ts';
import { UI } from '../constants.ts';
import { accentOf, nameOf } from '../data/cast.ts';
import { formatGap, formatMs, ordinal } from '../format.ts';

export interface ResultRow { rank: string; racerId: string; name: string; accent: string; time: string; gap: string; dnf: boolean; player: boolean; delayMs: number }
export interface ResultsVM { headline: string; sub: string; rows: ResultRow[]; playerLaps: { lap: number; time: string; best: boolean }[] }

export function resultsModel(res: RaceResults, playerId: string | null, trackName: string, staggerMs = UI.staggerResultsMs): ResultsVM {
  const winner = res.ranks.find((r) => !r.dnf)?.timeMs ?? -1;
  const rows = res.ranks.map((r, i) => ({
    rank: ordinal(r.rank), racerId: r.racerId, name: nameOf(r.racerId), accent: accentOf(r.racerId),
    time: r.dnf ? 'DNF' : formatMs(r.timeMs),
    gap: r.dnf || i === 0 || winner < 0 ? '' : formatGap((r.timeMs - winner) / 1000),
    dnf: r.dnf, player: r.racerId === playerId, delayMs: i * staggerMs,
  }));
  const me = res.ranks.find((r) => r.racerId === playerId);
  // a solo run (Daily, Time Trial) has no one to beat: it gets the time, not "You win!"
  const headline = !me ? 'Results' : me.dnf ? 'Out of time' : res.ranks.length === 1 ? `Finished! ${formatMs(me.timeMs)}`
    : me.rank === 1 ? 'You win!' : `You finished ${ordinal(me.rank)}`;
  const laps = me?.lapTimesMs ?? [];
  const best = laps.length ? Math.min(...laps) : -1;
  return {
    headline, sub: trackName, rows,
    playerLaps: laps.map((ms, i) => ({ lap: i + 1, time: formatMs(ms), best: ms === best })),
  };
}

export interface GpRow { rank: string; name: string; accent: string; points: number; gained: number; player: boolean; delayMs: number }
export interface GpVM { headline: string; sub: string; rows: GpRow[]; done: boolean; stars: number; thresholds: number[] }

export function gpModel(before: GrandPrixState | null, after: GrandPrixState, playerId: string | null, staggerMs = UI.staggerResultsMs): GpVM {
  const thresholds = starThresholdsFor(after.trackIds.length);
  const table = grandPrixTable(after, thresholds);
  const done = after.raceIndex >= after.trackIds.length;
  const rows = table.rows.map((r, i) => ({
    rank: ordinal(r.rank), name: nameOf(r.racerId), accent: accentOf(r.racerId), points: r.points,
    gained: r.points - (before?.points[r.racerId] ?? 0), player: r.racerId === playerId, delayMs: i * staggerMs,
  }));
  const me = table.rows.find((r) => r.racerId === playerId);
  const headline = done ? (me?.rank === 1 ? 'Cup winner!' : `Cup finished ${me ? ordinal(me.rank) : ''}`.trim()) : `Race ${after.raceIndex} of ${after.trackIds.length}`;
  // stars are the player's, from their own total against the thresholds
  const myPoints = me?.points ?? 0;
  const stars = done ? thresholds.filter((t) => myPoints >= t).length : 0;
  return { headline, sub: 'Grand Prix standings', rows, done, stars, thresholds };
}

export interface CutRow { name: string; accent: string; rank: string; out: boolean; player: boolean; delayMs: number }
export interface CutVM { headline: string; sub: string; rows: CutRow[]; remaining: number; playerOut: boolean; done: boolean; winner: string | null }

/** After a Knockout segment: the racers who ran it, in finish order, the cut ones struck through. */
export function knockoutCutModel(res: RaceResults, after: KnockoutState, playerId: string | null, staggerMs = UI.staggerResultsMs): CutVM {
  const out = new Set(after.eliminated);
  const rows = res.ranks.map((r, i) => ({
    name: nameOf(r.racerId), accent: accentOf(r.racerId), rank: ordinal(r.rank),
    out: out.has(r.racerId), player: r.racerId === playerId, delayMs: i * staggerMs,
  }));
  const remaining = after.racers.filter((r) => !out.has(r.racerId)).length;
  const done = after.segment >= after.trackIds.length;
  const winnerId = done ? Object.entries(after.placings).find(([, p]) => p === 1)?.[0] ?? null : null;
  const playerOut = playerId !== null && out.has(playerId);
  const headline = done ? (winnerId === playerId ? 'Knockout champion!' : `${winnerId ? nameOf(winnerId) : '—'} wins`) : playerOut ? 'Knocked out!' : 'Safe!';
  return { headline, sub: done ? 'Final' : `${remaining} remain`, rows, remaining, playerOut, done, winner: winnerId ? nameOf(winnerId) : null };
}

// ---------------------------------------------------------------- leaderboard panel
export interface BoardRowIn { id: string; name: string; racerId: string; timeMs: number }
export type BoardLoad = 'loading' | 'offline' | readonly BoardRowIn[];

export interface BoardVM {
  title: string;
  sub: string;
  state: 'loading' | 'offline' | 'empty' | 'rows';
  rows: { rank: string; name: string; racer: string; accent: string; time: string; me: boolean }[];
  button: string;
  buttonDisabled: boolean;
  status: string;
  statusKind: 'info' | 'error' | 'ok';
}

export interface BoardPost { state: 'idle' | 'posting' | 'posted' | 'failed'; id?: string; rank?: number | null; error?: string }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "23 Sep" from a YYYYMMDD seed. */
export function seedDate(seed: number): string {
  return `${seed % 100} ${MONTHS[(Math.floor(seed / 100) % 100) - 1] ?? ''}`.trim();
}

/** The leaderboard panel of the results screen. Pure. */
export function boardModel(mode: 'timeTrial' | 'daily', trackName: string, dailySeed: number | null, load: BoardLoad, post: BoardPost): BoardVM {
  const sub = mode === 'daily' ? `Daily Challenge · ${seedDate(dailySeed ?? 0)} · ${trackName}` : `Time Trial · ${trackName} · 150cc`;
  const rows = typeof load === 'string' ? [] : load.map((r, i) => ({
    rank: ordinal(i + 1), name: r.name, racer: nameOf(r.racerId), accent: accentOf(r.racerId), time: formatMs(r.timeMs), me: r.id === post.id,
  }));
  const state = load === 'loading' ? 'loading' : load === 'offline' ? 'offline' : rows.length ? 'rows' : 'empty';
  const button = post.state === 'posting' ? 'Posting…' : post.state === 'posted' ? (post.rank ? `Posted: ${ordinal(post.rank)}!` : 'Posted!') : 'Post my time';
  const status = post.state === 'failed' ? post.error ?? 'That did not work.'
    : post.state === 'posted' ? (post.rank ? `You are ${ordinal(post.rank)} on this board.` : 'Saved. You are outside the top 50 for now.')
    : state === 'offline' ? 'The leaderboard is offline right now.'
    : 'Pick a name, then post your time. The server replays your run to check it.';
  return {
    title: 'Leaderboard', sub, state, rows, button,
    buttonDisabled: post.state === 'posting' || post.state === 'posted' || state === 'offline',
    status, statusKind: post.state === 'failed' ? 'error' : post.state === 'posted' ? 'ok' : 'info',
  };
}
