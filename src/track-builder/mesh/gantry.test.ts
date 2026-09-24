import { Color, Matrix4, Vector3, type InstancedMesh, type MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { HARBOUR_LOOP } from '../__tests__/fixtures.ts';
import { RACE } from '../../race-manager/constants.ts';
import { GO_TICK, STEP_TICKS } from '../../race-manager/countdown.ts';
import { SIM_DT } from '../../kart-controller/step.ts';
import { buildTrack } from '../track.ts';
import { COUNTDOWN_STEP_SECONDS, COUNTDOWN_STEPS } from '../constants.ts';
import { buildStartGantry, LAMP, setStartLamps, startLampsLit } from './gantry.ts';
import { paletteFor } from './palette.ts';

/** Race time at sim tick `tick`, as RaceManager keeps it. */
const timeAt = (tick: number) => (tick - GO_TICK) * SIM_DT;

describe('start lamps (detail review 2026-09-24)', () => {
  it('one lamp per countdown beat, from the race schema', () => {
    expect(COUNTDOWN_STEPS).toBe(RACE.countdownSteps);
    expect(COUNTDOWN_STEP_SECONDS).toBe(RACE.countdownStepSeconds);
  });

  it('light red one per beat with the HUD number, all green on the go for one beat, then dark', () => {
    // the HUD shows its first number on tick 1, the next on each beat's tick after
    expect(startLampsLit(timeAt(0))).toBe(0);
    for (let beat = 0; beat < COUNTDOWN_STEPS; beat++) {
      expect(startLampsLit(timeAt(beat * STEP_TICKS + 1)), `beat ${beat} starts`).toBe(beat + 1);
      expect(startLampsLit(timeAt((beat + 1) * STEP_TICKS)), `beat ${beat} ends`).toBe(beat + 1);
    }
    expect(startLampsLit(timeAt(GO_TICK + 1))).toBe(-1);
    expect(startLampsLit(COUNTDOWN_STEP_SECONDS)).toBe(-1);
    expect(startLampsLit(COUNTDOWN_STEP_SECONDS + SIM_DT)).toBe(0);
    expect(startLampsLit(95)).toBe(0); // the final lap passes a dark board
    expect(startLampsLit(-Infinity)).toBe(0);
  });

  it('are their own instancer under the gantry, lit from race time, reading red and green (not peach)', () => {
    const track = buildTrack(HARBOUR_LOOP);
    const gantry = buildStartGantry(track, paletteFor(HARBOUR_LOOP), null);
    const lamps = gantry.getObjectByName('start-lamps') as InstancedMesh;
    expect(lamps.isInstancedMesh).toBe(true);
    expect(lamps.count).toBe(COUNTDOWN_STEPS);
    expect((lamps.material as MeshBasicMaterial).isMeshBasicMaterial).toBe(true);
    const c = new Color();
    const colours = () => Array.from({ length: lamps.count }, (_, k) => lamps.getColorAt(k, c).toArray());
    setStartLamps(lamps, timeAt(STEP_TICKS + 1));
    expect(colours()).toEqual([LAMP.red, LAMP.red, LAMP.dark].map((x) => x.map((v) => Math.fround(v))));
    setStartLamps(lamps, 0.5);
    for (const col of colours()) expect(col[1]).toBeGreaterThan(col[0] * 5);
    setStartLamps(lamps, 30);
    for (const col of colours()) expect(col[0]).toBeLessThan(0.3);
    // a lit lamp is a red, not a peach: green and blue a few percent of red
    expect(LAMP.red[1] / LAMP.red[0]).toBeLessThan(0.05);
    expect(LAMP.red[2] / LAMP.red[0]).toBeLessThan(0.05);
    // the lamps face the grid (behind the line): their normal points back down the road
    const n = lamps.geometry.getAttribute('normal');
    const s = track.sample(track.startT, 0);
    expect(n.getX(0) * s.tangent[0] + n.getZ(0) * s.tangent[2]).toBeLessThan(-0.9);
    // and fill left to right as the grid sees them (screen right looking down the road = (−fz, 0, fx))
    const m = new Matrix4(), p = new Vector3();
    const rightOf = (k: number) => { lamps.getMatrixAt(k, m); p.setFromMatrixPosition(m); return -p.x * s.tangent[2] + p.z * s.tangent[0]; };
    for (let k = 1; k < lamps.count; k++) expect(rightOf(k)).toBeGreaterThan(rightOf(k - 1));
  });
});
