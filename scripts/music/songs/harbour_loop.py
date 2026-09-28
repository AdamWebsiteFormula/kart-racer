# Lighthouse Loop (track harbour-loop): big-band funk for a sunny seaside town. B-flat major, 144 bpm.
# A live horn section (two trumpets, alto, tenor and baritone saxes, trombone) over a tight funk rhythm section
# (drums, fingered bass, hollow-body guitar chanks, tonewheel organ), congas and tambourine, a glockenspiel
# sparkle on the hook. Every note below is written by hand; studio/ only plays and mixes it.
#
# Form (bars): intro 4 (a teaser of the hook as band hits, then the pickup bar) | loop 40:
#   A 8 (the hook: trumpet and alto in unison, the low horns answer) | A' 8 (the hook harmonized, glockenspiel)
#   B 8 (sax soli over E-flat, organ and trombone pads) | C 8 (the break: a low-brass riff in unison with the bass,
#   trumpet shout hits) | A'' 8 (the shout chorus, ending on the pickup bar that also ends the intro)
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from studio.score import Song, seq, grid, chords, Note
from studio.arrange import harmonize, comp, pad, shift, window

STYLE = 'big-band funk: live horn section (2 trumpets, alto, tenor, baritone sax, trombone), funk drums, fingered bass, guitar chanks, organ, congas, glockenspiel'
FORM = ['intro 4 (hook teaser as band hits + pickup bar)', 'A 8 hook in unison', "A' 8 hook harmonized + glockenspiel",
        'B 8 sax soli in E-flat', 'C 8 break: low-brass riff + trumpet shouts', "A'' 8 shout chorus, pickup bar (= intro's last bar)"]

BPM, INTRO, LOOP = 144, 4, 40
A0, A1, B0, C0, A2 = 4, 12, 20, 28, 36  # first bar of each loop section

PROG = {
    'intro': 'Ebmaj9 | Dm7 G7b9 | Cm9 F13 | Bb69 F13',
    'A': 'Bb69 | Ebmaj9 | Bb69 | Cm7 F7 | Gm7 | C9 | Cm9 F13 | Bb69',
    "A'": 'Bb69 | Ebmaj9 | Bb69 | Cm7 F7 | Gm7 | C9 | Cm9 F13 | Bb69 Bb7',
    'B': 'Ebmaj9 | Dm7 G7b9 | Cm9 | F13 | Ebmaj9 | Edim7 | Dm7 G7b9 | Cm7 F7',
    'C': 'Bb7 | Bb7 | Eb9 | Eb9 | Bb7 | G7#9 | C9 F9 | F7#9',
    "A''": 'Bb69 | Ebmaj9 | Bb69 | Cm7 F7 | Gm7 | C9 | Cm9 F13 | Bb69 F13',
}

# the hook, bar by bar (lead line, concert pitch)
HOOK = [
    "r:16 F4:16 Bb4:8 D5:8. F5:16 r:8 Eb5:8 D5:8 Bb4:8",       # a
    "C5:8. D5:16 r:8 F5:8~ F5:2",                                # b
    "r:16 F4:16 Bb4:8 D5:8. F5:16 r:8 G5:8 F5:8 D5:8",          # c
    "Eb5:8. D5:16 r:8 C5:8~ C5:4 r:4",                           # d
    "r:16 D4:16 G4:8 Bb4:8. D5:16 r:8 C5:8 Bb4:8 G4:8",          # e
    "A4:8. Bb4:16 r:8 E5:8~ E5:2",                               # f
    "Eb5:8 D5:16 Eb5:16~ Eb5:8 C5:8 r:8 A4:8 C5:8 F5:8~",        # g
]
HOOK_END = "F5:8 D5:8 r:4 r:2"                                   # h: the phrase lands on the third
SAX_ANSWER = "r:4 Db5:16 D5:16 F5:8 D5:16 C5:16 Bb4:8 G4:8 r:8"   # the saxes' reply in bar h
PICKUP_LEAD = "F5:8 D5:8^ r:4 F4:16 G4:16 A4:16 Bb4:16 C5:16 D5:16 Eb5:16 E5:16"
INTRO_LEAD = [
    "r:16 G4:16 Bb4:8 D5:8. F5:16 r:8 Eb5:8 D5:8 Bb4:8",
    "C5:8. D5:16 r:8 F5:8~ F5:4 Ab5:8^ G5:8",
]

B_SOLI = [  # alto lead, sax section soli
    "Bb4:4. G4:8 Bb4:8 D5:8~ D5:4",
    "C5:8 D5:8 C5:8 A4:8 Ab4:4 F4:4",
    "G4:4. Eb4:8 G4:8 Bb4:8~ Bb4:4",
    "A4:8 Bb4:8 A4:8 F4:8 D5:4 C5:4",
    "Bb4:4. G4:8 Bb4:8 Eb5:8~ Eb5:4",
    "E5:8 D5:8 Db5:8 Bb4:8 G4:4 E4:4",
    "F4:8 A4:8 C5:8 E5:8~ E5:8 D5:8 B4:8 Ab4:8",
    "G4:4 Bb4:8 C5:8~ C5:4 Eb5:4!fall",
]

RIFF = "Bb1:8 r:16 Bb1:16 Db2:16 D2:8 F2:16 r:8 Ab2:8 A2:16 Bb2:8."   # the break's low riff (bass octave)

BASS_A = [
    "Bb1:8. Bb1:16 r:8 Bb2:8' r:8 F2:8 G2:8 D2:8",
    "Eb2:8. Eb2:16 r:8 Eb3:8' r:8 Bb2:8 G2:8 A2:8",
    "Bb1:8. Bb1:16 r:8 Bb2:8' r:8 F2:8 D2:8 B1:8",
    "C2:8. C2:16 r:8 G2:8' F2:8. F2:16 r:8 F#2:8",
    "G1:8. G1:16 r:8 G2:8' r:8 D2:8 Bb1:8 B1:8",
    "C2:8. C2:16 r:8 C3:8' r:8 G2:8 E2:8 C2:8",
    "C2:8. C2:16 r:8 Eb2:8 F2:8. F2:16 r:8 A1:8",
    "Bb1:8. Bb1:16 r:8 Bb2:8' r:8 F2:8 G2:8 A2:8",
]
BASS_B = [
    "Eb2:4. Bb2:8 G2:8 Eb2:8 D2:8 Bb1:8",
    "D2:8. D2:16 r:8 A2:8 G2:8. G2:16 F2:8 D2:8",
    "C2:4. G2:8 Eb2:8 C2:8 Bb1:8 G1:8",
    "F1:8. F1:16 r:8 C2:8 F2:8 Eb2:8 D2:8 Db2:8",
    "Eb2:4. Bb2:8 G2:8 Eb2:8 D2:8 Bb1:8",
    "E2:8. E2:16 r:8 G2:8 Bb2:8 G2:8 E2:8 Eb2:8",
    "D2:8. D2:16 r:8 A2:8 G2:8. G2:16 F2:8 G2:8",
    "C2:8. C2:16 r:8 G2:8 F2:8. F2:16 Eb2:8 A1:8",
]


def lines(parts, t0):
    """Notes of consecutive one-bar lines from beat t0."""
    out = []
    for k, s in enumerate(parts):
        ns, _ = seq(s, t0 + 4 * k)
        out += ns
    return out


def at(bar):
    return 4.0 * bar


def compose():
    s = Song('Lighthouse Loop', 'harbour-loop', BPM, 'B-flat major', INTRO, LOOP, seed=11)
    # players: humanize amounts per instrument (horns a hair behind the beat, the rhythm section tight)
    P = {}
    P['tpt1'] = s.part('tpt1', 'trumpet', lag_ms=4, jitter_ms=5, mono=True)
    P['tpt2'] = s.part('tpt2', 'trumpet', lag_ms=6, jitter_ms=6, mono=True)
    P['alto'] = s.part('alto', 'alto', lag_ms=5, jitter_ms=6, mono=True)
    P['tenor'] = s.part('tenor', 'alto', lag_ms=6, jitter_ms=6, mono=True)
    P['tbn'] = s.part('tbn', 'trombone', lag_ms=7, jitter_ms=6, mono=True)
    P['bari'] = s.part('bari', 'bari', lag_ms=5, jitter_ms=5, mono=True)
    P['drums'] = s.part('drums', 'kit', lag_ms=0, jitter_ms=3.5, vel_jitter=0.06, swing=0.54, swing_unit=0.25)
    P['bass'] = s.part('bass', 'ebass', lag_ms=2, jitter_ms=3, swing=0.54, swing_unit=0.25, mono=True)
    P['gtr'] = s.part('gtr', 'guitar', lag_ms=3, jitter_ms=4, swing=0.54, swing_unit=0.25)
    P['organ'] = s.part('organ', 'organ_harbour', lag_ms=0, jitter_ms=3)
    P['glock'] = s.part('glock', 'glock', lag_ms=2, jitter_ms=3)
    P['conga'] = s.part('conga', 'conga', lag_ms=2, jitter_ms=5, swing=0.54, swing_unit=0.25)
    P['tamb'] = s.part('tamb', 'tamb', lag_ms=1, jitter_ms=4, swing=0.54, swing_unit=0.25)

    prog = {}
    t = 0.0
    for name, bars in (('intro', INTRO), ('A', 8), ("A'", 8), ('B', 8), ('C', 8), ("A''", 8)):
        prog[name] = chords(PROG[name], t)
        t += 4 * bars
    allprog = sum(prog.values(), [])

    # ---------------------------------------------------------------- lead lines
    hook = lambda bar: lines(HOOK, at(bar))

    # intro: the hook's rhythm as band hits (a teaser), then phrase g and the pickup bar
    intro_lead = lines(INTRO_LEAD, at(0)) + lines([HOOK[6]], at(2))
    pickup = lambda bar: lines([PICKUP_LEAD], at(bar))

    # A: trumpet 1 and alto in unison on the hook; the saxes answer in bar h
    a_lead = hook(A0) + lines([HOOK_END], at(A0 + 7))
    P['tpt1'].add(a_lead)
    P['alto'].add(shift(hook(A0), 0))
    ans = lines([SAX_ANSWER], at(A0 + 7))
    P['alto'].add(ans)
    P['tenor'].add(shift(ans, 0, -12))
    P['bari'].add(shift(ans, 0, -24))
    # the low horns punch the downbeats of the hook's long notes (bars b, d, f)
    for bar, notes in ((A0 + 1, "r:4 r:8 [F3 Bb3]:8^ r:2"), (A0 + 3, "r:4 r:8 [F3 A3]:8^ r:2"), (A0 + 5, "r:4 r:8 [E3 Bb3]:8^ r:2")):
        ns, _ = seq(notes, at(bar))
        P['tbn'].add([n for n in ns if n.p == max(x.p for x in ns)])
        P['bari'].add([n.copy(p=n.p - 12) for n in ns if n.p == min(x.p for x in ns)])

    # A': the hook harmonized (drop-2 across trumpets, alto, trombone), tenor doubling voice 3 an octave down
    a2_lead = hook(A1) + lines(["F5:8 D5:8 r:8 F4:8 G4:8 A4:8 Bb4:8 C5:8"], at(A1 + 7))
    v = harmonize(a2_lead, allprog, 4, drop2=True, key=(10, 'major'))
    P['tpt1'].add(v[0]); P['tpt2'].add(v[1]); P['alto'].add(v[2]); P['tbn'].add(v[3])
    P['tenor'].add(shift(v[1], 0, -12))
    P['glock'].add([n.copy(p=n.p + 12, v=n.v * 0.8, d=min(n.d, 0.5)) for n in hook(A1)])

    # B: sax soli (alto lead, tenor and bari under it), trombone pad on the guide tones
    soli = lines(B_SOLI, at(B0))
    sv = harmonize(soli, allprog, 3, drop2=False, key=(3, 'major'))
    P['alto'].add(sv[0]); P['tenor'].add(sv[1]); P['bari'].add(shift(sv[2], 0, -12))
    P['tbn'].add(pad(prog['B'], 50, 62, n=1, vel=0.5))
    # a trumpet answer at the end of B
    P['tpt1'].add(lines(["r:1", "r:2 r:8 C5:8 Eb5:8 F5:8~", "F5:2 r:2"], at(B0 + 5)))

    # C: the break. Low riff in unison (bass, bari, trombone); trumpets and alto shout hits
    riff = lambda bar, semis: shift(lines([RIFF], at(bar)), 0, semis)
    for bar, semis in ((C0, 0), (C0 + 1, 0), (C0 + 2, 5), (C0 + 3, 5), (C0 + 4, 0)):
        r = riff(bar, semis)
        P['bass'].add(r)
        P['bari'].add(shift(r, 0, 12))
        P['tbn'].add(shift(r, 0, 12))
    shout = [
        "r:2 r:8 [D5 F5 Ab5]:8^ r:8 [D5 F5 Ab5]:8^",
        "r:8 [F5 Ab5 Bb5]:8^ r:4 r:8 [F5 Ab5 Bb5]:4.!shake",
        "r:2 r:8 [G5 Bb5 Db6]:8^ r:8 [G5 Bb5 Db6]:8^",
        "r:8 [Bb5 Db6 Eb6]:8^ r:4 r:8 [G5 Bb5 Db6]:4.!shake",
        "r:2 r:8 [D5 F5 Ab5]:8^ r:8 [D5 F5 Ab5]:8^",
        "[B4 D5 F5]:8^ r:8 [B4 D5 F5]:8^ r:8 [Bb4 D5 F5]:4 [A4 D5 F5]:4",
        "[Bb4 E5 G5]:4^ r:8 [Bb4 E5 G5]:8^ [A4 Eb5 G5]:4^ r:8 [A4 Eb5 G5]:8^",
        "r:16 [A4 Eb5 Ab5]:16 r:8 r:4 C5:16 D5:16 Eb5:16 E5:16 F5:16 G5:16 Ab5:16 A5:16",
    ]
    sh = lines(shout, at(C0))
    # the top note to trumpet 1, the middle to trumpet 2, the bottom to the alto (a single-note run: trumpet 1, alto an octave down)
    by_t = {}
    for n in sh:
        by_t.setdefault(round(n.t, 3), []).append(n)
    for tt, ns in by_t.items():
        ns.sort(key=lambda n: -n.p)
        P['tpt1'].add(ns[0])
        if len(ns) > 1:
            P['tpt2'].add(ns[1])
            P['alto'].add(ns[-1])
        else:
            P['alto'].add(ns[0].copy(p=ns[0].p - 12))
    # bars 5-8 of C: bass and low horns on the changes
    P['bass'].add(lines(["G1:8. G1:16 r:8 B1:8 D2:8 F2:8 G2:8 Ab2:8", "C2:8. C2:16 r:8 G2:8 F2:8. F2:16 r:8 Eb2:8",
                         "F1:16 r:16 r:8 r:4 F2:8 E2:8 Eb2:8 D2:8"], at(C0 + 5)))
    P['bari'].add(lines(["G2:4 r:4 G2:4 r:4", "C3:4^ r:8 C3:8^ F2:4^ r:8 F2:8^", "F2:16 r:16 r:8 r:2."], at(C0 + 5)))
    P['tbn'].add(lines(["F3:4 r:4 F3:4 D3:4", "E3:4^ r:8 E3:8^ Eb3:4^ r:8 Eb3:8^", "Eb3:16 r:16 r:8 r:2."], at(C0 + 5)))

    # A'': the shout chorus, harmonized, glockenspiel on top, shakes on the long notes
    a3 = hook(A2)
    a3 = [n.copy(art=n.art | {'shake'}) if n.d >= 2.0 else n for n in a3]
    v = harmonize(a3, allprog, 4, drop2=True, key=(10, 'major'))
    P['tpt1'].add(v[0]); P['tpt2'].add(v[1]); P['alto'].add(v[2]); P['tbn'].add(v[3])
    P['tenor'].add(shift(v[1], 0, -12))
    P['glock'].add([n.copy(p=n.p + 12, v=n.v * 0.85, d=min(n.d, 0.5)) for n in hook(A2)])
    P['bari'].add(shift([n for n in v[3] if n.d >= 0.5], 0, -12))

    # intro: the teaser lead harmonized as band hits
    v = harmonize(intro_lead, allprog, 4, drop2=True, key=(10, 'major'))
    P['tpt1'].add(v[0]); P['tpt2'].add(v[1]); P['alto'].add(v[2]); P['tbn'].add(v[3])
    P['tenor'].add(shift(v[1], 0, -12))
    P['bari'].add(shift([n for n in v[3]], 0, -12))

    # the pickup bar: intro's last bar and the loop's last bar are the same music
    for bar in (INTRO - 1, A2 + 7):
        pk = pickup(bar)
        head = [n for n in pk if n.t < at(bar) + 1.0]
        run = [n for n in pk if n.t >= at(bar) + 1.0]
        hv = harmonize(head, allprog, 4, drop2=True, key=(10, 'major'))
        P['tpt1'].add(hv[0]); P['tpt2'].add(hv[1]); P['alto'].add(hv[2]); P['tbn'].add(hv[3])
        P['tpt1'].add(run); P['alto'].add(shift(run, 0, -12)); P['tpt2'].add(shift(run, 0, -3))
        P['bari'].add(lines(["Bb2:8^ r:8 r:4 C3:8 D3:8 E3:8 F3:8"], at(bar)))
        P['bass'].add(lines(["Bb1:8^ r:8 r:4 C2:8 D2:8 E2:8 F2:8"], at(bar)))
        P['organ'].add(lines(["[Bb3 D4 G4 C5]:8^ r:8 r:4 [A3 Eb4 G4 D5]:2"], at(bar)))
        P['gtr'].add(lines(["[D4 G4 C5]:16' r:16 r:8 r:4 r:2"], at(bar)))
        P['drums'].add(grid('x.......x.......', 'kick', at(bar)) + grid('....x...x.xxx.x.', 'snare', at(bar), vels={'x': 0.75}) +
                       grid('............x...', 'tomh', at(bar)) + grid('..............xx', 'toml', at(bar)) +
                       grid('x...............', 'crash', at(bar)) + grid('x.x.x.x.........', 'hhc', at(bar)))

    # ---------------------------------------------------------------- rhythm section
    # bass
    P['bass'].add(lines(["Eb2:8^ r:16 Eb2:16 r:8 Eb2:8^ r:8 Eb2:8 D2:8 C2:8", "D2:8^ r:16 D2:16 r:8 D2:8^ G1:8 G2:8 F2:8 Ab2:8",
                         "C2:8^ r:16 C2:16 r:8 C2:8^ F2:8 C2:8 F1:8 A1:8"], at(0)))
    P['bass'].add(lines(BASS_A, at(A0)))
    P['bass'].add(lines(BASS_A[:7] + ["Bb1:8. Bb1:16 r:8 Bb2:8' Ab2:8 F2:8 D2:8 D2:8"], at(A1)))
    P['bass'].add(lines(BASS_B, at(B0)))
    P['bass'].add(lines(BASS_A[:7], at(A2)))

    # drums: funk groove, 16th hats with an open hat on the 4&, ghost notes
    groove = {
        'kick': 'x.....x...x..x..',
        'snare': '....X..g.g..X..g',
        'hhc': 'xyxyxyxyxyxyxy.y',
        'hho': '..............o.',
    }
    groove_b = {  # B: ride bell and a lighter kick
        'kick': 'x.......x.x.....',
        'snare': '....X......gX...',
        'ride': 'x.x.x.x.x.x.x.x.',
        'hhp': '....x.......x...',
    }
    groove_c = {  # C: busier, snare on 2 and 4 with rimshots, open hats on the upbeats
        'kick': 'x..x..x...x..x..',
        'rim': '....X.......X...',
        'snare': '.......g.g.....g',
        'hhc': 'x.x.x.x.x.x.x.x.',
        'hho': '..o.....o.......',
    }

    def drums(bar, pat, n=1):
        for k in range(n):
            for piece, g in pat.items():
                P['drums'].add(grid(g, piece, at(bar + k), vels={'y': 0.55}))

    # intro hits: kick and crash with the horns, snare rolls into the pickup
    P['drums'].add(grid('.x.x..x...x.x.x.|x.x..x.x.x......|x..xx...x...x.x.', 'kick', at(0)) +
                   grid('.X....x...X.X.X.|x....X..........|....X..X....X...', 'snare', at(0)) +
                   grid('x...............|x...............|x...............', 'crash', at(0)) +
                   grid('................|........xxxxxxxx|..x.x...x.x...x.', 'hhc', at(0)) +
                   grid('................|................|......xx....xxxx', 'tomh', at(0)))
    drums(A0, groove, 7)
    P['drums'].add(grid('x...............', 'crash', at(A0)))
    drums(A0 + 7, {'kick': 'x.....x.........', 'snare': '....X.......xxxx', 'hhc': 'xyxyxyxyxy......'})
    drums(A1, groove, 7)
    P['drums'].add(grid('x...............', 'crash', at(A1)) + grid('x...............', 'crash', at(A1 + 4)))
    drums(A1 + 7, {'kick': 'x.....x...x.....', 'snare': '....X...x.xxX.xx', 'hhc': 'xyxyxyxy........', 'tomh': '............x...'})
    drums(B0, groove_b, 7)
    P['drums'].add(grid('x...............', 'crash', at(B0)))
    drums(B0 + 7, {'kick': 'x.....x.........', 'snare': '....X...xxxxxxxx', 'ride': 'x.x.x.x.........'})
    drums(C0, groove_c, 5)
    P['drums'].add(grid('x...............', 'crash', at(C0)) + grid('x...............', 'crash', at(C0 + 2)) + grid('x...............', 'crash', at(C0 + 4)))
    drums(C0 + 5, {'kick': 'x.....x.x.....x.', 'snare': '....X.......X...', 'hhc': 'x.x.x.x.x.x.x.x.'})
    drums(C0 + 6, {'kick': 'x...x..x....x..x', 'snare': '....X.......X...', 'crash': 'x.......x.......', 'hho': '..o...o...o...o.'})
    drums(C0 + 7, {'kick': 'x...............', 'crash': 'x...............', 'snare': '........xxxxXxXx', 'tomh': '....x.x.........', 'toml': '.....x.x........'})
    drums(A2, groove, 7)
    P['drums'].add(grid('x...............', 'crash', at(A2)) + grid('x...............', 'crash', at(A2 + 2)) +
                   grid('x...............', 'crash', at(A2 + 4)) + grid('x...............', 'crash', at(A2 + 6)))

    # guitar: upbeat chanks, high and short (a sunny, bouncing offbeat)
    def chanks(bar0, nbars, pattern='..x...x...x...x.'):
        pr = [c for c in allprog if at(bar0) - 1e-9 <= c[0] < at(bar0 + nbars) - 1e-9]
        P['gtr'].add([n.copy(art=n.art | {'stac'}) for n in comp(pr, pattern, 62, 76, n=3, vel=0.62, dur=0.2, t0=at(bar0), t1=at(bar0 + nbars))])
    chanks(A0, 7); chanks(A1, 8); chanks(C0, 7, '..x..x.x..x..x.x'); chanks(A2, 7)
    chanks(B0, 8, '....x.......x...')

    # organ: pads in A and B, stabs in C
    for sec in ('A', "A'", "A''"):
        pr = prog[sec][:-2] if sec == "A''" else prog[sec]
        P['organ'].add(pad(pr, 55, 72, n=4, vel=0.45))
    P['organ'].add(pad(prog['B'], 55, 74, n=4, vel=0.55))
    P['organ'].add(comp(prog['C'][:5], 'x..x..x.........', 55, 72, n=4, vel=0.6, dur=0.2))
    P['organ'].add(pad(chords('Ebmaj9 | Dm7 G7b9 | Cm9 F13', 0), 55, 72, n=4, vel=0.5))

    # percussion: congas and tambourine through the grooves
    for bar in list(range(A0, A0 + 7)) + list(range(A1, A1 + 7)) + list(range(C0, C0 + 7)) + list(range(A2, A2 + 7)):
        P['conga'].add(grid('..x...xx..x...x.', 'Conga_22_HitN', at(bar), vels={'x': 0.55}))
        P['conga'].add(grid('x.......x.......', 'Conga_17_HitHM1', at(bar), vels={'x': 0.5}))
        P['tamb'].add(grid('..x.X.x...x.X.x.', 'Tamb1_Shake', at(bar), vels={'x': 0.4, 'X': 0.65}))
    for bar in range(B0, B0 + 7):
        P['tamb'].add(grid('....X.......X...', 'Tamb1_Shake', at(bar), vels={'X': 0.55}))
    s.twin(INTRO - 1, A2 + 7)  # the loop's last bar plays exactly as the intro's last bar did
    return s


def _organ():
    from studio import synths
    return synths.Organ(drawbars='868000000', perc=None, click=0.2, drive_db=5.0, leslie='fast', gain_db=-4.0)


from studio import instruments as _I
_I.RACK['organ_harbour'] = _organ

# ---------------------------------------------------------------- the mix
PLATE = '02 Medium Spaces/03 Plate Reverbs'
MIX = {
    'tracks': {
        'tpt1': {'bus': 'horns', 'pan': -0.12, 'gain': 0.0, 'eq': [('hp', 200), ('peak', 2800, 1.0, 1.5)], 'sends': {'plate': -14, 'room': -12}},
        'tpt2': {'bus': 'horns', 'pan': -0.32, 'gain': -2.5, 'eq': [('hp', 200)], 'sends': {'plate': -14, 'room': -12}},
        'alto': {'bus': 'horns', 'pan': 0.22, 'gain': -2.0, 'eq': [('hp', 150), ('peak', 1800, 1.0, 1.0)], 'sends': {'plate': -14, 'room': -12}},
        'tenor': {'bus': 'horns', 'pan': 0.38, 'gain': -4.5, 'eq': [('hp', 110)], 'sends': {'plate': -15, 'room': -12}},
        'tbn': {'bus': 'horns', 'pan': -0.05, 'gain': -2.5, 'eq': [('hp', 80), ('peak', 350, 1.0, -1.5)], 'sends': {'plate': -15, 'room': -12}},
        'bari': {'bus': 'horns', 'pan': 0.12, 'gain': -4.0, 'eq': [('hp', 60), ('peak', 250, 1.0, -2.0)], 'sends': {'room': -14}},
        'drums.kick': {'bus': 'drums', 'gain': 2.0, 'eq': [('hp', 35), ('peak', 60, 1.0, 3.0), ('peak', 320, 1.2, -4.0), ('peak', 3500, 1.0, 3.0)],
                       'comp': {'thr': -16, 'ratio': 4, 'att_ms': 6, 'rel_ms': 80}},
        'drums.snare': {'bus': 'drums', 'gain': -1.0, 'eq': [('hp', 90), ('peak', 200, 1.0, 2.0), ('peak', 900, 1.5, -2.0), ('highshelf', 6000, 0.7, 3.0)],
                        'comp': {'thr': -18, 'ratio': 3, 'att_ms': 8, 'rel_ms': 100}, 'sends': {'plate': -18}},
        'drums.oh': {'bus': 'drums', 'gain': -2.0, 'eq': [('hp', 300), ('highshelf', 8000, 0.7, 2.5)]},
        'drums.room': {'bus': 'drums', 'gain': -9.0, 'eq': [('hp', 120)], 'comp': {'thr': -26, 'ratio': 6, 'att_ms': 2, 'rel_ms': 120}},
        'bass': {'gain': 0.0, 'eq': [('hp', 32), ('peak', 90, 1.0, 2.0), ('peak', 250, 1.0, -2.5), ('peak', 1200, 1.2, 2.0)],
                 'comp': {'thr': -20, 'ratio': 4, 'att_ms': 10, 'rel_ms': 120}, 'sat': 3.0},
        'gtr': {'pan': 0.45, 'gain': -9.0, 'eq': [('hp', 300), ('peak', 2500, 1.0, 2.0)], 'sends': {'room': -10}},
        'organ': {'pan': -0.1, 'gain': -19.0, 'width': 1.3, 'eq': [('hp', 220), ('lp', 7000)], 'sends': {'room': -8}},
        'glock': {'pan': 0.3, 'gain': -12.0, 'eq': [('hp', 800)], 'sends': {'plate': -8}},
        'conga': {'pan': -0.4, 'gain': -9.0, 'eq': [('hp', 100)], 'sends': {'room': -10}},
        'tamb': {'pan': 0.5, 'gain': -14.0, 'eq': [('hp', 3000)], 'sends': {'room': -10}},
    },
    'buses': {
        'horns': {'gain': -1.0, 'eq': [('peak', 450, 0.8, -2.0), ('peak', 3500, 1.0, 1.5), ('highshelf', 8000, 0.7, 2.5)], 'comp': {'thr': -18, 'ratio': 2.5, 'att_ms': 15, 'rel_ms': 150}, 'sat': 1.5},
        'drums': {'gain': 0.0, 'comp': {'thr': -14, 'ratio': 3, 'att_ms': 12, 'rel_ms': 120, 'mix': 0.6}, 'sat': 2.0},
    },
    'fx': {
        'room': {'ir': '00.9s Recording Room-OST', 'predelay': 8, 'hp': 400, 'lp': 9000, 'gain': -4.0},
        'plate': {'ir': '1.3s_Horn Chamber', 'predelay': 18, 'hp': 450, 'lp': 10000, 'gain': -5.0},
    },
    'master': {'eq': [('hp', 28), ('peak', 180, 0.8, -0.5), ('highshelf', 10000, 0.7, 1.0)], 'comp': {'thr': -16, 'ratio': 2, 'att_ms': 30, 'rel_ms': 200, 'knee': 8},
               'lufs': -12.0, 'ceiling': -1.0, 'clip': 1.5},
}

if __name__ == '__main__':
    from studio.produce import produce
    produce(sys.modules[__name__])
