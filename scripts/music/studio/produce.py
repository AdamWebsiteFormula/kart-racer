# One song from score to files: render every part, mix, master, fold the loop's wrap, write the MP3, WAV, MIDI
# and notes.json into ~/.cache/rascal-music/candidates/<track>/. Nothing is played.
import json, os, shutil, time
import numpy as np
from . import dsp, export, instruments, mix, samples
from .render import Ctx

SR = dsp.SR
OUT = os.path.expanduser(os.environ.get('RASCAL_MUSIC_OUT', '~/.cache/rascal-music/candidates'))


def render_stems(song, notes, only=None):
    L = song.loop_end * 60 / song.bpm
    n = int((L + song.tail_bars * song.bar_s + 4.0) * SR)
    ctx = Ctx(song.bpm, n, song.seed)
    stems = {}
    for name, part in sorted(song.parts.items()):
        if only and name not in only:
            continue
        inst = instruments.get(part.inst)
        t0 = time.time()
        out = inst.render(notes[name], ctx, part)
        if isinstance(out, dict):
            for k, v in out.items():
                stems[f'{name}.{k}'] = v
        else:
            stems[name] = out
        dt = time.time() - t0
        if dt > 5:
            print(f'  {name}: {len(notes[name])} notes in {dt:.1f} s', flush=True)
    return stems, n


def fold_loop(y, song, pre_bars=1.0, xf=0.06):
    """Cut the file at the loop end (plus a little). The intro's last bar is the same music as the loop's last bar
    (song.twin), so its audio is replaced by the loop end's own (a short crossfade at the bar line): what precedes
    the loop start is then sample for sample what precedes the wrap, and the game's baked crossfade joins identical
    audio. Every pass sounds like the first."""
    a = int(round(song.loop_start * 60 / song.bpm * SR))
    b = int(round(song.loop_end * 60 / song.bpm * SR))
    out = y.copy()
    X = int(round(pre_bars * song.bar_s * SR))
    if a >= X:
        x = int(xf * SR)
        w = np.ones(X, np.float32)
        w[:x] = np.sin(np.linspace(0, np.pi / 2, x)) ** 2
        out[:, a - X:a] = y[:, b - X:b] * w[None, :] + y[:, a - X:a] * (1 - w)[None, :]
    keep = b + int(0.6 * SR)
    out = out[:, :keep]
    fade = int(0.4 * SR)
    out[:, -fade:] *= np.linspace(1, 0, fade, dtype=np.float32)[None, :] ** 2
    return out, a / SR, b / SR


def wrap_check(y, a_s, b_s, fade=0.012):
    """What the game hears at the wrap (samples.ts bakeLoop blends the last `fade` s before the loop end into the
    audio just before the loop start, then plays on from the loop start). The wrap is seamless when the audio before
    the loop end matches the audio before the loop start: `preMatch` is their difference against their level over
    the last 50 ms (0 identical, 1.4 unrelated), `levelDb` the loudness step over the last half second, and
    `fluxRatio` the spectral change across the wrap against the change at the same place on the first pass."""
    a, b = int(round(a_s * SR)), int(round(b_s * SR))
    n = int(fade * SR)
    k = int(0.05 * SR)
    pre_a, pre_b = y[:, a - k:a], y[:, b - k:b]
    match = float(np.sqrt(np.mean((pre_a - pre_b) ** 2)) / (np.sqrt(np.mean(pre_a ** 2)) + 1e-9))
    h = int(0.5 * SR)
    lvl = dsp.db(np.sqrt(np.mean(y[:, b - h:b] ** 2)) + 1e-12) - dsp.db(np.sqrt(np.mean(y[:, a - h:a] ** 2)) + 1e-12)
    z = y.copy()
    th = (np.arange(1, n + 1) / n) * (np.pi / 2)
    z[:, b - n:b] = z[:, b - n:b] * np.cos(th) + z[:, a - n:a] * np.sin(th)

    def flux_at(sig, at):
        m = sig.mean(0)[at - 4096:at + 4096]
        fr = np.lib.stride_tricks.sliding_window_view(m, 2048)[::512] * np.hanning(2048)
        S = np.log1p(np.abs(np.fft.rfft(fr, axis=1)))
        f = np.sqrt(np.sum(np.diff(S, axis=0) ** 2, axis=1))
        return float(f.max())
    wrapped = np.concatenate([z[:, b - 4096:b], z[:, a:a + 4096]], axis=1)
    first = y[:, a - 4096:a + 4096]
    fr_w, fr_f = flux_at(wrapped, 4096), flux_at(first, 4096)
    return {'preMatch': round(match, 3), 'levelDb': round(lvl, 2), 'fluxRatio': round(fr_w / (fr_f + 1e-9), 3)}


def produce(mod, out_dir=None, tag='', analyze=True, only=None, write=True):
    t0 = time.time()
    song = mod.compose()
    spec = mod.MIX
    notes = song.finalize()
    stems, n = render_stems(song, notes, only)
    print(f'rendered {len(stems)} stems in {time.time() - t0:.0f} s', flush=True)
    bus, processed, rep = mix.mixdown(stems, spec, n)
    y, mrep = mix.master(bus, spec.get('master', {}))
    y, a_s, b_s = fold_loop(y, song)
    res = {'title': song.title, 'track': song.track, 'key': song.key, 'bpm': song.bpm, 'bars': song.intro + song.loop,
           'introBars': song.intro, 'loopBars': song.loop, 'loop': [round(a_s, 4), round(b_s, 4)],
           'seconds': round(y.shape[1] / SR, 3), 'master': mrep, 'wrap': wrap_check(y, a_s, b_s)}
    if not write:
        return res, y, stems
    d = out_dir or os.path.join(OUT, song.track)
    os.makedirs(d, exist_ok=True)
    base = os.path.join(d, f'{song.track}{tag}')
    export.write_wav(base + '.wav', y)
    mp3 = export.write_mp3(base + '.mp3', y)
    res['mp3'] = mp3
    insts = {name: p.inst for name, p in song.parts.items()}
    export.write_midi(base + '.mid', song, notes, insts)
    # the project: this song's score and render script, next to the files
    src = os.path.abspath(mod.__file__)
    shutil.copy(src, os.path.join(d, os.path.basename(src)))
    used = sorted(samples.USED)
    irs = sorted(dsp.IRS_USED)
    libs = sorted({os.path.relpath(p, samples.ROOT).split(os.sep)[0] for p in used})
    sources = json.load(open(os.path.join(samples.ROOT, 'SOURCES.json')))
    notes_json = {
        **{k: res[k] for k in ('title', 'track', 'key', 'bpm', 'bars', 'introBars', 'loopBars', 'loop', 'seconds')},
        'manifest': {'bpm': song.bpm, 'loop': [round(a_s, 2), round(b_s, 2)]},
        'style': getattr(mod, 'STYLE', ''),
        'instruments': sorted({p.inst for p in song.parts.values()}),
        'parts': {name: p.inst for name, p in sorted(song.parts.items())},
        'form': getattr(mod, 'FORM', []),
        'master': mrep, 'wrap': res['wrap'], 'mp3': mp3,
        'sampleSources': {r: {'license': s['license'], 'commit': s['commit'], 'repo': s['repo']} for r, s in sources.items() if r.split('/')[1] in libs},
        'sampleFilesUsed': len(used),
        'impulseResponses': [os.path.relpath(p, '/Library/Audio/Impulse Responses') for p in irs],
        'appleContent': 'Space Designer impulse responses from Final Cut Pro / Logic sample content (Apple: may be used in your own original soundtracks, support.apple.com/101851)' if irs else None,
        'synthesized': sorted({p.inst for p in song.parts.values() if p.inst in ('organ', 'epiano', 'clav', 'synthbass', 'lead', 'calliope', 'riser')}),
        'rendered': time.strftime('%Y-%m-%d %H:%M'),
    }
    json.dump(notes_json, open(os.path.join(d, 'notes.json' if not tag else f'notes{tag}.json'), 'w'), indent=1)
    with open(os.path.join(d, f'samples-used{tag}.txt'), 'w') as f:
        f.write('\n'.join(os.path.relpath(p, samples.ROOT) for p in used) + '\n')
        f.write('\n'.join('IR: ' + p for p in irs) + '\n')
    print(json.dumps({k: res[k] for k in ('track', 'seconds', 'loop', 'master', 'wrap', 'mp3')}), flush=True)
    print(f'done in {time.time() - t0:.0f} s -> {base}.mp3', flush=True)
    return res, y, stems
