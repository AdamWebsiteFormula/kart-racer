// The driving assists (game/assist.ts), one tick at a time on the real Harbor Loop: Auto-accelerate's
// gas, and where Steering assist does and does not turn the wheel. The whole-race gates (a lap driven
// straight, the replay of its log) are in assist.e2e.test.ts.
import { describe, expect, it } from 'vitest';
import { makeConstants } from '../kart-controller/constants.ts';
import { SIM_DT } from '../kart-controller/step.ts';
import { createKartState, headingOf, NEUTRAL_INPUT, type InputState, type KartState } from '../kart-controller/types.ts';
import type { RacePhase } from '../race-manager/types.ts';
import { BUILDER } from '../track-builder/constants.ts';
import { buildTrack } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { ASSIST, autoGas, DriveAssist, safeLine, type AssistSettings } from './assist.ts';

const FILES = import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' }) as Record<string, TrackDefinition>;
const def = (id: string) => Object.values(FILES).find((d) => d.id === id)!;
const harbor = buildTrack(def('harbour-loop'));
const c = makeConstants('medium', 150);
const STEER: AssistSettings = { autoAccelerate: false, steeringAssist: true };
const OFF: AssistSettings = { autoAccelerate: false, steeringAssist: false };

/** A kart on Harbor Loop's main road at t, `lat` metres right of centre, `turn` rad off the road's heading (+ = toward its right), at `speed`. */
function kartAt(t: number, lat: number, turn = 0, speed = 25): KartState {
  const s = harbor.sample(t, lat, 0);
  const k = createKartState({ racerId: 'juniper', isPlayer: true, position: [...s.position], heading: headingOf(harbor.sample(t, 0, 0).tangent) + turn, t });
  k.speed = speed;
  return k;
}

const input = (o: Partial<InputState> = {}): InputState => ({ ...NEUTRAL_INPUT, throttle: 1, ...o });

/** The input after `ticks` ticks on the same kart (the ask eases in over a few). */
function settle(a: DriveAssist, raw: InputState, k: KartState, set = STEER, phase: RacePhase = 'racing', ticks = 40): InputState {
  let out = raw;
  for (let i = 0; i < ticks; i++) out = { ...a.apply(raw, k, phase, set, SIM_DT) };
  return out;
}

/** Harbor Loop's start straight, and a stretch of its left edge that is open (the drop the claw fetches you from). */
const START = harbor.startT;
const DROP_T = 0.53;

describe('Auto-accelerate', () => {
  it('holds the gas from GO, never in the countdown, and lets the brake brake', () => {
    expect(autoGas(NEUTRAL_INPUT, 'countdown')).toBe(0);
    expect(autoGas({ ...NEUTRAL_INPUT, throttle: 1 }, 'countdown')).toBe(1); // the player's own press on the 2 (the start boost)
    expect(autoGas(NEUTRAL_INPUT, 'racing')).toBe(1);
    expect(autoGas(NEUTRAL_INPUT, 'finalLap')).toBe(1);
    // the brake: the player's own input, so it brakes (and reverses once stopped)
    expect(autoGas({ ...NEUTRAL_INPUT, brake: 1 }, 'racing')).toBe(0);
    expect(autoGas({ ...NEUTRAL_INPUT, brake: ASSIST.gasBrakeMin }, 'racing')).toBe(0);
    // a pad's trigger resting a hair off zero does not take the gas away
    expect(autoGas({ ...NEUTRAL_INPUT, brake: 0.05 }, 'racing')).toBe(1);
  });

  it('changes nothing but the gas: steer, drift, items and look-back are the player\'s', () => {
    const a = new DriveAssist(harbor, c);
    const raw: InputState = { steer: -0.4, throttle: 0, brake: 0, drift: true, item: true, lookBack: true, horn: true };
    const frozen = Object.freeze({ ...raw });
    const out = a.apply(frozen, kartAt(START, 0), 'racing', { autoAccelerate: true, steeringAssist: false }, SIM_DT);
    expect(out).toEqual({ ...raw, throttle: 1 });
    expect(a.apply(frozen, kartAt(START, 0), 'countdown', { autoAccelerate: true, steeringAssist: false }, SIM_DT)).toEqual(raw);
    expect(a.working).toBe(false);
  });
});

describe('Steering assist', () => {
  it('both off: the input goes through untouched (and is never written)', () => {
    const a = new DriveAssist(harbor, c);
    const raw = Object.freeze(input({ steer: 0.3, drift: true }));
    expect(a.apply(raw, kartAt(START, 6, 0.4), 'racing', OFF, SIM_DT)).toEqual(raw);
  });

  it('leaves a kart in the middle of the road alone', () => {
    const a = new DriveAssist(harbor, c);
    expect(settle(a, input(), kartAt(START, 0))).toEqual(input());
    expect(a.working).toBe(false);
    // easing across the middle of the road is no business of it either
    expect(settle(a, input(), kartAt(START, 0, 0.06)).steer).toBe(0);
  });

  it('near the edge and heading off the road, it turns back toward the middle (either side)', () => {
    const hw = harbor.sample(START, 0, 0).halfWidth;
    for (const side of [1, -1]) {
      const a = new DriveAssist(harbor, c);
      const out = settle(a, input(), kartAt(START, side * (hw - 1), side * 0.25));
      expect(out.steer * side, `side ${side}`).toBeLessThan(-0.3);
      expect(a.working).toBe(true);
      // it eases in: the first tick is a small turn, not a snap
      expect(Math.abs(new DriveAssist(harbor, c).apply(input(), kartAt(START, side * (hw - 1), side * 0.25), 'racing', STEER, SIM_DT).steer)).toBeCloseTo(ASSIST.easeRate * SIM_DT, 6);
    }
  });

  it('strong input toward the land wins (a player cutting across the grass on purpose); a light touch does not', () => {
    const hw = harbor.sample(START, 0, 0).halfWidth;
    const k = kartAt(START, hw - 1, 0.25);
    expect(settle(new DriveAssist(harbor, c), input({ steer: 1 }), k).steer).toBe(1);
    expect(settle(new DriveAssist(harbor, c), input({ steer: 0.2 }), k).steer).toBeLessThan(0);
    // steering away already, it only adds what is still wanting, never less than the player's own
    expect(settle(new DriveAssist(harbor, c), input({ steer: -0.5 }), k).steer).toBeLessThanOrEqual(-0.5);
  });

  it('before a drop it holds even a full stick toward it, and lifts the gas when the wheel is not enough', () => {
    const edge = harbor.sample(DROP_T, 0, 0);
    expect((edge.open ?? 0) & 1).toBe(1); // Harbor's open edge is on its left (negative lateral)
    const a = new DriveAssist(harbor, c);
    const out = settle(a, input({ steer: -1 }), kartAt(DROP_T, -(edge.halfWidth - 0.5), -0.45));
    expect(out.steer).toBeGreaterThan(0);
    expect(out.throttle).toBe(0);
    expect(a.working).toBe(true);
    // a kart square to the road near the drop, stick centred: nothing to do
    expect(settle(new DriveAssist(harbor, c), input(), kartAt(DROP_T, -(edge.halfWidth - 2.5))).steer).toBe(0);
  });

  it('keeps its hands off in the countdown, in a spin, in the air, when slow or facing the wrong way, and once over the line', () => {
    const hw = harbor.sample(START, 0, 0).halfWidth;
    const out = (k: KartState, phase: RacePhase = 'racing') => settle(new DriveAssist(harbor, c), input(), k, STEER, phase);
    const edgy = () => kartAt(START, hw - 1, 0.25);
    expect(out(edgy(), 'countdown').steer).toBe(0);
    expect(out(edgy(), 'finished').steer).toBe(0);
    const spin = edgy(); spin.status.spinRemaining = 0.5;
    const air = edgy(); air.grounded = false;
    const slow = kartAt(START, hw - 1, 0.25, ASSIST.minSpeed - 1);
    const back = kartAt(START, hw - 1, Math.PI);
    const done = edgy(); done.finishTick = 100;
    for (const k of [spin, air, slow, back, done]) expect(out(k).steer).toBe(0);
    // and the drift hop's landing side is the player's: in the air it adds nothing
    expect(out(air).steer).toBe(0);
  });

  it('never changes whether a drift locks or which way (kart-controller drift.ts): the player\'s button and stick decide', () => {
    const hw = harbor.sample(START, 0, 0).halfWidth;
    // the button held, the stick short of a late drift: the nudge stays short of it too
    const out = settle(new DriveAssist(harbor, c), input({ drift: true }), kartAt(START, hw - 1, 0.25));
    expect(out.steer).toBeLessThan(0);
    expect(Math.abs(out.steer)).toBeLessThan(c.driftLateSteer);
    // a late drift asked for toward the edge: it still locks, on the player's side
    const late = settle(new DriveAssist(harbor, c), input({ drift: true, steer: 0.5 }), kartAt(START, hw - 1, 0.25));
    expect(late.steer).toBeGreaterThanOrEqual(c.driftLateSteer);
    // the tick a hop lands, its stick sets the drift's side: hands off
    const hop = kartAt(START, hw - 1, 0.25);
    hop.drift.phase = 'hopping';
    expect(settle(new DriveAssist(harbor, c), input({ drift: true }), hop).steer).toBe(0);
  });

  it('a shortcut the kart heads into is road: no nudge back onto the road it leaves, unless that shortcut is closed', () => {
    const track = buildTrack(def('harbour-loop'));
    const beach = track.branches.byId('beach')!;
    // Harbor's beach peels off to the left: a tenth of the way along, its middle is 5.7 m left of the
    // main road's, still on the main road (the kart is handed over further on). A kart there, pointed down the beach:
    const tIn = (beach.entryT + beach.span * 0.1) % 1;
    const on = track.sample(tIn, 0, beach.index);
    const t = track.nearestT(on.position, tIn, 0.01);
    const main = track.sample(t, 0, 0);
    const lat = (on.position[0] - main.position[0]) * main.tangent[2] - (on.position[2] - main.position[2]) * main.tangent[0];
    expect(lat).toBeLessThan(-5);
    expect(-lat).toBeLessThan(main.halfWidth - BUILDER.branchLeaveMargin);
    const k = createKartState({ racerId: 'juniper', isPlayer: true, position: [...on.position], heading: headingOf(on.tangent), t });
    k.speed = 25;
    const open = settle(new DriveAssist(track, c), input(), k);
    // the beach shut (the tide in): the same kart is heading off the main road's left edge, and is turned back
    beach.forcedOpen = false;
    const closed = settle(new DriveAssist(track, c), input(), k);
    expect(open.steer).toBe(0);
    expect(closed.steer).toBeGreaterThan(0.2);
  });
});

describe('the safe line', () => {
  it('sits inside the curb before a drop, at the curb before the land, and clear of a wall', () => {
    const drop = harbor.sample(DROP_T, 0, 0), land = harbor.sample(START, 0, 0);
    expect(safeLine(drop, -1, c.kartRadius)).toEqual({ line: drop.halfWidth + BUILDER.kerbWidth - ASSIST.dropMargin, drop: true });
    // the drop is on the left only: the right is the land
    expect(safeLine(drop, 1, c.kartRadius)).toEqual({ line: drop.halfWidth + BUILDER.kerbWidth - ASSIST.landMargin, drop: false });
    expect(safeLine(land, 1, c.kartRadius)).toEqual({ line: land.halfWidth + BUILDER.kerbWidth - ASSIST.landMargin, drop: false });
    // Boardwalk Nights is a pier: a kickboard at the road's edge
    const pier = buildTrack(def('boardwalk-nights')).sample(0.05, 0, 0);
    expect(safeLine(pier, 1, c.kartRadius)).toEqual({ line: pier.halfWidth - c.kartRadius - ASSIST.wallMargin, drop: false });
  });
});
