# Does each sound match what it was made to be? For every sound in the catalog, CLAP ranks its own
# prompt among all the catalog's prompts. A sound whose own prompt ranks low sounds like something
# else: a suspect for a listen and a remake. Nothing is played aloud.
#   node scripts/ear/catalog-json.ts > /tmp/catalog.json && python intent.py /tmp/catalog.json [top]
import json, os, sys
import librosa, numpy as np, torch
from transformers import ClapModel, ClapProcessor

dev = 'mps' if torch.backends.mps.is_available() else 'cpu'
clap = ClapModel.from_pretrained('laion/clap-htsat-unfused').to(dev).eval()
proc = ClapProcessor.from_pretrained('laion/clap-htsat-unfused')
def feats(x):
    # newer transformers wrap the projected embedding in an output object
    return torch.nn.functional.normalize(x if torch.is_tensor(x) else x.pooler_output, dim=-1)

cat = [c for c in json.load(open(sys.argv[1])) if os.path.exists(c['file'])]
top = int(sys.argv[2]) if len(sys.argv) > 2 else 20
# the gist of each prompt: its first clause, without the shared style tail
gist = [c['prompt'].split('Bright cartoon video game style')[0].split('. No ')[0][:300] for c in cat]
with torch.no_grad():
    t = proc(text=gist, return_tensors='pt', padding=True, truncation=True).to(dev)
    te = feats(clap.get_text_features(**t))
    ae = []
    for c in cat:
        y, _ = librosa.load(c['file'], sr=48000, mono=True)
        a = proc(audio=[y], sampling_rate=48000, return_tensors='pt').to(dev)
        ae.append(feats(clap.get_audio_features(**a)))
    sim = (torch.cat(ae) @ te.T).cpu().numpy()
rows = []
for i, c in enumerate(cat):
    order = np.argsort(-sim[i])
    rank = int(np.where(order == i)[0][0]) + 1
    rows.append((rank, c['id'], float(sim[i, i]), [cat[j]['id'] for j in order[:3]]))
rows.sort(key=lambda r: -r[0])
print(f'{len(cat)} sounds; own prompt ranked 1st for {sum(r[0] == 1 for r in rows)}, top 5 for {sum(r[0] <= 5 for r in rows)}')
for rank, sid, s, best in rows[:top]:
    print(f'rank {rank:3d}  {sid:16s} own {s:.3f}  sounds most like: {", ".join(best)}')
