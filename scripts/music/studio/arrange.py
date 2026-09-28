# Arranging helpers: section writing (a lead line harmonized in close or drop-2 voicings), chord comping on a
# rhythm grid with voice leading, pads, and small note-list tools. The lines themselves are written in songs/.
import numpy as np
from .score import Note, chord_at
from .theory import Chord, SCALES, pc as pc_of


def shift(notes, beats=0.0, semis=0, vel=1.0):
    return [n.copy(t=n.t + beats, p=(n.p + semis) if not isinstance(n.p, str) else n.p, v=min(1.0, n.v * vel)) for n in notes]


def repeat(notes, times, every):
    out = []
    for k in range(times):
        out += shift(notes, k * every)
    return out


def tremolo(notes, step=0.25, soft=0.78, keep_first=True):
    """Tremolo picking: each note becomes repeated `step`-beat notes, down-strokes a little harder than up-strokes."""
    out = []
    for n in notes:
        k = max(1, int(round(n.d / step)))
        for i in range(k):
            v = n.v * (1.0 if i % 2 == 0 else soft)
            art = set(n.art) if (i == 0 and keep_first) else set()
            out.append(n.copy(t=n.t + i * step, d=step * 0.98, v=v, art=frozenset(art)))
    return out


def window(notes, a, b):
    return [n for n in notes if a - 1e-9 <= n.t < b - 1e-9]


def _four(ch: Chord):
    """The four pitch classes a section plays for a chord: 3rd and 7th (or 6th) always, then root or its tension."""
    ivs = sorted(set(i % 12 for i in ch.ivs))
    guide = [i for i in ivs if i in (3, 4)] + [i for i in ivs if i in (9, 10, 11)]
    rest = [i for i in ivs if i not in guide]
    # prefer 5th, then root, then tensions (2 = 9th)
    pref = [7, 0, 2, 5, 6, 8, 1]
    rest.sort(key=lambda i: pref.index(i) if i in pref else 9)
    sel = (guide + rest)[:4]
    while len(sel) < 4:
        sel.append(0 if 0 not in sel else 7)
    return [(ch.root + i) % 12 for i in sel]


def voicing_under(lead, ch: Chord, n=4, drop2=True, scale=None, prev=None):
    """Notes under `lead` (lead first) for a chord: close position with the lead's pitch class taking the place of
    the chord tone just under it when the lead is a tension; drop-2 spreads it."""
    pcs = _four(ch)
    lp = lead % 12
    if lp not in pcs:
        # the lead is a tension or a passing note: it replaces the chord tone a step below it (9 for root, 13 for 5)
        below = sorted(pcs, key=lambda p: (lp - p) % 12)
        repl = next((p for p in below if 1 <= (lp - p) % 12 <= 2), None)
        if repl is not None and repl not in [(ch.root + i) % 12 for i in ch.ivs if i % 12 in (3, 4, 10, 11)]:
            pcs = [lp if p == repl else p for p in pcs]
        else:
            pcs = [lp] + [p for p in pcs if p != (lp - 1) % 12][:3]
    else:
        pcs = pcs[:]
    notes = [lead]
    cur = lead
    ring = sorted(set(pcs), key=lambda p: (lp - p) % 12)  # descending from the lead
    k = 1
    while len(notes) < n:
        p = ring[k % len(ring)]
        k += 1
        m = cur - ((cur - p) % 12 or 12)
        notes.append(m)
        cur = m
    if drop2 and n >= 4:
        notes[1] -= 12
        notes = [notes[0]] + sorted(notes[1:], reverse=True)
    return notes


def harmonize(lead_notes, prog, n=4, drop2=True, parallel_short=0.26, key=None):
    """Voices for a lead line: [voice1 (the lead), voice2, ...]. Notes shorter than `parallel_short` beats that are
    not chord tones move in parallel with the previous voicing (diatonic when `key` = (tonic, scale) is given)."""
    voices = [[] for _ in range(n)]
    last = None
    for m in sorted(lead_notes, key=lambda x: x.t):
        ch = chord_at(prog, m.t + 0.01)
        chord_pcs = set(ch.pcs)
        if last is not None and m.d < parallel_short and (m.p % 12) not in chord_pcs:
            d = m.p - last[0]
            if key:
                tonic, scale = key
                sc = [(tonic + s) % 12 for s in SCALES[scale]]
                vs = [m.p] + [_diatonic_move(v, d, sc, m.p - last[0]) for v in last[1:]]
            else:
                vs = [v + d for v in last]
        else:
            vs = voicing_under(m.p, ch, n, drop2)
        for i in range(n):
            voices[i].append(m.copy(p=vs[i]))
        last = vs
    return voices


def _diatonic_move(v, lead_move, sc, _):
    """Move a harmony note by the same number of scale steps the lead moved (approximately)."""
    if lead_move == 0:
        return v
    step = 1 if lead_move > 0 else -1
    target = v + lead_move
    # snap to the scale
    for d in (0, step, -step, 2 * step):
        if (target + d) % 12 in sc:
            return target + d
    return target


def comp(prog, grid, lo, hi, n=4, vel=0.7, dur=None, steps=16, t0=None, t1=None, accent=None, top=None):
    """Chord hits on a step grid ('x' hit, 'X' accent, '-' held from the last hit), voiced within lo..hi and voice-led."""
    out, prev = [], None
    bar = 4.0
    step = bar / steps
    start, end = prog[0][0], prog[-1][0] + prog[-1][1]
    t0 = start if t0 is None else t0
    t1 = end if t1 is None else t1
    pat = grid.replace(' ', '').replace('|', '')
    L = len(pat)
    t = t0
    i = 0
    while t < t1 - 1e-9:
        ch_ = pat[i % L]
        if ch_ in 'xX':
            # length: until the next non-'-' step
            j = 1
            while pat[(i + j) % L] == '-' and t + j * step < t1:
                j += 1
            d = dur if dur is not None else j * step * 0.9
            ch = chord_at(prog, t + 0.01)
            from .theory import voice_lead
            vs = voice_lead(prev, ch, lo, hi, n)
            if top is not None:
                vs = sorted(vs)
            prev = vs
            v = vel * (1.15 if ch_ == 'X' else 1.0)
            for p in vs:
                out.append(Note(t, d, p, min(1.0, v)))
        t += step
        i += 1
    return out


def pad(prog, lo, hi, n=4, vel=0.6, legato=0.98, t0=None, t1=None):
    out, prev = [], None
    from .theory import voice_lead
    for (s, d, ch) in prog:
        if t0 is not None and s < t0 - 1e-9:
            continue
        if t1 is not None and s >= t1 - 1e-9:
            continue
        vs = voice_lead(prev, ch, lo, hi, n)
        prev = vs
        for p in vs:
            out.append(Note(s, d * legato, p, vel))
    return out


def roots(prog, octave_lo=28, octave_hi=47):
    """The chord roots (or given bass notes) placed between two MIDI notes: [(beat, beats, midi)]."""
    out = []
    for (s, d, ch) in prog:
        b = ch.bass
        m = octave_lo + ((b - octave_lo) % 12)
        if m > octave_hi:
            m -= 12
        out.append((s, d, m))
    return out
