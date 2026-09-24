// The design §10 rewards in the art: alt paints (a palette swap of a model file's colour texture or a
// code-built model's vertex colours) and the Classic and Buggy bodies with the racer's driver seated in
// them. Each look builds a valid mesh inside the kart footprint in no more draw calls than it should,
// shares its materials, and a session with one disposes cleanly (never a shared material).
import { describe, expect, it, vi } from 'vitest';
import {
  BufferAttribute, BufferGeometry, DataTexture, Group, Mesh, MeshStandardMaterial, Scene, SRGBColorSpace, type Material, type Texture,
} from 'three';
import { BASE } from '../kart-controller/constants.ts';
import type { RaceConfig } from '../race-manager/types.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { CAST } from '../ui-hud/data/cast.ts';
import { BODIES, SKINS } from '../ui-hud/data/cosmetics.ts';
import { UNLOCKS } from '../ui-hud/unlocks.ts';
import harbour from '../track-builder/tracks/harbour-loop.json';
import { RaceSession } from '../game/session.ts';
import { BODY_EXHAUST, BODY_IDS, KART_COLOURS, SEAT } from './bodies.ts';
import { clipDriver, DRIVER_CUTS, RacerModels } from './glb.ts';
import { bodyColours, buildRacerMesh, exhaustFor, racerGeometry } from './kart.ts';
import { PAINTS, paintFor, repaintHex, repaintPixels, repaintRgb } from './paints.ts';
import { EXHAUST, RACER_IDS } from './racers.ts';
import { isShared, vertexToon } from './toon.ts';

const hue = (hex: string): number => {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return -1;
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return ((h / 6) % 1 + 1) % 1;
};
const meshes = (root: Group) => { const out: Mesh[] = []; root.traverse((o) => { if ((o as Mesh).isMesh) out.push(o as Mesh); }); return out; };

describe('alt paints: a palette swap, not a tint', () => {
  it('every unlockable paint and body the menus name exists in the art, and only those', () => {
    expect(PAINTS.map((p) => [p.id, p.racerId, p.name])).toEqual(SKINS.map((s) => [s.id, s.racerId, s.name]));
    expect([...BODY_IDS]).toEqual(BODIES.map((b) => b.id));
    expect(UNLOCKS.filter((u) => u.kind === 'skin').map((u) => u.id)).toEqual(PAINTS.map((p) => p.id));
    expect(UNLOCKS.filter((u) => u.kind === 'body').map((u) => u.id)).toEqual(BODY_IDS.filter((b) => b !== 'standard'));
    expect(paintFor('pip', 'boulder-alt')).toBeUndefined(); // a paint is its own racer's only
  });

  it('moves each racer\'s own colour families to new hues and leaves tyres, eyes and whites alone', () => {
    const pip = paintFor('pip', 'pip-alt')!.rules, boulder = paintFor('boulder', 'boulder-alt')!.rules, sprocket = paintFor('sprocket', 'sprocket-alt')!.rules;
    // Pip Berry: teal → raspberry, coral → marigold
    expect(hue(repaintHex('#2ec4b6', pip))).toBeCloseTo(0.87, 1);
    expect(hue(repaintHex('#ff6f61', pip))).toBeGreaterThan(0.1);
    // Sprocket Mint: cream → mint, brass → copper
    expect(hue(repaintHex('#f5e6c8', sprocket))).toBeCloseTo(0.45, 1);
    expect(hue(repaintHex('#b08d57', sprocket))).toBeLessThan(0.08);
    // Boulder Frost: mid grey stone → cold blue-grey, moss green → near white snow
    expect(hue(repaintHex('#7a7a7a', boulder))).toBeCloseTo(0.58, 1);
    const snow = repaintHex('#6a994e', boulder);
    for (const k of [1, 3, 5]) expect(parseInt(snow.slice(k, k + 2), 16), snow).toBeGreaterThan(170);
    for (const rules of [pip, boulder, sprocket]) {
      expect(repaintHex('#1b1b2f', rules)).toBe('#1b1b2f'); // tyres and pupils: too dark for any family
      expect(repaintHex('#ffffff', rules)).toBe('#ffffff'); // eye whites
    }
    // a pixel buffer is repainted in place, alpha untouched
    const px = new Uint8ClampedArray([0x2e, 0xc4, 0xb6, 77, 0, 0, 0, 255]);
    repaintPixels(px, pip);
    expect(px[3]).toBe(77);
    expect([px[4], px[5], px[6], px[7]]).toEqual([0, 0, 0, 255]);
    expect(hue(`#${[px[0], px[1], px[2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`)).toBeCloseTo(0.87, 1);
    expect(repaintRgb(0.5, 0.5, 0.5, [])).toEqual([0.5, 0.5, 0.5]);
  });

  it('a code-built kart in an alt paint: new vertex colours, the same shape, built once and shared', () => {
    for (const p of PAINTS) {
      const own = racerGeometry(p.racerId)!.body, alt = racerGeometry(p.racerId, { paint: p.id })!.body;
      expect(racerGeometry(p.racerId, { paint: p.id })!.body).toBe(alt); // cached
      expect(alt.getAttribute('position').array).toEqual(own.getAttribute('position').array);
      const a = own.getAttribute('color').array, b = alt.getAttribute('color').array;
      let changed = 0;
      for (let i = 0; i < a.length; i += 3) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 0.05) changed++;
      expect(changed / (a.length / 3), p.id).toBeGreaterThan(0.2); // a real share of the kart changes colour
      const m = buildRacerMesh(p.racerId, { paint: p.id })!;
      expect(meshes(m).map((x) => x.material)).toEqual([vertexToon()]); // one draw call, the shared material
    }
  });

  it('a model file in an alt paint: its colour texture repainted once into one shared material for every kart', () => {
    const models = new RacerModels('/', () => Promise.reject(new Error('no network in tests')));
    const map = new DataTexture(new Uint8Array([0x2e, 0xc4, 0xb6, 255]), 1, 1);
    map.colorSpace = SRGBColorSpace;
    const base = new MeshStandardMaterial({ map });
    base.userData.shared = true;
    const template = new Group();
    template.add(new Mesh(new BufferGeometry(), base));
    (models as unknown as { templates: Map<string, Group> }).templates.set('pip', template);
    const repaint = vi.fn((t: Texture, rules) => { const c = t.clone(); const d = new Uint8ClampedArray((t.image as { data: Uint8Array }).data); repaintPixels(d, rules); c.image = { data: d, width: 1, height: 1 }; return c; });
    models.repaintTexture = repaint;
    const a = models.make('pip', 'pip-alt')!, b = models.make('pip', 'pip-alt')!, own = models.make('pip')!;
    const ma = meshes(a)[0].material as MeshStandardMaterial;
    expect(ma).toBe(meshes(b)[0].material); // shared by every kart in the paint
    expect(ma).not.toBe(base);
    expect(meshes(own)[0].material).toBe(base);
    expect(repaint).toHaveBeenCalledTimes(1); // repainted once
    expect(isShared(ma)).toBe(true); // a finished race never disposes it
    expect(hue(`#${[...((ma.map!.image as { data: Uint8ClampedArray }).data).slice(0, 3)].map((v) => v.toString(16).padStart(2, '0')).join('')}`)).toBeCloseTo(0.87, 1);
    expect(models.make('pip', 'boulder-alt')).not.toBeNull(); // another racer's paint: their own colours
    expect(meshes(models.make('pip', 'boulder-alt')!)[0].material).toBe(base);
  });
});

describe('Classic and Buggy bodies', () => {
  it('every racer on every body: a valid vertex-coloured mesh on the ground, inside the footprint, one draw call without a model file', () => {
    for (const racerId of RACER_IDS) for (const body of ['classic', 'buggy'] as const) {
      const root = buildRacerMesh(racerId, { body })!;
      const ms = meshes(root);
      expect(ms.length, `${racerId} ${body}`).toBe(1); // code-built body and driver, merged
      const g = ms[0].geometry;
      for (const a of ['position', 'normal', 'color']) expect(g.hasAttribute(a), `${racerId} ${body} ${a}`).toBe(true);
      g.computeBoundingBox();
      const bb = g.boundingBox!;
      expect(bb.min.y, `${racerId} ${body}`).toBeGreaterThanOrEqual(-0.01);
      expect(bb.max.y, `${racerId} ${body}`).toBeLessThan(2.4);
      expect(bb.max.x - bb.min.x, `${racerId} ${body}`).toBeLessThan(BASE.kartRadius * 2.1);
      expect(bb.max.z - bb.min.z, `${racerId} ${body}`).toBeLessThan(BASE.kartRadius * 2.9);
      expect(g.index!.count / 3, `${racerId} ${body}`).toBeLessThan(9000);
      expect(ms[0].material).toBe(vertexToon());
      // the flames burn from the body's pipes in the racer's own colour
      expect(root.userData.exhaust).toEqual({ ...BODY_EXHAUST[body], flame: EXHAUST[racerId].flame });
    }
    expect(exhaustFor('pip')).toBe(EXHAUST.pip);
    expect(exhaustFor('pip', { body: 'standard' })).toBe(EXHAUST.pip);
  });

  it('a body wears its racer\'s two colours, or the paint\'s', () => {
    expect(bodyColours('pip')).toEqual(KART_COLOURS.pip);
    const berry = bodyColours('pip', 'pip-alt');
    expect(hue(berry.primary)).toBeCloseTo(0.87, 1);
    expect(bodyColours('boulder', 'boulder-alt')).toEqual({ primary: '#8ea4ba', secondary: '#eef4f8' });
    // the painted body is its own geometry, the unpainted one untouched
    expect(racerGeometry('pip', { body: 'classic', paint: 'pip-alt' })!.body).not.toBe(racerGeometry('pip', { body: 'classic' })!.body);
  });

  it('a driver cut from a model file: only the triangles inside the cut, moved onto the seat; with its body, two draw calls', () => {
    // two triangles: one low (the old kart's floor), one high (the driver's head)
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array([
      -0.2, 0.1, 0, 0.2, 0.1, 0, 0, 0.1, 0.3, // low
      -0.1, 1.4, 0, 0.1, 1.4, 0, 0, 1.6, 0, // high
    ]), 3));
    g.setAttribute('normal', new BufferAttribute(new Float32Array(18).fill(0), 3));
    g.setAttribute('uv', new BufferAttribute(new Float32Array(12).fill(0.5), 2));
    const cut = { y: 0.6, x: 0.5, z: [-0.5, 0.5] as const, at: 0.1 };
    const out = clipDriver(g, cut);
    expect(out.index!.count).toBe(3);
    expect(out.getAttribute('position').count).toBe(3); // compacted
    expect(out.getAttribute('uv').count).toBe(3);
    const p = out.getAttribute('position');
    expect(p.getY(0)).toBeCloseTo(1.4 + SEAT.y - cut.y, 6);
    expect(p.getZ(0)).toBeCloseTo(SEAT.z - cut.at, 6);
    expect(clipDriver(g, { ...cut, drop: [[-1, 1, 1, 2, -1, 1]] }).index!.count).toBe(0); // a drop box takes the head too
    expect(Object.keys(DRIVER_CUTS).sort()).toEqual([...RACER_IDS].sort());

    // a model file's driver, seated: shared cut geometry, the model's (or the paint's) material
    const models = new RacerModels('/', () => Promise.reject(new Error('offline')));
    const base = new MeshStandardMaterial();
    const template = new Group();
    template.add(new Mesh(g, base));
    (models as unknown as { templates: Map<string, Group> }).templates.set('gus', template);
    const d1 = models.driver('gus')!, d2 = models.driver('gus')!;
    expect(d1.geometry).toBe(d2.geometry);
    expect(d1.material).toBe(base);
    expect(models.driver('nobody')).toBeNull();
  });
});

describe('a race with the player in a look', () => {
  it('builds the player\'s kart in it, the rivals in their own, and disposes without touching a shared material', () => {
    const def = harbour as unknown as TrackDefinition;
    const config: RaceConfig = {
      mode: 'quick', trackId: def.id, speedClass: 150, seed: 1, laps: 3,
      racers: CAST.map((c, i) => ({ racerId: c.id, archetype: c.archetype, isPlayer: i === 0 })),
    };
    const s = new RaceSession(new Scene(), def, config, { body: 'buggy', paint: 'pip-alt' });
    const player = s.views[s.playerIndex].root;
    const kart = player.getObjectByName('racer-pip')!;
    expect(kart.userData.exhaust).toEqual({ ...BODY_EXHAUST.buggy, flame: EXHAUST.pip.flame });
    expect(s.views.filter((_, i) => i !== s.playerIndex).every((v) => !v.root.getObjectByName(`racer-${config.racers[0].racerId}`))).toBe(true);
    const shared: Material[] = [];
    s.views.forEach((v) => v.root.traverse((o) => { const m = (o as Mesh).material as Material | undefined; if (m && isShared(m)) shared.push(m); }));
    const spies = shared.map((m) => vi.spyOn(m, 'dispose'));
    s.dispose();
    for (const sp of spies) expect(sp).not.toHaveBeenCalled();
    // and the geometry cache is untouched: the next race builds the same kart from it
    expect(racerGeometry('pip', { body: 'buggy', paint: 'pip-alt' })!.body.getAttribute('position')).toBeDefined();
  }, 120_000);
});
