import { describe, expect, it } from 'vitest';
import { SIM_HZ } from '../kart-controller/step.ts';
import type { InputState } from '../kart-controller/types.ts';
import { buildTrack } from '../track-builder/track.ts';
import { decodeGhost, GHOST_STEP, GhostRecorder, ghostPose, ghostTicks } from './ghost.ts';
import { RaceManager } from './race.ts';
import { lookAheadDriver } from './__tests__/drivers.ts';
import { HARBOUR_LOOP } from './__tests__/fixtures.ts';

/** A solo Time Trial on Harbour Loop, recorded the way the game session does it. */
function recordRun() {
  const track = buildTrack(HARBOUR_LOOP);
  const rm = new RaceManager(track, { mode: 'timeTrial', trackId: track.id, speedClass: 150, seed: 0, racers: [{ racerId: 'pip', archetype: 'light', isPlayer: true }] });
  const rec = new GhostRecorder();
  const drive = lookAheadDriver(18);
  const poses: { x: number; y: number; z: number; heading: number }[] = [];
  const s = rm.state.karts[0];
  rec.record(0, s);
  poses.push({ x: s.position[0], y: s.position[1], z: s.position[2], heading: s.heading });
  const inputs: InputState[] = [];
  while (rm.state.phase !== 'finished' && rm.state.tick < SIM_HZ * 400) {
    inputs[0] = drive(s, track);
    rm.step(inputs);
    rec.record(rm.state.tick, s);
    poses.push({ x: s.position[0], y: s.position[1], z: s.position[2], heading: s.heading });
  }
  // the results screens keep the kart rolling: nothing more is recorded
  const n = rec.samples;
  for (let i = 0; i < 400; i++) { inputs[0] = drive(s, track); rm.step(inputs); rec.record(rm.state.tick, s); }
  expect(rec.samples).toBe(n);
  return { rm, rec, poses };
}

describe('Time Trial ghost', () => {
  it('records a whole run as a small path and replays it within a few centimeters of the real kart', () => {
    const { rm, rec, poses } = recordRun();
    expect(rm.state.phase).toBe('finished');
    const text = rec.encode();
    const g = decodeGhost(text)!;
    expect(g).not.toBeNull();
    expect(g.step).toBe(GHOST_STEP);
    // it lasts until the finish, a sample late at most
    const finish = rm.state.karts[0].finishTick! + 1;
    expect(ghostTicks(g)).toBeGreaterThanOrEqual(finish);
    expect(ghostTicks(g)).toBeLessThan(finish + GHOST_STEP);
    // small: well under 8 bytes a sample once base64'd
    expect(text.length / g.length).toBeLessThan(8);
    // on a sample tick it is exactly (to the centimeter) where the kart was; between samples, close
    let worst = 0;
    for (let t = 0; t < finish; t++) {
      const p = ghostPose(g, t), q = poses[t];
      const err = Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
      if (t % GHOST_STEP === 0) expect(err).toBeLessThan(0.02);
      worst = Math.max(worst, err);
      let dh = p.heading - q.heading;
      dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      expect(Math.abs(dh)).toBeLessThan(0.05);
    }
    expect(worst).toBeLessThan(0.25);
  });

  it('holds its finish pose after the end, and sits on the grid before the first sample', () => {
    const { rec, poses } = recordRun();
    const g = decodeGhost(rec.encode())!;
    const end = ghostPose(g, ghostTicks(g));
    const later = ghostPose(g, ghostTicks(g) + 5000);
    expect([later.x, later.y, later.z]).toEqual([end.x, end.y, end.z]);
    const start = ghostPose(g, -3);
    expect(Math.hypot(start.x - poses[0].x, start.z - poses[0].z)).toBeLessThan(0.02);
  });

  it('a heading that wraps past a full turn interpolates the short way', () => {
    const rec = new GhostRecorder(4);
    const kart = (h: number) => ({ position: [0, 0, 0], heading: h, status: { loopAngle: 0 } }) as never;
    rec.record(0, kart(Math.PI - 0.05));
    rec.record(4, kart(-Math.PI + 0.05)); // 0.1 rad on, across the seam
    const g = decodeGhost(rec.encode())!;
    const mid = ghostPose(g, 2).heading;
    expect(Math.abs(Math.atan2(Math.sin(mid - Math.PI), Math.cos(mid - Math.PI)))).toBeLessThan(0.01);
  });

  it('refuses anything malformed', () => {
    for (const bad of ['', 'nope', '!!!!', 'AA==', 'AgQ=', btoa(String.fromCharCode(1, 4, 0x80))]) expect(decodeGhost(bad), bad).toBeNull();
  });
});
