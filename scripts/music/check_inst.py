# Renders a short phrase on each named instrument (offline, nothing played) and checks level and pitch.
#   python scripts/music/check_inst.py trumpet,trombone,alto
import os, sys, time
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from studio import instruments, dsp
from studio.score import seq, Part
from studio.render import Ctx
import librosa

PHRASE = "C4:4 E4:4 G4:4 C5:4 | A4:8' G4:8' E4:8!stac C4:8 G3:2"
for nm in sys.argv[1].split(','):
    t0 = time.time()
    inst = instruments.get(nm)
    shift = int(sys.argv[2]) if len(sys.argv) > 2 else 0
    ns, end = seq(PHRASE, 0.0, transpose=shift)
    ctx = Ctx(120, int(6 * dsp.SR), 1)
    y = inst.render(ns, ctx, Part(nm, nm))
    if isinstance(y, dict):
        y = sum(y.values())
    got = []
    for k in range(4):
        seg = y.mean(0)[int((k * 0.5 + 0.1) * dsp.SR):int((k * 0.5 + 0.4) * dsp.SR)]
        f0 = librosa.yin(seg, fmin=30, fmax=2500, sr=dsp.SR, frame_length=2048)
        got.append(round(float(np.median(69 + 12 * np.log2(f0 / 440))) - shift, 2))
    pk = dsp.db(np.abs(y).max())
    rms = dsp.db(np.sqrt(np.mean(y ** 2)))
    print(f'{nm:16s} peak {pk:6.1f} rms {rms:6.1f}  pitches {got} (want 60, 64, 67, 72)  {time.time() - t0:.1f}s', flush=True)
