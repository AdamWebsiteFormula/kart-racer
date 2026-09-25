// The PBR look's grass by the road (look.ts; placed by track-builder mesh/verge.ts): one small tuft
// of blades, a few of them carrying a flower, drawn as ONE InstancedMesh a track. Code-built and tiny
// (13 triangles), so thousands cost little; each tuft is lit as the lawn under it is (normals up), takes
// the lawn's own variation across the land (surfaces.ts GROUND_TINT), sways a little in the breeze
// (WATER_CLOCK) and shrinks away between GRASS_FADE's two distances, so the far verge is the ground's
// texture alone and nothing shimmers. A tuft with no flowers folds its flowers away in the shader.
import { BufferAttribute, BufferGeometry, Color, DoubleSide, MeshStandardMaterial } from 'three';
import { litWorld } from './look.ts';
import { groundLook, NOISE_GLSL, WATER_CLOCK } from './surfaces.ts';

/** Metres from the lens where the tufts start to shrink away, and where they are gone. */
export const GRASS_FADE = Object.freeze([30, 52] as const);

/** The blades' colours at the root and the tip (sRGB), and the three flowers' (1 white, 2 yellow, 3 coral). */
const BLADE = Object.freeze({ root: '#5f9e30', tip: '#c6e57a' });
export const FLOWER_COLOURS = Object.freeze(['#fff8ec', '#ffd23f', '#ff6f91'] as const);

/**
 * One tuft (+Y up, its root at the origin): seven fine blades leaning out from the middle, each one thin
 * triangle, and a flower on a stalk among them, its head five petals (13 triangles in all). The `head`
 * attribute is 1 on the petals, 0.5 on the stalk, 0 on a blade (grassMaterial folds the flower away or
 * colours it).
 */
export function tuftGeometry(): BufferGeometry {
  const pos: number[] = [], col: number[] = [], head: number[] = [];
  const root = new Color(BLADE.root), tip = new Color(BLADE.tip), stalk = new Color('#4f9a34'), white = new Color(1, 1, 1);
  const vert = (x: number, y: number, z: number, c: Color, h: number) => { pos.push(x, y, z); col.push(c.r, c.g, c.b); head.push(h); };
  const BLADES = 7;
  for (let k = 0; k < BLADES; k++) {
    const a = (k / BLADES) * Math.PI * 2 + (k % 2) * 0.5, r = 0.03 + (k % 3) * 0.022;
    const h = 0.13 + ((k * 5) % 7) * 0.02, lean = 0.08 + ((k * 3) % 4) * 0.04, w = 0.018 + (k % 2) * 0.008;
    const cx = Math.cos(a), cz = Math.sin(a), px = -cz, pz = cx; // out from the middle, and across the blade
    const bx = cx * r, bz = cz * r;
    vert(bx - px * w, 0, bz - pz * w, root, 0);
    vert(bx + px * w, 0, bz + pz * w, root, 0);
    vert(bx + cx * (r + lean), h, bz + cz * (r + lean), tip, 0);
  }
  // the flower, on a stalk among the blades: five round-ended petals round its middle
  const [x, z, h] = [0.04, 0.02, 0.24];
  vert(x - 0.014, 0, z, stalk, 0.5);
  vert(x + 0.014, 0, z, stalk, 0.5);
  vert(x, h, z, stalk, 0.5);
  const R = 0.06, P = 5;
  for (let p = 0; p < P; p++) {
    const a = (p / P) * Math.PI * 2;
    vert(x, h + 0.003, z, white, 1);
    vert(x + Math.cos(a - 0.42) * R, h, z + Math.sin(a - 0.42) * R, white, 1);
    vert(x + Math.cos(a + 0.42) * R, h, z + Math.sin(a + 0.42) * R, white, 1);
  }
  const n = pos.length / 3, nor = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) nor[i * 3 + 1] = 1; // lit as the lawn under it
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('normal', new BufferAttribute(nor, 3));
  g.setAttribute('color', new BufferAttribute(new Float32Array(col), 3));
  g.setAttribute('head', new BufferAttribute(new Float32Array(head), 1));
  g.computeBoundingSphere();
  return g;
}

const cache = new Map<string, MeshStandardMaterial>();
/**
 * The tufts' material for a biome: rough, both sides, the world's lights (look.ts). Per tuft (the
 * instanced `aTuft`: its flowers 0 to 3, and a seed): the lawn's own variation at its root, a shade of
 * its own, a sway, the flowers' colour or none, and its size by the distance to the lens. Shared.
 */
export function grassMaterial(biome: string): MeshStandardMaterial {
  let m = cache.get(biome);
  if (m) return m;
  const gl = groundLook(biome);
  const mat = new MeshStandardMaterial({ vertexColors: true, side: DoubleSide, roughness: 0.92, metalness: 0 });
  const f = (x: number) => x.toFixed(3);
  const uniforms = {
    uClock: WATER_CLOCK, uLush: { value: new Color(gl.lush) }, uDry: { value: new Color(gl.dry) },
    uPetals: { value: FLOWER_COLOURS.map((c) => new Color(c)) },
  };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = `attribute float head;\nattribute vec2 aTuft;\nuniform float uClock;\nuniform vec3 uLush;\nuniform vec3 uDry;\nuniform vec3 uPetals[3];\n${NOISE_GLSL}\n${shader.vertexShader}`
      .replace('#include <begin_vertex>', `#include <begin_vertex>
  // a tuft with no flowers folds them away
  transformed *= mix(1.0, step(0.5, aTuft.x), step(0.25, head));
  // the breeze: the tips sway, each tuft a little out of step
  float tuftSway = sin(uClock * 1.9 + tuftAt.x * 0.21 + tuftAt.z * 0.17 + aTuft.y * 6.0) * 0.6 + sin(uClock * 3.3 + tuftAt.z * 0.4) * 0.25;
  transformed.xz += vec2(0.07, 0.04) * tuftSway * transformed.y;
  // shrinking away with distance: past the far edge it is gone (the ground's own texture carries on)
  transformed *= 1.0 - smoothstep(${f(GRASS_FADE[0])}, ${f(GRASS_FADE[1])}, distance(tuftAt, cameraPosition));`)
      .replace('#include <color_vertex>', `#include <color_vertex>
  // (three colours the vertex before it places it)
  vec3 tuftAt = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  #ifdef USE_COLOR
    // the lawn's own variation at its root, a shade of its own, and its flowers' colour
    vColor.rgb *= lkGroundTint(tuftAt.xz, uLush, uDry, ${f(gl.size)}, ${f(gl.vary)}) * (0.86 + 0.28 * aTuft.y);
    vec3 tuftPetal = aTuft.x < 1.5 ? uPetals[0] : aTuft.x < 2.5 ? uPetals[1] : uPetals[2];
    vColor.rgb = mix(vColor.rgb, tuftPetal, step(0.75, head));
  #endif`);
  };
  mat.customProgramCacheKey = () => `verge-grass-${biome}`;
  mat.userData.shared = true;
  m = litWorld(mat);
  cache.set(biome, m);
  return m;
}
