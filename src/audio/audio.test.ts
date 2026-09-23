import { describe, expect, it } from 'vitest';
import type { Vec3 } from '../kart-controller/types.ts';
import type { RaceEvent } from '../race-manager/types.ts';
import { AUDIO } from './constants.ts';
import { direct, distanceGain, hornFor, resetDirector, type Listener } from './director.ts';
import { engineHz, gearFor, rpmFor } from './engine.ts';
import { DRUMS, SONGS, keyPcs, line, songForTrack } from './music/patterns.ts';
import { Sequencer } from './music/sequencer.ts';
import { chord, freq, midi } from './music/theory.ts';

function listener(others: Record<string, Vec3> = {}): Listener {
  return { playerId: 'p', position: [0, 0, 0], heading: 0, positionOf: (id) => others[id] };
}

describe('theory', () => {
  it('A4 is 440 Hz, octaves double, chords have the right tones', () => {
    expect(freq('A4')).toBeCloseTo(440);
    expect(freq('A5')).toBeCloseTo(880);
    expect(midi('C4')).toBe(60);
    expect(midi('Bb1')).toBe(34);
    expect(chord(midi('C4'), 'maj')).toEqual([60, 64, 67]);
    expect(chord(midi('A3'), 'min7')).toEqual([57, 60, 64, 67]);
  });
  it('line() reads note:beats with rests', () => {
    expect(line(0, 'C4:1 -:1 E4:0.5').map((n) => [n.at, n.len, n.pitch])).toEqual([[0, 1, 60], [2, 0.5, 64]]);
  });
});

describe('songs', () => {
  it('every note sits inside the loop and every melodic note is in key or marked chromatic', () => {
    for (const song of Object.values(SONGS)) {
      const L = song.bars * 4;
      const pcs = keyPcs(song);
      for (const part of song.parts) {
        for (const n of part.notes) {
          expect(n.at, `${song.id}/${part.voice}`).toBeGreaterThanOrEqual(0);
          expect(n.at, `${song.id}/${part.voice}`).toBeLessThan(L);
          expect(n.len).toBeGreaterThan(0);
          if (DRUMS.has(part.voice) || part.voice === 'bass' || part.voice === 'skank' || part.voice === 'pad') continue; // chord parts may borrow (dom7, sus4)
          if (!n.chromatic) expect(pcs, `${song.id}/${part.voice} pitch ${n.pitch}`).toContain(((n.pitch % 12) + 12) % 12);
        }
      }
    }
  });
  it('every melody line fills whole bars (lines end on a bar line)', () => {
    for (const song of Object.values(SONGS)) {
      for (const part of song.parts.filter((p) => p.voice === 'brass' || p.voice === 'bell')) {
        const end = Math.max(...part.notes.map((n) => n.at + n.len));
        expect(end, song.id).toBeLessThanOrEqual(song.bars * 4 + 1e-9);
      }
    }
  });
  it('tracks map to their cup song', () => {
    expect(songForTrack('harbour-loop')).toBe('raceSunrise');
    expect(songForTrack('skyline-circuit')).toBe('raceSummit');
  });
});

describe('sequencer', () => {
  it('notes land at start + beat × 60 / bpm and loop', () => {
    const song = SONGS.results;
    const seq = new Sequencer(song, 10);
    const beat = 60 / song.bpm;
    const first = seq.take(10 + beat * 0.4); // window edge off any note, so float rounding cannot matter
    expect(first.every((n) => n.time >= 10 && n.time < 10 + beat * 0.4)).toBe(true);
    expect(first.some((n) => n.time === 10)).toBe(true);
    // a whole loop later the same first-beat notes come round again, no duplicates in between
    const rest = seq.take(10 + beat * (song.bars * 4 + 0.1));
    const atLoop = rest.filter((n) => Math.abs(n.time - (10 + beat * song.bars * 4)) < 1e-9);
    expect(atLoop.length).toBe(first.filter((n) => n.time === 10).length);
  });

  it('drums off mutes only the drum parts', () => {
    const seq = new Sequencer(SONGS.raceSunrise, 0);
    seq.drums = false;
    const notes = seq.take(4);
    expect(notes.length).toBeGreaterThan(0);
    expect(notes.some((n) => DRUMS.has(n.voice))).toBe(false);
  });

  it('the final-lap lift starts on the next bar, a whole tone up and faster, with the lift layer', () => {
    const song = SONGS.raceSunrise;
    const beat = 60 / song.bpm;
    const seq = new Sequencer(song, 0);
    seq.take(beat * 1.5); // one and a half beats booked
    seq.lift(beat * 1.2);
    const notes = seq.take(beat * 12);
    const bar2 = beat * 4;
    const before = notes.filter((n) => n.time < bar2 - 1e-9);
    const after = notes.filter((n) => n.time >= bar2 - 1e-9);
    expect(before.length).toBeGreaterThan(0);
    expect(before.some((n) => n.voice === 'lead')).toBe(false);
    expect(after.some((n) => n.voice === 'lead')).toBe(true);
    // the bass on the downbeat of bar 2 is the original pitch + 2 semitones
    const orig = song.parts.find((p) => p.voice === 'bass')!.notes.find((n) => n.at === 4)!.pitch;
    expect(after.find((n) => n.voice === 'bass' && Math.abs(n.time - bar2) < 1e-9)!.pitch).toBe(orig + AUDIO.liftSemitones);
    // and beats after the bar line are closer together
    expect(seq.timeOfBeat(9) - seq.timeOfBeat(8)).toBeCloseTo(beat / AUDIO.liftTempo);
    expect(seq.timeOfBeat(3) - seq.timeOfBeat(2)).toBeCloseTo(beat);
    // an event just before a bar line whose next bar is already booked still lifts on that bar
    const s2 = new Sequencer(song, 0);
    s2.take(beat * 4.1); // lookahead has booked into bar 2
    s2.lift(beat * 3.95);
    expect(s2.timeOfBeat(9) - s2.timeOfBeat(8)).toBeCloseTo(beat / AUDIO.liftTempo);
    expect(s2.take(beat * 8).find((n) => n.voice === 'bass' && Math.abs(n.time - s2.timeOfBeat(5)) < 1e-6)?.pitch)
      .toBe(song.parts.find((p) => p.voice === 'bass')!.notes.find((n) => n.at === 5)!.pitch + AUDIO.liftSemitones);
    seq.lift(beat * 20); // once only
    expect(seq.timeOfBeat(9) - seq.timeOfBeat(8)).toBeCloseTo(beat / AUDIO.liftTempo);
  });
});

describe('engine', () => {
  it('rpm climbs through the gears with a drop at each shift, and stays in range', () => {
    expect(rpmFor(0, 25)).toBe(AUDIO.idleRpm);
    let last = rpmFor(0.5, 25), drops = 0;
    for (let v = 0.5; v <= 25; v += 0.25) {
      const r = rpmFor(v, 25);
      expect(r).toBeGreaterThanOrEqual(AUDIO.idleRpm);
      expect(r).toBeLessThanOrEqual(AUDIO.redlineRpm);
      if (r < last - 100) drops++;
      last = r;
    }
    expect(drops).toBe(AUDIO.gears - 1);
    expect(gearFor(0.99)).toBe(AUDIO.gears - 1);
    expect(rpmFor(-5, 25)).toBeLessThan(AUDIO.redlineRpm * 0.5);
    expect(rpmFor(24, 25, true)).toBeGreaterThan(rpmFor(24, 25));
    expect(engineHz(AUDIO.idleRpm)).toBe(AUDIO.engineIdleHz);
  });
});

describe('director', () => {
  it('race events map to cues; the countdown mutes the drums and go brings them back', () => {
    resetDirector();
    const ev: RaceEvent[] = [
      { type: 'countdown', stepsLeft: 3 }, { type: 'go' },
      { type: 'lap', racerId: 'p', lap: 2, isFinal: false },
      { type: 'phase', phase: 'finalLap' },
      { type: 'pickup', racerId: 'p', index: 0 },
      { type: 'coin', racerId: 'p', coins: 3 },
      { type: 'wrongWay', racerId: 'p', on: true },
      { type: 'finish', racerId: 'p', rank: 2, tick: 1, dnf: false },
    ];
    const { cues, music } = direct(ev, [], listener());
    expect(cues.map((c) => c.sfx)).toEqual(['count', 'go', 'lap', 'finalLap', 'balloon', 'coin', 'wrongWay', 'finish']);
    expect(music).toEqual([{ type: 'drums', on: false }, { type: 'drums', on: true }, { type: 'finalLap' }]);
  });

  it('item events: the player hears their own; someone else only when near, and quieter', () => {
    const near: Vec3 = [5, 0, 0], mid: Vec3 = [30, 0, 0], far: Vec3 = [100, 0, 0];
    const l = listener({ n: near, m: mid, f: far });
    const hit = (id: string) => ({ type: 'hit' as const, racerId: id, byRacerId: 'x', itemId: 'beachBall', spun: true, coinsLost: 0 });
    const { cues, music } = direct([], [hit('p'), hit('n'), hit('m'), hit('f'), { type: 'itemUsed', racerId: 'p', itemId: 'tripleFizz', chargesLeft: 2 }], l);
    expect(cues.map((c) => c.sfx)).toEqual(['spin', 'spin', 'spin', 'fizz']);
    expect(cues[0].gain).toBe(1); // the player's own hit
    expect(cues[1].gain).toBe(AUDIO.otherGain); // a near opponent: quieter than the player
    expect(cues[2].gain).toBeLessThan(AUDIO.farGain);
    expect(cues[1].pan).toBeLessThan(-0.5); // facing +z, world +x is on the left of the screen
    expect(music).toEqual([{ type: 'duck' }]);
    expect(distanceGain(AUDIO.farMetres + 1)).toBe(0);
  });

  it('boost sources pick the right whoosh; other karts\' hops are not heard', () => {
    const k = (racerId: string, event: object) => ({ type: 'kart', racerId, event }) as RaceEvent;
    const { cues } = direct([
      k('p', { type: 'boostStart', source: 'drift', multiplier: 1.3, seconds: 2.5 }),
      k('p', { type: 'boostStart', source: 'drift', multiplier: 1.3, seconds: 0.6 }),
      k('p', { type: 'boostStart', source: 'pad', multiplier: 1.4, seconds: 1 }),
      k('n', { type: 'hop' }),
      k('n', { type: 'bump', otherId: 'p' }),
    ], [], listener({ n: [2, 0, 0] }));
    expect(cues.map((c) => c.sfx)).toEqual(['boost3', 'boost1', 'boostPad', 'bump']);
  });

  it('position changes say gained or lost; horns exist for every racer', () => {
    resetDirector();
    const pc = (rank: number): RaceEvent => ({ type: 'positionChange', racerId: 'p', rank });
    expect(direct([pc(5)], [], listener()).cues[0].sfx).toBe('losePlace'); // first report: no earlier rank
    expect(direct([pc(3)], [], listener()).cues[0].sfx).toBe('gainPlace');
    expect(direct([pc(4)], [], listener()).cues[0].sfx).toBe('losePlace');
    expect(hornFor('gus')).toBe('horn:gus');
    expect(hornFor('nobody')).toBe('horn:pip');
  });
});
