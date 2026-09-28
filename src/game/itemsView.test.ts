import { describe, expect, it } from 'vitest';
import { BatchedMesh, Matrix4, Object3D, Vector3, Vector4, type BufferGeometry, type InstancedMesh, type Material } from 'three';
import { ENERGY_ITEM_KINDS, ITEM_MODEL_KINDS, ITEM_PICKUP_GLOW, itemGeometry, SOLID_ITEM_KINDS } from '../art-pipeline/index.ts';
import { createKartState } from '../kart-controller/types.ts';
import { ITEMS_CONFIG } from '../items/data.ts';
import { CAM } from './camera.ts';
import { ROSTER } from './racers.ts';
import { BATCHED_ITEMS, ENERGY_ITEMS, ItemsView, JET_LOOK, LASER, MINE } from './itemsView.ts';

/** A frame's items: these projectiles and ground items out, nothing held, `extra` over the rest of the state. */
const out = (projectiles: object[], groundItems: object[] = [], extra: object = {}, trailing = false) =>
  ({ cfg: ITEMS_CONFIG, state: { projectiles, groundItems, pogo: [], shieldRemaining: [], ...extra }, isTrailing: () => trailing }) as never;
const flying = (id: number, itemId: string) => ({ id, itemId, graceRemaining: 0, age: 0, weave: 0, weaveSeconds: 1, position: [id, 0.5, 0], prevPosition: [id, 0.5, -0.1] });
const kart = (racerId = 'pip', position: [number, number, number] = [0, 0, 0]) => createKartState({ racerId, position });
const rootOf = (p: [number, number, number]) => { const o = new Object3D(); o.position.set(...p); return o; };

describe('items view', () => {
  it('dispose frees both batches, the slick\'s instances and the shield\'s sphere, never the shared item models', () => {
    const view = new ItemsView();
    const own = view.root.children.filter((m) => !(m as BatchedMesh).isBatchedMesh) as InstancedMesh[];
    const shared = new Set<BufferGeometry | null>(ITEM_MODEL_KINDS.map((k) => itemGeometry(k)));
    const freed = new Set<object>();
    for (const m of own) {
      m.addEventListener('dispose', () => freed.add(m));
      m.geometry.addEventListener('dispose', () => freed.add(m.geometry));
    }
    for (const b of [view.batch, view.light]) b.geometry.addEventListener('dispose', () => freed.add(b.geometry));
    view.dispose();
    for (const m of own) expect(freed.has(m), `${m.geometry.type} instances`).toBe(true);
    const made = own.map((m) => m.geometry).filter((g) => !shared.has(g));
    expect(made).toHaveLength(1); // the shield's sphere (with its per-copy attribute)
    for (const g of made) expect(freed.has(g)).toBe(true);
    for (const b of [view.batch, view.light]) {
      expect(freed.has(b.geometry), 'a batch\'s own copy of the models').toBe(true);
      expect(shared.has(b.geometry)).toBe(false);
    }
    for (const g of shared) if (g) expect(freed.has(g)).toBe(false);
  });

  it('the solid kinds are one batch (one draw a pass) and their glows another (one draw, no shadow), drawn only while one is out', () => {
    const view = new ItemsView();
    expect([view.batch.isBatchedMesh, view.light.isBatchedMesh]).toEqual([true, true]);
    expect([view.batch.castShadow, view.light.castShadow]).toEqual([true, false]);
    expect(Object.keys(BATCHED_ITEMS).sort()).toEqual([...SOLID_ITEM_KINDS].sort());
    expect(Object.keys(ENERGY_ITEMS).sort()).toEqual([...ENERGY_ITEM_KINDS].sort());
    // every other draw is the slick's or the shield's instancer
    const own = view.root.children.filter((m) => m !== view.batch && m !== view.light) as InstancedMesh[];
    expect(own.map((m) => m.geometry === itemGeometry('oilSlick') || m.geometry.type === 'SphereGeometry')).toEqual([true, true]);
    view.onFrame(out([]), [], [], 1, 0);
    expect([view.batch.visible, view.light.visible], 'nothing out: not drawn').toEqual([false, false]);
    // three kinds in flight (two bolts), a slick and a mine: still one object to draw, and one for their light
    view.onFrame(out([flying(1, 'beachBall'), flying(2, 'homingKite'), flying(3, 'windUpMouse'), flying(4, 'beachBall')], [
      { id: 5, itemId: 'decoyBalloon', position: [0, 0, 5] }, { id: 6, itemId: 'oilCan', position: [0, 0, 9] },
    ]), [], [], 1, 0);
    expect([view.batch.visible, view.light.visible]).toEqual([true, true]);
    expect(['laserBolt', 'rocket', 'drone', 'mine', 'canister', 'nitro', 'oilSlick'].map((k) => view.shownOf(k))).toEqual([2, 1, 1, 1, 1, 0, 1]);
    // the bolts' halos, the rocket's flame and nozzle glow, the drone's rotors
    expect(['boltGlow', 'flameHot', 'droneFx'].map((k) => view.shownOf(k))).toEqual([2, 1, 1]);
    // and back to none: every copy hidden again, neither batch drawn
    view.onFrame(out([]), [], [], 1, 0);
    expect([view.batch.visible, view.light.visible]).toEqual([false, false]);
    expect(['laserBolt', 'rocket', 'drone', 'mine', 'canister', 'boltGlow'].map((k) => view.shownOf(k))).toEqual([0, 0, 0, 0, 0, 0]);
    view.dispose();
  });

  it('a Laser Blaster bolt stretches out of its orb over the thrower\'s grace, never popping', () => {
    const view = new ItemsView();
    const lengthAt = (graceRemaining: number) => {
      const p = { ...flying(1, 'beachBall'), graceRemaining };
      view.onFrame(out([p]), [], [], 1, 0);
      return new Vector3().setFromMatrixScale(view.matrixOf('laserBolt', 0, new Matrix4())).z;
    };
    expect(lengthAt(ITEMS_CONFIG.ownerGraceSeconds)).toBeCloseTo(LASER.born, 6);
    const mid = lengthAt(ITEMS_CONFIG.ownerGraceSeconds / 2);
    expect(mid).toBeGreaterThan(LASER.born);
    expect(mid).toBeLessThan(1);
    expect(lengthAt(0)).toBeCloseTo(1, 6);
    view.dispose();
  });

  it('a Decoy Mine is a pickup balloon until a kart comes near: then its red light blinks, faster the nearer', () => {
    const view = new ItemsView();
    const mine = [{ id: 7, itemId: 'decoyBalloon', position: [0, 0, 0] }];
    /** blinks shown over a second of frames with a kart `d` metres off */
    const blinks = (d: number) => {
      let on = 0, turns = 0, was = false;
      for (let f = 0; f < 120; f++) {
        view.onFrame(out([], mine), [kart('pip', [d, 0, 0])], [rootOf([d, 0, 0])], 1, f / 120, 1 / 120);
        const lit = view.shownOf('mineLight') > 0;
        if (lit) on++;
        if (lit && !was) turns++;
        was = lit;
      }
      return { on, turns };
    };
    expect(blinks(MINE.warn + 1)).toEqual({ on: 0, turns: 0 });
    const far = blinks(MINE.warn - 1), near = blinks(2);
    expect(far.on).toBeGreaterThan(0);
    expect(near.turns).toBeGreaterThan(far.turns);
    // it wears the pickup balloons' night glow
    view.onFrame(out([], mine), [], [], 1, 0, 0, undefined, 0.6);
    expect(ITEM_PICKUP_GLOW.value).toBe(0.6);
    ITEM_PICKUP_GLOW.value = 0;
    view.dispose();
  });

  it('Jet Mode: the kart is hidden and the jet flies in its racer\'s colors, its wings folded up as it forms and flat once formed', () => {
    const view = new ItemsView();
    const k = kart('otto');
    const root = rootOf([0, 0, 0]);
    const seconds = ITEMS_CONFIG.items.find((d) => d.id === 'strikeBall')!.behaviour.durationSeconds!;
    const ride = (left: number) => { k.status.rideRemaining = left; view.onFrame(out([]), [k], [root], 1, 0, 1 / 60); };
    ride(seconds - 0.01);
    expect(root.visible).toBe(false);
    for (const part of ['jetHull', 'jetFins', 'jetTrim', 'jetWingL', 'jetWingR']) expect(view.shownOf(part), part).toBe(1);
    expect(view.shownOf('flameBlue'), 'two afterburners').toBe(2);
    // painted: the hull in Otto's accent, the wings in his secondary
    const otto = ROSTER.find((r) => r.id === 'otto')!;
    const color = (kind: string) => {
      const c = new Vector4();
      const ids = (view as unknown as { kinds: Record<string, { ids: Int32Array }> }).kinds[kind].ids;
      view.batch.getColorAt(ids[0], c);
      return [c.x, c.y, c.z].map((v) => +v.toFixed(3));
    };
    expect(color('jetHull')).toEqual(hexToLinear(otto.accent));
    expect(color('jetWingR')).toEqual(hexToLinear(otto.secondary));
    expect(color('jetTrim'), 'the canopy, nozzles and lights in their own colors').toEqual([1, 1, 1]);
    // the wings fold about their roots: folded up (JET_LOOK.folded) as it forms, flat on the hull once formed
    const fold = () => {
      const up = (kind: string) => new Vector3().setFromMatrixColumn(view.matrixOf(kind, 0, new Matrix4()), 1).normalize();
      return up('jetWingR').angleTo(up('jetHull'));
    };
    ride(seconds - 1e-6);
    expect(fold()).toBeCloseTo(JET_LOOK.folded, 2);
    ride(seconds - JET_LOOK.unfold * 2);
    expect(fold()).toBeLessThan(0.01);
    // the ride over: the kart is back
    ride(0);
    expect(root.visible).toBe(true);
    expect(view.shownOf('jetHull')).toBe(0);
    view.dispose();
  });

  it('a Tractor Beam runs from the kart\'s nose to the kart it reels in', () => {
    const view = new ItemsView();
    const a = kart('pip', [0, 0, 0]), b = kart('momo', [0, 0, 20]);
    a.status.towTarget = 1;
    a.status.towRemaining = 1;
    view.onFrame(out([]), [a, b], [rootOf([0, 0, 0]), rootOf([0, 0, 20])], 1, 0, 1 / 60);
    expect(view.shownOf('beamEmitter')).toBe(1);
    expect(view.shownOf('beam')).toBe(1);
    const m = view.matrixOf('beam', 0, new Matrix4());
    const start = new Vector3(0, 0, 0).applyMatrix4(m), end = new Vector3(0, 0, 1).applyMatrix4(m);
    // from the nose (1.15 m ahead) to the lock on the other's tail (1.3 m behind its middle)
    expect(start.z).toBeGreaterThan(1);
    expect(end.z).toBeCloseTo(20 - 1.3, 3);
    view.dispose();
  });

  it('every solid item and every glow dissolves within CAM.nearFade of the lens; the slick and the shield are left be', () => {
    const view = new ItemsView();
    const key = `|near${CAM.nearFade.toFixed(2)}`;
    for (const m of view.root.children as InstancedMesh[]) {
      const mat = m.material as Material;
      if ((mat as { isShaderMaterial?: boolean }).isShaderMaterial) continue;
      expect(mat.customProgramCacheKey(), mat.name).toContain(key);
    }
    view.dispose();
  });
});

/** A hex color as three stores it (linear), to three places. */
function hexToLinear(hex: number): number[] {
  const s = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255].map((v) => v / 255);
  return s.map((c) => +(c < 0.04045 ? c * 0.0773993808 : Math.pow(c * 0.9478672986 + 0.0521327014, 2.4)).toFixed(3));
}
