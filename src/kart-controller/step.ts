// The ordered tick. stepKart runs steps 1–10 for one kart; stepKarts runs
// every kart then the pair steps (11 kart-vs-kart, 12 slipstream).
import { clearBoost, tickBoost } from './boost.ts';
import { collideKarts, stepWalls } from './collide.ts';
import type { KartConstants } from './constants.ts';
import { gripFor } from './constants.ts';
import { cancelDrift, stepDrift } from './drift.ts';
import { stepGround } from './ground.ts';
import { inLoop, stepLoop } from './loop.ts';
import { isRiding, isTowed, rideAim, stepPilot, towAim } from './powers.ts';
import { stepSlipstream } from './slipstream.ts';
import { stepSpeed, targetSpeed } from './speed.ts';
import { stepSteer } from './steer.ts';
import { NEUTRAL_INPUT, type HitKind, type InputState, type KartEvent, type KartState, type StepOptions, type TrackQuery, type Vec3 } from './types.ts';

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
  s.status.rideRemaining = countDown(s.status.rideRemaining, dt);
  s.status.towRemaining = countDown(s.status.towRemaining, dt);
  if (s.status.towRemaining === 0) s.status.towTarget = -1;
}

const scratchAim: Vec3 = [0, 0, 0];
const towScratch: Vec3 = [0, 0, 0];

/**
 * Steps 1–10 for one kart. Returns the events it raised. `towAim` is where a Grapple Anchor
 * pulls this kart (beside the hooked kart, or down the road while it is far); stepKarts passes it.
 */
export function stepKart(
  s: KartState, input: InputState, track: TrackQuery, c: KartConstants, dt: number, opts: StepOptions = {}, towAim?: Vec3,
): KartEvent[] {
  const events: KartEvent[] = [];
  // 2. status gate: a kart that was spinning at the start of this tick ignores
  // input and bleeds speed linearly, hitting exactly 0 on the tick the spin ends
  const spinning = s.status.spinRemaining > 0;
  tickTimers(s, dt);
  // on a loop-the-loop: the ride has the kart, nothing else moves it
  if (inLoop(s)) { s.prevDrift = input.drift; stepLoop(s, track, c, dt, events); return events; }
  const inp = spinning ? NEUTRAL_INPUT : input;
  if (spinning) {
    s.prevDrift = input.drift;
    const rem = s.status.spinRemaining; // already counted down
    s.speed = rem > 0 ? s.speed * (rem / (rem + dt)) : 0;
  } else if (isRiding(s) || (isTowed(s) && towAim)) {
    // autopilot: the Strike Ball rolls down the centreline, the Grapple Anchor reels toward its kart
    s.prevDrift = input.drift;
    const base = targetSpeed(s, c).base;
    if (isRiding(s)) stepPilot(s, rideAim(s, track, c, scratchAim), base * c.rideSpeedMultiplier, c, dt);
    else stepPilot(s, towAim as Vec3, base * c.towSpeedMultiplier, c, dt);
    cancelDrift(s);
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
  // a falling kart is past every wall
  if (!s.status.falling) stepWalls(s, g.lateral, g.right, g.sample.halfWidth, c, dt, events, g.sample.open ?? 0);
  return events;
}

/** One sim tick for a whole field. karts[i] uses inputs[i] and consts[i]. */
export function stepKarts(
  karts: KartState[], inputs: readonly InputState[], track: TrackQuery, consts: readonly KartConstants[],
  dt: number, opts: StepOptions = {},
): KartEvent[][] {
  const events = karts.map((k, i) => {
    const to = k.status.towTarget;
    const aim = isTowed(k) && to < karts.length ? towAim(k, karts[to], track, consts[i], towScratch) : undefined;
    return stepKart(k, inputs[i], track, consts[i], dt, opts, aim);
  });
  // 11. kart vs kart, every pair once
  for (let i = 0; i < karts.length; i++) {
    for (let j = i + 1; j < karts.length; j++) {
      if (inLoop(karts[i]) || inLoop(karts[j])) continue;
      collideKarts(karts[i], karts[j], consts[i], consts[j], consts[i], dt, events[i], events[j]);
    }
  }
  // 12. slipstream
  for (let i = 0; i < karts.length; i++) if (!inLoop(karts[i])) stepSlipstream(karts[i], karts, consts[i], dt, events[i]);
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
  // a hit breaks a Grapple Anchor's pull
  s.status.towRemaining = 0;
  s.status.towTarget = -1;
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
