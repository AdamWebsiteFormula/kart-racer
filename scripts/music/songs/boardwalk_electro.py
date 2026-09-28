# Boardwalk Nights, candidate B (track boardwalk-nights): electro-funk / future funk for the neon boardwalk at night.
# D minor (a Dorian vamp; the chorus opens into its relative F major), 124 bpm. A synth bass riff with octave pops is
# the hook's backbone; a drum machine (kick, clap, 16th hats) layered with the live kit's snare, hats and fills; a clav
# and a guitar chopping sixteenths; bright analog brass-synth stabs; a focused saw lead on the hook, a big supersaw on
# the chorus; a filtered-disco breakdown (the band through a closing, then opening resonant low-pass); a build with a
# snare rush, a pluck arpeggio and swelling brass for the fireworks.
# Every note is written by hand here; studio/ only plays and mixes it.
#
# Form (bars): intro 4 (the band filtered and opening up, bass and kick enter, the pickup bar) | loop 36:
#   A 8 (the hook on the saw lead over the Dm9-G9 riff, brass answers) | B 8 (the chorus: Bb-C-Am-Dm, supersaw lead,
#   brass pushes, pad) | C 8 (filtered-disco breakdown: 4 bars closed with no kick, 4 bars opening under the bridge
#   melody) | D 4 (the build: snare rush, arpeggio, brass swell) | A' 8 (the hook with everything, ending on the pickup
#   bar = the intro's last bar)
import math, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from studio.score import Song, seq, grid, chords, Note
from studio.arrange import comp, pad, shift, drum_fill
from studio.synths import _Poly, _saw, _ladder, adsr, hz
from studio import dsp
from studio import instruments as _I

SLOT, CANDIDATE = 'boardwalk-nights', 'b-electro-funk'
STYLE = ('electro-funk / future funk: synth bass riff with octave pops, drum machine layered with live kit, clav and guitar '
         'chops, analog brass-synth stabs, saw lead hook, supersaw chorus, filtered-disco breakdown, snare-rush build')
FORM = ['intro 4 (band filtered and opening, bass and kick enter, pickup bar)', 'A 8 hook on the saw lead over the Dm9-G9 riff',
        'B 8 chorus Bb-C-Am-Dm (supersaw lead, brass pushes, pad)', 'C 8 filtered-disco breakdown (closed, then opening under the bridge)',
        'D 4 build (snare rush, arpeggio, brass swell)', "A' 8 hook with everything, pickup bar (= intro's last bar)"]

BPM, INTRO, LOOP = 124, 4, 36
A0, B0, C0, D0, A2 = 4, 12, 20, 28, 32
LAST = A2 + 7

PROG = {
    'intro': 'Dm9 | G9 | Dm9 | Bbmaj7 A7',
    'A': 'Dm9 | G9 | Dm9 | G9 | Bbmaj7 | C6 | Dm9 | Gm9 A7',
    'B': 'Bbmaj9 | C69 | Am9 | Dm9 | Gm9 | C13 | Fmaj9 | A7sus4 A7',
    'C': 'Dm9 | G9 | Dm9 | G9 | Dm9 | G9 | Bbmaj7 | A7sus4 A7',
    'D': 'Gm9 | Bbmaj7 | A7sus4 | A7',
    "A'": 'Dm9 | G9 | Dm9 | G9 | Bbmaj7 | C6 | Dm9 | Bbmaj7 A7',
}
SECTIONS = [('intro', INTRO), ('A', 8), ('B', 8), ('C', 8), ('D', 4), ("A'", 8)]

# the hook: a rising three-note cell, a leap and a fall, sequenced up a third, then down from the peak
HOOK = [
    "D5:8. E5:16~ E5:8 F5:8~ F5:4 A5:8 G5:8",
    "F5:8 D5:8~ D5:2 r:8 C5:16 D5:16",
    "F5:8. G5:16~ G5:8 A5:8~ A5:4 C6:8 A5:8",
    "B5:8 A5:8~ A5:2 r:8 G5:16 A5:16",
    "D6:8. C6:16~ C6:8 A5:8~ A5:4 F5:8 G5:8",
    "A5:8 G5:8~ G5:4 r:8 E5:8 F5:8 G5:8",
    "A5:4. D5:8~ D5:2",
    "r:2 C#5:8 D5:8 E5:8 G5:8",
]
# the chorus: long notes falling from the top of each chord
CHORUS = [
    "A5:2 G5:8 F5:8 D5:8 E5:8~",
    "E5:8 G5:8~ G5:2 r:8 E5:16 F5:16",
    "G5:2 E5:8 D5:8 C5:8 E5:8~",
    "E5:8 D5:8~ D5:2 r:8 F5:16 A5:16",
    "Bb5:2 A5:8 G5:8 F5:8 G5:8~",
    "G5:8 A5:8~ A5:2 C6:8 Bb5:8",
    "A5:4. G5:8~ G5:4 F5:8 E5:8",
    "D5:2 C#5:2",
]
BRIDGE = [
    "r:8 A5:8 C6:8 A5:8 D6:4 C6:8 A5:8",
    "B5:4 A5:8 G5:8~ G5:2",
    "r:8 F5:8 A5:8 F5:8 D6:4 C6:8 A5:8",
    "A5:2 G5:4 E5:4",
]
PICKUP_LEAD = "r:2 r:8 E4:16 F4:16 G4:16 A4:16 Bb4:16 C#5:16"

# the bass riff (per sixteenth: step, what, length in steps, velocity): root, root ghost, octave pop, seventh, octave
# pop, fifth, third, then a half-step approach into the next bar's root
RIFF = [(0, 'r', 3, 1.0), (3, 'r', 1, 0.62), (5, 'o', 1, 0.95), (8, '7', 1, 0.78), (9, 'o', 1, 0.92), (11, '5', 1, 0.78),
        (13, '3', 1, 0.74), (14, 'a', 2, 0.86)]
DISCO = [(0, 'r', 2, 1.0), (2, 'o', 2, 0.9), (4, 'r', 2, 0.92), (6, 'o', 1, 0.9), (7, 'r', 1, 0.6), (8, 'r', 2, 0.95),
         (10, 'o', 2, 0.9), (12, 'r', 2, 0.92), (14, 'o', 1, 0.9), (15, 'a', 1, 0.8)]
BUILD_B = [(k, 'r' if k % 4 == 0 else 'o' if k % 4 == 2 else 'r', 2, 0.9 if k % 4 == 0 else 0.8) for k in range(0, 16, 2)]


def lines(parts, t0):
    """Notes of consecutive one-bar lines from beat t0, read as one line (ties carry across bar lines, and every
    bar is checked to be four beats long)."""
    ns, _ = seq(' | '.join(parts), t0)
    return ns


def at(bar):
    return 4.0 * bar


# the filtered-disco low-pass over the song (bar, Hz): opening through the intro; shut at the breakdown, sweeping
# open through its second half
SWEEP = [(0, 260), (1, 420), (2.5, 2600), (3, 5200), (20, 5200), (20.5, 380), (24, 420), (26, 1500), (27.75, 9000), (40, 9000)]


def compose():
    s = Song('Boardwalk Nights (electro-funk)', 'boardwalk-nights', BPM, 'D minor', INTRO, LOOP, seed=527)
    P = {}
    P['lead'] = s.part('lead', 'ef_lead', jitter_ms=1.5, mono=True)
    P['saw'] = s.part('saw', 'ef_saw', jitter_ms=1.5, mono=True)
    P['brass'] = s.part('brass', 'ef_brass', jitter_ms=2)
    P['fbrass'] = s.part('fbrass', 'ef_fbrass', jitter_ms=2)
    P['bass'] = s.part('bass', 'ef_bass', jitter_ms=1.5, mono=True)
    P['sub'] = s.part('sub', 'ef_sub', jitter_ms=0)
    P['clav'] = s.part('clav', 'ef_clav', jitter_ms=2.5)
    P['fclav'] = s.part('fclav', 'ef_fclav', jitter_ms=2.5)
    P['keys'] = s.part('keys', 'ef_keys', lag_ms=4, jitter_ms=3)
    P['fgtr'] = s.part('fgtr', 'ef_fgtr', lag_ms=2, jitter_ms=3)
    P['pad'] = s.part('pad', 'ef_pad', jitter_ms=2)
    P['fpad'] = s.part('fpad', 'ef_fpad', jitter_ms=2)
    P['arp'] = s.part('arp', 'ef_arp', jitter_ms=1)
    P['edrums'] = s.part('edrums', 'ef_edrums', jitter_ms=0.8, vel_jitter=0.03)
    P['drums'] = s.part('drums', 'kit', jitter_ms=2.5, vel_jitter=0.05)
    P['clap'] = s.part('clap', 'clap', jitter_ms=3)
    P['shaker'] = s.part('shaker', 'shaker', jitter_ms=3)
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

    # ---------------------------------------------------------------- the rhythm section
    def bassline(bar0, nbars, pat, vel=0.85, part='bass'):
        out, prev = [], 38
        for b in range(nbars):
            bar = bar0 + b
            for (k, kind, ln, v) in pat:
                tt = at(bar) + 0.25 * k
                ch = chord(tt)
                r = 28 + ((ch.bass - 28) % 12)
                ivs = {i % 12 for i in ch.ivs}
                if kind == 'r':
                    p = r
                elif kind == 'o':
                    p = r + 12
                elif kind == '5':
                    p = r + 7
                elif kind == '3':
                    p = r + (3 if 3 in ivs else 4 if 4 in ivs else 5)
                elif kind == '7':
                    p = r + (11 if 11 in ivs else 10 if 10 in ivs else 9 if 9 in ivs else 7)
                else:  # a half step below the next bar's root, in the octave nearest the last note
                    nr = 28 + ((chord(at(bar + 1)).bass - 28) % 12)
                    p = min((nr - 1, nr + 11), key=lambda c: abs(c - prev))
                out.append(Note(tt, 0.25 * ln * 0.88, p, vel * v))
                prev = p
        P[part].add(out)

    def sub(bar0, nbars, vel=0.8):
        for (st, d, ch) in span(bar0, nbars):
            P['sub'].add(Note(st, d * 0.97, 28 + ((ch.bass - 28) % 12), vel))

    def groove(bar, chorus=False, kick=True, snare=True):
        if kick:
            P['edrums'].add(grid('x...x...x...x...', 'kick', at(bar), vels={'x': 0.92}))
            P['drums'].add(grid('x...x...x...x...', 'kick', at(bar), vels={'x': 0.6}))
        if snare:
            P['drums'].add(grid('....X.......X...', 'snare', at(bar), vels={'X': 0.82}) +
                           grid('.......g.g....g.', 'snare', at(bar), vels={'g': 0.18}))
            P['edrums'].add(grid('....x.......x...', 'clap', at(bar), vels={'x': 0.68}))
            P['clap'].add(grid('....x.......x...', 'handclap', at(bar), vels={'x': 0.7}))
        if chorus:
            P['drums'].add(grid('xg.gxg.gxg.gxg.g', 'hhc', at(bar), vels={'x': 0.5, 'g': 0.3}) +
                           grid('..o...o...o...o.', 'hho', at(bar), vels={'o': 0.5}))
            P['tamb'].add(grid('....x.......x...', 'Tamb1_Shake', at(bar), vels={'x': 0.55}))
        else:
            P['drums'].add(grid('xgxgxgxgxgxgxgxg', 'hhc', at(bar), vels={'x': 0.52, 'g': 0.3}))
            P['edrums'].add(grid('..x...x...x...x.', 'hat', at(bar), vels={'x': 0.45}))
        P['shaker'].add(grid('x.x.x.x.x.x.x.x.', 'LShaker_Shake1D', at(bar), vels={'x': 0.4}) +
                        grid('.g.g.g.g.g.g.g.g', 'LShaker_Shake1U', at(bar), vels={'g': 0.25}))

    def clav(bar0, nbars, pat='x.xx.x..x.xx.x..', vel=0.62, part='clav'):
        P[part].add([n.copy(art=n.art | {'stac'}, v=n.v * (1.0 if i % 3 == 0 else 0.82)) for i, n in
                     enumerate(comp(span(bar0, nbars), pat, 55, 70, n=3, vel=vel, dur=0.14, t0=at(bar0), t1=at(bar0 + nbars)))])

    def chops(bar0, nbars, pat='..x...x...x...x.', vel=0.5, part='gtr'):
        P[part].add([n.copy(art=n.art | {'stac'}) for n in
                     comp(span(bar0, nbars), pat, 64, 77, n=3, vel=vel, dur=0.12, t0=at(bar0), t1=at(bar0 + nbars))])

    def stabs(bar0, nbars, pat, vel=0.7, dur=0.3, part='brass'):
        P[part].add(comp(span(bar0, nbars), pat, 58, 75, n=4, vel=vel, dur=dur, t0=at(bar0), t1=at(bar0 + nbars)))

    def keys(bar0, nbars, vel=0.55):
        """The Rhodes laying back: a one-chord bar struck on 1 and the and-of-2, a two-chord bar on 1 and 3."""
        for b in range(nbars):
            sp = span(bar0 + b, 1)
            P['keys'].add(comp(sp, 'x-----x---------' if len(sp) == 1 else 'x-------x-------', 55, 72, n=4, vel=vel,
                               t0=at(bar0 + b), t1=at(bar0 + b + 1)))

    def arp(bar0, nbars, v0=0.35, v1=0.7, lo=62, hi=86):
        out = []
        for b in range(nbars):
            for k in range(16):
                tt = at(bar0 + b) + 0.25 * k
                tones = chord(tt).tones(lo, hi)[:5]
                p = tones[[0, 1, 2, 3, 4, 3, 2, 1][k % 8] % len(tones)]
                out.append(Note(tt, 0.2, p, v0 + (v1 - v0) * (tt - at(bar0)) / (4 * nbars)))
        P['arp'].add(out)

    # ---------------------------------------------------------------- intro: the band filtered, opening up
    clav(0, 3, part='fclav', vel=0.66)
    chops(0, 3, part='fgtr', vel=0.55)
    stabs(0, 3, '......x...x.....', vel=0.72, part='fbrass')
    P['fpad'].add(pad(prog['intro'][:3], 55, 70, n=4, vel=0.5))
    P['drums'].add(grid('xgxgxgxgxgxgxgxg|xgxgxgxgxgxgxgxg|xgxgxgxgxgxgxgxg', 'hhc', at(0), vels={'x': 0.42, 'g': 0.26}))
    P['shaker'].add(grid('................|x.x.x.x.x.x.x.x.|x.x.x.x.x.x.x.x.', 'LShaker_Shake1D', at(0), vels={'x': 0.4}))
    bassline(1, 2, RIFF, vel=0.78)
    P['edrums'].add(grid('................|................|x...x...x...x...', 'kick', at(0), vels={'x': 0.85}) +
                    grid('................|................|....x.......x...', 'clap', at(0), vels={'x': 0.62}) +
                    [Note(at(1), 8.0, 'rise', 0.55)])
    P['clap'].add(grid('................|................|....x.......x...', 'handclap', at(0), vels={'x': 0.62}))

    def pickup(bar):
        """The bar that ends the intro and the loop: band hits on B-flat (beat 1) and A7 (the and-of-2), a snare and
        tom fill, the lead's run up the A Phrygian-dominant scale into the hook."""
        P['lead'].add(lines([PICKUP_LEAD], at(bar)))
        P['brass'].add([Note(at(bar), 0.45, p, 0.85) for p in (58, 62, 65, 69)] + [Note(at(bar) + 1.5, 0.9, p, 0.88) for p in (57, 61, 64, 67)])
        P['clav'].add([Note(at(bar), 0.15, p, 0.72, {'stac'}) for p in (58, 62, 65)] + [Note(at(bar) + 1.5, 0.15, p, 0.72, {'stac'}) for p in (57, 61, 67)])
        P['keys'].add([Note(at(bar), 1.2, p, 0.62) for p in (58, 62, 65, 69)] + [Note(at(bar) + 1.5, 2.3, p, 0.62) for p in (57, 61, 64, 67)])
        P['bass'].add(lines(["Bb1:8^ r:8 r:8 A1:4. A2:8 G2:8"], at(bar)))
        P['sub'].add([Note(at(bar), 0.45, 34, 0.8), Note(at(bar) + 1.5, 1.4, 33, 0.8)])
        P['edrums'].add(grid('x.....x.........', 'kick', at(bar), vels={'x': 0.95}) + [Note(at(bar) + 2.0, 2.0, 'rise', 0.5)])
        P['drums'].add(grid('x.....x.........', 'kick', at(bar), vels={'x': 0.7}) + grid('x.....x.........', 'crash', at(bar), vels={'x': 0.7}) +
                       grid('........x.x.xxxx', 'snare', at(bar), vels={'x': 0.6}) + grid('.........x..x...', 'tomh', at(bar), vels={'x': 0.7}) +
                       grid('...........x..x.', 'toml', at(bar), vels={'x': 0.75}))
        P['clap'].add(grid('......x.........', 'handclap', at(bar), vels={'x': 0.8}))
    pickup(INTRO - 1)
    pickup(LAST)
    s.twin(INTRO - 1, LAST)

    # ---------------------------------------------------------------- A: the hook over the riff
    P['lead'].add(lines(HOOK, at(A0)))
    bassline(A0, 8, RIFF)
    sub(A0, 8)
    clav(A0, 8)
    for b in range(8):
        groove(A0 + b)
    for bar in (A0 + 1, A0 + 3):
        stabs(bar, 1, '......x...x.....', vel=0.72)
    stabs(A0 + 5, 1, '........x.x.....', vel=0.72)
    stabs(A0 + 7, 1, 'x.....x.........', vel=0.78)
    keys(A0 + 4, 4, vel=0.5)
    P['drums'].add(grid('x...............', 'crash', at(A0)))
    P['edrums'].add([Note(at(A0), 2.0, 'impact', 0.55)])

    # ---------------------------------------------------------------- B: the chorus
    ch = lines(CHORUS, at(B0))
    P['saw'].add(ch)
    P['lead'].add(shift(ch, 0, -12, vel=0.8))
    bassline(B0, 8, DISCO)
    sub(B0, 8)
    stabs(B0, 8, 'x.....x...x.....', vel=0.66)
    keys(B0, 8, vel=0.55)
    P['pad'].add(pad(prog['B'], 53, 70, n=4, vel=0.5))
    for b in range(8):
        groove(B0 + b, chorus=True)
    P['drums'].add(grid('x...............', 'crash', at(B0)) + grid('x...............', 'crash', at(B0 + 4)))
    P['edrums'].add([Note(at(B0), 2.0, 'impact', 0.6), Note(at(B0) - 2.0, 2.0, 'rise', 0.45)])

    # ---------------------------------------------------------------- C: the filtered-disco breakdown
    clav(C0, 8, part='fclav', vel=0.66)
    chops(C0, 8, part='fgtr', vel=0.55)
    stabs(C0, 8, '......x...x.....', vel=0.72, part='fbrass')
    P['fpad'].add(pad(prog['C'], 53, 70, n=4, vel=0.5))
    bassline(C0, 8, RIFF, vel=0.8)
    sub(C0 + 4, 4, vel=0.75)
    for b in range(8):
        groove(C0 + b, kick=b >= 4, snare=b >= 2)
    P['lead'].add(lines(BRIDGE, at(C0 + 4)))
    P['edrums'].add([Note(at(C0), 2.0, 'impact', 0.5), Note(at(C0), 4.0, 'down', 0.5), Note(at(C0 + 6), 8.0, 'rise', 0.6)])
    P['drums'].add(grid('x...............', 'crash', at(C0 + 4)))

    # ---------------------------------------------------------------- D: the build (fireworks)
    bassline(D0, 4, BUILD_B, vel=0.82)
    sub(D0, 4, vel=0.75)
    arp(D0, 4)
    P['brass'].add([n.copy(v=0.45 + 0.4 * (n.t - at(D0)) / 16) for n in pad(prog['D'], 58, 75, n=4, vel=1.0)])
    P['pad'].add(pad(prog['D'], 53, 70, n=4, vel=0.55))
    for b in range(4):
        P['edrums'].add(grid('x...x...x...x...' if b < 3 else 'x...x...x.......', 'kick', at(D0 + b), vels={'x': 0.88}))
        P['drums'].add(grid('xgxgxgxgxgxgxgxg', 'hhc', at(D0 + b), vels={'x': 0.45, 'g': 0.28}))
    P['drums'].add([n.copy(v=0.35 + 0.45 * (n.t - at(D0)) / 16) for n in
                    grid('x...x...x...x...|x.x.x.x.x.x.x.x.|xxxxxxxxxxxxxxxx|xxxxxxxxxxxx....', 'snare', at(D0), vels={'x': 1.0})])
    P['edrums'].add([Note(at(D0), 15.0, 'rise', 0.85)])
    P['drums'].add(grid('x...............', 'crash', at(D0)))

    # ---------------------------------------------------------------- A': the hook with everything
    hk = lines(HOOK[:7], at(A2))
    P['lead'].add(hk)
    P['saw'].add(shift(hk, 0, 0, vel=0.75))
    bassline(A2, 7, RIFF)
    sub(A2, 7)
    clav(A2, 7)
    keys(A2, 7, vel=0.52)
    P['pad'].add(pad(prog["A'"][:7], 53, 70, n=4, vel=0.45))
    for b in range(7):
        groove(A2 + b, chorus=b >= 4)
    for bar in (A2 + 1, A2 + 3):
        stabs(bar, 1, '......x...x.....', vel=0.75)
    stabs(A2 + 5, 1, '........x.x.....', vel=0.75)
    stabs(A2 + 6, 1, 'x.....x...x.....', vel=0.7)
    P['drums'].add(grid('x...............', 'crash', at(A2)) + grid('x...............', 'crash', at(A2 + 4)))
    P['edrums'].add([Note(at(A2), 2.0, 'impact', 0.8)])

    for bar, style in [(A0 + 3, 'snare'), (A0 + 7, 'toms'), (B0 + 3, 'snare'), (B0 + 7, 'toms'), (C0 + 7, 'rush'), (A2 + 3, 'snare')]:
        drum_fill(P['drums'], bar, style, beats=1)
    return s


# ---------------------------------------------------------------- instruments played by code for this song

def _detunes(voices, cents):
    if voices == 1:
        return [0.0]
    return [cents * (2 * k / (voices - 1) - 1) for k in range(voices)]


class BrassSynth(_Poly):
    """Analog synth brass: detuned saws through a ladder low-pass whose envelope swells in over a few tens of
    milliseconds and settles to a held level (the 'bwah' of a synth brass section), a small pitch scoop at the attack."""

    def __init__(self, voices=4, detune=9.0, spread=0.7, cutoff=700.0, env_amt=4200.0, env_att=0.03, env_dec=0.22,
                 env_sus=0.35, res=0.1, attack=0.01, decay=0.3, sustain=0.8, release=0.12, gain_db=-14.0, drive=1.3):
        self.voices, self.detune, self.spread = voices, detune, spread
        self.cutoff, self.env_amt, self.env_att, self.env_dec, self.env_sus, self.res = cutoff, env_amt, env_att, env_dec, env_sus, res
        self.attack, self.decay, self.sustain, self.release, self.gain_db, self.drive = attack, decay, sustain, release, gain_db, drive

    def voice(self, n, dur, ctx):
        f = hz(n.p)
        L = int((dur + self.release) * dsp.SR)
        t = np.arange(L) / dsp.SR
        base = f * 2 ** (-0.2 * np.exp(-t / 0.025) / 12)
        out = np.zeros((2, L))
        for k, c in enumerate(_detunes(self.voices, self.detune)):
            w = _saw(base * 2 ** (c / 1200), ctx.rng.uniform(0, 1), dsp.SR).astype(np.float64)
            a = (self.spread * (2 * k / max(1, self.voices - 1) - 1) + 1) * math.pi / 4
            out[0] += w * math.cos(a)
            out[1] += w * math.sin(a)
        out /= math.sqrt(self.voices)
        fenv = (1 - np.exp(-t / self.env_att)) * (self.env_sus + (1 - self.env_sus) * np.exp(-np.maximum(t - self.env_att, 0) / self.env_dec))
        cut = self.cutoff + self.env_amt * n.v * fenv
        y = np.stack([_ladder(out[c], cut, self.res, dsp.SR, self.drive) for c in range(2)])
        e = adsr(L, self.attack, self.decay, self.sustain, dur, self.release)
        return (y * e[None, :] * (0.45 + 0.55 * n.v)).astype(np.float32)


class Swept:
    """Any instrument through a resonant ladder low-pass that follows the song's filter automation (bar, Hz): the
    filtered-disco sweep over a whole part."""

    def __init__(self, inner, auto, res=0.28):
        self.inner, self.auto, self.res = inner, auto, res

    def render(self, notes, ctx, part):
        out = self.inner.render(notes, ctx, part)
        bars = np.arange(ctx.n) / dsp.SR * ctx.bpm / 60.0 / 4.0
        xs, ys = zip(*self.auto)
        cut = np.exp(np.interp(bars, xs, np.log(ys)))
        mk = 1.0 + 4.0 * self.res * 0.6

        def f(x):
            return (np.stack([_ladder(x[c].astype(np.float64), cut, self.res, dsp.SR, 1.0) for c in range(2)]) * mk).astype(np.float32)
        return {k: f(v) for k, v in out.items()} if isinstance(out, dict) else f(out)


def _instruments():
    from studio import modern, synths
    _I.RACK['ef_lead'] = lambda: modern.Supersaw(voices=3, detune=8, spread=0.35, cutoff=1500, env_amt=3800, env_decay=0.2, res=0.12,
                                                   attack=0.004, decay=0.4, sustain=0.72, release=0.14, gain_db=-12, vib=(5.3, 0.12, 0.3), drive=1.3)
    _I.RACK['ef_saw'] = lambda: modern.Supersaw(voices=7, detune=16, spread=0.8, cutoff=2400, env_amt=4000, env_decay=0.22, res=0.12,
                                                  attack=0.004, decay=0.45, sustain=0.75, release=0.2, gain_db=-13, vib=(5.2, 0.1, 0.35))
    _I.RACK['ef_brass'] = lambda: BrassSynth(gain_db=-14)
    _I.RACK['ef_fbrass'] = lambda: Swept(BrassSynth(gain_db=-14), SWEEP)
    _I.RACK['ef_bass'] = lambda: synths.SynthBass(gain_db=-7, cutoff=300, env_amt=3200, decay=0.1, res=0.3, sub=0.5, release=0.04, drive=1.8)
    _I.RACK['ef_sub'] = lambda: modern.SubBass(gain_db=-9, harm=0.15)
    _I.RACK['ef_pad'] = lambda: modern.Pad(gain_db=-16, cutoff=1800, attack=0.3, release=0.8, voices=5, detune=12, air=0.015)
    _I.RACK['ef_fpad'] = lambda: Swept(modern.Pad(gain_db=-16, cutoff=2400, attack=0.3, release=0.8, voices=5, detune=12, air=0.015), SWEEP)
    _I.RACK['ef_clav'] = lambda: synths.Clav(gain_db=-4, mute=0.5)
    _I.RACK['ef_fclav'] = lambda: Swept(synths.Clav(gain_db=-4, mute=0.5), SWEEP)
    _I.RACK['ef_fgtr'] = lambda: Swept(_I.RACK['guitar'](), SWEEP)
    _I.RACK['ef_arp'] = lambda: modern.Pluck(gain_db=-15, cutoff=1400, env_amt=5000, env_decay=0.06, decay=0.18, release=0.05, detune=10, res=0.1, square=0.5)
    _I.RACK['ef_edrums'] = lambda: modern.DrumSynth(kick_tune=50.0, kick_decay=0.27, snare_tune=200.0)
    _I.RACK['ef_keys'] = lambda: synths.EPiano(gain_db=-5, bell=0.45, trem=(3.6, 0.2))
    _I.get.cache_clear()


_instruments()

GTR = {'eq': [('hp', 300), ('peak', 3000, 1.0, 2.0)], 'sends': {'room': -12}}
CLAV = {'eq': [('hp', 150), ('peak', 1000, 1.0, -2.0)], 'sends': {'room': -12}}
BRASS = {'width': 1.3, 'eq': [('hp', 150)], 'sends': {'plate': -14}, 'duck': {'by': 'edrums.kick', 'depth_db': 3.0, 'rel_ms': 140}}
PAD = {'width': 1.5, 'eq': [('hp', 150), ('lp', 7000)], 'sends': {'plate': -11}, 'duck': {'by': 'edrums.kick', 'depth_db': 6.0, 'rel_ms': 200}}
MIX = {
    'tracks': {
        'lead': {'pan': 0.0, 'gain': -2.0, 'eq': [('hp', 250), ('peak', 2500, 1.0, 1.0)], 'sends': {'plate': -13, 'delay': -13}},
        'saw': {'pan': 0.0, 'gain': -3.0, 'width': 1.3, 'eq': [('hp', 300), ('peak', 3000, 1.0, 1.0)], 'sends': {'plate': -12, 'delay': -15},
                'duck': {'by': 'edrums.kick', 'depth_db': 2.0, 'rel_ms': 120}},
        'brass': {'gain': -6.0, **BRASS},
        'fbrass': {'gain': -6.0, **BRASS},
        'bass': {'gain': 0.0, 'eq': [('hp', 35), ('peak', 90, 1.0, 1.0), ('peak', 1200, 1.2, 2.0)],
                 'comp': {'thr': -20, 'ratio': 4, 'att_ms': 6, 'rel_ms': 90}, 'sat': 2.0, 'duck': {'by': 'edrums.kick', 'depth_db': 3.0, 'rel_ms': 100}},
        'sub': {'gain': -9.0, 'eq': [('hp', 38), ('lp', 140)], 'mono': True, 'duck': {'by': 'edrums.kick', 'depth_db': 9.0, 'rel_ms': 150}},
        'clav': {'pan': -0.35, 'gain': -8.0, **CLAV},
        'fclav': {'pan': -0.35, 'gain': -8.0, **CLAV},
        'keys': {'pan': 0.3, 'gain': -6.0, 'eq': [('hp', 120), ('peak', 300, 1.0, -2.0)], 'sends': {'room': -12}},
        'fgtr': {'pan': 0.45, 'gain': -10.0, **GTR},
        'pad': {'gain': -9.0, **PAD},
        'fpad': {'gain': -9.0, **PAD},
        'arp': {'pan': 0.2, 'gain': -8.0, 'width': 1.5, 'eq': [('hp', 400)], 'sends': {'delay': -9, 'plate': -14}, 'duck': {'by': 'edrums.kick', 'depth_db': 3.0}},
        'edrums.kick': {'bus': 'drums', 'gain': -2.0, 'eq': [('peak', 55, 1.0, 1.5), ('peak', 300, 1.2, -3.0)], 'comp': {'thr': -14, 'ratio': 4, 'att_ms': 3, 'rel_ms': 60}},
        'edrums.snare': {'bus': 'drums', 'gain': -7.0, 'eq': [('hp', 300)], 'sends': {'plate': -14}},
        'edrums.hats': {'bus': 'drums', 'gain': -12.0, 'eq': [('hp', 6000)]},
        'edrums.fx': {'gain': -10.0, 'width': 1.5, 'sends': {'plate': -10}},
        'drums.kick': {'bus': 'drums', 'gain': -8.0, 'eq': [('hp', 40), ('peak', 3500, 1.0, 2.0)]},
        'drums.snare': {'bus': 'drums', 'gain': -3.0, 'eq': [('hp', 120), ('peak', 200, 1.0, 1.5), ('highshelf', 6000, 0.7, 2.5)],
                        'comp': {'thr': -18, 'ratio': 3, 'att_ms': 8, 'rel_ms': 100}, 'sends': {'plate': -16}},
        'drums.oh': {'bus': 'drums', 'gain': -3.0, 'eq': [('hp', 350), ('highshelf', 8000, 0.7, 2.0)]},
        'drums.room': {'bus': 'drums', 'gain': -12.0, 'eq': [('hp', 200)], 'comp': {'thr': -26, 'ratio': 6, 'att_ms': 2, 'rel_ms': 120}},
        'clap': {'gain': -8.0, 'eq': [('hp', 400), ('peak', 1500, 1.0, 1.5)], 'sends': {'plate': -11}},
        'shaker': {'pan': 0.4, 'gain': -14.0, 'eq': [('hp', 2500)]},
        'tamb': {'pan': -0.4, 'gain': -15.0, 'eq': [('hp', 3000)]},
    },
    'buses': {
        'drums': {'gain': 0.0, 'comp': {'thr': -12, 'ratio': 3, 'att_ms': 8, 'rel_ms': 90, 'mix': 0.6}, 'sat': 2.0},
    },
    'fx': {
        'plate': {'ir': '2.3s_Nice Plate', 'predelay': 20, 'hp': 450, 'lp': 10000, 'gain': -9.0},
        'room': {'ir': '1.5s_Perc Room A', 'predelay': 5, 'hp': 350, 'lp': 9000, 'gain': -6.0},
        'delay': {'kind': 'delay', 'time': 60 / BPM * 0.75, 'fb': 0.3, 'lp': 5000, 'hp': 500, 'pingpong': True, 'gain': -9.0},
    },
    'master': {'comp': {'thr': -14, 'ratio': 2, 'att_ms': 20, 'rel_ms': 150, 'knee': 8}, 'lufs': -12.0, 'ceiling': -1.0, 'clip': 1.5,
               'target': [-15.0, -6.5, -7.2, -9.5, -9.8, -10.3, -11.5, -15.2, -20.0]},
}


def shorts():
    """Course-intro pieces from the hook: 6.0 s (the hook's first two bars with the band, landing on a held D minor 9
    chord at 3.87 s) and 2.5 s (two A7 band hits and a fill into a D minor band hit at 0.97 s)."""
    out = {}

    def parts(s):
        P = {k: s.part(k, i, jitter_ms=1.5, mono=k in ('lead', 'bass')) for k, i in (
            ('lead', 'ef_lead'), ('saw', 'ef_saw'), ('brass', 'ef_brass'), ('bass', 'ef_bass'), ('sub', 'ef_sub'), ('pad', 'ef_pad'),
            ('clav', 'ef_clav'), ('edrums', 'ef_edrums'))}
        P['keys'] = s.part('keys', 'ef_keys', lag_ms=4, jitter_ms=3)
        P['drums'] = s.part('drums', 'kit', jitter_ms=2.5)
        P['clap'] = s.part('clap', 'clap', jitter_ms=3)
        return P

    def land(P, t, beats, top=74):
        P['lead'].add(Note(t, beats, top, 0.85, {'acc'}))
        P['saw'].add(Note(t, beats, top, 0.7))
        P['brass'].add([Note(t, beats, p, 0.85) for p in (60, 64, 65, 69)])
        P['pad'].add([Note(t, beats, p, 0.6) for p in (53, 57, 60, 64)])
        P['clav'].add([Note(t, 0.15, p, 0.75, {'stac'}) for p in (57, 60, 65)])
        P['keys'].add([Note(t, beats, p, 0.6) for p in (57, 60, 64, 65)])
        P['bass'].add(Note(t, 1.0, 38, 0.95))
        P['sub'].add(Note(t, beats, 38, 0.85))
        P['edrums'].add([Note(t, 1, 'kick', 1.0), Note(t, 2, 'impact', 0.85)])
        P['drums'].add([Note(t, 1, 'crash', 0.85), Note(t, 1, 'kick', 0.7)])

    s = Song('Boardwalk Nights (electro-funk) - course intro', 'boardwalk-nights', BPM, 'D minor', 3, 0, seed=528, tail_bars=0)
    s.about = "the hook's first two bars over the bass riff, clav and drums, landing on a held D minor 9 chord with an impact"
    P = parts(s)
    pr = chords('Dm9 | G9 | Dm9', 0)
    P['lead'].add(lines([HOOK[0], "F5:8 D5:8~ D5:4 C#5:8 D5:8 E5:8 G5:8"], 0))
    P['bass'].add(lines(["D2:8. D2:16 r:16 D3:16 r:8 C3:16 D3:16 r:16 A2:16 r:16 F2:16 F#2:8",
                         "G1:8. G1:16 r:16 G2:16 r:8 F2:16 G2:16 r:16 D2:16 r:16 B1:16 C#2:8"], 0))
    P['sub'].add([Note(0, 3.9, 38, 0.8), Note(4, 3.9, 31, 0.8)])
    P['clav'].add([n.copy(art=n.art | {'stac'}) for n in comp(pr[:2], 'x.xx.x..x.xx.x..', 55, 70, n=3, vel=0.62, dur=0.14, t0=0, t1=8)])
    P['brass'].add(comp(pr[1:2], '......x...x.....', 58, 75, n=4, vel=0.72, dur=0.3))
    P['edrums'].add(grid('x...x...x...x...|x...x...x...x...', 'kick', 0, vels={'x': 0.9}) + grid('....x.......x...|....x.......x...', 'clap', 0, vels={'x': 0.68}) +
                    [Note(4, 4.0, 'rise', 0.5)])
    P['drums'].add(grid('....X.......X...|....X.......x.xx', 'snare', 0, vels={'X': 0.82, 'x': 0.55}) +
                   grid('xgxgxgxgxgxgxgxg|xgxgxgxgxgxg....', 'hhc', 0, vels={'x': 0.5, 'g': 0.3}) + grid('x...............', 'crash', 0, vels={'x': 0.6}))
    P['clap'].add(grid('....x.......x...|....x.......x...', 'handclap', 0, vels={'x': 0.7}))
    land(P, 8.0, 4.0, top=81)
    out['intro-6s'] = (s, 6.0, 8)

    s = Song('Boardwalk Nights (electro-funk) - course intro short', 'boardwalk-nights', BPM, 'D minor', 2, 0, seed=529, tail_bars=0)
    s.about = 'two A7 band hits, a clav scratch and a snare fill into a D minor 9 band hit with an impact'
    P = parts(s)
    for tt in (0.0, 0.75):
        P['brass'].add([Note(tt, 0.35, p, 0.85) for p in (57, 61, 64, 67)])
    P['clav'].add([Note(1.0 + 0.25 * k, 0.12, p, 0.5 + 0.08 * k, {'stac'}) for k in range(4) for p in (57, 61, 67)])
    P['bass'].add(lines(["A1:8 r:16 A1:16 A2:16 G2:16 E2:16 C#2:16 r:2", "r:1"], 0))
    P['drums'].add(grid('x..x............', 'kick', 0, vels={'x': 0.8}) + grid('x...............', 'crash', 0, vels={'x': 0.5}) +
                   grid('....xxxx........', 'snare', 0, vels={'x': 0.62}) + grid('......x.........', 'tomh', 0, vels={'x': 0.7}) +
                   grid('.......x........', 'toml', 0, vels={'x': 0.75}))
    P['edrums'].add([Note(0, 2.0, 'rise', 0.55), Note(0, 1, 'kick', 0.85)])
    land(P, 2.0, 3.0, top=81)
    out['intro-2s'] = (s, 2.5, 2)
    return out


if __name__ == '__main__':
    from studio.produce import produce
    produce(sys.modules[__name__])
