// Every trick on every track shows a stunt and lands it upright (second MKW gap review, 28 Sept 2026, item 4:
// "a trick barely shows"). The same scripted runs as tricks.e2e.test.ts (every ramp and trick bump, the button
// pressed a moment before the lip or crest, or 0.05 s and 0.2 s into the air; the Final Lap Shift's own jumps on
// the shifted track), with the kart animation stepped alongside on the real course (kart-controller anim.ts,
// stunt.ts): with a flight left long enough, one whole turn; with little left, a flick; and whatever the flight,
// the kart upright, its stunt done, on the tick its wheels touch. Render only: the sim runs exactly as it does
// without the animation (viewSim.test.ts).
import { describe, expect, it } from 'vitest';
import { KartAnim, newPose } from '../kart-controller/anim.ts';
import { makeConstants } from '../kart-controller/constants.ts';
import { SIM_DT, SIM_HZ, stepKart } from '../kart-controller/step.ts';
import { STUNT } from '../kart-controller/stunt.ts';
import { createKartState, headingOf, NEUTRAL_INPUT, type InputState, type KartState, type TrackJump } from '../kart-controller/types.ts';
import { buildTrack, type Track } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import * as dmath from '../sim-math/dmath.ts';

const FILES = import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' }) as Record<string, TrackDefinition>;
const c = makeConstants('medium', 150);
const TAU = 2 * Math.PI;
const offTurn = (a: number) => Math.abs(a - Math.round(a / TAU) * TAU);

function approach(track: Track, j: TrackJump, back: number, racerId: string): KartState {
  const t = (((j.t - back / track.length) % 1) + 1) % 1;
  const branch = j.branch ?? 0;
  const p = track.sample(t, 0, branch);
  const s = createKartState({ racerId, position: [...p.position], heading: headingOf(p.tangent), t });
  s.branch = branch;
  s.speed = c.topSpeed;
  return s;
}

function drive(track: Track, s: KartState, drift: boolean): InputState {
  const ahead = track.sample(s.t + 12 / track.length, 0, s.branch).position;
  let err = dmath.atan2(ahead[0] - s.position[0], ahead[2] - s.position[2]) - s.heading;
  while (err > Math.PI) err -= 2 * Math.PI;
  while (err < -Math.PI) err += 2 * Math.PI;
  return { ...NEUTRAL_INPUT, throttle: 1, steer: Math.max(-1, Math.min(1, err * 3)), drift };
}

interface Flight {
  launched: boolean;
  /** seconds from the trick to the touchdown */
  air: number;
  /** the most the stunt turned (rad, all axes) */
  most: number;
  /** the stunt's kind at its start (null: none) */
  kind: string | null;
  /** how far off upright the kart is on its landing tick (rad, all axes), and whether its stunt is over */
  offAtLanding: number;
  doneAtLanding: boolean;
}

/** Over jump `j` from `back` m out, the button pressed at tick `pressAt` or `airDelay` ticks after the launch, the animation stepped alongside. */
function fly(track: Track, j: TrackJump, back: number, pressAt: number, airDelay: number, racerId: string): Flight {
  const s = approach(track, j, back, racerId), a = new KartAnim(c), pose = newPose();
  let launch = -1, trickAt = -1, most = 0, kind: string | null = null;
  for (let i = 0; i < 6 * SIM_HZ; i++) {
    const press = i === pressAt || (airDelay >= 0 && launch >= 0 && i === launch + airDelay);
    const input = drive(track, s, press);
    const ev = stepKart(s, input, track, c, SIM_DT);
    a.tick(s, input, SIM_DT, undefined, track);
    a.pose(1, false, pose);
    if (launch < 0 && ev.some((e) => e.type === 'launched' && e.jumpId === j.id)) launch = i;
    if (trickAt < 0 && ev.some((e) => e.type === 'trick')) { trickAt = i; kind = a.stuntKind; }
    most = Math.max(most, Math.abs(pose.stuntRoll) + Math.abs(pose.stuntPitch) + Math.abs(pose.stuntYaw));
    if (launch >= 0 && ev.some((e) => e.type === 'landed')) {
      return {
        launched: true, air: (i - trickAt) * SIM_DT, most, kind,
        offAtLanding: offTurn(pose.stuntRoll) + offTurn(pose.stuntPitch) + offTurn(pose.stuntYaw), doneAtLanding: a.stuntKind === null,
      };
    }
  }
  return { launched: launch >= 0, air: 0, most, kind, offAtLanding: 0, doneAtLanding: true };
}

/** The run-up: from 20 m out, or less where a loop-the-loop's ride would catch the kart first; and the tick it launches. */
function runUp(track: Track, j: TrackJump): { back: number; launch: number } {
  for (const back of [20, 16, 12, 9]) {
    const s = approach(track, j, back, 'x');
    for (let i = 0; i < 6 * SIM_HZ; i++) {
      const ev = stepKart(s, drive(track, s, false), track, c, SIM_DT);
      if (ev.some((e) => e.type === 'loop')) break;
      if (ev.some((e) => e.type === 'launched' && e.jumpId === j.id)) return { back, launch: i };
    }
  }
  throw new Error(`no clean run-up to ${j.id}`);
}

describe('every trick on every track: a stunt that shows, upright as the wheels touch', () => {
  const racers = ['pip', 'momo', 'nova', 'juniper', 'otto', 'sprocket', 'boulder', 'gus'];
  for (const def of Object.values(FILES)) {
    it(`${def.id}`, () => {
      const tracks: Track[] = [buildTrack(def)];
      if (def.finalLapShift?.addsJumps?.length) { const shifted = buildTrack(def); shifted.applyFinalLapShift(); tracks.push(shifted); }
      let n = 0, whole = 0;
      for (const track of tracks) {
        for (const j of track.jumps) {
          const { back, launch } = runUp(track, j);
          // 0.1 s before the lip or crest (the trick buffer), then 1, 6 and 24 ticks into the air
          for (const delay of [-12, 1, 6, 24]) {
            const racer = racers[n++ % racers.length];
            const f = delay < 0 ? fly(track, j, back, launch + delay, -1, racer) : fly(track, j, back, -1, delay, racer);
            const label = `${def.id} ${j.id}, pressed ${delay} ticks into the air (${racer}, ${f.kind}, ${f.air.toFixed(2)} s of air)`;
            if (delay < 0 && f.kind === null) continue; // (a press there that the sim does not take: tricks.e2e.test.ts has the rules)
            expect(f.launched, label).toBe(true);
            expect(f.kind, label).not.toBeNull();
            // upright on the landing tick, its stunt over: never lands on its side or its roof
            expect(f.offAtLanding, label).toBeLessThan(0.02);
            expect(f.doneAtLanding, label).toBe(true);
            // it shows: a whole turn where the flight allows one (the forecast finds the room), else a flick well over the old 14°
            if (f.air >= STUNT.minSeconds + STUNT.margin + 0.03) expect(f.kind, label).not.toBe('flick');
            if (f.kind !== 'flick') { expect(f.most, label).toBeGreaterThan(0.95 * TAU); whole++; }
            else expect(f.most, label).toBeGreaterThan(0.5);
          }
        }
      }
      expect(whole, `${def.id}: whole turns`).toBeGreaterThan(0);
    });
  }
});
