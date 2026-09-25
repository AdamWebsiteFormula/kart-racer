// The kart animation (kart-controller anim.ts, KartView) is a picture only. A race with every kart
// view animating (springs, morph targets, uneven frame fractions, reduced motion on and off)
// steps exactly as the bare sim does with no views at all, which is the leaderboard's replay loop
// (backend-leaderboard verify.ts: simTick, no Three.js), tick for tick to the flag.
import { describe, expect, it } from 'vitest';
import { Scene } from 'three';
import { AiDriver } from '../ai-driver/index.ts';
import { NEUTRAL_INPUT } from '../kart-controller/types.ts';
import { Items } from '../items/items.ts';
import { RaceManager } from '../race-manager/index.ts';
import type { RaceConfig } from '../race-manager/types.ts';
import { buildTrack } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { CAST } from '../ui-hud/data/cast.ts';
import { RaceSession } from './session.ts';
import { simTick, type SimParts } from './simtick.ts';

const FILES = import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' }) as Record<string, TrackDefinition>;

/** The race with no views: what the leaderboard server runs. */
function bare(def: TrackDefinition, config: RaceConfig): SimParts {
  const track = buildTrack(def);
  const manager = new RaceManager(track, config);
  const items = new Items(track, manager);
  const ai = new AiDriver(track, config, manager.state, { itemRoles: items.roles });
  ai.drivePlayer = true;
  return { manager, items, ai, inputs: manager.state.karts.map(() => ({ ...NEUTRAL_INPUT })), playerIndex: manager.state.karts.findIndex((k) => k.isPlayer), playerSlot: { ...NEUTRAL_INPUT } };
}

describe('the kart animation never touches the sim', () => {
  // Harbor: grip turns, drifts, items and hits; Boardwalk: the loop-the-loop ride, bumper cars, bumps
  for (const id of ['harbour-loop', 'boardwalk-nights']) {
    it(`${id}: 8 karts animated to the flag race exactly as the bare sim`, () => {
      const def = FILES[`../track-builder/tracks/${id}.json`];
      const config: RaceConfig = {
        mode: 'quick', trackId: def.id, speedClass: 150, seed: 11, laps: 3,
        racers: CAST.map((c, i) => ({ racerId: c.id, archetype: c.archetype, isPlayer: i === 0 })),
      };
      const s = new RaceSession(new Scene(), def, config);
      s.ai.drivePlayer = true;
      const b = bare(def, config);
      let spun = 0, leaned = 0, squashed = 0;
      for (let tick = 0; tick < 120 * 60 * 6 && s.state.phase !== 'finished'; tick++) {
        s.tick(null);
        simTick(b, null);
        // frames at uneven fractions, reduced motion now and then
        if (tick % 2) s.frame((tick % 7) / 7, 1 / 60, tick % 900 < 150);
        for (const v of s.views) {
          spun = Math.max(spun, Math.abs(v.anim.curr.spin));
          leaned = Math.max(leaned, Math.abs(v.anim.curr.roll));
          squashed = Math.max(squashed, Math.abs(v.anim.curr.squash));
        }
        if (tick % 600 === 0) expect(JSON.stringify(s.state), `tick ${tick}`).toBe(JSON.stringify(b.manager.state));
      }
      expect(s.state.phase).toBe('finished');
      expect(JSON.stringify(s.state)).toBe(JSON.stringify(b.manager.state));
      expect(JSON.stringify(s.manager.results())).toBe(JSON.stringify(b.manager.results()));
      // and the animation really ran: karts leaned, squashed and (a hit) spun
      expect(leaned).toBeGreaterThan(0.05);
      expect(squashed).toBeGreaterThan(0.02);
      expect(spun).toBeGreaterThan(1);
      s.dispose();
    }, 240_000);
  }
});
