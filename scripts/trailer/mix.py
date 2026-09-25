# The trailer's soundtrack, mixed offline (nothing is played): the game's title song under the cut, the
# game's own sound effects on their frames, the music dipped under the big ones, a limiter, leveled for web.
#   ~/.cache/rascal-ear/venv/bin/python mix.py   (reads edl.json's "audio", writes soundtrack.wav)
import os, tempfile
import json, warnings
import numpy as np, soundfile as sf, librosa
warnings.filterwarnings('ignore')

DIR = os.environ.get('TRAILER_DIR', os.path.join(tempfile.gettempdir(), 'rascal-trailer'))
AUDIO = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'audio')
SR = 48000
edl = json.load(open(f'{DIR}/edl.json'))
A = edl['audio']
N = int(round(edl['duration'] * SR)) + SR

def load(path, rate=1.0):
    y, _ = librosa.load(path, sr=SR, mono=False)
    if y.ndim == 1: y = np.stack([y, y])
    if rate != 1.0:  # a speed change that shifts pitch too (tape-style), for a deeper impact or a snappier whoosh
        y = np.stack([librosa.resample(ch, orig_sr=SR, target_sr=int(SR / rate)) for ch in y])
    return y.astype(np.float32)

def db(x): return 10 ** (x / 20)

mix_music = np.zeros((2, N), np.float32)
mix_fx = np.zeros((2, N), np.float32)

# music: segments of the song laid on the timeline, each with its own fades
for m in A['music']:
    y = load(f"{AUDIO}/music/{m['src']}.mp3")
    a = int(m['in'] * SR); b = a + int((m['end'] - m['start']) * SR)
    seg = y[:, a:b].copy()
    n = seg.shape[1]
    env = np.ones(n, np.float32)
    fi, fo = int(m.get('fadeIn', 0) * SR), int(m.get('fadeOut', 0) * SR)
    if fi: env[:fi] = np.linspace(0, 1, fi) ** 2
    if fo: env[-fo:] = np.linspace(1, 0, fo) ** 1.5
    s = int(m['start'] * SR)
    mix_music[:, s:s + n] += seg * env * db(m.get('gain', 0))

# sound effects
duck = np.zeros(N, np.float32)
for f in A['sfx']:
    y = load(f"{AUDIO}/sfx/{f['src']}.mp3", f.get('rate', 1.0))
    if 'len' in f: y = y[:, : int(f['len'] * SR)]
    n = y.shape[1]
    fo = int(min(n, f.get('fadeOut', 0.03) * SR))
    env = np.ones(n, np.float32); env[-fo:] = np.linspace(1, 0, fo)
    pan = f.get('pan', 0.0)  # -1 left .. 1 right, equal power
    L, R = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    s = int(f['t'] * SR)
    e = min(N, s + n)
    mix_fx[0, s:e] += (y[0, : e - s] * env[: e - s] * db(f.get('gain', 0)) * L * np.sqrt(2)).astype(np.float32)
    mix_fx[1, s:e] += (y[1, : e - s] * env[: e - s] * db(f.get('gain', 0)) * R * np.sqrt(2)).astype(np.float32)
    if f.get('duck', 0):
        d = int(f.get('duckLen', min(1.2, n / SR)) * SR)
        duck[s:min(N, s + d)] = np.maximum(duck[s:min(N, s + d)], f['duck'])

# the music dips under the big effects: a gain envelope in dB, 25 ms in, 350 ms out
att, rel = np.exp(-1 / (0.025 * SR)), np.exp(-1 / (0.35 * SR))
g = np.zeros(N, np.float32); cur = 0.0
for i in range(N):
    tgt = duck[i]
    cur = att * cur + (1 - att) * tgt if tgt > cur else rel * cur + (1 - rel) * tgt
    g[i] = cur
mix = mix_music * db(-g) + mix_fx

# master: level to about -14 LUFS-ish (RMS of the loud part), then a soft-knee limiter at -1 dBFS
rms = np.sqrt(np.mean(mix[:, int(15 * SR): int(55 * SR)] ** 2))
target_rms = db(-15.5)
mix *= target_rms / max(rms, 1e-6)
ceil = db(-1.0)
peak = np.max(np.abs(mix), axis=0)
# a look-ahead gain computer (5 ms), smoothed release 80 ms
la = int(0.005 * SR)
need = np.minimum(1.0, ceil / np.maximum(peak, 1e-9))
need = np.minimum.accumulate(np.concatenate([need[la:], np.ones(la, np.float32)])[::-1])[::-1] if False else need
gain = np.ones(N, np.float32); cur = 1.0; relk = np.exp(-1 / (0.08 * SR))
# min over a look-ahead window
from numpy.lib.stride_tricks import sliding_window_view
pad = np.concatenate([need, np.ones(la, np.float32)])
win_min = sliding_window_view(pad, la + 1).min(axis=1)[:N]
for i in range(N):
    tgt = win_min[i]
    cur = tgt if tgt < cur else relk * cur + (1 - relk) * tgt
    gain[i] = cur
mix *= gain
mix = np.clip(mix, -0.999, 0.999)
out = mix[:, : int(round(edl['duration'] * SR))].T
sf.write(f'{DIR}/soundtrack.wav', out, SR, subtype='PCM_24')
pk = 20 * np.log10(np.max(np.abs(out)) + 1e-9)
r = 20 * np.log10(np.sqrt(np.mean(out[int(15 * SR): int(55 * SR)] ** 2)) + 1e-9)
print(f'soundtrack.wav {out.shape[0] / SR:.2f} s, peak {pk:.1f} dBFS, body RMS {r:.1f} dBFS, limiter min gain {20 * np.log10(gain.min()):.1f} dB')
