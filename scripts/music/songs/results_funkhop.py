# Results and podium, candidate A (slot results): laid-back funk-hop / boom-bap funk for the victory lap.
# A-flat major (the shout section on an F Dorian vamp), 94 bpm, swung 16ths. A boom-bap kit (thick kick layered with
# a synth kick, a crisp snare with room, ghost notes), a fingered bass, a Rhodes laying back on the chords, the tune in
# jazz-guitar octaves, a horn section (trumpet, alto, trombone) on stabs and one short shout riff with a synth double,
# a smooth saw lead taking the tune in the last section, shaker and tambourine.
# Every note is written by hand here; studio/ only plays and mixes it.
#
# Form (bars): intro 2 (the groove on A-flat, the pickup bar) | loop 28:
#   A 8 (the tune in guitar octaves over Dbmaj9-Cm7-Bbm9-Eb13) | B 8 (the horn shout over Fm9-Bb13, guitar answers)
#   C 4 (breakdown: half-time, the lead's aside over Rhodes) | A' 8 (the tune on the lead with guitar octaves and horn
#   stabs, ending on the pickup bar = the intro's last bar)
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from studio.score import Song, seq, grid, chords, Note
from studio.arrange import comp, pad, shift, drum_fill
from studio.theory import voice_lead
from studio import instruments as _I

SLOT, CANDIDATE = 'results', 'a-funkhop'
STYLE = ('funk-hop / boom-bap funk: swung boom-bap kit layered with a synth kick, fingered bass, Rhodes, jazz-guitar octave tune, '
         'horn stabs and a shout riff (trumpet, alto, trombone) with a synth double, smooth saw lead, shaker, tambourine')
FORM = ['intro 2 (groove on A-flat, pickup bar)', 'A 8 tune in guitar octaves (Dbmaj9-Cm7-Bbm9-Eb13)', 'B 8 horn shout over Fm9-Bb13',
        'C 4 breakdown (half-time, lead aside)', "A' 8 tune on the lead + guitar + horn stabs, pickup bar (= intro's last bar)"]

BPM, INTRO, LOOP = 94, 2, 28
A0, B0, C0, A2 = 2, 10, 18, 22
SW = 0.58  # 16th swing

PROG = {
    'intro': 'Abmaj9 | Ebm9 Ab13',
    'A': 'Dbmaj9 | Cm7 | Bbm9 | Eb13sus4 Eb13 | Dbmaj9 | Cm7 | Bbm9 Eb13 | Abmaj9',
    'B': 'Fm9 | Bb13 | Fm9 | Bb13 | Fm9 | Bb13 | Dbmaj9 | Eb13sus4 Eb13',
    'C': 'Abmaj9 | Fm9 | Dbmaj9 | Eb13sus4 Eb13',
    "A'": 'Dbmaj9 | Cm7 | Bbm9 | Eb13sus4 Eb13 | Dbmaj9 | Cm7 | Bbm9 Eb13 | Ebm9 Ab13',
}
SECTIONS = [('intro', INTRO), ('A', 8), ('B', 8), ('C', 4), ("A'", 8)]

TUNE = [
    "r:8 F5:16 Ab5:16 C6:8 Ab5:8~ Ab5:4 Eb5:8 F5:8",
    "G5:8. Eb5:16~ Eb5:4 r:8 C5:16 Eb5:16 G5:8 Bb5:8",
    "Ab5:8 F5:8 Db5:8 C5:8~ C5:4 r:8 Db5:16 C5:16",
    "Bb4:4 Db5:8 Eb5:8~ Eb5:4 G5:8 Bb5:8",
    "C6:8. Ab5:16~ Ab5:8 F5:8 Ab5:8 C6:8 Eb6:8 C6:8",
    "Bb5:4 G5:8 Eb5:8~ Eb5:4 r:4",
    "r:8 Db5:16 F5:16 Ab5:8 C6:8 Bb5:8 G5:8 F5:8 Eb5:8",
    "C5:4. Eb5:8~ Eb5:2",
]
SHOUT = [
    "r:8 C5:16 Eb5:16 F5:8^ r:8 Ab5:8 G5:16 F5:16 Eb5:8 C5:8",
    "D5:8^ r:8 r:4 r:8 F5:16 G5:16 Ab5:8 G5:8",
    "r:8 C5:16 Eb5:16 F5:8^ r:8 Ab5:8 Bb5:16 C6:16 Bb5:8 Ab5:8",
    "G5:4^ F5:8 D5:8~ D5:4 r:4",
    "r:8 C5:16 Eb5:16 F5:8^ r:8 Ab5:8 G5:16 F5:16 Eb5:8 C5:8",
    "D5:8^ r:8 r:4 r:8 F5:16 G5:16 Ab5:8 G5:8",
    "F5:8. Ab5:16~ Ab5:8 C6:8~ C6:4 Bb5:8 Ab5:8",
    "Bb5:4 Ab5:8 G5:8~ G5:2",
]
# the guitar's answers in the shout's gaps (bars 2, 4, 6)
ANSWER = ["r:2 r:8 D4:16 F4:16 Ab4:8 F4:8", "r:2 r:8 C4:16 D4:16 F4:8 D4:8", "r:2 r:8 D4:16 F4:16 G4:8 Ab4:8"]
ASIDE = ["r:4 Eb5:8 F5:8 G5:8 Bb5:8~ Bb5:4", "Ab5:8. G5:16 F5:8 C5:8~ C5:2", "r:8 F5:16 Ab5:16 C6:8 Eb6:8~ Eb6:4 C6:8 Ab5:8",
         "Bb5:4 Ab5:4 G5:2"]
PICKUP_LEAD = "r:2 r:8 C5:16 Db5:16 Eb5:8 E5:8"

BASS_A = [
    "Db2:8. Db2:16 r:8 Ab2:8 r:8 Db2:8 F2:8 Ab2:8",
    "C2:8. C2:16 r:8 G2:8 r:8 C2:8 Eb2:8 G2:8",
    "Bb1:8. Bb1:16 r:8 F2:8 r:8 Bb1:8 Db2:8 F2:8",
    "Eb2:8. Eb2:16 r:8 Bb1:8 Eb2:8 G2:8 Bb2:8 Eb2:8",
    "Db2:8. Db2:16 r:8 Ab2:8 r:8 Db2:8 F2:8 Ab2:8",
    "C2:8. C2:16 r:8 G2:8 r:8 C2:8 Eb2:8 G2:8",
    "Bb1:8. Bb1:16 r:8 F2:8 Eb2:8. Eb2:16 r:8 Bb1:8",
    "Ab1:8. Ab1:16 r:8 Eb2:8 r:8 Ab2:8 G2:8 Eb2:8",
]
BASS_B = [
    "F1:8. F1:16 r:8 F2:8' r:8 Eb2:8 C2:8 Ab1:8",
    "Bb1:8. Bb1:16 r:8 Bb2:8' r:8 Ab2:8 F2:8 D2:8",
] * 3 + [
    "Db2:8. Db2:16 r:8 Ab2:8 r:8 Db2:8 C2:8 Ab1:8",
    "Eb2:8. Eb2:16 r:8 Bb1:8 Eb2:8. Eb2:16 G2:8 Bb2:8",
]
BASS_C = ["Ab1:2. r:8 Eb2:8", "F1:2. r:8 C2:8", "Db2:2. r:8 Ab1:8", "Eb2:2 Eb2:8. Eb2:16 Bb1:8 Db2:8"]


def lines(parts, t0):
    """Notes of consecutive one-bar lines from beat t0, read as one line (ties carry across bar lines, and every
    bar is checked to be four beats long)."""
    ns, _ = seq(' | '.join(parts), t0)
    return ns


def at(bar):
    return 4.0 * bar


def compose():
    s = Song('Rascal Rally! Results (funk-hop)', 'results', BPM, 'A-flat major', INTRO, LOOP, seed=411)
    P = {}
    P['lead'] = s.part('lead', 'fh_lead', lag_ms=6, jitter_ms=3, mono=True, swing=SW, swing_unit=0.25)
    P['gtr'] = s.part('gtr', 'guitar', lag_ms=8, jitter_ms=4, swing=SW, swing_unit=0.25)
    P['synth'] = s.part('synth', 'fh_synth', jitter_ms=2, mono=True, swing=SW, swing_unit=0.25)
    P['tpt'] = s.part('tpt', 'trumpet', lag_ms=5, jitter_ms=5, mono=True, swing=SW, swing_unit=0.25)
    P['alto'] = s.part('alto', 'alto', lag_ms=6, jitter_ms=5, mono=True, swing=SW, swing_unit=0.25)
    P['tbn'] = s.part('tbn', 'trombone', lag_ms=7, jitter_ms=5, mono=True, swing=SW, swing_unit=0.25)
    P['keys'] = s.part('keys', 'fh_keys', lag_ms=8, jitter_ms=4, swing=SW, swing_unit=0.25)
    P['bass'] = s.part('bass', 'ebass', lag_ms=4, jitter_ms=3, mono=True, swing=SW, swing_unit=0.25)
    P['drums'] = s.part('drums', 'kit', jitter_ms=3, vel_jitter=0.06, swing=SW, swing_unit=0.25)
    P['edrums'] = s.part('edrums', 'fh_edrums', jitter_ms=1.0, vel_jitter=0.03, swing=SW, swing_unit=0.25)
    P['shaker'] = s.part('shaker', 'shaker', lag_ms=4, jitter_ms=4, swing=SW, swing_unit=0.25)
    P['tamb'] = s.part('tamb', 'tamb', lag_ms=3, jitter_ms=4, swing=SW, swing_unit=0.25)

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

    # ---------------------------------------------------------------- the beat
    def beat(bar, v=1, half=False, tamb=False):
        """Boom-bap: a two-bar kick pattern (v = 1 or 2), snare on 2 and 4 with ghosts, 8th hats with swung 16th pickups."""
        kick = 'x......x..x.....' if v == 1 else 'x......x.x...x..'
        snare = '....X.......X...' if not half else '........X.......'
        if half:
            kick = 'x.........x.....'
        P['drums'].add(grid(kick, 'kick', at(bar), vels={'x': 0.85}) + grid(snare, 'snare', at(bar), vels={'X': 0.9}) +
                       grid('.......g.g......' if not half else '..............g.', 'snare', at(bar), vels={'g': 0.22}) +
                       grid('x.xgx.x.x.xgx.x.' if not half else 'x...x...x...x...', 'hhc', at(bar), vels={'x': 0.5, 'g': 0.28}))
        P['edrums'].add(grid(kick, 'kick', at(bar), vels={'x': 0.7}) + grid(snare, 'snare', at(bar), vels={'X': 0.45}))
        P['shaker'].add(grid('x.x.x.x.x.x.x.x.', 'LShaker_Shake1D', at(bar), vels={'x': 0.4}) +
                        grid('.g.g.g.g.g.g.g.g', 'LShaker_Shake1U', at(bar), vels={'g': 0.25}))
        if tamb:
            P['tamb'].add(grid('....x.......x...', 'Tamb1_Shake', at(bar), vels={'x': 0.55}))

    def rhodes(bar0, nbars, pat='x-----x---------', pat2='x-------x-------', vel=0.55):
        """Rhodes chords laid back: a bar of one chord on its own pattern, a bar of two chords struck on 1 and 3."""
        for b in range(nbars):
            sp = span(bar0 + b, 1)
            P['keys'].add(comp(sp, pat if len(sp) == 1 else pat2, 55, 72, n=4, vel=vel, t0=at(bar0 + b), t1=at(bar0 + b + 1)))

    def octaves(notes, down=(12, 24), vel=0.8):
        """Jazz-guitar octaves: the tune an octave and two octaves down, the upper one a little softer."""
        out = []
        for n in notes:
            out.append(n.copy(p=n.p - down[0], v=n.v * vel * 0.9))
            out.append(n.copy(p=n.p - down[1], v=n.v * vel))
        return out

    def stab(tt, ch, d=0.3, v=0.78, top=None):
        vs = voice_lead(None, ch, 63, 78, 3)
        P['tpt'].add(Note(tt, d, vs[-1], v, {'marc'}))
        P['alto'].add(Note(tt, d, vs[-2], v * 0.95, {'marc'}))
        P['tbn'].add(Note(tt, d, vs[0] - 12, v * 0.95, {'marc'}))

    # ---------------------------------------------------------------- intro and the pickup bar
    beat(0, 1)
    P['bass'].add(lines(["Ab1:8. Ab1:16 r:8 Eb2:8 r:8 Ab1:8 C2:8 Eb2:8"], at(0)))
    rhodes(0, 1)
    P['drums'].add(grid('x...............', 'crash', at(0), vels={'x': 0.6}))

    def pickup(bar):
        """Band hits on Ebm9 (beat 1) and Ab13 (the and-of-2), a snare fill, the lead's chromatic run into the tune."""
        P['lead'].add(lines([PICKUP_LEAD], at(bar)))
        P['gtr'].add(octaves(lines([PICKUP_LEAD], at(bar))))
        P['keys'].add([Note(at(bar), 1.2, p, 0.65) for p in (61, 65, 66, 70)] + [Note(at(bar) + 1.5, 2.3, p, 0.62) for p in (60, 65, 66, 70)])
        for tt, d, v, (a, b, c) in ((at(bar), 0.3, 0.8, (58, 73, 78)), (at(bar) + 1.5, 0.45, 0.84, (54, 72, 77))):
            P['tbn'].add(Note(tt, d, a, v, {'marc'}))
            P['alto'].add(Note(tt, d, b, v, {'marc'}))
            P['tpt'].add(Note(tt, d, c, v, {'marc'}))
        P['bass'].add(lines(["Eb2:8^ r:8 r:8 Ab1:8~ Ab1:4 Ab1:8 C2:8"], at(bar)))
        P['drums'].add(grid('x.....x.........', 'kick', at(bar), vels={'x': 0.9}) + grid('x.....x.........', 'crash', at(bar), vels={'x': 0.6}) +
                       grid('........x.xxX.xx', 'snare', at(bar), vels={'x': 0.55}) + grid('..x.x...........', 'hhc', at(bar), vels={'x': 0.45}))
        P['edrums'].add(grid('x.....x.........', 'kick', at(bar), vels={'x': 0.75}))
    pickup(INTRO - 1)
    pickup(A2 + 7)
    s.twin(INTRO - 1, A2 + 7)

    # ---------------------------------------------------------------- A: the tune in guitar octaves
    tune = lines(TUNE, at(A0))
    P['gtr'].add(octaves(tune))
    P['bass'].add(lines(BASS_A, at(A0)))
    rhodes(A0, 8)
    for b in range(8):
        beat(A0 + b, 1 + b % 2)
    stab(at(A0 + 3) + 2.5, chord(at(A0 + 3) + 2.5), v=0.72)
    stab(at(A0 + 3) + 3.5, chord(at(A0 + 3) + 3.5), v=0.76)
    stab(at(A0 + 7) + 2.5, chord(at(A0 + 7) + 2.5), v=0.72)
    stab(at(A0 + 7) + 3.5, chord(at(A0 + 8) + 0.1), v=0.8)
    P['drums'].add(grid('x...............', 'crash', at(A0), vels={'x': 0.7}))

    # ---------------------------------------------------------------- B: the horn shout
    sh = lines(SHOUT, at(B0))
    P['tpt'].add(sh)
    P['alto'].add(shift(sh, 0, -12))
    P['tbn'].add([n.copy(p=n.p - 24) for n in sh if n.p - 24 >= 44])
    P['synth'].add(shift(sh, 0, 0, vel=0.8))
    for k, bar in enumerate((B0 + 1, B0 + 3, B0 + 5)):
        P['gtr'].add(lines([ANSWER[k]], at(bar)))
    P['bass'].add(lines(BASS_B, at(B0)))
    rhodes(B0, 8, 'x-----x---x-----', vel=0.5)
    for b in range(8):
        beat(B0 + b, 1 + b % 2, tamb=True)
    P['drums'].add(grid('x...............', 'crash', at(B0), vels={'x': 0.75}) + grid('x...............', 'crash', at(B0 + 4), vels={'x': 0.7}))

    # ---------------------------------------------------------------- C: the breakdown
    P['lead'].add(lines(ASIDE, at(C0)))
    P['bass'].add(lines(BASS_C, at(C0)))
    rhodes(C0, 4, 'x---------x-----', vel=0.5)
    for b in range(4):
        beat(C0 + b, 1, half=True)

    # ---------------------------------------------------------------- A': the tune on the lead
    tn = lines(TUNE[:7], at(A2))
    P['lead'].add(tn)
    P['gtr'].add(octaves(tn, vel=0.7))
    P['bass'].add(lines(BASS_A[:7], at(A2)))
    rhodes(A2, 7)
    for b in range(7):
        beat(A2 + b, 1 + b % 2, tamb=True)
    for bar in (A2 + 1, A2 + 3, A2 + 5):
        stab(at(bar) + 2.5, chord(at(bar) + 2.5), v=0.7)
        stab(at(bar) + 3.5, chord(at(bar + 1) + 0.1), v=0.76)
    P['drums'].add(grid('x...............', 'crash', at(A2), vels={'x': 0.75}) + grid('x...............', 'crash', at(A2 + 4), vels={'x': 0.65}))

    for bar, style in [(A0 + 3, 'snare'), (B0 + 3, 'snare'), (B0 + 7, 'toms'), (C0 + 3, 'half'), (A2 + 3, 'snare')]:
        drum_fill(P['drums'], bar, style, beats=1)
    return s


def _instruments():
    from studio import modern, synths
    _I.RACK['fh_lead'] = lambda: modern.Supersaw(voices=3, detune=7, spread=0.3, cutoff=1100, env_amt=2600, env_decay=0.25, res=0.1,
                                                   attack=0.008, decay=0.5, sustain=0.75, release=0.18, gain_db=-12, vib=(5.0, 0.16, 0.25), drive=1.2)
    _I.RACK['fh_synth'] = lambda: modern.Supersaw(voices=3, detune=10, spread=0.5, cutoff=1600, env_amt=3000, env_decay=0.12, res=0.1,
                                                    attack=0.003, decay=0.2, sustain=0.5, release=0.08, gain_db=-17)
    _I.RACK['fh_keys'] = lambda: synths.EPiano(gain_db=-5, bell=0.45, trem=(3.6, 0.2))
    _I.RACK['fh_edrums'] = lambda: modern.DrumSynth(kick_tune=46.0, kick_decay=0.3, snare_tune=185.0)
    _I.get.cache_clear()


_instruments()

MIX = {
    'tracks': {
        'lead': {'pan': 0.0, 'gain': -2.0, 'eq': [('hp', 220), ('peak', 2500, 1.0, 1.0)], 'sends': {'plate': -12, 'delay': -14}},
        'gtr': {'pan': 0.3, 'gain': -4.0, 'eq': [('hp', 120), ('peak', 250, 1.0, -2.0), ('peak', 2500, 1.0, 1.5)], 'sends': {'room': -10, 'plate': -16}},
        'synth': {'pan': 0.0, 'gain': -9.0, 'width': 1.3, 'eq': [('hp', 400), ('lp', 8000)], 'sends': {'plate': -12}},
        'tpt': {'bus': 'horns', 'pan': -0.15, 'gain': 0.0, 'eq': [('hp', 200)], 'sends': {'plate': -14}},
        'alto': {'bus': 'horns', 'pan': 0.2, 'gain': -2.0, 'eq': [('hp', 150)], 'sends': {'plate': -14}},
        'tbn': {'bus': 'horns', 'pan': -0.05, 'gain': -3.0, 'eq': [('hp', 80), ('peak', 350, 1.0, -1.5)], 'sends': {'plate': -15}},
        'keys': {'pan': -0.25, 'gain': -4.0, 'eq': [('hp', 120), ('peak', 300, 1.0, -2.0)], 'sends': {'room': -12}},
        'bass': {'gain': 0.0, 'eq': [('hp', 32), ('peak', 80, 1.0, 2.0), ('peak', 250, 1.0, -2.5), ('peak', 1200, 1.2, 2.0)],
                 'comp': {'thr': -20, 'ratio': 4, 'att_ms': 8, 'rel_ms': 100}, 'sat': 3.0, 'duck': {'by': 'edrums.kick', 'depth_db': 2.0}},
        'drums.kick': {'bus': 'drums', 'gain': 1.0, 'eq': [('hp', 35), ('peak', 60, 1.0, 2.5), ('peak', 320, 1.2, -4.0), ('peak', 3500, 1.0, 2.0)],
                       'comp': {'thr': -16, 'ratio': 4, 'att_ms': 6, 'rel_ms': 80}},
        'drums.snare': {'bus': 'drums', 'gain': 0.0, 'eq': [('hp', 100), ('peak', 200, 1.0, 2.0), ('peak', 900, 1.5, -2.0), ('highshelf', 6000, 0.7, 3.0)],
                        'comp': {'thr': -18, 'ratio': 3, 'att_ms': 8, 'rel_ms': 100}, 'sends': {'room': -12}},
        'drums.oh': {'bus': 'drums', 'gain': -2.0, 'eq': [('hp', 300), ('highshelf', 8000, 0.7, 2.0)]},
        'drums.room': {'bus': 'drums', 'gain': -8.0, 'eq': [('hp', 120)], 'comp': {'thr': -26, 'ratio': 6, 'att_ms': 2, 'rel_ms': 120}},
        'edrums.kick': {'bus': 'drums', 'gain': -6.0, 'eq': [('peak', 55, 1.0, 1.5), ('peak', 300, 1.2, -3.0)]},
        'edrums.snare': {'bus': 'drums', 'gain': -10.0, 'eq': [('hp', 250)]},
        'shaker': {'pan': 0.4, 'gain': -15.0, 'eq': [('hp', 2500)]},
        'tamb': {'pan': -0.4, 'gain': -15.0, 'eq': [('hp', 3000)]},
    },
    'buses': {
        'horns': {'gain': -2.0, 'eq': [('peak', 450, 0.8, -2.0), ('highshelf', 8000, 0.7, 1.5)], 'comp': {'thr': -18, 'ratio': 2.5, 'att_ms': 12, 'rel_ms': 120}, 'sat': 1.0},
        'drums': {'gain': 0.0, 'comp': {'thr': -14, 'ratio': 3, 'att_ms': 10, 'rel_ms': 100, 'mix': 0.6}, 'sat': 2.5},
    },
    'fx': {
        'room': {'ir': '00.9s Recording Room-OST', 'predelay': 8, 'hp': 400, 'lp': 9000, 'gain': -5.0},
        'plate': {'ir': '2.3s_Nice Plate', 'predelay': 20, 'hp': 450, 'lp': 10000, 'gain': -6.0},
        'delay': {'kind': 'delay', 'time': 60 / BPM * 0.75, 'fb': 0.28, 'lp': 4500, 'hp': 500, 'pingpong': True, 'gain': -7.0},
    },
    'master': {'comp': {'thr': -16, 'ratio': 2, 'att_ms': 30, 'rel_ms': 200, 'knee': 8}, 'lufs': -12.0, 'ceiling': -1.0, 'clip': 1.5},
}

if __name__ == '__main__':
    from studio.produce import produce
    produce(sys.modules[__name__])
