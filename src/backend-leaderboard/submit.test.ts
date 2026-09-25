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

interface Row { id: string; name: string; racer_id: string; time_ms: number; created_at: number; ip_hash?: string; track_id?: string; mode?: string; daily_seed?: number | null }
const db: Row[] = [];
/** calls to take_submit_slot (each spends one of the client's per-minute slots) */
let slots = 0;
/** the database's own names-per-board count (trigger scores_names_cap, migration 20260925000001) */
let dbNamesCap = false;
/** holds each names query until this many wait together: posts overlapping as they do over a real network */
let overlap = 0;
const waiting: (() => void)[] = [];

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
    if (path.startsWith('rpc/take_submit_slot')) { slots++; return new Response('true'); }
    if (path.startsWith('scores') && init?.method !== 'POST') {
      if (overlap) await new Promise<void>((go) => { waiting.push(go); if (waiting.length >= overlap) for (const f of waiting.splice(0)) f(); });
      // this client's rows on this board (the names-per-board check)
      const q = new URLSearchParams(path.slice(path.indexOf('?') + 1));
      const eq = (k: string) => q.get(k)?.replace(/^eq\./, '');
      const mine = db.filter((r) => (r as unknown as Record<string, unknown>).ip_hash === eq('ip_hash') && (r as unknown as Record<string, unknown>).track_id === eq('track_id'));
      return new Response(JSON.stringify(mine.map((r) => ({ name: r.name }))));
    }
    if (path.startsWith('scores')) {
      // the trigger counts inside the insert, under a lock per client: here, with no await in between
      const others = new Set(db.filter((r) => r.ip_hash === body.ip_hash && r.track_id === body.track_id && r.mode === body.mode && (r.daily_seed ?? null) === (body.daily_seed ?? null) && r.name !== body.name).map((r) => r.name));
      if (dbNamesCap && others.size >= 3) return new Response(JSON.stringify({ code: 'P0001', details: null, hint: null, message: 'names per board' }), { status: 400 });
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

describe('submit-score: one drive cannot flood the board (red-team 2026-09-24)', () => {
  it('a client holds at most 3 names on a board; its own names still post', async () => {
    // this client already posted as Judge, Ada and Test above
    expect(await post('Zed', 95000)).toMatchObject({ status: 400, error: 'you already post under 3 names on this board' });
    expect(await post('Ada', 99000)).toMatchObject({ status: 201 });
    const game = leaderboardClient(async () => new Response(JSON.stringify({ error: 'you already post under 3 names on this board' }), { status: 400 }));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await game.post({ name: 'Zed', trackId: 'harbour-loop', mode: 'timeTrial', speedClass: 150, timeMs: 1, racerId: 'momo', inputLog: 'x', clientVersion: CLIENT_VERSION }))
      .toEqual({ ok: false, error: 'You already post under 3 names here. Use one of those.' });
    warn.mockRestore();
  });

  it('a chunked body with no length is cut off at the cap, not read whole', async () => {
    let sent = 0;
    const chunk = new Uint8Array(64 * 1024).fill(32);
    const body = new ReadableStream<Uint8Array>({ pull(c) { sent += chunk.byteLength; if (sent > 8 * 1024 * 1024) c.close(); else c.enqueue(chunk); } });
    const res = await handler(new Request('http://fn', { method: 'POST', body, duplex: 'half' } as RequestInit));
    expect(res.status).toBe(413);
    expect(sent).toBeLessThan(1024 * 1024);
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

describe('client: the 12 s timeout covers the body too (audit 24 Sept 2026)', () => {
  /** headers arrive at once; the body never does (a stalled server or proxy) */
  const stalled = (async () => ({ ok: true, status: 200, text: () => new Promise<string>(() => {}) }) as unknown as Response) as typeof fetch;

  it('a board whose body stalls after the headers reads as offline, not "Loading" for ever', async () => {
    vi.useFakeTimers();
    try {
      const got = leaderboardClient(stalled).fetchBoard('harbour-loop', 'timeTrial', null);
      await vi.advanceTimersByTimeAsync(12_001);
      expect(await got).toBeNull();
    } finally { vi.useRealTimers(); }
  });

  it('a post whose body stalls fails with the connection line', async () => {
    vi.useFakeTimers();
    try {
      const got = leaderboardClient(stalled).post({ name: 'Kit', trackId: 'harbour-loop', mode: 'timeTrial', speedClass: 150, timeMs: 60000, racerId: 'pip', inputLog: 'x', clientVersion: CLIENT_VERSION });
      await vi.advanceTimersByTimeAsync(12_001);
      expect(await got).toEqual({ ok: false, error: 'Could not reach the leaderboard. Check your connection.' });
    } finally { vi.useRealTimers(); }
  });
});

describe('submit-score: red-team 3 (24 Sept 2026; live once the function is redeployed and migration 20260925000001 applied)', () => {
  const pages = ['https://adamwebsiteformula.github.io', 'http://localhost:5199', 'http://127.0.0.1:4173'];
  const strangers = ['https://evil.example', 'null', 'https://adamwebsiteformula.github.io.evil.example', 'http://localhost.evil.example', 'https://otheruser.github.io'];

  it('answers the game\'s own pages and refuses any other page before it spends a rate-limit slot', async () => {
    for (const o of pages) {
      const pre = await handler(new Request('http://fn', { method: 'OPTIONS', headers: { origin: o } }));
      expect(pre.status, o).toBe(200);
      expect(pre.headers.get('access-control-allow-origin'), o).toBe(o);
      expect(pre.headers.get('vary'), o).toMatch(/Origin/);
    }
    const before = slots;
    for (const o of strangers) {
      const pre = await handler(new Request('http://fn', { method: 'OPTIONS', headers: { origin: o } }));
      expect(pre.status, o).toBe(403);
      expect(pre.headers.get('access-control-allow-origin'), o).toBeNull();
      expect((await handler(new Request('http://fn', { method: 'POST', headers: { origin: o }, body: '{}' }))).status, o).toBe(403);
    }
    expect(slots).toBe(before);
    // a script sends no Origin: no visitor's browser is borrowed, so it goes on to the checks and the limits
    expect((await handler(new Request('http://fn', { method: 'POST', body: '{}' }))).status).toBe(400);
    expect((await handler(new Request('http://fn', { method: 'POST', headers: { origin: pages[0] }, body: '{}' }))).status).toBe(400);
    expect(slots).toBe(before + 2);
  });

  it('a body that trickles in is cut off after 15 s (408) instead of holding the worker', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      // the start of a body, then nothing: the connection stays open
      const body = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new TextEncoder().encode('{"name":"Sl')); } });
      let done: Response | null = null;
      void handler(new Request('http://fn', { method: 'POST', body, duplex: 'half' } as RequestInit)).then((r) => { done = r; });
      // let the real async steps (the hash, the slot) run between ticks of the fake clock
      // (setImmediate is Node's and not faked: a real turn of the event loop)
      const turn = () => new Promise<void>((r) => (globalThis as unknown as { setImmediate(f: () => void): void }).setImmediate(r));
      for (let i = 0; i < 60 && !done; i++) { await turn(); await vi.advanceTimersByTimeAsync(1000); }
      expect((done as Response | null)?.status).toBe(408);
    } finally { vi.useRealTimers(); }
  });

  it('posts sent together keep to 3 names a board: the database counts again inside the insert', async () => {
    const post = (ip: string, name: string) => handler(new Request('http://fn', {
      method: 'POST', headers: { 'cf-connecting-ip': ip },
      body: JSON.stringify({ name, trackId: 'harbour-loop', mode: 'timeTrial', speedClass: 150, timeMs: 101000, racerId: 'momo', inputLog: 'x', clientVersion: CLIENT_VERSION }),
    })).then(async (r) => ({ status: r.status, ...(await r.json()) as { error?: string } }));
    replayMs = 101000;
    overlap = 6;
    // the function's own count alone: six posts at once all see no names yet, and all six get on (the bug)
    dbNamesCap = false;
    const loose = await Promise.all(['A1', 'A2', 'A3', 'A4', 'A5', 'A6'].map((n) => post('198.51.100.7', n)));
    expect(loose.filter((r) => r.status === 201).length).toBe(6);
    // with the trigger: three get on, the rest read the same line as the early count
    dbNamesCap = true;
    const names = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'];
    const held = await Promise.all(names.map((n) => post('198.51.100.8', n)));
    expect(held.filter((r) => r.status === 201).length).toBe(3);
    expect(held.filter((r) => r.status !== 201)).toEqual(Array(3).fill({ status: 400, error: 'you already post under 3 names on this board' }));
    overlap = 0;
    // a name the client already holds still posts
    expect((await post('198.51.100.8', names[held.findIndex((r) => r.status === 201)])).status).toBe(201);
    dbNamesCap = false;
  });
});
