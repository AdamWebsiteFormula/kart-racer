// Deterministic maths for the race sim: the same bits on every chip and JS engine.
//
// Math.sin, cos, atan2, exp, tanh… are "implementation-approximated" in JS: V8 on arm64 returns
// different last bits from V8 on x64 (the C library is compiled with fused multiply-add on arm64),
// and Safari and Firefox differ again. The sim (and the leaderboard server that replays it) must be
// bit-identical everywhere, so sim code calls these instead. They are fdlibm (FreeBSD msun) ported
// line by line, using only operations IEEE 754 defines exactly: + − × ÷, Math.sqrt, Math.abs,
// Math.floor/trunc, comparisons. JS never fuses a × b + c, so the result is the same everywhere.
// Accuracy is fdlibm's: under 1 ulp (tests hold it to 2 ulp against Math.*).
//
// Arguments beyond ±1.6e6 rad for sin/cos/tan skip fdlibm's Payne–Hanek reduction: still
// deterministic and in range, but no longer accurate. The sim's angles never get near that.

/** A double from its IEEE bits (high and low 32-bit words). */
function fromBits(hi: number, lo: number): number {
  const v = new DataView(new ArrayBuffer(8));
  v.setUint32(0, hi >>> 0);
  v.setUint32(4, lo >>> 0);
  return v.getFloat64(0);
}

// 2^k for every normal exponent, built by exact doubling and halving.
const POW2 = new Float64Array(2046); // index k + 1022, k in [-1022, 1023]
POW2[1022] = 1;
for (let k = 1; k <= 1023; k++) POW2[1022 + k] = POW2[1021 + k] * 2;
for (let k = 1; k <= 1022; k++) POW2[1022 - k] = POW2[1023 - k] * 0.5;
/** y × 2^k, exact while the result is normal. */
function scalb(y: number, k: number): number {
  if (k > 1023) return y * POW2[2045] * POW2[1022 + k - 1023];
  if (k < -1022) return y * POW2[1022 + k + 1000] * POW2[22]; // POW2[22] = 2^-1000
  return y * POW2[1022 + k];
}

/** Veltkamp split: the top 26 bits of x, so a product of two such halves is exact. */
function hi26(x: number): number {
  const c = 134217729 * x; // 2^27 + 1
  return c - (c - x);
}

const TWOM27 = 7.450580596923828e-9;
const isNegative = (x: number): boolean => x < 0 || (x === 0 && 1 / x < 0);

// ---- sin, cos, tan -------------------------------------------------------------------------

const S1 = -1.66666666666666324348e-1, S2 = 8.33333333332248946124e-3, S3 = -1.98412698298579493134e-4;
const S4 = 2.75573137070700676789e-6, S5 = -2.50507602534068634195e-8, S6 = 1.58969099521155010221e-10;
const C1 = 4.16666666666666019037e-2, C2 = -1.38888888888741095749e-3, C3 = 2.48015872894767294178e-5;
const C4 = -2.75573143513906633035e-7, C5 = 2.08757232129817482790e-9, C6 = -1.13596475577881948265e-11;

/** sin(x + y) for |x + y| ≤ π/4, y the tail of x (k_sin.c). */
function kSin(x: number, y: number, iy: number): number {
  const z = x * x, w = z * z;
  const r = S2 + z * (S3 + z * S4) + z * w * (S5 + z * S6);
  const v = z * x;
  if (iy === 0) return x + v * (S1 + z * r);
  return x - ((z * (0.5 * y - v * r) - y) - v * S1);
}

/** cos(x + y) for |x + y| ≤ π/4 (k_cos.c). */
function kCos(x: number, y: number): number {
  const z = x * x, w = z * z;
  const r = z * (C1 + z * (C2 + z * C3)) + w * w * (C4 + z * (C5 + z * C6));
  const hz = 0.5 * z;
  const u = 1 - hz;
  return u + (((1 - u) - hz) + (z * r - x * y));
}

const T0 = 3.33333333333334091986e-1, T1 = 1.33333333333201242699e-1, T2 = 5.39682539762260521377e-2;
const T3 = 2.18694882948595424599e-2, T4 = 8.86323982359930005737e-3, T5 = 3.59207910759131235356e-3;
const T6 = 1.45620945432529025516e-3, T7 = 5.88041240820264096874e-4, T8 = 2.46463134818469906812e-4;
const T9 = 7.81794442939557092300e-5, T10 = 7.14072491382608190305e-5, T11 = -1.85586374855275456654e-5;
const T12 = 2.59073051863633712884e-5;
const PIO4 = 7.85398163397448278999e-1, PIO4LO = 3.06161699786838301793e-17;
const TAN_BIG = fromBits(0x3fe59428, 0); // ≈ 0.6744

/** tan(x + y) if iy = 1, −1/tan(x + y) if iy = −1, for |x + y| ≤ π/4 (k_tan.c). */
function kTan(x: number, y: number, iy: number): number {
  const neg = x < 0;
  const big = Math.abs(x) >= TAN_BIG;
  if (big) {
    if (neg) { x = -x; y = -y; }
    x = (PIO4 - x) + (PIO4LO - y);
    y = 0;
  }
  const z = x * x;
  let w = z * z;
  let r = T1 + w * (T3 + w * (T5 + w * (T7 + w * (T9 + w * T11))));
  let v = z * (T2 + w * (T4 + w * (T6 + w * (T8 + w * (T10 + w * T12)))));
  const s = z * x;
  r = y + z * (s * (r + v) + y);
  r += T0 * s;
  w = x + r;
  if (big) {
    v = iy;
    return (neg ? -1 : 1) * (v - 2 * (x - (w * w / (w + v) - r)));
  }
  if (iy === 1) return w;
  // −1/(x + r) to full precision: split w and −1/w so their product is exact
  const zh = hi26(w);
  v = r - (zh - x);
  const a = -1 / w;
  const t = hi26(a);
  const e = 1 + t * zh;
  return t + a * (e + t * v);
}

const PI_D = 3.1415926535897931160e0;
const INVPIO2 = 6.36619772367581382433e-1;
const PIO2_1 = 1.57079632673412561417e0, PIO2_1T = 6.07710050650619224932e-11;
const PIO2_2 = 6.07710050630396597660e-11, PIO2_2T = 2.02226624879595063154e-21;
const PIO2_3 = 2.02226624871116645580e-21, PIO2_3T = 8.47842766036889956997e-32;
const PIO4_TOP = fromBits(0x3fe921fb, 0xffffffff); // |x| up to here needs no reduction

// the reduced argument, as a head and a tail, and the quadrant; module state avoids an allocation
let RY0 = 0, RY1 = 0;
const MEDIUM_MAX = 1647099.3291652855; // 2^20 · π/2: past this, fn · PIO2_1 is no longer exact
const TWO_PI_D = 2 * PI_D;
/** x − n·π/2 with π/2 carried to 152 bits (the medium path of e_rem_pio2.c, always in full). */
function remPio2(x: number): number {
  // huge |x|: fold by the double nearest 2π first (exact fmod). Deterministic, not accurate.
  if (Math.abs(x) > MEDIUM_MAX) x %= TWO_PI_D;
  const fn = Math.round(x * INVPIO2);
  let r = x - fn * PIO2_1;
  let w = fn * PIO2_1T;
  // 2nd and 3rd rounds: a compensated sum, harmless when fdlibm would have stopped early
  let t = r;
  w = fn * PIO2_2;
  r = t - w;
  w = fn * PIO2_2T - ((t - r) - w);
  t = r;
  w = fn * PIO2_3;
  r = t - w;
  w = fn * PIO2_3T - ((t - r) - w);
  RY0 = r - w;
  RY1 = (r - RY0) - w;
  const q = fn % 4;
  return q < 0 ? q + 4 : q;
}

export function sin(x: number): number {
  if (Math.abs(x) <= PIO4_TOP) return Math.abs(x) < TWOM27 ? x : kSin(x, 0, 0);
  if (!(Math.abs(x) < Infinity)) return NaN;
  switch (remPio2(x)) {
    case 0: return kSin(RY0, RY1, 1);
    case 1: return kCos(RY0, RY1);
    case 2: return -kSin(RY0, RY1, 1);
    default: return -kCos(RY0, RY1);
  }
}

export function cos(x: number): number {
  if (Math.abs(x) <= PIO4_TOP) return kCos(x, 0);
  if (!(Math.abs(x) < Infinity)) return NaN;
  switch (remPio2(x)) {
    case 0: return kCos(RY0, RY1);
    case 1: return -kSin(RY0, RY1, 1);
    case 2: return -kCos(RY0, RY1);
    default: return kSin(RY0, RY1, 1);
  }
}

export function tan(x: number): number {
  if (Math.abs(x) <= PIO4_TOP) return Math.abs(x) < TWOM27 ? x : kTan(x, 0, 1);
  if (!(Math.abs(x) < Infinity)) return NaN;
  const q = remPio2(x);
  return kTan(RY0, RY1, (q & 1) === 0 ? 1 : -1);
}

// ---- atan, atan2, asin, acos ------------------------------------------------------------

const ATANHI = [4.63647609000806093515e-1, 7.85398163397448278999e-1, 9.82793723247329054082e-1, 1.57079632679489655800e0];
const ATANLO = [2.26987774529616870924e-17, 3.06161699786838301793e-17, 1.39033110312309984516e-17, 6.12323399573676603587e-17];
const AT0 = 3.33333333333329318027e-1, AT1 = -1.99999999998764832476e-1, AT2 = 1.42857142725034663711e-1;
const AT3 = -1.11111104054623557880e-1, AT4 = 9.09088713343650656196e-2, AT5 = -7.69187620504482999495e-2;
const AT6 = 6.66107313738753120669e-2, AT7 = -5.83357013379057348645e-2, AT8 = 4.97687799461593236017e-2;
const AT9 = -3.65315727442169155270e-2, AT10 = 1.62858201153657823623e-2;
const TWO66 = 7.378697629483821e19;

export function atan(x: number): number {
  const ax = Math.abs(x), neg = x < 0;
  if (ax >= TWO66) {
    if (ax !== ax) return x;
    return x > 0 ? ATANHI[3] + ATANLO[3] : -ATANHI[3] - ATANLO[3];
  }
  let id: number;
  if (ax < 0.4375) {
    if (ax < TWOM27) return x;
    id = -1;
  } else {
    x = ax;
    if (ax < 1.1875) {
      if (ax < 0.6875) { id = 0; x = (2 * x - 1) / (2 + x); } else { id = 1; x = (x - 1) / (x + 1); }
    } else if (ax < 2.4375) { id = 2; x = (x - 1.5) / (1 + 1.5 * x); } else { id = 3; x = -1 / x; }
  }
  const z = x * x, w = z * z;
  const s1 = z * (AT0 + w * (AT2 + w * (AT4 + w * (AT6 + w * (AT8 + w * AT10)))));
  const s2 = w * (AT1 + w * (AT3 + w * (AT5 + w * (AT7 + w * AT9))));
  if (id < 0) return x - x * (s1 + s2);
  const r = ATANHI[id] - ((x * (s1 + s2) - ATANLO[id]) - x);
  return neg ? -r : r;
}

const PI = 3.1415926535897931160e0, PI_LO = 1.2246467991473531772e-16;
const PI_O_2 = 1.5707963267948965580e0, PI_O_4 = 7.8539816339744827900e-1;
const TWO60 = 1.152921504606847e18, TWOM60 = 8.673617379884035e-19;

export function atan2(y: number, x: number): number {
  if (x !== x || y !== y) return NaN;
  if (x === 1) return atan(y);
  const m = (isNegative(y) ? 1 : 0) | (isNegative(x) ? 2 : 0);
  if (y === 0) {
    if (m < 2) return y; // atan(±0, +anything) = ±0
    return m === 2 ? PI : -PI;
  }
  if (x === 0) return m & 1 ? -PI_O_2 : PI_O_2;
  if (x === Infinity || x === -Infinity) {
    if (y === Infinity || y === -Infinity) return [PI_O_4, -PI_O_4, 3 * PI_O_4, -3 * PI_O_4][m];
    return [0, -0, PI, -PI][m];
  }
  if (y === Infinity || y === -Infinity) return m & 1 ? -PI_O_2 : PI_O_2;
  const ratio = Math.abs(y / x);
  let z: number, mm = m;
  if (ratio > TWO60) { z = PI_O_2 + 0.5 * PI_LO; mm &= 1; } else if (m & 2 && ratio < TWOM60) z = 0;
  else z = atan(ratio);
  switch (mm) {
    case 0: return z;
    case 1: return -z;
    case 2: return PI - (z - PI_LO);
    default: return (z - PI_LO) - PI;
  }
}

const PIO2_HI = 1.57079632679489655800e0, PIO2_LO = 6.12323399573676603587e-17, PIO4_HI = 7.85398163397448278999e-1;
const PS0 = 1.66666666666666657415e-1, PS1 = -3.25565818622400915405e-1, PS2 = 2.01212532134862925881e-1;
const PS3 = -4.00555345006794114027e-2, PS4 = 7.91534994289814532176e-4, PS5 = 3.47933107596021167570e-5;
const QS1 = -2.40339491173441421878e0, QS2 = 2.02094576023350569471e0, QS3 = -6.88283971605453293030e-1;
const QS4 = 7.70381505559019352791e-2;
const ASIN_NEAR1 = fromBits(0x3fef3333, 0); // ≈ 0.975
const TWOM26 = 1.4901161193847656e-8, TWOM57 = 6.938893903907228e-18;

/** The rational approximation R(t) = p/q shared by asin and acos, as p and q. */
const pOf = (t: number): number => t * (PS0 + t * (PS1 + t * (PS2 + t * (PS3 + t * (PS4 + t * PS5)))));
const qOf = (t: number): number => 1 + t * (QS1 + t * (QS2 + t * (QS3 + t * QS4)));

export function asin(x: number): number {
  const ax = Math.abs(x);
  if (ax >= 1) return ax === 1 ? x * PIO2_HI + x * PIO2_LO : NaN;
  if (ax < 0.5) {
    if (ax < TWOM26) return x;
    const t = x * x;
    return x + x * (pOf(t) / qOf(t));
  }
  const t = (1 - ax) * 0.5;
  const p = pOf(t), q = qOf(t), s = Math.sqrt(t);
  let r: number;
  if (ax >= ASIN_NEAR1) {
    r = PIO2_HI - (2 * (s + s * (p / q)) - PIO2_LO);
  } else {
    const w = hi26(s);
    const c = (t - w * w) / (s + w);
    const pp = 2 * s * (p / q) - (PIO2_LO - 2 * c);
    const qq = PIO4_HI - 2 * w;
    r = PIO4_HI - (pp - qq);
  }
  return x > 0 ? r : -r;
}

export function acos(x: number): number {
  const ax = Math.abs(x);
  if (ax >= 1) {
    if (ax !== 1) return NaN;
    return x > 0 ? 0 : PI + 2 * PIO2_LO;
  }
  if (ax < 0.5) {
    if (ax <= TWOM57) return PIO2_HI + PIO2_LO;
    const z = x * x;
    return PIO2_HI - (x - (PIO2_LO - x * (pOf(z) / qOf(z))));
  }
  if (x < 0) {
    const z = (1 + x) * 0.5, s = Math.sqrt(z);
    const w = (pOf(z) / qOf(z)) * s - PIO2_LO;
    return PI - 2 * (s + w);
  }
  const z = (1 - x) * 0.5, s = Math.sqrt(z);
  const df = hi26(s);
  const c = (z - df * df) / (s + df);
  const w = (pOf(z) / qOf(z)) * s + c;
  return 2 * (df + w);
}

// ---- exp, expm1, tanh ----------------------------------------------------------------------

const O_THRESHOLD = 7.09782712893383973096e2, U_THRESHOLD = -7.45133219101941108420e2;
const LN2_HI = 6.93147180369123816490e-1, LN2_LO = 1.90821492927058770002e-10, INVLN2 = 1.44269504088896338700e0;
const P1 = 1.66666666666666019037e-1, P2 = -2.77777777770155933842e-3, P3 = 6.61375632143793436117e-5;
const P4 = -1.65339022054652515390e-6, P5 = 4.13813679705723846039e-8;
const HALF_LN2 = fromBits(0x3fd62e43, 0); // fdlibm's "|x| > 0.5 ln2" as a double bound
const THREE_HALF_LN2 = fromBits(0x3ff0a2b2, 0);
const TWOM28 = 3.725290298461914e-9;

export function exp(x: number): number {
  if (x !== x) return x;
  if (x > O_THRESHOLD) return Infinity;
  if (x < U_THRESHOLD) return 0;
  const ax = Math.abs(x);
  let hi = 0, lo = 0, k = 0;
  if (ax >= HALF_LN2) {
    if (ax < THREE_HALF_LN2) {
      if (x > 0) { hi = x - LN2_HI; lo = LN2_LO; k = 1; } else { hi = x + LN2_HI; lo = -LN2_LO; k = -1; }
    } else {
      k = Math.trunc(INVLN2 * x + (x < 0 ? -0.5 : 0.5));
      hi = x - k * LN2_HI;
      lo = k * LN2_LO;
    }
    x = hi - lo;
  } else if (ax < TWOM28) {
    return 1 + x;
  }
  const t = x * x;
  const c = x - t * (P1 + t * (P2 + t * (P3 + t * (P4 + t * P5))));
  if (k === 0) return 1 - ((x * c) / (c - 2) - x);
  const y = 1 - ((lo - (x * c) / (2 - c)) - hi);
  return scalb(y, k);
}

const Q1 = -3.33333333333331316428e-2, Q2 = 1.58730158725481460165e-3, Q3 = -7.93650757867487942473e-5;
const Q4 = 4.00821782732936239552e-6, Q5 = -2.01099218183624371326e-7;
const EXPM1_BIG = fromBits(0x4043687a, 0); // ≈ 56 ln2
const TWOM54 = 5.551115123125783e-17;

/** e^x − 1, accurate near 0 (s_expm1.c). */
export function expm1(x: number): number {
  if (x !== x) return x;
  const ax = Math.abs(x);
  if (ax >= EXPM1_BIG) {
    if (x > O_THRESHOLD) return Infinity;
    if (x < 0) return -1;
  }
  let hi: number, lo: number, k: number, c = 0;
  if (ax >= HALF_LN2) {
    if (ax < THREE_HALF_LN2) {
      if (x > 0) { hi = x - LN2_HI; lo = LN2_LO; k = 1; } else { hi = x + LN2_HI; lo = -LN2_LO; k = -1; }
    } else {
      k = Math.trunc(INVLN2 * x + (x < 0 ? -0.5 : 0.5));
      hi = x - k * LN2_HI;
      lo = k * LN2_LO;
    }
    x = hi - lo;
    c = (hi - x) - lo;
  } else if (ax < TWOM54) {
    return x;
  } else {
    k = 0;
  }
  const hfx = 0.5 * x;
  const hxs = x * hfx;
  const r1 = 1 + hxs * (Q1 + hxs * (Q2 + hxs * (Q3 + hxs * (Q4 + hxs * Q5))));
  let t = 3 - r1 * hfx;
  let e = hxs * ((r1 - t) / (6 - x * t));
  if (k === 0) return x - (x * e - hxs);
  e = x * (e - c) - c;
  e -= hxs;
  if (k === -1) return 0.5 * (x - e) - 0.5;
  if (k === 1) return x < -0.25 ? -2 * (e - (x + 0.5)) : 1 + 2 * (x - e);
  let y: number;
  if (k <= -2 || k > 56) {
    y = 1 - (e - x);
    return scalb(y, k) - 1;
  }
  if (k < 20) {
    t = 1 - POW2[1022 - k]; // 1 − 2^−k, exact
    y = t - (e - x);
  } else {
    t = POW2[1022 - k]; // 2^−k
    y = x - (e + t);
    y += 1;
  }
  return scalb(y, k);
}

const TWOM55 = 2.7755575615628914e-17;

export function tanh(x: number): number {
  if (x !== x) return x;
  const ax = Math.abs(x);
  let z: number;
  if (ax < 22) {
    if (ax < TWOM55) return x;
    if (ax >= 1) {
      const t = expm1(2 * ax);
      z = 1 - 2 / (t + 2);
    } else {
      const t = expm1(-2 * ax);
      z = -t / (t + 2);
    }
  } else {
    z = 1;
  }
  return x < 0 ? -z : z;
}

// ---- hypot ------------------------------------------------------------------------------------

/** √(a² + b²). Math.hypot's algorithm is engine-specific; this is plain IEEE arithmetic. */
export function hypot(a: number, b: number): number {
  return Math.sqrt(a * a + b * b);
}

/** √(a² + b² + c²). */
export function hypot3(a: number, b: number, c: number): number {
  return Math.sqrt(a * a + b * b + c * c);
}
