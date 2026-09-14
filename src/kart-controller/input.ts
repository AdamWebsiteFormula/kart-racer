// Keyboard + gamepad → InputState, sampled once per sim tick. Browser only;
// the sim never imports this.
import { NEUTRAL_INPUT, type InputState } from './types.ts';

export interface KeyMap {
  left: string[]; right: string[]; throttle: string[]; brake: string[];
  drift: string[]; item: string[]; lookBack: string[]; horn: string[];
}

export const DEFAULT_KEYS: Readonly<KeyMap> = Object.freeze({
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  throttle: ['ArrowUp', 'KeyW'],
  brake: ['ArrowDown', 'KeyS'],
  drift: ['ShiftLeft', 'ShiftRight', 'Space'],
  item: ['KeyE', 'ControlLeft'],
  lookBack: ['KeyQ'],
  horn: ['KeyH'],
});

/** Standard-mapping gamepad: left stick X, RT throttle, LT brake, A drift, X item, B look back, Y horn. */
export const GAMEPAD = Object.freeze({ steerAxis: 0, throttleButton: 7, brakeButton: 6, drift: 0, item: 2, lookBack: 1, horn: 3, deadZone: 0.15 });

/** Pure: keys held + optional gamepad snapshot → InputState. Testable without a DOM. */
export function mapInput(held: ReadonlySet<string>, pad: Gamepad | null, keys: KeyMap = DEFAULT_KEYS): InputState {
  const any = (list: string[]) => list.some((k) => held.has(k));
  let steer = (any(keys.right) ? 1 : 0) - (any(keys.left) ? 1 : 0);
  let throttle = any(keys.throttle) ? 1 : 0;
  let brake = any(keys.brake) ? 1 : 0;
  let drift = any(keys.drift);
  let item = any(keys.item);
  let lookBack = any(keys.lookBack);
  let horn = any(keys.horn);
  if (pad) {
    const x = pad.axes[GAMEPAD.steerAxis] ?? 0;
    if (Math.abs(x) > GAMEPAD.deadZone && steer === 0) steer = Math.sign(x) * (Math.abs(x) - GAMEPAD.deadZone) / (1 - GAMEPAD.deadZone);
    throttle = Math.max(throttle, pad.buttons[GAMEPAD.throttleButton]?.value ?? 0);
    brake = Math.max(brake, pad.buttons[GAMEPAD.brakeButton]?.value ?? 0);
    drift ||= pad.buttons[GAMEPAD.drift]?.pressed ?? false;
    item ||= pad.buttons[GAMEPAD.item]?.pressed ?? false;
    lookBack ||= pad.buttons[GAMEPAD.lookBack]?.pressed ?? false;
    horn ||= pad.buttons[GAMEPAD.horn]?.pressed ?? false;
  }
  return { ...NEUTRAL_INPUT, steer, throttle, brake, drift, item, lookBack, horn };
}

/** Listens to the window; call sample() once per sim tick. */
export class InputSource {
  private held = new Set<string>();
  private target: Window;
  private keys: KeyMap;
  constructor(target: Window = window, keys: KeyMap = DEFAULT_KEYS) {
    this.target = target;
    this.keys = keys;
    target.addEventListener('keydown', this.onDown);
    target.addEventListener('keyup', this.onUp);
    target.addEventListener('blur', this.onBlur);
  }
  private onDown = (e: KeyboardEvent) => { this.held.add(e.code); };
  private onUp = (e: KeyboardEvent) => { this.held.delete(e.code); };
  private onBlur = () => { this.held.clear(); };
  sample(): InputState {
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads.find((p): p is Gamepad => !!p && p.mapping === 'standard') ?? null;
    return mapInput(this.held, pad, this.keys);
  }
  dispose(): void {
    this.target.removeEventListener('keydown', this.onDown);
    this.target.removeEventListener('keyup', this.onUp);
    this.target.removeEventListener('blur', this.onBlur);
  }
}
