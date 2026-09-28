# Renders a song's stems (nothing played) and prints each processed track's level and octave balance, to see
# what makes a mix dark, muddy or thin before touching the master.
#   python scripts/music/stems.py songs/harbour_loop.py
import importlib.util, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from studio import dsp, mix
from studio.produce import render_stems

EDGES = [20, 60, 120, 250, 500, 1000, 2000, 4000, 8000, 16000]


def octaves(x):
    m = x.mean(0)
    S = np.abs(np.fft.rfft(m * np.hanning(len(m)))) ** 2
    f = np.fft.rfftfreq(len(m), 1 / dsp.SR)
    return [10 * np.log10(S[(f >= a) & (f < b)].sum() + 1e-12) for a, b in zip(EDGES[:-1], EDGES[1:])]


path = sys.argv[1]
spec = importlib.util.spec_from_file_location('song', path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
from studio.lock import heavy
_slot = heavy('stems')
_slot.__enter__()
song = mod.compose()
notes = song.finalize()
stems, n = render_stems(song, notes)
bus, processed, rep = mix.mixdown(stems, mod.MIX, n)
ref = None
print('track'.ljust(14), 'rms'.rjust(6), ' '.join(f'{e:>6d}' for e in EDGES[:-1]))
tot = octaves(bus)
for name, y in sorted(processed.items()) + [('MIX', bus)]:
    o = octaves(y)
    rms = dsp.db(np.sqrt(np.mean(y ** 2)) + 1e-12)
    print(name.ljust(14), f'{rms:6.1f}', ' '.join(f'{v - tot[i]:6.1f}' if name != 'MIX' else f'{v - max(tot):6.1f}' for i, v in enumerate(o)))
