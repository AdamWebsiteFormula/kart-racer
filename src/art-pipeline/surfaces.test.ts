import { afterEach, describe, expect, it } from 'vitest';
import { ShaderChunk, type Material, type Mesh, type MeshStandardMaterial, type MeshToonMaterial, type WebGLProgramParametersWithUniforms, type WebGLRenderer } from 'three';
import { buildTrackScene } from '../track-builder/mesh/index.ts';
import { buildTrack } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { ROAD_LOOKS, trackAssets } from './index.ts';
import { DEFAULT_LOOK, setLook } from './look.ts';
import { coastMaterial, GROUND_RELIEF_FAR, groundMaterial, ROAD_RELIEF_FAR, waterMaterial } from './surfaces.ts';
import { SEA_TIDE, tideScale } from './waterWaves.ts';

const TRACKS = Object.values(import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' })) as TrackDefinition[];

/** The track's road material, and its shaders as the renderer would compile them. */
function road(def: TrackDefinition): { m: MeshToonMaterial; vs: string; fs: string } {
  const scene = buildTrackScene(buildTrack(def), trackAssets(def.biome));
  let m: MeshToonMaterial | undefined;
  scene.group.traverse((o) => {
    const mat = (o as Mesh).material as MeshToonMaterial | undefined;
    if (!m && mat && !Array.isArray(mat) && mat.customProgramCacheKey().includes('road-lines')) m = mat;
  });
  if (!m) throw new Error(`no road on ${def.id}`);
  const shader = { vertexShader: ShaderChunk.meshtoon_vert, fragmentShader: ShaderChunk.meshtoon_frag, uniforms: {} } as unknown as WebGLProgramParametersWithUniforms;
  m.onBeforeCompile(shader, {} as WebGLRenderer);
  const out = { m, vs: shader.vertexShader, fs: shader.fragmentShader };
  scene.dispose();
  return out;
}

describe('road wear and sheen (critique of 24 Sept 2026: "flat, uniform grey with no specular or wear")', () => {
  it('every biome has a look; only the dry ones crack, only the night deck is wet', () => {
    for (const d of TRACKS) expect(ROAD_LOOKS[d.biome], d.biome).toBeDefined();
    expect(ROAD_LOOKS.boardwalk.wet).toBeGreaterThan(0);
    expect(ROAD_LOOKS.boardwalk.cracks).toBe(0);
    expect(ROAD_LOOKS.skyline.cracks).toBe(0);
    expect(ROAD_LOOKS.canyon.sand).toBeDefined();
    for (const l of Object.values(ROAD_LOOKS)) {
      expect(l.sheen).toBeGreaterThan(0);
      expect(l.sheen).toBeLessThanOrEqual(0.5); // a glint, never a mirror
      expect(l.wear).toBeLessThanOrEqual(1);
    }
  });

  it.each(TRACKS.map((d) => [d.id, d] as const))('%s: patched onto the road material after its lines, in the same material', (_id, def) => {
    const { m, vs, fs } = road(def);
    expect(m.customProgramCacheKey()).toContain(`|wear-${def.biome}`);
    expect(vs).toContain('vWearW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    // the wear goes in after the road's own colours (lines, mud) and before the emissive; the glint after the lights
    expect(fs.indexOf('rwBand = max(')).toBeGreaterThan(fs.indexOf('float mudMask'));
    expect(fs.indexOf('rwBand = max(')).toBeLessThan(fs.indexOf('#include <emissivemap_fragment>'));
    expect(fs.indexOf('rwSpec')).toBeGreaterThan(fs.indexOf('#include <lights_fragment_end>'));
    expect(fs.includes('#define WET')).toBe(!!ROAD_LOOKS[def.biome].wet);
    expect(fs.includes('#define SAND')).toBe(!!ROAD_LOOKS[def.biome].sand);
  });
});

/** A material's shaders as the renderer would compile them, a standard one's through three's physical shader. */
function compile(m: Material): { vs: string; fs: string } {
  const std = (m as MeshStandardMaterial).isMeshStandardMaterial;
  const shader = {
    vertexShader: std ? ShaderChunk.meshphysical_vert : ShaderChunk.meshtoon_vert,
    fragmentShader: std ? ShaderChunk.meshphysical_frag : ShaderChunk.meshtoon_frag,
    uniforms: {},
  } as unknown as WebGLProgramParametersWithUniforms;
  m.onBeforeCompile(shader, {} as WebGLRenderer);
  return { vs: shader.vertexShader, fs: shader.fragmentShader };
}

describe('the PBR look on the road and the land (look.ts, 25 Sept 2026)', () => {
  const HARBOUR = TRACKS.find((d) => d.id === 'harbour-loop')!;
  afterEach(() => setLook(DEFAULT_LOOK));

  it('the toon road compiles none of it: no grain, no racing line, the glint as it was', () => {
    setLook('toon');
    const { fs } = road(HARBOUR);
    expect(fs).not.toContain('uRoadGrain');
    expect(fs).not.toContain('lkBend');
    // the PBR look's own lines in paintRoadLines only compile into a standard material
    for (const bit of ['roadPaintWear(vRoad, vLane)', 'corner = smoothstep(0.3, 0.6, vCurb)']) {
      const at = fs.indexOf(bit);
      expect(at, bit).toBeGreaterThan(0);
      expect(fs.lastIndexOf('#ifdef STANDARD', at), bit).toBeGreaterThan(fs.lastIndexOf('#endif', at));
    }
    expect(fs).toContain('#if NUM_DIR_LIGHTS > 0 && !defined( STANDARD )');
  });

  it("the PBR road: one standard material a track, with the racing line, tire marks, the asphalt's grain and worn paint", () => {
    setLook('pbr');
    const scene = buildTrackScene(buildTrack(HARBOUR), trackAssets(HARBOUR.biome));
    const roads = new Set<Material>();
    scene.group.traverse((o) => {
      const m = (o as Mesh).material as Material | undefined;
      if (m && !Array.isArray(m) && m.customProgramCacheKey().includes('road-lines')) roads.add(m);
    });
    expect(roads.size).toBe(1);
    const m = [...roads][0] as MeshStandardMaterial;
    expect(m.isMeshStandardMaterial).toBe(true);
    const { vs, fs } = compile(m);
    expect(vs).toContain('vLane = lane;');
    expect(vs).toContain('vCurb = curb;');
    expect(fs).toContain('uRoadGrain');
    expect(fs).toContain('marks += exp(');
    expect(fs).toContain('normal = lkBend(normal, lkSlope(uRoadGrain');
    // the relief keeps some bump well past a short straight, not flat by 40 m (Adam, 25 Sept 2026)
    expect(fs).toContain(`smoothstep(${ROAD_RELIEF_FAR[0].toFixed(1)}, ${ROAD_RELIEF_FAR[1].toFixed(1)}, length(vViewPosition))`);
    // the roughness is set after three reads its own, and before the lights read it
    const set = fs.indexOf('roughnessFactor = clamp(rdR');
    expect(set).toBeGreaterThan(fs.indexOf('#include <roughnessmap_fragment>'));
    expect(set).toBeLessThan(fs.indexOf('#include <lights_physical_fragment>'));
    expect(fs).toContain('#define LOOK_SUN');
    scene.dispose();
  });

  it('the PBR land: standard, varied across the land, a soft dirt edge by the curb on a lawn, its own relief', () => {
    setLook('pbr');
    for (const biome of ['harbour', 'meadow', 'canyon', 'frost', 'boardwalk']) {
      const m = coastMaterial(biome) as MeshStandardMaterial;
      expect(m.isMeshStandardMaterial, biome).toBe(true);
      const { vs, fs } = compile(m);
      expect(vs).toContain('vLkCurb = curb;');
      expect(fs).toContain('lkGroundTint(vWorldUv');
      expect(fs).toContain(`float lkDirt = ${biome === 'harbour' || biome === 'meadow' ? '1.0' : '0.0'} *`);
      expect(fs).toContain('normal = lkBend(normal, lkS * lkFar, 1.0);');
      expect(fs).toContain(`smoothstep(${GROUND_RELIEF_FAR[0].toFixed(1)}, ${GROUND_RELIEF_FAR[1].toFixed(1)}, length(vViewPosition))`);
      // the frost's snow still paints the land
      expect(fs.includes('vSnowW'), biome).toBe(biome === 'frost');
    }
    // the toon land is as it was
    setLook('toon');
    expect((coastMaterial('harbour') as MeshToonMaterial).isMeshToonMaterial).toBe(true);
    expect(compile(coastMaterial('harbour')!).fs).not.toContain('lkDirt');
  });

  it('the PBR ground plane: standard, varied, with its relief sampled as its texture is', () => {
    setLook('pbr');
    const m = groundMaterial('meadow', 'plane', 2400) as MeshStandardMaterial;
    expect(m.isMeshStandardMaterial).toBe(true);
    const { fs } = compile(m);
    expect(fs).toContain('lkGroundTint(vLkW.xz');
    expect(fs).toContain('lkSlope(uRelief, vMapUv)');
    expect(fs).toContain(`smoothstep(${GROUND_RELIEF_FAR[0].toFixed(1)}, ${GROUND_RELIEF_FAR[1].toFixed(1)}, length(vViewPosition))`);
    expect(groundMaterial('harbour', 'water', 2400)?.type).toBe('ShaderMaterial'); // the sea is its own
    setLook('toon');
    expect((groundMaterial('meadow', 'plane', 2400) as MeshToonMaterial).isMeshToonMaterial).toBe(true);
  });

  it('the relief stays past a long straight, and well into the fog (Adam, 25 Sept 2026: "the lawn ... goes back to flat paint" by 60 m, before the 140 m fog even starts)', () => {
    expect(GROUND_RELIEF_FAR[1]).toBeGreaterThan(140);
    expect(ROAD_RELIEF_FAR[1]).toBeGreaterThan(100);
    expect(GROUND_RELIEF_FAR[0]).toBeGreaterThan(15); // still crisp close up, not blurred near the kart
    expect(ROAD_RELIEF_FAR[0]).toBeGreaterThan(10);
  });
});

describe('the sea (waterMaterial, waterDepth.ts): see-through, drawn first among see-through things, falls back cleanly', () => {
  it('is transparent with depthWrite on, so later see-through things (shiftFx clouds, ghosts) still depth-test against its own surface', () => {
    const m = waterMaterial('harbour');
    expect(m.transparent).toBe(true);
    expect(m.depthWrite).toBe(true);
    expect(m.type).toBe('ShaderMaterial');
  });

  it('every sea biome falls back to the unknown-biome default (harbour) the same way groundMaterial does', () => {
    expect(waterMaterial('not-a-real-biome')).toBe(waterMaterial('harbour'));
  });

  it('boardwalk is the night palette, harbour the day one', () => {
    expect(waterMaterial('boardwalk').uniforms.night.value).toBe(1);
    expect(waterMaterial('harbour').uniforms.night.value).toBe(0);
  });

  it('userData.attachDepth wires a mesh\'s onBeforeRender to the depth capture, without art-pipeline being imported by scene.ts (userData convention, like sharedMaterial)', () => {
    const m = waterMaterial('harbour');
    const attach = m.userData.attachDepth as ((mesh: { onBeforeRender?: unknown }) => void) | undefined;
    expect(attach).toBeTypeOf('function');
    const fakeMesh: { onBeforeRender?: (renderer: WebGLRenderer, scene: unknown, camera: unknown) => void } = {};
    attach!(fakeMesh);
    expect(fakeMesh.onBeforeRender).toBeTypeOf('function');
  });

  it('the capture falls back to uHasDepth = 0 (today\'s opaque look) when the renderer has no active render target, instead of throwing', () => {
    const m = waterMaterial('harbour');
    const attach = m.userData.attachDepth as (mesh: { onBeforeRender?: (r: WebGLRenderer, s: unknown, c: unknown) => void }) => void;
    const fakeMesh: { onBeforeRender?: (r: WebGLRenderer, s: unknown, c: unknown) => void } = {};
    attach(fakeMesh);
    m.uniforms.uHasDepth.value = 1; // prove the hook actually ran and changed it, not that it was already 0
    const fakeRenderer = { getRenderTarget: () => null } as unknown as WebGLRenderer;
    expect(() => fakeMesh.onBeforeRender!(fakeRenderer, {}, {})).not.toThrow();
    expect(m.uniforms.uHasDepth.value).toBe(0);
  });

  it('every call updates the shared material\'s sun direction (a mirrored race, mirror.ts, flips x on the very same biome; sunDir must not be baked in once)', () => {
    const a = waterMaterial('harbour', [0.4, 0.8, 0.3]);
    const dirA = (a.uniforms.sunDir.value as { x: number }).x;
    const b = waterMaterial('harbour', [-0.4, 0.8, 0.3]);
    expect(b).toBe(a); // the very same shared material
    const dirB = (b.uniforms.sunDir.value as { x: number }).x;
    expect(dirB).toBeLessThan(0);
    expect(Math.sign(dirB)).not.toBe(Math.sign(dirA));
  });

  it("Harbour Loop's real scene: the water plane draws renderOrder -2 (right after every opaque thing, before every other see-through thing) and its onBeforeRender is really wired to the depth capture, not the default no-op", () => {
    const def = TRACKS.find((d) => d.id === 'harbour-loop')!;
    const scene = buildTrackScene(buildTrack(def), trackAssets(def.biome));
    const ground = scene.group.getObjectByName('ground-water') as Mesh;
    expect(ground).toBeTruthy();
    expect(ground.renderOrder).toBe(-2);
    const water = waterMaterial('harbour');
    expect(ground.material).toBe(water);
    // behavioural, not a prototype check: a no-op onBeforeRender would leave uHasDepth untouched
    water.uniforms.uHasDepth.value = 1;
    const fakeRenderer = { getRenderTarget: () => null } as unknown as WebGLRenderer;
    ground.onBeforeRender(fakeRenderer, scene.group as never, {} as never, ground.geometry, water, undefined as never);
    expect(water.uniforms.uHasDepth.value).toBe(0);
    scene.dispose();
  });
});

describe('the sea\'s swell, review round 2 (26 Sept 2026): a per-fragment normal and Harbour\'s own flood tide', () => {
  it('finding 3: the analytic normal is evaluated in the fragment shader (from vWorld, fresh per pixel), not carried as an interpolated vertex varying', () => {
    const m = waterMaterial('harbour');
    expect(m.vertexShader).not.toContain('vGerstnerNormal');
    expect(m.fragmentShader).not.toContain('vGerstnerNormal');
    expect(m.fragmentShader).toContain('lkGerstnerNormal(vWorld.xz');
    // the vertex shader still needs its own fade for the displacement itself; the fragment recomputes
    // its own copy from vWorld (not a second varying) so the normal matches the same fade
    expect(m.vertexShader).toContain('uTideFade');
    expect(m.fragmentShader).toContain('uTideFade');
  });

  it('finding 2: uTideFade is wired straight to SEA_TIDE.scale (a live reference, like WATER_CLOCK — not a one-time copy), 1 with no tide', () => {
    SEA_TIDE.rise.value = 0;
    const m = waterMaterial('harbour');
    expect(m.uniforms.uTideFade.value).toBe(1);
    SEA_TIDE.rise.value = 0.7;
    expect(m.uniforms.uTideFade.value).toBeCloseTo(tideScale(0.7), 9);
    SEA_TIDE.rise.value = 0; // never leave a test's own tide for the next one
  });

  it('waterMaterial() resets SEA_TIDE.rise to 0 every time it is called (a stale tide from a previous race must never leak into the next), even on a cache hit', () => {
    SEA_TIDE.rise.value = 0.5;
    waterMaterial('harbour');
    expect(SEA_TIDE.rise.value).toBe(0);
  });

  it('finding 2: a floating prop\'s bob (userData.floatRide) rides the tide\'s own rise and shrinks with its scale, exactly like the shader\'s uTideFade', () => {
    const m = waterMaterial('harbour');
    const floatRide = m.userData.floatRide as (x: number, z: number, t: number) => { y: number; slopeX: number; slopeZ: number };
    SEA_TIDE.rise.value = 0;
    const flat = floatRide(12, -8, 3.4);
    SEA_TIDE.rise.value = 0.7;
    const tidal = floatRide(12, -8, 3.4);
    expect(tidal.y).toBeCloseTo(flat.y * tideScale(0.7) + 0.7, 9);
    expect(tidal.slopeX).toBeCloseTo(flat.slopeX * tideScale(0.7), 9);
    SEA_TIDE.rise.value = 0; // never leave a test's own tide for the next one
  });
});
