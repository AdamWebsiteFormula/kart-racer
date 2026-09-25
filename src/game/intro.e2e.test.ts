// The course intro in a live session (game/intro.ts): the sim never steps while it plays, so a race run
// with it is the race run without it, tick for tick (the input log the leaderboard replays, every
// result); and its camera never passes through the scenery, the karts on the grid, a creature or a
// balloon, on any track as authored or mirrored. The scene is the one RaceSession builds headless
// (code-built props; corridor.test.ts sweeps the chase camera over the same one).
import { describe, expect, it } from 'vitest';
import { BufferGeometry, DoubleSide, Float32BufferAttribute, Matrix4, Ray, Scene, Triangle, Vector3, type InstancedMesh, type Mesh, type Object3D } from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { encodeLog } from '../backend-leaderboard/inputlog.ts';
import { soloConfig } from '../backend-leaderboard/rules.ts';
import { replay } from '../backend-leaderboard/verify.ts';
import { NEUTRAL_INPUT, type InputState } from '../kart-controller/types.ts';
import type { RaceConfig } from '../race-manager/types.ts';
import { BUILDER } from '../track-builder/constants.ts';
import { mirrored } from '../track-builder/mirror.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { CAST } from '../ui-hud/data/cast.ts';
import { CAM, restPose, seaLevel } from './camera.ts';
import { CourseIntro, findStand, planIntro, sampleIntro, type IntroKind, type IntroPlan, type IntroView } from './intro.ts';
import { Accumulator } from './loop.ts';
import { RaceSession } from './session.ts';

const FILES = import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' }) as Record<string, TrackDefinition>;
const TRACKS = Object.values(FILES);
const DEF = (id: string) => TRACKS.find((d) => d.id === id)!;
const DT = 1 / 60;

/** The intro for `session`'s race, as main.ts plans it. */
function planFor(session: RaceSession, kind: IntroKind): IntroPlan {
  const k = session.player!;
  const stands = (session.trackScene.group.getObjectByName('crowd-stands') as Mesh | undefined)?.geometry.getAttribute('position').array;
  return planIntro({ track: session.track, farLandmark: session.trackScene.farLandmark, kart: k, rest: restPose(session.track, k), stand: stands ? findStand(session.track, stands) : undefined }, kind);
}

/**
 * A race to the flag on the autopilot, frame by frame at 60 fps as main.ts runs it: the intro (when
 * `kind`) plays first, drawing the course at its scene time, the sim standing at tick 0; then the
 * countdown and the race. `skipAt`: a button pressed that many seconds in.
 */
/** A player's hands: full throttle, steering for the centre line 14 m ahead (read from the race, as a player's eyes would). */
function hands(s: RaceSession): InputState {
  const k = s.player!, ahead = s.track.sample(k.t + 14 / s.track.length, 0, 0).position;
  let e = Math.atan2(ahead[0] - k.position[0], ahead[2] - k.position[2]) - k.heading;
  while (e > Math.PI) e -= 2 * Math.PI;
  while (e < -Math.PI) e += 2 * Math.PI;
  return { ...NEUTRAL_INPUT, throttle: 1, steer: Math.max(-1, Math.min(1, e * 2.5)) };
}

function race(def: TrackDefinition, config: RaceConfig, kind: IntroKind | null, skipAt?: number, driven = false) {
  const session = new RaceSession(new Scene(), def, config);
  session.ai.drivePlayer = !driven;
  const acc = new Accumulator();
  let intro = kind ? new CourseIntro(planFor(session, kind)) : null;
  let introFrames = 0, stillAtZero = true;
  for (let f = 0; f < 60 * 60 * 8 && session.state.phase !== 'finished'; f++) {
    if (intro) {
      if (!intro.moving) intro.moving = true; else intro.advance(DT);
      if (skipAt !== undefined && intro.time >= skipAt) intro.skip();
      if (!intro.done) {
        introFrames++;
        session.frame(acc.alpha, DT, false, intro.sceneTime(session.state.time));
        intro.camera(false);
        stillAtZero &&= session.state.tick === 0 && session.state.inputLog.length === 0;
        continue;
      }
      intro = null;
      acc.reset();
    }
    const n = acc.steps(DT);
    // the player's hands (a log played back, as the keys would give it), or the autopilot
    for (let i = 0; i < n; i++) session.tick(driven ? hands(session) : null);
    if (f % 30 === 0) session.frame(acc.alpha, DT); // drawn now and then: the views and the scene never feed the sim
  }
  const results = session.manager.results();
  return { session, introFrames, stillAtZero, log: encodeLog(session.state.inputLog), results };
}

describe('the course intro never runs the sim', () => {
  it('a Time Trial with its short intro, the full one or one skipped midway is the same race as without: the same input log, time and replay', () => {
    const def = DEF('harbour-loop');
    const config = soloConfig('timeTrial', def.id, 'pip', 0);
    // a player at the keys: their input goes in quantized, as the leaderboard replays it
    const bare = race(def, config, null, undefined, true);
    expect(bare.session.state.phase).toBe('finished');
    const mine = bare.results.ranks[0];
    expect(mine.dnf).toBe(false);
    // the leaderboard replays the log to the same time
    expect(replay(def, 'timeTrial', 'pip', 0, bare.session.state.inputLog).timeMs).toBe(mine.timeMs);
    for (const [kind, skip] of [['short', undefined], ['full', undefined], ['full', 1.2]] as const) {
      const r = race(def, config, kind, skip, true);
      expect(r.introFrames, `${kind} intro frames`).toBeGreaterThan(skip ? 60 : kind === 'full' ? 300 : 120);
      expect(r.stillAtZero, 'the sim stood at tick 0 through the intro').toBe(true);
      expect(r.log).toBe(bare.log);
      expect(r.results).toEqual(bare.results);
    }
  });

  it('a Grand Prix race of eight with its full intro finishes on the same ticks as without', () => {
    const def = DEF('canyon-rush');
    const config: RaceConfig = {
      mode: 'grandPrix', trackId: def.id, speedClass: 150, seed: 7, laps: 1,
      racers: CAST.map((c, i) => ({ racerId: c.id, archetype: c.archetype, isPlayer: i === 0 })),
    };
    const bare = race(def, config, null), withIntro = race(def, config, 'full');
    expect(withIntro.stillAtZero).toBe(true);
    expect(withIntro.log).toBe(bare.log);
    expect(withIntro.results).toEqual(bare.results);
    expect(bare.results.ranks.filter((r) => !r.dnf).length).toBeGreaterThan(4);
  });
});

// ---------------------------------------------------------------- clearance

/** The lens keeps this far from any surface (the near plane is 0.3 m) and from a creature or a hazard this far (m). */
const LENS = 0.45, CREATURE_CLEAR = 4;
/** meshes not in the way: the sky, the far ring, the sea's plane (checked as a height), what the vertex shader poses far out, and the crowd's critters (a pose away from their stands) */
const NOT_SOLID = /^(sky|horizon|horizon-rings|ground-water|vista-movers|vista-glow|vista-ring-glow|crowd|crowd-lite)$/;
/** moved by the scene's clock: posed at each sample */
const MOVING = /^(creature|hazard)/;

/** Every triangle drawn under `root` in the world, one geometry (instances expanded), except what `skip` says. */
function worldTriangles(root: Object3D, skip: (o: Object3D) => boolean): Float32Array {
  root.updateMatrixWorld(true);
  const parts: Float32Array[] = [];
  const m = new Matrix4(), v = new Vector3();
  const visit = (o: Object3D): void => {
    if (!o.visible || skip(o)) return;
    const mesh = o as Mesh;
    const g = mesh.geometry as BufferGeometry | undefined, pos = g?.getAttribute('position');
    if (mesh.isMesh && g && pos) {
      const idx = g.index, n = idx ? idx.count : pos.count;
      const im = mesh as unknown as InstancedMesh, count = im.isInstancedMesh ? im.count : 1;
      for (let k = 0; k < count; k++) {
        if (im.isInstancedMesh) { im.getMatrixAt(k, m); m.premultiply(mesh.matrixWorld); } else m.copy(mesh.matrixWorld);
        const out = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          v.fromBufferAttribute(pos, idx ? idx.getX(i) : i).applyMatrix4(m);
          out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z;
        }
        parts.push(out);
      }
    }
    for (const c of o.children) visit(c);
  };
  visit(root);
  const all = new Float32Array(parts.reduce((s, p) => s + p.length, 0));
  let at = 0;
  for (const p of parts) { all.set(p, at); at += p.length; }
  return all;
}

function bvhOf(tris: Float32Array): MeshBVH {
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(tris, 3));
  return new MeshBVH(g);
}

/** The nearest of `tris` (world triangles) to `p`, by brute force (a creature: a few thousand). */
function nearest(tris: Float32Array, p: Vector3): number {
  const t = new Triangle(), q = new Vector3();
  let best = Infinity;
  for (let i = 0; i + 8 < tris.length; i += 9) {
    t.a.set(tris[i], tris[i + 1], tris[i + 2]); t.b.set(tris[i + 3], tris[i + 4], tris[i + 5]); t.c.set(tris[i + 6], tris[i + 7], tris[i + 8]);
    best = Math.min(best, t.closestPointToPoint(p, q).distanceTo(p));
  }
  return best;
}

describe.each(TRACKS.flatMap((d) => [[d.id, d], [`${d.id} mirrored`, mirrored(d)]] as const))('%s: the course intro\'s camera', (_name, def) => {
  it('never passes through the scenery, the karts on the grid, a creature, a balloon or the sea', () => {
    const config: RaceConfig = {
      mode: 'quick', trackId: def.id, speedClass: 150, seed: 1, mirrored: def.mirrored === true,
      racers: CAST.map((c, i) => ({ racerId: c.id, archetype: c.archetype, isPlayer: i === 0 })),
    };
    const session = new RaceSession(new Scene(), def, config);
    const root = session.trackScene.group.parent!;
    // the course, the karts and the rest, in one tree (the scene the session adds itself to)
    const solid = bvhOf(worldTriangles(root, (o) => NOT_SOLID.test(o.name) || MOVING.test(o.name)));
    // (the outermost moving nodes: a creature's parts are drawn with it)
    const movers: Object3D[] = [];
    const findMovers = (o: Object3D) => { if (MOVING.test(o.name)) movers.push(o); else for (const c of o.children) findMovers(c); };
    findMovers(root);
    const sea = seaLevel(session.track);
    const balloons = session.track.features.filter((f) => f.kind === 'pickup' && (f.branch === 0 || session.track.branches.list[f.branch]?.open)).map((f) => new Vector3(f.position[0], f.position[1] + BUILDER.balloonHeight, f.position[2]));
    const p = new Vector3(), prev = new Vector3(), dir = new Vector3(), ray = new Ray(), up = new Vector3(0, 1, 0);
    const hit = { point: new Vector3(), distance: 0, faceIndex: 0 };
    let bad = '', checked = 0;
    for (const kind of ['full', 'short'] as const) {
      const plan = planFor(session, kind), intro = new CourseIntro(plan), v: IntroView = { pos: [0, 0, 0], look: [0, 0, 0], fov: 0, roll: 0, move: 0 };
      let move = -1;
      for (let time = 0; time <= plan.duration + 1e-9 && !bad; time += DT) {
        intro.time = Math.min(time, plan.duration - 1e-6);
        sampleIntro(plan, intro.time, false, v);
        p.set(v.pos[0], v.pos[1], v.pos[2]);
        const where = `${kind} ${plan.moves[v.move]?.name ?? 'end'} at ${time.toFixed(2)} s (${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)})`;
        checked++;
        const d = solid.closestPointToPoint(p, hit)?.distance ?? Infinity;
        if (d < LENS) bad = `${where}: ${d.toFixed(2)} m from a surface`;
        // nothing crossed since the last frame of this move (a cut starts afresh)
        if (!bad && v.move === move) {
          dir.subVectors(p, prev);
          const len = dir.length();
          if (len > 1e-6 && solid.raycastFirst(ray.set(prev, dir.normalize()), DoubleSide, 0, len)) bad = `${where}: passed through a surface`;
        }
        // not inside a solid or under the ground: the first surface straight up is an underside, not a top
        if (!bad) {
          const top = solid.raycastFirst(ray.set(p, up), DoubleSide, 0, 400) as { face?: { normal: Vector3 } } | null;
          if (top?.face && top.face.normal.y > 0.2) bad = `${where}: under a surface`;
        }
        if (!bad && p.y < sea + CAM.seaClear - 1e-6) bad = `${where}: ${(p.y - sea).toFixed(2)} m over the sea`;
        if (!bad) for (const b of balloons) if (b.distanceTo(p) < 3) { bad = `${where}: ${b.distanceTo(p).toFixed(2)} m from a balloon`; break; }
        // the creatures and the hazards where the scene draws them now
        if (!bad && movers.length) {
          session.frame(0, DT, false, intro.sceneTime(session.state.time));
          root.updateMatrixWorld(true);
          for (const o of movers) {
            const m = nearest(worldTriangles(o, () => false), p);
            if (m < CREATURE_CLEAR) { bad = `${where}: ${m.toFixed(2)} m from ${o.name}`; break; }
          }
        }
        prev.copy(p);
        move = v.move;
      }
    }
    expect(bad).toBe('');
    expect(checked).toBeGreaterThan(400);
    session.dispose();
  }, 180_000);
});

