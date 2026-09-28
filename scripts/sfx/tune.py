# Measures the sounding pitch of pitched samples (pyin over the first 0.4 s after the attack), so a recipe can tune a
# note exactly: prints each file's MIDI pitch (fractional) and writes scripts/sfx/cands/pitches.json. Nothing is played.
#   ~/.cache/rascal-ear/venv/bin/python scripts/sfx/tune.py "vsco/Brass/Trumpet/stac" "vsco/Strings/Harp" ...
import json, math, os, sys
import numpy as np
import librosa

PACKS = os.path.expanduser('~/.cache/rascal-sfx/packs')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cands', 'pitches.json')
NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

table = json.load(open(OUT)) if os.path.exists(OUT) else {}
for d in sys.argv[1:]:
    folder = os.path.join(PACKS, d)
    for f in sorted(os.listdir(folder)):
        if not f.endswith('.wav'):
            continue
        y, sr = librosa.load(os.path.join(folder, f), sr=44100, mono=True)
        a = int(np.argmax(np.abs(y) > 0.1 * np.abs(y).max()))
        seg = y[a + int(0.02 * sr): a + int(0.45 * sr)]
        f0, vf, _ = librosa.pyin(seg, fmin=40, fmax=4200, sr=sr, frame_length=2048)
        v = f0[vf] if vf.any() else np.array([])
        if len(v) < 3:
            print(f'{f}: no pitch')
            continue
        midi = 69 + 12 * math.log2(float(np.median(v)) / 440)
        key = f'{d}/{f}'
        table[key] = round(midi, 2)
        n = int(round(midi))
        print(f'{f:40s} {NAMES[n % 12]}{n // 12 - 1} {100 * (midi - n):+.0f} cents')
json.dump(dict(sorted(table.items())), open(OUT, 'w'), indent=1)
