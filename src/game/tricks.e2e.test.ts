// Every ramp, trick bump and vent on every track takes a trick (design §6 Track thrills; Adam, 26 Sept
// 2026: "when you go over a jump ... and you hit the space bar to try to get a boost, it should allow
// you to do a bit of a boost"). Scripted input on the real tracks: a kart runs at the jump down its
// lane with the drift button (Space, Shift, pad A) pressed once, either in the air after the launch or
// a moment before the lip or crest, and must launch once, trick once and land into the trick boost.
// The Final Lap Shift's own jumps (the Ferris-wheel ramp) are run on the shifted track. Vents are
// timed to their eruption through the race manager.
import { describe, expect, it } from 'vitest';
import { makeConstants } from '../kart-controller/constants.ts';
import { DEFAULT_KEYS } from '../kart-controller/input.ts';
import { SIM_DT, SIM_HZ, stepKart } from '../kart-controller/step.ts';
import { createKartState, headingOf, NEUTRAL_INPUT, type InputState, type KartEvent, type KartState, type TrackJump } from '../kart-controller/types.ts';
import { RaceManager } from '../race-manager/race.ts';
import type { RaceConfig, RaceEvent } from '../race-manager/types.ts';
import { ventPhase } from '../track-builder/hazards.ts';
import { buildTrack, type Track } from '../track-builder/track.ts';
import type { HazardDef, TrackDefinition } from '../track-builder/types.ts';
import * as dmath from '../sim-math/dmath.ts';

const FILES = import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' }) as Record<string, TrackDefinition>;
const c = makeConstants('medium', 150);

/** Runs at the jump from `back` metres before it, down the middle of its road, at full speed. */
function approach(track: Track, j: TrackJump, back: number): KartState {
  const t = (((j.t - back / track.length) % 1) + 1) % 1;
  const branch = j.branch ?? 0;
  const p = track.sample(t, 0, branch);
  const s = createKartState({ racerId: 'x', position: [...p.position], heading: headingOf(p.tangent), t });
  s.branch = branch;
  s.speed = c.topSpeed;
  return s;
}

/** Throttle held, steering for the middle of the road 12 m ahead (the scripted average player's pursuit). */
function drive(track: Track, s: KartState, drift: boolean): InputState {
  const ahead = track.sample(s.t + 12 / track.length, 0, s.branch).position;
  let err = dmath.atan2(ahead[0] - s.position[0], ahead[2] - s.position[2]) - s.heading;
  while (err > Math.PI) err -= 2 * Math.PI;
  while (err < -Math.PI) err += 2 * Math.PI;
  return { ...NEUTRAL_INPUT, throttle: 1, steer: Math.max(-1, Math.min(1, err * 3)), drift };
}

interface Run { launchTick: number; events: KartEvent[]; grounded: boolean[]; s: KartState }

/**
 * Drives over jump `j`, the button down for one tick at `pressAt`, or `airDelay` ticks after its launch.
 * `events` are those from j's launch tick on (a row of bumps: the ones before it are its run-up).
 */
function run(track: Track, j: TrackJump, back: number, pressAt: number, airDelay = -1): Run {
  const s = approach(track, j, back);
  let events: KartEvent[] = [];
  const grounded: boolean[] = [];
  let launchTick = -1;
  for (let i = 0; i < 6 * SIM_HZ; i++) {
    grounded.push(s.grounded);
    const press = i === pressAt || (airDelay >= 0 && launchTick >= 0 && i === launchTick + airDelay);
    const ev = stepKart(s, drive(track, s, press), track, c, SIM_DT);
    if (launchTick < 0 && ev.some((e) => e.type === 'launched' && e.jumpId === j.id)) { launchTick = i; events = []; }
    events.push(...ev);
    if (launchTick >= 0 && ev.some((e) => e.type === 'landed')) break;
  }
  return { launchTick, events, grounded, s };
}

function expectTrick(r: Run, j: TrackJump, label: string): void {
  expect(r.launchTick, `${label}: launched`).toBeGreaterThan(0);
  expect(r.events.filter((e) => e.type === 'launched'), `${label}: launched once`).toEqual([{ type: 'launched', jumpId: j.id }]);
  expect(r.events.filter((e) => e.type === 'trick'), `${label}: one trick`).toHaveLength(1);
  expect(r.events.find((e) => e.type === 'landed'), `${label}: landed with the trick`).toEqual({ type: 'landed', fromJumpId: j.id, trick: true });
  // the trick boost runs, or waits under a stronger one still running (a pad's 1.4 on the run-up: boost.ts)
  expect(r.s.boost.source === 'trick' || r.s.boostQueue.source === 'trick', `${label}: trick boost ${JSON.stringify([r.s.boost, r.s.boostQueue])}`).toBe(true);
}

/** The run-up: from 20 m out, or less where a loop-the-loop's ride would catch the kart first. */
function runUp(track: Track, j: TrackJump): number {
  for (const back of [20, 16, 12, 9]) {
    const r = run(track, j, back, -1);
    if (r.launchTick >= 0 && !r.events.some((e) => e.type === 'loop')) return back;
  }
  throw new Error(`no clean run-up to ${j.id}`);
}

describe('the hop/drift button is Space, Shift or pad A (input.ts)', () => {
  it('Space and both Shifts drive the drift button, so a press in the air is the trick', () => {
    expect(DEFAULT_KEYS.drift).toEqual(expect.arrayContaining(['Space', 'ShiftLeft', 'ShiftRight']));
  });
});

describe('every ramp and trick bump takes a trick: pressed in the air, or a moment before the lip', () => {
  for (const def of Object.values(FILES)) {
    it(`${def.id}`, () => {
      const tracks: { label: string; track: Track }[] = [{ label: 'race', track: buildTrack(def) }];
      if (def.finalLapShift?.addsJumps?.length) {
        const shifted = buildTrack(def);
        shifted.applyFinalLapShift();
        tracks.push({ label: 'final lap', track: shifted });
      }
      let jumps = 0;
      for (const { label, track } of tracks) {
        for (const j of track.jumps) {
          jumps++;
          const back = runUp(track, j);
          const clean = run(track, j, back, -1);
          expect(clean.launchTick, `${def.id} ${label} ${j.id}: launches`).toBeGreaterThan(0);
          expect(clean.events.filter((e) => e.type === 'trick'), `${def.id} ${label} ${j.id}: no press, no trick`).toHaveLength(0);
          // in the air: 0.05 s and 0.2 s after the launch
          for (const delay of [6, 24]) expectTrick(run(track, j, back, -1, delay), j, `${def.id} ${label} ${j.id}, pressed ${delay} ticks into the air`);
          // a moment early: 1 tick and 0.1 s before the lip or crest (a hop that the launch catches), from the
          // ground: in a row of bumps the kart is still in the last one's air 0.1 s before the next crest,
          // and a press there is that bump's trick
          for (const early of [1, 12]) {
            if (!clean.grounded[clean.launchTick - early]) continue;
            expectTrick(run(track, j, back, clean.launchTick - early), j, `${def.id} ${label} ${j.id}, pressed ${early} ticks before`);
          }
        }
      }
      expect(jumps, `${def.id} has jumps`).toBeGreaterThan(0);
    });
  }
});

describe('every vent takes a trick: pressed in the air after the throw', () => {
  const vents = Object.values(FILES).flatMap((def) => (def.hazards ?? []).filter((h) => h.type === 'vent').map((v) => ({ def, v })));

  it('the vents are there (Mesa Rush geysers, Frostbite Pass steam)', () => {
    expect(vents.map(({ v }) => v.id).sort()).toEqual(['geyser-1', 'geyser-2', 'steam-1', 'steam-2']);
  });

  for (const { def, v } of vents) {
    it(`${def.id} ${v.id}`, () => {
      const track = buildTrack(def);
      const config: RaceConfig = { mode: 'quick', trackId: def.id, speedClass: 150, seed: 1, laps: 2, racers: [{ racerId: 'p', archetype: 'medium', isPlayer: true }] };
      const rm = new RaceManager(track, config);
      while (rm.state.phase === 'countdown') rm.step([NEUTRAL_INPUT]);
      const s = rm.state.karts[0];
      const at = (h: HazardDef) => ventPhase(h, (rm.state.tick - rm.state.goTick) * SIM_DT).state;
      // park on the vent's mouth before it erupts, then hold still until it throws the kart
      for (let i = 0; i < 10 * SIM_HZ && at(v) !== 'warn'; i++) rm.step([NEUTRAL_INPUT]);
      const p = track.sample(v.t, v.lateral ?? 0, 0);
      s.position = [...p.position];
      s.heading = headingOf(p.tangent);
      s.t = v.t; s.branch = 0; s.speed = 0; s.lateralVelocity = 0; s.verticalVelocity = 0; s.grounded = true;
      let thrown = -1, landed: Extract<KartEvent, { type: 'landed' }> | undefined, trickBoost = false, tricks = 0;
      for (let i = 0; i < 8 * SIM_HZ && !landed; i++) {
        const press = thrown >= 0 && i === thrown + 12;
        const ev: RaceEvent[] = rm.step([{ ...NEUTRAL_INPUT, drift: press }]);
        for (const e of ev) {
          if (e.type !== 'kart') continue;
          if (e.event.type === 'launched' && e.event.jumpId === v.id && thrown < 0) thrown = i;
          if (e.event.type === 'trick') tricks++;
          if (e.event.type === 'boostStart' && e.event.source === 'trick') trickBoost = true;
          if (e.event.type === 'landed' && thrown >= 0) landed = e.event;
        }
      }
      expect(thrown, `${v.id} throws the kart`).toBeGreaterThanOrEqual(0);
      expect(tricks, `${v.id}: one trick`).toBe(1);
      expect(landed, `${v.id}: lands with the trick`).toEqual({ type: 'landed', fromJumpId: v.id, trick: true });
      expect(trickBoost, `${v.id}: trick boost`).toBe(true);
    });
  }
});
