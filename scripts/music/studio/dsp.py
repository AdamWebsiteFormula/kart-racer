# Signal processing for the mix: resampling, filters, dynamics, saturation, reverb, modulation, loudness.
# Stereo float arrays shaped (2, n) at SR. Nothing here plays sound.
import functools, math, os
import numpy as np
import soundfile as sf
import soxr
from numba import njit
from scipy.signal import fftconvolve, sosfilt, resample_poly

SR = 44100

# ------------------------------------------------------------------ io and levels


def db(x):
    return 20 * math.log10(max(float(x), 1e-12))


def undb(d):
    return 10 ** (d / 20)


def stereo(y):
    y = np.asarray(y, dtype=np.float32)
    if y.ndim == 1:
        return np.stack([y, y])
    if y.shape[0] == 1:
        return np.concatenate([y, y])
    return y[:2]


def read(path, sr=SR):
    y, r = sf.read(path, always_2d=True, dtype='float32')
    y = y.T
    if r != sr:
        y = soxr.resample(y.T, r, sr, quality='VHQ').T.astype(np.float32)
    return np.ascontiguousarray(y)


def pan(x, p, law=-3.0):
    """Constant-power pan of a stereo (or mono) signal; p in [-1, 1]. A stereo source is balanced, not collapsed."""
    x = stereo(x)
    a = (p + 1) * math.pi / 4
    gl, gr = math.cos(a) * math.sqrt(2), math.sin(a) * math.sqrt(2)
    return np.stack([x[0] * gl, x[1] * gr]).astype(np.float32)


def width(x, w):
    """M/S width: 0 mono, 1 unchanged, >1 wider."""
    m, s = (x[0] + x[1]) * 0.5, (x[0] - x[1]) * 0.5 * w
    return np.stack([m + s, m - s]).astype(np.float32)


# ------------------------------------------------------------------ variable-rate resampling (sample playback)

TAPS, PHASES = 16, 1024


@functools.lru_cache(None)
def _kernel():
    half = TAPS // 2
    fr = np.arange(PHASES + 1) / PHASES
    k = np.arange(-half + 1, half + 1)
    tab = np.zeros((PHASES + 1, TAPS), np.float32)
    beta = 8.0
    for i, f in enumerate(fr):
        xx = k - f
        w = np.kaiser(TAPS * 64 + 1, beta)
        idx = np.clip(((xx + half) / TAPS * (TAPS * 64)).round().astype(int), 0, TAPS * 64)
        tab[i] = (np.sinc(xx * 0.97) * 0.97 * w[idx]).astype(np.float32)
        tab[i] /= tab[i].sum()
    return tab


@njit(cache=True, fastmath=True)
def _vread(x, pos0, rate, n_out, tab):
    ch, n = x.shape
    out = np.zeros((ch, n_out), np.float32)
    half = 8
    phases = tab.shape[0] - 1
    pos = pos0
    for i in range(n_out):
        ip = int(math.floor(pos))
        fr = pos - ip
        ph = int(fr * phases + 0.5)
        if ip - half + 1 >= 0 and ip + half < n:
            for c in range(ch):
                acc = 0.0
                for k in range(16):
                    acc += x[c, ip - half + 1 + k] * tab[ph, k]
                out[c, i] = acc
        elif ip + half >= 0 and ip - half + 1 < n:
            for c in range(ch):
                acc = 0.0
                for k in range(16):
                    j = ip - half + 1 + k
                    if 0 <= j < n:
                        acc += x[c, j] * tab[ph, k]
                out[c, i] = acc
        else:
            if ip >= n:
                break
        pos += rate[i]
    return out


def vread(x, rate, n_out, pos0=0.0):
    """Read `x` (ch, n) from `pos0` at a per-output-sample speed `rate` (array or scalar); pitch up anti-aliased."""
    r = np.broadcast_to(np.asarray(rate, np.float64), (n_out,)).copy() if np.ndim(rate) == 0 else np.asarray(rate, np.float64)
    top = float(r.max()) if len(r) else 1.0
    if top > 1.02:
        x = lowpass(x, min(0.47 * SR / top, 20000.0), q=0.6)
    return _vread(np.ascontiguousarray(x, dtype=np.float32), float(pos0), r, int(n_out), _kernel())


# ------------------------------------------------------------------ filters (RBJ biquads as SOS)


def _sos(b, a):
    return np.array([[b[0] / a[0], b[1] / a[0], b[2] / a[0], 1.0, a[1] / a[0], a[2] / a[0]]])


def biquad(kind, f, q=0.707, g=0.0, sr=SR):
    f = min(max(f, 10.0), sr * 0.49)
    A = 10 ** (g / 40)
    w = 2 * math.pi * f / sr
    cw, sw = math.cos(w), math.sin(w)
    al = sw / (2 * q)
    if kind == 'lp':
        b, a = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2], [1 + al, -2 * cw, 1 - al]
    elif kind == 'hp':
        b, a = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2], [1 + al, -2 * cw, 1 - al]
    elif kind == 'bp':
        b, a = [al, 0, -al], [1 + al, -2 * cw, 1 - al]
    elif kind == 'peak':
        b, a = [1 + al * A, -2 * cw, 1 - al * A], [1 + al / A, -2 * cw, 1 - al / A]
    elif kind == 'lowshelf':
        sq = 2 * math.sqrt(A) * al
        b = [A * ((A + 1) - (A - 1) * cw + sq), 2 * A * ((A - 1) - (A + 1) * cw), A * ((A + 1) - (A - 1) * cw - sq)]
        a = [(A + 1) + (A - 1) * cw + sq, -2 * ((A - 1) + (A + 1) * cw), (A + 1) + (A - 1) * cw - sq]
    elif kind == 'highshelf':
        sq = 2 * math.sqrt(A) * al
        b = [A * ((A + 1) + (A - 1) * cw + sq), -2 * A * ((A - 1) + (A + 1) * cw), A * ((A + 1) + (A - 1) * cw - sq)]
        a = [(A + 1) - (A - 1) * cw + sq, 2 * ((A - 1) - (A + 1) * cw), (A + 1) - (A - 1) * cw - sq]
    else:
        raise ValueError(kind)
    return _sos(b, a)


def filt(x, sos):
    return sosfilt(sos, x, axis=-1).astype(np.float32)


def lowpass(x, f, q=0.707):
    return filt(x, biquad('lp', f, q))


def highpass(x, f, q=0.707):
    return filt(x, biquad('hp', f, q))


def eq(x, bands):
    """bands: [('hp', f, q), ('lp', f, q), ('peak', f, q, gain), ('lowshelf', f, q, gain), ('highshelf', f, q, gain)]"""
    sos = []
    for b in bands:
        kind, f = b[0], b[1]
        q = b[2] if len(b) > 2 else 0.707
        g = b[3] if len(b) > 3 else 0.0
        sos.append(biquad(kind, f, q, g))
    if not sos:
        return x
    return filt(x, np.vstack(sos))


@njit(cache=True)
def _svf_lp(x, g, k):
    """Trapezoidal (zero-delay) state-variable low-pass with a per-sample coefficient g = tan(pi fc / fs)."""
    n = x.shape[0]
    y = np.empty(n, np.float32)
    ic1 = 0.0
    ic2 = 0.0
    for i in range(n):
        gi = g[i]
        a1 = 1.0 / (1.0 + gi * (gi + k))
        a2 = gi * a1
        a3 = gi * a2
        v3 = x[i] - ic2
        v1 = a1 * ic1 + a2 * v3
        v2 = ic2 + a2 * ic1 + a3 * v3
        ic1 = 2.0 * v1 - ic1
        ic2 = 2.0 * v2 - ic2
        y[i] = v2
    return y


def sweep_lp(x, points, q=0.8):
    """A low-pass whose cutoff moves through `points` [(seconds, Hz), ...] (log-interpolated): filter sweeps."""
    ts = np.array([p[0] for p in points], np.float64)
    fs = np.log(np.array([p[1] for p in points], np.float64))
    t = np.arange(x.shape[1]) / SR
    fc = np.exp(np.interp(t, ts, fs))
    g = np.tan(np.pi * np.minimum(fc, 0.45 * SR) / SR)
    k = 1.0 / q
    return np.stack([_svf_lp(np.ascontiguousarray(x[c], np.float64), g, k) for c in range(x.shape[0])]).astype(np.float32)


def hp2(x, f):
    """24 dB/oct high-pass (two biquads)."""
    return filt(x, np.vstack([biquad('hp', f, 0.54), biquad('hp', f, 1.31)]))


def lp2(x, f):
    return filt(x, np.vstack([biquad('lp', f, 0.54), biquad('lp', f, 1.31)]))


# ------------------------------------------------------------------ dynamics


@njit(cache=True)
def _comp(x, side, thr, ratio, knee, att, rel, rms_n):
    ch, n = x.shape
    g = np.ones(n, np.float32)
    env = 0.0
    a_att = math.exp(-1.0 / max(att, 1.0))
    a_rel = math.exp(-1.0 / max(rel, 1.0))
    ms = 0.0
    a_rms = math.exp(-1.0 / max(rms_n, 1.0))
    for i in range(n):
        s = 0.0
        for c in range(side.shape[0]):
            v = abs(side[c, i])
            if v > s:
                s = v
        if rms_n > 1:
            ms = a_rms * ms + (1 - a_rms) * s * s
            s = math.sqrt(ms)
        lvl = 20 * math.log10(s + 1e-12)
        over = lvl - thr
        if knee > 0 and over > -knee / 2 and over < knee / 2:
            gr = (1 / ratio - 1) * (over + knee / 2) ** 2 / (2 * knee)
        elif over >= knee / 2:
            gr = (1 / ratio - 1) * over
        else:
            gr = 0.0
        # smooth the gain reduction (dB): attack when reducing more, release when recovering
        if gr < env:
            env = a_att * env + (1 - a_att) * gr
        else:
            env = a_rel * env + (1 - a_rel) * gr
        g[i] = 10 ** (env / 20)
    return g


def compress(x, thr=-18.0, ratio=3.0, att_ms=10.0, rel_ms=120.0, knee=6.0, makeup=0.0, rms_ms=0.0, side=None, mix=1.0):
    """Feed-forward compressor (stereo-linked). `side` keys it from another signal (ducking). Returns (y, gain)."""
    s = x if side is None else side
    g = _comp(np.ascontiguousarray(x, np.float32), np.ascontiguousarray(s, np.float32), thr, ratio, knee,
              att_ms * SR / 1000, rel_ms * SR / 1000, rms_ms * SR / 1000)
    y = x * g[None, :] * undb(makeup)
    if mix < 1:
        y = mix * y + (1 - mix) * x * undb(makeup)
    return y.astype(np.float32), g


def saturate(x, drive_db=6.0, mix=1.0, asym=0.0, os=2):
    """tanh saturation at 2x oversampling; output matched in level to the input at low levels."""
    d = undb(drive_db)
    u = resample_poly(x, os, 1, axis=-1) if os > 1 else x
    y = np.tanh(d * u + asym) - math.tanh(asym)
    y = y / d
    if os > 1:
        y = resample_poly(y, 1, os, axis=-1)
    y = y[:, :x.shape[1]].astype(np.float32)
    return (mix * y + (1 - mix) * x).astype(np.float32)


@njit(cache=True)
def _fwd_min(r, L):
    """out[i] = min(r[i : i + L]) (a sliding minimum looking ahead)."""
    n = r.shape[0]
    out = np.empty(n, np.float32)
    dq = np.empty(n, np.int64)
    head, tail = 0, 0
    for i in range(n - 1, -1, -1):
        while tail > head and r[dq[tail - 1]] >= r[i]:
            tail -= 1
        dq[tail] = i
        tail += 1
        while dq[head] > i + L - 1:
            head += 1
        out[i] = r[dq[head]]
    return out


@njit(cache=True)
def _release(g, a_rel):
    out = np.empty_like(g)
    cur = 1.0
    for i in range(g.shape[0]):
        t = g[i]
        if t < cur:
            cur = t
        else:
            cur = a_rel * cur + (1 - a_rel) * t
        out[i] = cur
    return out


def limit(x, ceiling_db=-1.0, look_ms=2.0, rel_ms=60.0, true_peak=True):
    """Look-ahead brickwall limiter on the (4x oversampled) peak: offline, so the look-ahead needs no delay.
    The gain is the sliding minimum of the needed gain over the next `look` samples, averaged over the last
    `look` (a smooth ramp that still reaches the target by the peak), with an exponential release."""
    ceil = undb(ceiling_db)
    if true_peak:
        up = resample_poly(np.asarray(x, np.float64), 4, 1, axis=-1)
        m = x.shape[1]
        pk = np.abs(up[:, :4 * m]).max(0).reshape(m, 4).max(1)
    else:
        pk = np.abs(x).max(0)
    need = np.minimum(1.0, ceil / np.maximum(pk, 1e-9)).astype(np.float32)
    L = max(1, int(look_ms * SR / 1000))
    g = _fwd_min(need, L)
    c = np.concatenate([[0.0], np.cumsum(g, dtype=np.float64)])
    idx = np.arange(len(g))
    lo = np.maximum(0, idx - L + 1)
    g2 = ((c[idx + 1] - c[lo]) / (idx + 1 - lo)).astype(np.float32)
    g2 = np.minimum(g2, g)  # never above the look-ahead minimum
    g3 = _release(g2, math.exp(-1.0 / (rel_ms * SR / 1000)))
    return (x * g3[None, :]).astype(np.float32), g3


def softclip(x, ceiling_db=-0.3):
    c = undb(ceiling_db)
    return (c * np.tanh(x / c)).astype(np.float32)


# ------------------------------------------------------------------ reverb and delay

IR_DIR = '/Library/Audio/Impulse Responses/Apple'
IRS_USED = set()


@functools.lru_cache(None)
def ir(name):
    """An Apple Space Designer impulse response by file name fragment (Final Cut Pro / Logic sample content)."""
    for root, _, files in os.walk(IR_DIR):
        for f in files:
            if name.lower() in f.lower():
                p = os.path.join(root, f)
                IRS_USED.add(p)
                y = read(p)
                return y
    raise FileNotFoundError(name)


def reverb(x, irname, predelay_ms=0.0, hp=250.0, lp=9000.0, decay_scale=1.0, width_=1.0):
    h = ir(irname)
    if decay_scale != 1.0:
        t = np.arange(h.shape[1]) / SR
        h = h * np.exp(-t * (1 / decay_scale - 1) * 3.0)[None, :]
    y = np.stack([fftconvolve(x[0], h[0])[:x.shape[1]], fftconvolve(x[1], h[1 % h.shape[0]])[:x.shape[1]]]).astype(np.float32)
    if predelay_ms > 0:
        d = int(predelay_ms * SR / 1000)
        y = np.concatenate([np.zeros((2, d), np.float32), y[:, :-d]], axis=1)
    y = eq(y, [('hp', hp, 0.7), ('lp', lp, 0.7)])
    if width_ != 1.0:
        y = width(y, width_)
    return y


def delay(x, time_s, fb=0.3, mix=1.0, lp=5000.0, hp=300.0, pingpong=False, repeats=8):
    n = x.shape[1]
    d = int(time_s * SR)
    out = np.zeros_like(x)
    cur = eq(x, [('hp', hp), ('lp', lp)])
    g = 1.0
    for r in range(1, repeats + 1):
        if r * d >= n:
            break
        if pingpong:
            cur = cur[::-1].copy()
        out[:, r * d:] += g * cur[:, :n - r * d]
        g *= fb
        cur = eq(cur, [('lp', lp * 0.9)])
    return (out * mix).astype(np.float32)


@njit(cache=True)
def _moddelay(x, base, depth, rate, phase, sr):
    ch, n = x.shape
    out = np.zeros((ch, n), np.float32)
    for c in range(ch):
        ph = phase + c * 0.25
        for i in range(n):
            dly = base + depth * math.sin(2 * math.pi * (rate * i / sr + ph))
            pos = i - dly
            ip = int(math.floor(pos))
            fr = pos - ip
            if ip >= 1 and ip + 2 < n:
                xm1, x0, x1, x2 = x[c, ip - 1], x[c, ip], x[c, ip + 1], x[c, ip + 2]
                c1 = 0.5 * (x1 - xm1)
                c2 = xm1 - 2.5 * x0 + 2 * x1 - 0.5 * x2
                c3 = 0.5 * (x2 - xm1) + 1.5 * (x0 - x1)
                out[c, i] = ((c3 * fr + c2) * fr + c1) * fr + x0
    return out


def chorus(x, rate=0.8, depth_ms=2.5, base_ms=12.0, mix=0.35):
    y = _moddelay(np.ascontiguousarray(x, np.float32), base_ms * SR / 1000, depth_ms * SR / 1000, rate, 0.0, SR)
    return ((1 - mix) * x + mix * y).astype(np.float32)


def leslie(x, fast=True):
    """Rotary speaker: horn above 800 Hz and drum below, each a moving delay plus level wobble, spread in stereo."""
    lo, hi = lp2(x, 800.0), hp2(x, 800.0)
    hr, dr = (6.7, 5.9) if fast else (0.8, 0.7)
    m_hi = (x.shape[1],)
    t = np.arange(x.shape[1]) / SR
    hi_d = _moddelay(np.ascontiguousarray(hi), 0.9e-3 * SR, 0.35e-3 * SR, hr, 0.0, SR)
    lo_d = _moddelay(np.ascontiguousarray(lo), 1.5e-3 * SR, 0.25e-3 * SR, dr, 0.1, SR)
    am_h = np.stack([1 + 0.25 * np.sin(2 * np.pi * hr * t), 1 + 0.25 * np.sin(2 * np.pi * hr * t + np.pi)])
    am_l = np.stack([1 + 0.12 * np.sin(2 * np.pi * dr * t + 0.5), 1 + 0.12 * np.sin(2 * np.pi * dr * t + 0.5 + np.pi)])
    del m_hi
    return (hi_d * am_h + lo_d * am_l).astype(np.float32)


# ------------------------------------------------------------------ loudness (BS.1770-4)


def _kw(y, rate=SR):
    def bq(kind, G, Q, fc):
        A = 10 ** (G / 40.0); w0 = 2 * np.pi * fc / rate; al = np.sin(w0) / (2 * Q); c = np.cos(w0)
        if kind == 'hs':
            b = [A * ((A + 1) + (A - 1) * c + 2 * np.sqrt(A) * al), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - 2 * np.sqrt(A) * al)]
            a = [(A + 1) - (A - 1) * c + 2 * np.sqrt(A) * al, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - 2 * np.sqrt(A) * al]
        else:
            b = [(1 + c) / 2, -(1 + c), (1 + c) / 2]
            a = [1 + al, -2 * c, 1 - al]
        return _sos(b, a)
    return sosfilt(np.vstack([bq('hs', 4.0, 1 / np.sqrt(2), 1500.0), bq('hp', 0, 0.5, 38.0)]), y, axis=-1)


def lufs(y):
    yk = _kw(np.asarray(y, np.float64))
    n = int(0.4 * SR); hop = int(0.1 * SR)
    if yk.shape[1] < n:
        return -70.0
    z = np.array([np.sum(np.mean(yk[:, i:i + n] ** 2, axis=1)) for i in range(0, yk.shape[1] - n + 1, hop)])
    l = -0.691 + 10 * np.log10(np.maximum(z, 1e-12))
    z1 = z[l > -70]
    if not len(z1):
        return -70.0
    rel = -0.691 + 10 * np.log10(np.mean(z1)) - 10
    z2 = z[(l > -70) & (l > rel)]
    return float(-0.691 + 10 * np.log10(np.mean(z2)))


def short_term(y, win=3.0, hop=0.5):
    yk = _kw(np.asarray(y, np.float64))
    n = int(win * SR); h = int(hop * SR)
    return np.array([-0.691 + 10 * np.log10(max(np.sum(np.mean(yk[:, i:i + n] ** 2, axis=1)), 1e-12)) for i in range(0, max(1, yk.shape[1] - n + 1), h)])


def true_peak_db(y):
    return db(np.max(np.abs(resample_poly(np.asarray(y, np.float64), 4, 1, axis=-1))))
