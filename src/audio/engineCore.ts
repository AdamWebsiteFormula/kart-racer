// The live engine (28 Sept 2026, for Adam's ears first; off unless the manifest names its grain table): a real small
// engine replayed one firing at a time at exactly the rpm the game asks for, sample by sample, so it follows the rev
// model continuously (kart-controller rev.ts, engine.ts engineRpm) with no loops to crossfade and no pitch-shifting
// of the exhaust's resonances (a resampled loop moves them with the pitch; real engines keep them put). This is the
// grain technique racing games use: each firing is a grain cut from a CC0 recording of a real engine (kyles' dirt
// bike on Freesound: its idle and a held rev, scripts/sfx/grains.py), laid down rpm / 60 times a second, the idle's
// firings crossfading into the held rev's as it climbs. Off the gas it coasts (weaker, darker, now and then a missed
// firing); at the limiter the spark is cut in bursts at 11 Hz (a real limiter, not a level chop). Pure: no Web Audio
// here (engineProcessor.ts runs it in an AudioWorklet; the offline tools and the tests run it directly). No
// allocation after construction.

/** The AudioWorklet processor's registered name (engineProcessor.ts). */
export const ENGINE_PROCESSOR = 'kart-engine';

/** One pool of firings: the grains and the firing rate (Hz) of the stretch they were cut from, at `sampleRate`. */
export interface GrainPool { readonly rate: number; readonly sampleRate: number; readonly grains: readonly Float32Array[] }

/** What the engine does this block: rpm (fires rpm / 60 a second), load 0 coasting .. 1 pulling, the limiter 0..1, `size` 1 as recorded (above 1 a smaller engine: the firings read faster). */
export interface EngineParams { rpm: number; load: number; limit: number; size: number }

/** The engine's fixed tuning. */
export const LIVE_ENGINE = Object.freeze({
  /** rpm where the held rev's firings start taking over from the idle's, and where they have all of it (equal power) */
  revFrom: 1600, revFull: 3400,
  /** each firing rings this many cycles (it overlaps the next a little), its last share faded */
  hold: 1.6, fadeShare: 0.35, fadeInSeconds: 0.0005,
  /** a firing's level spread (a real engine never fires twice alike) */
  ampSpread: 0.1,
  /** off the gas: each firing `coastLevel` as strong (the game's own level drops too); under `coastBelow` load a share go weak (a two-stroke missing), at most `missMax` */
  coastLevel: 0.65, coastBelow: 0.35, missMax: 0.15,
  /** the tone: a one-pole low-pass from `darkHz` coasting to `brightHz` pulling */
  darkHz: 3500, brightHz: 9000,
  /** the limiter cuts the spark this many times a second, for up to `limitDuty` of each cycle */
  limitHz: 11, limitDuty: 0.35,
  /** output scale: grains are normalized to their pool's median level */
  out: 0.25,
});

const MAX_VOICES = 8;

export class GrainEngine {
  private readonly vGrain: (Float32Array | null)[] = new Array<Float32Array | null>(MAX_VOICES).fill(null);
  private readonly vPos = new Float64Array(MAX_VOICES);
  private readonly vLen = new Float64Array(MAX_VOICES);
  private readonly vStep = new Float64Array(MAX_VOICES);
  private readonly vAmp = new Float64Array(MAX_VOICES);
  private readonly last: Int32Array;
  private phase = 0;
  private limPhase = 0;
  private rpmNow = -1;
  private lp = 0;
  private seed: number;
  private readonly pools: readonly GrainPool[];
  private readonly sr: number;

  constructor(pools: readonly GrainPool[], sampleRate: number, seed = 0x2f6b1d35) {
    this.pools = pools.filter((p) => p.grains.length > 0);
    this.sr = sampleRate;
    this.seed = seed >>> 0 || 1;
    this.last = new Int32Array(this.pools.length).fill(-1);
  }

  /** xorshift32 in [0, 1) */
  private rand(): number {
    let s = this.seed;
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    this.seed = s;
    return s / 4294967296;
  }

  /** Voices ringing now (for tests). */
  get voices(): number { let n = 0; for (const g of this.vGrain) if (g) n++; return n; }

  /** Render `n` samples into `out` from `from`: `p` holds for the block, the rpm glides to it from the last block's. */
  render(out: Float32Array, from: number, n: number, p: EngineParams): void {
    const E = LIVE_ENGINE, sr = this.sr;
    const r0 = this.rpmNow < 0 ? p.rpm : this.rpmNow;
    const hz = E.darkHz + (E.brightHz - E.darkHz) * Math.min(1, Math.max(0, p.load));
    const a = 1 - Math.exp((-2 * Math.PI * hz) / sr);
    const fadeIn = Math.max(1, E.fadeInSeconds * sr);
    for (let i = 0; i < n; i++) {
      const rpm = r0 + ((p.rpm - r0) * (i + 1)) / n;
      this.phase += Math.max(1, rpm) / 60 / sr;
      this.limPhase += E.limitHz / sr;
      if (this.limPhase >= 1) this.limPhase -= 1;
      if (this.phase >= 1) {
        this.phase -= 1;
        const cut = p.limit > 0 && this.limPhase < E.limitDuty * Math.min(1, p.limit);
        if (!cut) this.fire(rpm, p);
      }
      let s = 0;
      for (let v = 0; v < MAX_VOICES; v++) {
        const g = this.vGrain[v];
        if (!g) continue;
        const pos = this.vPos[v], len = this.vLen[v];
        if (pos >= len) { this.vGrain[v] = null; continue; }
        const x = pos * this.vStep[v], k = x | 0, f = x - k;
        const smp = k + 1 < g.length ? g[k] + (g[k + 1] - g[k]) * f : 0;
        const tail = (len - pos) / (len * E.fadeShare);
        const w = Math.min(1, pos / fadeIn) * (tail < 1 ? tail : 1);
        s += this.vAmp[v] * w * smp;
        this.vPos[v] = pos + 1;
      }
      this.lp += a * (s - this.lp);
      out[from + i] = this.lp * E.out;
    }
    this.rpmNow = p.rpm;
  }

  /** One firing now: a grain from each pool the rpm calls on, weighted, never the pool's last grain again. */
  private fire(rpm: number, p: EngineParams): void {
    const E = LIVE_ENGINE;
    const x = Math.min(1, Math.max(0, (rpm - E.revFrom) / (E.revFull - E.revFrom)));
    const load = Math.min(1, Math.max(0, p.load));
    let amp = (E.coastLevel + (1 - E.coastLevel) * Math.pow(load, 0.7)) * (1 + E.ampSpread * (this.rand() + this.rand() + this.rand() - 1.5) * 2);
    if (load < E.coastBelow && this.rand() < E.missMax * (1 - load / E.coastBelow)) amp *= 0.05;
    const period = 60 / Math.max(1, rpm);
    for (let q = 0; q < this.pools.length; q++) {
      const w = this.pools.length === 1 ? 1 : q === 0 ? Math.cos((x * Math.PI) / 2) : Math.sin((x * Math.PI) / 2);
      if (w < 0.02) continue;
      const pool = this.pools[q], m = pool.grains.length;
      let k = Math.min(m - 1, Math.floor(this.rand() * m));
      if (m > 1 && k === this.last[q]) k = (k + 1) % m;
      this.last[q] = k;
      let v = 0;
      while (v < MAX_VOICES && this.vGrain[v]) v++;
      if (v === MAX_VOICES) {
        // every voice busy: take the one nearest its end
        let best = 0;
        for (let u = 1; u < MAX_VOICES; u++) if (this.vLen[u] - this.vPos[u] < this.vLen[best] - this.vPos[best]) best = u;
        v = best;
      }
      const g = pool.grains[k], step = Math.max(0.25, p.size) * (pool.sampleRate / this.sr);
      this.vGrain[v] = g;
      this.vPos[v] = 0;
      this.vStep[v] = step;
      this.vLen[v] = Math.min(E.hold * period * this.sr, (g.length - 2) / step);
      this.vAmp[v] = amp * w;
    }
  }
}
