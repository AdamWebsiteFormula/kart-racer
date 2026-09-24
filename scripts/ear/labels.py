# The local ear, part 1: what a sound is, never played aloud (Adam's machine stays silent).
#   python labels.py <file,file,...> ['["text a", "text b"]']
# Per file: the top AudioSet labels (AST: Singing, Speech, Trumpet, Engine, Distortion, Whoosh, ...) and,
# given texts, CLAP's zero-shot match to each (does "shift.mp3" sound like "a huge rumbling whoosh"?).
import json, sys
import librosa, torch
from transformers import ClapModel, ClapProcessor, pipeline

dev = 'mps' if torch.backends.mps.is_available() else 'cpu'
ast = pipeline('audio-classification', model='MIT/ast-finetuned-audioset-10-10-0.4593', device=dev)
clap = ClapModel.from_pretrained('laion/clap-htsat-unfused').to(dev)
clap_in = ClapProcessor.from_pretrained('laion/clap-htsat-unfused')

def load(path, sr):
    y, _ = librosa.load(path, sr=sr, mono=True)
    return y

def labels(path, top=6):
    return [(r['label'], round(r['score'], 3)) for r in ast(load(path, 16000))][:top]

def match(path, texts):
    inp = clap_in(text=texts, audio=[load(path, 48000)], sampling_rate=48000, return_tensors='pt', padding=True).to(dev)
    with torch.no_grad():
        p = clap(**inp).logits_per_audio.softmax(-1)[0].cpu().numpy()
    return sorted(zip(texts, [round(float(x), 3) for x in p]), key=lambda t: -t[1])

if __name__ == '__main__':
    texts = json.loads(sys.argv[2]) if len(sys.argv) > 2 else None
    for path in sys.argv[1].split(','):
        r = {'file': path.split('/')[-1], 'labels': labels(path)}
        if texts:
            r['match'] = match(path, texts)
        print(json.dumps(r), flush=True)
