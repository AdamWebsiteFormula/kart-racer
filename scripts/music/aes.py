# A local ear for production quality, nothing played: Meta's Audiobox Aesthetics (fetched by get_aes.py) scores a
# file on four axes, 1-10: PQ production quality, PC production complexity, CE content enjoyment, CU usefulness.
#   python scripts/music/aes.py <file> [<file> ...]
import json, os, sys, types
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '.work', 'pylib'))
try:
    import tqdm.rich  # noqa: F401  (the package's download bar; not needed here)
except Exception:
    import tqdm
    mod = types.ModuleType('tqdm.rich')
    mod.tqdm = tqdm.tqdm
    sys.modules['tqdm.rich'] = mod
import soundfile as sf
import torch
from audiobox_aesthetics.infer import AesPredictor

_P = {}


def predictor():
    if 'p' not in _P:
        _P['p'] = AesPredictor(checkpoint_pth=None, batch_size=1)
    return _P['p']


def remote(route, payload):
    """Ask the shared ear server (earserver.py) when it is up; None when it is not (then this process computes)."""
    if os.environ.get('RASCAL_EAR_LOCAL'):
        return None
    import urllib.request
    port = os.environ.get('RASCAL_EAR_PORT', '8765')
    try:
        req = urllib.request.Request(f'http://127.0.0.1:{port}{route}', data=json.dumps(payload).encode(),
                                     headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=1800) as r:
            out = json.loads(r.read())
    except OSError:
        return None
    if isinstance(out, dict) and 'error' in out:
        raise RuntimeError(out['error'])
    return out


def score(path, start=None, end=None):
    got = remote('/aes', {'path': os.path.abspath(path), 'start': start, 'end': end})
    if got is not None:
        return got
    y, sr = sf.read(path, always_2d=True, dtype='float32')
    if start is not None:
        y = y[int(start * sr):int(end * sr)]
    wav = torch.from_numpy(y.T.copy())
    out = predictor().forward([{'path': wav, 'sample_rate': sr}])
    return {k: round(float(v), 2) for k, v in out[0].items()} if isinstance(out, list) else out


if __name__ == '__main__':
    for p in sys.argv[1:]:
        print(json.dumps({'file': os.path.basename(p), **score(p)}), flush=True)
