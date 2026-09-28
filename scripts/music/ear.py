# The local ears on a song, nothing played: loudness and peaks, octave balance, stereo, CLAP text matches (quality,
# cheesiness, band, vocals, style), AST labels (and the worst voice-like label in any 5 s window).
#   python scripts/music/ear.py <file.mp3> [<file.mp3> ...] [--style "text"]
import json, os, re, sys
import numpy as np
import librosa, torch
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from studio import dsp

dev = 'mps' if torch.backends.mps.is_available() else 'cpu'
SETS = {
    'quality': ['a polished, professional studio recording of a live band', 'a cheap, cheesy, low-quality MIDI backing track'],
    'corny': ['exciting, modern video game racing music', 'silly, corny cartoon circus music'],
    'band': ['a big band with a live brass section', 'electronic synthesizer music'],
    'vocals': ['instrumental music with no vocals', 'music with a person singing or shouting'],
    'catchy': ['a catchy, memorable melody with a strong hook', 'a bland, forgettable background track'],
    'groove': ['a tight, funky groove played by a real rhythm section', 'a stiff, robotic, quantized drum machine loop'],
}
VOICE = re.compile(r'Speech|Singing|Shout|Yell|Cheer|Crowd|Chant|Choir|Vocal|Rapping|Humming|Laughter|Whoop|Narration|Babbling|Screaming|A capella|Beatboxing|Whistling', re.I)
_M = {}


def models():
    if not _M:
        from transformers import ClapModel, ClapProcessor, pipeline
        _M['clap'] = ClapModel.from_pretrained('laion/clap-htsat-unfused').to(dev).eval()
        _M['proc'] = ClapProcessor.from_pretrained('laion/clap-htsat-unfused')
        _M['ast'] = pipeline('audio-classification', model='MIT/ast-finetuned-audioset-10-10-0.4593', device=dev)
    return _M


def feats(x):
    return torch.nn.functional.normalize(x if torch.is_tensor(x) else x.pooler_output, dim=-1)


def clap(mono44, extra=None):
    m = models()
    sets = dict(SETS)
    if extra:
        sets['style'] = extra
    with torch.no_grad():
        te = {k: feats(m['clap'].get_text_features(**m['proc'](text=v, return_tensors='pt', padding=True).to(dev))) for k, v in sets.items()}
        y48 = librosa.resample(mono44, orig_sr=44100, target_sr=48000)
        n = 10 * 48000
        embs = []
        for i in range(0, max(1, len(y48) - n + 1), n):
            a = m['proc'](audio=[y48[i:i + n]], sampling_rate=48000, return_tensors='pt').to(dev)
            embs.append(feats(m['clap'].get_audio_features(**a)))
        E = torch.cat(embs)
        scale = float(m['clap'].logit_scale_a.exp())
    out = {}
    for k, t in te.items():
        z = (E @ t.T).cpu().numpy() * scale
        p = np.exp(z - z.max(1, keepdims=True))
        p /= p.sum(1, keepdims=True)
        if k == 'style':
            out[k] = {s: round(float(p[:, i].mean()), 3) for i, s in enumerate(sets[k])}
        else:
            out[k] = round(float(p[:, 0].mean()), 3)
            if k == 'vocals':
                out['vocalsWorst'] = round(float(p[:, 1].max()), 3)
    return out


def ast_labels(mono44):
    m = models()
    y16 = librosa.resample(mono44, orig_sr=44100, target_sr=16000)
    n = 5 * 16000
    tot, worst, nw = {}, (0.0, None, []), 0
    for i in range(0, max(1, len(y16) - n + 1), n):
        labs = m['ast'](y16[i:i + n], top_k=12)
        nw += 1
        for l in labs:
            tot[l['label']] = tot.get(l['label'], 0) + l['score']
        vs = sum(l['score'] for l in labs if VOICE.search(l['label']))
        if vs > worst[0]:
            worst = (vs, i / 16000, [(l['label'], round(l['score'], 3)) for l in labs if VOICE.search(l['label'])])
    top = sorted(tot.items(), key=lambda kv: -kv[1])[:8]
    return {'top': [(k, round(v / nw, 3)) for k, v in top], 'voiceWorst': {'score': round(worst[0], 3), 'at': worst[1], 'labels': worst[2]}}


def bands(mono):
    S = np.abs(librosa.stft(mono, n_fft=4096, hop_length=2048)) ** 2
    f = librosa.fft_frequencies(sr=44100, n_fft=4096)
    tot = S.sum()
    edges = [(20, 60), (60, 120), (120, 250), (250, 500), (500, 1000), (1000, 2000), (2000, 4000), (4000, 8000), (8000, 16000)]
    return {f'{a}': round(float(10 * np.log10(S[(f >= a) & (f < b)].sum() / tot + 1e-12)), 1) for a, b in edges}


def analyze(path, style=None):
    y, _ = librosa.load(path, sr=44100, mono=False)
    if y.ndim == 1:
        y = np.stack([y, y])
    mono = y.mean(0)
    st = dsp.short_term(y)
    mid, side = (y[0] + y[1]) / 2, (y[0] - y[1]) / 2
    r = {'file': os.path.basename(path), 'seconds': round(y.shape[1] / 44100, 2), 'lufs': round(dsp.lufs(y), 1),
         'truePeak': round(dsp.true_peak_db(y), 2), 'stRange': [round(float(np.percentile(st, 10)), 1), round(float(np.percentile(st, 95)), 1)],
         'sideVsMid': round(dsp.db(np.sqrt(np.mean(side ** 2))) - dsp.db(np.sqrt(np.mean(mid ** 2))), 1), 'bands': bands(mono)}
    r['clap'] = clap(mono, style)
    r['ast'] = ast_labels(mono)
    return r


if __name__ == '__main__':
    args = sys.argv[1:]
    style = None
    if '--style' in args:
        i = args.index('--style')
        style = json.loads(args[i + 1])
        args = args[:i] + args[i + 2:]
    for p in args:
        print(json.dumps(analyze(p, style)), flush=True)
