// A pure music clock: which notes fall inside a time window, with loops, a tempo that can change
// on a bar line (the final-lap lift) and a transpose. The Web Audio player feeds it context time.
import { AUDIO } from '../constants.ts';
import { DRUMS, type Note, type Song, type Voice } from './patterns.ts';

export interface Scheduled { time: number; duration: number; voice: Voice; pitch: number; vel: number }

export class Sequencer {
  readonly song: Song;
  /** context time of `anchorBeat` */
  private anchorTime: number;
  private anchorBeat = 0;
  private bpm: number;
  private lifted = false;
  private liftFromBeat = Infinity;
  drums = true;
  /** beats already booked up to (exclusive) */
  private booked = 0;
  private readonly loopBeats: number;

  constructor(song: Song, startTime: number) {
    this.song = song;
    this.anchorTime = startTime;
    this.bpm = song.bpm;
    this.loopBeats = song.bars * 4;
  }

  get isLifted(): boolean { return this.lifted; }

  timeOfBeat(beat: number): number {
    // beats before the lift bar keep the old tempo and the old anchor
    if (beat < this.liftFromBeat && this.pre) return this.pre.time + (beat - this.pre.beat) * 60 / this.pre.bpm;
    return this.anchorTime + (beat - this.anchorBeat) * 60 / this.bpm;
  }

  beatAt(time: number): number {
    if (this.pre && time < this.anchorTime) return this.pre.beat + (time - this.pre.time) * this.pre.bpm / 60;
    return this.anchorBeat + (time - this.anchorTime) * this.bpm / 60;
  }

  /** the clock before the lift, kept so notes booked before the lift bar stay in time */
  private pre: { time: number; beat: number; bpm: number } | null = null;

  /**
   * The final-lap lift, from the next bar line after `now`: up `liftSemitones`, `liftTempo` faster,
   * and the lift-only parts join. Happens once.
   */
  lift(now: number): void {
    if (this.lifted) return;
    this.lifted = true;
    const bar = Math.ceil(Math.max(this.beatAt(now), this.booked) / 4) * 4;
    this.pre = { time: this.anchorTime, beat: this.anchorBeat, bpm: this.bpm };
    this.anchorTime = this.timeOfBeat(bar);
    this.anchorBeat = bar;
    this.bpm *= AUDIO.liftTempo;
    this.liftFromBeat = bar;
  }

  /** Every note starting in [booked beat, beat at `until`), in time order. Advances the booking. */
  take(until: number, out: Scheduled[] = []): Scheduled[] {
    out.length = 0;
    const end = this.beatAt(until);
    if (end <= this.booked) return out;
    const from = this.booked;
    for (const part of this.song.parts) {
      const isDrum = part.isDrum || DRUMS.has(part.voice);
      if (isDrum && !this.drums) continue;
      for (const note of part.notes) this.collect(note, part.voice, isDrum, part.liftOnly ?? false, from, end, out);
    }
    this.booked = end;
    out.sort((a, b) => a.time - b.time);
    return out;
  }

  private collect(note: Note, voice: Voice, isDrum: boolean, liftOnly: boolean, from: number, end: number, out: Scheduled[]): void {
    // the note repeats every loop: first loop index whose start lands at or after `from`
    const L = this.loopBeats;
    let k = Math.ceil((from - note.at) / L);
    for (let beat = note.at + k * L; beat < end; k++, beat = note.at + k * L) {
      const lifted = beat >= this.liftFromBeat;
      if (liftOnly && !lifted) continue;
      const t = this.timeOfBeat(beat);
      const tr = !isDrum && lifted ? this.transposeFor(beat) : 0;
      out.push({ time: t, duration: note.len * 60 / this.bpmAt(beat), voice, pitch: note.pitch + tr, vel: note.vel });
    }
  }

  private transposeFor(beat: number): number {
    return beat >= this.liftFromBeat ? AUDIO.liftSemitones : 0;
  }

  private bpmAt(beat: number): number {
    return beat < this.liftFromBeat && this.pre ? this.pre.bpm : this.bpm;
  }
}
