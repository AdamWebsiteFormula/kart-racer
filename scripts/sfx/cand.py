# Builds candidate sounds for Adam's listening (never over the shipped files): each recipe in a candidates file
# (scripts/sfx/cands/<group>.ts, recipes with a `name`) becomes ~/.cache/rascal-sfx/candidates/<sound>/<name>.mp3,
# 128 kbps, cut and levelled exactly as the game will play it (samples.ts cutSfx and MIX_DB, so loudness is fair
# between candidates and against the shipped sound), a loop repeated so its wrap can be heard; plus current.mp3
# (the shipped sound the same way) and candidates.json (what each one is and what it is made of). Nothing is played.
#   ~/.cache/rascal-ear/venv/bin/python scripts/sfx/cand.py scripts/sfx/cands/drift.ts [name ...]
#   --what=<json file>   optional descriptions by name (else the recipe's brief/why are used)
import json, math, os, subprocess, sys
import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dsp  # noqa: E402

REPO = dsp.REPO
OUT = os.path.expanduser(os.environ.get('RASCAL_CANDIDATES', '~/.cache/rascal-sfx/candidates'))
LEAD = 0.1
DEMO_LOOP_SECONDS = 9.0


def recipes_of(path):
    lines = subprocess.run(['node', os.path.join(REPO, 'scripts', 'sfx', 'recipes-json.ts'), path], check=True, capture_output=True, text=True,
                           cwd=REPO).stdout.splitlines()
    return [json.loads(json.loads(l)['json']) for l in lines if l.strip()]


def build(rec):
    """The recipe's sound as build.py makes it (before the MP3): stereo float at dsp.SR."""
    x = dsp.mix([dsp.render_layer(l) for l in rec['layers']])
    x = dsp.fx(x, rec.get('master'))
    x = dsp.remove_dc(x)
    if rec.get('loop'):
        x = dsp.loopify(x, rec['loop'], rec.get('xfade', 0.06))
    else:
        x = dsp.end_trim(x)
        x = np.pad(x, ((0, 0), (int(LEAD * dsp.SR), 0)))
    pk = np.abs(x).max()
    return x * (10 ** (-1.5 / 20) / (pk + 1e-12))


def folder(sid):
    return os.path.join(OUT, sid.replace(':', '-'))


def write_mp3(path, x):
    """128 kbps CBR MP3 (libsndfile's LAME), peak kept under -1 dBFS."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    pk = np.abs(x).max()
    if pk > 0.89:
        x = x * (0.89 / pk)
    tmp = path + '.part.mp3'
    sf.write(tmp, np.clip(x, -1, 1).T.astype(np.float32), dsp.SR, format='MP3', subtype='MPEG_LAYER_III', bitrate_mode='CONSTANT', compression_level=0.65)
    os.replace(tmp, path)


def played(x, sid, loop):
    """As the game plays it: cut and levelled (samples.ts cutSfx) at its mix level (MIX_DB); a loop tiled to a demo."""
    y = dsp.as_played(x, sid, loop)
    if loop:
        reps = int(math.ceil(DEMO_LOOP_SECONDS / (y.shape[-1] / dsp.SR)))
        y = np.tile(y, (1, reps))
        k = int(0.3 * dsp.SR)  # a short fade at the demo's very end only
        y[:, -k:] *= np.cos(np.linspace(0, np.pi / 2, k)) ** 2
    else:
        y = np.pad(y, ((0, 0), (int(0.05 * dsp.SR), int(0.15 * dsp.SR))))
    return y


def metrics(x, loop):
    y = x.mean(axis=0)
    env = dsp.envelope(dsp.k_weight(x))
    lv = float(np.sqrt((env ** 2).mean())) if loop else dsp.peak_rms(env)
    spec = np.abs(np.fft.rfft(y * np.hanning(len(y))))
    f = np.fft.rfftfreq(len(y), 1 / dsp.SR)
    cen = float((spec * f).sum() / (spec.sum() + 1e-12))
    e2 = dsp.envelope(x, 0.002)
    t_peak = float(np.argmax(e2) * 0.002)
    return {'seconds': round(x.shape[-1] / dsp.SR, 3), 'loudness_db': round(20 * math.log10(max(lv, 1e-9)), 1),
            'peak_db': round(20 * math.log10(float(np.abs(x).max()) + 1e-12), 1), 'centroid_hz': round(cen), 'to_peak_s': round(t_peak, 3)}


def sources_of(rec):
    out = []
    for l in rec['layers']:
        s = l['src']
        if 'pack' in s:
            out.append('pack: ' + s['pack'])
        elif 'git' in s:
            out.append(f"game take: {s['path'].split('/')[-1]} @ {s['git']}")
        elif 'freesound' in s:
            side = os.path.expanduser(f"~/.cache/rascal-sfx/freesound/{s['freesound']}.json")
            meta = json.load(open(side)) if os.path.exists(side) else {}
            out.append(f"freesound {s['freesound']}: \"{meta.get('name', '?')}\" by {meta.get('username', '?')} (CC0)")
        elif 'fcp' in s:
            out.append('Final Cut Pro library (minor, processed): ' + s['fcp'])
        else:
            out.append('synthesis: ' + s['synth'])
    return sorted(set(out), key=out.index)


def register_freesound(rec):
    """Every Freesound recording a candidate uses goes into scripts/sfx/freesound.json (its author, licence, page)."""
    ids = []
    for l in rec['layers']:
        s = l['src']
        if 'freesound' in s:
            ids.append(s['freesound'])
        elif 'synth' in s:
            ids += [s['args'][k] for k in ('fs', 'fs2') if k in s['args']]
    if not ids:
        return
    reg_path = os.path.join(REPO, 'scripts', 'sfx', 'freesound.json')
    reg = json.load(open(reg_path)) if os.path.exists(reg_path) else {}
    for i in ids:
        side = os.path.expanduser(f'~/.cache/rascal-sfx/freesound/{int(i)}.json')
        m = json.load(open(side))
        reg[str(int(i))] = {'name': m['name'], 'username': m['username'], 'license': m['license'], 'url': m['url']}
    json.dump(dict(sorted(reg.items(), key=lambda kv: int(kv[0]))), open(reg_path, 'w'), indent=1)


def update_json(sid, entries):
    """candidates.json: one entry per candidate; a variant (name `<base>~2`, `~3`...: the game picks one of them at
    random each time) is listed under its base candidate's `variants`, not as a candidate of its own."""
    path = os.path.join(folder(sid), 'candidates.json')
    cur = json.load(open(path)) if os.path.exists(path) else {'id': sid, 'candidates': []}
    by = {c['name']: c for c in cur['candidates']}
    for e in entries:
        if '~' in e['name']:
            base = e['name'].split('~')[0]
            b = by.setdefault(base, {'name': base})
            vs = [v for v in b.get('variants', []) if v['name'] != e['name']] + [{'name': e['name'], 'file': e['file'], 'metrics': e['metrics']}]
            b['variants'] = sorted(vs, key=lambda v: v['name'])
        else:
            by[e['name']] = {**by.get(e['name'], {}), **e}
    order = ['current'] + sorted(k for k in by if k != 'current')
    cur['candidates'] = [by[k] for k in order if k in by]
    json.dump(cur, open(path, 'w'), indent=1)


def current(sid, loop):
    src = os.path.join(REPO, 'public', 'audio', 'sfx', sid.replace(':', '-') + '.mp3')
    x = dsp._read(src)
    y = played(x, sid, loop)
    write_mp3(os.path.join(folder(sid), 'current.mp3'), y)
    return {'name': 'current', 'file': 'current.mp3', 'what': 'The sound the game ships today (public/audio/sfx), cut and levelled as the game plays it.',
            'sources': ['shipped file'], 'metrics': metrics(x, loop)}


if __name__ == '__main__':
    args = sys.argv[1:]
    path = args[0]
    names = [a for a in args[1:] if not a.startswith('--')]
    recs = [r for r in recipes_of(path) if not names or r.get('name') in names or r['id'] in names]
    done = {}
    for rec in recs:
        sid, name = rec['id'], rec['name']
        x = build(rec)
        register_freesound(rec)
        loop = bool(rec.get('loop'))
        os.makedirs(os.path.join(folder(sid), 'wav'), exist_ok=True)
        dsp.write_wav(os.path.join(folder(sid), 'wav', name + '.wav'), x)
        write_mp3(os.path.join(folder(sid), name + '.mp3'), played(x, sid, loop))
        m = metrics(x, loop)
        e = {'name': name, 'file': name + '.mp3', 'what': rec.get('what') or rec['why'], 'sources': sources_of(rec), 'loop': loop, 'metrics': m}
        done.setdefault(sid, []).append(e)
        print(f"{sid:14s} {name:24s} {m['seconds']:5.2f}s  loud {m['loudness_db']:6.1f}  peak {m['peak_db']:5.1f}  centroid {m['centroid_hz']:5d}  to peak {m['to_peak_s']:.3f}", flush=True)
    for sid, entries in done.items():
        loop = any(e['loop'] for e in entries)
        if not os.path.exists(os.path.join(folder(sid), 'current.mp3')) and os.path.exists(os.path.join(REPO, 'public', 'audio', 'sfx', sid.replace(':', '-') + '.mp3')):
            entries.append(current(sid, loop))
        update_json(sid, entries)
