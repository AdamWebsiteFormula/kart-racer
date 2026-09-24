// Measurement DSP: BS.1770 K-weighting and gating, EBU R128 short-term and LRA, 4x true peak,
// octave-band spectrum, band filters. Offline only.
export type Coef = [number, number, number, number, number]; // b0 b1 b2 a1 a2 (a0 = 1)

export function kCoefs(fs: number): Coef[] {
  // pyloudnorm's derivation, valid at any rate
  let G = 3.999843853973347, Q = 0.7071752369554196, fc = 1681.974450955533;
  let A = Math.pow(10, G / 40), w = 2 * Math.PI * fc / fs, a = Math.sin(w) / (2 * Q), c = Math.cos(w);
  const s1a0 = (A + 1) - (A - 1) * c + 2 * Math.sqrt(A) * a;
  const s1: Coef = [
    A * ((A + 1) + (A - 1) * c + 2 * Math.sqrt(A) * a) / s1a0, -2 * A * ((A - 1) + (A + 1) * c) / s1a0, A * ((A + 1) + (A - 1) * c - 2 * Math.sqrt(A) * a) / s1a0,
    2 * ((A - 1) - (A + 1) * c) / s1a0, ((A + 1) - (A - 1) * c - 2 * Math.sqrt(A) * a) / s1a0,
  ];
  fc = 38.13547087602444; Q = 0.5003270373238773; w = 2 * Math.PI * fc / fs; a = Math.sin(w) / (2 * Q); c = Math.cos(w);
  const a0 = 1 + a;
  const s2: Coef = [(1 + c) / 2 / a0, -(1 + c) / a0, (1 + c) / 2 / a0, -2 * c / a0, (1 - a) / a0];
  return [s1, s2];
}

export function butter(type: 'lp' | 'hp', f: number, fs: number, Q = Math.SQRT1_2): Coef {
  const w = 2 * Math.PI * f / fs, c = Math.cos(w), a = Math.sin(w) / (2 * Q), a0 = 1 + a;
  return type === 'lp' ? [(1 - c) / 2 / a0, (1 - c) / a0, (1 - c) / 2 / a0, -2 * c / a0, (1 - a) / a0]
    : [(1 + c) / 2 / a0, -(1 + c) / a0, (1 + c) / 2 / a0, -2 * c / a0, (1 - a) / a0];
}

/** 1–4 kHz band: 4th order each side (two cascaded Butterworth biquads) */
export const bandCoefs = (fs: number, lo = 1000, hi = 4000): Coef[] => [butter('hp', lo, fs, 0.5412), butter('hp', lo, fs, 1.3066), butter('lp', hi, fs, 0.5412), butter('lp', hi, fs, 1.3066)];

/** A cascade with its own state, streamed. */
export class Chain {
  private st: Float64Array;
  constructor(readonly cs: Coef[]) { this.st = new Float64Array(cs.length * 4); }
  run(x: number): number {
    const st = this.st;
    for (let k = 0; k < this.cs.length; k++) {
      const [b0, b1, b2, a1, a2] = this.cs[k], o = k * 4;
      const y = b0 * x + b1 * st[o] + b2 * st[o + 1] - a1 * st[o + 2] - a2 * st[o + 3];
      st[o + 1] = st[o]; st[o] = x; st[o + 3] = st[o + 2]; st[o + 2] = y; x = y;
    }
    return x;
  }
}

export function filter(chs: Float32Array[], cs: Coef[]): Float32Array[] {
  return chs.map((ch) => { const f = new Chain(cs), o = new Float32Array(ch.length); for (let i = 0; i < ch.length; i++) o[i] = f.run(ch[i]); return o; });
}

/** Mean-square per hop (summed over channels, BS.1770 weighting 1 for L/R). */
export function hopPower(chs: Float32Array[], hop: number): Float64Array {
  const n = Math.floor(chs[0].length / hop), out = new Float64Array(n);
  for (let h = 0; h < n; h++) { let s = 0; for (const c of chs) for (let i = h * hop; i < (h + 1) * hop; i++) s += c[i] * c[i]; out[h] = s / hop; }
  return out;
}

export const lufs = (p: number) => (p > 0 ? -0.691 + 10 * Math.log10(p) : -Infinity);
export const db = (x: number) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
export const pdb = (p: number) => (p > 0 ? 10 * Math.log10(p) : -Infinity);

/** Windowed power (mean of hops) of `win` hops every `step` hops. */
export function windows(hp: Float64Array, win: number, step: number): number[] {
  const out: number[] = [];
  for (let s = 0; s + win <= hp.length; s += step) { let a = 0; for (let i = s; i < s + win; i++) a += hp[i]; out.push(a / win); }
  return out;
}

/** BS.1770-4 integrated loudness from K-weighted 100 ms hop powers. */
export function integrated(hp100: Float64Array): number {
  const blocks = windows(hp100, 4, 1).filter((p) => lufs(p) > -70);
  if (!blocks.length) return -Infinity;
  const rel = lufs(blocks.reduce((a, b) => a + b, 0) / blocks.length) - 10;
  const g = blocks.filter((p) => lufs(p) > rel);
  return lufs(g.reduce((a, b) => a + b, 0) / g.length);
}

/** EBU Tech 3342 LRA from K-weighted 100 ms hop powers (3 s windows, 10 Hz). */
export function lra(hp100: Float64Array): { lra: number; st: number[] } {
  const st = windows(hp100, 30, 1).map(lufs);
  const a = st.filter((x) => x > -70);
  if (!a.length) return { lra: 0, st };
  const rel = lufs(a.map((x) => Math.pow(10, (x + 0.691) / 10)).reduce((p, q) => p + q, 0) / a.length) - 20;
  const g = a.filter((x) => x > rel).sort((p, q) => p - q);
  const pct = (q: number) => g[Math.min(g.length - 1, Math.floor(q * (g.length - 1)))];
  return { lra: pct(0.95) - pct(0.1), st };
}

/** 4x oversampled true peak (48-tap-per-phase windowed sinc), plus sample peak and clip count. */
export function truePeak(chs: Float32Array[]): { tp: number; sp: number; clips: number; tpAt: number } {
  const L = 4, taps = 12; // taps each side per phase
  const h: number[][] = [];
  for (let p = 0; p < L; p++) {
    const row: number[] = [];
    for (let k = -taps + 1; k <= taps; k++) {
      const x = k - p / L; // distance in input samples
      const s = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
      const w = 0.5 + 0.5 * Math.cos(Math.PI * x / (taps + 1));
      row.push(s * w);
    }
    h.push(row);
  }
  let tp = 0, sp = 0, clips = 0, tpAt = 0;
  for (const c of chs) {
    for (let i = 0; i < c.length; i++) {
      const a = Math.abs(c[i]); if (a > sp) sp = a; if (a >= 0.999) clips++;
      if (a < 0.3) continue; // quick skip: true peak near a quiet sample cannot exceed a loud one by much
      for (let p = 1; p < L; p++) {
        let y = 0; const row = h[p];
        for (let k = -taps + 1, j = 0; k <= taps; k++, j++) { const idx = i + k; if (idx >= 0 && idx < c.length) y += c[idx] * row[j]; }
        const ay = Math.abs(y); if (ay > tp) { tp = ay; tpAt = i; }
      }
      if (a > tp) { tp = a; tpAt = i; }
    }
  }
  return { tp, sp, clips, tpAt };
}

// ---------------------------------------------------------------- spectrum
function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let j = 0; j < len / 2; j++) {
        const ar = re[i + j], ai = im[i + j], br = re[i + j + len / 2] * cr - im[i + j + len / 2] * ci, bi = re[i + j + len / 2] * ci + im[i + j + len / 2] * cr;
        re[i + j] = ar + br; im[i + j] = ai + bi; re[i + j + len / 2] = ar - br; im[i + j + len / 2] = ai - bi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}

/** Welch power spectrum of the mono sum; returns power per bin and bin width. */
export function welch(chs: Float32Array[], fs: number, n = 8192, from = 0, to = chs[0].length): { p: Float64Array; df: number } {
  const p = new Float64Array(n / 2), w = new Float64Array(n);
  for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / n);
  let frames = 0;
  for (let s = from; s + n <= to; s += n / 2) {
    const re = new Float64Array(n), im = new Float64Array(n);
    for (let i = 0; i < n; i++) { let m = 0; for (const c of chs) m += c[s + i]; re[i] = (m / chs.length) * w[i]; }
    fft(re, im);
    for (let k = 0; k < n / 2; k++) p[k] += re[k] * re[k] + im[k] * im[k];
    frames++;
  }
  for (let k = 0; k < n / 2; k++) p[k] /= Math.max(1, frames);
  return { p, df: fs / n };
}

export const OCTAVES = [63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
/** Band power (dB, relative to the 1 kHz octave) per octave band. */
export function octaveBands(sp: { p: Float64Array; df: number }, centres = OCTAVES): number[] {
  const e = centres.map((c) => { const lo = c / Math.SQRT2, hi = c * Math.SQRT2; let s = 0; for (let k = 1; k < sp.p.length; k++) { const f = k * sp.df; if (f >= lo && f < hi) s += sp.p[k]; } return s; });
  const ref = e[centres.indexOf(1000)];
  return e.map((x) => pdb(x / ref));
}

/** Stereo: L/R correlation and side-to-mid energy (dB). */
export function stereo(chs: Float32Array[]): { corr: number; sideMid: number } {
  if (chs.length < 2) return { corr: 1, sideMid: -Infinity };
  let ll = 0, rr = 0, lr = 0, m = 0, s = 0;
  const [L, R] = chs;
  for (let i = 0; i < L.length; i++) { ll += L[i] * L[i]; rr += R[i] * R[i]; lr += L[i] * R[i]; const a = (L[i] + R[i]) / 2, b = (L[i] - R[i]) / 2; m += a * a; s += b * b; }
  return { corr: lr / Math.sqrt(ll * rr || 1), sideMid: pdb(s / (m || 1)) };
}
