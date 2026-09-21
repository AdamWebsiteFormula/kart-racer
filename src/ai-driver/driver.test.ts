// The SOP gates (docs/sops/ai-driver.md Tests). Headless, deterministic, one race per gate.
import { describe, expect, it, vi } from 'vitest';
import { makeConstants } from '../kart-controller/constants.ts';
import { targetSpeed } from '../kart-controller/speed.ts';
import { SIM_HZ } from '../kart-controller/step.ts';
import { NEUTRAL_INPUT, type InputState, type KartState } from '../kart-controller/types.ts';
import { lookAheadDriver, parkDriver } from '../race-manager/__tests__/drivers.ts';
import { RACE } from '../race-manager/constants.ts';
import { RaceManager } from '../race-manager/race.ts';
import type { RaceEvent } from '../race-manager/types.ts';
import { wrap01 } from '../track-builder/lut.ts';
import { buildTrack } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { AI, PROFILES } from './constants.ts';
import { AiDriver } from './driver.ts';
import { AI_OVAL, BARREL_STRAIGHT, HAIRPIN, HARBOUR_LOOP, OVAL } from './__tests__/fixtures.ts';
import { config, count, finishes, racers, runRace, type RunResult } from './__tests__/harness.ts';

/** Every authored track. New tracks join the field gate automatically. */
const TRACKS = Object.values(import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' })) as TrackDefinition[];

const kartEvents = (log: RunResult['log'], type: string) =>
  log.filter((x) => x.e.type === 'kart' && x.e.event.type === type).map((x) => ({ tick: x.tick, ...(x.e as Extract<RaceEvent, { type: 'kart' }>) }));

function spreadSeconds(log: RunResult['log']): number {
  const f = finishes(log);
  return (f[f.length - 1].tick - f[0].tick) / SIM_HZ;
}

function soloTime(def: TrackDefinition, cc: 50 | 100 | 150, opts = {}, manual = {}): number {
  const track = buildTrack(def);
  const { log } = runRace(track, config(track, racers(1, Object.keys(manual).length ? 0 : -1), cc), opts, manual);
  return finishes(log)[0].tick / SIM_HZ;
}

describe('AiDriver gates', () => {
  it('1 + 6 + 15: 8 Normal AI finish every track with zero respawns, 8–20 s apart, never idle, inside budget', () => {
    expect(TRACKS.length).toBeGreaterThanOrEqual(1);
    for (const def of TRACKS) {
      const track = buildTrack(def);
      let idle = 0, fillMs = 0, fills = 0;
      const { rm, log } = runRace(track, config(track, racers(8), 100), {}, {}, (tick, inputs, rm) => {
        const st = rm.state;
        if (st.phase !== 'racing' && st.phase !== 'finalLap') return;
        st.karts.forEach((k, i) => {
          if (k.isPlayer || k.finishTick !== undefined || k.status.spinRemaining > 0 || k.status.intangibleRemaining > 0) return;
          if (k.speed <= RACE.stuckSpeed && inputs[i].throttle <= 0 && inputs[i].brake <= 0) idle++;
        });
        void tick;
      }, undefined);
      void fillMs; void fills;
      expect(rm.state.phase, def.id).toBe('finished');
      const f = finishes(log);
      expect(f.length, def.id).toBe(8);
      expect(f.every((x) => !x.dnf), def.id).toBe(true);
      expect(count(log, 'respawn'), def.id).toBe(0);
      const spread = spreadSeconds(log);
      expect(spread, `${def.id} spread`).toBeGreaterThanOrEqual(8);
      expect(spread, `${def.id} spread`).toBeLessThanOrEqual(20);
      expect(idle, `${def.id} idle ticks`).toBe(0);
    }
  });

  it('1b: the same field finishes with zero respawns at 50cc and 150cc', () => {
    for (const cc of [50, 150] as const) {
      const track = buildTrack(HARBOUR_LOOP);
      const { rm, log } = runRace(track, config(track, racers(8), cc));
      expect(rm.state.phase, `${cc}cc`).toBe('finished');
      expect(count(log, 'respawn'), `${cc}cc`).toBe(0);
      expect(finishes(log).every((x) => !x.dnf), `${cc}cc`).toBe(true);
    }
  });

  it('2: a solo Hard AI beats the scripted average player by 3–8 s', () => {
    const average = soloTime(HARBOUR_LOOP, 150, {}, { 0: lookAheadDriver(Infinity, 0) });
    const hard = soloTime(HARBOUR_LOOP, 150);
    const margin = average - hard;
    expect(margin, `average ${average.toFixed(1)} s, hard ${hard.toFixed(1)} s`).toBeGreaterThanOrEqual(3);
    expect(margin, `average ${average.toFixed(1)} s, hard ${hard.toFixed(1)} s`).toBeLessThanOrEqual(8);
  });

  it('3: deterministic — same seed twice is identical, a different seed differs, no Math.random or Date', () => {
    const rnd = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Math.random in the AI'); });
    const now = vi.spyOn(Date, 'now').mockImplementation(() => { throw new Error('Date.now in the AI'); });
    try {
      const hash = (log: RunResult['log']) => JSON.stringify(log.map((x) => [x.tick, x.e]));
      const inputsA: string[] = [], inputsB: string[] = [];
      const t1 = buildTrack(HARBOUR_LOOP);
      const a = runRace(t1, config(t1, racers(8), 100, 7), {}, {}, (_t, inputs) => { inputsA.push(JSON.stringify(inputs)); });
      const t2 = buildTrack(HARBOUR_LOOP);
      const b = runRace(t2, config(t2, racers(8), 100, 7), {}, {}, (_t, inputs) => { inputsB.push(JSON.stringify(inputs)); });
      expect(JSON.stringify(a.rm.state)).toBe(JSON.stringify(b.rm.state));
      expect(hash(a.log)).toBe(hash(b.log));
      expect(inputsA.join('\n')).toBe(inputsB.join('\n'));
      const t3 = buildTrack(HARBOUR_LOOP);
      const c = runRace(t3, config(t3, racers(8), 100, 8));
      expect(c.ai.memory.map((m) => m.startPress)).not.toEqual(a.ai.memory.map((m) => m.startPress));
      expect(JSON.stringify(c.rm.state)).not.toBe(JSON.stringify(a.rm.state));
    } finally {
      rnd.mockRestore();
      now.mockRestore();
    }
  });

  it('3b: snapshot / restore mid-race continues identically', () => {
    const cfgOf = (t: ReturnType<typeof buildTrack>) => config(t, racers(4), 150, 3);
    const t1 = buildTrack(OVAL), t2 = buildTrack(OVAL);
    const rm1 = new RaceManager(t1, cfgOf(t1)), rm2 = new RaceManager(t2, cfgOf(t2));
    const ai1 = new AiDriver(t1, cfgOf(t1), rm1.state);
    const in1: InputState[] = rm1.state.karts.map(() => ({ ...NEUTRAL_INPUT }));
    const in2: InputState[] = rm2.state.karts.map(() => ({ ...NEUTRAL_INPUT }));
    const split = SIM_HZ * 20;
    for (let t = 0; t < split; t++) {
      ai1.fill(rm1.state, rm1.lastActiveHazards, in1);
      for (let i = 0; i < in1.length; i++) in2[i] = { ...in1[i] };
      rm1.step(in1); rm2.step(in2);
    }
    expect(JSON.stringify(rm1.state)).toBe(JSON.stringify(rm2.state));
    const ai2 = new AiDriver(t2, cfgOf(t2), rm2.state);
    ai2.restore(ai1.snapshot());
    for (let t = 0; t < SIM_HZ * 30; t++) {
      ai1.fill(rm1.state, rm1.lastActiveHazards, in1);
      ai2.fill(rm2.state, rm2.lastActiveHazards, in2);
      expect(JSON.stringify(in2)).toBe(JSON.stringify(in1));
      rm1.step(in1); rm2.step(in2);
    }
    expect(JSON.stringify(rm1.state)).toBe(JSON.stringify(rm2.state));
    expect(JSON.stringify(ai1.memory)).toBe(JSON.stringify(ai2.memory));
  });

  it('4: solo lap times order easy > normal > hard at the same speed class', () => {
    const easy = soloTime(HARBOUR_LOOP, 150, { profile: PROFILES.easy });
    const normal = soloTime(HARBOUR_LOOP, 150, { profile: PROFILES.normal });
    const hard = soloTime(HARBOUR_LOOP, 150, { profile: PROFILES.hard });
    expect(easy, `easy ${easy} normal ${normal} hard ${hard}`).toBeGreaterThan(normal);
    expect(normal, `easy ${easy} normal ${normal} hard ${hard}`).toBeGreaterThan(hard);
  });

  it('5: rubber band: leaders ahead of a slow player drop below 1, and the AI never asks for throttle above its legal speed', () => {
    const track = buildTrack(HARBOUR_LOOP);
    const c = makeConstants('medium', 100);
    let sawBelow = false, sawAbove = false, illegal = 0, powerCut = false;
    runRace(track, config(track, racers(8, 7), 100), {}, { 7: lookAheadDriver(12, 0) }, (_t, inputs, rm, ai) => {
      rm.state.karts.forEach((k, i) => {
        if (k.isPlayer || k.finishTick !== undefined) return;
        const m = ai.memory[i];
        if (m.rb < 0.99) sawBelow = true;
        if (m.rb > 1.01) sawAbove = true;
        if (m.powerCap < PROFILES.normal.power - 1e-9) powerCut = true;
        // the controller's physics may add speed in a bump; the AI itself never pushes past legal
        if (inputs[i].throttle > 0 && k.speed > RACE.stuckSpeed && k.speed >= targetSpeed(k, c).target - 1e-6) illegal++;
      });
    }, SIM_HZ * 200);
    expect(sawBelow).toBe(true);
    expect(powerCut).toBe(true); // far ahead, power drops below profile.power
    expect(sawAbove).toBe(false); // nobody is behind a 12 m/s player for long
    expect(illegal).toBe(0);
  });

  it('7: a kart parked on the road is driven round, never hit, and nobody respawns', () => {
    const track = buildTrack(HARBOUR_LOOP);
    const { rm, log } = runRace(track, config(track, racers(8, 7), 100), {}, { 7: parkDriver }, undefined, SIM_HZ * 200);
    const parkedId = rm.state.karts[7].racerId;
    const bumps = kartEvents(log, 'bump').filter((x) => x.racerId === parkedId || (x.event as { otherId?: string }).otherId === parkedId);
    expect(count(log, 'respawn')).toBe(0);
    expect(bumps.length).toBe(0);
    expect(finishes(log).filter((f) => !f.dnf).length).toBe(7);
  });

  it('8: a kart pinned against nothing reverses out at 1.5 s and the race-manager never has to respawn it', () => {
    const track = buildTrack(OVAL);
    const pinFrom = SIM_HZ * 8, pinTo = pinFrom + SIM_HZ * 2;
    let pinned: KartState['position'] | undefined;
    let firstBrake = -1;
    const { log } = runRace(track, config(track, racers(2), 100), {}, {}, (tick, inputs, rm) => {
      const k = rm.state.karts[0];
      if (tick >= pinFrom && tick < pinTo) {
        pinned ??= [...k.position];
        k.position = [...pinned]; k.speed = 0; k.lateralVelocity = 0;
        if (firstBrake < 0 && inputs[0].brake > 0) firstBrake = tick;
      }
    });
    expect(firstBrake).toBeGreaterThan(0);
    expect(Math.abs(firstBrake - (pinFrom + Math.round(AI.recover.stuckSeconds * SIM_HZ)))).toBeLessThanOrEqual(2);
    expect(count(log, 'respawn')).toBe(0);
  });

  it('9: drift tiers by difficulty on the hairpins; driftUse 0 never hops; no re-hop inside the abort cooldown', () => {
    // Harbour Loop's bends are gentler than the controller's minimum drift yaw, so no drift
    // there can reach tier 1 for anyone (Lessons 2026-09-21); the tiers are gated on hairpins.
    const tiers = (cc: 50 | 100 | 150) => {
      const track = buildTrack(HAIRPIN);
      const { rm, log } = runRace(track, config(track, racers(8), cc));
      const best = new Map<string, number>();
      for (const e of kartEvents(log, 'driftEnd')) best.set(e.racerId, Math.max(best.get(e.racerId) ?? 0, (e.event as { tier: number }).tier));
      return { best, log, rm };
    };
    const hard = tiers(150);
    expect(count(hard.log, 'respawn')).toBe(0);
    expect([...hard.best.values()].filter((t) => t >= 2).length, `hard tiers ${[...hard.best.values()]}`).toBeGreaterThanOrEqual(6);
    const normal = tiers(100);
    expect([...normal.best.values()].filter((t) => t >= 1).length, `normal tiers ${[...normal.best.values()]}`).toBeGreaterThanOrEqual(6);
    const easy = tiers(50);
    expect([...easy.best.values()].every((t) => t <= 1), `easy tiers ${[...easy.best.values()]}`).toBe(true);
    // abort cooldown: after a tier-0 end, the same kart does not hop again for abortCooldown
    for (const run of [hard, normal]) {
      const ends = kartEvents(run.log, 'driftEnd').filter((e) => (e.event as { tier: number }).tier === 0);
      const hops = kartEvents(run.log, 'hop');
      for (const end of ends) {
        const next = hops.find((h) => h.racerId === end.racerId && h.tick > end.tick);
        if (next) expect(next.tick - end.tick).toBeGreaterThanOrEqual(Math.round(AI.drift.abortCooldown * SIM_HZ) - 1);
      }
    }
    const track = buildTrack(HARBOUR_LOOP);
    const shy = Object.fromEntries(racers(8).map((r) => [r.racerId, { lateralBias: 0, aggression: 0.5, driftUse: 0 }]));
    const { log } = runRace(track, config(track, racers(8), 150), { personalities: shy });
    expect(kartEvents(log, 'hop').length).toBe(0);
  });

  it('10: a rolling barrel across the line is dodged: a solo Hard kart on ≥ 95 % of passes, a Normal pack on ≥ 65 %', () => {
    // the barrel respawns on its spot every 4 s, sometimes right in front of a kart; the
    // pack also dodges into each other. Solo Hard is the clean measure (Decisions 2026-09-21).
    let soloHits = 0;
    for (let seed = 1; seed <= 4; seed++) {
      const track = buildTrack(BARREL_STRAIGHT);
      const { log } = runRace(track, config(track, racers(1), 150, seed));
      soloHits += log.filter((x) => x.e.type === 'hazardHit' && x.e.hazardId === 'barrel').length;
    }
    expect(soloHits / 12).toBeLessThanOrEqual(0.05);
    const track = buildTrack(BARREL_STRAIGHT);
    const { log } = runRace(track, config(track, racers(8), 100));
    const packHits = log.filter((x) => x.e.type === 'hazardHit' && x.e.hazardId === 'barrel').length;
    expect(packHits / 24).toBeLessThanOrEqual(0.35);
  });

  it('11: shortcuts: never while closed, Hard takes an open one, Easy never; nothing enters a branch the shift closed', () => {
    // "on the shortcut" = on its branch before its last fifth. Where a branch rejoins the
    // road, the controller's nearest-line rule can put a kart on its final metres.
    const deep = (track: ReturnType<typeof buildTrack>, k: KartState) => {
      if (k.branch === 0) return false;
      const b = track.branches.list[k.branch];
      return wrap01(k.t - b.entryT) < b.span * 0.8;
    };
    const branchVisits = (cc: 50 | 150) => {
      const track = buildTrack(AI_OVAL);
      const onLap = new Map<number, Set<number>>();
      const { rm, log } = runRace(track, config(track, racers(8), cc), {}, {}, (_t, _in, rm) => {
        for (const k of rm.state.karts) if (deep(track, k)) (onLap.get(k.lap) ?? onLap.set(k.lap, new Set()).get(k.lap)!).add(k.branch);
      });
      expect(rm.state.phase).toBe('finished');
      expect(count(log, 'respawn')).toBe(0);
      return onLap;
    };
    const hard = branchVisits(150);
    expect(hard.get(1)).toBeUndefined();
    expect((hard.get(2)?.size ?? 0) + (hard.get(3)?.size ?? 0)).toBeGreaterThan(0);
    // Easy never chooses it. Solo, because a 50cc pack can shove a kart against the fork-side
    // wall, where the controller's nearest-line rule honestly puts it on the branch.
    for (const seed of [1, 2]) {
      const track = buildTrack(AI_OVAL);
      let onBranch = 0;
      runRace(track, config(track, racers(1), 50, seed), {}, {}, (_t, _in, rm) => { if (deep(track, rm.state.karts[0])) onBranch++; });
      expect(onBranch, `easy solo seed ${seed}`).toBe(0);
    }

    // Harbour Loop: the tide closes the beach (branch 1); nobody enters it after the shift
    const track = buildTrack(HARBOUR_LOOP);
    const beach = track.branches.byId('beach')!.index;
    let shiftTick = -1;
    const entriesAfter: string[] = [];
    const was: number[] = [];
    runRace(track, config(track, racers(8), 100), {}, {}, (tick, _in, rm) => {
      if (shiftTick < 0 && rm.state.finalLapShiftFired) shiftTick = tick;
      rm.state.karts.forEach((k, i) => {
        // the shift fires inside a step; an entry made on that same step is not "after"
        if (shiftTick >= 0 && tick > shiftTick && k.branch === beach && was[i] !== beach) {
          entriesAfter.push(`${k.racerId}@${tick}(shift ${shiftTick}) lap ${k.lap} t ${k.t.toFixed(3)} was ${was[i]} open ${track.branches.list[beach].open}`);
        }
        was[i] = k.branch;
      });
    });
    expect(shiftTick).toBeGreaterThan(0);
    expect(entriesAfter, entriesAfter.join('; ')).toEqual([]);
  });

  it('12: start boost: Hard presses inside the window almost always, Normal about two thirds, Easy a third at most', () => {
    const inWindow = (profile: typeof PROFILES.hard) => {
      let ok = 0, n = 0;
      const track = buildTrack(OVAL);
      for (let seed = 1; seed <= 100; seed++) {
        const cfg = config(track, racers(8), 150, seed);
        const rm = new RaceManager(track, cfg);
        const ai = new AiDriver(track, cfg, rm.state, { profile });
        for (const m of ai.memory) { n++; if (m.startPress > 0 && m.startPress <= 0.3) ok++; }
      }
      return ok / n;
    };
    expect(inWindow(PROFILES.hard)).toBeGreaterThanOrEqual(0.85);
    const normal = inWindow(PROFILES.normal);
    expect(normal).toBeGreaterThanOrEqual(0.5);
    expect(normal).toBeLessThanOrEqual(0.75);
    expect(inWindow(PROFILES.easy)).toBeLessThanOrEqual(0.35);
    // and the race-manager agrees: a Hard field earns start boosts
    const track = buildTrack(HARBOUR_LOOP);
    const { log } = runRace(track, config(track, racers(8), 150), {}, {}, undefined, SIM_HZ * 6);
    expect(kartEvents(log, 'boostStart').filter((e) => (e.event as { source: string }).source === 'start').length).toBeGreaterThanOrEqual(7);
  });

  it('14: personality lane: lateralBias ±1 sits on its side of the road on the straights', () => {
    const meanLat = (bias: number) => {
      const track = buildTrack(HAIRPIN);
      let sum = 0, n = 0;
      runRace(track, config(track, racers(1), 150), { personalities: { pip: { lateralBias: bias, aggression: 0.5, driftUse: 0 } } }, {}, (_t, _in, rm) => {
        const k = rm.state.karts[0];
        if (rm.state.phase !== 'racing' && rm.state.phase !== 'finalLap') return;
        const a = track.sample(k.t, 0), b = track.sample(k.t + 0.1, 0), z = track.sample(k.t - 0.05, 0);
        const turn = Math.abs(Math.atan2(b.tangent[0], b.tangent[2]) - Math.atan2(a.tangent[0], a.tangent[2]));
        const turnBehind = Math.abs(Math.atan2(a.tangent[0], a.tangent[2]) - Math.atan2(z.tangent[0], z.tangent[2]));
        if (turn > 0.05 || turnBehind > 0.05) return; // a true straight: nothing bending 40 m ahead or 20 m behind
        const tg = a.tangent, p = a.position;
        sum += (k.position[0] - p[0]) * tg[2] - (k.position[2] - p[2]) * tg[0];
        n++;
      });
      return sum / n;
    };
    const hw = 5, want = AI.line.laneHalfFraction * hw;
    const right = meanLat(1), left = meanLat(-1);
    expect(Math.abs(right - want), `right lane ${right.toFixed(2)} wanted ${want.toFixed(2)}`).toBeLessThan(0.6);
    expect(Math.abs(left + want), `left lane ${left.toFixed(2)} wanted ${(-want).toFixed(2)}`).toBeLessThan(0.6);
  });

  it('15: budget: 7 AI × a full race stays far under 0.05 ms per AI per tick', () => {
    const track = buildTrack(HARBOUR_LOOP);
    const cfg = config(track, racers(8, 7), 100);
    const rm = new RaceManager(track, cfg);
    const ai = new AiDriver(track, cfg, rm.state);
    const inputs: InputState[] = rm.state.karts.map(() => ({ ...NEUTRAL_INPUT }));
    const player = lookAheadDriver(20, 0);
    let ms = 0, ticks = 0;
    while (rm.state.phase !== 'finished' && ticks < SIM_HZ * 300) {
      inputs[7] = player(rm.state.karts[7], track);
      const t0 = performance.now();
      ai.fill(rm.state, rm.lastActiveHazards, inputs);
      ms += performance.now() - t0;
      rm.step(inputs);
      ticks++;
    }
    const perAi = (ms / ticks / 7) * 1000; // µs
    expect(perAi).toBeLessThan(50);
  });
});
