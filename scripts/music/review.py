# Reviews a song without playing it: harmonic clashes between parts (minor seconds, minor ninths, major sevenths
# sounding together), long melody notes that are not chord tones, and pictures to look at: a piano roll of every
# part (colour by part, sections marked) and a log-frequency spectrogram of the rendered master.
#   python scripts/music/review.py harbour_loop [--png]
import importlib, os, sys, colorsys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from studio.score import chord_at, chords
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.work')
DRUMS = {'kit', 'tamb', 'shaker', 'conga', 'tumba', 'bongo_h', 'bongo_l', 'cowbell', 'claves', 'guiro', 'sleigh', 'triangle', 'agogo',
         'cabasa', 'vibraslap', 'belltree', 'woodblock', 'timbales', 'clap', 'snap', 'stomp', 'cymbals', 'bassdrum', 'riser'}


def clashes(song, notes, prog, step=0.25, min_steps=2):
    """Semitone rubs (minor 2nd, minor 9th) between parts that sound together for at least `min_steps` sixteenths and
    are not part of the chord's own colour: one of the two notes is outside the chord (with its tensions), or it is
    a flat nine over the chord's root on a chord that does not ask for one. Returns {(bar, part, part, lo, hi): steps}."""
    pitched = {k: [n for n in v if not isinstance(n.p, str)] for k, v in notes.items() if song.parts[k].inst not in DRUMS}
    end = song.loop_end
    found = {}
    t = 0.0
    while t < end:
        ch = chord_at(prog, t + 0.01) if prog else None
        pcs = set(ch.pcs) if ch else set()
        sounding = []
        for part, ns in pitched.items():
            for n in ns:
                if n.t <= t + 1e-6 and n.t + n.d >= t + step - 1e-6 and 'stac' not in n.art:
                    sounding.append((part, int(round(n.p))))
        for i in range(len(sounding)):
            for j in range(i + 1, len(sounding)):
                (pa, a), (pb, b) = sounding[i], sounding[j]
                if pa == pb:
                    continue
                lo_, hi_ = min(a, b), max(a, b)
                d = hi_ - lo_
                if d % 12 not in (1, 11):
                    continue
                outside = (lo_ % 12 not in pcs) or (hi_ % 12 not in pcs)
                flat9 = ch is not None and d % 12 == 1 and lo_ % 12 == ch.root and 13 not in ch.ivs and 1 not in ch.ivs
                if d % 12 == 11 and not outside:
                    continue  # a major seventh inside the chord (maj7, or a 9th over the 3rd's octave) is colour
                if outside or flat9:
                    key = (int(t // 4), pa, pb, lo_, hi_)
                    found[key] = found.get(key, 0) + 1
        t += step
    return {k: v for k, v in found.items() if v >= min_steps}


def roll_png(song, notes, path, px_per_beat=12, px_per_semi=4):
    names = sorted(k for k in notes if song.parts[k].inst not in DRUMS)
    W = int(song.loop_end * px_per_beat) + 20
    lo, hi = 24, 108
    H = (hi - lo) * px_per_semi + 20
    img = Image.new('RGB', (W, H), (18, 18, 22))
    d = ImageDraw.Draw(img)
    for bar in range(0, int(song.loop_end // 4) + 1):
        x = 10 + bar * 4 * px_per_beat
        c = (70, 70, 90) if bar % 4 == 0 else (35, 35, 42)
        if bar in (song.intro, song.intro + song.loop):
            c = (200, 60, 60)
        d.line([(x, 0), (x, H)], fill=c)
    for oc in range(lo, hi, 12):
        y = H - 10 - (oc - lo) * px_per_semi
        d.line([(0, y), (W, y)], fill=(40, 40, 48))
    for i, name in enumerate(names):
        r, g, b = colorsys.hsv_to_rgb(i / max(1, len(names)), 0.65, 1.0)
        col = (int(r * 255), int(g * 255), int(b * 255))
        for n in notes[name]:
            if n.t >= song.loop_end:
                continue
            x0 = 10 + n.t * px_per_beat
            x1 = max(x0 + 2, 10 + (n.t + n.d) * px_per_beat - 1)
            y = H - 10 - (n.p - lo) * px_per_semi
            d.rectangle([x0, y - px_per_semi + 1, x1, y], fill=col)
        d.text((12, 12 + 11 * i), name, fill=col)
    img.save(path)


def spec_png(wav, path, width=1800, height=420):
    import soundfile as sf
    y, sr = sf.read(wav, always_2d=True)
    m = y.mean(1)
    hop = max(256, len(m) // width)
    n_fft = 4096
    frames = []
    for i in range(0, len(m) - n_fft, hop):
        frames.append(np.abs(np.fft.rfft(m[i:i + n_fft] * np.hanning(n_fft))))
    S = np.array(frames).T
    f = np.fft.rfftfreq(n_fft, 1 / sr)
    bins = np.geomspace(30, 16000, height)
    idx = np.clip(np.searchsorted(f, bins), 0, len(f) - 1)
    L = 20 * np.log10(S[idx] + 1e-9)
    L = np.clip((L - (L.max() - 80)) / 80, 0, 1)[::-1]
    rgb = np.stack([L ** 0.6 * 255, L ** 1.5 * 200, (1 - L) * L * 4 * 120], axis=-1).astype(np.uint8)
    Image.fromarray(rgb).resize((width, height)).save(path)


if __name__ == '__main__':
    name = sys.argv[1]
    m = importlib.import_module('songs.' + name)
    song = m.compose()
    notes = song.finalize()
    prog = getattr(song, 'prog', None)
    if prog is None and hasattr(m, 'PROG'):
        prog, t = [], 0.0
        for key, bars in getattr(m, 'SECTIONS', []):
            prog += chords(m.PROG[key], t)
            t += 4 * bars
    cl = clashes(song, notes, prog)
    by_bar = {}
    for (bar, pa, pb, a, b), c in sorted(cl.items()):
        by_bar.setdefault(bar, []).append(f'{pa}/{pb} {a}-{b}x{c}')
    print(f'{name}: {len(cl)} clashing pairs in {len(by_bar)} bars')
    for bar, items in sorted(by_bar.items()):
        print(f'  bar {bar:3d}:', '; '.join(items[:8]), '...' if len(items) > 8 else '')
    if '--png' in sys.argv:
        os.makedirs(OUT, exist_ok=True)
        roll_png(song, notes, os.path.join(OUT, f'{name}-roll.png'))
        track = song.track
        wav = os.path.expanduser(f'~/.cache/rascal-music/candidates/{track}/{track}.wav')
        if os.path.exists(wav):
            spec_png(wav, os.path.join(OUT, f'{name}-spec.png'))
        print('pictures in', OUT)
