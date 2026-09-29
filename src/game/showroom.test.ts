// The select screens' stage: the focused racer in their look, built again only when the racer or look
// changes, turning (or standing still for reduced motion), standing in the box the menu leaves for it on
// the whole screen, popping in, and giving back its own material copies, never a shared one.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Box3, ConstantAlphaFactor, CustomBlending, OneMinusConstantAlphaFactor, Vector3, type Material, type Mesh, type Scene, type ShaderMaterial, type WebGLRenderer } from 'three';
import { buildRacerMesh, isShared, RACER_MODELS } from '../art-pipeline/index.ts';
import { riggedTemplate } from '../art-pipeline/__tests__/parts.ts';
import { frameDistance, heroFit, MAX_DISTANCE, MIN_DISTANCE, POP_FROM, POP_S, popScale, Showroom, stageFade, STAND_YAW, STILL_YAW, TURN_RATE } from './showroom.ts';

const kartOf = (s: Showroom) => s.scene.getObjectByName('racer-pip') ?? s.scene.getObjectByName('racer-boulder');
const mats = (o: { traverse(f: (x: unknown) => void): void }) => { const out: Material[] = []; o.traverse((x) => { const m = (x as Mesh).material as Material | undefined; if ((x as Mesh).isMesh && m) out.push(m); }); return out; };

describe('the Racer screen\'s racer standing alone (Adam, 28 Sept 2026: "This part should just show the characters, not the karts")', () => {
  it('stands the racer alone on the stand (no kart), facing you a little from the side without turning, nothing until its model is in; a new racer or one out of a kart says hello with its flourish, and a pick is its flourish again', async () => {
    const t = await riggedTemplate('juniper');
    const spy = vi.spyOn(RACER_MODELS, 'rigged').mockImplementation((id: string) => (id === 'juniper' ? t : undefined));
    const s = new Showroom();
    const view = { w: 1600, h: 900 }, box = { x: 900, y: 100, w: 600, h: 650 };
    s.show('pip', {}, true); // (no model in for Pip here: the backdrop alone until it is)
    expect([s.showing, s.standing]).toEqual(['', null]);
    s.show('juniper', {}, true);
    const fig = s.standing!;
    expect(fig.racerId).toBe('juniper');
    expect(s.scene.getObjectByName('standing-juniper')).toBe(fig.root);
    expect(s.scene.getObjectByName('racer-juniper')).toBeUndefined(); // no kart
    s.update(1, false, view, box);
    expect(fig.flourishing).toBe(true); // hello: its flourish as it comes on show
    const stand = fig.root.parent!;
    for (let t = 1; t < 3; t += 1 / 30) s.update(t, false, view, box);
    expect(stand.rotation.y).toBe(STAND_YAW); // never turning: it moves on its own
    expect(fig.flourishing).toBe(false);
    s.cheer(); // picked
    expect(fig.flourishing).toBe(true);
    // the same racer, same paint: not built again; into a kart (the Kart screen): built as a kart, says hello again
    s.show('juniper', {}, true);
    expect(s.standing).toBe(fig);
    s.show('juniper', {}, false);
    expect(s.standing).toBeNull();
    expect(s.showing.includes('stand')).toBe(false);
    s.dispose();
    spy.mockRestore();
  }, 120_000);

  it('frames each racer by their height: whoever is on show, their feet stand on one line in the box and their head below its top', async () => {
    const ts = { juniper: await riggedTemplate('juniper'), gus: await riggedTemplate('gus') } as Record<string, Awaited<ReturnType<typeof riggedTemplate>>>;
    const spy = vi.spyOn(RACER_MODELS, 'rigged').mockImplementation((id: string) => ts[id]);
    const s = new Showroom();
    const view = { w: 1600, h: 900 }, box = { x: 900, y: 100, w: 600, h: 560 };
    const feetAndHead = (id: string): [number, number] => {
      s.show(id, {}, true);
      s.update(10, true, view, box);
      const fig = s.standing!;
      s.camera.updateMatrixWorld(); // (a render does this)
      fig.root.updateMatrixWorld(true);
      const px = (y: number) => { const p = new Vector3(0, y, 0).applyMatrix4(fig.root.parent!.matrixWorld).project(s.camera); return (1 - p.y) / 2 * view.h; };
      return [px(0), px(new Box3().setFromObject(fig.root, true).max.y)];
    };
    const [jFeet, jHead] = feetAndHead('juniper'), [gFeet, gHead] = feetAndHead('gus');
    expect(Math.abs(jFeet - gFeet), 'the feet on one line').toBeLessThan(6);
    for (const [feet, head] of [[jFeet, jHead], [gFeet, gHead]]) {
      expect(feet).toBeLessThan(box.y + box.h);
      expect(head).toBeGreaterThan(box.y);
      expect((feet - head) / box.h).toBeGreaterThan(0.75); // big in its box
    }
    s.dispose();
    spy.mockRestore();
  }, 120_000);
});

describe('the showroom, while a racer\'s model file is still coming (the second fresh-eyes review\'s item 10)', () => {
  it('shows no code-built stand-in: nothing on the stand until the model is in (or its file failed), then it pops in saying hello', () => {
    let settled = false;
    const spy = vi.spyOn(RACER_MODELS, 'settled').mockImplementation(() => settled);
    const s = new Showroom();
    const view = { w: 1600, h: 900 }, box = { x: 900, y: 100, w: 600, h: 650 };
    s.show('pip', {});
    expect(s.showing).toBe('');
    expect(kartOf(s)).toBeUndefined();
    s.update(1, false, view, box);
    // the file failed (or there is none): the code-built kart, design §4's fallback, pops in
    settled = true;
    s.show('pip', {});
    expect(kartOf(s)).toBeDefined();
    s.update(2, false, view, box);
    expect(kartOf(s)!.parent!.scale.x).toBeLessThan(1); // popping in from POP_FROM
    s.dispose();
    spy.mockRestore();
  });
});

describe('the showroom', () => {
  // (no model files here: each racer's is taken as failed, so the code-built kart stands, as design §4 falls back)
  let settledSpy: ReturnType<typeof vi.spyOn> | null = null;
  beforeEach(() => { settledSpy = vi.spyOn(RACER_MODELS, 'settled').mockReturnValue(true); });
  afterEach(() => { settledSpy?.mockRestore(); settledSpy = null; });

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
    const view = { w: 1600, h: 900 };
    s.update(2, false, view, { x: 0, y: 0, w: 720, h: 900 });
    expect(stand.rotation.y).toBeCloseTo(2 * TURN_RATE, 6);
    s.update(2, true, view, { x: 0, y: 0, w: 720, h: 900 });
    expect(stand.rotation.y).toBe(STILL_YAW);
    const far = s.camera.position.z;
    s.update(2, true, view, { x: 0, y: 0, w: 1260, h: 900 });
    expect(s.camera.position.z).toBeLessThan(far);
    // the camera sees the whole screen; its axis is moved to the box (a lens shift, not a narrower frame)
    expect(s.camera.aspect).toBeCloseTo(16 / 9, 6);
    s.dispose();
  });

  it('frames a bigger kart farther back, so the hero fills the same share of the panel whatever its size (was one fixed shot for every kart: "the kart looks small in a big panel")', () => {
    const s = new Showroom();
    const view = { w: 1600, h: 900 };
    s.show('pip', {});
    s.update(0, true, view);
    const zSmall = s.camera.position.z, ySmall = s.camera.position.y;
    s.show('boulder', {}); // the tall racer: a bigger kart-plus-driver bounding sphere
    s.update(0, true, view);
    expect(s.camera.position.z).toBeGreaterThan(zSmall);
    expect(s.camera.position.y).toBeGreaterThan(ySmall); // a taller kart's own bounding-sphere centre sits higher, not the old fixed look-at
    s.dispose();
  });

  it('stands the hero in its box on the whole screen: the view offset moves the axis to the box, a smaller box stands it farther back (heroFit)', () => {
    const view = { w: 1600, h: 900 };
    const right = heroFit(view, { x: 900, y: 100, w: 600, h: 500 }, 1.9, 30);
    expect(right.offX).toBe(800 - 1200); // the box's middle is 400 px right of the screen's: the frame shifts left by as much
    expect(right.offY).toBe(450 - 350);
    const whole = heroFit(view, { x: 0, y: 0, w: 1600, h: 900 }, 1.9, 30);
    expect([whole.offX, whole.offY]).toEqual([0, 0]);
    expect(right.dist).toBeGreaterThan(whole.dist);
    // the camera takes it: whole screen, aspect the screen's, the offset set
    const s = new Showroom();
    s.show('pip', {});
    s.update(0, true, view, { x: 900, y: 100, w: 600, h: 500 });
    expect(s.camera.view?.enabled).toBe(true);
    expect([s.camera.view?.offsetX, s.camera.view?.offsetY, s.camera.view?.fullWidth, s.camera.view?.width]).toEqual([-400, 100, 1600, 1600]);
    s.dispose();
  });

  it('a new racer pops in with a small overshoot (none with reduced motion); the stage fades in and out with the screen change', () => {
    expect(popScale(0)).toBeCloseTo(POP_FROM, 6);
    expect(popScale(POP_S)).toBe(1);
    const peak = Math.max(...Array.from({ length: 34 }, (_, i) => popScale((i / 34) * POP_S)));
    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThan(1.03);
    const s = new Showroom();
    s.show('pip', {});
    const stand = kartOf(s)!.parent!;
    s.update(1, false, { w: 1600, h: 900 });
    expect(stand.scale.x).toBeCloseTo(POP_FROM, 6);
    s.update(1 + POP_S, false, { w: 1600, h: 900 });
    expect(stand.scale.x).toBe(1);
    s.show('boulder', {});
    s.update(3, true, { w: 1600, h: 900 });
    expect(stand.scale.x).toBe(1);
    s.dispose();
    // the stage over the race: in over the screen change's 0.24 s, out the same, at once with reduced motion; it never
    // falls back while it is wanted (it stood at 1 and dropped a step each frame: the race showed through, 26 Sept)
    let a = 0;
    for (let i = 0; i < 20; i++) a = stageFade(a, true, 1 / 60, 0.24);
    expect(a).toBe(1);
    a = stageFade(a, true, 1 / 60, 0.24);
    expect(a).toBe(1);
    expect(stageFade(1, false, 0.12, 0.24)).toBeCloseTo(0.5, 6);
    expect(stageFade(0.5, true, 0, 0.24, true)).toBe(1);
    expect(stageFade(0.5, false, 0, 0.24, true)).toBe(0);
  });

  it('the hero fades in and out with the stage (27 Sept 2026: it stood solid over the fading race): its nearest surface into depth first, then its own copies at the stage\'s alpha', () => {
    const s = new Showroom();
    s.show('pip', { body: 'classic' });
    const own = mats(kartOf(s)!);
    expect(own.length).toBeGreaterThan(0);
    // each own copy blends by a constant alpha (whole: 1, the same as no blending), set as it goes on the stand
    for (const m of own) { expect(m.blending).toBe(CustomBlending); expect(m.blendSrc).toBe(ConstantAlphaFactor); expect(m.blendDst).toBe(OneMinusConstantAlphaFactor); }
    const calls: { hero: boolean; colorWrite: boolean[]; blendAlpha: number[]; shadow: boolean }[] = [];
    const renderer = {
      autoClear: true,
      clearDepth: () => undefined,
      render: (scene: Scene) => {
        let shadow = false;
        scene.traverse((o) => { if ((o as Mesh).isMesh && ((o as Mesh).material as ShaderMaterial).uniforms?.fade && o.visible) shadow = true; });
        calls.push({ hero: scene === s.scene, colorWrite: own.map((m) => m.colorWrite), blendAlpha: own.map((m) => m.blendAlpha), shadow });
      },
    } as unknown as WebGLRenderer;
    s.update(1, false, { w: 1600, h: 900 });
    s.draw(renderer, 0.4);
    expect(calls.map((c) => c.hero)).toEqual([false, true, true]); // the backdrop, the depth pass, the kart
    expect(calls[1].colorWrite.every((w) => !w)).toBe(true);
    expect(calls[1].shadow).toBe(false);
    expect(calls[2].colorWrite.every((w) => w)).toBe(true);
    expect(calls[2].blendAlpha.every((a) => a === 0.4)).toBe(true);
    expect(calls[2].shadow).toBe(true);
    expect(own.every((m) => !m.polygonOffset)).toBe(true);
    expect(renderer.autoClear).toBe(true);
    // whole: one pass, fully opaque
    calls.length = 0;
    s.draw(renderer, 1);
    expect(calls.map((c) => c.hero)).toEqual([false, true]);
    expect(calls[1].blendAlpha.every((a) => a === 1)).toBe(true);
    // and the race's own materials never changed: the shared ones are not the showroom's
    const race = mats(buildRacerMesh('pip', { body: 'classic' })!);
    expect(race.some((m) => m.blending === CustomBlending)).toBe(false);
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
