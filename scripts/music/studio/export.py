# Files out: the performance as a Standard MIDI File (one track per part), the master as WAV and gapless MP3.
import os, struct
import numpy as np
import soundfile as sf
from . import dsp

GM_DRUM = {'kick': 36, 'snare': 38, 'snare2': 38, 'rim': 40, 'xstick': 37, 'flam': 38, 'buzz': 38, 'roll': 38,
           'hhc': 42, 'hhp': 44, 'hho': 46, 'hhh': 46, 'hh34': 46, 'ride': 51, 'bell': 53, 'crash': 49, 'sizzle': 57,
           'tomh': 48, 'toml': 45}
GM_PERC = {'tamb': 54, 'shaker': 70, 'conga': 63, 'tumba': 64, 'bongo_h': 60, 'bongo_l': 61, 'cowbell': 56, 'claves': 75,
           'guiro': 73, 'sleigh': 83, 'triangle': 81, 'agogo': 67, 'cabasa': 69, 'vibraslap': 58, 'belltree': 84, 'woodblock': 76,
           'timbales': 65}


def _vlq(n):
    out = [n & 0x7F]
    n >>= 7
    while n:
        out.append((n & 0x7F) | 0x80)
        n >>= 7
    return bytes(reversed(out))


def _track(events):
    """events: [(tick, bytes)] -> MTrk chunk."""
    data = b''
    last = 0
    for tick, ev in sorted(events, key=lambda e: (e[0], e[1][0] & 0xF0 == 0x90)):
        data += _vlq(max(0, tick - last)) + ev
        last = tick
    data += b'\x00\xff\x2f\x00'
    return b'MTrk' + struct.pack('>I', len(data)) + data


def write_midi(path, song, notes_by_part, insts, tpq=480):
    tempo = int(round(60_000_000 / song.bpm))
    meta = [(0, b'\xff\x51\x03' + tempo.to_bytes(3, 'big')), (0, b'\xff\x58\x04\x04\x02\x18\x08'),
            (0, b'\xff\x03' + _vlq(len(song.title.encode())) + song.title.encode())]
    loop_s = int(song.loop_start * tpq)
    loop_e = int(song.loop_end * tpq)
    meta += [(loop_s, b'\xff\x06\x09loopStart'), (loop_e, b'\xff\x06\x07loopEnd')]
    chunks = [_track(meta)]
    ch = 0
    for name, ns in sorted(notes_by_part.items()):
        inst = insts.get(name, '')
        drum = inst == 'kit' or inst in GM_PERC
        channel = 9 if drum else ch
        if not drum:
            ch = (ch + 1) % 16
            if ch == 9:
                ch = 10
        evs = [(0, b'\xff\x03' + _vlq(len(name)) + name.encode())]
        for n in ns:
            if n.t >= song.loop_end:
                continue
            if isinstance(n.p, str):
                key = GM_DRUM.get(n.p, GM_PERC.get(inst, 60))
            else:
                key = int(round(n.p))
            v = max(1, min(127, int(round(n.v * 127))))
            a = int(round(n.t * tpq))
            b = max(a + 1, int(round((n.t + n.d) * tpq)))
            evs.append((a, bytes([0x90 | channel, key & 0x7F, v])))
            evs.append((b, bytes([0x80 | channel, key & 0x7F, 0])))
        chunks.append(_track(evs))
    head = b'MThd' + struct.pack('>IHHH', 6, 1, len(chunks), tpq)
    with open(path, 'wb') as f:
        f.write(head + b''.join(chunks))


def write_wav(path, x):
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    sf.write(path, np.clip(x, -1, 1).T.astype(np.float32), dsp.SR, subtype='PCM_24')


def write_mp3(path, x, kbps=192):
    """CBR MP3 through libsndfile's LAME (it writes the gapless header). Returns the decoded file's offset against
    the input in samples (0 when gapless) and its length."""
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    # libsndfile maps compression_level 0..1 onto 320..32 kbps for constant bitrate
    level = (320 - kbps) / (320 - 32)
    tmp = path + '.part.mp3'
    sf.write(tmp, np.clip(x, -1, 1).T.astype(np.float32), dsp.SR, format='MP3', subtype='MPEG_LAYER_III',
             bitrate_mode='CONSTANT', compression_level=level)
    os.replace(tmp, path)
    y, r = sf.read(path, always_2d=True, dtype='float32')
    y = y.T
    # offset: cross-correlate the first 3 s
    n = min(3 * dsp.SR, x.shape[1], y.shape[1])
    a, b = x[0, :n].astype(np.float64), y[0, :n].astype(np.float64)
    best, off = -1e18, 0
    for d in range(-2000, 2001, 1):
        if d >= 0:
            c = float(np.dot(a[:n - d], b[d:n])) if d < n else -1e18
        else:
            c = float(np.dot(a[-d:n], b[:n + d]))
        if c > best:
            best, off = c, d
    return {'decodedSamples': int(y.shape[1]), 'inputSamples': int(x.shape[1]), 'offsetSamples': int(off), 'rate': int(r)}
