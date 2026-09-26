// The racer screen's hero turntable: the focused racer in their look on a pedestal, built again only
// when the racer or look changes, turning (or standing still for reduced motion), and giving back its
// own material copies, never a shared one.
import { describe, expect, it, vi } from 'vitest';
import type { Material, Mesh } from 'three';
import { isShared } from '../art-pipeline/index.ts';
import { frameDistance, MAX_DISTANCE, MIN_DISTANCE, Showroom, STILL_YAW, TURN_RATE } from './showroom.ts';

const kartOf = (s: Showroom) => s.scene.getObjectByName('racer-pip') ?? s.scene.getObjectByName('racer-boulder');
const mats = (o: { traverse(f: (x: unknown) => void): void }) => { const out: Material[] = []; o.traverse((x) => { const m = (x as Mesh).material as Material | undefined; if ((x as Mesh).isMesh && m) out.push(m); }); return out; };

describe('the showroom', () => {
  it('shows the look, rebuilds only on a change, frees only its own material copies', () => {
    const s = new Showroom();
    s.show('pip', { paint: 'pip-alt', body: 'classic' });
    const first = kartOf(s)!;
    expect(first.userData.exhaust).toBeDefined();
    s.show('pip', { paint: 'pip-alt', body: 'classic' });
    expect(kartOf(s)).toBe(first); // same look: not built again
    const own = mats(first);
    expect(own.every((m) => !isShared(m))).toBe(true); // its own copies (no near-camera fade)
    const spies = own.map((m) => vi.spyOn(m, 'dispose'));
    s.show('boulder', {});
    expect(s.scene.getObjectByName('racer-pip')).toBeUndefined();
    for (const sp of spies) expect(sp).toHaveBeenCalled();
    expect(s.showing.startsWith('boulder||')).toBe(true);
    s.dispose();
  });

  it('turns at TURN_RATE, stands at a three-quarter view with reduced motion, and pulls back for a narrow box', () => {
    const s = new Showroom();
    s.show('pip', {});
    const stand = kartOf(s)!.parent!;
    s.update(2, false, 0.8);
    expect(stand.rotation.y).toBeCloseTo(2 * TURN_RATE, 6);
    s.update(2, true, 0.8);
    expect(stand.rotation.y).toBe(STILL_YAW);
    const far = s.camera.position.z;
    s.update(2, true, 1.4);
    expect(s.camera.position.z).toBeLessThan(far);
    expect(s.camera.aspect).toBe(1.4);
    s.dispose();
  });

  it('frames a bigger kart farther back, so the hero fills the same share of the panel whatever its size (was one fixed shot for every kart: "the kart looks small in a big panel")', () => {
    const s = new Showroom();
    s.show('pip', {});
    s.update(0, true, 16 / 9);
    const zSmall = s.camera.position.z, ySmall = s.camera.position.y;
    s.show('boulder', {}); // the tall racer: a bigger kart-plus-driver bounding sphere
    s.update(0, true, 16 / 9);
    expect(s.camera.position.z).toBeGreaterThan(zSmall);
    expect(s.camera.position.y).toBeGreaterThan(ySmall); // a taller kart's own bounding-sphere centre sits higher, not the old fixed look-at
    s.dispose();
  });

  it('frameDistance: the geometry behind the hero shot (a fixed fov, only distance solved)', () => {
    // radius 5 throughout: comfortably between MIN_DISTANCE and MAX_DISTANCE unclamped, so the clamp never masks the geometry
    // fov 90, fill 1 (no margin), aspect 1: half-angle 45 deg both ways, dist = r / sin(45deg)
    expect(frameDistance(5, 90, 1, 1)).toBeCloseTo(5 / Math.sin(Math.PI / 4), 6);
    // a wider aspect only relieves the horizontal fit: vertical (unchanged) still binds, so distance is unchanged
    expect(frameDistance(5, 90, 2, 1)).toBeCloseTo(5 / Math.sin(Math.PI / 4), 6);
    // a narrower aspect tightens the horizontal fit past the vertical one, so it binds instead and distance grows
    const narrow = frameDistance(5, 90, 0.5, 1);
    expect(narrow).toBeGreaterThan(5 / Math.sin(Math.PI / 4));
    expect(narrow).toBeCloseTo(5 / Math.sin(Math.atan(0.5)), 6);
    // a bigger sphere at the same fov and aspect needs proportionally more distance
    expect(frameDistance(10, 90, 1, 1)).toBeCloseTo(2 * frameDistance(5, 90, 1, 1), 6);
    // clamped so a huge or tiny mesh never breaks the shot
    expect(frameDistance(1000, 90, 1)).toBe(MAX_DISTANCE);
    expect(frameDistance(0.001, 90, 1)).toBe(MIN_DISTANCE);
  });
});
