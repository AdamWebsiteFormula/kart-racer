// The replayable input log. The player's input is quantised BEFORE the sim sees it, so the log
// holds exactly what the sim used and a server re-simulation reproduces the run bit for bit.
// Encoding: 4 bytes per tick (steer int8, throttle, brake, flags), run-length encoded, base64.
import type { InputState } from '../kart-controller/types.ts';

const Q = 127;
// `+ 0` turns −0 into 0: the log cannot carry the sign of zero, so the sim must never see it
const q = (x: number, lo: number, hi: number) => Math.round(Math.min(hi, Math.max(lo, x)) * Q) / Q + 0;

/** Round an input to the log's precision, into `out` (no allocation per tick). */
export function quantize(i: InputState, out: InputState): InputState {
  out.steer = q(i.steer, -1, 1);
  out.throttle = q(i.throttle, 0, 1);
  out.brake = q(i.brake, 0, 1);
  out.drift = i.drift; out.item = i.item; out.lookBack = i.lookBack; out.horn = i.horn;
  return out;
}

function pack(i: InputState, b: Uint8Array, o: number): void {
  b[o] = (Math.round(i.steer * Q) + 256) & 255;
  b[o + 1] = Math.round(i.throttle * Q);
  b[o + 2] = Math.round(i.brake * Q);
  b[o + 3] = (i.drift ? 1 : 0) | (i.item ? 2 : 0) | (i.lookBack ? 4 : 0) | (i.horn ? 8 : 0);
}

function unpack(b: Uint8Array, o: number): InputState {
  const s = b[o] > 127 ? b[o] - 256 : b[o];
  const f = b[o + 3];
  return { steer: s / Q + 0, throttle: b[o + 1] / Q, brake: b[o + 2] / Q, drift: (f & 1) > 0, item: (f & 2) > 0, lookBack: (f & 4) > 0, horn: (f & 8) > 0 };
}

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromBase64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Varint run length, then the 4-byte record. Version byte first. */
export function encodeLog(log: readonly InputState[]): string {
  const rec = new Uint8Array(4), prev = new Uint8Array(4);
  const out: number[] = [1];
  let run = 0;
  const flush = () => {
    let n = run;
    while (n >= 0x80) { out.push((n & 0x7f) | 0x80); n >>>= 7; }
    out.push(n);
    out.push(prev[0], prev[1], prev[2], prev[3]);
  };
  for (const i of log) {
    pack(i, rec, 0);
    if (run > 0 && rec[0] === prev[0] && rec[1] === prev[1] && rec[2] === prev[2] && rec[3] === prev[3]) { run++; continue; }
    if (run > 0) flush();
    prev.set(rec);
    run = 1;
  }
  if (run > 0) flush();
  return toBase64(Uint8Array.from(out));
}

/** Throws on a malformed log. `maxTicks` guards against a tiny string that expands forever. */
export function decodeLog(s: string, maxTicks = 120 * 60 * 10): InputState[] {
  const b = fromBase64(s);
  if (b[0] !== 1) throw new Error('unknown log version');
  const out: InputState[] = [];
  let o = 1;
  while (o < b.length) {
    let n = 0, shift = 0;
    for (;;) {
      if (o >= b.length || shift > 28) throw new Error('bad run length');
      const x = b[o++];
      n |= (x & 0x7f) << shift;
      if (x < 0x80) break;
      shift += 7;
    }
    if (o + 4 > b.length) throw new Error('truncated record');
    if (n <= 0 || out.length + n > maxTicks) throw new Error('log too long');
    const i = unpack(b, o);
    o += 4;
    for (let k = 0; k < n; k++) out.push(i);
  }
  return out;
}
