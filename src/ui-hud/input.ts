// Keys and the gamepad standard mapping onto the six NavActions, with held-stick repeat. Pure.
import { UI } from './constants.ts';
import type { NavAction } from './types.ts';

const KEYS: Readonly<Record<string, NavAction>> = Object.freeze({
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  Enter: 'confirm', Space: 'confirm', NumpadEnter: 'confirm',
  Escape: 'back', Backspace: 'back',
});

export function navFromKey(code: string): NavAction | null {
  return KEYS[code] ?? null;
}

/** Standard mapping: 0 = A (confirm), 1 = B (back), 9 = Start (back = pause in a race), 12–15 = d-pad. */
export function navFromPad(buttons: readonly boolean[], axes: readonly number[]): NavAction | null {
  if (buttons[12] || (axes[1] ?? 0) < -UI.stickDeadZone) return 'up';
  if (buttons[13] || (axes[1] ?? 0) > UI.stickDeadZone) return 'down';
  if (buttons[14] || (axes[0] ?? 0) < -UI.stickDeadZone) return 'left';
  if (buttons[15] || (axes[0] ?? 0) > UI.stickDeadZone) return 'right';
  if (buttons[0]) return 'confirm';
  if (buttons[1] || buttons[9]) return 'back';
  return null;
}

export interface RepeatState { held: NavAction | null; since: number; lastFire: number }
export const newRepeat = (): RepeatState => ({ held: null, since: 0, lastFire: 0 });

/**
 * Turns a held action sampled every frame into discrete presses: one at once, then after
 * repeatDelayMs one every repeatRateMs. Confirm and back never repeat.
 */
export function repeat(st: RepeatState, action: NavAction | null, nowMs: number): NavAction | null {
  if (action !== st.held) {
    st.held = action;
    st.since = nowMs;
    st.lastFire = nowMs;
    return action;
  }
  if (!action || action === 'confirm' || action === 'back') return null;
  if (nowMs - st.since < UI.repeatDelayMs) return null;
  if (nowMs - st.lastFire < UI.repeatRateMs) return null;
  st.lastFire = nowMs;
  return action;
}
