# Results and podium, candidate B (slot results): melodic house / nu-disco for the victory lap and the results
# screen. G major, the hook over IV-V-iii-vi (Cmaj9-D6-Bm7-Em9), 112 bpm. A four-on-the-floor house kick layered
# with the live kit, claps on 2 and 4, 16th hats with an off-beat open hat, a plucked synth bass on the off-beats
# over a sine sub (disco octaves in the lift), filter-house chord stabs that pump against the kick and open over
# the intro and the build, a wide pad, a 16th pluck arpeggio through a ping-pong delay, a warm supersaw lead on
# the hook, a Rhodes and muted funk guitar chops in the lift.
# Every note is written by hand here; studio/ only plays and mixes it.
#
# Form (bars): intro 4 (filtered stabs open, the kick and bass enter, the pickup bar) | loop 32:
#   A 8 (the hook on the lead) | B 8 (the lift: a call-and-answer chant over Am9-D9-Gmaj9-Em9, disco-octave bass,
#   Rhodes, guitar chops) | C 8 (breakdown 4: no kick, the hook's echo on the pluck; build 4: snare rush, riser,
#   the filter opening) | A' 8 (the hook with everything, the lead doubled an octave up, ending on the pickup bar =
#   the intro's last bar)
import math, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from studio.score import Song, seq, grid, chords, Note
from studio.arrange import comp, pad, shift, drum_fill
from studio.theory import voice_lead
from studio.synths import _Poly, _saw, _ladder, adsr, hz
from studio import dsp
from studio import instruments as _I

SLOT, CANDIDATE = 'results', 'b-melodichouse'
STYLE = ('melodic house / nu-disco: four-on-the-floor house kick layered with the live kit, claps, 16th hats and an off-beat '
         'open hat, off-beat plucked synth bass over a sine sub, pumping filter-house chord stabs, wide pad, 16th pluck '
         'arpeggio, warm supersaw lead, Rhodes and muted funk guitar chops in the lift')
FORM = ['intro 4 (filtered stabs open, kick and bass enter, pickup bar)', 'A 8 hook (supersaw lead) over Cmaj9-D6-Bm7-Em9',
        'B 8 lift (call-and-answer chant over Am9-D9-Gmaj9-Em9, disco octaves, Rhodes, guitar chops)',
        'C 8 breakdown (no kick, the hook echoed on the pluck) and build (snare rush, riser, filter)',
        "A' 8 hook with everything, pickup bar (= intro's last bar)"]

BPM, INTRO, LOOP = 112, 4, 32
A0, B0, C0, A2 = 4, 12, 20, 28

PROG = {
    'intro': 'Cmaj9 | D6 | Em9 | Am9 D9sus4',
    'A': 'Cmaj9 | D6 | Bm7 | Em9 | Cmaj9 | D6 | Bm7 | Em9',
    'B': 'Am9 | D9sus4 D9 | Gmaj9 | Em9 | Am9 | Bm7 | Cmaj9 | D7sus4 D',
    'C': 'Cmaj9 | D6 | Em9 | Em9 | Cmaj9 | D6 | Bm7 | D7sus4 D',
    "A'": 'Cmaj9 | D6 | Bm7 | Em9 | Cmaj9 | D6 | Bm7 Em7 | Am9 D9sus4',
}
SECTIONS = [('intro', INTRO), ('A', 8), ('B', 8), ('C', 8), ("A'", 8)]

HOOK = [
    "r:8 G5:8 B5:8 D6:8~ D6:8 E6:8 D6:8 B5:8",
    "A5:8 B5:8~ B5:4 r:8 F#5:8 A5:8 B5:8~",
    "B5:4 A5:8 F#5:8~ F#5:8 D5:8 E5:8 F#5:8~",
    "F#5:2. r:4",
    "r:8 G5:8 B5:8 D6:8~ D6:8 E6:8 D6:8 B5:8",
    "A5:8 B5:8~ B5:4 r:8 D6:8 E6:8 F#6:8~",
    "F#6:4 E6:8 D6:8~ D6:8 B5:8 A5:8 B5:8~",
    "B5:2. r:4",
]
# the seventh bar of the hook when the pickup bar follows (no tie across into it)
HOOK7_END = "F#6:4 E6:8 D6:8~ D6:8 B5:8 A5:8 B5:8"
LIFT = [
    "r:8 E5:8 E5:8 D5:8~ D5:8 C5:8 B4:8 C5:8~",
    "C5:4 B4:8 A4:8~ A4:4 r:4",
    "r:8 D5:8 D5:8 B4:8~ B4:8 A4:8 G4:8 A4:8~",
    "A4:4 B4:8 G4:8~ G4:4 r:4",
    "r:8 E5:8 E5:8 D5:8~ D5:8 C5:8 B4:8 D5:8~",
    "D5:4 E5:8 F#5:8~ F#5:4 r:4",
    "r:8 G5:8 G5:8 E5:8~ E5:8 D5:8 C5:8 D5:8~",
    "D5:2 r:2",
]
BUILD = ["E5:2 G5:2", "F#5:2 A5:2", "B5:1", "A5:2 C6:4 D6:4"]
PICKUP_LEAD = "r:2 r:8 D5:16 E5:16 G5:8 A5:8"


def lines(parts, t0):
    """Notes of consecutive one-bar lines from beat t0, read as one line (ties carry across bar lines, and every
    bar is checked to be four beats long)."""
    ns, _ = seq(' | '.join(parts), t0)
    return ns


def at(bar):
    return 4.0 * bar


# the stabs' filter over the song (bar, cutoff Hz): shut in the intro, open by the pickup; down in the breakdown,
# sweeping open through the build
STAB_CUT = [(0, 380), (3, 3000), (20, 3000), (20.01, 650), (24, 650), (28, 3300), (36, 3300)]


def compose():
    s = Song('Rascal Rally! Results (melodic house)', 'results', BPM, 'G major', INTRO, LOOP, seed=733)
    P = {}
    P['lead'] = s.part('lead', 'rh_lead', jitter_ms=1.5, mono=True)
    P['lead2'] = s.part('lead2', 'rh_lead2', jitter_ms=1.5, mono=True)
    P['bass'] = s.part('bass', 'rh_bass', jitter_ms=1.0, mono=True)
    P['sub'] = s.part('sub', 'rh_sub', jitter_ms=0)
    P['stabs'] = s.part('stabs', 'rh_stabs', jitter_ms=1.5)
    P['pad'] = s.part('pad', 'rh_pad', jitter_ms=2)
    P['arp'] = s.part('arp', 'rh_arp', jitter_ms=1.0)
    P['keys'] = s.part('keys', 'rh_keys', jitter_ms=3, swing=0.53, swing_unit=0.25)
    P['gtr'] = s.part('gtr', 'guitar', lag_ms=2, jitter_ms=3, swing=0.53, swing_unit=0.25)
    P['edrums'] = s.part('edrums', 'rh_edrums', jitter_ms=0.8, vel_jitter=0.03)
    P['drums'] = s.part('drums', 'kit', jitter_ms=2.5, vel_jitter=0.05, swing=0.53, swing_unit=0.25)
    P['clap'] = s.part('clap', 'clap', jitter_ms=3)
    P['shaker'] = s.part('shaker', 'shaker', jitter_ms=3, swing=0.53, swing_unit=0.25)
    P['tamb'] = s.part('tamb', 'tamb', jitter_ms=3, swing=0.53, swing_unit=0.25)

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
    def groove(bar, kick=True, clap=True, hats=True, perc=True, ride=False, tamb=False):
        if kick:
            P['edrums'].add(grid('x...x...x...x...', 'kick', at(bar), vels={'x': 0.9}))
            P['drums'].add(grid('x...x...x...x...', 'kick', at(bar), vels={'x': 0.6}))
        if clap:
            P['edrums'].add(grid('....x.......x...', 'clap', at(bar), vels={'x': 0.6}))
            P['drums'].add(grid('....X.......X...', 'snare', at(bar), vels={'X': 0.62}))
            P['clap'].add(grid('....x.......x...', 'handclap', at(bar), vels={'x': 0.72}))
        if hats:
            P['drums'].add(grid('xg.gxg.gxg.gxg.g', 'hhc', at(bar), vels={'x': 0.48, 'g': 0.28}) +
                           grid('..o...o...o...o.', 'hho', at(bar), vels={'o': 0.48}))
        if ride:
            P['drums'].add(grid('x.x.x.x.x.x.x.x.', 'ride', at(bar), vels={'x': 0.36}))
        if perc:
            P['shaker'].add(grid('x.x.x.x.x.x.x.x.', 'LShaker_Shake1D', at(bar), vels={'x': 0.42}) +
                            grid('.g.g.g.g.g.g.g.g', 'LShaker_Shake1U', at(bar), vels={'g': 0.28}))
        if tamb:
            P['tamb'].add(grid('....x.......x...', 'Tamb1_Shake', at(bar), vels={'x': 0.5}))

    def root(tt, base=33):
        return base + ((chord(tt).bass - base) % 12)

    def bassline(bar0, nbars, pat, vel=0.8, sub=True):
        """'l' the root, 'h' its octave, '5' the fifth; each note to the next step's hit (at most an eighth)."""
        out = []
        for b in range(nbars):
            for k, c_ in enumerate(pat):
                if c_ == '.':
                    continue
                tt = at(bar0 + b) + 0.25 * k
                r = root(tt)
                p = {'l': r, 'h': r + 12, '5': r + 7}[c_]
                j = 1
                while k + j < len(pat) and pat[k + j] == '.':
                    j += 1
                d = min(0.25 * j, 0.5) * 0.8
                out.append(Note(tt, d, p, vel * (1.0 if k % 4 == 2 else 0.85)))
        P['bass'].add(out)
        if sub:
            for (st, d, ch) in span(bar0, nbars):
                P['sub'].add(Note(st, d * 0.97, 28 + ((ch.bass - 28) % 12), 0.8))

    def stabs(bar0, nbars, pat='..x...x...x...x.', vel=0.62, dur=0.28):
        P['stabs'].add(comp(span(bar0, nbars), pat, 57, 74, n=4, vel=vel, dur=dur, t0=at(bar0), t1=at(bar0 + nbars)))

    def arp(bar0, nbars, lo=64, hi=86, vel=0.42, pattern=(0, 2, 1, 3, 2, 4, 3, 1)):
        out = []
        for b in range(nbars):
            for k in range(16):
                tt = at(bar0 + b) + 0.25 * k
                tones = chord(tt).tones(lo, hi)[:5]
                p = tones[pattern[k % len(pattern)] % len(tones)]
                out.append(Note(tt, 0.2, p, vel * (1.0 if k % 4 == 0 else 0.78)))
        P['arp'].add(out)

    def keys(bar0, nbars, pat='x..x..x.x..x..x.', vel=0.5):
        P['keys'].add(comp(span(bar0, nbars), pat, 55, 72, n=4, vel=vel, dur=0.4, t0=at(bar0), t1=at(bar0 + nbars)))

    def chops(bar0, nbars, pat='x.xxx.xxx.xxx.xx', vel=0.42):
        P['gtr'].add([n.copy(art=n.art | {'stac'}, v=n.v * (1.0 if i % 3 == 0 else 0.78)) for i, n in
                      enumerate(comp(span(bar0, nbars), pat, 64, 76, n=3, vel=vel, dur=0.12, t0=at(bar0), t1=at(bar0 + nbars)))])

    # ---------------------------------------------------------------- intro: the filter opens, the groove enters
    stabs(0, 3, vel=0.58)
    P['pad'].add(pad(prog['intro'][:3], 52, 69, n=4, vel=0.42))
    P['drums'].add(grid('xg.gxg.gxg.gxg.g|xg.gxg.gxg.gxg.g|xg.gxg.gxg.gxg.g', 'hhc', at(0), vels={'x': 0.42, 'g': 0.25}) +
                   grid('................|..o...o...o...o.|..o...o...o...o.', 'hho', at(0), vels={'o': 0.42}))
    P['shaker'].add(grid('x.x.x.x.x.x.x.x.|x.x.x.x.x.x.x.x.|x.x.x.x.x.x.x.x.', 'LShaker_Shake1D', at(0), vels={'x': 0.38}))
    P['edrums'].add([Note(at(0), 12.0, 'rise', 0.45)])
    groove(2, perc=False)
    bassline(2, 1, '..l...l...l...h.', vel=0.72)
    arp(1, 2, vel=0.3)

    def pickup(bar):
        """The pickup bar (ends the intro and the loop): band hits on Am9 (beat 1) and D9sus4 (the and-of-2, held),
        a snare and tom fill, the lead's pentatonic run up into the hook."""
        P['lead'].add(lines([PICKUP_LEAD], at(bar)))
        # hand voicings: Am9 (A C E G B) and D9sus4 (D G A C E)
        P['stabs'].add([Note(at(bar), 0.4, p, 0.8) for p in (60, 64, 67, 71)] + [Note(at(bar) + 1.5, 1.0, p, 0.8) for p in (60, 64, 67, 69)])
        P['pad'].add([Note(at(bar), 1.4, p, 0.45) for p in (57, 60, 64, 67)] + [Note(at(bar) + 1.5, 2.4, p, 0.45) for p in (55, 60, 62, 64)])
        P['keys'].add([Note(at(bar), 0.45, p, 0.6) for p in (55, 59, 60, 64)] + [Note(at(bar) + 1.5, 1.6, p, 0.6) for p in (55, 60, 62, 64)])
        P['bass'].add(lines(["A1:8^ r:8 r:8 D2:4. D2:16 E2:16 G2:16 A2:16"], at(bar)))
        P['sub'].add([Note(at(bar), 0.45, 33, 0.8), Note(at(bar) + 1.5, 1.4, 38, 0.8)])
        P['edrums'].add(grid('x.....x.........', 'kick', at(bar), vels={'x': 0.95}) + [Note(at(bar) + 2.0, 2.0, 'rise', 0.5)])
        P['drums'].add(grid('x.....x.........', 'kick', at(bar), vels={'x': 0.66}) + grid('x.....x.........', 'crash', at(bar), vels={'x': 0.7}) +
                       grid('........x.x.x.xx', 'snare', at(bar), vels={'x': 0.6}) + grid('.........x..x...', 'tomh', at(bar), vels={'x': 0.66}) +
                       grid('...........x..x.', 'toml', at(bar), vels={'x': 0.7}))
        P['clap'].add(grid('......x.........', 'handclap', at(bar), vels={'x': 0.78}))
    pickup(INTRO - 1)
    pickup(A2 + 7)
    s.twin(INTRO - 1, A2 + 7)

    # ---------------------------------------------------------------- A: the hook
    P['lead'].add(lines(HOOK, at(A0)))
    for b in range(8):
        groove(A0 + b)
    bassline(A0, 8, '..l...l...l...h.')
    stabs(A0, 8)
    arp(A0, 8)
    P['pad'].add(pad(prog['A'], 52, 69, n=4, vel=0.45))
    P['drums'].add(grid('x...............', 'crash', at(A0)))
    P['edrums'].add([Note(at(A0), 2.0, 'impact', 0.5)])

    # ---------------------------------------------------------------- B: the lift
    lf = lines(LIFT, at(B0))
    P['lead'].add(lf)
    P['lead2'].add(shift(lf, 0, 12, vel=0.7))
    for b in range(8):
        groove(B0 + b, ride=True, tamb=True)
    bassline(B0, 8, 'l.h.l.h.l.h.l.h.', vel=0.78)
    stabs(B0, 8, 'x..x..x...x..x..', vel=0.55, dur=0.35)
    keys(B0, 8)
    chops(B0, 8)
    P['pad'].add(pad(prog['B'], 52, 69, n=4, vel=0.5))
    P['drums'].add(grid('x...............', 'crash', at(B0)) + grid('x...............', 'crash', at(B0 + 4)))
    P['edrums'].add([Note(at(B0), 2.0, 'impact', 0.55), Note(at(B0) - 4.0, 4.0, 'rise', 0.45)])

    # ---------------------------------------------------------------- C: breakdown, then the build
    P['arp'].add([n.copy(v=0.55) for n in shift(lines(HOOK[:2], at(C0)), 0, 0)] +
                 [n.copy(v=0.5) for n in shift(lines(HOOK[:2], at(C0 + 2)), 0, 0)])
    for b in range(4):
        groove(C0 + b, kick=False, perc=(b >= 2))
    keys(C0, 4, 'x.......x..x....', vel=0.5)
    stabs(C0, 4, '..x...x...x...x.', vel=0.5)
    P['pad'].add(pad(prog['C'][:4], 52, 69, n=4, vel=0.5))
    for (st, d, ch) in span(C0, 4):
        P['sub'].add(Note(st, d * 0.97, 28 + ((ch.bass - 28) % 12), 0.6))
    # the build: the kick back on every beat, the snare rushes, the lead climbs, the filter opens
    P['lead'].add(lines(BUILD, at(C0 + 4)))
    for b in range(4):
        bar = C0 + 4 + b
        P['edrums'].add(grid('x...x...x...x...', 'kick', at(bar), vels={'x': 0.85}))
        P['drums'].add(grid('xg.gxg.gxg.gxg.g', 'hhc', at(bar), vels={'x': 0.42, 'g': 0.25}))
    P['drums'].add(grid('x...x...x...x...|x.x.x.x.x.x.x.x.|xxxxxxxxxxxxxxxx|xxxxxxxxxxxxxxxx', 'snare', at(C0 + 4),
                        vels={'x': 0.48}))
    P['edrums'].add([Note(at(C0 + 4), 16.0, 'rise', 0.75)])
    bassline(C0 + 4, 4, '..l...l...l...l.', vel=0.72)
    stabs(C0 + 4, 4, '..x...x...x...x.', vel=0.62)
    arp(C0 + 4, 4, vel=0.34)
    P['pad'].add(pad(prog['C'][4:], 52, 69, n=4, vel=0.5))
    P['drums'].add(grid('x...............', 'crash', at(C0)))

    # ---------------------------------------------------------------- A': the hook with everything
    hk = lines(HOOK[:6] + [HOOK7_END], at(A2))
    P['lead'].add(hk)
    P['gtr'].add([n.copy(p=n.p - 12, v=n.v * 0.55) for n in hk])
    for b in range(7):
        groove(A2 + b, tamb=True)
    bassline(A2, 7, '..l...l...l...h.')
    stabs(A2, 7)
    arp(A2, 7)
    chops(A2, 7, 'x.xxx.xxx.xxx.xx', vel=0.36)
    P['pad'].add(pad(prog["A'"][:-1], 52, 69, n=4, vel=0.48))
    P['drums'].add(grid('x...............', 'crash', at(A2)) + grid('x...............', 'crash', at(A2 + 4)))
    P['edrums'].add([Note(at(A2), 2.0, 'impact', 0.6)])

    # fills at the ends of phrases that have none written
    for bar, style in [(A0 + 3, 'snare'), (A0 + 7, 'toms'), (B0 + 3, 'snare'), (B0 + 7, 'toms'), (A2 + 3, 'snare')]:
        drum_fill(P['drums'], bar, style, beats=1)
    # TRIAL: the same bass line on the sampled fingered bass (muted in the mix unless a tune variant opens it)
    s.part('ebass', 'ebass', jitter_ms=2.0, mono=True).add([n.copy() for n in P['bass'].notes])
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
    _I.RACK['rh_lead'] = lambda: modern.Supersaw(voices=5, detune=11, spread=0.45, cutoff=1500, env_amt=3600, env_decay=0.2, res=0.12,
                                                   attack=0.004, decay=0.4, sustain=0.75, release=0.18, gain_db=-12, vib=(5.2, 0.1, 0.3), drive=1.2)
    _I.RACK['rh_lead2'] = lambda: modern.Supersaw(voices=5, detune=14, spread=0.8, cutoff=2400, env_amt=2000, env_decay=0.2, release=0.15, gain_db=-18)
    _I.RACK['rh_stabs'] = lambda: SweepSaw(STAB_CUT, voices=5, detune=14, spread=0.85, res=0.18, gain_db=-15)
    _I.RACK['rh_pad'] = lambda: modern.Pad(gain_db=-16, cutoff=1800, attack=0.3, release=0.8, voices=5, detune=12, air=0.02)
    _I.RACK['rh_arp'] = lambda: modern.Pluck(gain_db=-15, cutoff=1300, env_amt=4500, env_decay=0.06, decay=0.18, release=0.05, detune=9, res=0.12, square=0.35)
    _I.RACK['rh_bass'] = lambda: modern.Pluck(gain_db=-7, cutoff=420, env_amt=2000, env_decay=0.08, decay=0.3, release=0.04, detune=5, res=0.2, square=0.4)
    _I.RACK['rh_sub'] = lambda: modern.SubBass(gain_db=-9, harm=0.15)
    _I.RACK['rh_keys'] = lambda: synths.EPiano(gain_db=-6, bell=0.35, trem=(3.8, 0.2))
    _I.RACK['rh_edrums'] = lambda: modern.DrumSynth(kick_tune=50.0, kick_decay=0.28, snare_tune=200.0)
    _I.get.cache_clear()


_instruments()

MIX = {
    'tracks': {
        # a dry mix (the reverb sends cost 0.44 in production quality: tune.py, 28 Sept), the space from width and a
        # quiet ping-pong delay; the bass summed to mono (the pluck's detuned saws put the low end in the sides)
        'lead': {'pan': 0.0, 'gain': -2.0, 'eq': [('hp', 250), ('peak', 2500, 1.0, 1.0)], 'sends': {'delay': -16}},
        'lead2': {'pan': 0.0, 'gain': -8.0, 'width': 1.4, 'eq': [('hp', 400)]},
        'ebass': {'gain': -60.0, 'eq': [('hp', 35), ('peak', 90, 1.0, 1.0), ('peak', 250, 1.0, -2.5), ('peak', 1200, 1.2, 2.0)],
                  'comp': {'thr': -20, 'ratio': 4, 'att_ms': 6, 'rel_ms': 90}, 'sat': 2.5, 'duck': {'by': 'edrums.kick', 'depth_db': 3.0, 'rel_ms': 100}},
        'bass': {'gain': 0.0, 'mono': True, 'eq': [('hp', 35), ('peak', 90, 1.0, 1.0), ('peak', 250, 1.0, -2.0)],
                 'comp': {'thr': -18, 'ratio': 3, 'att_ms': 5, 'rel_ms': 60}, 'duck': {'by': 'edrums.kick', 'depth_db': 4.0, 'rel_ms': 110}},
        'sub': {'gain': -7.0, 'eq': [('lp', 140)], 'duck': {'by': 'edrums.kick', 'depth_db': 9.0, 'rel_ms': 150}},
        'stabs': {'gain': -5.0, 'width': 1.4, 'eq': [('hp', 180)], 'duck': {'by': 'edrums.kick', 'depth_db': 6.0, 'rel_ms': 160}},
        'pad': {'gain': -9.0, 'width': 1.5, 'eq': [('hp', 160), ('lp', 9000)], 'duck': {'by': 'edrums.kick', 'depth_db': 7.0, 'rel_ms': 200}},
        'arp': {'pan': 0.2, 'gain': -6.0, 'width': 1.5, 'eq': [('hp', 350)], 'sends': {'delay': -10}, 'duck': {'by': 'edrums.kick', 'depth_db': 3.0}},
        'keys': {'pan': -0.2, 'gain': -6.0, 'eq': [('hp', 150), ('peak', 320, 1.0, -2.0)]},
        'gtr': {'pan': 0.45, 'gain': -11.0, 'eq': [('hp', 300), ('peak', 3000, 1.0, 2.0)]},
        'edrums.kick': {'bus': 'drums', 'gain': -2.0, 'eq': [('peak', 55, 1.0, 1.5), ('peak', 300, 1.2, -3.0)], 'comp': {'thr': -14, 'ratio': 4, 'att_ms': 3, 'rel_ms': 60}},
        'edrums.snare': {'bus': 'drums', 'gain': -8.0, 'eq': [('hp', 300)]},
        'edrums.hats': {'bus': 'drums', 'gain': -10.0},
        'edrums.fx': {'gain': -10.0, 'width': 1.5},
        'drums.kick': {'bus': 'drums', 'gain': -8.0, 'eq': [('hp', 40), ('peak', 3500, 1.0, 2.0)]},
        'drums.snare': {'bus': 'drums', 'gain': -4.0, 'eq': [('hp', 120), ('peak', 200, 1.0, 1.5), ('highshelf', 6000, 0.7, 2.5)],
                        'comp': {'thr': -18, 'ratio': 3, 'att_ms': 8, 'rel_ms': 100}},
        'drums.oh': {'bus': 'drums', 'gain': -1.5, 'eq': [('hp', 350), ('highshelf', 8000, 0.7, 3.0)]},
        'drums.room': {'bus': 'drums', 'gain': -12.0, 'eq': [('hp', 200)], 'comp': {'thr': -26, 'ratio': 6, 'att_ms': 2, 'rel_ms': 120}},
        'clap': {'gain': -8.0, 'eq': [('hp', 400), ('peak', 1500, 1.0, 1.5)]},
        'shaker': {'pan': 0.4, 'gain': -11.0, 'eq': [('hp', 2500)]},
        'tamb': {'pan': -0.4, 'gain': -13.0, 'eq': [('hp', 3000)]},
    },
    'buses': {
        'drums': {'gain': 0.0, 'comp': {'thr': -12, 'ratio': 3, 'att_ms': 8, 'rel_ms': 90, 'mix': 0.6}, 'sat': 2.0},
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
