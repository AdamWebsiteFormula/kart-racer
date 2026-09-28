# Freesound (freesound.org), CC0 recordings only: search and fetch the HQ preview of a sound through the API,
# cached under ~/.cache/rascal-sfx/freesound/ with a JSON sidecar per file (id, name, username, license, url).
# A recipe names a used sound as {freesound: <id>}; scripts/sfx/freesound.json (tracked) records each one used,
# and CREDITS.md names its author. The API key is read from the main checkout's .env.local at run time and is
# never printed or logged. Limits: 60 requests a minute, 2000 a day (every answer is cached). Nothing is played.
#   python scripts/sfx/freesound.py search "tire squeal" [n]      top CC0 hits, by rating and downloads
#   python scripts/sfx/freesound.py fetch 12345 67890             their HQ previews into the cache
import hashlib, json, os, sys, time, urllib.parse, urllib.request

CACHE = os.path.expanduser(os.environ.get('RASCAL_FREESOUND', '~/.cache/rascal-sfx/freesound'))
ENV_FILES = [os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '.env.local'), '/Users/Adam/code/kart-racer/.env.local']
API = 'https://freesound.org/apiv2'
CC0 = 'Creative Commons 0'
FIELDS = 'id,name,username,license,duration,previews,avg_rating,num_ratings,num_downloads,tags,url,samplerate,channels'
_last = [0.0]


def _key():
    for f in ENV_FILES:
        if os.path.exists(f):
            for line in open(f):
                if line.startswith('FREESOUND_API_KEY='):
                    return line.split('=', 1)[1].strip().strip('"').strip("'")
    raise SystemExit('no FREESOUND_API_KEY in .env.local')


def _get(url, params=None, auth=True):
    # at most one request a second (the limit is 60 a minute)
    wait = 1.05 - (time.time() - _last[0])
    if wait > 0:
        time.sleep(wait)
    _last[0] = time.time()
    if params:
        url += '?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={'Authorization': f'Token {_key()}'} if auth else {})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def search(query, n=15, extra_filter='', sort='score'):
    """CC0 results for `query` (cached): [{id, name, username, license, duration, avg_rating, num_downloads, ...}]."""
    os.makedirs(os.path.join(CACHE, 'search'), exist_ok=True)
    flt = f'license:"{CC0}"' + (f' {extra_filter}' if extra_filter else '')
    tag = hashlib.sha1(json.dumps([query, n, flt, sort]).encode()).hexdigest()[:16]
    path = os.path.join(CACHE, 'search', tag + '.json')
    if os.path.exists(path):
        return json.load(open(path))['results']
    body = json.loads(_get(f'{API}/search/text/', {'query': query, 'filter': flt, 'fields': FIELDS, 'page_size': n, 'sort': sort}))
    res = [r for r in body.get('results', []) if r.get('license', '').endswith('/zero/1.0/') or r.get('license') == CC0]
    json.dump({'query': query, 'filter': flt, 'sort': sort, 'results': res}, open(path, 'w'), indent=1)
    return res


def info(sid):
    """One sound's details (cached sidecar)."""
    side = os.path.join(CACHE, f'{sid}.json')
    if os.path.exists(side):
        return json.load(open(side))
    r = json.loads(_get(f'{API}/sounds/{sid}/', {'fields': FIELDS}))
    return r


def fetch(sid):
    """The HQ MP3 preview of a CC0 sound, cached: its local path. Refuses anything not CC0."""
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, f'{sid}.mp3')
    side = os.path.join(CACHE, f'{sid}.json')
    if os.path.exists(path) and os.path.exists(side):
        return path
    r = info(sid)
    lic = r.get('license', '')
    if not (lic.endswith('/zero/1.0/') or lic == CC0):
        raise SystemExit(f'{sid} is not CC0 ({lic}): not used')
    url = r['previews']['preview-hq-mp3']
    data = _get(url, auth=False)
    open(path + '.part', 'wb').write(data)
    os.replace(path + '.part', path)
    json.dump({'id': r['id'], 'name': r['name'], 'username': r['username'], 'license': lic, 'url': r.get('url') or f'https://freesound.org/s/{sid}/',
               'preview': url, 'duration': r.get('duration'), 'tags': r.get('tags', []), 'avg_rating': r.get('avg_rating'),
               'num_downloads': r.get('num_downloads')}, open(side, 'w'), indent=1)
    return path


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'search':
        n = int(sys.argv[3]) if len(sys.argv) > 3 else 15
        res = search(sys.argv[2], n, sys.argv[4] if len(sys.argv) > 4 else '')
        res.sort(key=lambda r: -((r.get('avg_rating') or 0) * 2 + min(5, (r.get('num_downloads') or 0) / 400)))
        for r in res:
            print(f"{r['id']:>7}  {r.get('duration', 0):6.1f}s  rating {r.get('avg_rating', 0):.1f} ({r.get('num_ratings', 0):3d})  dl {r.get('num_downloads', 0):6d}  "
                  f"{r['username'][:16]:16s}  {r['name'][:60]}")
    elif cmd == 'fetch':
        for sid in sys.argv[2:]:
            print(fetch(int(sid)))
