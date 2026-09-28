# The live engine's grain table (src/audio/engineCore.ts): a real engine's firings, cut one by one from steady
# stretches of a CC0 recording (kyles' dirt bike on Freesound, 450016: its idle and a held rev; physics.py
# cycle_grains, the same cut the loop recipes' `grains` synth uses), the most typical `n` of each pool kept, laid end
# to end with 20 ms of silence between them (so an MP3's encoder delay cannot blur where one starts: the loader finds
# each onset again, liveEngine.ts splitGrains), and a map of where each grain starts and how long it is.
#   ~/.cache/rascal-ear/venv/bin/python scripts/sfx/grains.py --out=<dir> [--n=40] [--rate=32000]
# writes <dir>/engine-grains.wav (16-bit mono), engine-grains.mp3 (128 kbps, gapless) and engine-grains.json.
import json, math, os, sys
import numpy as np
import soundfile as sf
import soxr
from scipy.signal import lfilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dsp  # noqa: E402
import physics  # noqa: E402

opt = {a.split('=')[0][2:]: a.split('=')[1] for a in sys.argv[1:] if a.startswith('--')}
OUT = os.path.expanduser(opt.get('out', '~/.cache/rascal-sfx/candidates/engine/live'))
N = int(opt.get('n', 40))
RATE = int(opt.get('rate', 32000))
POOLS = [  # name, Freesound id, from, to (s), the firing rate there (Hz, measured: scripts/sfx/cands/engine.ts)
    ('idle', 450016, 2.0, 18.0, 15.0),
    ('rev', 450016, 23.0, 28.0, 37.0),
]
GAP = 0.02


def pool(fsid, t0, t1, f):
    y = dsp.load({'freesound': fsid}).mean(axis=0)[int(t0 * dsp.SR):int(t1 * dsp.SR)]
    b, a = physics._biquad('hp', 40)
    y = lfilter(b, a, y)
    gs, r = physics.cycle_grains(y, f)
    cen = []
    for g in gs:
        G = np.abs(np.fft.rfft(g * np.hanning(len(g))))
        ff = np.fft.rfftfreq(len(g), 1 / dsp.SR)
        cen.append(float((G * ff).sum() / (G.sum() + 1e-12)))
    cen, r = np.array(cen), np.array(r)
    cr = np.array([np.abs(g).max() / (np.sqrt((g ** 2).mean()) + 1e-12) for g in gs])
    # the most typical grains: nearest the median in level, brightness and peakiness together
    z = np.abs(np.log(r / np.median(r))) / 0.35 + np.abs(cen - np.median(cen)) / (np.std(cen) + 1e-9) + np.abs(cr - np.median(cr)) / (np.std(cr) + 1e-9)
    keep = sorted(np.argsort(z)[:N])
    med = np.median(r[keep])
    return [gs[i] / med for i in keep]


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    body, pools = [np.zeros(int(GAP * RATE))], []
    pos = len(body[0])
    for name, fsid, t0, t1, f in POOLS:
        grains = []
        for g in pool(fsid, t0, t1, f):
            g = soxr.resample(g, dsp.SR, RATE)
            grains.append([pos, len(g)])
            body += [g, np.zeros(int(GAP * RATE))]
            pos += len(g) + int(GAP * RATE)
        pools.append({'name': name, 'rate': f, 'grains': grains})
    x = np.concatenate(body)
    peak = np.abs(x).max()
    x = x / peak * 0.9
    sf.write(os.path.join(OUT, 'engine-grains.wav'), x.astype(np.float32), RATE, subtype='PCM_16')
    sf.write(os.path.join(OUT, 'engine-grains.mp3'), x.astype(np.float32), RATE, format='MP3', subtype='MPEG_LAYER_III', bitrate_mode='CONSTANT', compression_level=0.65)
    meta = json.load(open(os.path.expanduser(f'~/.cache/rascal-sfx/freesound/{POOLS[0][1]}.json')))
    json.dump({'sampleRate': RATE, 'gap': GAP, 'gain': round(1 / (peak / 0.9), 6),
               'source': {'freesound': POOLS[0][1], 'name': meta['name'], 'username': meta['username'], 'license': meta['license']},
               'pools': pools}, open(os.path.join(OUT, 'engine-grains.json'), 'w'), indent=None, separators=(',', ':'))
    print(f'{sum(len(p["grains"]) for p in pools)} grains, {len(x) / RATE:.2f} s at {RATE} Hz, '
          f'{os.path.getsize(os.path.join(OUT, "engine-grains.mp3")) // 1024} KB mp3, {os.path.getsize(os.path.join(OUT, "engine-grains.wav")) // 1024} KB wav')
