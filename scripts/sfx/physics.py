# Physical models for the sound-effect builder (dsp.py registers them): a struck object's modes, a tire's
# stick-slip squeal, a small two-stroke engine (a firing cylinder, its exhaust and intake pipes as waveguides, the
# block's modes, piston slap and the drive chain), a room's impulse response (image sources and a diffuse tail),
# and the shaping that turns a layer into a finished sound (transients, parallel saturation, an exciter).
# Every model is seeded, so a recipe remakes the same file. Stereo float64 (2, n) at SR. Nothing is played.
import math
import numpy as np
from numba import njit
from scipy.signal import fftconvolve, lfilter

SR = 44100


# ------------------------------------------------------------------ a repeatable random stream the engine's JS twin can match

@njit(cache=True)
def _xs(s):
    """xorshift32: the next state (a uint32 held in an int64)."""
    s ^= (s << 13) & 0xFFFFFFFF
    s ^= s >> 17
    s ^= (s << 5) & 0xFFFFFFFF
    return s & 0xFFFFFFFF


def _curve(pts, n, log=False):
    if isinstance(pts, (int, float)):
        return np.full(n, float(pts))
    pts = np.asarray(pts, dtype=np.float64)
    t = np.arange(n) / SR
    if log:
        return np.exp(np.interp(t, pts[:, 0], np.log(np.maximum(pts[:, 1], 1e-9))))
    return np.interp(t, pts[:, 0], pts[:, 1])


def _biquad(kind, hz, q=0.7071):
    hz = min(max(hz, 5.0), 0.49 * SR)
    w = 2 * math.pi * hz / SR
    c, s = math.cos(w), math.sin(w)
    al = s / (2 * q)
    if kind == 'lp':
        b = [(1 - c) / 2, 1 - c, (1 - c) / 2]
    elif kind == 'hp':
        b = [(1 + c) / 2, -(1 + c), (1 + c) / 2]
    else:  # band-pass, 0 dB peak
        b = [al, 0, -al]
    a = [1 + al, -2 * c, 1 - al]
    return np.array(b) / a[0], np.array(a) / a[0]


# ------------------------------------------------------------------ a struck object: modal synthesis

MATERIALS = {
    # mode ratios, T60 of the lowest (s, scaled by `ring`), how fast higher modes die (exponent), relative gains
    'rubber': ([1, 1.58, 2.21, 2.87, 3.52], 0.09, 1.3, [1, 0.55, 0.3, 0.18, 0.1]),
    'plastic': ([1, 1.73, 2.61, 3.47, 4.52, 5.63], 0.22, 1.1, [1, 0.7, 0.45, 0.3, 0.2, 0.12]),
    'wood': ([1, 2.57, 4.21, 6.13, 8.4], 0.18, 1.4, [1, 0.5, 0.28, 0.15, 0.08]),
    'metal': ([1, 2.76, 5.40, 8.93, 13.34, 18.64], 1.4, 0.7, [1, 0.8, 0.6, 0.45, 0.3, 0.2]),
    'hollow': ([1, 1.5, 1.98, 2.44, 2.9, 3.6], 0.3, 1.0, [1, 0.8, 0.6, 0.45, 0.35, 0.2]),  # a plastic shell: dense low modes
    'glass': ([1, 2.32, 4.25, 6.63, 9.38], 0.9, 0.8, [1, 0.6, 0.4, 0.25, 0.15]),
}


def syn_modal(a):
    """A struck object: `hz` its lowest mode, `material` (rubber|plastic|wood|metal|hollow|glass) or `modes`
    [[ratio, t60 s, gain]...]; `ring` scales every decay; `contact` s the contact time (a soft mallet or rubber:
    longer, darker); `glide` [[t, semitones]] bends every mode (a cartoon boink falls); `hits` [[t, gain, contact
    scale]] more strikes (a bounce, a rattle); `click` a contact click (0..1); `spread` cents between the channels;
    `inharm` a random detune of each mode (0..0.05); seed."""
    n = int(a['seconds'] * SR)
    rng = np.random.default_rng(int(a.get('seed', 1)))
    if 'modes' in a:
        ratios = [m[0] for m in a['modes']]; t60 = [m[1] for m in a['modes']]; gains = [m[2] for m in a['modes']]
    else:
        ratios, base, ex, gains = MATERIALS[a.get('material', 'plastic')]
        t60 = [base / (r ** ex) for r in ratios]
    ring = a.get('ring', 1.0)
    f0 = a['hz']
    t = np.arange(n) / SR
    glide = 2 ** (_curve(a.get('glide', 0.0), n) / 12)
    spread = a.get('spread', 4.0)
    inh = a.get('inharm', 0.01)
    hits = a.get('hits', [[0.0, 1.0, 1.0]])
    out = np.zeros((2, n))
    for c in range(2):
        det = 2 ** (((c - 0.5) * spread) / 1200)
        h = np.zeros(n)
        for r, tt, g in zip(ratios, t60, gains):
            f = f0 * r * det * (1 + inh * rng.uniform(-1, 1))
            if f > 0.45 * SR:
                continue
            ph = 2 * np.pi * np.cumsum(f * glide) / SR + rng.uniform(0, 2 * np.pi)
            h += g * np.exp(-6.91 * t / max(1e-4, tt * ring)) * np.sin(ph)
        y = np.zeros(n)
        for at, g, cs in hits:
            T = max(1.0 / SR, a.get('contact', 0.002) * cs)
            m = max(2, int(T * SR))
            force = np.sin(np.pi * np.arange(m) / m)  # a half-sine contact force (Hertz)
            i = int(at * SR)
            if i >= n:
                continue
            seg = fftconvolve(h[: n - i], force)[: n - i] / m * 4
            y[i:] += g * seg
            if a.get('click', 0):
                k = min(n - i, int(0.004 * SR))
                cl = rng.standard_normal(k) * np.exp(-np.arange(k) / (0.0006 * SR))
                b, aa = _biquad('hp', a.get('clickHz', 2500))
                y[i:i + k] += g * a['click'] * lfilter(b, aa, cl) * 0.5
        out[c] = y
    pk = np.abs(out).max()
    return out / (pk + 1e-12) * 0.5


# ------------------------------------------------------------------ a tire's squeal: stick-slip friction

@njit(cache=True)
def _stickslip(n, sr, w, zeta, fn, vb, mus, muk, vs, eps, sub):
    # a mass on a spring dragged by the road: friction falls with slip speed (Stribeck), so it sticks, lets go and
    # sticks again at the tread's own frequency; semi-implicit Euler, `sub` steps a sample
    x = 0.0
    v = 0.0
    y = np.zeros(n)
    h = 1.0 / (sr * sub)
    for i in range(n):
        for _ in range(sub):
            vr = vb[i] - v
            sgn = math.tanh(vr / eps)
            mu = (muk + (mus - muk) * math.exp(-(vr / vs) ** 2)) * sgn
            acc = -w[i] * w[i] * x - 2.0 * zeta * w[i] * v + fn[i] * mu
            v += h * acc
            x += h * v
        y[i] = v
    return y


def _smooth_noise(n, rate, rng):
    k = max(2, int(n * rate / SR) + 3)
    pts = rng.standard_normal(k)
    tt = np.linspace(0, k - 1, n)
    i = np.floor(tt).astype(int); f = tt - i
    i2 = np.minimum(i + 1, k - 1)
    ff = f * f * (3 - 2 * f)
    return pts[i] * (1 - ff) + pts[i2] * ff


def syn_squeal(a):
    """A tire squealing as it slides: `zones` stick-slip oscillators near `hz` (a few cents apart, `detune`), their
    pitch wandering (`wander` cents at `wanderRate` Hz, the load and slip changing) and the road's grain shaking the
    grip (`grain` 0..1 at `grainRate` Hz); `harsh` (0..1) how hard it sticks (more harmonics); `body` [[Hz, Q, gain]]
    the tire's carcass resonances it rings through; `scrub` (0..1) the rubber's broadband scrub under it; env; seed."""
    n = int(a['seconds'] * SR)
    rng = np.random.default_rng(int(a.get('seed', 1)))
    zones = int(a.get('zones', 3))
    f0 = a['hz']
    harsh = a.get('harsh', 0.5)
    env = _curve(a.get('env', 1.0), n)
    out = np.zeros((2, n))
    for c in range(2):
        acc = np.zeros(n)
        for z in range(zones):
            cents = (z - (zones - 1) / 2) * a.get('detune', 9.0) + rng.normal(0, 3)
            wand = a.get('wander', 60) * _smooth_noise(n, a.get('wanderRate', 3.0), rng) + a.get('jitter', 8) * _smooth_noise(n, 40, rng)
            f = f0 * 2 ** ((cents + wand) / 1200)
            w = 2 * np.pi * f
            grain = 1 + a.get('grain', 0.25) * _smooth_noise(n, a.get('grainRate', 90), rng)
            fn = (w ** 2) * 0.02 * (0.6 + 0.8 * harsh) * np.maximum(grain, 0.1)
            vb = np.full(n, 0.5) * (1 + 0.1 * _smooth_noise(n, 2, rng))
            y = _stickslip(n, SR, w, 0.004 + 0.02 * (1 - harsh), fn, vb, 0.9, 0.5, 0.18, 0.003, 4)
            y = y - np.convolve(y, np.ones(64) / 64, 'same')
            acc += y / (np.abs(y).max() + 1e-12) * (0.8 + 0.4 * rng.random())
        acc /= zones
        body = a.get('body', [[1200, 2.0, 1.0], [2300, 3.0, 0.5], [3600, 4.0, 0.25]])
        yb = np.zeros(n)
        for hz, q, g in body:
            b, aa = _biquad('bp', hz, q)
            yb += g * lfilter(b, aa, acc)
        y = 0.5 * acc + yb
        if a.get('scrub', 0):
            w = rng.standard_normal(n)
            b, aa = _biquad('bp', a.get('scrubHz', 1800), 0.6)
            sc = lfilter(b, aa, w) * (1 + 0.5 * _smooth_noise(n, 25, rng))
            y = y / (np.abs(y).max() + 1e-12) + a['scrub'] * sc / (np.abs(sc).max() + 1e-12)
        b, aa = _biquad('lp', a.get('top', 7000), 0.7)
        out[c] = lfilter(b, aa, y)
    out = out * env
    return out / (np.abs(out).max() + 1e-12) * 0.5


# ------------------------------------------------------------------ a small two-stroke engine

# the engine's parameters, in this order (the JS twin, src/audio/engineCore.ts, reads the same array)
ENGINE_KEYS = ['epo', 'epc', 'tauBlow', 'sigma', 'misfire', 'wander', 'wanderRate', 'd1', 'd2', 'd3', 'k1', 'k2', 'rEnd', 'endLp', 'wallG', 'wallLp',
               'rasp', 'raspHz', 'scav', 'inD', 'inLevel', 'inHiss', 'blockLevel', 'b1', 'b2', 'b3', 'b4', 'bq', 'slap', 'slapHz',
               'chain', 'chainRatio', 'clutchRpm', 'muffHz', 'muffQ', 'exLevel', 'drive', 'limitCut', 'cjit']
ENGINE_DEFAULTS = dict(
    epo=95.0, epc=265.0,          # exhaust port open and close, crank degrees after top dead centre
    tauBlow=0.0009,               # s: how fast the cylinder empties through the open port
    sigma=0.07,                   # cycle-to-cycle spread of each firing (grows at low load)
    misfire=0.25,                 # chance a cycle does not fire at no load (a two-stroke four-strokes off the throttle)
    wander=0.004, wanderRate=2.0,  # the rpm never holds perfectly still: its spread and how fast it moves (Hz)
    d1=0.00042, d2=0.00085, d3=0.0011,  # s: the exhaust's header, its chamber and the stinger/silencer run, one way
    k1=-0.45, k2=0.4,             # reflections: the chamber's diverging cone (a suction wave) and its converging cone (the plug)
    rEnd=-0.85, endLp=0.35,       # the open end: how much comes back, and how much only the lows do
    wallG=0.996, wallLp=0.55,     # pipe losses per pass, and their dulling
    rasp=0.35, raspHz=2600.0,     # turbulent rasp at the port, riding the flow
    scav=0.12,                    # the scavenging flow while the transfers are open
    inD=0.00045, inLevel=0.25, inHiss=0.15,  # the intake: its length, level, and the throttle's hiss off the gas
    blockLevel=0.18, b1=170.0, b2=410.0, b3=880.0, b4=1650.0, bq=6.0,  # the block's modes, rung by each firing
    slap=0.05, slapHz=3100.0,     # piston slap at the dead centres
    chain=0.02, chainRatio=11.0, clutchRpm=2600.0,  # the drive chain's whine (teeth a revolution), once the clutch bites
    muffHz=3200.0, muffQ=0.9,     # the silencer's low-pass
    exLevel=1.0, drive=1.6,       # exhaust level, and the gentle saturation of the whole
    limitCut=0.0,                 # the rev limiter: 0 off, 1 cutting the spark at 11 Hz
    cjit=0.012,                   # each firing a little early or late (a share of a cycle), never drifting
)


@njit(cache=True)
def _engine_core(rpm, load, limit, n, sr, p, seed, out):
    # p: ENGINE_KEYS order. out: (4, n) exhaust, intake, block, mechanical
    epo = p[0] / 360.0; epc = p[1] / 360.0; tau = p[2]; sigma = p[3]; misf = p[4]; wand = p[5]; wrate = p[6]
    d1 = p[7] * sr; d2 = p[8] * sr; d3 = p[9] * sr; k1 = p[10]; k2 = p[11]; rend = p[12]; endlp = p[13]; wg = p[14]; wlp = p[15]
    rasp = p[16]; raspHz = p[17]; scav = p[18]; ind = p[19] * sr; inlev = p[20]; inhiss = p[21]
    blk = p[22]; bq = p[27]; slap = p[28]; slapHz = p[29]; chain = p[30]; cratio = p[31]; crpm = p[32]; cjit = p[38]
    cmul = 1.0
    jprev = 0.0
    N = 4096
    R1 = np.zeros(N); L1 = np.zeros(N); R2 = np.zeros(N); L2 = np.zeros(N); R3 = np.zeros(N); L3 = np.zeros(N)
    RI = np.zeros(N); LI = np.zeros(N)
    wi = 0
    s = seed & 0xFFFFFFFF
    if s == 0:
        s = 1
    ph = 0.0
    chph = 0.0
    pc = 0.0
    acyc = 0.0
    opened = False
    lpend = 0.0
    wl1 = 0.0; wl2 = 0.0; wl3 = 0.0; wl4 = 0.0; wl5 = 0.0; wl6 = 0.0
    # block modes: 4 two-pole resonators; slap: one
    bf = np.array([p[23], p[24], p[25], p[26]])
    bz1 = np.zeros(4); bz2 = np.zeros(4)
    ba1 = np.zeros(4); ba2 = np.zeros(4); bg = np.zeros(4)
    for m in range(4):
        r = math.exp(-math.pi * bf[m] / (bq * sr))
        ba1[m] = -2.0 * r * math.cos(2.0 * math.pi * bf[m] / sr)
        ba2[m] = r * r
        bg[m] = (1.0 - r * r) * 0.5
    sr_ = math.exp(-math.pi * slapHz / (18.0 * sr))
    sa1 = -2.0 * sr_ * math.cos(2.0 * math.pi * slapHz / sr); sa2 = sr_ * sr_; sz1 = 0.0; sz2 = 0.0
    # rasp band-pass (biquad)
    w0 = 2.0 * math.pi * raspHz / sr; al = math.sin(w0) / (2.0 * 0.8); a0 = 1.0 + al
    rb0 = al / a0; rb2 = -al / a0; ra1 = -2.0 * math.cos(w0) / a0; ra2 = (1.0 - al) / a0
    rx1 = 0.0; rx2 = 0.0; ry1 = 0.0; ry2 = 0.0
    wv = 0.0; wt = 0.0; wcount = 0
    wstep = int(sr / max(0.1, wrate))
    limph = 0.0
    cut = False
    for i in range(n):
        # the rpm's own slow wander
        if wcount <= 0:
            s = _xs(s); u1 = s / 4294967296.0
            s = _xs(s); u2 = s / 4294967296.0
            wt = (u1 + u2 - 1.0) * 1.7
            wcount = wstep
        wcount -= 1
        wv += (wt - wv) * (1.0 / wstep) * 2.0
        f = rpm[i] / 60.0 * (1.0 + wand * wv) * cmul
        ph += f / sr
        newcyc = False
        if ph >= 1.0:
            ph -= 1.0
            newcyc = True
        # the limiter cuts the spark in bursts at 11 Hz
        limph += 11.0 / sr
        if limph >= 1.0:
            limph -= 1.0
        cut = limit[i] > 0.0 and limph < 0.5 * limit[i]
        if newcyc:
            ld = load[i]
            s = _xs(s); u = s / 4294967296.0
            s = _xs(s); g1 = s / 4294967296.0
            s = _xs(s); g2 = s / 4294967296.0
            s = _xs(s); g3 = s / 4294967296.0
            gauss = (g1 + g2 + g3 - 1.5) * 2.0
            mp = misf * (1.0 - ld) * (1.0 - ld)
            # a slow engine fires less evenly than a fast one
            sg = sigma * (1.0 + 2.0 * (1.0 - ld)) * min(1.5, max(0.4, (2500.0 / max(rpm[i], 100.0)) ** 0.6))
            # the next firing a little early or late: the offset's difference, so the timing never drifts away
            s = _xs(s); h1 = s / 4294967296.0
            s = _xs(s); h2 = s / 4294967296.0
            jn = (h1 + h2 - 1.0) * 2.45 * cjit
            cmul = 1.0 / max(0.5, 1.0 + jn - jprev)
            jprev = jn
            if u < mp or cut:
                acyc = 0.04 + 0.04 * ld
            else:
                acyc = (0.12 + 0.88 * ld ** 0.8) * max(0.2, 1.0 + sg * gauss)
            opened = False
        # piston position (0 at top, 1 at bottom) and the exhaust port's opening
        th = ph * 2.0 * math.pi
        x = 0.5 - 0.5 * math.cos(th)
        xe = 0.5 - 0.5 * math.cos(epo * 2.0 * math.pi)
        A = 0.0
        if ph > epo and ph < epc and x > xe:
            A = (x - xe) / (1.0 - xe)
            if not opened:
                pc = acyc
                opened = True
        pc -= pc * A / (tau * sr)
        if pc < 0.0:
            pc = 0.0
        flow = A * (pc ** 0.75)
        # scavenging: the transfers open 25 degrees after the exhaust
        tpo = epo + 25.0 / 360.0
        if ph > tpo and ph < epc:
            flow += scav * load[i] * A * math.sin(math.pi * (ph - tpo) / (epc - tpo))
        s = _xs(s); wn = s / 2147483648.0 - 1.0
        # the rasp: band-passed turbulence riding the flow
        rx = wn * flow
        ry = rb0 * rx + rb2 * rx2 - ra1 * ry1 - ra2 * ry2
        rx2 = rx1; rx1 = rx; ry2 = ry1; ry1 = ry
        src = flow + rasp * ry * 3.0
        # ---- the exhaust: three pipe sections as waveguides
        j = wi - d1; jf = math.floor(j); fr = j - jf; a_ = int(jf) & (N - 1); b_ = (a_ + 1) & (N - 1)
        r1o = R1[a_] * (1.0 - fr) + R1[b_] * fr; l1o = L1[a_] * (1.0 - fr) + L1[b_] * fr
        j = wi - d2; jf = math.floor(j); fr = j - jf; a_ = int(jf) & (N - 1); b_ = (a_ + 1) & (N - 1)
        r2o = R2[a_] * (1.0 - fr) + R2[b_] * fr; l2o = L2[a_] * (1.0 - fr) + L2[b_] * fr
        j = wi - d3; jf = math.floor(j); fr = j - jf; a_ = int(jf) & (N - 1); b_ = (a_ + 1) & (N - 1)
        r3o = R3[a_] * (1.0 - fr) + R3[b_] * fr; l3o = L3[a_] * (1.0 - fr) + L3[b_] * fr
        # wall losses: a little level and a little top each pass
        wl1 += wlp * (r1o * wg - wl1); wl2 += wlp * (l1o * wg - wl2); wl3 += wlp * (r2o * wg - wl3)
        wl4 += wlp * (l2o * wg - wl4); wl5 += wlp * (r3o * wg - wl5); wl6 += wlp * (l3o * wg - wl6)
        r1o = wl1; l1o = wl2; r2o = wl3; l2o = wl4; r3o = wl5; l3o = wl6
        rp = 1.0 - 0.7 * A
        R1[wi] = rp * l1o + src
        R2[wi] = (1.0 + k1) * r1o - k1 * l2o
        L1[wi] = k1 * r1o + (1.0 - k1) * l2o
        R3[wi] = (1.0 + k2) * r2o - k2 * l3o
        L2[wi] = k2 * r2o + (1.0 - k2) * l3o
        lpend += endlp * (r3o - lpend)
        L3[wi] = rend * lpend
        ex = r3o + rend * lpend
        # ---- the intake: the reed opens as the piston climbs, sucking through the carburettor
        ai = 0.0
        if ph > 0.58 and ph < 0.95:
            ai = math.sin(math.pi * (ph - 0.58) / 0.37)
        s = _xs(s); wn2 = s / 2147483648.0 - 1.0
        isrc = ai * (0.3 + 0.7 * load[i]) * (0.6 + 0.4 * wn2) + inhiss * (1.0 - load[i]) * wn2 * 0.3
        j = wi - ind; jf = math.floor(j); fr = j - jf; a_ = int(jf) & (N - 1); b_ = (a_ + 1) & (N - 1)
        rio = RI[a_] * (1.0 - fr) + RI[b_] * fr; lio = LI[a_] * (1.0 - fr) + LI[b_] * fr
        RI[wi] = 0.9 * lio + isrc
        LI[wi] = -0.8 * rio
        ino = rio - 0.8 * rio
        # ---- the block: each firing's pressure rings its modes
        fb = 0.0
        if ph < 0.12:
            fb = acyc * math.exp(-((ph - 0.04) / 0.03) ** 2)
        bo = 0.0
        for m in range(4):
            yb = bg[m] * fb - ba1[m] * bz1[m] - ba2[m] * bz2[m]
            bz2[m] = bz1[m]; bz1[m] = yb
            bo += yb * (1.0 - 0.18 * m)
        # ---- piston slap at the dead centres, and the chain once the clutch bites
        imp = 0.0
        if newcyc:
            imp = slap * (0.4 + 0.6 * load[i])
        if ph >= 0.5 and ph - f / sr < 0.5:
            imp = slap * 0.6
        ys = imp - sa1 * sz1 - sa2 * sz2
        sz2 = sz1; sz1 = ys
        chph += f * cratio / sr
        if chph >= 1.0:
            chph -= 1.0
        s = _xs(s); wn3 = s / 2147483648.0 - 1.0
        cg = 0.0
        if rpm[i] > crpm:
            cg = min(1.0, (rpm[i] - crpm) / 800.0)
        mo = ys + chain * cg * math.sin(2.0 * math.pi * chph) * (0.8 + 0.2 * wn3)
        out[0, i] = ex
        out[1, i] = ino
        out[2, i] = bo
        out[3, i] = mo
        wi = (wi + 1) & (N - 1)


def engine_params(a):
    p = dict(ENGINE_DEFAULTS)
    for k in ENGINE_KEYS:
        if k in a:
            p[k] = float(a[k])
    return np.array([p[k] for k in ENGINE_KEYS], dtype=np.float64)


def engine_render(rpm, load, limit, a, seed):
    n = len(rpm)
    out = np.zeros((4, n))
    _engine_core(np.ascontiguousarray(rpm, dtype=np.float64), np.ascontiguousarray(load, dtype=np.float64),
                 np.ascontiguousarray(limit, dtype=np.float64), n, float(SR), engine_params(a), int(seed), out)
    return out


# each source's level at 3800 rpm, full load, default knobs (RMS): the mix sets their balance against these, so a
# source's own swing with rpm and load (the exhaust dropping off the gas, the chain coming in) is kept
ENGINE_CAL = dict(ex=0.0835, intake=0.0277, block=1.143, mech=0.026)


def engine_mix(parts, a):
    """The four sources into one engine: exhaust through the silencer, intake, block and mechanics at their levels
    (`exLevel`, `inLevel`, `blockLevel`, `mechLevel`, against the calibration), peak-normalized, then driven."""
    ex, ino, bo, mo = parts
    b, aa = _biquad('hp', 20)
    ex = lfilter(b, aa, ex)  # no DC: the flow's mean does not radiate
    b, aa = _biquad('lp', a.get('muffHz', ENGINE_DEFAULTS['muffHz']), a.get('muffQ', ENGINE_DEFAULTS['muffQ']))
    ex = lfilter(b, aa, np.diff(ex, prepend=ex[0]) * 20)  # radiated pressure: the outlet's flow, differentiated
    b, aa = _biquad('hp', 90)
    ino = lfilter(b, aa, ino)
    C = ENGINE_CAL
    y = (a.get('exLevel', 1.0) * ex / C['ex'] + a.get('inLevel', ENGINE_DEFAULTS['inLevel']) * ino / C['intake']
         + a.get('blockLevel', ENGINE_DEFAULTS['blockLevel']) * bo / C['block'] + a.get('mechLevel', 0.06) * mo / C['mech'])
    d = a.get('drive', ENGINE_DEFAULTS['drive'])
    y = y / (np.abs(y).max() + 1e-12)
    return np.tanh(y * d) / math.tanh(d)


def match_fir(curve_db, centres, taps=2049):
    """A linear-phase FIR whose response follows `curve_db` at the 1/3-octave `centres` (interpolated in log
    frequency, flat beyond the ends): a match EQ, as a mixer would dial in against a reference."""
    f = np.fft.rfftfreq(taps * 2, 1 / SR)
    lf = np.log(np.maximum(f, 1.0))
    g = np.interp(lf, np.log(centres), curve_db, left=curve_db[0], right=curve_db[-1])
    H = 10 ** (g / 20)
    h = np.fft.irfft(H)
    h = np.roll(h, taps // 2)[:taps] * np.hanning(taps)
    return h


def syn_piston(a):
    """A small two-stroke kart engine (a physical model, `ENGINE_DEFAULTS` for every knob): `rpm` [[t, rpm]] (fires
    at rpm / 60), `load` [[t, 0..1]] (the gas: 1 pulling, 0 coasting), `limit` [[t, 0..1]] the rev limiter; seed.
    `width` (0..1) decorrelates the two channels a little (the second a different seed of the same engine)."""
    n = int(a['seconds'] * SR)
    rpm = _curve(a['rpm'], n)
    load = np.clip(_curve(a.get('load', 1.0), n), 0, 1)
    limit = np.clip(_curve(a.get('limit', 0.0), n), 0, 1)
    seed = int(a.get('seed', 1))
    y = engine_mix(engine_render(rpm, load, limit, a, seed), a)
    w = a.get('width', 0.0)
    y2 = engine_mix(engine_render(rpm, load, limit, a, seed + 7919), a) if w > 0 else y
    out = np.stack([y * (1 - w / 2) + y2 * w / 2, y2 * (1 - w / 2) + y * w / 2]) if w > 0 else np.stack([y, y])
    if 'eq' in a:  # a match EQ: [[Hz, dB], ...] at 1/3-octave centres (enginefit.py)
        pts = np.asarray(a['eq'], dtype=np.float64)
        h = match_fir(pts[:, 1], pts[:, 0])
        k = len(h) // 2
        out = np.stack([fftconvolve(c, h)[k:k + n] for c in out])
    return out / (np.abs(out).max() + 1e-12) * 0.5


# ------------------------------------------------------------------ a real engine, one firing at a time (granular)

def cycle_grains(y, f_est, sr=SR, pre=0.0015, span=1.8):
    """Cut a steady stretch of a real engine into its firings: onsets found on the pressure envelope (peaks at least
    0.7 of a cycle apart, each moved back to its steepest rise), each grain from `pre` s before its onset for `span`
    cycles. Returns (grains, their RMS)."""
    from scipy.signal import hilbert, butter, sosfiltfilt, find_peaks
    env = np.abs(hilbert(y))
    env = sosfiltfilt(butter(2, min(0.45 * sr, 4 * f_est * 3), 'lp', fs=sr, output='sos'), env)
    pk, _ = find_peaks(env, distance=int(0.7 * sr / f_est), prominence=np.std(env) * 0.3)
    d = np.diff(env, prepend=env[0])
    grains, rms = [], []
    L = int(span * sr / f_est)
    for p in pk:
        a = max(0, p - int(0.6 * sr / f_est))
        rise = a + int(np.argmax(d[a:p + 1]))
        s = rise - int(pre * sr)
        if s < 0 or s + L > len(y):
            continue
        g = y[s:s + L].copy()
        grains.append(g)
        rms.append(float(np.sqrt((g[: int(sr / f_est)] ** 2).mean())))
    return grains, np.array(rms)


def syn_grains(a):
    """A real engine replayed one firing at a time at any rpm (the grain technique racing games use): grains cut from
    a steady stretch of a CC0 recording (`fs` its Freesound id, `from`/`to` s, `f` its firing Hz) are laid down at `rpm` [[t,
    rpm]] / 60 x `cyl` a second, each held for `hold` cycles and faded, picked at random (never the same twice
    running), their level spread kept within `spread` dB of the median, with `jitter` (0..0.05) timing wobble and
    `skip` (0..1) the share of weak firings (coasting); a
    second pool (`fs2`, `from2`, `to2`, `f2`) crossfades in by `mix2` [[t, 0..1]]. Mono engine, both channels; seed."""
    import dsp as _dsp
    n = int(a['seconds'] * SR)
    rng = np.random.default_rng(int(a.get('seed', 1)))
    rpm = _curve(a['rpm'], n)
    cyl = a.get('cyl', 1)
    f = rpm / 60.0 * cyl

    def pool(src, t0, t1, fe):
        y = _dsp.load(src).mean(axis=0)[int(t0 * SR):int(t1 * SR)]
        b, aa = _biquad('hp', a.get('hp', 40))
        y = lfilter(b, aa, y)
        gs, r = cycle_grains(y, fe)
        med = np.median(r)
        # the odd grain with a click, a bird or a knock in it: its brightness far off the others' is left out
        cen = []
        for g in gs:
            G = np.abs(np.fft.rfft(g * np.hanning(len(g))))
            ff = np.fft.rfftfreq(len(g), 1 / SR)
            cen.append(float((G * ff).sum() / (G.sum() + 1e-12)))
        cen = np.array(cen)
        q1, q3 = np.percentile(cen, [25, 75])
        ok = (cen > q1 - 0.8 * (q3 - q1)) & (cen < q3 + 0.8 * (q3 - q1))
        # and a grain with a click in it (its peak far over its level)
        cr = np.array([np.abs(g).max() / (np.sqrt((g ** 2).mean()) + 1e-12) for g in gs])
        c1, c3 = np.percentile(cr, [25, 75])
        ok &= cr < c3 + 0.8 * (c3 - c1)
        keep = [g for g, rr, o in zip(gs, r, ok) if o and abs(20 * np.log10(rr / med)) < a.get('spread', 4.0)]
        return [g / med for g in keep]

    P1 = pool({'freesound': int(a['fs'])}, a['from'], a['to'], a['f'])
    P2 = pool({'freesound': int(a['fs2'])}, a['from2'], a['to2'], a['f2']) if 'fs2' in a else None
    mix2 = _curve(a.get('mix2', 0.0), n)
    out = np.zeros(n + int(0.2 * SR))
    t = 0.0
    last1 = last2 = -1
    hold = a.get('hold', 1.5)
    jit = a.get('jitter', 0.01)
    while True:
        i = int(t * SR)
        if i >= n:
            break
        per = 1.0 / max(1.0, f[i])
        L = int(hold * per * SR)
        fade = max(8, int(0.35 * L))
        w = np.ones(L); w[-fade:] = np.cos(np.linspace(0, np.pi / 2, fade)) ** 2
        w[:24] *= np.sin(np.linspace(0, np.pi / 2, 24)) ** 2
        weak = rng.random() < a.get('skip', 0.0)  # off the gas a two-stroke misses: a weak firing now and then
        for P, mixw, which in ((P1, 1 - mix2[i], 1), (P2, mix2[i], 2)):
            if P is None or mixw <= 0.001:
                continue
            if weak:
                mixw *= 0.03
            k = int(rng.integers(len(P)))
            if (which == 1 and k == last1) or (which == 2 and k == last2):
                k = (k + 1) % len(P)
            if which == 1:
                last1 = k
            else:
                last2 = k
            g = P[k]
            m = min(L, len(g))
            out[i:i + m] += g[:m] * w[:m] * math.sqrt(mixw) * (1 + a.get('ampVar', 0.1) * rng.normal())
        t += per * (1 + jit * rng.normal())
    y = out[:n]
    y = y / (np.abs(y).max() + 1e-12) * 0.5
    return np.stack([y, y])


# ------------------------------------------------------------------ a room's impulse response

def room_ir(size=(6.0, 4.0, 3.0), src=(2.0, 1.5, 1.2), mic=(3.5, 2.2, 1.5), absorb=0.35, order=6, tail=0.4, tailLevel=0.25,
            hp=200, lp=9000, seed=11, sr=SR):
    """A shoebox room's impulse response: image sources to `order` (each wall absorbing `absorb`, highs a little more
    each bounce), then a diffuse tail decaying to -60 dB over `tail` s; stereo from two mics 17 cm apart."""
    rng = np.random.default_rng(seed)
    Lx, Ly, Lz = size
    c = 343.0
    n = int((tail * 1.2 + 0.08) * sr)
    out = np.zeros((2, n))
    refl = 1 - absorb
    for ch, dx in enumerate((-0.085, 0.085)):
        mx, my, mz = mic[0] + dx, mic[1], mic[2]
        rng_o = range(-order, order + 1)
        for i in rng_o:
            for j in rng_o:
                for k in rng_o:
                    b = abs(i) + abs(j) + abs(k)
                    if b > order:
                        continue
                    x = (i * Lx + (src[0] if i % 2 == 0 else Lx - src[0]))
                    y = (j * Ly + (src[1] if j % 2 == 0 else Ly - src[1]))
                    z = (k * Lz + (src[2] if k % 2 == 0 else Lz - src[2]))
                    d = math.sqrt((x - mx) ** 2 + (y - my) ** 2 + (z - mz) ** 2)
                    t = d / c
                    idx = t * sr
                    if idx >= n - 2:
                        continue
                    g = (refl ** b) / max(d, 0.3)
                    i0 = int(idx); fr = idx - i0
                    out[ch, i0] += g * (1 - fr)
                    out[ch, i0 + 1] += g * fr
        # the diffuse tail after the early reflections
        t = np.arange(n) / sr
        start = 0.012
        env = np.exp(-6.91 * np.maximum(t - start, 0) / tail) * (t >= start) * np.minimum(1, (t - start + 1e-9) / 0.01)
        tl = rng.standard_normal(n) * env
        dirmax = np.abs(out[ch]).max()
        out[ch] += tl * tailLevel * dirmax * 0.08
    # highs die first in the tail: split and fade the top
    b, aa = _biquad('hp', hp)
    out = lfilter(b, aa, out, axis=-1)
    b, aa = _biquad('lp', lp)
    out = lfilter(b, aa, out, axis=-1)
    return out / (np.sqrt((out ** 2).sum(axis=1, keepdims=True)) + 1e-12)


def fx_room(x, s):
    """A real room (image sources and a diffuse tail): `mix` wet share (equal power), `size` [x, y, z] m, `absorb`,
    `tail` s, `pre` s pre-delay, `hp`/`lp` the wet's band."""
    ir = room_ir(tuple(s.get('size', (6.0, 4.0, 3.0))), absorb=s.get('absorb', 0.35), tail=s.get('tail', 0.4),
                 tailLevel=s.get('tailLevel', 0.25), hp=s.get('hp', 200), lp=s.get('lp', 9000), seed=s.get('seed', 11))
    pre = int(s.get('pre', 0.0) * SR)
    if pre:
        ir = np.pad(ir, ((0, 0), (pre, 0)))
    # the direct sound is the dry signal: drop the IR's own direct path
    d0 = np.argmax(np.abs(ir[0]) > 0.5 * np.abs(ir[0]).max())
    ir[:, : d0 + 2] = 0
    wet = np.stack([fftconvolve(x[c], ir[c]) for c in range(2)])
    dry = np.pad(x, ((0, 0), (0, wet.shape[-1] - x.shape[-1])))
    m = s['mix']
    wet = wet / (np.sqrt((wet ** 2).mean()) + 1e-12) * np.sqrt((dry ** 2).mean() + 1e-12)
    return dry * math.cos(m * math.pi / 2) + wet * math.sin(m * math.pi / 2)


# ------------------------------------------------------------------ finishing: transients, saturation, air

def _follow(x, att, rel):
    e = np.abs(x).max(axis=0)
    out = np.empty_like(e)
    a1, r1 = math.exp(-1 / (att * SR)), math.exp(-1 / (rel * SR))
    return _follow_nb(e, a1, r1, out)


@njit(cache=True)
def _follow_nb(e, a1, r1, out):
    v = 0.0
    for i in range(e.shape[0]):
        c = a1 if e[i] > v else r1
        v = c * v + (1 - c) * e[i]
        out[i] = v
    return out


def fx_transient(x, s):
    """A transient shaper: `attack` dB more (or less) on each onset, `sustain` dB on what rings after it (the
    difference of a fast and a slow envelope, so it follows the sound, not its level)."""
    fast = _follow(x, 0.0005, 0.02)
    slow = _follow(x, 0.02, 0.02)
    onset = np.clip((fast - slow) / (fast + 1e-9), 0, 1)
    tail = np.clip((slow - fast) / (slow + 1e-9), 0, 1)
    g = 10 ** ((s.get('attack', 0) * onset + s.get('sustain', 0) * tail) / 20)
    return x * g


def fx_sat(x, s):
    """Parallel saturation: `drive` into a soft clipper (`asym` adds even harmonics, a warmer, tube-like edge),
    blended in by `mix` and matched in level, `hz` (optional) only above that frequency (an exciter)."""
    d = s.get('drive', 3.0)
    src = x
    if s.get('hz'):
        b, aa = _biquad('hp', s['hz'])
        src = lfilter(b, aa, x, axis=-1)
    asym = s.get('asym', 0.0)
    y = np.tanh(src * d + asym) - math.tanh(asym)
    y = y / (np.sqrt((y ** 2).mean()) + 1e-12) * (np.sqrt((src ** 2).mean()) + 1e-12)
    b, aa = _biquad('hp', 20)
    y = lfilter(b, aa, y, axis=-1)
    return x + s.get('mix', 0.3) * y if s.get('hz') else x * (1 - s.get('mix', 0.3)) + y * s.get('mix', 0.3)


def fx_gate(x, s):
    """A soft gate/expander: below `threshold` dB (of the peak) the level falls by `ratio`, over `release` s."""
    e = _follow(x, 0.001, s.get('release', 0.05))
    thr = np.abs(x).max() * 10 ** (s.get('threshold', -40) / 20)
    g = np.where(e < thr, (e / (thr + 1e-12)) ** (s.get('ratio', 2.0) - 1), 1.0)
    return x * g


def fx_doppler(x, s):
    """A pass-by: the source goes past at `speed` m/s, `dist` m from the ear, closest at `at` s: its pitch falls
    (Doppler), its level swells and fades (1 / distance), the far side a little duller, panned across."""
    n = x.shape[-1]
    t = np.arange(n) / SR
    v, d0, t0 = s.get('speed', 30.0), s.get('dist', 3.0), s.get('at', n / SR / 2)
    c = 343.0
    xpos = v * (t - t0)
    dist = np.sqrt(xpos ** 2 + d0 ** 2)
    delay = dist / c
    pos = (t - delay + delay[0]) * SR
    pos = np.clip(pos, 0, n - 3)
    from dsp import _interp_read  # noqa
    y = np.stack([_interp_read(np.ascontiguousarray(ch), pos) for ch in x])
    g = d0 / dist
    pan = np.clip(xpos / (np.abs(xpos).max() + 1e-9) * s.get('pan', 0.8), -1, 1)
    th = (pan + 1) * np.pi / 4
    m = (y[0] + y[1]) / 2 * g
    return np.stack([m * np.cos(th), m * np.sin(th)]) * math.sqrt(2)
