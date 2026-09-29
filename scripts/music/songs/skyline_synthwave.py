# Skyline Circuit, candidate A (track skyline-circuit): synthwave / outrun for the sky-island finale, sunset to
# starlight. C minor with the anthem in its relative E-flat, 152 bpm. A pulsing sixteenth-note synth bass under
# four-on-the-floor kick and a gated-reverb snare, 1980s tom fills, a supersaw lead on the anthem, pluck arpeggios,
# wide pads, an overdriven guitar in the drive section, risers and impacts into each section.
# Every note is written by hand here; studio/ only plays and mixes it.
#
# Form (bars): intro 4 (pads and arpeggio under a filter sweep, a riser, the pickup bar) | loop 48:
#   A 8 (the anthem on the supersaw lead) | A' 8 (the answer, the lead an octave up, chords pumping)
#   B 8 (the drive: guitar riff over the bass pulse) | C 8 (starlight: half-time, the bridge melody in G-flat)
#   D 4 (the build: snare rush, riser) | A'' 12 (the anthem with everything, a tag, the pickup bar = the intro's last)
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from studio.score import Song, seq, grid, chords, Note
from studio.arrange import comp, pad, shift, drum_fill
from studio import instruments as _I

SLOT, CANDIDATE = 'skyline-circuit', 'a-synthwave'
STYLE = 'synthwave / outrun: pulsing synth bass, four-on-the-floor with a big dry snare and tom fills, supersaw lead, pluck arpeggios, wide pads, a synth solo in the drive'
FORM = ['intro 4 (pads, arpeggio filter sweep, riser, pickup bar)', 'A 8 anthem (supersaw lead)', "A' 8 answer (lead up an octave)",
        'B 8 drive (a stab riff and a synth solo over the bass pulse)', 'C 8 starlight bridge in G-flat (half-time)', 'D 4 build',
        "A'' 12 anthem with everything + tag, pickup bar (= intro's last bar)"]

BPM, INTRO, LOOP = 152, 4, 48
A0, A1, B0, C0, D0, A2 = 4, 12, 20, 28, 36, 40

PROG = {
    'intro': 'Cm | Ab | Eb | Bb',
    'A': 'Cm | Ab | Eb | Bb | Cm | Ab | Fm9 | Bb7sus4 Bb',
    "A'": 'Cm | Ab | Eb | Bb | Fm9 | G7 | Cm Ab | Fm7 G7',
    'B': 'Cm | Cm | Abmaj7 | Abmaj7 | Fm | G7 | Cm | Ab Bb',
    'C': 'Gbmaj7 | Ebm7 | Cbmaj7 | Db | Gbmaj7 | Bbm7 | Cbmaj7 | Abm7 Bb',
    'D': 'Ab | Ab | Bb | Bb',
    "A''": 'Cm | Ab | Eb | Bb | Cm | Ab | Fm9 | Bb7sus4 Bb | Ab Bb | Gm7 Cm | Fm7 Bb7sus4 | Eb Bb',
}
SECTIONS = [('intro', INTRO), ('A', 8), ("A'", 8), ('B', 8), ('C', 8), ('D', 4), ("A''", 12)]

ANTHEM = [
    "Bb4:8 Eb5:4. F5:8t G5:8t Ab5:8t Bb5:4~", "Bb5:4 Ab5:8 G5:8 F5:4 D5:4",
    "Eb5:8 G5:4. C6:8t Bb5:8t Ab5:8t G5:4", "G5:2. Eb5:4",
    "Bb4:8 Eb5:4. F5:8t G5:8t Ab5:8t Bb5:4~", "Bb5:4 C6:8 Bb5:8 Ab5:4 Eb5:4",
    "F5:8 Ab5:4. C6:8t Bb5:8t Ab5:8t G5:4", "F5:2 D5:4 Bb4:4",
]
ANSWER = [
    "Bb4:8 Eb5:4. F5:8t G5:8t Ab5:8t Bb5:4~", "Bb5:4 C6:8 Bb5:8 Ab5:4 F5:4",
    "Eb5:8 G5:4. C6:8t Bb5:8t Ab5:8t G5:4", "Ab5:2. G5:4",
    "F5:8 Ab5:4. C6:8t Bb5:8t Ab5:8t F5:4", "G5:4. F5:8 D5:4 B4:4",
    "C5:8 Eb5:8 G5:8 C6:8 Ab5:4 Eb5:4", "F5:4 Ab5:4 G5:4 B4:4",
]
RIFF = "C3:8 C3:8 G3:8 C3:8 Bb2:8 C3:8 Eb3:8 F3:8"   # the drive's guitar riff (power chords on these roots)
GTR_LEAD = ["C5:4. D5:8 Eb5:4 G5:4", "F5:4. Eb5:8 D5:2", "Eb5:4. F5:8 G5:4 Ab5:4", "Bb5:4. Ab5:8 G5:2!vib",
            "Ab5:4. G5:8 F5:4 C6:4", "B5:2 D6:4 F5:4", "Eb5:2 D5:4 C5:4", "C5:4 Eb5:4 F5:4 D5:4"]
STAR = ["F5:2. Db5:4", "Gb5:4. F5:8 Db5:4 Bb4:4", "Eb5:2. Gb5:4", "F5:2 Ab5:4 Cb6:4",
        "Bb5:2. Ab5:4", "Db6:4. Bb5:8 Ab5:4 F5:4", "Gb5:2 Eb5:4 Bb4:4", "Cb5:4 Eb5:4 D5:4 F5:4"]
TAG = ["C6:4. Bb5:8 Bb5:4. Ab5:8", "G5:4. F5:8 G5:4 Bb5:4", "Ab5:2 F5:4 Bb5:4"]
PICKUP = "Eb5:4^ r:4 F4:8t G4:8t Ab4:8t Bb4:8t C5:8t D5:8t"


def lines(parts, t0):
    """Notes of consecutive one-bar lines from beat t0, read as one line (ties carry across bar lines, and every
    bar is checked to be four beats long)."""
    ns, _ = seq(' | '.join(parts), t0)
    return ns


def at(bar):
    return 4.0 * bar


def compose():
    s = Song('Skyline Circuit (synthwave)', 'skyline-circuit', BPM, 'C minor / E-flat major', INTRO, LOOP, seed=71)
    P = {}
    P['lead'] = s.part('lead', 'sw_lead', lag_ms=0, jitter_ms=1.5, mono=True)
    P['lead2'] = s.part('lead2', 'sw_lead2', lag_ms=0, jitter_ms=1.5, mono=True)
    P['bass'] = s.part('bass', 'sw_bass', jitter_ms=1.0)
    P['arp'] = s.part('arp', 'sw_arp', jitter_ms=1.0)
    P['pad'] = s.part('pad', 'sw_pad', jitter_ms=2)
    P['chords'] = s.part('chords', 'sw_chords', jitter_ms=2)
    P['gtr'] = s.part('gtr', 'guitar', jitter_ms=3)
    P['gtrlead'] = s.part('gtrlead', 'guitar', jitter_ms=3, mono=True)
    P['bell'] = s.part('bell', 'sw_bell', jitter_ms=2)
    P['edrums'] = s.part('edrums', 'edrums', jitter_ms=1.0, vel_jitter=0.04)
    P['drums'] = s.part('drums', 'kit', jitter_ms=2.5, vel_jitter=0.05)

    prog = {}
    t = 0.0
    for name, bars in SECTIONS:
        prog[name] = chords(PROG[name], t)
        t += 4 * bars
    allp = sum(prog.values(), [])
    s.prog = allp

    def chord(tt):
        return [c for c in allp if c[0] - 1e-9 <= tt + 0.01 < c[0] + c[1] - 1e-9][0][2]

    def pulse_bass(bar0, nbars, vel=0.8, half=False):
        """The synthwave engine: sixteenth-note root pulses, the octave on the last of each four."""
        out = []
        for b in range(nbars):
            for k in range(16):
                if half and k % 2:
                    continue
                tt = at(bar0 + b) + 0.25 * k
                r = 36 + ((chord(tt).bass - 36) % 12)
                p = r + 12 if k % 4 == 3 else r
                out.append(Note(tt, 0.22, p, vel * (1.0 if k % 4 == 0 else 0.78)))
        return out

    def arp(bar0, nbars, lo=63, hi=84, vel=0.55, pattern=(0, 1, 2, 3, 2, 1, 2, 3)):
        out = []
        for b in range(nbars):
            for k in range(16):
                tt = at(bar0 + b) + 0.25 * k
                tones = chord(tt).tones(lo, hi)[:4]
                p = tones[pattern[k % len(pattern)] % len(tones)]
                out.append(Note(tt, 0.2, p, vel * (1.0 if k % 4 == 0 else 0.8)))
        return out

    def four_floor(bar0, nbars, open_hats=True, snare=True):
        for b in range(nbars):
            bar = bar0 + b
            P['edrums'].add(grid('x...x...x...x...', 'kick', at(bar), vels={'x': 0.95}))
            if snare:
                P['drums'].add(grid('....X.......X...', 'rim', at(bar), vels={'X': 0.9}))
                P['edrums'].add(grid('....x.......x...', 'clap', at(bar), vels={'x': 0.7}))
            P['drums'].add(grid('xgxgxgxgxgxgxgxg', 'hhc', at(bar), vels={'x': 0.55, 'g': 0.35}))
            if open_hats:
                P['drums'].add(grid('..o...o...o...o.', 'hho', at(bar), vels={'o': 0.4}))

    def lead(notes, octave2=False):
        P['lead'].add(notes)
        if octave2:
            P['lead2'].add(shift(notes, 0, 12, vel=0.8))

    # ---------------------------------------------------------------- intro
    P['pad'].add(pad(prog['intro'], 55, 70, n=4, vel=0.55))
    P['arp'].add([n.copy(v=n.v * (0.4 + 0.6 * (n.t / 12))) for n in arp(0, 3)])
    P['bass'].add(pulse_bass(2, 1, vel=0.6, half=True))
    P['edrums'].add([Note(at(1), 8.0, 'rise', 0.8)])
    P['drums'].add(grid('................|................|....x.......x.xx', 'snare', 0, vels={'x': 0.5}) +
                   grid('................|................|xgxgxgxgxgxgxgxg', 'hhc', 0, vels={'x': 0.4, 'g': 0.25}))

    def pickup(bar):
        pk = lines([PICKUP], at(bar))
        P['lead'].add(pk)
        P['chords'].add(lines(["[Eb4 G4 Bb4]:4^ r:4 r:2"], at(bar)))
        P['bass'].add(lines(["Eb2:4^ r:4 Bb1:8 Bb1:8 Bb1:8 Bb1:8"], at(bar)))
        P['pad'].add(lines(["r:2 [F4 Bb4 D5]:2"], at(bar)))
        P['edrums'].add(grid('x...............', 'kick', at(bar)) + [Note(at(bar), 2, 'impact', 0.7), Note(at(bar) + 2, 2.0, 'rise', 0.6)])
        P['drums'].add(grid('x...............', 'crash', at(bar)) + grid('........x.x.x.x.', 'tomh', at(bar), vels={'x': 0.75}) +
                       grid('.........x.x.x.x', 'toml', at(bar), vels={'x': 0.8}))
    pickup(INTRO - 1)
    pickup(A2 + 11)
    s.twin(INTRO - 1, A2 + 11)

    # ---------------------------------------------------------------- A and A'
    lead(lines(ANTHEM, at(A0)))
    lead(lines(ANSWER, at(A1)), octave2=True)
    for bar0 in (A0, A1):
        P['bass'].add(pulse_bass(bar0, 8))
        P['arp'].add(arp(bar0, 8, vel=0.45))
        P['pad'].add(pad(prog['A' if bar0 == A0 else "A'"], 55, 70, n=4, vel=0.5))
        four_floor(bar0, 8)
    P['chords'].add(comp(prog["A'"], '..x...x...x...x.', 58, 72, n=3, vel=0.55, dur=0.35))
    P['drums'].add(grid('x...............', 'crash', at(A0)) + grid('x...............', 'crash', at(A1)))
    P['edrums'].add([Note(at(A0), 2, 'impact', 0.8), Note(at(A1) - 4, 4.0, 'rise', 0.5)])

    # ---------------------------------------------------------------- B: the drive
    for b in range(8):
        tt = at(B0 + b)
        root = 41 + ((chord(tt).bass - 41) % 12)
        riff = shift(lines([RIFF], tt), 0, root - 48)
        for n in riff:
            P['chords'].add([n.copy(p=n.p + 12, d=0.3), n.copy(p=n.p + 19, d=0.3), n.copy(p=n.p + 24, d=0.3)])
    P['lead2'].add([n.copy(art=n.art | ({'bend'} if n.d >= 1 else set()), x={'bend': 1.0}) for n in lines(GTR_LEAD, at(B0))])
    P['bass'].add(pulse_bass(B0, 8))
    P['arp'].add(arp(B0, 8, lo=60, hi=79, vel=0.4))
    for b in range(8):
        P['edrums'].add(grid('x...x...x...x...', 'kick', at(B0 + b), vels={'x': 0.95}))
        P['drums'].add(grid('....X.......X...', 'rim', at(B0 + b), vels={'X': 0.95}) + grid('x.x.x.x.x.x.x.x.', 'ride', at(B0 + b), vels={'x': 0.45}))
        P['edrums'].add(grid('....x.......x...', 'clap', at(B0 + b), vels={'x': 0.7}))
    P['drums'].add(grid('x...............', 'crash', at(B0)) + grid('x...............', 'crash', at(B0 + 4)))

    # ---------------------------------------------------------------- C: starlight (half-time)
    lead(lines(STAR, at(C0)))
    P['pad'].add(pad(prog['C'], 54, 70, n=4, vel=0.6))
    for (st, d, ch) in prog['C']:
        tones = ch.tones(66, 90)
        for k in range(int(d / 0.5)):
            P['bell'].add(Note(st + 0.5 * k, 0.4, tones[(k * 3) % len(tones)], 0.4))
    for b in range(8):
        P['edrums'].add(grid('x.........x.....', 'kick', at(C0 + b), vels={'x': 0.9}))
        P['drums'].add(grid('........X.......', 'rim', at(C0 + b), vels={'X': 0.9}) + grid('x.x.x.x.x.x.x.x.', 'hhc', at(C0 + b), vels={'x': 0.4}))
        P['edrums'].add(grid('........x.......', 'clap', at(C0 + b), vels={'x': 0.7}))
        tt = at(C0 + b)
        r = 36 + ((chord(tt).bass - 36) % 12)
        P['bass'].add([Note(tt, 1.9, r, 0.75), Note(tt + 2, 1.9, 36 + ((chord(tt + 2).bass - 36) % 12), 0.7)])

    # ---------------------------------------------------------------- D: the build
    P['bass'].add(pulse_bass(D0, 4, vel=0.7))
    P['arp'].add([n.copy(v=0.35 + 0.4 * (n.t - at(D0)) / 16) for n in arp(D0, 4)])
    P['pad'].add(pad(prog['D'], 55, 72, n=4, vel=0.55))
    P['drums'].add(grid('x...x...x...x...|x.x.x.x.x.x.x.x.|xxxxxxxxxxxxxxxx|xxxxxxxxxxxxxxxx', 'snare', at(D0), vels={'x': 0.5}))
    P['edrums'].add(grid('x...x...x...x...|x...x...x...x...|x...x...x...x...|x.x.x.x.x.x.x.x.', 'kick', at(D0), vels={'x': 0.85}))
    P['edrums'].add([Note(at(D0), 16.0, 'rise', 0.9)])

    # ---------------------------------------------------------------- A'': the anthem with everything
    an = lines(ANTHEM + TAG, at(A2))
    lead(an, octave2=True)
    P['chords'].add(comp(prog["A''"][:-2], '..x...x...x...x.', 58, 72, n=3, vel=0.6, dur=0.35))
    P['bass'].add(pulse_bass(A2, 11))
    P['arp'].add(arp(A2, 11, vel=0.45))
    P['pad'].add(pad(prog["A''"][:-2], 55, 70, n=4, vel=0.55))
    four_floor(A2, 11)
    for bar in (A2, A2 + 4, A2 + 8):
        P['drums'].add(grid('x...............', 'crash', at(bar)))
        P['edrums'].add([Note(at(bar), 2, 'impact', 0.7)])
    for bar, style in [(A0 + 3, 'toms'), (A0 + 7, 'toms'), (A1 + 3, 'down'), (A1 + 7, 'toms'), (A2 + 3, 'toms'), (A2 + 7, 'down')]:
        drum_fill(P['drums'], bar, style, beats=1)
    return s


def _instruments():
    from studio import modern
    _I.RACK['sw_lead'] = lambda: modern.Supersaw(voices=7, detune=18, spread=0.7, cutoff=2600, env_amt=5500, env_decay=0.25, res=0.15,
                                                   attack=0.003, decay=0.5, sustain=0.8, release=0.18, gain_db=-11, vib=(5.2, 0.12, 0.35))
    _I.RACK['sw_lead2'] = lambda: modern.Supersaw(voices=3, detune=10, spread=0.4, cutoff=3500, env_amt=3000, env_decay=0.2, release=0.15, gain_db=-17)
    _I.RACK['sw_bass'] = lambda: modern.Pluck(gain_db=-7, cutoff=380, env_amt=2600, env_decay=0.07, decay=0.22, release=0.03, detune=6, res=0.2, square=0.3)
    _I.RACK['sw_arp'] = lambda: modern.Pluck(gain_db=-15, cutoff=1400, env_amt=5000, env_decay=0.06, decay=0.18, release=0.05, detune=10, res=0.1, square=0.5)
    _I.RACK['sw_pad'] = lambda: modern.Pad(gain_db=-15, cutoff=1900, attack=0.35, release=0.9, voices=5, detune=14, air=0.02)
    _I.RACK['sw_chords'] = lambda: modern.Supersaw(voices=5, detune=16, spread=0.9, cutoff=2200, env_amt=2500, env_decay=0.15, decay=0.25, sustain=0.4,
                                                     release=0.12, gain_db=-17)
    _I.RACK['sw_bell'] = lambda: modern.Bell(gain_db=-20, ratio=3.5, index=1.6, decay=0.9)


_instruments()

MIX = {
    'tracks': {
        'lead': {'pan': 0.0, 'gain': -1.0, 'eq': [('hp', 200), ('peak', 3000, 1.0, 1.5)], 'sends': {'hall': -9, 'delay': -12}},
        'lead2': {'pan': 0.0, 'gain': -4.0, 'width': 1.5, 'eq': [('hp', 400)], 'sends': {'hall': -9}},
        'bass': {'gain': 0.0, 'eq': [('hp', 30), ('peak', 70, 1.0, 2.0)], 'comp': {'thr': -18, 'ratio': 3, 'att_ms': 5, 'rel_ms': 60},
                 'duck': {'by': 'edrums.kick', 'depth_db': 5.0, 'rel_ms': 120}},
        'arp': {'pan': 0.2, 'gain': -4.0, 'width': 1.6, 'eq': [('hp', 300)], 'sends': {'delay': -8, 'hall': -12}, 'duck': {'by': 'edrums.kick', 'depth_db': 4.0}},
        'pad': {'gain': -3.0, 'width': 1.5, 'eq': [('hp', 180), ('lp', 7000)], 'sends': {'hall': -8}, 'duck': {'by': 'edrums.kick', 'depth_db': 6.0, 'rel_ms': 180}},
        'chords': {'gain': -4.0, 'width': 1.4, 'eq': [('hp', 250)], 'sends': {'hall': -10}, 'duck': {'by': 'edrums.kick', 'depth_db': 5.0}},
        'gtr': {'pan': -0.4, 'gain': -8.0, 'amp': {'drive_db': 26.0}, 'sends': {'room': -12}},
        'gtrlead': {'pan': 0.25, 'gain': -6.0, 'amp': {'drive_db': 22.0, 'tone': 1.5}, 'sends': {'delay': -8, 'hall': -10}},
        'bell': {'pan': -0.3, 'gain': -8.0, 'eq': [('hp', 800)], 'sends': {'delay': -6, 'hall': -6}},
        'edrums.kick': {'bus': 'drums', 'gain': 0.0, 'eq': [('peak', 55, 1.0, 2.0), ('peak', 300, 1.2, -3.0)], 'comp': {'thr': -14, 'ratio': 4, 'att_ms': 3, 'rel_ms': 60}},
        'edrums.snare': {'bus': 'drums', 'gain': -6.0, 'eq': [('hp', 300)]},
        'edrums.hats': {'bus': 'drums', 'gain': -10.0},
        'edrums.fx': {'gain': -8.0, 'width': 1.5, 'sends': {'hall': -8}},
        'drums.kick': {'bus': 'drums', 'gain': -30.0},
        'drums.snare': {'bus': 'drums', 'gain': -2.0, 'eq': [('hp', 120), ('peak', 220, 1.0, 2.0), ('highshelf', 6000, 0.7, 3.0)],
                        'comp': {'thr': -18, 'ratio': 4, 'att_ms': 5, 'rel_ms': 80}},
        'drums.oh': {'bus': 'drums', 'gain': -4.0, 'eq': [('hp', 400), ('highshelf', 9000, 0.7, 3.0)]},
        'drums.room': {'bus': 'drums', 'gain': -12.0, 'eq': [('hp', 200)], 'comp': {'thr': -26, 'ratio': 6, 'att_ms': 2, 'rel_ms': 120}},
    },
    'buses': {
        'drums': {'gain': 0.0, 'comp': {'thr': -12, 'ratio': 3, 'att_ms': 8, 'rel_ms': 90, 'mix': 0.6}, 'sat': 2.0},
    },
    'fx': {
        'gated': {'kind': 'gated', 'length': 0.24, 'hp': 300, 'lp': 9000, 'gain': -6.0},
        'hall': {'ir': '2.0s_Space Reverb', 'predelay': 25, 'hp': 400, 'lp': 11000, 'gain': -4.0},
        'room': {'ir': '1.5s_Perc Room A', 'predelay': 5, 'hp': 350, 'lp': 9000, 'gain': -6.0},
        'delay': {'kind': 'delay', 'time': 60 / BPM * 0.75, 'fb': 0.35, 'lp': 5000, 'hp': 500, 'pingpong': True, 'gain': -6.0},
    },
    'master': {'comp': {'thr': -14, 'ratio': 2, 'att_ms': 20, 'rel_ms': 150, 'knee': 8}, 'lufs': -11.5, 'ceiling': -1.0, 'clip': 2.0,
               'target': [-14.0, -6.5, -7.5, -9.5, -10.0, -10.5, -11.5, -15.0, -19.5]},
}


def shorts():
    """Course-intro pieces: 6.0 s (a riser under the pads and arpeggio, the anthem's triplet into a held E-flat with
    an impact at 3.2 s) and 2.5 s (the triplet run into an impact hit at 0.8 s)."""
    out = {}
    s = Song('Skyline Circuit (synthwave) - course intro', 'skyline-circuit', BPM, 'E-flat major', 3, 0, seed=72, tail_bars=0)
    s.about = "pads and arpeggio under a riser, the anthem's triplet on the supersaw lead, a held E-flat chord with an impact"
    P = {k: s.part(k, i, jitter_ms=1.5, mono=(k == 'lead')) for k, i in (('lead', 'sw_lead'), ('pad', 'sw_pad'), ('arp', 'sw_arp'),
                                                                         ('bass', 'sw_bass'), ('chords', 'sw_chords'), ('edrums', 'edrums'))}
    P['drums'] = s.part('drums', 'kit', jitter_ms=2)
    pr = chords('Cm | Ab Bb | Eb', 0)
    P['pad'].add(pad(pr, 55, 70, n=4, vel=0.55))
    for k in range(32):
        tt = 0.25 * k
        ch = [c for c in pr if c[0] - 1e-9 <= tt + 0.01 < c[0] + c[1] - 1e-9][0][2]
        tones = ch.tones(63, 84)[:4]
        P['arp'].add(Note(tt, 0.2, tones[[0, 1, 2, 3, 2, 1, 2, 3][k % 8] % len(tones)], 0.3 + 0.3 * k / 32))
    P['lead'].add(lines(["r:2 F5:8t G5:8t Ab5:8t Bb5:4", "C6:2 Bb5:8t Ab5:8t G5:8t F5:4", "G5:2 r:2"], 0))
    P['chords'].add(lines(["r:1", "r:1", "[Eb4 G4 Bb4 Eb5]:2"], 0))
    P['bass'].add(lines(["r:1", "Ab1:8 Ab1:8 Ab1:8 Ab1:8 Bb1:8 Bb1:8 Bb1:8 Bb1:8", "Eb2:2"], 0))
    P['edrums'].add([Note(0, 8.0, 'rise', 0.8), Note(8, 2, 'impact', 0.9), Note(8, 1, 'kick', 1.0)])
    P['drums'].add(grid('................|....x.......xxxx|x...............', 'snare', 0, vels={'x': 0.6}) + grid('................|................|x...............', 'crash', 0))
    out['intro-6s'] = (s, 6.0, 8)
    s = Song('Skyline Circuit (synthwave) - course intro short', 'skyline-circuit', BPM, 'E-flat major', 2, 0, seed=73, tail_bars=0)
    s.about = 'the pulse bass and a tom fill under a riser, into a C minor hit with an impact'
    P = {k: s.part(k, i, jitter_ms=1.5, mono=(k == 'lead')) for k, i in (('lead', 'sw_lead'), ('pad', 'sw_pad'), ('chords', 'sw_chords'),
                                                                         ('bass', 'sw_bass'), ('arp', 'sw_arp'), ('edrums', 'edrums'))}
    P['drums'] = s.part('drums', 'kit', jitter_ms=2)
    P['bass'].add([Note(0.25 * k, 0.22, 36 + (12 if k % 4 == 3 else 0), 0.8 if k % 4 == 0 else 0.65) for k in range(8)] + [Note(2, 1.5, 36, 0.9)])
    P['arp'].add([Note(0.25 * k, 0.2, [60, 63, 67, 72][k % 4], 0.35 + 0.05 * k) for k in range(8)])
    P['lead'].add([Note(2, 1.5, 79, 0.85)])
    P['chords'].add([Note(2, 1.5, p, 0.8) for p in (60, 63, 67, 72)])
    P['pad'].add([Note(2, 2.0, p, 0.6) for p in (55, 60, 63)])
    P['edrums'].add([Note(0, 2.0, 'rise', 0.6), Note(2, 2, 'impact', 0.9), Note(2, 1, 'kick', 1.0)])
    P['drums'].add(grid('....x.x.x.x.....', 'tomh', 0, vels={'x': 0.7}) + grid('.....x.x.x.x....', 'toml', 0, vels={'x': 0.75}) +
                   grid('........x.......', 'crash', 0) + grid('x.x.x.x.........', 'hhc', 0, vels={'x': 0.5}))
    out['intro-2s'] = (s, 2.5, 2)
    return out


if __name__ == '__main__':
    from studio.produce import produce
    produce(sys.modules[__name__])
