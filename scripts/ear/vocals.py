# Are there voices in a song? Splits it into stems with Demucs (drums, bass, other, vocals) and checks
# the vocal stem: where it is loud next to the mix, AST names what is there (Singing, Speech, Shout,
# Cheering... or just a lead instrument that leaked in). Nothing is played aloud.
#   python vocals.py <song.mp3,song.mp3,...>
import json, sys
import librosa, numpy as np, torch
from demucs.apply import apply_model
from demucs.pretrained import get_model
from transformers import pipeline

dev = 'mps' if torch.backends.mps.is_available() else 'cpu'
sep = get_model('htdemucs').eval()
ast = pipeline('audio-classification', model='MIT/ast-finetuned-audioset-10-10-0.4593', device=dev)
VOICE = {'Singing', 'Speech', 'Shout', 'Yell', 'Cheering', 'Crowd', 'Chant', 'Male singing', 'Female singing', 'Child singing',
         'Choir', 'Vocal music', 'A capella', 'Rapping', 'Humming', 'Male speech, man speaking', 'Female speech, woman speaking',
         'Child speech, kid speaking', 'Children shouting', 'Battle cry', 'Whoop', 'Laughter', 'Synthetic singing', 'Narration, monologue'}
SR, WIN = 44100, 1.0

def rms_db(x):
    return float(20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9))

for path in sys.argv[1].split(','):
    y, _ = librosa.load(path, sr=SR, mono=False)
    if y.ndim == 1:
        y = np.stack([y, y])
    with torch.no_grad():
        stems = apply_model(sep, torch.tensor(y[None], dtype=torch.float32), device='cpu', progress=False)[0].numpy()
    voc = stems[sep.sources.index('vocals')].mean(0)
    mix = y.mean(0)
    n = int(WIN * SR)
    rows = []
    for i in range(0, len(mix) - n, n):
        v, m = rms_db(voc[i:i + n]), rms_db(mix[i:i + n])
        rows.append((i / SR, v, v - m))
    # the loudest vocal-stem windows relative to the mix
    top = sorted(rows, key=lambda r: -r[2])[:4]
    found = []
    for t, v, rel in top:
        seg = voc[int(t * SR):int(t * SR) + n]
        labels = [(r['label'], round(r['score'], 3)) for r in ast(librosa.resample(seg, orig_sr=SR, target_sr=16000), top_k=5)]
        voice = sum(s for l, s in labels if l in VOICE)
        found.append({'t': round(t, 1), 'vocalDb': round(v, 1), 'vsMixDb': round(rel, 1), 'voiceScore': round(voice, 3), 'labels': labels[:3]})
    # --dump=dir: write each loud window of the vocal stem (with a second either side) for the other ears
    dump = next((a.split('=', 1)[1] for a in sys.argv[2:] if a.startswith('--dump=')), None)
    if dump:
        import os, soundfile as sf
        os.makedirs(dump, exist_ok=True)
        for f in found:
            a, b = max(0, int((f['t'] - 1) * SR)), int((f['t'] + WIN + 1) * SR)
            sf.write(os.path.join(dump, f"{path.split('/')[-1].rsplit('.', 1)[0]}-vocals-{f['t']:.0f}s.wav"), voc[a:b], SR)
    loudest = max(r[1] for r in rows)
    verdict = 'VOICE LIKELY' if any(f['voiceScore'] > 0.3 and f['vsMixDb'] > -12 for f in found) else 'no voice found'
    print(json.dumps({'file': path.split('/')[-1], 'verdict': verdict, 'vocalStemPeakDb': round(loudest, 1), 'loudestWindows': found}), flush=True)
