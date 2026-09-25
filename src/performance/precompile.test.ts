// A set piece built ahead of when it shows (the podium ceremony: game/podium.ts) is uploaded and
// compiled in the background as the scene will draw it (warmup.ts precompile), and its shaders kept,
// so the frame that first shows it stalls on nothing.
import { describe, expect, it } from 'vitest';
import { BoxGeometry, DataTexture, Group, Mesh, MeshToonMaterial, PerspectiveCamera, Scene, type Object3D, type Texture, type WebGLRenderer } from 'three';
import { Warmup } from './warmup.ts';

class FakeProgram { usedTimes = 1; program: unknown = {}; isReady() { return true; } }

function fake() {
  const uploads: Texture[] = [];
  const compiles: { root: Object3D; scene: unknown; intoTarget: boolean }[] = [];
  const programs: FakeProgram[] = [];
  let finish = () => {};
  const r = {
    shadowMap: { enabled: true }, toneMapping: 0, target: null as unknown,
    info: { programs },
    properties: { get: () => ({}) },
    getRenderTarget: () => r.target,
    setRenderTarget: (t: unknown) => { r.target = t; },
    initTexture: (t: Texture) => { uploads.push(t); },
    compileAsync: (root: Object3D, _camera: unknown, scene: unknown) => {
      compiles.push({ root, scene, intoTarget: r.target !== null });
      programs.push(new FakeProgram());
      return new Promise<Object3D>((ok) => { finish = () => ok(root); });
    },
  };
  return { renderer: r as unknown as WebGLRenderer, r, uploads, compiles, programs, finish: () => finish() };
}

describe('Warmup.precompile', () => {
  it('uploads the piece\'s textures, compiles it as the scene draws it (into the post chain\'s buffer), keeps its shaders, and leaves the renderer as it was', async () => {
    const f = fake();
    const w = new Warmup(f.renderer);
    const map = new DataTexture(new Uint8Array(4), 1, 1);
    const piece = new Group();
    piece.add(new Mesh(new BoxGeometry(), new MeshToonMaterial({ map })));
    piece.visible = false; // hidden until it shows: still compiled
    const scene = new Scene();
    const done = w.precompile(piece, new PerspectiveCamera(), scene, true);
    expect(f.uploads).toEqual([map]);
    expect(f.compiles).toEqual([{ root: piece, scene, intoTarget: true }]);
    expect(f.r.target, 'the render target put back').toBeNull();
    let resolved = false;
    void done.then(() => { resolved = true; });
    await Promise.resolve();
    expect(resolved, 'waits for the compile').toBe(false);
    f.finish();
    await done;
    expect(resolved).toBe(true);
    expect(f.programs[0].usedTimes, 'kept: one extra use, so freeing the podium never deletes the shader').toBe(2);
    // drawn straight to the screen (quality Low: no post chain), it compiles for that
    void w.precompile(piece, new PerspectiveCamera(), scene, false);
    expect(f.compiles[1].intoTarget).toBe(false);
  });
});
