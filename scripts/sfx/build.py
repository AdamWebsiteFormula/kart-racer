# Builds the game's recipe sounds (scripts/sfx/recipes.ts) from the approved packs, code synthesis and the
# game's own earlier takes, and writes public/audio/sfx/<id>.mp3 plus scripts/sfx/built.json (each recipe as
# built and its file's hash, which the tests hold the manifest to). Nothing is ever played.
#
#   ~/.cache/rascal-ear/venv/bin/python scripts/sfx/build.py                 every recipe
#   ~/.cache/rascal-ear/venv/bin/python scripts/sfx/build.py drift boost1    just these
#   --recipes=<file.ts>   candidates from another recipe file (then --out is required and built.json is left alone)
#   --out=<dir>           where the MP3s go
#   --played=<dir>        also write each sound as the game plays it (cut and levelled like samples.ts cutSfx), as WAV
import hashlib, json, math, os, subprocess, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dsp  # noqa: E402

REPO = dsp.REPO
args = sys.argv[1:]
flag = lambda name: next((a.split('=', 1)[1] for a in args if a.startswith(f'--{name}=')), None)
ids = [a for a in args if not a.startswith('--')]
recipes_file = flag('recipes')
out_dir = flag('out') or os.path.join(REPO, 'public', 'audio', 'sfx')
played_dir = flag('played')
official = recipes_file is None
if not official and not flag('out'):
    sys.exit('candidates need --out=<dir> (the shipped files are only written from scripts/sfx/recipes.ts)')

lines = subprocess.run(['node', os.path.join(REPO, 'scripts', 'sfx', 'recipes-json.ts')] + ([recipes_file] if recipes_file else []),
                       check=True, capture_output=True, text=True, cwd=REPO).stdout.splitlines()
recipes = [json.loads(l) for l in lines if l.strip()]
todo = [r for r in recipes if not ids or r['id'] in ids or json.loads(r['json']).get('name') in ids]
if ids and not todo:
    sys.exit(f'no recipe for: {sorted(set(ids) - {r["id"] for r in todo})}')

file_for = lambda i: i.replace(':', '-') + '.mp3'
LEAD = 0.1  # seconds of silence before every one-shot (see build)


def build(r):
    rec = json.loads(r['json'])
    x = dsp.mix([dsp.render_layer(l) for l in rec['layers']])
    x = dsp.fx(x, rec.get('master'))
    x = dsp.remove_dc(x)
    if rec.get('loop'):
        x = dsp.loopify(x, rec['loop'], rec.get('xfade', 0.06))
    else:
        x = dsp.end_trim(x)
        # 100 ms of silence in front (the game cuts it at the onset, so nothing plays later): samples.ts peakRms reads
        # the first hops of a file as whole windows, so a sound that hits at once was levelled on its loudest 10 ms and
        # played 3-7 dB under the common level; with a lead its loudest 100 ms is measured as 100 ms
        x = np.pad(x, ((0, 0), (int(LEAD * dsp.SR), 0)))
    pk = np.abs(x).max()
    x = x * (10 ** (-1.5 / 20) / pk)  # -1.5 dBFS sample peak (room for the MP3's overshoot): the game levels every file at decode anyway
    fname = f"{rec['name']}.mp3" if rec.get('name') else file_for(rec['id'])  # a candidate's own file name
    path = os.path.join(out_dir, fname)
    dsp.write_mp3(path, x)
    y = dsp._read(path)  # measured as decoded
    g, lv, pkd, held = dsp.game_level(y, bool(rec.get('loop')))
    if played_dir:
        dsp.write_wav(os.path.join(played_dir, fname.replace('.mp3', '.wav')), dsp.as_played(y, rec['id'], bool(rec.get('loop'))))
    sha = hashlib.sha256(open(path, 'rb').read()).hexdigest()
    print(f"{fname[:-4]:18s} {y.shape[-1] / dsp.SR:5.2f} s  loudest100ms {20 * math.log10(max(lv, 1e-9)):6.1f} dB(K)  peak {20 * math.log10(pkd):5.1f}  "
          f"held by ceiling {held:5.1f} dB  {os.path.getsize(path) // 1024} KB", flush=True)
    return rec['id'], {'recipe': r['json'], 'sha256': sha, 'seconds': round(y.shape[-1] / dsp.SR - (0 if rec.get('loop') else LEAD), 3)}  # the sound itself, without the lead


results = dict(build(r) for r in todo)
if official:
    bj = os.path.join(REPO, 'scripts', 'sfx', 'built.json')
    built = json.load(open(bj)) if os.path.exists(bj) else {}
    built.update(results)
    live = {r['id'] for r in recipes}
    built = {k: built[k] for k in sorted(built) if k in live}
    open(bj, 'w').write(json.dumps(built, indent=1) + '\n')
    print(f'built.json: {len(built)} recipes')
