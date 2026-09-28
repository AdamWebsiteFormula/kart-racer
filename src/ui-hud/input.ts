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

/** Keys that only change another key (and the lock keys): pressed alone they are no press of their own. */
const MODIFIERS: ReadonlySet<string> = new Set(['Shift', 'Control', 'Alt', 'AltGraph', 'Meta', 'OS', 'Super', 'Hyper', 'Fn', 'FnLock', 'CapsLock', 'NumLock', 'ScrollLock', 'Symbol', 'SymbolLock']);

/**
 * Does this key press the start screen through ("Press any key", design §12)? Any key a browser starts sound from:
 * not Escape (never a user activation: html.spec.whatwg.org, "activation triggering input event"), not a modifier or
 * lock key alone (it only changes another key, and a browser need not count it), not a browser shortcut (with Ctrl,
 * Cmd or Alt: the browser's), not an auto-repeat. So the press that ends the start screen can start the title music.
 */
export function pressesStart(e: { key: string; repeat?: boolean; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean }): boolean {
  return !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey && e.key !== 'Escape' && e.key !== 'Esc' && !MODIFIERS.has(e.key) && e.key !== 'Dead' && e.key !== 'Unidentified';
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

/**
 * Is this Y, the Stats key on the Racer and Kart screens (Mario Kart World shows its vehicle stats on Y, "Details";
 * ours on Y on the keys and a pad alike, UI.padStatsButton)? By code, or by key when the code is empty; never with
 * Ctrl, Cmd or Alt. Y drives nothing (kart-controller DEFAULT_KEYS).
 */
export function isStatsKey(e: { code: string; key: string; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean }): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  return e.code === 'KeyY' || (!e.code && (e.key === 'y' || e.key === 'Y'));
}

/** Standard mapping: 0 = A (confirm), 1 = B (back), 3 = Y (the stats on the Racer and Kart screens), 9 = Start (back = pause in a race), 12–15 = d-pad. */
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
