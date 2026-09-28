// The live engine's main-thread side (engineCore.ts, engineProcessor.ts): the grain table's decoded audio split back
// into its pools (pure, tested), and the AudioWorkletNode the player's engine plays through once it is up. Nothing
// here runs unless the manifest names a grain table (samples.ts Manifest.engine): the recorded loops stay the engine
// until then, and whenever the browser has no AudioWorklet or the module will not load.
import { ENGINE_PROCESSOR, type GrainPool } from './engineCore.ts';

/** scripts/sfx/grains.py's map: where each grain of each pool sits in the table, at the table's own rate. */
export interface GrainMap {
  sampleRate: number;
  /** seconds of silence between grains */
  gap: number;
  /** the scale the table was written at (undone here: grains come back at their pool's median level) */
  gain: number;
  pools: { name: string; rate: number; grains: [number, number][] }[];
}

/**
 * Split a decoded grain table (`data` at `rate`) into its pools. A decoder may add a little delay at the front (an
 * MP3's encoder delay), so the table's own pattern (sound inside each grain, silence between) is lined up with the
 * map first, within 60 ms either way.
 */
export function splitGrains(data: Float32Array, rate: number, map: GrainMap): GrainPool[] {
  const k = rate / map.sampleRate;
  // the level of the table in 1 ms steps, and the map's gate (1 in a grain, 0 in a gap) on the same grid
  const hop = Math.max(1, Math.round(rate / 1000)), n = Math.ceil(data.length / hop);
  const env = new Float32Array(n);
  for (let h = 0; h < n; h++) { let s = 0; const a = h * hop, b = Math.min(data.length, a + hop); for (let i = a; i < b; i++) s += Math.abs(data[i]); env[h] = s / (b - a || 1); }
  const gate = new Float32Array(n);
  for (const p of map.pools) for (const [s, len] of p.grains) { const a = Math.floor((s * k) / hop), b = Math.min(n, Math.ceil(((s + len) * k) / hop)); for (let h = a; h < b; h++) gate[h] = 1; }
  let best = 0, lag = 0;
  for (let d = -60; d <= 60; d++) {
    let c = 0;
    for (let h = Math.max(0, -d); h < n && h + d < n; h++) c += gate[h] * env[h + d];
    if (c > best) { best = c; lag = d; }
  }
  const shift = lag * hop, undo = map.gain > 0 ? 1 / map.gain : 1;
  return map.pools.map((p) => ({
    rate: p.rate,
    sampleRate: rate,
    grains: p.grains.map(([s, len]) => {
      const a = Math.max(0, Math.round(s * k) + shift), g = new Float32Array(Math.max(0, Math.min(data.length - a, Math.round(len * k))));
      for (let i = 0; i < g.length; i++) g[i] = data[a + i] * undo;
      return g;
    }).filter((g) => g.length > 16),
  }));
}

/** How the game drives the live engine each frame. */
export interface LiveParams { rpm: number; load: number; limit: number; size: number }

/** The player's live engine: an AudioWorkletNode running engineProcessor.ts, fed the grain pools once. */
export class LiveEngine {
  readonly node: AudioNode;
  private readonly params: Record<string, AudioParam | undefined>;

  private constructor(node: AudioWorkletNode) {
    this.node = node;
    this.params = { rpm: node.parameters.get('rpm'), load: node.parameters.get('load'), limit: node.parameters.get('limit'), size: node.parameters.get('size') };
  }

  /** The live engine on `ctx`, its processor loaded from `moduleUrl`; null where the browser cannot run it (the loops stay). */
  static async create(ctx: BaseAudioContext, moduleUrl: string, pools: GrainPool[], seed = 0x2f6b1d35): Promise<LiveEngine | null> {
    const W = (globalThis as { AudioWorkletNode?: typeof AudioWorkletNode }).AudioWorkletNode;
    if (!W || !ctx.audioWorklet || !pools.some((p) => p.grains.length)) return null;
    try {
      await ctx.audioWorklet.addModule(moduleUrl);
      const node = new W(ctx, ENGINE_PROCESSOR, { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [1] });
      node.port.postMessage({ pools, seed });
      return new LiveEngine(node);
    } catch {
      return null;
    }
  }

  /** This frame's engine: the rpm (class pitch and boost rev in it), the load (engine.ts engineDrive), the limiter, the size. */
  set(t: number, p: LiveParams): void {
    this.params.rpm?.setTargetAtTime(p.rpm, t, 0.03);
    this.params.load?.setTargetAtTime(p.load, t, 0.05);
    this.params.limit?.setTargetAtTime(p.limit, t, 0.04);
    this.params.size?.setTargetAtTime(p.size, t, 0.1);
  }
}
