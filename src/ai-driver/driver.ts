// AiDriver: once per tick, before manager.step(), writes an InputState for every AI
// kart (and for the player once finished: the autopilot). A pure function of
// (RaceState, Track, active hazards, AiMemory[]); it never moves a kart.
import { makeConstants, type KartConstants } from '../kart-controller/constants.ts';
import { SIM_DT, SIM_HZ } from '../kart-controller/step.ts';
import { NEUTRAL_INPUT, type InputState, type KartState } from '../kart-controller/types.ts';
import type { RaceConfig, RaceState } from '../race-manager/types.ts';
import { wrap01 } from '../track-builder/lut.ts';
import type { Track } from '../track-builder/track.ts';
import type { ActiveHazard } from '../track-builder/types.ts';
import { applyAvoid, type AvoidContext } from './avoid.ts';
import { AI, PROFILES, difficultyFor } from './constants.ts';
import { driftWillFire, stepDriftDecision, stepTrick } from './drift.ts';
import { decideItem, type ItemContext } from './items.ts';
import { chooseBranch, lateralTarget, readLine } from './line.ts';
import { personalityFor } from './personalities.ts';
import { next, range, seedFor } from './rng.ts';
import { powerCapFor, rubberBand, skillFor } from './rubber.ts';
import { applyThrottle, decideSpeed, type SpeedDecision } from './speed.ts';
import { steerTo } from './steer.ts';
import { stepRecovery } from './recover.ts';
import { emptyLine, makeScratch, type AiMemory, type AiPersonality, type AiProfile, type ItemRole, type LineInfo, type Scratch } from './types.ts';

export interface AiDriverOptions {
  /** item id → role; empty until the items system exists */
  itemRoles?: Readonly<Record<string, ItemRole>>;
  /** override the speed-class difficulty (tests) */
  profile?: AiProfile;
  /** per-racer personality overrides (tests) */
  personalities?: Readonly<Record<string, AiPersonality>>;
  /** take every open shortcut with this id, decline the others (the shortcut-helps gate) */
  onlyShortcut?: string;
}

const AUTOPILOT: AiProfile = Object.freeze({ ...PROFILES.normal, skill: AI.autopilot.skill, power: AI.autopilot.power });

export function createMemory(seed: number, slot: number, racerId: string, profile: AiProfile, fieldPace: number, override?: AiPersonality): AiMemory {
  const m: AiMemory = {
    rng: seedFor(seed, slot),
    personality: { lateralBias: 0, aggression: 0, driftUse: 0 },
    fieldPace,
    startPress: 0,
    wanderAmp: 0, wanderPeriod: 1, wanderPhase: 0,
    prevErr: 0, noise: 0,
    rb: 1, skill: profile.skill, powerCap: profile.power,
    driftHold: 0, driftCooldown: 0, driftDir: 0, driftTier: 0, driftEndReason: 'none', trickRolled: false, trickDone: false,
    recovery: 'none', recoverTimer: 0, stuckSeconds: 0,
    reactionRemaining: 0, lastItem: 'none', itemHold: 0,
    branchChoice: 0, lateral: 0,
  };
  m.personality = override ? { ...override } : personalityFor(racerId, m);
  m.startPress = profile.startPressMean + range(m, -profile.startPressSpread, profile.startPressSpread);
  m.wanderAmp = range(m, AI.line.wanderAmpMin, AI.line.wanderAmpMax);
  m.wanderPeriod = range(m, AI.line.wanderPeriodMin, AI.line.wanderPeriodMax);
  m.wanderPhase = range(m, 0, 2 * Math.PI);
  return m;
}

export class AiDriver {
  readonly track: Track;
  readonly profile: AiProfile;
  private readonly onlyShortcut: string | undefined;
  /** per kart, index-aligned with state.karts; serialisable */
  memory: AiMemory[];
  private readonly consts: KartConstants[];
  private readonly outputs: InputState[];
  private readonly playerIndex: number;
  private readonly sc: Scratch = makeScratch();
  private readonly line: LineInfo = emptyLine();
  private readonly speed: SpeedDecision = { legal: 0, target: 0, corner: Infinity };
  private readonly avoidCtx: AvoidContext;
  private readonly itemCtx: ItemContext;
  /** per kart, true while a homing projectile targets it; the items system writes it each tick */
  readonly threatened: boolean[] = [];

  constructor(track: Track, config: RaceConfig, state: RaceState, opts: AiDriverOptions = {}) {
    this.track = track;
    this.profile = opts.profile ?? PROFILES[difficultyFor(config.speedClass)];
    this.onlyShortcut = opts.onlyShortcut;
    const byId = new Map(config.racers.map((r) => [r.racerId, r]));
    const karts = state.karts;
    this.consts = karts.map((k) => makeConstants(byId.get(k.racerId)?.archetype ?? 'medium', config.speedClass));
    this.outputs = karts.map(() => ({ ...NEUTRAL_INPUT }));
    this.playerIndex = karts.findIndex((k) => k.isPlayer);

    // field pace: a seeded shuffle of evenly spaced governors across the AI slots,
    // so an all-AI field with identical stats does not finish as a train
    const ai = karts.map((_, i) => i).filter((i) => !karts[i].isPlayer && !karts[i].isGhost);
    const paces = ai.map((_, k) => 1 - (AI.rubber.fieldPaceSpread * k) / Math.max(1, ai.length - 1));
    const shuffle = { rng: seedFor(state.seed, 0x5eed) };
    for (let k = paces.length - 1; k > 0; k--) { const j = Math.floor(next(shuffle) * (k + 1)); [paces[k], paces[j]] = [paces[j], paces[k]]; }
    const paceOf = new Map(ai.map((i, k) => [i, paces[k]]));

    this.memory = karts.map((k, i) => createMemory(state.seed, state.trackers[i]?.gridSlot ?? i, k.racerId, this.profile, paceOf.get(i) ?? 1, opts.personalities?.[k.racerId]));

    const pickupOf: number[] = [], coinOf: number[] = [];
    let p = 0, c = 0;
    for (const f of track.features) { pickupOf.push(f.kind === 'pickup' ? p++ : -1); coinOf.push(f.kind === 'coin' ? c++ : -1); }
    this.avoidCtx = { track, karts, hazards: [], pickupStates: state.pickupStates, coinStates: state.coinStates, pickupOf, coinOf, sc: this.sc };
    this.itemCtx = { karts, roles: opts.itemRoles ?? {}, gap: 0, threatened: false };
  }

  snapshot(): AiMemory[] {
    return JSON.parse(JSON.stringify(this.memory));
  }

  restore(mem: AiMemory[]): void {
    this.memory = JSON.parse(JSON.stringify(mem));
  }

  /** Writes this tick's input for every AI kart (and a finished player) into `inputs`. */
  fill(state: RaceState, hazards: readonly ActiveHazard[], inputs: InputState[]): void {
    const karts = state.karts;
    this.avoidCtx.hazards = hazards;
    this.avoidCtx.pickupStates = state.pickupStates;
    this.avoidCtx.coinStates = state.coinStates;
    const player = this.playerIndex >= 0 ? karts[this.playerIndex] : undefined;
    const playerRacing = player !== undefined && player.finishTick === undefined;
    for (let i = 0; i < karts.length; i++) {
      const s = karts[i];
      if (s.isGhost) continue;
      if (s.isPlayer && s.finishTick === undefined) continue;
      const out = this.outputs[i];
      inputs[i] = out;
      this.drive(state, s, i, playerRacing ? player : undefined, out);
    }
  }

  private drive(state: RaceState, s: KartState, i: number, player: KartState | undefined, out: InputState): void {
    const m = this.memory[i];
    const c = this.consts[i];
    const dt = SIM_DT;
    const finished = s.finishTick !== undefined;
    const profile = finished ? AUTOPILOT : this.profile;
    out.steer = 0; out.throttle = 0; out.brake = 0; out.drift = false; out.item = false; out.lookBack = false; out.horn = false;

    // 1. phase gate
    if (state.phase === 'countdown') {
      out.throttle = state.time >= -m.startPress ? 1 : 0;
      return;
    }
    if (s.status.spinRemaining > 0) return; // spinning: the controller ignores us and the race-manager does not count it as stuck

    // 2. rubber band
    const gap = player && !finished ? player.distanceAlong - s.distanceAlong : 0;
    m.rb = rubberBand(gap);
    m.skill = skillFor(profile, m.rb);
    m.powerCap = powerCapFor(profile, m.rb);

    // 3. line
    const line = readLine(s, this.track, m, this.sc, this.line);
    chooseBranch(s, this.track, m, profile, line, this.onlyShortcut);
    let lat = lateralTarget(s, c, m, profile, line, state.tick / SIM_HZ);

    // 4. avoid and seek
    lat = applyAvoid(s, this.avoidCtx, line, m.skill, m.branchChoice, lat);
    // smooth the target so a nudge that flickers does not saw the wheel
    const maxStep = AI.line.laneRate * dt;
    const dl = lat - m.lateral;
    m.lateral += dl > maxStep ? maxStep : dl < -maxStep ? -maxStep : dl;
    const aim = this.track.sampleInto(wrap01(s.t + line.L / this.track.length), m.lateral, line.branch, this.sc.ahead).position;

    // 5. steer
    const offroad = s.surface === 'dirt' || s.surface === 'mud';
    out.steer = steerTo(s, aim, m, profile.noise * (1 - m.skill), offroad ? AI.steer.offroadGain : 1, m.lateral - line.myLat, dt);

    // 6. throttle
    const willDrift = !finished && m.driftDir === 0 && m.driftCooldown === 0 && m.personality.driftUse > 0 && !line.narrow && !line.nearBranch
      && driftWillFire(s, c, profile, line);
    const sp = decideSpeed(s, c, m, line, willDrift, this.speed);
    applyThrottle(s, sp, profile, out);

    // 7–8. drift and trick (not on the autopilot)
    if (!finished) {
      stepDriftDecision(s, c, m, profile, line, sp.legal, out, dt);
      stepTrick(s, m, profile, out);
    }

    // 9. items
    if (!finished) {
      this.itemCtx.gap = gap;
      this.itemCtx.threatened = this.threatened[i] === true;
      out.item = decideItem(s, m, profile, line, this.itemCtx, dt);
    }

    // 10. recovery overrides everything
    stepRecovery(s, m, out, dt);
  }
}
