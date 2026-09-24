import { describe, expect, it } from 'vitest';
import { Mesh, MeshBasicMaterial, MeshToonMaterial, ShaderChunk, type Material, type WebGLProgramParametersWithUniforms, type WebGLRenderer } from 'three';
import { flameMaterial, isShared } from '../art-pipeline/index.ts';
import { fadeNearCamera } from '../track-builder/mesh/glow.ts';
import { CAM } from './camera.ts';
import { buildKartMesh, fadeKartNearCamera, ownKartMaterials } from './kartMesh.ts';

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

describe('near-camera fade for karts and their flames', () => {
  it('the dither patch carries its own view-space varying, so an unlit flame takes it too; twice is once', () => {
    for (const [m, kind] of [[new MeshToonMaterial(), 'meshtoon'], [new MeshBasicMaterial(), 'meshbasic']] as const) {
      fadeNearCamera(m, CAM.kartFade);
      fadeNearCamera(m, CAM.kartFade);
      const s = compiled(m, kind);
      expect(s.vertexShader).toContain('vNearView = mvPosition.xyz;');
      expect(s.fragmentShader.match(/discard/g)?.length).toBe(1);
      expect(s.fragmentShader).toContain(`/ ${CAM.kartFade.toFixed(2)}`);
      expect(m.customProgramCacheKey()).toContain(`near${CAM.kartFade.toFixed(2)}`);
    }
  });

  it('a rival kart and its flame dissolve; your own kart gets unpatched copies of its own, freed with the race', () => {
    const rival = buildKartMesh(0xff0000, 0x00ff00);
    const flame = new Mesh(undefined, flameMaterial());
    rival.add(flame);
    fadeKartNearCamera(rival);
    for (const m of materials(rival)) expect(m.customProgramCacheKey(), m.type).toContain('|near');
    // the shared flame itself stays as it was: your own kart burns with it
    expect(flame.material).not.toBe(flameMaterial());
    expect(isShared(flame.material)).toBe(true);
    expect(flameMaterial().customProgramCacheKey()).not.toContain('|near');

    const mine = buildKartMesh(0xff0000, 0x00ff00);
    const before = materials(mine);
    fadeKartNearCamera(buildKartMesh(0xff0000, 0x00ff00)); // the shared wheel material, faded as a rival's
    ownKartMaterials(mine);
    const after = materials(mine);
    for (let i = 0; i < after.length; i++) {
      expect(after[i]).not.toBe(before[i]);
      expect(after[i].customProgramCacheKey()).not.toContain('|near');
      expect(isShared(after[i])).toBe(false);
    }
  });
});
