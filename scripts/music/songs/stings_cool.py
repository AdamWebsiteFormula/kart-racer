# The finish stings, candidate A (slot stings): one-shot band hits for the race's big moments, a modern synth-rock
# band at 140 bpm: overdriven guitar power chords, supersaw chords in open sus2 voicings (no bright major thirds on
# the hits) through a low-pass that opens wide as they ring (or closes, on the knockout), a plucked bass over a sine
# sub, the live kit over a synth kick with risers and impacts. D Mixolydian (the rock C-to-D push) and B minor.
# compose() is a two-bar groove in the same sound, which sets the stings' master EQ and level; shorts() writes the
# five stings (named by their game ids):
#   finish     4.0 s  winning: a snare-and-riser build, then a big open D whose filter opens, an A-D dyad on top
#   finishLow  3.0 s  a friendly finish off the podium: laid back, Bm9 to a warm Gmaj9 on Rhodes, soft half-time
#   koSafe     2.3 s  Knockout, you survived: F#5 - G5 hits, then an open Asus2 whose filter opens (onward)
#   koOut      2.5 s  knocked out: G5 - A5 - Bm9 hits, the lead stepping down D - C# - B, the filter closing down
#   finalLap   2.1 s  the final-lap push: a snare-and-riser build, a C hit, then an open D whose filter opens
# Every note is written by hand here; studio/ only plays and mixes it.
import math, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from studio.score import Song, seq, grid, chords, Note
from studio.arrange import shift
from studio.synths import _Poly, _saw, _ladder, adsr, hz
from studio import dsp
from studio import instruments as _I

SLOT, CANDIDATE = 'stings', 'a-cool'
STYLE = ('modern synth-rock band hits at 140 bpm: overdriven guitar power chords, supersaw chords in open sus2 voicings through '
         'an opening (or closing) filter sweep, plucked bass over a sine sub, live kit over a synth kick with risers and impacts')
FORM = ['a two-bar groove (sets the level and EQ)', 'finish 4.0 s: build, open D with the filter opening',
        'finishLow 3.0 s: Bm9 - Gmaj9, half-time', 'koSafe 2.3 s: F#5 - G5 - open Asus2', 'koOut 2.5 s: G5 - A5 - Bm9, the filter closing',
        'finalLap 2.1 s: build, C - open D']

BPM = 140
PARTS = (('lead', 'st_lead', True), ('chords', 'st_chords', False), ('close', 'st_close', False), ('open', 'st_open', False), ('pad', 'st_pad', False),
         ('pluck', 'st_pluck', False), ('bass', 'st_bass', True), ('sub', 'st_sub', False), ('keys', 'st_keys', False),
         ('gtr', 'guitar', False), ('edrums', 'st_edrums', False), ('drums', 'kit', False))

# power chords (root, fifth, octave) for the guitar, by root name
POWER = {'D': (50, 57, 62), 'G': (43, 50, 55), 'A': (45, 52, 57), 'B': (47, 54, 59), 'C': (48, 55, 60), 'E': (40, 47, 52),
         'F#': (42, 49, 54)}
# the synth chords' voicings: open fifths and seconds on the hits
VOX = {
    'Dsus2': (50, 57, 62, 64, 69), 'Csus2': (48, 55, 60, 62, 67), 'Asus2': (57, 64, 69, 71, 76), 'Esus4': (52, 59, 64, 69, 71),
    'Bm9': (47, 54, 61, 62, 66), 'G5': (43, 50, 55, 62, 67), 'A5': (45, 52, 57, 64, 69), 'Gmaj9': (43, 55, 59, 62, 66, 69),
    'F#5': (42, 49, 54, 61, 66),
    'D/F#': (42, 57, 62, 64, 69),
}
BASS = {'D': 38, 'G': 31, 'A': 33, 'B': 35, 'C': 36, 'E': 40, 'F#': 42}


def lines(parts, t0):
    """Notes of consecutive one-bar lines from beat t0, read as one line (ties carry across bar lines, and every
    bar is checked to be four beats long)."""
    ns, _ = seq(' | '.join(parts), t0)
    return ns


def _parts(s):
    return {k: s.part(k, inst, jitter_ms=(3 if k in ('drums', 'gtr', 'keys') else 1.0), vel_jitter=0.03, mono=mono) for k, inst, mono in PARTS}


def hit(P, t, d, sym, root, v=0.85, gtr=True, sub=True, kick=True, crash=False, snare=False, impact=0.0, pad_v=0.0, part='chords'):
    """One band hit: the synth chord, the guitar's power chord, the bass and sub on the root, the kick (and crash,
    snare, impact) at beat t, lasting d beats."""
    P[part].add([Note(t, d, p, v) for p in VOX[sym]])
    if pad_v:
        P['pad'].add([Note(t, d, p, pad_v) for p in VOX[sym]])
    if gtr:
        P['gtr'].add([Note(t, d, p, v * (0.9 if i else 1.0)) for i, p in enumerate(POWER[root])])
    P['bass'].add(Note(t, min(d, 1.5), BASS[root], v))
    if sub:
        P['sub'].add(Note(t, d, BASS[root], 0.85))
    if kick:
        P['edrums'].add(Note(t, 0.5, 'kick', min(1.0, v + 0.1)))
        P['drums'].add(Note(t, 0.5, 'kick', v * 0.8))
    if crash:
        P['drums'].add(Note(t, 2.0, 'crash', v))
    if snare:
        P['drums'].add(Note(t, 0.5, 'snare', v))
    if impact:
        P['edrums'].add(Note(t, 2.0, 'impact', impact))


def compose():
    """A two-bar groove in D Mixolydian (a one-bar intro that is the loop's last bar), steady and sustained; it sets
    the stings' EQ and level."""
    s = Song('Rascal Rally! Stings (groove)', 'stings', BPM, 'D Mixolydian', 1, 2, seed=911)
    P = _parts(s)
    s.prog = chords('D C | D C | D C', 0)
    for bar in range(3):
        t0 = 4.0 * bar
        P['edrums'].add(grid('x...x...x...x...', 'kick', t0, vels={'x': 0.9}))
        P['drums'].add(grid('x...x...x...x...', 'kick', t0, vels={'x': 0.55}) + grid('....X.......X...', 'snare', t0, vels={'X': 0.8}) +
                       grid('..o...o...o...o.', 'hho', t0, vels={'o': 0.45}) + grid('x.x.x.x.x.x.x.x.', 'hhc', t0, vels={'x': 0.35}))
        for h, (sym, root) in enumerate((('Dsus2', 'D'), ('Csus2', 'C'))):
            t = t0 + 2.0 * h
            P['open'].add([Note(t, 1.9, p, 0.6) for p in VOX[sym]])
            P['pad'].add([Note(t, 1.95, p, 0.4) for p in VOX[sym]])
            P['gtr'].add([Note(t, 1.9, p, 0.55) for p in POWER[root]])
            P['bass'].add([Note(t + 0.5 * k, 0.45, BASS[root], 0.75) for k in range(4)])
            P['sub'].add(Note(t, 1.95, BASS[root], 0.7))
        P['lead'].add(lines(["A5:2 G5:2"], t0))
    P['drums'].add(Note(0, 2, 'crash', 0.7))
    P['drums'].add(Note(4.0, 2, 'crash', 0.7))
    s.twin(0, 2)
    return s


def build(P, beats, snare_from=0.0, v0=0.4, v1=0.75, kicks=(0.0, 1.0)):
    """A short build: a noise riser over `beats`, the snare on eighths from `snare_from` getting louder, kicks."""
    P['edrums'].add(Note(0, beats, 'rise', 0.6))
    n = int(round((beats - snare_from) / 0.5))
    P['drums'].add([Note(snare_from + 0.5 * k, 0.25, 'snare', v0 + (v1 - v0) * k / max(1, n - 1)) for k in range(n)])
    P['edrums'].add([Note(t, 0.5, 'kick', 0.8) for t in kicks])
    P['drums'].add([Note(t, 0.5, 'kick', 0.55) for t in kicks])


def shorts():
    out = {}

    # ---------------------------------------------------------------- finish (4.0 s = 9.3 beats)
    s = Song('Rascal Rally! Sting: finish', 'stings', BPM, 'D Mixolydian', 3, 0, seed=931, tail_bars=0)
    s.about = 'a snare-and-riser build, then a big open D (sus2) whose filter opens wide as it rings, an A-D dyad on top'
    P = _parts(s)
    build(P, 2.0, snare_from=0.0)
    P['pad'].add([Note(0, 1.9, p, 0.28) for p in VOX['Dsus2']])
    hit(P, 2.0, 7.0, 'Dsus2', 'D', v=0.95, crash=True, snare=True, impact=0.8, pad_v=0.5, part='open')
    P['lead'].add([Note(2.0, 7.0, 81, 0.62), Note(2.0, 7.0, 86, 0.55)])
    P['pluck'].add([Note(3.5 + 0.25 * k, 0.2, p, 0.44 - 0.03 * k) for k, p in enumerate((62, 64, 69, 74, 76, 81, 86, 88))])
    out['finish'] = (s, 4.0, 2.0)

    # ---------------------------------------------------------------- finishLow (3.0 s = 7 beats)
    s = Song('Rascal Rally! Sting: finish off the podium', 'stings', BPM, 'B minor', 2, 0, seed=932, tail_bars=0)
    s.about = 'laid back: Bm9 on the Rhodes and a soft filtered chord, then a warm Gmaj9 held, a soft half-time beat'
    P = _parts(s)
    for t, d, sym, root in ((0.0, 2.0, 'Bm9', 'B'), (2.0, 6.0, 'Gmaj9', 'G')):
        P['keys'].add([Note(t, d, p, 0.58) for p in VOX[sym]])
        P['pad'].add([Note(t, d, p, 0.36) for p in VOX[sym]])
        P['bass'].add(Note(t, min(d, 1.8), BASS[root], 0.72))
        P['sub'].add(Note(t, d, BASS[root], 0.72))
    P['close'].add([Note(2.0, 6.0, p, 0.45) for p in VOX['Gmaj9']])
    P['edrums'].add([Note(0, 0.5, 'kick', 0.8), Note(2.0, 0.5, 'kick', 0.85)])
    P['drums'].add([Note(0, 0.5, 'kick', 0.5), Note(2.0, 0.5, 'kick', 0.55)] + grid('x.x.x.x.........', 'hhc', 0, vels={'x': 0.38}) +
                   grid('....X...........', 'snare', 0, vels={'X': 0.62}) + [Note(2.0, 2.0, 'sizzle', 0.4)])
    P['pluck'].add([Note(2.5 + 0.25 * k, 0.2, p, 0.38 - 0.03 * k) for k, p in enumerate((62, 66, 69, 74, 78, 81))])
    out['finishLow'] = (s, 3.0, 2.0)

    # ---------------------------------------------------------------- koSafe (2.3 s = 5.4 beats)
    s = Song('Rascal Rally! Sting: knockout, safe', 'stings', BPM, 'A Mixolydian', 2, 0, seed=933, tail_bars=0)
    s.about = 'F#5 - G5 hits, then an open Asus2 whose filter opens as it rings: through to the next round'
    P = _parts(s)
    hit(P, 0.0, 0.7, 'F#5', 'F#', v=0.84, crash=True)
    hit(P, 0.75, 0.7, 'G5', 'G', v=0.84, snare=True)
    hit(P, 1.5, 6.0, 'Asus2', 'A', v=0.92, crash=True, snare=True, impact=0.6, pad_v=0.45, part='open')
    P['lead'].add([Note(1.5, 5.0, 76, 0.6), Note(1.5, 5.0, 81, 0.54)])
    out['koSafe'] = (s, 2.3, 1.5)

    # ---------------------------------------------------------------- koOut (2.5 s = 5.8 beats)
    s = Song('Rascal Rally! Sting: knocked out', 'stings', BPM, 'B minor', 2, 0, seed=934, tail_bars=0)
    s.about = 'G5 - A5 - Bm9 hits, the lead stepping down D - C# - B, the chord\'s filter closing down as it rings'
    P = _parts(s)
    P['lead'].add([n.copy(v=n.v * 0.85) for n in lines(["D5:8. C#5:16~ C#5:8 B4:8~ B4:2", "B4:1"], 0)])
    hit(P, 0.0, 0.7, 'G5', 'G', v=0.84, crash=True)
    hit(P, 0.75, 0.7, 'A5', 'A', v=0.84, snare=True)
    hit(P, 1.5, 6.0, 'Bm9', 'B', v=0.9, crash=True, snare=True, impact=0.6, part='close')
    P['pad'].add([Note(1.5, 6.0, p, 0.4) for p in (47, 54, 62, 66)])
    out['koOut'] = (s, 2.5, 1.5)

    # ---------------------------------------------------------------- finalLap (2.1 s = 4.9 beats)
    s = Song('Rascal Rally! Sting: final lap', 'stings', BPM, 'D Mixolydian', 2, 0, seed=935, tail_bars=0)
    s.about = 'a snare-and-riser build, a C hit on the and of 2, then an open D whose filter opens: the last lap, go'
    P = _parts(s)
    build(P, 1.5, snare_from=0.0, kicks=(0.0, 1.0))
    hit(P, 1.5, 0.45, 'Csus2', 'C', v=0.84, snare=True)
    hit(P, 2.0, 6.0, 'Dsus2', 'D', v=0.95, crash=True, snare=True, impact=0.75, pad_v=0.45, part='open')
    P['lead'].add([Note(2.0, 5.0, 81, 0.62), Note(2.0, 5.0, 86, 0.55)])
    out['finalLap'] = (s, 2.1, 2.0)
    return out


class ClosingSaw(_Poly):
    """Detuned saws into a ladder low-pass that closes over each note (from `c0` to `c1` Hz in `secs` seconds,
    exponentially): the knockout's power-down. Nothing is played."""

    def __init__(self, c0=4200.0, c1=260.0, secs=1.6, voices=5, detune=14.0, spread=0.85, res=0.22, release=0.3, gain_db=-16.0):
        self.c0, self.c1, self.secs, self.voices, self.detune, self.spread, self.res = c0, c1, secs, voices, detune, spread, res
        self.release, self.gain_db = release, gain_db

    def voice(self, n, dur, ctx):
        f = hz(n.p)
        L = int((dur + self.release) * dsp.SR)
        t = np.arange(L) / dsp.SR
        out = np.zeros((2, L))
        for k in range(self.voices):
            c = self.detune * (2 * k / (self.voices - 1) - 1)
            w = _saw(np.full(L, f * 2 ** (c / 1200)), ctx.rng.uniform(0, 1), dsp.SR).astype(np.float64)
            a = (self.spread * (2 * k / (self.voices - 1) - 1) + 1) * math.pi / 4
            out[0] += w * math.cos(a)
            out[1] += w * math.sin(a)
        out /= math.sqrt(self.voices)
        cut = self.c0 * (self.c1 / self.c0) ** np.clip(t / self.secs, 0, 1)
        y = np.stack([_ladder(out[c], cut, self.res, dsp.SR, 1.2) for c in range(2)])
        e = adsr(L, 0.003, 0.6, 0.8, dur, self.release)
        return (y * e[None, :] * (0.45 + 0.55 * n.v)).astype(np.float32)


def _instruments():
    from studio import modern, synths
    _I.RACK['st_lead'] = lambda: modern.Supersaw(voices=5, detune=12, spread=0.6, cutoff=2400, env_amt=3000, env_decay=0.25, res=0.1,
                                                   attack=0.004, decay=0.6, sustain=0.7, release=0.3, gain_db=-14, vib=(5.3, 0.1, 0.4), drive=1.2)
    _I.RACK['st_chords'] = lambda: modern.Supersaw(voices=7, detune=16, spread=0.9, cutoff=2200, env_amt=3200, env_decay=0.18, decay=0.6, sustain=0.6,
                                                     release=0.35, gain_db=-17)
    _I.RACK['st_close'] = lambda: ClosingSaw(c0=4200.0, c1=280.0, secs=1.4, gain_db=-16.0)
    _I.RACK['st_open'] = lambda: ClosingSaw(c0=500.0, c1=5200.0, secs=1.3, res=0.25, gain_db=-16.0)
    _I.RACK['st_pad'] = lambda: modern.Pad(gain_db=-16, cutoff=1900, attack=0.06, release=0.9, voices=5, detune=12, air=0.0)
    _I.RACK['st_pluck'] = lambda: modern.Pluck(gain_db=-15, cutoff=1500, env_amt=5000, env_decay=0.06, decay=0.2, release=0.1, detune=9, res=0.12, square=0.35)
    _I.RACK['st_bass'] = lambda: modern.Pluck(gain_db=-7, cutoff=420, env_amt=2200, env_decay=0.09, decay=0.45, release=0.08, detune=5, res=0.2, square=0.4)
    _I.RACK['st_sub'] = lambda: modern.SubBass(gain_db=-9, harm=0.15, release=0.3)
    _I.RACK['st_keys'] = lambda: synths.EPiano(gain_db=-6, bell=0.3, trem=(3.8, 0.2))
    _I.RACK['st_edrums'] = lambda: modern.DrumSynth(kick_tune=50.0, kick_decay=0.3, snare_tune=200.0)
    _I.get.cache_clear()


_instruments()

MIX = {
    'tracks': {
        # dry (reverb sends cost production quality); the tails come from the synths' own releases and a delay
        'lead': {'pan': 0.0, 'gain': -4.0, 'width': 1.3, 'eq': [('hp', 300), ('peak', 2800, 1.0, 1.0)], 'sends': {'delay': -12}},
        'chords': {'gain': -4.0, 'width': 1.4, 'eq': [('hp', 200)], 'sends': {'delay': -18}},
        'close': {'gain': -3.0, 'width': 1.4, 'eq': [('hp', 150)]},
        'open': {'gain': -3.0, 'width': 1.4, 'eq': [('hp', 150)], 'sends': {'delay': -16}},
        'pad': {'gain': -8.0, 'width': 1.5, 'eq': [('hp', 200), ('lp', 8000)]},
        'pluck': {'pan': 0.2, 'gain': -7.0, 'width': 1.5, 'eq': [('hp', 400)], 'sends': {'delay': -8}},
        'bass': {'gain': -1.0, 'mono': True, 'eq': [('hp', 35), ('peak', 90, 1.0, 1.0), ('peak', 250, 1.0, -2.0)],
                 'comp': {'thr': -18, 'ratio': 3, 'att_ms': 5, 'rel_ms': 60}},
        'sub': {'gain': -8.0, 'eq': [('lp', 140)]},
        'keys': {'pan': -0.15, 'gain': -4.0, 'eq': [('hp', 150), ('peak', 320, 1.0, -2.0)]},
        'gtr': {'pan': -0.25, 'gain': -6.0, 'amp': {'drive_db': 18.0, 'tone': 0.0}, 'width': 1.3, 'eq': [('lp', 6500)]},
        'edrums.kick': {'bus': 'drums', 'gain': -3.0, 'eq': [('peak', 55, 1.0, 1.5), ('peak', 300, 1.2, -3.0)], 'comp': {'thr': -14, 'ratio': 4, 'att_ms': 3, 'rel_ms': 60}},
        'edrums.snare': {'bus': 'drums', 'gain': -10.0},
        'edrums.hats': {'bus': 'drums', 'gain': -10.0},
        'edrums.fx': {'gain': -9.0, 'width': 1.5},
        'drums.kick': {'bus': 'drums', 'gain': -6.0, 'eq': [('hp', 40), ('peak', 3500, 1.0, 2.0)]},
        'drums.snare': {'bus': 'drums', 'gain': -1.0, 'eq': [('hp', 120), ('peak', 200, 1.0, 1.5), ('highshelf', 6000, 0.7, 2.5)],
                        'comp': {'thr': -18, 'ratio': 3, 'att_ms': 8, 'rel_ms': 100}},
        'drums.oh': {'bus': 'drums', 'gain': -2.0, 'eq': [('hp', 350), ('highshelf', 8000, 0.7, 2.0)]},
        'drums.room': {'bus': 'drums', 'gain': -12.0, 'eq': [('hp', 200)], 'comp': {'thr': -26, 'ratio': 6, 'att_ms': 2, 'rel_ms': 120}},
    },
    'buses': {
        'drums': {'gain': 1.0, 'comp': {'thr': -12, 'ratio': 3, 'att_ms': 8, 'rel_ms': 90, 'mix': 0.6}, 'sat': 2.0},
    },
    'fx': {
        'delay': {'kind': 'delay', 'time': 60 / BPM * 0.75, 'fb': 0.3, 'lp': 5000, 'hp': 500, 'pingpong': True, 'gain': -6.0},
    },
    'master': {'comp': {'thr': -14, 'ratio': 2, 'att_ms': 20, 'rel_ms': 150, 'knee': 8}, 'lufs': -12.0, 'ceiling': -1.0, 'clip': 1.5,
               'target': [-15.0, -6.5, -7.2, -9.5, -9.8, -10.3, -11.5, -15.2, -20.0]},
}

if __name__ == '__main__':
    from studio.produce import produce
    produce(sys.modules[__name__])
