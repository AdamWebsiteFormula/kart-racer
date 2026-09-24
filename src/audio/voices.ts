// Voice limiting and roulette timing. Pure: no Web Audio here.
import { AUDIO } from './constants.ts';
import type { Cue } from './types.ts';

/**
 * One cue per sound per tick: repeats of a sound in the same tick (three spins from one strike, a
 * pile-up's bumps) merge into the loudest, which keeps its pan and pitch. In place, first-heard order.
 */
export function mergeCues(cues: Cue[]): Cue[] {
  let w = 0;
  for (let r = 0; r < cues.length; r++) {
    const c = cues[r];
    let j = 0;
    while (j < w && cues[j].sfx !== c.sfx) j++;
    if (j < w) { if (c.gain > cues[j].gain) cues[j] = c; } else cues[w++] = c;
  }
  cues.length = w;
  return cues;
}

/**
 * Which sounds are still ringing. A new one is let in while its own sound has fewer than
 * `AUDIO.voicesPerSound` voices and all sounds together fewer than `AUDIO.voicesTotal` (a priority
 * sting, such as the countdown or the finish, skips the total).
 */
export class Voices {
  private readonly live: { id: string; end: number }[] = [];

  admit(id: string, now: number, seconds: number, priority = false): boolean {
    const live = this.live;
    let w = 0, mine = 0;
    for (const v of live) if (v.end > now) { live[w++] = v; if (v.id === id) mine++; }
    live.length = w;
    if (mine >= AUDIO.voicesPerSound || (!priority && w >= AUDIO.voicesTotal)) return false;
    live.push({ id, end: now + seconds });
    return true;
  }

  /** A voice of `id` was cut short at `now`: the oldest still ringing ends then. */
  release(id: string, now: number): void {
    const v = this.live.find((x) => x.id === id && x.end > now);
    if (v) v.end = now;
  }

  get count(): number { return this.live.length; }
}

/**
 * Seconds between roulette ticks with `left` seconds of the roll to go: quick while it spins,
 * slowing to a crawl just before the prize chime (the classic wheel).
 */
export function rouletteGap(left: number): number {
  const { seconds, fast, slow } = AUDIO.roulette;
  const x = Math.min(1, Math.max(0, left / seconds));
  return fast + (slow - fast) * (1 - x) * (1 - x);
}
