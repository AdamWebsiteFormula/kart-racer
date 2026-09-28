# The instrument rack: every playable instrument by name, built from the fetched libraries (see fetch.py for
# their sources and licenses) or from code (synths.py). Built lazily and cached.
import functools, os
from . import samples as S
from .render import SampleInst, KitInst, PercInst
from . import synths

R = S.ROOT


def _bank(name, zones, **kw):
    return S.Bank(name, zones, **kw)


def _vsco(folder, art='sus', **kw):
    return S.vsco(folder, art=art, **kw)


@functools.lru_cache(None)
def get(name):
    f = RACK.get(name)
    if f is None:
        raise KeyError(f'no instrument {name!r}; have {sorted(RACK)}')
    return f()


def _trumpet(mute=None):
    if mute == 'harmon':
        zs = _vsco('Brass/Trumpet/harmonM-sus')
    elif mute == 'straight':
        zs = _vsco('Brass/Trumpet/straightM-sus')
    else:
        zs = _vsco('Brass/Trumpet/sus') + _vsco('Brass/Trumpet/stac', 'stac') + _vsco('Brass/Trumpet/susvib', 'vib')
    return SampleInst(_bank('trumpet', zs), release=0.09, veltrack_db=14, legato_skip=0.05, stac_len=0.16, fall_st=9, bright=(2500, 16000))


def _trombone():
    zs = _vsco('Brass/Tenor Trombone/sus') + _vsco('Brass/Tenor Trombone/stac', 'stac') + _vsco('Brass/Tenor Trombone/vib', 'vib')
    zs += [z for z in _vsco('Brass/OldTrombone/Fall', 'fall')]
    return SampleInst(_bank('trombone', zs), release=0.1, veltrack_db=14, legato_skip=0.05, stac_len=0.18, fall_st=7, bright=(1800, 14000))


def _horn():
    zs = _vsco('Brass/F Horn/sus') + _vsco('Brass/F Horn/stac', 'stac')
    return SampleInst(_bank('horn', zs), release=0.16, veltrack_db=14, legato_skip=0.06, stac_len=0.2)


def _tuba():
    zs = _vsco('Brass/Tuba/sus') + _vsco('Brass/Tuba/stac', 'stac')
    return SampleInst(_bank('tuba', zs), release=0.1, veltrack_db=12, stac_len=0.2)


def _alto(transpose_as=0):
    base = os.path.join(R, 'karoryfer.weresax', 'Programs')
    zs = S.from_sfz(os.path.join(base, 'alto_map_forte_condenser.sfz')) + S.from_sfz(os.path.join(base, 'alto_map_piano_condenser.sfz'))
    S.retune(zs)
    return SampleInst(_bank('alto', zs), release=0.08, veltrack_db=14, legato_skip=0.05, stac_len=0.14, fall_st=7,
                      vib={'depth': 0.0}, bright=(2200, 15000))


def _bari():
    base = os.path.join(R, 'karoryfer.bear-sax', 'Programs')
    zs = []
    for f, art in (('dynfade_map.sfz', 'sus'), ('staccato_map.sfz', 'stac'), ('growl_map.sfz', 'growl'), ('sub_map.sfz', 'sub')):
        for z in S.from_sfz_root(os.path.join(base, 'poly', f), base, art=art):
            if art == 'sus':
                z.vlo, z.vhi = (0, 63) if z.path.endswith('_p.wav') else (64, 127)
            zs.append(z)
    S.retune([z for z in zs if z.art in ('sus', 'stac')])
    return SampleInst(_bank('bari', zs), release=0.09, veltrack_db=12, legato_skip=0.06, stac_len=0.16)


def _ebass():
    base = os.path.join(R, 'karoryfer.growlybass')
    sus = [z for z in S.from_sfz(os.path.join(base, 'growlybass_clean.sfz')) if '/sustain/' in z.path]
    stac = [z for z in S.from_sfz(os.path.join(base, 'growlybass_vicious.sfz'), art='stac') if '/staccato/' in z.path]
    zs = S.retune(sus + stac)
    return SampleInst(_bank('ebass', zs, level_span=0.3), release=0.05, veltrack_db=10, stac_len=0.12, attack_ms=1.0)


def _upright():
    zs = _vsco('Strings/Solo Contrabass/Pizz')
    return SampleInst(_bank('upright', zs, level_span=0.3), release=0.08, veltrack_db=10, attack_ms=1.0)


def _guitar():
    base = os.path.join(R, 'karoryfer.black-and-green-guitars', 'Programs')
    zs = S.from_sfz_root(os.path.join(base, 'modules', 'maps_green', 'ord.sfz'), base) + \
        S.from_sfz_root(os.path.join(base, 'modules', 'maps_green', 'stac.sfz'), base, art='stac')
    S.retune(zs)
    return SampleInst(_bank('guitar', zs, level_span=0.3), release=0.08, veltrack_db=10, stac_len=0.1, attack_ms=1.0)


def _banjo():
    zs = S.retune(S.from_sfz(os.path.join(R, 'ganjo', 'ganjo.sfz')))
    return SampleInst(_bank('banjo', zs, level_span=0.25), release=0.1, veltrack_db=10, attack_ms=0.5)


def _steel():
    zs = S.retune(S.from_sfz(os.path.join(R, 'jlearman.SteelDrum', 'jSteelDrum.sfz')))
    return SampleInst(_bank('steel', zs, level_span=0.3), release=0.3, veltrack_db=12, attack_ms=0.5)


def _piano():
    return SampleInst(_bank('piano', S.retune(S.upright_piano()), level_span=0.4), release=0.25, veltrack_db=16, attack_ms=0.5)


def _strings(sec):
    folders = {
        'violins': ('Strings/Violin Section/susVib', 'Strings/Violin Section/Spic', 'Strings/Violin Section/Pizz'),
        'violas': ('Strings/Viola Section/susvib', 'Strings/Viola Section/spic', 'Strings/Viola Section/pizz'),
        'celli': ('Strings/Cello Section/susvib', 'Strings/Cello Section/spic', 'Strings/Cello Section/pizzT'),
    }[sec]
    zs = _vsco(folders[0]) + _vsco(folders[1], 'stac') + _vsco(folders[2], 'pizz')
    return SampleInst(_bank(sec, zs), release=0.25, veltrack_db=14, legato_skip=0.08, legato_xf=0.06, stac_len=0.2, attack_ms=4)


def _pizz(sec):
    folder = {'violins': 'Strings/Violin Section/Pizz', 'violas': 'Strings/Viola Section/pizz', 'celli': 'Strings/Cello Section/pizzT'}[sec]
    return SampleInst(_bank(sec + '-pizz', _vsco(folder), level_span=0.25), release=0.1, veltrack_db=12, attack_ms=0.5)


def _fiddle():
    zs = _vsco('Strings/Solo Violin/Arco Vib') + _vsco('Strings/Solo Violin/spic', 'stac')
    return SampleInst(_bank('fiddle', zs), release=0.12, veltrack_db=12, legato_skip=0.06, legato_xf=0.04, stac_len=0.14, attack_ms=3)


def _wind(folder_sus, folder_stac=None, name='wind', **kw):
    zs = _vsco(folder_sus) + (_vsco(folder_stac, 'stac') if folder_stac else [])
    return SampleInst(_bank(name, zs), release=0.1, veltrack_db=12, legato_skip=0.05, stac_len=0.14, **kw)


def _mallet(folder, name, release=0.6, octave=None):
    return SampleInst(_bank(name, _vsco(folder, octave=octave), level_span=0.25), release=release, veltrack_db=12, attack_ms=0.3, loop_long=False)


def _kit():
    return KitInst(S.kit_zones())


def _perc(name, mic='close', **kw):
    return PercInst(S.perc_zones(name, mic), **kw)


RACK = {
    'trumpet': _trumpet,
    'trumpet_harmon': lambda: _trumpet('harmon'),
    'trumpet_straight': lambda: _trumpet('straight'),
    'trombone': _trombone,
    'horn': _horn,
    'tuba': _tuba,
    'alto': _alto,
    'bari': _bari,
    'ebass': _ebass,
    'upright': _upright,
    'guitar': _guitar,
    'banjo': _banjo,
    'steel': _steel,
    'piano': _piano,
    'violins': lambda: _strings('violins'),
    'violas': lambda: _strings('violas'),
    'celli': lambda: _strings('celli'),
    'violins_pizz': lambda: _pizz('violins'),
    'celli_pizz': lambda: _pizz('celli'),
    'fiddle': _fiddle,
    'flute': lambda: _wind('Woodwinds/Flute/susNV', 'Woodwinds/Flute/stac', 'flute'),
    'flute_vib': lambda: _wind('Woodwinds/Flute/susvib', 'Woodwinds/Flute/stac', 'flute_vib'),
    'piccolo': lambda: _wind('Woodwinds/Piccolo/Sus', 'Woodwinds/Piccolo/Stac', 'piccolo'),
    'clarinet': lambda: _wind('Woodwinds/Clarinet/susLong', 'Woodwinds/Clarinet/stac', 'clarinet'),
    'oboe': lambda: _wind('Woodwinds/Oboe/Sus', 'Woodwinds/Oboe/Stacc', 'oboe'),
    'glock': lambda: _mallet('Percussion/Glock', 'glock', 0.8, octave=0),
    'xylo': lambda: _mallet('Percussion/Xylo', 'xylo', 0.4),
    'marimba': lambda: _mallet('Percussion/Marimba', 'marimba', 0.5),
    'harp': lambda: _mallet('Strings/Harp', 'harp', 1.2),
    'kit': _kit,
    'tamb': lambda: _perc('tambourine'),
    'shaker': lambda: _perc('shaker'),
    'conga': lambda: _perc('conga'),
    'tumba': lambda: _perc('tumba'),
    'bongo_h': lambda: _perc('bongoh'),
    'bongo_l': lambda: _perc('bongol'),
    'cowbell': lambda: _perc('cowbell'),
    'claves': lambda: _perc('claves'),
    'guiro': lambda: _perc('guiro'),
    'sleigh': lambda: _perc('sleighbells'),
    'triangle': lambda: _perc('triangle'),
    'agogo': lambda: _perc('agogo'),
    'cabasa': lambda: _perc('cabasa'),
    'vibraslap': lambda: _perc('vibraslap'),
    'belltree': lambda: _perc('belltree'),
    'timpani': lambda: SampleInst(_bank('timpani', S.timpani_zones(), normalize=False), release=0.8, veltrack_db=14, attack_ms=0.3, loop_long=False),
    'cymbals': lambda: PercInst(S.file_zones('VSCO 1 Percussion/varMetal/Cymbals/clash', {'clash': r'crash_hit_'}) +
                                S.file_zones('VSCO 1 Percussion/varMetal/Cymbals/susp', {'susp': r'susp_hit_softmall_(p|mp|f|ff)\.wav', 'swell': r'roll2_cresc',
                                                                                          'roll': r'roll3_ff'})),
    'bassdrum': lambda: PercInst(S.file_zones('Percussion', {'hit': r'BDrumNewhit'})),
    'chimes': lambda: SampleInst(_bank('chimes', S.retune(S.vsco('Percussion', pattern=r'TB_hit', octave=0)), level_span=0.3), release=1.5,
                                 veltrack_db=10, attack_ms=0.3, loop_long=False),
    'clap': lambda: PercInst(S.body_zones('handclap')),
    'snap': lambda: PercInst(S.body_zones('snap_l') + S.body_zones('snap_r')),
    'stomp': lambda: PercInst(S.body_zones('stomp_l') + S.body_zones('stomp_r')),
    'woodblock': lambda: _perc('woodblock', 'oh'),
    'timbales': lambda: _perc('timbales', 'oh'),
    'organ': lambda: synths.Organ(),
    'epiano': lambda: synths.EPiano(),
    'clav': lambda: synths.Clav(),
    'synthbass': lambda: synths.SynthBass(),
    'lead': lambda: synths.Lead(),
    'calliope': lambda: synths.Calliope(),
    'riser': lambda: synths.Riser(),
    'supersaw': lambda: _modern().Supersaw(),
    'reese': lambda: _modern().Reese(),
    'sub': lambda: _modern().SubBass(),
    'pluck': lambda: _modern().Pluck(),
    'pad': lambda: _modern().Pad(),
    'bell': lambda: _modern().Bell(),
    'edrums': lambda: _modern().DrumSynth(),
}


def _modern():
    from . import modern
    return modern


def custom(name, factory):
    """Register an instrument variant for one song (a differently voiced organ, a darker synth)."""
    RACK[name] = factory
    get.cache_clear()
