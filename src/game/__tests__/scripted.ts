// Scripted near-perfect drivers for the drift gate (game/drift.e2e.test.ts, 24 Sept 2026): both follow
// a minimum-curvature line inside the road with a feed-forward line follower, full throttle, and brake
// only where the line ahead asks more yaw than the envelope gives. The grip driver never drifts. The
// drifter hops half a second before each bend, steers the slide along the same line, lets go on the
// exit, and through a long bend chains another drift as soon as the top tier is in, as a Mario Kart
// player does. The track's coins, balloons and pads are taken off (a coin is +0.66 % top speed and
// which ones a line happens to cross swamped the drift), and its hazards are switched off.
import { AiDriver } from '../../ai-driver/index.ts';
import { emptySample } from '../../ai-driver/types.ts';
import { soloConfig } from '../../backend-leaderboard/rules.ts';
import { Items } from '../../items/items.ts';
import type { KartConstants } from '../../kart-controller/constants.ts';
import { SIM_HZ } from '../../kart-controller/step.ts';
import { driftSpeedScale, driftStickFor } from '../../kart-controller/steer.ts';
import { NEUTRAL_INPUT, type InputState } from '../../kart-controller/types.ts';
import { RaceManager } from '../../race-manager/index.ts';
import * as dmath from '../../sim-math/dmath.ts';
import { buildTrack, type Track } from '../../track-builder/track.ts';
import type { TrackDefinition } from '../../track-builder/types.ts';
import { simTick, type SimParts } from '../simtick.ts';

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
function wrap(a: number): number {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

/** The line: per 2 m sample of the main road, its lateral, position, heading and curvature (rad/m, + right). */
export interface Line { n: number; step: number; lat: number[]; x: number[]; z: number[]; h: number[]; k: number[] }
/** A bend on the line: sample range [i0, i1), its side, how far it turns (rad). */
export interface Bend { i0: number; i1: number; dir: number; angle: number }

/** Minimum curvature inside the road (margin metres from its edge or wall): gradient descent on Σ |second difference|². */
export function idealLine(track: Track, margin = 1.6): Line {
  const n = Math.floor(track.length / 2);
  const cx: number[] = [], cz: number[] = [], rx: number[] = [], rz: number[] = [], hw: number[] = [];
  const s = emptySample();
  for (let i = 0; i < n; i++) {
    track.sampleInto(i / n, 0, 0, s);
    cx.push(s.position[0]); cz.push(s.position[2]); rx.push(s.tangent[2]); rz.push(-s.tangent[0]);
    hw.push(Math.max(0.5, Math.min(s.halfWidth, s.wall ?? s.halfWidth) - margin));
  }
  const lat: number[] = new Array(n).fill(0);
  const g: number[] = new Array(n).fill(0);
  const px = (i: number) => { i = (i + n) % n; return cx[i] + lat[i] * rx[i]; };
  const pz = (i: number) => { i = (i + n) % n; return cz[i] + lat[i] * rz[i]; };
  for (let it = 0; it < 4000; it++) {
    g.fill(0);
    for (let i = 0; i < n; i++) {
      const dx = px(i - 1) - 2 * px(i) + px(i + 1), dz = pz(i - 1) - 2 * pz(i) + pz(i + 1);
      for (let w = -1; w <= 1; w++) {
        const j = (i + w + n) % n;
        g[j] += (w === 0 ? -2 : 1) * (dx * rx[j] + dz * rz[j]);
      }
    }
    for (let i = 0; i < n; i++) lat[i] = clamp(lat[i] - 0.05 * g[i], -hw[i], hw[i]);
  }
  const x: number[] = [], z: number[] = [], h: number[] = [], k0: number[] = [];
  for (let i = 0; i < n; i++) { x.push(px(i)); z.push(pz(i)); }
  for (let i = 0; i < n; i++) h.push(dmath.atan2(x[(i + 1) % n] - x[i], z[(i + 1) % n] - z[i]));
  for (let i = 0; i < n; i++) k0.push(wrap(h[i] - h[(i - 1 + n) % n]) / Math.max(0.5, dmath.hypot(x[(i + 1) % n] - x[i], z[(i + 1) % n] - z[i])));
  const k = k0.map((_, i) => (k0[(i - 2 + n) % n] + k0[(i - 1 + n) % n] + k0[i] + k0[(i + 1) % n] + k0[(i + 2) % n]) / 5);
  return { n, step: track.length / n, lat, x, z, h, k };
}

/** Bends: |κ| ≥ kMin somewhere, running on while ≥ kMin / 2 on the same side, turning at least minAngle. */
export function lineBends(line: Line, kMin = 1 / 150, minAngle = 0.4): Bend[] {
  const { n, k, step } = line;
  const out: Bend[] = [];
  const start = Math.max(0, k.findIndex((x) => Math.abs(x) < kMin * 0.5));
  for (let c = 0; c < n; c++) {
    const i = (start + c) % n;
    if (Math.abs(k[i]) < kMin) continue;
    const dir = Math.sign(k[i]);
    let i0 = i;
    while (Math.abs(k[(i0 - 1 + n) % n]) >= kMin * 0.5 && Math.sign(k[(i0 - 1 + n) % n]) === dir) i0 = (i0 - 1 + n) % n;
    let j = i, angle = 0, cnt = 0;
    while (Math.sign(k[j]) === dir && Math.abs(k[j]) >= kMin * 0.5 && cnt < n) { angle += k[j] * step; j = (j + 1) % n; cnt++; c++; }
    if (Math.abs(angle) >= minAngle) out.push({ i0, i1: j, dir, angle: Math.abs(angle) });
  }
  return out;
}

export interface ScriptedRun {
  /** race time, s */
  time: number;
  /** per bend, the race time each lap the kart reached its start */
  bendTimes: number[][];
  /** per bend, the tier of each drift let go on it */
  tiers: number[][];
  bends: Bend[];
  /** wall hits and claw rescues over the race (a clean run has neither) */
  walls: number;
  rescues: number;
}

/**
 * A 150cc Time Trial by `racerId` (3 laps), the scripted driver at the wheel; `drift` false never drifts.
 * `kartId`: the kart it drives (design §5; absent: the racer's own), and the driver adapts to that kart's
 * constants. `line`: the track's idealLine, when a caller runs many karts on one track and computes it once.
 */
export function runScripted(source: TrackDefinition, racerId: string, drift: boolean, opts: { kartId?: string; line?: Line } = {}): ScriptedRun {
  const def = { ...source, coins: [], pickups: [], boostPads: [] } as TrackDefinition;
  const solo = soloConfig('timeTrial', def.id, racerId, 0);
  const config = opts.kartId === undefined ? solo : { ...solo, racers: solo.racers.map((r) => ({ ...r, kartId: opts.kartId })) };
  const track = buildTrack(def);
  for (const id of track.hazards.ids) track.hazards.setEnabled(id, false);
  const manager = new RaceManager(track, config);
  const items = new Items(track, manager);
  const ai = new AiDriver(track, config, manager.state, { itemRoles: items.roles });
  const inputs = manager.state.karts.map(() => ({ ...NEUTRAL_INPUT }));
  const pi = manager.playerIndex;
  const parts: SimParts = { manager, items, ai, inputs, playerIndex: pi, playerSlot: { ...NEUTRAL_INPUT } };
  const c: KartConstants = manager.consts[pi];
  const V = c.topSpeed;
  const line = opts.line ?? idealLine(track);
  const bends = lineBends(line);
  const bendTimes: number[][] = bends.map(() => []);
  const tiers: number[][] = bends.map(() => []);
  const sm = emptySample();
  const inBend = (i: number) => bends.findIndex((b) => (b.i1 > b.i0 ? i >= b.i0 && i < b.i1 : i >= b.i0 || i < b.i1));
  const ahead = (from: number, to: number) => (((to - from) % line.n) + line.n) % line.n;
  const gripYaw = (v: number) => c.steerRate * (1 - c.steerFalloff * Math.min(1, v / V));
  const driftYaw = (v: number) => c.steerRate * c.driftSteerMax * driftSpeedScale(v, V, c);
  let lastIdx = -1, driftBend = -1, doneBend = -1, walls = 0, rescues = 0;
  for (let tick = 0; tick < 400 * SIM_HZ && manager.state.phase !== 'finished'; tick++) {
    const s = manager.state.karts[pi];
    const inp: InputState = { ...NEUTRAL_INPUT };
    if (manager.state.phase !== 'countdown') {
      const v = Math.max(1, Math.abs(s.speed));
      const u = (((s.t % 1) + 1) % 1) * line.n;
      const idx = Math.floor(u) % line.n, f = u - Math.floor(u);
      if (lastIdx >= 0) {
        for (let b = 0; b < bends.length; b++) {
          const d1 = ahead(lastIdx, bends[b].i0), d2 = ahead(lastIdx, idx);
          if (d1 > 0 && d1 <= d2 && d2 < line.n / 2) bendTimes[b].push(manager.state.time);
        }
      }
      lastIdx = idx;
      track.sampleInto(s.t, 0, 0, sm);
      const myLat = (s.position[0] - sm.position[0]) * sm.tangent[2] - (s.position[2] - sm.position[2]) * sm.tangent[0];
      const eLat = line.lat[idx] * (1 - f) + line.lat[(idx + 1) % line.n] * f - myLat;
      const kFF = line.k[(idx + Math.round((v * 0.12) / line.step)) % line.n];
      const ePsi = wrap(line.h[idx] - (s.heading + dmath.atan2(s.lateralVelocity, v)));
      // brake where the line ahead asks more yaw than the grip turn (or the drift, in a bend it drifts) gives
      let brake = false;
      for (let d = 0; d < v * 2.5 && !brake; d += line.step) {
        const j = (idx + Math.round(d / line.step)) % line.n;
        const kk = Math.abs(line.k[j]);
        if (kk < 1e-4) continue;
        const inDrift = drift && inBend(j) >= 0;
        let lo = 0, hi = 40;
        for (let q = 0; q < 30; q++) {
          const m = (lo + hi) / 2;
          if (m * kk < (inDrift ? Math.max(driftYaw(m), gripYaw(m)) : gripYaw(m)) * 0.97) lo = m; else hi = m;
        }
        if (v * v > lo * lo + 2 * 14 * d) brake = true;
      }
      inp.throttle = brake ? 0 : 1;
      if (brake && v > 5) inp.brake = 0.6;
      const here = inBend(idx);
      if (here < 0) doneBend = -1;
      const edge = Math.min(sm.halfWidth, sm.wall ?? sm.halfWidth) - 0.6;
      if (drift && driftBend < 0 && s.drift.phase === 'idle' && s.grounded && v > c.driftMinSpeed * V + 1) {
        // hop half a second before a bend, or in one with a second or more of it left
        for (let b = 0; b < bends.length; b++) {
          if (b === doneBend) continue;
          const to = ahead(idx, bends[b].i0) * line.step, left = ahead(idx, bends[b].i1) * line.step;
          if (to < v * 0.5 || (here === b && left > v)) { driftBend = b; inp.drift = true; inp.steer = bends[b].dir; break; }
        }
      } else if (driftBend >= 0) {
        const b = bends[driftBend];
        const left = ahead(idx, b.i1) * line.step;
        const past = here !== driftBend && ahead(idx, b.i0) < line.n / 2 && ahead(idx, b.i0) > 5;
        inp.drift = true;
        if (s.drift.phase === 'hopping') inp.steer = b.dir;
        else if (s.drift.phase === 'drifting') {
          // the drift turn value that follows the line, led a little against the yaw lag
          const want = v * kFF + 2.5 * ePsi + 0.25 * eLat;
          const k = clamp(((want * b.dir) / (c.steerRate * driftSpeedScale(v, V, c)) - c.driftSteerMin) / (c.driftSteerMax - c.driftSteerMin), 0, 1);
          inp.steer = b.dir * driftStickFor(clamp(2 * k - s.drift.yawK, 0, 1));
          const chain = s.drift.tier >= c.driftTiers.length && left > v * 2;
          if (left < v * 0.15 || past || Math.abs(myLat) > edge || chain) {
            inp.drift = false;
            tiers[driftBend].push(s.drift.tier);
            if (!chain) doneBend = driftBend;
            driftBend = -1;
          }
        } else { doneBend = driftBend; driftBend = -1; inp.drift = false; } // the hop came to nothing (a ramp, a loop)
      }
      if (!inp.drift) {
        inp.steer = clamp((v * kFF + 4 * ePsi + 0.3 * eLat) / gripYaw(v), -1, 1);
      }
    }
    const ev = simTick(parts, inp).race;
    for (const e of ev) {
      if (e.type === 'kart' && e.event.type === 'wall' && e.racerId === config.racers[pi].racerId) walls++;
      if (e.type === 'rescue' && e.phase === 'start') rescues++;
    }
  }
  return { time: manager.results().ranks[0].timeMs / 1000, bendTimes, tiers, bends, walls, rescues };
}
