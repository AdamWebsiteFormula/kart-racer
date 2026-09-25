import { describe, expect, it } from 'vitest';
import { createKartState } from '../kart-controller/types.ts';
import { ITEM_DEFINITIONS } from '../items/data.ts';
import { GO_TICK, STEP_TICKS } from '../race-manager/countdown.ts';
import { RACE } from '../race-manager/constants.ts';
import type { RaceEvent, RaceState } from '../race-manager/types.ts';
import { UI } from './constants.ts';
import { feedHud, hudModel, lapPop, lapSplits, newHudMemory, positionTier } from './hudModel.ts';

const defs = ITEM_DEFINITIONS.map((d) => ({ id: d.id, name: d.name }));

function race(over: Partial<RaceState> = {}): RaceState {
  return { mode: 'quick', lapsTotal: 3, time: 65.5, phase: 'racing', knockout: undefined, ...over } as RaceState;
}
function kart() {
  const k = createKartState({ racerId: 'p', isPlayer: true });
  k.lap = 2; k.rank = 4; k.coins = 3; k.speed = 25;
  return k;
}

describe('hud model', () => {
  it('steady readouts come from state', () => {
    const vm = hudModel(race(), kart(), 4, 10, newHudMemory(), 0, defs, 0);
    expect([vm.timer, vm.lap, vm.lapFinal, vm.coins, vm.coinsFull, vm.speed]).toEqual(['1:05.50', '2/3', false, '03', false, '56']);
    expect(vm.position).toEqual({ n: '4', suffix: 'th' });
    expect(vm.banner).toBeNull();
    // Mirror mode (design §10): the MIRROR badge by the lap counter, only in a mirrored race
    expect(vm.mirrored).toBe(false);
    expect(hudModel(race({ mirrored: true }), kart(), 4, 10, newHudMemory(), 0, defs, 0).mirrored).toBe(true);
  });

  it('SOP gate: a rank change shows on the same frame its positionChange arrives', () => {
    const m = newHudMemory();
    const k = kart();
    expect(hudModel(race(), k, 4, 10, m, 1, defs, 0).position.n).toBe('4');
    feedHud(m, [{ type: 'positionChange', racerId: 'p', rank: 3 }], [], 'p', 1);
    const vm = hudModel(race(), k, 3, 10, m, 1, defs, 0);
    expect(vm.position.n).toBe('3');
    expect(vm.flourish).toBe(true);
    // the color comes with the numeral, on the flourish's frame
    expect(vm.positionTier).toBe('bronze');
    expect(hudModel(race(), k, 3, 10, m, 1.5, defs, 0).flourish).toBe(false);
  });

  it('the place numeral is colored by place: gold, silver, bronze, then the pack', () => {
    const tiers = [1, 2, 3, 4, 5, 6, 7, 8].map((r) => hudModel(race(), kart(), r, 10, newHudMemory(), 0, defs, 0).positionTier);
    expect(tiers).toEqual(['gold', 'silver', 'bronze', 'pack', 'pack', 'pack', 'pack', 'pack']);
    expect(positionTier(12)).toBe('pack');
  });

  it('the coin pill reads two digits, and full at the cap', () => {
    const k = kart();
    k.coins = 0;
    expect(hudModel(race(), k, 4, 10, newHudMemory(), 0, defs, 0).coins).toBe('00');
    k.coins = 10;
    const full = hudModel(race(), k, 4, 10, newHudMemory(), 0, defs, 0);
    expect([full.coins, full.coinsFull]).toEqual(['10', true]);
  });

  it('banner priority: finish beats final lap beats wrong way beats countdown, and each clears after its hold', () => {
    const m = newHudMemory();
    const k = kart();
    const ev = (e: RaceEvent[], t: number) => feedHud(m, e, [], 'p', t);
    expect(hudModel(race({ phase: 'countdown', tick: 1, goTick: GO_TICK }), k, 4, 10, m, 0.5, defs, 0).banner?.text).toBe('3');
    expect(hudModel(race(), k, 4, 10, m, 1.01, defs, 0).banner).toBeNull();
    ev([{ type: 'wrongWay', racerId: 'p', on: true }], 2);
    expect(hudModel(race(), k, 4, 10, m, 2, defs, 0).banner?.kind).toBe('wrongWay');
    // the player leads: their last lap and the shift land on one tick
    ev([{ type: 'lap', racerId: 'p', lap: 3, isFinal: true }, { type: 'trackChanged', event: { label: 'THE TIDE IS IN' } as never }, { type: 'phase', phase: 'finalLap' }], 3);
    const fl = hudModel(race(), k, 4, 10, m, 3, defs, 0).banner!;
    expect([fl.kind, fl.text, fl.sub]).toEqual(['finalLap', 'FINAL LAP', 'THE TIDE IS IN']);
    ev([{ type: 'go' }], 3.1); // lower priority: ignored while final lap holds
    expect(hudModel(race(), k, 4, 10, m, 3.2, defs, 0).banner?.kind).toBe('finalLap');
    expect(hudModel(race(), k, 4, 10, m, 3 + UI.bannerHoldSeconds + 0.01, defs, 0).banner?.kind).toBe('wrongWay');
    ev([{ type: 'finish', racerId: 'p', rank: 2, tick: 9, dnf: false }], 6);
    k.finishTick = 9;
    const fin = hudModel(race(), k, 2, 10, m, 999, defs, 0).banner!;
    // the place, and the prompt to go on under it (in the last input's words: the renderer, SKIP_PROMPTS)
    expect([fin.kind, fin.text, fin.sub, fin.skip]).toEqual(['finish', 'FINISH!', '2nd', true]);
  });

  it('FINAL LAP waits for the player\'s own last lap; the leader\'s shows only the shift\'s label', () => {
    const m = newHudMemory();
    const k = kart(); // on lap 2 of 3
    // the leader starts the last lap: the shift fires while the player is still on lap 2
    feedHud(m, [{ type: 'lap', racerId: 'x', lap: 3, isFinal: true }, { type: 'trackChanged', event: { label: 'STORM ROLLS IN' } as never }, { type: 'phase', phase: 'finalLap' }], [], 'p', 10);
    const shift = hudModel(race(), k, 4, 10, m, 10, defs, 0);
    expect([shift.banner?.kind, shift.banner?.text, shift.banner?.sub, shift.lap]).toEqual(['shift', 'STORM ROLLS IN', '', '2/3']);
    // three seconds later the player crosses into lap 3
    k.lap = 3;
    feedHud(m, [{ type: 'lap', racerId: 'p', lap: 3, isFinal: true }], [], 'p', 13);
    const mine = hudModel(race(), k, 4, 10, m, 13.5, defs, 0);
    expect([mine.banner?.kind, mine.banner?.text, mine.banner?.sub, mine.lap, mine.lapFinal]).toEqual(['finalLap', 'FINAL LAP', 'STORM ROLLS IN', '3/3', true]);
    expect(hudModel(race(), k, 4, 10, m, 13 + UI.bannerHoldSeconds - 0.01, defs, 0).banner?.kind).toBe('finalLap');
  });

  it('the timer stops on the player\'s own time once they cross the line', () => {
    const k = kart();
    const st = race({ goTick: 360, time: 80 });
    expect(hudModel(st, k, 4, 10, newHudMemory(), 0, defs, 0).timer).toBe('1:20.00');
    k.finishTick = 360 + 120 * 70.25; // finished 70.25 s after the go; the race clock runs on
    expect(hudModel(st, k, 4, 10, newHudMemory(), 0, defs, 0).timer).toBe('1:10.25');
    expect(hudModel({ ...st, time: 84.5 }, k, 4, 10, newHudMemory(), 0, defs, 0).timer).toBe('1:10.25');
  });

  it('a hit on the player flashes for flashMs; a hit on someone else does not', () => {
    const m = newHudMemory();
    feedHud(m, [], [{ type: 'hit', racerId: 'x', byRacerId: 'p', itemId: 'beachBall', spun: true, coinsLost: 0 }], 'p', 0);
    expect(hudModel(race(), kart(), 4, 10, m, 0, defs, 0).flash).toBe(false);
    feedHud(m, [], [{ type: 'hit', racerId: 'p', byRacerId: 'x', itemId: 'beachBall', spun: true, coinsLost: 0 }], 'p', 0);
    expect(hudModel(race(), kart(), 4, 10, m, 0.1, defs, 0).flash).toBe(true);
    expect(hudModel(race(), kart(), 4, 10, m, 0.2, defs, 0).flash).toBe(false);
  });

  it('item slots: held and next, flicker with the clock, charges only above one, empty after a Fog', () => {
    const k = kart();
    k.item = { held: 'tripleFizz', charges: 3, rouletteRemaining: 0, next: 'x', nextCharges: 1, nextRouletteRemaining: 1 };
    const a = hudModel(race(), k, 4, 10, newHudMemory(), 0, defs, 0);
    expect([a.held.state, a.held.label, a.held.charges]).toEqual(['ready', 'Triple Fizz', '×3']);
    expect(a.next.state).toBe('rolling');
    const b = hudModel(race(), k, 4, 10, newHudMemory(), 0, defs, UI.rouletteFlickerMs);
    expect(b.next.label).not.toBe(a.next.label);
    k.item = { held: 'none', charges: 0, rouletteRemaining: 0, next: 'none', nextCharges: 0, nextRouletteRemaining: 0 };
    const c = hudModel(race(), k, 4, 10, newHudMemory(), 0, defs, 0);
    expect([c.held.state, c.next.state]).toEqual(['empty', 'empty']);
  });

  it('knockout: the goal by the place names the cut line in places, and flags danger below it (25 Sept 2026: by the numeral, our words)', () => {
    const at = (segment: number, rank: number) => hudModel(race({ mode: 'knockout', knockout: { setId: 'k', segment, cutLineAt: 2, eliminated: [] } }), kart(), rank, 10, newHudMemory(), 0, defs, 0).knockout;
    expect(at(0, 6)).toEqual({ text: '6th or better goes through', danger: false });
    expect(at(0, 7)).toEqual({ text: '6th or better goes through', danger: true });
    expect(at(1, 4)).toEqual({ text: '4th or better goes through', danger: false });
    expect(at(1, 5)?.danger).toBe(true);
    expect(hudModel(race(), kart(), 7, 10, newHudMemory(), 0, defs, 0).knockout).toBeNull();
  });

  it('in the Knockout final the goal says only 1st wins, and 2nd is in danger (bug hunt 2)', () => {
    const st = race({ mode: 'knockout', knockout: { setId: 'k', segment: 2, cutLineAt: 2, eliminated: [] } });
    expect(hudModel(st, kart(), 1, 10, newHudMemory(), 0, defs, 0).knockout).toEqual({ text: 'Only 1st wins', danger: false });
    expect(hudModel(st, kart(), 2, 10, newHudMemory(), 0, defs, 0).knockout).toEqual({ text: 'Only 1st wins', danger: true });
  });
});

describe('controls strip', () => {
  it('shows through the countdown and a moment after the go, then hides', () => {
    const m = newHudMemory();
    const at = (clock: number, st = race()) => hudModel(st, kart(), 4, 10, m, clock, defs, 0).keysHint;
    expect(at(0)).toBe(false);
    expect(at(1.2, race({ phase: 'countdown', tick: 1, goTick: GO_TICK }))).toBe(true);
    feedHud(m, [{ type: 'go' } as never], [], 'p', 4);
    expect(at(4 + UI.keysHintSeconds - 0.1)).toBe(true);
    expect(at(4 + UI.keysHintSeconds + 0.1)).toBe(false);
  });
});

describe('countdown', () => {
  const counting = (tick: number) => race({ phase: 'countdown', tick, goTick: GO_TICK });

  it('each number shows from the tick race-manager announces it until the next one (bug hunt 3)', () => {
    const m = newHudMemory();
    // tick is the next tick to step: nothing has been announced before the first
    expect(hudModel(counting(0), kart(), 4, 10, m, 0, defs, 0).banner).toBeNull();
    for (let stepped = 0; stepped < GO_TICK; stepped++) {
      const want = `${RACE.countdownSteps - Math.floor(stepped / STEP_TICKS)}`; // countdown.ts: stepsLeft on each step tick
      const vm = hudModel(counting(stepped + 1), kart(), 4, 10, m, 0, defs, 0);
      expect([vm.banner?.kind, vm.banner?.text, vm.keysHint], `tick ${stepped}`).toEqual(['countdown', want, true]);
    }
  });

  it('a pause (or a hidden tab) holds the number and the controls strip: the wall clock runs on, the sim does not (bug hunt 3)', () => {
    const m = newHudMemory();
    const at = (tick: number, clock: number) => { const vm = hudModel(counting(tick), kart(), 4, 10, m, clock, defs, 0); return [vm.banner?.text, vm.keysHint]; };
    expect(at(41, 0.33)).toEqual(['3', true]); // paused here
    expect(at(41, 3.33)).toEqual(['3', true]); // three seconds later, still paused
    expect(at(43, 3.35)).toEqual(['3', true]); // resumed: the 3 runs out its own second
    expect(at(STEP_TICKS + 1, 4)).toEqual(['2', true]);
  });
});

describe('Time Trial HUD', () => {
  it('hides the item slots: Time Trial has no items', () => {
    expect(hudModel(race({ mode: 'timeTrial' }), kart(), 1, 10, newHudMemory(), 0, defs, 0).items).toBe(false);
    expect(hudModel(race(), kart(), 1, 10, newHudMemory(), 0, defs, 0).items).toBe(true);
  });

  it('over the line, the finish shows the medal its time won against the track\'s medal times (sweep 24 Sept 2026)', () => {
    const times = { gold: 119000, silver: 129000, bronze: 146000 };
    const st = race({ mode: 'timeTrial', goTick: 360 });
    // SIM_HZ 120: 14100 ticks after the go are 117.5 s
    const finished = (ticks: number, dnf = false) => {
      const m = newHudMemory();
      const k = kart();
      feedHud(m, [{ type: 'finish', racerId: 'p', rank: 1, tick: 360 + ticks, dnf }], [], 'p', 1);
      k.finishTick = 360 + ticks;
      return { m, k };
    };
    const gold = finished(14100);
    expect(hudModel(st, gold.k, 1, 10, gold.m, 1, defs, 0, false, times).medal).toBe('gold');
    const silver = finished(14100 + 120 * 8); // 125.5 s
    expect(hudModel(st, silver.k, 1, 10, silver.m, 1, defs, 0, false, times).medal).toBe('silver');
    const slow = finished(120 * 150); // 150 s: no medal, no badge
    expect(hudModel(st, slow.k, 1, 10, slow.m, 1, defs, 0, false, times).medal).toBeNull();
    // still racing, out of time, no medal times, or not a Time Trial: none
    expect(hudModel(st, kart(), 1, 10, newHudMemory(), 1, defs, 0, false, times).medal).toBeNull();
    const out = finished(14100, true);
    expect(hudModel(st, out.k, 1, 10, out.m, 1, defs, 0, false, times).medal).toBeNull();
    expect(hudModel(st, gold.k, 1, 10, gold.m, 1, defs, 0).medal).toBeNull();
    expect(hudModel(race({ goTick: 360 }), gold.k, 1, 10, gold.m, 1, defs, 0, false, times).medal).toBeNull();
  });
});

describe('solo runs (sweep 24 Sept 2026)', () => {
  // SIM_HZ 120: 4800 ticks are 40 s
  const tr = { lapTicks: [360 + 4800, 360 + 4800 + 4680] };
  it('a Time Trial or Daily has nobody to be placed against: no place numeral, the finished laps instead, the fastest marked', () => {
    const k = kart();
    const vm = hudModel(race({ karts: [k], trackers: [tr], goTick: 360 } as never), k, 1, 10, newHudMemory(), 0, defs, 0);
    expect(vm.solo).toBe(true);
    expect(vm.splits).toEqual([{ lap: 1, time: '0:40.00', best: false }, { lap: 2, time: '0:39.00', best: true }]);
    // a Time Trial's ghost is no racer
    const ghost = { ...kart(), isGhost: true };
    expect(hudModel(race({ karts: [k, ghost], trackers: [tr, tr], goTick: 360 } as never), k, 1, 10, newHudMemory(), 0, defs, 0).solo).toBe(true);
    // a field: a place to show and no splits
    const field = hudModel(race({ karts: [k, kart()], trackers: [tr, tr], goTick: 360 } as never), k, 1, 10, newHudMemory(), 0, defs, 0);
    expect([field.solo, field.splits.length]).toEqual([false, 0]);
  });

  it('one lap has no fastest yet; none has no splits', () => {
    expect(lapSplits([360 + 4800], 360)).toEqual([{ lap: 1, time: '0:40.00', best: false }]);
    expect(lapSplits([], 360)).toEqual([]);
  });

  it('at a lap line the lap just run pops with the run against the best there (the running total), for UI.lapPopSeconds of race time (25 Sept 2026)', () => {
    const hold = UI.lapPopSeconds * 120; // ticks (SIM_HZ 120)
    const k = kart();
    // lap 1 crossed at 40.00 s, lap 2 at 79.00 s; the best was at 40.42 s and 78.69 s
    const best = [40420, 78690, 118000];
    const at = (tick: number, splits?: number[]) => hudModel(race({ karts: [k], trackers: [tr], goTick: 360, tick, mode: 'timeTrial' } as never), k, 1, 10, newHudMemory(), 0, defs, 0, false, undefined, splits).lapPop;
    const line2 = tr.lapTicks[1];
    expect(at(line2, best)).toEqual({ lap: 2, delta: { text: '+0.31', ahead: false, words: '0.31 seconds behind your best' } });
    expect(at(line2 + hold - 1, best)?.lap).toBe(2);
    expect(at(line2 + hold, best)).toBeNull(); // gone after its hold
    // lap 1, just over its line: ahead
    expect(lapPop([tr.lapTicks[0]], 360, tr.lapTicks[0] + 10, best)?.delta).toMatchObject({ text: '−0.42', ahead: true });
    // no best yet (a first run, the Daily, a best from before the lines were kept): the lap time alone
    expect(at(line2)).toEqual({ lap: 2, delta: null });
    expect(at(line2, [40420])).toEqual({ lap: 2, delta: null });
    // before the first line, and in a field of racers: none
    expect(lapPop([], 360, 900, best)).toBeNull();
    const field = hudModel(race({ karts: [k, kart()], trackers: [tr, tr], goTick: 360, tick: line2 } as never), k, 1, 10, newHudMemory(), 0, defs, 0, false, undefined, best);
    expect(field.lapPop).toBeNull();
  });
});
