// Racer voice lines ("barks"): who says what, and when. Pure; GameAudio plays the answer.
//
// As often, and at the moments, Mario Kart World's racers speak (Adam, 28 Sept 2026: "The characters in
// Mario Kart World don't say very much. I only want them saying the same amount of things"). Its quote
// list (mariowiki.com/List_of_quotes_from_the_Mario_Kart_series, Mario Kart World section) ties lines
// only to being picked, the finish (1st, 2nd-9th, out), being hit and a Star, all short exclamations;
// Mario Kart 8's passing quips are gone from it (comicbook.com, 5 July 2025); no racer in any Mario Kart
// counts laps or apologizes; a review calls its voice work minimal. Mario Kart 8 also voiced tricks,
// boosts and item hits on a rival; World's list shows none of those, so here a trick and a gloat are rare
// and a boost says nothing. The rate is measured on whole races (render.mix.ts, barks.mix.ts; audio SOP).
// The mechanics are standard bark practice (Valve's dynamic dialog, GDC 2012: a cooldown per line, a
// random pick among takes; Wwise / FMOD voice limiting: a small budget and priorities, lower lines
// dropped, not stacked):
// - one line at a time, whoever says it, at least `gap` apart, and a racer's own lines `perRacer` apart;
// - each moment has a chance and its own cooldown; a chance of 0 is a moment nobody speaks at;
// - the takes of a moment come round in a shuffled order, never the same one twice running;
// - the player's racer says the lines; a rival speaks only when the player's item hits them, near the
//   player, quieter with distance.
import type { ItemEvent } from '../items/types.ts';
import type { RaceEvent } from '../race-manager/types.ts';
import { distanceGain, type Listener } from './director.ts';
import type { Bark, BarkCue } from './types.ts';

interface Rule {
  /** how often the moment is voiced (0–1) */
  chance: number;
  /** seconds before the same racer voices the same moment again */
  cooldown: number;
  /** the higher wins a tick; 4 and up may cut in over a line still ringing */
  priority: number;
}

export const BARKS = Object.freeze({
  /** seconds between any two lines, whoever says them */
  gap: 1.2,
  /** seconds between two lines of the same racer */
  perRacer: 3,
  /** metres: a rival further from the player than this says nothing */
  rivalNear: 18,
  /** a rival's line against the player's own (AUDIO.otherGain is the same idea for their sounds) */
  rivalGain: 0.75,
  rules: {
    // Mario Kart World: said when picked, when hit, at the finish (its quote list)
    select: { chance: 1, cooldown: 0, priority: 5 },
    hit: { chance: 1, cooldown: 2.5, priority: 4 },
    win: { chance: 1, cooldown: 0, priority: 5 },
    good: { chance: 1, cooldown: 0, priority: 5 },
    lose: { chance: 1, cooldown: 0, priority: 5 },
    // a rocket start: once a race at most (Mario Kart 8's voice bank has it)
    start: { chance: 1, cooldown: 0, priority: 3 },
    // rare: Mario Kart 8 voiced them, World's quote list does not (about one of each a race)
    trick: { chance: 0.2, cooldown: 30, priority: 1 },
    hitRival: { chance: 0.25, cooldown: 30, priority: 3 },
    // never: World dropped the passing quips; no Mario Kart racer counts laps or says sorry; no boost line
    boost: { chance: 0, cooldown: 0, priority: 1 },
    overtake: { chance: 0, cooldown: 0, priority: 2 },
    lap: { chance: 0, cooldown: 0, priority: 3 },
    sorry: { chance: 0, cooldown: 0, priority: 2 },
  } satisfies Record<Bark, Rule> as Readonly<Record<Bark, Rule>>,
  /** a rival's line: only their hit, when the player's item hit them (the rest are 0: never) */
  rivalChance: { hit: 0.5 } as Readonly<Partial<Record<Bark, number>>>,
});

/**
 * The lines a race these rules come to, on average (the tests hold them to it): over 96 whole races, six
 * tracks, each racer as the player (render.mix.ts CENSUS, 28 Sept 2026), 8.3 a race, 4.0 of them the
 * player being hit and 1 the finish; 18.4 before the cut.
 */
export const LINES_A_RACE = 9;

/** How many takes of a moment a racer has (0: none recorded, so nothing is said). */
export type TakeCount = (racerId: string, bark: Bark) => number;

interface Candidate { racerId: string; bark: Bark; gain: number; pan: number; n?: number }

export class Barker {
  private seed: number;
  private lastAt = -Infinity;
  private lastPriority = 0;
  private readonly racerAt = new Map<string, number>();
  private readonly barkAt = new Map<string, number>();
  private readonly bags = new Map<string, number[]>();
  private readonly lastTake = new Map<string, number>();
  private lastRank: number | null = null;
  private goodRank = 3;
  private readonly found: Candidate[] = [];
  private readonly rolled: Bark[] = [];
  /** when the line the game is playing ends (GameAudio sets it): nothing starts before, unless it cuts in */
  until = -Infinity;

  /** `seed`: fixed in tests; the game's changes every session, so the takes do not come round the same way each time */
  constructor(seed = Date.now()) {
    // scrambled (murmur3's finalizer): a small seed would start the xorshift on a run of tiny numbers
    let h = seed >>> 0;
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
    this.seed = h >>> 0 || 1;
  }

  /** A new race: the player's grid place (for overtakes) and the worst place that still earns the fanfare. */
  reset(gridRank: number | null = null, goodRank = 3): void {
    this.lastRank = gridRank;
    this.goodRank = goodRank;
    this.racerAt.clear();
    this.barkAt.clear();
    this.lastAt = -Infinity;
    this.lastPriority = 0;
    this.until = -Infinity;
  }

  /** 0–1, seeded (the sim's own randomness is never touched) */
  private random(): number {
    this.seed ^= this.seed << 13; this.seed >>>= 0;
    this.seed ^= this.seed >>> 17;
    this.seed ^= this.seed << 5; this.seed >>>= 0;
    return this.seed / 0x100000000;
  }

  /** The next take of a moment: a shuffled round of all of them, never the one just said. */
  take(racerId: string, bark: Bark, count: number): number {
    if (count <= 1) return 0;
    const key = `${racerId}:${bark}`;
    let bag = this.bags.get(key);
    if (!bag || bag.length === 0) {
      bag = Array.from({ length: count }, (_, i) => i);
      for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(this.random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
      // the bag is used from its end: keep the last take said from coming straight back
      if (bag[bag.length - 1] === this.lastTake.get(key)) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
      this.bags.set(key, bag);
    }
    const n = bag.pop()!;
    this.lastTake.set(key, n);
    return n;
  }

  /** The line said on the racer screen when a racer is picked (always, over anything). */
  select(racerId: string, count: TakeCount, now: number): BarkCue | null {
    const c = count(racerId, 'select');
    if (c === 0) return null;
    this.lastAt = now; this.lastPriority = BARKS.rules.select.priority;
    return { racerId, bark: 'select', n: this.take(racerId, 'select', c), gain: 1, pan: 0 };
  }

  /**
   * One sim tick's events: at most one line, or null. `now` is in seconds on any steady clock (the
   * audio context's); `count` says which lines are recorded.
   */
  pick(race: readonly RaceEvent[], items: readonly ItemEvent[], l: Listener, now: number, count: TakeCount): BarkCue | null {
    const me = l.playerId;
    if (!me) return null;
    const found = this.found, rolled = this.rolled;
    found.length = 0;
    rolled.length = 0;
    // each moment rolls its chance once a tick (a hit comes as a kart event and an item event); a missed
    // roll drops the line and leaves the moment's cooldown free
    const mine = (bark: Bark, n?: number) => {
      if (rolled.includes(bark)) return;
      rolled.push(bark);
      if (this.random() < BARKS.rules[bark].chance) found.push({ racerId: me, bark, gain: 1, pan: 0, n });
    };
    const theirs = (racerId: string, bark: Bark) => {
      if (racerId === me) return;
      const p = l.positionOf(racerId);
      if (!p) return;
      const dx = p[0] - l.position[0], dz = p[2] - l.position[2], d = Math.hypot(dx, dz);
      if (d > BARKS.rivalNear || this.random() >= (BARKS.rivalChance[bark] ?? 0)) return;
      const right = -dx * Math.cos(l.heading) + dz * Math.sin(l.heading);
      found.push({ racerId, bark, gain: BARKS.rivalGain * distanceGain(d), pan: d > 0.01 ? Math.max(-1, Math.min(1, right / Math.max(d, 1))) : 0 });
    };
    // who moved up to the player's old place this tick, if the player lost it
    let myNewRank: number | null = null;
    for (const e of race) if (e.type === 'positionChange' && e.racerId === me) myNewRank = e.rank;

    for (const e of race) {
      switch (e.type) {
        case 'finish':
          if (e.racerId === me) mine(!e.dnf && e.rank === 1 ? 'win' : !e.dnf && e.rank <= this.goodRank ? 'good' : 'lose');
          break;
        case 'lap':
          // Sprocket's lap count (lap two, the last lap): chance 0, as no Mario Kart racer counts laps
          if (e.racerId === me && !e.isFinal && e.lap === 2) mine('lap', 0);
          else if (e.racerId === me && e.isFinal) mine('lap', 1);
          break;
        case 'positionChange':
          if (e.racerId === me && this.lastRank !== null && e.rank < this.lastRank) mine('overtake');
          // a rival took the player's old place: they just passed the player
          else if (e.racerId !== me && myNewRank !== null && this.lastRank !== null && myNewRank > this.lastRank && e.rank === this.lastRank) theirs(e.racerId, 'overtake');
          break;
        case 'kart': {
          // a rival's own spins and bumps are not the player's business: they say nothing
          if (e.racerId !== me) break;
          const k = e.event;
          if (k.type === 'hit') mine('hit');
          else if (k.type === 'trick') mine('trick');
          else if (k.type === 'boostStart' && k.source === 'start') mine('start');
          // a big drift boost only (orange and up): the small ones come every corner
          else if (k.type === 'boostStart' && k.source === 'drift' && k.seconds > 1) mine('boost');
          else if (k.type === 'bump' && me === 'boulder') mine('sorry');
          break;
        }
        default: break;
      }
    }
    if (myNewRank !== null) this.lastRank = myNewRank;
    for (const e of items) {
      if (e.type !== 'hit') continue;
      if (e.racerId === me) {
        mine('hit');
        if (e.byRacerId && e.byRacerId !== me) theirs(e.byRacerId, 'hitRival');
      } else if (e.byRacerId === me) {
        // the player's item hit a rival: the player's gloat, or the rival's cry near the player
        mine('hitRival');
        theirs(e.racerId, 'hit');
      }
    }
    if (found.length === 0) return null;

    // the best candidate that may speak now: priority first, and the player's own a step ahead of a
    // rival's (the player's gloat over the rival's cry; a rival never over the player's hit)
    let best: Candidate | null = null, bestScore = -Infinity;
    for (const c of found) {
      const rule = BARKS.rules[c.bark];
      const takes = count(c.racerId, c.bark);
      if (takes === 0 || (c.n !== undefined && c.n >= takes)) continue;
      const key = `${c.racerId}:${c.bark}`;
      if (now - (this.barkAt.get(key) ?? -Infinity) < rule.cooldown) continue;
      if (now - (this.racerAt.get(c.racerId) ?? -Infinity) < BARKS.perRacer && rule.priority < 4) continue;
      // only the player's own lines cut in: a rival never talks over the player
      const cutsIn = c.racerId === me && rule.priority >= 4 && rule.priority > this.lastPriority;
      if ((now < this.until || now - this.lastAt < BARKS.gap) && !cutsIn) continue;
      const score = rule.priority * 2 + (c.racerId === me ? 3 : 0);
      if (score > bestScore) { best = c; bestScore = score; }
    }
    if (!best) return null;
    const rule = BARKS.rules[best.bark];
    this.lastAt = now; this.lastPriority = rule.priority;
    this.racerAt.set(best.racerId, now);
    this.barkAt.set(`${best.racerId}:${best.bark}`, now);
    const takes = count(best.racerId, best.bark);
    return { racerId: best.racerId, bark: best.bark, n: best.n ?? this.take(best.racerId, best.bark, takes), gain: best.gain, pan: best.pan };
  }
}

/** Lines ringing now fade out quickly when a higher one cuts in (seconds). */
export const BARK_CUT_SECONDS = 0.04;
/** The music dips this much (linear gain, −3 dB) under the player's own lines, so the words carry over it. */
export const BARK_DUCK = 0.71;
