# Look at sounds instead of hearing them (nothing is played): each file as a waveform over a log-frequency
# spectrogram (50 Hz to 16 kHz, 80 dB of range), stacked into one PNG, with its name and length.
#   ~/.cache/rascal-ear/venv/bin/python scripts/sfx/look.py out.png a.mp3 b.wav ... [--seconds=3] [--from=0]
import sys
import numpy as np
from PIL import Image, ImageDraw
import librosa

W, H_WAVE, H_SPEC, PAD = 1100, 70, 190, 18


def panel(path, seconds=None, start=0.0):
    y, sr = librosa.load(path, sr=44100, mono=True, offset=start, duration=seconds)
    if seconds:
        y = np.pad(y, (0, max(0, int(seconds * sr) - len(y))))
    n_fft, hop = 2048, max(64, len(y) // W)
    S = np.abs(librosa.stft(y, n_fft=n_fft, hop_length=hop)) + 1e-9
    db = 20 * np.log10(S / S.max())
    freqs = np.fft.rfftfreq(n_fft, 1 / sr)
    rows = np.geomspace(50, 16000, H_SPEC)[::-1]
    idx = np.clip(np.searchsorted(freqs, rows), 0, len(freqs) - 1)
    img = db[idx]
    img = np.clip((img + 80) / 80, 0, 1)
    cols = np.linspace(0, img.shape[1] - 1, W).astype(int)
    img = img[:, cols]
    # a warm colour map: black, purple, orange, yellow, white
    stops = np.array([[0, 0, 0], [60, 10, 110], [200, 60, 40], [250, 180, 30], [255, 255, 220]], float)
    pos = np.clip(img * (len(stops) - 1), 0, len(stops) - 1 - 1e-6)
    i = pos.astype(int); f = (pos - i)[..., None]
    rgb = (stops[i] * (1 - f) + stops[i + 1] * f).astype(np.uint8)
    spec = Image.fromarray(rgb, 'RGB')
    wave = Image.new('RGB', (W, H_WAVE), (15, 15, 20))
    d = ImageDraw.Draw(wave)
    seg = np.array_split(y, W)
    pk = max(1e-9, np.abs(y).max())
    for x, s in enumerate(seg):
        if len(s):
            a, b = s.min() / pk, s.max() / pk
            d.line([(x, H_WAVE / 2 - b * H_WAVE / 2.2), (x, H_WAVE / 2 - a * H_WAVE / 2.2)], fill=(120, 200, 255))
    out = Image.new('RGB', (W, PAD + H_WAVE + H_SPEC), (0, 0, 0))
    dd = ImageDraw.Draw(out)
    dd.text((4, 3), f"{path.split('/')[-1]}  {len(y) / sr:.2f} s  peak {20 * np.log10(pk):.1f} dBFS", fill=(230, 230, 230))
    out.paste(wave, (0, PAD))
    out.paste(spec, (0, PAD + H_WAVE))
    for hz in (100, 250, 500, 1000, 2000, 4000, 8000):
        yy = PAD + H_WAVE + int(np.argmin(np.abs(rows - hz)))
        dd.line([(0, yy), (6, yy)], fill=(255, 255, 255))
        dd.text((8, yy - 6), f'{hz if hz < 1000 else str(hz // 1000) + "k"}', fill=(200, 200, 200))
    return out


if __name__ == '__main__':
    args = sys.argv[1:]
    out = args[0]
    opt = {a.split('=')[0][2:]: float(a.split('=')[1]) for a in args if a.startswith('--')}
    files = [a for a in args[1:] if not a.startswith('--')]
    ps = [panel(f, opt.get('seconds'), opt.get('from', 0.0)) for f in files]
    img = Image.new('RGB', (W, sum(p.height for p in ps)), (0, 0, 0))
    y = 0
    for p in ps:
        img.paste(p, (0, y)); y += p.height
    img.save(out)
    print(out)
