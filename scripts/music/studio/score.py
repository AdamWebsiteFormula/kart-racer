# The score: notes in beats, parts, a song with an intro played once and a loop, and the small text
# notation the songs are written in. Every note is written by hand in songs/*.py; this file only reads it.
#
# Melody notation, tokens separated by spaces:
#   Bb4:8    a note (C4 = middle C); the octave may be left off: the note nearest the previous one
#   :4 :8 :16 :2 :1 :32    quarter, eighth, sixteenth, half, whole, 32nd; '.' dots, 't' triplet, '4+16' ties lengths
#   r:4      a rest            [Bb3 D4 F4]:4   a chord            |   a bar line (checked)
#   flags after the length: > accent, ^ marcato (short and hard), ' staccato, _ tenuto,
#     !fall !doit !shake !scoop !bend !vib !growl !gliss !ghost !sl (slur into the next note)
#   @96 velocity 0-127 on one note;  pp p mp mf f ff  set the level from here on
#   a length left off repeats the last one
import math, re
import numpy as np
from .theory import midi, pc, Chord

DYN = {'ppp': 0.2, 'pp': 0.3, 'p': 0.42, 'mp': 0.55, 'mf': 0.68, 'f': 0.8, 'ff': 0.92, 'fff': 1.0}
FLAGS = {'>': 'acc', '^': 'marc', "'": 'stac', '_': 'ten'}


class Note:
    __slots__ = ('t', 'd', 'p', 'v', 'art', 'x')

    def __init__(self, t, d, p, v=0.7, art=(), x=None):
        self.t, self.d, self.p, self.v = float(t), float(d), p, float(v)
        self.art = frozenset(art)
        self.x = dict(x or {})

    def copy(self, **kw):
        n = Note(self.t, self.d, self.p, self.v, self.art, self.x)
        for k, v in kw.items():
            setattr(n, k, v)
        return n

    def __repr__(self):
        return f'Note({self.t:.3f}, {self.d:.3f}, {self.p}, {self.v:.2f}, {sorted(self.art)})'


def length(tok):
    """'4.' -> 1.5 beats, '8t' -> 1/3, '2+8' -> 2.5."""
    total = 0.0
    for part in tok.split('+'):
        m = re.match(r'^(\d+)(t?)(\.*)$', part)
        if not m:
            raise ValueError(f'bad length {tok!r}')
        b = 4.0 / int(m.group(1))
        if m.group(2):
            b *= 2 / 3
        dots = len(m.group(3))
        b *= (2 - 0.5 ** dots)
        total += b
    return total


_TOK = re.compile(r"^(\[[^\]]*\]|[A-Ga-gr][#b]*-?\d*)(?::([0-9t.+]+))?((?:[>^'_]|!\w+|@\d+|~)*)$")


def seq(text, t0=0.0, v=None, bar=4.0, strict=True, transpose=0):
    """Parse a line of notation starting at beat t0. Returns (notes, end_beat)."""
    notes, t, last_len, last_pitch, vel = [], float(t0), 1.0, None, v if v is not None else DYN['mf']
    tie_next = False
    for tok in re.findall(r'\[[^\]]*\]\S*|\S+', text.replace('\n', ' ')):
        if tok == '|':
            if strict and abs(((t - t0) / bar) - round((t - t0) / bar)) > 1e-6:
                raise ValueError(f'bar line at beat {t - t0:.3f} (not on a bar) in: {text[:60]}...')
            continue
        if tok in DYN:
            vel = DYN[tok]
            continue
        m = _TOK.match(tok)
        if not m:
            raise ValueError(f'bad token {tok!r}')
        head, ln, flags = m.group(1), m.group(2), m.group(3) or ''
        if ln:
            last_len = length(ln)
        dur = last_len
        art, x, nv = set(), {}, vel
        for f in re.findall(r"!\w+|@\d+|[>^'_~]", flags):
            if f.startswith('!'):
                art.add(f[1:])
            elif f.startswith('@'):
                nv = int(f[1:]) / 127
            elif f == '~':
                art.add('tie')
            else:
                art.add(FLAGS[f])
        if 'acc' in art:
            nv = min(1.0, nv + 0.12)
        if 'marc' in art:
            nv = min(1.0, nv + 0.15)
        if 'ghost' in art:
            nv *= 0.45
        if head == 'r':
            t += dur
            continue
        heads = head[1:-1].split() if head.startswith('[') else [head]
        ps = []
        for h in heads:
            if re.search(r'-?\d+$', h):
                p = midi(h)
            else:
                c = pc(h)
                ref = last_pitch if last_pitch is not None else 60
                p = min((ref + k for k in range(-6, 7) if (ref + k) % 12 == c), key=lambda q: abs(q - ref))
            ps.append(p + transpose)
        # a tie from the previous note of the same pitch extends it
        if tie_next and len(ps) == 1 and notes and notes[-1].p == ps[0] and abs(notes[-1].t + notes[-1].d - t) < 1e-9:
            notes[-1].d += dur
            notes[-1].art = frozenset((set(notes[-1].art) - {'tie'}) | (art - {'tie'}))
        else:
            for p in ps:
                notes.append(Note(t, dur, p, nv, art - {'tie'}, x))
        tie_next = 'tie' in art
        last_pitch = ps[-1] if len(ps) == 1 else ps[0]
        t += dur
    return notes, t


def grid(pattern, key, t0=0.0, steps=16, bar=4.0, vels=None, dur=None):
    """A step pattern ('x..x....' per bar, '|' between bars) as hits of `key` from beat t0.
    Default marks: X accent 1.0, x 0.8, o 0.7, g ghost 0.3, '.' or '-' rest; other letters from `vels`."""
    vm = {'X': 1.0, 'x': 0.8, 'o': 0.7, 'g': 0.3, 'G': 0.45, 'y': 0.6}
    vm.update(vels or {})
    step = bar / steps
    out, i = [], 0
    for ch in pattern.replace(' ', ''):
        if ch == '|':
            if i % steps:
                raise ValueError(f'bar line after {i} steps (not a whole bar of {steps}) in {pattern}')
            continue
        if ch in vm:
            out.append(Note(t0 + i * step, dur or step, key, vm[ch]))
        elif ch not in '.-':
            raise ValueError(f'unknown step mark {ch!r} in {pattern}')
        i += 1
    return out


class Part:
    """One player: an instrument, its notes, and how it is played (timing feel, humanize amounts)."""

    def __init__(self, name, inst, lag_ms=0.0, jitter_ms=6.0, vel_jitter=0.05, swing=0.5, swing_unit=0.5, mono=False, **opts):
        self.name, self.inst = name, inst
        self.lag_ms, self.jitter_ms, self.vel_jitter = lag_ms, jitter_ms, vel_jitter
        self.swing, self.swing_unit, self.mono = swing, swing_unit, mono
        self.opts = opts
        self.notes = []

    def add(self, notes):
        self.notes.extend(notes if isinstance(notes, list) else [notes])
        return self

    def line(self, text, t0, **kw):
        ns, end = seq(text, t0, **kw)
        self.notes.extend(ns)
        return end


class Song:
    """bpm, 4/4 bars; `intro` bars play once, then `loop` bars repeat; the last `tail` beats of the render
    replay the loop's start so everything ringing at the loop end carries into the wrap."""

    def __init__(self, title, track, bpm, key, intro, loop, seed=1, tail_bars=2):
        self.title, self.track, self.bpm, self.key = title, track, float(bpm), key
        self.intro, self.loop, self.seed, self.tail_bars = intro, loop, seed, tail_bars
        self.parts = {}
        self.markers = {}
        self.twins = []  # (source bar, copy bar, bars): the copy plays exactly the source's humanized notes

    def twin(self, src_bar, dst_bar, bars=1):
        """Render bars [dst, dst+bars) as an exact copy of [src, src+bars) (same timing and dynamics): the loop's
        last bar and the intro's last bar, so what rings into the loop start is the same both times."""
        self.twins.append((src_bar, dst_bar, bars))

    @property
    def bar_s(self):
        return 240.0 / self.bpm

    def beat(self, bar, beat=0.0):
        """Beat position of a bar (0-based, bar 0 = the first bar of the intro) plus beats."""
        return bar * 4.0 + beat

    def part(self, name, inst, **kw):
        if name not in self.parts:
            self.parts[name] = Part(name, inst, **kw)
        return self.parts[name]

    @property
    def loop_start(self):
        return self.intro * 4.0

    @property
    def loop_end(self):
        return (self.intro + self.loop) * 4.0

    def finalize(self):
        """Humanize every note once (seeded per part), then copy the loop's first bars after its end."""
        rng_base = np.random.default_rng(self.seed)
        out = {}
        spb = 60.0 / self.bpm
        L = self.loop * 4.0
        for pi, (name, part) in enumerate(sorted(self.parts.items())):
            rng = np.random.default_rng([self.seed, pi, 7])
            notes = sorted(part.notes, key=lambda n: (n.t, str(n.p)))
            done, tail = [], []
            for n in notes:
                if n.t >= self.loop_end - 1e-9:
                    continue  # the tail comes from the loop's start
                t = swing(n.t, part.swing, part.swing_unit)
                end = swing(n.t + n.d, part.swing, part.swing_unit)
                jit = (part.lag_ms + rng.normal(0, part.jitter_ms)) / 1000.0 / spb
                if 'nohuman' in n.art:
                    jit = part.lag_ms / 1000.0 / spb
                v = float(np.clip(n.v * (1 + rng.normal(0, part.vel_jitter)), 0.02, 1.0))
                h = n.copy(t=max(0.0, t + jit), d=max(0.02, end - t), v=v)
                done.append(h)
                if self.loop_start - 1e-9 <= n.t < self.loop_start + self.tail_bars * 4.0:
                    tail.append(h.copy(t=h.t + L))
            for (sb, db_, nb) in self.twins:
                a, b = sb * 4.0, (sb + nb) * 4.0
                off = (db_ - sb) * 4.0
                keep = [n for n in done if not (db_ * 4.0 - 0.05 <= n.t < (db_ + nb) * 4.0 - 0.05)]
                src = [n for n in done if a - 0.05 <= n.t < b - 0.05]
                done = keep + [n.copy(t=n.t + off) for n in src]
                tail = [n for n in tail if not (db_ * 4.0 + L - 0.05 <= n.t < (db_ + nb) * 4.0 + L - 0.05)] + \
                    [n.copy(t=n.t + off + L) for n in src if self.loop_start - 1e-9 <= n.t + off < self.loop_start + self.tail_bars * 4.0]
            out[name] = sorted(done + tail, key=lambda n: n.t)
        del rng_base
        return out


def swing(t, amount, unit):
    """Delay the off-beat `unit` (0.5 = eighths, 0.25 = sixteenths) to `amount` of the pair (0.5 straight, 0.667 triplet)."""
    if abs(amount - 0.5) < 1e-9:
        return t
    pair = 2 * unit
    k = math.floor(t / pair + 1e-9)
    f = t - k * pair
    if f <= unit:
        f = f / unit * (amount * pair)
    else:
        f = amount * pair + (f - unit) / unit * ((1 - amount) * pair)
    return k * pair + f


def chords(prog, t0=0.0, bar=4.0):
    """'Bb6 | Gm7 | Cm9 F13 |' -> [(beat, beats, Chord)], chords sharing a bar split it evenly."""
    out, t = [], float(t0)
    for b in prog.split('|'):
        syms = b.split()
        if not syms:
            continue
        each = bar / len(syms)
        for s in syms:
            if s == '%':
                out.append((t, each, out[-1][2]))
            else:
                out.append((t, each, Chord(s)))
            t += each
    return out


def chord_at(prog, t):
    for (s, d, c) in prog:
        if s - 1e-9 <= t < s + d - 1e-9:
            return c
    return prog[-1][2] if prog else None
