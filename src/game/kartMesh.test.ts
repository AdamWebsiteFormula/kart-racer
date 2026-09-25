import { describe, expect, it } from 'vitest';
import { Mesh, MeshBasicMaterial, MeshToonMaterial, ShaderChunk, type Material, type WebGLProgramParametersWithUniforms, type WebGLRenderer } from 'three';
import { isShared } from '../art-pipeline/index.ts';
import { fadeNearCamera, fadeNearCameraAlpha } from '../track-builder/mesh/glow.ts';
import { CAM } from './camera.ts';
import { buildKartMesh, ownKartMaterials } from './kartMesh.ts';

/** Run a material's onBeforeCompile over its built-in shader source, as the renderer would. */
function compiled(m: Material, kind: 'meshtoon' | 'meshbasic'): { vertexShader: string; fragmentShader: string } {
  const shader = { vertexShader: ShaderChunk[`${kind}_vert`], fragmentShader: ShaderChunk[`${kind}_frag`], uniforms: {} } as unknown as WebGLProgramParametersWithUniforms;
  m.onBeforeCompile(shader, {} as WebGLRenderer);
  return shader;
}

const materials = (root: { traverse(f: (o: unknown) => void): void }) => {
  const out: Material[] = [];
  root.traverse((o) => { if ((o as Mesh).isMesh) out.push((o as Mesh).material as Material); });
  return out;
};

describe('near-camera dither for props and items', () => {
  it('carries its own view-space varying; a fine noise stipple with no 4x4 grid in it; twice is once', () => {
    for (const [m, kind] of [[new MeshToonMaterial(), 'meshtoon'], [new MeshBasicMaterial(), 'meshbasic']] as const) {
      fadeNearCamera(m, CAM.nearFade);
      fadeNearCamera(m, CAM.nearFade);
      const s = compiled(m, kind);
      expect(s.vertexShader).toContain('vNearView = mvPosition.xyz;');
      expect(s.fragmentShader.match(/discard/g)?.length).toBe(1);
      expect(s.fragmentShader).toContain(`/ ${CAM.nearFade.toFixed(2)}`);
      expect(s.fragmentShader).toContain('52.9829189'); // interleaved gradient noise
      expect(s.fragmentShader).not.toContain('mod(floor(gl_FragCoord.xy), 4.0)'); // the old Bayer cell
      expect(m.customProgramCacheKey()).toContain(`near${CAM.nearFade.toFixed(2)}`);
    }
  });
});

describe('near-camera alpha fade for items', () => {
  it('a small solid thing fades smoothly in the see-through pass (no dither), still writing depth; twice is once', () => {
    const m = new MeshToonMaterial();
    fadeNearCameraAlpha(m, CAM.nearFade);
    fadeNearCameraAlpha(m, CAM.nearFade);
    expect(m.transparent).toBe(true);
    expect(m.depthWrite).toBe(true);
    const s = compiled(m, 'meshtoon');
    expect(s.vertexShader).toContain('vNearView = mvPosition.xyz;');
    expect(s.fragmentShader.match(/diffuseColor\.a \*= nearT \* nearT/g)?.length).toBe(1);
    expect(s.fragmentShader).not.toContain('discard');
    expect(s.fragmentShader.indexOf('nearT')).toBeLessThan(s.fragmentShader.indexOf('#include <opaque_fragment>'));
    expect(m.customProgramCacheKey()).toContain(`|near${CAM.nearFade.toFixed(2)}|alpha`);
  });
});

describe('your own kart', () => {
  it('gets copies of its own materials, freed with the race (a rival\'s ghost never reaches them)', () => {
    const mine = buildKartMesh(0xff0000, 0x00ff00);
    const before = materials(mine);
    ownKartMaterials(mine);
    const after = materials(mine);
    for (let i = 0; i < after.length; i++) {
      expect(after[i]).not.toBe(before[i]);
      expect(after[i].customProgramCacheKey()).not.toContain('|ghost');
      expect(isShared(after[i])).toBe(false);
    }
  });
});
