// Review fixes for the claw rescue: a held kart is the race manager's (no physics, no events,
// no contact, no slipstream, no pickups); the claw finishes after the flag; a route-changing
// Final Lap Shift re-aims a claw in the air; and a kart that hops back over the road it went
// off is not falling any more, while a lower road under the cliff never catches it.
import { describe, expect, it } from 'vitest';
import { SIM_DT, SIM_HZ, stepKart, stepKarts } from '../kart-controller/step.ts';
import { headingOf, NEUTRAL_INPUT, type InputState, type KartEvent, type KartState } from '../kart-controller/types.ts';
import canyonJson from '../track-builder/tracks/canyon-rush.json';
import { buildTrack, type Track } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { RACE } from './constants.ts';
import { GO_TICK } from './countdown.ts';
import { indexFeatures, initTimers, stepPickups } from './pickups.ts';
import { RaceManager } from './race.ts';
import { lookAheadDriver, parkDriver, type Driver } from './__tests__/drivers.ts';
import { OVAL, cloneDef, placeAt, spawnKart } from './__tests__/fixtures.ts';
import type { RaceConfig, RaceEvent } from './types.ts';

const RESCUE_TICKS = Math.round(RACE.rescueSeconds * SIM_HZ);
const THROTTLE: InputState = { ...NEUTRAL_INPUT, throttle: 1, steer: 0.5 };
const distXZ = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[2] - b[2]);

function config(track: Track, racers: RaceConfig['racers'], laps?: number): RaceConfig {
  return { mode: 'quick', trackId: track.id, speedClass: 150, seed: 1, racers, laps };
}

/** Step the countdown out with idle inputs; the next step is the first racing tick after go. */
function toGo(rm: RaceManager): void {
  const idle = rm.state.karts.map(() => NEUTRAL_INPUT);
  while (rm.state.tick <= GO_TICK) rm.step(idle);
}

/** Drop a kart under the void, as if it fell: its next step raises the controller's respawn. */
function drop(track: Track, s: KartState): void {
  s.position[1] = track.voidY - 1;
  s.grounded = false;
}

const isRescue = (e: RaceEvent, id: string, phase: 'start' | 'end') => e.type === 'rescue' && e.racerId === id && e.phase === phase;

describe('claw rescue: a held kart belongs to the race manager', () => {
  it('stepKart leaves a held kart exactly where the claw put it and raises no events', () => {
    const track = buildTrack(OVAL);
    const { s, c } = spawnKart(track, 0);
    placeAt(track, s, 0.3);
    // in the air, moving: without the hold, gravity and speed would take it
    s.position[1] += 2;
    s.grounded = false;
    s.speed = 15;
    s.status.held = true;
    const at = [...s.position], heading = s.heading, t = s.t;
    const events: KartEvent[] = [];
    for (let k = 0; k < 60; k++) events.push(...stepKart(s, THROTTLE, track, c, SIM_DT));
    expect(events).toEqual([]);
    expect(s.position).toEqual(at);
    expect(s.heading).toBe(heading);
    expect(s.t).toBe(t);
    expect(s.speed).toBe(15);
    expect(s.grounded).toBe(false);
    // let go: the physics has it again and it lands
    s.status.held = false;
    for (let k = 0; k < 120; k++) events.push(...stepKart(s, NEUTRAL_INPUT, track, c, SIM_DT));
    expect(events.some((e) => e.type === 'landed')).toBe(true);
  });

  it('a held kart is skipped for kart-kart contact, even when it is not intangible', () => {
    const track = buildTrack(OVAL);
    const a = spawnKart(track, 0, 'held'), b = spawnKart(track, 1, 'free');
    // overlapping: 0.8 m apart, two kart radii is 1.7 m
    placeAt(track, a.s, 0.3, 0);
    placeAt(track, b.s, 0.3, 0.8);
    a.s.status.held = true;
    expect(a.s.status.intangibleRemaining).toBe(0);
    expect(b.s.status.intangibleRemaining).toBe(0);
    const pa = [...a.s.position], pb = [...b.s.position];
    const ev = stepKarts([a.s, b.s], [NEUTRAL_INPUT, NEUTRAL_INPUT], track, [a.c, b.c], SIM_DT);
    expect(ev[0]).toEqual([]);
    expect(ev[1].some((e) => e.type === 'bump')).toBe(false);
    expect(a.s.position).toEqual(pa);
    // b is parked: only a separation push could move it sideways
    expect(distXZ(b.s.position, pb)).toBeLessThan(1e-9);
    expect(b.s.bumpCooldown).toBe(0);
  });

  it('a held kart builds no slipstream, even sitting in a moving kart\'s wake at speed', () => {
    const track = buildTrack(OVAL);
    const a = spawnKart(track, 0, 'held'), b = spawnKart(track, 1, 'lead');
    // a 4 m behind b on the same line, same heading, both at 20 m/s (wake is 8 m long)
    placeAt(track, b.s, 0.3, 0);
    placeAt(track, a.s, 0.3 - 4 / track.length, 0);
    a.s.speed = 20; b.s.speed = 20;
    a.s.status.held = true;
    stepKarts([a.s, b.s], [NEUTRAL_INPUT, NEUTRAL_INPUT], track, [a.c, b.c], SIM_DT);
    expect(a.s.slipstreamSeconds).toBe(0);
    const ticks = Math.ceil((a.c.slipstreamSeconds + 0.5) * SIM_HZ);
    const events: KartEvent[] = [];
    for (let k = 0; k < ticks; k++) events.push(...stepKarts([a.s, b.s], [NEUTRAL_INPUT, THROTTLE], track, [a.c, b.c], SIM_DT)[0]);
    expect(a.s.slipstreamSeconds).toBe(0);
    expect(a.s.boost.source).toBe('none');
    expect(events).toEqual([]);
  });

  it('a stuck kart in the claw fires no kart events (no landed every tick), and is held until set down', () => {
    const track = buildTrack(OVAL);
    // an idle AI kart is stuck after stuckSeconds: the claw comes for it where it sits
    const rm = new RaceManager(track, config(track, [{ racerId: 'ai', archetype: 'medium', isPlayer: false }]));
    const s = rm.state.karts[0];
    let start = -1, end = -1, heldMid = false;
    const during: KartEvent[] = [];
    const limit = GO_TICK + (RACE.stuckSeconds + RACE.rescueSeconds + 2) * SIM_HZ;
    while (end < 0 && rm.state.tick < limit) {
      const tick = rm.state.tick;
      if (start >= 0 && tick === start + Math.round(RESCUE_TICKS / 2)) heldMid = s.status.held;
      const out = rm.step([parkDriver(s, track)]);
      for (const e of out) {
        if (start >= 0 && e.type === 'kart') during.push(e.event);
        if (isRescue(e, 'ai', 'start')) start = tick;
        if (isRescue(e, 'ai', 'end')) end = tick;
      }
    }
    expect(start).toBeGreaterThan(GO_TICK);
    expect(end).toBeGreaterThan(start);
    expect(heldMid).toBe(true);
    // stuck on the road, the old way it "landed" on every tick of the grab
    expect(during.filter((e) => e.type === 'landed')).toEqual([]);
    expect(during).toEqual([]);
    expect(s.status.held).toBe(false);
    expect(rm.state.trackers[0].rescue).toBeUndefined();
    expect(rm.state.trackers[0].respawnCount).toBe(1);
  });

  it('a held kart pops no balloon and picks up no coin; let go, it does', () => {
    const track = buildTrack(OVAL);
    const fi = indexFeatures(track);
    const { pickupStates, coinStates } = initTimers(fi);
    const k = spawnKart(track, 0);
    k.s.status.held = true;
    const events: RaceEvent[] = [];
    k.s.position = [...track.features[fi.pickups[0]].position];
    stepPickups(fi, pickupStates, coinStates, track, [k.s], [k.c], SIM_DT, events);
    k.s.position = [...track.features[fi.coins[0]].position];
    stepPickups(fi, pickupStates, coinStates, track, [k.s], [k.c], SIM_DT, events);
    expect(events).toEqual([]);
    expect(k.s.coins).toBe(0);
    expect(pickupStates[0].respawnRemaining).toBe(0);
    expect(coinStates[0].respawnRemaining).toBe(0);
    k.s.status.held = false;
    stepPickups(fi, pickupStates, coinStates, track, [k.s], [k.c], SIM_DT, events);
    expect(events).toEqual([{ type: 'coin', racerId: 'k0', coins: 1 }]);
  });
});

describe('claw rescue: the flag and the Final Lap Shift', () => {
  it('the race ends mid-rescue: the claw still sets the kart down (held off, rescue gone)', () => {
    const track = buildTrack(OVAL);
    const rm = new RaceManager(track, config(track, [
      { racerId: 'p', archetype: 'medium', isPlayer: true },
      { racerId: 'ai', archetype: 'medium', isPlayer: false },
    ], 1));
    // the player laps well before the slow AI; the race ends finishGraceSeconds after that
    const drivers: Driver[] = [lookAheadDriver(20), lookAheadDriver(8)];
    const graceTicks = Math.round(RACE.finishGraceSeconds * SIM_HZ);
    const s = rm.state.karts[1], tr = rm.state.trackers[1];
    const log: { tick: number; e: RaceEvent }[] = [];
    let dropped = -1, finishedAt = -1, rescueAtFlag = false;
    const inputs: InputState[] = [];
    while (rm.state.tick < SIM_HZ * 120) {
      const tick = rm.state.tick;
      const pft = rm.state.playerFinishTick;
      // 30 ticks before the flag: the AI goes over the side
      if (dropped < 0 && pft >= 0 && tick === pft + graceTicks - 30) {
        expect(tr.rescue).toBeUndefined();
        drop(track, s);
        dropped = tick;
      }
      for (let i = 0; i < 2; i++) inputs[i] = drivers[i](rm.state.karts[i], track);
      for (const e of rm.step(inputs)) log.push({ tick, e });
      if (finishedAt < 0 && rm.state.phase === 'finished') { finishedAt = tick; rescueAtFlag = !!tr.rescue && s.status.held; }
      if (finishedAt >= 0 && tick > finishedAt + RESCUE_TICKS + 10) break;
    }
    expect(dropped).toBeGreaterThan(0);
    expect(finishedAt).toBe(dropped + 30);
    // the claw was in the air when the flag fell
    expect(rescueAtFlag).toBe(true);
    expect(log.some((x) => x.tick === dropped && isRescue(x.e, 'ai', 'start'))).toBe(true);
    // and it finished the job after the flag
    const end = log.find((x) => isRescue(x.e, 'ai', 'end'));
    expect(end).toBeDefined();
    expect(end!.tick).toBeGreaterThan(finishedAt);
    expect(Math.abs(end!.tick - (dropped + RESCUE_TICKS))).toBeLessThanOrEqual(1);
    expect(log.some((x) => x.tick === end!.tick && x.e.type === 'respawn' && x.e.racerId === 'ai')).toBe(true);
    expect(tr.rescue).toBeUndefined();
    expect(s.status.held).toBe(false);
    expect(tr.respawnCount).toBe(1);
    // set down on the road at its last checkpoint, not left in the air
    const cp = track.checkpoints[tr.lastCheckpoint];
    expect(distXZ(s.position, cp.position)).toBeLessThan(cp.halfWidth);
    expect(s.position[1]).toBeGreaterThan(cp.position[1] - 0.5);
    expect(s.position[1]).toBeLessThan(cp.position[1] + 1);
  });

  it('a route-changing Final Lap Shift re-aims a claw already in the air at the moved checkpoint', () => {
    // Canyon Rush: THE BRIDGE IS DOWN replaces the road from 0.32 to 0.665
    const track = buildTrack(cloneDef(canyonJson as TrackDefinition));
    const rm = new RaceManager(track, config(track, [
      { racerId: 'a', archetype: 'medium', isPlayer: false },
      { racerId: 'b', archetype: 'medium', isPlayer: false },
    ], 2));
    toGo(rm);
    const idle = [NEUTRAL_INPUT, NEUTRAL_INPUT];
    const s = rm.state.karts[0], tr = rm.state.trackers[0];
    // on the old bridge road just past checkpoint 4, it goes over the side
    const cp4 = track.checkpoints[4];
    const t = cp4.t + 0.01;
    placeAt(track, s, t, 2);
    tr.lastCheckpoint = 4; tr.nextCheckpoint = 5; tr.prevT = t;
    drop(track, s);
    rm.step(idle);
    expect(tr.rescue).toBeDefined();
    const oldTo = [...tr.rescue!.to];
    const oldCp = [...cp4.position];
    expect(distXZ(oldTo, oldCp)).toBeLessThan(cp4.halfWidth);
    for (let k = 0; k < 40; k++) rm.step(idle);
    expect(tr.rescue).toBeDefined();
    // the other kart starts the last lap: the shift fires with the claw mid-air
    rm.state.karts[1].lap = 2;
    rm.step(idle);
    expect(rm.state.finalLapShiftFired).toBe(true);
    expect(tr.rescue).toBeDefined();
    const cp = track.checkpoints[tr.lastCheckpoint];
    // the checkpoint really moved with the new road
    expect(distXZ(cp.position, oldCp)).toBeGreaterThan(20);
    // the claw now flies to it
    const to = tr.rescue!.to;
    expect(distXZ(to, cp.position)).toBeLessThan(cp.halfWidth);
    expect(distXZ(to, oldTo)).toBeGreaterThan(20);
    expect(to[1]).toBeCloseTo(track.sample(cp.t, 0, 0).groundY + RACE.respawnLift, 0);
    expect(tr.rescue!.toHeading).toBe(headingOf(cp.tangent));
    // and carries the kart there, not to the old spot
    let last = [...s.position];
    for (let k = 0; k < RESCUE_TICKS && tr.rescue; k++) { last = [...s.position]; rm.step(idle); }
    expect(tr.rescue).toBeUndefined();
    expect(distXZ(last, cp.position)).toBeLessThan(cp.halfWidth);
    expect(distXZ(s.position, cp.position)).toBeLessThan(cp.halfWidth);
  });

  it('the claw sets the kart down where it carried it: no sideways jump at let-go', () => {
    const track = buildTrack(OVAL);
    // Guards the hold itself: a held kart skips stepGround, so its t stays where it fell. The
    // set-down must not measure the claw's lateral against that stale t. Each case fell most
    // of a sector past its checkpoint, a few metres off centre.
    for (const [cpi, t, lat] of [[2, 0.36, 3], [3, 0.49, 2], [1, 0.22, 3]] as const) {
      const rm = new RaceManager(track, config(track, [{ racerId: 'ai', archetype: 'medium', isPlayer: false }]));
      toGo(rm);
      const s = rm.state.karts[0], tr = rm.state.trackers[0];
      placeAt(track, s, t, lat);
      tr.lastCheckpoint = cpi; tr.nextCheckpoint = cpi + 1; tr.prevT = t;
      drop(track, s);
      rm.step([NEUTRAL_INPUT]);
      expect(tr.rescue).toBeDefined();
      const to = [...tr.rescue!.to];
      let last = [...s.position];
      for (let k = 0; k < RESCUE_TICKS + 5 && tr.rescue; k++) { last = [...s.position]; rm.step([NEUTRAL_INPUT]); }
      expect(tr.rescue).toBeUndefined();
      // the claw's last pose is over its target, and the kart is set down right there
      expect(distXZ(last, to)).toBeLessThan(0.01);
      expect(distXZ(s.position, to), `fell at t=${t} lateral ${lat}, checkpoint ${cpi}`).toBeLessThan(0.5);
    }
  });
});

describe('claw rescue: falling off an open edge', () => {
  function trackWithEdge() {
    const def = cloneDef(OVAL);
    def.openEdges = [{ fromT: 0.1, toT: 0.2, side: 'right' }];
    return buildTrack(def);
  }

  /** A kart just past the lip of the open right edge at t=0.15, heading back toward the road. */
  function pastTheLip(track: Track, y: number, vy: number) {
    const { s, c } = spawnKart(track, 0);
    const hw = track.sample(0.15, 0, 0).halfWidth;
    // the lip: kerb 1 m + shoulder 6 m past the road's edge
    placeAt(track, s, 0.15, hw + 7.5);
    expect(track.sample(0.15, hw + 7.5, 0).overCliff).toBe(true);
    s.position[1] = y;
    s.heading -= 0.8; // turned back to the left, toward the road
    s.speed = 12;
    s.verticalVelocity = vy;
    s.grounded = false;
    return { s, c };
  }

  function run(track: Track, s: KartState, c: ReturnType<typeof spawnKart>['c'], ticks: number) {
    const events: KartEvent[] = [];
    let wentFalling = false, lateralMin = Infinity;
    for (let k = 0; k < ticks; k++) {
      events.push(...stepKart(s, NEUTRAL_INPUT, track, c, SIM_DT));
      if (s.status.falling) wentFalling = true;
      const smp = track.sample(s.t, 0, 0);
      const lat = (s.position[0] - smp.position[0]) * smp.tangent[2] - (s.position[2] - smp.position[2]) * smp.tangent[0];
      lateralMin = Math.min(lateralMin, lat);
    }
    return { events, wentFalling, lateralMin };
  }

  it('a hop back over the road it went off lands; sunk too deep, or over a lower road (Canyon mine tunnel), it keeps falling', () => {
    // 1. a hop over the lip and straight back: falling for a moment, then not, and it lands
    const edge = trackWithEdge();
    const lipY = edge.sample(0.15, 20, 0).groundY;
    const hop = pastTheLip(edge, lipY, 3);
    const hw = edge.sample(0.15, 0, 0).halfWidth;
    const r = run(edge, hop.s, hop.c, 120);
    expect(r.wentFalling).toBe(true);
    // back over the shoulder, 2 m inside the lip
    expect(r.lateralMin).toBeLessThan(hw + 5);
    expect(hop.s.status.falling).toBe(false);
    expect(hop.s.grounded).toBe(true);
    expect(hop.s.position[1]).toBeGreaterThan(-0.5);
    expect(r.events.some((e) => e.type === 'respawn')).toBe(false);
    expect(r.events.some((e) => e.type === 'landed')).toBe(true);

    // 2. the same move, but it had already sunk 2 m under the lip: it is under the road for real
    const sunk = pastTheLip(edge, lipY - 2, -4);
    const r2 = run(edge, sunk.s, sunk.c, 120);
    expect(r2.lateralMin).toBeLessThan(hw + 5);
    expect(r2.events.some((e) => e.type === 'landed')).toBe(false);
    expect(r2.events.some((e) => e.type === 'respawn')).toBe(true);

    // 3. Canyon Rush: off the cliff road, found over the mine tunnel far below. Not the road it
    // went off, so it does not land there: it falls on and the claw is called.
    const canyon = buildTrack(cloneDef(canyonJson as TrackDefinition));
    const tunnel = canyon.branches.byId('mine-tunnel')!;
    expect(tunnel.open).toBe(true);
    const tt = 0.48;
    const cliff = canyon.sample(tt, -canyon.sample(tt, 0, 0).halfWidth - 8, 0);
    expect(cliff.overCliff).toBe(true);
    const under = canyon.sample(tt, 0, tunnel.index);
    expect(under.overCliff).toBe(false);
    expect(cliff.groundY - under.groundY).toBeGreaterThan(20);
    const { s, c } = spawnKart(canyon, 0);
    s.position = [under.position[0], under.groundY + 0.3, under.position[2]];
    s.heading = headingOf(under.tangent);
    s.t = tt; s.branch = tunnel.index;
    s.speed = 0; s.verticalVelocity = -10; s.grounded = false;
    s.status.falling = true; s.status.fallFromY = cliff.groundY;
    const events: KartEvent[] = [];
    let grounded = false;
    for (let k = 0; k < 20; k++) {
      events.push(...stepKart(s, NEUTRAL_INPUT, canyon, c, SIM_DT));
      grounded ||= s.grounded;
      expect(s.branch).toBe(tunnel.index);
      expect(s.status.falling).toBe(true);
    }
    // straight through the tunnel's road, never standing on it
    expect(grounded).toBe(false);
    expect(s.position[1]).toBeLessThan(under.groundY - 1);
    expect(events.some((e) => e.type === 'landed')).toBe(false);
    expect(events.some((e) => e.type === 'respawn')).toBe(true);
  });
});
