# A small SFZ reader: headers, inherited opcodes, #define and #include. It returns regions as dicts of
# opcodes (strings), with `sample` resolved to a file path; the instrument loaders decide what to use.
import os, re

HEADERS = ('control', 'global', 'master', 'group', 'region', 'curve', 'effect')


def _strip_comments(text):
    out = []
    for line in text.splitlines():
        i = line.find('//')
        out.append(line if i < 0 else line[:i])
    return out


def _expand(path, root, defines, seen=None):
    """Lines of `path` with #include expanded (relative to the root file's folder) and #define applied."""
    seen = seen or set()
    if path in seen:
        return []
    seen = seen | {path}
    lines = []
    with open(path, encoding='utf-8', errors='replace') as f:
        raw = _strip_comments(f.read())
    for line in raw:
        s = line.strip()
        m = re.match(r'#define\s+(\$\w+)\s+(\S+)', s)
        if m:
            defines[m.group(1)] = m.group(2)
            continue
        m = re.match(r'#include\s+"([^"]+)"', s)
        if m:
            inc = os.path.join(root, m.group(1).replace('\\', '/'))
            if os.path.exists(inc):
                lines += _expand(inc, root, defines, seen)
            continue
        for k in sorted(defines, key=len, reverse=True):
            if k in line:
                line = line.replace(k, defines[k])
        lines.append(line)
    return lines


_OPC = re.compile(r'(\w+)=')


def _pairs(chunk):
    """'lokey=40 hikey=41 sample=a b.wav' -> dict; a sample path may contain spaces (it runs to the next opcode)."""
    out = {}
    ms = list(_OPC.finditer(chunk))
    for i, m in enumerate(ms):
        end = ms[i + 1].start() if i + 1 < len(ms) else len(chunk)
        val = chunk[m.end():end].strip()
        out[m.group(1)] = val
    return out


def parse(path, root=None):
    """Regions of an SFZ file; `root` is the folder paths are relative to (the program's, for a map file)."""
    root = root or os.path.dirname(os.path.abspath(path))
    lines = _expand(os.path.abspath(path), root, {})
    text = '\n'.join(lines)
    toks = re.split(r'<(' + '|'.join(HEADERS) + r')>', text)
    ctx = {'control': {}, 'global': {}, 'master': {}, 'group': {}}
    regions = []
    head = None
    for i, t in enumerate(toks):
        if i % 2 == 1:
            head = t
            if head == 'global':
                ctx['global'], ctx['master'], ctx['group'] = {}, {}, {}
            elif head == 'master':
                ctx['master'], ctx['group'] = {}, {}
            elif head == 'group':
                ctx['group'] = {}
            elif head == 'control':
                ctx['control'] = {}
            continue
        body = ' '.join(t.split('\n'))
        # a sample path may contain spaces, so split opcodes line by line first
        kv = {}
        for line in t.split('\n'):
            if line.strip():
                kv.update(_pairs(line))
        if head in ('control', 'global', 'master', 'group'):
            ctx[head].update(kv)
        elif head == 'region':
            r = {}
            r.update(ctx['global']); r.update(ctx['master']); r.update(ctx['group']); r.update(kv)
            if 'sample' in r:
                base = ctx['control'].get('default_path', '')
                r['sample'] = os.path.normpath(os.path.join(root, (base + r['sample']).replace('\\', '/')))
                regions.append(r)
        del body
    return regions


def keynum(v):
    """An SFZ key: a MIDI number or a note name (c4 = 60)."""
    if v is None:
        return None
    try:
        return int(v)
    except ValueError:
        m = re.match(r'^([a-gA-G])(#|b)?(-?\d+)$', v)
        pcs = {'c': 0, 'd': 2, 'e': 4, 'f': 5, 'g': 7, 'a': 9, 'b': 11}[m.group(1).lower()]
        acc = {'#': 1, 'b': -1}.get(m.group(2), 0)
        return 12 * (int(m.group(3)) + 1) + pcs + acc


def key_range(r):
    if 'key' in r:
        k = keynum(r['key'])
        return k, k, keynum(r.get('pitch_keycenter', r['key']))
    lo = keynum(r.get('lokey', '0'))
    hi = keynum(r.get('hikey', '127'))
    kc = keynum(r.get('pitch_keycenter', str(lo)))
    return lo, hi, kc
