# Boardwalk Nights, candidate A (track boardwalk-nights): nu-disco funk for a neon seaside carnival at night.
# F-sharp minor with a chorus in A major, 126 bpm. Four-on-the-floor drums with open hats and claps, an octave bass
# with a bright slap-like attack, chicken-scratch guitar, disco strings (swoops, stabs, soaring octaves), a horn hook
# doubled by a synth lead for the neon, a Rhodes-style electric piano and the synth in a filter-house breakdown.
# Every note is written by hand here; studio/ only plays and mixes it.
#
# Form (bars): intro 4 (the groove builds, a string swoop, the pickup bar) | loop 36:
#   A 8 (the horn hook over the F#m9-B9 vamp) | B 8 (the chorus in A major: strings soar) | C 8 (the breakdown:
#   electric piano riff, the synth's answer) | D 4 (the build: snare rush, strings rising) | A' 8 (hook, strings and
#   horns together, ending on the pickup bar = intro's last bar)
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from studio.score import Song, seq, grid, chords, Note
from studio.arrange import drum_fill, harmonize, comp, pad, shift

SLOT, CANDIDATE = 'boardwalk-nights', 'a-nu-disco'
STYLE = 'nu-disco funk: four-on-the-floor (live kit over an electronic kick), claps, slap-toned octave bass, chicken-scratch guitar, disco strings pumping with the kick, a synth hook doubled by horns, electric piano breakdown'
FORM = ['intro 4 (groove builds, string swoop, pickup bar)', 'A 8 horn hook over F#m9-B9', 'B 8 chorus in A major (strings)',
        'C 8 breakdown: electric piano riff, the synth answers', 'D 4 fireworks build', "A' 8 hook with strings, pickup bar (= intro's last bar)"]

BPM, INTRO, LOOP = 126, 4, 36
A0, B0, C0, D0, A2 = 4, 12, 20, 28, 32

PROG = {
    'intro': 'F#m9 | B9 | F#m9 | Dmaj7 C#7#9',
    'A': 'F#m9 | B9 | F#m9 | B9 | Dmaj7 | C#7#9 | F#m9 | B9',
    'B': 'Amaj7 | G#m7 | F#m7 | E | Dmaj7 | C#m7 | Bm7 | E7sus4 E7',
    'C': 'F#m9 | Bm9 | F#m9 | Bm9 | Dmaj7 | C#7#9 | F#m9 | C#7#9',
    'D': 'Dmaj7 | Dmaj7 | C#7sus4 | C#7#9',
    "A'": 'F#m9 | B9 | F#m9 | B9 | Dmaj7 | C#7#9 | F#m9 | Dmaj7 C#7#9',
}

HOOK = [
    "C#5:8 E5:8 r:16 F#5:16 r:8 A5:8 G#5:16 F#5:16 E5:8 C#5:8",
    "D#5:8 E5:8 F#5:4~ F#5:8 E5:8 C#5:8 B4:8",
    "C#5:8 E5:8 r:16 F#5:16 r:8 A5:8 B5:16 C#6:16 B5:8 A5:8",
    "F#5:4. E5:8 D#5:8 E5:8 F#5:4",
    "A5:8 F#5:8 r:8 A5:8 C#6:8 A5:8 F#5:8 E5:8",
    "E5:8 E#5:8 G#5:8 B5:8~ B5:4 A5:8 G#5:8",
    "F#5:4 C#5:8 E5:8~ E5:8 F#5:8 A5:8 G#5:8",
]
PICKUP = "F#5:8^ r:8 r:4 A5:8^ r:8 G#5:8 E#5:8"   # the horns' bar that ends the intro and the loop
CHORUS = [
    "E5:4. C#5:8 E5:4 A5:4", "G#5:2 F#5:4 D#5:4", "C#5:4. A4:8 C#5:4 F#5:4", "E5:2. B4:4",
    "F#5:4. A5:8 C#6:4 A5:4", "G#5:4. E5:8 C#5:4 E5:4", "D5:4 F#5:4 A5:4 B5:4", "A5:4. G#5:8 E5:2",
]


def lines(parts, t0):
    """Notes of consecutive one-bar lines from beat t0, read as one line (ties carry across bar lines, and every
    bar is checked to be four beats long)."""
    ns, _ = seq(' | '.join(parts), t0)
    return ns


def at(bar):
    return 4.0 * bar


def compose():
    s = Song('Boardwalk Nights (nu-disco)', 'boardwalk-nights', BPM, 'F-sharp minor / A major', INTRO, LOOP, seed=53)
    P = {}
    P['tpt1'] = s.part('tpt1', 'trumpet', lag_ms=3, jitter_ms=5, mono=True)
    P['tpt2'] = s.part('tpt2', 'trumpet', lag_ms=5, jitter_ms=5, mono=True)
    P['alto'] = s.part('alto', 'alto', lag_ms=4, jitter_ms=5, mono=True)
    P['tbn'] = s.part('tbn', 'trombone', lag_ms=6, jitter_ms=5, mono=True)
    P['synth'] = s.part('synth', 'neon_lead', lag_ms=0, jitter_ms=2, mono=True)
    P['vln'] = s.part('vln', 'violins', lag_ms=6, jitter_ms=5)
    P['vla'] = s.part('vla', 'violas', lag_ms=7, jitter_ms=5)
    P['vc'] = s.part('vc', 'celli', lag_ms=7, jitter_ms=5)
    P['drums'] = s.part('drums', 'kit', jitter_ms=2.5, vel_jitter=0.05, swing=0.52, swing_unit=0.25)
    P['clap'] = s.part('clap', 'clap', jitter_ms=4)
    P['bass'] = s.part('bass', 'ebass', lag_ms=0, jitter_ms=3, swing=0.52, swing_unit=0.25, mono=True)
    P['gtr'] = s.part('gtr', 'guitar', lag_ms=2, jitter_ms=3, swing=0.52, swing_unit=0.25)
    P['ep'] = s.part('ep', 'epiano_disco', lag_ms=2, jitter_ms=3, swing=0.52, swing_unit=0.25)
    P['conga'] = s.part('conga', 'conga', jitter_ms=4, swing=0.52, swing_unit=0.25)
    P['tamb'] = s.part('tamb', 'tamb', jitter_ms=3, swing=0.52, swing_unit=0.25)
    P['riser'] = s.part('riser', 'riser', jitter_ms=0)
    P['edrums'] = s.part('edrums', 'edrums', jitter_ms=1.0)

    prog = {}
    t = 0.0
    for name, bars in (('intro', INTRO), ('A', 8), ('B', 8), ('C', 8), ('D', 4), ("A'", 8)):
        prog[name] = chords(PROG[name], t)
        t += 4 * bars
    allp = sum(prog.values(), [])
    s.prog = allp

    def hook_horns(notes, synth=True):
        P['tpt1'].add(notes)
        P['alto'].add(shift(notes, 0, -12))
        if synth:
            P['synth'].add(notes)

    # ---------------------------------------------------------------- the groove
    def disco(bar0, nbars, open_hats=True, claps=True, kick=True):
        for b in range(nbars):
            bar = bar0 + b
            if kick:
                P['drums'].add(grid('x...x...x...x...', 'kick', at(bar)))
                P['edrums'].add(grid('x...x...x...x...', 'kick', at(bar), vels={'x': 0.9}))
            P['drums'].add(grid('....X.......X...', 'snare', at(bar), vels={'X': 0.85}) +
                           grid('xgxgxgxgxgxgxgxg', 'hhc', at(bar), vels={'x': 0.55, 'g': 0.35}))
            if open_hats:
                P['drums'].add(grid('..o...o...o...o.', 'hho', at(bar), vels={'o': 0.55}))
            if claps:
                P['clap'].add(grid('....x.......x...', 'handclap', at(bar), vels={'x': 0.75}))
            P['tamb'].add(grid('xgxgxgxgxgxgxgxg', 'Tamb1_Shake', at(bar), vels={'x': 0.4, 'g': 0.25}))

    def octave_bass(bar0, nbars, busy=False):
        out = []
        for b in range(nbars):
            for k in range(8):
                tt = at(bar0 + b) + 0.5 * k
                ch = [c for c in allp if c[0] - 1e-9 <= tt + 0.01 < c[0] + c[1] - 1e-9][0][2]
                r = 30 + ((ch.bass - 30) % 12)
                p = r + (12 if k % 2 else 0)
                out.append(Note(tt, 0.42 if k % 2 else 0.46, p, 0.82 if k % 2 == 0 else 0.7))
            if busy:
                out.append(Note(at(bar0 + b) + 3.75, 0.2, r + 10, 0.6))
        return out

    def scratch(bar0, nbars, pat='x.xxx.xxx.xxx.xx', lo=64, hi=76):
        pr = [c for c in allp if at(bar0) - 1e-9 <= c[0] < at(bar0 + nbars) - 1e-9]
        P['gtr'].add([n.copy(art=n.art | {'stac'}, v=n.v * (1.0 if i % 3 == 0 else 0.8)) for i, n in
                      enumerate(comp(pr, pat, lo, hi, n=3, vel=0.55, dur=0.12, t0=at(bar0), t1=at(bar0 + nbars)))])

    # ---------------------------------------------------------------- intro: the groove builds
    P['drums'].add(grid('x...x...x...x...|x...x...x...x...|x...x...x...x...', 'kick', at(0)) +
                   grid('................|..o...o...o...o.|..o...o...o...o.', 'hho', at(0), vels={'o': 0.5}) +
                   grid('xgxgxgxgxgxgxgxg|xgxgxgxgxgxgxgxg|xgxgxgxgxgxgxgxg', 'hhc', at(0), vels={'x': 0.5, 'g': 0.3}))
    P['clap'].add(grid('................|....x.......x...|....x.......x...', 'handclap', at(0), vels={'x': 0.7}))
    P['bass'].add(octave_bass(1, 2))
    scratch(2, 1)
    # a string swoop into the pickup bar
    P['vln'].add([Note(at(2) + 3.0, 1.0, 81, 0.7, {'scoop'}, {'scoop': 12, 'scoop_t': 0.3})])

    def pickup(bar):
        hn = lines([PICKUP], at(bar))
        hook_horns(hn, synth=False)
        P['tpt2'].add([n.copy(p=n.p - 3 if n.p != 78 else 73) for n in hn])
        P['tbn'].add(shift(hn, 0, -24))
        P['vln'].add(lines(["[A5 C#6]:8^ r:8 r:4 [F#5 A5]:8^ r:8 [E#5 G#5]:4"], at(bar)))
        P['vc'].add(lines(["F#3:8^ r:8 r:4 C#3:8^ r:8 C#3:4"], at(bar)))
        P['bass'].add(lines(["F#1:8^ r:8 r:4 D2:8^ r:8 C#2:8 C#3:8"], at(bar)))
        P['drums'].add(grid('x.......x.......', 'kick', at(bar)) + grid('x...............', 'crash', at(bar)) +
                       grid('........x.x.xxxx', 'snare', at(bar), vels={'x': 0.7}))
        P['gtr'].add(lines(["[A4 C#5 E5]:16' r:16 r:8 r:4 [F#4 A4 D5]:16' r:16 r:8 r:4"], at(bar)))
    pickup(INTRO - 1)
    pickup(A2 + 7)
    s.twin(INTRO - 1, A2 + 7)

    # ---------------------------------------------------------------- A: the horn hook
    hk = lines(HOOK, at(A0))
    hook_horns(hk)
    P['tpt1'].add(lines(["F#5:8^ r:8 r:4 r:8 A4:8 B4:8 C#5:8"], at(A0 + 7)))
    P['alto'].add(lines(["F#4:8^ r:8 r:4 r:8 A3:8 B3:8 C#4:8"], at(A0 + 7)))
    disco(A0, 8)
    P['bass'].add(octave_bass(A0, 8, busy=True))
    scratch(A0, 8)
    # strings: stabs on the upbeats under the hook
    st = comp(prog['A'], '......x.......x.', 64, 78, n=3, vel=0.6, dur=0.3)
    P['vln'].add([n.copy(art=n.art | {'stac'}) for n in st])
    P['vc'].add(pad(prog['A'], 42, 54, n=1, vel=0.45))
    P['drums'].add(grid('x...............', 'crash', at(A0)))

    # ---------------------------------------------------------------- B: the chorus in A major
    ch = lines(CHORUS, at(B0))
    P['vln'].add([n.copy(art=n.art | ({'scoop'} if n.d >= 1.5 else set()), x={'scoop': 3, 'scoop_t': 0.12}) for n in ch])
    P['vln'].add(shift(ch, 0, 12, vel=0.85))
    P['vla'].add(pad(prog['B'], 57, 69, n=2, vel=0.5))
    P['vc'].add(pad(prog['B'], 40, 52, n=1, vel=0.55))
    # horns punch the chorus downbeats
    hits = comp(prog['B'], 'X.............x.', 62, 74, n=3, vel=0.7, dur=0.25)
    by_t = {}
    for n in hits:
        by_t.setdefault(round(n.t, 3), []).append(n)
    for tt, ns in by_t.items():
        ns.sort(key=lambda n: -n.p)
        P['tpt1'].add(ns[0].copy(art=frozenset({'marc'})))
        P['tpt2'].add(ns[1].copy(art=frozenset({'marc'})))
        P['tbn'].add(ns[2].copy(p=ns[2].p - 12, art=frozenset({'marc'})))
    disco(B0, 8)
    P['bass'].add(octave_bass(B0, 8))
    scratch(B0, 8, 'x.x.x.x.x.x.x.x.', 66, 78)
    P['drums'].add(grid('x...............', 'crash', at(B0)) + grid('x...............', 'crash', at(B0 + 4)) +
                   grid('........x.x.x.xx', 'snare', at(B0 + 7), vels={'x': 0.6}))

    # ---------------------------------------------------------------- C: the breakdown (electric piano, the synth answers)
    P['ep'].add(comp(prog['C'], 'x..x..x...x..x..', 57, 72, n=4, vel=0.6, dur=0.35))
    P['synth'].add(lines(["r:1", "r:1", "r:1", "r:1",
                          "A5:8. F#5:16 E5:8 F#5:8~ F#5:4 r:4", "E#5:8 G#5:8 B5:8 E5:8~ E5:2",
                          "C#6:8. B5:16 A5:8 G#5:8~ G#5:4 r:4", "E5:8 E#5:8 G#5:8 B5:8 C#6:4 r:4"], at(C0)))
    for b in range(8):
        bar = C0 + b
        P['drums'].add(grid('x...x...x...x...', 'kick', at(bar)) + grid('..o...o...o...o.', 'hho', at(bar), vels={'o': 0.45}) +
                       grid('xgxgxgxgxgxgxgxg', 'hhc', at(bar), vels={'x': 0.45, 'g': 0.3}))
        P['conga'].add(grid('..x.x..x..x.x..x', 'Conga_22_HitN', at(bar), vels={'x': 0.5}) + grid('x.......x.......', 'Conga_17_HitHM1', at(bar), vels={'x': 0.45}))
        P['clap'].add(grid('....x.......x...', 'handclap', at(bar), vels={'x': 0.65}))
    P['bass'].add(octave_bass(C0, 8))
    scratch(C0 + 4, 4, '..x..x.x..x..x.x', 64, 76)

    # ---------------------------------------------------------------- D: the fireworks build
    P['drums'].add(grid('x...x...x...x...|x...x...x...x...|x.x.x.x.x.x.x.x.|xxxxxxxxxxxxxxxx', 'kick', at(D0), vels={'x': 0.7}) +
                   grid('x...x...x...x...|x.x.x.x.x.x.x.x.|xxxxxxxxxxxxxxxx|xxxxxxxxxxxxxxxx', 'snare', at(D0), vels={'x': 0.5}) +
                   grid('x...............|................|................|................', 'crash', at(D0)))
    P['riser'].add([Note(at(D0), 16.0, 60, 0.9)])
    # the strings climb on the chords' own tones: D major 7, then C#7 sus4, then C#7#9 into the hook
    P['vln'].add([Note(at(D0) + 2 * k, 2.0, p, 0.45 + 0.04 * k, {'vib'}) for k, p in enumerate([66, 69, 73, 74, 78, 80, 83, 88])])
    P['vla'].add([Note(at(D0) + 2 * k, 2.0, p, 0.45 + 0.04 * k) for k, p in enumerate([57, 62, 66, 69, 71, 73, 77, 80])])
    P['vc'].add([Note(at(D0) + 4 * k, 4.0, p, 0.6) for k, p in enumerate([38, 38, 37, 37])])
    P['bass'].add(lines(["D2:8 D2:8 D2:8 D2:8 D2:8 D2:8 D2:8 D2:8", "D2:8 D2:8 D2:8 D2:8 D2:8 D2:8 D2:8 D2:8",
                         "C#2:8 C#2:8 C#2:8 C#2:8 C#2:8 C#2:8 C#2:8 C#2:8", "C#2:8 C#2:8 C#2:8 C#2:8 C#2:16 C#2:16 C#2:16 C#2:16 C#2:16 C#2:16 C#2:16 C#2:16"], at(D0)))
    P['tpt1'].add(lines(["r:1", "r:1", "G#5:1!vib", "G#5:2 G#5:8^ r:8 r:4"], at(D0)))
    P['tpt2'].add(lines(["r:1", "r:1", "F#5:1", "E#5:2 E#5:8^ r:8 r:4"], at(D0)))

    # ---------------------------------------------------------------- A': hook with strings and horns
    hk2 = lines(HOOK, at(A2))
    hook_horns(hk2)
    P['vln'].add(shift(hk2, 0, 12, vel=0.75))
    hv = harmonize(hk2, allp, 3, drop2=False, key=(9, 'major'))
    P['tpt2'].add(hv[1])
    P['tbn'].add(shift(hv[2], 0, -12))
    P['vla'].add(pad(prog["A'"][:7], 57, 69, n=2, vel=0.45))
    P['vc'].add(pad(prog["A'"][:7], 42, 54, n=1, vel=0.5))
    disco(A2, 7)
    P['bass'].add(octave_bass(A2, 7, busy=True))
    scratch(A2, 7)
    P['drums'].add(grid('x...............', 'crash', at(A2)) + grid('x...............', 'crash', at(A2 + 4)))
    # a drummer's fill at the end of each four-bar phrase that has none written
    for bar, style in [(A0 + 3, 'snare'), (B0 + 3, 'toms'), (C0 + 3, 'flams'), (A2 + 3, 'snare')]:
        drum_fill(P['drums'], bar, style, beats=1)
    return s


def shorts():
    """Course-intro pieces: 6.0 s (the hook's first bar and its answer over the disco groove, a held F#m9 at 3.8 s
    with a string swell) and 2.5 s (a tom fill and a riser into an F#m9 hit at 0.95 s)."""
    out = {}
    s = Song('Boardwalk Nights (nu-disco) - course intro', 'boardwalk-nights', BPM, 'F-sharp minor', 3, 0, seed=54, tail_bars=0)
    s.about = 'the horn hook and its answer over the disco groove, landing on a held F#m9 with strings'
    P = {}
    for k, i, l in (('tpt1', 'trumpet', 3), ('tpt2', 'trumpet', 5), ('alto', 'alto', 4), ('tbn', 'trombone', 6), ('synth', 'neon_lead', 0)):
        P[k] = s.part(k, i, lag_ms=l, jitter_ms=4, mono=True)
    for k, i in (('vln', 'violins'), ('vla', 'violas'), ('vc', 'celli')):
        P[k] = s.part(k, i, lag_ms=6, jitter_ms=5)
    P['drums'] = s.part('drums', 'kit', jitter_ms=2.5, vel_jitter=0.05, swing=0.52, swing_unit=0.25)
    P['clap'] = s.part('clap', 'clap', jitter_ms=4)
    P['bass'] = s.part('bass', 'ebass', jitter_ms=3, swing=0.52, swing_unit=0.25, mono=True)
    P['gtr'] = s.part('gtr', 'guitar', lag_ms=2, jitter_ms=3, swing=0.52, swing_unit=0.25)
    P['tamb'] = s.part('tamb', 'tamb', jitter_ms=3)
    pr = chords('F#m9 | B9 C#7#9 | F#m9', 0)
    hook = lines([HOOK[0], "D#5:8 E5:8 F#5:4 E#5:8 G#5:8 B5:8 G#5:8", "A5:2^ r:2"], 0)
    P['tpt1'].add(hook); P['alto'].add(shift(hook, 0, -12)); P['synth'].add(hook[:-1])
    fin = [Note(8, 2, p, 0.75) for p in (69, 73, 76)]
    P['tpt2'].add(fin[1:2]); P['tbn'].add([Note(8, 2, 54, 0.75)])
    P['vln'].add([Note(8, 2.5, p, 0.7) for p in (80, 81, 85)] + [Note(7, 1.0, 81, 0.6, {'scoop'}, {'scoop': 12, 'scoop_t': 0.25})])
    P['vla'].add([Note(8, 2.5, p, 0.6) for p in (64, 69)])
    P['vc'].add([Note(8, 2.5, 42, 0.65)])
    for b in range(2):
        P['drums'].add(grid('x...x...x...x...', 'kick', 4 * b) + grid('....X.......X...', 'snare', 4 * b, vels={'X': 0.85}) +
                       grid('xgxgxgxgxgxgxgxg', 'hhc', 4 * b, vels={'x': 0.55, 'g': 0.35}) + grid('..o...o...o...o.', 'hho', 4 * b, vels={'o': 0.55}))
        P['clap'].add(grid('....x.......x...', 'handclap', 4 * b, vels={'x': 0.75}))
        P['tamb'].add(grid('xgxgxgxgxgxgxgxg', 'Tamb1_Shake', 4 * b, vels={'x': 0.4, 'g': 0.25}))
    P['drums'].add(grid('x...............', 'crash', 8) + grid('x...............', 'kick', 8))
    P['bass'].add(lines(["F#1:8 F#2:8 F#1:8 F#2:8 F#1:8 F#2:8 F#1:8 F#2:8", "B1:8 B2:8 B1:8 B2:8 C#2:8 C#3:8 C#2:8 C#3:8", "F#1:2^ r:2"], 0))
    P['gtr'].add([n.copy(art=n.art | {'stac'}) for n in comp(pr[:3], 'x.xxx.xxx.xxx.xx', 64, 76, n=3, vel=0.55, dur=0.12, t0=0, t1=8)])
    out['intro-6s'] = (s, 6.0, 8)

    s = Song('Boardwalk Nights (nu-disco) - course intro short', 'boardwalk-nights', BPM, 'F-sharp minor', 2, 0, seed=55, tail_bars=0)
    s.about = 'a tom fill and a riser into an F#m9 hit: synth, strings and octave bass, an impact'
    P = {}
    for k, i, l in (('tpt1', 'trumpet', 3), ('tpt2', 'trumpet', 5), ('alto', 'alto', 4), ('tbn', 'trombone', 6), ('synth', 'neon_lead', 0)):
        P[k] = s.part(k, i, lag_ms=l, jitter_ms=3, mono=True)
    for k, i in (('vln', 'violins'), ('vla', 'violas'), ('vc', 'celli')):
        P[k] = s.part(k, i, lag_ms=5, jitter_ms=3)
    P['drums'] = s.part('drums', 'kit', jitter_ms=2)
    P['clap'] = s.part('clap', 'clap', jitter_ms=2)
    P['bass'] = s.part('bass', 'ebass', jitter_ms=2, mono=True)
    P['edrums'] = s.part('edrums', 'edrums', jitter_ms=1)
    P['edrums'].add([Note(0, 2.0, 'rise', 0.6), Note(2.0, 2, 'impact', 0.8), Note(2.0, 1, 'kick', 1.0)])
    P['drums'].add(grid('....x.x.x.x.....', 'tomh', 0, vels={'x': 0.7}) + grid('.....x.x.x.x....', 'toml', 0, vels={'x': 0.75}))
    P['synth'].add([Note(2.0, 1.2, 81, 0.85)])
    P['vln'].add([Note(2.0, 1.5, p, 0.8) for p in (81, 85)])
    P['vla'].add([Note(2.0, 1.5, 69, 0.7)])
    P['vc'].add([Note(2.0, 1.5, 42, 0.75)])
    P['bass'].add([Note(2.0, 1.0, 30, 0.9), Note(2.5, 0.5, 42, 0.7)])
    P['drums'].add(grid('........x.......', 'crash', 0) + grid('x...x...x.......', 'kick', 0) + grid('..o...o.........', 'hho', 0, vels={'o': 0.5}))
    P['clap'].add(grid('........x.......', 'handclap', 0, vels={'x': 0.8}))
    out['intro-2s'] = (s, 2.5, 2)
    return out


def _lead():
    from studio import synths
    return synths.Lead(gain_db=-12.0, shape='saw', cutoff=1800.0, env_amt=2500.0, res=0.15, vib=(5.5, 0.1, 0.3), release=0.08)


from studio import instruments as _I
_I.RACK['neon_lead'] = _lead


def _ep():
    from studio import synths
    return synths.EPiano(gain_db=-3.0, release=0.25, bell=0.45, trem=(5.0, 0.25), chorus=True)


_I.RACK['epiano_disco'] = _ep

MIX = {
    'tracks': {
        'tpt1': {'bus': 'horns', 'pan': -0.15, 'gain': 0.0, 'eq': [('hp', 200), ('peak', 3000, 1.0, 1.5)], 'sends': {'plate': -12}},
        'tpt2': {'bus': 'horns', 'pan': -0.35, 'gain': -3.0, 'eq': [('hp', 200)], 'sends': {'plate': -12}},
        'alto': {'bus': 'horns', 'pan': 0.2, 'gain': -2.0, 'eq': [('hp', 150)], 'sends': {'plate': -12}},
        'tbn': {'bus': 'horns', 'pan': 0.1, 'gain': -3.0, 'eq': [('hp', 80)], 'sends': {'plate': -13}},
        'synth': {'pan': 0.0, 'gain': -2.0, 'width': 1.3, 'eq': [('hp', 300), ('peak', 2500, 1.0, 1.5), ('lp', 10000)], 'sends': {'delay': -12}},
        'vln': {'bus': 'strings', 'pan': -0.25, 'gain': -3.0, 'eq': [('hp', 250), ('highshelf', 8000, 0.7, 2.0)], 'sends': {'hall': -12}},
        'vla': {'bus': 'strings', 'pan': 0.25, 'gain': -6.0, 'eq': [('hp', 180)], 'sends': {'hall': -12}},
        'vc': {'bus': 'strings', 'pan': 0.1, 'gain': -6.0, 'eq': [('hp', 60)], 'sends': {'hall': -14}},
        'edrums.kick': {'bus': 'drums', 'gain': -4.0, 'eq': [('hp', 35), ('peak', 55, 1.0, 1.5)]},
        'edrums.fx': {'gain': -10.0, 'width': 1.5},
        'drums.kick': {'bus': 'drums', 'gain': -1.0, 'eq': [('hp', 32), ('peak', 55, 1.0, 3.5), ('peak', 320, 1.2, -5.0), ('peak', 3500, 1.0, 2.5)],
                       'comp': {'thr': -16, 'ratio': 4, 'att_ms': 5, 'rel_ms': 70}},
        'drums.snare': {'bus': 'drums', 'gain': -2.0, 'eq': [('hp', 100), ('peak', 220, 1.0, 1.5), ('highshelf', 6000, 0.7, 2.5)],
                        'comp': {'thr': -18, 'ratio': 3, 'att_ms': 8, 'rel_ms': 100}, 'sends': {'plate': -14}},
        'drums.oh': {'bus': 'drums', 'gain': -1.0, 'eq': [('hp', 400), ('highshelf', 8000, 0.7, 3.0)]},
        'drums.room': {'bus': 'drums', 'gain': -10.0, 'eq': [('hp', 150)], 'comp': {'thr': -26, 'ratio': 6, 'att_ms': 2, 'rel_ms': 120}},
        'clap': {'pan': 0.0, 'gain': -6.0, 'eq': [('hp', 400), ('peak', 1500, 1.0, 2.0)], 'sends': {'plate': -8}},
        'bass': {'gain': 0.0, 'eq': [('hp', 32), ('peak', 80, 1.0, 2.0), ('peak', 400, 0.9, -3.0), ('peak', 2500, 1.0, 4.0), ('highshelf', 6000, 0.7, 2.0)],
                 'comp': {'thr': -20, 'ratio': 4, 'att_ms': 6, 'rel_ms': 90}, 'sat': 3.0, 'duck': {'by': 'drums.kick', 'depth_db': 2.5}},
        'gtr': {'pan': 0.5, 'gain': -9.0, 'eq': [('hp', 350), ('peak', 3000, 1.0, 2.0)], 'sends': {'room': -12}},
        'ep': {'pan': -0.2, 'gain': -5.0, 'eq': [('hp', 120), ('peak', 300, 1.0, -2.0), ('highshelf', 5000, 0.7, 1.5)], 'sends': {'room': -14},
               'duck': {'by': 'drums.kick', 'depth_db': 3.0}},
        'conga': {'pan': -0.4, 'gain': -8.0, 'eq': [('hp', 100)], 'sends': {'room': -10}},
        'tamb': {'pan': 0.45, 'gain': -15.0, 'eq': [('hp', 3000)]},
        'riser': {'gain': -10.0, 'width': 1.5, 'sends': {'hall': -6}},
    },
    'buses': {
        'horns': {'gain': -5.0, 'eq': [('peak', 450, 0.8, -1.5), ('highshelf', 8000, 0.7, 2.0)], 'comp': {'thr': -18, 'ratio': 2.5, 'att_ms': 15, 'rel_ms': 150}, 'sat': 1.0},
        'strings': {'gain': 0.0, 'eq': [('peak', 350, 0.8, -2.0), ('highshelf', 7000, 0.7, 1.5)], 'comp': {'thr': -20, 'ratio': 2, 'att_ms': 20, 'rel_ms': 200},
                    'duck': {'by': 'edrums.kick', 'depth_db': 4.0, 'rel_ms': 160}},
        'drums': {'gain': 0.0, 'comp': {'thr': -14, 'ratio': 3, 'att_ms': 10, 'rel_ms': 100, 'mix': 0.6}, 'sat': 2.0},
    },
    'fx': {
        'room': {'ir': '1.5s_Perc Room A', 'predelay': 5, 'hp': 350, 'lp': 9000, 'gain': -4.0},
        'plate': {'ir': '2.3s_Nice Plate', 'predelay': 20, 'hp': 500, 'lp': 10000, 'gain': -16.0},
        'hall': {'ir': '2.0s_Medium Hall', 'predelay': 25, 'hp': 500, 'lp': 10000, 'gain': -10.0},
        'delay': {'kind': 'delay', 'time': 60 / 126 * 0.75, 'fb': 0.35, 'lp': 5000, 'hp': 400, 'pingpong': True, 'gain': -6.0},
    },
    'master': {'comp': {'thr': -16, 'ratio': 2, 'att_ms': 30, 'rel_ms': 200, 'knee': 8}, 'lufs': -12.0, 'ceiling': -1.0, 'clip': 1.5},
}

if __name__ == '__main__':
    from studio.produce import produce
    produce(sys.modules[__name__])
