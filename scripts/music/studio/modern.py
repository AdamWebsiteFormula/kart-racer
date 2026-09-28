# Modern instruments played by code (EDM, synthwave, drum and bass, rock production): supersaw leads and chords,
# a Reese bass, plucks, pads, an FM bell, drum synthesis for layering with the live kit, risers and impacts,
# a gated-reverb impulse response, and a guitar amp for the mix. All seeded; nothing is played.
import math
import numpy as np
from . import dsp
from .synths import _Poly, _saw, _pulse, _ladder, _svf_bp, adsr, hz
from .render import env_release, _mix_into

SR = dsp.SR


def _detunes(voices, cents):
    if voices == 1:
        return [0.0]
    return [cents * (2 * k / (voices - 1) - 1) for k in range(voices)]


class Supersaw(_Poly):
    """Detuned saws spread across the stereo field into a ladder filter with its own envelope: leads, chords, pads.
    `sub` adds a sine an octave down, `air` a breath of high noise."""

    def __init__(self, voices=7, detune=22.0, spread=0.9, cutoff=5000.0, env_amt=5000.0, env_decay=0.35, res=0.12,
                 attack=0.004, decay=0.4, sustain=0.75, release=0.25, gain_db=-14.0, sub=0.0, air=0.0, vib=None, drive=1.1):
        self.voices, self.detune, self.spread = voices, detune, spread
        self.cutoff, self.env_amt, self.env_decay, self.res = cutoff, env_amt, env_decay, res
        self.attack, self.decay, self.sustain, self.release = attack, decay, sustain, release
        self.gain_db, self.sub, self.air, self.vib, self.drive = gain_db, sub, air, vib, drive

    def voice(self, n, dur, ctx):
        f = hz(n.p)
        L = int((dur + self.release) * SR)
        t = np.arange(L) / SR
        st = np.zeros(L)
        if self.vib:
            rate, depth, delay = self.vib
            st += depth * np.clip((t - delay) / 0.3, 0, 1) * np.sin(2 * np.pi * rate * t)
        if 'scoop' in n.art:
            st += -n.x.get('scoop', 2.0) * np.clip(1 - t / n.x.get('scoop_t', 0.08), 0, 1) ** 2
        if 'bend' in n.art:
            st += -n.x.get('bend', 2.0) * np.clip(1 - t / n.x.get('bend_t', 0.15), 0, 1) ** 1.5
        base = f * 2 ** (st / 12)
        out = np.zeros((2, L))
        for k, c in enumerate(_detunes(self.voices, self.detune)):
            w = _saw(base * 2 ** (c / 1200), ctx.rng.uniform(0, 1), SR).astype(np.float64)
            pan = self.spread * (2 * k / max(1, self.voices - 1) - 1) if self.voices > 1 else 0.0
            a = (pan + 1) * math.pi / 4
            gain = 1.0 if c == 0 else 0.8
            out[0] += w * math.cos(a) * gain
            out[1] += w * math.sin(a) * gain
        out /= math.sqrt(self.voices)
        cut = self.cutoff + self.env_amt * n.v * np.exp(-t / self.env_decay)
        y = np.stack([_ladder(out[c], cut, self.res, SR, self.drive) for c in range(2)])
        if self.sub:
            y += self.sub * np.sin(2 * np.pi * np.cumsum(base / 2) / SR)[None, :]
        if self.air:
            y += self.air * dsp.highpass(ctx.rng.standard_normal((2, L)).astype(np.float32), 6000)
        e = adsr(L, self.attack, self.decay, self.sustain, dur, self.release)
        return (y * e[None, :] * (0.45 + 0.55 * n.v)).astype(np.float32)


class Reese(_Poly):
    """Drum and bass Reese: two saws a few cents apart and a square an octave down, through a low-pass that breathes
    slowly with song time, driven, over a clean sine sub (the sub mono, the grit wide)."""

    def __init__(self, gain_db=-10.0, cutoff=700.0, lfo=0.35, detune=14.0, drive=2.5, sub=0.8, release=0.06, width=0.5):
        self.gain_db, self.cutoff, self.lfo, self.detune, self.drive, self.sub = gain_db, cutoff, lfo, detune, drive, sub
        self.release, self.width = release, width

    def voice(self, n, dur, ctx):
        f = hz(n.p)
        L = int((dur + self.release) * SR)
        tt = np.arange(L) / SR
        t = tt + n.t * 60 / ctx.bpm
        fr = np.full(L, f)
        a = _saw(fr * 2 ** (self.detune / 1200), ctx.rng.uniform(0, 1), SR)
        b = _saw(fr * 2 ** (-self.detune / 1200), ctx.rng.uniform(0, 1), SR)
        c = _pulse(fr / 2, 0.5, 0.0, SR)
        cut = self.cutoff * (1 + 0.6 * np.sin(2 * np.pi * self.lfo * t))
        mid = _ladder((0.5 * a + 0.5 * b + 0.35 * c).astype(np.float64), cut, 0.2, SR, self.drive)
        side = _ladder((0.5 * a - 0.5 * b).astype(np.float64), cut * 1.3, 0.2, SR, self.drive)
        sub = self.sub * np.sin(2 * np.pi * f * tt)
        e = adsr(L, 0.004, 0.2, 0.95, dur, self.release)
        return (np.stack([mid + self.width * side + sub, mid - self.width * side + sub]) * e[None, :] * (0.5 + 0.5 * n.v)).astype(np.float32)


class SubBass(_Poly):
    """A sine sub with a touch of second harmonic (so it carries on small speakers) and a soft attack."""

    def __init__(self, gain_db=-8.0, harm=0.25, release=0.05, glide=0.0):
        self.gain_db, self.harm, self.release = gain_db, harm, release

    def voice(self, n, dur, ctx):
        f = hz(n.p)
        L = int((dur + self.release) * SR)
        t = np.arange(L) / SR
        y = np.sin(2 * np.pi * f * t) + self.harm * np.sin(4 * np.pi * f * t)
        y = np.tanh(1.3 * y)
        e = adsr(L, 0.006, 0.3, 0.9, dur, self.release)
        return (np.stack([y, y]) * e[None, :] * (0.5 + 0.5 * n.v)).astype(np.float32)


class Pluck(_Poly):
    """A short synth pluck (saw and square through a snappy filter envelope): arpeggios and stabs."""

    def __init__(self, gain_db=-12.0, cutoff=900.0, env_amt=6000.0, env_decay=0.09, decay=0.25, release=0.08, detune=8.0, res=0.15, square=0.4):
        self.gain_db, self.cutoff, self.env_amt, self.env_decay, self.decay, self.release = gain_db, cutoff, env_amt, env_decay, decay, release
        self.detune, self.res, self.square = detune, res, square

    def voice(self, n, dur, ctx):
        f = hz(n.p)
        L = int((max(dur, 0.05) + self.release + self.decay) * SR)
        t = np.arange(L) / SR
        fr = np.full(L, f)
        x = np.stack([_saw(fr * 2 ** (self.detune / 1200), ctx.rng.uniform(0, 1), SR) + self.square * _pulse(fr, 0.5, 0.2, SR),
                      _saw(fr * 2 ** (-self.detune / 1200), ctx.rng.uniform(0, 1), SR) + self.square * _pulse(fr, 0.5, 0.7, SR)]).astype(np.float64)
        cut = self.cutoff + self.env_amt * n.v * np.exp(-t / self.env_decay)
        y = np.stack([_ladder(x[c], cut, self.res, SR, 1.3) for c in range(2)])
        e = np.exp(-t / self.decay) * env_release(L, int(self.release * SR), int((dur + self.decay * 0.5) * SR))
        return (y * e[None, :] * (0.4 + 0.6 * n.v)).astype(np.float32)


class Pad(_Poly):
    """A wide, soft pad: detuned saws blended with triangles through a low-pass, slow attack and release, a little air."""

    def __init__(self, gain_db=-16.0, cutoff=2200.0, attack=0.4, release=1.0, voices=5, detune=12.0, air=0.03, bright=0.0, tri=0.5):
        self.gain_db, self.cutoff, self.attack, self.release, self.voices, self.detune = gain_db, cutoff, attack, release, voices, detune
        self.air, self.bright, self.tri = air, bright, tri

    def voice(self, n, dur, ctx):
        f = hz(n.p)
        L = int((dur + self.release) * SR)
        out = np.zeros((2, L))
        for k, c in enumerate(_detunes(self.voices, self.detune)):
            fr = np.full(L, f * 2 ** (c / 1200))
            ph = (np.cumsum(fr) / SR + ctx.rng.uniform(0, 1)) % 1.0
            w = (1 - self.tri) * _saw(fr, ctx.rng.uniform(0, 1), SR).astype(np.float64) + self.tri * (np.abs(ph * 2 - 1) * 2 - 1)
            pan = 0.8 * (2 * k / max(1, self.voices - 1) - 1)
            a = (pan + 1) * math.pi / 4
            out[0] += w * math.cos(a)
            out[1] += w * math.sin(a)
        out /= math.sqrt(self.voices)
        cut = np.full(L, self.cutoff * (1 + self.bright * n.v))
        y = np.stack([_ladder(out[c], cut, 0.1, SR, 1.0) for c in range(2)])
        if self.air:
            y += self.air * dsp.highpass(ctx.rng.standard_normal((2, L)).astype(np.float32), 7000)
        e = adsr(L, self.attack, 0.5, 0.9, dur, self.release)
        return (y * e[None, :] * (0.5 + 0.5 * n.v)).astype(np.float32)


class Bell(_Poly):
    """An FM bell (a modulator at 3.5x the carrier), icy and short: sparkle under a mix, never the lead."""

    def __init__(self, gain_db=-14.0, ratio=3.5, index=2.2, decay=1.2, release=0.3):
        self.gain_db, self.ratio, self.index, self.decay, self.release = gain_db, ratio, index, decay, release

    def voice(self, n, dur, ctx):
        f = hz(n.p)
        L = int((dur + self.release + self.decay) * SR)
        t = np.arange(L) / SR
        idx = self.index * n.v * np.exp(-t / (self.decay * 0.4))
        y = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * self.ratio * t)) * np.exp(-t / self.decay)
        return np.stack([y, y]).astype(np.float32) * (0.4 + 0.6 * n.v)


class DrumSynth:
    """Electronic drums played by code, to layer with (or stand in for) the live kit: 'kick' (punchy), 'boom' (a long
    808-style kick), 'snare', 'clap', 'hat', 'ohat', 'impact', 'rise' (a noise riser as long as the note), 'down'
    (a downlifter). Stems: 'kick', 'snare', 'hats', 'fx' (so a sidechain can key on the kick)."""

    def __init__(self, kick_tune=48.0, kick_decay=0.32, snare_tune=190.0, gain_db=0.0):
        self.kick_tune, self.kick_decay, self.snare_tune, self.gain_db = kick_tune, kick_decay, snare_tune, gain_db

    def hit(self, kind, v, dur, ctx):
        rng = ctx.rng
        if kind in ('kick', 'boom'):
            decay = self.kick_decay if kind == 'kick' else 1.1
            L = int(decay * 3 * SR)
            t = np.arange(L) / SR
            f = self.kick_tune + (140 if kind == 'kick' else 90) * np.exp(-t / (0.03 if kind == 'kick' else 0.05))
            body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / decay)
            click = dsp.highpass(dsp.stereo((rng.standard_normal(L) * np.exp(-t / 0.002)).astype(np.float32)), 1500)[0] * 0.35
            y = np.tanh(1.8 * (body + (click if kind == 'kick' else 0))) * 0.9
            return 'kick', np.stack([y, y]).astype(np.float32) * v
        if kind == 'snare':
            L = int(0.5 * SR)
            t = np.arange(L) / SR
            tone = np.sin(2 * np.pi * self.snare_tune * t) * np.exp(-t / 0.06) + 0.5 * np.sin(2 * np.pi * self.snare_tune * 1.6 * t) * np.exp(-t / 0.04)
            nz = dsp.filt(dsp.stereo(rng.standard_normal(L).astype(np.float32)), dsp.biquad('bp', 4000, 0.6))[0] * np.exp(-t / 0.14)
            y = np.tanh(1.5 * (0.6 * tone + 0.9 * nz))
            return 'snare', np.stack([y, y]).astype(np.float32) * v
        if kind == 'clap':
            L = int(0.45 * SR)
            t = np.arange(L) / SR
            env = np.zeros(L)
            for k, dt in enumerate((0.0, 0.011, 0.022)):
                i = int(dt * SR)
                env[i:] += np.exp(-(t[i:] - dt) / 0.006) * (0.8 if k < 2 else 1.0)
            env += 0.5 * np.exp(-np.maximum(t - 0.022, 0) / 0.09) * (t > 0.022)
            nz = rng.standard_normal((2, L)).astype(np.float32)
            y = dsp.filt(nz, dsp.biquad('bp', 1500, 0.9)) * env[None, :].astype(np.float32)
            return 'snare', np.tanh(1.3 * y).astype(np.float32) * v
        if kind in ('hat', 'ohat'):
            dec = 0.035 if kind == 'hat' else 0.28
            L = int(dec * 4 * SR)
            t = np.arange(L) / SR
            metal = np.zeros(L)
            for fr in (205.3, 369.6, 304.4, 522.7, 540.0, 800.0):
                metal += np.sign(np.sin(2 * np.pi * fr * t))
            y = dsp.highpass(dsp.stereo((0.4 * metal + rng.standard_normal(L)).astype(np.float32)), 7000)[0] * np.exp(-t / dec)
            return 'hats', np.stack([y, y * 0.95]).astype(np.float32) * v * 0.6
        if kind == 'impact':
            L = int(3.0 * SR)
            t = np.arange(L) / SR
            f = 30 + 70 * np.exp(-t / 0.2)
            boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 1.0)
            nz = dsp.lowpass(dsp.stereo(rng.standard_normal(L).astype(np.float32)), 2500)[0] * np.exp(-t / 0.5) * 0.4
            y = np.tanh(1.4 * (boom + nz))
            return 'fx', np.stack([y, y]).astype(np.float32) * v
        if kind in ('rise', 'down'):
            L = max(64, int(dur * 60 / ctx.bpm * SR))
            t = np.arange(L) / SR
            k = t / max(t[-1], 1e-3)
            if kind == 'down':
                k = 1 - k
            fc = 300 * (40 ** k)
            noise = rng.standard_normal((2, L))
            y = np.stack([_svf_bp(noise[c], fc, 0.7, SR) for c in range(2)])
            amp = (k ** 1.6) if kind == 'rise' else np.exp(-t / (0.35 * t[-1] + 1e-3))
            return 'fx', (y * amp[None, :] * v * 0.6).astype(np.float32)
        raise KeyError(kind)

    # each kind brought near the level the sampled instruments play at (studio.render REF_LEVEL), so the mix's
    # faders mean the same thing for code drums as for the kit
    LEVEL = {'kick': -13.0, 'boom': -12.0, 'snare': -12.0, 'clap': -11.0, 'hat': -13.0, 'ohat': -15.0, 'impact': -12.0, 'rise': -14.0, 'down': -14.0}

    def render(self, notes, ctx, part):
        stems = {k: np.zeros((2, ctx.n), np.float32) for k in ('kick', 'snare', 'hats', 'fx')}
        for n in sorted(notes, key=lambda n: n.t):
            stem, y = self.hit(n.p, n.v, n.d, ctx)
            _mix_into(stems[stem], y * dsp.undb(self.gain_db + self.LEVEL.get(n.p, -12.0)), ctx.s(n.t))
        return stems


def gated_ir(length=0.26, seed=5):
    """A gated-reverb impulse response (the 1980s snare): dense noise at a steady level, cut off hard."""
    rng = np.random.default_rng(seed)
    L = int(length * SR)
    env = np.ones(L)
    tail = int(0.02 * SR)
    env[-tail:] = np.linspace(1, 0, tail)
    ir = rng.standard_normal((2, L)) * env[None, :] * np.exp(-np.arange(L) / SR / 0.5)[None, :]
    return (dsp.lowpass(ir.astype(np.float32), 9000) * 0.05).astype(np.float32)


def amp(x, drive_db=24.0, tone=0.0, cab=True, mids=3.0):
    """A guitar amp and cabinet: tighten the lows, push the mids, clip hard (oversampled), then a speaker's curve."""
    y = dsp.eq(x, [('hp', 110, 0.7), ('peak', 800, 0.8, mids)])
    y = dsp.saturate(y, drive_db, asym=0.05, os=2)
    y = dsp.saturate(y * 0.8, 6.0, os=2)
    if cab:
        y = dsp.eq(y, [('hp', 85, 0.7), ('peak', 420, 1.2, -3.0), ('peak', 2200, 1.0, 3.0 + tone), ('lp', 5200, 0.7), ('lp', 6500, 0.7)])
    return y.astype(np.float32)
