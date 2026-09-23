import { describe, expect, it, vi } from 'vitest';
import { SIM_HZ } from '../kart-controller/step.ts';
import type { InputState } from '../kart-controller/types.ts';
import { buildTrack, type Track } from '../track-builder/track.ts';
import { RACE } from './constants.ts';
import { GO_TICK } from './countdown.ts';
import { RaceManager, ticksToMs } from './race.ts';
import { laneFor, lookAheadDriver, reverseDriver, type Driver } from './__tests__/drivers.ts';
import { HARBOUR_LOOP, OVAL, cloneDef } from './__tests__/fixtures.ts';
import type { RaceConfig, RaceEvent, RacerConfig } from './types.ts';

const MAX_TICKS = SIM_HZ * 300;

function racers(n: number, playerAt = 0): RacerConfig[] {
  return Array.from({ length: n }, (_, i) => ({ racerId: `r${i}`, archetype: 'medium' as const, isPlayer: i === playerAt }));
}

function config(track: Track, rs: RacerConfig[], laps?: number): RaceConfig {
  return { mode: 'quick', trackId: track.id, speedClass: 150, seed: 1, racers: rs, laps };
}

/** Run until the race finishes or MAX_TICKS. Returns every event with its tick. */
function run(rm: RaceManager, drivers: Driver[], onTick?: (tick: number) => void) {
  const log: { tick: number; e: RaceEvent }[] = [];
  const inputs: InputState[] = new Array(drivers.length);
  while (rm.state.phase !== 'finished' && rm.state.tick < MAX_TICKS) {
    const tick = rm.state.tick;
    onTick?.(tick);
    for (let i = 0; i < drivers.length; i++) inputs[i] = drivers[i](rm.state.karts[i], rm.track);
    for (const e of rm.step(inputs)) log.push({ tick, e });
  }
  return log;
}

// Harbour turn 1 is a ~20 m corner since 2026-09-21 (ai-driver Decisions): a no-brake
// driver above ~19 m/s scrapes it, so the scripted field tops out at 19 with 1.2 m/s steps
const speeds = [19, 17.8, 16.6, 15.4, 14.2, 13, 11.8, 10.6];
const field = (n: number) => speeds.slice(0, n).map((v, i) => lookAheadDriver(v, laneFor(i)));

describe('RaceManager', () => {
  it('SOP gate: 8 karts on Harbour Loop finish in speed order with correct laps and lap times', () => {
    const track = buildTrack(HARBOUR_LOOP);
    const rm = new RaceManager(track, config(track, racers(8, 7)));
    const log = run(rm, field(8));
    expect(rm.state.phase).toBe('finished');
    const finishes = log.filter((x) => x.e.type === 'finish').map((x) => x.e as Extract<RaceEvent, { type: 'finish' }>);
    expect(finishes.map((f) => f.racerId)).toEqual(['r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7']);
    expect(finishes.every((f) => !f.dnf)).toBe(true);
    const res = rm.results();
    expect(res.ranks.map((r) => r.racerId)).toEqual(finishes.map((f) => f.racerId));
    for (const row of res.ranks) {
      expect(row.lapTimesMs.length).toBe(3);
      expect(Math.abs(row.lapTimesMs.reduce((a, b) => a + b, 0) - row.timeMs)).toBeLessThanOrEqual(2);
      expect(row.dnf).toBe(false);
    }
    for (const s of rm.state.karts) expect(s.lap).toBe(3);
    const laps = log.filter((x) => x.e.type === 'lap');
    expect(laps.length).toBe(8 * 2);
    const cps = log.filter((x) => x.e.type === 'checkpoint');
    expect(cps.length).toBe(8 * 3 * (track.checkpoints.length - 1));
    expect(log.filter((x) => x.e.type === 'respawn')).toEqual([]);
  });

  it('is deterministic: two runs give identical state and events', () => {
    const a = new RaceManager(buildTrack(OVAL), config(buildTrack(OVAL), racers(4)));
    const b = new RaceManager(buildTrack(OVAL), config(buildTrack(OVAL), racers(4)));
    const drivers = field(4);
    const la = run(a, drivers), lb = run(b, drivers);
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
    expect(JSON.stringify(la)).toBe(JSON.stringify(lb));
    expect(la.length).toBeGreaterThan(50);
  });

  it('countdown: 3-2-1-go on the right ticks, inputs ignored before go, racing phase after', () => {
    const track = buildTrack(OVAL);
    const rm = new RaceManager(track, config(track, racers(2)));
    const log: { tick: number; e: RaceEvent }[] = [];
    const drivers = [lookAheadDriver(20), lookAheadDriver(20)];
    for (let t = 0; t <= GO_TICK; t++) {
      const inputs = drivers.map((d, i) => d(rm.state.karts[i], rm.track));
      for (const e of rm.step(inputs)) log.push({ tick: t, e });
      if (t < GO_TICK) expect(rm.state.karts[0].speed).toBe(0);
    }
    expect(log.filter((x) => x.e.type === 'countdown').map((x) => x.tick)).toEqual([0, 120, 240]);
    expect(log.filter((x) => x.e.type === 'go').map((x) => x.tick)).toEqual([GO_TICK]);
    expect(rm.state.phase).toBe('racing');
    expect(rm.state.time).toBe(0);
    // throttle was held the whole countdown: no start boost
    expect(rm.state.karts[0].boost.source).toBe('none');
    expect(rm.state.inputLog.length).toBe(GO_TICK + 1); // countdown ticks are logged too
  });

  it('wrong-way fires at 1.2 s for a kart driven backwards', () => {
    const track = buildTrack(OVAL);
    const rm = new RaceManager(track, config(track, racers(2)));
    const log = run(rm, [reverseDriver(), lookAheadDriver(20)], (t) => { if (t > GO_TICK + SIM_HZ * 4) rm.state.phase = 'finished'; });
    const on = log.filter((x) => x.e.type === 'wrongWay' && (x.e as { on: boolean }).on);
    expect(on.length).toBe(1);
    expect(on[0].e).toMatchObject({ racerId: 'r0' });
    // the kart needs a moment to get moving backwards; the warning comes 1.2 s after that
    expect(on[0].tick).toBeGreaterThan(GO_TICK + RACE.wrongWayHoldSeconds * SIM_HZ);
    expect(on[0].tick).toBeLessThan(GO_TICK + (RACE.wrongWayHoldSeconds + 1.5) * SIM_HZ);
  });

  it('falling below voidY: the claw holds, lifts and carries the kart back to the last checkpoint, inputs dead meanwhile', () => {
    const track = buildTrack(OVAL);
    const rm = new RaceManager(track, config(track, racers(1)));
    const s = rm.state.karts[0];
    let dropped = -1;
    const rescueTicks = Math.round(RACE.rescueSeconds * SIM_HZ);
    const freezeTicks = Math.round(RACE.respawnFreezeSeconds * SIM_HZ);
    let midAir = -Infinity, speedInFreeze = -1, speedAfter = -1, midRescue = false;
    const log = run(rm, [lookAheadDriver(20)], (t) => {
      // drop the kart well under the road, airborne: the controller must raise its own respawn event
      if (dropped < 0 && rm.state.trackers[0].nextCheckpoint === 3) { s.position[1] = track.voidY - 1; s.grounded = false; dropped = t; }
      if (dropped > 0 && t === dropped + Math.round(rescueTicks * 0.6)) { midAir = s.position[1]; midRescue = !!rm.state.trackers[0].rescue; }
      if (dropped > 0 && t === dropped + rescueTicks + freezeTicks - 2) speedInFreeze = s.speed;
      if (dropped > 0 && t === dropped + rescueTicks + freezeTicks + 60) speedAfter = s.speed;
      if (dropped > 0 && t > dropped + SIM_HZ * 5) rm.state.phase = 'finished';
    });
    const start = log.filter((x) => x.e.type === 'rescue' && (x.e as { phase: string }).phase === 'start');
    const rs = log.filter((x) => x.e.type === 'respawn');
    expect(start.length).toBe(1);
    expect(start[0].tick).toBe(dropped);
    expect(rs.length).toBe(1);
    // set down when the claw lets go, not before
    expect(Math.abs(rs[0].tick - (dropped + rescueTicks))).toBeLessThanOrEqual(1);
    expect(rs[0].e).toEqual({ type: 'respawn', racerId: 'r0', checkpoint: 2 });
    expect(log.some((x) => x.e.type === 'kart' && (x.e as { event: { type: string } }).event.type === 'respawn')).toBe(false);
    // carried high over the road on the way
    expect(midRescue).toBe(true);
    expect(midAir).toBeGreaterThan(track.checkpoints[2].position[1] + 2);
    expect(speedInFreeze).toBe(0);
    expect(speedAfter).toBeGreaterThan(3);
    expect(rm.state.trackers[0].respawnCount).toBe(1);
    expect(rm.state.trackers[0].rescue).toBeUndefined();
    const cp = track.checkpoints[2];
    expect(s.t).toBeGreaterThan(cp.t);
    expect(s.t).toBeLessThan(cp.t + 0.1);
  });

  it('Final Lap Shift fires once, when the leader starts the last lap, and the field order survives it', () => {
    const track = buildTrack(cloneDef(HARBOUR_LOOP));
    const spy = vi.spyOn(track, 'applyFinalLapShift');
    const rm = new RaceManager(track, config(track, racers(3)));
    const before: string[] = [];
    let shiftTick = -1;
    const log = run(rm, [lookAheadDriver(24, -2), lookAheadDriver(20, 0), lookAheadDriver(16, 2)], (t) => {
      if (rm.state.finalLapShiftFired && shiftTick < 0) shiftTick = t;
      if (!rm.state.finalLapShiftFired) before.splice(0, before.length, ...rm.order.map((i) => rm.state.karts[i].racerId));
      if (rm.state.karts[2].lap === 3 && t > shiftTick + 10) rm.state.phase = 'finished';
    });
    expect(spy).toHaveBeenCalledTimes(1);
    const changed = log.filter((x) => x.e.type === 'trackChanged');
    expect(changed.length).toBe(1);
    const leaderLap3 = log.find((x) => x.e.type === 'lap' && (x.e as { lap: number; racerId: string }).lap === 3 && (x.e as { racerId: string }).racerId === 'r0')!;
    expect(changed[0].tick).toBe(leaderLap3.tick);
    const phases = log.filter((x) => x.e.type === 'phase').map((x) => (x.e as { phase: string }).phase);
    expect(phases.slice(0, 2)).toEqual(['racing', 'finalLap']);
    expect(rm.order.map((i) => rm.state.karts[i].racerId).slice(0, 3)).toEqual(before);
    expect(track.branches.byId('beach')!.open).toBe(false);
  });

  it('a one-lap race shifts on the go tick', () => {
    const track = buildTrack(OVAL);
    const rm = new RaceManager(track, config(track, racers(1), 1));
    const log = run(rm, [lookAheadDriver(20)]);
    expect(log.filter((x) => x.e.type === 'trackChanged').map((x) => x.tick)).toEqual([GO_TICK]);
    expect(rm.state.phase).toBe('finished');
    expect(rm.results().ranks[0].lapTimesMs.length).toBe(1);
  });

  it('track.setLap follows the leader lap only when it changes', () => {
    const track = buildTrack(OVAL);
    const spy = vi.spyOn(track, 'setLap');
    const rm = new RaceManager(track, config(track, racers(2)));
    run(rm, [lookAheadDriver(22, -2), lookAheadDriver(18, 2)]);
    expect(spy.mock.calls.map((c) => c[0])).toEqual([2, 3]);
  });

  it('finish and grace: the race ends when everyone finishes, or finishGraceSeconds after the player with stragglers dnf', () => {
    const track = buildTrack(OVAL);
    const all = new RaceManager(track, config(track, racers(3, 0)));
    const logAll = run(all, field(3));
    expect(all.state.phase).toBe('finished');
    expect(all.results().ranks.every((r) => !r.dnf)).toBe(true);
    const last = logAll.filter((x) => x.e.type === 'finish').at(-1)!;
    expect(logAll.at(-1)!.tick).toBe(last.tick);

    const t2 = buildTrack(OVAL);
    const rm = new RaceManager(t2, config(t2, racers(4, 1)));
    // r3 crawls at 8 m/s in the middle: it cannot finish inside the grace. The player (back row) passes on the right.
    const log = run(rm, [lookAheadDriver(23, -2), lookAheadDriver(22, 2), lookAheadDriver(21, -2), lookAheadDriver(8, 0)]);
    expect(rm.state.phase).toBe('finished');
    const endTick = log.at(-1)!.tick;
    expect(endTick - rm.state.playerFinishTick).toBe(Math.round(RACE.finishGraceSeconds * SIM_HZ));
    const res = rm.results();
    expect(res.ranks.map((r) => [r.racerId, r.dnf])).toEqual([['r0', false], ['r1', false], ['r2', false], ['r3', true]]);
    expect(res.ranks[3].finishTick).toBe(endTick);
    expect(res.ranks[3].timeMs).toBe(ticksToMs(endTick - GO_TICK));
    const dnfFinish = log.filter((x) => x.e.type === 'finish' && (x.e as { dnf: boolean }).dnf);
    expect(dnfFinish.map((x) => (x.e as { racerId: string }).racerId)).toEqual(['r3']);
  });

  it('a finished kart keeps taking its input and rolls on past the line', () => {
    const track = buildTrack(OVAL);
    const rm = new RaceManager(track, config(track, racers(2, 1)));
    const drivers = [lookAheadDriver(22, -2), lookAheadDriver(8, 2)];
    let finishTick = -1;
    const posAtFinish: number[] = [];
    let speedAfter5 = -1, tAfter5 = -1;
    run(rm, drivers, (tick) => {
      const s = rm.state.karts[0];
      if (finishTick < 0 && s.finishTick !== undefined) { finishTick = s.finishTick; posAtFinish.push(...s.position); }
      if (finishTick >= 0 && tick === finishTick + 5 * SIM_HZ) { speedAfter5 = s.speed; tAfter5 = s.t; }
    });
    expect(finishTick).toBeGreaterThan(0);
    expect(speedAfter5).toBeGreaterThan(10);
    const s = rm.state.karts[0];
    const moved = Math.hypot(s.position[0] - posAtFinish[0], s.position[2] - posAtFinish[2]);
    expect(moved).toBeGreaterThan(30);
    expect(tAfter5).not.toBe(-1);
    // the rules still leave it alone
    expect(s.lap).toBe(3);
    expect(rm.results().ranks[0]).toMatchObject({ racerId: 'r0', dnf: false, finishTick });
  });

  it('ranking: finished above unfinished, ties by grid, positionChange debounced', () => {
    const track = buildTrack(OVAL);
    const rm = new RaceManager(track, config(track, racers(3)));
    // the player starts on the back row and is the fastest: it must overtake both
    // lanes 3 m apart: two karts are 1.7 m wide together, and since bumps ease apart (2026-09-21) a rubbing pass costs the passer
    const log = run(rm, [lookAheadDriver(22, -3), lookAheadDriver(18, 0), lookAheadDriver(20, 3)], (t) => { if (t > GO_TICK + SIM_HZ * 20) rm.state.phase = 'finished'; });
    const pcs = log.filter((x) => x.e.type === 'positionChange');
    expect(pcs.length).toBeGreaterThan(0);
    expect(pcs.length).toBeLessThan(20);
    expect(rm.state.karts[0].rank).toBe(1);
    expect(rm.state.karts[2].rank).toBe(2);
    expect(rm.state.karts[1].rank).toBe(3);
  });

  it('hazards: activeHazards is computed once per tick and the list is exposed for the scene', () => {
    const track = buildTrack(OVAL);
    const spy = vi.spyOn(track, 'activeHazards');
    const rm = new RaceManager(track, config(track, racers(2)));
    const hits = run(rm, [lookAheadDriver(20, 0), lookAheadDriver(19, 0.5)], (t) => { if (t > GO_TICK + SIM_HZ * 25) rm.state.phase = 'finished'; })
      .filter((x) => x.e.type === 'hazardHit');
    expect(spy).toHaveBeenCalledTimes(rm.state.tick);
    expect(rm.lastActiveHazards.map((h) => h.id).sort()).toEqual(['bumper', 'gust', 'slower', 'spinner']);
    expect(hits.length).toBeGreaterThan(0);
  });

  it('a ghost never ranks, never pops a balloon, never triggers the shift', () => {
    const track = buildTrack(OVAL);
    const rs: RacerConfig[] = [{ racerId: 'p', archetype: 'medium', isPlayer: true }, { racerId: 'g', archetype: 'medium', isGhost: true }];
    const rm = new RaceManager(track, config(track, rs));
    const log = run(rm, [lookAheadDriver(15, -2), lookAheadDriver(24, 2)]);
    expect(rm.state.karts[1].rank).toBe(0);
    expect(rm.state.karts[1].finishTick).toBeUndefined();
    expect(log.some((x) => x.e.type === 'pickup' && (x.e as { racerId: string }).racerId === 'g')).toBe(false);
    expect(log.some((x) => x.e.type === 'coin' && (x.e as { racerId: string }).racerId === 'g')).toBe(false);
    const leaderLap3 = log.find((x) => x.e.type === 'lap' && (x.e as { lap: number }).lap === 3)!;
    expect(log.find((x) => x.e.type === 'trackChanged')!.tick).toBe(leaderLap3.tick);
    expect(rm.results().ranks.map((r) => r.racerId)).toEqual(['p']);
  });
});
