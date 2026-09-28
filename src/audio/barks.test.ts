import { describe, expect, it } from 'vitest';
import type { ItemEvent } from '../items/types.ts';
import type { RaceEvent } from '../race-manager/types.ts';
import { allLines, CAST, prompt } from '../../scripts/voice/catalog.ts';
import { BARKS, Barker, LINES_A_RACE, type TakeCount } from './barks.ts';
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

  it('nobody counts laps, says sorry, or speaks on a pass or a big boost: no Mario Kart World racer does', () => {
    for (const r of ['sprocket', 'boulder', 'pip']) {
      const rival = r === 'pip' ? 'juniper' : 'pip';
      const moments: RaceEvent[][] = [
        [{ type: 'lap', racerId: r, lap: 2, isFinal: false }],
        [{ type: 'lap', racerId: r, lap: 3, isFinal: true }],
        [kart(r, { type: 'bump', otherId: rival })],
        [kart('boulder', { type: 'bump', otherId: r })],
        // the player passes a rival (from 4th), and a rival near them takes their place
        [{ type: 'positionChange', racerId: r, rank: 3 }],
        [{ type: 'positionChange', racerId: r, rank: 5 }, { type: 'positionChange', racerId: rival, rank: 4 }],
        [kart(r, { type: 'boostStart', source: 'drift', multiplier: 1.3, seconds: 1.5 })],
      ];
      for (const m of moments) {
        for (let s = 1; s <= 50; s++) {
          const b = new Barker(s * 7);
          b.reset(4);
          expect(tick(b, 30, m, [], at({ [rival]: [2, 0, 5], boulder: [1, 0, 4] }, r)), `${r} ${JSON.stringify(m)}`).toBeNull();
        }
      }
    }
    for (const bark of ['lap', 'sorry', 'overtake', 'boost'] as const) expect(BARKS.rules[bark].chance, bark).toBe(0);
  });

  it("the player's item hitting a rival: now and then the player's gloat, else sometimes the rival's cry, quieter and from their side", () => {
    const N = 1000, g = BARKS.rules.hitRival.chance, r = BARKS.rivalChance.hit!;
    let gloats = 0, cries = 0, cry: BarkCue | null = null;
    for (let s = 1; s <= N; s++) {
      const b = new Barker(s * 7919);
      b.reset(4);
      const c = tick(b, 5, [], [itemHit('gus', 'pip')], at({ gus: [6, 0, 0] }));
      if (c?.racerId === 'pip' && c.bark === 'hitRival') gloats++;
      if (c?.racerId === 'gus' && c.bark === 'hit') { cries++; cry = c; }
    }
    expect(gloats / N).toBeCloseTo(g, 1);
    expect(cries / N).toBeCloseTo((1 - g) * r, 1);
    expect(cry!.gain).toBeLessThan(1);
    // heading 0 looks along +z: world +x is on the screen's left
    expect(cry!.pan).toBeLessThan(0);
    // out of earshot, the rival says nothing
    for (let s = 1; s <= 100; s++) {
      const b = new Barker(s);
      b.reset(4);
      expect(tick(b, 5, [], [itemHit('gus', 'pip')], at({ gus: [0, 0, BARKS.rivalNear + 5] }))?.racerId ?? 'pip').toBe('pip');
    }
  });

  it("a rival's item hitting the player is the player's own hit line; a rival never taunts, and says nothing about anyone else's hits", () => {
    for (let s = 1; s <= 200; s++) {
      const b = new Barker(s * 104729);
      b.reset(4);
      expect(tick(b, 5, [HIT('pip')], [itemHit('pip', 'gus')], at({ gus: [6, 0, 0] }))).toMatchObject({ racerId: 'pip', bark: 'hit' });
      // with the player's hit line not recorded, still no taunt from Gus
      const noHit: TakeCount = (id, bark) => (id === 'pip' && bark === 'hit' ? 0 : 3);
      const q = new Barker(s * 31);
      q.reset(4);
      expect(tick(q, 5, [HIT('pip')], [itemHit('pip', 'gus')], at({ gus: [6, 0, 0] }), noHit)).toBeNull();
      // a rival spun by a hazard or by another rival's item, right beside the player: nothing
      const o = new Barker(s * 13);
      o.reset(4);
      expect(tick(o, 5, [HIT('otto')], [itemHit('otto', 'gus')], at({ otto: [0, 0, 4], gus: [0, 0, 8] }))).toBeNull();
    }
  });

  it('the racer screen line is always said', () => {
    const b = new Barker(1);
    const picks = [b.select('gus', ALL, 0), b.select('gus', ALL, 0.3)];
    expect(picks.map((p) => p?.bark)).toEqual(['select', 'select']);
    expect(picks[0]!.n).not.toBe(picks[1]!.n);
  });

  it("a whole race's moments: a few lines, as Mario Kart World's racers say (being hit, the start, the finish, a rare trick or gloat)", () => {
    // one race's worth of the player's moments at the rates measured over 96 whole races (render.mix.ts
    // CENSUS, 28 Sept 2026: 123 s a race), spread over the race by a seeded shuffle
    const race = (seed: number): [number, RaceEvent[], ItemEvent[]][] => {
      let x = seed;
      const rnd = () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 0x100000000; };
      const at_ = () => 4 + rnd() * 115;
      const out: [number, RaceEvent[], ItemEvent[]][] = [[3, [kart('pip', { type: 'boostStart', source: 'start', multiplier: 1.3, seconds: 1 })], []]];
      for (let i = 0; i < 7; i++) out.push([at_(), [TRICK()], []]);
      for (let i = 0; i < 8; i++) out.push([at_(), [kart('pip', { type: 'boostStart', source: 'drift', multiplier: 1.3, seconds: 1.5 })], []]);
      for (let i = 0; i < 4; i++) out.push([at_(), [], [itemHit(i % 2 ? 'gus' : 'otto', 'pip')]]);
      for (let i = 0; i < 4; i++) out.push([at_(), [HIT('pip')], [itemHit('pip', 'momo')]]);
      for (let i = 0; i < 6; i++) out.push([at_(), [HIT('nova')], []]);
      for (let i = 0; i < 39; i++) out.push([at_(), [kart('pip', { type: 'bump', otherId: 'boulder' }), kart('boulder', { type: 'bump', otherId: 'pip' })], []]);
      let rank = 8;
      for (let i = 0; i < 14; i++) out.push([at_(), [{ type: 'positionChange', racerId: 'pip', rank: Math.max(1, --rank) }], []]);
      out.push([42, [{ type: 'lap', racerId: 'pip', lap: 2, isFinal: false }], []], [82, [{ type: 'lap', racerId: 'pip', lap: 3, isFinal: true }], []]);
      out.push([123, [{ type: 'finish', racerId: 'pip', rank: 2, tick: 14760, dnf: false }], []]);
      return out.sort((a, b) => a[0] - b[0]);
    };
    // Gus is hit beside the player, Otto far up the road; Momo hits the player; Nova spins out beside them
    const near = at({ gus: [3, 0, 6], otto: [0, 0, 30], momo: [2, 0, 3], nova: [0, 0, 5], boulder: [1, 0, 2] });
    const N = 200, said: BarkCue[] = [];
    let most = 0;
    for (let s = 1; s <= N; s++) {
      const b = new Barker(s * 2654435761);
      b.reset(8);
      const lines = race(s).map(([t, r, i]) => tick(b, t, r, i, near, ALL, 1.4)).filter((c): c is BarkCue => !!c);
      said.push(...lines);
      most = Math.max(most, lines.length);
    }
    const per = (f: (c: BarkCue) => boolean) => said.filter(f).length / N;
    const own = (bark: Bark) => per((c) => c.racerId === 'pip' && c.bark === bark);
    expect(per(() => true), 'lines a race').toBeLessThanOrEqual(LINES_A_RACE);
    expect(own('hit'), 'the player is hit 4 times: nearly every one voiced').toBeGreaterThan(3.5);
    expect(own('start')).toBe(1);
    expect(own('good')).toBe(1);
    expect(own('trick'), 'of 7 tricks').toBeLessThanOrEqual(1.5);
    expect(own('hitRival'), 'of 4 hits on a rival').toBeLessThanOrEqual(1.2);
    expect(per((c) => c.racerId !== 'pip'), "rivals' lines").toBeLessThanOrEqual(1);
    for (const bark of ['boost', 'overtake', 'lap', 'sorry'] as const) expect(per((c) => c.bark === bark), bark).toBe(0);
    expect(most, 'the chattiest race').toBeLessThanOrEqual(LINES_A_RACE + 3);
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
