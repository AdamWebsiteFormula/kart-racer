import { describe, expect, it } from 'vitest';
import type { ItemEvent } from '../items/types.ts';
import type { RaceEvent } from '../race-manager/types.ts';
import { allLines, CAST, prompt } from '../../scripts/voice/catalog.ts';
import { BARKS, Barker, type TakeCount } from './barks.ts';
import type { Listener } from './director.ts';
import type { Bark, BarkCue } from './types.ts';

const RACERS = ['pip', 'momo', 'nova', 'juniper', 'otto', 'sprocket', 'boulder', 'gus'];
/** every racer has every moment recorded, three takes each (lap and sorry: two) */
const ALL: TakeCount = (_r, b) => (b === 'lap' || b === 'sorry' ? 2 : 3);
const NONE: TakeCount = () => 0;
const at = (positions: Record<string, [number, number, number]>, me = 'pip'): Listener => ({
  playerId: me, position: [0, 0, 0], heading: 0, positionOf: (id) => positions[id],
});
const kart = (racerId: string, event: Extract<RaceEvent, { type: 'kart' }>['event']): RaceEvent => ({ type: 'kart', racerId, event });
const TRICK = (id = 'pip') => kart(id, { type: 'trick' });
const HIT = (id: string) => kart(id, { type: 'hit', kind: 'spin', spun: true, coinsLost: 1 } as never);
const itemHit = (victim: string, by: string): ItemEvent => ({ type: 'hit', racerId: victim, byRacerId: by, itemId: 'beachBall', spun: true, coinsLost: 1 });

/** Run one tick at `now`; returns the line, and marks it ringing for `ring` seconds as the game does. */
function tick(b: Barker, now: number, race: RaceEvent[], items: ItemEvent[] = [], l = at({}), count = ALL, ring = 1): BarkCue | null {
  const c = b.pick(race, items, l, now, count);
  if (c) b.until = now + ring;
  return c;
}

describe('racer voice lines: who speaks and when (barks.ts)', () => {
  it('says nothing that is not recorded', () => {
    const b = new Barker(1);
    b.reset(4);
    expect(tick(b, 0, [HIT('pip')], [], at({}), NONE)).toBeNull();
    expect(b.select('pip', NONE, 0)).toBeNull();
  });

  it('the takes of a moment come round shuffled, all before any repeats, never the same twice running', () => {
    const b = new Barker(7);
    const seen: number[] = [];
    for (let i = 0; i < 300; i++) seen.push(b.take('pip', 'trick', 3));
    for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1]);
    for (let i = 0; i + 3 <= seen.length; i += 3) expect(new Set(seen.slice(i, i + 3)).size).toBe(3);
    expect(new Barker(7).take('pip', 'good', 1)).toBe(0);
  });

  it("the player's hit is always voiced; a moment waits out its cooldown, and one line rings at a time", () => {
    const b = new Barker(3);
    b.reset(4);
    const first = tick(b, 10, [HIT('pip')]);
    expect(first).toMatchObject({ racerId: 'pip', bark: 'hit', gain: 1, pan: 0 });
    // inside the hit's own cooldown: nothing
    expect(tick(b, 10 + BARKS.rules.hit.cooldown - 0.5, [HIT('pip')])).toBeNull();
    expect(tick(b, 10 + BARKS.rules.hit.cooldown + 0.1, [HIT('pip')])?.bark).toBe('hit');
  });

  it('a trick is voiced now and then (about its chance), never inside its cooldown', () => {
    let voiced = 0;
    const trials = 400;
    for (let s = 1; s <= trials; s++) {
      const b = new Barker(s * 7919);
      b.reset(4);
      if (tick(b, 100, [TRICK()])) voiced++;
    }
    expect(voiced / trials).toBeGreaterThan(BARKS.rules.trick.chance - 0.1);
    expect(voiced / trials).toBeLessThan(BARKS.rules.trick.chance + 0.1);
    // once voiced, the next trick inside the cooldown is not
    const b = new Barker(11);
    b.reset(4);
    let t = 0;
    while (!tick(b, t, [TRICK()])) t += BARKS.rules.trick.cooldown + 1;
    expect(tick(b, t + BARKS.rules.trick.cooldown - 1, [TRICK()])).toBeNull();
  });

  it('a hit cuts in over a line still ringing; a trick does not', () => {
    const b = new Barker(5);
    b.reset(4);
    let t = 0;
    while (!tick(b, t, [TRICK()], [], at({}), ALL, 2)) t += 20;
    // the trick line rings for 2 s: another trick moment and a boost wait, a hit does not
    expect(tick(b, t + 0.5, [kart('pip', { type: 'boostStart', source: 'start', multiplier: 1, seconds: 1 })])).toBeNull();
    expect(tick(b, t + 0.6, [HIT('pip')])?.bark).toBe('hit');
  });

  it('finish lines: first wins, the podium (or the cut line) is good, the rest and a DNF lose', () => {
    const line = (rank: number, dnf = false, good = 3): Bark | undefined => {
      const b = new Barker(9);
      b.reset(5, good);
      return tick(b, 50, [{ type: 'finish', racerId: 'pip', rank, tick: 9000, dnf }])?.bark;
    };
    expect(line(1)).toBe('win');
    expect(line(3)).toBe('good');
    expect(line(4)).toBe('lose');
    expect(line(1, true)).toBe('lose');
    // a Knockout round: through the cut is good
    expect(line(6, false, 6)).toBe('good');
  });

  it('Sprocket counts laps aloud: lap two, then the last lap; nobody else has lap lines', () => {
    const b = new Barker(2);
    b.reset(3);
    const l = at({}, 'sprocket');
    expect(tick(b, 30, [{ type: 'lap', racerId: 'sprocket', lap: 2, isFinal: false }], [], l)).toMatchObject({ bark: 'lap', n: 0 });
    expect(tick(b, 60, [{ type: 'lap', racerId: 'sprocket', lap: 3, isFinal: true }], [], l)).toMatchObject({ bark: 'lap', n: 1 });
    const only: TakeCount = (r, bark) => (bark === 'lap' ? (r === 'sprocket' ? 2 : 0) : 3);
    const p = new Barker(2);
    p.reset(3);
    expect(tick(p, 30, [{ type: 'lap', racerId: 'pip', lap: 2, isFinal: false }], [], at({}), only)).toBeNull();
  });

  it("the player's item hitting a rival is a gloat; a rival's item hitting the player is theirs, from where they are", () => {
    const b = new Barker(4);
    b.reset(4);
    expect(tick(b, 5, [], [itemHit('gus', 'pip')], at({ gus: [3, 0, 8] }))).toMatchObject({ racerId: 'pip', bark: 'hitRival' });
    // the player is hit by Gus, 6 m off to the side: the player's own hit line wins (priority), Gus waits
    let taunts = 0, hits = 0;
    for (let s = 1; s <= 200; s++) {
      const r = new Barker(s * 104729);
      r.reset(4);
      const c = tick(r, 5, [], [itemHit('pip', 'gus')], at({ gus: [6, 0, 0] }));
      if (c?.racerId === 'gus') taunts++;
      if (c?.racerId === 'pip' && c.bark === 'hit') hits++;
    }
    expect(hits).toBe(200);
    expect(taunts).toBe(0);
    // with the player's hit line not recorded, Gus's taunt comes through, quieter and panned to his side
    const noHit: TakeCount = (r, bark) => (r === 'pip' && bark === 'hit' ? 0 : 3);
    let taunt: BarkCue | null = null;
    for (let s = 1; s <= 50 && !taunt; s++) {
      const r = new Barker(s * 31);
      r.reset(4);
      taunt = tick(r, 5, [], [itemHit('pip', 'gus')], at({ gus: [6, 0, 0] }), noHit);
    }
    expect(taunt).toMatchObject({ racerId: 'gus', bark: 'hitRival' });
    expect(taunt!.gain).toBeLessThan(1);
    // heading 0 looks along +z: world +x is on the screen's left
    expect(taunt!.pan).toBeLessThan(0);
  });

  it('a rival speaks only near the player', () => {
    for (let s = 1; s <= 100; s++) {
      const b = new Barker(s);
      b.reset(4);
      expect(tick(b, 5, [HIT('otto')], [], at({ otto: [0, 0, BARKS.rivalNear + 5] }))).toBeNull();
    }
    let near = 0;
    for (let s = 1; s <= 100; s++) {
      const b = new Barker(s);
      b.reset(4);
      if (tick(b, 5, [HIT('otto')], [], at({ otto: [0, 0, 6] }))?.racerId === 'otto') near++;
    }
    expect(near).toBeGreaterThan(50);
  });

  it('passing: the player moving up is an overtake line; a rival taking the player\'s place near them is theirs', () => {
    let mine = 0;
    for (let s = 1; s <= 200; s++) {
      const b = new Barker(s * 17);
      b.reset(4);
      if (tick(b, 20, [{ type: 'positionChange', racerId: 'pip', rank: 3 }])?.bark === 'overtake') mine++;
    }
    expect(mine / 200).toBeGreaterThan(BARKS.rules.overtake.chance - 0.12);
    expect(mine / 200).toBeLessThan(BARKS.rules.overtake.chance + 0.12);
    let theirs: BarkCue | null = null;
    for (let s = 1; s <= 60 && !theirs; s++) {
      const b = new Barker(s * 13);
      b.reset(3);
      theirs = tick(b, 20, [{ type: 'positionChange', racerId: 'pip', rank: 4 }, { type: 'positionChange', racerId: 'juniper', rank: 3 }], [], at({ juniper: [2, 0, 5] }));
    }
    expect(theirs).toMatchObject({ racerId: 'juniper', bark: 'overtake' });
    // a rival moving up elsewhere in the pack says nothing
    for (let s = 1; s <= 60; s++) {
      const b = new Barker(s * 13);
      b.reset(3);
      expect(tick(b, 20, [{ type: 'positionChange', racerId: 'juniper', rank: 5 }], [], at({ juniper: [2, 0, 5] }))).toBeNull();
    }
  });

  it('Boulder says sorry after a bump; the racer screen line is always said', () => {
    let sorry = 0;
    for (let s = 1; s <= 100; s++) {
      const b = new Barker(s * 3);
      b.reset(4);
      if (tick(b, 9, [kart('boulder', { type: 'bump', otherId: 'pip' })], [], at({}, 'boulder'))?.bark === 'sorry') sorry++;
    }
    expect(sorry).toBeGreaterThan(50);
    const b = new Barker(1);
    const picks = [b.select('gus', ALL, 0), b.select('gus', ALL, 0.3)];
    expect(picks.map((p) => p?.bark)).toEqual(['select', 'select']);
    expect(picks[0]!.n).not.toBe(picks[1]!.n);
  });
});

describe('the voice line catalog (scripts/voice/catalog.ts)', () => {
  it('every racer has every moment, the takes Mario Kart gives (one to three), and their own habits', () => {
    const counts: Partial<Record<Bark, number>> = { select: 2, start: 2, boost: 2, trick: 3, hitRival: 3, overtake: 3, hit: 3, win: 2, good: 1, lose: 2 };
    expect(Object.keys(CAST).sort()).toEqual([...RACERS].sort());
    for (const r of RACERS) {
      for (const [bark, n] of Object.entries(counts)) expect(CAST[r].lines[bark as Bark]?.length, `${r} ${bark}`).toBe(n);
    }
    expect(CAST.sprocket.lines.lap).toEqual(['Lap two!', 'Final lap!']);
    expect(CAST.boulder.lines.sorry?.length).toBe(2);
    expect(Object.entries(CAST).filter(([, c]) => c.lines.lap || c.lines.sorry).map(([r]) => r).sort()).toEqual(['boulder', 'sprocket']);
  });

  it('lines are short, original and G-rated: no franchise catchphrase, no imitation', () => {
    // the moments heard often stay a breath long; the finish and the racer screen may take a phrase
    const RARE: ReadonlySet<Bark> = new Set(['select', 'win', 'good', 'lose']);
    // also the shouts a judge, asked one clip at a time with no name given, heard as a famous character's (26 Sept 2026)
    const banned = [/\bwhe+\b/i, /\bwhoa\b/i, /yip yip/i, /tubular/i, /wa+h+o+o/i, /ya+h+o+o/i, /mamma mia/i, /let'?s-a/i, /here we go/i, /okey.?dokey/i, /yippee/i, /woo-?hoo/i, /cowabunga/i,
      /meep meep/i, /infinity and beyond/i, /yabba/i, /hasta la vista/i, /ho ho ho/i, /it'?s-a me/i, /mario|luigi|peach|bowser|yoshi|nintendo/i];
    const rude = [/\bstupid\b/i, /\bidiot\b/i, /\bshut up\b/i, /\bloser\b/i, /\bdumb\b/i, /\bhate\b/i, /\bkill\b/i, /\bdie\b/i];
    for (const l of allLines()) {
      expect(l.line.split(/\s+/).length, l.key).toBeLessThanOrEqual(RARE.has(l.bark) ? 6 : 5);
      for (const re of [...banned, ...rude]) expect(re.test(l.line), `${l.key}: "${l.line}"`).toBe(false);
      // the words go last, alone, so the model says them and nothing else
      expect(prompt(l.racerId, l.bark, l.line).endsWith(`#### TRANSCRIPT\n${l.line}`)).toBe(true);
    }
    // one voice per racer, none shared
    expect(new Set(Object.values(CAST).map((c) => c.voice)).size).toBe(RACERS.length);
  });
});
