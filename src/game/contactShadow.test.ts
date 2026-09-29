import { describe, expect, it } from 'vitest';
import { Group, Vector3 } from 'three';
import { KART_FIT } from '../art-pipeline/index.ts';
import { createKartState } from '../kart-controller/types.ts';
import { CONTACT, ContactShadows, contactAlpha, contactShade } from './contactShadow.ts';

describe('the contact shade under a kart (second MKW gap review, 28 Sept 2026, item 5: grounded under lighter shadows)', () => {
  it('is darkest under the body, still dark at the wheels, and gone a hand past them', () => {
    expect(contactAlpha(0, 0)).toBeCloseTo(CONTACT.strength, 5);
    // a wheel's contact sits near the fitted footprint's corners: 0.75 across, 0.85 along
    const wx = 0.75 / CONTACT.halfWidth, wz = 0.85 / CONTACT.halfLength;
    expect(contactAlpha(wx, wz)).toBeGreaterThan(0.3 * CONTACT.strength);
    // nothing at the quad's edge, 10 to 15 cm past the kart's own sides and ends
    expect(contactAlpha(1, 0)).toBe(0);
    expect(contactAlpha(0, 1)).toBe(0);
    expect(CONTACT.halfWidth - KART_FIT.width / 2).toBeGreaterThan(0.1);
    expect(CONTACT.halfWidth - KART_FIT.width / 2).toBeLessThan(0.3);
    expect(CONTACT.halfLength - KART_FIT.length / 2).toBeLessThan(0.3);
    // never black: at least 40% of the light stays (under the kart's own sun shadow, 0.2 of the lit road: MKW's 0.21-0.24)
    expect(CONTACT.strength).toBeLessThanOrEqual(0.6);
  });

  it('fades as the body leaves the road, near the lens and far off', () => {
    expect(contactShade(0, 10)).toBe(1);
    expect(contactShade(CONTACT.rise[1], 10)).toBe(0);
    expect(contactShade(0.2, 10)).toBeGreaterThan(0);
    expect(contactShade(0.2, 10)).toBeLessThan(1);
    expect(contactShade(0, CONTACT.near[0])).toBe(0);
    expect(contactShade(0, CONTACT.far[1] + 1)).toBe(0);
  });

  it('lies on the road under each kart, one draw for the field, and fades out in the air', () => {
    const shades = new ContactShadows(2);
    const views = [0, 1].map((i) => {
      const root = new Group();
      root.position.set(i * 10, 2, 5);
      root.rotation.set(0, i * 0.7, 0.1, 'YXZ');
      return { root, bodyRise: 0 };
    });
    const karts = [createKartState({ racerId: 'a', position: [0, 2, 5] }), createKartState({ racerId: 'b', position: [10, 2, 5] })];
    karts[1].grounded = false;
    for (let f = 0; f < 30; f++) shades.update(views, karts, [0, 6, -5], 1 / 60);
    expect(shades.mesh.count).toBe(2);
    expect(shades.mesh.castShadow).toBe(false);
    const shade = shades.mesh.geometry.getAttribute('shade');
    expect(shade.getX(0)).toBeGreaterThan(0.9);
    expect(shade.getX(1)).toBeLessThan(0.01);
    // kart 0's quad: centred under its root, lifted a little along the root's own up
    const m = new Vector3(), p = new Vector3();
    shades.mesh.getMatrixAt(0, (shades as unknown as { m: import('three').Matrix4 }).m);
    p.setFromMatrixPosition((shades as unknown as { m: import('three').Matrix4 }).m);
    m.set(0, CONTACT.lift, 0).applyQuaternion(views[0].root.quaternion).add(views[0].root.position);
    expect(p.distanceTo(m)).toBeLessThan(1e-6);
    shades.dispose();
  });
});
