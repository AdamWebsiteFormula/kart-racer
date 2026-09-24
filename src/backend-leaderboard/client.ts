// The game's side of the leaderboard: post a run, read a board. Both fail soft (offline, blocked,
// timed out): the game never breaks because the network did.
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config.ts';
import type { BoardMode, Submission } from './rules.ts';

export interface BoardRow { id: string; name: string; racerId: string; timeMs: number; lapTimesMs: number[]; createdAt: string }

/**
 * rank is the name's place on its board (null outside the top 50). The board keeps each name's
 * best run: `best` is that run, this one unless an earlier run under the name was faster.
 */
export type PostResult = { ok: true; id: string; timeMs: number; rank: number | null; best: { id: string; timeMs: number } } | { ok: false; error: string };

export interface LeaderboardClient {
  fetchBoard(trackId: string, mode: BoardMode, dailySeed: number | null, limit?: number): Promise<BoardRow[] | null>;
  post(s: Submission): Promise<PostResult>;
}

const TIMEOUT_MS = 12_000;

/** A response read to the end: the body is part of the call, so the timeout covers it too. */
interface Reply { ok: boolean; status: number; body: unknown }

/**
 * One POST, headers and body inside the same 12 s. The timer used to stop at the headers, so a
 * server that sent them and then stalled left the board on "Loading" for good (audit 24 Sept 2026).
 * Throws on network failure or timeout; a body that is not JSON reads as null.
 */
async function call(path: string, body: unknown, f: typeof fetch): Promise<Reply> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const r = await f(`${SUPABASE_URL}${path}`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    // a stalled body must still time out: race it against the abort, in case the fetch ignores the signal once headers are in
    const aborted = new Promise<never>((_, reject) => {
      if (ctl.signal.aborted) reject(new Error('timed out'));
      ctl.signal.addEventListener('abort', () => reject(new Error('timed out')), { once: true });
    });
    const text = await Promise.race([r.text(), aborted]);
    let parsed: unknown = null;
    try { parsed = JSON.parse(text); } catch { parsed = null; }
    return { ok: r.ok, status: r.status, body: parsed };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * What the player reads when a post is refused. The server's reasons are for developers
 * ("claimed N ms but the replay finished in M ms"), so the board shows plain words by status.
 */
export function postError(status: number, serverText = ''): string {
  if (status === 400 && /names on this board/.test(serverText)) return 'You already post under 3 names here. Use one of those.';
  if (status === 400 && /name/.test(serverText)) return 'That name is taken or not allowed. Try another.';
  if (status === 400 && /reload/.test(serverText)) return 'The game was updated. Reload the page to post.';
  if (status === 400 && /daily challenge is closed/.test(serverText)) return "That day's challenge has closed.";
  if (status === 409) return 'That run is already on the board.';
  if (status === 422) return 'We could not confirm that run, so it was not posted.';
  if (status === 429) return 'Too many tries. Wait a minute.';
  if (status === 503) return 'The leaderboard is busy. Try again in a moment.';
  return 'That did not work. Try again.';
}

/** `f` is injectable so tests never touch the network. */
export function leaderboardClient(f: typeof fetch = (...a) => fetch(...a)): LeaderboardClient {
  return {
    async fetchBoard(trackId, mode, dailySeed, limit = 10) {
      try {
        const r = await call('/rest/v1/rpc/get_leaderboard', { p_track_id: trackId, p_mode: mode, p_daily_seed: mode === 'daily' ? dailySeed : null, p_limit: limit }, f);
        if (!r.ok || !Array.isArray(r.body)) return null;
        const rows = r.body as { id: string; name: string; racer_id: string; time_ms: number; lap_times_ms: number[]; created_at: string }[];
        return rows.map((x) => ({ id: x.id, name: x.name, racerId: x.racer_id, timeMs: x.time_ms, lapTimesMs: x.lap_times_ms, createdAt: x.created_at }));
      } catch {
        return null;
      }
    },
    async post(s) {
      try {
        const r = await call('/functions/v1/submit-score', s, f);
        const body = (r.body && typeof r.body === 'object' ? r.body : {}) as { id?: string; timeMs?: number; rank?: number | null; bestId?: string | null; bestMs?: number | null; error?: string };
        if (r.status === 201 && body.id) {
          const timeMs = body.timeMs ?? s.timeMs;
          return { ok: true, id: body.id, timeMs, rank: body.rank ?? null, best: { id: body.bestId ?? body.id, timeMs: body.bestMs ?? timeMs } };
        }
        if (body.error) console.warn(`leaderboard: ${r.status} ${body.error}`); // the server's words, for us
        return { ok: false, error: postError(r.status, body.error) };
      } catch {
        return { ok: false, error: 'Could not reach the leaderboard. Check your connection.' };
      }
    },
  };
}
