# Lists the separate hits in recordings of several (the `hit` op's n), each with its level and length, so a recipe
# can name a take per variant. Freesound ids, pack paths or files. Nothing is played.
#   ~/.cache/rascal-ear/venv/bin/python scripts/sfx/hits.py 445781 kenney/kenney_impact-sounds/Audio/impactSoft_heavy_000.ogg [--gap=0.25] [--floor=-30]
import math, os, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dsp  # noqa: E402

args = [a for a in sys.argv[1:] if not a.startswith('--')]
opt = {a.split('=')[0][2:]: float(a.split('=')[1]) for a in sys.argv[1:] if a.startswith('--')}
for a in args:
    src = {'freesound': int(a)} if a.isdigit() else {'pack': a} if not os.path.exists(a) else None
    x = dsp.load(src) if src else dsp._read(a)
    on = dsp.hit_onsets(x, opt.get('gap', 0.25), opt.get('floor', -30))
    env = dsp.envelope(x, 0.01)
    rows = []
    for i, t in enumerate(on):
        nxt = on[i + 1] if i + 1 < len(on) else x.shape[-1] / dsp.SR
        seg = env[int(t / 0.01): int(nxt / 0.01)]
        pk = 20 * math.log10(seg.max() + 1e-9) if len(seg) else -99
        rows.append(f'{i}:{t:.2f}s {pk:.0f}dB {nxt - t:.2f}s')
    print(f'{a} ({x.shape[-1] / dsp.SR:.1f} s): ' + '  '.join(rows))
