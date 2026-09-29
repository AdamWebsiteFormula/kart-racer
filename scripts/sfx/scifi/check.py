# Technical checks on the sci-fi item candidates' full-quality WAVs (nothing is played): clipped samples, DC, a click at
# the start or the end, and for a loop the wrap (the jump from its last sample to its first against the signal's own
# sample-to-sample movement, and the level of the 20 ms either side of the wrap against the loop's median level).
#   ~/.cache/rascal-ear/venv/bin/python scripts/sfx/scifi/check.py [id ...]
import json, math, os, sys
import numpy as np
import soundfile as sf

OUT = os.path.expanduser(os.environ.get('RASCAL_CANDIDATES', '~/.cache/rascal-sfx/candidates'))
ids = sys.argv[1:] or [d[5:] for d in sorted(os.listdir(OUT)) if d.startswith('item-')]
SR = 44100
bad = 0
for sid in ids:
    folder = os.path.join(OUT, 'item-' + sid)
    path = os.path.join(folder, 'candidates.json')
    if not os.path.exists(path):
        continue
    data = json.load(open(path))
    for c in data['candidates']:
        if c['name'] == 'current':
            continue
        f = os.path.join(folder, 'wav', c['name'] + '.wav')
        if not os.path.exists(f):
            continue
        x, sr = sf.read(f, always_2d=True)
        x = x.T
        notes = []
        clipped = int((np.abs(x) >= 0.999).sum())
        if clipped:
            notes.append(f'{clipped} clipped')
        dc = float(np.abs(x.mean(axis=1)).max())
        if dc > 0.003:
            notes.append(f'DC {dc:.4f}')
        step = np.abs(np.diff(x, axis=1))
        typical = float(np.percentile(step, 99)) + 1e-9
        if c.get('loop'):
            wrap = float(np.abs(x[:, 0] - x[:, -1]).max())
            k = int(0.02 * sr)
            env = np.sqrt((x.mean(axis=0) ** 2).reshape(-1, k).mean(axis=1)) if x.shape[1] % k == 0 else None
            lv = lambda seg: math.sqrt(float((seg ** 2).mean()) + 1e-12)
            seam = lv(np.concatenate([x[:, -k:], x[:, :k]], axis=1))
            med = float(np.median([lv(x[:, i:i + k]) for i in range(0, x.shape[1] - k, k)]))
            ratio_db = 20 * math.log10(seam / (med + 1e-12))
            notes.append(f'wrap jump {wrap / typical:.2f}x p99 step, seam level {ratio_db:+.1f} dB vs median')
            if wrap > 2 * typical or abs(ratio_db) > 3:
                notes.append('SEAM?')
                bad += 1
        else:
            first = float(np.abs(x[:, :2]).max())
            last = float(np.abs(x[:, -2:]).max())
            if first > 0.01:
                notes.append(f'starts at {first:.3f}')
            if last > 0.01:
                notes.append(f'ends at {last:.3f}')
                bad += 1
        c.setdefault('checks', {})
        c['checks'] = {'clipped': clipped, 'dc': round(dc, 5), 'notes': notes}
        print(f"{sid:12s} {c['name']:14s} {'; '.join(notes) or 'clean'}", flush=True)
    json.dump(data, open(path, 'w'), indent=1)
print(f'flags: {bad}')
