// The engine's own rev (rev.ts): how it climbs and falls with the gas, the limiter, blips, pops and
// crackles, the road taking it over, the launches, and the grid's read of the start (the sim's own
// rule, tick for tick). It only reads the kart state and the input.
import { describe, expect, it } from 'vitest';
import { GO_TICK, stepCountdown } from '../race-manager/countdown.ts';
import { RACE } from '../race-manager/constants.ts';
import { OVAL, spawnKart } from '../race-manager/__tests__/fixtures.ts';
import type { RaceEvent } from '../race-manager/types.ts';
import { buildTrack } from '../track-builder/track.ts';
import { makeConstants } from './constants.ts';
import { ENGINE_REV as R, EngineRev, readStart } from './rev.ts';
import { SIM_DT } from './step.ts';
import { createKartState, NEUTRAL_INPUT, type InputState, type KartEvent, type KartState } from './types.ts';

const c = makeConstants('medium', 150);
const dt = SIM_DT;
const GAS: InputState = { ...NEUTRAL_INPUT, throttle: 1 };
const still = (): KartState => createKartState({ racerId: 'x' });

/** Tick `rev` for `seconds` with `input` on `s`, calling `each` after every tick. */
function run(rev: EngineRev, s: KartState, input: InputState, seconds: number, each?: (i: number) => void): void {
  for (let i = 0; i < Math.round(seconds / dt); i++) { rev.tick(s, input, dt); each?.(i); }
}

function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object') { Object.freeze(o); for (const v of Object.values(o)) deepFreeze(v); }
  return o;
}

describe('EngineRev: the gas revs the engine', () => {
  it('the gas down at a standstill climbs to the limiter in under half a second; let go, it falls back slower', () => {
    const rev = new EngineRev(c), s = still();
    let reached = -1;
    run(rev, s, GAS, 1, (i) => { if (reached < 0 && rev.rev > 0.9) reached = (i + 1) * dt; });
    expect(reached).toBeGreaterThan(0.15);
    expect(reached).toBeLessThan(0.45);
    expect(rev.limiting).toBe(1);
    let fell = -1;
    run(rev, s, NEUTRAL_INPUT, 2, (i) => { if (fell < 0 && rev.rev < 0.1) fell = (i + 1) * dt; });
    // the fall takes longer than the climb, and it settles at idle
    expect(fell).toBeGreaterThan(reached * 1.5);
    expect(fell).toBeLessThan(1.4);
    expect(rev.rev).toBeLessThan(0.02);
    expect(rev.limiting).toBe(0);
  });

  it('held at the limiter it bounces: a cut about limitHz times a second, each dropping it limitDip', () => {
    const rev = new EngineRev(c), s = still();
    run(rev, s, GAS, 0.6);
    let lo = 1, hi = 0, cuts = 0, last = rev.cut;
    run(rev, s, GAS, 1, () => { lo = Math.min(lo, rev.rev); hi = Math.max(hi, rev.rev); if (rev.cut > last + 0.5) cuts++; last = rev.cut; });
    expect(hi).toBeCloseTo(1, 2);
    expect(lo).toBeCloseTo(1 - R.limitDip, 2);
    expect(cuts).toBeGreaterThanOrEqual(R.limitHz - 1);
    expect(cuts).toBeLessThanOrEqual(R.limitHz + 1);
  });

  it('a light press revs part way: no limiter', () => {
    const rev = new EngineRev(c), s = still();
    run(rev, s, { ...NEUTRAL_INPUT, throttle: 0.5 }, 1.5);
    expect(rev.rev).toBeGreaterThan(0.5);
    expect(rev.rev).toBeLessThan(0.65);
    expect(rev.limiting).toBe(0);
  });

  it('a tap is a blip: it climbs and falls back, stamped with its size', () => {
    const rev = new EngineRev(c), s = still();
    run(rev, s, NEUTRAL_INPUT, 0.3);
    run(rev, s, GAS, 0.12);
    expect(rev.blipAt).toBeCloseTo(0.3 + dt, 6);
    expect(rev.blipSize).toBeCloseTo(1, 6);
    let peak = 0;
    run(rev, s, NEUTRAL_INPUT, 1, () => { peak = Math.max(peak, rev.rev); });
    expect(peak).toBeGreaterThan(0.35);
    expect(peak).toBeLessThan(R.popAbove); // a short tap never pops
    expect(rev.pops).toBe(0);
    expect(rev.rev).toBeLessThan(0.1);
    // pressed again while it still revs high: no new blip
    run(rev, s, GAS, 0.4);
    const at = rev.blipAt;
    run(rev, s, NEUTRAL_INPUT, 0.05);
    run(rev, s, GAS, 0.05);
    expect(rev.blipAt).toBe(at);
  });

  it('let off after a high rev it pops, then crackles a couple of times, smaller; back on the gas the crackle stops', () => {
    const rev = new EngineRev(c), s = still();
    run(rev, s, GAS, 0.8);
    rev.tick(s, NEUTRAL_INPUT, dt);
    expect(rev.pops).toBe(1);
    expect(rev.popSize).toBeGreaterThan(0.9);
    const sizes: number[] = [];
    let n = 1;
    run(rev, s, NEUTRAL_INPUT, 1, () => { if (rev.pops > n) { n = rev.pops; sizes.push(rev.popSize); } });
    expect(sizes.length).toBe(R.crackles);
    for (const z of sizes) { expect(z).toBeLessThan(0.7); expect(z).toBeGreaterThan(0.2); }
    // a let-off whose crackle is cut short by the gas
    run(rev, s, GAS, 0.8);
    rev.tick(s, NEUTRAL_INPUT, dt);
    const was = rev.pops;
    run(rev, s, GAS, 0.5);
    expect(rev.pops).toBe(was);
  });

  it('on the road the speed has the engine: no blips, pops or rumble share', () => {
    const rev = new EngineRev(c), s = still();
    s.speed = 20;
    run(rev, s, GAS, 1);
    expect(rev.load).toBe(1);
    run(rev, s, NEUTRAL_INPUT, 0.2);
    run(rev, s, GAS, 0.3);
    run(rev, s, NEUTRAL_INPUT, 0.3);
    expect(rev.pops).toBe(0);
    expect(rev.blipAt).toBe(-Infinity);
    expect(rev.heat).toBeLessThan(0.01);
    s.speed = (R.clutchIn + R.clutchFull) / 2;
    rev.tick(s, GAS, dt);
    expect(rev.load).toBeCloseTo(0.5, 6);
  });

  it('the pipes heat with the rev and cool slower', () => {
    const rev = new EngineRev(c), s = still();
    run(rev, s, GAS, 1.5);
    expect(rev.heat).toBeGreaterThan(0.9);
    let cool = -1;
    run(rev, s, NEUTRAL_INPUT, 3, (i) => { if (cool < 0 && rev.heat < 0.2) cool = (i + 1) * dt; });
    expect(cool).toBeGreaterThan(1);
  });

  it('reads the kart and the input, never writes them; a tick of no time does nothing', () => {
    const rev = new EngineRev(c), s = deepFreeze(still()), gas = deepFreeze({ ...GAS });
    expect(() => run(rev, s, gas, 1)).not.toThrow();
    const r = rev.rev;
    rev.tick(s, gas, 0);
    expect(rev.rev).toBe(r);
    expect(Number.isFinite(rev.heat)).toBe(true);
  });
});

describe('EngineRev: the start', () => {
  it('reads the start as the sim decides it, for a press on every tick of the countdown', () => {
    const track = buildTrack(OVAL);
    const mismatches: number[] = [];
    const seen = new Set<string>();
    for (let press = 0; press <= GO_TICK; press += 3) {
      const k = spawnKart(track, 0), rev = new EngineRev(k.c);
      const events: RaceEvent[] = [], kartEvents: KartEvent[][] = [[]];
      let read = 'none';
      for (let tick = 0; tick <= GO_TICK; tick++) {
        const input = tick >= press ? GAS : NEUTRAL_INPUT;
        stepCountdown(tick, [k.s], [k.tr], [input], [k.c], events, kartEvents);
        rev.tick(k.s, input, dt, GO_TICK - tick);
        read = rev.start;
      }
      seen.add(read);
      if ((read === 'ready') !== (k.s.boost.source === 'start')) mismatches.push(press);
    }
    expect(mismatches).toEqual([]);
    expect([...seen].sort()).toEqual(['early', 'late', 'ready']);
    // the pure rule, at its edges
    expect(readStart(c.startBoostCentreSeconds, c)).toBe('ready');
    expect(readStart(c.startBoostCentreSeconds + c.startBoostWindowSeconds, c)).toBe('early');
    expect(readStart(c.startBoostCentreSeconds - c.startBoostWindowSeconds, c)).toBe('late');
    expect(readStart(Number.NaN, c)).toBe('none');
  });

  it('counts the gas down past the sim own threshold', () => {
    expect(R.gasOn).toBe(RACE.stuckInputMin);
  });

  it('launches: a start boost, a start held too early (a cough: the rev drops, a backfire and crackles), a hard one, a soft one', () => {
    const go = (pressAt: number, boost: boolean, gas = GAS) => {
      const rev = new EngineRev(c), s = still();
      for (let tick = 0; tick <= GO_TICK; tick++) rev.tick(s, tick >= pressAt ? gas : NEUTRAL_INPUT, dt, GO_TICK - tick);
      if (boost) { s.boost.source = 'start'; s.boost.remaining = c.startBoostSeconds; }
      const before = rev.rev;
      s.speed = 0.2;
      rev.tick(s, gas, dt, -1);
      return { rev, before };
    };
    const ready = go(GO_TICK - 240, true);
    expect(ready.rev.launch).toBe('boost');
    expect(ready.rev.pops).toBe(0);
    const early = go(0, false);
    expect(early.rev.launch).toBe('early');
    expect(early.rev.rev).toBeLessThan(early.before - R.cough * 0.8);
    expect(early.rev.pops).toBe(1);
    expect(early.rev.popSize).toBe(1);
    const late = go(GO_TICK - 60, false);
    expect(late.rev.launch).toBe('hard');
    const soft = go(GO_TICK + 10, false);
    expect(soft.rev.launch).toBe('soft');
    // a launch is read once: the start is spent
    expect(early.rev.start).toBe('none');
  });
});
