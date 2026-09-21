// The ordered tick. stepKart runs steps 1–10 for one kart; stepKarts runs
// every kart then the pair steps (11 kart-vs-kart, 12 slipstream).
import { clearBoost, tickBoost } from './boost.ts';
import { collideKarts, stepWalls } from './collide.ts';
import type { KartConstants } from './constants.ts';
import { gripFor } from './constants.ts';
import { cancelDrift, stepDrift } from './drift.ts';
import { stepGround } from './ground.ts';
import { stepSlipstream } from './slipstream.ts';
import { stepSpeed, targetSpeed } from './speed.ts';
import { stepSteer } from './steer.ts';
import { NEUTRAL_INPUT, type HitKind, type InputState, type KartEvent, type KartState, type StepOptions, type TrackQuery } from './types.ts';

export const SIM_HZ = 120;
export const SIM_DT = 1 / SIM_HZ;

/** Timer epsilon: 1 s of 120 Hz ticks does not sum to exactly 1 in floats. */
const TIMER_EPS = 1e-9;
function countDown(x: number, dt: number): number {
  const next = x - dt;
  return next > TIMER_EPS ? next : 0;
}

/** Step 1: every timer counts down by dt. */
export function tickTimers(s: KartState, dt: number): void {
  tickBoost(s, dt);
  s.status.spinRemaining = countDown(s.status.spinRemaining, dt);
  s.status.slowRemaining = countDown(s.status.slowRemaining, dt);
  if (s.status.slowRemaining === 0) s.status.slowedTo = 1;
  s.status.intangibleRemaining = countDown(s.status.intangibleRemaining, dt);
  s.drift.chargeMultiplierRemaining = countDown(s.drift.chargeMultiplierRemaining, dt);
  if (s.drift.chargeMultiplierRemaining === 0) s.drift.chargeMultiplier = 1;
  s.wallCooldown = countDown(s.wallCooldown, dt);
  s.bumpCooldown = countDown(s.bumpCooldown, dt);
}

/** Steps 1–10 for one kart. Returns the events it raised. */
export function stepKart(
  s: KartState, input: InputState, track: TrackQuery, c: KartConstants, dt: number, opts: StepOptions = {},
): KartEvent[] {
  const events: KartEvent[] = [];
  // 2. status gate: a kart that was spinning at the start of this tick ignores
  // input and bleeds speed linearly, hitting exactly 0 on the tick the spin ends
  const spinning = s.status.spinRemaining > 0;
  tickTimers(s, dt);
  const inp = spinning ? NEUTRAL_INPUT : input;
  if (spinning) {
    s.prevDrift = input.drift;
    const rem = s.status.spinRemaining; // already counted down
    s.speed = rem > 0 ? s.speed * (rem / (rem + dt)) : 0;
  } else {
    // 3. speed
    const targets = targetSpeed(s, c);
    stepSpeed(s, inp, targets.target, c, dt);
    // 4–5. steer and slide
    // a drift slides: the lateral part of the velocity lives longer than on grip
    const surfaceGrip = gripFor(c, s.surface);
    const grip = (s.drift.phase === 'drifting' ? Math.min(surfaceGrip, c.gripDrift) : surfaceGrip) * s.gripScale * (s.grounded ? 1 : 0.5);
    stepSteer(s, inp, c, targets.base, grip, dt);
    // 6. hop / drift
    stepDrift(s, inp, c, targets.base, dt, events, opts);
  }

  // 8–9. gravity, ground, integrate
  const g = stepGround(s, track, c, dt, events);
  // 10. walls
  stepWalls(s, g.lateral, g.right, g.sample.halfWidth, c, dt, events);
  return events;
}

/** One sim tick for a whole field. karts[i] uses inputs[i] and consts[i]. */
export function stepKarts(
  karts: KartState[], inputs: readonly InputState[], track: TrackQuery, consts: readonly KartConstants[],
  dt: number, opts: StepOptions = {},
): KartEvent[][] {
  const events = karts.map((k, i) => stepKart(k, inputs[i], track, consts[i], dt, opts));
  // 11. kart vs kart, every pair once
  for (let i = 0; i < karts.length; i++) {
    for (let j = i + 1; j < karts.length; j++) {
      collideKarts(karts[i], karts[j], consts[i], consts[j], consts[i], dt, events[i], events[j]);
    }
  }
  // 12. slipstream
  for (let i = 0; i < karts.length; i++) stepSlipstream(karts[i], karts, consts[i], dt, events[i]);
  return events;
}

/** Step 13. Items and hazards call this. Coins are the hit buffer. */
export function applyHit(s: KartState, c: KartConstants, kind: HitKind, events: KartEvent[]): void {
  const hadCoins = s.coins > 0;
  const coinsLost = Math.min(s.coins, c.hitCoinsLost);
  s.coins -= coinsLost;
  let spun: boolean;
  if (c.coinShield.enabled && hadCoins) {
    s.status.slowedTo = c.coinShield.slowedTo;
    s.status.slowRemaining = c.coinShield.slowSeconds;
    spun = false;
  } else {
    s.status.spinRemaining = c.hitSpinSeconds;
    spun = true;
  }
  cancelDrift(s);
  clearBoost(s);
  events.push({ type: 'hit', kind, spun, coinsLost });
}

/** Start-line boost: press throttle inside the window before the green light. */
/** The throttle went down `secondsBeforeGo` before GO. Inside the window around the "2": boost. */
export function tryStartBoost(s: KartState, c: KartConstants, secondsBeforeGo: number, events: KartEvent[]): boolean {
  if (Math.abs(secondsBeforeGo - c.startBoostCentreSeconds) > c.startBoostWindowSeconds / 2) return false;
  s.boost.source = 'start';
  s.boost.multiplier = c.startBoostMultiplier;
  s.boost.remaining = c.startBoostSeconds;
  events.push({ type: 'boostStart', source: 'start', multiplier: c.startBoostMultiplier, seconds: c.startBoostSeconds });
  return true;
}
