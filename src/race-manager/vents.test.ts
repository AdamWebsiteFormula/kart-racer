// Launch vents (design.md "Track thrills"): geysers on Canyon Rush, steam vents on Frostbite Pass.
// A vent idles, glows for ventWarnSeconds, then erupts for ventEruptSeconds at the end of every
// period; erupting, it throws a kart up (hit 'launch') like a ramp, so a trick up there is a boost.
// It is never a hit, the AI does not dodge it, and it fires a `vent` race event per state change.
import { describe, expect, it } from 'vitest';
import { applyAvoid, type AvoidContext } from '../ai-driver/avoid.ts';
import { AiDriver } from '../ai-driver/index.ts';
import { kartAt, lineFor, memory } from '../ai-driver/__tests__/units.ts';
import { makeScratch } from '../ai-driver/types.ts';
import { simTick, type SimParts } from '../game/simtick.ts';
import { Items } from '../items/items.ts';
import { SIM_DT, SIM_HZ } from '../kart-controller/step.ts';
import { NEUTRAL_INPUT, type InputState, type KartState } from '../kart-controller/types.ts';
import { BUILDER } from '../track-builder/constants.ts';
import { ventPhase, type VentState } from '../track-builder/hazards.ts';
import { buildTrack, type Track } from '../track-builder/track.ts';
import type { ActiveHazard, HazardDef, TrackDefinition } from '../track-builder/types.ts';
import { CAST } from '../ui-hud/data/cast.ts';
import { RaceManager } from './race.ts';
import { lookAheadDriver } from './__tests__/drivers.ts';
import { placeAt } from './__tests__/fixtures.ts';
import type { RaceConfig, RaceEvent } from './types.ts';

const FILES = import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' }) as Record<string, TrackDefinition>;
const TRACKS: Record<string, TrackDefinition> = Object.fromEntries(Object.values(FILES).map((d) => [d.id, d]));
const W = BUILDER.ventWarnSeconds, E = BUILDER.ventEruptSeconds;

const ventDefs = (def: TrackDefinition): HazardDef[] => (def.hazards ?? []).filter((h) => h.type === 'vent');
const ventDef = (def: TrackDefinition, id: string): HazardDef => ventDefs(def).find((h) => h.id === id)!;

type Launched = { racerId: string; jumpId: string };
function launchesIn(ev: readonly RaceEvent[]): Launched[] {
  const out: Launched[] = [];
  for (const e of ev) if (e.type === 'kart' && e.event.type === 'launched') out.push({ racerId: e.racerId, jumpId: e.event.jumpId });
  return out;
}
function kartEventsIn(ev: readonly RaceEvent[], type: string) {
  return ev.filter((e) => e.type === 'kart' && e.event.type === type).map((e) => (e as Extract<RaceEvent, { type: 'kart' }>).event);
}

/** One player kart (neutral input never counts as stuck) on a real track, past the countdown. */
function soloRace(trackId: string) {
  const def = TRACKS[trackId];
  const track = buildTrack(def);
  const config: RaceConfig = { mode: 'quick', trackId, speedClass: 150, seed: 1, laps: 2, racers: [{ racerId: 'p', archetype: 'medium', isPlayer: true }] };
  const rm = new RaceManager(track, config);
  while (rm.state.phase === 'countdown') rm.step([NEUTRAL_INPUT]);
  return { def, track, rm, s: rm.state.karts[0], tr: rm.state.trackers[0], c: rm.consts[0] };
}

/** Race time the manager's next step() will run at. */
const nextTime = (rm: RaceManager) => (rm.state.tick - rm.state.goTick) * SIM_DT;

/** Step with `input` until the vent's state at the next step's time is `state`; returns every event. */
function stepUntilVent(rm: RaceManager, v: HazardDef, state: VentState, input: InputState = NEUTRAL_INPUT): RaceEvent[] {
  const log: RaceEvent[] = [];
  for (let i = 0; i < 10 * SIM_HZ && ventPhase(v, nextTime(rm)).state !== state; i++) log.push(...rm.step([input]));
  expect(ventPhase(v, nextTime(rm)).state).toBe(state);
  return log;
}

/** Park the kart dead still on the vent's mouth. */
function park(track: Track, s: KartState, v: HazardDef): void {
  placeAt(track, s, v.t, v.lateral ?? 0);
  s.speed = 0; s.lateralVelocity = 0; s.verticalVelocity = 0; s.grounded = true;
}

/** Height of the kart above the road under it, on the vent's lane. */
const heightAbove = (track: Track, s: KartState, v: HazardDef) => s.position[1] - track.sample(s.t, v.lateral ?? 0, 0).position[1];

describe('ventPhase', () => {
  const def: HazardDef = { type: 'vent', t: 0, period: 4 };

  it('idles, then warns for ventWarnSeconds, then erupts for ventEruptSeconds at the end of each period', () => {
    expect(ventPhase(def, 0)).toEqual({ state: 'idle', k: 0 });
    expect(ventPhase(def, 4 - W - E - 1e-6).state).toBe('idle');
    expect(ventPhase(def, 4 - W - E)).toEqual({ state: 'warn', k: 0 });
    expect(ventPhase(def, 4 - E - W / 2).k).toBeCloseTo(0.5, 9);
    expect(ventPhase(def, 4 - E - 1e-6).state).toBe('warn');
    expect(ventPhase(def, 4 - E)).toEqual({ state: 'erupt', k: 0 });
    expect(ventPhase(def, 4 - E / 2).k).toBeCloseTo(0.5, 9);
    expect(ventPhase(def, 4 - 1e-6).state).toBe('erupt');
    expect(ventPhase(def, 4).state).toBe('idle');
    // tick by tick over three periods: runs of idle → warn → erupt, each its own length, k in [0, 1)
    const runs: { state: VentState; ticks: number }[] = [];
    for (let i = 0; i < 12 * SIM_HZ; i++) {
      const p = ventPhase(def, i * SIM_DT);
      expect(p.k).toBeGreaterThanOrEqual(0);
      expect(p.k).toBeLessThan(1);
      const last = runs[runs.length - 1];
      if (last && last.state === p.state) last.ticks++;
      else runs.push({ state: p.state, ticks: 1 });
    }
    expect(runs.map((r) => r.state)).toEqual(['idle', 'warn', 'erupt', 'idle', 'warn', 'erupt', 'idle', 'warn', 'erupt']);
    const secs = (st: VentState) => runs.filter((r) => r.state === st).map((r) => r.ticks * SIM_DT);
    for (const w of secs('warn')) expect(Math.abs(w - W)).toBeLessThanOrEqual(SIM_DT + 1e-9);
    for (const e of secs('erupt')) expect(Math.abs(e - E)).toBeLessThanOrEqual(SIM_DT + 1e-9);
    for (const q of secs('idle')) expect(Math.abs(q - (4 - W - E))).toBeLessThanOrEqual(SIM_DT + 1e-9);
  });

  it('offset shifts the cycle; negative (countdown) time wraps into it', () => {
    const shifted: HazardDef = { ...def, offset: 1.3 };
    for (let t = -6; t < 10; t += 0.37) {
      const a = ventPhase(shifted, t), b = ventPhase(def, t + 1.3);
      expect(a.state).toBe(b.state);
      expect(a.k).toBeCloseTo(b.k, 9);
    }
    // offset 2 on period 4: exactly half a cycle apart, so two side-by-side vents take turns
    const other: HazardDef = { ...def, offset: 2 };
    for (let i = 0; i < 8 * SIM_HZ; i++) {
      const t = i * SIM_DT;
      expect(ventPhase(def, t).state === 'erupt' && ventPhase(other, t).state === 'erupt').toBe(false);
    }
    // time −3 (the first countdown tick) is time 1 of the cycle
    expect(ventPhase(def, -3).state).toBe(ventPhase(def, 1).state);
    expect(ventPhase(def, -1.5 + 1e-9).state).toBe('erupt');
    expect(ventPhase(def, -2.5 + 1e-9).state).toBe('warn');
  });

  it('a period too short for warn + erupt is clamped up to warn + erupt + 0.1; no period means 5', () => {
    const P = W + E + 0.1;
    for (const period of [1, 0, -3, W + E]) {
      const d: HazardDef = { ...def, period };
      expect(ventPhase(d, 0.05).state).toBe('idle');
      expect(ventPhase(d, 0.1 + 1e-9).state).toBe('warn');
      expect(ventPhase(d, 0.1 + W + 1e-9).state).toBe('erupt');
      expect(ventPhase(d, P - 1e-6).state).toBe('erupt');
      expect(ventPhase(d, P + 0.05).state).toBe('idle');
      expect(ventPhase(d, P + 0.1 + 1e-9).state).toBe('warn');
    }
    const none: HazardDef = { type: 'vent', t: 0 };
    expect(ventPhase(none, 5 - W - E - 1e-6).state).toBe('idle');
    expect(ventPhase(none, 5 - W - E + 1e-6).state).toBe('warn');
    expect(ventPhase(none, 5 - E + 1e-6).state).toBe('erupt');
    expect(ventPhase(none, 5 + 1e-6).state).toBe('idle');
  });
});

describe('vents on the track', () => {
  it('the builder constants are the schema defaults, and each track carries its two vents', () => {
    expect([BUILDER.ventRadius, BUILDER.ventWarnSeconds, BUILDER.ventEruptSeconds, BUILDER.ventLaunch]).toEqual([2.2, 1, 1.5, 14]);
    for (const [id, asset, ids] of [['canyon-rush', 'geyser', ['geyser-1', 'geyser-2']], ['frostbite-pass', 'steam', ['steam-1', 'steam-2']]] as const) {
      const track = buildTrack(TRACKS[id]);
      const vs = track.hazards.vents(0);
      expect(vs.map((v) => v.id)).toEqual(ids);
      for (const v of vs) {
        expect(v.asset).toBe(asset);
        const d = ventDef(TRACKS[id], v.id);
        expect(v.position).toEqual(track.sample(d.t, d.lateral ?? 0, 0).position);
        // on the road, not off in the scenery
        expect(Math.abs(d.lateral ?? 0)).toBeLessThan(track.sample(d.t, 0, 0).halfWidth);
      }
    }
  });

  it('activeHazards lists a vent only while it erupts, with hit launch, the vent radius and the builder launch', () => {
    for (const id of ['canyon-rush', 'frostbite-pass']) {
      const def = TRACKS[id];
      const track = buildTrack(def);
      const erupted = new Set<string>();
      for (let i = -3 * SIM_HZ; i < 10 * SIM_HZ; i++) {
        const time = i * SIM_DT;
        const active = track.activeHazards(time);
        const views = track.hazards.vents(time);
        for (const v of ventDefs(def)) {
          const listed = active.filter((h) => h.id === v.id);
          const state = ventPhase(v, time).state;
          expect(views.find((x) => x.id === v.id)!.state).toBe(state);
          if (state !== 'erupt') { expect(listed).toEqual([]); continue; }
          erupted.add(v.id!);
          expect(listed).toHaveLength(1);
          expect(listed[0]).toMatchObject({ type: 'vent', hit: 'launch', radius: BUILDER.ventRadius, launch: BUILDER.ventLaunch });
          expect(listed[0].position).toEqual(views.find((x) => x.id === v.id)!.position);
        }
      }
      expect([...erupted].sort()).toEqual(ventDefs(def).map((v) => v.id).sort());
    }
  });

  it("a vent's own launch overrides the builder one; a disabled vent is neither listed nor reported", () => {
    const def = structuredClone(TRACKS['canyon-rush']);
    ventDef(def, 'geyser-1').launch = 20;
    const track = buildTrack(def);
    const g1 = ventDef(def, 'geyser-1');
    let time = 0;
    while (ventPhase(g1, time).state !== 'erupt') time += SIM_DT;
    expect(track.activeHazards(time).find((h) => h.id === 'geyser-1')!.launch).toBe(20);
    track.hazards.setEnabled('geyser-1', false);
    expect(track.activeHazards(time).find((h) => h.id === 'geyser-1')).toBeUndefined();
    expect(track.hazards.vents(time).map((v) => v.id)).toEqual(['geyser-2']);
  });
});

describe('a kart on a geyser in a race (canyon-rush)', () => {
  it('a kart parked on an erupting geyser is thrown up: vy = ventLaunch, fromJumpId = the vent id, a launched event', () => {
    const { def, track, rm, s } = soloRace('canyon-rush');
    const g1 = ventDef(def, 'geyser-1');
    stepUntilVent(rm, g1, 'idle');
    park(track, s, g1);
    const before = stepUntilVent(rm, g1, 'erupt');
    expect(launchesIn(before)).toEqual([]);
    expect(s.grounded).toBe(true);
    const ev = rm.step([NEUTRAL_INPUT]);
    expect(launchesIn(ev)).toEqual([{ racerId: 'p', jumpId: 'geyser-1' }]);
    expect(s.verticalVelocity).toBe(BUILDER.ventLaunch);
    expect(s.grounded).toBe(false);
    expect(s.airborne.fromJumpId).toBe('geyser-1');
    // and it really flies: well clear of the road a moment later
    for (let i = 0; i < 0.3 * SIM_HZ; i++) rm.step([NEUTRAL_INPUT]);
    expect(heightAbove(track, s, g1)).toBeGreaterThan(2);
  });

  it('a kart on a geyser while it only glows (warn) or idles is not thrown', () => {
    const { def, track, rm, s } = soloRace('canyon-rush');
    const g1 = ventDef(def, 'geyser-1');
    stepUntilVent(rm, g1, 'idle');
    park(track, s, g1);
    const idle = stepUntilVent(rm, g1, 'warn');
    let warnTicks = 0;
    const warn: RaceEvent[] = [];
    while (ventPhase(g1, nextTime(rm)).state === 'warn') {
      warn.push(...rm.step([NEUTRAL_INPUT]));
      warnTicks++;
      expect(rm.lastActiveHazards.some((h) => h.id === 'geyser-1')).toBe(false);
      expect(s.grounded).toBe(true);
      expect(s.verticalVelocity).toBeLessThanOrEqual(0);
    }
    expect(Math.abs(warnTicks * SIM_DT - W)).toBeLessThanOrEqual(SIM_DT + 1e-9);
    expect(launchesIn([...idle, ...warn])).toEqual([]);
    expect(s.airborne.fromJumpId).toBeUndefined();
  });

  it('one eruption throws a kart once: one launched event and about 4 m of air (a ramp is 5 to 6)', () => {
    // BUG (race-manager/hazards.ts 'launch'): the throw has no grounded guard, only `verticalVelocity < launch`.
    // Gravity takes vy under `launch` every tick, so while the kart rises through the vent's 3 m reach it
    // is re-launched every tick: ~23 launched events per pass, vy pinned at 14 m/s, a peak near 6 m.
    const { def, track, rm, s, c } = soloRace('canyon-rush');
    const g1 = ventDef(def, 'geyser-1');
    stepUntilVent(rm, g1, 'erupt');
    rm.step([NEUTRAL_INPUT]); // one tick into the eruption, then drive over it at race speed on its lane
    placeAt(track, s, g1.t, g1.lateral ?? 0);
    s.speed = 20;
    const drive = lookAheadDriver(20, g1.lateral ?? 0);
    const launched: Launched[] = [];
    let peak = -Infinity, flew = false;
    for (let i = 0; i < 3 * SIM_HZ; i++) {
      const ev = rm.step([drive(s, track)]);
      launched.push(...launchesIn(ev).filter((l) => l.jumpId === 'geyser-1'));
      if (s.airborne.fromJumpId === 'geyser-1') { flew = true; peak = Math.max(peak, heightAbove(track, s, g1)); }
      if (flew && kartEventsIn(ev, 'landed').length) break;
    }
    expect(flew).toBe(true);
    const ideal = BUILDER.ventLaunch ** 2 / (2 * c.gravity); // 3.77 m
    expect.soft(launched.length, 'launched events for one pass over one eruption').toBe(1);
    expect.soft(peak, `peak height above the road (ideal ${ideal.toFixed(2)} m)`).toBeLessThan(ideal + 0.4);
    expect.soft(peak).toBeGreaterThan(ideal - 0.6);
  });

  it('a trick pressed at the top of the throw gives a trick boost on landing', () => {
    const { def, track, rm, s } = soloRace('canyon-rush');
    const g1 = ventDef(def, 'geyser-1');
    stepUntilVent(rm, g1, 'erupt');
    rm.step([NEUTRAL_INPUT]);
    placeAt(track, s, g1.t, g1.lateral ?? 0);
    s.speed = 20;
    const drive = lookAheadDriver(20, g1.lateral ?? 0);
    let pressTicks = 0;
    let landed: ReturnType<typeof kartEventsIn> = [], boosts: ReturnType<typeof kartEventsIn> = [];
    for (let i = 0; i < 3 * SIM_HZ; i++) {
      // press on the way down, once it is falling: the kart is long out of the vent's reach
      const press = !s.grounded && s.airborne.fromJumpId === 'geyser-1' && s.verticalVelocity < 0 && pressTicks < 3;
      if (press) pressTicks++;
      const ev = rm.step([{ ...drive(s, track), drift: press }]);
      landed = kartEventsIn(ev, 'landed');
      boosts = kartEventsIn(ev, 'boostStart');
      if (landed.length) break;
    }
    expect(pressTicks).toBeGreaterThan(0);
    expect(landed).toEqual([{ type: 'landed', fromJumpId: 'geyser-1', trick: true }]);
    expect(boosts).toContainEqual(expect.objectContaining({ type: 'boostStart', source: 'trick' }));
    expect(s.boost.source).toBe('trick');
  });

  it('a trick pressed just after the throw (while still rising over the vent) is kept', () => {
    // BUG, same cause as above: every re-launch in the vent's reach sets airborne.trickQueued = false,
    // so a trick pressed in the first ~0.2 s of the flight is thrown away.
    const { def, track, rm, s } = soloRace('canyon-rush');
    const g1 = ventDef(def, 'geyser-1');
    stepUntilVent(rm, g1, 'erupt');
    rm.step([NEUTRAL_INPUT]);
    placeAt(track, s, g1.t, g1.lateral ?? 0);
    s.speed = 20;
    const drive = lookAheadDriver(20, g1.lateral ?? 0);
    let air = 0;
    let landed: ReturnType<typeof kartEventsIn> = [];
    for (let i = 0; i < 3 * SIM_HZ; i++) {
      if (s.airborne.fromJumpId === 'geyser-1') air++;
      const ev = rm.step([{ ...drive(s, track), drift: air >= 3 && air < 6 }]);
      landed = kartEventsIn(ev, 'landed');
      if (landed.length) break;
    }
    expect(landed).toEqual([{ type: 'landed', fromJumpId: 'geyser-1', trick: true }]);
  });

  it('a kart parked on the geyser that tricks at the top of its throw gets the trick boost on its first landing', () => {
    // BUG, same cause: a parked kart falling back into the still-erupting vent is re-thrown in mid-air,
    // which clears the trick it queued at the top; it lands with trick false.
    const { def, track, rm, s } = soloRace('canyon-rush');
    const g1 = ventDef(def, 'geyser-1');
    stepUntilVent(rm, g1, 'idle');
    park(track, s, g1);
    stepUntilVent(rm, g1, 'erupt');
    let pressed = false;
    let landed: ReturnType<typeof kartEventsIn> = [];
    for (let i = 0; i < 6 * SIM_HZ; i++) {
      const press = !pressed && !s.grounded && s.airborne.fromJumpId === 'geyser-1' && s.verticalVelocity <= 0;
      if (press) pressed = true;
      const ev = rm.step([{ ...NEUTRAL_INPUT, drift: press }]);
      landed = kartEventsIn(ev, 'landed');
      if (landed.length) break;
    }
    expect(pressed).toBe(true);
    expect(landed).toEqual([{ type: 'landed', fromJumpId: 'geyser-1', trick: true }]);
    expect(s.boost.source).toBe('trick');
  });

  it('an intangible kart (respawn freeze, item shield) is not thrown', () => {
    const { def, track, rm, s } = soloRace('canyon-rush');
    const g1 = ventDef(def, 'geyser-1');
    stepUntilVent(rm, g1, 'idle');
    park(track, s, g1);
    const log = stepUntilVent(rm, g1, 'erupt');
    s.status.intangibleRemaining = 10;
    for (let i = 0; i < Math.ceil(E * SIM_HZ); i++) {
      log.push(...rm.step([NEUTRAL_INPUT]));
      expect(s.grounded).toBe(true);
    }
    expect(launchesIn(log)).toEqual([]);
    expect(s.airborne.fromJumpId).toBeUndefined();
  });

  it('the throw is not a hit: no spin, no slow, no hazardHit, no coins lost, no hit cooldown', () => {
    const { def, track, rm, s, tr } = soloRace('canyon-rush');
    const g1 = ventDef(def, 'geyser-1');
    stepUntilVent(rm, g1, 'idle');
    park(track, s, g1);
    s.coins = 5;
    const log = stepUntilVent(rm, g1, 'erupt');
    for (let i = 0; i < E * SIM_HZ + 10; i++) {
      log.push(...rm.step([NEUTRAL_INPUT]));
      expect(tr.hazardCooldownRemaining).toBe(0);
    }
    expect(launchesIn(log).length).toBeGreaterThan(0);
    expect(log.filter((e) => e.type === 'hazardHit')).toEqual([]);
    expect(kartEventsIn(log, 'hit')).toEqual([]);
    expect(s.status.spinRemaining).toBe(0);
    expect(s.status.slowRemaining).toBe(0);
    expect(s.coins).toBe(5);
  });
});

describe("'vent' race events", () => {
  it('fire once per state change (warn, erupt), with the asset and position, and never during the countdown', () => {
    for (const trackId of ['canyon-rush', 'frostbite-pass']) {
      const def = TRACKS[trackId];
      const track = buildTrack(def);
      const rm = new RaceManager(track, { mode: 'quick', trackId, speedClass: 150, seed: 1, laps: 2, racers: [{ racerId: 'p', archetype: 'medium', isPlayer: true }] });
      const vents = ventDefs(def);
      const views = new Map(track.hazards.vents(0).map((v) => [v.id, v]));
      const log: { tick: number; phase: string; e: Extract<RaceEvent, { type: 'vent' }> }[] = [];
      const countdownStates = new Map<string, Set<VentState>>();
      const end = rm.state.goTick + 14 * SIM_HZ;
      while (rm.state.tick < end) {
        const tick = rm.state.tick, phase = rm.state.phase;
        if (phase === 'countdown') for (const v of vents) {
          const set = countdownStates.get(v.id!) ?? new Set<VentState>();
          set.add(ventPhase(v, nextTime(rm)).state);
          countdownStates.set(v.id!, set);
        }
        for (const e of rm.step([NEUTRAL_INPUT])) if (e.type === 'vent') log.push({ tick, phase, e });
      }
      // the vents did change state during the countdown, and still nothing fired
      expect(Math.max(...[...countdownStates.values()].map((s) => s.size)), `${trackId}: vents cycle in the countdown`).toBeGreaterThan(1);
      expect(log.filter((x) => x.phase === 'countdown')).toEqual([]);
      expect(log.every((x) => x.tick > rm.state.goTick)).toBe(true);

      const timeAt = (tick: number) => (tick - rm.state.goTick) * SIM_DT;
      for (const v of vents) {
        const mine = log.filter((x) => x.e.id === v.id);
        // alternate warn, erupt, warn, ... : never the same phase twice in a row
        for (let k = 1; k < mine.length; k++) expect(mine[k].e.phase, `${v.id} event ${k}`).not.toBe(mine[k - 1].e.phase);
        for (let k = 0; k < mine.length; k++) {
          const x = mine[k];
          expect(x.e).toEqual({ type: 'vent', id: v.id, asset: v.asset, phase: ventPhase(v, timeAt(x.tick)).state, position: views.get(v.id!)!.position });
          // on the tick the state changed (the first after the countdown may be mid-state)
          if (k > 0) expect(ventPhase(v, timeAt(x.tick - 1)).state).not.toBe(x.e.phase);
        }
        // exactly one event per change into warn or erupt after the countdown
        let expected = 0;
        let prev: VentState | undefined;
        for (let tick = rm.state.goTick + 1; tick < end; tick++) {
          const st = ventPhase(v, timeAt(tick)).state;
          if (st !== prev && st !== 'idle') expected++;
          prev = st;
        }
        expect(mine.length, `${trackId} ${v.id}: vent events in 14 s`).toBe(expected);
        const period = Math.max(v.period ?? 5, W + E + 0.1);
        expect(mine.filter((x) => x.e.phase === 'erupt').length).toBeGreaterThanOrEqual(Math.floor(14 / period));
      }
    }
  });
});

describe('the AI and vents', () => {
  it('the avoid logic does not steer around an erupting vent (a static hazard in the same place is dodged)', () => {
    const def = TRACKS['canyon-rush'];
    const track = buildTrack(def);
    const g1 = ventDef(def, 'geyser-1');
    let time = 0;
    while (ventPhase(g1, time).state !== 'erupt') time += SIM_DT;
    const vent = track.activeHazards(time).find((h) => h.id === 'geyser-1')!;
    expect(vent).toBeDefined();
    const pickupOf: number[] = [], coinOf: number[] = [];
    let p = 0, c = 0;
    for (const f of track.features) { pickupOf.push(f.kind === 'pickup' ? p++ : -1); coinOf.push(f.kind === 'coin' ? c++ : -1); }
    const ctx = (hazards: ActiveHazard[], karts: KartState[]): AvoidContext => ({
      track, karts, hazards,
      pickupStates: Array.from({ length: p }, () => ({ respawnRemaining: 0 })),
      coinStates: Array.from({ length: c }, () => ({ respawnRemaining: 0 })),
      pickupOf, coinOf, sc: makeScratch(),
    });
    const lane = g1.lateral ?? 0;
    for (const metres of [6, 12, 20]) {
      const s = kartAt(track, g1.t - metres / track.length, lane, 20);
      const line = lineFor(track, s, memory());
      const none = applyAvoid(s, ctx([], [s]), line, 1, 0, lane);
      const withVent = applyAvoid(s, ctx([vent], [s]), line, 1, 0, lane);
      expect(withVent, `${metres} m before the geyser`).toBeCloseTo(none, 9);
      // the control: the same spot as a spinning hazard is dodged, so the vent was in reach
      const rock: ActiveHazard = { ...vent, type: 'static', hit: 'spin', launch: undefined };
      const dodged = applyAvoid(s, ctx([rock], [s]), line, 1, 0, lane);
      expect(Math.abs(dodged - none), `${metres} m: a static hazard there is dodged`).toBeGreaterThan(1);
    }
  });
});

describe('whole races with vents', () => {
  for (const trackId of ['canyon-rush', 'frostbite-pass']) {
    it(`${trackId}: a 2-lap 8-AI race still finishes with every kart, and vents launch somebody`, () => {
      const def = TRACKS[trackId];
      const ids = new Set(ventDefs(def).map((v) => v.id!));
      const track = buildTrack(def);
      const config: RaceConfig = {
        mode: 'quick', trackId, speedClass: 150, seed: 7, laps: 2,
        racers: CAST.map((r) => ({ racerId: r.id, archetype: r.archetype, isPlayer: false })),
      };
      const manager = new RaceManager(track, config);
      const items = new Items(track, manager);
      const ai = new AiDriver(track, config, manager.state, { itemRoles: items.roles });
      const inputs = manager.state.karts.map(() => ({ ...NEUTRAL_INPUT }));
      const parts: SimParts = { manager, items, ai, inputs, playerIndex: -1, playerSlot: { ...NEUTRAL_INPUT } };
      const launchedBy = new Set<string>();
      let passes = 0, ventEvents = 0;
      const wasLaunched = new Set<string>();
      for (let t = 0; t < 300 * SIM_HZ && manager.state.phase !== 'finished'; t++) {
        const { race } = simTick(parts, null);
        const now = new Set<string>();
        for (const l of launchesIn(race)) {
          if (!ids.has(l.jumpId)) continue;
          launchedBy.add(l.racerId);
          now.add(l.racerId);
          if (!wasLaunched.has(l.racerId)) passes++; // a new throw, not a repeat on the next tick
        }
        wasLaunched.clear();
        for (const r of now) wasLaunched.add(r);
        ventEvents += race.filter((e) => e.type === 'vent').length;
      }
      expect(manager.state.phase).toBe('finished');
      expect(manager.results().ranks.every((r) => !r.dnf)).toBe(true);
      expect(manager.results().ranks).toHaveLength(8);
      for (const k of manager.state.karts) expect(k.position.every(Number.isFinite)).toBe(true);
      expect(ventEvents).toBeGreaterThan(0);
      expect(launchedBy.size, `${trackId}: karts thrown by a vent in 2 laps`).toBeGreaterThan(0);
      expect(passes).toBeGreaterThanOrEqual(launchedBy.size);
    }, 10_000);
  }
});
