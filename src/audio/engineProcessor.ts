// The live engine in an AudioWorklet (liveEngine.ts loads it): engineCore.ts's GrainEngine rendered on the audio
// thread, block by block, from four k-rate parameters (rpm, load, limit, size) the game sets every frame. The grain
// pools arrive once, by message, from the main thread. Silent until they do.
import { ENGINE_PROCESSOR, GrainEngine, type GrainPool } from './engineCore.ts';

// the AudioWorklet global scope (not in the DOM lib)
declare const sampleRate: number;
declare function registerProcessor(name: string, ctor: unknown): void;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
}

class KartEngineProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'rpm', defaultValue: 1400, minValue: 100, maxValue: 20000, automationRate: 'k-rate' },
      { name: 'load', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      { name: 'limit', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      { name: 'size', defaultValue: 1, minValue: 0.25, maxValue: 4, automationRate: 'k-rate' },
    ];
  }

  private engine: GrainEngine | null = null;
  private readonly p = { rpm: 1400, load: 0, limit: 0, size: 1 };

  constructor() {
    super();
    this.port.onmessage = (e: MessageEvent<{ pools: GrainPool[]; seed?: number }>) => { this.engine = new GrainEngine(e.data.pools, sampleRate, e.data.seed); };
  }

  process(_in: Float32Array[][], outputs: Float32Array[][], params: Record<string, Float32Array>): boolean {
    const out = outputs[0];
    if (!out?.length || !this.engine) return true;
    const p = this.p;
    p.rpm = params.rpm[0]; p.load = params.load[0]; p.limit = params.limit[0]; p.size = params.size[0];
    this.engine.render(out[0], 0, out[0].length, p);
    for (let c = 1; c < out.length; c++) out[c].set(out[0]);
    return true;
  }
}

registerProcessor(ENGINE_PROCESSOR, KartEngineProcessor);
