// RaceManager: one race, one fixed tick at a time. Everything is a function of
// (config, tick, inputs), so a replayed input log reproduces the race exactly.
import { makeConstants, type KartConstants } from '../kart-controller/constants.ts';
import { SIM_DT, stepKarts } from '../kart-controller/step.ts';
import { createKartState, NEUTRAL_INPUT, type InputState, type KartEvent, type KartState } from '../kart-controller/types.ts';
import type { Track } from '../track-builder/track.ts';
import type { ActiveHazard } from '../track-builder/types.ts';
import { createTracker, distanceAlong, resyncAfterShift, stepCheckpoints } from './checkpoints.ts';
import { RACE } from './constants.ts';
import { GO_TICK, stepCountdown } from './countdown.ts';
import { stepHazards } from './hazards.ts';
import { indexFeatures, initTimers, stepPickups, type FeatureIndex } from './pickups.ts';
import { assignRanks, sortOrder } from './ranking.ts';
import { respawnKart, stepStuck } from './respawn.ts';
import type { KartTracker, RaceConfig, RaceEvent, RaceResults, RaceState } from './types.ts';
import { countDown } from './util.ts';
import { stepWrongWay } from './wrongway.ts';

export class RaceManager {
  readonly track: Track;
  readonly config: RaceConfig;
  readonly state: RaceState;
  readonly consts: readonly KartConstants[];
  /** index into karts[] of the player, or -1 */
  readonly playerIndex: number;
  /** the hazard list computed this tick; hand it to TrackScene.update(time, active) */
  lastActiveHazards: readonly ActiveHazard[] = [];
  /** kart indices in rank order after the last tick */
  readonly order: number[] = [];

  private readonly fi: FeatureIndex;
  private readonly effective: InputState[];
  private readonly kartEvents: KartEvent[][];
  /** karts that crossed the finish this tick; reused, never reallocated */
  private readonly finishedNow: number[] = [];

  constructor(track: Track, config: RaceConfig) {
    this.track = track;
    this.config = config;
    const grid = track.spawnGrid;
    if (config.racers.length > grid.length) throw new Error(`${config.racers.length} racers for ${grid.length} grid slots`);
    const lapsTotal = config.laps ?? track.def.laps;

    // grid: the player takes playerGridSlot, a ghost shares it, the rest fill in order
    const playerSlot = Math.min(RACE.playerGridSlot, grid.length - 1);
    const hasPlayer = config.racers.some((r) => r.isPlayer);
    const free: number[] = [];
    for (let i = 0; i < grid.length; i++) if (!(hasPlayer && i === playerSlot)) free.push(i);
    const karts: KartState[] = [];
    const trackers: KartTracker[] = [];
    const consts: KartConstants[] = [];
    let playerIndex = -1;
    config.racers.forEach((r, i) => {
      const slot = r.isPlayer ? playerSlot : r.isGhost && hasPlayer ? playerSlot : (free.shift() as number);
      const g = grid[slot];
      const s = createKartState({ racerId: r.racerId, isPlayer: r.isPlayer, isGhost: r.isGhost, position: [...g.position], heading: g.heading, t: g.t });
      s.lap = 1;
      s.bodyId = r.bodyId;
      s.skinId = r.skinId;
      if (r.isPlayer) playerIndex = i;
      karts.push(s);
      trackers.push(createTracker(slot, g.t));
      consts.push(makeConstants(r.archetype, config.speedClass));
    });
    this.playerIndex = playerIndex;
    this.consts = consts;
    this.fi = indexFeatures(track);
    const timers = initTimers(this.fi);

    this.state = {
      mode: config.mode, trackId: config.trackId, speedClass: config.speedClass, mirrored: config.mirrored ?? false,
      seed: config.seed, tick: 0, goTick: GO_TICK, time: -GO_TICK * SIM_DT, phase: 'countdown', lapsTotal,
      finalLapShiftFired: false,
      knockout: config.knockout
        ? { setId: config.knockout.setId, segment: config.knockout.segment, cutLineAt: lapsTotal, eliminated: [...config.knockout.eliminated] }
        : undefined,
      pickupStates: timers.pickupStates, coinStates: timers.coinStates,
      karts, trackers, inputLog: [], playerFinishTick: -1, leaderLap: 1,
    };
    this.effective = karts.map(() => NEUTRAL_INPUT);
    this.kartEvents = karts.map(() => []);
    for (let i = 0; i < karts.length; i++) karts[i].distanceAlong = distanceAlong(karts[i], trackers[i], track);
    sortOrder(karts, trackers, this.order);
    this.order.forEach((k, r) => { karts[k].rank = r + 1; trackers[k].shownRank = r + 1; });
  }

  get dt(): number { return SIM_DT; }

  /** One 120 Hz tick. inputs[i] drives karts[i]. Returns every event raised, kart events first. */
  step(inputs: readonly InputState[]): RaceEvent[] {
    const st = this.state;
    const { karts, trackers } = st;
    const track = this.track;
    const tick = st.tick;
    const dt = SIM_DT;
    const events: RaceEvent[] = [];
    st.time = (tick - st.goTick) * dt;
    this.lastActiveHazards = track.activeHazards(st.time);
    const kartEvents = this.kartEvents;
    for (const list of kartEvents) list.length = 0;

    // 1. inputs
    let go = false;
    if (st.phase === 'countdown') {
      go = stepCountdown(tick, karts, trackers, inputs, this.consts, events, kartEvents);
      for (let i = 0; i < karts.length; i++) this.effective[i] = NEUTRAL_INPUT;
    } else {
      for (let i = 0; i < karts.length; i++) {
        const s = karts[i], tr = trackers[i];
        // a finished kart keeps its input: the driver (ai-driver autopilot) rolls it out
        // of the way instead of parking it on the line (ai-driver Decisions 2026-09-21)
        this.effective[i] = !s.isGhost && tr.freezeRemaining > 0 ? NEUTRAL_INPUT : inputs[i];
      }
    }
    // the log starts at tick 0: the countdown throttle decides the start boost, so a
    // replay needs it too
    if (this.playerIndex >= 0) st.inputLog.push({ ...inputs[this.playerIndex] });

    // 2. karts
    const stepped = stepKarts(karts, this.effective, track, this.consts, dt);
    for (let i = 0; i < karts.length; i++) {
      const src = stepped[i], dst = kartEvents[i];
      for (let k = 0; k < src.length; k++) dst.push(src[k]);
    }

    if (go) {
      st.phase = 'racing';
      events.push({ type: 'phase', phase: 'racing' });
      if (st.lapsTotal === 1) this.fireShift(tick, events);
    }

    // 3. race rules
    if (st.phase === 'racing' || st.phase === 'finalLap') {
      const finishedNow = this.finishedNow;
      finishedNow.length = 0;
      for (let i = 0; i < karts.length; i++) {
        const s = karts[i], tr = trackers[i], c = this.consts[i];
        tr.freezeRemaining = countDown(tr.freezeRemaining, dt);
        // the controller's void event is read first, so a kart that fell below voidY on
        // this tick counts no checkpoint on the way down. It is swallowed for every kart,
        // ghosts included, so a ghost under the road does not fall for ever.
        let respawn = false;
        const ke = kartEvents[i];
        for (let k = ke.length - 1; k >= 0; k--) if (ke[k].type === 'respawn') { respawn = true; ke.splice(k, 1); }
        if (!respawn) {
          const res = stepCheckpoints(s, tr, track, st.lapsTotal, tick, events);
          if (res === 'finish') {
            finishedNow.push(i);
            if (s.isPlayer) st.playerFinishTick = tick;
          }
        }
        stepWrongWay(s, tr, track, dt, events);
        // only real karts can be stuck
        if (!respawn && !s.isGhost && s.finishTick === undefined && stepStuck(s, tr, inputs[i], dt)) respawn = true;
        if (respawn) respawnKart(s, tr, track, events);
        stepHazards(s, tr, c, this.lastActiveHazards, dt, events, kartEvents[i]);
      }
      stepPickups(this.fi, st.pickupStates, st.coinStates, track, karts, this.consts, dt, events);

      // 4. progress and rank
      for (let i = 0; i < karts.length; i++) karts[i].distanceAlong = distanceAlong(karts[i], trackers[i], track);
      sortOrder(karts, trackers, this.order);
      assignRanks(karts, trackers, this.order, dt, events);
      for (const i of this.order) if (finishedNow.includes(i)) events.push({ type: 'finish', racerId: karts[i].racerId, rank: karts[i].rank, tick, dnf: false });

      // 5. leader lap: shortcut gating and the Final Lap Shift
      const leader = this.order.length ? karts[this.order[0]] : undefined;
      if (leader && leader.lap !== st.leaderLap) {
        st.leaderLap = leader.lap;
        track.setLap(leader.lap);
        if (leader.lap === st.lapsTotal) this.fireShift(tick, events);
      }

      // 6. finish
      let allDone = true;
      for (let i = 0; i < karts.length; i++) if (!karts[i].isGhost && karts[i].finishTick === undefined) { allDone = false; break; }
      const graceUp = st.playerFinishTick >= 0 && tick - st.playerFinishTick >= Math.round(RACE.finishGraceSeconds / dt);
      if (allDone || graceUp) {
        for (const i of this.order) {
          const s = karts[i];
          if (s.finishTick !== undefined) continue;
          s.finishTick = tick;
          trackers[i].dnf = true;
        }
        sortOrder(karts, trackers, this.order);
        this.order.forEach((i, r) => { karts[i].rank = r + 1; });
        for (const i of this.order) if (trackers[i].dnf) events.push({ type: 'finish', racerId: karts[i].racerId, rank: karts[i].rank, tick, dnf: true });
        st.phase = 'finished';
        events.push({ type: 'phase', phase: 'finished' });
        events.push({ type: 'raceFinished' });
      }
    }

    st.tick = tick + 1;
    const out: RaceEvent[] = [];
    for (let i = 0; i < karts.length; i++) for (const e of kartEvents[i]) out.push({ type: 'kart', racerId: karts[i].racerId, event: e });
    for (let k = 0; k < events.length; k++) out.push(events[k]);
    return out;
  }

  private fireShift(tick: number, events: RaceEvent[]): void {
    const st = this.state;
    if (st.finalLapShiftFired) return;
    st.finalLapShiftFired = true;
    const changed = this.track.applyFinalLapShift(st.karts);
    if (changed) events.push({ type: 'trackChanged', event: changed });
    for (let i = 0; i < st.karts.length; i++) {
      resyncAfterShift(st.karts[i], st.trackers[i], this.track, st.lapsTotal, tick, events);
      st.karts[i].distanceAlong = distanceAlong(st.karts[i], st.trackers[i], this.track);
    }
    st.phase = 'finalLap';
    events.push({ type: 'phase', phase: 'finalLap' });
  }

  /** Rank table. Complete once phase is `finished`; before that unfinished rows carry -1 and dnf. */
  results(): RaceResults {
    const st = this.state;
    const ranks = this.order.map((i) => {
      const s = st.karts[i], tr = st.trackers[i];
      const finishTick = s.finishTick ?? -1;
      const lapTimesMs = tr.lapTicks.map((t, k) => ticksToMs(t - (k === 0 ? st.goTick : tr.lapTicks[k - 1])));
      return {
        racerId: s.racerId, rank: s.rank, finishTick,
        timeMs: finishTick < 0 ? -1 : ticksToMs(finishTick - st.goTick),
        lapTimesMs, dnf: finishTick < 0 || tr.dnf,
      };
    });
    return { mode: st.mode, trackId: st.trackId, speedClass: st.speedClass, seed: st.seed, goTick: st.goTick, ranks };
  }
}

export function ticksToMs(ticks: number): number {
  return Math.round(ticks * 1000 * SIM_DT);
}
