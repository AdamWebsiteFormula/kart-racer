# The sci-fi item sounds' toolkit (28 Sept 2026: the 13 items reskinned as sci-fi, their sounds built here). It extends
# scripts/sfx/dsp.py at import, adding nothing to that file, so it merges cleanly with the sound lab's work:
#   - sources: {freesound: id} (CC0, sources.py) and {fcp: "<Folder>/<File>.caf"} (Final Cut Pro, a minor processed ingredient);
#   - synths (seeded, deterministic): laser (a dispersive spring chirp, the classic blaster "pew"), zap (FM with a pitch
#     envelope and unison), hum (additive energy hum with formants and pulse), shepard (an endlessly rising or falling
#     tone), turbine (a jet: spool, fan and compressor whine, roar), thrust (a rocket or thruster flame), nwave (a sonic
#     boom's double crack), subdrop, rotor (a quadcopter), beeps, glitter (bell grains), ring (a struck resonator), arc
#     (an electric arc: buzz, sizzle and sparks);
#   - processing ops: chorus, phaser, ringmod, tremolo, convolve (an impulse response: a recording, or one made here:
#     spring, plate, metal, tunnel), sat (oversampled saturation or an exciter), transient, doppler, stutter, widen,
#     grain (granular: time-stretch or scatter a recording), loopcut, octave (a sub-octave from the layer's own pitch).
# Install path: a candidate that wins is copied into scripts/sfx/recipes.ts, and build.py (or dsp.py) imports this module.
# Nothing is ever played.
import math, os, sys
import numpy as np
from numba import njit
from scipy.signal import fftconvolve, lfilter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
sys.path.insert(0, HERE)
import dsp  # noqa: E402
import sources  # noqa: E402

SR = dsp.SR
curve = dsp.curve


def _n(a):
    return int(round(a['seconds'] * SR))


def _rng(a, k=0):
    return np.random.default_rng(int(a.get('seed', 1)) * 7919 + k)


def _env(a, n, key='env'):
    return curve(a.get(key, 1.0), n)


def _pan2(y, pos):
    """Mono → stereo at pan `pos` (-1..1, a number or a per-sample array), equal power."""
    th = (np.asarray(pos) + 1) * np.pi / 4
    return np.stack([y * np.cos(th), y * np.sin(th)]) * math.sqrt(2)


def _phase(f):
    """Phase (cycles) of a per-sample frequency, from 0."""
    return np.cumsum(f) / SR


def _smooth_rand(n, rate, rng):
    return dsp._smooth_random(n, rate, rng)


def _fit(y, n):
    """A 1-D array cut or zero-padded to n samples."""
    return y[:n] if y.shape[-1] >= n else np.pad(y, (0, n - y.shape[-1]))


# ------------------------------------------------------------------ sources

_load0 = dsp.load


def load(src):
    if 'freesound' in src:
        return dsp._read(sources.local(int(src['freesound'])))
    if 'fcp' in src:
        return dsp._read(sources.fcp(src['fcp']))
    return _load0(src)


dsp.load = load


# ------------------------------------------------------------------ synths

@njit(cache=True)
def _allpass_chain(x, a, M, K):
    # M sections of H(z) = (a + z^-K) / (1 + a z^-K): a negative `a` delays the lows most, so a click comes out as a
    # falling chirp, highs first (a stiff wire's or a spring's dispersion: the blaster "pew")
    n = x.shape[0]
    y = x.copy()
    out = np.empty(n)
    for m in range(M):
        for i in range(n):
            xk = y[i - K] if i >= K else 0.0
            yk = out[i - K] if i >= K else 0.0
            out[i] = a * y[i] + xk - a * yk
        for i in range(n):
            y[i] = out[i]
    return y


def syn_laser(a):
    """A blaster bolt from physics: a click through a long dispersive all-pass chain (a spring or a taut wire) comes out
    as a falling chirp, the classic "pew". seconds, sections (length of the chirp), coef (-0.95..-0.3: nearer -1, longer
    and lower), stretch K (1, or 2-4 for a thinner, more metallic chirp), echoes (spring repeats: count, gap s, gain),
    bright (Hz, the click's low-pass), lo (Hz, high-pass of the result), spread (stereo: the right channel's coef offset), env."""
    n = _n(a)
    rng = _rng(a)
    x = np.zeros(n)
    k = int(0.0015 * SR)
    burst = rng.standard_normal(k) * np.hanning(k)
    x[:k] = burst
    x = dsp.filt(x, 'lp', a.get('bright', 9000))
    M, coef, K = int(a.get('sections', 300)), float(a.get('coef', -0.8)), int(a.get('stretch', 1))
    echoes = a.get('echoes', [0, 0.06, 0.4])
    out = []
    for c, off in ((0, 0.0), (1, a.get('spread', 0.02))):
        y = _allpass_chain(x, coef + off * (1 if c else -1), M, K)
        tot = y.copy()
        e = y
        for j in range(int(echoes[0])):
            e = _allpass_chain(e, coef + off, M, K)
            d = int(echoes[1] * (j + 1) * SR)
            if d < n:
                tot[d:] += e[: n - d] * echoes[2] ** (j + 1)
        out.append(tot)
    y = np.array(out)
    if a.get('lo'):
        y = dsp.filt(y, 'hp', a['lo'])
    y = y / (np.abs(y).max() + 1e-12)
    return y * _env(a, n) * 0.5


@njit(cache=True)
def _blep_osc(ph_inc, wave, ph0):
    # band-limited saw (1), square (2) or sine (0) from a per-sample phase increment (cycles)
    n = ph_inc.shape[0]
    y = np.empty(n)
    ph = ph0
    for i in range(n):
        dt = ph_inc[i]
        if wave == 0:
            y[i] = math.sin(2 * math.pi * ph)
        else:
            s = 2.0 * ph - 1.0
            if ph < dt:
                t = ph / dt
                s -= t + t - t * t - 1.0
            elif ph > 1.0 - dt:
                t = (ph - 1.0) / dt
                s -= t * t + t + t + 1.0
            if wave == 1:
                y[i] = s
            else:
                ph2 = ph + 0.5
                if ph2 >= 1.0:
                    ph2 -= 1.0
                s2 = 2.0 * ph2 - 1.0
                if ph2 < dt:
                    t = ph2 / dt
                    s2 -= t + t - t * t - 1.0
                elif ph2 > 1.0 - dt:
                    t = (ph2 - 1.0) / dt
                    s2 -= t * t + t + t + 1.0
                y[i] = (s - s2) * 0.5
        ph += dt
        while ph >= 1.0:
            ph -= 1.0
    return y


WAVE = {'sine': 0, 'saw': 1, 'square': 2}


def syn_zap(a):
    """A pitched zap or energy tone: carrier `hz` [[t, Hz]] (log), `wave` sine|saw|square, FM by a sine at `ratio` × the
    carrier with `index` [[t, I]], `voices` unison voices `detune` cents apart (spread over the stereo field by `width`), a
    random `jitter` (cents, fast), `sub` (a sine an octave under, 0..1), `noise` (0..1: noise band-passed at the carrier ×
    `noiseMult`, following it), `drift` (cents, slow), env; seed."""
    n = _n(a)
    rng = _rng(a)
    f = curve(a['hz'], n, log=True)
    idx = curve(a.get('index', 0.0), n)
    env = _env(a, n)
    V = int(a.get('voices', 1))
    det = float(a.get('detune', 0.0))
    ratio = float(a.get('ratio', 1.0))
    wave = WAVE[a.get('wave', 'sine')]
    width = float(a.get('width', 0.6))
    out = np.zeros((2, n))
    for v in range(V):
        c = (v - (V - 1) / 2) / max(1, (V - 1) / 2) if V > 1 else 0.0
        cents = c * det + a.get('drift', 0.0) * _smooth_rand(n, 3, rng) + a.get('jitter', 0.0) * _smooth_rand(n, 60, rng)
        fv = np.minimum(f * 2 ** (cents / 1200), 0.45 * SR)
        mod = np.sin(2 * np.pi * (_phase(fv * ratio) + rng.random())) * idx
        if wave == 0:
            y = np.sin(2 * np.pi * (_phase(fv) + rng.random()) + mod)
        else:
            # FM on a band-limited wave: bend its frequency by the modulator's derivative
            fm = fv * (1 + idx * ratio * np.cos(2 * np.pi * (_phase(fv * ratio))) * 0.15)
            y = _blep_osc(np.clip(fm, 1, 0.45 * SR) / SR, wave, rng.random())
        if a.get('sub'):
            y = y + a['sub'] * np.sin(2 * np.pi * _phase(fv * 0.5))
        out += _pan2(y, c * width) / math.sqrt(V)
    if a.get('noise'):
        nz = rng.standard_normal((2, n))
        hz = np.clip(f * a.get('noiseMult', 1.0), 60, 16000)
        nz = dsp.sweep(nz, 'bp', hz, a.get('noiseQ', 2.0))
        out += a['noise'] * nz * 2
    return out * env * 0.35


def syn_hum(a):
    """An energy hum: additive partials of `hz` [[t, Hz]]: `partials` N with a 1/k^`tilt` fall (odd-only if `odd`),
    `voices` unison voices `detune` cents apart that drift (`drift` cents at `driftRate` Hz), `formants` [[Hz, Q, dB]]
    peaks, a `pulse` [rate Hz, depth 0..1] throb, `buzz` (0..1: a sizzle of noise gated by the wave's peaks), env; seed."""
    n = _n(a)
    rng = _rng(a)
    f = curve(a['hz'], n, log=True)
    K = int(a.get('partials', 12))
    tilt = float(a.get('tilt', 1.0))
    odd = bool(a.get('odd', False))
    V = int(a.get('voices', 3))
    det = float(a.get('detune', 8.0))
    width = float(a.get('width', 0.7))
    period = a.get('period')
    out = np.zeros((2, n))
    for v in range(V):
        c = (v - (V - 1) / 2) / max(1, (V - 1) / 2) if V > 1 else 0.0
        if period:
            # a loop: every voice a whole number of cycles in `period` seconds (`detune` is then Hz), no drift, so the wrap is seamless
            base = round(float(np.median(f)) * period) / period
            fv = np.full(n, base + round((v - (V - 1) / 2) * det * period) / period)
        else:
            cents = c * det + a.get('drift', 3.0) * _smooth_rand(n, a.get('driftRate', 0.7), rng)
            fv = f * 2 ** (cents / 1200)
        ph = _phase(fv)
        y = np.zeros(n)
        for k in range(1, K + 1):
            if odd and k % 2 == 0 and k > 1:
                continue
            fk = fv * k
            g = k ** -tilt * np.clip((17000 - fk) / 3000, 0, 1)
            if not g.any():
                break
            y += g * np.sin(2 * np.pi * (k * ph + rng.random()))
        out += _pan2(y, c * width) / math.sqrt(V)
    if a.get('buzz'):
        m = out.mean(axis=0)
        gate = np.maximum(0, m / (np.abs(m).max() + 1e-12)) ** 6
        nz = dsp.filt(rng.standard_normal((2, n)), 'hp', 2500)
        out += a['buzz'] * nz * gate * 0.5
    for hz, q, db in a.get('formants', []):
        out = dsp.filt(out, 'peak', hz, q, db)
    if a.get('pulse'):
        rate, depth = a['pulse'][0], a['pulse'][1]
        r = curve(rate, n) if not isinstance(rate, (int, float)) else np.full(n, float(rate))
        lfo = 0.5 + 0.5 * np.sin(2 * np.pi * np.cumsum(r) / SR)
        out *= (1 - depth) + depth * lfo ** 1.5
    return out / (np.abs(out).max() + 1e-12) * _env(a, n) * 0.5


def syn_shepard(a):
    """A Shepard-Risset glissando, a tone that rises (or falls) for ever: `octaves` sine voices an octave apart glide at
    `rate` octaves a second (negative falls), each faded by a bell over log frequency centred on `center` Hz (`spread`
    octaves wide); `fifth` (0..1) adds a voice a fifth over each; `detune` cents (stereo); env. Loops seamlessly on a
    length of k / |rate| seconds."""
    n = _n(a)
    rng = _rng(a)
    rate = float(a.get('rate', 0.5))
    base = float(a.get('base', 40.0))
    O = int(a.get('octaves', 8))
    center = math.log2(float(a.get('center', 600.0)) / base)
    spread = float(a.get('spread', 1.6))
    t = np.arange(n) / SR
    out = np.zeros((2, n))
    phases = rng.random((O, 2))  # shared by both channels (they differ only by `detune`)
    for c in range(2):
        dt = (a.get('detune', 4.0) / 1200) * (1 if c else -1)
        y = np.zeros(n)
        for o in range(O):
            for j, (extra, g0) in enumerate(((0.0, 1.0), (math.log2(1.5), a.get('fifth', 0.0)))):
                if g0 <= 0:
                    continue
                pos = (o + extra + rate * t) % O  # octaves over base
                fr = base * 2 ** (pos + dt)
                amp = np.exp(-0.5 * ((pos - center) / spread) ** 2) * g0
                # phase from the frequency; a wrap at `O` octaves happens where the bell has faded to nothing
                ph = np.cumsum(fr) / SR + phases[o, j]
                y += amp * np.sin(2 * np.pi * ph)
        out[c] = y
    return out / (np.abs(out).max() + 1e-12) * _env(a, n) * 0.5


def syn_turbine(a):
    """A jet engine: `spool` [[t, 0..1]] drives the shaft from `rpsLo` to `rpsHi` turns a second; the fan's blade-pass
    tone (`fanBlades` × rps) and harmonics, the compressor's whine (`compBlades` × rps × `compRatio`), each with jitter;
    `roar` (0..1) broadband noise whose low-pass opens with the spool (`roarLo`..`roarHi` Hz) and churns (`turb`);
    `whine` and `fan` levels; env; seed."""
    n = _n(a)
    rng = _rng(a)
    s = curve(a.get('spool', 1.0), n)
    rps = a.get('rpsLo', 20) + (a.get('rpsHi', 160) - a.get('rpsLo', 20)) * s
    out = np.zeros((2, n))
    fam = [(a.get('fanBlades', 18), a.get('fan', 0.6), 5), (a.get('compBlades', 29) * a.get('compRatio', 1.7), a.get('whine', 0.5), 3)]
    for c in range(2):
        y = np.zeros(n)
        for blades, lvl, H in fam:
            if lvl <= 0:
                continue
            f0 = rps * blades * (1 + 0.004 * _smooth_rand(n, 8, rng))
            ph = _phase(f0)
            for h in range(1, H + 1):
                g = lvl * h ** -1.3 * np.clip((16000 - f0 * h) / 2000, 0, 1)
                y += g * np.sin(2 * np.pi * (h * ph + rng.random())) * (1 + 0.15 * _smooth_rand(n, 12, rng))
        if a.get('roar', 0):
            nz = rng.standard_normal(n)
            lp = a.get('roarLo', 300) * (a.get('roarHi', 6000) / a.get('roarLo', 300)) ** s
            r = dsp.sweep(nz, 'lp', lp, 0.7)[0]
            r += 0.6 * dsp.sweep(dsp._noise(n, 'brown', rng), 'lp', np.minimum(lp * 0.3, 1500), 0.8)[0]
            r *= np.maximum(0, 1 + a.get('turb', 0.3) * _smooth_rand(n, 18, rng))
            y += a['roar'] * r * (0.3 + 0.7 * s)
        out[c] = y
    return out / (np.abs(out).max() + 1e-12) * _env(a, n) * 0.5


def syn_thrust(a):
    """A rocket or thruster flame: noise through a low-pass `hz` [[t, Hz]] that flares, a resonant `throat` [Hz, Q, gain]
    ringing in it, turbulence (`turb` depth at `turbRate` Hz), a low `throb` [rate Hz, depth] pulsing like a jet of gas,
    `crackle` (0..1: sparse pops in it), `hiss` (0..1: its high air), env; seed."""
    n = _n(a)
    rng = _rng(a)
    hz = curve(a['hz'], n, log=True)
    out = np.zeros((2, n))
    for c in range(2):
        nz = rng.standard_normal(n)
        y = dsp.sweep(nz, 'lp', hz, a.get('q', 0.8))[0]
        y += 0.7 * dsp.sweep(dsp._noise(n, 'brown', rng), 'lp', np.minimum(hz * 0.35, 1800), 0.9)[0]
        if a.get('throat'):
            f_, q_, g_ = a['throat']
            y += g_ * dsp.filt(nz, 'bp', f_, q_) * 2
        if a.get('hiss'):
            y += a['hiss'] * dsp.sweep(rng.standard_normal(n), 'hp', np.minimum(hz * 1.5, 14000), 0.7)[0]
        y *= np.maximum(0, 1 + a.get('turb', 0.35) * _smooth_rand(n, a.get('turbRate', 25), rng))
        if a.get('throb'):
            r, d = a['throb']
            y *= 1 - d + d * (0.5 + 0.5 * np.sin(2 * np.pi * r * np.arange(n) / SR + rng.random() * 6.28))
        if a.get('crackle'):
            cr = dsp.syn_crackle({'seconds': n / SR, 'seed': int(a.get('seed', 1)) + c * 11, 'rate': a.get('crackleRate', 60), 'lo': 800, 'hi': 7000,
                                  'decay': 0.002, 'spread': 16, 'width': 0})[0]
            y += a['crackle'] * _fit(cr, n) * 4 * (np.abs(y).max() + 1e-9)
        out[c] = y
    return out / (np.abs(out).max() + 1e-12) * _env(a, n) * 0.5


def syn_nwave(a):
    """A sonic boom's N-wave, the double crack: pressure jumps up, falls straight through zero over `T` seconds and snaps
    back, with `rise` seconds of rise (under 2 ms: a crack; 5-15 ms: a thud), twice if `double` (the tail shock after
    `gap` s), then a `rumble` of low noise over `tail` seconds (0..1). Low-passed at `lp`; env."""
    n = _n(a)
    rng = _rng(a)
    T, rise = float(a.get('T', 0.12)), max(1e-4, float(a.get('rise', 0.002)))
    t = np.arange(n) / SR
    t0 = float(a.get('at', 0.01))
    w = np.where((t >= t0) & (t < t0 + T), 1 - 2 * (t - t0) / T, 0.0)
    # smooth the two jumps by `rise`
    k = max(1, int(rise * SR))
    w = np.convolve(w, np.hanning(2 * k + 1) / np.hanning(2 * k + 1).sum(), 'same')
    y = w.copy()
    if a.get('double', True):
        g = int(a.get('gap', 0.18) * SR)
        y[g:] += 0.7 * w[: n - g]
    if a.get('rumble'):
        br = dsp._noise(n, 'brown', rng)
        br = dsp.filt(br, 'lp', 160) * np.exp(-np.maximum(0, t - t0) / max(0.05, a.get('tail', 0.8))) * (t >= t0)
        y += a['rumble'] * br / (np.abs(br).max() + 1e-12)
    y = dsp.filt(y, 'lp', a.get('lp', 9000))
    y = dsp.filt(y, 'hp', a.get('hp', 25))
    out = np.stack([y, np.roll(y, int(0.0004 * SR))])
    return out / (np.abs(out).max() + 1e-12) * _env(a, n) * 0.5


def syn_subdrop(a):
    """A sub drop: a sine sweeping `hz` [[t, Hz]] (log), driven (`drive`) so its harmonics carry on small speakers; env."""
    n = _n(a)
    f = curve(a['hz'], n, log=True)
    y = np.sin(2 * np.pi * _phase(f))
    d = a.get('drive', 1.5)
    if d > 0:
        y = np.tanh(y * d) / math.tanh(d)
    y = y * _env(a, n)
    return np.stack([y, y]) * 0.5


def syn_rotor(a):
    """A small quadcopter drone: `rotors` propellers, each a buzz at the blade-pass `hz` [[t, Hz]] (× 1 ± `spread`),
    `harm` harmonics falling 1/k^`tilt`, wandering (`wander` fraction at 3 Hz) as the flight controller trims them, a
    motor whine at `whine` [ratio, level], air noise band-passed round the blade-pass (`air`), env; seed."""
    n = _n(a)
    rng = _rng(a)
    f = curve(a['hz'], n, log=True)
    R = int(a.get('rotors', 4))
    out = np.zeros((2, n))
    for r in range(R):
        off = (r - (R - 1) / 2) / max(1, (R - 1) / 2) * a.get('spread', 0.03)
        fr = f * (1 + off + a.get('wander', 0.01) * _smooth_rand(n, 3, rng))
        ph = _phase(fr)
        y = np.zeros(n)
        for h in range(1, int(a.get('harm', 8)) + 1):
            g = h ** -a.get('tilt', 1.1) * np.clip((16000 - fr * h) / 2000, 0, 1)
            y += g * np.sin(2 * np.pi * (h * ph + rng.random()))
        if a.get('whine'):
            ratio, lvl = a['whine']
            y += lvl * np.sin(2 * np.pi * (_phase(np.minimum(fr * ratio, 0.45 * SR)) + rng.random()))
        out += _pan2(y, ((r % 2) * 2 - 1) * 0.5)
    if a.get('air'):
        nz = rng.standard_normal((2, n))
        out += a['air'] * dsp.sweep(nz, 'bp', np.minimum(f * 3, 12000), 0.8) * 3
    return out / (np.abs(out).max() + 1e-12) * _env(a, n) * 0.5


def syn_beeps(a):
    """Beeps: `notes` [[t, Hz, seconds, gain], ...] on a `wave` (sine|tri|square, soft), each with a `blip` (semitones it
    falls from in the first `blipTime` s: a chirpy robot onset), `attack` and `release`, `harmonics` [[mult, gain]]; env."""
    n = _n(a)
    y = np.zeros(n)
    att, rel = a.get('attack', 0.004), a.get('release', 0.03)
    for t0, hz, dur, g in a['notes']:
        i0 = int(t0 * SR)
        m = int((dur + rel) * SR)
        if i0 >= n:
            continue
        m = min(m, n - i0)
        tt = np.arange(m) / SR
        bl = a.get('blip', 0.0)
        fr = hz * 2 ** (bl * np.exp(-tt / max(1e-4, a.get('blipTime', 0.012))) / 12)
        ph = np.cumsum(fr) / SR
        wave = a.get('wave', 'sine')
        if wave == 'sine':
            s = np.sin(2 * np.pi * ph)
        elif wave == 'tri':
            s = 2 / np.pi * np.arcsin(np.sin(2 * np.pi * ph))
        else:  # a soft square: odd sines
            s = sum(np.sin(2 * np.pi * k * ph) / k * (k * hz < 16000) for k in (1, 3, 5, 7, 9)) * 0.9
        for mult, hg in a.get('harmonics', []):
            s = s + hg * np.sin(2 * np.pi * mult * ph)
        e = np.minimum(1, tt / att) * np.where(tt < dur, 1.0, np.exp(-(tt - dur) / max(1e-4, rel / 3)))
        y[i0:i0 + m] += g * s * e
    y = y * _env(a, n)
    return np.stack([y, y]) * 0.4


def syn_glitter(a):
    """Glitter: tiny bell grains at `density` [[t, grains/s]], each an FM bell (`ratio`, index decaying from `index`) on a
    frequency from `notes` (Hz) or log-uniform in `lo`..`hi`, ringing `decay` s (± half), at a random level (`spread` dB) and
    pan (`width`); env; seed."""
    n = _n(a)
    rng = _rng(a)
    dens = curve(a.get('density', 20.0), n)
    y = np.zeros((2, n))
    notes = a.get('notes')
    lo, hi = a.get('lo', 2000), a.get('hi', 9000)
    dec = a.get('decay', 0.12)
    t = 0.0
    while True:
        i = min(n - 1, int(t * SR))
        rate = max(dens[i], 1e-3)
        t += rng.exponential(1 / rate)
        i = int(t * SR)
        if i >= n:
            break
        if dens[min(i, n - 1)] <= 1e-3:
            continue
        hz = float(rng.choice(notes)) * (2 ** (rng.choice([0, 1]) if a.get('octaves') else 1)) if notes else math.exp(rng.uniform(math.log(lo), math.log(hi)))
        d = dec * rng.uniform(0.5, 1.5)
        m = min(n - i, int(d * 6 * SR))
        tt = np.arange(m) / SR
        # the modulator and its first sidebands stay under 17 kHz (above it they alias down as low thumps)
        ratio = a.get('ratio', 3.5)
        while hz * ratio > 17000 and ratio > 0.5:
            ratio /= 2
        idx = a.get('index', 1.5) * np.exp(-tt / (d * 0.5)) * (1 if hz * (1 + ratio) < 17000 else 0.3)
        g = 10 ** (-rng.uniform(0, a.get('spread', 12)) / 20)
        s = np.sin(2 * np.pi * hz * tt + idx * np.sin(2 * np.pi * hz * ratio * tt)) * np.exp(-tt / d) * np.minimum(1, tt / 0.0015)
        s[-min(len(s), int(0.004 * SR)):] *= np.linspace(1, 0, min(len(s), int(0.004 * SR)))
        p = rng.uniform(-1, 1) * a.get('width', 0.8)
        y[0, i:i + m] += g * s * math.cos((p + 1) * math.pi / 4)
        y[1, i:i + m] += g * s * math.sin((p + 1) * math.pi / 4)
    return y / (np.abs(y).max() + 1e-12) * _env(a, n) * 0.5


def syn_ring(a):
    """A struck resonator (a metal ring, a force field): `modes` [[ratio, gain, decay s], ...] of `hz` [[t, Hz]] (a
    moving pitch bends every mode: a ricochet's falling ping), struck by `strike` seconds of noise (low-passed at
    `hardness` Hz) for a click, `detune` cents between the channels; env; seed."""
    n = _n(a)
    rng = _rng(a)
    f = curve(a['hz'], n, log=True)
    t = np.arange(n) / SR
    out = np.zeros((2, n))
    modes = a.get('modes', [[1, 1, 0.4], [2.76, 0.5, 0.25], [5.4, 0.3, 0.15], [8.93, 0.2, 0.08]])
    phases = rng.random(len(modes))  # the same for both channels: they differ only by `detune`, so they never cancel in mono
    for c in range(2):
        dt = 2 ** ((a.get('detune', 3.0) / 1200) * (1 if c else -1))
        ph = _phase(f * dt)
        y = np.zeros(n)
        for (ratio, g, dec), p0 in zip(modes, phases):
            if (f * ratio).max() > 0.45 * SR:
                continue
            y += g * np.sin(2 * np.pi * (ratio * ph + p0)) * np.exp(-t / dec)
        y *= np.minimum(1, t / 0.0008)
        if a.get('strike', 0):
            k = int(a['strike'] * SR)
            nz = np.zeros(n)
            nz[:k] = rng.standard_normal(k) * np.exp(-np.arange(k) / (k / 4))
            y += a.get('strikeGain', 0.6) * dsp.filt(nz, 'lp', a.get('hardness', 6000)) * np.abs(y).max()
        out[c] = y
    return out / (np.abs(out).max() + 1e-12) * _env(a, n) * 0.5


def syn_arc(a):
    """An electric arc: a `buzz` Hz train of sharp discharges (timing `jitter`) that sizzles (band-passed `lo`..`hi`),
    a mains-like `hum` (0..1) under it, bursts of `sparks` (0..1, Poisson at `rate`), all swelling with `intensity`
    [[t, 0..1]]; env; seed."""
    n = _n(a)
    rng = _rng(a)
    inten = curve(a.get('intensity', 1.0), n)
    buzz = curve(a.get('buzz', 120.0), n, log=True)
    out = np.zeros((2, n))
    for c in range(2):
        ph = np.cumsum(buzz * (1 + a.get('jitter', 0.15) * _smooth_rand(n, 150, rng))) / SR
        pulses = np.diff(np.floor(ph), prepend=0) > 0
        exc = pulses.astype(float) * (0.4 + 0.6 * rng.random(n))
        y = lfilter([1.0], [1, -0.6], exc)
        y = dsp.filt(y + 0.3 * rng.standard_normal(n) * (np.convolve(exc, np.ones(int(0.002 * SR)), 'same') > 0), 'bp',
                     math.sqrt(a.get('lo', 1500) * a.get('hi', 7000)), 0.6)
        if a.get('hum'):
            y += a['hum'] * 0.3 * (np.sin(2 * np.pi * np.cumsum(buzz) / SR) + 0.5 * np.sin(4 * np.pi * np.cumsum(buzz) / SR))
        if a.get('sparks'):
            y += a['sparks'] * _fit(dsp.syn_crackle({'seconds': n / SR, 'seed': int(a.get('seed', 1)) * 3 + c, 'rate': a.get('rate', 40), 'lo': 1500,
                                                     'hi': 10000, 'decay': 0.003, 'spread': 14, 'width': 0})[0], n) * 6
        out[c] = y * (inten ** 1.5) * (1 + 0.6 * np.maximum(-1, _smooth_rand(n, 30, rng)))
    return out / (np.abs(out).max() + 1e-12) * _env(a, n) * 0.5


dsp.SYNTHS.update({'laser': syn_laser, 'zap': syn_zap, 'hum': syn_hum, 'shepard': syn_shepard, 'turbine': syn_turbine, 'thrust': syn_thrust,
                   'nwave': syn_nwave, 'subdrop': syn_subdrop, 'rotor': syn_rotor, 'beeps': syn_beeps, 'glitter': syn_glitter, 'ring': syn_ring,
                   'arc': syn_arc})


# ------------------------------------------------------------------ impulse responses made here

def ir_spring(seconds=2.5, sections=120, coef=-0.72, gap=0.045, fb=0.62, lp=5000, seed=3):
    """A spring tank: a click chirped by a dispersive chain, repeating every `gap` s round the spring, each pass more
    chirped and quieter; two springs of slightly different lengths (the channels)."""
    n = int(seconds * SR)
    rng = np.random.default_rng(seed)
    out = []
    for c in range(2):
        x = np.zeros(n)
        x[0] = 1
        y = np.zeros(n)
        e = _allpass_chain(x, coef + 0.01 * c, sections, 1)
        g = gap * (1 + 0.07 * c)
        for j in range(60):
            d = int(g * j * SR)
            if d >= n or fb ** j < 1e-3:
                break
            y[d:] += e[: n - d] * fb ** j * (1 if j % 2 == 0 else -1)
            e = _allpass_chain(e, coef, sections // 3, 1)
        y += 0.02 * rng.standard_normal(n) * np.exp(-np.arange(n) / (0.6 * SR))
        out.append(dsp.filt(y, 'lp', lp))
    ir = np.array(out)
    return ir / (np.sqrt((ir ** 2).sum(axis=1, keepdims=True)) + 1e-12)


def ir_metal(seconds=1.6, modes=90, lo=300, hi=9000, decay=0.9, seed=5):
    """A metal plate or hull: many inharmonic modes, each its own decay (highs die first): a bright ringing space."""
    n = int(seconds * SR)
    rng = np.random.default_rng(seed)
    t = np.arange(n) / SR
    out = []
    for c in range(2):
        y = np.zeros(n)
        for _ in range(modes):
            f = math.exp(rng.uniform(math.log(lo), math.log(hi)))
            d = decay * (lo / f) ** 0.35 * rng.uniform(0.6, 1.4)
            y += rng.uniform(0.2, 1) * np.sin(2 * np.pi * f * t + rng.random() * 6.28) * np.exp(-t / d)
        y += 0.3 * rng.standard_normal(n) * np.exp(-t / 0.05)
        out.append(y)
    ir = np.array(out)
    return ir / (np.sqrt((ir ** 2).sum(axis=1, keepdims=True)) + 1e-12)


def ir_tunnel(seconds=2.0, length=40.0, seed=9, lp=6000):
    """A long hard tube (a launch rail, a hangar): flutter echoes every 2×width, a long diffuse tail darkening."""
    n = int(seconds * SR)
    rng = np.random.default_rng(seed)
    t = np.arange(n) / SR
    out = []
    for c in range(2):
        y = rng.standard_normal(n) * np.exp(-6.91 * t / seconds)
        per = (2 * 6.0 / 343) * (1 + 0.05 * c)
        for j in range(1, int(seconds / per)):
            d = int(j * per * SR)
            if d < n:
                y[d] += 3.0 * 0.8 ** j
        y = dsp.sweep(y, 'lp', lp * (1 - 0.8 * np.minimum(1, t / seconds)) + 150, 0.7)[0]
        out.append(y)
    ir = np.array(out)
    return ir / (np.sqrt((ir ** 2).sum(axis=1, keepdims=True)) + 1e-12)


def ir_plate(seconds=1.8, seed=11, damp=0.5):
    return dsp.reverb_ir(seconds, 0.002, 150, 11000, seed, damp)


_IR_CACHE = {}


def get_ir(spec):
    key = repr(sorted(spec.items()))
    if key in _IR_CACHE:
        return _IR_CACHE[key]
    kind = spec.get('kind')
    args = {k: v for k, v in spec.items() if k not in ('kind', 'freesound', 'pack', 'trim', 'from')}
    if 'freesound' in spec or 'pack' in spec:
        ir = load({k: spec[k] for k in ('freesound', 'pack') if k in spec})
        a = int(spec.get('from', 0) * SR)
        ir = ir[:, a:]
        if spec.get('trim'):
            ir = ir[:, : int(spec['trim'] * SR)]
        k = min(ir.shape[-1] // 4, int(0.02 * SR))
        ir[:, -k:] *= np.cos(np.linspace(0, np.pi / 2, k)) ** 2
        ir = ir / (np.sqrt((ir ** 2).sum(axis=1, keepdims=True)) + 1e-12)
    elif kind == 'spring':
        ir = ir_spring(**args)
    elif kind == 'metal':
        ir = ir_metal(**args)
    elif kind == 'tunnel':
        ir = ir_tunnel(**args)
    elif kind == 'plate':
        ir = ir_plate(**args)
    else:
        raise ValueError(f'unknown impulse response {spec}')
    _IR_CACHE[key] = ir
    return ir


# ------------------------------------------------------------------ processing

@njit(cache=True)
def _vdelay(x, d, fb):
    # a variable delay line (d in samples per output sample), cubic read, with feedback
    n = x.shape[0]
    L = int(d.max()) + 8
    buf = np.zeros(n + L)
    y = np.empty(n)
    for i in range(n):
        p = i + L - d[i]
        j = int(math.floor(p))
        f = p - j
        if j < 1:
            j = 1
        a0, b0, c0, d0 = buf[j - 1], buf[j], buf[j + 1], buf[j + 2] if j + 2 < i + L else buf[j + 1]
        v = b0 + 0.5 * f * (c0 - a0 + f * (2 * a0 - 5 * b0 + 4 * c0 - d0 + f * (3 * (b0 - c0) + d0 - a0)))
        buf[i + L] = x[i] + fb * v
        y[i] = v
    return y


@njit(cache=True)
def _phaser(x, g, stages, fb):
    # `stages` first-order all-passes whose coefficient g[i] moves; the output fed back
    n = x.shape[0]
    st = np.zeros(stages)
    y = np.empty(n)
    last = 0.0
    for i in range(n):
        v = x[i] + fb * last
        for s in range(stages):
            o = -g[i] * v + st[s]
            st[s] = v + g[i] * o
            v = o
        last = v
        y[i] = v
    return y


def _grain(x, a):
    """Granular: grains of `size` s read from positions `pos` [[t_out, t_in]] (so `pos` time-stretches or scatters),
    `density` grains a second, pitched `st` semitones ± `jitterSt`, position jitter `scatter` s, Hann windows; seed.
    `seconds` long."""
    rng = np.random.default_rng(int(a.get('seed', 3)))
    n = int(a['seconds'] * SR)
    src = x
    ln = src.shape[-1]
    size = int(a.get('size', 0.06) * SR)
    dens = a.get('density', 60)
    pos = curve(a.get('pos', [[0, 0], [a['seconds'], ln / SR]]), n)
    out = np.zeros((2, n + size * 3))
    win = np.hanning(size)
    t = 0.0
    while t < a['seconds']:
        i = int(t * SR)
        p = int((pos[min(i, n - 1)] + rng.uniform(-1, 1) * a.get('scatter', 0.01)) * SR)
        st = a.get('st', 0.0) + rng.uniform(-1, 1) * a.get('jitterSt', 0.0)
        r = 2 ** (st / 12)
        m = int(size * r) + 2
        p = min(max(0, p), max(0, ln - m - 1))
        seg = src[:, p:p + m]
        if seg.shape[-1] < 4:
            t += 1 / dens
            continue
        idx = np.arange(size) * r
        idx = idx[idx < seg.shape[-1] - 1]
        g = np.stack([np.interp(idx, np.arange(seg.shape[-1]), seg[c]) for c in range(2)]) * win[: len(idx)]
        pan = rng.uniform(-1, 1) * a.get('width', 0.4)
        g[0] *= math.cos((pan + 1) * math.pi / 4) * math.sqrt(2)
        g[1] *= math.sin((pan + 1) * math.pi / 4) * math.sqrt(2)
        out[:, i:i + g.shape[-1]] += g
        t += rng.exponential(1 / dens) if a.get('random', True) else 1 / dens
    out = out[:, :n]
    return out / (np.abs(out).max() + 1e-12) * (np.abs(x).max() + 1e-12)


def _doppler(x, a):
    """A pass-by: the sound moves along a straight line at `speed` m/s, `dist` m from the ear at its nearest, nearest at
    `at` s; delay (distance / 343 m/s), level (1/distance, from `ref` m), air absorption and pan (`pan` 0..1: how wide)."""
    n = x.shape[-1]
    t = np.arange(n) / SR
    v, d0, at = a.get('speed', 40.0), a.get('dist', 3.0), a.get('at', n / SR / 2)
    xp = v * (t - at)
    d = np.sqrt(xp ** 2 + d0 ** 2)
    delay = (d - d.min()) / 343.0 * SR
    ref = a.get('ref', d0)
    gain = np.minimum(1.0, ref / d)
    pan = np.clip(xp / d, -1, 1) * a.get('pan', 0.8) * a.get('dir', 1)
    y = np.stack([_vdelay(np.ascontiguousarray(c), delay + 4, 0.0) for c in x])
    # air absorption: farther is darker (a moving low-pass)
    lp = np.clip(16000 * (d0 / d) ** 0.7, 1500, 18000)
    y = dsp.sweep(y, 'lp', lp, 0.7)
    m = y.mean(axis=0) * gain
    th = (pan + 1) * np.pi / 4
    side = (y[0] - y[1]) / 2 * gain
    return np.stack([m * np.cos(th) * math.sqrt(2) + side * 0.3, m * np.sin(th) * math.sqrt(2) - side * 0.3])


_fx0 = dsp.fx


def fx(x, steps):
    for s in steps or []:
        op = s['op']
        n = x.shape[-1]
        if op == 'chorus':  # voices, depth ms, rate Hz, mix, base ms
            rng = np.random.default_rng(int(s.get('seed', 2)))
            wet = np.zeros_like(x)
            V = int(s.get('voices', 3))
            for c in range(2):
                for v in range(V):
                    rate = s.get('rate', 0.8) * (1 if s.get('lock') else (1 + 0.3 * v))  # `lock`: one rate (a loop's whole cycles)
                    lfo = np.sin(2 * np.pi * rate * np.arange(n) / SR + rng.random() * 6.28)
                    d = (s.get('base', 12) + s.get('depth', 4) * lfo) * SR / 1000
                    wet[c] += _vdelay(np.ascontiguousarray(x[c]), d, 0.0) / V
            m = s.get('mix', 0.4)
            x = x * math.cos(m * math.pi / 2) + wet * math.sin(m * math.pi / 2) * 1.2
        elif op == 'phaser':  # stages, lo..hi Hz swept by rate (Hz) or hz curve, fb, mix
            if 'hz' in s:
                hz = curve(s['hz'], n, log=True)
            else:
                lfo = 0.5 + 0.5 * np.sin(2 * np.pi * s.get('rate', 0.5) * np.arange(n) / SR)
                hz = s.get('lo', 300) * (s.get('hi', 3000) / s.get('lo', 300)) ** lfo
            w = np.tan(np.pi * np.clip(hz, 20, 0.45 * SR) / SR)
            g = (1 - w) / (1 + w)
            wet = np.stack([_phaser(np.ascontiguousarray(c), g * (1 if i == 0 else 0.97), int(s.get('stages', 6)), s.get('fb', 0.4)) for i, c in enumerate(x)])
            m = s.get('mix', 0.5)
            x = x * (1 - m) + wet * m
        elif op == 'ringmod':  # hz curve, mix
            f = curve(s['hz'], n, log=True)
            car = np.sin(2 * np.pi * _phase(f))
            m = s.get('mix', 0.5)
            x = x * (1 - m) + x * car * m
        elif op == 'tremolo':  # rate (Hz or curve), depth, shape (0 sine .. 1 square), stereo phase
            r = curve(s.get('rate', 6), n)
            ph = 2 * np.pi * np.cumsum(r) / SR
            out = []
            for c in range(2):
                l = np.sin(ph + c * s.get('stereo', 0.0) * np.pi)
                sh = s.get('shape', 0.0)
                l = np.tanh(l * (1 + 8 * sh)) / np.tanh(1 + 8 * sh)
                out.append(x[c] * (1 - s.get('depth', 0.5) * (0.5 - 0.5 * l)))
            x = np.stack(out)
        elif op == 'convolve':  # ir {freesound|pack|kind...}, mix (equal power), pre s, hp, lp, decay (s to -60 dB: shortens the IR), wetGain
            ir = get_ir(s['ir'])
            if s.get('decay'):
                t = np.arange(ir.shape[-1]) / SR
                ir = ir * np.exp(-6.91 * t / s['decay'])
                ir = ir[:, : int(min(ir.shape[-1], s['decay'] * 1.1 * SR))]
                ir = ir / (np.sqrt((ir ** 2).sum(axis=1, keepdims=True)) + 1e-12)
            pre = int(s.get('pre', 0) * SR)
            wet = np.stack([fftconvolve(x[c], ir[c % ir.shape[0]]) for c in range(2)])
            wet = np.pad(wet, ((0, 0), (pre, 0)))
            if s.get('hp'):
                wet = dsp.filt(wet, 'hp', s['hp'])
            if s.get('lp'):
                wet = dsp.filt(wet, 'lp', s['lp'])
            dry = np.pad(x, ((0, 0), (0, wet.shape[-1] - n)))
            m = s.get('mix', 0.3)
            # a unit-energy IR: the wet carries the dry's energy spread over the IR's length (a reverb send, not a peak match)
            x = dry * math.cos(m * math.pi / 2) + wet * math.sin(m * math.pi / 2) * s.get('wetGain', 1.0)
        elif op == 'sat':  # drive, mix, asym, hz (exciter: only above it); 4x oversampled so its harmonics do not alias
            import soxr
            src = dsp.filt(x, 'hp', s['hz']) if s.get('hz') else x
            pk = np.abs(src).max() + 1e-12
            up = soxr.resample((src / pk).T, SR, 4 * SR, quality='HQ').T
            d = s.get('drive', 2.0)
            asym = s.get('asym', 0.0)
            ys = (np.tanh(up * d + asym) - math.tanh(asym)) / (math.tanh(d) + 1e-9)
            ys = soxr.resample(ys.T, 4 * SR, SR, quality='HQ').T * pk
            L = min(n, ys.shape[-1])
            ys = np.pad(ys[:, :L], ((0, 0), (0, n - L)))
            ys = dsp.remove_dc(ys)
            m = s.get('mix', 1.0)
            x = x * (1 - m) + ys * m if not s.get('hz') else x + ys * m
        elif op == 'transient':  # attack dB, sustain dB
            m = np.abs(x).max(axis=0)
            fast = lfilter([1 - math.exp(-1 / (0.0008 * SR))], [1, -math.exp(-1 / (0.0008 * SR))], m)
            slow = lfilter([1 - math.exp(-1 / (0.02 * SR))], [1, -math.exp(-1 / (0.02 * SR))], m)
            diff = np.clip((fast - slow) / (fast + 1e-9), 0, 1)
            g = 10 ** ((diff * s.get('attack', 0) + (1 - diff) * s.get('sustain', 0)) / 20)
            g = lfilter([1 - math.exp(-1 / (0.002 * SR))], [1, -math.exp(-1 / (0.002 * SR))], g)
            x = x * g
        elif op == 'doppler':
            x = _doppler(x, s)
        elif op == 'stutter':  # rate Hz, duty 0..1, jitter, smooth ms, pts [[t, 0..1]] how much it chops
            rng = np.random.default_rng(int(s.get('seed', 4)))
            r = s.get('rate', 20)
            per = SR / r
            gate = np.ones(n)
            i = 0.0
            while i < n:
                on = per * s.get('duty', 0.5) * (1 + s.get('jitter', 0.3) * rng.uniform(-1, 1))
                off = per - on
                a0, a1 = int(i + on), int(i + on + max(1, off))
                gate[a0:min(n, a1)] = 0
                i += per * (1 + s.get('jitter', 0.3) * rng.uniform(-0.5, 0.5))
            k = max(1, int(s.get('smooth', 2) * SR / 1000))
            gate = np.convolve(gate, np.ones(k) / k, 'same')
            amt = curve(s.get('pts', 1.0), n)
            x = x * (1 - amt + amt * gate)
        elif op == 'widen':  # decorrelate the channels with short all-pass chains
            g1, g2 = np.full(n, s.get('g', 0.6)), np.full(n, -s.get('g', 0.6))
            l = _phaser(np.ascontiguousarray(x[0]), g1, 4, 0.0)
            r = _phaser(np.ascontiguousarray(x[1]), g2, 4, 0.0)
            m = s.get('amount', 0.5)
            x = np.stack([x[0] * (1 - m) + l * m, x[1] * (1 - m) + r * m])
        elif op == 'grain':
            x = _grain(x, s)
        elif op == 'loopcut':  # `seconds` + `xfade` of material from `from` s (then the recipe's loop wraps it)
            a0 = int(s.get('from', 0) * SR)
            x = x[:, a0:a0 + int((s['seconds'] + s.get('xfade', 0.06) + 0.02) * SR)].copy()
        elif op == 'octave':  # a sub-octave: the layer tape-slowed an octave, low-passed, mixed under
            sub = dsp.pitch(x, -12)[:, :n]
            sub = np.pad(sub, ((0, 0), (0, n - sub.shape[-1])))
            sub = dsp.filt(sub, 'lp', s.get('lp', 400))
            x = x + s.get('mix', 0.5) * sub / (np.abs(sub).max() + 1e-12) * np.abs(x).max()
        else:
            x = _fx0(x, [s])
    return x


dsp.fx = fx
