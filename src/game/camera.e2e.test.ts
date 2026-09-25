// The chase camera through whole races (critiques of 24 Sept 2026: "rigid chase camera and a weak sense
// of speed; boosts give little feedback", Boardwalk's "jarring underwater transition" and "static loop
// camera cut", Canyon's "abrupt, flat tunnel lighting"). The sim as RaceSession runs it, minus the
// drawing, with a ChaseCam on every kart, as main.ts puts one on the player; and a kart driven by hand
// down a straight for the boost punches.
import { describe, expect, it } from 'vitest';
import { Raycaster, Vector3 } from 'three';
import { AiDriver } from '../ai-driver/index.ts';
import { Items } from '../items/items.ts';
import { loopFrame } from '../kart-controller/loop.ts';
import { createKartState, NEUTRAL_INPUT, type BoostSource, type KartState, type TrackLoop, type Vec3 } from '../kart-controller/types.ts';
import { RaceManager } from '../race-manager/index.ts';
import type { RaceConfig } from '../race-manager/types.ts';
import { BUILDER } from '../track-builder/constants.ts';
import { buildStartGantry } from '../track-builder/mesh/gantry.ts';
import { buildLoopMeshes } from '../track-builder/mesh/loop.ts';
import { paletteFor } from '../track-builder/mesh/palette.ts';
import { mirrored } from '../track-builder/mirror.ts';
import { buildTrack, type Track } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { CAST } from '../ui-hud/data/cast.ts';
import { CameraKick, type PunchKind } from '../vfx-juice/juice.ts';
import { CAM, ChaseCam, bendAhead, kickedFov, seaLevel, surgeOffset, tunnelDepth, wrapAngle } from './camera.ts';
import { simTick, type SimParts } from './simtick.ts';

const FILES = import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' }) as Record<string, TrackDefinition>;
const DEF = (id: string): TrackDefinition => Object.values(FILES).find((d) => d.id === id)!;
const DT = 1 / 60;
const DEG = 180 / Math.PI;

/** One race as RaceSession runs it, minus the drawing, every kart on the AI, a chase camera on each. */
function race(def: TrackDefinition, seed: number, onlyShortcut?: string) {
  const config: RaceConfig = { mode: 'quick', trackId: def.id, speedClass: 150, seed, laps: 3, racers: CAST.map((c) => ({ racerId: c.id, archetype: c.archetype, isPlayer: false })) };
  const track = buildTrack(def);
  const manager = new RaceManager(track, config);
  const items = new Items(track, manager);
  const ai = new AiDriver(track, config, manager.state, { itemRoles: items.roles, onlyShortcut });
  const inputs = manager.state.karts.map(() => ({ ...NEUTRAL_INPUT }));
  const parts: SimParts = { manager, items, ai, inputs, playerIndex: -1, playerSlot: { ...NEUTRAL_INPUT } };
  const cams = manager.state.karts.map((k) => { const c = new ChaseCam(); c.reset(k); return c; });
  const root = { x: 0, y: 0, z: 0 };
  let rescues = 0;
  /** Two sim ticks, then one 60 fps frame of every kart's camera. */
  const frame = (): void => {
    for (let n = 0; n < 2; n++) for (const e of simTick(parts, null).race) if (e.type === 'rescue' && e.phase === 'start') rescues++;
    manager.state.karts.forEach((k, i) => {
      root.x = k.position[0]; root.y = k.position[1]; root.z = k.position[2];
      cams[i].update(track, k, root, k.heading, false, 0, false, DT);
    });
  };
  return { track, state: manager.state, cams, frame, rescues: () => rescues };
}

const sub = (a: readonly number[], b: readonly number[]): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (v: readonly number[]): number => Math.hypot(v[0], v[1], v[2]);
const aimOf = (c: ChaseCam): Vec3 => { const d = sub(c.look, c.pos), l = len(d) || 1; return [d[0] / l, d[1] / l, d[2] / l]; };
const angle = (a: Vec3, b: Vec3): number => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * DEG;

/**
 * How close a camera at `p` is to a loop's ring (the riding surface, its skin and its neon rails:
 * mesh/loop.ts, analytically) and to its gantries (the boxes as built, in the loop's own frame).
 */
function loopClearance(track: Track, l: TrackLoop): (p: Vec3) => number {
  const f = loopFrame(track, l), o = f.origin, R = l.radius, w = l.width / 2 + l.spread;
  const local = (p: readonly number[]): Vec3 => {
    const d = sub(p, o);
    return [d[0] * f.right[0] + d[2] * f.right[2], d[1], d[0] * f.forward[0] + d[2] * f.forward[2]];
  };
  // the gantry boxes (24 vertices each), as extents in the loop's frame
  const g = buildLoopMeshes(track, null).find((m) => m.name === 'loopGantries')!.geometry.getAttribute('position');
  const boxes: { lo: Vec3; hi: Vec3 }[] = [];
  for (let b = 0; b < g.count; b += 24) {
    const lo: Vec3 = [Infinity, Infinity, Infinity], hi: Vec3 = [-Infinity, -Infinity, -Infinity];
    for (let v = b; v < b + 24; v++) {
      const q = local([g.getX(v), g.getY(v), g.getZ(v)]);
      for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], q[i]); hi[i] = Math.max(hi[i], q[i]); }
    }
    boxes.push({ lo, hi });
  }
  return (p) => {
    const [lat, up, fwd] = local(p);
    let best = Infinity;
    for (const { lo, hi } of boxes) {
      const d = [0, 1, 2].map((i) => Math.max(lo[i] - [lat, up, fwd][i], 0, [lat, up, fwd][i] - hi[i]));
      best = Math.min(best, Math.hypot(d[0], d[1], d[2]));
    }
    // the ring: solid from 0.45 m inside the path (the rails) to 0.29 m outside it (the skin and its underside)
    const r = Math.hypot(fwd, up - R);
    const radial = r < R - 0.45 ? R - 0.45 - r : r > R + 0.29 ? r - R - 0.29 : 0;
    let a = Math.atan2(fwd, R - up);
    if (a < 0) a += 2 * Math.PI;
    for (const turn of a < 1 ? [a, a + 2 * Math.PI] : [a]) {
      if (turn > 2 * Math.PI) continue;
      const centre = -l.shift / 2 + l.shift * (turn / (2 * Math.PI));
      best = Math.min(best, Math.hypot(Math.max(0, Math.abs(lat - centre) - w), radial));
    }
    return best;
  };
}

describe('the loop-the-loop view (Boardwalk: "static loop camera cut")', () => {
  it('swings out to the side view and back behind the kart over about a second, never a cut, never into the ring or its gantries (Mirror mode too)', () => {
    let arrivals = 0, overTop = 0, maxStep = 0, maxTurn = 0, minClear = Infinity;
    for (const [seed, def] of [[1, DEF('boardwalk-nights')], [2, mirrored(DEF('boardwalk-nights'))]] as const) {
      const { track, state, cams, frame } = race(def, seed);
      const clear = track.loops.map((l) => loopClearance(track, l));
      const prevPos = cams.map((c) => [...c.pos] as Vec3), prevAim = cams.map(aimOf), was = cams.map(() => 0);
      for (let n = 0; n < 60 * 240 && state.phase !== 'finished'; n++) {
        frame();
        state.karts.forEach((k, i) => {
          const c = cams[i], aim = aimOf(c);
          if (state.phase !== 'countdown' && (c.loopBlend > 0 || was[i] > 0)) {
            maxStep = Math.max(maxStep, len(sub(c.pos, prevPos[i])));
            maxTurn = Math.max(maxTurn, angle(aim, prevAim[i]));
          }
          if (c.loopBlend === 1 && was[i] < 1) arrivals++;
          // over the top of the ring the whole ring is in view
          if (k.status.loopIndex >= 0 && Math.abs(k.status.loopAngle - Math.PI) < 0.2) { overTop++; expect(c.loopBlend).toBe(1); }
          for (const f of clear) minClear = Math.min(minClear, f(c.pos));
          prevPos[i] = [...c.pos] as Vec3; prevAim[i] = aim; was[i] = c.loopBlend;
        });
      }
      expect(state.phase).toBe('finished');
    }
    expect(arrivals).toBeGreaterThanOrEqual(40); // 8 karts × 3 laps × 2 races (one mirrored), near enough every pass
    expect(overTop).toBeGreaterThan(40);
    // metres and degrees a frame at 60 fps: it jumped 15.6 m and turned 26° in one frame on the way out
    expect(maxStep).toBeLessThan(1.4);
    expect(maxTurn).toBeLessThan(4);
    // the near plane is 0.3 m
    expect(minClear).toBeGreaterThan(0.6);
  });
});

describe('falls into the sea (Boardwalk: "jarring underwater transition")', () => {
  it('a kart off the pier: the camera stays over the water, never aims under it, and watches from the road while the claw carries it back', () => {
    for (const id of ['boardwalk-nights', 'harbour-loop']) {
      const { track, state, cams, frame, rescues } = race(DEF(id), 3);
      const sea = seaLevel(track);
      const edge = track.openEdges[0];
      const side = edge.side === 'left' ? -1 : 1;
      let minAbove = Infinity, minAim = Infinity, falls = 0, maxRise = 0, gantryHits = 0;
      const hitLog: string[] = [];
      const lastY = cams.map((c) => c.pos[1]), lastPos = cams.map((c) => new Vector3(...c.pos));
      // the start gantry the claw sets karts down under (its beam 6.2 m over the road), as the scene builds it
      const gantry = buildStartGantry(track, paletteFor(track.def), null);
      gantry.updateMatrixWorld(true);
      gantry.geometry.computeBoundingSphere();
      const centre = gantry.geometry.boundingSphere!.center.clone().applyMatrix4(gantry.matrixWorld), reach = gantry.geometry.boundingSphere!.radius + 2;
      const ray = new Raycaster(), p = new Vector3(), dir = new Vector3();
      for (let n = 0; n < 60 * 100 && state.phase !== 'finished'; n++) {
        const forced = n > 60 * 5 && n % (60 * 10) === 0;
        if (forced) {
          // every kart not already in the claw drives off the open edge, somewhere along it
          state.karts.forEach((k, i) => {
            if (k.status.held || k.status.falling || k.status.loopIndex >= 0) return;
            const t = edge.fromT + ((i + 0.5) / 8) * (edge.toT - edge.fromT);
            const s = track.sample(t, 0, 0), off = track.sample(t, side * (s.halfWidth + BUILDER.kerbWidth + BUILDER.shoulderWidth + 0.5), 0);
            k.position = [...off.position]; k.heading = Math.atan2(s.tangent[0], s.tangent[2]); k.speed = 14; k.t = t; k.branch = 0; k.grounded = false;
            falls++;
          });
        }
        frame();
        cams.forEach((c, i) => {
          minAbove = Math.min(minAbove, c.pos[1] - sea); minAim = Math.min(minAim, c.look[1] - sea);
          const r = state.trackers[i].rescue;
          // (the frame the test puts the karts off the edge is a teleport, not the camera's doing)
          if ((r || state.karts[i].status.falling) && !forced) maxRise = Math.max(maxRise, Math.abs(c.pos[1] - lastY[i]));
          lastY[i] = c.pos[1];
          // through the gantry since last frame, or within the near plane (0.3 m) of it
          p.set(...c.pos);
          if (p.distanceTo(centre) < reach) {
            const step = p.distanceTo(lastPos[i]);
            if (step > 1e-6 && !forced) { ray.set(lastPos[i], dir.subVectors(p, lastPos[i]).normalize()); ray.far = step; if (ray.intersectObject(gantry, false).length) { gantryHits++; hitLog.push(`through: kart ${i} frame ${n}${r ? ' (claw)' : ''}`); } }
            for (const d of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) { ray.set(p, dir.set(d[0], d[1], d[2])); ray.far = 0.35; if (ray.intersectObject(gantry, false).length) { gantryHits++; hitLog.push(`touching: kart ${i} frame ${n}${r ? ' (claw)' : ''}`); } }
          }
          lastPos[i].copy(p);
        });
      }
      expect(falls, id).toBeGreaterThan(30);
      expect(rescues(), id).toBeGreaterThan(20);
      expect(minAbove, id).toBeGreaterThanOrEqual(CAM.seaClear - 1e-9);
      // it followed the kart 5 m down to where the claw caught it, and aimed 2.4 m under the surface
      expect(minAim, id).toBeGreaterThan(0);
      // the claw lifts the kart 7 m and sets it down on the start line, under the start gantry's beam
      // (6.2 m up): the camera watches from the road (it rode up through the beam), and moves smoothly
      expect(gantryHits, `${id}\n${hitLog.join('\n')}`).toBe(0);
      expect(maxRise, id).toBeLessThan(0.5);
      gantry.geometry.dispose();
    }
  });
});

describe('the mine\'s light (Canyon: "abrupt, flat tunnel lighting")', () => {
  it('the camera\'s depth in the bore: negative in front of a portal, positive inside it, nothing far out', () => {
    const track = buildTrack(DEF('canyon-rush'));
    const T = track.tunnels[0], L = T.lut, mine = track.branches.list.find((b) => b.lut === L)!;
    const ds = L.length / L.step;
    const at = (metres: number) => {
      const i = Math.round(T.i0 + metres / ds);
      const t = mine.toMain(i / L.step);
      return tunnelDepth(track, { t, branch: mine.index });
    };
    expect(at(-25)).toBe(-Infinity);
    expect(at(-2)).toBeGreaterThan(-3.5);
    expect(at(-2)).toBeLessThan(-0.5);
    expect(at(3)).toBeGreaterThan(1.5);
    expect(at(3)).toBeLessThan(4.5);
    expect(at(40)).toBe(CAM.portalFade);
    expect(tunnelDepth(buildTrack(DEF('meadow-run')), { t: 0, branch: 0 })).toBe(-Infinity);
  });

  it('fades in over the portal and out over the exit on every trip through the mine, never a snap', () => {
    const { state, cams, frame } = race(DEF('canyon-rush'), 4, 'mine-tunnel');
    const was = cams.map(() => 0);
    let ins = 0, outs = 0, maxStep = 0;
    for (let n = 0; n < 60 * 240 && state.phase !== 'finished'; n++) {
      frame();
      cams.forEach((c, i) => {
        maxStep = Math.max(maxStep, Math.abs(c.tunnel - was[i]));
        if (c.tunnel > 0.9 && was[i] <= 0.9) ins++;
        if (c.tunnel < 0.1 && was[i] >= 0.1) outs++;
        was[i] = c.tunnel;
      });
    }
    expect(ins).toBeGreaterThanOrEqual(16); // every kart through the mine at least twice
    expect(outs).toBeGreaterThanOrEqual(16);
    // at least 20 frames from the day's light to the lanterns' (it was the sun's shadow edge: one frame)
    expect(maxStep).toBeLessThan(0.05);
  });
});

/** The main road's heading at `t`. */
const headingAt = (track: Track, t: number): number => { const p = track.sample(t, 0, 0); return Math.atan2(p.tangent[0], p.tangent[2]); };

/** The start of the straightest 120 m of the main road. */
function straight(track: Track): number {
  let best = 0, bestTurn = Infinity;
  for (let t = 0; t < 1; t += 0.005) {
    let turn = 0;
    for (let m = 0; m < 120; m += 10) turn += Math.abs(wrapAngle(headingAt(track, t + (m + 10) / track.length) - headingAt(track, t + m / track.length)));
    if (turn < bestTurn) { bestTurn = turn; best = t; }
  }
  return best;
}

/** A kart driven by hand down the road's centre (no sim) at `speed(s)` m/s, `s` seconds in, with a chase camera on it. */
function drive(track: Track, t0: number, seconds: number, speed: (s: number) => number, each: (k: KartState, s: number, cam: ChaseCam) => void): void {
  const k = createKartState({ racerId: 'pip', t: t0 });
  const place = () => { const p = track.sample(k.t, 0, 0); k.position = [...p.position]; k.heading = Math.atan2(p.tangent[0], p.tangent[2]); };
  place();
  const cam = new ChaseCam();
  cam.reset(k);
  for (let f = 0; f < seconds * 60; f++) {
    const s = f * DT;
    k.speed = speed(s);
    k.t = (k.t + (k.speed * DT) / track.length) % 1;
    place();
    each(k, s, cam);
  }
}

describe('boost feedback (critiques: "no FOV punch, no shake, no pull-back")', () => {
  const track = buildTrack(DEF('meadow-run'));
  const t0 = straight(track);
  const BOOSTS: [PunchKind, BoostSource, number, number][] = [
    ['mini', 'drift', 1.3, 0.8], ['super', 'drift', 1.3, 1.5], ['ultra', 'drift', 1.3, 2.4], ['trick', 'trick', 1.3, 0.7], ['pad', 'pad', 1.4, 1], ['item', 'item', 1.4, 1.5],
  ];
  /** Cruise at 22 m/s, boost at 2 s (speed ramping up to the boosted top like the sim), back to cruise after it. */
  const run = (kind: PunchKind, source: BoostSource, mult: number, secs: number, reduced = false) => {
    const kick = new CameraKick();
    let base = 0, baseBack = 0, peak = 0, peakBack = 0, after = 0, maxStep = 0, last = 0;
    const cruise = 22, fire = 2;
    const speedAt = (s: number) => (s < fire ? cruise : s < fire + secs ? Math.min(cruise * mult, cruise + (s - fire) * 7.5) : Math.max(cruise, cruise * mult - (s - fire - secs) * 6));
    drive(track, t0, 8, speedAt, (k, s, cam) => {
      if (Math.abs(s - fire) < DT / 2) { kick.boost(s, kind); k.boost.source = source; k.boost.multiplier = mult; k.boost.remaining = secs; }
      if (s > fire) k.boost.remaining = Math.max(0, k.boost.remaining - DT);
      if (k.boost.remaining <= 0) { k.boost.source = 'none'; k.boost.multiplier = 1; }
      const root = { x: k.position[0], y: k.position[1], z: k.position[2] };
      cam.update(track, k, root, k.heading, false, kick.back(s, reduced), reduced, DT);
      const fov = kickedFov(cam.fov, kick.fov(s, reduced));
      const back = Math.hypot(cam.pos[0] - k.position[0], cam.pos[2] - k.position[2]);
      if (s > 0.5) maxStep = Math.max(maxStep, Math.abs(fov - last));
      last = fov;
      if (s < fire && s > fire - 0.2) { base = fov; baseBack = back; }
      if (s >= fire && s < fire + 0.8) { peak = Math.max(peak, fov); peakBack = Math.max(peakBack, back); }
      if (s > 7.9) after = fov;
    });
    return { rise: peak - base, pull: peakBack - baseBack, settle: Math.abs(after - base), peak, maxStep };
  };

  it('each boost punches the view wider and pulls the camera back by its tier, then settles; never past fovMax', () => {
    const r = Object.fromEntries(BOOSTS.map(([kind, src, m, s]) => [kind, run(kind, src, m, s)]));
    // blue < orange < purple, and a pad or an item beats a blue mini-turbo or a trick
    expect(r.mini.rise).toBeLessThan(r.super.rise);
    expect(r.super.rise).toBeLessThan(r.ultra.rise);
    expect(r.mini.pull).toBeLessThan(r.ultra.pull);
    expect(r.pad.rise).toBeGreaterThan(r.mini.rise);
    expect(r.item.rise).toBeGreaterThan(r.trick.rise);
    for (const [kind, x] of Object.entries(r)) {
      expect(x.rise, kind).toBeGreaterThan(5); // degrees: a punch you can see (it was 0 to 8, capped at 74°)
      expect(x.pull, kind).toBeGreaterThan(0.35); // metres back at the punch
      expect(x.peak, kind).toBeLessThanOrEqual(CAM.fovMax);
      expect(x.settle, kind).toBeLessThan(0.3); // back to the cruise view once it is over
      expect(x.maxStep, kind).toBeLessThan(2.5); // degrees a frame: a punch over six frames, not a cut
    }
  });

  it('reduced motion keeps under half of it', () => {
    for (const [kind, src, m, s] of BOOSTS) {
      const full = run(kind, src, m, s), calm = run(kind, src, m, s, true);
      expect(calm.rise, kind).toBeLessThan(full.rise * 0.5);
      expect(calm.pull, kind).toBeLessThan(full.pull * 0.5);
    }
  });

  it('the surge: the camera trails a kart that pulls away and closes in on one that brakes, within bounds', () => {
    expect(surgeOffset(25, 20)).toBeGreaterThan(0.3);
    expect(surgeOffset(10, 20)).toBeLessThan(-0.3);
    expect(surgeOffset(40, 0)).toBe(CAM.surgeMax);
    expect(surgeOffset(0, 40)).toBe(-CAM.surgeClose);
    expect(surgeOffset(20, 20)).toBe(0);
  });
});

describe('looking into bends (critiques: "no anticipation into corners")', () => {
  it('in a bend the aim turns toward it, and on the straights it looks down the road', () => {
    const { track, state, cams, frame } = race(DEF('meadow-run'), 5);
    const s = { position: [0, 0, 0] as Vec3, tangent: [0, 0, 0] as Vec3, normal: [0, 0, 0] as Vec3, groundY: 0, halfWidth: 0, surface: 'road' as const, gripScale: 1 };
    let bends = 0, into = 0, straights = 0, offStraight = 0;
    for (let n = 0; n < 60 * 90 && state.phase !== 'finished'; n++) {
      frame();
      if (state.phase === 'countdown') continue;
      state.karts.forEach((k, i) => {
        if (k.speed < 12 || k.drift.active || k.branch !== 0) return;
        const c = cams[i];
        const bend = bendAhead(track, k.t, 0, k.heading, k.speed, s);
        // where the camera looks against where the kart is, seen from the camera (+ left, like yaw)
        const toKart = Math.atan2(k.position[0] - c.pos[0], k.position[2] - c.pos[2]);
        const aim = wrapAngle(Math.atan2(c.look[0] - c.pos[0], c.look[2] - c.pos[2]) - toKart);
        if (Math.abs(bend) > 0.35) { bends++; if (Math.sign(aim) === Math.sign(bend)) into++; }
        if (Math.abs(bend) < 0.03) { straights++; if (Math.abs(aim) > 0.08) offStraight++; }
      });
    }
    expect(bends).toBeGreaterThan(500);
    expect(into / bends).toBeGreaterThan(0.85);
    expect(straights).toBeGreaterThan(500);
    expect(offStraight / straights).toBeLessThan(0.1);
    // never looking back or driving the wrong way
    expect(bendAhead(track, 0.1, 0, headingAt(track, 0.1) + Math.PI, 20, s)).toBe(0);
  });
});

describe('the chase camera makes no garbage (performance SOP: rendering allocates next to nothing)', () => {
  it('a frame of the chase camera allocates about a kilobyte (the road lookups\' small results, as before) and keeps none', async () => {
    const { Session } = (await import(/* @vite-ignore */ ['node', 'inspector/promises'].join(':'))) as { Session: new () => { connect(): void; post(m: string, p?: object): Promise<unknown>; disconnect(): void } };
    interface HeapNode { selfSize: number; children: HeapNode[]; callFrame: { functionName: string; url: string } }
    const sum = (n: HeapNode): number => n.selfSize + n.children.reduce((a, c) => a + sum(c), 0);
    const inUpdate = (n: HeapNode): number => (n.callFrame.functionName === 'update' && n.callFrame.url.endsWith('camera.ts') ? sum(n) : n.children.reduce((a, c) => a + inUpdate(c), 0));
    const { track, state, cams, frame } = race(DEF('canyon-rush'), 6, 'mine-tunnel');
    for (let n = 0; n < 60 * 30; n++) frame(); // 30 s in: the pack in and around the mine
    const k = state.karts[0], root = { x: k.position[0], y: k.position[1], z: k.position[2] };
    const ins = new Session();
    ins.connect();
    try {
      const N = 2000;
      await ins.post('HeapProfiler.startSampling', { samplingInterval: 64, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
      for (let n = 0; n < N; n++) cams[0].update(track, k, root, k.heading, false, 0.1, false, DT);
      const made = inUpdate(((await ins.post('HeapProfiler.stopSampling')) as { profile: { head: HeapNode } }).profile.head) / N;
      // only what is still alive after a full collection: growth
      await ins.post('HeapProfiler.startSampling', { samplingInterval: 64 });
      for (let n = 0; n < 4 * N; n++) cams[0].update(track, k, root, k.heading, false, 0.1, false, DT);
      await ins.post('HeapProfiler.collectGarbage');
      const kept = inUpdate(((await ins.post('HeapProfiler.stopSampling')) as { profile: { head: HeapNode } }).profile.head) / (4 * N);
      // almost all of it is the track's nearest-point lookups (track-builder), which the camera made before too
      expect(made, `${made.toFixed(0)} B allocated a frame`).toBeLessThan(1280);
      expect(kept, `${kept.toFixed(0)} B kept a frame`).toBeLessThan(16);
    } finally { ins.disconnect(); }
  });
});
