import { describe, expect, it } from 'vitest';
import { ShaderChunk, type Mesh, type MeshToonMaterial, type WebGLProgramParametersWithUniforms, type WebGLRenderer } from 'three';
import { buildTrackScene } from '../track-builder/mesh/index.ts';
import { buildTrack } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { ROAD_LOOKS, trackAssets } from './index.ts';

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
