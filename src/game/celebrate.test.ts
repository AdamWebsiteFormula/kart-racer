// The finish celebration (celebrate.ts): the placing → reaction mapping, and the finish camera: it
// starts exactly where the chase camera is, swings round the side with more road to the front of
// the kart, keeps circling, stays over the road, and with reduced motion holds then cuts once.
import { describe, expect, it } from 'vitest';
import { REACTIONS } from '../kart-controller/anim.ts';
import { createKartState, type TrackSample, type Vec3 } from '../kart-controller/types.ts';
import { buildTrack } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { CAM } from './camera.ts';
import { CELEBRATE, FinishCam, joyful, lostReaction, reactionFor } from './celebrate.ts';

const FILES = import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' }) as Record<string, TrackDefinition>;

describe('reactionFor: the placing picks the reaction', () => {
  it('a full field (Adam, 26 Sept 2026): 1st, 2nd and 3rd each their own joy; 4th and below disappointed, most at the back', () => {
    const got = [1, 2, 3, 4, 5, 6, 7, 8].map((rank) => reactionFor({ rank, field: 8 }));
    expect(got).toEqual(['champion', 'cheer', 'bounce', 'sigh', 'sigh', 'deflated', 'deflated', 'dejected']);
    expect(got.map(joyful)).toEqual([true, true, true, false, false, false, false, false]);
    expect(reactionFor({ rank: 1, field: 8, dnf: true })).toBe('dejected');
  });

  it('a Knockout round: the podium places as ever, the other safe places relieved, the cut disappointed (the last most); the final: only its winner happy', () => {
    const round = (rank: number, field: number, cutLine: number) => reactionFor({ rank, field, knockout: { cutLine, final: false } });
    expect([1, 2, 3, 4, 5, 6, 7, 8].map((r) => round(r, 8, 6))).toEqual(['champion', 'cheer', 'bounce', 'relief', 'relief', 'relief', 'deflated', 'dejected']);
    expect([4, 5, 6].map((r) => round(r, 6, 4))).toEqual(['relief', 'deflated', 'dejected']);
    expect([1, 2, 3, 4].map((rank) => reactionFor({ rank, field: 4, knockout: { cutLine: 2, final: true } }))).toEqual(['champion', 'sigh', 'deflated', 'dejected']);
  });

  it('never happier further back: the losing places grade sigh, then deflated, then dejected at the very back of any field', () => {
    const grade = (r: string) => ['sigh', 'deflated', 'dejected'].indexOf(r);
    for (const field of [4, 5, 6, 7, 8, 12]) {
      for (const first of [2, 4, field]) {
        if (first > field) continue;
        const got = Array.from({ length: field - first + 1 }, (_, i) => lostReaction(first + i, field, first));
        expect(got.every((r, i) => i === 0 || grade(r) >= grade(got[i - 1])), `${field} from ${first}: ${got}`).toBe(true);
        expect(got[got.length - 1]).toBe('dejected');
      }
    }
  });

  it('a solo run reacts to its medal (a Daily, to finishing)', () => {
    expect((['gold', 'silver', 'bronze', 'none'] as const).map((medal) => reactionFor({ rank: 1, field: 1, medal }))).toEqual(['champion', 'cheer', 'bounce', 'shrug']);
    expect(reactionFor({ rank: 1, field: 1 })).toBe('relief');
  });

  it('confetti only for the joyful ones', () => {
    expect(REACTIONS.filter(joyful)).toEqual(['champion', 'cheer', 'bounce', 'relief']);
  });
});

describe('FinishCam', () => {
  const def = FILES['../track-builder/tracks/harbour-loop.json'];
  const track = buildTrack(def);
  const s: TrackSample = { position: [0, 0, 0], tangent: [0, 0, 0], normal: [0, 0, 0], groundY: 0, halfWidth: 0, surface: 'road', gripScale: 1 };
  /** the kart `m` metres up the lap from the line, `lat` metres to its +X side of the middle, and its forward and +X */
  const at = (m: number, lat: number) => {
    const t = (track.startT + m / track.length) % 1;
    track.sampleInto(t, lat, 0, s);
    const h = Math.atan2(s.tangent[0], s.tangent[2]);
    const k = createKartState({ racerId: 'p', position: [...s.position] as Vec3, heading: h, t });
    return { k, root: { x: s.position[0], y: s.position[1], z: s.position[2] }, h, f: [Math.sin(h), 0, Math.cos(h)], x: [Math.cos(h), 0, -Math.sin(h)] };
  };
  /** the chase camera's pose behind a kart */
  const chase = (p: ReturnType<typeof at>) => ({
    pos: [p.root.x - p.f[0] * CAM.back, p.root.y + CAM.height, p.root.z - p.f[2] * CAM.back] as Vec3,
    look: [p.root.x + p.f[0] * CAM.aheadLook, p.root.y + CAM.lookHeight, p.root.z + p.f[2] * CAM.aheadLook] as Vec3,
  });
  const rel = (cam: FinishCam, p: ReturnType<typeof at>) => {
    const dx = cam.pos[0] - p.root.x, dz = cam.pos[2] - p.root.z;
    return { ahead: dx * p.f[0] + dz * p.f[2], side: dx * p.x[0] + dz * p.x[2], up: cam.pos[1] - p.root.y, dist: Math.hypot(dx, dz) };
  };

  it('starts where the chase camera is, swings round the side with more road to the front, then keeps circling', () => {
    const cam = new FinishCam();
    let p = at(30, 3); // right of the middle: it swings round by the other (−X) side
    const c = chase(p);
    cam.start(track, p.k, p.root, p.h, c.pos, c.look, 64);
    expect(cam.side).toBe(-1);
    cam.update(track, p.k, p.root, p.h, false, 1 / 120);
    expect(Math.hypot(cam.pos[0] - c.pos[0], cam.pos[1] - c.pos[1], cam.pos[2] - c.pos[2])).toBeLessThan(0.2);
    expect(cam.fov).toBeCloseTo(64, 0);
    // the kart drives on (slowly, as the autopilot does); the camera rides with it, never jumping
    let m = 30, lastSide = 0, jump = 0, sideSeen = 0;
    let prev = rel(cam, p);
    for (let i = 0; i < 90; i++) {
      m += 12 / 60;
      p = at(m, 3);
      cam.update(track, p.k, p.root, p.h, false, 1 / 60);
      const r = rel(cam, p);
      jump = Math.max(jump, Math.hypot(r.ahead - prev.ahead, r.side - prev.side, r.up - prev.up));
      sideSeen = Math.min(sideSeen, r.side);
      prev = r;
      lastSide = r.side;
    }
    expect(jump).toBeLessThan(0.5);
    expect(sideSeen, 'round by the kart\'s −X flank').toBeLessThan(-2.5);
    const done = rel(cam, p);
    expect(done.ahead, 'in front of the kart').toBeGreaterThan(2.5);
    expect(done.dist).toBeCloseTo(CELEBRATE.distance, 0);
    expect(done.up).toBeCloseTo(CELEBRATE.height, 0);
    expect(cam.fov).toBeCloseTo(CELEBRATE.fov, 3);
    // it keeps circling across the front
    for (let i = 0; i < 120; i++) { m += 12 / 60; p = at(m, 3); cam.update(track, p.k, p.root, p.h, false, 1 / 60); }
    expect(rel(cam, p).side).toBeGreaterThan(lastSide + 1);
    expect(cam.time).toBeCloseTo(3.5 + 1 / 120, 6);
  });

  it('left of the middle it swings round by the +X side; and it stays over the road, above it', () => {
    const cam = new FinishCam();
    const p = at(200, -3);
    const c = chase(p);
    cam.start(track, p.k, p.root, p.h, c.pos, c.look, 60);
    expect(cam.side).toBe(1);
    for (let i = 0; i < 400; i++) {
      cam.update(track, p.k, p.root, p.h, false, 1 / 60);
      const r = rel(cam, p);
      expect(r.up).toBeGreaterThan(CAM.roadClear - 1e-6);
    }
  });

  it('beside the results (Mario Kart World): the kart eases into the room left of the panel and the circling settles, nose into the frame', () => {
    const aspect = 16 / 9;
    /** where the kart's root falls across the view (normalized screen x, −1 the left edge) */
    const screenX = (cam: FinishCam, p: ReturnType<typeof at>) => {
      const fx = cam.look[0] - cam.pos[0], fz = cam.look[2] - cam.pos[2], l = Math.hypot(fx, fz);
      const rx = -fz / l, rz = fx / l; // the camera's right
      const kx = p.root.x - cam.pos[0], kz = p.root.z - cam.pos[2];
      return ((kx * rx + kz * rz) / ((kx * fx + kz * fz) / l)) / (Math.tan((cam.fov * Math.PI) / 360) * aspect);
    };
    for (const lat of [3, -3]) {
      const cam = new FinishCam();
      const p = at(120, lat);
      const c = chase(p);
      cam.start(track, p.k, p.root, p.h, c.pos, c.look, 64);
      for (let i = 0; i < 4.2 * 60; i++) cam.update(track, p.k, p.root, p.h, false, 1 / 60, aspect);
      expect(Math.abs(screenX(cam, p)), 'in the middle before the results').toBeLessThan(0.05);
      // the results come in: the room left of the panel is half the view
      let jump = 0, prev = rel(cam, p);
      for (let i = 0; i < 8 * 60; i++) {
        cam.besideAt(-0.5);
        cam.update(track, p.k, p.root, p.h, false, 1 / 60, aspect);
        const r = rel(cam, p);
        jump = Math.max(jump, Math.hypot(r.ahead - prev.ahead, r.side - prev.side));
        prev = r;
      }
      expect(screenX(cam, p), `lat ${lat}`).toBeCloseTo(-0.5, 1);
      expect(jump, 'no jolt as the circling turns to settle').toBeLessThan(0.1);
      // settled on a front three-quarter view from the kart's −X side: its nose points into the frame, toward the list
      const r = rel(cam, p);
      expect(r.ahead).toBeGreaterThan(2.5);
      expect(r.side).toBeLessThan(-1);
      expect(Math.atan2(r.side, r.ahead)).toBeCloseTo(CELEBRATE.besideAngle, 1);
    }
    // reduced motion: one cut there
    const cam = new FinishCam(), p = at(160, 0), c = chase(p);
    cam.start(track, p.k, p.root, p.h, c.pos, c.look, 64);
    for (let i = 0; i < 60; i++) cam.update(track, p.k, p.root, p.h, true, 1 / 60, aspect);
    cam.besideAt(-0.45);
    cam.update(track, p.k, p.root, p.h, true, 1 / 60, aspect);
    expect(screenX(cam, p)).toBeCloseTo(-0.45, 2);
    expect(Math.atan2(rel(cam, p).side, rel(cam, p).ahead)).toBeCloseTo(CELEBRATE.besideAngle, 3);
  });

  it('reduced motion: the chase view holds, then one cut to the front shot, and it stays there (no swing, no circling)', () => {
    const cam = new FinishCam();
    const p = at(60, 0);
    const c = chase(p);
    cam.start(track, p.k, p.root, p.h, c.pos, c.look, 62);
    cam.update(track, p.k, p.root, p.h, true, CELEBRATE.reducedHold * 0.9);
    const held = rel(cam, p);
    expect(held.ahead).toBeLessThan(-CAM.back + 0.3);
    cam.update(track, p.k, p.root, p.h, true, CELEBRATE.reducedHold * 0.2);
    const cut = rel(cam, p);
    expect(cut.ahead).toBeGreaterThan(2.5);
    for (let i = 0; i < 300; i++) cam.update(track, p.k, p.root, p.h, true, 1 / 60);
    const later = rel(cam, p);
    expect(Math.abs(later.side - cut.side)).toBeLessThan(1e-6);
    expect(Math.abs(later.ahead - cut.ahead)).toBeLessThan(1e-6);
  });
});
