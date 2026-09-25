// The Final Lap Shift's show in a live session (track-builder mesh/shiftStage.ts, vfx-juice's pulse):
// its set piece starts on the very tick the leader starts the last lap and the camera's pulse with it;
// the scene stays inside its draw budget before and after, and makes no material mid-race; and it never
// touches the race: a race drawn every tick through the whole show is the bare sim's race, tick for tick
// (the input log the leaderboard replays, every result).
import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Scene, type InstancedMesh, type Material, type Mesh, type Object3D } from 'three';
import { encodeLog } from '../backend-leaderboard/inputlog.ts';
import { soloConfig } from '../backend-leaderboard/rules.ts';
import { replay } from '../backend-leaderboard/verify.ts';
import { AiDriver } from '../ai-driver/index.ts';
import { Items } from '../items/items.ts';
import { NEUTRAL_INPUT, type InputState } from '../kart-controller/types.ts';
import { RaceManager } from '../race-manager/index.ts';
import type { RaceConfig } from '../race-manager/types.ts';
import { buildTrack } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { CAST } from '../ui-hud/data/cast.ts';
import { Vfx } from '../vfx-juice/vfx.ts';
import { directFx, newEffects } from '../vfx-juice/juice.ts';
import { RaceSession } from './session.ts';
import { simTick } from './simtick.ts';

const FILES = import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' }) as Record<string, TrackDefinition>;
const DEF = (id: string) => FILES[`../track-builder/tracks/${id}.json`];
const IDS = ['harbour-loop', 'meadow-run', 'canyon-rush', 'frostbite-pass', 'boardwalk-nights', 'skyline-circuit'];
const DT = 1 / 120;

const eight = (def: TrackDefinition, laps = 3): RaceConfig => ({
  mode: 'quick', trackId: def.id, speedClass: 150, seed: 7, laps,
  racers: CAST.map((c, i) => ({ racerId: c.id, archetype: c.archetype, isPlayer: i === 0 })),
});

/** Draw calls the scene makes, and again for the shadow pass (performance/frameBudget.test.ts's count). */
function draws(root: Object3D): number {
  let n = 0;
  root.traverseVisible((x) => {
    const m = x as Mesh;
    if (!m.isMesh) return;
    const im = m as InstancedMesh;
    if (im.isInstancedMesh && im.count === 0) return;
    n += m.castShadow ? 2 : 1;
  });
  return n;
}

function materials(root: Object3D): Set<Material> {
  const out = new Set<Material>();
  root.traverse((o) => { const m = (o as Mesh).material; if (m) for (const x of Array.isArray(m) ? m : [m]) out.add(x); });
  return out;
}

describe('the Final Lap Shift show in a race', () => {
  it.each(IDS)('%s: within the draw budget (the performance SOP\'s 80 for the scene and its shadow pass) before the shift and all through its show', (id) => {
    // counted as performance/frameBudget.test.ts counts a race's start: every visible mesh, casters twice
    const def = DEF(id), scene = new Scene();
    const s = new RaceSession(scene, def, eight(def));
    new Vfx(scene, new PerspectiveCamera());
    s.frame(0, 1 / 60);
    expect(draws(scene), 'before the shift').toBeLessThanOrEqual(80);
    s.track.applyFinalLapShift(s.state.karts);
    let most = 0;
    for (let t = 0; t <= 8; t += 1 / 30) { s.trackScene.stage!.update(t, t, s.state.karts[0].position, 0, false); most = Math.max(most, draws(scene)); }
    expect(most, 'through the show').toBeLessThanOrEqual(80);
    s.dispose();
  });

  it.each(IDS)('%s: its set piece and the camera\'s pulse start on the shift\'s own tick; no material made mid-race', (id) => {
    const def = DEF(id), scene = new Scene();
    const s = new RaceSession(scene, def, eight(def));
    new Vfx(scene, new PerspectiveCamera());
    s.ai.drivePlayer = true;
    s.frame(0, 1 / 60);
    const stage = s.trackScene.stage!;
    expect(stage.since).toBe(-1);
    const atLoad = materials(s.trackScene.group);
    const fx = newEffects();
    let fired = -1;
    for (let tick = 0; tick < 120 * 60 * 5 && fired < 0; tick++) {
      const ev = s.tick(null);
      const shifted = ev.race.some((e) => e.type === 'trackChanged');
      if (shifted) {
        fired = s.state.tick;
        // the camera's pulse and shake come with it (vfx-juice)
        expect(directFx(ev.race, ev.items, s.player!.racerId, fx).shiftPulse).toBe(true);
      }
      // drawn every other tick, as at 60 fps; on the shift's own tick too
      if (tick % 2 === 0 || shifted) {
        s.frame(0, 1 / 60);
        expect(stage.since, shifted ? 'the shift\'s tick' : 'before it').toBe(shifted ? 0 : -1);
      }
    }
    expect(fired, 'the shift fired').toBeGreaterThan(0);
    // its show under way and done
    for (let k = 0; k < 120 * 6; k++) { s.tick(null); if (k % 2) s.frame(0, 1 / 60); }
    expect(stage.since).toBeGreaterThan(5.9);
    const late = [...materials(s.trackScene.group)].filter((m) => !atLoad.has(m)).map((m) => m.type);
    expect(late, 'materials first seen mid-race').toEqual([]);
    s.dispose();
  }, 240_000);
});

describe('the show never touches the race', () => {
  it('an eight-kart race on Canyon Rush (its route change swapped in from the twin built at load), drawn every tick through its show, is the bare sim\'s race', () => {
    const def = DEF('canyon-rush'), config = eight(def);
    // the bare sim: what the leaderboard server runs (game/simtick.ts), no scene, no stage
    const track = buildTrack(def), manager = new RaceManager(track, config), items = new Items(track, manager);
    const ai = new AiDriver(track, config, manager.state, { itemRoles: items.roles });
    ai.drivePlayer = true;
    const inputs = manager.state.karts.map(() => ({ ...NEUTRAL_INPUT }));
    const parts = { manager, items, ai, inputs, playerIndex: manager.state.karts.findIndex((k) => k.isPlayer), playerSlot: { ...NEUTRAL_INPUT } };
    for (let t = 0; t < 120 * 60 * 8 && manager.state.phase !== 'finished'; t++) simTick(parts, null);
    const s = new RaceSession(new Scene(), def, config);
    s.ai.drivePlayer = true;
    let shown = 0;
    for (let t = 0; t < 120 * 60 * 8 && s.state.phase !== 'finished'; t++) {
      s.tick(null);
      s.frame(0.5, DT);
      if (s.trackScene.stage!.since >= 0) shown++;
    }
    expect(shown, 'frames of the show drawn').toBeGreaterThan(120 * 10);
    expect(s.state.phase).toBe('finished');
    expect(encodeLog(s.state.inputLog)).toBe(encodeLog(manager.state.inputLog));
    expect(s.manager.results()).toEqual(manager.results());
    s.dispose();
  }, 240_000);

  it('a Time Trial on Meadow Run at the keys, drawn through the storm, replays on the leaderboard to the same time', () => {
    const def = DEF('meadow-run'), config = soloConfig('timeTrial', def.id, 'pip', 0);
    const s = new RaceSession(new Scene(), def, config);
    // a player's hands: full throttle, steering for the centre line 14 m ahead
    const hands = (): InputState => {
      const k = s.player!, ahead = s.track.sample(k.t + 14 / s.track.length, 0, 0).position;
      let e = Math.atan2(ahead[0] - k.position[0], ahead[2] - k.position[2]) - k.heading;
      while (e > Math.PI) e -= 2 * Math.PI;
      while (e < -Math.PI) e += 2 * Math.PI;
      return { ...NEUTRAL_INPUT, throttle: 1, steer: Math.max(-1, Math.min(1, e * 2.5)) };
    };
    let shown = 0;
    for (let t = 0; t < 120 * 60 * 8 && s.state.phase !== 'finished'; t++) {
      s.tick(hands());
      s.frame(0.5, DT, t % 3 === 0);
      if (s.trackScene.stage!.since >= 0) shown++;
    }
    expect(shown).toBeGreaterThan(120 * 10);
    const mine = s.manager.results().ranks[0];
    expect(mine.dnf).toBe(false);
    expect(replay(def, 'timeTrial', 'pip', 0, s.state.inputLog).timeMs).toBe(mine.timeMs);
    s.dispose();
  }, 240_000);
});
