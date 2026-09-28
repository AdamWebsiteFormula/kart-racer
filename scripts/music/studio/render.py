# Notes to audio: sampled instruments (pitch, velocity, round robins, articulations: staccato, marcato, falls,
# doits, scoops, shakes, vibrato, legato), the multi-mic drum kit with hi-hat choke, and hand percussion.
import math
import numpy as np
from . import dsp
from .samples import Bank, audio

SR = dsp.SR
REF_LEVEL = -20.0


def sec(beats, bpm):
    return beats * 60.0 / bpm


class Ctx:
    """What a renderer needs from the song: tempo, total length, a seeded random source."""

    def __init__(self, bpm, n_total, seed=0):
        self.bpm, self.n, self.rng = bpm, n_total, np.random.default_rng(seed)

    def s(self, beats):
        return int(round(sec(beats, self.bpm) * SR))


def _mix_into(buf, x, start):
    if start >= buf.shape[1]:
        return
    if start < 0:
        x = x[:, -start:]
        start = 0
    n = min(x.shape[1], buf.shape[1] - start)
    if n > 0:
        buf[:, start:start + n] += x[:, :n]


def env_release(n, rel_n, start_rel, curve='exp'):
    """Gain 1 until `start_rel`, then down to silence over `rel_n` samples."""
    g = np.ones(n, np.float32)
    if start_rel < n:
        k = np.arange(n - start_rel)
        if curve == 'exp':
            r = np.exp(-k / max(1.0, rel_n / 5.0))
            r[k >= rel_n] = 0.0
        else:
            r = np.clip(1 - k / max(1.0, rel_n), 0, 1)
        g[start_rel:] = r.astype(np.float32)
    return g


class SampleInst:
    """A sampled instrument. `arts` maps a note's flags to the bank's articulations, in order of preference."""

    def __init__(self, bank: Bank, release=0.12, veltrack_db=16.0, gain_db=0.0, attack_ms=2.0, legato_skip=0.045,
                 legato_xf=0.03, bright=None, stac_len=None, vib=None, fall_st=7.0, max_len=None, tune_cents=0.0, loop_long=True):
        self.bank, self.release, self.veltrack_db, self.gain_db = bank, release, veltrack_db, gain_db
        self.attack_ms, self.legato_skip, self.legato_xf = attack_ms, legato_skip, legato_xf
        self.bright = bright  # (low-velocity cutoff Hz, high-velocity cutoff Hz): darker when soft
        self.stac_len = stac_len
        self.vib = vib or {}
        self.fall_st = fall_st
        self.max_len = max_len
        self.tune = tune_cents / 100.0
        self.loop_long = loop_long
        self.ref_level = None

    def _art(self, note):
        a = note.art
        b = self.bank
        if ('stac' in a or 'marc' in a) and b.has('stac'):
            return 'stac'
        if 'fall' in a and b.has('fall'):
            return 'fall'
        if 'growl' in a and b.has('growl'):
            return 'growl'
        if 'mute' in a and b.has('mute'):
            return 'mute'
        if 'vib' in a and b.has('vib'):
            return 'vib'
        if 'sub' in a and b.has('sub'):
            return 'sub'
        return 'sus'

    def gain_for(self, zone, v):
        lvl = self.bank.level(zone)
        # every normalized sample is brought to one loudness (K-weighted, its first moments), so an instrument's
        # level in the mix is its fader, and velocity alone (veltrack_db) sets how loud a note plays
        norm = (REF_LEVEL - lvl) if self.bank.normalize else 0.0
        return dsp.undb(self.gain_db + zone.gain + norm + self.veltrack_db * (v - 1.0))

    def render(self, notes, ctx, part):
        buf = np.zeros((2, ctx.n), np.float32)
        ns = sorted(notes, key=lambda n: (n.t, n.p))
        for i, n in enumerate(ns):
            nxt = None
            if part.mono:
                for m in ns[i + 1:]:
                    if m.t > n.t + 1e-6:
                        nxt = m
                        break
            legato_in = part.mono and i > 0 and ('sl' in ns[i - 1].art or (ns[i - 1].t + ns[i - 1].d > n.t + 0.02 and ns[i - 1].t < n.t))
            x = self.note(n, ctx, legato_in=legato_in, next_note=nxt if part.mono else None)
            if x is None:
                continue
            _mix_into(buf, x, ctx.s(n.t) - (int(self.legato_xf * SR) if legato_in else 0))
        return buf

    def note(self, n, ctx, legato_in=False, next_note=None):
        v127 = int(round(n.v * 127))
        art = self._art(n)
        pitch = n.p + self.tune + n.x.get('detune', 0.0)
        z = self.bank.pick(art, int(round(pitch)), v127)
        y = audio(z.path)
        dur = sec(n.d, ctx.bpm)
        if next_note is not None:
            gap = sec(next_note.t - n.t, ctx.bpm)
            if 'sl' in n.art or gap < dur:
                dur = min(dur, gap) + self.legato_xf  # hand over to the next note
        short = art == 'stac' or 'stac' in n.art or 'marc' in n.art
        if short and art != 'stac':
            dur = min(dur, self.stac_len or 0.12)
        rel = self.release
        if 'marc' in n.art:
            rel = max(rel, 0.08)
        if art == 'stac':
            # a staccato sample carries its own decay: let it ring up to the note length and a release after
            dur = min(max(dur, self.stac_len or 0.0), y.shape[1] / SR)
        if art == 'fall':
            dur = y.shape[1] / SR
        if self.max_len:
            dur = min(dur, self.max_len)
        n_out = int((dur + rel) * SR)
        ratio = 2 ** ((pitch - z.root) / 12.0)
        # the pitch curve (semitones) over the note: scoop, bend, fall, doit, vibrato
        t = np.arange(n_out) / SR
        st = np.zeros(n_out)
        if 'scoop' in n.art:
            st += -n.x.get('scoop', 1.5) * np.clip(1 - t / n.x.get('scoop_t', 0.09), 0, 1) ** 2
        if 'bend' in n.art:
            st += -n.x.get('bend', 1.0) * np.clip(1 - t / 0.16, 0, 1) ** 1.5
        amp = np.ones(n_out, np.float32)
        if ('fall' in n.art and art != 'fall') or 'doit' in n.art:
            f_start = max(0.05, dur - n.x.get('fall_len', 0.32))
            f_len = n.x.get('fall_len', 0.32)
            k = np.clip((t - f_start) / f_len, 0, 1)
            sign = -1 if 'fall' in n.art else 1
            depth = n.x.get('fall_st', self.fall_st) if sign < 0 else n.x.get('doit_st', 5.0)
            st += sign * depth * k ** 1.8
            amp *= (1 - 0.92 * k ** 1.2).astype(np.float32)
            n_out = min(n_out, int((f_start + f_len + 0.03) * SR))
            t, st, amp = t[:n_out], st[:n_out], amp[:n_out]
        vib = dict(self.vib)
        if 'vib' in n.art:
            vib = {'depth': 0.22, 'rate': 5.6, 'delay': 0.18, **self.vib, **n.x.get('vibx', {})}
        if vib.get('depth', 0) > 0 and dur > vib.get('delay', 0.2):
            d0, rate = vib.get('delay', 0.2), vib.get('rate', 5.5)
            ramp = np.clip((t - d0) / 0.25, 0, 1)
            ph = ctx.rng.uniform(0, 2 * math.pi)
            st += vib['depth'] * ramp * np.sin(2 * math.pi * rate * t + ph)
        rate_curve = ratio * 2 ** (st / 12.0)
        pos0 = self.legato_skip * SR if legato_in else 0.0
        # a note longer than its sample: loop the steady middle with a crossfade
        need = float(np.sum(rate_curve)) + pos0 + 64
        src = y
        if need > y.shape[1] and self.loop_long and art not in ('stac', 'fall'):
            src = _extend(y, int(need) + SR // 2)
        x = dsp.vread(src, rate_curve, n_out, pos0)
        # amplitude: attack (a legato note fades in over the crossfade), release at the note end
        a_n = int((self.legato_xf if legato_in else self.attack_ms / 1000) * SR)
        if a_n > 1:
            amp[:a_n] *= np.linspace(0, 1, a_n, dtype=np.float32) ** (0.5 if legato_in else 1.0)
        rel_start = int(dur * SR)
        amp *= env_release(n_out, int(rel * SR), rel_start)
        if 'shake' in n.art:
            amp *= self._shake(n, ctx, z, pitch, v127, x, n_out, t, rate_curve, pos0)
        x *= amp[None, :] * self.gain_for(z, n.v)
        if self.bright:
            lo, hi = self.bright
            f = lo * (hi / lo) ** n.v
            if f < 18000:
                x = dsp.lowpass(x, f, 0.6)
        if 'acc' in n.art or 'marc' in n.art:
            x *= 1.12
        return x

    def _shake(self, n, ctx, z, pitch, v127, x, n_out, t, rate_curve, pos0):
        """A lip shake: the note alternates with the one a minor third up about 7 times a second."""
        up = self.bank.pick('sus', int(round(pitch + 3)), v127)
        y2 = audio(up.path)
        r2 = 2 ** ((pitch + 3 - up.root) / 12.0) * np.ones(n_out)
        x2 = dsp.vread(y2, r2, n_out, pos0) * (self.gain_for(up, n.v) / max(self.gain_for(z, n.v), 1e-9))
        onset = min(0.12, 0.3 * n_out / SR)
        w = 0.5 - 0.5 * np.cos(2 * math.pi * 7.0 * np.clip(t - onset, 0, None))
        w = np.where(t < onset, 0.0, w).astype(np.float32)
        x[:] = x * (1 - w)[None, :] + x2 * w[None, :]
        return np.ones(n_out, np.float32)


def _extend(y, n):
    """Loop the steady part of a sample (40%..90% of it) with equal-power crossfades until it is `n` long."""
    L = y.shape[1]
    a, b = int(0.4 * L), int(0.9 * L)
    if b - a < SR // 10:
        return np.pad(y, ((0, 0), (0, max(0, n - L))))
    seg = y[:, a:b]
    xf = min(int(0.08 * SR), (b - a) // 4)
    out = [y[:, :b - xf]]
    cur = y[:, b - xf:b]
    total = b - xf
    ramp = np.linspace(0, 1, xf, dtype=np.float32)
    while total < n:
        blend = cur * np.cos(ramp * math.pi / 2) + seg[:, :xf] * np.sin(ramp * math.pi / 2)
        out.append(blend)
        out.append(seg[:, xf:-xf])
        cur = seg[:, -xf:]
        total += blend.shape[1] + seg.shape[1] - 2 * xf
    out.append(cur)
    return np.ascontiguousarray(np.concatenate(out, axis=1)[:, :n + xf], np.float32)


class KitInst:
    """The Virtuosity kit. Each hit sums its microphones (close, overheads, room) from the same layer and round
    robin, so they stay in phase. Returns stems: 'kick', 'snare' (close mics), 'oh', 'room'.
    `piece_gain` (dB) and `mic_gain` (dB) shape the kit; closed and pedal hats choke a ringing open hat."""

    CHOKERS = {'hhc', 'hhp', 'hhh', 'hh34'}
    CHOKED = {'hho', 'hhh', 'hh34'}

    def __init__(self, zones, mic_gain=None, piece_gain=None, veltrack_db=10.0, close_pan=None):
        self.banks = {p: Bank(p, zs, normalize=False) for p, zs in zones.items()}
        self.mic_gain = {'kickmic': 0.0, 'snaremic': 0.0, 'oh': 0.0, 'room': -6.0, **(mic_gain or {})}
        self.piece_gain = piece_gain or {}
        self.veltrack_db = veltrack_db
        self.close_pan = close_pan or {'kickmic': 0.0, 'snaremic': -0.08}

    def render(self, notes, ctx, part):
        stems = {k: np.zeros((2, ctx.n), np.float32) for k in ('kick', 'snare', 'oh', 'room')}
        ns = sorted(notes, key=lambda n: n.t)
        open_hat = None  # (start sample, end sample, stems dict) of a ringing open hat
        pending = []
        for n in ns:
            piece = n.p
            if piece not in self.banks:
                raise KeyError(f'no kit piece {piece}')
            start = ctx.s(n.t)
            if piece in self.CHOKERS and open_hat is not None and open_hat[0] < start:
                self._choke(stems, open_hat, start)
                open_hat = None
            v127 = max(1, min(127, int(round(n.v * 127))))
            z = self.banks[piece].pick(piece, 60, v127)
            g = dsp.undb(self.piece_gain.get(piece, 0.0) + self.veltrack_db * (n.v - 1.0) * 0.5)
            ring = 0
            parts = {}
            for mic, path in z.mics.items():
                y = audio(path, trim=False)
                y = dsp.stereo(y)
                if mic in ('kickmic', 'snaremic'):
                    y = dsp.pan(y.mean(0), self.close_pan.get(mic, 0.0))
                y = y * g * dsp.undb(self.mic_gain.get(mic, 0.0))
                stem = {'kickmic': 'kick', 'snaremic': 'snare'}.get(mic, mic)
                if piece in self.CHOKED:
                    parts[stem] = (start, y)
                _mix_into(stems[stem], y, start)
                ring = max(ring, y.shape[1])
            if piece in self.CHOKED:
                open_hat = (start, start + ring, parts)
            pending.append(n)
        return stems

    def _choke(self, stems, open_hat, at):
        s0, s1, parts = open_hat
        if at >= s1:
            return
        fade = int(0.035 * SR)
        for stem, (start, y) in parts.items():
            k0 = at - start
            if k0 >= y.shape[1]:
                continue
            tail = y[:, k0:].copy()
            g = np.zeros(tail.shape[1], np.float32)
            m = min(fade, tail.shape[1])
            g[:m] = np.linspace(1, 0, m, dtype=np.float32) ** 2
            # subtract the part of the open hat that should no longer ring
            end = min(stems[stem].shape[1], at + tail.shape[1])
            stems[stem][:, at:end] -= (tail * (1 - g)[None, :])[:, :end - at]


class PercInst:
    """Hand percussion: the note's pitch field names a stroke (the articulation), velocity picks the layer."""

    def __init__(self, zones, gain_db=0.0, veltrack_db=12.0, pan=0.0, strokes=None):
        self.bank = Bank('perc', zones, normalize=False)
        self.gain_db, self.veltrack_db, self.pan = gain_db, veltrack_db, pan
        self.strokes = strokes or {}

    def render(self, notes, ctx, part):
        buf = np.zeros((2, ctx.n), np.float32)
        for n in sorted(notes, key=lambda n: n.t):
            stroke = self.strokes.get(n.p, n.p)
            if stroke not in self.bank.arts:
                stroke = next(iter(self.bank.arts))
            z = self.bank.pick(stroke, 60, int(round(n.v * 127)))
            y = audio(z.path)
            g = dsp.undb(self.gain_db + self.veltrack_db * (n.v - 1.0))
            if 'short' in n.art or n.x.get('cut'):
                L = int(sec(n.d, ctx.bpm) * SR) + int(0.03 * SR)
                y = y[:, :L] * env_release(min(L, y.shape[1]), int(0.03 * SR), max(0, min(L, y.shape[1]) - int(0.03 * SR)))[None, :]
            _mix_into(buf, dsp.pan(y, self.pan) * g, ctx.s(n.t))
        return buf
