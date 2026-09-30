"""Put overhaul candidates Adam has passed by ear into the game's recipes (29 Sept 2026).

    python3 scripts/sfx/approve.py --verdict "Adam, 30 Sept 2026, by ear: yes" throw bounce drift ...

For each id: records the verdict in scripts/sfx/approved.ts (recipes.ts then takes that candidate from cands-*.ts in
the id's place), and when an ElevenLabs take made the sound, moves its prompt from the catalog's SFX to REPLACED
(history: generate.ts never makes it again). Then build the sounds from the private packs:

    RASCAL_SFX_PACKS=<rascal-sfx-source>/packs python3 scripts/sfx/build.py <ids>

and run the provenance test (src/audio/provenance.test.ts). An id with no candidate stops it before anything changes.
"""
import argparse, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
APPROVED = os.path.join(HERE, 'approved.ts')
CATALOG = os.path.join(ROOT, 'scripts', 'elevenlabs', 'catalog.ts')
MANIFEST = os.path.join(ROOT, 'public', 'audio', 'manifest.json')
CREDITS = os.path.join(ROOT, 'CREDITS.md')
# a new row for each free pack the first time a sound Adam passes draws on it (licences read 29 Sept 2026 from each
# pack's own licence file, or its page for the two with none: muted.io/performance-cars, lentikula.itch.io)
PACK_ROWS = [
    (r'^Sonniss', 'Sonniss', "| Sound effect layers: the Sonniss #GameAudioGDC 2026 bundle (SoundBits, Epic Stock Media, Cinematic Sound Design, 344 Audio, Just Sound Effects, InMotionAudio, CB Sounddesign, David Dumais Audio) | Sonniss and the bundle's sound designers | Sonniss #GameAudioGDC bundle license: royalty-free, no attribution required |"),
    (r'^99', '99Sounds', "| Sound effect layers: 99 Sound Effects, Sci-Fi Sound Effects (Rescopic Sound), Electromagnetic Fields and Sound Design Tools (Gavin Thibodeau, aka Embra), from 99Sounds | 99Sounds and its sound designers | 99Sounds license: royalty-free, no attribution required |"),
    (r'NOX_SOUND', 'Nox Sound', "| Sound effect layers: the Essentials series (footsteps, the Iceland sea) | Nox Sound | CC0 1.0 (public domain) |"),
    (r'Spell_Impacts', 'Lentikula', "| Sound effect layers: Basic Spell Impacts, Druid Spell Impacts | Lentikula | CC0 1.0 (public domain) |"),
    (r'mutedio', 'Muted.io', "| Sound effect layers: the Performance Cars sample pack | Muted.io | CC0 1.0 (public domain) |"),
]


def candidates():
    """Every candidate recipe by id."""
    found = {}
    for f in sorted(os.listdir(HERE)):
        if f.startswith('cands-') and f.endswith('.ts'):
            out = subprocess.run(['node', os.path.join(HERE, 'recipes-json.ts'), os.path.join(HERE, f)], capture_output=True, text=True, check=True).stdout
            for line in out.splitlines():
                if line.strip():
                    r = json.loads(line)
                    found[r['id']] = json.loads(r['json'])
    return found


def list_new(recipes):
    """A sound the game never had (a course's bed): into the manifest, and its moment (where it plays) into the
    catalog's MOMENT, which the provenance test asks of every recipe. Returns the ids added."""
    manifest = json.load(open(MANIFEST))
    new = [r for r in recipes if r['id'] not in manifest['sfx']]
    if not new:
        return []
    for r in new:
        manifest['sfx'][r['id']] = {'url': f"audio/sfx/{r['id']}.mp3", **({'loop': True} if r.get('loop') else {})}
    open(MANIFEST, 'w').write(json.dumps(manifest, indent=1) + '\n')
    # the credits' count of the game's sounds (the Credits screen shows it; ui-hud screens.test holds it to the manifest)
    text = open(CREDITS).read()
    open(CREDITS, 'w').write(re.sub(r'Sound effects: \d+ original sounds', f"Sound effects: {len(manifest['sfx'])} original sounds", text, count=1))
    src = open(CATALOG).read()
    start = src.index('export const MOMENT')
    close = src.index('\n});', start)
    lines = ''.join(f"\n  {json.dumps(r['id'])}: {json.dumps(r['brief'])}," for r in new if f"'{r['id']}'" not in src[start:close] and f'"{r["id"]}"' not in src[start:close])
    open(CATALOG, 'w').write(src[:close] + lines + src[close:])
    return [r['id'] for r in new]


def read_approved():
    pairs = re.findall(r'^  ("(?:[^"\\]|\\.)*"): ("(?:[^"\\]|\\.)*"),$', open(APPROVED).read(), re.M)
    return {json.loads(k): json.loads(v) for k, v in pairs}


def write_approved(entries):
    head = open(APPROVED).read().split('export const APPROVED')[0]
    body = ''.join(f'  {json.dumps(k)}: {json.dumps(v)},\n' for k, v in sorted(entries.items()))
    open(APPROVED, 'w').write(f'{head}export const APPROVED: Readonly<Record<string, string>> = {{\n{body}}};\n')


def retire(ids, verdict):
    """Move each id's one-line prompt from SFX to the end of REPLACED; return the ids moved."""
    lines = open(CATALOG).read().split('\n')
    start = lines.index('export const SFX: readonly SfxSpec[] = [')
    end = lines.index('];', start)
    rep = lines.index('export const REPLACED: readonly SfxSpec[] = [')
    rep_end = lines.index('];', rep)
    take = set()
    moved = []
    for i in range(start + 1, end):
        m = re.match(r"^  \{ id: '([^']+)'", lines[i])
        if m and m.group(1) in ids:
            j = i  # its own history comments ("// remade ...", "// retaken ...") go with it
            while re.match(r'^  // (remade|retaken)', lines[j - 1]):
                j -= 1
            take |= set(range(j, i + 1))
            moved.append((m.group(1), lines[j:i + 1]))
    if not moved:
        return []
    keep = [line for i, line in enumerate(lines) if i not in take]
    rep_end -= len(take)  # REPLACED sits below SFX, so its end moved up by the lines taken out
    note = f'  // replaced by the overhaul recipes (scripts/sfx/cands-*.ts): {verdict}'
    keep[rep_end:rep_end] = [note] + [line for _, block in moved for line in block]
    open(CATALOG, 'w').write('\n'.join(keep))
    return [i for i, _ in moved]


def credit(recipes):
    """A new CREDITS.md row, under the sound rows, for each pack these recipes draw on that it does not name yet."""
    packs = {l['src']['pack'] for r in recipes for l in r['layers'] if 'pack' in l['src']}
    text = open(CREDITS).read()
    rows = [row for pat, name, row in PACK_ROWS if name not in text and any(re.search(pat, p) for p in packs)]
    if rows:
        anchor = text.index('| Sound effect layers: glockenspiel')
        end = text.index('\n', anchor) + 1
        open(CREDITS, 'w').write(text[:end] + ''.join(r + '\n' for r in rows) + text[end:])
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--verdict', required=True, help="Adam's words, dated: why each replaced what shipped")
    ap.add_argument('ids', nargs='+')
    a = ap.parse_args()
    if len(a.verdict) <= 20:
        sys.exit('the verdict must say who, when and what (over 20 characters: the provenance test asks it of every recipe)')
    have = candidates()
    missing = [i for i in a.ids if i not in have]  # (have: id -> recipe)
    if missing:
        sys.exit(f'no candidate for: {", ".join(missing)}')
    entries = read_approved()
    for i in a.ids:
        entries[i] = a.verdict
    write_approved(entries)
    moved = retire(set(a.ids), a.verdict)
    added = list_new([have[i] for i in a.ids])
    rows = credit([have[i] for i in a.ids])
    print(f'approved {len(a.ids)}: {" ".join(a.ids)}')
    print(f'new to the game (manifest and MOMENT): {" ".join(added) or "none"}')
    print(f'ElevenLabs prompts moved to REPLACED: {" ".join(moved) or "none"}')
    print(f'CREDITS.md rows added: {len(rows)}')
    print(f'next: RASCAL_SFX_PACKS=<rascal-sfx-source>/packs python3 scripts/sfx/build.py {" ".join(a.ids)}')


if __name__ == '__main__':
    main()
