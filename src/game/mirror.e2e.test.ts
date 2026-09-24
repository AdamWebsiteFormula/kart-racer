// Mirror mode, the whole-race gate (design §10; track-builder/mirror.ts): on every track reflected left
// to right, 8 Normal AI race the full distance and all finish, nobody respawns, the claw is called no
// more than on the track as authored (plus one for the luck of a different field), and the race is as
// deterministic as any other (the same seed twice gives the same finish ticks).
import { describe, expect, it } from 'vitest';
import { RACE } from '../race-manager/constants.ts';
import { buildTrack } from '../track-builder/track.ts';
import { mirrorTrack } from '../track-builder/mirror.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { config, count, finishes, racers, runRace } from '../ai-driver/__tests__/harness.ts';

const TRACKS = Object.values(import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' })) as TrackDefinition[];

function race(def: TrackDefinition) {
  const track = buildTrack(def);
  let idle = 0;
  const run = runRace(track, config(track, racers(8), 100), {}, {}, (_tick, inputs, rm) => {
    const st = rm.state;
    if (st.phase !== 'racing' && st.phase !== 'finalLap') return;
    st.karts.forEach((k, i) => {
      if (k.finishTick !== undefined || k.status.spinRemaining > 0 || k.status.intangibleRemaining > 0 || k.status.held) return;
      if (k.speed <= RACE.stuckSpeed && inputs[i].throttle <= 0 && inputs[i].brake <= 0) idle++;
    });
  });
  const rescues = run.log.filter((x) => x.e.type === 'rescue' && x.e.phase === 'start').length;
  return { ...run, idle, rescues };
}

describe('Mirror mode: 8 AI race every mirrored track', () => {
  for (const def of TRACKS) {
    it(`${def.id} mirrored: all 8 finish, no respawns, no stuck karts, no more claw rescues than as authored`, () => {
      const m = race(mirrorTrack(def));
      expect(m.rm.state.phase).toBe('finished');
      const f = finishes(m.log);
      expect(f.length).toBe(8);
      expect(f.every((x) => !x.dnf)).toBe(true);
      expect(count(m.log, 'respawn')).toBe(0);
      expect(m.idle, 'idle ticks').toBe(0);
      const o = race(def);
      expect(m.rescues, `rescues mirrored ${m.rescues} vs authored ${o.rescues}`).toBeLessThanOrEqual(o.rescues + 1);
      // deterministic: the same mirrored race again finishes on the same ticks
      const again = race(mirrorTrack(def));
      expect(finishes(again.log).map((x) => x.tick)).toEqual(f.map((x) => x.tick));
    });
  }
});
