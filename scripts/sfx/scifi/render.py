# Renders a recipe (the dict build.py reads) to a stereo float array, with the sci-fi toolkit loaded: the same steps as
# scripts/sfx/build.py (layers mixed, master, DC out, a loop made seamless or a one-shot's tail trimmed). Nothing is played.
import math, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..'))
import synth  # noqa: E402,F401  (extends dsp)
import dsp  # noqa: E402

SR = dsp.SR
LEAD = 0.1


def render(rec, lead=True):
    x = dsp.mix([dsp.render_layer(l) for l in rec['layers']])
    x = dsp.fx(x, rec.get('master'))
    x = dsp.remove_dc(x)
    if rec.get('loop'):
        x = dsp.loopify(x, rec['loop'], rec.get('xfade', 0.06))
    else:
        x = dsp.end_trim(x)
        if lead:
            x = np.pad(x, ((0, 0), (int(LEAD * SR), 0)))
    pk = np.abs(x).max()
    return x * (10 ** (-1.5 / 20) / (pk + 1e-12))


def write(path, x):
    dsp.write_wav(path, x)
