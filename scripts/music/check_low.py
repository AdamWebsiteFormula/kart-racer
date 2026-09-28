# Pitch check for low instruments by harmonic-sum spectrum (YIN slips octaves on a bass): renders single notes.
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from studio import instruments, dsp
from studio.score import Note, Part
from studio.render import Ctx

for nm in sys.argv[1].split(','):
    inst = instruments.get(nm)
    res = []
    for m in [int(x) for x in sys.argv[2].split(',')]:
        ctx = Ctx(120, int(2.5 * dsp.SR), 1)
        y = inst.render([Note(0, 2, m, 0.8)], ctx, Part(nm, nm))
        if isinstance(y, dict):
            y = sum(y.values())
        seg = y.mean(0)[int(0.15 * dsp.SR):int(1.0 * dsp.SR)]
        S = np.abs(np.fft.rfft(seg * np.hanning(len(seg)), 1 << 18))
        f = np.fft.rfftfreq(1 << 18, 1 / dsp.SR)
        # harmonic product over 5 harmonics, candidate f0 from 25 Hz to 1200 Hz
        cands = np.arange(25, 1200, 0.25)
        score = np.zeros_like(cands)
        for h in range(1, 6):
            score += np.log(np.interp(cands * h, f, S) + 1e-9)
        f0 = cands[np.argmax(score)]
        res.append((m, round(69 + 12 * np.log2(f0 / 440), 2)))
    print(nm, res)
