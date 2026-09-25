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

interface Job { run: () => Promise<unknown>; rank: number; weight: number; tag: string | undefined; seq: number; ok: (v: unknown) => void; fail: (e: unknown) => void }

/**
 * Jobs run `limit` at a time, the lowest rank first and, within a rank, first come first served. A
 * job can weigh less than one (a sound effect of 10 to 70 KB: 0.5), so small files fill the line
 * two to a turn while a model or a song takes a whole one: 3 models, or 6 sounds, or 2 and 2; or as
 * much as the whole line (the racer a race start waits on most: it comes down alone, at full speed).
 * The order stays strict: a light job never jumps a heavy one waiting ahead of it. A tagged job can
 * be moved to another rank while it waits (rerank): what a race start wants now, what can wait.
 */
export class LoadQueue {
  private readonly waiting: Job[] = [];
  private running = 0;
  /** the weight of the jobs running */
  private used = 0;
  private held = 0;
  /** jobs added so far: first come first served within a rank, a moved job keeping its place in time */
  private added = 0;
  /** weight running at once at most (jobs of weight 1: this many) */
  readonly limit: number;

  constructor(limit = 3) {
    this.limit = limit;
  }

  /**
   * Run `job` when its turn comes; settles as the job does. `weight`: its share of the line, in turns
   * (0.05 up to `limit`: the whole line); `tag`: a name to move it by while it waits (rerank).
   */
  add<T>(job: () => Promise<T>, rank = 0, weight = 1, tag?: string): Promise<T> {
    return new Promise<T>((ok, fail) => {
      this.insert({ run: job, rank, weight: Math.min(this.limit, Math.max(0.05, weight)), tag, seq: this.added++, ok: ok as (v: unknown) => void, fail });
      this.pump();
    });
  }

  /** This queue at one rank (and weight and tag), for a loader that takes a Schedule. */
  at(rank: number, weight = 1, tag?: string): Schedule {
    return (job) => this.add(job, rank, weight, tag);
  }

  /** Every waiting job tagged `tag` to `rank` (in the order they were added, among the jobs there); running ones are not touched. */
  rerank(tag: string, rank: number): void {
    const moved = this.waiting.filter((j) => j.tag === tag && j.rank !== rank);
    if (!moved.length) return;
    for (const j of moved) { this.waiting.splice(this.waiting.indexOf(j), 1); j.rank = rank; this.insert(j); }
    this.pump();
  }

  /** Into its place: after every job of a lower rank, and of its own rank added before it. */
  private insert(j: Job): void {
    let i = this.waiting.length;
    while (i > 0 && (this.waiting[i - 1].rank > j.rank || (this.waiting[i - 1].rank === j.rank && this.waiting[i - 1].seq > j.seq))) i--;
    this.waiting.splice(i, 0, j);
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
    while (this.held === 0 && this.waiting.length > 0 && (this.running === 0 || this.used + this.waiting[0].weight <= this.limit + 1e-9)) {
      const j = this.waiting.shift()!;
      this.running++;
      this.used += j.weight;
      let p: Promise<unknown>;
      try { p = Promise.resolve(j.run()); } catch (e) { p = Promise.reject(e); }
      void p.then(j.ok, j.fail).finally(() => { this.running--; this.used -= j.weight; this.pump(); });
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
