# Mix experiments without re-rendering the parts (nothing played): render a song's stems once, then try variants of
# its mix and master and score each with the local production-quality ear (aes.py) on the whole song and per
# section. A variant is a Python dict of changes: {'master.match_amount': 0.5, 'fx.room.gain': -6, 'tracks.bass.gain': 2}
#   python scripts/music/tune.py harbour_loop "{}" "{'master.match': False}" ...
import copy, importlib, json, os, pickle, sys, time
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from studio import dsp, mix
from studio.produce import render_stems, fold_loop

WORK = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.work')


def stems_for(name, fresh=False):
    m = importlib.import_module('songs.' + name)
    path = os.path.join(WORK, f'{name}-stems.pkl')
    song = m.compose()
    if os.path.exists(path) and not fresh:
        stems, n = pickle.load(open(path, 'rb'))
    else:
        notes = song.finalize()
        stems, n = render_stems(song, notes)
        os.makedirs(WORK, exist_ok=True)
        pickle.dump((stems, n), open(path, 'wb'), protocol=4)
    return m, song, stems, n


def apply(spec, changes):
    spec = copy.deepcopy(spec)
    for key, val in changes.items():
        # 'tracks/edrums.kick/gain' when a name holds a dot, else 'tracks.bass.gain'
        parts = key.split('/') if '/' in key else key.split('.')
        d = spec
        for p in parts[:-1]:
            d = d.setdefault(p, {})
        if val is None:
            d.pop(parts[-1], None)
        else:
            d[parts[-1]] = val
    return spec


def run(m, song, stems, n, changes, sections=True):
    import aes
    spec = apply(m.MIX, changes)
    bus, _, _ = mix.mixdown(stems, spec, n)
    y, rep = mix.master(bus, spec.get('master', {}))
    y, a_s, b_s = fold_loop(y, song)
    tmp = os.path.join(WORK, f'tune-{song.track}-{os.getpid()}.wav')  # one file per process: composers run at once
    import soundfile as sf
    sf.write(tmp, y.T, dsp.SR, subtype='PCM_16')
    res = {'all': aes.score(tmp)}
    if os.environ.get('SCREEN'):
        import screen
        sc = screen.screen(tmp)
        res['screen'] = {k: sc[k] for k in ('verdict', 'reasons', 'clapCoolVsCartoon', 'clap5')}
    if sections:
        res['first30'] = aes.score(tmp, 0, 30)['PQ']
        res['last30'] = aes.score(tmp, y.shape[1] / dsp.SR - 30, y.shape[1] / dsp.SR)['PQ']
    if os.environ.get('TIMELINE'):
        L = y.shape[1] / dsp.SR
        res['timeline'] = [(round(t0 / song.bar_s, 1), aes.score(tmp, t0, min(L, t0 + 10))['PQ']) for t0 in np.arange(0, L - 5, 5.0)]
    res['lufs'] = rep['lufs']
    res['matchEq'] = rep.get('matchEq')
    return res


if __name__ == '__main__':
    name = sys.argv[1]
    fresh = '--fresh' in sys.argv
    variants = [a for a in sys.argv[2:] if not a.startswith('--')] or ['{}']
    from studio.lock import heavy
    with heavy('tune ' + name):
        m, song, stems, n = stems_for(name, fresh)
        for v in variants:
            t0 = time.time()
            ch = eval(v)
            r = run(m, song, stems, n, ch)
            print(json.dumps({'variant': v, **r, 's': round(time.time() - t0)}), flush=True)
