# The mix: each track through EQ, compression, saturation, pan and level into a bus; buses into the master;
# sends into shared reverbs (Apple Space Designer impulse responses) and a tempo delay; the master through a
# glue compressor, a gentle clipper and a true-peak limiter to the loudness asked for.
import numpy as np
from numba import njit
from . import dsp

SR = dsp.SR


def chain(x, spec, key=None):
    """One channel strip. spec keys: eq, comp, sat, width, pan, gain, gate, chorus, delay_ins."""
    y = x
    if spec.get('hp'):
        y = dsp.hp2(y, spec['hp'])
    if spec.get('eq'):
        y = dsp.eq(y, spec['eq'])
    if spec.get('comp'):
        c = dict(spec['comp'])
        side = None
        if c.pop('key', None) is not None and key is not None:
            side = key
        y, _ = dsp.compress(y, side=side, **c)
    if spec.get('sat'):
        s = spec['sat']
        y = dsp.saturate(y, **(s if isinstance(s, dict) else {'drive_db': s}))
    if spec.get('eq2'):
        y = dsp.eq(y, spec['eq2'])
    if spec.get('chorus'):
        y = dsp.chorus(y, **spec['chorus'])
    if spec.get('mono'):
        m = y.mean(0)
        y = np.stack([m, m])
    if 'width' in spec:
        y = dsp.width(y, spec['width'])
    if 'pan' in spec:
        y = dsp.pan(y, spec['pan'])
    if 'gain' in spec:
        y = y * dsp.undb(spec['gain'])
    return y.astype(np.float32)


@njit(cache=True)
def _follow(x, a_att, a_rel):
    out = np.empty_like(x)
    cur = 0.0
    for i in range(x.shape[0]):
        v = x[i]
        if v > cur:
            cur = a_att * cur + (1 - a_att) * v
        else:
            cur = a_rel * cur + (1 - a_rel) * v
        out[i] = cur
    return out


def duck(x, key, depth_db=4.0, att_ms=4.0, rel_ms=140.0):
    """Sidechain dip: `x` drops by up to `depth_db` when `key` is loud."""
    env = np.abs(key).max(0).astype(np.float32)
    e = _follow(env, np.exp(-1 / (att_ms * SR / 1000)), np.exp(-1 / (rel_ms * SR / 1000)))
    e = e / (np.percentile(e, 99.5) + 1e-9)
    g = dsp.undb(-depth_db * np.clip(e, 0, 1))
    return (x * g[None, :]).astype(np.float32)


def mixdown(stems, spec, n):
    """stems: {track: (2, n)} (a kit gives 'drums.kick', 'drums.snare', ...). spec: tracks, buses, fx, master.
    Returns (master (2, n), report dict)."""
    tracks = spec.get('tracks', {})
    buses_spec = spec.get('buses', {})
    fx_spec = spec.get('fx', {})
    buses = {b: np.zeros((2, n), np.float32) for b in buses_spec}
    buses['master'] = np.zeros((2, n), np.float32)
    sends = {f: np.zeros((2, n), np.float32) for f in fx_spec}
    report = {'tracks': {}}
    processed = {}
    order = sorted(stems)
    # tracks keyed by others (sidechain) are processed after their keys
    for name in order:
        x = stems[name]
        s = tracks.get(name, {})
        key = None
        if s.get('comp', {}).get('key'):
            key = stems.get(s['comp']['key'])
        y = chain(x, s, key=key)
        if s.get('duck'):
            d = s['duck']
            y = duck(y, stems[d['by']], d.get('depth_db', 4), d.get('att_ms', 4), d.get('rel_ms', 140))
        processed[name] = y
        bus = s.get('bus', 'master')
        buses.setdefault(bus, np.zeros((2, n), np.float32))
        buses[bus] += y
        for f, lvl in s.get('sends', {}).items():
            sends[f] += y * dsp.undb(lvl)
        report['tracks'][name] = round(dsp.db(np.sqrt(np.mean(y ** 2)) + 1e-12), 1)
    # buses in dependency order: a bus may feed another bus
    done = set()
    def run_bus(b):
        if b in done or b == 'master':
            return
        bs = buses_spec.get(b, {})
        y = chain(buses[b], bs)
        for f, lvl in bs.get('sends', {}).items():
            sends[f] += y * dsp.undb(lvl)
        dest = bs.get('bus', 'master')
        if dest != 'master':
            run_bus_pre(dest)
        buses[dest] += y
        done.add(b)
    def run_bus_pre(b):
        buses.setdefault(b, np.zeros((2, n), np.float32))
    for b in sorted(buses_spec, key=lambda b: buses_spec[b].get('order', 0)):
        run_bus(b)
    for f, fs in fx_spec.items():
        if fs.get('kind', 'reverb') == 'delay':
            y = dsp.delay(sends[f], fs['time'], fb=fs.get('fb', 0.3), lp=fs.get('lp', 5000), hp=fs.get('hp', 300), pingpong=fs.get('pingpong', False))
        else:
            y = dsp.reverb(sends[f], fs['ir'], predelay_ms=fs.get('predelay', 0), hp=fs.get('hp', 250), lp=fs.get('lp', 9000), decay_scale=fs.get('decay', 1.0), width_=fs.get('width', 1.0))
        y = chain(y, {k: v for k, v in fs.items() if k in ('eq', 'comp', 'gain', 'width')})
        dest = fs.get('bus', 'master')
        buses[dest] += y
    m = buses['master']
    return m, processed, report


BANDS = [(20, 60), (60, 120), (120, 250), (250, 500), (500, 1000), (1000, 2000), (2000, 4000), (4000, 8000), (8000, 16000)]
# a modern mix's long-term balance (energy per band against the whole, dB): the mean of the shipped race songs
# that the judge and CLAP rate most polished (Harbour Loop, finale, meadow), the sub a little lighter for a live band
TARGET = [-16.5, -6.5, -7.0, -9.5, -9.5, -10.0, -11.5, -15.5, -21.0]


def profile(y):
    m = y.mean(0)
    S = np.zeros(2049)
    for i in range(0, len(m) - 4096, 8192):
        S += np.abs(np.fft.rfft(m[i:i + 4096] * np.hanning(4096))) ** 2
    f = np.fft.rfftfreq(4096, 1 / SR)
    tot = S.sum()
    return np.array([10 * np.log10(S[(f >= a) & (f < b)].sum() / tot + 1e-12) for a, b in BANDS])


def match_eq(y, target=None, amount=0.8, max_db=7.0, iters=3):
    """Tilt the mix's long-term octave balance toward `target` (reference mastering): a low shelf for the sub band,
    peaking filters at each octave's centre, a high shelf for the top. Returns (y, total gains per band)."""
    target = np.array(target or TARGET)
    total = np.zeros(len(BANDS))
    # the sub and the top move less: a shelf there swings the neighbouring octave too
    lim = np.array([3.0, max_db, max_db, max_db, max_db, max_db, max_db, max_db, 5.0])
    for _ in range(iters):
        cur = profile(y)
        diff = target - cur
        diff -= np.mean(diff)
        g = np.clip(diff * amount, -lim - total, lim - total)
        bands = [('lowshelf', 60, 0.7, float(g[0]))]
        for (a, b), gg in zip(BANDS[1:-1], g[1:-1]):
            bands.append(('peak', float(np.sqrt(a * b)), 1.1, float(gg)))
        bands.append(('highshelf', 8000, 0.7, float(g[-1])))
        y = dsp.eq(y, bands)
        total += g
    return y, [round(float(v), 1) for v in total]


def master(x, spec):
    """Match EQ toward the reference balance, EQ, glue compression, saturation, then gain to the target loudness
    into a true-peak limiter."""
    y = x
    rep = {}
    if spec.get('match', True):
        y, rep['matchEq'] = match_eq(y, spec.get('target'), spec.get('match_amount', 0.8), spec.get('match_max', 7.0))
    if spec.get('eq'):
        y = dsp.eq(y, spec['eq'])
    if spec.get('comp'):
        y, _ = dsp.compress(y, **spec['comp'])
    if spec.get('sat'):
        y = dsp.saturate(y, spec['sat'])
    target, ceil = spec.get('lufs', -12.0), spec.get('ceiling', -1.0)
    g = 0.0
    out = y
    for _ in range(4):
        z = y * dsp.undb(g)
        if spec.get('clip'):
            z = dsp.softclip(z * dsp.undb(spec['clip']), -0.1) * dsp.undb(-spec['clip'])
        out, gain = dsp.limit(z, ceil)
        l = dsp.lufs(out)
        g += target - l
        if abs(target - l) < 0.1:
            break
    rep.update({'lufs': round(dsp.lufs(out), 2), 'truePeak': round(dsp.true_peak_db(out), 2), 'gainDb': round(g, 2),
                'bands': [round(float(v), 1) for v in profile(out)]})
    return out, rep
