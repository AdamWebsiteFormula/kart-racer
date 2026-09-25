import { afterEach, describe, expect, it } from 'vitest';
import { ShaderChunk, type Material, type Mesh, type MeshStandardMaterial, type MeshToonMaterial, type WebGLProgramParametersWithUniforms, type WebGLRenderer } from 'three';
import { buildTrackScene } from '../track-builder/mesh/index.ts';
import { buildTrack } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { ROAD_LOOKS, trackAssets } from './index.ts';
import { DEFAULT_LOOK, setLook } from './look.ts';
import { coastMaterial, groundMaterial } from './surfaces.ts';

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
    expect(groundMaterial('harbour', 'water', 2400)?.type).toBe('ShaderMaterial'); // the sea is its own
    setLook('toon');
    expect((groundMaterial('meadow', 'plane', 2400) as MeshToonMaterial).isMeshToonMaterial).toBe(true);
  });
});
