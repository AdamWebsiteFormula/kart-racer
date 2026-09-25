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
