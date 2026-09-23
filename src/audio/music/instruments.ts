// The music voices. Each plays one note into the music bus. Kept to a few nodes per note.
import { noiseBuffer } from '../sfx.ts';
import type { Voice } from './patterns.ts';
import { freqOfMidi } from './theory.ts';

function env(ctx: BaseAudioContext, dest: AudioNode, t: number, peak: number, attack: number, dur: number, release: number): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.setValueAtTime(peak, t + Math.max(attack, dur - release));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + release);
  g.connect(dest);
  return g;
}

function osc(ctx: BaseAudioContext, type: OscillatorType, hz: number, t: number, stop: number, dest: AudioNode, cents = 0): OscillatorNode {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(hz, t);
  o.detune.value = cents;
  o.connect(dest);
  o.start(t);
  o.stop(stop);
  return o;
}

function noise(ctx: BaseAudioContext, t: number, stop: number, dest: AudioNode): void {
  const s = ctx.createBufferSource();
  s.buffer = noiseBuffer(ctx);
  s.loop = true;
  s.connect(dest);
  s.start(t, (t * 7.31) % 0.9);
  s.stop(stop);
}

function filter(ctx: BaseAudioContext, type: BiquadFilterType, hz: number, dest: AudioNode, q = 0.7): BiquadFilterNode {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = hz;
  f.Q.value = q;
  f.connect(dest);
  return f;
}

/** Play one note of `voice` at context time `t`. `pitch` is MIDI (ignored by drums). */
export function playNote(ctx: BaseAudioContext, dest: AudioNode, voice: Voice, t: number, dur: number, pitch: number, vel: number): void {
  const hz = freqOfMidi(pitch);
  switch (voice) {
    case 'bass': {
      const f = filter(ctx, 'lowpass', 900, env(ctx, dest, t, 0.42 * vel, 0.005, dur * 0.9, 0.06));
      const end = t + dur + 0.1;
      osc(ctx, 'triangle', hz, t, end, f);
      osc(ctx, 'square', hz / 2, t, end, filter(ctx, 'lowpass', 300, f));
      break;
    }
    case 'skank': {
      const f = filter(ctx, 'highpass', 700, env(ctx, dest, t, 0.09 * vel, 0.003, Math.min(dur, 0.12), 0.05));
      osc(ctx, 'square', hz, t, t + 0.25, f);
      break;
    }
    case 'brass': {
      const g = env(ctx, dest, t, 0.13 * vel, 0.025, dur * 0.95, 0.08);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.Q.value = 2;
      f.frequency.setValueAtTime(500, t);
      f.frequency.exponentialRampToValueAtTime(2600, t + 0.06);
      f.frequency.exponentialRampToValueAtTime(1400, t + Math.max(0.1, dur));
      f.connect(g);
      const end = t + dur + 0.15;
      osc(ctx, 'sawtooth', hz, t, end, f, -7);
      osc(ctx, 'sawtooth', hz, t, end, f, 7);
      break;
    }
    case 'lead': {
      const g = env(ctx, dest, t, 0.07 * vel, 0.01, dur * 0.9, 0.05);
      const o = osc(ctx, 'square', hz, t, t + dur + 0.1, filter(ctx, 'lowpass', 3200, g));
      const lfo = ctx.createOscillator(), depth = ctx.createGain();
      lfo.frequency.value = 5.5;
      depth.gain.value = 12;
      lfo.connect(depth).connect(o.detune);
      lfo.start(t);
      lfo.stop(t + dur + 0.1);
      break;
    }
    case 'pad': {
      const g = env(ctx, dest, t, 0.05 * vel, 0.3, dur, 0.4);
      osc(ctx, 'triangle', hz, t, t + dur + 0.5, g);
      osc(ctx, 'sine', hz * 2, t, t + dur + 0.5, g, 4);
      break;
    }
    case 'bell': {
      const g = env(ctx, dest, t, 0.16 * vel, 0.003, 0.05, Math.min(1.2, dur + 0.6));
      osc(ctx, 'sine', hz, t, t + 1.4, g);
      const partial = env(ctx, dest, t, 0.04 * vel, 0.002, 0.02, 0.3);
      osc(ctx, 'sine', hz * 3.01, t, t + 0.4, partial);
      break;
    }
    case 'kick': {
      const g = env(ctx, dest, t, 0.75 * vel, 0.002, 0.02, 0.22);
      const o = osc(ctx, 'sine', 140, t, t + 0.3, g);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      break;
    }
    case 'snare': {
      noise(ctx, t, t + 0.2, filter(ctx, 'bandpass', 1900, env(ctx, dest, t, 0.35 * vel, 0.001, 0.01, 0.13), 0.9));
      osc(ctx, 'triangle', 190, t, t + 0.12, env(ctx, dest, t, 0.2 * vel, 0.001, 0.01, 0.07));
      break;
    }
    case 'hat': noise(ctx, t, t + 0.08, filter(ctx, 'highpass', 7500, env(ctx, dest, t, 0.16 * vel, 0.001, 0.005, 0.035))); break;
    case 'clap': {
      const f = filter(ctx, 'bandpass', 1300, dest, 1.2);
      for (let i = 0; i < 3; i++) noise(ctx, t + i * 0.012, t + i * 0.012 + 0.08, env(ctx, f, t + i * 0.012, 0.28 * vel, 0.001, 0.005, i === 2 ? 0.12 : 0.02));
      break;
    }
  }
}
