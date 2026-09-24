// The racer screen's hero turntable: the focused racer in their look on a pedestal, built again only
// when the racer or look changes, turning (or standing still for reduced motion), and giving back its
// own material copies, never a shared one.
import { describe, expect, it, vi } from 'vitest';
import type { Material, Mesh } from 'three';
import { isShared } from '../art-pipeline/index.ts';
import { Showroom, STILL_YAW, TURN_RATE } from './showroom.ts';

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
});
