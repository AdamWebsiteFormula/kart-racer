import { describe, expect, it } from 'vitest';
import { NEUTRAL_INPUT, type InputState, type KartEvent } from '../kart-controller/types.ts';
import { buildTrack } from '../track-builder/track.ts';
import { GO_TICK, STEP_TICKS, stepCountdown } from './countdown.ts';
import { OVAL, spawnKart } from './__tests__/fixtures.ts';
import type { RaceEvent } from './types.ts';

const track = buildTrack(OVAL);

function run(inputAt: (tick: number) => InputState) {
  const k = spawnKart(track, 0);
  const events: RaceEvent[] = [];
  const kartEvents: KartEvent[][] = [[]];
  const goAt: number[] = [];
  for (let tick = 0; tick <= GO_TICK; tick++) {
    if (stepCountdown(tick, [k.s], [k.tr], [inputAt(tick)], [k.c], events, kartEvents)) goAt.push(tick);
  }
  return { k, events, kartEvents: kartEvents[0], goAt };
}

describe('countdown', () => {
  it('3-2-1 on the step ticks, go on the go tick', () => {
    expect(STEP_TICKS).toBe(120);
    expect(GO_TICK).toBe(360);
    const { events, goAt } = run(() => NEUTRAL_INPUT);
    expect(events).toEqual([
      { type: 'countdown', stepsLeft: 3 },
      { type: 'countdown', stepsLeft: 2 },
      { type: 'countdown', stepsLeft: 1 },
      { type: 'go' },
    ]);
    expect(goAt).toEqual([GO_TICK]);
  });

  it('throttle held from 0.2 s before go earns the start boost; from 0.5 s earns none; a release resets', () => {
    const late = run((t) => (t >= GO_TICK - 24 ? { ...NEUTRAL_INPUT, throttle: 1 } : NEUTRAL_INPUT));
    expect(late.k.s.boost.source).toBe('start');
    expect(late.kartEvents).toEqual([{ type: 'boostStart', source: 'start', multiplier: late.k.c.startBoostMultiplier, seconds: late.k.c.startBoostSeconds }]);
    const early = run((t) => (t >= GO_TICK - 60 ? { ...NEUTRAL_INPUT, throttle: 1 } : NEUTRAL_INPUT));
    expect(early.k.s.boost.source).toBe('none');
    // held early, released, pressed again inside the window
    const tap = run((t) => (t < GO_TICK - 100 || t >= GO_TICK - 24 ? { ...NEUTRAL_INPUT, throttle: 1 } : NEUTRAL_INPUT));
    expect(tap.k.s.boost.source).toBe('start');
  });
});
