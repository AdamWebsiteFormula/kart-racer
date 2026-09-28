# Lighthouse Loop, candidate B (track harbour-loop): big beat, breakbeat drums and a riff for a sunny seaside town.
# B-flat minor, 142 bpm. A funky live break layered with an electronic kick and clap, crushed on the drum bus; an
# acid synth bass pattern; a crunchy guitar riff in power chords; a distorted organ; a supersaw lead hook doubled by
# the horns as stabs; filter sweeps, a riser and impacts into each drop. Every note is written by hand here.
#
# Form (bars): intro 4 (the break alone, filtered and opening up, the pickup bar) | loop 40:
#   A 8 (the groove: break, acid bass, guitar riff) | B 8 (the hook on the lead, the organ answers)
#   C 8 (the breakdown: bass pedal, pads, a riser; the last two bars a snare rush through a closing filter)
#   D 8 (the drop: the hook with horn stabs and everything) | E 8 (the riff up a fourth, then home; ends on the pickup
#   bar = the intro's last bar)
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from studio.score import Song, seq, grid, chords, Note
from studio.arrange import comp, pad, shift, drum_fill
from studio import instruments as _I

SLOT, CANDIDATE = 'harbour-loop', 'b-big-beat'
STYLE = 'big beat: live funk break layered with electronic kick and clap, acid synth bass, crunchy guitar riff, distorted organ, supersaw hook with horn stabs, filter sweeps and risers'
FORM = ['intro 4 (the break alone through an opening filter, pickup bar)', 'A 8 groove (break, acid bass, guitar riff)', 'B 8 hook on the lead, organ answers',
        'C 8 breakdown (bass pedal, pads, riser, snare rush through a closing filter)', 'D 8 drop: hook with horn stabs',
        "E 8 riff up a fourth then home, pickup bar (= intro's last bar)"]

BPM, INTRO, LOOP = 142, 4, 40
A0, B0, C0, D0, E0 = 4, 12, 20, 28, 36
BAR = 240.0 / BPM

PROG = {
    'intro': 'Bbm | Bbm | Bbm | Bbm',
    'A': 'Bbm | Bbm | Bbm | Bbm | Ebm | Ebm | Bbm | F7',
    'B': 'Bbm | Gb | Bbm | Ab | Bbm | Gb | Ab | F7',
    'C': 'Gbmaj7 | Ab | Fm7 | Bbm | Gbmaj7 | Ab | F7sus4 | F7',
    'D': 'Bbm | Gb | Bbm | Ab | Bbm | Gb | Ab | F7',
    'E': 'Ebm | Ebm | Bbm | Bbm | Gb | Ab | Bbm | Bbm',
}
SECTIONS = [('intro', INTRO), ('A', 8), ('B', 8), ('C', 8), ('D', 8), ('E', 8)]

ACID = "Bb1:16 Bb1:16 Bb2:16 Bb1:16 r:16 Bb1:16 Ab2:16 Bb1:16 Db2:16 Bb1:16 Eb2:16 Bb1:16 F2:16 Bb1:16 Ab1:16 Bb1:16"
GTR = "[Bb2 F3]:8^ r:8 r:16 [Bb2 F3]:16 r:8 [Db3 Ab3]:8^ r:8 [Eb3 Bb3]:8^ r:8"
HOOK = ["Bb4:8 r:16 Bb4:16 Db5:8 Eb5:8 r:16 F5:16 r:8 Ab5:8 F5:8", "Eb5:8. Db5:16 r:8 Bb4:8~ Bb4:4 r:4",
        "Bb4:8 r:16 Bb4:16 Db5:8 Eb5:8 r:16 F5:16 r:8 Ab5:8 F5:8", "Eb5:8. F5:16 r:8 Gb5:8~ Gb5:4 F5:8 Eb5:8"]
ORGAN_ANSWER = ["r:1", "r:2 r:8 [Db4 F4 Bb4]:8^ r:8 [Db4 F4 Bb4]:8^", "r:1", "r:2 r:8 [C4 Eb4 Ab4]:8^ r:8 [C4 Eb4 A4]:8^"]


def lines(parts, t0):
    """Notes of consecutive one-bar lines from beat t0, read as one line (ties carry across bar lines, and every
    bar is checked to be four beats long)."""
    ns, _ = seq(' | '.join(parts), t0)
    return ns


def at(bar):
    return 4.0 * bar


def compose():
    s = Song('Lighthouse Loop (big beat)', 'harbour-loop', BPM, 'B-flat minor', INTRO, LOOP, seed=91)
    P = {}
    P['drums'] = s.part('drums', 'kit', jitter_ms=2.5, vel_jitter=0.05)
    P['edrums'] = s.part('edrums', 'edrums', jitter_ms=1.0)
    P['acid'] = s.part('acid', 'bb_acid', jitter_ms=1.0)
    P['sub'] = s.part('sub', 'sub', jitter_ms=1.0)
    P['gtr'] = s.part('gtr', 'guitar', jitter_ms=3)
    P['organ'] = s.part('organ', 'bb_organ', jitter_ms=2)
    P['lead'] = s.part('lead', 'bb_lead', jitter_ms=1.5, mono=True)
    P['pad'] = s.part('pad', 'bb_pad', jitter_ms=2)
    for name, inst in (('tpt1', 'trumpet'), ('tpt2', 'trumpet'), ('tbn1', 'trombone'), ('tbn2', 'trombone')):
        P[name] = s.part(name, inst, lag_ms=3, jitter_ms=3, mono=True)

    prog = {}
    t = 0.0
    for name, bars in SECTIONS:
        prog[name] = chords(PROG[name], t)
        t += 4 * bars
    allp = sum(prog.values(), [])
    s.prog = allp

    def chord(tt):
        return [c for c in allp if c[0] - 1e-9 <= tt + 0.01 < c[0] + c[1] - 1e-9][0][2]

    def brk(bar0, nbars, full=True):
        """The break: the kit plays a funky pattern, an electronic kick and clap reinforce it."""
        for b in range(nbars):
            bar = bar0 + b
            P['drums'].add(grid('x.x.......x..x..', 'kick', at(bar)) + grid('....X..g.g..X..g', 'snare', at(bar), vels={'g': 0.32}) +
                           grid('x.xxx.xox.x.x.xx' if b % 2 else 'x.xxx.xxx.x.x.xo', 'hhc', at(bar), vels={'x': 0.6, 'o': 0.5}))
            if full:
                P['edrums'].add(grid('x.x.......x..x..', 'kick', at(bar), vels={'x': 0.9}) + grid('....x.......x...', 'clap', at(bar), vels={'x': 0.75}))

    def acid(bar0, nbars, semis_by_bar=None):
        for b in range(nbars):
            tt = at(bar0 + b)
            r = chord(tt).root
            semis = ((r - 10) % 12)
            if semis > 6:
                semis -= 12
            notes = shift(lines([ACID], tt), 0, semis)
            P['acid'].add([n.copy(v=0.85 if i % 4 == 0 else 0.62) for i, n in enumerate(notes)])
            P['sub'].add([Note(tt, 1.9, 34 + semis, 0.8), Note(tt + 2, 1.9, 34 + semis, 0.75)])

    def gtr(bar0, nbars):
        for b in range(nbars):
            tt = at(bar0 + b)
            r = chord(tt).root
            semis = ((r - 10) % 12)
            if semis > 6:
                semis -= 12
            P['gtr'].add(shift(lines([GTR], tt), 0, semis))

    # ---------------------------------------------------------------- intro: the break alone (the filter opens in the mix)
    brk(0, 3, full=False)
    P['edrums'].add([Note(at(1), 8.0, 'rise', 0.7)])

    def pickup(bar):
        P['drums'].add(grid('x...............', 'kick', at(bar)) + grid('x...............', 'crash', at(bar)) +
                       grid('....x.x.xxxxXXXX', 'snare', at(bar), vels={'x': 0.7}))
        P['edrums'].add([Note(at(bar), 1, 'kick', 1.0), Note(at(bar), 2, 'impact', 0.6), Note(at(bar) + 1, 3.0, 'rise', 0.6)])
        P['acid'].add(lines(["Bb1:8^ r:8 r:4 r:2"], at(bar)))
        P['sub'].add([Note(at(bar), 1.0, 34, 0.9)])
        P['gtr'].add(lines(["[Bb2 F3 Bb3]:4^ r:4 r:2"], at(bar)))
        for pn, p in (('tpt1', 77), ('tpt2', 73), ('tbn1', 65), ('tbn2', 58)):
            P[pn].add(Note(at(bar), 0.5, p, 0.95, {'marc'}))
    pickup(INTRO - 1)
    pickup(E0 + 7)
    s.twin(INTRO - 1, E0 + 7)

    # ---------------------------------------------------------------- A: the groove
    brk(A0, 8)
    acid(A0, 8)
    gtr(A0, 8)
    P['drums'].add(grid('x...............', 'crash', at(A0)))
    P['edrums'].add([Note(at(A0), 2, 'impact', 0.7)])

    # ---------------------------------------------------------------- B: the hook on the lead, the organ answers
    hook = lines(HOOK + HOOK, at(B0))
    P['lead'].add(hook)
    P['organ'].add(lines(ORGAN_ANSWER + ORGAN_ANSWER, at(B0)))
    brk(B0, 8)
    acid(B0, 8)
    P['drums'].add(grid('x...............', 'crash', at(B0)) + grid('x...............', 'crash', at(B0 + 4)))

    # ---------------------------------------------------------------- C: the breakdown
    P['pad'].add(pad(prog['C'], 56, 72, n=4, vel=0.6))
    for b in range(8):
        tt = at(C0 + b)
        r = chord(tt).bass
        P['sub'].add([Note(tt, 3.9, 34 + ((r - 34) % 12), 0.7)])
        P['acid'].add([Note(tt + 0.5 * k, 0.4, 34 + ((r - 34) % 12), 0.55) for k in range(8)] if b >= 4 else [])
        P['drums'].add(grid('x.x.x.x.x.x.x.x.', 'hhc', at(C0 + b), vels={'x': 0.45}))
    P['lead'].add(lines(["Db5:2. Bb4:4", "C5:2. Ab4:4", "Ab4:1", "F4:2 r:2"], at(C0)))
    P['drums'].add(grid('x...x...x...x...|x.x.x.x.x.x.x.x.', 'snare', at(C0 + 6), vels={'x': 0.55}))
    P['edrums'].add([Note(at(C0 + 4), 16.0, 'rise', 0.8)])

    # ---------------------------------------------------------------- D: the drop, the hook with horn stabs
    hook = lines(HOOK + HOOK, at(D0))
    P['lead'].add(hook)
    for n in hook:
        if n.d <= 0.5:
            P['tpt1'].add(n.copy(art=n.art | {'stac'}))
            P['tpt2'].add(n.copy(p=n.p - 5, art=n.art | {'stac'}))
            P['tbn1'].add(n.copy(p=n.p - 12, art=n.art | {'stac'}))
    brk(D0, 8)
    acid(D0, 8)
    gtr(D0, 8)
    P['organ'].add(lines(ORGAN_ANSWER + ORGAN_ANSWER, at(D0)))
    for bar in (D0, D0 + 4):
        P['drums'].add(grid('x...............', 'crash', at(bar)))
        P['edrums'].add([Note(at(bar), 2, 'impact', 0.7)])

    # ---------------------------------------------------------------- E: the riff up a fourth, then home
    brk(E0, 7)
    acid(E0, 7)
    gtr(E0, 7)
    P['organ'].add(pad(prog['E'][:7], 56, 70, n=3, vel=0.5))
    P['lead'].add(lines(["Bb5:4. Ab5:8 Gb5:4 F5:4", "Eb5:2 r:2", "F5:4. Eb5:8 Db5:4 Bb4:4", "Db5:2 r:2",
                         "Db5:4 Eb5:4 F5:4 Gb5:4", "F5:4 Eb5:4 C5:4 Ab4:4", "Bb4:2 r:2"], at(E0)))
    P['drums'].add(grid('x...............', 'crash', at(E0)) + grid('x...............', 'crash', at(E0 + 4)))

    for bar, style in [(A0 + 3, 'snare'), (A0 + 7, 'toms'), (B0 + 3, 'flams'), (B0 + 7, 'rush'), (D0 + 3, 'toms'), (D0 + 7, 'rush'), (E0 + 3, 'down')]:
        drum_fill(P['drums'], bar, style, beats=1)
    return s


def _voices():
    from studio import synths, modern
    _I.RACK['bb_acid'] = lambda: synths.SynthBass(gain_db=-9.0, cutoff=320.0, env_amt=2600.0, decay=0.12, res=0.55, sub=0.0, release=0.03, drive=2.2, shape='saw')
    _I.RACK['bb_organ'] = lambda: synths.Organ(drawbars='888800000', perc=(3, 0.2), click=0.4, drive_db=14.0, leslie='fast', gain_db=-8.0)
    _I.RACK['bb_lead'] = lambda: modern.Supersaw(voices=7, detune=20, spread=0.8, cutoff=2400, env_amt=5000, env_decay=0.18, res=0.2, attack=0.002,
                                                   decay=0.3, sustain=0.7, release=0.1, gain_db=-12, drive=1.8, vib=(5.5, 0.1, 0.3))
    _I.RACK['bb_pad'] = lambda: modern.Pad(gain_db=-15, cutoff=1800, attack=0.5, release=1.0, voices=5, detune=14, air=0.02)


_voices()

MIX = {
    'tracks': {
        'drums.kick': {'bus': 'drums', 'gain': 0.0, 'eq': [('hp', 40), ('peak', 60, 1.0, 2.0), ('peak', 320, 1.2, -4.0), ('peak', 3500, 1.0, 3.0)]},
        'drums.snare': {'bus': 'drums', 'gain': 0.0, 'eq': [('hp', 100), ('peak', 200, 1.0, 3.0), ('highshelf', 5000, 0.7, 3.0)]},
        'drums.oh': {'bus': 'drums', 'gain': -1.0, 'eq': [('hp', 300), ('highshelf', 8000, 0.7, 2.0)]},
        'drums.room': {'bus': 'drums', 'gain': -4.0, 'eq': [('hp', 150)], 'comp': {'thr': -28, 'ratio': 8, 'att_ms': 1, 'rel_ms': 100}},
        'edrums.kick': {'bus': 'drums', 'gain': -6.0, 'eq': [('hp', 35), ('peak', 60, 1.0, 1.0)]},
        'edrums.snare': {'bus': 'drums', 'gain': -5.0, 'eq': [('hp', 400)]},
        'edrums.hats': {'bus': 'drums', 'gain': -12.0},
        'edrums.fx': {'gain': -8.0, 'width': 1.5, 'sends': {'hall': -10}},
        'acid': {'gain': -3.0, 'sat': {'drive_db': 10.0, 'mix': 0.8}, 'eq': [('hp', 90), ('peak', 1200, 1.0, 3.0), ('lp', 8000)],
                 'duck': {'by': 'edrums.kick', 'depth_db': 3.0}},
        'sub': {'gain': -13.0, 'eq': [('hp', 30), ('lp', 110)], 'duck': {'by': 'edrums.kick', 'depth_db': 6.0}},
        'gtr': {'pan': -0.35, 'gain': -8.0, 'amp': {'drive_db': 24.0, 'mids': 3.0}, 'eq': [('lp', 6500)], 'sends': {'room': -14}},
        'organ': {'pan': 0.35, 'gain': -12.0, 'eq': [('hp', 200), ('lp', 6500)], 'sends': {'room': -12}},
        'lead': {'pan': 0.0, 'gain': -2.0, 'eq': [('hp', 250), ('peak', 3000, 1.0, 1.5)], 'sends': {'delay': -12, 'hall': -14}},
        'pad': {'gain': -4.0, 'width': 1.5, 'eq': [('hp', 200)], 'sends': {'hall': -8}, 'duck': {'by': 'edrums.kick', 'depth_db': 5.0}},
        'tpt1': {'bus': 'horns', 'pan': -0.3, 'gain': 0.0, 'eq': [('hp', 250)]},
        'tpt2': {'bus': 'horns', 'pan': 0.3, 'gain': -2.0, 'eq': [('hp', 250)]},
        'tbn1': {'bus': 'horns', 'pan': 0.1, 'gain': -2.0, 'eq': [('hp', 100)]},
        'tbn2': {'bus': 'horns', 'pan': -0.1, 'gain': -4.0, 'eq': [('hp', 80)]},
    },
    'buses': {
        # big beat's crushed break: hard compression and saturation on the whole kit, the intro's filter opening
        'drums': {'gain': 0.0, 'comp': {'thr': -20, 'ratio': 6, 'att_ms': 5, 'rel_ms': 80, 'mix': 0.7}, 'sat': 5.0,
                  'sweep': [(0.0, 700.0), (2.0 * BAR, 2500.0), (3.0 * BAR, 20000.0), (at(C0 + 6) * 60 / BPM, 20000.0), (at(C0 + 6) * 60 / BPM + 0.01, 20000.0),
                            (at(C0 + 7) * 60 / BPM, 1800.0), (at(C0 + 8) * 60 / BPM - 0.02, 900.0), (at(C0 + 8) * 60 / BPM, 20000.0), (400.0, 20000.0)]},
        'horns': {'gain': -3.0, 'eq': [('peak', 450, 0.8, -2.0), ('highshelf', 8000, 0.7, 2.0)], 'comp': {'thr': -18, 'ratio': 3, 'att_ms': 8, 'rel_ms': 100}, 'sat': 3.0},
    },
    'fx': {
        'room': {'ir': '1.5s_Perc Room A', 'predelay': 5, 'hp': 400, 'lp': 9000, 'gain': -6.0},
        'hall': {'ir': '2.0s_Space Reverb', 'predelay': 25, 'hp': 400, 'lp': 10000, 'gain': -6.0},
        'delay': {'kind': 'delay', 'time': 60 / BPM * 0.75, 'fb': 0.3, 'lp': 5000, 'hp': 500, 'pingpong': True, 'gain': -8.0},
    },
    'master': {'comp': {'thr': -14, 'ratio': 2, 'att_ms': 20, 'rel_ms': 150, 'knee': 8}, 'lufs': -11.0, 'ceiling': -1.0, 'clip': 2.0},
}


def shorts():
    """Course-intro pieces: 6.0 s (the break through an opening filter with a riser, the guitar riff's first bar, then
    a B-flat minor hit with an impact at 3.4 s, held) and 2.5 s (a snare rush into the hit at 0.85 s)."""
    out = {}
    s = Song('Lighthouse Loop (big beat) - course intro', 'harbour-loop', BPM, 'B-flat minor', 3, 0, seed=92, tail_bars=0)
    s.about = "the break and a riser, the guitar riff's first bar, a B-flat minor hit with an impact, held"
    P = {'drums': s.part('drums', 'kit', jitter_ms=2.5), 'edrums': s.part('edrums', 'edrums', jitter_ms=1), 'gtr': s.part('gtr', 'guitar', jitter_ms=3),
         'acid': s.part('acid', 'bb_acid', jitter_ms=1), 'sub': s.part('sub', 'sub', jitter_ms=1), 'pad': s.part('pad', 'bb_pad', jitter_ms=2)}
    for name, inst in (('tpt1', 'trumpet'), ('tpt2', 'trumpet'), ('tbn1', 'trombone'), ('tbn2', 'trombone')):
        P[name] = s.part(name, inst, lag_ms=3, jitter_ms=3, mono=True)
    P['drums'].add(grid('x.x.......x..x..|x.x.......x.....|x...............', 'kick', 0) + grid('....X..g.g..X..g|....X...xxxxXXXX|................', 'snare', 0, vels={'g': 0.32, 'x': 0.7}) +
                   grid('x.xxx.xxx.x.x.xo|x.xxx.xxx.......|................', 'hhc', 0, vels={'x': 0.6, 'o': 0.5}) + grid('................|................|x...............', 'crash', 0))
    P['edrums'].add([Note(0, 8.0, 'rise', 0.7), Note(8, 2, 'impact', 0.8), Note(8, 1, 'kick', 1.0)])
    P['gtr'].add(lines([GTR, "r:1", "[Bb2 F3 Bb3]:2^"], 0))
    P['acid'].add(lines([ACID], 4))
    P['sub'].add([Note(8, 2.0, 34, 0.9)])
    P['pad'].add([Note(8, 2.5, p, 0.6) for p in (58, 61, 65, 70)])
    for pn, p in (('tpt1', 77), ('tpt2', 73), ('tbn1', 65), ('tbn2', 58)):
        P[pn].add(Note(8, 1.5, p, 0.9, {'acc'}))
    out['intro-6s'] = (s, 6.0, 8)
    s = Song('Lighthouse Loop (big beat) - course intro short', 'harbour-loop', BPM, 'B-flat minor', 2, 0, seed=93, tail_bars=0)
    s.about = 'a snare rush and a riser into a B-flat minor hit with an impact'
    P = {'drums': s.part('drums', 'kit', jitter_ms=2), 'edrums': s.part('edrums', 'edrums', jitter_ms=1), 'gtr': s.part('gtr', 'guitar', jitter_ms=2),
         'sub': s.part('sub', 'sub', jitter_ms=1), 'pad': s.part('pad', 'bb_pad', jitter_ms=1)}
    for name, inst in (('tpt1', 'trumpet'), ('tpt2', 'trumpet'), ('tbn1', 'trombone'), ('tbn2', 'trombone')):
        P[name] = s.part(name, inst, lag_ms=3, jitter_ms=2, mono=True)
    P['drums'].add(grid('xxxxxxxx........', 'snare', 0, vels={'x': 0.65}) + grid('........x.......', 'crash', 0) + grid('........x.......', 'kick', 0))
    P['edrums'].add([Note(0, 2.0, 'rise', 0.6), Note(2, 2, 'impact', 0.8), Note(2, 1, 'kick', 1.0)])
    P['gtr'].add(lines(["r:2 [Bb2 F3 Bb3]:2^", "r:1"], 0))
    P['sub'].add([Note(2, 2.0, 34, 0.9)])
    P['pad'].add([Note(2, 2.5, p, 0.6) for p in (58, 61, 65, 70)])
    for pn, p in (('tpt1', 77), ('tpt2', 73), ('tbn1', 65), ('tbn2', 58)):
        P[pn].add(Note(2, 1.2, p, 0.9, {'acc'}))
    out['intro-2s'] = (s, 2.5, 2)
    return out


if __name__ == '__main__':
    from studio.produce import produce
    produce(sys.modules[__name__])
