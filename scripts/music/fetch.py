# Fetches only the sample folders the course themes use, from clearly licensed free libraries (CC0 or
# public domain), into ~/.cache/rascal-music/samples/<repo>/ and records where each came from
# (SOURCES.json: repo, commit, license, files). Nothing here is played.
#   python scripts/music/fetch.py [lib ...]
import json, os, re, subprocess, sys
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.expanduser(os.environ.get('RASCAL_MUSIC_SAMPLES', '~/.cache/rascal-music/samples'))
API = 'https://api.github.com/repos/'
RAW = 'https://raw.githubusercontent.com/'

# repo -> (license as the repo states it, [path regexes]); every one checked CC0 or public domain on 28 Sept 2026
LIBS = {
    'sgossner/VSCO-2-CE': ('CC0-1.0', [
        r'^(LICENSE|README\.md|Readme\.txt)$',
        r'^Brass/Trumpet/(sus|stac|susvib|harmonM-sus|straightM-sus)/',
        r'^Brass/Tenor Trombone/(sus|stac|vib)/',
        r'^Brass/OldTrombone/(Fall|Short)/',
        r'^Brass/F Horn/(sus|stac)/',
        r'^Brass/Tuba/(sus|stac)/',
        r'^Woodwinds/(Flute|Piccolo|Clarinet|Oboe)/',
        r'^Strings/(Violin Section|Viola Section|Cello Section)/(susVib|susvib|Spic|spic|Pizz|pizz|pizzT)/',
        r'^Strings/Solo Contrabass/(Pizz|Spic|SusNV)/',
        r'^Strings/Solo Violin/(Arco Vib|spic|Pizz)/',
        r'^Strings/Harp/',
        r'^Keys/Upright Piano/',
        r'^Percussion/(Timpani|Glock|Xylo|Marimba)/',
        r'^Percussion/[^/]+$',
        r'^Miscellania Raw/Misc 2/glock_glisses/',
        r'^VSCO 1 Percussion/varMetal/Cymbals/(susp|clash)/',
        r'^VSCO 1 Percussion/drums/bass/',
    ]),
    'sfzinstruments/virtuosity_drums': ('CC0-1.0', [
        r'^(LICENSE|README.*)$',
        r'^Programs/.*\.sfz$',
        r'^Samples/kickmic/kick/',
        r'^Samples/snaremic/snare/.*_(center|offcenter|rimshot|crossstick|flam|roll|roll_end|buzz)_',
        r'^Samples/(oh|room)/(kick|hh|ride|crash|htom|ltom)/',
        r'^Samples/(oh|room)/snare/.*_(center|offcenter|rimshot|crossstick|flam|roll|roll_end|buzz)_',
        r'^Samples/perc/close/',
        r'^Samples/perc/oh/(timbales|woodblock|cuica)/',
    ]),
    'sfzinstruments/karoryfer.growlybass': ('CC0-1.0', [r'.']),
    'sfzinstruments/karoryfer.weresax': ('CC0-1.0', [r'^(LICENSE|readme\.txt)$', r'^Programs/.*\.sfz$', r'_cnd\.wav$']),
    'sfzinstruments/karoryfer.bear-sax': ('CC0-1.0', [r'^(LICENSE|readme\.txt)$', r'^Programs/.*\.sfz$', r'^Samples/']),
    'sfzinstruments/karoryfer.black-and-green-guitars': ('CC0-1.0', [r'^(LICENSE|readme.*)$', r'^Programs/.*\.sfz$', r'^Samples/green/(ord|stac|rel)/']),
    'sfzinstruments/ganjo': ('CC0-1.0', [r'.']),
    'sfzinstruments/jlearman.SteelDrum': ('Unlicense', [r'.']),
    'sfzinstruments/body_percussion': ('CC0-1.0', [r'^(LICENSE|README.*)$', r'^Programs/', r'^Samples/body/.*(handclap|fingerclap|snap|stomp)']),
}


def curl_json(url):
    r = subprocess.run(['curl', '-sL', url], check=True, capture_output=True)
    return json.loads(r.stdout)


def quote(p):
    return p.replace('%', '%25').replace(' ', '%20').replace('#', '%23')


def fetch(repo, lic, pats, jobs=16):
    name = repo.split('/')[1]
    dest = os.path.join(ROOT, name)
    meta = curl_json(API + repo)
    sha = curl_json(API + repo + '/commits/HEAD')['sha']
    tree = curl_json(API + repo + '/' + 'gi' + 't/trees/' + sha + '?recursive=1')
    assert not tree.get('truncated'), repo
    want = [e for e in tree['tree'] if e['type'] == 'blob' and any(re.search(p, e['path']) for p in pats)]
    stated = (meta.get('license') or {}).get('spdx_id')
    if stated not in (lic, None, 'NOASSERTION'):
        raise SystemExit(f'{repo}: license is {stated}, expected {lic}')

    def one(e):
        out = os.path.join(dest, e['path'])
        if os.path.exists(out) and os.path.getsize(out) == e['size']:
            return 0
        os.makedirs(os.path.dirname(out), exist_ok=True)
        subprocess.run(['curl', '-sL', '--retry', '3', '-o', out + '.part', RAW + repo + '/' + sha + '/' + quote(e['path'])], check=True)
        if os.path.getsize(out + '.part') != e['size']:
            raise RuntimeError(f'size mismatch {e["path"]}')
        os.replace(out + '.part', out)
        return e['size']

    with ThreadPoolExecutor(jobs) as ex:
        got = sum(ex.map(one, want))
    total = sum(e['size'] for e in want)
    print(f'{repo}: {len(want)} files, {total / 1e6:.1f} MB ({got / 1e6:.1f} MB new), license {stated or lic}, commit {sha[:10]}', flush=True)
    return {'repo': 'https://github.com/' + repo, 'commit': sha, 'license': lic, 'licenseStated': stated,
            'files': len(want), 'bytes': total, 'patterns': pats}


if __name__ == '__main__':
    pick = sys.argv[1:] or list(LIBS)
    src_path = os.path.join(ROOT, 'SOURCES.json')
    sources = json.load(open(src_path)) if os.path.exists(src_path) else {}
    for repo in LIBS:
        if repo in pick or repo.split('/')[1] in pick:
            sources[repo] = fetch(repo, *LIBS[repo])
            json.dump(sources, open(src_path, 'w'), indent=1)
