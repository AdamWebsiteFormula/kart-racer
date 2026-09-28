# Scores each part alone (its own channel strip, the song's reverbs, the master chain) with the production-quality
# ear, to find which sources sound cheap; nothing is played. Uses the stems cached by tune.py.
#   python scripts/music/solo.py skyline_synthwave [part ...]
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import soundfile as sf
import aes
from studio import dsp, mix
from tune import stems_for, WORK

name = sys.argv[1]
m, song, stems, n = stems_for(name)
groups = {}
for k in stems:
    groups.setdefault(k.split('.')[0], []).append(k)
want = sys.argv[2:] or sorted(groups)
for g in want:
    sub = {k: (v if k in groups[g] else np.zeros_like(v)) for k, v in stems.items()}
    bus, _, _ = mix.mixdown(sub, m.MIX, n)
    spec = dict(m.MIX.get('master', {}))
    spec['match'] = False
    y, rep = mix.master(bus, spec)
    L = min(y.shape[1], int(60 * dsp.SR))
    y = y[:, int(6 * dsp.SR):L]
    if np.abs(y).max() < 1e-4:
        continue
    p = os.path.join(WORK, 'solo.wav')
    sf.write(p, y.T, dsp.SR, subtype='PCM_16')
    print(g, aes.score(p), flush=True)
