// The podium ceremony (podium.ts): where it stands on every track (on the grid, facing back down
// it, on the road), who stands where, what it costs to draw, and the ceremony's timeline: the
// reactions 3rd, 2nd, 1st, the cup popping up, confetti, fireworks behind it, the crowd cheering,
// the camera craning in and sweeping in front (reduced motion: still shots cut in turn).
import { describe, expect, it, vi } from 'vitest';
import type { Material, Mesh, Object3D } from 'three';
import type { Crowd } from '../art-pipeline/crowd.ts';
import { isShared } from '../art-pipeline/index.ts';
import type { TrackSample } from '../kart-controller/types.ts';
import { buildTrack } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { BLOCK, platePlace, Podium, PODIUM, PODIUM_REACTIONS, podiumSpot, type PodiumFx } from './podium.ts';

const DEFS = Object.values(import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' })) as TrackDefinition[];
const TOP = [{ racerId: 'boulder', archetype: 'heavy' as const }, { racerId: 'pip', archetype: 'light' as const, look: { paint: 'pip-alt' } }, { racerId: 'otto', archetype: 'medium' as const }];
const dot = (a: readonly number[], b: readonly number[]) => a[0] * b[0] + a[2] * b[2];

describe('where the podium stands', () => {
  it.each(DEFS.map((d) => [d.id, d] as const))('%s: on the grid behind the line, in the middle of the road, facing back down it, all of it on the road', (_id, def) => {
    const track = buildTrack(def);
    const sp = podiumSpot(track);
    const s: TrackSample = { position: [0, 0, 0], tangent: [0, 0, 0], normal: [0, 0, 0], groundY: 0, halfWidth: 0, surface: 'road', gripScale: 1 };
    const hint = track.nearestGlobal(sp.middle);
    track.sampleInto(hint.t, 0, hint.branch, s);
    // PODIUM.back metres before the start line, along the lap
    const behind = ((track.startT - hint.t + 1) % 1) * track.length;
    expect(behind).toBeCloseTo(PODIUM.back, 0);
    expect(Math.hypot(sp.middle[0] - s.position[0], sp.middle[2] - s.position[2])).toBeLessThan(0.5);
    expect(sp.middle[1]).toBeCloseTo(s.groundY, 3);
    expect(dot(sp.front, s.tangent)).toBeLessThan(-0.95);
    const halfWide = (3 * PODIUM.width + 2 * PODIUM.gap) / 2 + 0.4;
    expect(halfWide).toBeLessThan(s.halfWidth - 1);
    // and the camera's arc in front of it stays within the road's walls
    expect(PODIUM.radius * Math.sin(PODIUM.arc)).toBeLessThan((s.wall ?? s.halfWidth) - 0.5);
  });
});

describe('the podium', () => {
  const track = buildTrack(DEFS.find((d) => d.id === 'harbour-loop')!);

  it('1st on the top step in the middle, 2nd on the audience\'s left, 3rd on the right, all facing the audience; a handful of draws', () => {
    const p = new Podium(track, TOP, 'harbour');
    const sp = p.spot;
    const [first, second, third] = p.views.map((v) => v.root);
    p.start();
    p.update(1 / 60, false, null);
    const rel = (o: Object3D) => ({ across: dot([o.position.x - sp.middle[0], 0, o.position.z - sp.middle[2]], sp.right), up: o.position.y - sp.middle[1] });
    expect(rel(first).across).toBeCloseTo(0, 6);
    expect(rel(second).across).toBeLessThan(-2);
    expect(rel(third).across).toBeGreaterThan(2);
    expect(rel(first).up).toBeCloseTo(PODIUM.heights[0], 6);
    expect(rel(second).up).toBeCloseTo(PODIUM.heights[1], 6);
    expect(rel(third).up).toBeCloseTo(PODIUM.heights[2], 6);
    for (const r of [first, second, third]) expect(Math.cos(r.rotation.y - sp.facing)).toBeCloseTo(1, 6);
    expect(p.group.getObjectByName('podium-boulder')).toBeDefined();
    let draws = 0;
    p.group.traverseVisible((o) => { if ((o as Mesh).isMesh) draws++; });
    expect(draws).toBeLessThanOrEqual(10);
    p.dispose();
  });

  it('each place plate sits whole and centred on its own block\'s front, between the band round its foot and the lip of its top (review 25 Sept 2026: the "3" ran under its lip)', () => {
    const p = new Podium(track, TOP, 'harbour');
    const plates = p.group.getObjectByName('podium-places') as Mesh;
    const pos = plates.geometry.getAttribute('position');
    // (in the podium's own frame: 1st in the middle, 2nd on the audience's left, 3rd on the right)
    const across = PODIUM.width + PODIUM.gap, xs = [0, -across, across];
    for (let i = 0; i < 3; i++) {
      const h = PODIUM.heights[i];
      let lo = Infinity, hi = -Infinity;
      for (let k = 0; k < pos.count; k++) {
        if (Math.abs(pos.getX(k) - xs[i]) > PODIUM.width / 2) continue;
        lo = Math.min(lo, pos.getY(k)); hi = Math.max(hi, pos.getY(k));
      }
      expect(lo, `plate ${i + 1} clears the band`).toBeGreaterThanOrEqual(BLOCK.foot);
      expect(hi, `plate ${i + 1} stays under the lip`).toBeLessThanOrEqual(h - BLOCK.lip - 0.02);
      // centred on the front the block shows between them
      expect((lo + hi) / 2).toBeCloseTo((BLOCK.foot + h - BLOCK.lip) / 2, 1);
      expect(platePlace(h).size, `plate ${i + 1} big enough to read from the ceremony camera`).toBeGreaterThanOrEqual(0.28);
    }
    p.dispose();
  });

  it('the blocks and the plates take the karts\' shadows, but their fronts turned from the sun no shadow lookup (they streaked with acne), by day and by night', () => {
    for (const biome of ['harbour', 'boardwalk']) {
      const p = new Podium(track, TOP, biome);
      for (const name of ['podium-blocks', 'podium-places']) {
        const m = p.group.getObjectByName(name) as Mesh;
        expect(m.receiveShadow, name).toBe(true);
        expect((m.material as Material).customProgramCacheKey(), `${biome} ${name}`).toContain('|sunless');
      }
      p.dispose();
    }
  });

  it('a frame of no time (paused, hidden, a warm-up\'s late clock) never loses the three: their poses stay finite', () => {
    const p = new Podium(track, TOP, 'harbour');
    p.start();
    for (const dt of [1 / 60, 0, 0, 1 / 60, 0, 1 / 30]) p.update(dt, false, null);
    for (const v of p.views) {
      v.root.updateMatrixWorld(true);
      v.root.traverse((o) => { for (const e of o.matrixWorld.elements) expect(Number.isFinite(e)).toBe(true); });
    }
    p.dispose();
  });

  it('is hidden until the ceremony starts, and hides again after', () => {
    const p = new Podium(track, TOP, 'harbour');
    expect(p.group.visible).toBe(false);
    expect(p.showing).toBe(false);
    p.update(1, false, null); // before start: nothing moves
    expect(p.time).toBe(-1);
    p.start();
    expect(p.group.visible && p.showing).toBe(true);
    p.stop();
    expect(p.group.visible || p.showing).toBe(false);
    p.dispose();
  });

  it('the ceremony: 3rd, 2nd, then 1st react, each their own; the cup pops up; confetti, fireworks behind and above; the crowd keeps cheering', () => {
    const shift = vi.fn();
    const p = new Podium(track, TOP, 'harbour', { shift } as unknown as Crowd);
    const fired: number[][] = [];
    let confetti = 0;
    const fx: PodiumFx = { firework: (x, y, z) => { fired.push([x, y, z]); }, confettiRain: (_x, _y, _z, _r, n) => { confetti += n; } };
    p.start();
    const run = (seconds: number) => { for (let t = 0; t < seconds - 1e-9; t += 1 / 60) p.update(1 / 60, false, fx, t); };
    run(0.5);
    expect(p.views.map((v) => v.anim.reacting)).toEqual([null, null, 'bounce']);
    run(0.5);
    expect(p.views.map((v) => v.anim.reacting)).toEqual([null, 'cheer', 'bounce']);
    expect((p.group.getObjectByName('podium-cup') as Mesh).scale.x).toBeLessThan(0.01);
    run(2);
    expect(p.views.map((v) => v.anim.reacting)).toEqual([...PODIUM_REACTIONS]);
    expect((p.group.getObjectByName('podium-cup') as Mesh).scale.x).toBeCloseTo(1, 2);
    run(4);
    expect(confetti).toBeGreaterThan(PODIUM.confetti * 6);
    expect(fired.length).toBeGreaterThan(4);
    for (const f of fired) {
      expect(dot([f[0] - p.spot.middle[0], 0, f[2] - p.spot.middle[2]], p.spot.front), 'behind the podium').toBeLessThan(-PODIUM.fwBack[0] + 0.01);
      expect(f[1] - p.spot.middle[1]).toBeGreaterThanOrEqual(PODIUM.fwUp[0]);
    }
    expect(shift.mock.calls.length).toBeGreaterThanOrEqual(3);
    p.dispose();
  });

  it('the camera cranes down and in, then sweeps slowly across the front, above the road', () => {
    const p = new Podium(track, TOP, 'harbour');
    const sp = p.spot;
    p.start();
    p.update(1 / 60, false, null);
    const at = () => ({ out: dot([p.pos[0] - sp.middle[0], 0, p.pos[2] - sp.middle[2]], sp.front), across: dot([p.pos[0] - sp.middle[0], 0, p.pos[2] - sp.middle[2]], sp.right), up: p.pos[1] - sp.middle[1] });
    const start = at();
    expect(start.out).toBeCloseTo(PODIUM.craneFrom[0], 0);
    expect(start.up).toBeCloseTo(PODIUM.craneFrom[1], 0);
    let widest = 0, last = start, step = 0;
    for (let i = 0; i < 60 * 30; i++) {
      p.update(1 / 60, false, null);
      const a = at();
      expect(a.out, 'in front of the podium').toBeGreaterThan(PODIUM.radius * Math.cos(PODIUM.arc) - 0.1);
      expect(a.up).toBeGreaterThan(PODIUM.height - 0.01);
      if (p.time > PODIUM.crane) widest = Math.max(widest, Math.abs(a.across));
      step = Math.max(step, Math.hypot(a.out - last.out, a.across - last.across, a.up - last.up));
      last = a;
    }
    expect(widest).toBeGreaterThan(PODIUM.radius * Math.sin(PODIUM.arc) * 0.9);
    expect(step, 'smooth: no cut').toBeLessThan(0.15);
    expect(p.look[1] - sp.middle[1]).toBeCloseTo(PODIUM.aim, 6);
    p.dispose();
  });

  it('reduced motion: still shots cut in turn (wide, then the winner close), the cup there from the start, fewer fireworks', () => {
    const p = new Podium(track, TOP, 'harbour');
    let fireworks = 0, calm = 0;
    const fx: PodiumFx = { firework: (_x, _y, _z, _h, reduced) => { fireworks++; if (reduced) calm++; }, confettiRain: () => {} };
    p.start();
    p.update(1 / 60, true, fx);
    expect((p.group.getObjectByName('podium-cup') as Mesh).scale.x).toBe(1);
    const wide = [...p.pos];
    for (let i = 0; i < 60 * 4; i++) p.update(1 / 60, true, fx);
    expect(p.pos).toEqual(wide);
    for (let i = 0; i < 60 * 2; i++) p.update(1 / 60, true, fx);
    const close = Math.hypot(p.pos[0] - p.spot.middle[0], p.pos[2] - p.spot.middle[2]);
    expect(close).toBeLessThan(PODIUM.radius - 2);
    expect(fireworks).toBe(calm);
    expect(fireworks).toBeLessThan(6 / PODIUM.firework);
    p.dispose();
  });

  it('frees its own geometry, materials and texture and the karts\' own material copies, never a shared one', () => {
    const p = new Podium(track, TOP, 'harbour');
    const mats: Material[] = [];
    p.group.traverse((o) => { const m = (o as Mesh).material as Material | Material[] | undefined; if (m) mats.push(...(Array.isArray(m) ? m : [m])); });
    const spies = mats.map((m) => vi.spyOn(m, 'dispose'));
    p.dispose();
    expect(mats.some((m) => isShared(m)), 'the blocks wear the shared vertex toon').toBe(true);
    mats.forEach((m, i) => expect(spies[i].mock.calls.length > 0, m.type).toBe(!isShared(m)));
    expect(p.group.parent).toBeNull();
  });
});
