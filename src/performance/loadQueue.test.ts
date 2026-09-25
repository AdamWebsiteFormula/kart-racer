import { describe, expect, it } from 'vitest';
import { atOnce, LoadQueue } from './loadQueue.ts';

/** A job that stays in flight until let go, recording when it started. */
function gate(log: string[], name: string) {
  let open!: () => void;
  const done = new Promise<void>((r) => { open = r; });
  return { job: () => { log.push(name); return done.then(() => name); }, open };
}
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('LoadQueue (background files take turns)', () => {
  it('runs at most `limit` jobs at once and starts the next as one finishes', async () => {
    const log: string[] = [];
    const q = new LoadQueue(2);
    const g = ['a', 'b', 'c', 'd'].map((n) => gate(log, n));
    const all = g.map((x) => q.add(x.job));
    await tick();
    expect(log).toEqual(['a', 'b']);
    expect(q.pending).toBe(4);
    g[1].open();
    await tick();
    expect(log).toEqual(['a', 'b', 'c']);
    g[0].open(); g[2].open(); g[3].open();
    expect(await Promise.all(all)).toEqual(['a', 'b', 'c', 'd']);
    expect(q.pending).toBe(0);
  });

  it('starts the lowest rank first, first come first served within a rank', async () => {
    const log: string[] = [];
    const q = new LoadQueue(1);
    const first = gate(log, 'busy');
    void q.add(first.job, 0);
    const jobs = [['late', 4], ['racer1', 1], ['icon', 3], ['racer2', 1], ['portrait', 0]] as const;
    const done = jobs.map(([n, r]) => q.add(async () => { log.push(n); }, r));
    first.open();
    await Promise.all(done);
    expect(log).toEqual(['busy', 'portrait', 'racer1', 'racer2', 'icon', 'late']);
  });

  it('at(rank) schedules through the queue at that rank', async () => {
    const log: string[] = [];
    const q = new LoadQueue(1);
    const first = gate(log, 'busy');
    void q.add(first.job);
    const low = q.at(5)(async () => { log.push('low'); });
    const high = q.at(1)(async () => { log.push('high'); });
    first.open();
    await Promise.all([low, high]);
    expect(log).toEqual(['busy', 'high', 'low']);
  });

  it('light jobs share a turn (sounds two to a turn), heavy ones take a whole one, and the order stays strict', async () => {
    const log: string[] = [];
    const q = new LoadQueue(3);
    const sounds = Array.from({ length: 8 }, (_, i) => gate(log, `s${i}`));
    const model = gate(log, 'model');
    const all = [...sounds.slice(0, 6).map((g) => q.add(g.job, 0, 0.5)), q.add(model.job, 1, 1), ...sounds.slice(6).map((g) => q.add(g.job, 2, 0.5))];
    await tick();
    expect(log, 'six half-weight sounds fill a line of 3').toEqual(['s0', 's1', 's2', 's3', 's4', 's5']);
    sounds[0].open();
    await tick();
    expect(log, 'one sound done frees half a turn: the model (a whole one) still waits, and the sounds behind it too').toEqual(['s0', 's1', 's2', 's3', 's4', 's5']);
    sounds[1].open();
    await tick();
    expect(log).toEqual(['s0', 's1', 's2', 's3', 's4', 's5', 'model']);
    sounds[2].open();
    await tick();
    expect(log.slice(-1)).toEqual(['s6']);
    for (const g of [...sounds, model]) g.open();
    await Promise.all(all);
    expect(log).toEqual(['s0', 's1', 's2', 's3', 's4', 's5', 'model', 's6', 's7']);
    expect(q.pending).toBe(0);
  });

  it('at(rank, weight) schedules at that weight; a job heavier than the room left still runs alone', async () => {
    const log: string[] = [];
    const q = new LoadQueue(1);
    const a = gate(log, 'a'), b = gate(log, 'b');
    void q.at(0, 0.5)(a.job);
    void q.at(0, 0.5)(b.job);
    await tick();
    expect(log).toEqual(['a', 'b']);
    a.open(); b.open();
    const big = new LoadQueue(0.5);
    expect(await big.add(async () => 'whole', 0, 1), 'an empty queue always runs its next job').toBe('whole');
  });

  it('a job can take the whole line: it waits for the line to clear, runs alone, and nothing starts beside it', async () => {
    const log: string[] = [];
    const q = new LoadQueue(3);
    const a = gate(log, 'a'), mine = gate(log, 'mine'), b = gate(log, 'b');
    void q.add(a.job, 1);
    const all = [q.add(mine.job, 0, 3), q.add(b.job, 0, 1), q.add(async () => { log.push('c'); }, 0, 1)];
    await tick();
    expect(log, 'the whole-line job waits for the running one').toEqual(['a']);
    a.open();
    await tick();
    expect(log).toEqual(['a', 'mine']);
    await tick();
    expect(log, 'alone').toEqual(['a', 'mine']);
    mine.open();
    await tick();
    expect(log).toEqual(['a', 'mine', 'b', 'c']);
    b.open();
    await Promise.all(all);
    expect(await q.add(async () => 'capped', 0, 99)).toBe('capped');
  });

  it('rerank moves waiting jobs by tag (a race start: its sounds forward, the title song back), keeping their order in time', async () => {
    const log: string[] = [];
    const q = new LoadQueue(1);
    const busy = gate(log, 'busy');
    void q.add(busy.job);
    const jobs = [
      q.add(async () => { log.push('title'); }, 0, 1, 'song:title'),
      q.add(async () => { log.push('ui'); }, 0, 0.5, 'sfx:0'),
      q.add(async () => { log.push('models'); }, 1),
      q.add(async () => { log.push('count'); }, 1, 0.5, 'sfx:1'),
      q.add(async () => { log.push('go'); }, 1, 0.5, 'sfx:1'),
      q.add(async () => { log.push('racer'); }, -1, 1, 'race-models'),
      q.add(async () => { log.push('race song'); }, -0.5, 1, 'song:race'),
    ];
    q.rerank('sfx:1', -0.5);
    q.rerank('song:title', 4);
    q.rerank('nothing', 0);
    busy.open();
    await Promise.all(jobs);
    expect(log).toEqual(['busy', 'racer', 'count', 'go', 'race song', 'ui', 'models', 'title']);
  });

  it('passes a failure to the caller and keeps going', async () => {
    const q = new LoadQueue(1);
    const bad = q.add(async () => { throw new Error('404'); });
    const sync = q.add(() => { throw new Error('thrown before a promise'); });
    const good = q.add(async () => 'ok');
    await expect(bad).rejects.toThrow('404');
    await expect(sync).rejects.toThrow('thrown before a promise');
    expect(await good).toBe('ok');
  });

  it('hold() starts nothing new until its promise settles, while running jobs finish', async () => {
    const log: string[] = [];
    const q = new LoadQueue(2);
    const a = gate(log, 'a');
    void q.add(a.job);
    let release!: () => void;
    q.hold(new Promise<void>((r) => { release = r; }));
    const b = q.add(async () => { log.push('b'); });
    await tick();
    expect(log).toEqual(['a']);
    a.open();
    await tick();
    expect(log).toEqual(['a']);
    release();
    await b;
    expect(log).toEqual(['a', 'b']);
    // a rejected hold lets go too
    q.hold(Promise.reject(new Error('race failed to load')));
    await q.add(async () => { log.push('c'); });
    expect(log).toEqual(['a', 'b', 'c']);
  });

  it('atOnce runs the job straight away', async () => {
    const log: string[] = [];
    const p = atOnce(async () => { log.push('now'); return 1; });
    expect(log).toEqual(['now']);
    expect(await p).toBe(1);
  });
});
