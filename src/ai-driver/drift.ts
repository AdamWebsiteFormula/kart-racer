// Drift decision: hop when the road bends enough for long enough, hold the drift
// side, release at the target tier or when the line says so, and never bunny-hop.
// Also the trick press off a jump.
import type { KartConstants } from '../kart-controller/constants.ts';
import type { InputState, KartState } from '../kart-controller/types.ts';
import { AI, targetTierFor } from './constants.ts';
import { clamp } from './line.ts';
import { next } from './rng.ts';
import type { AiMemory, AiProfile, LineInfo } from './types.ts';

function countDown(x: number, dt: number): number {
  const n = x - dt;
  return n > 1e-9 ? n : 0;
}

/**
 * Reads the PD steer already in `out.steer` and the heading error in m.prevErr.
 * Writes out.drift and may override out.steer. `legal` is the kart's legal top speed now.
 */
export function stepDriftDecision(
  s: KartState, c: KartConstants, m: AiMemory, profile: AiProfile, line: LineInfo, legal: number, out: InputState, dt: number,
): void {
  const d = AI.drift;
  m.driftCooldown = countDown(m.driftCooldown, dt);
  out.drift = false;

  if (m.driftDir === 0) {
    if (m.driftCooldown > 0 || !s.grounded || s.drift.phase !== 'idle') return;
    if (line.narrow || line.nearBranch) return; // a hop at a fork or on a 3 m road ends in the water
    if (s.speed < c.driftMinSpeed * legal) return;
    const near = line.turnNear, far = line.turnFar;
    const bends = Math.abs(near) > profile.driftThreshold && Math.abs(far) > profile.driftThreshold && Math.sign(near) === Math.sign(far);
    if (!bends) return;
    if (next(m) >= m.personality.driftUse) { m.driftCooldown = d.cooldown; return; } // declined; ask again later
    m.driftDir = near > 0 ? 1 : -1;
    m.driftHold = 0;
    out.drift = true;
    out.steer = m.driftDir;
    return;
  }

  // holding
  const dir = m.driftDir;
  m.driftHold += dt;
  out.drift = true;
  const landWindow = c.hopSeconds * c.hopLandWindow + dt;
  // the controller cancelled it (landed without the stick, too slow, too long in the air)
  const aborted = s.drift.phase === 'idle' && m.driftHold > landWindow;
  if (aborted) { release(m, d.abortCooldown, out); return; }

  if (m.driftHold <= d.hopCommit || s.drift.phase !== 'drifting') {
    out.steer = dir; // full stick so the landing locks the drift
    return;
  }
  // stick toward the drift side: 0.5 keeps full charge, up to 1 when PD wants tighter
  const want = out.steer * dir; // positive = PD agrees with the drift side
  out.steer = dir * clamp(0.75 + 0.25 * want, 0.5, 1);

  const err = m.prevErr;
  const tier = s.drift.tier;
  const release_ =
    tier >= targetTierFor(m.skill) ||
    err * dir < -d.overRotate ||
    (Math.abs(err) < d.aligned && Math.abs(line.turnNear) < d.alignedTurn) ||
    line.myLat * dir > line.halfWidth - d.edgeMargin ||
    m.driftHold > d.maxHold;
  if (release_) release(m, tier === 0 ? d.abortCooldown : d.cooldown, out);
}

function release(m: AiMemory, cooldown: number, out: InputState): void {
  m.driftDir = 0;
  m.driftHold = 0;
  m.driftCooldown = cooldown;
  out.drift = false;
}

/** Off a jump: roll once, then press the button on a tick where it makes an edge. */
export function stepTrick(s: KartState, m: AiMemory, profile: AiProfile, out: InputState): void {
  if (s.grounded || s.airborne.fromJumpId === undefined) {
    m.trickRolled = false;
    m.trickDone = false;
    return;
  }
  if (m.driftDir !== 0) return; // a drift hop is not a jump; the drift logic owns the button
  if (!m.trickRolled) {
    m.trickRolled = true;
    m.trickDone = next(m) >= profile.trickChance; // "done" = decided not to
  }
  if (m.trickDone) return;
  if (s.prevDrift) { out.drift = false; return; } // let go first so the press is an edge
  out.drift = true;
  m.trickDone = true;
}
