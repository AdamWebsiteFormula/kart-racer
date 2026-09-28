# Recorded ingredients for the sci-fi item sounds (scripts/sfx/scifi): Freesound CC0 recordings through the API,
# and Apple's Final Cut Pro library as a minor, heavily processed ingredient only (house rule, 28 Sept 2026: its
# licence names film, video and audio projects, not games). A recipe names them {freesound: <id>} and {fcp: "<Folder>/<File>.caf"},
# the same shapes the sound lab's builder uses, so candidates stay buildable after the merge.
# Freesound: CC0 only (anything else is refused), the HQ Ogg preview (192 kbps; the MP3 preview is 128) cached under
# ~/.cache/rascal-sfx/freesound/ with a JSON sidecar (id, name, username, license, url). The API key is read from the main
# checkout's .env.local at run time and is never printed or logged. Limits: 60 requests a minute, 2000 a day. Nothing is played.
#   python scripts/sfx/scifi/sources.py search "jet engine start" [n]
#   python scripts/sfx/scifi/sources.py fetch 12345 67890
import hashlib, json, os, subprocess, sys, time, urllib.parse, urllib.request

CACHE = os.path.expanduser(os.environ.get('RASCAL_FREESOUND', '~/.cache/rascal-sfx/freesound'))
FCP_LIB = '/Library/Audio/Apple Loops/Apple/Final Cut Pro Sound Effects'
FCP_CACHE = os.path.expanduser(os.environ.get('RASCAL_FCP_CACHE', '~/.cache/rascal-sfx/fcp-wav'))
ENV_FILES = [os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '.env.local'), '/Users/Adam/code/kart-racer/.env.local']
API = 'https://freesound.org/apiv2'
CC0 = 'Creative Commons 0'
FIELDS = 'id,name,username,license,duration,previews,avg_rating,num_ratings,num_downloads,tags,url,samplerate,channels,description'
_last = [0.0]


def _key():
    for f in ENV_FILES:
        if os.path.exists(f):
            for line in open(f):
                if line.startswith('FREESOUND_API_KEY='):
                    return line.split('=', 1)[1].strip().strip('"').strip("'")
    raise SystemExit('no FREESOUND_API_KEY in .env.local')


def _get(url, params=None, auth=True):
    wait = 1.05 - (time.time() - _last[0])  # at most one request a second
    if wait > 0:
        time.sleep(wait)
    _last[0] = time.time()
    if params:
        url += '?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={'Authorization': f'Token {_key()}'} if auth else {})
    with urllib.request.urlopen(req, timeout=90) as r:
        return r.read()


def _cc0(lic):
    return lic.endswith('/zero/1.0/') or lic == CC0


def search(query, n=15, extra_filter='', sort='score'):
    """CC0 results for `query`, cached: [{id, name, username, license, duration, avg_rating, num_downloads, ...}]."""
    os.makedirs(os.path.join(CACHE, 'search'), exist_ok=True)
    flt = f'license:"{CC0}"' + (f' {extra_filter}' if extra_filter else '')
    tag = hashlib.sha1(json.dumps([query, n, flt, sort, 'scifi']).encode()).hexdigest()[:16]
    path = os.path.join(CACHE, 'search', tag + '.json')
    if os.path.exists(path):
        return json.load(open(path))['results']
    body = json.loads(_get(f'{API}/search/text/', {'query': query, 'filter': flt, 'fields': FIELDS, 'page_size': n, 'sort': sort}))
    res = [r for r in body.get('results', []) if _cc0(r.get('license', ''))]
    json.dump({'query': query, 'filter': flt, 'sort': sort, 'results': res}, open(path, 'w'), indent=1)
    return res


def info(sid):
    side = os.path.join(CACHE, f'{sid}.json')
    if os.path.exists(side):
        d = json.load(open(side))
        if 'previews' in d or 'preview' in d:
            return d
    return json.loads(_get(f'{API}/sounds/{sid}/', {'fields': FIELDS}))


def fetch(sid):
    """The HQ Ogg preview of a CC0 sound (192 kbps), cached: its local path. Refuses anything not CC0."""
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, f'{sid}.ogg')
    side = os.path.join(CACHE, f'{sid}.json')
    if os.path.exists(path) and os.path.exists(side):
        return path
    r = json.loads(_get(f'{API}/sounds/{sid}/', {'fields': FIELDS}))
    lic = r.get('license', '')
    if not _cc0(lic):
        raise SystemExit(f'{sid} is not CC0 ({lic}): not used')
    url = r['previews']['preview-hq-ogg']
    data = _get(url, auth=False)
    open(path + '.part', 'wb').write(data)
    os.replace(path + '.part', path)
    old = json.load(open(side)) if os.path.exists(side) else {}
    json.dump({**old, 'id': r['id'], 'name': r['name'], 'username': r['username'], 'license': lic, 'url': r.get('url') or f'https://freesound.org/s/{sid}/',
               'preview_ogg': url, 'preview': old.get('preview') or r['previews'].get('preview-hq-mp3'), 'duration': r.get('duration'),
               'tags': r.get('tags', []), 'avg_rating': r.get('avg_rating'), 'num_downloads': r.get('num_downloads')}, open(side, 'w'), indent=1)
    return path


def local(sid):
    """The cached file for a Freesound id (the Ogg preview, or the sound lab's MP3 one), fetched if missing."""
    for ext in ('ogg', 'mp3'):
        p = os.path.join(CACHE, f'{sid}.{ext}')
        if os.path.exists(p):
            return p
    return fetch(sid)


def meta(sid):
    side = os.path.join(CACHE, f'{sid}.json')
    return json.load(open(side)) if os.path.exists(side) else {}


def fcp(rel):
    """A WAV (float32) of a Final Cut Pro library file (AAC in CAF, decoded by macOS afconvert), cached."""
    src = os.path.join(FCP_LIB, rel)
    if not os.path.exists(src):
        raise FileNotFoundError(src)
    os.makedirs(FCP_CACHE, exist_ok=True)
    out = os.path.join(FCP_CACHE, hashlib.sha1(rel.encode()).hexdigest()[:12] + '-' + os.path.basename(rel).replace('.caf', '.wav'))
    if not os.path.exists(out):
        subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEF32', src, out + '.part.wav'], check=True)
        os.replace(out + '.part.wav', out)
    return out


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'search':
        n = int(sys.argv[3]) if len(sys.argv) > 3 else 15
        res = search(sys.argv[2], n, sys.argv[4] if len(sys.argv) > 4 else '')
        res.sort(key=lambda r: -((r.get('avg_rating') or 0) * 2 + min(5, (r.get('num_downloads') or 0) / 400)))
        for r in res:
            print(f"{r['id']:>7}  {r.get('duration', 0):6.1f}s  {r.get('samplerate', 0) / 1000:4.1f}k  rating {r.get('avg_rating', 0):.1f} ({r.get('num_ratings', 0):3d})  "
                  f"dl {r.get('num_downloads', 0):6d}  {r['username'][:16]:16s}  {r['name'][:56]}")
    elif cmd == 'fetch':
        for sid in sys.argv[2:]:
            print(fetch(int(sid)))
    elif cmd == 'fcp':
        for rel in sys.argv[2:]:
            print(fcp(rel))
