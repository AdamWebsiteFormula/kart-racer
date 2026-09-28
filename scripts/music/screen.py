# The cool-not-corny screen (Adam, 28 Sept 2026: "cool and not corny/cheesy/cartoony"), nothing played:
#  - AST (AudioSet): the song's top labels over 5 s windows; FAIL when a childish/comic label ranks in the top ten
#    (Music for children, Funny music, Lullaby, Christmas music, Jingle (music), Jingle bell) or scores over 5 % anywhere
#  - CLAP: "cool driving electronic rock racing music" against "cartoon children's music" over 10 s windows;
#    FAIL when the cartoon text wins on average, or in more than a fifth of the windows
#  - CLAP five-way: cool / cartoon / circus / cheesy / teen-playlist, for the report
#  - Audiobox Aesthetics: production quality (PQ) and enjoyment (CE), 1-10, for the report
#   python scripts/music/screen.py <file> [<file> ...]   (prints one JSON line per file)
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import aes
# torch, librosa and the models load only when this process computes (no ear server up): see _local()
torch = librosa = ear = dsp = None


def _local():
    global torch, librosa, ear, dsp
    if ear is None:
        import torch as _t, librosa as _l
        import ear as _e
        from studio import dsp as _d
        torch, librosa, ear, dsp = _t, _l, _e, _d

BAD = ['Music for children', 'Funny music', 'Lullaby', 'Christmas music', 'Jingle (music)', 'Jingle bell']
COOL = 'cool driving electronic rock racing music'
CARTOON = "cartoon children's music"
FIVE = [COOL, CARTOON, 'silly circus music', 'cheesy, corny video game music', 'energetic modern music a teenager would put on a playlist']


def clap_windows(mono44, texts, win=10.0):
    m = ear.models()
    with torch.no_grad():
        t = ear.feats(m['clap'].get_text_features(**m['proc'](text=texts, return_tensors='pt', padding=True).to(ear.dev)))
        y48 = librosa.resample(mono44, orig_sr=44100, target_sr=48000)
        n = int(win * 48000)
        embs = []
        starts = list(range(0, max(1, len(y48) - n + 1), n // 2))
        for i in starts:
            a = m['proc'](audio=[y48[i:i + n]], sampling_rate=48000, return_tensors='pt').to(ear.dev)
            embs.append(ear.feats(m['clap'].get_audio_features(**a)))
        E = torch.cat(embs)
        scale = float(m['clap'].logit_scale_a.exp())
    z = (E @ t.T).cpu().numpy() * scale
    p = np.exp(z - z.max(1, keepdims=True))
    return p / p.sum(1, keepdims=True)


def ast_screen(mono44):
    m = ear.models()
    y16 = librosa.resample(mono44, orig_sr=44100, target_sr=16000)
    n = 5 * 16000
    tot, worst, nw = {}, {}, 0
    for i in range(0, max(1, len(y16) - n + 1), n):
        labs = m['ast'](y16[i:i + n], top_k=40)
        nw += 1
        for l in labs:
            tot[l['label']] = tot.get(l['label'], 0) + l['score']
            if l['label'] in BAD:
                worst[l['label']] = max(worst.get(l['label'], 0), l['score'])
    ranked = sorted(tot.items(), key=lambda kv: -kv[1])
    top10 = [k for k, _ in ranked[:10]]
    return {'top': [(k, round(v / nw, 3)) for k, v in ranked[:8]],
            'badInTop10': [b for b in BAD if b in top10],
            'badPeak': {k: round(v, 3) for k, v in worst.items() if v > 0.02}}


def screen(path):
    got = aes.remote('/screen', {'path': os.path.abspath(path)})
    if got is not None:
        return got
    _local()
    y, _ = librosa.load(path, sr=44100, mono=False)
    if y.ndim == 1:
        y = np.stack([y, y])
    mono = y.mean(0)
    p2 = clap_windows(mono, [COOL, CARTOON])
    p5 = clap_windows(mono, FIVE)
    ast = ast_screen(mono)
    q = aes.score(path)
    cool_mean = float(p2[:, 0].mean())
    cartoon_wins = float((p2[:, 1] > p2[:, 0]).mean())
    reasons = []
    if ast['badInTop10']:
        reasons.append('AST top-10 has ' + ', '.join(ast['badInTop10']))
    if any(v > 0.05 for v in ast['badPeak'].values()):
        reasons.append('AST peak ' + ', '.join(f'{k} {v}' for k, v in ast['badPeak'].items() if v > 0.05))
    if cool_mean < 0.5:
        reasons.append(f'CLAP prefers cartoon ({1 - cool_mean:.2f})')
    elif cartoon_wins > 0.2:
        reasons.append(f'CLAP cartoon wins {cartoon_wins:.0%} of windows')
    return {
        'file': path.replace(os.path.expanduser('~'), '~'),
        'verdict': 'FAIL' if reasons else 'PASS', 'reasons': reasons,
        'clapCoolVsCartoon': round(cool_mean, 3), 'cartoonWindows': round(cartoon_wins, 2),
        'clap5': {k: round(float(v), 3) for k, v in zip(['cool', 'cartoon', 'circus', 'cheesy', 'teen'], p5.mean(0))},
        'astTop': ast['top'][:5], 'astBad': ast['badPeak'],
        'PQ': q['PQ'], 'CE': q['CE'], 'lufs': round(dsp.lufs(y), 1),
    }


if __name__ == '__main__':
    for p in sys.argv[1:]:
        print(json.dumps(screen(p)), flush=True)
