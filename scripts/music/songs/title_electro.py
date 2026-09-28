# Title and menus, candidate B (slot title): electro-funk rock for the attract-mode title and the menus.
# B minor (the chorus leaning to D major), 120 bpm. A two-bar riff on a filter-envelope synth bass doubled by a
# palm-muted overdriven guitar is the hook; a live kit on a funk-rock beat with a synth kick under it and a gated
# snare; the chorus opens into sustained power chords, a pumping pad and a gritty saw lead; the break is a
# guitar solo over the riff, then a build into the chorus again.
# Every note is written by hand here; studio/ only plays and mixes it.
#
# Form (bars): intro 4 (the riff alone on the bass as the filter opens, the band joins, the pickup bar) | loop 32:
#   A 8 (the riff: bass + muted guitar, a pluck answering) | B 8 (the chorus over Gmaj7-D-A-Bm, lead + power chords)
#   C 8 (the guitar solo over the riff 4, the build 4 on Em-F#7) | B' 8 (the chorus with everything, the lead
#   doubled by the guitar, ending on the pickup bar = the intro's last bar)
import math, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from studio.score import Song, seq, grid, chords, Note
from studio.arrange import comp, pad, shift, drum_fill
from studio.theory import voice_lead
from studio.synths import _Poly, _saw, _ladder, adsr, hz
from studio import dsp
from studio import instruments as _I

SLOT, CANDIDATE = 'title', 'b-electrofunk'
STYLE = ('electro-funk rock: two-bar riff on a filter-envelope synth bass doubled by palm-muted overdriven guitar, live funk-rock '
         'kit over a synth kick with a gated snare, pumping pad, gritty saw lead, sustained power chords, a guitar solo')
FORM = ['intro 4 (the riff on the bass as the filter opens, band joins, pickup bar)', 'A 8 the riff (bass + muted guitar, pluck answers)',
        'B 8 chorus over Gmaj7-D-A-Bm (lead + power chords)', 'C 8 guitar solo over the riff, then the build on Em-F#7',
        "B' 8 chorus with everything, pickup bar (= intro's last bar)"]

BPM, INTRO, LOOP = 120, 4, 32
A0, B0, C0, B2 = 4, 12, 20, 28

PROG = {
    'intro': 'Bm | Bm | Bm | G A',
    'A': 'Bm | Bm | Bm | Bm | Bm | Bm | G | A',
    'B': 'Gmaj7 | D | A | Bm | Gmaj7 | D | Em7 | F#7',
    'C': 'Bm | Bm | Bm | Bm | Em | Em | F#7sus4 | F#7',
    "B'": 'Gmaj7 | D | A | Bm | Gmaj7 | D | Em7 | G A',
}
SECTIONS = [('intro', INTRO), ('A', 8), ('B', 8), ('C', 8), ("B'", 8)]

RIFF = [
    "B1:8 r:16 B1:16 D2:16 r:16 B1:8 E2:8 r:16 F#2:16~ F#2:8 A2:16 F#2:16",
    "B1:8 r:16 B1:16 D2:16 r:16 B1:8 A1:8 r:16 G1:16~ G1:8 F#1:8",
]
ANSWER = ["r:1", "r:2 r:8 F#5:16 A5:16 B5:8 D6:8"]
# the verse over the riff: a low call on the lead, the pluck answering in the gaps (bars 2, 4, 6, 8)
VERSE = [
    "r:4 F#4:8 A4:8 B4:8 D5:8~ D5:8 B4:8",
    "A4:4 F#4:8 E4:8~ E4:4 r:4",
    "r:4 F#4:8 A4:8 B4:8 D5:8~ D5:8 E5:8",
    "F#5:4 E5:8 D5:8~ D5:4 r:4",
    "r:4 F#4:8 A4:8 B4:8 D5:8~ D5:8 B4:8",
    "A4:4 F#4:8 E4:8~ E4:4 r:4",
    "r:4 G4:8 B4:8 D5:8 E5:8~ E5:8 D5:8",
    "E5:4 C#5:8 A4:8~ A4:4 r:4",
]
CHORUS = [
    "B4:8 D5:8 r:8 F#5:8~ F#5:4 E5:8 D5:8",
    "E5:8 F#5:8 r:8 A5:8~ A5:2",
    "C#5:8 E5:8 r:8 A5:8~ A5:4 F#5:8 E5:8",
    "D5:4. C#5:8~ C#5:4 B4:4",
    "B4:8 D5:8 r:8 F#5:8~ F#5:4 E5:8 D5:8",
    "E5:8 F#5:8 r:8 A5:8~ A5:4 B5:8 C#6:8",
    "D6:4. B5:8~ B5:4 G5:8 E5:8",
    "F#5:4 A#5:8 C#6:8~ C#6:2",
]
SOLO = [
    "r:8 F#4:16 A4:16 B4:8 D5:8~ D5:4 B4:8 A4:8",
    "B4:4. A4:8 F#4:8 E4:8 D4:8 E4:8",
    "r:8 F#5:16 E5:16 D5:8 B4:8~ B4:4 D5:8 E5:8",
    "F#5:2 E5:8 D5:8 B4:4",
]
BUILD = ["B4:2 E5:2", "G5:2 B5:2", "C#6:1", "A#5:2 C#6:4 E6:4"]
PICKUP_LEAD = "r:2 r:4 A5:16 B5:16 C#6:16 D6:16"


def lines(parts, t0):
    """Notes of consecutive one-bar lines from beat t0, read as one line (ties carry across bar lines, and every
    bar is checked to be four beats long)."""
    ns, _ = seq(' | '.join(parts), t0)
    return ns


def at(bar):
    return 4.0 * bar


# the bass filter over the song (bar, Hz): closed at the start, open by the band's entry
BASS_CUT = [(0, 180), (2, 700), (3, 700), (36, 700)]


def compose():
    s = Song('Rascal Rally! Title (electro-funk)', 'title', BPM, 'B minor', INTRO, LOOP, seed=521)
    P = {}
    P['lead'] = s.part('lead', 'ef_lead', jitter_ms=1.5, mono=True)
    P['gtrlead'] = s.part('gtrlead', 'guitar', lag_ms=2, jitter_ms=3, mono=True)
    P['bass'] = s.part('bass', 'ef_bass', jitter_ms=1.5, mono=True)
    P['gtr'] = s.part('gtr', 'guitar', lag_ms=2, jitter_ms=2.5)
    P['pluck'] = s.part('pluck', 'ef_pluck', jitter_ms=1.5)
    P['pad'] = s.part('pad', 'ef_pad', jitter_ms=2)
    P['keys'] = s.part('keys', 'ef_keys', jitter_ms=2.5)
    P['edrums'] = s.part('edrums', 'ef_edrums', jitter_ms=0.8, vel_jitter=0.03)
    P['drums'] = s.part('drums', 'kit', jitter_ms=2.5, vel_jitter=0.05)
    P['clap'] = s.part('clap', 'clap', jitter_ms=3)
    P['tamb'] = s.part('tamb', 'tamb', jitter_ms=3)

    prog = {}
    t = 0.0
    for name, bars in SECTIONS:
        prog[name] = chords(PROG[name], t)
        t += 4 * bars
    allp = sum(prog.values(), [])
    s.prog = allp

    def chord(tt):
        return [c for c in allp if c[0] - 1e-9 <= tt + 0.01 < c[0] + c[1] - 1e-9][0][2]

    def span(bar0, nbars):
        return [c for c in allp if at(bar0) - 1e-9 <= c[0] < at(bar0 + nbars) - 1e-9]

    # ---------------------------------------------------------------- the band
    def beat(bar, v=1, open_hats=True):
        """Funk-rock: kick on 1, the and-of-2 and 3 (a push on the and-of-4 every other bar), snare 2 and 4 with a clap,
        16th hats, a synth kick under the live one."""
        kick = 'x.....x.x.......' if v == 1 else 'x.....x.x.....x.'
        P['drums'].add(grid(kick, 'kick', at(bar), vels={'x': 0.8}) + grid('....X.......X...', 'snare', at(bar), vels={'X': 0.92}) +
                       grid('x.xgx.xgx.xgx.xg', 'hhc', at(bar), vels={'x': 0.55, 'g': 0.3}))
        if open_hats:
            P['drums'].add(grid('..............o.', 'hho', at(bar), vels={'o': 0.5}))
        P['edrums'].add(grid(kick, 'kick', at(bar), vels={'x': 0.85}))
        P['clap'].add(grid('....x.......x...', 'handclap', at(bar), vels={'x': 0.6}))

    def riff(bar0, nbars, gtr=True):
        for b in range(nbars):
            ns = lines([RIFF[b % 2]], at(bar0 + b))
            P['bass'].add(ns)
            if gtr:
                # palm-muted power chords on the riff: the note an octave up and its fifth
                for n in ns:
                    P['gtr'].add([n.copy(p=n.p + 12, v=0.62, art=n.art | {'stac'}), n.copy(p=n.p + 19, v=0.55, art=n.art | {'stac'})])

    def power(bar0, nbars, pat='x.x.x.x.x.x.x.x.', vel=0.6, stac=True):
        """Power chords (root, fifth, octave) on the chord roots, chugged on 8ths or held."""
        for b in range(nbars):
            for k, c_ in enumerate(pat):
                if c_ not in 'xX':
                    continue
                tt = at(bar0 + b) + 0.25 * k
                r = 40 + ((chord(tt).bass - 40) % 12)
                j = 1
                while k + j < len(pat) and pat[k + j] == '-':
                    j += 1
                d = 0.25 * j * 0.95
                art = {'stac'} if stac else set()
                v = vel * (1.1 if c_ == 'X' else 1.0)
                P['gtr'].add([Note(tt, d, r, v, art), Note(tt, d, r + 7, v * 0.9, art), Note(tt, d, r + 12, v * 0.85, art)])

    def root_pulse(bar0, nbars, vel=0.75):
        """The chorus bass: 8th notes on the root, the octave on the offbeat of each beat's second half."""
        for b in range(nbars):
            for k in range(8):
                tt = at(bar0 + b) + 0.5 * k
                r = 35 + ((chord(tt).bass - 35) % 12)
                P['bass'].add(Note(tt, 0.42, r + (12 if k % 4 == 3 else 0), vel * (1.0 if k % 2 == 0 else 0.85)))

    # ---------------------------------------------------------------- intro: the riff alone, then the band
    riff(0, 3, gtr=False)
    P['drums'].add(grid('xgxgxgxgxgxgxgxg|xgxgxgxgxgxgxgxg', 'hhc', at(0), vels={'x': 0.4, 'g': 0.22}))
    P['edrums'].add([Note(at(0), 8.0, 'rise', 0.45)])
    P['pad'].add(pad(chords('Bm | Bm', 0), 54, 71, n=4, vel=0.4))
    beat(2, 1)
    P['gtr'].add([n.copy(p=n.p + 12, v=0.6, art=n.art | {'stac'}) for n in lines([RIFF[0]], at(2))])
    P['drums'].add(grid('x...............', 'crash', at(2), vels={'x': 0.7}))

    def pickup(bar):
        """Band hits on G (beat 1) and A (the and-of-2), a snare and tom fill, the lead's run up into the riff."""
        P['lead'].add(lines([PICKUP_LEAD], at(bar)))
        P['bass'].add(lines(["G1:8^ r:8 r:8 A1:4. A1:16 G1:16 F#1:16 A1:16"], at(bar)))
        for tt, d, r in ((at(bar), 0.45, 43), (at(bar) + 1.5, 1.2, 45)):
            P['gtr'].add([Note(tt, d, r, 0.75), Note(tt, d, r + 7, 0.7), Note(tt, d, r + 12, 0.65)])
        P['keys'].add([Note(at(bar), 0.45, p, 0.7) for p in (59, 62, 67, 71)] + [Note(at(bar) + 1.5, 1.2, p, 0.7) for p in (61, 64, 69, 73)])
        P['pad'].add([Note(at(bar), 1.4, p, 0.5) for p in (59, 62, 67)] + [Note(at(bar) + 1.5, 2.4, p, 0.5) for p in (61, 64, 69)])
        P['edrums'].add(grid('x.....x.........', 'kick', at(bar), vels={'x': 0.95}) + [Note(at(bar) + 2.0, 2.0, 'rise', 0.5)])
        P['drums'].add(grid('x.....x.........', 'kick', at(bar), vels={'x': 0.8}) + grid('x.....x.........', 'crash', at(bar), vels={'x': 0.75}) +
                       grid('........x.x.xxxx', 'snare', at(bar), vels={'x': 0.6}) + grid('.........x..x...', 'tomh', at(bar), vels={'x': 0.7}) +
                       grid('...........x.x..', 'toml', at(bar), vels={'x': 0.75}))
    pickup(INTRO - 1)
    pickup(B2 + 7)
    s.twin(INTRO - 1, B2 + 7)

    # ---------------------------------------------------------------- A: the riff
    riff(A0, 6)
    # the G and A bars: the bass and the palm-muted guitar leave the riff for the chord roots, a lift into the chorus
    root_pulse(A0 + 6, 2, vel=0.72)
    power(A0 + 6, 2, 'x.x.x.x.x.x.x.x.', vel=0.52)
    P['lead'].add([n.copy(v=n.v * 0.82) for n in lines(VERSE, at(A0))])
    for b in range(8):
        beat(A0 + b, 1 + b % 2)
        if b % 2 == 1:
            P['pluck'].add(lines([ANSWER[1]], at(A0 + b)))
    P['pad'].add(pad(prog['A'], 54, 71, n=4, vel=0.45))
    P['drums'].add(grid('x...............', 'crash', at(A0), vels={'x': 0.75}))
    P['edrums'].add([Note(at(A0), 2.0, 'impact', 0.55)])

    # ---------------------------------------------------------------- B: the chorus
    def chorus(bar0, nbars, double=False):
        ch = lines(CHORUS[:nbars], at(bar0))
        P['lead'].add(ch)
        if double:
            P['gtrlead'].add([n.copy(p=n.p - 12, art=n.art | ({'vib'} if n.d >= 1.5 else set())) for n in ch])
        root_pulse(bar0, nbars)
        power(bar0, nbars)
        P['pad'].add(pad(span(bar0, nbars), 54, 71, n=4, vel=0.5))
        P['keys'].add(comp(span(bar0, nbars), '..x...x...x...x.', 59, 76, n=4, vel=0.55, dur=0.3, t0=at(bar0), t1=at(bar0 + nbars)))
        for b in range(nbars):
            beat(bar0 + b, 1 + b % 2)
            P['tamb'].add(grid('..x...x...x...x.', 'Tamb1_Shake', at(bar0 + b), vels={'x': 0.5}))
        P['drums'].add(grid('x...............', 'crash', at(bar0), vels={'x': 0.8}) + grid('x...............', 'crash', at(bar0 + 4), vels={'x': 0.7}))
        P['edrums'].add([Note(at(bar0), 2.0, 'impact', 0.6)])
    chorus(B0, 8)
    P['edrums'].add([Note(at(B0) - 4.0, 4.0, 'rise', 0.5)])

    # ---------------------------------------------------------------- C: the guitar solo, then the build
    riff(C0, 4)
    for b in range(4):
        beat(C0 + b, 1 + b % 2)
    P['gtrlead'].add([n.copy(art=n.art | ({'vib'} if n.d >= 1.5 else set()) | ({'bend'} if n.d >= 1.0 else set()), x={'bend': 1.0})
                      for n in lines(SOLO, at(C0))])
    P['pad'].add(pad(prog['C'][:4], 54, 71, n=4, vel=0.45))
    P['drums'].add(grid('x...............', 'crash', at(C0), vels={'x': 0.75}))
    P['lead'].add(lines(BUILD, at(C0 + 4)))
    root_pulse(C0 + 4, 4, vel=0.7)
    power(C0 + 4, 4, 'x-------x-------', vel=0.55, stac=False)
    P['pad'].add(pad(prog['C'][4:], 54, 71, n=4, vel=0.5))
    for b in range(4):
        bar = C0 + 4 + b
        P['edrums'].add(grid('x...x...x...x...', 'kick', at(bar), vels={'x': 0.85}))
        P['drums'].add(grid('x...x...x...x...', 'kick', at(bar), vels={'x': 0.7}) + grid('x.x.x.x.x.x.x.x.', 'hhc', at(bar), vels={'x': 0.45}))
    P['drums'].add(grid('....x.......x...|x...x...x...x...|x.x.x.x.x.x.x.x.|xxxxxxxxxxxxxxxx', 'snare', at(C0 + 4), vels={'x': 0.55}))
    P['edrums'].add([Note(at(C0 + 4), 16.0, 'rise', 0.75)])

    # ---------------------------------------------------------------- B': the chorus with everything
    chorus(B2, 7, double=True)
    P['pluck'].add(comp(span(B2, 7), 'x.x.x.x.x.x.x.x.', 71, 86, n=1, vel=0.35, dur=0.2, t0=at(B2), t1=at(B2 + 7)))

    for bar, style in [(A0 + 3, 'snare'), (A0 + 7, 'toms'), (B0 + 3, 'snare'), (B0 + 7, 'toms'), (C0 + 3, 'snare'), (B2 + 3, 'snare')]:
        drum_fill(P['drums'], bar, style, beats=1)
    return s


class FiltBass(_Poly):
    """The riff bass: two detuned saws and a sine sub into a ladder low-pass with a snappy envelope, the base
    cutoff following the song's filter automation (a list of (bar, Hz))."""

    def __init__(self, auto, gain_db=-7.0, env_amt=2400.0, env_decay=0.11, res=0.32, sub=0.7, drive=1.8, release=0.04):
        self.auto, self.gain_db, self.env_amt, self.env_decay, self.res, self.sub, self.drive, self.release = \
            auto, gain_db, env_amt, env_decay, res, sub, drive, release

    def voice(self, n, dur, ctx):
        f = hz(n.p)
        L = int((dur + self.release) * dsp.SR)
        t = np.arange(L) / dsp.SR
        fr = np.full(L, f)
        ph = ctx.rng.uniform(0, 1)
        osc = 0.55 * _saw(fr, ph, dsp.SR) + 0.45 * _saw(fr * 1.005, (ph + 0.37) % 1, dsp.SR)
        x = (osc + self.sub * np.sin(2 * np.pi * f * t)).astype(np.float64)
        bars = (n.t + t * ctx.bpm / 60.0) / 4.0
        xs, ys = zip(*self.auto)
        cut = np.interp(bars, xs, ys) + self.env_amt * n.v * np.exp(-t / self.env_decay)
        y = _ladder(x, cut, self.res, dsp.SR, self.drive)
        e = adsr(L, 0.002, 0.25, 0.8, dur, self.release)
        return (y * e * (0.5 + 0.5 * n.v)).astype(np.float32)


def _instruments():
    from studio import modern, synths
    _I.RACK['ef_lead'] = lambda: modern.Supersaw(voices=5, detune=12, spread=0.5, cutoff=1800, env_amt=4000, env_decay=0.22, res=0.14,
                                                   attack=0.004, decay=0.45, sustain=0.75, release=0.16, gain_db=-12, vib=(5.2, 0.12, 0.3), drive=1.6)
    _I.RACK['ef_bass'] = lambda: FiltBass(BASS_CUT)
    _I.RACK['ef_pluck'] = lambda: modern.Pluck(gain_db=-15, cutoff=1200, env_amt=5000, env_decay=0.07, decay=0.2, release=0.05, detune=9, res=0.12, square=0.3)
    _I.RACK['ef_pad'] = lambda: modern.Pad(gain_db=-16, cutoff=1900, attack=0.3, release=0.8, voices=5, detune=14, air=0.015)
    _I.RACK['ef_keys'] = lambda: modern.Supersaw(voices=5, detune=16, spread=0.9, cutoff=2000, env_amt=2500, env_decay=0.12, decay=0.25, sustain=0.4,
                                                   release=0.12, gain_db=-17)
    _I.RACK['ef_edrums'] = lambda: modern.DrumSynth(kick_tune=50.0, kick_decay=0.24, snare_tune=200.0)
    _I.get.cache_clear()


_instruments()

MIX = {
    'tracks': {
        'lead': {'pan': 0.0, 'gain': -2.0, 'eq': [('hp', 250), ('peak', 2800, 1.0, 1.0)], 'sat': 3.0, 'sends': {'delay': -12}},
        'gtrlead': {'pan': 0.2, 'gain': -6.0, 'amp': {'drive_db': 22.0, 'tone': 1.5}, 'sends': {'delay': -9}},
        'bass': {'gain': -1.5, 'eq': [('hp', 30), ('peak', 280, 1.0, -2.0)], 'comp': {'thr': -18, 'ratio': 3, 'att_ms': 5, 'rel_ms': 60},
                 'sat': 2.0, 'duck': {'by': 'edrums.kick', 'depth_db': 4.0, 'rel_ms': 110}},
        'gtr': {'pan': -0.35, 'gain': -9.0, 'amp': {'drive_db': 24.0}, 'width': 1.3},
        'pluck': {'pan': 0.3, 'gain': -6.0, 'width': 1.4, 'eq': [('hp', 400)], 'sends': {'delay': -8}},
        'pad': {'gain': -6.0, 'width': 1.5, 'eq': [('hp', 180), ('lp', 8000)], 'duck': {'by': 'edrums.kick', 'depth_db': 6.0, 'rel_ms': 180}},
        'keys': {'gain': -6.0, 'width': 1.4, 'eq': [('hp', 300)], 'duck': {'by': 'edrums.kick', 'depth_db': 5.0}},
        'edrums.kick': {'bus': 'drums', 'gain': -4.0, 'eq': [('hp', 32), ('peak', 60, 1.0, 1.5), ('peak', 300, 1.2, -3.0)],
                        'comp': {'thr': -14, 'ratio': 4, 'att_ms': 3, 'rel_ms': 60}},
        'edrums.fx': {'gain': -10.0, 'width': 1.5},
        'drums.kick': {'bus': 'drums', 'gain': -2.0, 'eq': [('hp', 40), ('peak', 60, 1.0, 0.5), ('peak', 320, 1.2, -4.0), ('peak', 3500, 1.0, 2.5)],
                       'comp': {'thr': -16, 'ratio': 4, 'att_ms': 5, 'rel_ms': 70}},
        'drums.snare': {'bus': 'drums', 'gain': -1.0, 'eq': [('hp', 110), ('peak', 200, 1.0, 2.0), ('highshelf', 6000, 0.7, 3.0)],
                        'comp': {'thr': -18, 'ratio': 4, 'att_ms': 5, 'rel_ms': 80}},
        'drums.oh': {'bus': 'drums', 'gain': -1.0, 'eq': [('hp', 380), ('highshelf', 8000, 0.7, 3.5)]},
        'drums.room': {'bus': 'drums', 'gain': -11.0, 'eq': [('hp', 200)], 'comp': {'thr': -26, 'ratio': 6, 'att_ms': 2, 'rel_ms': 120}},
        'clap': {'gain': -9.0, 'eq': [('hp', 400), ('peak', 1500, 1.0, 1.5)]},
        'tamb': {'pan': 0.4, 'gain': -12.0, 'eq': [('hp', 3000)]},
    },
    'buses': {
        'drums': {'gain': 1.5, 'comp': {'thr': -12, 'ratio': 3, 'att_ms': 8, 'rel_ms': 90, 'mix': 0.6}, 'sat': 2.5},
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
