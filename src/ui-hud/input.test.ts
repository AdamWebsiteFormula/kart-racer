import { describe, expect, it } from 'vitest';
import { UI } from './constants.ts';
import { isPauseKey, navFromKey, navFromPad, newRepeat, repeat } from './input.ts';

describe('input', () => {
  it('keys map onto the six actions', () => {
    expect(['ArrowUp', 'KeyS', 'ArrowLeft', 'KeyD', 'Enter', 'Space', 'Escape'].map((c) => navFromKey(c)))
      .toEqual(['up', 'down', 'left', 'right', 'confirm', 'confirm', 'back']);
    expect(navFromKey('KeyQ')).toBeNull();
  });

  it('falls back to the key value when the code is empty, never when it is set', () => {
    expect(navFromKey('', 'Enter')).toBe('confirm');
    expect(navFromKey('', 'ArrowLeft')).toBe('left');
    expect(navFromKey('KeyQ', 'Enter')).toBeNull();
    expect(isPauseKey('', 'Escape')).toBe(true);
    expect(isPauseKey('KeyP')).toBe(true);
    expect(isPauseKey('KeyE', 'p')).toBe(false);
  });

  it('gamepad d-pad, stick and face buttons', () => {
    const b = (i: number) => Array.from({ length: 16 }, (_, k) => k === i);
    expect(navFromPad(b(12), [0, 0])).toBe('up');
    expect(navFromPad(b(-1), [0.9, 0])).toBe('right');
    expect(navFromPad(b(-1), [0.3, 0])).toBeNull();
    expect(navFromPad(b(0), [0, 0])).toBe('confirm');
    expect(navFromPad(b(1), [0, 0])).toBe('back');
  });

  it('a held direction fires once, waits the delay, then repeats at the rate; confirm never repeats', () => {
    const st = newRepeat();
    const fired: number[] = [];
    for (let t = 0; t <= 400; t += 10) if (repeat(st, 'down', t)) fired.push(t);
    expect(fired[0]).toBe(0);
    expect(fired[1]).toBe(UI.repeatDelayMs);
    expect(fired[2] - fired[1]).toBe(UI.repeatRateMs);
    const c = newRepeat();
    let n = 0;
    for (let t = 0; t <= 400; t += 10) if (repeat(c, 'confirm', t)) n++;
    expect(n).toBe(1);
  });
});
