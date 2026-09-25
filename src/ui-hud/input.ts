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

/** By `key` value, for events whose `code` is empty (some virtual keyboards and automation). */
const BY_KEY: Readonly<Record<string, NavAction>> = Object.freeze({
  ArrowUp: 'up', w: 'up', W: 'up',
  ArrowDown: 'down', s: 'down', S: 'down',
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
  Enter: 'confirm', ' ': 'confirm',
  Escape: 'back', Backspace: 'back',
});

/** `code` first (layout-independent WASD), `key` when the code is missing. */
export function navFromKey(code: string, key = ''): NavAction | null {
  return KEYS[code] ?? (code ? null : BY_KEY[key] ?? null);
}

/** Is this the pause key (Escape or P) by code or, failing that, by key? */
export function isPauseKey(code: string, key = ''): boolean {
  return code === 'Escape' || code === 'KeyP' || (!code && (key === 'Escape' || key === 'p' || key === 'P'));
}

/**
 * Is this F, the fullscreen key on any screen (fullscreen.ts)? By code, or by key when the code is empty;
 * never with Ctrl, Cmd or Alt (the browser's find is Ctrl+F or Cmd+F). F drives nothing (kart-controller DEFAULT_KEYS).
 */
export function isFullscreenKey(e: { code: string; key: string; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean }): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  return e.code === 'KeyF' || (!e.code && (e.key === 'f' || e.key === 'F'));
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
