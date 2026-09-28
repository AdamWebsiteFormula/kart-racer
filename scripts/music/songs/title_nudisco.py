# Title and menus, candidate A (slot title): nu-disco / future funk for the attract-mode title and the menus.
# A minor (Dorian colour, the chorus leaning to C major), 118 bpm. Four-on-the-floor with claps and a choked open
# hat, a fingered octave bass over a sine sub, 16th-note guitar chops, a Rhodes on a 3-3-2 push, filter-house chord
# stabs that pump against the kick (their filter opens over the intro and the build), a warm saw lead doubled by
# a clean guitar, horn punches only on the pushes, a clav riff in the breakdown.
# Every note is written by hand here; studio/ only plays and mixes it.
#
# Form (bars): intro 4 (filtered stabs open up, the groove enters, the pickup bar) | loop 32:
#   A 8 (the hook: lead + guitar double over Am9-D9-Fmaj9-E7) | B 8 (the chorus in C major colour, stabs and horn pushes)
#   C 8 (breakdown 4: clav riff, no kick; build 4: snare rush, riser, filter opening) | A' 8 (hook with everything,
#   the lead doubled an octave up, ending on the pickup bar = the intro's last bar)
import math, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from studio.score import Song, seq, grid, chords, Note
from studio.arrange import comp, pad, shift, drum_fill
from studio.theory import voice_lead
from studio.synths import _Poly, _saw, _ladder, adsr, hz
from studio import dsp
from studio import instruments as _I

SLOT, CANDIDATE = 'title', 'a-nudisco'
STYLE = ('nu-disco / future funk: four-on-the-floor with claps and choked open hats, fingered octave bass over a sine sub, '
         '16th guitar chops, Rhodes on a 3-3-2 push, pumping filter-house chord stabs, warm saw lead doubled by guitar, horn punches, clav')
FORM = ['intro 4 (filtered stabs open, groove enters, pickup bar)', 'A 8 hook (lead + guitar) over Am9-D9-Fmaj9-E7',
        'B 8 chorus (C major colour, stabs, horn pushes)', 'C 8 breakdown (clav riff, no kick) and build (snare rush, riser, filter)',
        "A' 8 hook with everything, pickup bar (= intro's last bar)"]

BPM, INTRO, LOOP = 118, 4, 32
A0, B0, C0, A2 = 4, 12, 20, 28

PROG = {
    'intro': 'Am9 | Am9 | D9 | Fmaj7 E7#9',
    'A': 'Am9 | D9 | Fmaj9 | E7sus4 E7 | Am9 | D9 | Fmaj9 G6 | Am9',
    'B': 'Fmaj9 | Em9 | Dm9 | Am9 | Fmaj9 | Em9 | Dm9 | E7sus4 E7',
    'C': 'Am9 | Am9 | D9 | D9 | Fmaj9 | Fmaj9 | E7sus4 | E7#9',
    "A'": 'Am9 | D9 | Fmaj9 | E7sus4 E7 | Am9 | D9 | Fmaj9 G6 | Fmaj7 E7#9',
}
SECTIONS = [('intro', INTRO), ('A', 8), ('B', 8), ('C', 8), ("A'", 8)]

HOOK = [
    "r:8 E5:16 G5:16 A5:8 C6:8~ C6:16 B5:16 A5:8 G5:8 E5:8",
    "D5:8 E5:8 r:8 A5:8~ A5:4 F#5:8 E5:8",
    "r:8 E5:16 G5:16 A5:8 E6:8~ E6:16 D6:16 C6:8 B5:8 G5:8",
    "A5:4 G#5:8 B5:8~ B5:2",
    "r:8 E5:16 G5:16 A5:8 C6:8~ C6:16 B5:16 A5:8 G5:8 E5:8",
    "D5:8 E5:8 r:8 A5:8~ A5:4 C6:8 D6:8",
    "E6:8. D6:16 C6:8 A5:8~ A5:8 B5:8 D6:8 B5:8",
    "A5:2 r:2",
]
CHORUS = [
    "C6:4. B5:8~ B5:4 A5:8 G5:8",
    "B5:4. G5:8~ G5:4 E5:8 G5:8",
    "A5:4. F5:8~ F5:4 E5:8 D5:8",
    "E5:2 r:8 E5:16 G5:16 A5:8 C6:8",
    "C6:4. B5:8~ B5:4 A5:8 G5:8",
    "B5:4. D6:8~ D6:4 E6:8 D6:8",
    "C6:4. A5:8~ A5:4 G5:8 F5:8",
    "E5:4 A5:8 G#5:8~ G#5:2",
]
BUILD = ["E5:2 G5:2", "A5:2 C6:2", "B5:1", "G#5:2 B5:4 D6:4"]
CLAV = [
    "A3:16 r:16 A3:16 C4:16 r:16 E4:16 G4:16 r:16 A4:16 r:16 G4:16 E4:16 r:16 D4:16 C4:16 r:16",
    "A3:16 r:16 A3:16 C4:16 r:16 E4:16 G4:16 r:16 A4:16 r:16 C5:16 A4:16 r:16 G4:16 E4:16 r:16",
    "D4:16 r:16 D4:16 F#4:16 r:16 A4:16 C5:16 r:16 D5:16 r:16 C5:16 A4:16 r:16 F#4:16 E4:16 r:16",
    "D4:16 r:16 D4:16 F#4:16 r:16 A4:16 C5:16 r:16 E5:16 r:16 D5:16 C5:16 r:16 A4:16 F#4:16 r:16",
]
PICKUP_LEAD = "r:2 r:4 D6:16 B5:16 G#5:16 G5:16"


def lines(parts, t0):
    """Notes of consecutive one-bar lines from beat t0, read as one line (ties carry across bar lines, and every
    bar is checked to be four beats long)."""
    ns, _ = seq(' | '.join(parts), t0)
    return ns


def at(bar):
    return 4.0 * bar


# the stabs' filter over the song (bar, cutoff Hz): shut in the intro, open by the pickup; down in the breakdown,
# sweeping open through the build
STAB_CUT = [(0, 350), (3, 3200), (20, 3200), (20.01, 700), (24, 700), (28, 3600), (36, 3600)]


def compose():
    s = Song('Rascal Rally! Title (nu-disco)', 'title', BPM, 'A minor', INTRO, LOOP, seed=301)
    P = {}
    P['lead'] = s.part('lead', 'nd_lead', jitter_ms=1.5, mono=True)
    P['lead2'] = s.part('lead2', 'nd_lead2', jitter_ms=1.5, mono=True)
    P['gtrlead'] = s.part('gtrlead', 'guitar', lag_ms=3, jitter_ms=3, mono=True)
    P['bass'] = s.part('bass', 'ebass', jitter_ms=2.5, mono=True, swing=0.52, swing_unit=0.25)
    P['sub'] = s.part('sub', 'nd_sub', jitter_ms=0)
    P['stabs'] = s.part('stabs', 'nd_stabs', jitter_ms=1.5)
    P['keys'] = s.part('keys', 'nd_keys', jitter_ms=3, swing=0.52, swing_unit=0.25)
    P['pad'] = s.part('pad', 'nd_pad', jitter_ms=2)
    P['gtr'] = s.part('gtr', 'guitar', lag_ms=2, jitter_ms=3, swing=0.52, swing_unit=0.25)
    P['clav'] = s.part('clav', 'nd_pluck', jitter_ms=1.5, swing=0.52, swing_unit=0.25)
    P['edrums'] = s.part('edrums', 'nd_edrums', jitter_ms=0.8, vel_jitter=0.03)
    P['drums'] = s.part('drums', 'kit', jitter_ms=2.5, vel_jitter=0.05, swing=0.52, swing_unit=0.25)
    P['clap'] = s.part('clap', 'clap', jitter_ms=3)
    P['shaker'] = s.part('shaker', 'shaker', jitter_ms=3, swing=0.52, swing_unit=0.25)
    P['tamb'] = s.part('tamb', 'tamb', jitter_ms=3, swing=0.52, swing_unit=0.25)

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

    # ---------------------------------------------------------------- rhythm section
    def groove(bar, kick=True, clap=True, hats=True, perc=True, tamb=False):
        if kick:
            P['edrums'].add(grid('x...x...x...x...', 'kick', at(bar), vels={'x': 0.9}))
            P['drums'].add(grid('x...x...x...x...', 'kick', at(bar), vels={'x': 0.62}))
        if clap:
            P['edrums'].add(grid('....x.......x...', 'clap', at(bar), vels={'x': 0.7}))
            P['drums'].add(grid('....X.......X...', 'snare', at(bar), vels={'X': 0.72}))
            P['clap'].add(grid('....x.......x...', 'handclap', at(bar), vels={'x': 0.72}))
        if hats:
            P['drums'].add(grid('xg.gxg.gxg.gxg.g', 'hhc', at(bar), vels={'x': 0.5, 'g': 0.3}) +
                           grid('..o...o...o...o.', 'hho', at(bar), vels={'o': 0.5}))
        if perc:
            P['shaker'].add(grid('x.x.x.x.x.x.x.x.', 'LShaker_Shake1D', at(bar), vels={'x': 0.45}) +
                            grid('.g.g.g.g.g.g.g.g', 'LShaker_Shake1U', at(bar), vels={'g': 0.3}))
        if tamb:
            P['tamb'].add(grid('....x.......x...', 'Tamb1_Shake', at(bar), vels={'x': 0.55}))

    def octbass(bar0, nbars, pat, vel=0.8, sub=True):
        out = []
        for b in range(nbars):
            for k, c_ in enumerate(pat):
                if c_ == '.':
                    continue
                tt = at(bar0 + b) + 0.25 * k
                r = 28 + ((chord(tt).bass - 28) % 12)
                p = {'l': r, 'h': r + 12, '5': r + 7, '7': r + 10}[c_]
                j = 1
                while k + j < len(pat) and pat[k + j] == '.':
                    j += 1
                d = min(0.25 * j, 0.5) * 0.85
                out.append(Note(tt, d, p, vel * (1.0 if k % 4 == 0 else 0.84)))
        P['bass'].add(out)
        if sub:
            for (st, d, ch) in span(bar0, nbars):
                P['sub'].add(Note(st, d * 0.97, 28 + ((ch.bass - 28) % 12), 0.8))

    def chops(bar0, nbars, pat='x.xxx.xxx.xxx.xx', vel=0.5):
        P['gtr'].add([n.copy(art=n.art | {'stac'}, v=n.v * (1.0 if i % 3 == 0 else 0.78)) for i, n in
                      enumerate(comp(span(bar0, nbars), pat, 64, 76, n=3, vel=vel, dur=0.12, t0=at(bar0), t1=at(bar0 + nbars)))])

    def keys(bar0, nbars, pat='x..x..x.x..x..x.', vel=0.55):
        P['keys'].add(comp(span(bar0, nbars), pat, 55, 72, n=4, vel=vel, dur=0.45, t0=at(bar0), t1=at(bar0 + nbars)))

    def stabs(bar0, nbars, pat='..x...x...x...x.', vel=0.7):
        P['stabs'].add(comp(span(bar0, nbars), pat, 57, 76, n=4, vel=vel, dur=0.32, t0=at(bar0), t1=at(bar0 + nbars)))

    def horn_hit(tt, ch, d=0.3, v=0.78):
        """The pushes: a synth-chord punch (brass punches read as circus), voiced over the stabs."""
        vs = voice_lead(None, ch, 62, 77, 4)
        P['stabs'].add([Note(tt, d, p, v) for p in vs])

    # ---------------------------------------------------------------- intro: the filter opens, the groove enters
    stabs(0, 3, vel=0.6)
    P['drums'].add(grid('xg.gxg.gxg.gxg.g|xg.gxg.gxg.gxg.g|xg.gxg.gxg.gxg.g', 'hhc', at(0), vels={'x': 0.45, 'g': 0.28}) +
                   grid('................|..o...o...o...o.|..o...o...o...o.', 'hho', at(0), vels={'o': 0.45}))
    P['shaker'].add(grid('x.x.x.x.x.x.x.x.|x.x.x.x.x.x.x.x.|x.x.x.x.x.x.x.x.', 'LShaker_Shake1D', at(0), vels={'x': 0.4}))
    P['edrums'].add(grid('................|x...x...x...x...|x...x...x...x...', 'kick', at(0), vels={'x': 0.85}) +
                    grid('................|....x.......x...|....x.......x...', 'clap', at(0), vels={'x': 0.65}) +
                    [Note(at(0), 12.0, 'rise', 0.5)])
    P['clap'].add(grid('................|....x.......x...|....x.......x...', 'handclap', at(0), vels={'x': 0.65}))
    octbass(2, 1, 'l.h.l.h.l.h.l.h.', vel=0.72)
    chops(2, 1)

    def pickup(bar):
        """The pickup bar (ends the intro and the loop): band hits on 1 and the and-of-2, a tom fill, the lead's
        bluesy run down into the hook."""
        P['lead'].add(lines([PICKUP_LEAD], at(bar)))
        P['gtrlead'].add(shift(lines([PICKUP_LEAD], at(bar)), 0, -12))
        # hand voicings: F major 7, then the E7#9 with its #9 on top (E G# D G)
        P['stabs'].add([Note(at(bar), 0.4, p, 0.85) for p in (65, 69, 72, 76)] + [Note(at(bar) + 1.5, 0.9, p, 0.85) for p in (64, 68, 74, 79)])
        P['keys'].add([Note(at(bar), 0.4, p, 0.7) for p in (57, 64, 65, 69)] + [Note(at(bar) + 1.5, 0.9, p, 0.7) for p in (56, 62, 67, 71)])
        P['bass'].add(lines(["F1:8^ r:8 r:8 E1:4. E2:8 D2:8"], at(bar)))
        P['sub'].add([Note(at(bar), 0.45, 29, 0.8), Note(at(bar) + 1.5, 1.4, 28, 0.8)])
        P['edrums'].add(grid('x.....x.........', 'kick', at(bar), vels={'x': 0.95}) + [Note(at(bar) + 2.0, 2.0, 'rise', 0.55)])
        P['drums'].add(grid('x.....x.........', 'kick', at(bar), vels={'x': 0.7}) + grid('x.....x.........', 'crash', at(bar), vels={'x': 0.75}) +
                       grid('........x.x.x.xx', 'snare', at(bar), vels={'x': 0.62}) + grid('.........x..x...', 'tomh', at(bar), vels={'x': 0.7}) +
                       grid('...........x..x.', 'toml', at(bar), vels={'x': 0.75}))
        P['clap'].add(grid('......x.........', 'handclap', at(bar), vels={'x': 0.8}))
    pickup(INTRO - 1)
    pickup(A2 + 7)
    s.twin(INTRO - 1, A2 + 7)

    # ---------------------------------------------------------------- A: the hook
    hook = lines(HOOK, at(A0))
    P['lead'].add(hook)
    P['gtrlead'].add(shift(hook, 0, -12, vel=0.9))
    for b in range(8):
        groove(A0 + b)
    octbass(A0, 8, 'l.hl.lh.l.hl.lh.')
    chops(A0, 8)
    keys(A0, 8)
    P['drums'].add(grid('x...............', 'crash', at(A0)))
    P['edrums'].add([Note(at(A0), 2.0, 'impact', 0.5)])

    # ---------------------------------------------------------------- B: the chorus
    ch = lines(CHORUS, at(B0))
    P['lead'].add(ch)
    P['lead2'].add(shift(ch, 0, 12, vel=0.75))
    for b in range(8):
        groove(B0 + b, tamb=True)
    octbass(B0, 8, 'l.h.l.h.l.h.l.h.')
    chops(B0, 8, 'x.x.x.x.x.x.x.x.', vel=0.45)
    stabs(B0, 8)
    P['pad'].add(pad(prog['B'], 52, 71, n=4, vel=0.5))
    for b in (0, 2, 4, 6):
        nb = B0 + b + 1
        horn_hit(at(nb) + 3.5, chord(at(nb + 1) + 0.1))
    horn_hit(at(B0), chord(at(B0)), 0.4, 0.85)
    P['drums'].add(grid('x...............', 'crash', at(B0)) + grid('x...............', 'crash', at(B0 + 4)))
    P['edrums'].add([Note(at(B0), 2.0, 'impact', 0.6), Note(at(B0) - 4.0, 4.0, 'rise', 0.5)])

    # ---------------------------------------------------------------- C: breakdown, then the build
    P['clav'].add(shift(lines(CLAV, at(C0)), 0, 12, vel=0.85))
    for b in range(4):
        groove(C0 + b, kick=False)
    octbass(C0, 4, 'l.hl.lh.l.hl.lh.', vel=0.72, sub=False)
    keys(C0, 4, 'x.......x..x....', vel=0.5)
    stabs(C0, 4, '..x...x...x...x.', vel=0.6)
    P['pad'].add(pad(prog['C'][:4], 52, 71, n=4, vel=0.45))
    # the build: kick back on the beat, the snare rushes, the lead climbs, the filter opens
    P['lead'].add(lines(BUILD, at(C0 + 4)))
    for b in range(4):
        bar = C0 + 4 + b
        P['edrums'].add(grid('x...x...x...x...', 'kick', at(bar), vels={'x': 0.85}))
        P['drums'].add(grid('xg.gxg.gxg.gxg.g', 'hhc', at(bar), vels={'x': 0.45, 'g': 0.28}))
    P['drums'].add(grid('x...x...x...x...|x.x.x.x.x.x.x.x.|xxxxxxxxxxxxxxxx|xxxxxxxxxxxxxxxx', 'snare', at(C0 + 4),
                        vels={'x': 0.5}))
    P['edrums'].add([Note(at(C0 + 4), 16.0, 'rise', 0.8)])
    octbass(C0 + 4, 4, 'l.l.l.l.l.l.l.l.', vel=0.75)
    stabs(C0 + 4, 4, '..x...x...x...x.', vel=0.72)
    P['pad'].add(pad(prog['C'][4:], 52, 71, n=4, vel=0.5))
    P['drums'].add(grid('x...............', 'crash', at(C0)))

    # ---------------------------------------------------------------- A': the hook with everything
    hk = lines(HOOK[:7], at(A2))
    P['lead'].add(hk)
    P['lead2'].add(shift(hk, 0, 12, vel=0.7))
    P['gtrlead'].add(shift(hk, 0, -12, vel=0.9))
    for b in range(7):
        groove(A2 + b, tamb=True)
    octbass(A2, 7, 'l.hl.lh.l.hl.lh.')
    chops(A2, 7)
    keys(A2, 7)
    stabs(A2, 7)
    for b in (0, 2, 4):
        nb = A2 + b + 1
        horn_hit(at(nb) + 3.5, chord(at(nb + 1) + 0.1))
    horn_hit(at(A2), chord(at(A2)), 0.4, 0.85)
    P['drums'].add(grid('x...............', 'crash', at(A2)) + grid('x...............', 'crash', at(A2 + 4)))
    P['edrums'].add([Note(at(A2), 2.0, 'impact', 0.65)])

    # fills at the ends of phrases that have none written
    for bar, style in [(A0 + 3, 'snare'), (A0 + 7, 'toms'), (B0 + 3, 'snare'), (B0 + 7, 'toms'), (A2 + 3, 'snare')]:
        drum_fill(P['drums'], bar, style, beats=1)
    return s


class SweepSaw(_Poly):
    """Filter-house chords: detuned saws into a ladder low-pass whose cutoff follows the song's own filter automation
    (a list of (bar, Hz) points), plus a short envelope bite; nothing is played."""

    def __init__(self, auto, voices=5, detune=14.0, spread=0.8, res=0.18, env_amt=1800.0, env_decay=0.09,
                 attack=0.003, decay=0.25, sustain=0.55, release=0.1, gain_db=-14.0):
        self.auto = auto
        self.voices, self.detune, self.spread, self.res = voices, detune, spread, res
        self.env_amt, self.env_decay = env_amt, env_decay
        self.attack, self.decay, self.sustain, self.release, self.gain_db = attack, decay, sustain, release, gain_db

    def voice(self, n, dur, ctx):
        f = hz(n.p)
        L = int((dur + self.release) * dsp.SR)
        t = np.arange(L) / dsp.SR
        out = np.zeros((2, L))
        cents = [self.detune * (2 * k / (self.voices - 1) - 1) for k in range(self.voices)]
        for k, c in enumerate(cents):
            w = _saw(np.full(L, f * 2 ** (c / 1200)), ctx.rng.uniform(0, 1), dsp.SR).astype(np.float64)
            a = (self.spread * (2 * k / (self.voices - 1) - 1) + 1) * math.pi / 4
            out[0] += w * math.cos(a)
            out[1] += w * math.sin(a)
        out /= math.sqrt(self.voices)
        bars = (n.t + t * ctx.bpm / 60.0) / 4.0
        xs, ys = zip(*self.auto)
        cut = np.interp(bars, xs, ys) + self.env_amt * n.v * np.exp(-t / self.env_decay)
        y = np.stack([_ladder(out[c], cut, self.res, dsp.SR, 1.2) for c in range(2)])
        e = adsr(L, self.attack, self.decay, self.sustain, dur, self.release)
        return (y * e[None, :] * (0.45 + 0.55 * n.v)).astype(np.float32)


def _instruments():
    from studio import modern, synths
    _I.RACK['nd_lead'] = lambda: modern.Supersaw(voices=3, detune=9, spread=0.35, cutoff=1400, env_amt=3800, env_decay=0.2, res=0.12,
                                                   attack=0.004, decay=0.4, sustain=0.72, release=0.14, gain_db=-12, vib=(5.3, 0.12, 0.3), drive=1.3)
    _I.RACK['nd_lead2'] = lambda: modern.Supersaw(voices=5, detune=14, spread=0.7, cutoff=2600, env_amt=2500, env_decay=0.2, release=0.15, gain_db=-18)
    _I.RACK['nd_stabs'] = lambda: SweepSaw(STAB_CUT, voices=5, detune=14, spread=0.85, res=0.2, gain_db=-15)
    _I.RACK['nd_pad'] = lambda: modern.Pad(gain_db=-16, cutoff=1700, attack=0.35, release=0.8, voices=5, detune=12, air=0.015)
    _I.RACK['nd_keys'] = lambda: synths.EPiano(gain_db=-6, bell=0.4, trem=(4.0, 0.18))
    _I.RACK['nd_sub'] = lambda: modern.SubBass(gain_db=-9, harm=0.15)
    _I.RACK['nd_pluck'] = lambda: modern.Pluck(gain_db=-14, cutoff=1300, env_amt=4500, env_decay=0.06, decay=0.18, release=0.05, detune=9, res=0.12, square=0.35)
    _I.RACK['nd_edrums'] = lambda: modern.DrumSynth(kick_tune=50.0, kick_decay=0.26, snare_tune=200.0)
    _I.get.cache_clear()


_instruments()

MIX = {
    'tracks': {
        # a short, dark, high-passed plate on the synths and the backbeat only (the long plate cost production quality;
        # fully dry, the song read as 'Funny music'), a small room on the keys and guitar
        'lead': {'pan': 0.0, 'gain': -2.0, 'eq': [('hp', 250), ('peak', 2500, 1.0, 1.0)], 'sends': {'plate': -15, 'delay': -14}},
        'lead2': {'pan': 0.0, 'gain': -8.0, 'width': 1.4, 'eq': [('hp', 500)], 'sends': {'plate': -13}},
        'gtrlead': {'pan': 0.22, 'gain': -9.0, 'amp': {'drive_db': 9.0, 'tone': 0.5}, 'eq': [('hp', 180)]},
        'bass': {'gain': 0.0, 'eq': [('hp', 35), ('peak', 90, 1.0, 1.0), ('peak', 250, 1.0, -2.5), ('peak', 1200, 1.2, 2.0)],
                 'comp': {'thr': -20, 'ratio': 4, 'att_ms': 6, 'rel_ms': 90}, 'sat': 2.5, 'duck': {'by': 'edrums.kick', 'depth_db': 3.0, 'rel_ms': 100}},
        'sub': {'gain': -7.0, 'eq': [('lp', 140)], 'duck': {'by': 'edrums.kick', 'depth_db': 9.0, 'rel_ms': 150}},
        'stabs': {'gain': -5.0, 'width': 1.4, 'eq': [('hp', 220)], 'sends': {'plate': -15, 'delay': -17},
                  'duck': {'by': 'edrums.kick', 'depth_db': 6.0, 'rel_ms': 160}},
        'keys': {'pan': -0.2, 'gain': -6.0, 'eq': [('hp', 150), ('peak', 320, 1.0, -2.0)], 'sends': {'room': -15}},
        'pad': {'gain': -9.0, 'width': 1.5, 'eq': [('hp', 200), ('lp', 8000)], 'sends': {'plate': -13}, 'duck': {'by': 'edrums.kick', 'depth_db': 6.0, 'rel_ms': 200}},
        'gtr': {'pan': 0.45, 'gain': -10.0, 'eq': [('hp', 300), ('peak', 3000, 1.0, 2.0)], 'sends': {'room': -15}},
        'clav': {'pan': -0.3, 'gain': -8.0, 'width': 1.3, 'eq': [('hp', 300)], 'sends': {'delay': -10}},
        'edrums.kick': {'bus': 'drums', 'gain': -2.0, 'eq': [('peak', 55, 1.0, 1.5), ('peak', 300, 1.2, -3.0)], 'comp': {'thr': -14, 'ratio': 4, 'att_ms': 3, 'rel_ms': 60}},
        'edrums.snare': {'bus': 'drums', 'gain': -7.0, 'eq': [('hp', 300)], 'sends': {'plate': -17}},
        'edrums.hats': {'bus': 'drums', 'gain': -10.0},
        'edrums.fx': {'gain': -10.0, 'width': 1.5},
        'drums.kick': {'bus': 'drums', 'gain': -8.0, 'eq': [('hp', 40), ('peak', 3500, 1.0, 2.0)]},
        'drums.snare': {'bus': 'drums', 'gain': -4.0, 'eq': [('hp', 120), ('peak', 200, 1.0, 1.5), ('highshelf', 6000, 0.7, 2.5)],
                        'comp': {'thr': -18, 'ratio': 3, 'att_ms': 8, 'rel_ms': 100}, 'sends': {'plate': -18}},
        'drums.oh': {'bus': 'drums', 'gain': -1.5, 'eq': [('hp', 350), ('highshelf', 8000, 0.7, 3.0)]},
        'drums.room': {'bus': 'drums', 'gain': -12.0, 'eq': [('hp', 200)], 'comp': {'thr': -26, 'ratio': 6, 'att_ms': 2, 'rel_ms': 120}},
        'clap': {'gain': -8.0, 'eq': [('hp', 400), ('peak', 1500, 1.0, 1.5)], 'sends': {'plate': -14}},
        'shaker': {'pan': 0.4, 'gain': -13.0, 'eq': [('hp', 2500)]},
        'tamb': {'pan': -0.4, 'gain': -14.0, 'eq': [('hp', 3000)]},
    },
    'buses': {
        'drums': {'gain': 1.5, 'comp': {'thr': -12, 'ratio': 3, 'att_ms': 8, 'rel_ms': 90, 'mix': 0.6}, 'sat': 2.0},
    },
    'fx': {
        'plate': {'ir': '1.3s_Soft Plate', 'predelay': 15, 'hp': 600, 'lp': 8000, 'decay': 0.7, 'gain': -5.0},
        'room': {'ir': '0.7s_Small Studio', 'predelay': 5, 'hp': 400, 'lp': 9000, 'gain': -6.0},
        'delay': {'kind': 'delay', 'time': 60 / BPM * 0.75, 'fb': 0.3, 'lp': 5000, 'hp': 500, 'pingpong': True, 'gain': -6.0},
    },
    'master': {'comp': {'thr': -14, 'ratio': 2, 'att_ms': 20, 'rel_ms': 150, 'knee': 8}, 'lufs': -12.0, 'ceiling': -1.0, 'clip': 1.5,
               'target': [-15.0, -6.5, -7.2, -9.5, -9.8, -10.3, -11.5, -15.2, -20.0]},
}


if __name__ == '__main__':
    from studio.produce import produce
    produce(sys.modules[__name__])
