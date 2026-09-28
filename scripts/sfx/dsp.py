# The sound-effect builder's toolkit: load pack files, synthesize, process, write MP3. Nothing is played.
# Every step is deterministic (seeded noise), so a recipe remakes the same file. Stereo float64 arrays,
# shape (2, n), at SR. Used by build.py; the recipes are data (scripts/sfx/recipes.ts).
import io, math, os, subprocess
import numpy as np
import soundfile as sf
import soxr
from numba import njit
from scipy.signal import fftconvolve, lfilter

SR = 44100
PACKS = os.path.expanduser(os.environ.get('RASCAL_SFX_PACKS', '~/.cache/rascal-sfx/packs'))
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))


# ------------------------------------------------------------------ io

def stereo(y):
    y = np.asarray(y, dtype=np.float64)
    if y.ndim == 1:
        return np.stack([y, y])
    if y.shape[0] == 1:
        return np.concatenate([y, y])
    return y[:2]


def _read(data_or_path):
    y, sr = sf.read(data_or_path, always_2d=True, dtype='float64')
    y = y.T
    if sr != SR:
        y = soxr.resample(y.T, sr, SR, quality='VHQ').T
    return stereo(y)


def load(src):
    """A layer's source: {pack: 'kenney/…'} (the approved packs), {git: rev, path: 'public/…'} (a file from the repo's
    history), {freesound: id} (a CC0 recording's HQ preview, freesound.py) or {fcp: 'Folder/File.caf'} (Apple's Final
    Cut Pro library: only a minor, heavily processed ingredient, fcp.py)."""
    if 'pack' in src:
        return _read(os.path.join(PACKS, src['pack']))
    if 'git' in src:
        b = subprocess.run(['git', '-C', REPO, 'show', f"{src['git']}:{src['path']}"], check=True, capture_output=True).stdout
        return _read(io.BytesIO(b))
    if 'freesound' in src:
        import freesound
        return _read(freesound.fetch(int(src['freesound'])))
    if 'fcp' in src:
        import fcp
        return _read(fcp.decoded(src['fcp']))
    raise ValueError(f'not a file source: {src}')


def write_mp3(path, x, quality=0.2):
    """VBR MP3 through libsndfile's LAME: it writes the gapless (Xing/LAME) header, so the decoded file keeps its exact length."""
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    tmp = path + '.part.mp3'
    sf.write(tmp, np.clip(x, -1, 1).T.astype(np.float32), SR, format='MP3', subtype='MPEG_LAYER_III', bitrate_mode='VARIABLE', compression_level=quality)
    os.replace(tmp, path)


def write_wav(path, x):
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    sf.write(path, np.clip(x, -1, 1).T.astype(np.float32), SR, subtype='PCM_16')


# ------------------------------------------------------------------ breakpoint curves

def curve(pts, n, log=False, sr=SR):
    """Per-sample values from breakpoints [[t, v], ...] (seconds); `log` interpolates in log space (frequencies)."""
    if isinstance(pts, (int, float)):
        return np.full(n, float(pts))
    pts = np.asarray(pts, dtype=np.float64)
    t = np.arange(n) / sr
    v = pts[:, 1]
    if log:
        return np.exp(np.interp(t, pts[:, 0], np.log(np.maximum(v, 1e-9))))
    return np.interp(t, pts[:, 0], v)


# ------------------------------------------------------------------ filters

def biquad(kind, hz, q=0.7071, db=0.0, sr=SR):
    """RBJ Audio EQ Cookbook coefficients (b, a)."""
    hz = min(max(hz, 5.0), 0.49 * sr)
    w = 2 * math.pi * hz / sr
    c, s = math.cos(w), math.sin(w)
    al = s / (2 * q)
    A = 10 ** (db / 40)
    if kind == 'lp':
        b = [(1 - c) / 2, 1 - c, (1 - c) / 2]; a = [1 + al, -2 * c, 1 - al]
    elif kind == 'hp':
        b = [(1 + c) / 2, -(1 + c), (1 + c) / 2]; a = [1 + al, -2 * c, 1 - al]
    elif kind == 'bp':
        b = [al, 0, -al]; a = [1 + al, -2 * c, 1 - al]
    elif kind == 'peak':
        b = [1 + al * A, -2 * c, 1 - al * A]; a = [1 + al / A, -2 * c, 1 - al / A]
    elif kind in ('lowshelf', 'highshelf'):
        r = 2 * math.sqrt(A) * (s / 2 * math.sqrt(2))
        if kind == 'lowshelf':
            b = [A * ((A + 1) - (A - 1) * c + r), 2 * A * ((A - 1) - (A + 1) * c), A * ((A + 1) - (A - 1) * c - r)]
            a = [(A + 1) + (A - 1) * c + r, -2 * ((A - 1) + (A + 1) * c), (A + 1) + (A - 1) * c - r]
        else:
            b = [A * ((A + 1) + (A - 1) * c + r), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - r)]
            a = [(A + 1) - (A - 1) * c + r, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - r]
    else:
        raise ValueError(kind)
    return np.array(b) / a[0], np.array(a) / a[0]


def filt(x, kind, hz, q=0.7071, db=0.0, order=2):
    b, a = biquad(kind, hz, q, db)
    for _ in range(max(1, order // 2)):
        x = lfilter(b, a, x, axis=-1)
    return x


@njit(cache=True)
def _svf(x, g, k, mode):
    # Zavalishin's topology-preserving state-variable filter, cutoff (g = tan(pi fc / sr)) and damping (k = 1/Q) per sample
    y = np.empty_like(x)
    ic1 = 0.0
    ic2 = 0.0
    for i in range(x.shape[0]):
        a1 = 1.0 / (1.0 + g[i] * (g[i] + k[i]))
        a2 = g[i] * a1
        a3 = g[i] * a2
        v3 = x[i] - ic2
        v1 = a1 * ic1 + a2 * v3
        v2 = ic2 + a2 * ic1 + a3 * v3
        ic1 = 2.0 * v1 - ic1
        ic2 = 2.0 * v2 - ic2
        if mode == 0:
            y[i] = v2
        elif mode == 1:
            y[i] = k[i] * v1  # band-pass, 0 dB at the centre
        else:
            y[i] = x[i] - k[i] * v1 - v2
    return y


def sweep(x, mode, hz, q):
    """A filter whose cutoff (Hz, per sample) and Q move: mode 'lp', 'bp' or 'hp'."""
    n = x.shape[-1]
    hz = np.clip(hz, 10, 0.45 * SR)
    g = np.tan(np.pi * hz / SR)
    k = 1.0 / np.maximum(np.broadcast_to(q, (n,)).astype(np.float64), 0.05)
    m = {'lp': 0, 'bp': 1, 'hp': 2}[mode]
    return np.stack([_svf(np.ascontiguousarray(c), g, k, m) for c in np.atleast_2d(x)])


# ------------------------------------------------------------------ synthesis

def _rng(args):
    return np.random.default_rng(int(args.get('seed', 1)))


def _noise(n, color, rng):
    w = rng.standard_normal(n)
    if color == 'white':
        return w
    if color == 'pink':  # Paul Kellet's economy pink filter
        b, a = [0.049922035, -0.095993537, 0.050612699, -0.004408786], [1, -2.494956002, 2.017265875, -0.522189400]
        return lfilter(b, a, w) * 3.5
    if color == 'brown':
        y = lfilter([1.0], [1, -0.995], w)
        return y / (np.std(y) + 1e-12)
    raise ValueError(color)


def syn_noise(a):
    """Noise, stereo decorrelated unless `mono`: seconds, color (white|pink|brown), env [[t, g]], seed."""
    n = int(a['seconds'] * SR)
    rng = _rng(a)
    ch = [_noise(n, a.get('color', 'white'), rng) for _ in range(1 if a.get('mono') else 2)]
    y = stereo(np.array(ch) if len(ch) == 2 else ch[0])
    return y * curve(a.get('env', 1.0), n) * 0.25


def syn_whoosh(a):
    """Air rushing past: noise through a band-pass whose centre `hz` [[t, Hz]] and `q` move, shaped by `env`,
    panned along `pan` [[t, -1..1]]; `color` of the noise; `air` adds a high-passed hiss layer (0..1)."""
    n = int(a['seconds'] * SR)
    rng = _rng(a)
    hz = curve(a['hz'], n, log=True)
    q = curve(a.get('q', 1.0), n)
    env = curve(a.get('env', 1.0), n)
    out = []
    for c in range(2):
        src = _noise(n, a.get('color', 'pink'), rng)
        y = sweep(src, 'bp', hz * (1 + 0.03 * (c - 0.5)), q)[0]
        if a.get('air', 0):
            y = y + a['air'] * sweep(src, 'hp', np.minimum(hz * 3, 16000), 0.7)[0]
        out.append(y)
    y = np.array(out) * env
    if 'pan' in a:
        p = curve(a['pan'], n)
        th = (p + 1) * np.pi / 4
        y = np.stack([y[0] * np.cos(th) * math.sqrt(2), y[1] * np.sin(th) * math.sqrt(2)])
    return y * 0.5


@njit(cache=True)
def _osc(freq, wave, sr):
    # band-limited (polyBLEP) oscillator following a per-sample frequency
    n = freq.shape[0]
    y = np.empty(n)
    ph = 0.0
    tri = 0.0
    for i in range(n):
        dt = freq[i] / sr
        if wave == 0:
            y[i] = math.sin(2 * math.pi * ph)
        else:
            # saw with polyBLEP
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
                # square from two saws half a cycle apart; triangle integrates it
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
                sq = s - s2
                if wave == 2:
                    y[i] = sq * 0.5
                else:
                    tri = 0.999 * tri + 4.0 * dt * sq * 0.5
                    y[i] = tri
        ph += dt
        if ph >= 1.0:
            ph -= 1.0
    return y


WAVES = {'sine': 0, 'saw': 1, 'square': 2, 'tri': 3}


def syn_tone(a):
    """A pitched oscillator: seconds, wave (sine|saw|square|tri), hz [[t, Hz]] (log-interpolated), env [[t, g]],
    vibrato [rate Hz, depth semitones], harmonics [[multiple, gain], ...] (sine partials added), detune cents (stereo)."""
    n = int(a['seconds'] * SR)
    f = curve(a['hz'], n, log=True)
    if 'vibrato' in a:
        r, d = a['vibrato']
        f = f * 2 ** (d / 12 * np.sin(2 * np.pi * r * np.arange(n) / SR))
    env = curve(a.get('env', 1.0), n)
    det = a.get('detune', 0.0)
    out = []
    for c in range(2):
        fc = f * 2 ** ((det if c else -det) / 1200)
        y = _osc(fc, WAVES[a.get('wave', 'sine')], SR)
        for mult, g in a.get('harmonics', []):
            y = y + g * _osc(np.minimum(fc * mult, 0.45 * SR), 0, SR)
        out.append(y)
    return np.array(out) * env * 0.5


def syn_fm(a):
    """Two-operator FM (bells, zaps): hz [[t, Hz]] carrier, ratio (modulator/carrier), index [[t, I]], env [[t, g]]."""
    n = int(a['seconds'] * SR)
    f = curve(a['hz'], n, log=True)
    idx = curve(a.get('index', 2.0), n)
    env = curve(a.get('env', 1.0), n)
    ratio = a.get('ratio', 1.0)
    ph_c = 2 * np.pi * np.cumsum(f) / SR
    ph_m = 2 * np.pi * np.cumsum(f * ratio) / SR
    y = np.sin(ph_c + idx * np.sin(ph_m)) * env * 0.5
    return stereo(y)


def syn_crackle(a):
    """Electric crackle: `rate` sparks a second (Poisson), each a short band-passed burst between `lo` and `hi` Hz
    decaying over `decay` s, random level (`spread` dB), panned at random (`width`); env [[t, g]], seed."""
    n = int(a['seconds'] * SR)
    rng = _rng(a)
    rate, lo, hi, dec = a.get('rate', 60), a.get('lo', 2000), a.get('hi', 9000), a.get('decay', 0.004)
    spread, width = a.get('spread', 12), a.get('width', 0.6)
    y = np.zeros((2, n))
    t = 0.0
    m = int(dec * 8 * SR)
    k = np.arange(m) / SR
    while True:
        t += rng.exponential(1 / rate)
        i = int(t * SR)
        if i >= n:
            break
        amp = 10 ** (-rng.uniform(0, spread) / 20)
        hz = math.exp(rng.uniform(math.log(lo), math.log(hi)))
        burst = rng.standard_normal(m) * np.exp(-k / dec)
        b, aa = biquad('bp', hz, 1.2)
        burst = lfilter(b, aa, burst)
        p = rng.uniform(-width, width)
        j = min(n, i + m)
        y[0, i:j] += amp * burst[: j - i] * math.cos((p + 1) * math.pi / 4)
        y[1, i:j] += amp * burst[: j - i] * math.sin((p + 1) * math.pi / 4)
    return y * curve(a.get('env', 1.0), n) * 0.5


def syn_silence(a):
    return np.zeros((2, int(a['seconds'] * SR)))


def _smooth_random(n, rate, rng):
    """A smooth random signal around 0 (about unit spread) changing at about `rate` Hz."""
    k = max(2, int(n * rate / SR) + 3)
    pts = rng.standard_normal(k)
    t = np.linspace(0, k - 1, n)
    i = np.floor(t).astype(int); f = t - i
    i2 = np.minimum(i + 1, k - 1)
    ff = f * f * (3 - 2 * f)  # smoothstep between knots
    return pts[i] * (1 - ff) + pts[i2] * ff


def syn_flame(a):
    """A burst of fire: noise through a low-pass that flares open (`hz` [[t, Hz]]) with turbulent flutter
    (`flutter` depth 0..1 at `rate` Hz), a low roar under it (`roar` 0..1) and `env` [[t, g]]; seed."""
    n = int(a['seconds'] * SR)
    rng = _rng(a)
    hz = curve(a['hz'], n, log=True)
    env = curve(a.get('env', 1.0), n)
    out = []
    for c in range(2):
        src = _noise(n, a.get('color', 'white'), rng)
        y = sweep(src, 'lp', hz, a.get('q', 0.9))[0]
        if a.get('roar', 0):
            y = y + a['roar'] * sweep(_noise(n, 'brown', rng), 'lp', np.minimum(hz * 0.25, 900), 0.8)[0] * 2
        fl = 1 + a.get('flutter', 0.4) * _smooth_random(n, a.get('rate', 30), rng)
        out.append(y * np.maximum(fl, 0))
    return np.array(out) * env * 0.4


@njit(cache=True)
def _engine(f0, jitter_noise, sr):
    # a firing pulse train (one pulse per power stroke) at a per-sample rate, each pulse a decaying crack
    n = f0.shape[0]
    y = np.zeros(n)
    ph = 0.0
    for i in range(n):
        ph += f0[i] / sr * (1.0 + jitter_noise[i])
        if ph >= 1.0:
            ph -= 1.0
            m = min(n - i, 64)
            for k in range(m):
                y[i + k] += math.exp(-k / 9.0) * (1.0 if k % 2 == 0 else -0.6)
    return y


def syn_engine(a):
    """A small single-cylinder kart engine: firing pulses at `hz` [[t, Hz]] (rpm/60 for a two-stroke) with
    `jitter` (0..0.2, uneven firing), through exhaust resonances `formants` [[Hz, Q, gain]...], plus `rasp` noise; env."""
    n = int(a['seconds'] * SR)
    rng = _rng(a)
    f0 = curve(a['hz'], n, log=True)
    out = []
    for c in range(2):
        jn = a.get('jitter', 0.08) * _smooth_random(n, 200, rng)
        p = _engine(f0, jn, SR)
        y = np.zeros(n)
        for fz, q, g in a.get('formants', [[180, 2.0, 1.0], [650, 3.0, 0.6], [1800, 4.0, 0.3]]):
            y += g * filt(p, 'bp', fz, q)
        if a.get('rasp', 0):
            y += a['rasp'] * filt(_noise(n, 'white', rng), 'bp', 2500, 0.8) * (np.abs(p) > 0.3) * 0.5
        out.append(y)
    y = np.array(out)
    y = y / (np.abs(y).max() + 1e-12)
    return y * curve(a.get('env', 1.0), n) * 0.5


@njit(cache=True)
def _kart(f0, amp_j, time_j, noise, L, fb, damp, pulse, sr, excite):
    # each firing sends a short noisy pressure pulse into the exhaust pipe: a delay line with damped, inverted
    # feedback (a pipe open at one end rings at odd multiples of sr / 2L); the pipe's ring stays put while the
    # firing rate follows the rpm, which is what makes an engine sound like one and not a buzzer
    n = f0.shape[0]
    buf = np.zeros(L)
    y = np.zeros(n)
    ph = 0.0
    lp = 0.0
    idx = 0
    exc = 0.0
    dec = math.exp(-1.0 / (pulse * sr))
    for i in range(n):
        ph += f0[i] / sr * (1.0 + time_j[i])
        if ph >= 1.0:
            ph -= 1.0
            exc = 1.0 + amp_j[i]
        e = exc * (0.55 + 0.45 * noise[i])
        excite[i] = exc
        exc *= dec
        d = buf[idx]
        lp += damp * (d - lp)
        s = e + fb * lp
        buf[idx] = s
        idx += 1
        if idx >= L:
            idx = 0
        y[i] = s
    return y


def syn_kart(a):
    """A small single-cylinder two-stroke kart engine held at one rpm: firing pulses at `hz` [[t, Hz]] (rpm / 60),
    uneven by `jitter` (timing) and `lumpy` (level), ringing an exhaust pipe tuned to `pipe` Hz (`ring` 0..0.95 feedback,
    `damp` 0..1 brightness of the ring, `pulse` s the pulse's length), driven into `drive`, with `rasp` mechanical noise and
    `body` (0..1) a low thump at `bodyHz` under each firing."""
    n = int(a['seconds'] * SR)
    rng = _rng(a)
    f0 = curve(a['hz'], n, log=True)
    L = max(8, int(round(SR / (2 * a.get('pipe', 190)))))
    out = []
    for c in range(2):
        tj = a.get('jitter', 0.03) * _smooth_random(n, 300, rng)
        aj = a.get('lumpy', 0.2) * np.repeat(rng.standard_normal(n // 64 + 1), 64)[:n]
        ex = np.zeros(n)
        y = _kart(f0, aj, tj, rng.uniform(-1, 1, n), L, -a.get('ring', 0.8), a.get('damp', 0.5), a.get('pulse', 0.0015), SR, ex)
        y = y / (np.abs(y).max() + 1e-12)
        if a.get('body', 0):  # the crankcase's thump under each firing: the pulses through a low resonance
            b = filt(ex, 'bp', a.get('bodyHz', 95), 3.0)
            y = y + a['body'] * b / (np.abs(b).max() + 1e-12)
        d = a.get('drive', 2.0)
        y = np.tanh(y * d) / math.tanh(d)
        if a.get('rasp', 0):
            r = filt(rng.standard_normal(n), 'bp', 3000, 0.7)
            y = y + a['rasp'] * r * np.abs(filt(y, 'lp', 400)) * 2
        out.append(y)
    y = np.array(out)
    y = filt(y, 'hp', 45)
    return y / (np.abs(y).max() + 1e-12) * curve(a.get('env', 1.0), n) * 0.5


import physics  # noqa: E402  (the physical models: a struck object, a tire's squeal, a two-stroke engine, a room)

SYNTHS = {'noise': syn_noise, 'whoosh': syn_whoosh, 'tone': syn_tone, 'fm': syn_fm, 'crackle': syn_crackle, 'silence': syn_silence,
          'flame': syn_flame, 'engine': syn_engine, 'kart': syn_kart, 'modal': physics.syn_modal, 'squeal': physics.syn_squeal,
          'piston': physics.syn_piston, 'grains': physics.syn_grains}


# ------------------------------------------------------------------ processing

@njit(cache=True)
def _interp_read(x, pos):
    # cubic (Catmull-Rom) read of x at fractional positions
    n = x.shape[0]
    y = np.zeros(pos.shape[0])
    for i in range(pos.shape[0]):
        p = pos[i]
        j = int(math.floor(p))
        if j < 1 or j + 2 >= n:
            continue
        f = p - j
        a, b, c, d = x[j - 1], x[j], x[j + 1], x[j + 2]
        y[i] = b + 0.5 * f * (c - a + f * (2 * a - 5 * b + 4 * c - d + f * (3 * (b - c) + d - a)))
    return y


def bend(x, st_pts):
    """Time-varying pitch (tape-style: faster is higher and shorter): semitones [[t, st]] over output time."""
    n_in = x.shape[-1]
    st = np.asarray(st_pts, dtype=np.float64)
    hi = 2 ** (st[:, 1].max() / 12)
    if hi > 1:  # read faster than real time: keep what would alias out first
        x = filt(x, 'lp', 0.45 * SR / hi, order=4)
    # step through output time until the input runs out
    out_n = int(n_in / (2 ** (st[:, 1].min() / 12))) + 2
    rate = 2 ** (curve(st, out_n) / 12)
    pos = 1 + np.cumsum(rate) - rate[0]
    keep = pos < n_in - 3
    pos = pos[keep]
    return np.stack([_interp_read(np.ascontiguousarray(c), pos) for c in x])


def pitch(x, st):
    r = 2 ** (st / 12)
    return soxr.resample(x.T, SR * r, SR, quality='VHQ').T.copy()


def reverb_ir(seconds, pre=0.01, hp=200, lp=7000, seed=7, damp=0.5):
    """A synthetic hall/plate impulse response: decorrelated noise per channel, exponential decay to -60 dB at
    `seconds`, highs dying faster (`damp`), a few early reflections, band-limited to hp..lp."""
    n = int((seconds * 1.1 + pre) * SR)
    rng = np.random.default_rng(seed)
    t = np.arange(n) / SR
    out = []
    for c in range(2):
        w = rng.standard_normal(n)
        body = w * np.exp(-6.91 * np.maximum(t - pre, 0) / seconds) * (t >= pre)
        # highs fall away over the tail
        body = sweep(body, 'lp', lp * (1 - damp * np.minimum(1, t / seconds)) + 200, 0.7)[0]
        for k in range(6):  # early reflections
            d = int((pre * 0.4 + rng.uniform(0.003, 0.03)) * SR)
            if d < n:
                body[d] += rng.uniform(0.2, 0.5) * (1 if rng.random() > 0.5 else -1)
        out.append(body)
    ir = np.array(out)
    ir = filt(ir, 'hp', hp)
    return ir / (np.sqrt((ir ** 2).sum(axis=1, keepdims=True)) + 1e-12)


@njit(cache=True)
def _comp_gain(det, thr, ratio, knee, att, rel):
    n = det.shape[0]
    g = np.empty(n)
    env = 0.0
    for i in range(n):
        x = det[i]
        c = att if x > env else rel
        env = c * env + (1 - c) * x
        lv = 20 * math.log10(max(env, 1e-9))
        over = lv - thr
        if 2 * over < -knee:
            gr = 0.0
        elif 2 * abs(over) <= knee:
            gr = (1 / ratio - 1) * (over + knee / 2) ** 2 / (2 * knee)
        else:
            gr = (1 / ratio - 1) * over
        g[i] = 10 ** (gr / 20)
    return g


def compress(x, threshold, ratio, attack=0.005, release=0.08, knee=6.0):
    det = np.max(np.abs(x), axis=0)
    att, rel = math.exp(-1 / (attack * SR)), math.exp(-1 / (release * SR))
    return x * _comp_gain(det, float(threshold), float(ratio), float(max(knee, 1e-3)), att, rel)


@njit(cache=True)
def _limit_gain(peak, ceiling, L, rel):
    n = peak.shape[0]
    req = np.empty(n)
    for i in range(n):
        req[i] = min(1.0, ceiling / peak[i]) if peak[i] > 0 else 1.0
    m = np.empty(n)
    for i in range(n):  # the least gain needed over the next L samples
        v = 1.0
        for k in range(i, min(n, i + L + 1)):
            if req[k] < v:
                v = req[k]
        m[i] = v
    s = np.empty(n)
    acc = 0.0
    for i in range(n):  # averaged over the last L: the gain is down before the peak arrives
        acc += m[i]
        if i > L:
            acc -= m[i - L - 1]
        s[i] = acc / min(i + 1, L + 1)
    g = np.empty(n)
    prev = 1.0
    for i in range(n):  # a slow release, never over s
        v = s[i]
        if v > prev:
            v = prev + (v - prev) * rel
        g[i] = v
        prev = v
    return g


def limit(x, ceiling_db=-1.0, lookahead=0.002, release=0.06):
    peak = np.max(np.abs(x), axis=0)
    g = _limit_gain(peak, 10 ** (ceiling_db / 20), max(1, int(lookahead * SR)), 1 - math.exp(-1 / (release * SR)))
    return x * g


def fx(x, steps):
    """Apply a recipe's processing steps in order (see recipes.ts `Fx`)."""
    for s in steps or []:
        op = s['op']
        if op == 'gain':
            x = x * 10 ** (s['db'] / 20)
        elif op in ('hp', 'lp'):
            x = filt(x, op, s['hz'], s.get('q', 0.7071), order=s.get('order', 2))
        elif op == 'bp':
            x = filt(x, 'bp', s['hz'], s.get('q', 1.0), order=s.get('order', 2))
        elif op == 'peak':
            x = filt(x, 'peak', s['hz'], s.get('q', 1.0), s['db'])
        elif op in ('lowshelf', 'highshelf'):
            x = filt(x, op, s['hz'], db=s['db'])
        elif op == 'sweep':  # a moving filter: mode lp|bp|hp, hz [[t, Hz]], q
            n = x.shape[-1]
            x = sweep(x, s['mode'], curve(s['hz'], n, log=True), curve(s.get('q', 0.7071), n))
        elif op == 'pitch':
            x = pitch(x, s['st'])
        elif op == 'bend':
            x = bend(x, s['st'])
        elif op == 'trim':
            a = int(s.get('from', 0) * SR)
            b = int(s['to'] * SR) if 'to' in s else x.shape[-1]
            x = x[:, a:b].copy()
        elif op == 'fade':
            n = x.shape[-1]
            if s.get('in'):
                k = min(n, int(s['in'] * SR)); x[:, :k] *= np.sin(np.linspace(0, np.pi / 2, k)) ** 2
            if s.get('out'):
                k = min(n, int(s['out'] * SR)); x[:, n - k:] *= np.cos(np.linspace(0, np.pi / 2, k)) ** 2
        elif op == 'env':
            x = x * curve(s['pts'], x.shape[-1])
        elif op == 'reverse':
            x = x[:, ::-1].copy()
        elif op == 'drive':  # tanh saturation, level kept
            d = s['amount']
            x = np.tanh(x * d) / math.tanh(d) if d > 0 else x
        elif op == 'reverb':
            ir = reverb_ir(s['seconds'], s.get('pre', 0.01), s.get('hp', 200), s.get('lp', 7000), s.get('seed', 7), s.get('damp', 0.5))
            wet = np.stack([fftconvolve(x[c], ir[c]) for c in range(2)])
            dry = np.pad(x, ((0, 0), (0, wet.shape[-1] - x.shape[-1])))
            m = s['mix']
            x = dry * math.cos(m * math.pi / 2) + wet * math.sin(m * math.pi / 2) * s.get('wetGain', 1.0)
        elif op == 'comp':
            x = compress(x, s['threshold'], s['ratio'], s.get('attack', 0.005), s.get('release', 0.08), s.get('knee', 6.0))
        elif op == 'limit':
            x = limit(x, s.get('ceiling', -1.0), s.get('lookahead', 0.002), s.get('release', 0.06))
        elif op == 'width':  # mid/side: 0 mono, 1 as is, >1 wider
            m, sd = (x[0] + x[1]) / 2, (x[0] - x[1]) / 2 * s['amount']
            x = np.stack([m + sd, m - sd])
        elif op == 'pan':
            th = (s['pos'] + 1) * math.pi / 4
            m = (x[0] + x[1]) / 2
            x = np.stack([m * math.cos(th), m * math.sin(th)]) * math.sqrt(2)
        elif op == 'mono':
            m = (x[0] + x[1]) / 2
            x = np.stack([m, m])
        elif op == 'normalize':
            pk = np.abs(x).max()
            if pk > 0:
                x = x * 10 ** (s['db'] / 20) / pk
        elif op == 'delay':  # echoes: time s, feedback 0..1, mix, count
            d = int(s['time'] * SR)
            fb, cnt = s.get('feedback', 0.35), s.get('count', 3)
            out = np.pad(x, ((0, 0), (0, d * cnt)))
            for k in range(1, cnt + 1):
                out[:, d * k: d * k + x.shape[-1]] += x * (fb ** k) * s.get('mix', 0.5) * (np.array([[1], [1]]) if not s.get('pingpong') else (np.array([[1], [0.3]]) if k % 2 else np.array([[0.3], [1]])))
            x = out
        elif op == 'flanger':  # a moving comb: delay [[t, ms]], mix 0..1, feedback
            n = x.shape[-1]
            d = curve(s['ms'], n) * SR / 1000
            pos = np.arange(n) - d
            fb = s.get('feedback', 0.0)
            wet = np.stack([_interp_read(np.ascontiguousarray(c), np.clip(pos, 0, n - 3)) for c in x])
            if fb:
                wet = wet + fb * np.stack([_interp_read(np.ascontiguousarray(c), np.clip(pos - d, 0, n - 3)) for c in x])
            x = x * (1 - s.get('mix', 0.5)) + wet * s.get('mix', 0.5)
        elif op == 'repeat':  # a loop tiled end to start until it is `to` seconds long
            n = int(s['to'] * SR)
            x = np.tile(x, (1, int(math.ceil(n / x.shape[-1]))))[:, :n].copy()
        elif op == 'room':  # a real room's impulse response (image sources and a diffuse tail)
            x = physics.fx_room(x, s)
        elif op == 'transient':  # attack and sustain, dB
            x = physics.fx_transient(x, s)
        elif op == 'sat':  # parallel saturation (an exciter with `hz`)
            x = physics.fx_sat(x, s)
        elif op == 'gate':
            x = physics.fx_gate(x, s)
        elif op == 'doppler':
            x = physics.fx_doppler(x, s)
        elif op == 'hit':  # the n-th separate hit of a recording of several (onsets `gap` s apart at least), `len` s from just before it
            x = pick_hit(x, int(s['n']), s.get('len', 0.6), s.get('gap', 0.25), s.get('pre', 0.004), s.get('floor', -30))
        elif op == 'loopcut':  # a loop `seconds` long cut from `from`, its wrap crossfaded over `xfade` (the material runs on past it)
            a = int(s.get('from', 0) * SR)
            x = loopify(x[:, a:].copy(), s['seconds'], s.get('xfade', 0.06))
        elif op == 'flutter':  # random amplitude wobble: depth 0..1 at rate Hz
            rng = np.random.default_rng(int(s.get('seed', 5)))
            x = x * np.maximum(0, 1 + s['depth'] * _smooth_random(x.shape[-1], s.get('rate', 20), rng))
        else:
            raise ValueError(f'unknown op {op}')
    return x


# ------------------------------------------------------------------ assembly

def render_layer(layer):
    src = layer['src']
    if 'synth' in src:
        x = SYNTHS[src['synth']](src.get('args', {}))
    else:
        x = load(src)
    x = fx(x, layer.get('fx'))
    at = int(round(layer.get('at', 0) * SR))
    if at > 0:
        x = np.pad(x, ((0, 0), (at, 0)))
    elif at < 0:
        x = x[:, -at:]
    return x


def mix(parts):
    n = max(p.shape[-1] for p in parts)
    out = np.zeros((2, n))
    for p in parts:
        out[:, : p.shape[-1]] += p
    return out


def end_trim(x, floor_db=-66.0, tail=0.004):
    """Cut the silence after the sound (last sample within `floor_db` of the peak), with a short fade."""
    pk = np.abs(x).max()
    if pk <= 0:
        return x
    above = np.where(np.max(np.abs(x), axis=0) > pk * 10 ** (floor_db / 20))[0]
    b = min(x.shape[-1], above[-1] + 1 + int(tail * SR)) if len(above) else x.shape[-1]
    x = x[:, :b].copy()
    k = min(b, int(tail * SR))
    x[:, b - k:] *= np.cos(np.linspace(0, np.pi / 2, k)) ** 2
    return x


def loopify(x, seconds, xfade=0.06):
    """A seamless loop `seconds` long from material at least seconds + xfade long: its head is an equal-power
    crossfade of the material just past the loop end into the start, so end → start carries on unbroken."""
    n, k = int(round(seconds * SR)), int(round(xfade * SR))
    if x.shape[-1] < n + k:
        raise ValueError(f'loop needs {seconds + xfade:.2f} s of material, has {x.shape[-1] / SR:.2f}')
    y = x[:, :n].copy()
    th = np.linspace(0, np.pi / 2, k)
    y[:, :k] = x[:, n:n + k] * np.cos(th) + x[:, :k] * np.sin(th)
    return y


def hit_onsets(x, gap=0.25, floor=-30):
    """Where each separate hit starts in a recording of several: 2 ms level over `floor` dB of the loudest, rising
    from under it, at least `gap` s after the last."""
    env = envelope(x, 0.002)
    th = env.max() * 10 ** (floor / 20)
    on, last = [], -1e9
    for i in range(1, len(env)):
        if env[i] >= th and env[i - 1] < th and (i * 0.002 - last) >= gap:
            on.append(i * 0.002)
            last = i * 0.002
    return on


def pick_hit(x, n, length, gap=0.25, pre=0.004, floor=-30):
    on = hit_onsets(x, gap, floor)
    if not on:
        raise ValueError('no hits found')
    t = on[n % len(on)]
    a = max(0, int((t - pre) * SR))
    y = x[:, a:a + int(length * SR)].copy()
    k = min(y.shape[-1] // 3, int(0.03 * SR))
    y[:, -k:] *= np.cos(np.linspace(0, np.pi / 2, k)) ** 2
    return y


def remove_dc(x):
    return x - x.mean(axis=1, keepdims=True)


# ------------------------------------------------------------------ measuring (the game's own ear: src/audio/samples.ts)

def k_weight(x):
    """BS.1770 K-weighting at SR (the same two stages as samples.ts kWeight)."""
    fc1 = 1681.974450955533
    A = 10 ** (3.999843853973347 / 40); w = 2 * math.pi * fc1 / SR; c = math.cos(w); al = math.sin(w) / (2 * 0.7071752369554196); r = 2 * math.sqrt(A) * al
    a0 = A + 1 - (A - 1) * c + r
    b1 = [A * (A + 1 + (A - 1) * c + r) / a0, -2 * A * (A - 1 + (A + 1) * c) / a0, A * (A + 1 + (A - 1) * c - r) / a0]
    a1 = [1, 2 * (A - 1 - (A + 1) * c) / a0, (A + 1 - (A - 1) * c - r) / a0]
    w = 2 * math.pi * 38.13547087602444 / SR; c = math.cos(w); al = math.sin(w) / (2 * 0.5003270373238773); a0 = 1 + al
    b2 = [(1 + c) / 2 / a0, -(1 + c) / a0, (1 + c) / 2 / a0]
    a2 = [1, (-2 * c) / a0, (1 - al) / a0]
    return lfilter(b2, a2, lfilter(b1, a1, x, axis=-1), axis=-1)


def envelope(x, hop=0.01):
    """Mono RMS per hop over all channels (samples.ts envelope)."""
    m = int(round(SR * hop))
    n = int(math.ceil(x.shape[-1] / m))
    p = np.pad(x, ((0, 0), (0, n * m - x.shape[-1])))
    return np.sqrt((p.reshape(x.shape[0], n, m) ** 2).mean(axis=(0, 2)))


def peak_rms(env, hop=0.01, win=0.1):
    k = max(1, int(round(win / hop)))
    e2 = env ** 2
    c = np.convolve(e2, np.ones(k), 'full')[: len(env)]
    div = np.minimum(np.arange(1, len(env) + 1), k)
    return float(np.sqrt(np.max(c / div))) if len(env) else 0.0


def game_level(x, loop=False):
    """What the game does to a recording's level (samples.ts cutSfx): (gain, loudness, peak, held_db).
    held_db < 0 means the peak ceiling (0.9) holds the sound under the common loudness."""
    pk = float(np.abs(x).max())
    env = envelope(k_weight(x))
    if loop:
        lv, target, mx = float(np.sqrt((env ** 2).mean())), 0.12, 6
    else:
        lv, target, mx = peak_rms(env), 0.19, 8
    g = min(mx, target / lv) if lv > 1e-4 else 1.0
    gs = min(g, 0.9 / pk) if pk > 0 else g
    return gs, lv, pk, 20 * math.log10(gs / g)


# ------------------------------------------------------------------ as the game plays it (src/audio/samples.ts)

_GAME = {}


def _game():
    """TIGHT, PUNCH and MIX_DB read from samples.ts itself, so this never drifts from the game."""
    if not _GAME:
        import re
        src = open(os.path.join(REPO, 'src', 'audio', 'samples.ts')).read()
        def ts_set(name):
            m = re.search(rf'export const {name}: ReadonlySet<string> = new Set\(\[(.*?)\]\)', src, re.S)
            return set(re.findall(r"'([^']+)'", m.group(1)))
        body = re.search(r'const MIX_DB[^{]*\{(.*?)\}\);', src, re.S).group(1)
        body = re.sub(r'//[^\n]*', '', body)
        _GAME.update(tight=ts_set('TIGHT'), punch=ts_set('PUNCH'), mix={k: float(v) for k, v in re.findall(r"'?([\w:-]+)'?: (-?[\d.]+)", body)})
    return _GAME


def cut_db(rid):
    g = _game()
    return -12 if rid in g['punch'] else -20 if rid in g['tight'] else -36


def mix_db(rid):
    return _game()['mix'].get(rid, -2.0)


def onset(x, rel_db, pre=0.003):
    env = envelope(x, 0.002)
    top = env.max()
    if top <= 0:
        return 0.0
    i = int(np.argmax(env >= top * 10 ** (rel_db / 20)))
    return max(0.0, i * round(SR * 0.002) / SR - pre)


def as_played(x, rid, loop=False):
    """A recording as samples.ts cutSfx leaves it (DC out, a one-shot cut at its onset and faded, levelled on its
    loudest 100 ms K-weighted with the peak held at 0.9; a loop on its average), times the mix table (MIX_DB)."""
    x = x - x.mean(axis=1, keepdims=True)
    g, lv, pk, held = game_level(x, loop)
    if loop:
        return x * g * 10 ** (mix_db(rid) / 20)
    a = int(onset(x, cut_db(rid)) * SR)
    y = end_trim(x[:, a:], -60, 0.012)
    k = min(y.shape[-1] // 4, int(0.002 * SR))
    y[:, :k] *= 0.5 - 0.5 * np.cos(np.pi * np.arange(k) / k)
    return y * g * 10 ** (mix_db(rid) / 20)
