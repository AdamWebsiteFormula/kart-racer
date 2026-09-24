// The Time Trial ghost through a real game session (audit 24 Sept 2026, design §9 "ghost + medals"):
// a run is recorded to its finish, saved as a path, and raced against as a see-through kart that is
// only a picture: the race with a ghost is tick for tick the race without one.
import { describe, expect, it } from 'vitest';
import { Scene, type Material, type Mesh, type Object3D } from 'three';
import { soloConfig } from '../backend-leaderboard/rules.ts';
import { SIM_HZ } from '../kart-controller/step.ts';
import { decodeGhost, ghostPose, ghostTicks } from '../race-manager/ghost.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import harbour from '../track-builder/tracks/harbour-loop.json';
import { GHOST_OPACITY } from './ghostView.ts';
import { RaceSession } from './session.ts';

const def = harbour as unknown as TrackDefinition;
const EVERY = 97;

/** A Time Trial with the AI at the player's wheel, to the finish; the kart's position every EVERY ticks. */
function drive(s: RaceSession, onSample?: (t: number) => void): number[][] {
  s.ai.drivePlayer = true;
  const trail: number[][] = [];
  for (let t = 0; t < 300 * SIM_HZ && s.state.phase !== 'finished'; t++) {
    s.tick(null);
    if (t % EVERY === 0) { trail.push([...s.player!.position]); onSample?.(t); }
  }
  return trail;
}

describe('Time Trial ghost in a session', () => {
  it('records the run, and a ghost of it follows the same line without touching the race', () => {
    const config = soloConfig('timeTrial', def.id, 'otto', 0);
    const first = new RaceSession(new Scene(), def, config);
    const trail = drive(first);
    expect(first.state.phase).toBe('finished');
    const path = decodeGhost(first.ghostPath())!;
    expect(path).not.toBeNull();
    const finish = first.player!.finishTick!;
    expect(ghostTicks(path)).toBeGreaterThanOrEqual(finish);
    // a Quick Race records nothing
    const quick = new RaceSession(new Scene(), def, { ...config, mode: 'quick' });
    expect(quick.ghostPath()).toBe('');
    quick.dispose();

    const second = new RaceSession(new Scene(), def, config);
    second.setGhost(path, 'otto');
    // never a kart in the race
    expect(second.state.karts.length).toBe(1);
    const ghost = (second as unknown as { group: Object3D }).group.getObjectByName('ghost')!;
    expect(ghost).toBeDefined();
    ghost.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      for (const x of ([] as Material[]).concat(m.material)) { expect(x.transparent).toBe(true); expect(x.opacity).toBe(GHOST_OPACITY); }
      expect(m.castShadow).toBe(false);
    });
    // the race with the ghost is the race without it, and the ghost is drawn where the first run was
    const again = drive(second, () => {
      second.frame(1, 1 / 60);
      const want = ghostPose(path, second.state.tick);
      const p = second.player!.position;
      expect(Math.hypot(ghost.position.x - want.x, ghost.position.z - want.z)).toBeLessThan(1e-3);
      expect(Math.hypot(ghost.position.x - p[0], ghost.position.z - p[2])).toBeLessThan(0.5);
    });
    expect(again).toEqual(trail);
    expect(second.player!.finishTick).toBe(finish);
    first.dispose();
    second.dispose();
  }, 120_000);
});
