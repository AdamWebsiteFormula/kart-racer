// Time Trial ghost: the player's best run as a path, not as inputs. An input replay drifts
// (it cannot pick up coins, and coins raise top speed: race-manager Decisions 2026-09-21), so the
// ghost is where the kart WAS: position, heading and loop angle sampled every GHOST_STEP sim ticks
// from tick 0, read back with linear interpolation. It is never a kart in the race: it cannot
// collide, rank, pop a balloon or trigger anything. Pure; no Three.js.
//
// Stored form (save.timeTrial[trackId].ghost): base64 of
//   [version, step, then per sample: zigzag varints of dx, dy, dz (cm), dHeading, dAngle (1/65536 turn)]
// Each channel is quantised absolutely first and then differenced, so rounding never accumulates.
import type { KartState } from '../kart-controller/types.ts';

export const GHOST_VERSION = 1;
/** ticks between samples: 30 per second at the 120 Hz sim */
export const GHOST_STEP = 4;
/** a ghost longer than this (10 minutes of samples) is not kept */
export const GHOST_MAX_SAMPLES = (600 * 120) / GHOST_STEP;

const CM = 100;
const TURN = 65536;
const TAU = Math.PI * 2;

export interface GhostPose { x: number; y: number; z: number; heading: number; angle: number }

/** One recorded run: flat arrays, index k is sim tick k * step. */
export interface GhostPath { step: number; x: Float32Array; y: Float32Array; z: Float32Array; heading: Float32Array; angle: Float32Array; length: number }

/** Records the kart after each sim tick; stops at its finish tick. */
export class GhostRecorder {
  private readonly q: number[][] = [[], [], [], [], []];
  private done = false;
  readonly step: number;
  constructor(step = GHOST_STEP) { this.step = step; }

  get samples(): number { return this.q[0].length; }

  /** `tick`: sim ticks stepped so far (0 before the first step). Samples on every `step`th tick and on the finish tick. */
  record(tick: number, s: KartState): void {
    if (this.done) return;
    const finished = s.finishTick !== undefined;
    if (tick % this.step !== 0 && !finished) return;
    if (this.samples >= GHOST_MAX_SAMPLES) { this.done = true; return; }
    const k = Math.ceil(tick / this.step);
    // the finish tick may fall between two sample ticks: it becomes the next sample (the ghost crosses a hair late, never early)
    while (this.samples < k) this.push(s);
    if (this.samples === k) this.push(s);
    if (finished) this.done = true;
  }

  private push(s: KartState): void {
    const q = this.q;
    q[0].push(Math.round(s.position[0] * CM));
    q[1].push(Math.round(s.position[1] * CM));
    q[2].push(Math.round(s.position[2] * CM));
    q[3].push(Math.round((s.heading / TAU) * TURN));
    q[4].push(Math.round((s.status.loopAngle / TAU) * TURN));
  }

  /** The stored string, or '' when nothing was recorded. */
  encode(): string {
    const n = this.samples;
    if (!n) return '';
    const bytes: number[] = [GHOST_VERSION, this.step];
    const last = [0, 0, 0, 0, 0];
    for (let i = 0; i < n; i++) {
      for (let c = 0; c < 5; c++) {
        let d = this.q[c][i] - last[c];
        // angles take the short way round, so a heading that wraps costs one small step
        if (c >= 3) d = ((((d + TURN / 2) % TURN) + TURN) % TURN) - TURN / 2;
        last[c] += d;
        writeVarint(bytes, d >= 0 ? d * 2 : -d * 2 - 1);
      }
    }
    return toBase64(bytes);
  }
}

/** Read a stored ghost; null for anything malformed (a foreign or hand-edited save). */
export function decodeGhost(text: string): GhostPath | null {
  let bytes: Uint8Array;
  try { bytes = fromBase64(text); } catch { return null; }
  if (bytes.length < 2 || bytes[0] !== GHOST_VERSION || bytes[1] < 1 || bytes[1] > 60) return null;
  const step = bytes[1];
  const cols: number[][] = [[], [], [], [], []];
  const acc = [0, 0, 0, 0, 0];
  const pos = { i: 2 };
  while (pos.i < bytes.length) {
    for (let c = 0; c < 5; c++) {
      const z = readVarint(bytes, pos);
      if (z === null) return null;
      acc[c] += z % 2 ? -(z + 1) / 2 : z / 2;
      cols[c].push(acc[c]);
    }
    if (cols[0].length > GHOST_MAX_SAMPLES) return null;
  }
  const n = cols[0].length;
  if (!n) return null;
  const f = (c: number, k: number) => Float32Array.from(cols[c], (v) => v / k);
  return { step, x: f(0, CM), y: f(1, CM), z: f(2, CM), heading: Float32Array.from(cols[3], (v) => (v / TURN) * TAU), angle: Float32Array.from(cols[4], (v) => (v / TURN) * TAU), length: n };
}

/** Where the ghost is at sim time `ticks` (fractional: a rendered frame between two ticks). Holds its last pose after its finish. */
export function ghostPose(g: GhostPath, ticks: number, out: GhostPose = { x: 0, y: 0, z: 0, heading: 0, angle: 0 }): GhostPose {
  const f = Math.min(Math.max(ticks / g.step, 0), g.length - 1);
  const a = Math.floor(f), b = Math.min(a + 1, g.length - 1), k = f - a;
  const lerp = (arr: Float32Array) => arr[a] + (arr[b] - arr[a]) * k;
  const turn = (arr: Float32Array) => {
    let d = arr[b] - arr[a];
    d = ((((d + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
    return arr[a] + d * k;
  };
  out.x = lerp(g.x); out.y = lerp(g.y); out.z = lerp(g.z);
  out.heading = turn(g.heading); out.angle = turn(g.angle);
  return out;
}

/** Sim ticks the recorded run lasts (its last sample). */
export const ghostTicks = (g: GhostPath): number => (g.length - 1) * g.step;

function writeVarint(out: number[], v: number): void {
  while (v >= 0x80) { out.push((v % 0x80) | 0x80); v = Math.floor(v / 0x80); }
  out.push(v);
}

function readVarint(b: Uint8Array, pos: { i: number }): number | null {
  let v = 0, mul = 1;
  for (let n = 0; n < 6; n++) {
    if (pos.i >= b.length) return null;
    const x = b[pos.i++];
    v += (x & 0x7f) * mul;
    if (x < 0x80) return v;
    mul *= 0x80;
  }
  return null;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function toBase64(bytes: readonly number[]): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], b = bytes[i + 1], c = bytes[i + 2];
    const n = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
    s += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (b === undefined ? '=' : B64[(n >> 6) & 63]) + (c === undefined ? '=' : B64[n & 63]);
  }
  return s;
}

function fromBase64(s: string): Uint8Array {
  if (typeof s !== 'string' || s.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(s)) throw new Error('not base64');
  const pad = s.endsWith('==') ? 2 : s.endsWith('=') ? 1 : 0;
  const out = new Uint8Array((s.length / 4) * 3 - pad);
  let o = 0;
  for (let i = 0; i < s.length; i += 4) {
    const n = (B64.indexOf(s[i]) << 18) | (B64.indexOf(s[i + 1]) << 12) | (Math.max(0, B64.indexOf(s[i + 2])) << 6) | Math.max(0, B64.indexOf(s[i + 3]));
    if (o < out.length) out[o++] = (n >> 16) & 255;
    if (o < out.length) out[o++] = (n >> 8) & 255;
    if (o < out.length) out[o++] = n & 255;
  }
  return out;
}
