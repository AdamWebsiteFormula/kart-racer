import { describe, expect, it } from 'vitest';
import * as D from './dmath.ts';

const F = new Float64Array(1);
const B = new BigInt64Array(F.buffer);
/** Ordered integer image of a double, so the distance between two is their gap in ulps. */
function ordinal(x: number): bigint {
  F[0] = x;
  const b = B[0];
  return b < 0n ? -(b & 0x7fffffffffffffffn) : b;
}
function ulps(a: number, b: number): number {
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.isNaN(a) && Number.isNaN(b) ? 0 : Infinity;
  const d = ordinal(a) - ordinal(b);
  return Number(d < 0n ? -d : d);
}
function bitsHex(x: number): string {
  F[0] = x;
  return (B[0] & 0xffffffffffffffffn).toString(16).padStart(16, '0');
}

// a fixed LCG so every machine sees the same inputs
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

const N = 200_000;
type Unary = [name: string, ours: (x: number) => number, ref: (x: number) => number, lo: number, hi: number, tol?: number];
const UNARY: Unary[] = [
  ['sin', D.sin, Math.sin, -50, 50],
  ['sin (wide)', D.sin, Math.sin, -1e6, 1e6],
  ['cos', D.cos, Math.cos, -50, 50],
  ['cos (wide)', D.cos, Math.cos, -1e6, 1e6],
  ['tan', D.tan, Math.tan, -10, 10],
  ['tan (bank)', D.tan, Math.tan, -1, 1],
  ['atan', D.atan, Math.atan, -10, 10],
  ['atan (wide)', D.atan, Math.atan, -1e6, 1e6],
  ['asin', D.asin, Math.asin, -1, 1],
  ['acos', D.acos, Math.acos, -1, 1],
  ['exp', D.exp, Math.exp, -30, 30],
  ['exp (lags)', D.exp, Math.exp, -2, 0],
  ['expm1', D.expm1, Math.expm1, -5, 5],
  // fdlibm's tanh is itself up to 2 ulp from the true value (ours and V8's alike, measured against
  // 60-digit decimals on 20k inputs, 24 Sept 2026: worst 1.99 ulp), so the two may sit 3 apart
  ['tanh', D.tanh, Math.tanh, -5, 5, 3],
  ['tanh (small)', D.tanh, Math.tanh, -0.01, 0.01, 3],
];

describe('dmath accuracy against Math.* (≤ 2 ulp, tanh 3)', () => {
  for (const [name, ours, ref, lo, hi, tol = 2] of UNARY) {
    it(name, () => {
      const r = rng(name.length * 7919);
      let worst = 0, at = 0;
      for (let i = 0; i < N; i++) {
        const x = lo + (hi - lo) * r();
        const u = ulps(ours(x), ref(x));
        if (u > worst) { worst = u; at = x; }
      }
      expect(worst, `${name} worst at x = ${at}`).toBeLessThanOrEqual(tol);
    });
  }

  it('atan2 over all four quadrants and near the axes', () => {
    const r = rng(42);
    let worst = 0, at = '';
    for (let i = 0; i < N; i++) {
      const scale = i % 4 === 0 ? 1e-6 : 100;
      const y = (r() * 2 - 1) * (i % 3 === 0 ? scale : 100), x = (r() * 2 - 1) * (i % 5 === 0 ? scale : 100);
      const u = ulps(D.atan2(y, x), Math.atan2(y, x));
      if (u > worst) { worst = u; at = `${y}, ${x}`; }
    }
    expect(worst, `atan2 worst at ${at}`).toBeLessThanOrEqual(2);
  });

  // each is within 1 ulp of the true value, so they may differ by 2
  it('hypot is sqrt of the sum of squares, within 2 ulp of Math.hypot on sim-sized inputs', () => {
    const r = rng(7);
    for (let i = 0; i < N; i++) {
      const a = (r() * 2 - 1) * 1000, b = (r() * 2 - 1) * 1000, c = (r() * 2 - 1) * 1000;
      expect(ulps(D.hypot(a, b), Math.hypot(a, b))).toBeLessThanOrEqual(2);
      expect(ulps(D.hypot3(a, b, c), Math.hypot(a, b, c))).toBeLessThanOrEqual(2);
    }
  });
});

describe('dmath special cases', () => {
  it('zeros keep their sign', () => {
    for (const f of [D.sin, D.tan, D.atan, D.asin, D.tanh, D.expm1]) {
      expect(Object.is(f(0), 0)).toBe(true);
      expect(Object.is(f(-0), -0)).toBe(true);
    }
    expect(D.cos(0)).toBe(1);
    expect(D.cos(-0)).toBe(1);
    expect(D.exp(0)).toBe(1);
    expect(D.acos(1)).toBe(0);
  });

  it('π and friends match Math exactly', () => {
    for (const x of [Math.PI, -Math.PI, Math.PI / 2, -Math.PI / 2, Math.PI / 4, 2 * Math.PI, 3 * Math.PI / 2]) {
      expect(ulps(D.sin(x), Math.sin(x))).toBeLessThanOrEqual(1);
      expect(ulps(D.cos(x), Math.cos(x))).toBeLessThanOrEqual(1);
      expect(ulps(D.tan(x), Math.tan(x))).toBeLessThanOrEqual(1);
    }
    expect(D.atan2(0, -1)).toBe(Math.PI);
    expect(D.atan2(-0, -1)).toBe(-Math.PI);
    expect(D.atan2(1, 0)).toBe(Math.PI / 2);
    expect(D.atan2(-1, 0)).toBe(-Math.PI / 2);
    expect(D.atan2(1, 1)).toBe(Math.PI / 4);
    expect(D.acos(-1)).toBe(Math.PI);
    expect(D.asin(1)).toBe(Math.PI / 2);
    expect(D.asin(-1)).toBe(-Math.PI / 2);
  });

  it('atan2 edge cases follow the spec', () => {
    const I = Infinity;
    const cases: [number, number][] = [[0, 0], [-0, 0], [0, -0], [-0, -0], [0, 5], [0, -5], [-0, -5], [3, I], [-3, I], [3, -I], [-3, -I],
      [I, I], [-I, I], [I, -I], [-I, -I], [I, 2], [-I, 2], [1e300, 1e-300], [1e-300, -1e300], [-1e-300, -1e300]];
    for (const [y, x] of cases) expect(Object.is(D.atan2(y, x), Math.atan2(y, x)), `atan2(${y}, ${x})`).toBe(true);
  });

  it('NaN and out-of-domain give NaN; infinities behave', () => {
    for (const f of [D.sin, D.cos, D.tan, D.atan, D.asin, D.acos, D.exp, D.expm1, D.tanh]) expect(f(NaN)).toBeNaN();
    for (const f of [D.sin, D.cos, D.tan]) { expect(f(Infinity)).toBeNaN(); expect(f(-Infinity)).toBeNaN(); }
    expect(D.asin(1.5)).toBeNaN();
    expect(D.acos(-1.0000001)).toBeNaN();
    expect(D.atan2(NaN, 1)).toBeNaN();
    expect(D.atan2(1, NaN)).toBeNaN();
    expect(D.atan(Infinity)).toBe(Math.PI / 2);
    expect(D.atan(-Infinity)).toBe(-Math.PI / 2);
    expect(D.exp(Infinity)).toBe(Infinity);
    expect(D.exp(-Infinity)).toBe(0);
    expect(D.exp(800)).toBe(Infinity);
    expect(D.exp(-800)).toBe(0);
    expect(D.tanh(Infinity)).toBe(1);
    expect(D.tanh(-Infinity)).toBe(-1);
    expect(D.tanh(30)).toBe(1);
    expect(D.expm1(-100)).toBe(-1);
  });

  it('exp near its limits and in the subnormal range', () => {
    for (const x of [709, 709.7, -700, -708.3, -720, -744, 1, -1, 0.3465, 1.0397]) {
      expect(ulps(D.exp(x), Math.exp(x)), `exp(${x})`).toBeLessThanOrEqual(2);
    }
  });

  it('huge sin/cos/tan arguments stay finite and in range (accuracy is not promised past 1.6e6)', () => {
    for (const x of [1e7, -3e9, 1e15, 1e300, -Number.MAX_VALUE]) {
      for (const v of [D.sin(x), D.cos(x)]) { expect(Number.isFinite(v)).toBe(true); expect(Math.abs(v)).toBeLessThanOrEqual(1); }
      expect(Number.isNaN(D.tan(x))).toBe(false);
    }
  });
});

describe('dmath is bit-identical on every machine', () => {
  // One hash over 20k outputs of every function. Recorded on an M-series Mac, confirmed on
  // linux/amd64 and linux/arm64 (24 Sept 2026). If this fails on a machine, the sim will
  // diverge there: something in dmath used an operation the machine rounds differently.
  it('golden hash', () => {
    const r = rng(2026);
    let h = 0n;
    const mix = (v: number) => { F[0] = v; h = (h * 1000003n + (B[0] & 0xffffffffffffffffn)) & 0xffffffffffffffffn; };
    for (let i = 0; i < 20_000; i++) {
      const x = (r() * 2 - 1) * 40, y = (r() * 2 - 1) * 40, u = r() * 2 - 1;
      mix(D.sin(x)); mix(D.cos(x)); mix(D.tan(x)); mix(D.atan(x)); mix(D.atan2(y, x));
      mix(D.asin(u)); mix(D.acos(u)); mix(D.exp(x / 2)); mix(D.expm1(u * 3)); mix(D.tanh(x / 8));
      mix(D.hypot(x, y)); mix(D.hypot3(x, y, u));
    }
    expect(h.toString(16)).toBe(GOLDEN);
  });
  it('bit patterns of a few anchors', () => {
    expect(bitsHex(D.sin(1))).toBe('3feaed548f090cee');
    expect(bitsHex(D.cos(1))).toBe('3fe14a280fb5068c');
    expect(bitsHex(D.atan2(1, 2))).toBe('3fddac670561bb4f');
    expect(bitsHex(D.exp(1))).toBe('4005bf0a8b14576a'); // fdlibm's exp(1) is 1 ulp above Math.E
  });
});

const GOLDEN = 'd5f4b9c122772cbc';
