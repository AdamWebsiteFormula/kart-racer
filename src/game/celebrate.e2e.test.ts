// The finish celebration and the podium ceremony are pictures only (Adam, 24 Sept 2026: "must not
// touch the race sim"). A race with the player's reaction playing over the line, the finish camera
// circling and a podium built, compiled and running on the same track steps exactly as the bare sim
// (the leaderboard server's loop, no Three.js) tick for tick to the flag and past it, the
// celebration's end cutting the field off on the same tick in both, as a press on the finish banner
// does. And a Time Trial driven through the game's session with all of it on leaves an input log
// that the leaderboard's verifier replays to the very time the game showed.
import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Scene } from 'three';
import { AiDriver } from '../ai-driver/index.ts';
import { encodeLog } from '../backend-leaderboard/inputlog.ts';
import { soloConfig } from '../backend-leaderboard/rules.ts';
import { verifyRun } from '../backend-leaderboard/verify.ts';
import { NEUTRAL_INPUT } from '../kart-controller/types.ts';
import { Items } from '../items/items.ts';
import { lookAheadDriver } from '../race-manager/__tests__/drivers.ts';
import { RaceManager } from '../race-manager/index.ts';
import type { RaceConfig } from '../race-manager/types.ts';
import { buildTrack } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { CAST } from '../ui-hud/data/cast.ts';
import { Vfx } from '../vfx-juice/vfx.ts';
import { CELEBRATE, FinishCam, reactionFor } from './celebrate.ts';
import { Podium } from './podium.ts';
import { RaceSession } from './session.ts';
import { simTick, type SimParts } from './simtick.ts';

const FILES = import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' }) as Record<string, TrackDefinition>;

/** The race with no views: what the leaderboard server runs. */
function bare(def: TrackDefinition, config: RaceConfig, drivePlayer: boolean): SimParts {
  const track = buildTrack(def);
  const manager = new RaceManager(track, config);
  const items = new Items(track, manager);
  const ai = new AiDriver(track, config, manager.state, { itemRoles: items.roles });
  ai.drivePlayer = drivePlayer;
  return { manager, items, ai, inputs: manager.state.karts.map(() => ({ ...NEUTRAL_INPUT })), playerIndex: manager.state.karts.findIndex((k) => k.isPlayer), playerSlot: { ...NEUTRAL_INPUT } };
}

/** Everything the celebration and the ceremony draw, run as main.ts runs it: per frame, after the ticks. */
class Show {
  readonly cam = new FinishCam();
  readonly vfx: Vfx;
  podium: Podium | null = null;
  on = false;
  frames = 0;
  readonly s: RaceSession;
  readonly scene: Scene;
  constructor(s: RaceSession, scene: Scene) { this.s = s; this.scene = scene; this.vfx = new Vfx(scene, new PerspectiveCamera()); }
  frame(alpha: number, reduced: boolean): void {
    const s = this.s, i = s.playerIndex, k = s.state.karts[i], root = s.views[i].root;
    s.frame(alpha, 1 / 60, reduced);
    if (!this.on && k.finishTick !== undefined) {
      this.on = true;
      this.cam.start(s.track, k, root.position, root.rotation.y, [root.position.x, root.position.y + 2.4, root.position.z - 5.5], [root.position.x, root.position.y + 1.5, root.position.z + 6], 62);
      s.views[i].anim.react(reactionFor({ rank: k.rank, field: s.state.karts.length }));
      // the series' last results: the podium built on this track, then shown
      this.podium = new Podium(s.track, CAST.slice(0, 3).map((c) => ({ racerId: c.id, archetype: c.archetype })), s.def.biome);
      this.scene.add(this.podium.group);
      this.podium.start();
    }
    if (this.on) {
      this.cam.update(s.track, k, root.position, root.rotation.y, reduced, 1 / 60);
      this.podium!.update(1 / 60, reduced, this.vfx);
      this.frames++;
    }
    this.vfx.frame(1 / 60, 1 / 120, this.frames / 60, s.state.karts, undefined, this.cam.pos, reduced);
  }
}

describe('the finish celebration and the podium never touch the sim', () => {
  it('a race with the reaction, the finish camera and a running podium steps exactly as the bare sim, to the flag and past it', () => {
    const def = FILES['../track-builder/tracks/harbour-loop.json'];
    const config: RaceConfig = {
      mode: 'quick', trackId: def.id, speedClass: 150, seed: 5, laps: 1,
      racers: CAST.map((c, i) => ({ racerId: c.id, archetype: c.archetype, isPlayer: i === 0 })),
    };
    const scene = new Scene();
    const s = new RaceSession(scene, def, config);
    s.ai.drivePlayer = true;
    const b = bare(def, config, true);
    const show = new Show(s, scene);
    let cutAt = -1;
    // on past the flag until the celebration has ended and the ceremony has run a while (post-finish ticks count too)
    for (let tick = 0; tick < 120 * 60 * 3 && !(s.state.phase === 'finished' && cutAt >= 0 && tick > cutAt + 1200); tick++) {
      s.tick(null);
      simTick(b, null);
      if (tick % 2) show.frame((tick % 7) / 7, tick % 900 < 150);
      // the celebration's end: the rest of the field cut off, as main.ts does (and a press on the banner)
      if (cutAt < 0 && show.frames / 60 >= CELEBRATE.seconds) { cutAt = tick; s.manager.endRace(); b.manager.endRace(); }
      if (tick % 600 === 0) expect(JSON.stringify(s.state), `tick ${tick}`).toBe(JSON.stringify(b.manager.state));
    }
    expect(show.on, 'the player finished and the celebration ran').toBe(true);
    expect(cutAt).toBeGreaterThan(0);
    expect(s.state.phase).toBe('finished');
    expect(JSON.stringify(s.state)).toBe(JSON.stringify(b.manager.state));
    expect(JSON.stringify(s.manager.results())).toBe(JSON.stringify(b.manager.results()));
    // and it really played: the kart leapt, the podium's racers reacted
    expect(s.views[s.playerIndex].anim.reacting).not.toBeNull();
    expect(show.podium!.views.every((v) => v.anim.reacting !== null)).toBe(true);
    show.podium!.dispose();
    s.dispose();
  }, 240_000);

  it('a Time Trial played through the session with all of it on: its input log replays on the leaderboard to the same time', () => {
    const def = FILES['../track-builder/tracks/meadow-run.json'];
    const config = soloConfig('timeTrial', def.id, 'juniper', 0);
    const scene = new Scene();
    const s = new RaceSession(scene, def, config);
    const b = bare(def, config, false);
    const show = new Show(s, scene);
    const drive = lookAheadDriver(26, 0);
    let wobble = 0;
    for (let tick = 0; tick < 120 * 400 && (s.state.phase !== 'finished' || show.frames < 60 * 3); tick++) {
      // a live player until the line (the game samples the pad or keys; here a scripted stick, unrounded), the autopilot after
      const k = s.state.karts[0];
      wobble += 0.37;
      const i = drive(k, s.track);
      const live = { ...i, steer: i.steer * (0.97 + 0.03 * Math.sin(wobble)), throttle: i.throttle * 0.9991 };
      s.tick(live);
      simTick(b, live);
      if (tick % 2) show.frame(0.5, false);
    }
    expect(show.on).toBe(true);
    const mine = s.manager.results().ranks[0];
    expect(mine.dnf).toBe(false);
    expect(JSON.stringify(s.state.inputLog)).toBe(JSON.stringify(b.manager.state.inputLog));
    const v = verifyRun(def, 'timeTrial', 'juniper', 0, encodeLog(s.state.inputLog), mine.timeMs);
    expect(v).toMatchObject({ ok: true, timeMs: mine.timeMs });
    show.podium!.dispose();
    s.dispose();
  }, 240_000);
});
