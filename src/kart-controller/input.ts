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
  item: ['KeyE', 'KeyX', 'ControlLeft'],
  lookBack: ['KeyQ'],
  horn: ['KeyH'],
});

/** Standard-mapping gamepad: left stick X, RT throttle, LT brake, A drift, X item, B look back, Y horn. */
export const GAMEPAD = Object.freeze({ steerAxis: 0, throttleButton: 7, brakeButton: 6, drift: 0, item: 2, lookBack: 1, horn: 3, deadZone: 0.15 });

/**
 * Pure: keys held + optional gamepad snapshot → InputState. Testable without a DOM.
 * Sign: the sim's positive steer turns toward `rightOf(heading)` = up × forward, which in
 * Three's right-handed Y-up frame is the *screen left*. So the right key gives −1 here and
 * the whole sim stays as it is (kart-controller Lessons 2026-09-21).
 */
export function mapInput(held: ReadonlySet<string>, pad: Gamepad | null, keys: KeyMap = DEFAULT_KEYS): InputState {
  const any = (list: string[]) => list.some((k) => held.has(k));
  let steer = (any(keys.left) ? 1 : 0) - (any(keys.right) ? 1 : 0);
  let throttle = any(keys.throttle) ? 1 : 0;
  let brake = any(keys.brake) ? 1 : 0;
  let drift = any(keys.drift);
  let item = any(keys.item);
  let lookBack = any(keys.lookBack);
  let horn = any(keys.horn);
  if (pad) {
    const x = pad.axes[GAMEPAD.steerAxis] ?? 0;
    if (Math.abs(x) > GAMEPAD.deadZone && steer === 0) steer = -Math.sign(x) * (Math.abs(x) - GAMEPAD.deadZone) / (1 - GAMEPAD.deadZone);
    throttle = Math.max(throttle, pad.buttons[GAMEPAD.throttleButton]?.value ?? 0);
    brake = Math.max(brake, pad.buttons[GAMEPAD.brakeButton]?.value ?? 0);
    drift ||= pad.buttons[GAMEPAD.drift]?.pressed ?? false;
    item ||= pad.buttons[GAMEPAD.item]?.pressed ?? false;
    lookBack ||= pad.buttons[GAMEPAD.lookBack]?.pressed ?? false;
    horn ||= pad.buttons[GAMEPAD.horn]?.pressed ?? false;
  }
  return { ...NEUTRAL_INPUT, steer, throttle, brake, drift, item, lookBack, horn };
}

/**
 * Keyboard steer is on/off; the wheel is not. Ramp toward the key over STEER_RAMP.to
 * seconds and back to centre over STEER_RAMP.back. The sim only ever sees the ramped
 * value, so a replayed log reproduces it and the race stays deterministic.
 */
export const STEER_RAMP = Object.freeze({ to: 0.14, back: 0.08 });

export function rampSteer(prev: number, target: number, dt: number): number {
  const towardCentre = Math.abs(target) < Math.abs(prev) || Math.sign(target) !== Math.sign(prev);
  const rate = 1 / (towardCentre ? STEER_RAMP.back : STEER_RAMP.to);
  const step = rate * dt;
  const d = target - prev;
  return Math.abs(d) <= step ? target : prev + Math.sign(d) * step;
}

/** Listens to the window; call sample() once per sim tick. */
export class InputSource {
  private held = new Set<string>();
  private target: Window;
  private keys: KeyMap;
  private steer = 0;
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
  /** `dt` is the sim tick the sample is for; the steer ramp runs on it. */
  sample(dt = 1 / 120): InputState {
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads.find((p): p is Gamepad => !!p && p.mapping === 'standard') ?? null;
    const raw = mapInput(this.held, pad, this.keys);
    // an analogue stick already is a ramp; keys get one
    const analogue = pad !== null && Math.abs(pad.axes[GAMEPAD.steerAxis] ?? 0) > GAMEPAD.deadZone;
    this.steer = analogue ? raw.steer : rampSteer(this.steer, raw.steer, dt);
    return { ...raw, steer: this.steer };
  }
  dispose(): void {
    this.target.removeEventListener('keydown', this.onDown);
    this.target.removeEventListener('keyup', this.onUp);
    this.target.removeEventListener('blur', this.onBlur);
  }
}
