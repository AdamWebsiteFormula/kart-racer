# Fits the physical engine (physics.py) to real small engines by measurement, never by ear: each rpm band's
# 1/3-octave spectrum (100 Hz - 10 kHz) and its firing pulses' crest factor are matched to a reference recording
# (a CC0 dirt bike on Freesound at idle and at a held rev, the shipped high loop), by a seeded random search, then
# refined around the best. Prints the best parameters as JSON. Nothing is played.
#   ~/.cache/rascal-ear/venv/bin/python scripts/sfx/enginefit.py [evals] [--style=cartoon]
import json, math, os, sys
import numpy as np
import librosa

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import physics  # noqa: E402

SR = 44100
FS = os.path.expanduser('~/.cache/rascal-sfx/freesound')
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CENTRES = 100 * 2 ** (np.arange(0, 21) / 3)  # 100 Hz .. 10 kHz


def third_octaves(y):
    Y = np.abs(np.fft.rfft(y * np.hanning(len(y)))) ** 2
    f = np.fft.rfftfreq(len(y), 1 / SR)
    out = []
    for c in CENTRES:
        m = (f >= c / 2 ** (1 / 6)) & (f < c * 2 ** (1 / 6))
        out.append(Y[m].sum())
    db = 10 * np.log10(np.array(out) + 1e-20)
    return db - db.max()


def crest(y):
    # how peaky each firing is: the 10 ms envelope's 95th percentile over its median, dB
    env = np.sqrt(np.convolve(y ** 2, np.ones(441) / 441, 'same'))
    return 20 * math.log10(np.percentile(env, 95) / (np.median(env) + 1e-9) + 1e-9)


def target(path, a, b):
    y, _ = librosa.load(path, sr=SR, mono=True, offset=a, duration=b - a)
    return third_octaves(y), crest(y)


TARGETS = {
    1400: target(f'{FS}/450016.mp3', 2.0, 18.0),     # the dirt bike at idle (kyles, CC0)
    3800: target(f'{FS}/450016.mp3', 23.0, 28.0),    # its held rev
    6600: target(f'{REPO}/public/audio/sfx/engine-high.mp3', 0.0, 4.0),  # the shipped high loop (judged 9/8)
}

SPACE = {  # name: (low, high, log?)
    'd1': (0.00025, 0.0009, True), 'd2': (0.0004, 0.0016, True), 'd3': (0.0005, 0.002, True),
    'k1': (-0.7, -0.1, False), 'k2': (0.1, 0.7, False), 'rEnd': (-0.95, -0.6, False), 'endLp': (0.15, 0.7, False),
    'wallLp': (0.3, 0.9, False), 'tauBlow': (0.0004, 0.002, True), 'rasp': (0.05, 0.6, False), 'raspHz': (1200, 5000, True),
    'muffHz': (1200, 6000, True), 'muffQ': (0.5, 1.6, False), 'inLevel': (0.05, 0.5, True), 'blockLevel': (0.05, 0.5, True),
    'slap': (0.005, 0.08, True), 'drive': (1.0, 3.0, False), 'mechLevel': (0.01, 0.25, True), 'wallG': (0.85, 0.999, False),
    'sigma': (0.03, 0.2, False),
}


def render(p, rpm, load=1.0, seconds=1.2, seed=5):
    n = int(seconds * SR)
    parts = physics.engine_render(np.full(n, float(rpm)), np.full(n, load), np.zeros(n), p, seed)
    y = physics.engine_mix(parts, p)
    return y[int(0.2 * SR):]


def score(p):
    err = 0.0
    for rpm, (tgt, tc) in TARGETS.items():
        y = render(p, rpm)
        if not np.isfinite(y).all() or np.abs(y).max() < 1e-6:
            return 1e9
        d = third_octaves(y) - tgt
        d = d - d.mean()  # the shape only: the match EQ takes the rest, so keep what it must do small and smooth
        w = np.where(CENTRES < 4000, 1.0, 0.5)
        err += 0.5 * float(np.sqrt((w * d ** 2).mean())) + 1.0 * abs(crest(y) - min(tc, CREST_CAP[rpm]))
    return err / len(TARGETS)


# the crest a band can reach at its own firing rate (a 63 Hz engine cannot be as peaky as a 37 Hz one)
CREST_CAP = {1400: 12.0, 3800: 4.0, 6600: 2.0}


def eq_for(p):
    """Per band: the smoothed difference target - model (dB at each 1/3-octave centre), clamped to +-15 dB."""
    out = {}
    for rpm, (tgt, tc) in TARGETS.items():
        y = render(p, rpm, seconds=3.0)
        d = tgt - third_octaves(y)
        d = np.convolve(np.pad(d, 1, mode='edge'), [0.25, 0.5, 0.25], 'valid')
        d = np.clip(d - d.max() + 6, -15, 15)  # the loudest correction at +6 dB: mostly cuts, not boosts
        out[rpm] = [[round(float(c), 1), round(float(v), 1)] for c, v in zip(CENTRES, d)]
    return out


def sample(rng, around=None, scale=1.0):
    p = {}
    for k, (lo, hi, lg) in SPACE.items():
        if around is None:
            v = math.exp(rng.uniform(math.log(lo), math.log(hi))) if lg else rng.uniform(lo, hi)
        else:
            c = around[k]
            if lg:
                v = math.exp(math.log(c) + rng.normal(0, 0.25 * scale))
            else:
                v = c + rng.normal(0, 0.12 * scale * (hi - lo))
            v = min(max(v, lo), hi)
        p[k] = v
    return p


if __name__ == '__main__':
    evals = int(sys.argv[1]) if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else 300
    rng = np.random.default_rng(7)
    best, bs = None, 1e18
    for i in range(evals):
        p = sample(rng) if i < evals // 2 or best is None else sample(rng, best, 1.0 - 0.8 * i / evals)
        s = score(p)
        if s < bs:
            best, bs = p, s
            print(f'{i:4d} {bs:.2f}', flush=True)
    print(json.dumps({k: round(v, 6) for k, v in best.items()}))
    print(json.dumps(eq_for(best)))
    for rpm, (tgt, tc) in TARGETS.items():
        y = render(best, rpm)
        print(rpm, 'model', np.round(third_octaves(y)[::2], 0).tolist(), 'crest', round(crest(y), 1))
        print(rpm, 'target', np.round(tgt[::2], 0).tolist(), 'crest', round(tc, 1))
