# Audits every built candidate without playing anything: where the game would start the song (samples.ts loopPoints:
# the first 10 ms at a quarter of the median level; a quiet first bar would be skipped), the loop seam as the game
# bakes it (the audio before the loop end against the audio before the loop start), the file length past the loop
# end (cutSong needs 0.15 s), and the melody originality check. Writes the results into each notes.json.
#   python scripts/music/audit.py
import glob, json, os, sys
import numpy as np
import soundfile as sf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

ROOT = os.path.expanduser('~/.cache/rascal-music/candidates')
for nj in sorted(glob.glob(os.path.join(ROOT, '*', '*', 'notes.json'))):
    d = json.load(open(nj))
    folder = os.path.dirname(nj)
    mp3 = os.path.join(folder, f"{d.get('track')}.mp3")
    if not os.path.exists(mp3) or not d.get('loop'):
        continue
    y, sr = sf.read(mp3, always_2d=True, dtype='float32')
    y = y.T
    hop = int(round(0.01 * sr))
    m = y[:, :(y.shape[1] // hop) * hop]
    env = np.sqrt(np.mean(m.reshape(m.shape[0], -1, hop) ** 2, axis=(0, 2)))
    start = float(np.argmax(env >= 0.25 * np.median(env))) * 0.01
    a, b = (int(round(v * sr)) for v in d['loop'])
    k = int(0.05 * sr)
    pre = float(np.sqrt(np.mean((y[:, a - k:a] - y[:, b - k:b]) ** 2)) / (np.sqrt(np.mean(y[:, a - k:a] ** 2)) + 1e-9))
    tail = (y.shape[1] - b) / sr
    d.setdefault('audit', {}).update({'gameStart': round(start, 2), 'mp3PreMatch': round(pre, 3), 'tailAfterLoop': round(tail, 3)})
    json.dump(d, open(nj, 'w'), indent=1)
    flag = []
    if start > 0.15:
        flag.append(f'game starts at {start:.2f} s (the first {start:.2f} s would be skipped)')
    if pre > 0.05:
        flag.append(f'seam mismatch {pre:.3f}')
    if tail < 0.2:
        flag.append(f'only {tail:.2f} s after the loop end')
    print(f'{os.path.relpath(folder, ROOT):34s} start {start:5.2f}  seam {pre:.3f}  tail {tail:.2f}  ' + ('; '.join(flag) if flag else 'ok'), flush=True)

import originality
print()
for name in originality.SONGS:
    h = originality.check(name)
    if h is not None:
        print(f'{name:20s}', 'no famous figure' if not h else f'{len(h)} matches: ' + '; '.join(f'{p} ~ {r}' for p, r, i in h[:6]), flush=True)
