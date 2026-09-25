// View models for the end-of-race screens: the finish table, the Grand Prix table, the Knockout cut.
import { grandPrixTable, starThresholdsFor } from '../../race-manager/series.ts';
import type { GrandPrixState, KnockoutState, RaceResults } from '../../race-manager/types.ts';
import { UI } from '../constants.ts';
import { accentOf, nameOf } from '../data/cast.ts';
import { formatGap, formatMs, ordinal } from '../format.ts';
import { medalLadder, type MedalLadderVM, type MedalTimes } from './menus.ts';

export interface ResultRow { rank: string; racerId: string; name: string; accent: string; time: string; gap: string; dnf: boolean; player: boolean; delayMs: number }
/** `medal`: a Time Trial the player finished, against the track's medal times (the badge by the headline and the ladder under the laps) */
export interface ResultsVM { headline: string; sub: string; rows: ResultRow[]; playerLaps: { lap: number; time: string; best: boolean }[]; medal?: MedalLadderVM }

/** `medalTimes`: a Time Trial's track's medal times */
export function resultsModel(res: RaceResults, playerId: string | null, trackName: string, staggerMs = UI.staggerResultsMs, medalTimes?: MedalTimes): ResultsVM {
  const winner = res.ranks.find((r) => !r.dnf)?.timeMs ?? -1;
  const rows = res.ranks.map((r, i) => ({
    rank: ordinal(r.rank), racerId: r.racerId, name: nameOf(r.racerId), accent: accentOf(r.racerId),
    time: r.dnf ? (r.projectedMs > 0 && r.racerId !== playerId ? formatMs(r.projectedMs) : 'DNF') : formatMs(r.timeMs),
    gap: i === 0 || winner < 0 ? '' : !r.dnf ? formatGap((r.timeMs - winner) / 1000)
      : r.projectedMs > 0 && r.racerId !== playerId ? formatGap((r.projectedMs - winner) / 1000) : '',
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
    ...(medalTimes && me && !me.dnf ? { medal: medalLadder(me.timeMs, medalTimes) } : {}),
  };
}

/** `was`: the total before this race; `moved`: places gained (+) or lost (−) in the standings with it, null after the first race (no standings before it) */
export interface GpRow { rank: string; racerId: string; name: string; accent: string; points: number; gained: number; was: number; moved: number | null; player: boolean; delayMs: number }
/** `rows`: the standings now, top down; `before`: as they stood before this race, top down, as indexes into `rows` (after the first race, this race's order: nothing moves) */
export interface GpVM { headline: string; sub: string; rows: GpRow[]; before: number[]; done: boolean; stars: number; thresholds: number[] }

/**
 * The Grand Prix standings after a race. The screen shows them as they stood before it (`before`), each
 * total with the points just won beside it, counts the totals up, then turns the rows that change hands
 * over into the new order (render/screens.ts ResultsView.renderGp; Mario Kart World).
 */
export function gpModel(before: GrandPrixState | null, after: GrandPrixState, playerId: string | null, staggerMs = UI.staggerStandingsMs): GpVM {
  const thresholds = starThresholdsFor(after.trackIds.length);
  const table = grandPrixTable(after, thresholds);
  const done = after.raceIndex >= after.trackIds.length;
  const ids = table.rows.map((r) => r.racerId);
  // the table before this race, when there was one and it had these racers
  const prior = before && before.raceIndex > 0 ? grandPrixTable(before, thresholds).rows.map((r) => r.racerId) : null;
  const order = prior && prior.length === ids.length && prior.every((id) => ids.includes(id)) ? prior : null;
  const rows = table.rows.map((r, i) => {
    const was = before?.points[r.racerId] ?? 0;
    return {
      rank: ordinal(r.rank), racerId: r.racerId, name: nameOf(r.racerId), accent: accentOf(r.racerId), points: r.points,
      gained: r.points - was, was, moved: order ? order.indexOf(r.racerId) - i : null, player: r.racerId === playerId, delayMs: i * staggerMs,
    };
  });
  const me = table.rows.find((r) => r.racerId === playerId);
  const headline = done ? (me?.rank === 1 ? 'Cup winner!' : me ? `You placed ${ordinal(me.rank)} in the cup` : 'Cup over') : `Race ${after.raceIndex} of ${after.trackIds.length}`;
  // stars are the player's, from their own total against the thresholds
  const myPoints = me?.points ?? 0;
  const stars = done ? thresholds.filter((t) => myPoints >= t).length : 0;
  return { headline, sub: 'Grand Prix standings', rows, before: order ? order.map((id) => ids.indexOf(id)) : rows.map((_, i) => i), done, stars, thresholds };
}

export interface CutRow { racerId: string; name: string; accent: string; rank: string; out: boolean; winner: boolean; player: boolean; delayMs: number }
export interface CutVM { headline: string; sub: string; rows: CutRow[]; remaining: number; playerOut: boolean; done: boolean; winner: string | null }

/**
 * After a Knockout segment: the racers who ran it, in finish order, the cut ones struck through.
 * After the final only the winner goes on: everyone else in it is out.
 */
export function knockoutCutModel(res: RaceResults, after: KnockoutState, playerId: string | null, staggerMs = UI.staggerResultsMs): CutVM {
  const out = new Set(after.eliminated);
  const remaining = after.racers.filter((r) => !out.has(r.racerId)).length;
  const done = after.segment >= after.trackIds.length;
  const winnerId = done ? Object.entries(after.placings).find(([, p]) => p === 1)?.[0] ?? null : null;
  const rows = res.ranks.map((r, i) => ({
    racerId: r.racerId, name: nameOf(r.racerId), accent: accentOf(r.racerId), rank: ordinal(r.rank),
    out: out.has(r.racerId) || (done && r.racerId !== winnerId), winner: r.racerId === winnerId,
    player: r.racerId === playerId, delayMs: i * staggerMs,
  }));
  const playerOut = playerId !== null && out.has(playerId);
  const headline = done ? (winnerId === playerId ? 'Knockout champion!' : `${winnerId ? nameOf(winnerId) : '—'} wins`) : playerOut ? 'Knocked out!' : 'Safe!';
  return { headline, sub: done ? 'Final' : `${remaining} racers left`, rows, remaining, playerOut, done, winner: winnerId ? nameOf(winnerId) : null };
}

// ---------------------------------------------------------------- leaderboard panel
export interface BoardRowIn { id: string; name: string; racerId: string; timeMs: number }
export type BoardLoad = 'loading' | 'offline' | readonly BoardRowIn[];

export interface BoardVM {
  title: string;
  sub: string;
  /** Daily: when the next challenge starts, in the player's own time ('' otherwise) */
  note: string;
  state: 'loading' | 'offline' | 'empty' | 'rows';
  rows: { rank: string; name: string; racerId: string; racer: string; accent: string; time: string; me: boolean }[];
  button: string;
  buttonDisabled: boolean;
  /** the board could not be read: a Try again control reads it again */
  retry: boolean;
  status: string;
  statusKind: 'info' | 'error' | 'ok';
}

/** `best`: the name's run the board shows (one row per name), when an earlier one is faster than this. */
export interface BoardPost { state: 'idle' | 'posting' | 'posted' | 'failed'; id?: string; rank?: number | null; best?: { id: string; timeMs: number }; error?: string }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Sep 23" from a YYYYMMDD seed (US order). */
export function seedDate(seed: number): string {
  return `${MONTHS[(Math.floor(seed / 100) % 100) - 1] ?? ''} ${seed % 100}`.trim();
}

/** The next Daily starts at midnight UTC: that moment on the player's clock ("8:00 PM"). `timeZone` for tests. */
export function nextDailyAt(now = new Date(), timeZone?: string): string {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return next.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', ...(timeZone ? { timeZone } : {}) });
}

/**
 * The leaderboard panel of the results screen. Pure. Post works whatever the board read did: a
 * failed read is often a blip, and the post fails soft on its own (audit 24 Sept 2026).
 * `nextDaily`: nextDailyAt(), for a Daily.
 */
export function boardModel(mode: 'timeTrial' | 'daily', trackName: string, dailySeed: number | null, load: BoardLoad, post: BoardPost, nextDaily = ''): BoardVM {
  const sub = mode === 'daily' ? `Daily Challenge · ${seedDate(dailySeed ?? 0)} · ${trackName}` : `Time Trial · ${trackName} · 150cc`;
  const note = mode === 'daily' && nextDaily ? `Next challenge at ${nextDaily} your time (midnight UTC)` : '';
  // the board shows each name's best run: the player's row is that one, not always this run's
  const best = post.best && post.best.id !== post.id ? post.best : null;
  const mine = best?.id ?? post.id;
  const rows = typeof load === 'string' ? [] : load.map((r, i) => ({
    rank: ordinal(i + 1), name: r.name, racerId: r.racerId, racer: nameOf(r.racerId), accent: accentOf(r.racerId), time: formatMs(r.timeMs), me: r.id === mine,
  }));
  const state = load === 'loading' ? 'loading' : load === 'offline' ? 'offline' : rows.length ? 'rows' : 'empty';
  const button = post.state === 'posting' ? 'Posting…' : post.state === 'posted' ? (post.rank && !best ? `Posted: ${ordinal(post.rank)}!` : 'Posted!') : 'Post my time';
  const status = post.state === 'failed' ? post.error ?? 'That did not work.'
    : post.state === 'posted' ? (!post.rank ? 'Saved. You are outside the top 50 for now.'
      : best ? `Saved. Your best, ${formatMs(best.timeMs)}, is still ${ordinal(post.rank)} on this board.`
      : `You are ${ordinal(post.rank)} on this board.`)
    : 'Pick a name, then post your time. The server replays your run to check it.';
  return {
    title: 'Leaderboard', sub, note, state, rows, button,
    buttonDisabled: post.state === 'posting' || post.state === 'posted',
    retry: state === 'offline',
    status, statusKind: post.state === 'failed' ? 'error' : post.state === 'posted' ? 'ok' : 'info',
  };
}
