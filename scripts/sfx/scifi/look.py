# Looking at sounds instead of hearing them (nothing is played on Adam's machine): a contact sheet of log-frequency
# spectrograms, one row per file, with the level envelope under each and its numbers beside it.
#   python scripts/sfx/scifi/look.py out.png a.wav b.mp3 ... [--max=3.0]  (seconds shown per row)
import math, os, sys
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
import dsp  # noqa: E402

SR = dsp.SR
W, H, ENV_H, LABEL_W = 900, 190, 40, 250
FMIN, FMAX = 30.0, 20000.0
ANCH = np.array([[0, 0, 4], [40, 11, 84], [101, 21, 110], [159, 42, 99], [212, 72, 66], [245, 125, 21], [250, 193, 39], [252, 255, 164]], float)


def cmap(v):
    v = np.clip(v, 0, 1) * (len(ANCH) - 1)
    i = np.floor(v).astype(int)
    i2 = np.minimum(i + 1, len(ANCH) - 1)
    f = (v - i)[..., None]
    return (ANCH[i] * (1 - f) + ANCH[i2] * f).astype(np.uint8)


def spec_img(y, seconds):
    m = y.mean(axis=0)
    n = int(seconds * SR)
    m = np.pad(m, (0, max(0, n - len(m))))[:n]
    nfft, hop = 4096, max(64, n // W)
    win = np.hanning(nfft)
    frames = []
    for c in range(0, n, hop):
        seg = m[c:c + nfft]
        seg = np.pad(seg, (0, nfft - len(seg)))
        frames.append(np.abs(np.fft.rfft(seg * win)))
    S = np.array(frames).T  # bins × frames
    f = np.fft.rfftfreq(nfft, 1 / SR)
    rows = np.exp(np.linspace(math.log(FMAX), math.log(FMIN), H))
    bi = np.clip(np.searchsorted(f, rows), 1, len(f) - 1)
    img = 20 * np.log10(S[bi] + 1e-9)
    top = img.max()
    img = (img - (top - 75)) / 75
    img = np.array([np.interp(np.linspace(0, img.shape[1] - 1, W), np.arange(img.shape[1]), r) for r in img])
    return cmap(img)


def env_img(y, seconds):
    """The level (RMS over 10 ms) against its own loudest moment, 0 to -36 dB, with lines at -12 and -24 dB."""
    n = int(seconds * SR)
    m = (y ** 2).mean(axis=0)
    m = np.pad(m, (0, max(0, n - len(m))))[:n]
    k = max(1, int(0.01 * SR))
    rms = np.sqrt(np.convolve(m, np.ones(k) / k, 'same'))
    hop = max(1, n // W)
    e = np.array([rms[i:i + hop].max() if i < len(rms) else 0 for i in range(0, n, hop)])[:W]
    e = np.pad(e, (0, W - len(e)))
    db = 20 * np.log10(e + 1e-9) - 20 * np.log10(e.max() + 1e-9)
    frac = np.clip((db + 36) / 36, 0, 1)
    im = np.zeros((ENV_H, W, 3), np.uint8) + 18
    for x in range(W):
        h = int(frac[x] * (ENV_H - 2))
        im[ENV_H - 1 - h:, x] = (90, 200, 255)
    for g in (12, 24):
        yy = int(g / 36 * (ENV_H - 2))
        im[yy, ::4] = (255, 255, 255)
    return im


def metrics(y):
    pk = float(np.abs(y).max())
    env = dsp.envelope(dsp.k_weight(y))
    lv = dsp.peak_rms(env)
    m = y.mean(axis=0)
    spec = np.abs(np.fft.rfft(m * np.hanning(len(m))))
    f = np.fft.rfftfreq(len(m), 1 / SR)
    cen = float((spec * f).sum() / (spec.sum() + 1e-12))
    corr = float(np.corrcoef(y[0], y[1])[0, 1]) if y[0].std() > 0 and y[1].std() > 0 else 1.0
    return f"{y.shape[-1] / SR:.2f}s pk {20 * math.log10(pk + 1e-12):.1f} L100 {20 * math.log10(lv + 1e-12):.1f} cen {cen:.0f} corr {corr:.2f}"


def _read(p):
    """A file, or a stretch of one: 'file.ogg@12.5-18' (seconds)."""
    if '@' in p:
        f, rng = p.rsplit('@', 1)
        a, b = (float(v) for v in rng.split('-'))
        y = dsp._read(f)
        return y[:, int(a * SR):int(b * SR)]
    return dsp._read(p)


def sheet(out, paths, seconds=None):
    ys = [_read(p) for p in paths]
    seconds = seconds or max(y.shape[-1] for y in ys) / SR
    rowh = H + ENV_H + 8
    im = Image.new('RGB', (LABEL_W + W, rowh * len(ys) + 18), (10, 10, 14))
    d = ImageDraw.Draw(im)
    for i, (p, y) in enumerate(zip(paths, ys)):
        top = 18 + i * rowh
        im.paste(Image.fromarray(spec_img(y, seconds)), (LABEL_W, top))
        im.paste(Image.fromarray(env_img(y, seconds)), (LABEL_W, top + H))
        d.text((6, top + 4), os.path.basename(p)[:36], fill=(255, 255, 255))
        for k, line in enumerate(metrics(y).split(' pk ')):
            d.text((6, top + 22 + 14 * k), (line if k == 0 else 'pk ' + line)[:40], fill=(200, 200, 200))
        for hz in (100, 1000, 10000):
            yy = top + int((math.log(FMAX) - math.log(hz)) / (math.log(FMAX) - math.log(FMIN)) * H)
            d.line([(LABEL_W - 8, yy), (LABEL_W, yy)], fill=(255, 255, 255))
            d.text((LABEL_W - 48, yy - 6), f'{hz // 1000}k' if hz >= 1000 else str(hz), fill=(160, 160, 160))
    step = 0.1 if seconds <= 1.5 else 0.25 if seconds <= 4 else 0.5 if seconds <= 8 else 1.0
    for k in range(int(seconds / step) + 1):
        x = LABEL_W + int(k * step / seconds * (W - 1))
        d.line([(x, 12), (x, 17)], fill=(200, 200, 200))
        if k % 2 == 0:
            d.text((x + 2, 2), f'{k * step:g}', fill=(200, 200, 200))
    im.save(out)


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    mx = next((float(a.split('=')[1]) for a in sys.argv[1:] if a.startswith('--max=')), None)
    sheet(args[0], args[1:], mx)
    print(args[0])
