// Background loading (docs/sops/performance.md). After its script the game fetches about 13 MB:
// racer and scenery models, paintings, icons. Asked for all at once (as it was until 24 Sept 2026)
// they shared the line with the few small files a screen or a race start waits on: on Slow 4G the
// title's font took 3 s, its sky painting had not come 13 s in, and every race start sat out the
// warm-up's 3 s cap waiting for paintings. So background files take turns: a few at a time, the
// most wanted first, and the line stays free enough for anything asked for outside the queue.

/** Something that runs a job when its turn comes (a LoadQueue at some rank, or at once). */
export type Schedule = <T>(job: () => Promise<T>) => Promise<T>;

/** Runs a job straight away: loading with no queue. */
export const atOnce: Schedule = (job) => job();

interface Job { run: () => Promise<unknown>; rank: number; ok: (v: unknown) => void; fail: (e: unknown) => void }

/** Jobs run `limit` at a time, the lowest rank first and, within a rank, first come first served. */
export class LoadQueue {
  private readonly waiting: Job[] = [];
  private running = 0;
  private held = 0;
  /** jobs running at once at most */
  readonly limit: number;

  constructor(limit = 3) {
    this.limit = limit;
  }

  /** Run `job` when its turn comes; settles as the job does. */
  add<T>(job: () => Promise<T>, rank = 0): Promise<T> {
    return new Promise<T>((ok, fail) => {
      let i = this.waiting.length;
      while (i > 0 && this.waiting[i - 1].rank > rank) i--;
      this.waiting.splice(i, 0, { run: job, rank, ok: ok as (v: unknown) => void, fail });
      this.pump();
    });
  }

  /** This queue at one rank, for a loader that takes a Schedule. */
  at(rank: number): Schedule {
    return (job) => this.add(job, rank);
  }

  /** Start nothing new until `until` settles (jobs already running go on): a race start wants the line. */
  hold(until: Promise<unknown>): void {
    this.held++;
    const go = () => { this.held--; this.pump(); };
    until.then(go, go);
  }

  /** Jobs waiting or running. */
  get pending(): number { return this.waiting.length + this.running; }

  private pump(): void {
    while (this.held === 0 && this.running < this.limit && this.waiting.length > 0) {
      const j = this.waiting.shift()!;
      this.running++;
      let p: Promise<unknown>;
      try { p = Promise.resolve(j.run()); } catch (e) { p = Promise.reject(e); }
      void p.then(j.ok, j.fail).finally(() => { this.running--; this.pump(); });
    }
  }
}

/**
 * An image fetched into the browser's cache, so the <img> or CSS background with the same address
 * shows at once when its screen opens. Resolves either way (a missing file is the screen's business).
 */
export function prefetchImage(url: string): Promise<void> {
  return new Promise((done) => {
    const img = new Image();
    img.onload = img.onerror = () => done();
    img.src = url;
  });
}
