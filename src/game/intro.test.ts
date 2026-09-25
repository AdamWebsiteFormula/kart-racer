// The course intro (game/intro.ts): its easing and paths, its timing and skip, the hand-over to the
// chase camera, reduced motion and Mirror mode, on every track. The flight's clearance of the scenery
// and the sim standing still through it are intro.e2e.test.ts.
import { describe, expect, it } from 'vitest';
import { Scene, type Mesh } from 'three';
import type { KartState, Vec3 } from '../kart-controller/types.ts';
import type { RaceConfig } from '../race-manager/types.ts';
import { mirrored } from '../track-builder/mirror.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { CAST } from '../ui-hud/data/cast.ts';
import { CAM, ChaseCam, clampToRoad, restPose, type CamPose } from './camera.ts';
import { CourseIntro, findStand, glide, INTRO, planIntro, Rail, sampleIntro, TRACK_INTROS, type IntroPlan, type IntroScene, type IntroView } from './intro.ts';
import { RaceSession } from './session.ts';

const TRACKS = Object.values(import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' })) as TrackDefinition[];
const FPS = 60;

/** A race on `def` with the player on the grid, as main.ts builds it, and what the intro is planned against. */
function introScene(def: TrackDefinition): { session: RaceSession; scene: IntroScene } {
  const config: RaceConfig = {
    mode: 'quick', trackId: def.id, speedClass: 150, seed: 1, mirrored: def.mirrored === true,
    racers: CAST.map((c, i) => ({ racerId: c.id, archetype: c.archetype, isPlayer: i === 0 })),
  };
  const session = new RaceSession(new Scene(), def, config);
  const kart = session.player!;
  const stands = (session.trackScene.group.getObjectByName('crowd-stands') as Mesh | undefined)?.geometry.getAttribute('position').array;
  return { session, scene: { track: session.track, farLandmark: session.trackScene.farLandmark, kart, rest: restPose(session.track, kart), stand: stands ? findStand(session.track, stands) : undefined } };
}

const view = (): IntroView => ({ pos: [0, 0, 0], look: [0, 0, 0], fov: 0, roll: 0, move: 0 });
const dist = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const flip = (p: readonly number[]): Vec3 => [-p[0], p[1], p[2]];

describe('the easing', () => {
  it('runs 0 to 1, never back, starting and stopping at rest, with no jump in its pace', () => {
    for (const [a, b] of [[0.3, 0.3], [0.4, 0.3], [0.25, 0.55]] as const) {
      expect(glide(0, a, b)).toBe(0);
      expect(glide(1, a, b)).toBeCloseTo(1, 12);
      let last = 0, lastV = 0, maxJump = 0;
      const n = 2000;
      for (let i = 1; i <= n; i++) {
        const x = glide(i / n, a, b), v = (x - last) * n;
        expect(x).toBeGreaterThanOrEqual(last);
        if (i > 1) maxJump = Math.max(maxJump, Math.abs(v - lastV));
        last = x; lastV = v;
      }
      // at rest at both ends: the first and last steps are a tiny share of the cruise's
      expect((glide(1 / n, a, b) - 0) * n).toBeLessThan(0.01);
      expect((1 - glide(1 - 1 / n, a, b)) * n).toBeLessThan(0.01);
      // the pace changes smoothly (no step anywhere)
      expect(maxJump).toBeLessThan(0.01);
    }
  });
});

describe('a Rail', () => {
  it('passes through its first and last points and walks them at an even pace', () => {
    const r = new Rail([[0, 0, 0], [10, 0, 0], [10, 0, 30]]);
    const p: Vec3 = [0, 0, 0];
    expect(dist(r.at(0, p), [0, 0, 0])).toBeLessThan(1e-9);
    expect(dist(r.at(1, p), [10, 0, 30])).toBeLessThan(1e-9);
    const q: Vec3 = [0, 0, 0];
    let lo = Infinity, hi = 0;
    for (let i = 0; i < 100; i++) {
      r.at(i / 100, p); r.at((i + 1) / 100, q);
      const d = dist(p, q);
      lo = Math.min(lo, d); hi = Math.max(hi, d);
    }
    expect(hi / lo).toBeLessThan(1.1);
    expect(dist(new Rail([[1, 2, 3]]).at(0.5, p), [1, 2, 3])).toBe(0);
  });
});

describe('the course intro, timing and skip', () => {
  const plan: IntroPlan = planIntro(introScene(TRACKS.find((d) => d.id === 'harbour-loop')!).scene, 'full');

  it('holds still until its first frame is drawn, then runs on the frames given it, and ends at its length', () => {
    const intro = new CourseIntro(plan);
    expect(intro.done).toBe(false);
    intro.advance(0.5);
    expect(intro.time).toBe(0.5);
    intro.advance(-1); // never backwards
    expect(intro.time).toBe(0.5);
    intro.advance(100);
    expect(intro.time).toBe(plan.duration);
    expect(intro.done).toBe(true);
  });

  it('a skip ends it at once, on the rest pose', () => {
    const intro = new CourseIntro(plan);
    intro.advance(1);
    intro.skip();
    expect(intro.done).toBe(true);
    const v = intro.camera(false);
    expect(dist(v.pos, plan.rest.position)).toBeLessThan(1e-9);
    expect(dist(v.look, plan.rest.target)).toBeLessThan(1e-9);
    expect(v.fov).toBe(CAM.fov);
  });

  it('runs the course on toward the countdown: its scene time reaches the sim\'s at the end, never jumping', () => {
    const intro = new CourseIntro(plan), raceTime = -3;
    expect(intro.sceneTime(raceTime)).toBeCloseTo(raceTime - plan.duration, 9);
    intro.advance(plan.duration / 2);
    expect(intro.sceneTime(raceTime)).toBeCloseTo(raceTime - plan.duration / 2, 9);
    intro.advance(plan.duration);
    expect(intro.sceneTime(raceTime)).toBe(raceTime);
  });

  it('the title card leaves before the last move, a beat before the countdown', () => {
    const intro = new CourseIntro(plan);
    const crane = plan.moves[plan.moves.length - 1];
    expect(crane.name).toBe('crane');
    expect(plan.cardOut).toBeLessThanOrEqual(crane.start + 0.1);
    expect(plan.cardOut).toBeGreaterThan(plan.duration / 2);
    intro.advance(plan.cardOut - 0.01);
    expect(intro.cardLeaving).toBe(false);
    intro.advance(0.02);
    expect(intro.cardLeaving).toBe(true);
  });
});

describe.each(TRACKS.map((d) => [d.id, d] as const))('%s: the course intro', (_id, def) => {
  const { scene } = introScene(def);
  const full = planIntro(scene, 'full'), short = planIntro(scene, 'short');

  it('has its flight authored, and finds the grandstand by the start', () => {
    expect(TRACK_INTROS[def.id]).toBeDefined();
    expect(scene.farLandmark).toBeDefined();
    expect(scene.stand, 'a grandstand within 80 m of the start line').toBeDefined();
    expect(scene.stand!.len).toBeGreaterThan(5);
  });

  it('flies four moves in 5 to 6 s, or two in 2 to 3 s in Time Trial and the Daily', () => {
    expect(full.moves.map((m) => m.name)).toEqual(['vista', 'feature', 'stands', 'crane']);
    expect(full.duration).toBeGreaterThanOrEqual(5);
    expect(full.duration).toBeLessThanOrEqual(6);
    expect(short.moves.map((m) => m.name)).toEqual(['vista', 'crane']);
    expect(short.duration).toBeGreaterThanOrEqual(2);
    expect(short.duration).toBeLessThanOrEqual(3);
    for (const p of [full, short]) {
      let t = 0;
      for (const m of p.moves) { expect(m.start).toBeCloseTo(t, 9); t += m.secs; }
      expect(p.duration).toBeCloseTo(t, 9);
    }
  });

  it('every move eases in and out: at rest at its ends, smooth between, no NaN', () => {
    for (const plan of [full, short]) {
      const v = view(), was = view();
      for (const m of plan.moves) {
        const n = Math.round(m.secs * FPS);
        let fastest = 0;
        for (let i = 0; i <= n; i++) {
          sampleIntro(plan, m.start + (Math.min(i, n - 0.001) / n) * m.secs, false, v);
          expect(Number.isFinite(v.pos[0] + v.pos[1] + v.pos[2] + v.look[0] + v.look[1] + v.look[2] + v.fov)).toBe(true);
          if (i > 0) {
            const step = dist(v.pos, was.pos);
            fastest = Math.max(fastest, step);
            // from rest and to rest: the first and the last frame of a move barely move
            if (i === 1 || i === n) expect(step, `${m.name} frame ${i}`).toBeLessThan(0.06);
          }
          for (let k = 0; k < 3; k++) { was.pos[k] = v.pos[k]; was.look[k] = v.look[k]; }
        }
        // never a jump inside a move, nor a rush (the fastest, the sweep high over the course, stays under 70 m/s)
        expect(fastest, m.name).toBeLessThan(70 / FPS);
        expect(fastest, `${m.name} moves`).toBeGreaterThan(0.01);
      }
    }
  });

  it('lands exactly on the chase camera\'s rest pose, at rest, and the chase camera holds it from there', () => {
    const k = scene.kart as KartState;
    for (const plan of [full, short]) {
      const v = view(), before = view();
      sampleIntro(plan, plan.duration - 1e-6, false, v);
      expect(dist(v.pos, scene.rest.position)).toBeLessThan(1e-3);
      expect(dist(v.look, scene.rest.target)).toBeLessThan(1e-3);
      expect(v.fov).toBeCloseTo(CAM.fov, 3);
      sampleIntro(plan, plan.duration - 1 / FPS, false, before);
      expect(dist(v.pos, before.pos), 'the last frame barely moves').toBeLessThan(0.01);
      sampleIntro(plan, plan.duration, false, v);
      expect(dist(v.pos, scene.rest.position)).toBe(0);
    }
    const cam = new ChaseCam();
    cam.reset(k, scene.rest);
    for (let i = 0; i < 30; i++) {
      cam.update(scene.track, k, { x: k.position[0], y: k.position[1], z: k.position[2] }, k.heading, false, 0, false, 1 / FPS);
      expect(dist(cam.pos, scene.rest.position)).toBeLessThan(1e-6);
      expect(dist(cam.look, scene.rest.target)).toBeLessThan(1e-6);
    }
    expect(cam.fov).toBe(CAM.fov);
  });

  it('the low moves stay over the road: inside its walls and above it, under any roof', () => {
    const v = view();
    for (const m of full.moves) {
      if (m.name !== 'stands' && !(m.name === 'feature' && TRACK_INTROS[def.id].feature.eyes !== 'free')) continue;
      let hint = { t: 0, branch: 0 };
      for (let i = 0; i <= 60; i++) {
        sampleIntro(full, m.start + (Math.min(i, 59.99) / 60) * m.secs, false, v);
        const g = scene.track.nearestGlobal(v.pos);
        hint = { t: g.t, branch: g.branch };
        const p: Vec3 = [v.pos[0], v.pos[1], v.pos[2]];
        clampToRoad(scene.track, p, hint);
        expect(dist(p, v.pos), `${m.name} at ${i}/60 is off the road`).toBeLessThan(0.05);
      }
    }
  });

  it('reduced motion holds every move still and cuts between them; the crane is the rest pose', () => {
    for (const plan of [full, short]) {
      const a = view(), b = view();
      for (const m of plan.moves) {
        sampleIntro(plan, m.start + 0.001, true, a);
        sampleIntro(plan, m.start + m.secs - 0.001, true, b);
        expect(dist(a.pos, b.pos), m.name).toBe(0);
        expect(dist(a.look, b.look), m.name).toBe(0);
      }
      sampleIntro(plan, plan.moves[plan.moves.length - 1].start + 0.01, true, a);
      expect(dist(a.pos, scene.rest.position)).toBeLessThan(1e-9);
      // level stills: the sweep's lean is motion's
      sampleIntro(plan, plan.moves[0].start + plan.moves[0].secs / 2, true, a);
      expect(a.roll).toBe(0);
    }
  });

  it('Mirror mode: the flight on the mirrored track is the authored flight reflected', () => {
    const m = introScene(mirrored(def));
    const k = scene.kart;
    // the same kart and landmark reflected (the grid's slots and the crowd are laid by their own rules)
    const kart = { position: flip(k.position), heading: -k.heading, t: k.t, branch: k.branch } as KartState;
    const rest: CamPose = { position: flip(scene.rest.position), target: flip(scene.rest.target) };
    const mirrorScene: IntroScene = {
      track: m.scene.track, kart, rest,
      farLandmark: scene.farLandmark && flip(scene.farLandmark),
      stand: scene.stand && { ...scene.stand, lat: -scene.stand.lat },
    };
    // the mirrored track's own landmark stands where the authored one reflects to; its grandstand on the
    // other side of the road (the crowd lays itself round the props, so a stand may sit a little along)
    expect(dist(m.scene.farLandmark!, flip(scene.farLandmark!))).toBeLessThan(0.05);
    expect(Math.abs(m.scene.stand!.t - scene.stand!.t)).toBeLessThan(0.04);
    expect(Math.sign(m.scene.stand!.lat)).toBe(-Math.sign(scene.stand!.lat));
    for (const kind of ['full', 'short'] as const) {
      const a = planIntro(scene, kind), b = planIntro(mirrorScene, kind);
      expect(b.duration).toBe(a.duration);
      const va = view(), vb = view();
      for (let t = 0; t <= a.duration; t += 1 / 30) {
        sampleIntro(a, t, false, va);
        sampleIntro(b, t, false, vb);
        expect(dist(vb.pos, flip(va.pos)), `${kind} at ${t.toFixed(2)} s`).toBeLessThan(1e-3);
        expect(dist(vb.look, flip(va.look)), `${kind} aim at ${t.toFixed(2)} s`).toBeLessThan(1e-3);
        expect(vb.fov).toBeCloseTo(va.fov, 9);
        expect(vb.roll).toBeCloseTo(-va.roll, 9); // a lean reflected leans the other way
      }
    }
  });
});

describe('the grandstand pass', () => {
  it('trucks down the road in front of the stand, looking along its line, the crowd sliding through the frame', () => {
    const { scene } = introScene(TRACKS.find((d) => d.id === 'harbour-loop')!);
    const plan = planIntro(scene, 'full');
    const m = plan.moves.find((x) => x.name === 'stands')!;
    const a = view(), b = view();
    sampleIntro(plan, m.start + 0.001, false, a);
    sampleIntro(plan, m.start + m.secs - 0.001, false, b);
    const st = scene.stand!, mt = scene.track.length;
    // the aim is on the stand's line, `lead` ahead of the lens; the lens is `face` in front of it
    for (const [v, along] of [[a, INTRO.stands.from], [b, INTRO.stands.to]] as const) {
      const onLine = scene.track.sample(st.t + (along + INTRO.stands.lead) / mt, st.lat).position;
      expect(Math.hypot(v.look[0] - onLine[0], v.look[2] - onLine[2])).toBeLessThan(1.5);
      const lens = scene.track.sample(st.t + along / mt, st.lat).position;
      expect(Math.abs(Math.hypot(v.pos[0] - lens[0], v.pos[2] - lens[2]) - INTRO.stands.face)).toBeLessThan(1.5);
    }
    // it goes down the course: the stand's middle passes from ahead of the lens to beside it
    const mid = scene.track.sample(st.t, st.lat).position;
    const ahead = (v: IntroView) => {
      const f = scene.track.sample(st.t, 0).tangent;
      return (mid[0] - v.pos[0]) * f[0] + (mid[2] - v.pos[2]) * f[2];
    };
    expect(ahead(a)).toBeGreaterThan(10);
    expect(Math.abs(ahead(b))).toBeLessThan(3);
  });
});
