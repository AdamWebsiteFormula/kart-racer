// @vitest-environment jsdom
// Touch controls: the gas before the green light. Fed through the real input merge (InputSource) into
// the real countdown (race-manager), so a phone earns the rocket start the way the gas key does.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InputSource } from '../../kart-controller/input.ts';
import { SIM_DT } from '../../kart-controller/step.ts';
import type { KartEvent } from '../../kart-controller/types.ts';
import { GO_TICK, STEP_TICKS, stepCountdown } from '../../race-manager/countdown.ts';
import { OVAL, spawnKart } from '../../race-manager/__tests__/fixtures.ts';
import type { RaceEvent } from '../../race-manager/types.ts';
import { buildTrack } from '../../track-builder/track.ts';
import { TouchControls } from './touch.ts';

const mm = globalThis.matchMedia;
beforeEach(() => {
  globalThis.matchMedia = ((q: string) => ({ matches: q === '(pointer: coarse)', addEventListener: () => {} })) as never;
  document.body.innerHTML = '';
});
afterEach(() => { globalThis.matchMedia = mm; });

const down = (el: Element, id: number) => el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: id }));
const up = (el: Element, id: number) => el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: id }));

describe('touch gas before the green light (bug hunt 3: a phone could never make a rocket start)', () => {
  it('in the countdown the gas is on only while a finger is down, anywhere; from the green light it is on by itself; Brake still wins', () => {
    const t = new TouchControls(document.body);
    t.show(true);
    expect(t.state(true)!.throttle).toBe(0);
    down(t.root, 1); // a thumb on the screen, off the controls
    expect(t.state(true)!.throttle).toBe(1);
    up(t.root, 1);
    expect(t.state(true)!.throttle).toBe(0);
    down(t.root.querySelector('.tb.drift')!, 2); // a thumb on a control counts too
    expect(t.state(true)!.throttle).toBe(1);
    down(t.root.querySelector('.tb.brake')!, 3);
    expect([t.state(true)!.throttle, t.state(false)!.throttle, t.state(false)!.brake]).toEqual([0, 0, 1]);
    up(t.root, 3); up(t.root, 2);
    expect([t.state(true)!.throttle, t.state(false)!.throttle]).toEqual([0, 1]);
  });

  /** One countdown with the touch controls up and a thumb put down at `touchAt` (null: never). */
  function countdown(touchAt: number | null) {
    const k = spawnKart(buildTrack(OVAL), 0);
    const t = new TouchControls(document.body);
    t.show(true); // main.ts shows them from the race's first frame
    const src = new InputSource(new EventTarget() as unknown as Window);
    let counting = true;
    src.setVirtual(() => t.state(counting)); // as main.ts: the session's phase is 'countdown'
    const events: RaceEvent[] = [];
    const kev: KartEvent[][] = [[]];
    for (let tick = 0; tick <= GO_TICK; tick++) {
      if (tick === touchAt) down(t.root, 1);
      if (stepCountdown(tick, [k.s], [k.tr], [src.sample(SIM_DT)], [k.c], events, kev)) counting = false;
    }
    const afterGo = src.sample(SIM_DT).throttle;
    src.dispose();
    return { boost: k.s.boost.source, afterGo };
  }

  it('thumbs down as the 2 shows earn the rocket start; none, or down from the 3, earn none; the gas comes on at the green light either way', () => {
    expect(countdown(STEP_TICKS)).toEqual({ boost: 'start', afterGo: 1 }); // the 2: 2.0 s before GO
    expect(countdown(null)).toEqual({ boost: 'none', afterGo: 1 });
    expect(countdown(0)).toEqual({ boost: 'none', afterGo: 1 }); // resting from the 3, like the gas key held early
  });
});

describe('touch button labels (detail review)', () => {
  it('the look-back button reads LOOK, not BACK: beside BRAKE, BACK reads as reverse', () => {
    const t = new TouchControls(document.body);
    const label = (id: string) => t.root.querySelector(`.tb.${id}`)!.textContent;
    expect(label('lookBack')).toBe('LOOK');
    expect(label('brake')).toBe('BRAKE');
    expect([...t.root.querySelectorAll('.tb')].map((b) => b.textContent)).not.toContain('BACK');
  });
});

describe('a tap off the controls (sweep 24 Sept 2026)', () => {
  it('is the screen, not a button: the page gets no down class and no button is pressed', () => {
    const t = new TouchControls(document.body);
    t.show(true); // <html data-touch="on">: a tap off the buttons matched it as a button called "on"
    down(t.root, 1);
    expect(document.documentElement.classList.contains('down')).toBe(false);
    const s = t.state(false)!;
    expect([s.drift, s.item, s.lookBack, s.brake]).toEqual([false, false, false, 0]);
    expect(t.state(true)!.throttle).toBe(1); // still a thumb down for the countdown's gas
    up(t.root, 1);
    expect(t.state(true)!.throttle).toBe(0);
  });
});
