import { describe, expect, it } from 'vitest';
import { InputSource, STEER_RAMP, mapInput, rampSteer, type VirtualPad } from './input.ts';

describe('input mapping', () => {
  it('maps keys', () => {
    const i = mapInput(new Set(['ArrowUp', 'KeyA', 'Space']), null);
    expect(i.throttle).toBe(1);
    expect(i.steer).toBe(1); // the sim's + is screen left; the left key turns the kart left on screen
    expect(i.drift).toBe(true);
    expect(i.brake).toBe(0);
  });

  it('left and right together cancel', () => {
    expect(mapInput(new Set(['KeyA', 'KeyD']), null).steer).toBe(0);
  });

  it('gamepad stick has a dead zone and keyboard wins when pressed', () => {
    const pad = { axes: [0.1], buttons: [] } as unknown as Gamepad;
    expect(mapInput(new Set(), pad).steer).toBe(0);
    const pad2 = { axes: [1], buttons: [] } as unknown as Gamepad;
    expect(mapInput(new Set(), pad2).steer).toBeCloseTo(-1); // stick right = screen right = sim −
    expect(mapInput(new Set(['KeyA']), pad2).steer).toBe(1);
  });

  it('keyboard steer ramps to full lock over STEER_RAMP.to and back faster', () => {
    const dt = 1 / 120;
    let v = 0, ticks = 0;
    while (v < 1) { v = rampSteer(v, 1, dt); ticks++; }
    expect(ticks).toBe(Math.round(STEER_RAMP.to / dt));
    ticks = 0;
    while (v > 0) { v = rampSteer(v, 0, dt); ticks++; }
    expect(ticks).toBe(Math.round(STEER_RAMP.back / dt));
    // a flip goes through centre at the fast rate
    expect(rampSteer(1, -1, dt)).toBeCloseTo(1 - dt / STEER_RAMP.back);
  });
});

describe('touch controls (a virtual pad)', () => {
  it('the thumb pad steers analogue, the gas is on, brake wins over gas, buttons add to the keys', () => {
    const win = new EventTarget() as unknown as Window;
    const src = new InputSource(win);
    let pad: ReturnType<VirtualPad> = { steer: 0.6, throttle: 1, brake: 0, drift: false, item: true, lookBack: false };
    src.setVirtual(() => pad);
    const a = src.sample();
    expect(a.steer).toBeCloseTo(0.6, 6); // no key ramp: a thumb is analogue
    expect([a.throttle, a.brake, a.item, a.drift]).toEqual([1, 0, true, false]);
    pad = { steer: 0, throttle: 0, brake: 1, drift: true, item: false, lookBack: true };
    const b = src.sample();
    expect([b.throttle, b.brake, b.drift, b.lookBack]).toEqual([0, 1, true, true]);
    // hidden controls read as nothing at all
    src.setVirtual(() => null);
    const c = src.sample();
    expect([c.throttle, c.brake, c.drift, c.item]).toEqual([0, 0, false, false]);
    src.dispose();
  });
});
