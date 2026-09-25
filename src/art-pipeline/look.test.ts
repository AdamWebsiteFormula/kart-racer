// The look switch (look.ts): the stylized-PBR look is the default (Adam, 25 Sept 2026); ?look=toon brings the old one back.
import { afterEach, describe, expect, it } from 'vitest';
import {
  BoxGeometry, Color, DoubleSide, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, MeshToonMaterial, ShaderChunk, ShaderMaterial, Texture,
  type WebGLProgramParametersWithUniforms, type WebGLRenderer,
} from 'three';
import { buildTrackScene } from '../track-builder/mesh/index.ts';
import { buildTrack } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { trackAssets } from './index.ts';
import { applyLook, DEFAULT_LOOK, isPbr, litWorld, look, LOOK_LIGHTS, LOOK_LIGHTS_OK, lookFromSearch, PBR, pbrTwin, setLook } from './look.ts';

const TRACKS = Object.values(import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' })) as TrackDefinition[];
const HARBOUR = TRACKS.find((d) => d.id === 'harbour-loop')!;

/** A material's shaders as the renderer would compile them (its onBeforeCompile run over three's own). */
function compiled(m: MeshStandardMaterial | MeshToonMaterial): { vs: string; fs: string } {
  const std = (m as MeshStandardMaterial).isMeshStandardMaterial;
  const shader = {
    vertexShader: std ? ShaderChunk.meshphysical_vert : ShaderChunk.meshtoon_vert,
    fragmentShader: std ? ShaderChunk.meshphysical_frag : ShaderChunk.meshtoon_frag,
    uniforms: {},
  } as unknown as WebGLProgramParametersWithUniforms;
  m.onBeforeCompile(shader, {} as WebGLRenderer);
  return { vs: shader.vertexShader, fs: shader.fragmentShader };
}

afterEach(() => setLook(DEFAULT_LOOK));

describe('the look switch', () => {
  it('reads ?look= from the address; anything else leaves the default, the PBR look', () => {
    expect(DEFAULT_LOOK).toBe('pbr');
    expect(lookFromSearch('?look=pbr')).toBe('pbr');
    expect(lookFromSearch('?mute&look=pbr')).toBe('pbr');
    expect(lookFromSearch('?look=toon&mute')).toBe('toon');
    for (const s of [undefined, '', '?mute', '?look=', '?look=PBR', '?look=shiny']) expect(lookFromSearch(s), String(s)).toBeNull();
    // a test page has no ?look: the default
    expect(look()).toBe('pbr');
    expect(isPbr()).toBe(true);
    setLook('toon');
    expect([look(), isPbr()]).toEqual(['toon', false]);
  });

  it('the toon look hands the track scene no look hook: nothing changes unless it is asked for', () => {
    setLook('toon');
    expect(trackAssets('harbour').look).toBeUndefined();
    setLook('pbr');
    expect(trackAssets('harbour').look).toBe(applyLook);
  });
});

describe('the PBR twin of a toon material', () => {
  it('keeps its colour, maps, emission and settings, rough and not metal, and reads the same Color', () => {
    const map = new Texture();
    const toon = new MeshToonMaterial({ color: 0x336699, map, vertexColors: true, side: DoubleSide, transparent: true, opacity: 0.5, emissive: 0x220000, polygonOffset: true, polygonOffsetFactor: -1 });
    toon.userData.shared = true;
    const t = pbrTwin(toon);
    expect(t.isMeshStandardMaterial).toBe(true);
    expect([t.map, t.vertexColors, t.side, t.transparent, t.opacity, t.polygonOffset, t.polygonOffsetFactor]).toEqual([map, true, DoubleSide, true, 0.5, true, -1]);
    expect([t.roughness, t.metalness, t.envMapIntensity]).toEqual([PBR.roughness, PBR.metalness, PBR.env]);
    expect(t.emissive.getHex()).toBe(0x220000);
    expect(t.userData.shared).toBe(true);
    // one Color: a tint on the toon shows on its twin
    toon.color.set(0xff0000);
    expect(t.color.getHex()).toBe(0xff0000);
    // standard settings the toon has not are the standard defaults, never undefined
    expect(t.roughnessMap).toBeNull();
    expect(t.metalnessMap).toBeNull();
    expect(t.defines).toEqual({ STANDARD: '' });
  });

  it('is made once per toon, and goes when the toon is disposed', () => {
    const toon = new MeshToonMaterial();
    const t = pbrTwin(toon);
    expect(pbrTwin(toon)).toBe(t);
    let gone = false;
    t.addEventListener('dispose', () => { gone = true; });
    toon.dispose();
    expect(gone).toBe(true);
  });

  it("runs the toon's own shader patches, then the world's lights, under its own program key", () => {
    const toon = new MeshToonMaterial();
    toon.onBeforeCompile = (shader) => { shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n// own patch'); };
    toon.customProgramCacheKey = () => 'mine';
    const t = pbrTwin(toon);
    const { fs } = compiled(t);
    expect(fs).toContain('// own patch');
    expect(fs).toContain('#define LOOK_SUN');
    expect(fs).not.toContain('#include <lights_physical_pars_fragment>');
    expect(t.customProgramCacheKey()).toBe('mine|pbr');
    // a patch put on the toon after its twin was made still reaches the twin's shader
    const prev = toon.onBeforeCompile;
    toon.onBeforeCompile = (shader, r) => { prev.call(toon, shader, r); shader.fragmentShader += '\n// late patch'; };
    expect(compiled(t).fs).toContain('// late patch');
  });

  it("the world's sun is gained and wrapped, its ambient scaled: three's lines are all found", () => {
    expect(LOOK_LIGHTS_OK).toBe(true);
    expect(LOOK_LIGHTS).toContain('directLight.color * LOOK_SUN');
    expect(LOOK_LIGHTS).toContain('LOOK_WRAP');
    expect(LOOK_LIGHTS).toContain('irradiance * LOOK_AMBIENT');
    expect(PBR.sun).toBeGreaterThan(1);
    expect(PBR.wrap).toBeGreaterThan(0);
    expect(PBR.wrap).toBeLessThan(1);
  });
});

describe('applyLook', () => {
  it('turns toon materials into their twins, gives standard ones the world lights, and leaves unlit and custom ones', () => {
    const toon = new MeshToonMaterial(), std = new MeshStandardMaterial(), basic = new MeshBasicMaterial(), custom = new ShaderMaterial();
    const g = new Group(), box = new BoxGeometry();
    const a = new Mesh(box, toon), b = new Mesh(box, std), c = new Mesh(box, basic), d = new Mesh(box, custom), e = new Mesh(box, [toon, basic]);
    a.visible = false; // hidden meshes too (the shift's, made ahead)
    g.add(a, b, c);
    b.add(d, e);
    applyLook(g);
    expect(a.material).toBe(pbrTwin(toon));
    expect(b.material).toBe(std);
    expect(std.envMapIntensity).toBe(PBR.env);
    expect(compiled(std).fs).toContain('#define LOOK_SUN');
    expect([c.material, d.material]).toEqual([basic, custom]);
    expect(e.material).toEqual([pbrTwin(toon), basic]);
    // again: nothing more happens
    const key = std.customProgramCacheKey();
    applyLook(g);
    expect(a.material).toBe(pbrTwin(toon));
    expect(std.customProgramCacheKey()).toBe(key);
    expect(litWorld(std)).toBe(std);
    expect(std.customProgramCacheKey()).toBe(key);
  });

  it('Harbor Loop in the PBR look: not one toon material left, hidden meshes too, and the same draws as the toon look', () => {
    const toon = buildTrackScene(buildTrack(HARBOUR), trackAssets(HARBOUR.biome));
    const draws = toon.drawables();
    toon.dispose();
    setLook('pbr');
    const pbr = buildTrackScene(buildTrack(HARBOUR), trackAssets(HARBOUR.biome));
    let toons = 0, standard = 0;
    pbr.group.traverse((o) => {
      const m = (o as Mesh).material;
      for (const x of Array.isArray(m) ? m : m ? [m] : []) {
        if ((x as MeshToonMaterial).isMeshToonMaterial) toons++;
        if ((x as MeshStandardMaterial).isMeshStandardMaterial) standard++;
      }
    });
    expect(toons).toBe(0);
    expect(standard).toBeGreaterThan(20);
    expect(pbr.drawables()).toBeLessThanOrEqual(draws + 1);
    // a Final Lap Shift's rebuilt features come in the PBR look too
    pbr.update(0);
    pbr.dispose();
  });

  it('keeps colours as Colors, so a tint set on a toon after the swap still reads', () => {
    const toon = new MeshToonMaterial({ color: new Color(0.2, 0.4, 0.6) });
    const m = new Mesh(new BoxGeometry(), toon);
    applyLook(m);
    toon.color.setRGB(1, 0, 0);
    expect(((m.material as unknown as MeshStandardMaterial).color.toArray())).toEqual([1, 0, 0]);
  });
});
