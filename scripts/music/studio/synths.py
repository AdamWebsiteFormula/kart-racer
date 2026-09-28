# Instruments played by code where code is the real thing or close to it: the tonewheel organ (additive, as
# the original is), an FM electric piano, a clavinet from a plucked string, analog-style bass and lead synths
# (band-limited oscillators into a ladder filter), a band-organ calliope and noise risers. All seeded.
import math
import numpy as np
from numba import njit
from . import dsp
from .render import sec, env_release, _mix_into

SR = dsp.SR


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12.0)


# ------------------------------------------------------------------ oscillators and filters


@njit(cache=True)
def _polyblep(t, dt):
    if t < dt:
        t = t / dt
        return t + t - t * t - 1.0
    if t > 1.0 - dt:
        t = (t - 1.0) / dt
        return t * t + t + t + 1.0
    return 0.0


@njit(cache=True)
def _saw(freq, phase0, sr):
    n = freq.shape[0]
    out = np.empty(n, np.float32)
    ph = phase0
    for i in range(n):
        dt = freq[i] / sr
        out[i] = 2.0 * ph - 1.0 - _polyblep(ph, dt)
        ph += dt
        if ph >= 1.0:
            ph -= 1.0
    return out


@njit(cache=True)
def _pulse(freq, width, phase0, sr):
    n = freq.shape[0]
    out = np.empty(n, np.float32)
    ph = phase0
    for i in range(n):
        dt = freq[i] / sr
        v = 1.0 if ph < width else -1.0
        v += _polyblep(ph, dt)
        p2 = ph - width
        if p2 < 0:
            p2 += 1.0
        v -= _polyblep(p2, dt)
        out[i] = v
        ph += dt
        if ph >= 1.0:
            ph -= 1.0
    return out


@njit(cache=True)
def _ladder(x, cutoff, res, sr, drive):
    """Huovilainen-style 4-pole ladder (simplified, tanh stages)."""
    n = x.shape[0]
    y = np.empty(n, np.float32)
    s1 = s2 = s3 = s4 = 0.0
    for i in range(n):
        fc = min(cutoff[i], sr * 0.45)
        g = 1.0 - math.exp(-2.0 * math.pi * fc / sr)
        inp = math.tanh(drive * (x[i] - 4.0 * res * s4))
        s1 += g * (inp - s1)
        s2 += g * (s1 - s2)
        s3 += g * (s2 - s3)
        s4 += g * (s3 - s4)
        y[i] = s4
    return y


def adsr(n, a, d, s, r_start, r, sr=SR):
    t = np.arange(n) / sr
    e = np.where(t < a, t / max(a, 1e-4), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-4) * 3.0))
    e = e.astype(np.float32)
    return e * env_release(n, int(r * sr), int(r_start * sr))


class _Poly:
    """Shared note loop: subclasses implement voice(note, dur_s, ctx) -> mono or stereo array."""
    release = 0.1
    gain_db = 0.0

    def render(self, notes, ctx, part):
        buf = np.zeros((2, ctx.n), np.float32)
        for n in sorted(notes, key=lambda n: n.t):
            dur = sec(n.d, ctx.bpm)
            x = self.voice(n, dur, ctx)
            if x is None:
                continue
            x = dsp.stereo(x) * dsp.undb(self.gain_db)
            _mix_into(buf, x, ctx.s(n.t))
        return self.post(buf, ctx)

    def post(self, buf, ctx):
        return buf


# ------------------------------------------------------------------ tonewheel organ

DRAW_RATIOS = [0.5, 1.5, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 8.0]


class Organ(_Poly):
    """Drawbars '888000000' style (16', 5 1/3', 8', 4', 2 2/3', 2', 1 3/5', 1 1/3', 1'), percussion on the
    2nd or 3rd harmonic, key click, then overdrive and a rotary speaker on the whole part."""

    def __init__(self, drawbars='888000000', perc=None, click=0.25, drive_db=6.0, leslie='fast', gain_db=-6.0, release=0.03):
        self.levels = [int(c) for c in drawbars]
        self.perc, self.click, self.drive_db, self.leslie, self.gain_db, self.release = perc, click, drive_db, leslie, gain_db, release

    def voice(self, n, dur, ctx):
        f0 = hz(n.p)
        L = int((dur + self.release) * SR)
        t = np.arange(L) / SR
        x = np.zeros(L, np.float32)
        for lvl, ratio in zip(self.levels, DRAW_RATIOS):
            if lvl == 0:
                continue
            f = f0 * ratio
            while f > 6000:  # tonewheel foldback: the highest wheels repeat an octave down
                f /= 2
            amp = 10 ** ((lvl - 8) * 3 / 20)  # each drawbar step is 3 dB
            ph = ctx.rng.uniform(0, 2 * math.pi)
            x += (amp * np.sin(2 * math.pi * f * t + ph)).astype(np.float32)
        if self.perc:
            harm, decay = self.perc  # (2 or 3, seconds)
            x += (0.9 * np.exp(-t / decay) * np.sin(2 * math.pi * f0 * harm * t)).astype(np.float32)
        x *= 0.25
        if self.click > 0:
            k = int(0.004 * SR)
            noise = ctx.rng.standard_normal(k).astype(np.float32) * np.exp(-np.arange(k) / (0.0008 * SR)).astype(np.float32)
            x[:k] += self.click * 0.3 * dsp.highpass(dsp.stereo(noise), 2000)[0] * n.v
        a = int(0.003 * SR)
        e = np.ones(L, np.float32)
        e[:a] = np.linspace(0, 1, a)
        e *= env_release(L, int(self.release * SR), int(dur * SR), curve='lin')
        return x * e

    def post(self, buf, ctx):
        y = buf
        if self.drive_db:
            y = dsp.saturate(y, self.drive_db, asym=0.1)
        if self.leslie:
            y = dsp.leslie(y, fast=self.leslie == 'fast')
        return y


# ------------------------------------------------------------------ FM electric piano


class EPiano(_Poly):
    """Two-operator FM tine piano: a body (1:1, soft index) and a tine bell (1:14, fast decay), tremolo in post."""

    def __init__(self, gain_db=-4.0, release=0.25, bell=0.5, trem=(4.2, 0.25), chorus=True):
        self.gain_db, self.release, self.bell, self.trem, self.ch = gain_db, release, bell, trem, chorus

    def voice(self, n, dur, ctx):
        f = hz(n.p)
        L = int((dur + self.release) * SR)
        t = np.arange(L) / SR
        vel = n.v
        idx_body = (0.6 + 1.8 * vel) * np.exp(-t / (0.35 + 0.4 * (1 - vel)))
        body = np.sin(2 * np.pi * f * t + idx_body * np.sin(2 * np.pi * f * t))
        tine_env = np.exp(-t / 0.045)
        tine = np.sin(2 * np.pi * f * t + (1.5 * vel) * tine_env * np.sin(2 * np.pi * 14 * f * t))
        decay = np.exp(-t / (1.6 + 2.5 * 60 / max(n.p, 30)))
        x = (0.8 * body * decay + self.bell * vel * tine * tine_env).astype(np.float32)
        x = np.tanh(1.5 * x) / 1.5
        e = env_release(L, int(self.release * SR), int(dur * SR))
        a = int(0.002 * SR)
        e[:a] *= np.linspace(0, 1, a)
        return (x * e * (0.35 + 0.65 * vel)).astype(np.float32)

    def post(self, buf, ctx):
        t = np.arange(buf.shape[1]) / SR
        r, d = self.trem
        pan = d * np.sin(2 * np.pi * r * t)
        y = np.stack([buf[0] * (1 - pan), buf[1] * (1 + pan)]).astype(np.float32)
        if self.ch:
            y = dsp.chorus(y, rate=0.6, depth_ms=1.8, base_ms=9, mix=0.3)
        return y


# ------------------------------------------------------------------ clavinet (plucked string, bright pickup)


@njit(cache=True)
def _ks(n, period, damp, bright, seed):
    """Karplus-Strong with a fractional delay: y[i] = exc[i] + damp * (bright * d(i-P) + (1-bright) * d(i-P-1)),
    the loop filter's own half-sample delay counted in P so the string sounds at SR / period."""
    np.random.seed(seed)
    y = np.zeros(n, np.float64)
    P = period - (1.0 - bright)  # the two-tap loop filter delays by (1 - bright) samples
    exc_n = int(period)
    out = np.empty(n, np.float32)
    for i in range(n):
        v = 0.0
        if i < exc_n:
            v = np.random.uniform(-1.0, 1.0) * (1.0 - i / exc_n) ** 0.3
        t = i - P
        if t >= 1.0:
            k = int(math.floor(t))
            fr = t - k
            a = y[k] + fr * (y[k + 1] - y[k]) if k + 1 < i else y[k]
            b = y[k - 1] + fr * (y[k] - y[k - 1])
            v += damp * (bright * a + (1.0 - bright) * b)
        y[i] = v
        out[i] = v
    return out


class Clav(_Poly):
    def __init__(self, gain_db=-3.0, release=0.02, mute=0.4):
        self.gain_db, self.release, self.mute = gain_db, release, mute

    def voice(self, n, dur, ctx):
        f = hz(n.p)
        L = int((dur + self.release) * SR)
        x = _ks(L, SR / f, 0.9995 - 0.004 * self.mute, 0.55, int(ctx.rng.integers(1 << 30)))
        # pickup near the bridge: comb that thins the low harmonics
        d = max(1, int(SR / f * 0.12))
        y = x.copy()
        y[d:] -= x[:-d]
        e = env_release(L, int(self.release * SR), int(dur * SR), curve='lin')
        y = y * e * (0.3 + 0.7 * n.v)
        return dsp.highpass(dsp.stereo(y), 120)[0]

    def post(self, buf, ctx):
        return dsp.eq(buf, [('peak', 1400, 1.0, 4.0), ('highshelf', 5000, 0.7, 2.0)])


# ------------------------------------------------------------------ analog-style synths


class SynthBass(_Poly):
    """Saw + square + sub through a ladder filter with its own envelope; `glide` bends into slurred notes."""

    def __init__(self, gain_db=-6.0, cutoff=380.0, env_amt=2200.0, decay=0.18, res=0.25, sub=0.6, release=0.05, drive=1.4, shape='saw'):
        self.gain_db, self.cutoff, self.env_amt, self.decay, self.res = gain_db, cutoff, env_amt, decay, res
        self.sub, self.release, self.drive, self.shape = sub, release, drive, shape

    def voice(self, n, dur, ctx):
        f = hz(n.p)
        L = int((dur + self.release) * SR)
        fr = np.full(L, f)
        if 'scoop' in n.art:
            t = np.arange(L) / SR
            fr = f * 2 ** (-1.0 * np.clip(1 - t / 0.06, 0, 1) / 12)
        ph = ctx.rng.uniform(0, 1)
        if self.shape == 'saw':
            osc = 0.55 * _saw(fr, ph, SR) + 0.45 * _saw(fr * 1.004, (ph + 0.3) % 1, SR)
        else:
            osc = _pulse(fr, 0.5, ph, SR)
        t = np.arange(L) / SR
        sub = np.sin(2 * np.pi * f * t)
        x = (osc + self.sub * sub).astype(np.float32)
        cut = (self.cutoff + self.env_amt * n.v * np.exp(-t / self.decay)).astype(np.float64)
        y = _ladder(x.astype(np.float64), cut, self.res, SR, self.drive)
        e = adsr(L, 0.003, 0.3, 0.85, dur, self.release)
        return (y * e * (0.5 + 0.5 * n.v)).astype(np.float32)


class Lead(_Poly):
    """A bright synth lead (saw or pulse pair), with vibrato and a filter envelope; slurred notes glide."""

    def __init__(self, gain_db=-8.0, shape='pulse', cutoff=2500.0, env_amt=3500.0, res=0.2, vib=(5.5, 0.15, 0.25), release=0.12, detune=0.006):
        self.gain_db, self.shape, self.cutoff, self.env_amt, self.res = gain_db, shape, cutoff, env_amt, res
        self.vib, self.release, self.detune = vib, release, detune

    def voice(self, n, dur, ctx):
        f = hz(n.p)
        L = int((dur + self.release) * SR)
        t = np.arange(L) / SR
        rate, depth, delay = self.vib
        st = depth * np.clip((t - delay) / 0.2, 0, 1) * np.sin(2 * np.pi * rate * t)
        if 'scoop' in n.art:
            st += -1.2 * np.clip(1 - t / 0.08, 0, 1) ** 2
        fr = f * 2 ** (st / 12)
        if self.shape == 'pulse':
            a = _pulse(fr, 0.35, 0.0, SR)
            b = _pulse(fr * (1 + self.detune), 0.45, 0.4, SR)
        else:
            a = _saw(fr, 0.0, SR)
            b = _saw(fr * (1 + self.detune), 0.4, SR)
        x = np.stack([0.7 * a + 0.3 * b, 0.3 * a + 0.7 * b]).astype(np.float64)
        cut = self.cutoff + self.env_amt * n.v * np.exp(-t / 0.25)
        y = np.stack([_ladder(x[0], cut, self.res, SR, 1.2), _ladder(x[1], cut, self.res, SR, 1.2)])
        e = adsr(L, 0.004, 0.4, 0.8, dur, self.release)
        return (y * e[None, :] * (0.5 + 0.5 * n.v)).astype(np.float32)


class Calliope(_Poly):
    """A band organ's pipes: a flute tone (fundamental, soft 2nd and 3rd, breath), two ranks a few cents apart, a
    gentle tremulant."""

    def __init__(self, gain_db=-8.0, release=0.06, breath=0.05, detune_c=6.0, trem=(6.0, 0.08)):
        self.gain_db, self.release, self.breath, self.detune_c, self.trem = gain_db, release, breath, detune_c, trem

    def voice(self, n, dur, ctx):
        f = hz(n.p)
        L = int((dur + self.release) * SR)
        t = np.arange(L) / SR
        tr = 1 + self.trem[1] * np.sin(2 * np.pi * self.trem[0] * t)
        out = np.zeros((2, L), np.float32)
        for ch, dc in enumerate((-self.detune_c / 2, self.detune_c / 2)):
            ff = f * 2 ** (dc / 1200)
            ph = ctx.rng.uniform(0, 2 * np.pi)
            x = np.sin(2 * np.pi * ff * t + ph) + 0.28 * np.sin(4 * np.pi * ff * t + ph) + 0.12 * np.sin(6 * np.pi * ff * t + ph)
            out[ch] = x.astype(np.float32)
        noise = dsp.stereo(ctx.rng.standard_normal(L).astype(np.float32))
        noise = dsp.filt(noise, dsp.biquad('bp', min(f * 2, 9000), 2.0))
        out += self.breath * noise * np.exp(-t / 0.05)[None, :].astype(np.float32) * 3
        out += self.breath * 0.3 * noise
        e = adsr(L, 0.018, 0.2, 0.95, dur, self.release)
        return (out * (e * tr)[None, :] * (0.55 + 0.45 * n.v)).astype(np.float32)


# ------------------------------------------------------------------ effects played as notes


class Riser(_Poly):
    """Filtered noise swelling over the note (a transition into a section), or a reversed cymbal when given one."""

    def __init__(self, gain_db=-14.0, lo=400.0, hi=9000.0, release=0.02):
        self.gain_db, self.lo, self.hi, self.release = gain_db, lo, hi, release

    def voice(self, n, dur, ctx):
        L = int(dur * SR)
        t = np.arange(L) / SR
        noise = ctx.rng.standard_normal((2, L)).astype(np.float64)
        k = (t / max(dur, 1e-3)) ** 2
        f = self.lo * (self.hi / self.lo) ** k
        out = np.stack([_svf_bp(noise[c], f, 0.8, SR) for c in range(2)]).astype(np.float32)
        return out * (k ** 1.5)[None, :].astype(np.float32) * n.v


@njit(cache=True)
def _svf_bp(x, f, q, sr):
    """Chamberlin state-variable band-pass with a per-sample centre frequency (a sweep without steps)."""
    n = x.shape[0]
    y = np.empty(n)
    low = 0.0
    band = 0.0
    for i in range(n):
        fc = 2.0 * math.sin(math.pi * min(f[i], sr / 6.0) / sr)
        high = x[i] - low - q * band
        band += fc * high
        low += fc * band
        y[i] = band
    return y
