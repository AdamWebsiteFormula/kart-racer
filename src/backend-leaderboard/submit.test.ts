// The submit-score entry (supabase/functions/submit-score/index.ts) run headless: Deno and the
// database are stubbed, the core is the source (server.ts) with the replay stubbed, and the board
// is get_leaderboard's rule (each name's best run, fastest first).
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { leaderboardClient } from './client.ts';
import { CLIENT_VERSION } from './rules.ts';

let replayMs = 0;
vi.mock('../../supabase/functions/submit-score/core.js', async () => ({
  ...(await import('./server.ts')),
  verifyRun: () => ({ ok: true, timeMs: replayMs, lapTimesMs: [1, 2, 3], canonicalLog: `log${replayMs}` }),
}));

interface Row { id: string; name: string; racer_id: string; time_ms: number; created_at: number }
const db: Row[] = [];

/** get_leaderboard: distinct on (name) by time then age, then fastest first. */
function board(limit: number): Row[] {
  const best = new Map<string, Row>();
  for (const s of [...db].sort((a, b) => a.time_ms - b.time_ms || a.created_at - b.created_at)) if (!best.has(s.name)) best.set(s.name, s);
  return [...best.values()].slice(0, limit);
}

let handler: (req: Request) => Promise<Response>;
beforeAll(async () => {
  vi.stubGlobal('Deno', { env: { get: (k: string) => (k === 'SUPABASE_URL' ? 'http://db' : 'service-key-0123456789abcdefghijklmn') }, serve: (h: typeof handler) => { handler = h; } });
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const path = String(url).replace('http://db/rest/v1/', '');
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    if (path.startsWith('rpc/take_submit_slot')) return new Response('true');
    if (path.startsWith('scores')) {
      const row = { ...body, id: `id${db.length + 1}`, created_at: db.length };
      db.push(row);
      return new Response(JSON.stringify([{ id: row.id, time_ms: row.time_ms }]), { status: 201 });
    }
    if (path.startsWith('rpc/get_leaderboard')) return new Response(JSON.stringify(board(body.p_limit)));
    return new Response('?', { status: 404 });
  });
  const entry = '../../supabase/functions/submit-score/index.ts'; // a Deno file: kept out of tsc
  await import(/* @vite-ignore */ entry);
});

async function post(name: string, timeMs: number) {
  replayMs = timeMs;
  const body = { name, trackId: 'harbour-loop', mode: 'timeTrial', speedClass: 150, timeMs, racerId: 'momo', inputLog: 'x', clientVersion: CLIENT_VERSION };
  const res = await handler(new Request('http://fn', { method: 'POST', body: JSON.stringify(body) }));
  return { status: res.status, ...(await res.json()) } as { status: number; id: string; timeMs: number; rank: number | null; bestId: string | null; bestMs: number | null };
}

describe('submit-score: the rank it returns (bug hunt 3)', () => {
  it('a slower second run under the same name gets the place of that name\'s best, and says which run it is', async () => {
    const first = await post('Judge', 122800);
    expect(first).toMatchObject({ status: 201, rank: 1, bestId: first.id, bestMs: 122800 });
    const second = await post('Judge', 139700);
    // saved, but the board still shows the first run: the name is 1st, not "outside the top 50"
    expect(second).toMatchObject({ status: 201, timeMs: 139700, rank: 1, bestId: first.id, bestMs: 122800 });
    expect(db.length).toBe(2);
  });

  it('a common name someone else holds places at that name\'s row; a faster run takes the row over', async () => {
    await post('Ada', 100000);
    const theirs = await post('Test', 120000);
    // board: Ada 1:40, Test 2:00, Judge 2:02.80
    expect(await post('Test', 125000)).toMatchObject({ rank: 2, bestId: theirs.id, bestMs: 120000 });
    const faster = await post('Test', 90000);
    expect(faster).toMatchObject({ rank: 1, bestId: faster.id, bestMs: 90000 });
  });

  it('the game\'s client hands the name\'s best on, and takes the run itself as best from an older server', async () => {
    const draft = { trackId: 'harbour-loop', mode: 'timeTrial' as const, speedClass: 150 as const, timeMs: 150000, racerId: 'momo', inputLog: 'x', clientVersion: CLIENT_VERSION };
    replayMs = 150000;
    const game = leaderboardClient((_url, init) => handler(new Request('http://fn', init)));
    const r = await game.post({ ...draft, name: 'Judge' });
    expect(r).toMatchObject({ ok: true, timeMs: 150000, rank: 3, best: { id: 'id1', timeMs: 122800 } });
    const old = leaderboardClient(async () => new Response(JSON.stringify({ id: 'x', timeMs: 150000, rank: 4 }), { status: 201 }));
    expect(await old.post({ ...draft, name: 'Kit' })).toEqual({ ok: true, id: 'x', timeMs: 150000, rank: 4, best: { id: 'x', timeMs: 150000 } });
  });
});

describe('submit-score: what the player reads when a post is refused (detail review)', () => {
  const draft = { name: 'Judge', trackId: 'harbour-loop', mode: 'timeTrial' as const, speedClass: 150 as const, timeMs: 150000, racerId: 'momo', inputLog: 'x', clientVersion: CLIENT_VERSION };
  const refused = (status: number, error: string) => leaderboardClient(async () => new Response(JSON.stringify({ error }), { status }));
  const cases: [number, string, string][] = [
    [422, 'claimed 83421 ms but the replay finished in 83433 ms', 'We could not confirm that run, so it was not posted.'],
    [400, 'please pick another name', 'That name is taken or not allowed. Try another.'],
    [400, 'please reload the game: new version', 'The game was updated. Reload the page to post.'],
    [400, 'that daily challenge is closed', "That day's challenge has closed."],
    [409, 'that exact run is already on the board', 'That run is already on the board.'],
    [503, 'the leaderboard is busy: try again soon', 'The leaderboard is busy. Try again in a moment.'],
    [429, 'too many submissions: wait a minute', 'Too many tries. Wait a minute.'],
    [500, 'could not save the score', 'That did not work. Try again.'],
    [400, 'unknown track', 'That did not work. Try again.'],
  ];
  it.each(cases)('%i "%s" shows a friendly line, never the server text', async (status, server, shown) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await refused(status, server).post(draft)).toEqual({ ok: false, error: shown });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(server));
    warn.mockRestore();
  });
});
