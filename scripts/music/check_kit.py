# Renders two bars of a groove on the kit and the hand percussion (offline) and prints each stem's level.
import os, sys, time
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from studio import instruments, dsp
from studio.score import grid, Part
from studio.render import Ctx

t0 = time.time()
kit = instruments.get('kit')
print('pieces', {k: len(v.arts[k]) for k, v in kit.banks.items()})
ns = grid('x.....x...x.....|x.....x...x..x..', 'kick') + grid('....x..g....x...|....x..g....x.gx', 'snare') + \
    grid('x.x.x.x.x.x.x.xo|x.x.x.x.x.x.x.x.', 'hhc') + grid('x...............|................', 'crash')
ctx = Ctx(120, int(5 * dsp.SR), 1)
st = kit.render(ns, ctx, Part('drums', 'kit'))
for k, v in st.items():
    print(f'{k:6s} peak {dsp.db(np.abs(v).max()):6.1f} rms {dsp.db(np.sqrt(np.mean(v ** 2))):6.1f}')
print(f'{time.time() - t0:.1f}s')
for p in sys.argv[1:]:
    inst = instruments.get(p)
    strokes = sorted(inst.bank.arts)
    ns = grid('x.x.x.x.x.x.x.x.', strokes[0])
    y = inst.render(ns, Ctx(120, int(3 * dsp.SR), 1), Part(p, p))
    print(p, strokes, f'peak {dsp.db(np.abs(y).max()):.1f}')
